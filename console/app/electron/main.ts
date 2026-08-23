import { app, BrowserWindow, ipcMain } from 'electron';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { WslProvisioning, MANAGED_DISTRIBUTION } from '../../control-plane/wsl-provisioning.js';
import { AsteriskReadings, DialplanReadings, LocalAsteriskCliGateway, NodeProcessExecutor, READ_ONLY_COMMANDS, TargetDiscovery } from '../../control-plane/index.js';
import type { ReadOnlyCommand, TargetProfile } from '../../control-plane/index.js';
import type { ControlPlaneRequest, ControlPlaneResponse, PbxReadView } from '../../shared/control-plane.js';

let mainWindow: BrowserWindow | null = null;
const processExecutor = new NodeProcessExecutor({ allowedExecutables: ['wsl.exe', 'docker'] });
const targetDiscovery = new TargetDiscovery(processExecutor);
const cliGateway = new LocalAsteriskCliGateway(processExecutor);
const readings = new AsteriskReadings(cliGateway);
const dialplanReadings = new DialplanReadings(cliGateway);

/** A read only ever runs against a distribution that the current discovery result contains. */
async function resolveTarget(serverId: string | undefined): Promise<TargetProfile> {
  const distribution = serverId?.trim();
  if (!distribution) throw new Error('Select a discovered WSL distribution first.');
  const discovered = await targetDiscovery.discoverWslDistributions();
  if (!discovered.includes(distribution)) throw new Error('The WSL distribution is not in the current discovery result.');
  return { id: distribution, displayName: distribution, connectionKind: 'wsl', wslDistribution: distribution };
}

async function readView(target: TargetProfile, view: PbxReadView) {
  if (view === 'dash') {
    const [channels, endpoints, queues, uptime] = await Promise.all([
      readings.channels(target), readings.endpoints(target), readings.queues(target), readings.uptimeSeconds(target),
    ]);
    return { channels, endpoints, queues, uptime };
  }
  if (view === 'live') return { channels: await readings.channels(target) };
  if (view === 'endpoints') {
    const [endpoints, contacts] = await Promise.all([readings.endpoints(target), readings.contacts(target)]);
    return { endpoints, contacts };
  }
  if (view === 'trunks') return { registrations: await readings.registrations(target) };
  if (view === 'queues') return { queues: await readings.queues(target) };
  if (view === 'canvas') return { dialplan: await dialplanReadings.graph(target) };
  return { modules: await readings.modules(target) };
}

function bundledAsteriskRuntime() {
  const root = join(process.resourcesPath, 'asterisk');
  const rootfs = join(root, 'asterisk-wsl-rootfs.tar');
  const provenance = join(root, 'asterisk-wsl-rootfs.json');
  if (!existsSync(rootfs) || !existsSync(provenance)) return { state: 'unavailable', reason: 'The packaged Asterisk WSL runtime is missing.' };
  try {
    const record = JSON.parse(readFileSync(provenance, 'utf8')) as Record<string, unknown>;
    return { state: 'available', rootfs, provenance, record };
  } catch {
    return { state: 'unavailable', reason: 'The packaged Asterisk WSL runtime provenance is invalid.' };
  }
}

/**
 * The console's own WSL distribution, created from the payload inside the installer.
 *
 * The virtual disk lives under the user's own application data rather than anywhere
 * needing elevation, and the directory is created on demand because `wsl --import`
 * expects its destination to exist.
 */
function wslProvisioning() {
  const runtime = bundledAsteriskRuntime();
  const installDirectory = join(app.getPath('userData'), 'wsl');
  mkdirSync(installDirectory, { recursive: true });
  return {
    payloadPresent: runtime.state === 'available',
    runtime,
    provisioning: new WslProvisioning({
      executor: processExecutor,
      rootfsPath: runtime.state === 'available' ? (runtime as { rootfs: string }).rootfs : '',
      installDirectory,
    }),
  };
}

