/**
 * The control-plane action dispatcher, factored out of the Electron main process so a
 * hosted server can serve the exact same behaviour over HTTP instead of drifting into a
 * second implementation of the same 25-odd actions.
 *
 * Everything that used to reach `app.getPath('userData')` or `process.resourcesPath`
 * directly now takes those two paths as constructor options instead, so this module has
 * no dependency on Electron and can run inside a plain Node.js process on a VM.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { WslProvisioning, MANAGED_DISTRIBUTION } from './wsl-provisioning.js';
import { AsteriskService } from './asterisk-service.js';
import {
  parseVoicemailUsers, parseVoicemailZones, parseConfbridgeList, parseMohClasses, parseCodecs,
  parseTranslations, parseAclRules, parseManagerSettings, parseManagerUsers, parseAriApps,
  parseCdrStatus, parseLoggerChannels, parseSysinfo, parseUptime,
} from './asterisk-parsers.js';
import { WslConfigTransport, CONFIGURABLE_RESOURCES, StructuredConfigPlanner, ConfigTransaction, ConfigHistory, MediaLibrary, LocalHistory, AsteriskConfigInventory, AmiTransport, AmiEventTransport, AriTransport, AriEventTransport, AMI_ACTIONS, ARI_OPERATIONS, actionDefinition, actionSurface } from './index.js';
import type { AriWebSocketFactory } from './index.js';
import { ServerInventory, SettingsRegistry } from './index.js';
import type { ServerInventoryStore, ServerRecord, SettingsSnapshotStore } from './index.js';
import { atomicWriteFileSync } from './atomic-file.js';
import { AsteriskReadings, DialplanReadings, LocalAsteriskCliGateway, NodeProcessExecutor, READ_ONLY_COMMANDS, TargetDiscovery, MODULE_LIFECYCLE_OPERATIONS } from './index.js';
import type { CredentialVault, ModuleLifecycleOperation, ReadOnlyCommand, TargetProfile } from './index.js';
import type { ControlPlaneRequest, ControlPlaneResponse, PbxReadView } from '../shared/control-plane.js';
import { reconcileAsteriskCatalog } from './asterisk-runtime-catalog.js';
import { ASTERISK_CATALOG } from './generated/asterisk-catalog.js';

/**
 * Actions that fundamentally depend on the Windows desktop (WSL) and cannot be answered
 * from a Linux VM host, where Asterisk is expected to already be installed and running
 * alongside this console rather than provisioned by it. Listed once here so both the
 * dispatcher and any capability-discovery UI agree on exactly the same set, rather than
 * two lists drifting apart.
 */
export const HOSTED_UNSUPPORTED_ACTIONS = new Set<string>([
  'runtime.status', 'runtime.provision', 'runtime.stop', 'runtime.remove',
]);

export interface ControlPlaneDispatcherOptions {
  /** Where per-installation state (server inventory, local history) is written. */
  userDataPath: string;
  /** Where packaged read-only assets (the bundled Asterisk WSL payload) live. Electron
   *  sets this to `process.resourcesPath`; a hosted server has no such payload and may
   *  pass any path — `wslProvisioning`-backed actions are refused hosted regardless. */
  resourcesPath: string;
  /** True when running under the hosted HTTP server rather than the desktop app. Gates
   *  the WSL-only actions above with an honest, named refusal instead of a stack trace. */
  hosted: boolean;
  credentialVault?: CredentialVault;
  ariWebSocketFactory?: AriWebSocketFactory;
}

