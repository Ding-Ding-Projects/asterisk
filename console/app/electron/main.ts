import { app, BrowserWindow, ipcMain, utilityProcess } from 'electron';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve as resolvePath } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { handleSquirrelEvent, processHostess } from './squirrel-events.js';
import { createControlPlaneDispatcher } from '../../control-plane/dispatch.js';
import { SCHOOL_CREDENTIAL_ACCOUNT, SCHOOL_CREDENTIAL_SERVICE } from '../../shared/school-contract.js';
// @ts-ignore CommonJS helper is shared with the standalone junction fixture.
import { assertNoReparseAncestors } from './probe-path.cjs';
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
let probeAuthorization: string | undefined;
let probeAuthorizationConsumed = false;
const probeModeRequested = process.argv.some((value) => value.startsWith('--school-vault-probe-result='));
const requestedProbeUserData = probeModeRequested ? process.argv.find((value) => value.startsWith('--user-data-dir='))?.slice('--user-data-dir='.length) : undefined;
if (probeModeRequested && !requestedProbeUserData) throw new Error('Probe mode requires an isolated user-data path.');
if (requestedProbeUserData) {
  assertNoReparseAncestors(requestedProbeUserData);
  app.setPath('userData', resolvePath(requestedProbeUserData));
  const actualProbeUserData = resolvePath(app.getPath('userData'));
  if (actualProbeUserData !== resolvePath(requestedProbeUserData)) throw new Error(`Probe user-data equality failed: requested and actual paths are both present but equality is ${actualProbeUserData === resolvePath(requestedProbeUserData)}.`);
}
const probeUserDataMatches = probeModeRequested && requestedProbeUserData ? resolvePath(app.getPath('userData')) === resolvePath(requestedProbeUserData) : false;
const dispatcher = createControlPlaneDispatcher({ userDataPath: app.getPath('userData'), resourcesPath: process.resourcesPath, hosted: false });
const { controlPlaneRequest } = dispatcher;
type KeytarWorkerRequest = {
  operation: 'set' | 'verify' | 'delete' | 'absence';
  service: string;
  account: string;
  value?: string;
};
type KeytarWorkerResponse = {
  ok: boolean;
  matched?: boolean;
  missing?: boolean;
  deleted?: boolean;
  absent?: boolean;
  error?: string;
};

async function runKeytarWorker(request: KeytarWorkerRequest, timeoutMs = 3000): Promise<KeytarWorkerResponse> {
  const workerPath = join(import.meta.dirname, 'keytar-worker.js');
  const worker = utilityProcess.fork(workerPath, [], { stdio: 'pipe', serviceName: 'ding-pbx-keytar-probe' });
  return await new Promise<KeytarWorkerResponse>((resolve, reject) => {
    let output = '';
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let killTimer: ReturnType<typeof setTimeout> | undefined;
    const complete = (value: KeytarWorkerResponse): void => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (killTimer) clearTimeout(killTimer);
      resolve(value);
    };
    const fail = (error: Error): void => {
      if (settled) return;
      if (!worker.killed) worker.kill();
      killTimer = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(error);
      }, 1000);
      worker.once('exit', () => {
        if (settled) return;
        settled = true;
        if (killTimer) clearTimeout(killTimer);
        reject(error);
      });
    };
    worker.stdout?.on('data', (chunk: Buffer | string) => {
      output += chunk.toString();
      if (output.length > 8192) fail(new Error('The credential-vault worker returned an oversized response.'));
    });
    worker.once('error', (error) => fail(error));
    worker.once('exit', (code) => {
      if (settled) return;
      if (code !== 0) return fail(new Error('The credential-vault worker exited without a successful response.'));
      try {
        const line = output.trim().split('\n')[0] ?? '';
        complete(JSON.parse(line) as KeytarWorkerResponse);
      } catch {
        fail(new Error('The credential-vault worker returned malformed response data.'));
      }
    });
    timer = setTimeout(() => {
      fail(new Error('The credential-vault worker did not exit after its bounded cancellation.'));
    }, timeoutMs);
    worker.stdin?.end(`${JSON.stringify(request)}\n`);
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

