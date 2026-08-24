import { app, BrowserWindow, dialog, ipcMain, type WebContents } from 'electron';
import { stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { handleSquirrelEvent, processHostess } from './squirrel-events.js';
import { createControlPlaneDispatcher } from '../../control-plane/dispatch.js';
import { createVaultReference } from '../../control-plane/status-hub-client.js';
import type { ControlPlaneRequest, UpdaterRestartResult, UpdaterStatusForRenderer } from '../../shared/control-plane.js';
import type { DownloadCommand, DownloadSurfaceKind, ExtensionDownloadHandoff } from '../../shared/download-transfer.js';
import { isExtensionDownloadHandoff } from '../../shared/download-transfer.js';
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
interface DownloadWindowRecord { window: BrowserWindow; handoffId?: string; transferId?: string; origin?: BrowserWindow | null; }
const downloadWindows = new Map<DownloadSurfaceKind, DownloadWindowRecord>();
let downloadOriginWindow: BrowserWindow | null = null;
function vaultReferenceFromEnvironment(name: string) {
  const value = process.env[name];
  if (!value) return undefined;
  try { return createVaultReference(value); } catch { return undefined; }
}

const dispatcher = createControlPlaneDispatcher({
  userDataPath: app.getPath('userData'),
  resourcesPath: process.resourcesPath,
  hosted: false,
  statusHubBaseUrl: process.env.STATUS_HUB_URL,
  statusHubCredentials: {
    enrollment: vaultReferenceFromEnvironment('STATUS_HUB_ENROLLMENT_REF'),
    reply: vaultReferenceFromEnvironment('STATUS_HUB_REPLY_REF'),
  },
});
const { controlPlaneRequest, downloadTransfers } = dispatcher;
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
ipcMain.handle('download:submit-handoff', async (_event, handoff: ExtensionDownloadHandoff) => {
  if (!isExtensionDownloadHandoff(handoff)) return { accepted: false, detail: 'The extension handoff failed its bounded validation.' };
  const senderWindow = BrowserWindow.fromWebContents(_event.sender) ?? mainWindow;
  let chosenPath = downloadTransfers.isDestinationApproved(handoff.destinationPath) ? handoff.destinationPath : undefined;
  if (!chosenPath) {
    if (handoff.destinationKind === 'folder') {
      const approved = await dialog.showOpenDialog(senderWindow ?? undefined, { properties: ['openDirectory'], title: 'Choose the download destination folder' });
      chosenPath = approved.canceled ? undefined : approved.filePaths[0];
    } else {
      const approved = await dialog.showSaveDialog(senderWindow ?? undefined, { defaultPath: handoff.destinationPath, title: 'Choose the download destination file' });
      chosenPath = approved.canceled ? undefined : approved.filePath;
    }
    if (!chosenPath) return { accepted: false, detail: 'The native destination picker was cancelled; no handoff was recorded.' };
    const approvedRoot = downloadTransfers.approveDestinationRoot(handoff.destinationKind === 'folder' ? chosenPath : dirname(chosenPath));
    if (!approvedRoot.accepted) return { accepted: false, detail: approvedRoot.detail };
  }
  if (!chosenPath) return { accepted: false, detail: 'No approved destination path is available.' };
  const result = downloadTransfers.registerHandoff({ ...handoff, destinationPath: chosenPath });
  if (result.accepted && result.handoff) openNextPendingStart(senderWindow);
  return result;
});

function windowRecordForContents(contents: WebContents): DownloadWindowRecord | undefined {
  return [...downloadWindows.values()].find((record) => record.window.webContents === contents);
}
function windowEntryForContents(contents: WebContents): [DownloadSurfaceKind, DownloadWindowRecord] | undefined {
  return [...downloadWindows.entries()].find(([, record]) => record.window.webContents === contents);
}

function openDownloadWindow(kind: DownloadSurfaceKind, binding: { handoffId?: string; transferId?: string; origin?: BrowserWindow | null } = {}): BrowserWindow {
  const existing = downloadWindows.get(kind);
  if (existing && !existing.window.isDestroyed()) { existing.window.show(); existing.window.focus(); return existing.window; }
  downloadOriginWindow = binding.origin ?? downloadOriginWindow ?? mainWindow;
  const window = new BrowserWindow({
    width: kind === 'complete' ? 620 : 760,
    height: kind === 'complete' ? 220 : 720,
    minWidth: 420,
    minHeight: kind === 'complete' ? 180 : 420,
    frame: false,
    show: false,
    alwaysOnTop: true,
    parent: mainWindow ?? undefined,
    backgroundColor: '#101510',
    title: kind === 'start' ? 'Start download' : kind === 'progress' ? 'Downloading' : 'Download complete',
    webPreferences: { preload: join(import.meta.dirname, '../../../app/electron/preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  const record: DownloadWindowRecord = { window, handoffId: binding.handoffId, transferId: binding.transferId, origin: downloadOriginWindow };
  downloadWindows.set(kind, record);
  window.once('ready-to-show', () => { window.show(); window.focus(); });
  window.on('closed', () => {
    if (downloadWindows.get(kind) === record) downloadWindows.delete(kind);
    if (kind === 'start' && record.handoffId) {
      const handoffId = record.handoffId;
      void downloadTransfers.cancelHandoff(handoffId).then(() => openNextPendingStart(record.origin));
    }
    if (kind === 'complete') openNextPendingStart(record.origin);
    record.origin?.focus();
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    const url = new URL(process.env.VITE_DEV_SERVER_URL);
    url.searchParams.set('downloadWindow', kind);
    if (binding.handoffId) url.searchParams.set('downloadHandoffId', binding.handoffId);
    if (binding.transferId) url.searchParams.set('downloadTransferId', binding.transferId);
    void window.loadURL(url.href);
  } else void window.loadFile(join(import.meta.dirname, '../../../dist/index.html'), { query: { downloadWindow: kind, ...(binding.handoffId ? { downloadHandoffId: binding.handoffId } : {}), ...(binding.transferId ? { downloadTransferId: binding.transferId } : {}) });
  return window;
}

function closeDownloadWindow(kind: DownloadSurfaceKind): void {
  const record = downloadWindows.get(kind);
  if (record && !record.window.isDestroyed()) record.window.close();
  if (kind === 'start') record?.origin?.focus();
}

function closeDownloadRecord(kind: DownloadSurfaceKind, handoffId?: string, transferId?: string): void {
  const record = downloadWindows.get(kind);
  if (!record) return;
  if (handoffId && record.handoffId !== handoffId) return;
  if (transferId && record.transferId !== transferId) return;
  closeDownloadWindow(kind);
}

function sendDownload(kind: DownloadSurfaceKind, handoffId: string | undefined, channel: string, payload: unknown): void {
  const record = downloadWindows.get(kind);
  if (!record || (handoffId && record.handoffId !== handoffId) || record.window.isDestroyed()) return;
  record.window.webContents.send(channel, payload);
}

function openNextPendingStart(origin?: BrowserWindow | null): void {
  if (downloadWindows.has('start')) return;
  const handoff = downloadTransfers.nextPendingHandoff();
  if (!handoff) return;
  openDownloadWindow('start', { handoffId: handoff.handoffId, origin });
  sendDownload('start', handoff.handoffId, 'download:handoff', handoff);
}
ipcMain.handle('download:handoffs', async () => downloadTransfers.listPendingHandoffs());
ipcMain.handle('download:start', async (_event, handoff: ExtensionDownloadHandoff) => {
  const senderWindow = BrowserWindow.fromWebContents(_event.sender) ?? mainWindow;
  const senderRecord = windowRecordForContents(_event.sender);
  const senderEntry = windowEntryForContents(_event.sender);
  if (senderEntry && senderEntry[0] !== 'start') return { accepted: false, handoffId: handoff.handoffId, command: 'start', observedAt: new Date().toISOString(), status: 'rejected', code: 'DOWNLOAD_WINDOW_ACTION_MISMATCH', detail: 'Only the bound Start window may start its handoff.' };
  if (senderRecord?.handoffId && senderRecord.handoffId !== handoff.handoffId) return { accepted: false, handoffId: handoff.handoffId, command: 'start', observedAt: new Date().toISOString(), status: 'rejected', code: 'DOWNLOAD_WINDOW_HANDOFF_MISMATCH', detail: 'The Start window is bound to a different handoff.' };
  const receipt = await downloadTransfers.start(handoff);
  if (receipt.accepted) { const record = windowRecordForContents(_event.sender); const startRecord = downloadWindows.get('start'); if (startRecord?.handoffId === handoff.handoffId) startRecord.handoffId = undefined; closeDownloadRecord('start', record?.handoffId); closeDownloadRecord('start', handoff.handoffId); openDownloadWindow('progress', { handoffId: handoff.handoffId, transferId: receipt.transferId, origin: senderWindow }); }
  return receipt;
});
ipcMain.handle('download:cancel-handoff', async (_event, handoffId: string) => {
  const record = windowRecordForContents(_event.sender);
  const entry = windowEntryForContents(_event.sender);
  if (entry && entry[0] !== 'start') return { accepted: false, handoffId, command: 'cancel', observedAt: new Date().toISOString(), status: 'rejected', code: 'DOWNLOAD_WINDOW_ACTION_MISMATCH', detail: 'Only the bound Start window may cancel its pending handoff.' };
  if (record?.handoffId && record.handoffId !== handoffId) return { accepted: false, handoffId, command: 'cancel', observedAt: new Date().toISOString(), status: 'rejected', code: 'DOWNLOAD_WINDOW_HANDOFF_MISMATCH', detail: 'The Start window is bound to a different handoff.' };
  const receipt = await downloadTransfers.cancelHandoff(handoffId);
  if (receipt.accepted) { const startRecord = downloadWindows.get('start'); if (startRecord?.handoffId === handoffId) startRecord.handoffId = undefined; closeDownloadRecord('start', handoffId); openNextPendingStart(record?.origin); }
  return receipt;
});
ipcMain.handle('download:command', async (_event, transferId: string, command: Exclude<DownloadCommand, 'start'>) => {
  const record = windowRecordForContents(_event.sender);
  if (record && record.transferId !== transferId) return { accepted: false, handoffId: record.handoffId ?? '', command, observedAt: new Date().toISOString(), status: 'rejected', code: 'DOWNLOAD_WINDOW_TRANSFER_MISMATCH', detail: 'The window is bound to a different transfer.' };
  return downloadTransfers.command(transferId, command);
});
ipcMain.handle('download:snapshot', async (_event, transferId: string) => {
  const record = windowRecordForContents(_event.sender);
  if (record && record.transferId !== transferId) return undefined;
  return downloadTransfers.getSnapshot(transferId);
});
ipcMain.handle('download:latest-snapshot', async () => downloadTransfers.getLatestSnapshot());
ipcMain.handle('download:close-window', async (_event, kind: DownloadSurfaceKind) => { const entry = windowEntryForContents(_event.sender); if (entry?.[0] === kind) closeDownloadWindow(kind); });
ipcMain.handle('download:open-window', async (_event, kind: DownloadSurfaceKind) => { const entry = windowEntryForContents(_event.sender); const record = entry?.[1]; if (kind === 'start' && !entry) openNextPendingStart(BrowserWindow.fromWebContents(_event.sender) ?? mainWindow); else if (entry?.[0] === kind && (record?.handoffId || record?.transferId)) openDownloadWindow(kind, { handoffId: record.handoffId, transferId: record.transferId, origin: record.origin }); });
downloadTransfers.subscribeGlobal((snapshot) => {
  sendDownload('progress', snapshot.handoffId, 'download:snapshot', snapshot);
  sendDownload('complete', snapshot.handoffId, 'download:snapshot', snapshot);
  if (snapshot.status === 'queued' || snapshot.status === 'downloading' || snapshot.status === 'paused' || snapshot.status === 'partial') { closeDownloadRecord('complete', snapshot.handoffId); openDownloadWindow('progress', { handoffId: snapshot.handoffId, transferId: snapshot.transferId }); }
  if (snapshot.status === 'completed' || snapshot.status === 'failed' || snapshot.status === 'cancelled') {
    const progressRecord = downloadWindows.get('progress');
    const origin = progressRecord?.origin;
    closeDownloadRecord('progress', snapshot.handoffId, snapshot.transferId);
    openDownloadWindow('complete', { handoffId: snapshot.handoffId, transferId: snapshot.transferId, origin });
  }
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
  app.whenReady().then(createWindow).then(async () => {
    await downloadTransfers.initialize();
    const latest = downloadTransfers.getLatestSnapshot();
    if (latest?.status === 'partial') openDownloadWindow('progress', { handoffId: latest.handoffId, transferId: latest.transferId, origin: mainWindow });
    else if (latest?.status === 'failed') openDownloadWindow('complete', { handoffId: latest.handoffId, transferId: latest.transferId, origin: mainWindow });
    else {
      const handoffs = downloadTransfers.listPendingHandoffs();
      if (handoffs.length > 0) openNextPendingStart(mainWindow);
    }
  }).then(scheduleUpdateChecks);
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
}
