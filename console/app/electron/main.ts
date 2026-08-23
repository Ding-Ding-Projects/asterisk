import { app, BrowserWindow, ipcMain } from 'electron';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { WslProvisioning, MANAGED_DISTRIBUTION } from '../../control-plane/wsl-provisioning.js';
import { handleSquirrelEvent, processHostess } from './squirrel-events.js';
import {
  parseVoicemailUsers, parseVoicemailZones, parseConfbridgeList, parseMohClasses, parseCodecs,
  parseTranslations, parseAclRules, parseManagerSettings, parseManagerUsers, parseAriApps,
  parseCdrStatus, parseLoggerChannels, parseSysinfo, parseUptime,
} from '../../control-plane/asterisk-parsers.js';
import { WslConfigTransport, CONFIGURABLE_RESOURCES, StructuredConfigPlanner, ConfigTransaction, ConfigHistory } from '../../control-plane/index.js';
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
  if (view === 'modules') return { modules: await readings.modules(target) };

  /**
   * The rest of the destinations, each reading the commands its own subsystem answers.
   *
   * These screens previously had no reader at all and stayed empty for want of one, not
   * because there was nothing to show. Each parser here takes its shape from the exact
   * format string in Asterisk's own source rather than from a guess, so a screen either
   * shows the target's real answer or reports why it could not.
   */
  const parsed = await parsedView(target, view);
  if (parsed) return parsed;
  return { modules: await readings.modules(target) };
}