function createProbeWindow(): void {
  registerPackagedProbeHandlers();
  probeAuthorization = randomUUID();
  mainWindow = new BrowserWindow({
    width: 1, height: 1, show: false, skipTaskbar: true,
    webPreferences: {
      preload: join(import.meta.dirname, '../../../app/electron/preload-probe.cjs'),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      partition: 'temp:ding-pbx-school-vault-probe', backgroundThrottling: false,
      additionalArguments: ['--school-vault-probe-mode'],
    },
  });
  runPackagedProbeWhenRequested();
  void mainWindow.loadURL('data:text/html,<html><body></body></html>');
}

function createWindow(): void {
  if (packagedProbeResultPath()) {
    createProbeWindow();
    return;
  }
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
    const result = await runKeytarWorker({ operation: 'set', service: SCHOOL_CREDENTIAL_SERVICE, account: SCHOOL_CREDENTIAL_ACCOUNT, value: candidate });
    return result.ok ? { ok: true } : { ok: false, reason: result.error ?? 'The operating-system credential vault could not save the credential.' };
  } catch {
    return { ok: false, reason: 'The operating-system credential vault could not save the credential.' };
  }
});
ipcMain.handle('school:verify-credential', async (_event, candidate: unknown) => {
  if (typeof candidate !== 'string') return { ok: false, reason: 'The operating-system credential vault is unavailable.' };
  try {
    const result = await runKeytarWorker({ operation: 'verify', service: SCHOOL_CREDENTIAL_SERVICE, account: SCHOOL_CREDENTIAL_ACCOUNT, value: candidate });
    if (result.missing) return { ok: false, reason: 'No School mode unlock credential has been set yet.' };
    return result.ok && result.matched
      ? { ok: true }
      : { ok: false, reason: result.error ?? 'The shared credential was not accepted.' };
  } catch {
    return { ok: false, reason: 'The operating-system credential vault could not verify the credential.' };
  }
});
ipcMain.handle('school:recovery-path', () => ({ ok: true, path: app.getPath('userData') }));
function registerPackagedProbeHandlers(): void {
ipcMain.handle('school:probe-authorize', () => {
  const resultPath = packagedProbeResultPath();
  if (!resultPath || !probeAuthorization || probeAuthorizationConsumed) return undefined;
  return probeAuthorization;
});
ipcMain.handle('school:packaged-vault-probe', async (_event, authorization: unknown, expected: unknown) => {
  if (!probeAuthorization || probeAuthorizationConsumed || authorization !== probeAuthorization || !packagedProbeResultPath()) {
    return { provenanceMatched: false, writeSucceeded: false, readMatched: false, deleteSucceeded: false, absentAfterDelete: false, rejected: true };
  }
  const candidate = expected as { product?: unknown; packageVersion?: unknown; candidateCommit?: unknown; appId?: unknown };
  const provenancePath = join(process.resourcesPath, 'school-mode-provenance.json');
  let provenanceMatched = false;
  let provenanceSha256 = '';
  try {
    const provenanceBytes = readFileSync(provenancePath);
    provenanceSha256 = createHash('sha256').update(provenanceBytes).digest('hex');
    const provenance = JSON.parse(provenanceBytes.toString('utf8')) as Record<string, unknown>;
    provenanceMatched = provenance.schemaVersion === 1
      && provenance.product === candidate.product
      && provenance.packageVersion === candidate.packageVersion
      && provenance.candidateCommit === candidate.candidateCommit
      && provenance.appId === candidate.appId;
  } catch {
    provenanceMatched = false;
  }
  if (!provenanceMatched) return { provenanceMatched: false, writeSucceeded: false, readMatched: false, deleteSucceeded: false, absentAfterDelete: false, rejected: true };
  probeAuthorizationConsumed = true;
  const service = `${SCHOOL_CREDENTIAL_SERVICE}:packaged-roundtrip:${String(candidate.packageVersion ?? '')}:${String(candidate.candidateCommit ?? '')}`;
  const account = `probe-${randomUUID()}`;
  const value = randomUUID();
  let writeSucceeded = false;
  let readMatched = false;
  let deleteSucceeded = false;
  let absentAfterDelete = false;
  let vaultOperations = 0;
  let deleteAttempts = 0;
  let cleanupPasses = 0;
  const maxDeleteAttempts = 3;
  let cleanupError: string | undefined;
  const runVaultOperation = async (operation: KeytarWorkerRequest): Promise<KeytarWorkerResponse> => {
    vaultOperations += 1;
    return await runKeytarWorker(operation);
  };
  const cleanupProbe = async (): Promise<void> => {
    cleanupPasses += 1;
    while (deleteAttempts < maxDeleteAttempts) {
      deleteAttempts += 1;
      try {
        const deleted = await runVaultOperation({ operation: 'delete', service, account });
        const absent = await runVaultOperation({ operation: 'absence', service, account });
        if (deleted.ok && deleted.deleted && absent.ok && absent.absent) {
          deleteSucceeded = true;
          absentAfterDelete = true;
          cleanupError = undefined;
          return;
        }
        cleanupError = `Vault deletion attempt ${deleteAttempts} did not prove both deletion and absence.`;
      } catch (error) {
        cleanupError = error instanceof Error ? error.message : String(error);
      }
    }
  };
  try {
    const setResult = await runVaultOperation({ operation: 'set', service, account, value });
    writeSucceeded = setResult.ok;
    const readResult = await runVaultOperation({ operation: 'verify', service, account, value });
    readMatched = readResult.ok && readResult.matched === true;
    await cleanupProbe();
  } finally {
    if (!deleteSucceeded || !absentAfterDelete) await cleanupProbe();
  }
  const executableSha256 = createHash('sha256').update(readFileSync(process.execPath)).digest('hex');
  return {
    provenanceMatched, writeSucceeded, readMatched, deleteSucceeded, absentAfterDelete,
    cleanup: { deleteAttempts, maxDeleteAttempts, cleanupPasses, vaultOperations, cleanupError },
    artifact: { product: String(candidate.product ?? ''), packageVersion: String(candidate.packageVersion ?? ''), candidateCommit: String(candidate.candidateCommit ?? ''), appId: String(candidate.appId ?? ''), provenanceSha256, probeUserDataMatches, executableSha256, executableVersion: app.getVersion(), executableProduct: app.getName() },
  };
});
}

