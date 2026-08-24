import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { handleSquirrelEvent, processHostess } from './squirrel-events.js';
import { createControlPlaneDispatcher } from '../../control-plane/dispatch.js';
import { ExternalEditorRuntime } from '../../control-plane/external-editor-runtime.js';
import type { ControlPlaneRequest, ExternalEditorCustomRecord, ExternalEditorLaunchTarget, UpdaterRestartResult, UpdaterStatusForRenderer } from '../../shared/control-plane.js';
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
const externalEditor = new ExternalEditorRuntime({ userDataPath: app.getPath('userData') });
const { controlPlaneRequest } = dispatcher;
const UPDATE_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;
let updateCheckInFlight: Promise<void> | undefined;
let updateGeneration = 0;
let installingLatch: Promise<UpdaterRestartResult> | undefined;
let restartQuitScheduled = false;
let editorPickerBusy = false;

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

ipcMain.handle('external-editor:detect', () => externalEditor.status());
ipcMain.handle('external-editor:choose', (_event, editorId: unknown) => externalEditor.choose(String(editorId ?? '')));
ipcMain.handle('external-editor:clear-choice', () => externalEditor.clearChoice());
ipcMain.handle('external-editor:reset-storage', () => externalEditor.resetStorage());
ipcMain.handle('external-editor:save-custom', (_event, record: ExternalEditorCustomRecord) => externalEditor.saveCustom(record));
ipcMain.handle('external-editor:remove-custom', (_event, editorId: unknown) => externalEditor.removeCustom(String(editorId ?? '')));
ipcMain.handle('external-editor:save-portable', (_event, executable: unknown) => externalEditor.savePortable(String(executable ?? '')));
ipcMain.handle('external-editor:pick-executable', async () => {
  const operationId = randomUUID();
  if (editorPickerBusy) return { operationId, canceled: true, reason: 'busy' as const };
  editorPickerBusy = true;
  try {
    const result = await dialog.showOpenDialog(mainWindow ?? undefined, {
      title: 'Choose an editor executable',
      properties: ['openFile'],
      filters: [{ name: 'Programs', extensions: ['exe', 'com'] }, { name: 'All files', extensions: ['*'] }],
    });
    return { operationId, canceled: result.canceled, executable: result.canceled ? undefined : result.filePaths[0], reason: result.canceled ? 'user-cancelled' as const : 'picked' as const };
  } finally { editorPickerBusy = false; }
});
ipcMain.handle('external-editor:pick-folder', async () => {
  const operationId = randomUUID();
  if (editorPickerBusy) return { operationId, canceled: true, reason: 'busy' as const };
  editorPickerBusy = true;
  try {
    const result = await dialog.showOpenDialog(mainWindow ?? undefined, { title: 'Choose a local project folder', properties: ['openDirectory', 'createDirectory'] });
    return { operationId, canceled: result.canceled, folder: result.canceled ? undefined : result.filePaths[0], reason: result.canceled ? 'user-cancelled' as const : 'picked' as const };
  } finally { editorPickerBusy = false; }
});
ipcMain.handle('external-editor:open-download', async (_event, editorId?: string) => {
  const resolved = externalEditor.openDownload(editorId);
  if (!resolved.ok) return resolved;
  const allowed = new Set(['https://code.visualstudio.com/', 'https://code.visualstudio.com/insiders/', 'https://code.visualstudio.com/download', 'https://notepad-plus-plus.org/', 'https://www.sublimetext.com/']);
  const url = allowed.has(resolved.message) ? resolved.message : undefined;
  if (!url) return { ok: false, message: 'The official download link was not on the exact allowlist.' };
  try { await shell.openExternal(url); return { ok: true, message: url }; }
  catch (error) { return { ok: false, message: error instanceof Error ? error.message : 'The official download link could not be opened.' }; }
});
ipcMain.handle('external-editor:open-project', (_event, folder: unknown, editorId?: string) => externalEditor.launch({ kind: 'folder', path: String(folder ?? '') }, editorId));
ipcMain.handle('external-editor:launch', (_event, target: ExternalEditorLaunchTarget, editorId?: string) => externalEditor.launch(target, editorId));
ipcMain.handle('external-editor:open-export', (_event, input: { name: string; content: string; source?: string; editorId?: string }) => externalEditor.openExport(input));
ipcMain.handle('external-editor:open-materialized-file', (_event, input: { name: string; content: string; source: string; editorId?: string }) => externalEditor.openMaterializedFile(input));

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

if (handleSquirrelEvent(processHostess(() => app.quit())).handled) {
  app.quit();
} else {
  app.whenReady().then(createWindow).then(scheduleUpdateChecks);
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
}