/** Reads one or more commands for a screen and parses each with its real parser. */
async function parsedView(target: TargetProfile, view: PbxReadView) {
  const read = async <T>(command: ReadOnlyCommand, parse: (text: string) => T) => {
    const reading = await readings.raw(target, command);
    return reading.result.state === 'available'
      ? { command, result: { ...reading.result, value: parse(String(reading.result.value ?? '')) } }
      : { command, result: reading.result };
  };

  if (view === 'voicemail') {
    const [users, zones] = await Promise.all([
      read('voicemail show users', parseVoicemailUsers),
      read('voicemail show zones', parseVoicemailZones),
    ]);
    return { voicemailUsers: users, voicemailZones: zones };
  }
  if (view === 'confbridge') return { rooms: await read('confbridge list', parseConfbridgeList) };
  if (view === 'moh') return { mohClasses: await read('moh show classes', parseMohClasses) };
  if (view === 'codecs') {
    const [codecs, translations] = await Promise.all([
      read('core show codecs', parseCodecs),
      read('core show translation', parseTranslations),
    ]);
    return { codecs, translations };
  }
  if (view === 'security') return { aclRules: await read('acl show', parseAclRules) };
  if (view === 'cdr') return { cdrStatus: await read('cdr show status', parseCdrStatus) };
  if (view === 'logger') return { loggerChannels: await read('logger show channels', parseLoggerChannels) };
  if (view === 'ami') {
    const [settings, users, apps] = await Promise.all([
      read('manager show settings', parseManagerSettings),
      read('manager show users', parseManagerUsers),
      read('ari show apps', parseAriApps),
    ]);
    return { managerSettings: settings, managerUsers: users, ariApps: apps };
  }
  if (view === 'about' || view === 'cli') {
    const [sysinfo, uptime] = await Promise.all([
      read('core show sysinfo', parseSysinfo),
      read('core show uptime seconds', parseUptime),
    ]);
    return { sysinfo, uptime };
  }
  return undefined;
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
 * Streams a base root filesystem to disk and reports the digest of what landed.
 *
 * The digest is computed from the bytes actually written rather than from anything the
 * server said about them, because the caller's whole reason for asking is to decide
 * whether this archive is safe to make the root filesystem of a machine.
 */
const rootfsDownloader = {
  async download(url: string, destination: string) {
    const response = await fetch(url, { redirect: 'error' });
    if (!response.ok) throw new Error(`Downloading the base image failed with HTTP ${response.status}.`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length === 0) throw new Error('The base image download was empty.');
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, bytes);
    return { bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
  },
};

/**
 * An optional pinned base image, used only when the installer carried no runtime.
 *
 * Deliberately read from a committed manifest rather than hard-coded here. A URL is
 * easy to write down; the digest that makes it safe to import has to be verified
 * against the real artifact first, and inventing one would be worse than shipping no
 * fallback at all. Absent the manifest, the fallback reports plainly that it has
 * nothing to fall back to.
 */
function pinnedBaseImage() {
  const manifest = join(process.resourcesPath, 'asterisk', 'base-image.json');
  if (!existsSync(manifest)) return undefined;
  try {
    const record = JSON.parse(readFileSync(manifest, 'utf8')) as { url?: string; sha256?: string };
    if (typeof record.url !== 'string' || !/^[0-9a-f]{64}$/iu.test(record.sha256 ?? '')) return undefined;
    return { url: record.url, sha256: record.sha256 as string, downloadPath: join(app.getPath('userData'), 'base-image.tar') };
  } catch {
    return undefined;
  }
}

/**
 * The console's own WSL distribution.
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
      baseImage: pinnedBaseImage(),
      downloader: rootfsDownloader,
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
      /* Prefer the packaged runtime: it needs no network and is the exact build this
       * installer was tested with. Only a build that carried nothing falls back to
       * fetching a pinned base image and installing Asterisk into it. */
      const outcome = payloadPresent
        ? await provisioning.provision(true)
        : await provisioning.provisionFromBaseImage();
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
    /**
     * Reads one configuration file from the target and returns it parsed.
     *
     * This is what turns a configuration screen from a form showing the design's default
     * values into a form showing what the target actually has. It is read-only and is
     * refused for anything outside the configurable allowlist.
     */
    if (request.action === 'pbx.config') {
      const resource = typeof request.payload?.resource === 'string' ? request.payload.resource : '';
      const target = await resolveTarget(request.serverId);
      const transport = new WslConfigTransport({ executor: processExecutor, distribution: target.wslDistribution! });
      const value = await transport.read(resource);
      return { ok: true, requestId: request.requestId, data: { resource, value, observedAt: new Date().toISOString() } };
    }

    /**
     * Shows what a change would do, without doing any of it.
     *
     * The planner reads the current file from the target and diffs it against what the
     * screen is asking for, so the preview is a real comparison against the live
     * configuration rather than an assumption about it.
     */
    if (request.action === 'pbx.plan' || request.action === 'pbx.apply') {
      const documents = Array.isArray(request.payload?.documents) ? request.payload.documents : [];
      if (documents.length === 0) {
        return { ok: false, requestId: request.requestId, code: 'DOCUMENTS_REQUIRED', message: 'No configuration documents were supplied.' };
      }
      for (const document of documents as Array<{ resource?: unknown }>) {
        if (typeof document.resource !== 'string' || !(CONFIGURABLE_RESOURCES as ReadonlyArray<string>).includes(document.resource)) {
          return { ok: false, requestId: request.requestId, code: 'RESOURCE_NOT_CONFIGURABLE', message: `"${String(document.resource)}" is not a configurable resource, so nothing was changed.` };
        }
      }

      const target = await resolveTarget(request.serverId);
      const transport = new WslConfigTransport({ executor: processExecutor, distribution: target.wslDistribution! });
      const plan = await new StructuredConfigPlanner().createPlan(
        `plan-${request.requestId}`,
        target.id,
        documents as ReadonlyArray<{ resource: string; value: unknown }>,
        transport,
      );

      if (request.action === 'pbx.plan') {
        return { ok: true, requestId: request.requestId, data: { plan } };
      }
      if (plan.diffs.length === 0) {
        return { ok: true, requestId: request.requestId, data: { plan, result: { status: 'applied', message: 'Nothing to change; the target already matches.' } } };
      }

      /* Backup, stage, validate, apply, then read the result back and compare it against
       * what was asked for. A mismatch rolls every applied resource back in reverse
       * order rather than reporting a success the target did not actually perform. */
      const result = await new ConfigTransaction(transport).apply(plan);
      return {
        ok: result.status === 'applied',
        requestId: request.requestId,
        code: result.status === 'applied' ? undefined : 'CONFIG_APPLY_FAILED',
        message: result.status === 'applied' ? undefined : result.message,
        data: { plan, result },
      } as ControlPlaneResponse;
    }

    /**
     * The configuration history, which is the backups the transaction engine already
     * takes before every write. Nothing extra is recorded: the recovery points are a
     * by-product of applying safely, which is why they can be trusted.
     */
    if (request.action === 'history.list' || request.action === 'history.restore') {
      const target = await resolveTarget(request.serverId);
      const history = new ConfigHistory({ executor: processExecutor, distribution: target.wslDistribution! });
      if (request.action === 'history.list') {
        const resource = typeof request.payload?.resource === 'string' ? request.payload.resource : undefined;
        return { ok: true, requestId: request.requestId, data: { entries: await history.list(resource), observedAt: new Date().toISOString() } };
      }
      const handle = typeof request.payload?.handle === 'string' ? request.payload.handle : '';
      if (!handle) return { ok: false, requestId: request.requestId, code: 'HANDLE_REQUIRED', message: 'No recovery point was named.' };
      const restored = await history.restore(handle);
      return {
        ok: restored.ok,
        requestId: request.requestId,
        code: restored.ok ? undefined : 'HISTORY_RESTORE_FAILED',
        message: restored.ok ? undefined : restored.detail,
        data: restored,
      } as ControlPlaneResponse;
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

/* Before anything else. Squirrel launches the app with a --squirrel-* argument on
 * install, update and uninstall and waits about fifteen seconds for it to finish and
 * exit; an app that does not recognise the argument just starts normally, so Squirrel
 * waits out the whole timeout and gives up on the hook. Any work done ahead of this
 * check — opening a window, reading configuration — is spent from that same budget. */
if (handleSquirrelEvent(processHostess(() => app.quit())).handled) {
  app.quit();
} else {
  app.whenReady().then(createWindow);
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
}
