import { app, BrowserWindow, ipcMain } from 'electron';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import * as keytar from 'keytar';
import { handleSquirrelEvent, processHostess } from './squirrel-events.js';
import { createControlPlaneDispatcher } from '../../control-plane/dispatch.js';
import { SCHOOL_CREDENTIAL_ACCOUNT, SCHOOL_CREDENTIAL_SERVICE } from '../../shared/school-contract.js';
import type { ControlPlaneRequest, UpdaterRestartResult, UpdaterStatusForRenderer } from '../../shared/control-plane.js';
import {
  parseVersion, resolveLatestUpdate, validateReleaseIdentity, initialUpdaterState, beganChecking, checkSucceeded,
  updateFailed, beganDownloading, downloadReady, dismissedForNow, verifyDownload, findDigestForAsset,
} from '../../control-plane/updater.js';
import type { UpdaterState } from '../../control-plane/updater.js';
import {
  readCurrentIdentity, fetchReleases, fetchReleaseIdentity, fetchShaSumsText, downloadAsset,
  discardDownload, sweepStaleDownloads, launchInstaller, releaseIdentityDigest,
} from './updater-runtime.js';

let mainWindow: BrowserWindow | null = null;
const dispatcher = createControlPlaneDispatcher({ userDataPath: app.getPath('userData'), resourcesPath: process.resourcesPath, hosted: false });
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
  runPackagedProbeWhenRequested();
}

ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:toggle-maximize', () => mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize());
ipcMain.on('window:close', () => mainWindow?.close());
ipcMain.handle('control-plane:request', async (_event, request: ControlPlaneRequest) => controlPlaneRequest(request));

/** School mode's shared unlock value belongs in the operating-system credential vault,
 * not the settings snapshot or application data. Only success or a neutral reason
 * crosses the renderer boundary, never the stored value. */
ipcMain.handle('school:set-credential', async (_event, candidate: unknown) => {
  if (typeof candidate !== 'string' || candidate.length < 4 || candidate.length > 256) return { ok: false, reason: 'The unlock credential must be between 4 and 256 characters.' };
  try {
    await keytar.setPassword(SCHOOL_CREDENTIAL_SERVICE, SCHOOL_CREDENTIAL_ACCOUNT, candidate);
    return { ok: true };
  } catch {
    return { ok: false, reason: 'The operating-system credential vault could not save the credential.' };
  }
});
ipcMain.handle('school:verify-credential', async (_event, candidate: unknown) => {
  if (typeof candidate !== 'string') return { ok: false, reason: 'The operating-system credential vault is unavailable.' };
  try {
    const stored = await keytar.getPassword(SCHOOL_CREDENTIAL_SERVICE, SCHOOL_CREDENTIAL_ACCOUNT);
    if (stored === null) return { ok: false, reason: 'No School mode unlock credential has been set yet.' };
    return stored === candidate
      ? { ok: true }
      : { ok: false, reason: 'The shared credential was not accepted.' };
  } catch {
    return { ok: false, reason: 'The operating-system credential vault could not verify the credential.' };
  }
});
ipcMain.handle('school:recovery-path', () => ({ ok: true, path: app.getPath('userData') }));
ipcMain.handle('school:packaged-vault-probe', async (_event, expected: unknown) => {
  const candidate = expected as { product?: unknown; packageVersion?: unknown; candidateCommit?: unknown; appId?: unknown };
  const provenancePath = join(process.resourcesPath, 'school-mode-provenance.json');
  let provenanceMatched = false;
  try {
    const provenance = JSON.parse(readFileSync(provenancePath, 'utf8')) as Record<string, unknown>;
    provenanceMatched = provenance.schemaVersion === 1
      && provenance.product === candidate.product
      && provenance.packageVersion === candidate.packageVersion
      && provenance.candidateCommit === candidate.candidateCommit
      && provenance.appId === candidate.appId;
  } catch {
    provenanceMatched = false;
  }
  const service = `${SCHOOL_CREDENTIAL_SERVICE}:packaged-roundtrip:${String(candidate.packageVersion ?? '')}:${String(candidate.candidateCommit ?? '')}`;
  const account = `probe-${randomUUID()}`;
  const value = randomUUID();
  let writeSucceeded = false;
  let readMatched = false;
  let deleteSucceeded = false;
  let absentAfterDelete = false;
  try {
    await keytar.setPassword(service, account, value);
    writeSucceeded = true;
    readMatched = (await keytar.getPassword(service, account)) === value;
    deleteSucceeded = await keytar.deletePassword(service, account);
    absentAfterDelete = (await keytar.getPassword(service, account)) === null;
  } finally {
    if (!deleteSucceeded) await keytar.deletePassword(service, account).catch(() => false);
  }
  return { provenanceMatched, writeSucceeded, readMatched, deleteSucceeded, absentAfterDelete };
});

function packagedProbeResultPath(): string | undefined {
  const prefix = '--school-vault-probe-result=';
  const argument = process.argv.find((value) => value.startsWith(prefix));
  return argument ? argument.slice(prefix.length) : undefined;
}

function runPackagedProbeWhenRequested(): void {
  const resultPath = packagedProbeResultPath();
  if (!resultPath || !mainWindow) return;
  mainWindow.webContents.once('did-finish-load', () => {
    void (async () => {
      try {
        const provenance = JSON.parse(readFileSync(join(process.resourcesPath, 'school-mode-provenance.json'), 'utf8'));
        const result = await mainWindow?.webContents.executeJavaScript(`window.dingDesktop.school.packagedVaultProbe(${JSON.stringify({ product: provenance.product, packageVersion: provenance.packageVersion, candidateCommit: provenance.candidateCommit, appId: provenance.appId })})`, true);
        writeFileSync(resultPath, JSON.stringify(result) + '\n', 'utf8');
      } catch (error) {
        writeFileSync(resultPath, JSON.stringify({ error: error instanceof Error ? error.message : String(error) }) + '\n', 'utf8');
      } finally {
        app.quit();
      }
    })();
  });
}
ipcMain.handle('accessibility:screen-reader', () => app.isAccessibilitySupportEnabled());

if (handleSquirrelEvent(processHostess(() => app.quit())).handled) {
  app.quit();
} else {
  app.whenReady().then(createWindow).then(scheduleUpdateChecks);
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
}
