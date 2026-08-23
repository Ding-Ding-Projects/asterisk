import { app, BrowserWindow, ipcMain } from 'electron';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AsteriskReadings, DialplanReadings, LocalAsteriskCliGateway, NodeProcessExecutor, TargetDiscovery } from '../../control-plane/index.js';
import type { TargetProfile } from '../../control-plane/index.js';
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

async function controlPlaneRequest(request: ControlPlaneRequest): Promise<ControlPlaneResponse> {
  try {
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
