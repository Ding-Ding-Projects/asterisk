import { app, BrowserWindow, dialog, ipcMain, utilityProcess, type WebContents } from 'electron';
import { lstat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { execFile, spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { randomUUID } from 'node:crypto';
import { MAX_DISPLAY_NAME_LENGTH } from '../renderer/src/display-name.js';
import { handleSquirrelEvent, processHostess } from './squirrel-events.js';
import { createControlPlaneDispatcher } from '../../control-plane/dispatch.js';
import { createVaultReference } from '../../control-plane/status-hub-client.js';
import { detectInstalledEditors, openInEditor, readEditorSettingsSnapshot } from '../../control-plane/editor-launch.js';
import { openFolderInFileManager } from '../../control-plane/local-folder.js';
import type { ControlPlaneRequest, NativeHostStatus, UpdaterRestartResult, UpdaterStatusForRenderer } from '../../shared/control-plane.js';
import type { DownloadCommand, DownloadSurfaceKind, ExtensionDownloadHandoff } from '../../shared/download-transfer.js';
import { isExtensionDownloadHandoff } from '../../shared/download-transfer.js';
import { DOWNLOAD_NATIVE_MESSAGE_LIMIT, isNativeDownloadIngressMessage, type NativeIngressConfig } from '../../shared/native-messaging.js';
import { SCHOOL_CREDENTIAL_ACCOUNT, SCHOOL_CREDENTIAL_SERVICE } from '../../shared/school-contract.js';
import { DESTINATION_ROUTE_SCHEME, firstDestinationRouteArgument } from '../../shared/destination-route.js';
// @ts-ignore CommonJS helper is shared with the standalone junction fixture.
import { assertNoReparseAncestors } from './probe-path.cjs';
import { createDestinationRouteRouter } from './deep-link.js';
import {
  parseVersion, resolveLatestUpdate, validateReleaseIdentity, initialUpdaterState, beganChecking, checkSucceeded,
  updateFailed, beganDownloading, downloadReady, installerLaunchFailed, dismissedForNow, verifyDownload, findDigestForAsset,
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
let nativeIngressBroker: ChildProcessWithoutNullStreams | undefined;
let stoppingNativeIngressBroker: ChildProcessWithoutNullStreams | undefined;
let nativeIngressConfig: NativeIngressConfig | undefined;
const execFileAsync = promisify(execFile);
let nativeHostStatus: NativeHostStatus = { state: 'unavailable', message: 'Native extension ingress has not been registered.', retryable: true };
let probeAuthorization: string | undefined;
let probeAuthorizationConsumed = false;
// This is the installed identity, not the renameable display label. Existing profiles, vault
// entries, settings, and history live here, so changing it would strand every prior install.
const SHIPPED_DATA_DIRECTORY = 'Ding PBX Console';
const shippedUserDataPath = join(app.getPath('appData'), SHIPPED_DATA_DIRECTORY);
app.setPath('userData', shippedUserDataPath);
const probeModeRequested = process.argv.some((value) => value.startsWith('--school-vault-probe-result='));
const requestedProbeUserData = probeModeRequested ? process.argv.find((value) => value.startsWith('--user-data-dir='))?.slice('--user-data-dir='.length) : undefined;
if (probeModeRequested && !requestedProbeUserData) throw new Error('Probe mode requires an isolated user-data path.');
if (requestedProbeUserData) {
  assertNoReparseAncestors(requestedProbeUserData);
  app.setPath('userData', resolvePath(requestedProbeUserData));
  if (resolvePath(app.getPath('userData')) !== resolvePath(requestedProbeUserData)) throw new Error('Probe user-data equality failed.');
}
const probeUserDataMatches = probeModeRequested && requestedProbeUserData ? resolvePath(app.getPath('userData')) === resolvePath(requestedProbeUserData) : false;
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
type KeytarWorkerRequest = { operation: 'set' | 'verify' | 'delete' | 'absence'; service: string; account: string; value?: string };
type KeytarWorkerResponse = { ok: boolean; matched?: boolean; missing?: boolean; deleted?: boolean; absent?: boolean; error?: string };
async function runKeytarWorker(request: KeytarWorkerRequest, timeoutMs = 3000): Promise<KeytarWorkerResponse> {
  const worker = utilityProcess.fork(join(import.meta.dirname, 'keytar-worker.js'), [], { stdio: 'pipe', serviceName: 'ding-pbx-keytar-probe' });
  return await new Promise((resolve, reject) => {
    let output = ''; let settled = false;
    const timer = setTimeout(() => fail(new Error('The credential-vault worker did not exit after its bounded cancellation.')), timeoutMs);
    const finish = (value: KeytarWorkerResponse) => { if (!settled) { settled = true; clearTimeout(timer); resolve(value); } };
    const fail = (error: Error) => { if (!settled) { settled = true; clearTimeout(timer); worker.kill(); reject(error); } };
    worker.stdout?.on('data', (chunk: Buffer | string) => { output += chunk.toString(); if (output.length > 8192) fail(new Error('The credential-vault worker returned an oversized response.')); });
    worker.once('exit', (code) => { if (settled) return; if (code !== 0) return fail(new Error('The credential-vault worker exited without a successful response.')); try { finish(JSON.parse(output.trim().split('\n')[0] ?? '') as KeytarWorkerResponse); } catch { fail(new Error('The credential-vault worker returned malformed response data.')); } });
    worker.postMessage(request);
  });
}
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
      publishUpdaterState(installerLaunchFailed(updaterState, result.reason));
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

/* A protocol activation can arrive before this process has a loaded renderer, or while
 * the current renderer is reloading. The router retains only the newest valid route until
 * this process can deliver it, rather than dropping the activation into an absent listener. */
let rendererLoaded = false;
const destinationRoutes = createDestinationRouteRouter((route) => {
  if (!mainWindow || mainWindow.isDestroyed() || !rendererLoaded) return false;
  mainWindow.webContents.send('deep-link:destination', route);
  return true;
});

function revealMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440, height: 920, minWidth: 920, minHeight: 640, frame: false, backgroundColor: '#101510', show: false, title: 'Material Asterisk',
    webPreferences: { preload: join(import.meta.dirname, '../../../app/electron/preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.webContents.on('did-start-loading', () => { rendererLoaded = false; });
  mainWindow.webContents.on('did-finish-load', () => { rendererLoaded = true; destinationRoutes.flush(); });
  if (process.env.VITE_DEV_SERVER_URL) mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  else mainWindow.loadFile(join(import.meta.dirname, '../../../dist/index.html'));
}

ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:toggle-maximize', () => mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize());
ipcMain.on('window:close', () => mainWindow?.close());
ipcMain.on('window:set-title', (_event, value: unknown) => {
  if (typeof value !== 'string') return;
  const title = value.trim();
  if (title.length > 0 && title.length <= MAX_DISPLAY_NAME_LENGTH) mainWindow?.setTitle(title);
});
ipcMain.handle('accessibility:screen-reader', () => app.isAccessibilitySupportEnabled());
app.on('accessibility-support-changed', (_event, active: boolean) => {
  for (const window of BrowserWindow.getAllWindows()) if (!window.isDestroyed()) window.webContents.send('accessibility:changed', active);
});
ipcMain.handle('editors:detect', async () => detectInstalledEditors().map((entry) => ({ id: entry.definition.id, resolved: entry.resolved })));
ipcMain.handle('editors:open', async (_event, target: { kind?: unknown; path?: unknown }) => {
  const kind = target?.kind === 'folder' ? 'folder' : 'file';
  const path = typeof target?.path === 'string' ? target.path : '';
  return openInEditor(readEditorSettingsSnapshot(app.getPath('userData')), { kind, path });
});
ipcMain.handle('local-data:path', async () => app.getPath('userData'));
ipcMain.handle('local-data:open-folder', async () => openFolderInFileManager(app.getPath('userData')));
ipcMain.handle('dialog:pick-folder', async () => {
  if (!mainWindow) return undefined;
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory', 'createDirectory'] });
  return result.canceled ? undefined : result.filePaths[0];
});
ipcMain.handle('control-plane:request', async (_event, request: ControlPlaneRequest) => controlPlaneRequest(request));
ipcMain.handle('school:set-credential', async (_event, candidate: unknown) => {
  if (typeof candidate !== 'string' || candidate.length < 4 || candidate.length > 256) return { ok: false, reason: 'The unlock credential must be between 4 and 256 characters.' };
  try { const result = await runKeytarWorker({ operation: 'set', service: SCHOOL_CREDENTIAL_SERVICE, account: SCHOOL_CREDENTIAL_ACCOUNT, value: candidate }); return result.ok ? { ok: true } : { ok: false, reason: result.error ?? 'The operating-system credential vault could not save the credential.' }; }
  catch { return { ok: false, reason: 'The operating-system credential vault could not save the credential.' }; }
});
ipcMain.handle('school:verify-credential', async (_event, candidate: unknown) => {
  if (typeof candidate !== 'string') return { ok: false, reason: 'The operating-system credential vault is unavailable.' };
  try { const result = await runKeytarWorker({ operation: 'verify', service: SCHOOL_CREDENTIAL_SERVICE, account: SCHOOL_CREDENTIAL_ACCOUNT, value: candidate }); return result.ok && result.matched ? { ok: true } : { ok: false, reason: result.missing ? 'No School mode unlock credential has been set yet.' : result.error ?? 'The shared credential was not accepted.' }; }
  catch { return { ok: false, reason: 'The operating-system credential vault could not verify the credential.' }; }
});
ipcMain.handle('school:recovery-path', () => ({ ok: true, path: app.getPath('userData') }));
async function acceptExtensionHandoff(handoff: ExtensionDownloadHandoff, senderWindow: BrowserWindow | null): Promise<{ accepted: boolean; detail: string }> {
  if (!isExtensionDownloadHandoff(handoff)) return { accepted: false, detail: 'The extension handoff failed its bounded validation.' };
  let chosenPath = downloadTransfers.isDestinationApproved(handoff.destinationPath) ? handoff.destinationPath : undefined;
  if (!chosenPath) {
    if (handoff.destinationKind === 'folder') {
      const approved = senderWindow ? await dialog.showOpenDialog(senderWindow, { properties: ['openDirectory'], title: 'Choose the download destination folder' }) : await dialog.showOpenDialog({ properties: ['openDirectory'], title: 'Choose the download destination folder' });
      chosenPath = approved.canceled ? undefined : approved.filePaths[0];
    } else {
      const approved = senderWindow ? await dialog.showSaveDialog(senderWindow, { defaultPath: handoff.destinationPath, title: 'Choose the download destination file' }) : await dialog.showSaveDialog({ defaultPath: handoff.destinationPath, title: 'Choose the download destination file' });
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
}

function readNativeIngressConfig(): NativeIngressConfig | undefined {
  const root = process.env.LOCALAPPDATA;
  if (!root) return undefined;
  const path = join(root, 'Ding-Ding-Projects', 'Asterisk', 'native-messaging', 'ingress-config.json');
  if (!existsSync(path)) return undefined;
  try {
    const value = JSON.parse(readFileSync(path, 'utf8')) as Partial<NativeIngressConfig>;
    if (value.schemaVersion !== 1 || value.extensionId !== 'dnpkplcgjmipnndmghkhljjoefjhidab') return undefined;
    if (typeof value.pipeName !== 'string' || !/^\\\\\.\\pipe\\ding-pbx-download-[a-z0-9]{32}$/u.test(value.pipeName)) return undefined;
    if (typeof value.challenge !== 'string' || !/^[0-9a-f]{64}$/iu.test(value.challenge)) return undefined;
    if (typeof value.executablePath !== 'string' || !/^([A-Za-z]:\\|\\\\)/u.test(value.executablePath)) return undefined;
    if (typeof value.executableSha256 !== 'string' || !/^[0-9a-f]{64}$/iu.test(value.executableSha256)) return undefined;
    if (!existsSync(value.executablePath)) return undefined;
    const digest = createHash('sha256').update(readFileSync(value.executablePath)).digest('hex');
    if (digest.toLowerCase() !== value.executableSha256.toLowerCase()) return undefined;
    if (typeof value.brokerPath !== 'string' || !/^([A-Za-z]:\\|\\\\)/u.test(value.brokerPath)) return undefined;
    if (typeof value.brokerSha256 !== 'string' || !/^[0-9a-f]{64}$/iu.test(value.brokerSha256)) return undefined;
    if (!existsSync(value.brokerPath)) return undefined;
    const brokerDigest = createHash('sha256').update(readFileSync(value.brokerPath)).digest('hex');
    if (brokerDigest.toLowerCase() !== value.brokerSha256.toLowerCase()) return undefined;
    if (typeof value.secureHelperPath !== 'string' || !/^([A-Za-z]:\\|\\\\)/u.test(value.secureHelperPath) || !existsSync(value.secureHelperPath)) return undefined;
    if (typeof value.secureHelperSha256 !== 'string' || !/^[0-9a-f]{64}$/iu.test(value.secureHelperSha256)) return undefined;
    const helperDigest = createHash('sha256').update(readFileSync(value.secureHelperPath)).digest('hex');
    if (helperDigest.toLowerCase() !== value.secureHelperSha256.toLowerCase()) return undefined;
    if (typeof value.manifestPath !== 'string' || !/^([A-Za-z]:\\|\\\\)/u.test(value.manifestPath) || !existsSync(value.manifestPath)) return undefined;
    return { schemaVersion: 1, pipeName: value.pipeName, challenge: value.challenge.toLowerCase(), extensionId: value.extensionId as NativeIngressConfig['extensionId'], executablePath: value.executablePath, executableSha256: digest, brokerPath: value.brokerPath, brokerSha256: brokerDigest, secureHelperPath: value.secureHelperPath, secureHelperSha256: helperDigest, manifestPath: value.manifestPath, configPath: path };
  } catch { return undefined; }
}

async function verifyNativeIngressAcl(configPath: string): Promise<boolean> {
  const escaped = configPath.replace(/'/g, "''");
  const script = `$acl=Get-Acl -LiteralPath '${escaped}'; $user=[System.Security.Principal.WindowsIdentity]::GetCurrent().User.Translate([System.Security.Principal.NTAccount]).Value; if ($acl.Owner -ne $user -or -not $acl.AreAccessRulesProtected) { exit 1 }; $allowed=@($user,'NT AUTHORITY\\SYSTEM'); $rules=@($acl.Access); if ($rules.Count -ne 2) { exit 1 }; foreach ($rule in $rules) { if ($allowed -notcontains $rule.IdentityReference.Value -or $rule.AccessControlType -ne 'Allow' -or ($rule.FileSystemRights -band [System.Security.AccessControl.FileSystemRights]::FullControl) -ne [System.Security.AccessControl.FileSystemRights]::FullControl -or $rule.IsInherited) { exit 1 } }; exit 0`;
  try { await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true, timeout: 3000, maxBuffer: 16 * 1024 }); return true; } catch { return false; }
}

function publishNativeHostStatus(status: NativeHostStatus): void {
  nativeHostStatus = status;
  for (const window of BrowserWindow.getAllWindows()) if (!window.isDestroyed()) window.webContents.send('native-host:status', status);
}

function nativeHostScriptPath(): string {
  const packaged = join(process.resourcesPath, 'native-messaging', 'register-native-host.ps1');
  return existsSync(packaged) ? packaged : join(app.getAppPath(), 'native-messaging', 'register-native-host.ps1');
}

async function registerNativeHost(): Promise<NativeHostStatus> {
  publishNativeHostStatus({ state: 'starting', message: 'Registering the native extension ingress.', retryable: true });
  const installRoot = app.isPackaged ? dirname(process.resourcesPath) : app.getAppPath();
  try {
    const result = await execFileAsync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', nativeHostScriptPath(), '-InstallRoot', installRoot, '-Browser', 'all'], { windowsHide: true, timeout: 30_000, maxBuffer: 64 * 1024 });
    const receipt = JSON.parse(String(result.stdout).trim()) as { accepted?: unknown; browsers?: unknown; executablePath?: unknown; executableSha256?: unknown };
    if (receipt.accepted !== true || !Array.isArray(receipt.browsers) || receipt.browsers.length !== 2) throw new Error('The registration helper did not return a verified Chrome and Edge receipt.');
    await reloadNativeDownloadIngress();
    if (!['ready', 'error', 'unavailable'].includes(nativeHostStatus.state)) return { state: 'error', message: 'Native ingress registration did not settle on a terminal readiness state.', retryable: true };
    return nativeHostStatus;
  } catch (error) {
    downloadTransfers.setSecureTempHelperPath(undefined);
    const status = { state: 'error' as const, message: error instanceof Error ? error.message : 'Native extension ingress registration failed.', retryable: true };
    publishNativeHostStatus(status);
    return status;
  }
}

ipcMain.handle('download:submit-handoff', async (_event, handoff: ExtensionDownloadHandoff) => acceptExtensionHandoff(handoff, BrowserWindow.fromWebContents(_event.sender) ?? mainWindow));
ipcMain.handle('native-host:get-status', async () => nativeHostStatus);
ipcMain.handle('native-host:register', async () => registerNativeHost());

async function startNativeDownloadIngress(): Promise<void> {
  if (process.platform !== 'win32' || nativeIngressBroker) return;
  downloadTransfers.setSecureTempHelperPath(undefined);
  nativeIngressConfig = readNativeIngressConfig();
  if (!nativeIngressConfig) { publishNativeHostStatus({ state: 'unavailable', message: 'The native ingress configuration or executable proof is unavailable.', retryable: true }); return; }
  const paths = [nativeIngressConfig.configPath, nativeIngressConfig.manifestPath, nativeIngressConfig.executablePath, nativeIngressConfig.brokerPath, nativeIngressConfig.secureHelperPath];
  const aclVerified = await Promise.all(paths.map((path) => verifyNativeIngressAcl(path)));
  if (aclVerified.some((verified) => !verified)) { nativeIngressConfig = undefined; downloadTransfers.setSecureTempHelperPath(undefined); publishNativeHostStatus({ state: 'error', message: 'The native ingress configuration, manifest, executable, broker, or helper owner and ACL could not be verified.', retryable: true }); return; }
  downloadTransfers.setSecureTempHelperPath(nativeIngressConfig.secureHelperPath);
  let broker: ChildProcessWithoutNullStreams;
  try { broker = spawn(nativeIngressConfig.brokerPath, ['--listen', nativeIngressConfig.pipeName], { stdio: 'pipe', windowsHide: true }); }
  catch (error) { nativeIngressConfig = undefined; downloadTransfers.setSecureTempHelperPath(undefined); publishNativeHostStatus({ state: 'error', message: error instanceof Error ? error.message : 'The native ingress broker could not start.', retryable: true }); return; }
  nativeIngressBroker = broker;
  let buffer = '';
  let ready = false;
  let startupSettled = false;
  let settleStartup: (error?: Error) => void = () => undefined;
  const startup = new Promise<void>((resolve, reject) => { settleStartup = (error) => { startupSettled = true; error ? reject(error) : resolve(); }; });
  const startupTimer = setTimeout(() => {
    if (startupSettled) return;
    if (nativeIngressBroker === broker) broker.kill();
    downloadTransfers.setSecureTempHelperPath(undefined);
    nativeIngressConfig = undefined;
    const error = new Error('The native ingress broker did not become ready before its startup deadline.');
    publishNativeHostStatus({ state: 'error', message: error.message, retryable: true });
    settleStartup(error);
  }, 5_000);
  broker.stdout.setEncoding('utf8');
  broker.stdout.on('data', (chunk: string) => {
    buffer += chunk;
    if (Buffer.byteLength(buffer, 'utf8') > DOWNLOAD_NATIVE_MESSAGE_LIMIT * 2) { downloadTransfers.setSecureTempHelperPath(undefined); broker.kill(); return; }
    for (;;) {
      const newline = buffer.indexOf('\n');
      if (newline < 0) return;
      const text = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      if (text === 'READY') {
        if (!nativeIngressConfig || startupSettled) { downloadTransfers.setSecureTempHelperPath(undefined); broker.kill(); continue; }
        ready = true;
        publishNativeHostStatus({ state: 'ready', message: 'The native extension ingress is ready.', retryable: true, executablePath: nativeIngressConfig?.executablePath, executableSha256: nativeIngressConfig?.executableSha256, browsers: ['chrome', 'edge'] });
        if (!startupSettled) { clearTimeout(startupTimer); settleStartup(); }
        continue;
      }
      if (!nativeIngressConfig) { downloadTransfers.setSecureTempHelperPath(undefined); broker.kill(); continue; }
      try {
        const envelope = JSON.parse(text) as { challenge?: unknown; payload?: unknown };
        if (envelope.challenge !== nativeIngressConfig?.challenge || !isNativeDownloadIngressMessage(envelope.payload)) {
          broker.stdin.write(`${JSON.stringify({ accepted: false, detail: 'The native ingress challenge, extension identity, or handoff shape was refused.' })}\n`);
          continue;
        }
        void acceptExtensionHandoff(envelope.payload.handoff, mainWindow).then((receipt) => broker.stdin.write(`${JSON.stringify(receipt)}\n`)).catch((error) => broker.stdin.write(`${JSON.stringify({ accepted: false, detail: error instanceof Error ? error.message : 'The native ingress handoff was refused.' })}\n`));
      } catch { broker.stdin.write(`${JSON.stringify({ accepted: false, detail: 'The native ingress message was not valid JSON.' })}\n`); }
    }
  });
  broker.on('error', (error) => { downloadTransfers.setSecureTempHelperPath(undefined); nativeIngressConfig = undefined; if (nativeIngressBroker === broker) nativeIngressBroker = undefined; if (!startupSettled) { clearTimeout(startupTimer); publishNativeHostStatus({ state: 'error', message: error.message, retryable: true }); settleStartup(error); } else publishNativeHostStatus({ state: 'error', message: error.message, retryable: true }); });
  broker.on('close', () => { if (stoppingNativeIngressBroker === broker) { stoppingNativeIngressBroker = undefined; if (nativeIngressBroker === broker) nativeIngressBroker = undefined; return; } downloadTransfers.setSecureTempHelperPath(undefined); nativeIngressConfig = undefined; if (nativeIngressBroker === broker) nativeIngressBroker = undefined; if (!startupSettled) { clearTimeout(startupTimer); const error = new Error('The native ingress broker stopped before readiness.'); publishNativeHostStatus({ state: 'unavailable', message: error.message, retryable: true }); settleStartup(error); } else if (ready) publishNativeHostStatus({ state: 'error', message: 'The native ingress broker stopped before another handoff could be accepted.', retryable: true }); });
  await startup.catch(() => undefined);
}

async function stopNativeDownloadIngress(): Promise<boolean> {
  downloadTransfers.setSecureTempHelperPath(undefined);
  const broker = nativeIngressBroker;
  if (!broker) return true;
  stoppingNativeIngressBroker = broker;
  broker.kill();
  const closed = await Promise.race([new Promise<boolean>((resolve) => broker.once('close', () => resolve(true))), new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5_000))]);
  if (!closed) { publishNativeHostStatus({ state: 'error', message: 'The previous native ingress broker did not close before reload.', retryable: true }); return false; }
  if (nativeIngressBroker === broker) nativeIngressBroker = undefined;
  stoppingNativeIngressBroker = undefined;
  nativeIngressConfig = undefined;
  downloadTransfers.setSecureTempHelperPath(undefined);
  publishNativeHostStatus({ state: 'unavailable', message: 'The native extension ingress is stopped.', retryable: true });
  return true;
}

async function reloadNativeDownloadIngress(): Promise<void> { if (await stopNativeDownloadIngress()) await startNativeDownloadIngress(); }

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
  } else void window.loadFile(join(import.meta.dirname, '../../../dist/index.html'), { query: { downloadWindow: kind, ...(binding.handoffId ? { downloadHandoffId: binding.handoffId } : {}), ...(binding.transferId ? { downloadTransferId: binding.transferId } : {}) } });
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
ipcMain.handle('download:handoffs', async (_event) => {
  const entry = windowEntryForContents(_event.sender);
  if (entry?.[0] !== 'start' || !entry[1].handoffId) return [];
  return downloadTransfers.listPendingHandoffs().filter((handoff) => handoff.handoffId === entry[1].handoffId);
});
ipcMain.handle('download:start', async (_event, handoff: ExtensionDownloadHandoff) => {
  const senderWindow = BrowserWindow.fromWebContents(_event.sender) ?? mainWindow;
  const senderRecord = windowRecordForContents(_event.sender);
  const senderEntry = windowEntryForContents(_event.sender);
  if (!senderEntry || senderEntry[0] !== 'start') return { accepted: false, handoffId: handoff.handoffId, command: 'start', observedAt: new Date().toISOString(), status: 'rejected', code: 'DOWNLOAD_WINDOW_CONTEXT_REQUIRED', detail: 'Only a dedicated bound Start window may start a handoff.' };
  if (senderRecord?.handoffId && senderRecord.handoffId !== handoff.handoffId) return { accepted: false, handoffId: handoff.handoffId, command: 'start', observedAt: new Date().toISOString(), status: 'rejected', code: 'DOWNLOAD_WINDOW_HANDOFF_MISMATCH', detail: 'The Start window is bound to a different handoff.' };
  const receipt = await downloadTransfers.start(handoff);
  if (receipt.accepted) { const record = windowRecordForContents(_event.sender); const startRecord = downloadWindows.get('start'); if (startRecord?.handoffId === handoff.handoffId) startRecord.handoffId = undefined; closeDownloadRecord('start', record?.handoffId); closeDownloadRecord('start', handoff.handoffId); openDownloadWindow('progress', { handoffId: handoff.handoffId, transferId: receipt.transferId, origin: senderWindow }); }
  return receipt;
});
ipcMain.handle('download:cancel-handoff', async (_event, handoffId: string) => {
  const record = windowRecordForContents(_event.sender);
  const entry = windowEntryForContents(_event.sender);
  if (!entry || entry[0] !== 'start') return { accepted: false, handoffId, command: 'cancel', observedAt: new Date().toISOString(), status: 'rejected', code: 'DOWNLOAD_WINDOW_CONTEXT_REQUIRED', detail: 'Only a dedicated bound Start window may cancel its pending handoff.' };
  if (record?.handoffId && record.handoffId !== handoffId) return { accepted: false, handoffId, command: 'cancel', observedAt: new Date().toISOString(), status: 'rejected', code: 'DOWNLOAD_WINDOW_HANDOFF_MISMATCH', detail: 'The Start window is bound to a different handoff.' };
  const receipt = await downloadTransfers.cancelHandoff(handoffId);
  if (receipt.accepted) { const startRecord = downloadWindows.get('start'); if (startRecord?.handoffId === handoffId) startRecord.handoffId = undefined; closeDownloadRecord('start', handoffId); openNextPendingStart(record?.origin); }
  return receipt;
});
ipcMain.handle('download:command', async (_event, transferId: string, command: Exclude<DownloadCommand, 'start'>) => {
  const record = windowRecordForContents(_event.sender);
  if (!record || record.transferId !== transferId) return { accepted: false, handoffId: record?.handoffId ?? '', command, observedAt: new Date().toISOString(), status: 'rejected', code: 'DOWNLOAD_WINDOW_CONTEXT_REQUIRED', detail: 'Only the dedicated bound transfer window may issue this command.' };
  return downloadTransfers.command(transferId, command);
});
ipcMain.handle('download:snapshot', async (_event, transferId: string) => {
  const record = windowRecordForContents(_event.sender);
  if (!record || record.transferId !== transferId) return undefined;
  return downloadTransfers.getSnapshot(transferId);
});
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
  const result = mainWindow ? await dialog.showOpenDialog(mainWindow, { properties: ['openFile'], title: 'Choose a local source file' }) : await dialog.showOpenDialog({ properties: ['openFile'], title: 'Choose a local source file' });
  const sourcePath = result.canceled ? undefined : result.filePaths[0];
  if (!sourcePath) return undefined;
  const info = await lstat(sourcePath);
  if (info.isSymbolicLink() || !info.isFile()) return undefined;
  return { sourcePath, name: sourcePath.slice(Math.max(sourcePath.lastIndexOf('\\'), sourcePath.lastIndexOf('/')) + 1), bytes: info.size };
});
ipcMain.handle('converter:pick-destination', async () => {
  const result = mainWindow ? await dialog.showSaveDialog(mainWindow, { title: 'Choose a conversion destination' }) : await dialog.showSaveDialog({ title: 'Choose a conversion destination' });
  return result.canceled ? undefined : result.filePath;
});
ipcMain.handle('converter:confirm-overwrite', async (_event, request: { destinationPath?: unknown }) => {
  const destinationPath = typeof request?.destinationPath === 'string' ? request.destinationPath : '';
  if (!destinationPath) return { approved: false, detail: 'No destination path was supplied.' };
  const options = {
    type: 'warning' as const,
    title: 'Confirm overwrite',
    message: `Replace the existing destination?`,
    detail: destinationPath,
    buttons: ['Cancel', 'Replace'],
    defaultId: 0,
    cancelId: 0,
  };
  const result = mainWindow ? await dialog.showMessageBox(mainWindow, options) : await dialog.showMessageBox(options);
  return result.response === 1
    ? { approved: true, detail: 'The user explicitly approved replacing the destination.' }
    : { approved: false, detail: 'Overwrite was cancelled; the destination was not touched.' };
});

