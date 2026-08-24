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
import { WslConfigTransport, CONFIGURABLE_RESOURCES, StructuredConfigPlanner, ConfigTransaction, ConfigHistory, MediaLibrary, LocalHistory, MigrationBackupService } from './index.js';
import { ServerInventory, SettingsRegistry } from './index.js';
import type { ServerInventoryStore, ServerRecord, SettingsSnapshotStore } from './index.js';
import { atomicWriteFileSync } from './atomic-file.js';
import { AsteriskReadings, DialplanReadings, LocalAsteriskCliGateway, NodeProcessExecutor, READ_ONLY_COMMANDS, TargetDiscovery } from './index.js';
import type { ReadOnlyCommand, TargetProfile } from './index.js';
import type { ControlPlaneRequest, ControlPlaneResponse, PbxReadView } from '../shared/control-plane.js';

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
}

export function createControlPlaneDispatcher(options: ControlPlaneDispatcherOptions) {
  const { userDataPath, resourcesPath, hosted } = options;
  const processExecutor = new NodeProcessExecutor({ allowedExecutables: ['wsl.exe', 'docker', 'git'] });
  const asteriskService = new AsteriskService({ executor: processExecutor });
  const targetDiscovery = new TargetDiscovery(processExecutor);
  const cliGateway = new LocalAsteriskCliGateway(processExecutor);
  const readings = new AsteriskReadings(cliGateway);
  const dialplanReadings = new DialplanReadings(cliGateway);

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

  const migration = new MigrationBackupService({ userDataPath, executor: processExecutor });

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
      if (request.action === 'migration.export') {
        const destination = typeof request.payload?.destination === 'string' ? request.payload.destination : undefined;
        return { ok: true, requestId: request.requestId, data: await migration.exportMigration(destination) };
      }
      if (request.action === 'migration.export.start') {
        const destination = typeof request.payload?.destination === 'string' ? request.payload.destination : undefined;
        return { ok: true, requestId: request.requestId, data: migration.startExport(destination) };
      }
      if (request.action === 'migration.operation.status') {
        const operationId = typeof request.payload?.operationId === 'string' ? request.payload.operationId : '';
        return { ok: true, requestId: request.requestId, data: migration.operationStatus(operationId) };
      }
      if (request.action === 'migration.import.start') {
        const source = typeof request.payload?.source === 'string' ? request.payload.source : '';
        if (!source) return { ok: false, requestId: request.requestId, code: 'MIGRATION_SOURCE_REQUIRED', message: 'Choose a migration manifest or export directory first.' };
        return { ok: true, requestId: request.requestId, data: migration.startImport(source) };
      }
      if (request.action === 'migration.validate') {
        const source = typeof request.payload?.source === 'string' ? request.payload.source : '';
        if (!source) return { ok: false, requestId: request.requestId, code: 'MIGRATION_SOURCE_REQUIRED', message: 'Choose a migration manifest or export directory first.' };
        return { ok: true, requestId: request.requestId, data: { manifest: await migration.validateImport(source) } };
      }
      if (request.action === 'migration.import') {
        const source = typeof request.payload?.source === 'string' ? request.payload.source : '';
        if (!source) return { ok: false, requestId: request.requestId, code: 'MIGRATION_SOURCE_REQUIRED', message: 'Choose a migration manifest or export directory first.' };
        const confirmed = request.payload?.confirmReplace === true;
        const result = await migration.importMigration(source, confirmed);
        return { ok: result.operation.state === 'succeeded', requestId: request.requestId, code: result.operation.state === 'succeeded' ? undefined : 'MIGRATION_IMPORT_FAILED', message: result.operation.detail, data: result } as ControlPlaneResponse;
      }
      if (request.action === 'migration.cancel') {
        const operationId = typeof request.payload?.operationId === 'string' ? request.payload.operationId : '';
        const result = await migration.cancel(operationId);
        return { ok: result.cancelled, requestId: request.requestId, code: result.cancelled ? undefined : 'MIGRATION_CANCEL_NOT_FOUND', message: result.detail, data: result } as ControlPlaneResponse;
      }
      if (request.action === 'migration.recovery.status') return { ok: true, requestId: request.requestId, data: migration.recoveryStatus() };
      if (request.action === 'migration.recovery.retry') return { ok: migration.retryRecovery().resolved, requestId: request.requestId, data: migration.recoveryStatus() };
      if (request.action === 'backup.create') {
        const result = await migration.createBackup();
        return { ok: result.operation.state === 'succeeded', requestId: request.requestId, code: result.operation.state === 'succeeded' ? undefined : 'BACKUP_FAILED', message: result.operation.detail, data: result } as ControlPlaneResponse;
      }
      if (request.action === 'backup.start') {
        return { ok: true, requestId: request.requestId, data: migration.startBackup() };
      }
      if (request.action === 'backup.list') {
        return { ok: true, requestId: request.requestId, data: { backups: await migration.listBackups() } };
      }
      if (request.action === 'backup.retained.verify') {
        const path = typeof request.payload?.path === 'string' ? request.payload.path : '';
        return { ok: true, requestId: request.requestId, data: await migration.verifyRetainedTree(path) };
      }
      if (request.action === 'backup.prune.preview') {
        const keep = Number(request.payload?.keep ?? 30);
        const selectedPaths = Array.isArray(request.payload?.selectedPaths) ? request.payload.selectedPaths.filter((path): path is string => typeof path === 'string') : [];
        return { ok: true, requestId: request.requestId, data: await migration.previewPrune(keep, selectedPaths) };
      }
      if (request.action === 'backup.prune') {
        const keep = Number(request.payload?.keep ?? 30);
        const selectedPaths = Array.isArray(request.payload?.selectedPaths) ? request.payload.selectedPaths.filter((path): path is string => typeof path === 'string') : [];
        const previewToken = typeof request.payload?.previewToken === 'string' ? request.payload.previewToken : undefined;
        return { ok: true, requestId: request.requestId, data: await migration.pruneBackups(keep, selectedPaths, previewToken) };
      }
      if (request.action === 'git.history.status') {
        const remote = typeof request.payload?.remote === 'string' ? request.payload.remote : undefined;
        const branch = typeof request.payload?.branch === 'string' ? request.payload.branch : undefined;
        return { ok: true, requestId: request.requestId, data: await migration.gitStatus(remote, branch) };
      }
      if (request.action === 'git.remote.set') {
        return { ok: false, requestId: request.requestId, code: 'GIT_OPERATION_START_REQUIRED', message: 'Use the operation-start action so remote replacement and rollback receipts remain durable.' };
      }
      if (request.action === 'git.remote.set.start') {
        const name = typeof request.payload?.name === 'string' ? request.payload.name : '';
        const url = typeof request.payload?.url === 'string' ? request.payload.url : '';
        const pushUrl = typeof request.payload?.pushUrl === 'string' ? request.payload.pushUrl : undefined;
        return { ok: true, requestId: request.requestId, data: migration.startSetRemote(name, url, pushUrl) };
      }
      if (request.action === 'git.remote.remove') {
        return { ok: false, requestId: request.requestId, code: 'GIT_OPERATION_START_REQUIRED', message: 'Use the operation-start action so remote removal receipts remain durable.' };
      }
      if (request.action === 'git.remote.remove.start') {
        const name = typeof request.payload?.name === 'string' ? request.payload.name : '';
        return { ok: true, requestId: request.requestId, data: migration.startRemoveRemote(name) };
      }
      if (request.action === 'git.remote.fetch.start' || request.action === 'git.remote.push.start') {
        const name = typeof request.payload?.name === 'string' ? request.payload.name : '';
        if (request.action === 'git.remote.fetch.start') return { ok: true, requestId: request.requestId, data: migration.startFetchRemote(name) };
        const branch = typeof request.payload?.branch === 'string' ? request.payload.branch : '';
        return { ok: true, requestId: request.requestId, data: migration.startPushRemote(name, branch) };
      }
      if (request.action === 'git.remote.fetch' || request.action === 'git.remote.push') {
        return { ok: false, requestId: request.requestId, code: 'GIT_OPERATION_START_REQUIRED', message: 'Use the operation-start action so progress, cancellation, and terminal receipts remain durable.' };
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
      return { ok: false, requestId: request.requestId, code: 'ACTION_NOT_AVAILABLE', message: 'This operation is unavailable until a reviewed target-specific plan is connected.' };
    } catch (error) {
      return { ok: false, requestId: request.requestId, code: 'CONTROL_PLANE_ERROR', message: error instanceof Error ? error.message : 'Control-plane request failed.' };
    }
  }

  return { controlPlaneRequest, bundledAsteriskRuntime, serverInventory };
}

export type ControlPlaneDispatcher = ReturnType<typeof createControlPlaneDispatcher>;
