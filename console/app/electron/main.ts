import { app, BrowserWindow, dialog, ipcMain, safeStorage } from 'electron';
import { mkdir, readFile, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { handleSquirrelEvent, processHostess } from './squirrel-events.js';
import { createControlPlaneDispatcher } from '../../control-plane/dispatch.js';
import type { ControlPlaneRequest, UpdaterRestartResult, UpdaterStatusForRenderer } from '../../shared/control-plane.js';
import type { VaultReferenceReader } from '../../control-plane/external-settings-client.js';
import {
  parseVersion, resolveLatestUpdate, validateReleaseIdentity, initialUpdaterState, beganChecking, checkSucceeded,
  updateFailed, beganDownloading, downloadReady, dismissedForNow, verifyDownload, findDigestForAsset,
} from '../../control-plane/updater.js';
import type { UpdaterState } from '../../control-plane/updater.js';
import { LOGO_MAX_INPUT_BYTES } from '../../shared/logo.js';
import {
  readCurrentIdentity, fetchReleases, fetchReleaseIdentity, fetchShaSumsText, downloadAsset,
  discardDownload, sweepStaleDownloads, launchInstaller, releaseIdentityDigest,
} from './updater-runtime.js';

let mainWindow: BrowserWindow | null = null;

/**
 * Reads only encrypted values placed by the local credential enrollment flow.
 * `safeStorage` keeps the encryption key in the operating-system credential
 * facility. The renderer receives neither this path nor the decrypted value.
 */
function externalSettingsVault(): VaultReferenceReader {
  return {
    async read(reference: string): Promise<string | undefined> {
      if (!safeStorage.isEncryptionAvailable() || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u.test(reference)) return undefined;
      try {
        const encrypted = await readFile(join(app.getPath('userData'), 'credentials', `${reference}.enc`), 'utf8');
        const bytes = Buffer.from(encrypted.trim(), 'base64');
        if (bytes.byteLength === 0 || bytes.byteLength > 64 * 1024) return undefined;
        const value = safeStorage.decryptString(bytes);
        return value.length <= 4096 ? value : undefined;
      } catch {
        return undefined;
      }
    },
  };
}

const VAULT_REFERENCE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u;
const vaultDirectory = () => join(app.getPath('userData'), 'credentials');

ipcMain.handle('external-settings:list-vault-references', async () => {
  try {
    const entries = await readdir(vaultDirectory(), { withFileTypes: true });
    return entries.filter((entry) => entry.isFile() && entry.name.endsWith('.enc') && VAULT_REFERENCE.test(entry.name.slice(0, -4))).map((entry) => entry.name.slice(0, -4));
  } catch {
    return [];
  }
});
ipcMain.handle('external-settings:enroll-vault-reference', async (_event, request: { reference?: unknown; token?: unknown }) => {
  const reference = typeof request?.reference === 'string' ? request.reference.trim() : '';
  const token = typeof request?.token === 'string' ? request.token : '';
  if (!safeStorage.isEncryptionAvailable()) return { ok: false, reason: 'The operating-system credential vault is unavailable.' };
  if (!VAULT_REFERENCE.test(reference) || token.length < 1 || token.length > 4096) return { ok: false, reason: 'Provide a bounded reference and credential value.' };
  try {
    await mkdir(vaultDirectory(), { recursive: true });
    const temporary = join(vaultDirectory(), `${reference}.${randomUUID()}.tmp`);
    try {
      await writeFile(temporary, safeStorage.encryptString(token).toString('base64'), { encoding: 'utf8', flag: 'wx' });
      await rename(temporary, join(vaultDirectory(), `${reference}.enc`));
      return { ok: true, reference };
    } finally {
      await unlink(temporary).catch(() => undefined);
    }
  } catch {
    return { ok: false, reason: 'The credential could not be stored in the operating-system vault.' };
  }
});
ipcMain.handle('external-settings:remove-vault-reference', async (_event, reference: unknown) => {
  if (typeof reference !== 'string' || !VAULT_REFERENCE.test(reference)) return { ok: false, reason: 'The credential reference is invalid.' };
  try { await unlink(join(vaultDirectory(), `${reference}.enc`)); return { ok: true }; }
  catch { return { ok: false, reason: 'The credential reference could not be removed.' }; }
});

const dispatcher = createControlPlaneDispatcher({ userDataPath: app.getPath('userData'), resourcesPath: process.resourcesPath, hosted: false, externalSettingsVault: externalSettingsVault(), logoDecoderWorkerPath: join(process.resourcesPath, 'logo-decoder', 'logo-decoder-worker.mjs'), logoDecoderManifestPath: join(process.resourcesPath, 'logo-decoder', 'logo-decoder-manifest.json'), logoDecoderPackageLockPath: join(process.resourcesPath, 'logo-decoder', 'package-lock.json'), logoDecoderIdentityManifestPath: join(process.resourcesPath, 'update-manifest.json'), logoDecoderJobScriptPath: join(process.resourcesPath, 'logo-decoder', 'logo-worker-job.ps1'), logoDecoderRecoveryScriptPath: join(process.resourcesPath, 'logo-decoder', 'logo-worker-recovery.ps1') });
const { controlPlaneRequest } = dispatcher;
const UPDATE_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;
let updateCheckInFlight: Promise<void> | undefined;
let updateGeneration = 0;
let installingLatch: Promise<UpdaterRestartResult> | undefined;
let restartQuitScheduled = false;

function readInitialState(): UpdaterState {
  const identity = readCurrentIdentity();
  const version = identity ? parseVersion(identity.version) : undefined;
  const state = initialUpdaterState(version, identity?.tag);
  if (!identity) return updateFailed(state, 'The packaged update manifest is missing or malformed.');
  return state;
}

let updaterState = readInitialState();

function toRendererStatus(state: UpdaterState): UpdaterStatusForRenderer {
  return {
    state: state.state,
    revision: state.revision,
    installedVersion: state.currentVersion ? state.currentVersion.join('.') : undefined,
    latestVersion: state.resolved?.version,
    releaseUrl: state.resolved?.releaseUrl,
    lastError: state.lastError,
    unsavedDraftCount: state.unsavedDraftCount,
    restartPending: state.restartPending,
    dismissed: Boolean(state.dismissedTag && state.dismissedTag === state.resolved?.tag),
  };
}

function publishUpdaterState(next: UpdaterState): void {
  updaterState = next;
  mainWindow?.webContents.send('updater:status', toRendererStatus(updaterState));
}

function isCurrentGeneration(generation: number): boolean { return generation === updateGeneration; }

async function performUpdateCheck(revealDismissed: boolean): Promise<void> {
  if (updaterState.state === 'ready') {
    if (revealDismissed && updaterState.dismissedTag) publishUpdaterState({ ...updaterState, dismissedTag: undefined, revision: updaterState.revision + 1 });
    return;
  }
  if (!readCurrentIdentity()) {
    publishUpdaterState(updateFailed(updaterState, 'The packaged update manifest is missing or malformed.'));
    return;
  }
  const generation = ++updateGeneration;
  publishUpdaterState(beganChecking(updaterState, new Date()));
  try {
    const releases = await fetchReleases();
    if (!isCurrentGeneration(generation)) return;
    const currentVersion = updaterState.currentVersion;
    const resolved = resolveLatestUpdate(releases, currentVersion);
    if (!resolved) {
      publishUpdaterState(checkSucceeded(updaterState, undefined));
      return;
    }
    const [rawIdentity, shaSumsText] = await Promise.all([fetchReleaseIdentity(resolved), fetchShaSumsText(resolved)]);
    if (!isCurrentGeneration(generation)) return;
    const identityResult = validateReleaseIdentity(rawIdentity, resolved);
    if (!identityResult.ok) throw new Error(identityResult.reason);
    const identity = identityResult.value;
    const requiredAssets = [resolved.setupAsset, resolved.releasesAsset, ...resolved.fullPackageAssets, ...resolved.deltaPackageAssets, resolved.identityAsset];
    for (const asset of requiredAssets) {
      const digest = findDigestForAsset(shaSumsText, asset.name);
      if (!digest) throw new Error(`SHA256SUMS.txt has no digest for ${asset.name}.`);
      const identityDigest = asset.name === resolved.identityAsset.name ? findDigestForAsset(shaSumsText, asset.name) : releaseIdentityDigest(identity, asset.name);
      if (asset.name !== resolved.identityAsset.name && (!identityDigest || identityDigest.toLowerCase() !== digest.toLowerCase())) {
        throw new Error(`Release identity digest does not match ${asset.name}.`);
      }
    }
    publishUpdaterState(checkSucceeded(updaterState, resolved));
    publishUpdaterState(beganDownloading(updaterState));
    const file = await downloadAsset(resolved.setupAsset);
    try {
      const expectedDigest = findDigestForAsset(shaSumsText, resolved.setupAsset.name);
      const verdict = verifyDownload(resolved, file, expectedDigest);
      if (!verdict.ok) throw new Error(verdict.reason);
      if (!isCurrentGeneration(generation)) {
        await discardDownload(file.path);
        return;
      }
      publishUpdaterState(downloadReady(updaterState, file.path));
    } catch (error) {
      await discardDownload(file.path);
      throw error;
    }
  } catch (error) {
    if (isCurrentGeneration(generation)) publishUpdaterState(updateFailed(updaterState, error instanceof Error ? error.message : String(error)));
  }
}

function runUpdateCheck(revealDismissed = false): Promise<void> {
  if (updateCheckInFlight) return updateCheckInFlight;
  updateCheckInFlight = performUpdateCheck(revealDismissed).finally(() => { updateCheckInFlight = undefined; });
  return updateCheckInFlight;
}

function scheduleUpdateChecks(): void {
  void sweepStaleDownloads().catch(() => undefined);
  if (updaterState.state === 'failed' && !readCurrentIdentity()) return;
  void runUpdateCheck(true);
  setInterval(() => { void runUpdateCheck(true); }, UPDATE_CHECK_INTERVAL_MS);
}

ipcMain.handle('updater:get-status', () => toRendererStatus(updaterState));
ipcMain.handle('updater:check-now', async () => { await runUpdateCheck(true); return toRendererStatus(updaterState); });
ipcMain.on('updater:dismiss', () => publishUpdaterState(dismissedForNow(updaterState)));
ipcMain.on('updater:set-draft-count', (_event, count: unknown) => {
  const unsavedDraftCount = Number.isSafeInteger(count) && Number(count) >= 0 ? Math.min(Number(count), 10000) : 0;
  updaterState = { ...updaterState, unsavedDraftCount, revision: updaterState.revision + 1 };
  mainWindow?.webContents.send('updater:status', toRendererStatus(updaterState));
});
ipcMain.handle('updater:restart-to-install', async (): Promise<UpdaterRestartResult> => {
  if (installingLatch) return installingLatch;
  if (updaterState.unsavedDraftCount > 0) return { ok: false, reason: 'Review, apply, or discard PBX drafts before restarting to install the update.' };
  if (updaterState.state !== 'ready' || !updaterState.downloadedPath) return { ok: false, reason: 'The update is not ready to install.' };
  const attempt = (async () => {
    publishUpdaterState({ ...updaterState, restartPending: true, revision: updaterState.revision + 1 });
    const result = await launchInstaller(updaterState.downloadedPath!);
    if (!result.ok) {
      publishUpdaterState(updateFailed(updaterState, result.reason));
      return result;
    }
    return result;
  })();
  installingLatch = attempt;
  const result = await attempt;
  if (!result.ok) {
    if (installingLatch === attempt) installingLatch = undefined;
    return result;
  }
  if (!restartQuitScheduled) {
    restartQuitScheduled = true;
    setImmediate(() => app.quit());
  }
  return result;
});

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440, height: 920, minWidth: 920, minHeight: 640, frame: false, backgroundColor: '#101510', show: false, title: 'Ding PBX Console',
    webPreferences: { preload: join(import.meta.dirname, '../../../app/electron/preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  if (process.env.VITE_DEV_SERVER_URL) mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  else mainWindow.loadFile(join(import.meta.dirname, '../../../dist/index.html'));
}

ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:toggle-maximize', () => mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize());
ipcMain.on('window:close', () => mainWindow?.close());
ipcMain.handle('control-plane:request', async (_event, request: ControlPlaneRequest) => controlPlaneRequest(request));
ipcMain.handle('logo:pick-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow ?? undefined, {
    properties: ['openFile'],
    title: 'Choose a local custom logo image',
    filters: [{ name: 'Logo images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg'] }],
  });
  const sourcePath = result.canceled ? undefined : result.filePaths[0];
  if (!sourcePath) return undefined;
  const info = await stat(sourcePath);
  if (!Number.isSafeInteger(info.size) || info.size < 1 || info.size > LOGO_MAX_INPUT_BYTES) {
    throw new Error(`The selected logo must be between 1 and ${LOGO_MAX_INPUT_BYTES} bytes.`);
  }
  const bytes = await readFile(sourcePath);
  const name = sourcePath.slice(Math.max(sourcePath.lastIndexOf('\\'), sourcePath.lastIndexOf('/')) + 1);
  const extension = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : '';
  const declaredMime = extension === 'svg' ? 'image/svg+xml' : extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : extension ? `image/${extension}` : undefined;
  return { name, bytes: bytes.byteLength, dataBase64: bytes.toString('base64'), declaredMime };
});
ipcMain.handle('converter:pick-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow ?? undefined, { properties: ['openFile'], title: 'Choose a local source file' });
  const sourcePath = result.canceled ? undefined : result.filePaths[0];
  if (!sourcePath) return undefined;
  const info = await stat(sourcePath);
  return { sourcePath, name: sourcePath.slice(Math.max(sourcePath.lastIndexOf('\\'), sourcePath.lastIndexOf('/')) + 1), bytes: info.size };
});
ipcMain.handle('converter:pick-destination', async () => {
  const result = await dialog.showSaveDialog(mainWindow ?? undefined, { title: 'Choose a conversion destination' });
  return result.canceled ? undefined : result.filePath;
});
ipcMain.handle('converter:confirm-overwrite', async (_event, request: { destinationPath?: unknown }) => {
  const destinationPath = typeof request?.destinationPath === 'string' ? request.destinationPath : '';
  if (!destinationPath) return { approved: false, detail: 'No destination path was supplied.' };
  const result = await dialog.showMessageBox(mainWindow ?? undefined, {
    type: 'warning',
    title: 'Confirm overwrite',
    message: `Replace the existing destination?`,
    detail: destinationPath,
    buttons: ['Cancel', 'Replace'],
    defaultId: 0,
    cancelId: 0,
  });
  return result.response === 1
    ? { approved: true, detail: 'The user explicitly approved replacing the destination.' }
    : { approved: false, detail: 'Overwrite was cancelled; the destination was not touched.' };
});

if (handleSquirrelEvent(processHostess(() => app.quit())).handled) {
  app.quit();
} else {
  app.whenReady().then(createWindow).then(scheduleUpdateChecks);
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
}
