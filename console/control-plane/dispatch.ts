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
import { createHash } from 'node:crypto';
import { WslProvisioning, MANAGED_DISTRIBUTION } from './wsl-provisioning.js';
import { AsteriskService } from './asterisk-service.js';
import {
  parseVoicemailUsers, parseVoicemailZones, parseConfbridgeList, parseMohClasses, parseCodecs,
  parseTranslations, parseAclRules, parseManagerSettings, parseManagerUsers, parseAriApps,
  parseCdrStatus, parseLoggerChannels, parseSysinfo, parseUptime,
} from './asterisk-parsers.js';
import { WslConfigTransport, CONFIGURABLE_RESOURCES, StructuredConfigPlanner, ConfigTransaction, ConfigHistory, MediaLibrary, LocalHistory } from './index.js';
import { ServerInventory, SettingsRegistry } from './index.js';
import type { ServerInventoryStore, ServerRecord, SettingsSnapshotStore } from './index.js';
import { atomicWriteFileSync } from './atomic-file.js';
import { AsteriskReadings, DialplanReadings, LocalAsteriskCliGateway, NodeProcessExecutor, READ_ONLY_COMMANDS, TargetDiscovery } from './index.js';
import type { ReadOnlyCommand, TargetProfile } from './index.js';
import type { ControlPlaneRequest, ControlPlaneResponse, PbxReadView } from '../shared/control-plane.js';
import { FreePbxRuntimeAdapter, type FreePbxBackupReceipt, type FreePbxBackupReceiptStore, type FreePbxModuleAction } from './freepbx-runtime.js';
import { FreePbxFamilyRuntime } from './freepbx-family-runtime.js';
import freePbxCatalogJson from '../catalog/freepbx-module-catalog.json' with { type: 'json' };

/**
 * Actions that fundamentally depend on the Windows desktop (WSL) and cannot be answered
 * from a Linux VM host, where Asterisk is expected to already be installed and running
 * alongside this console rather than provisioned by it. Listed once here so both the
 * dispatcher and any capability-discovery UI agree on exactly the same set, rather than
 * two lists drifting apart.
 */