function packagedProbeResultPath(): string | undefined {
  const prefix = '--school-vault-probe-result=';
  const argument = process.argv.find((value) => value.startsWith(prefix));
  return argument ? argument.slice(prefix.length) : undefined;
}

function expectedProbeIdentity(): { product: string; packageVersion: string; candidateCommit: string; appId: string } {
  const read = (prefix: string): string | undefined => {
    const argument = process.argv.find((value) => value.startsWith(prefix));
    return argument?.slice(prefix.length);
  };
  const product = read('--school-vault-expected-product=');
  const packageVersion = read('--school-vault-expected-version=');
  const candidateCommit = read('--school-vault-expected-commit=');
  const appId = read('--school-vault-expected-app-id=');
  if (!product || !packageVersion || !candidateCommit || !appId) throw new Error('Probe mode requires the independent packaging-controller identity.');
  return { product, packageVersion, candidateCommit, appId };
}

function runPackagedProbeWhenRequested(): void {
  const resultPath = packagedProbeResultPath();
  if (!resultPath || !mainWindow) return;
  mainWindow.webContents.once('did-finish-load', () => {
    void (async () => {
      try {
        const expected = expectedProbeIdentity();
        const result = await mainWindow?.webContents.executeJavaScript(`window.dingDesktop.school.packagedVaultProbe(${JSON.stringify(expected)})`, true);
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
  app.whenReady().then(createWindow).then(() => { if (!packagedProbeResultPath()) scheduleUpdateChecks(); });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
}
