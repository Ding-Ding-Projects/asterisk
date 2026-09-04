import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'node:path';
import { handleSquirrelEvent, processHostess } from './squirrel-events.js';
import { createControlPlaneDispatcher } from '../../control-plane/dispatch.js';
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
import { MAX_DISPLAY_NAME_LENGTH } from '../renderer/src/display-name.js';
import { detectInstalledEditors, openInEditor, readEditorSettingsSnapshot } from '../../control-plane/editor-launch.js';
import { openFolderInFileManager } from '../../control-plane/local-folder.js';
import { DEEP_LINK_SCHEME, firstDeepLinkInArgv, parseDeepLink } from '../../shared/deep-link.js';
import type { DeepLinkDelivery } from '../../shared/deep-link.js';

let mainWindow: BrowserWindow | null = null;
const userDataPath = app.getPath('userData');
const dispatcher = createControlPlaneDispatcher({
  /* Straight onto the same channel the updater already uses: one send, no new
   * privilege, and the renderer decides what to do with it. */
  onProvisionStep: (step) => mainWindow?.webContents.send('provision:step', step), userDataPath: app.getPath('userData'), resourcesPath: process.resourcesPath, hosted: false,
  /* `allowedSettingsSourceHosts` is deliberately left unset here rather than passed as
   * an empty array: an unset value tells the dispatcher to load whatever is persisted
   * under `console.settingsSourceAllowlist` in THIS installation's own settings.json --
   * the exact file the settings-sources screen's allowlist controls write to through
   * `settings.write` -- instead of hard-coding an empty, permanently-refuses-everything
   * list at this call site the way this used to. See `createControlPlaneDispatcher`'s own
   * comment beside its settings-source fetcher for the full account of why that used to
   * be silently empty forever. */
})
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

/* ---------------------------------------------------------------- the product route
 *
 * `ding-pbx://destination/<id>?state=…&theme=…&width=…&height=…&scale=…` opens this
 * application at that destination. Every rule about what such a link may say lives in
 * shared/deep-link.ts and is unit-tested there; this file is the plumbing that gets one
 * from the operating system to the renderer, and nothing here re-decides any of it.
 *
 * DELIVERY IS A QUEUE, NOT A BROADCAST, and the reason is a race that would have been
 * invisible. A link handed in on the command line is known before the window exists, so
 * pushing it to the renderer means pushing it at a listener that has not been registered
 * yet; the send succeeds, nothing receives it, and the link silently does nothing. So the
 * renderer PULLS on mount (`deep-link:pending`), and only once it has pulled -- which is
 * proof its listener exists -- does a later link get pushed. */
let deepLinkQueue: DeepLinkDelivery[] = [];
/** Set by the renderer's first `deep-link:pending` call, which is the only evidence the
 *  main process has that anything is listening on the other channel. */
let rendererTakesDeepLinks = false;

/** One URL from the command line into either an accepted target or the refusal it earned.
 *  A refusal travels: a link that quietly does nothing cannot be told apart from one the
 *  operating system never routed here in the first place. */
function deliveryFor(url: string | undefined): DeepLinkDelivery | undefined {
  if (url === undefined) return undefined;
  const parsed = parseDeepLink(url);
  return parsed.ok ? { ok: true, target: parsed.target } : { ok: false, reason: parsed.reason, url };
}

/** The link this process was started with, if it was started with one. Read once, here,
 *  rather than at each use: `process.argv` does not change, and re-reading it in two places
 *  invites the two to disagree about which argument won. */
const startupDelivery = deliveryFor(firstDeepLinkInArgv(process.argv));
if (startupDelivery) deepLinkQueue.push(startupDelivery);