export const HOSTED_UNSUPPORTED_ACTIONS = new Set<string>([
  'runtime.status', 'runtime.provision', 'runtime.stop', 'runtime.remove',
  'freepbx.modules', 'freepbx.module.state', 'freepbx.module.action',
  'freepbx.handshake',
  'freepbx.backup',
  'freepbx.backup.list',
  'freepbx.family.schema', 'freepbx.family.read', 'freepbx.family.plan', 'freepbx.family.apply',
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
}

function freePbxCatalogEntries() {
  return (freePbxCatalogJson.modules as Array<Record<string, unknown>>).map((module) => ({
    moduleId: String(module.moduleId),
    name: String(module.name),
    version: String(module.version),
    license: String(module.license),
    entitlementClass: module.entitlementClass === 'commercial' || module.entitlementClass === 'open' ? module.entitlementClass : 'unknown' as const,
    dependencies: Array.isArray(module.dependencies) ? module.dependencies.filter((dependency): dependency is { moduleId: string; version: string } => Boolean(dependency && typeof dependency === 'object' && typeof (dependency as Record<string, unknown>).moduleId === 'string' && typeof (dependency as Record<string, unknown>).version === 'string')) : [],
    fwconsoleCommands: Array.isArray(module.fwconsoleCommands) ? module.fwconsoleCommands.filter((command): command is { name: string; class: string } => Boolean(command && typeof command === 'object' && typeof (command as Record<string, unknown>).name === 'string' && typeof (command as Record<string, unknown>).class === 'string')) : [],
    apiCapabilities: Array.isArray(module.apiCapabilities) ? module.apiCapabilities.filter((capability): capability is string => typeof capability === 'string') : [],
    sourceRevision: typeof (module.source as Record<string, unknown> | undefined)?.revision === 'string' ? String((module.source as Record<string, unknown>).revision) : null,
    localInstalled: module.localInstalled === true,
    availabilityReason: String((module.availability as Record<string, unknown> | undefined)?.reason ?? 'No availability reason was published.'),
  }));
}

function freePbxFamilyEntries() {
  return (freePbxCatalogJson.modules as Array<Record<string, unknown>>).map((module) => ({
    moduleId: String(module.moduleId), name: String(module.name), version: String(module.version),
    configurationResources: Array.isArray(module.configurationResources) ? module.configurationResources.filter((resource): resource is string => typeof resource === 'string') : [],
    uiFamilies: Array.isArray(module.uiFamilies) ? module.uiFamilies.filter((family): family is string => typeof family === 'string') : [],
    apiCapabilities: Array.isArray(module.apiCapabilities) ? module.apiCapabilities.filter((capability): capability is string => typeof capability === 'string') : [],
    sourceRevision: typeof (module.source as Record<string, unknown> | undefined)?.revision === 'string' ? String((module.source as Record<string, unknown>).revision) : null,
    entitlementClass: module.entitlementClass === 'commercial' || module.entitlementClass === 'open' ? module.entitlementClass : 'unknown' as const,
    availabilityReason: String((module.availability as Record<string, unknown> | undefined)?.reason ?? 'No availability reason was published.'),
  }));
}

export function createControlPlaneDispatcher(options: ControlPlaneDispatcherOptions) {
  const { userDataPath, resourcesPath, hosted } = options;
  const processExecutor = new NodeProcessExecutor({ allowedExecutables: ['wsl.exe', 'docker', 'git'] });
  const freePbxReceipts = new Map<string, FreePbxBackupReceipt>();
  const freePbxReceiptPath = join(userDataPath, 'freepbx-receipts.json');
  try {
    const saved = JSON.parse(readFileSync(freePbxReceiptPath, 'utf8')) as unknown;
    if (Array.isArray(saved)) for (const receipt of saved) if (receipt && typeof receipt === 'object' && typeof (receipt as Record<string, unknown>).nonce === 'string') freePbxReceipts.set((receipt as Record<string, unknown>).nonce as string, receipt as FreePbxBackupReceipt);
  } catch { /* First run or a corrupt receipt cache starts empty and safely refuses old actions. */ }
  const persistFreePbxReceipts = (): void => {
    mkdirSync(dirname(freePbxReceiptPath), { recursive: true });
    writeFileSync(freePbxReceiptPath, `${JSON.stringify([...freePbxReceipts.values()], null, 2)}\n`);
  };
  const receiptStore: FreePbxBackupReceiptStore = {
    issue(receipt) { freePbxReceipts.set(receipt.nonce, receipt); persistFreePbxReceipts(); },
    consume(binding) {
      const receipt = freePbxReceipts.get(binding.nonce);
      if (!receipt) return undefined;
      if (Date.parse(receipt.expiresAt) < Date.now() || receipt.targetId !== binding.targetId || receipt.jobId !== binding.jobId || receipt.moduleId !== binding.moduleId || receipt.action !== binding.action || receipt.catalogRevision !== binding.catalogRevision) return undefined;
      freePbxReceipts.delete(binding.nonce);
      persistFreePbxReceipts();
      return receipt;
    },
  };
  async function recordFreePbxActionHistory(moduleId: string, action: string, result: unknown): Promise<unknown> {
    const history = new LocalHistory({ executor: processExecutor, repositoryPath: join(userDataPath, 'history') });
    await history.initialize();
    return await history.record({
      action: 'updated',
      subject: `FreePBX module ${moduleId} ${action}`,
      payload: { schemaVersion: 1, recordType: 'freepbx-action', moduleId, action, result, typedResult: result },
    });
  }
  const asteriskService = new AsteriskService({ executor: processExecutor });
  const targetDiscovery = new TargetDiscovery(processExecutor);
  const cliGateway = new LocalAsteriskCliGateway(processExecutor);
  const readings = new AsteriskReadings(cliGateway);
  const dialplanReadings = new DialplanReadings(cliGateway);

  async function resolveTarget(serverId: string | undefined): Promise<TargetProfile> {
    const requested = serverId?.trim();
    if (!requested) throw new Error('Select a server first.');

    const registered = serverInventory().get(requested);
    if (registered && (registered.connectionKind === 'localDocker' || registered.connectionKind === 'remoteDocker')) {
      if (!registered.dockerContext?.trim()) throw new Error('The container target has no discovered container id.');
      return serverInventory().toTargetProfile(registered.id);
    }
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
      if (request.action === 'freepbx.family.schema' || request.action === 'freepbx.family.read' || request.action === 'freepbx.family.plan' || request.action === 'freepbx.family.apply') {
        const target = await resolveTarget(request.serverId);
        if (target.connectionKind !== 'wsl' && target.connectionKind !== 'localDocker') return { ok: false, requestId: request.requestId, code: 'FREEPBX_FAMILY_TRANSPORT_UNSUPPORTED', message: 'This family backend supports only a discovered WSL or local Docker target. The selected remote transport has no approved configuration transaction route.' };
        const moduleId = typeof request.payload?.moduleId === 'string' ? request.payload.moduleId.trim() : '';
        if (!moduleId) return { ok: false, requestId: request.requestId, code: 'FREEPBX_MODULE_REQUIRED', message: 'A catalog module ID is required.' };
        const familyCatalog = freePbxCatalogEntries().find((module) => module.moduleId === moduleId);
        if (!familyCatalog || familyCatalog.entitlementClass !== 'open') return { ok: false, requestId: request.requestId, code: 'FREEPBX_ENTITLEMENT_UNAVAILABLE', message: 'The selected family has no verified open entitlement, so the family route is non-actionable.' };
        const runtime = new FreePbxFamilyRuntime({ executor: processExecutor, target, catalog: freePbxFamilyEntries() });
        const schema = runtime.schema(moduleId);
        if (request.action === 'freepbx.family.schema') return { ok: true, requestId: request.requestId, data: schema };
        if (schema.backend !== 'config-transaction') return { ok: false, requestId: request.requestId, code: 'FREEPBX_FAMILY_UNAVAILABLE', message: schema.unavailableReason ?? 'This family has no executable target backend.', data: schema } as ControlPlaneResponse;
        if (request.action === 'freepbx.family.read') return { ok: true, requestId: request.requestId, data: await runtime.read(moduleId) };
        const documents = Array.isArray(request.payload?.documents) ? request.payload.documents as Array<{ resource: string; value: never }> : [];
        if (documents.length === 0) return { ok: false, requestId: request.requestId, code: 'FREEPBX_DOCUMENTS_REQUIRED', message: 'A family write must include the target-backed configuration documents.' };
        let familyBackup: { jobId: string; nonce: string; catalogRevision: string | null } | undefined;
        if (request.action === 'freepbx.family.apply') {
          const capability = await new FreePbxRuntimeAdapter({ executor: processExecutor, target, catalog: freePbxCatalogEntries(), receipts: receiptStore }).handshake();
          if (capability.moduleAdmin !== 'available' || capability.database !== 'available' || capability.webService !== 'available' || capability.backup !== 'available') return { ok: false, requestId: request.requestId, code: 'FREEPBX_CAPABILITY_UNKNOWN', message: `The family mutation requires known capabilities. moduleAdmin=${capability.moduleAdmin}, database=${capability.database}, webService=${capability.webService}, backup=${capability.backup}.` };
          const backup = request.payload?.backup;
          const typedBackup = backup && typeof backup === 'object' && (backup as Record<string, unknown>).source === 'official-freepbx-backup' && typeof (backup as Record<string, unknown>).jobId === 'string' && typeof (backup as Record<string, unknown>).nonce === 'string' ? backup as { jobId: string; nonce: string; catalogRevision: string | null } : undefined;
          if (!typedBackup || !receiptStore.consume({ targetId: target.id, jobId: typedBackup.jobId, moduleId, action: 'update', catalogRevision: typedBackup.catalogRevision, nonce: typedBackup.nonce })) return { ok: false, requestId: request.requestId, code: 'FREEPBX_BACKUP_RECEIPT_REQUIRED', message: 'A one-time target-bound backup receipt is required before the family mutation.' };
          familyBackup = typedBackup;
        }
        const result = request.action === 'freepbx.family.plan'
          ? await runtime.plan(moduleId, target.id, documents)
          : await runtime.apply(moduleId, target.id, documents);
        if (request.action === 'freepbx.family.apply') {
          try { await recordFreePbxActionHistory(moduleId, 'family-apply', { schemaVersion: 1, result, backup: familyBackup }); } catch { /* the result remains honest and the history failure is surfaced by the next local-history read */ }
        }
        return { ok: true, requestId: request.requestId, data: result };
      }
      if (request.action === 'freepbx.modules') {
        const target = await resolveTarget(request.serverId);
        return { ok: true, requestId: request.requestId, data: await new FreePbxRuntimeAdapter({
          executor: processExecutor,
          target,
           catalog: freePbxCatalogEntries(),
           receipts: receiptStore,
        }).listModules() };
      }
      if (request.action === 'freepbx.handshake') {
        const target = await resolveTarget(request.serverId);
         return { ok: true, requestId: request.requestId, data: await new FreePbxRuntimeAdapter({ executor: processExecutor, target, catalog: freePbxCatalogEntries(), receipts: receiptStore }).handshake() };
      }
      if (request.action === 'freepbx.backup') {
        const target = await resolveTarget(request.serverId);
        const jobId = typeof request.payload?.jobId === 'string' ? request.payload.jobId.trim() : '';
        if (!jobId) return { ok: false, requestId: request.requestId, code: 'FREEPBX_BACKUP_JOB_REQUIRED', message: 'Choose a backup job from the target backup catalog before a module action.' };
         const moduleId = typeof request.payload?.moduleId === 'string' ? request.payload.moduleId.trim() : '';
         const action = request.payload?.action;
         const catalogRevision = typeof request.payload?.catalogRevision === 'string' ? request.payload.catalogRevision : null;
         if (!moduleId || typeof action !== 'string' || !['install', 'enable', 'disable', 'update', 'remove'].includes(action)) return { ok: false, requestId: request.requestId, code: 'FREEPBX_BACKUP_BINDING_REQUIRED', message: 'A backup receipt must name the selected module, action, and catalog revision.' };
         const receipt = await new FreePbxRuntimeAdapter({ executor: processExecutor, target, catalog: freePbxCatalogEntries(), receipts: receiptStore }).createBackup({ jobId, moduleId, action: action as FreePbxModuleAction, catalogRevision });
        return { ok: true, requestId: request.requestId, data: receipt };
      }
      if (request.action === 'freepbx.backup.list') {
        const target = await resolveTarget(request.serverId);
         return { ok: true, requestId: request.requestId, data: { jobs: await new FreePbxRuntimeAdapter({ executor: processExecutor, target, catalog: freePbxCatalogEntries(), receipts: receiptStore }).listBackupJobs() } };
      }
      if (request.action === 'freepbx.module.state' || request.action === 'freepbx.module.action') {
        const target = await resolveTarget(request.serverId);
        const runtime = new FreePbxRuntimeAdapter({
          executor: processExecutor,
          target,
           catalog: freePbxCatalogEntries(),
           receipts: receiptStore,
        });
        const moduleId = typeof request.payload?.moduleId === 'string' ? request.payload.moduleId.trim() : '';
        if (request.action === 'freepbx.module.state') return { ok: true, requestId: request.requestId, data: await runtime.readModule(moduleId) };
        const action = request.payload?.action;
        const confirmed = request.payload?.confirmed === true;
        if (typeof action !== 'string' || !['install', 'enable', 'disable', 'update', 'remove'].includes(action)) return { ok: false, requestId: request.requestId, code: 'FREEPBX_ACTION_REQUIRED', message: 'Choose one allowlisted FreePBX module action.' };
        const backup = request.payload?.backup;
        const typedBackup = backup && typeof backup === 'object' && (backup as Record<string, unknown>).source === 'official-freepbx-backup'
          && typeof (backup as Record<string, unknown>).filesReceipt === 'string'
          && typeof (backup as Record<string, unknown>).databaseReceipt === 'string'
          ? backup as { filesReceipt: string; databaseReceipt: string; source: 'official-freepbx-backup'; observedAt: string }
          : undefined;
         const result = await runtime.action({ moduleId, action: action as 'install' | 'enable' | 'disable' | 'update' | 'remove', confirmed, expectedRevision: typeof request.payload?.expectedRevision === 'string' ? request.payload.expectedRevision : null, backup: typedBackup });
         let history: unknown;
         try { history = await recordFreePbxActionHistory(moduleId, action, result); }
         catch (error) { history = { recorded: false, reason: error instanceof Error ? error.message : 'Local history could not record this module action.' }; }
         return { ok: result.status === 'applied' || result.status === 'rolledBack', requestId: request.requestId, code: result.status === 'applied' || result.status === 'rolledBack' ? undefined : `FREEPBX_${result.status.toUpperCase()}`, message: result.message, data: { ...result, history } } as ControlPlaneResponse;
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
          const entries = await history.list(opts);
          const withPayload = await Promise.all(entries.map(async (entry) => ({ ...entry, payload: await history.payload(entry.id, entry.subject) })));
          return { ok: true, requestId: request.requestId, data: { entries: withPayload, counts: await history.actionCounts() } };
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
      return { ok: false, requestId: request.requestId, code: 'ACTION_NOT_AVAILABLE', message: 'This operation is unavailable until a reviewed target-specific plan is connected.' };
    } catch (error) {
      return { ok: false, requestId: request.requestId, code: 'CONTROL_PLANE_ERROR', message: error instanceof Error ? error.message : 'Control-plane request failed.' };
    }
  }

  return { controlPlaneRequest, bundledAsteriskRuntime, serverInventory };
}

export type ControlPlaneDispatcher = ReturnType<typeof createControlPlaneDispatcher>;