async function controlPlaneRequest(request: ControlPlaneRequest): Promise<ControlPlaneResponse> {
  try {
    /* Creating, inspecting and removing the console's own distribution. Each is scoped
     * to that one distribution name and never touches a distribution the user made. */
    if (request.action === 'runtime.status') {
      const { provisioning, payloadPresent, runtime } = wslProvisioning();
      return { ok: true, requestId: request.requestId, data: { managedDistribution: MANAGED_DISTRIBUTION, bundledRuntime: runtime, status: await provisioning.status(payloadPresent) } };
    }
    if (request.action === 'runtime.provision') {
      const { provisioning, payloadPresent } = wslProvisioning();
      const outcome = await provisioning.provision(payloadPresent);
      return { ok: outcome.status.state === 'ready', requestId: request.requestId, code: outcome.status.state === 'ready' ? undefined : 'RUNTIME_PROVISION_FAILED', message: outcome.status.reason, data: outcome } as ControlPlaneResponse;
    }
    if (request.action === 'runtime.stop') {
      const { provisioning } = wslProvisioning();
      const step = await provisioning.stop();
      return { ok: step.ok, requestId: request.requestId, code: step.ok ? undefined : 'RUNTIME_STOP_FAILED', message: step.ok ? undefined : step.detail, data: step } as ControlPlaneResponse;
    }
    if (request.action === 'runtime.remove') {
      /* Irreversible: it discards everything inside the distribution. The renderer puts
       * this behind the product's destructive-action confirmation, and the module
       * refuses any name other than the one the console created. */
      const { provisioning } = wslProvisioning();
      const step = await provisioning.remove(request.serverId?.trim() ?? '');
      return { ok: step.ok, requestId: request.requestId, code: step.ok ? undefined : 'RUNTIME_REMOVE_REFUSED', message: step.ok ? undefined : step.detail, data: step } as ControlPlaneResponse;
    }
    if (request.action === 'server.list') {
      const [wsl, containers] = await Promise.all([
        targetDiscovery.discoverWslDistributions().catch(error => ({ unavailable: error instanceof Error ? error.message : 'WSL discovery failed' })),
        targetDiscovery.discoverLocalDocker('ding-pbx-console').catch(error => ({ unavailable: error instanceof Error ? error.message : 'Docker discovery failed' })),
      ]);
      return { ok: true, requestId: request.requestId, data: { observedAt: new Date().toISOString(), bundledRuntime: bundledAsteriskRuntime(), wsl, containers } };
    }
    if (request.action === 'server.connect' || request.action === 'pbx.snapshot') {
      const distribution = request.serverId?.trim();
      if (!distribution) return { ok: false, requestId: request.requestId, code: 'TARGET_REQUIRED', message: 'Select a discovered WSL distribution.' };
      const discovered = await targetDiscovery.discoverWslDistributions();
      if (!discovered.includes(distribution)) return { ok: false, requestId: request.requestId, code: 'TARGET_NOT_DISCOVERED', message: 'The WSL distribution is not in the current discovery result.' };
      const [os, asterisk] = await Promise.all([
        processExecutor.execute({ executable: 'wsl.exe', args: ['-d', distribution, '--', 'cat', '/etc/os-release'], timeoutMs: 10_000 }),
        processExecutor.execute({ executable: 'wsl.exe', args: ['-d', distribution, '--', 'asterisk', '-rx', 'core show version'], timeoutMs: 10_000 }),
      ]);
      return { ok: true, requestId: request.requestId, data: {
        target: { connectionKind: 'wsl', distribution },
        operatingSystem: os.status === 'succeeded' ? targetDiscovery.parseDebianOperatingSystem(os.stdout) : { state: 'unavailable', reason: os.stderr, observedAt: new Date().toISOString() },
        asterisk: asterisk.status === 'succeeded' ? { state: 'available', value: asterisk.stdout.trim(), observedAt: new Date().toISOString() } : { state: 'unavailable', reason: asterisk.stderr || 'Asterisk is not installed or not running.', observedAt: new Date().toISOString() },
      } };
    }
    /**
     * Runs one command against the connected target and returns what it actually said.
     *
     * Every confirmation flow in the interface used to end by announcing that the
     * command had been "executed and attested" without anything having been run. This
     * is the path that makes the announcement true. A command outside the read-only
     * allowlist is refused by name rather than performed, and the refusal is returned
     * to the caller so the interface can say so — an honest refusal is worth more than
     * a cheerful message about work that did not happen.
     */
    if (request.action === 'pbx.command') {
      const command = typeof request.payload?.command === 'string' ? request.payload.command.trim() : '';
      if (!command) return { ok: false, requestId: request.requestId, code: 'COMMAND_REQUIRED', message: 'No command was supplied.' };
      if (!(READ_ONLY_COMMANDS as ReadonlyArray<string>).includes(command)) {
        return { ok: false, requestId: request.requestId, code: 'COMMAND_NOT_ALLOWLISTED', message: `"${command}" is not in the read-only command allowlist, so it was not run.` };
      }
      const target = await resolveTarget(request.serverId);
      const result = await cliGateway.run(target, command as ReadOnlyCommand);
      if (result.status !== 'succeeded') {
        return { ok: false, requestId: request.requestId, code: 'COMMAND_FAILED', message: result.stderr.trim() || `The command exited with ${result.exitCode}.` };
      }
      return { ok: true, requestId: request.requestId, data: { command, output: result.stdout, durationMs: result.durationMs, observedAt: new Date().toISOString() } };
    }
    if (request.action === 'pbx.read') {
      if (!request.view) return { ok: false, requestId: request.requestId, code: 'VIEW_REQUIRED', message: 'A read must name the screen it is for.' };
      const target = await resolveTarget(request.serverId);
      return { ok: true, requestId: request.requestId, data: await readView(target, request.view) };
    }
    return { ok: false, requestId: request.requestId, code: 'ACTION_NOT_AVAILABLE', message: 'This operation is unavailable until a reviewed target-specific plan is connected.' };
  } catch (error) {
    return { ok: false, requestId: request.requestId, code: 'CONTROL_PLANE_ERROR', message: error instanceof Error ? error.message : 'Control-plane request failed.' };
  }
}

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

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