export function createControlPlaneDispatcher(options: ControlPlaneDispatcherOptions) {
  const { userDataPath, resourcesPath, hosted } = options;
  const credentialVault = options.credentialVault ?? { read: async () => undefined } satisfies CredentialVault;
  const processExecutor = new NodeProcessExecutor({ allowedExecutables: ['wsl.exe', 'docker'] });
  const asteriskService = new AsteriskService({ executor: processExecutor });
  const targetDiscovery = new TargetDiscovery(processExecutor);
  const cliGateway = new LocalAsteriskCliGateway(processExecutor);
  const readings = new AsteriskReadings(cliGateway);
  const configInventory = new AsteriskConfigInventory(processExecutor);
  const dialplanReadings = new DialplanReadings(cliGateway);
  const consumedConfirmations = new Set<string>();
  const moduleConfirmations = new Map<string, { catalogId: string; catalogRevision: string; operation: ModuleLifecycleOperation; module: string; expiresAt: number }>();

  async function recordActionHistory(subject: string, payload: Record<string, unknown>): Promise<void> {
    try {
      const history = new LocalHistory({ executor: processExecutor, repositoryPath: join(userDataPath, 'history') });
      await history.initialize();
      await history.record({ action: 'updated', subject, payload });
    } catch {
      /* The action receipt remains authoritative. History failure is surfaced by its own surface. */
    }
  }

  async function resolveTarget(serverId: string | undefined): Promise<TargetProfile> {
    const requested = serverId?.trim();
    if (!requested) throw new Error('Select a server first.');

    const registered = serverInventory().get(requested);
    const distribution = (registered?.wslDistribution ?? requested).trim();
    if (!distribution) throw new Error('Select a discovered WSL distribution first.');

    const discovered = await targetDiscovery.discoverWslDistributions();
    if (!discovered.includes(distribution)) throw new Error('The WSL distribution is not in the current discovery result.');

    return registered
      ? { ...serverInventory().toTargetProfile(registered.id), wslDistribution: distribution }
      : { id: distribution, displayName: distribution, connectionKind: 'wsl', wslDistribution: distribution };
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
      // Registrations are read here too (not only for `trunks`) so the endpoint
      // reachability graph can draw the outbound-registration edge for an endpoint
      // that is also a trunk identity, exactly as `pjsip show registrations` reports it.
      const [endpoints, contacts, registrations] = await Promise.all([
        readings.endpoints(target), readings.contacts(target), readings.registrations(target),
      ]);
      return { endpoints, contacts, registrations };
    }
    if (view === 'trunks') return { registrations: await readings.registrations(target) };
    if (view === 'queues') return { queues: await readings.queues(target) };
    if (view === 'canvas') return { dialplan: await dialplanReadings.graph(target) };
    if (view === 'modules') return { modules: await readings.modules(target) };

    const parsed = await parsedView(target, view);
    if (parsed) return parsed;
    return { modules: await readings.modules(target) };
  }

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
    const root = join(resourcesPath, 'asterisk');
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

  function pinnedBaseImage() {
    const manifest = join(resourcesPath, 'asterisk', 'base-image.json');
    if (!existsSync(manifest)) return undefined;
    try {
      const record = JSON.parse(readFileSync(manifest, 'utf8')) as { url?: string; sha256?: string };
      if (typeof record.url !== 'string' || !/^[0-9a-f]{64}$/iu.test(record.sha256 ?? '')) return undefined;
      return { url: record.url, sha256: record.sha256 as string, downloadPath: join(userDataPath, 'base-image.tar') };
    } catch {
      return undefined;
    }
  }

  function wslProvisioning() {
    const runtime = bundledAsteriskRuntime();
    const installDirectory = join(userDataPath, 'wsl');
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

  class FileServerInventoryStore implements ServerInventoryStore {
    constructor(private readonly path: string) {}
    read() {
      if (!existsSync(this.path)) return undefined;
      try {
        return JSON.parse(readFileSync(this.path, 'utf8')) as { servers: ServerRecord[]; activeServerId?: string };
      } catch {
        return undefined;
      }
    }
    write(snapshot: { servers: ServerRecord[]; activeServerId?: string }) {
      mkdirSync(dirname(this.path), { recursive: true });
      writeFileSync(this.path, JSON.stringify(snapshot, null, 2));
    }
  }

  let cachedServerInventory: ServerInventory | undefined;
  function serverInventory(): ServerInventory {
    if (!cachedServerInventory) {
      const path = join(userDataPath, 'servers.json');
      cachedServerInventory = new ServerInventory({ store: new FileServerInventoryStore(path) });
    }
    return cachedServerInventory;
  }

  /**
   * The durable settings store backing every renderer control that must survive a
   * relaunch (the appearance editor, the personal-vocabulary cache, and any future
   * caller) -- see `control-plane/settings-store.ts`. Written atomically: a plain
   * `writeFileSync` here would leave a truncated `settings.json` behind if the process
   * were killed mid-write, or fail outright on Windows when Defender/the indexer/a
   * sync client has the destination momentarily open.
   */
  class FileSettingsStore implements SettingsSnapshotStore {
    constructor(private readonly path: string) {}
    read(): Record<string, string> | undefined {
      if (!existsSync(this.path)) return undefined;
      try {
        const parsed = JSON.parse(readFileSync(this.path, 'utf8')) as unknown;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
        const out: Record<string, string> = {};
        for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
          if (typeof value === 'string') out[key] = value;
        }
        return out;
      } catch {
        // Corrupt or truncated JSON fails closed to "nothing persisted" -- every
        // renderer default applies -- rather than throwing at startup.
        return undefined;
      }
    }
    write(snapshot: Record<string, string>): void {
      atomicWriteFileSync(this.path, JSON.stringify(snapshot, null, 2));
    }
  }

  let cachedSettingsRegistry: SettingsRegistry | undefined;
  function settingsRegistry(): SettingsRegistry {
    if (!cachedSettingsRegistry) {
      const path = join(userDataPath, 'settings.json');
      cachedSettingsRegistry = new SettingsRegistry(new FileSettingsStore(path));
    }
    return cachedSettingsRegistry;
  }

  async function controlPlaneRequest(request: ControlPlaneRequest): Promise<ControlPlaneResponse> {
    try {
      if (hosted && HOSTED_UNSUPPORTED_ACTIONS.has(request.action)) {
        return {
          ok: false, requestId: request.requestId, code: 'ACTION_UNSUPPORTED_HOSTED',
          message: `"${request.action}" manages a Windows WSL distribution and cannot run on a hosted server. ` +
            'Install and administer Asterisk on this VM directly; the console will connect to it as a target.',
        };
      }

      if (request.action === 'runtime.status') {
        const { provisioning, payloadPresent, runtime } = wslProvisioning();
        return { ok: true, requestId: request.requestId, data: { managedDistribution: MANAGED_DISTRIBUTION, bundledRuntime: runtime, status: await provisioning.status(payloadPresent) } };
      }
      if (request.action === 'runtime.provision') {
        const { provisioning, payloadPresent } = wslProvisioning();
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
        const { provisioning } = wslProvisioning();
        const step = await provisioning.remove(request.serverId?.trim() ?? '');
        return { ok: step.ok, requestId: request.requestId, code: step.ok ? undefined : 'RUNTIME_REMOVE_REFUSED', message: step.ok ? undefined : step.detail, data: step } as ControlPlaneResponse;
      }
      if (request.action === 'daemon.status') {
        const status = await asteriskService.status();
        return { ok: true, requestId: request.requestId, data: { status } };
      }
      if (request.action === 'daemon.start') {
        const outcome = await asteriskService.start();
        const answering = outcome.status.state === 'daemonAnswering';
        return { ok: answering, requestId: request.requestId, code: answering ? undefined : 'DAEMON_START_FAILED', message: answering ? undefined : outcome.status.reason, data: outcome } as ControlPlaneResponse;
      }
      if (request.action === 'daemon.stop') {
        const force = (request.payload as { force?: boolean } | undefined)?.force === true;
        const outcome = await asteriskService.stop({ force });
        const stopped = outcome.status.state === 'daemonNotRunning';
        return { ok: stopped, requestId: request.requestId, code: stopped ? undefined : 'DAEMON_STOP_FAILED', message: stopped ? undefined : outcome.status.reason, data: outcome } as ControlPlaneResponse;
      }
      if (request.action === 'daemon.restart') {
        const force = (request.payload as { force?: boolean } | undefined)?.force === true;
        const outcome = await asteriskService.restart({ force });
        const answering = outcome.status.state === 'daemonAnswering';
        return { ok: answering, requestId: request.requestId, code: answering ? undefined : 'DAEMON_RESTART_FAILED', message: answering ? undefined : outcome.status.reason, data: outcome } as ControlPlaneResponse;
      }
      if (request.action === 'server.list') {
        const [wsl, containers] = await Promise.all([
          targetDiscovery.discoverWslDistributions().catch(error => ({ unavailable: error instanceof Error ? error.message : 'WSL discovery failed' })),
          targetDiscovery.discoverLocalDocker('ding-pbx-console').catch(error => ({ unavailable: error instanceof Error ? error.message : 'Docker discovery failed' })),
        ]);
        return { ok: true, requestId: request.requestId, data: { observedAt: new Date().toISOString(), bundledRuntime: bundledAsteriskRuntime(), wsl, containers } };
      }
      if (request.action === 'server.inventory.list') {
        const inventory = serverInventory();
        return { ok: true, requestId: request.requestId, data: { servers: inventory.list(), activeServerId: inventory.activeId() } };
      }
      if (request.action === 'server.inventory.add') {
        try {
          const server = serverInventory().add(request.payload as never);
          return { ok: true, requestId: request.requestId, data: { server } };
        } catch (error) {
          return { ok: false, requestId: request.requestId, code: (error as { code?: string }).code ?? 'SERVER_ADD_FAILED', message: error instanceof Error ? error.message : 'Could not add the server.' };
        }
      }
      if (request.action === 'server.inventory.update') {
        try {
          const id = request.serverId?.trim();
          if (!id) return { ok: false, requestId: request.requestId, code: 'SERVER_REQUIRED', message: 'Select a server to edit.' };
          const server = serverInventory().update(id, request.payload as never);
          return { ok: true, requestId: request.requestId, data: { server } };
        } catch (error) {
          return { ok: false, requestId: request.requestId, code: (error as { code?: string }).code ?? 'SERVER_UPDATE_FAILED', message: error instanceof Error ? error.message : 'Could not update the server.' };
        }
      }
      if (request.action === 'server.inventory.remove') {
        try {
          const id = request.serverId?.trim();
          if (!id) return { ok: false, requestId: request.requestId, code: 'SERVER_REQUIRED', message: 'Select a server to remove.' };
          serverInventory().remove(id);
          return { ok: true, requestId: request.requestId, data: { removed: id } };
        } catch (error) {
          return { ok: false, requestId: request.requestId, code: (error as { code?: string }).code ?? 'SERVER_REMOVE_FAILED', message: error instanceof Error ? error.message : 'Could not remove the server.' };
        }
      }
      if (request.action === 'server.inventory.set-active') {
        try {
          const id = request.serverId?.trim();
          if (!id) return { ok: false, requestId: request.requestId, code: 'SERVER_REQUIRED', message: 'Select a server to switch to.' };
          const server = serverInventory().setActive(id);
          return { ok: true, requestId: request.requestId, data: { server } };
        } catch (error) {
          return { ok: false, requestId: request.requestId, code: (error as { code?: string }).code ?? 'SERVER_SET_ACTIVE_FAILED', message: error instanceof Error ? error.message : 'Could not switch the active server.' };
        }
      }
      if (request.action === 'settings.snapshot') {
        return { ok: true, requestId: request.requestId, data: { values: settingsRegistry().snapshot() } };
      }
      if (request.action === 'settings.write') {
        const payload = request.payload as { key?: string; value?: string } | undefined;
        const key = payload?.key?.trim();
        if (!key) return { ok: false, requestId: request.requestId, code: 'SETTING_KEY_REQUIRED', message: 'A settings key is required.' };
        if (typeof payload?.value !== 'string') return { ok: false, requestId: request.requestId, code: 'SETTING_VALUE_REQUIRED', message: 'A settings value must be a string.' };
        try {
          settingsRegistry().set(key, payload.value);
          return { ok: true, requestId: request.requestId, data: { key } };
        } catch (error) {
          return { ok: false, requestId: request.requestId, code: 'SETTING_WRITE_FAILED', message: error instanceof Error ? error.message : 'Could not persist the setting.' };
        }
      }
      if (request.action === 'settings.remove') {
        const payload = request.payload as { key?: string } | undefined;
        const key = payload?.key?.trim();
        if (!key) return { ok: false, requestId: request.requestId, code: 'SETTING_KEY_REQUIRED', message: 'A settings key is required.' };
        try {
          settingsRegistry().remove(key);
          return { ok: true, requestId: request.requestId, data: { key } };
        } catch (error) {
          return { ok: false, requestId: request.requestId, code: 'SETTING_REMOVE_FAILED', message: error instanceof Error ? error.message : 'Could not remove the setting.' };
        }
      }
      if (request.action === 'server.connect' || request.action === 'pbx.snapshot') {
        const requested = request.serverId?.trim();
        if (!requested) return { ok: false, requestId: request.requestId, code: 'TARGET_REQUIRED', message: 'Select a server to connect to.' };

        const registered = serverInventory().get(requested);
        const distribution = (registered?.wslDistribution ?? requested).trim();
        if (registered) serverInventory().setState(registered.id, 'connecting');

        const discovered = await targetDiscovery.discoverWslDistributions();
        if (!discovered.includes(distribution)) {
          const reason = 'The WSL distribution is not in the current discovery result.';
          if (registered) serverInventory().setState(registered.id, 'unreachable', reason);
          return { ok: false, requestId: request.requestId, code: 'TARGET_NOT_DISCOVERED', message: reason };
        }
        const [os, asterisk] = await Promise.all([
          processExecutor.execute({ executable: 'wsl.exe', args: ['-d', distribution, '--', 'cat', '/etc/os-release'], timeoutMs: 10_000 }),
          processExecutor.execute({ executable: 'wsl.exe', args: ['-d', distribution, '--', 'asterisk', '-rx', 'core show version'], timeoutMs: 10_000 }),
        ]);
        if (registered) {
          if (os.status === 'succeeded') {
            serverInventory().setState(registered.id, 'connected');
          } else {
            serverInventory().setState(registered.id, 'refused', os.stderr || 'The WSL distribution refused the connection.');
          }
        }
        return { ok: true, requestId: request.requestId, data: {
          target: { connectionKind: 'wsl', distribution },
          operatingSystem: os.status === 'succeeded' ? targetDiscovery.parseDebianOperatingSystem(os.stdout) : { state: 'unavailable', reason: os.stderr, observedAt: new Date().toISOString() },
          asterisk: asterisk.status === 'succeeded' ? { state: 'available', value: asterisk.stdout.trim(), observedAt: new Date().toISOString() } : { state: 'unavailable', reason: asterisk.stderr || 'Asterisk is not installed or not running.', observedAt: new Date().toISOString() },
        } };
      }
      if (request.action === 'pbx.command') {
        const command = typeof request.payload?.command === 'string' ? request.payload.command.trim() : '';
        if (!command) return { ok: false, requestId: request.requestId, code: 'COMMAND_REQUIRED', message: 'No command was supplied.' };
        const target = await resolveTarget(request.serverId);
        const staticAllowed = (READ_ONLY_COMMANDS as ReadonlyArray<string>).includes(command);
        let result;
        if (staticAllowed) {
          result = await cliGateway.run(target, command as ReadOnlyCommand);
        } else {
          if (request.payload?.catalogRevision !== ASTERISK_CATALOG.catalogRevision) return { ok: false, requestId: request.requestId, code: 'COMMAND_CATALOG_STALE', message: 'Refresh the live CLI catalogue before running this command.' };
          const help = await readings.raw(target, 'core show help');
          if (help.result.state !== 'available' || !extractCliEntries(String(help.result.value ?? '')).includes(command)) return { ok: false, requestId: request.requestId, code: 'COMMAND_NOT_IN_LIVE_CATALOG', message: 'The exact command was not present in the latest target core show help response.' };
          result = await cliGateway.runObservedCommand(target, command);
        }
        if (result.status !== 'succeeded') {
          return { ok: false, requestId: request.requestId, code: 'COMMAND_FAILED', message: result.stderr.trim() || `The command exited with ${result.exitCode}.` };
        }
        return { ok: true, requestId: request.requestId, data: { command, output: result.stdout, durationMs: result.durationMs, observedAt: new Date().toISOString() } };
      }
      if (request.action === 'pbx.config') {
        const resource = typeof request.payload?.resource === 'string' ? request.payload.resource : '';
        const target = await resolveTarget(request.serverId);
        const transport = new WslConfigTransport({ executor: processExecutor, distribution: target.wslDistribution! });
        const value = await transport.read(resource);
        return { ok: true, requestId: request.requestId, data: { resource, value, observedAt: new Date().toISOString() } };
      }
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

        const result = await new ConfigTransaction(transport).apply(plan);
        return {
          ok: result.status === 'applied',
          requestId: request.requestId,
          code: result.status === 'applied' ? undefined : 'CONFIG_APPLY_FAILED',
          message: result.status === 'applied' ? undefined : result.message,
          data: { plan, result },
        } as ControlPlaneResponse;
      }
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
      if (request.action === 'media.list' || request.action === 'media.upload' || request.action === 'media.remove') {
        const target = await resolveTarget(request.serverId);
        const library = new MediaLibrary({ executor: processExecutor, distribution: target.wslDistribution! });
        const root = request.payload?.root === 'musicOnHold' ? 'musicOnHold' : 'prompts';

        if (request.action === 'media.list') {
          const subdirectory = typeof request.payload?.subdirectory === 'string' ? request.payload.subdirectory : undefined;
          return { ok: true, requestId: request.requestId, data: { root, files: await library.list(root, subdirectory) } };
        }

        const name = typeof request.payload?.name === 'string' ? request.payload.name : '';
        if (request.action === 'media.remove') {
          const removed = await library.remove(root, name);
          return { ok: removed.removed, requestId: request.requestId, code: removed.removed ? undefined : 'MEDIA_REMOVE_REFUSED', message: removed.removed ? undefined : removed.detail, data: removed } as ControlPlaneResponse;
        }

        const contentBase64 = typeof request.payload?.contentBase64 === 'string' ? request.payload.contentBase64 : '';
        if (!contentBase64) return { ok: false, requestId: request.requestId, code: 'CONTENT_REQUIRED', message: 'No file content was supplied.' };
        return { ok: true, requestId: request.requestId, data: await library.upload(root, name, contentBase64) };
      }
      if (request.action.startsWith('local-history.')) {
        const history = new LocalHistory({ executor: processExecutor, repositoryPath: join(userDataPath, 'history') });
        await history.initialize();

        if (request.action === 'local-history.list') {
          const opts = (request.payload ?? {}) as { action?: string; since?: string; until?: string; limit?: number };
          return { ok: true, requestId: request.requestId, data: { entries: await history.list(opts), counts: await history.actionCounts() } };
        }
        if (request.action === 'local-history.record') {
          const entry = request.payload as unknown as Parameters<LocalHistory['record']>[0];
          return { ok: true, requestId: request.requestId, data: await history.record(entry) };
        }
        if (request.action === 'local-history.restore') {
          const commitId = typeof request.payload?.commitId === 'string' ? request.payload.commitId : '';
          return { ok: true, requestId: request.requestId, data: await history.restore(commitId) };
        }
      }
      if (request.action === 'pbx.read') {
        if (!request.view) return { ok: false, requestId: request.requestId, code: 'VIEW_REQUIRED', message: 'A read must name the screen it is for.' };
        const target = await resolveTarget(request.serverId);
        return { ok: true, requestId: request.requestId, data: await readView(target, request.view) };
      }
      if (request.action === 'pbx.catalog') {
        const target = await resolveTarget(request.serverId);
        let credentialAvailable = false;
        try { credentialAvailable = Boolean(target.credentialKey && await credentialVault.read(target.credentialKey)); } catch { credentialAvailable = false; }
        const [modules, cli, ami, ari, configs, ariHttp] = await Promise.all([
          readings.modules(target),
          readings.raw(target, 'core show help'),
          readings.raw(target, 'manager show commands'),
          readings.raw(target, 'ari show apps'),
          configInventory.list(target),
          new AriTransport({ credentialKey: target.credentialKey ?? '', vault: credentialVault, baseUrl: `http://${target.host ?? '127.0.0.1'}:${target.port ?? 8088}/ari/` }).discoverResources(),
        ]);
        const observedAt = new Date().toISOString();
        const rawValues = (reading: { result: { state: string; value?: string } }): ReadonlyArray<string> | undefined =>
          reading.result.state === 'available' ? String(reading.result.value ?? '').split(/\r?\n/u).map((line) => line.trim()).filter(Boolean) : undefined;
        const cliEntries = rawValues(cli) ? extractCliEntries(rawValues(cli)?.join('\n') ?? '') : undefined;
        return {
          ok: true,
          requestId: request.requestId,
          data: reconcileAsteriskCatalog({
            observedAt,
            modules: modules.result.state === 'available' ? modules.result.value : undefined,
            cliCommands: cliEntries,
            amiActions: rawValues(ami),
            ariResources: rawValues(ari),
            ariHttpResources: ariHttp.state === 'available' ? ariHttp.names : undefined,
            amiCredentialState: credentialAvailable ? 'unknown' : 'unavailable',
            amiCredentialReason: credentialAvailable ? 'AMI credential is available, but action-level probes are not run during catalogue discovery.' : 'AMI credential is unavailable in the OS vault.',
            ariCredentialState: credentialAvailable ? (ariHttp.state === 'available' ? 'available' : 'unavailable') : 'unavailable',
            ariCredentialReason: credentialAvailable ? ariHttp.reason : 'ARI credential is unavailable in the OS vault.',
            ariDiscoveryComplete: ariHttp.complete,
            ariDiscoveryFailed: ariHttp.failed,
            configResources: configs.state === 'available' ? configs.files : undefined,
            configInventoryComplete: configs.complete,
            configInventoryReason: configs.reason,
          }),
        };
      }
      if (request.action === 'pbx.module.prepare') {
        const operation = request.payload?.operation;
        const module = request.payload?.module;
        const catalogId = request.payload?.catalogId;
        const catalogRevision = request.payload?.catalogRevision;
        if (typeof operation !== 'string' || !MODULE_LIFECYCLE_OPERATIONS.includes(operation as ModuleLifecycleOperation) || typeof module !== 'string' || typeof catalogId !== 'string' || catalogRevision !== ASTERISK_CATALOG.catalogRevision) return { ok: false, requestId: request.requestId, code: 'MODULE_CONFIRMATION_INPUT_INVALID', message: 'Refresh the catalogue and choose one source-backed module lifecycle operation.' };
        const source = ASTERISK_CATALOG.modules.find((entry) => entry.id === catalogId && entry.name === module);
        if (!source) return { ok: false, requestId: request.requestId, code: 'MODULE_NOT_IN_CATALOG', message: 'The requested module is not a source record in the current catalogue.' };
        const confirmationId = randomUUID();
        moduleConfirmations.set(confirmationId, { catalogId, catalogRevision, operation: operation as ModuleLifecycleOperation, module, expiresAt: Date.now() + 60_000 });
        return { ok: true, requestId: request.requestId, data: { confirmationId, catalogId, catalogRevision, operation, module, expiresAt: Date.now() + 60_000 } };
      }
      if (request.action === 'pbx.module') {
        const operation = request.payload?.operation;
        const module = request.payload?.module;
        const catalogId = request.payload?.catalogId;
        const catalogRevision = request.payload?.catalogRevision;
        const confirmed = request.payload?.confirmed === true;
        const confirmationId = request.payload?.confirmationId;
        if (typeof operation !== 'string' || !MODULE_LIFECYCLE_OPERATIONS.includes(operation as ModuleLifecycleOperation)) return { ok: false, requestId: request.requestId, code: 'MODULE_OPERATION_NOT_ALLOWLISTED', message: 'Choose load, unload, or reload.' };
        if (typeof module !== 'string' || !/^[A-Za-z0-9_.-]+\.so$/u.test(module)) return { ok: false, requestId: request.requestId, code: 'MODULE_NAME_INVALID', message: 'Choose a bare .so module name from the live catalogue.' };
        if (typeof catalogId !== 'string' || typeof catalogRevision !== 'string' || catalogRevision !== ASTERISK_CATALOG.catalogRevision) return { ok: false, requestId: request.requestId, code: 'MODULE_CATALOG_STALE', message: 'Refresh the module catalogue before changing a module.' };
        const prepared = typeof confirmationId === 'string' ? moduleConfirmations.get(confirmationId) : undefined;
        if (!confirmed || typeof confirmationId !== 'string' || !/^[0-9a-f-]{36}$/iu.test(confirmationId) || consumedConfirmations.has(confirmationId) || !prepared || prepared.expiresAt < Date.now() || prepared.catalogId !== catalogId || prepared.catalogRevision !== catalogRevision || prepared.operation !== operation || prepared.module !== module) return { ok: false, requestId: request.requestId, code: 'MODULE_CONFIRMATION_REQUIRED', message: 'Confirm the module lifecycle action with a fresh control-plane-issued single-use confirmation.' };
        const action = actionDefinition(`module.${operation}`);
        if (!action || !actionSurface(`module.${operation}`) || action.state === 'unavailable') return { ok: false, requestId: request.requestId, code: 'MODULE_ACTION_UNAVAILABLE', message: action?.unavailableReason ?? 'The module action is unavailable.' };
        const target = await resolveTarget(request.serverId);
        const source = ASTERISK_CATALOG.modules.find((entry) => entry.id === catalogId && entry.name === module);
        if (!source) return { ok: false, requestId: request.requestId, code: 'MODULE_NOT_IN_CATALOG', message: 'The requested module is not a source record in the current catalogue.' };
        const before = await readings.modules(target);
        const beforePresent = before.result.state === 'available' && Boolean(before.result.value?.some((entry) => entry.name === module));
        if (before.result.state !== 'available' || (operation !== 'load' && !beforePresent)) return { ok: false, requestId: request.requestId, code: 'MODULE_PRECONDITION_FAILED', message: operation === 'load' ? 'The target module inventory was not available.' : 'The module must be present in the latest live inventory for unload or reload.' };
        consumedConfirmations.add(confirmationId);
        moduleConfirmations.delete(confirmationId);
        const receipt = await cliGateway.runModuleLifecycle(target, operation as ModuleLifecycleOperation, module);
        const after = await readings.modules(target);
        const observedPresent = after.result.state === 'available' && Boolean(after.result.value?.some((entry) => entry.name === module));
        const expectedPresent = operation !== 'unload';
        const postcondition = {
          state: after.result.state !== 'available' ? 'unavailable' : observedPresent === expectedPresent ? 'verified' : 'failed',
          expectedPresent,
          observedPresent,
          reason: after.result.state !== 'available' ? after.result.reason : observedPresent === expectedPresent ? undefined : `The target reread contradicted the ${operation} postcondition.`,
        } as const;
        await recordActionHistory(`Module ${operation} ${module}`, { action: `module.${operation}`, module, catalogId: source.id, catalogRevision, status: receipt.status });
        return { ok: receipt.status === 'succeeded' && postcondition.state === 'verified', requestId: request.requestId, code: receipt.status === 'succeeded' && postcondition.state === 'verified' ? undefined : 'MODULE_OPERATION_FAILED', message: receipt.status !== 'succeeded' ? receipt.output || `Module ${operation} did not complete.` : postcondition.reason, data: { receipt, before, after, postcondition, catalogId: source.id, catalogRevision } } as ControlPlaneResponse;
      }
      if (request.action === 'ami.action') {
        const operation = request.payload?.operation;
        if (typeof operation !== 'string' || !(operation in AMI_ACTIONS)) return { ok: false, requestId: request.requestId, code: 'AMI_OPERATION_NOT_ALLOWLISTED', message: 'Choose an operation from the typed AMI catalogue.' };
        if (!['ping', 'coreStatus', 'commandCatalog', 'moduleList'].includes(operation) && request.payload?.confirmed !== true) return { ok: false, requestId: request.requestId, code: 'AMI_CONFIRMATION_REQUIRED', message: 'Confirm the AMI action before it is sent to Asterisk.' };
        const target = await resolveTarget(request.serverId);
        const amiHost = target.host ?? '127.0.0.1';
        const transport = new AmiTransport({ host: amiHost, port: target.port ?? 5038, tls: !['localhost', '127.0.0.1', '::1'].includes(amiHost), credentialKey: target.credentialKey ?? '', vault: credentialVault });
        const receipt = await transport.execute(operation as keyof typeof AMI_ACTIONS, (request.payload?.fields ?? {}) as Record<string, string>);
        await recordActionHistory(`AMI ${operation}`, { action: 'ami.action', operation, state: receipt.state });
        return { ok: receipt.state === 'available', requestId: request.requestId, code: receipt.state === 'available' ? undefined : 'AMI_ACTION_FAILED', message: receipt.reason, data: receipt } as ControlPlaneResponse;
      }
      if (request.action === 'ari.operation') {
        const operation = request.payload?.operation;
        if (typeof operation !== 'string' || !(operation in ARI_OPERATIONS)) return { ok: false, requestId: request.requestId, code: 'ARI_OPERATION_NOT_ALLOWLISTED', message: 'Choose an operation from the typed ARI catalogue.' };
        const spec = ARI_OPERATIONS[operation];
        if (spec.method !== 'GET' && request.payload?.confirmed !== true) return { ok: false, requestId: request.requestId, code: 'ARI_CONFIRMATION_REQUIRED', message: 'Confirm the mutating ARI operation before it is sent to Asterisk.' };
        const target = await resolveTarget(request.serverId);
        const host = target.host ?? '127.0.0.1';
        const port = target.port ?? 8088;
        const loopback = ['localhost', '127.0.0.1', '::1'].includes(host.replace(/^\[|\]$/gu, '').toLowerCase());
        const baseUrl = `${loopback ? 'http' : 'https'}://${host}:${port}/ari/`;
        const transport = new AriTransport({ baseUrl, credentialKey: target.credentialKey ?? '', vault: credentialVault });
        const receipt = await transport.execute(operation as keyof typeof ARI_OPERATIONS, {
          parameters: (request.payload?.parameters ?? {}) as Readonly<Record<string, string | number | boolean>>,
          body: request.payload?.body,
        });
        await recordActionHistory(`ARI ${operation}`, { action: 'ari.operation', operation, state: receipt.state });
        return { ok: receipt.state === 'available', requestId: request.requestId, code: receipt.state === 'available' ? undefined : 'ARI_OPERATION_FAILED', message: receipt.reason, data: receipt } as ControlPlaneResponse;
      }
      if (request.action === 'ami.events') {
        const target = await resolveTarget(request.serverId);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15_000);
        const events: unknown[] = [];
        const transport = new AmiEventTransport({ host: target.host ?? '127.0.0.1', port: target.port ?? 5038, tls: !['localhost', '127.0.0.1', '::1'].includes(target.host ?? '127.0.0.1'), credentialKey: target.credentialKey ?? '', vault: credentialVault });
        const result = await transport.start((event) => { if (events.length < 100) events.push(event); }, controller.signal);
        clearTimeout(timer);
        return { ok: result.state === 'available', requestId: request.requestId, code: result.state === 'available' ? undefined : 'AMI_EVENTS_UNAVAILABLE', message: result.reason, data: { ...result, events } } as ControlPlaneResponse;
      }
      if (request.action === 'ari.events') {
        const target = await resolveTarget(request.serverId);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15_000);
        const events: unknown[] = [];
        const transport = new AriEventTransport({ baseUrl: `${target.host && !['localhost', '127.0.0.1', '::1'].includes(target.host) ? 'https' : 'http'}://${target.host ?? '127.0.0.1'}:${target.port ?? 8088}/ari/`, credentialKey: target.credentialKey ?? '', vault: credentialVault, webSocketFactory: options.ariWebSocketFactory });
        const result = await transport.start((event) => { if (events.length < 100) events.push(event); }, controller.signal);
        clearTimeout(timer);
        return { ok: result.state === 'available', requestId: request.requestId, code: result.state === 'available' ? undefined : 'ARI_EVENTS_UNAVAILABLE', message: result.reason, data: { ...result, events } } as ControlPlaneResponse;
      }
      return { ok: false, requestId: request.requestId, code: 'ACTION_NOT_AVAILABLE', message: 'This operation is unavailable until a reviewed target-specific plan is connected.' };
    } catch (error) {
      return { ok: false, requestId: request.requestId, code: 'CONTROL_PLANE_ERROR', message: error instanceof Error ? error.message : 'Control-plane request failed.' };
    }
  }

  return { controlPlaneRequest, bundledAsteriskRuntime, serverInventory };
}

export type ControlPlaneDispatcher = ReturnType<typeof createControlPlaneDispatcher>;

function extractCliEntries(output: string): string[] {
  return output.split(/\r?\n/u).map((line) => line.trim().split(/\s{2,}|\t/u)[0]?.trim() ?? '').filter((line) => line.includes(' '));
}