if (handleSquirrelEvent(processHostess(() => app.quit())).handled) {
  app.quit();
} else if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    revealMainWindow();
    const route = firstDestinationRouteArgument(argv);
    if (route) destinationRoutes.offer(route);
  });
  app.on('open-url', (event, url) => {
    event.preventDefault();
    revealMainWindow();
    destinationRoutes.offer(url);
  });
  const launchRoute = firstDestinationRouteArgument(process.argv);
  if (launchRoute) destinationRoutes.offer(launchRoute);
  app.whenReady().then(async () => {
    const scheme = DESTINATION_ROUTE_SCHEME.replace(':', '');
    if (app.isPackaged) app.setAsDefaultProtocolClient(scheme);
    else app.setAsDefaultProtocolClient(scheme, process.execPath, [join(import.meta.dirname, '../../..')]);
    createWindow();
    await startNativeDownloadIngress();
  }).then(async () => {
    await downloadTransfers.initialize();
    const latest = downloadTransfers.getLatestSnapshot();
    if (latest?.status === 'partial') openDownloadWindow('progress', { handoffId: latest.handoffId, transferId: latest.transferId, origin: mainWindow });
    else if (latest?.status === 'failed') openDownloadWindow('complete', { handoffId: latest.handoffId, transferId: latest.transferId, origin: mainWindow });
    else {
      const handoffs = downloadTransfers.listPendingHandoffs();
      if (handoffs.length > 0) openNextPendingStart(mainWindow);
    }
  }).then(scheduleUpdateChecks);
  app.on('will-quit', (event) => {
    if (!nativeIngressBroker || stoppingNativeIngressBroker) return;
    event.preventDefault();
    void stopNativeDownloadIngress().then((closed) => { if (closed) app.quit(); });
  });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
}
