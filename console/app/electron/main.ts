import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'node:path';
import { handleSquirrelEvent, processHostess } from './squirrel-events.js';
import { createControlPlaneDispatcher } from '../../control-plane/dispatch.js';
import type { ControlPlaneRequest, ControlPlaneResponse } from '../../shared/control-plane.js';
import type { UpdaterStatusForRenderer } from '../../shared/control-plane.js';
import {
  parseReleaseTag, resolveLatestUpdate, initialUpdaterState, beganChecking, checkSucceeded,
  updateFailed, beganDownloading, downloadReady, dismissedForNow, verifyDownload, findDigestForAsset,
} from '../../control-plane/updater.js';
import type { UpdaterState } from '../../control-plane/updater.js';
import {
  readCurrentTag, fetchReleases, downloadAsset, fetchShaSumsText, discardDownload, launchInstallerAndQuit,
} from './updater-runtime.js';

let mainWindow: BrowserWindow | null = null;
const dispatcher = createControlPlaneDispatcher({
  userDataPath: app.getPath('userData'),
  resourcesPath: process.resourcesPath,
  hosted: false,
});
const { controlPlaneRequest } = dispatcher;

/*
 * Update checking. See `control-plane/updater.ts` for why this downloads a full Setup.exe
 * from GitHub Releases rather than driving Electron's built-in (Squirrel-protocol)
 * `autoUpdater`: this project's delivery workflow publishes each push as its own
 * self-contained release rather than one running multi-version feed directory, so the
 * Squirrel delta-update wire protocol has nothing to reconstruct a chain from. Signing is
 * permanently prohibited for this project; the feed and every downloaded artifact remain
 * unsigned, and this code never claims otherwise. Only bytes are verified, via SHA-256.
 */
const UPDATE_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;
let updaterState: UpdaterState = initialUpdaterState(undefined);

function currentOrdinal() {
  const tag = readCurrentTag();
  return tag ? parseReleaseTag(tag) : undefined;
}

function toRendererStatus(state: UpdaterState): UpdaterStatusForRenderer {
  return {
    state: state.state,
    latestVersion: state.resolved?.tag,
    releaseUrl: state.resolved?.releaseUrl,
    lastError: state.lastError,
  };
}

function publishUpdaterState(next: UpdaterState) {
  updaterState = next;
  mainWindow?.webContents.send('updater:status', toRendererStatus(updaterState));
}

/** Runs one full check-and-download cycle. Never throws; every failure lands in `updateFailed`. */
async function runUpdateCheck(): Promise<void> {
  publishUpdaterState(beganChecking(updaterState, new Date()));
  let releases;
  try {
    releases = await fetchReleases();
  } catch (error) {
    publishUpdaterState(updateFailed(updaterState, error instanceof Error ? error.message : String(error)));
    return;
  }
  const resolved = resolveLatestUpdate(releases, currentOrdinal());
  publishUpdaterState(checkSucceeded(updaterState, resolved));
  if (!resolved) return;

  publishUpdaterState(beganDownloading(updaterState));
  try {
    const [file, shaSumsText] = await Promise.all([
      downloadAsset(resolved.setupAsset),
      fetchShaSumsText(resolved),
    ]);
    const expectedDigest = shaSumsText ? findDigestForAsset(shaSumsText, resolved.setupAsset.name) : undefined;
    const verdict = verifyDownload(resolved, file, expectedDigest);
    if (!verdict.ok) {
      discardDownload(file.path);
      publishUpdaterState(updateFailed(updaterState, verdict.reason));
      return;
    }
    publishUpdaterState(downloadReady(updaterState, file.path));
  } catch (error) {
    publishUpdaterState(updateFailed(updaterState, error instanceof Error ? error.message : String(error)));
  }
}

function scheduleUpdateChecks() {
  updaterState = initialUpdaterState(readCurrentTag());
  void runUpdateCheck();
  setInterval(() => { void runUpdateCheck(); }, UPDATE_CHECK_INTERVAL_MS);
}

ipcMain.handle('updater:get-status', () => toRendererStatus(updaterState));
ipcMain.handle('updater:check-now', async () => { await runUpdateCheck(); return toRendererStatus(updaterState); });
ipcMain.on('updater:dismiss', () => publishUpdaterState(dismissedForNow(updaterState)));
ipcMain.on('updater:restart-to-install', () => {
  if (updaterState.state === 'ready' && updaterState.downloadedPath) launchInstallerAndQuit(updaterState.downloadedPath);
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 920,
    minHeight: 640,
    frame: false,
    backgroundColor: '#101510',
    show: false,
    title: 'Ding PBX Console',
    webPreferences: {
      preload: join(import.meta.dirname, '../../../app/electron/preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  if (process.env.VITE_DEV_SERVER_URL) mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  else mainWindow.loadFile(join(import.meta.dirname, '../../../dist/index.html'));
}

ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:toggle-maximize', () => mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize());
ipcMain.on('window:close', () => mainWindow?.close());
ipcMain.handle('control-plane:request', async (_event, request: ControlPlaneRequest) => controlPlaneRequest(request));

/* Before anything else. Squirrel launches the app with a --squirrel-* argument on
 * install, update and uninstall and waits about fifteen seconds for it to finish and
 * exit; an app that does not recognise the argument just starts normally, so Squirrel
 * waits out the whole timeout and gives up on the hook. Any work done ahead of this
 * check — opening a window, reading configuration — is spent from that same budget. */
if (handleSquirrelEvent(processHostess(() => app.quit())).handled) {
  app.quit();
} else {
  app.whenReady().then(createWindow).then(scheduleUpdateChecks);
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
}