function receiveDeepLink(url: string | undefined): void {
  const delivery = deliveryFor(url);
  if (!delivery) return;
  if (delivery.ok && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setContentSize(delivery.target.width, delivery.target.height);
  }
  if (rendererTakesDeepLinks && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('deep-link:navigate', delivery);
  } else {
    deepLinkQueue.push(delivery);
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
}

ipcMain.handle('deep-link:pending', (): DeepLinkDelivery[] => {
  rendererTakesDeepLinks = true;
  const drained = deepLinkQueue;
  deepLinkQueue = [];
  return drained;
});

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440, height: 920, minWidth: 920, minHeight: 640, frame: false, backgroundColor: '#101510', show: false, title: 'Ding PBX Console',
    webPreferences: { preload: join(import.meta.dirname, '../../../app/electron/preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  /* A link that names a size gets that size, before the window is ever shown, so the route
   * delivers the tuple it declares rather than a window of whatever size happened to be
   * default. The parser has already refused anything below this window's own minimums, so
   * this cannot ask for a box the window would silently widen. */
  if (startupDelivery?.ok) mainWindow.setContentSize(startupDelivery.target.width, startupDelivery.target.height);
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  if (process.env.VITE_DEV_SERVER_URL) mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  else mainWindow.loadFile(join(import.meta.dirname, '../../../dist/index.html'));
}

ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:toggle-maximize', () => mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize());
ipcMain.on('window:close', () => mainWindow?.close());
/* The native OS window title (taskbar, Alt+Tab) is the one identity-adjacent surface a
 * rename cannot reach by re-rendering the page, because it lives here rather than in
 * anything the renderer draws. The renderer already validates the name against
 * `validateDisplayName` before it is ever stored; this bound is a second, independent
 * check on the value actually crossing the process boundary, not a trust of the first. */
ipcMain.on('window:set-title', (_event, title: unknown) => {
  if (typeof title !== 'string') return;
  const trimmed = title.trim();
  if (!trimmed || trimmed.length > MAX_DISPLAY_NAME_LENGTH) return;
  mainWindow?.setTitle(trimmed);
});
ipcMain.handle('control-plane:request', async (_event, request: ControlPlaneRequest) => controlPlaneRequest(request));

/* Forwarded so the renderer's narrator can duck under a real screen reader rather than
 * talking over it. `isAccessibilitySupportEnabled()` and the change event are Chromium's
 * own signal -- set because assistive tech (Narrator, NVDA, JAWS, VoiceOver…) is present
 * and asked for it -- not a guess this app invented. */
ipcMain.handle('accessibility:is-screen-reader-active', () => app.isAccessibilitySupportEnabled());
app.on('accessibility-support-changed', (_event, accessibilitySupportEnabled) => {
  mainWindow?.webContents.send('accessibility:changed', accessibilitySupportEnabled);
});

/* Real installed-editor detection and launch (see `control-plane/editor-launch.ts`).
 * `editors:open` never trusts the renderer for which executable to run: it re-derives
 * the choice from the console's own persisted settings snapshot and re-runs detection,
 * so what it spawns can never be an arbitrary renderer-supplied path. */
ipcMain.handle('editors:detect', async () => detectInstalledEditors().map((entry) => ({ id: entry.definition.id, resolved: entry.resolved })));
ipcMain.handle('editors:open', async (_event, target: { kind: 'file' | 'folder'; path: string }) => {
  const kind = target?.kind === 'folder' ? 'folder' : 'file';
  const path = typeof target?.path === 'string' ? target.path : '';
  return openInEditor(readEditorSettingsSnapshot(userDataPath), { kind, path });
});

/* The console's application-data folder: its real path, and opening it in the platform's
 * file manager -- Support Tickets' one real action, and the folder the external-editor
 * "open here" action hands to the chosen editor. Always `userDataPath`, computed here;
 * the renderer never supplies it and nothing in either channel accepts one. */
ipcMain.handle('local-data:path', async () => userDataPath);
ipcMain.handle('local-data:open-folder', async () => openFolderInFileManager(userDataPath));

if (handleSquirrelEvent(processHostess(() => app.quit())).handled) {
  app.quit();
} else if (!app.requestSingleInstanceLock()) {
  /* A second launch exists to hand its command line to the first and leave. Windows starts a
   * fresh process for every `ding-pbx://` click, so without this the route would open a
   * second copy of the console each time instead of moving the one already running. The lock
   * is scoped to the user-data directory, which is why the capture harness -- which always
   * launches with its own task-scoped `--user-data-dir` -- is unaffected by it and still gets
   * its own instance even while an ordinary one is open. */
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => receiveDeepLink(firstDeepLinkInArgv(argv)));
  /* macOS delivers a scheme link as an event rather than on the command line. Registered
   * because leaving it out would make the route silently dead there rather than obviously
   * absent; recorded plainly as UNEXERCISED, because this project's delivery scope is
   * Windows and nothing here has been run on macOS. */
  app.on('open-url', (event, url) => { event.preventDefault(); receiveDeepLink(url); });
  /* Registered with the operating system only from an installed copy. A development
   * checkout doing this would point the machine's `ding-pbx://` handler at whichever
   * electron.exe happened to run last, hijacking the scheme for every installed copy on
   * the same account. Handling a link is unconditional either way -- a URL passed on the
   * command line is read whether or not this build is the registered handler -- so a
   * development run can still be driven to a destination, it just is not what the shell
   * launches. */
  if (app.isPackaged) app.setAsDefaultProtocolClient(DEEP_LINK_SCHEME);
  app.whenReady().then(createWindow).then(scheduleUpdateChecks);
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
}
