/**
 * The control-plane action dispatcher, factored out of the Electron main process so a
 * hosted server can serve the exact same behaviour over HTTP instead of drifting into a
 * second implementation of the same 25-odd actions.
 *
 * Everything that used to reach `app.getPath('userData')` or `process.resourcesPath`
 * directly now takes those two paths as constructor options instead, so this module has
 * no dependency on Electron and can run inside a plain Node.js process on a VM.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync, unlinkSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { WslProvisioning, MANAGED_DISTRIBUTION } from './wsl-provisioning.js';
import { AsteriskService } from './asterisk-service.js';
import {
  parseVoicemailUsers, parseVoicemailZones, parseConfbridgeList, parseMohClasses, parseCodecs,
  parseTranslations, parseAclRules, parseManagerSettings, parseManagerUsers, parseAriApps,
  parseCdrStatus, parseLoggerChannels, parseSysinfo, parseUptime,
} from './asterisk-parsers.js';
import { WslConfigTransport, CONFIGURABLE_RESOURCES, StructuredConfigPlanner, ConfigTransaction, ConfigHistory, MediaLibrary, LocalHistory } from './index.js';
import { ServerInventory, SettingsRegistry } from './index.js';
import type { ServerInventoryStore, SettingsSnapshotStore } from './index.js';
import { atomicWriteFileSync } from './atomic-file.js';
import type { ServerInventorySnapshot } from './server-inventory.js';
import type { RawConfigReader } from './wsl-config-transport.js';
import { ConverterRegistry } from './converter-registry.js';
import { pdfCapabilities } from './converter-pdf.js';
import { ConverterStore } from './converter-store.js';
import { ConverterRunner } from './converter-runner.js';
import { ConverterQueue } from './converter-queue.js';
import { sniffFileType } from './converter-sniff.js';
import { OllamaClient } from './ollama-client.js';
import { createOllamaRuntimeHandlers } from './ollama-client.js';
import { OllamaStore } from './ollama-store.js';
import { OllamaPullQueue, createOllamaPullHandlers } from './ollama-pulls.js';
import { OllamaChat, createOllamaChatHandlers } from './ollama-chat.js';
import type { ConverterRequest, ConverterSniffResult } from '../shared/converter.js';
import { AsteriskReadings, DialplanReadings, LocalAsteriskCliGateway, NodeProcessExecutor, READ_ONLY_COMMANDS, TargetDiscovery } from './index.js';
import type { ChangePlan, ReadOnlyCommand, TargetProfile } from './index.js';
import type { ControlPlaneRequest, ControlPlaneResponse, PbxReadView } from '../shared/control-plane.js';
import { createAuthLockRuntime, type AuthLockVault } from './auth-lock-runtime.js';
import type { HistorySnapshotProtector } from '../shared/history.js';
import type { HistoryRestoreReceipt } from '../shared/history.js';
import type { ToyLockCreateReceipt, ToyLockCredentialReference, ToyLockRelockReceipt, ToyLockRemovalReceipt, ToyLockUnlockReceipt } from '../shared/locks.js';
import type { LockStoreResult } from './lock-store.js';

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

const CONTROL_PLANE_ACTIONS = new Set<string>([
  'server.list', 'server.connect', 'pbx.snapshot', 'pbx.apply', 'pbx.plan', 'pbx.read', 'pbx.command', 'pbx.config',
  'server.inventory.list', 'server.inventory.add', 'server.inventory.update', 'server.inventory.remove', 'server.inventory.set-active',
  'runtime.status', 'runtime.provision', 'runtime.stop', 'runtime.remove',
  'daemon.status', 'daemon.start', 'daemon.stop', 'daemon.restart',
  'history.list', 'history.restore', 'media.list', 'media.upload', 'media.remove',
  'local-history.list', 'local-history.record', 'local-history.restore',
  'authenticator.list', 'authenticator.reconciliation', 'authenticator.register', 'authenticator.confirm', 'authenticator.remove', 'authenticator.snapshot', 'authenticator.restore',
  'toy-lock.initialize', 'toy-lock.list', 'toy-lock.create', 'toy-lock.unlock', 'toy-lock.relock', 'toy-lock.remove',
  'toy-lock.recovery', 'toy-lock.reconciliation',
  'toy-lock-credential.create',
  'support-ticket.list', 'support-ticket.create', 'support-ticket.advance',
  'unlock-ladder.issue', 'unlock-ladder.hit', 'unlock-ladder.grade',
  'converter.catalog', 'converter.pdf-capabilities', 'converter.sniff',
  'converter.queue.create', 'converter.queue.enqueue-one', 'converter.queue.page',
  'converter.queue.start', 'converter.queue.pause', 'converter.queue.resume', 'converter.queue.cancel',
  'ollama.snapshot',
  'ollama.health', 'ollama.version', 'ollama.models.installed', 'ollama.models.running', 'ollama.model.show', 'ollama.model.delete', 'ollama.model.copy',
  'ollama.pulls.list', 'ollama.pulls.enqueue', 'ollama.pulls.cancel', 'ollama.pulls.retry', 'ollama.pulls.reconcile',
  'ollama.chat.sessions', 'ollama.chat.create', 'ollama.chat.rename', 'ollama.chat.delete', 'ollama.chat.send', 'ollama.chat.retry', 'ollama.chat.regenerate', 'ollama.chat.stop',
  'dim-sum.cache.read',
]);

function mapToyLockFailure(
  result: Extract<LockStoreResult<unknown>, { ok: false }>,
  waitCreated = false,
): ToyLockUnlockReceipt<never> {
  switch (result.code) {
    case 'verification-failed':
      return { ok: false, code: result.code, message: result.message, waitCreated };
    case 'duplicate-lock':
    case 'invalid-record':
    case 'lock-not-found':
    case 'persistence-unavailable':
    case 'vault-unavailable':
    case 'vault-reference-missing':
      return { ok: false, code: result.code, message: result.message, waitCreated: false };
    default:
      return neverToyLockFailure(result.code);
  }
}

function mapToyLockMutationFailure(
  result: Extract<LockStoreResult<unknown>, { ok: false }>,
): Exclude<ToyLockCreateReceipt | ToyLockRelockReceipt, { ok: true }> {
  switch (result.code) {
    case 'duplicate-lock':
    case 'invalid-record':
    case 'lock-not-found':
    case 'persistence-unavailable':
    case 'vault-unavailable':
    case 'vault-reference-missing':
      return { ok: false, code: result.code, message: result.message, recoverable: result.recoverable };
    case 'verification-failed':
      throw new Error('Verification failure is not a valid create or relock result.');
    default:
      return neverToyLockFailure(result.code);
  }
}

function blockedToyLockRemoval(message: string): ToyLockRemovalReceipt {
  return { status: 'recoverable', message, recoverable: true };
}

function blockedToyLockRemovalByReconciliation(reconciliation: import('../shared/locks.js').ToyLockReconciliationReceipt): ToyLockRemovalReceipt {
  return { status: 'blocked', message: `${reconciliation.warning} Affected locks: ${reconciliation.affectedIds.join(', ') || 'unresolved state'}.`, recoverable: true, affectedIds: reconciliation.affectedIds, reconciliation };
}

function neverToyLockFailure(value: never): never {
  throw new Error(`Unhandled toy-lock failure code: ${String(value)}`);
}

function validateRequestSchema(request: ControlPlaneRequest): string | undefined {
  if (!request || typeof request !== 'object') return 'The request body must be an object.';
  if (typeof request.requestId !== 'string' || !/^[A-Za-z0-9._:-]{1,128}$/u.test(request.requestId)) {
    return 'The request id is missing or invalid.';
  }
  if (typeof request.action !== 'string' || !CONTROL_PLANE_ACTIONS.has(request.action)) {
    return 'The requested action is not part of the control-plane schema.';
  }
  if (request.serverId !== undefined && (typeof request.serverId !== 'string' || request.serverId.length > 256)) {
    return 'The server id is invalid.';
  }
  if (request.payload !== undefined && (typeof request.payload !== 'object' || request.payload === null || Array.isArray(request.payload))) {
    return 'The request payload must be an object.';
  }
  return undefined;
}

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
  converterPickFile?: () => Promise<{ sourcePath: string; name: string; bytes: number; lastModified?: string; mediaType?: string } | undefined>;
  converterPickDestination?: () => Promise<string | undefined>;
  authLockVault?: AuthLockVault;
  historyProtector?: HistorySnapshotProtector;
  trustedTime?: () => Promise<number | undefined>;
}

export function createControlPlaneDispatcher(options: ControlPlaneDispatcherOptions) {
  const { userDataPath, resourcesPath, hosted } = options;
  const processExecutor = new NodeProcessExecutor({ allowedExecutables: ['wsl.exe', 'docker', 'git'] });
  const authLocks = createAuthLockRuntime({
    userDataPath,
    executor: processExecutor,
    vault: options.authLockVault,
    historyProtector: options.historyProtector,
    trustedTime: options.trustedTime,
    recovery: {
      applicationDataPath: hosted ? '#browser-storage' : userDataPath,
      supportTicketRoute: '#surface=support-tickets',
      deletesAutomatically: false,
      disclosure: 'This is a personal speed bump, not encryption or an access-control boundary. The recovery flow opens the application-data folder and never deletes it for you.',
    },
  });
  const converterRegistry = ConverterRegistry.create();
  const ollamaClient = new OllamaClient();
  const ollamaStore = new OllamaStore(join(userDataPath, 'ollama-state.json'));
  const ollamaPullQueue = new OllamaPullQueue({ client: ollamaClient, store: ollamaStore });
  const ollamaChat = new OllamaChat({ client: ollamaClient });
  const ollamaHandlers = {
    ...createOllamaRuntimeHandlers(ollamaClient),
    ...createOllamaPullHandlers(ollamaPullQueue),
    ...createOllamaChatHandlers(ollamaChat),
  };
  const ollamaReady = ollamaPullQueue.initialize();
  const converterQueue = converterRegistry.then(async (registry) => {
    const store = new ConverterStore({ rootPath: join(userDataPath, 'converter-queues') });
    await store.initialize();
    const queue = new ConverterQueue({ store, registry, runner: new ConverterRunner({ registry }) });
    await queue.initialize();
    return queue;
  });
  const targetDiscovery = new TargetDiscovery(processExecutor);
  const cliGateway = new LocalAsteriskCliGateway(processExecutor);
  const readings = new AsteriskReadings(cliGateway);
  const dialplanReadings = new DialplanReadings(cliGateway);

  /** Raw configuration bytes stay inside the privileged transport and are never logged or returned. */
  const rawConfigRead: RawConfigReader = async (distribution, resource, signal) => await new Promise((resolve, reject) => {
    const child = spawn('wsl.exe', ['-d', distribution, '--', 'cat', resource], {
      windowsHide: true,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let outputBytes = 0;
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      if (error) reject(error);
    };
    const onAbort = () => {
      child.kill('SIGTERM');
      finish(new DOMException('Operation cancelled', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      finish(new Error(`Reading ${resource} timed out.`));
    }, 30_000);
    const collect = (target: Buffer[], chunk: Buffer) => {
      outputBytes += chunk.byteLength;
      if (outputBytes > 4 * 1024 * 1024) {
        child.kill('SIGTERM');
        finish(new Error(`Reading ${resource} exceeded the 4 MiB safety limit.`));
        return;
      }
      target.push(chunk);
    };
    child.stdout.on('data', (chunk: Buffer) => collect(stdout, chunk));
    child.stderr.on('data', (chunk: Buffer) => collect(stderr, chunk));
    child.once('error', () => finish(new Error(`The target process for ${resource} could not be started.`)));
    child.once('close', (exitCode) => {
      if (settled) return;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      settled = true;
      if (exitCode === 0) {
        resolve({ state: 'present', text: Buffer.concat(stdout).toString('utf8') });
        return;
      }
      const reason = Buffer.concat(stderr).toString('utf8');
      if (/No such file or directory/u.test(reason)) resolve({ state: 'absent' });
      else reject(new Error(`The target refused the read of ${resource} with exit code ${exitCode}.`));
    });
  });

  const configTransport = (target: TargetProfile) => new WslConfigTransport({
    executor: processExecutor,
    distribution: target.wslDistribution!,
    targetId: target.id,
    rawRead: rawConfigRead,
  });

  const serviceFor = (target: TargetProfile) => new AsteriskService({
    executor: processExecutor,
    distribution: target.wslDistribution!,
  });

  async function resolveTarget(serverId: string | undefined): Promise<TargetProfile> {
    const requested = serverId?.trim();
    if (!requested) throw new Error('Select a server first.');

    const registered = serverInventory().get(requested);
    if (registered && registered.connectionKind !== 'wsl') {
      throw new Error(`The ${registered.connectionKind} transport is registered but not yet wired to configuration and daemon operations.`);
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
      const valid = record.schemaVersion === 1
        && typeof record.sourceCommit === 'string' && /^[0-9a-f]{40}$/iu.test(record.sourceCommit)
        && record.runtime === 'wsl2-linux-amd64'
        && typeof record.sha256 === 'string' && /^[0-9a-f]{64}$/iu.test(record.sha256)
        && typeof record.bytes === 'number' && Number.isSafeInteger(record.bytes) && record.bytes > 0
        && statSync(rootfs).size === record.bytes;
      if (!valid) return { state: 'unavailable', reason: 'The packaged Asterisk WSL runtime provenance schema or file size is invalid.' };
      return {
        state: 'available',
        rootfs,
        provenance,
        record: {
          schemaVersion: record.schemaVersion,
          sourceCommit: record.sourceCommit,
          runtime: record.runtime,
          sha256: record.sha256,
          bytes: record.bytes,
          generatedAt: typeof record.generatedAt === 'string' ? record.generatedAt : undefined,
        },
      };
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
      const parsed = new URL(record.url);
      const allowedOrigin = parsed.protocol === 'https:'
        && (parsed.hostname === 'cloud-images.ubuntu.com' || parsed.hostname === 'cdimage.ubuntu.com' || parsed.hostname === 'releases.ubuntu.com')
        && parsed.username === '' && parsed.password === '';
      if (!allowedOrigin) return undefined;
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
        const parsed = JSON.parse(readFileSync(this.path, 'utf8')) as Partial<ServerInventorySnapshot>;
        if (parsed.schemaVersion === undefined && Array.isArray(parsed.servers)) {
          return { schemaVersion: 1, servers: parsed.servers, activeServerId: parsed.activeServerId };
        }
        return parsed as ServerInventorySnapshot;
      } catch (error) {
        throw new Error(`The saved server inventory could not be read, so it will not be overwritten: ${error instanceof Error ? error.message : 'invalid JSON'}`);
      }
    }
    write(snapshot: ServerInventorySnapshot) {
      mkdirSync(dirname(this.path), { recursive: true });
      if (existsSync(this.path)) {
        try {
          JSON.parse(readFileSync(this.path, 'utf8'));
        } catch (error) {
          throw new Error(`The saved server inventory changed into unreadable data, so it was not overwritten: ${error instanceof Error ? error.message : 'invalid JSON'}`);
        }
      }
      const temporary = `${this.path}.tmp-${randomUUID()}`;
      writeFileSync(temporary, `${JSON.stringify(snapshot, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
      try {
        let lastError: unknown;
        for (let attempt = 0; attempt < 5; attempt += 1) {
          try {
            renameSync(temporary, this.path);
            return;
          } catch (error) {
            lastError = error;
            const code = (error as { code?: string }).code;
            if (!['EPERM', 'EACCES', 'EBUSY'].includes(code ?? '') || attempt === 4) throw error;
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20 * (attempt + 1));
          }
        }
        throw lastError;
      } finally {
        if (existsSync(temporary)) unlinkSync(temporary);
      }
    }
  }

  function runtimeForResponse(runtime: ReturnType<typeof bundledAsteriskRuntime>) {
    return 'record' in runtime
      ? { state: 'available', record: runtime.record }
      : { state: 'unavailable', reason: runtime.reason };
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

  async function runTargetCli(target: TargetProfile, command: string): Promise<string> {
    const result = await processExecutor.execute({
      executable: 'wsl.exe',
      args: ['-d', target.wslDistribution!, '--', 'asterisk', '-rx', command],
      timeoutMs: 30_000,
      maxOutputBytes: 1024 * 1024,
    });
    const output = result.stdout.trim();
    if (result.status !== 'succeeded' || output.length === 0 || /Unable to connect to remote asterisk/iu.test(output)) {
      throw new Error(result.stderr.trim() || output || `Asterisk did not accept "${command}".`);
    }
    return output;
  }

  async function reloadAndVerifyRuntime(target: TargetProfile, plan: ChangePlan): Promise<void> {
    if (target.id !== plan.targetId) {
      throw new Error(`Runtime verification targets ${target.id}, but the plan targets ${plan.targetId}.`);
    }
    const resources = new Set(plan.diffs.map((diff) => diff.resource));
    if (resources.has('/etc/asterisk/pjsip.conf')) {
      await runTargetCli(target, 'pjsip reload');
      const observed = await runTargetCli(target, 'pjsip show endpoints');
      if (!/(?:Endpoint:|Objects found:|No objects found)/iu.test(observed)) {
        throw new Error('PJSIP reloaded but its endpoint inventory could not be verified.');
      }
    }
    if (resources.has('/etc/asterisk/extensions.conf')) {
      await runTargetCli(target, 'dialplan reload');
      const observed = await runTargetCli(target, 'dialplan show');
      if (!/(?:\[ Context|contexts?)/iu.test(observed)) {
        throw new Error('The dialplan reloaded but its runtime inventory could not be verified.');
      }
    }
    const remaining = [...resources].filter((resource) => resource !== '/etc/asterisk/pjsip.conf' && resource !== '/etc/asterisk/extensions.conf');
    if (remaining.length > 0) {
      await runTargetCli(target, 'core reload');
    }
    const identity = await runTargetCli(target, 'core show version');
    if (!/^Asterisk\s+\d+(?:\.\d+)+/imu.test(identity)) {
      throw new Error('The selected daemon did not return a valid identity after reload.');
    }
  }

  async function controlPlaneRequest(request: ControlPlaneRequest): Promise<ControlPlaneResponse> {
    try {
      const schemaError = validateRequestSchema(request);
      if (schemaError) {
        return { ok: false, requestId: typeof request?.requestId === 'string' ? request.requestId : 'invalid', code: 'REQUEST_SCHEMA_INVALID', message: schemaError };
      }
      if (hosted && HOSTED_UNSUPPORTED_ACTIONS.has(request.action)) {
        return {
          ok: false, requestId: request.requestId, code: 'ACTION_UNSUPPORTED_HOSTED',
          message: `"${request.action}" manages a Windows WSL distribution and cannot run on a hosted server. ` +
            'Install and administer Asterisk on this VM directly; the console will connect to it as a target.',
        };
      }

      if (request.action === 'converter.catalog' || request.action === 'converter.pdf-capabilities') {
        const registry = await converterRegistry;
        if (request.action === 'converter.catalog') {
          return {
            ok: true,
            requestId: request.requestId,
            data: { categories: registry.categories(), formats: registry.formats(), adapters: registry.adapters() },
          };
        }
        return { ok: true, requestId: request.requestId, data: pdfCapabilities(registry) };
      }
      if (request.action === 'converter.sniff') {
        const sourcePath = typeof request.payload?.sourcePath === 'string' ? request.payload.sourcePath : '';
        const maxBytes = typeof request.payload?.maxBytes === 'number' ? request.payload.maxBytes : undefined;
        if (!sourcePath) return { ok: false, requestId: request.requestId, code: 'CONVERTER_SOURCE_REQUIRED', message: 'Choose a local source file first.' };
        const result: ConverterSniffResult = await sniffFileType(sourcePath, maxBytes);
        return { ok: true, requestId: request.requestId, data: result };
      }
      if (request.action === 'ollama.snapshot') {
        const observedAt = new Date().toISOString();
        const [health, version, installed, running] = await Promise.all([
          ollamaClient.health(), ollamaClient.version(), ollamaClient.installedModels(), ollamaClient.runningModels(),
        ]);
        return { ok: true, requestId: request.requestId, data: { observedAt, endpoint: ollamaClient.endpoint, health, version, installed, running } };
      }
      if (request.action === 'dim-sum.cache.read') {
        const cachePath = join(userDataPath, 'dim-sum-cache.json');
        try { return { ok: true, requestId: request.requestId, data: { text: readFileSync(cachePath, 'utf8') } }; }
        catch (error) {
          const code = (error as { code?: string }).code;
          if (code === 'ENOENT') return { ok: true, requestId: request.requestId, data: { text: null } };
          return { ok: false, requestId: request.requestId, code: 'DIM_SUM_CACHE_UNAVAILABLE', message: 'The local dim-sum cache could not be read.' };
        }
      }
      if (request.action.startsWith('ollama.')) {
        await ollamaReady;
        const handler = ollamaHandlers[request.action as keyof typeof ollamaHandlers];
        if (!handler) return { ok: false, requestId: request.requestId, code: 'OLLAMA_ACTION_UNAVAILABLE', message: 'The requested Ollama action is not registered.' };
        const response = await handler(request as never);
        if (!response.ok) return { ok: false, requestId: request.requestId, code: response.code, message: response.message };
        return { ok: true, requestId: request.requestId, data: response.data };
      }
      if (request.action === 'converter.queue.create') {
        const label = typeof request.payload?.label === 'string' ? request.payload.label : '';
        return { ok: true, requestId: request.requestId, data: await (await converterQueue).create(label) };
      }
      if (request.action === 'converter.queue.enqueue-one') {
        const queueId = typeof request.payload?.queueId === 'string' ? request.payload.queueId : '';
        const item = request.payload?.item as ConverterRequest | undefined;
        if (!queueId || !item) return { ok: false, requestId: request.requestId, code: 'CONVERTER_QUEUE_INPUT_INVALID', message: 'A queue id and one validated converter item are required.' };
        return { ok: true, requestId: request.requestId, data: await (await converterQueue).enqueueOne(queueId, item) };
      }
      if (request.action === 'converter.queue.page') {
        const queueId = typeof request.payload?.queueId === 'string' ? request.payload.queueId : '';
        const cursor = request.payload?.cursor as { afterSequence: number } | undefined;
        const limit = typeof request.payload?.limit === 'number' ? request.payload.limit : 100;
        if (!queueId) return { ok: false, requestId: request.requestId, code: 'CONVERTER_QUEUE_REQUIRED', message: 'A converter queue must be selected.' };
        const store = new ConverterStore({ rootPath: join(userDataPath, 'converter-queues') });
        await store.initialize();
        return { ok: true, requestId: request.requestId, data: await store.listPage(queueId, cursor ?? { afterSequence: 0 }, limit) };
      }
      if (request.action === 'converter.queue.start' || request.action === 'converter.queue.pause' || request.action === 'converter.queue.resume' || request.action === 'converter.queue.cancel') {
        const queueId = typeof request.payload?.queueId === 'string' ? request.payload.queueId : '';
        if (!queueId) return { ok: false, requestId: request.requestId, code: 'CONVERTER_QUEUE_REQUIRED', message: 'A converter queue must be selected.' };
        const queue = await converterQueue;
        const result = request.action === 'converter.queue.start' ? await queue.start(queueId)
          : request.action === 'converter.queue.pause' ? await queue.pause(queueId)
            : request.action === 'converter.queue.resume' ? await queue.resume(queueId)
              : await queue.cancel(queueId);
        return { ok: true, requestId: request.requestId, data: result };
      }

      if (request.action === 'runtime.status') {
        const { provisioning, payloadPresent, runtime } = wslProvisioning();
        return { ok: true, requestId: request.requestId, data: { managedDistribution: MANAGED_DISTRIBUTION, bundledRuntime: runtimeForResponse(runtime), status: await provisioning.status(payloadPresent) } };
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
        const target = await resolveTarget(request.serverId);
        const status = await serviceFor(target).status();
        return { ok: true, requestId: request.requestId, data: { status } };
      }
      if (request.action === 'daemon.start') {
        const target = await resolveTarget(request.serverId);
        const outcome = await serviceFor(target).start();
        const answering = outcome.status.state === 'daemonAnswering';
        return { ok: answering, requestId: request.requestId, code: answering ? undefined : 'DAEMON_START_FAILED', message: answering ? undefined : outcome.status.reason, data: outcome } as ControlPlaneResponse;
      }
      if (request.action === 'daemon.stop') {
        const target = await resolveTarget(request.serverId);
        const force = (request.payload as { force?: boolean } | undefined)?.force === true;
        const outcome = await serviceFor(target).stop({ force });
        const stopped = outcome.status.state === 'daemonNotRunning';
        return { ok: stopped, requestId: request.requestId, code: stopped ? undefined : 'DAEMON_STOP_FAILED', message: stopped ? undefined : outcome.status.reason, data: outcome } as ControlPlaneResponse;
      }
      if (request.action === 'daemon.restart') {
        const target = await resolveTarget(request.serverId);
        const force = (request.payload as { force?: boolean } | undefined)?.force === true;
        const outcome = await serviceFor(target).restart({ force });
        const answering = outcome.status.state === 'daemonAnswering';
        return { ok: answering, requestId: request.requestId, code: answering ? undefined : 'DAEMON_RESTART_FAILED', message: answering ? undefined : outcome.status.reason, data: outcome } as ControlPlaneResponse;
      }
      if (request.action === 'server.list') {
        const [wsl, containers] = await Promise.all([
          targetDiscovery.discoverWslDistributions().catch(error => ({ unavailable: error instanceof Error ? error.message : 'WSL discovery failed' })),
          targetDiscovery.discoverLocalDocker('ding-pbx-console').catch(error => ({ unavailable: error instanceof Error ? error.message : 'Docker discovery failed' })),
        ]);
        return { ok: true, requestId: request.requestId, data: { observedAt: new Date().toISOString(), bundledRuntime: runtimeForResponse(bundledAsteriskRuntime()), wsl, containers } };
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
        if (registered && registered.connectionKind !== 'wsl') {
          const reason = `The ${registered.connectionKind} transport is saved but is not yet wired to the connection probe.`;
          serverInventory().setState(registered.id, 'refused', reason);
          return { ok: false, requestId: request.requestId, code: 'CONNECTION_KIND_NOT_WIRED', message: reason };
        }
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
        const operatingSystem = os.status === 'succeeded'
          ? targetDiscovery.parseDebianOperatingSystem(os.stdout)
          : { state: 'unavailable' as const, reason: os.stderr || 'The WSL distribution refused the connection.', observedAt: new Date().toISOString() };
        const asteriskOutput = asterisk.stdout.trim();
        const asteriskAvailable = asterisk.status === 'succeeded' && /^Asterisk\s+\d+(?:\.\d+)+/imu.test(asteriskOutput);
        const asteriskReason = asterisk.stderr.trim() || asteriskOutput || 'Asterisk is not installed, is not running, or returned an invalid identity.';
        const asteriskObservation = asteriskAvailable
          ? { state: 'available' as const, value: asteriskOutput, observedAt: new Date().toISOString() }
          : { state: 'unavailable' as const, reason: asteriskReason, observedAt: new Date().toISOString() };
        const operatingSystemAvailable = operatingSystem.state === 'available';
        const connected = operatingSystemAvailable && asteriskAvailable;
        if (registered) {
          if (connected) {
            serverInventory().setState(registered.id, 'connected', undefined, {
              targetId: registered.id,
              operatingSystem: true,
              asterisk: true,
            });
          } else {
            const reason = [
              operatingSystemAvailable ? undefined : `Operating system: ${operatingSystem.reason ?? 'unavailable'}`,
              asteriskAvailable ? undefined : `Asterisk: ${asteriskReason}`,
            ].filter(Boolean).join(' ');
            serverInventory().setState(registered.id, os.status === 'succeeded' ? 'unreachable' : 'refused', reason);
          }
        }
        const data = {
          target: { connectionKind: 'wsl', distribution },
          operatingSystem,
          asterisk: asteriskObservation,
        };
        if (!connected) {
          const message = [
            operatingSystemAvailable ? undefined : `Operating system: ${operatingSystem.reason ?? 'unavailable'}`,
            asteriskAvailable ? undefined : `Asterisk: ${asteriskReason}`,
          ].filter(Boolean).join(' ');
          return { ok: false, requestId: request.requestId, code: 'TARGET_NOT_READY', message };
        }
        return { ok: true, requestId: request.requestId, data };
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
        if (!(CONFIGURABLE_RESOURCES as ReadonlyArray<string>).includes(resource)) {
          return { ok: false, requestId: request.requestId, code: 'RESOURCE_NOT_CONFIGURABLE', message: `"${resource}" is not a configurable resource.` };
        }
        const target = await resolveTarget(request.serverId);
        const transport = configTransport(target);
        const reading = await transport.readState(resource);
        return { ok: true, requestId: request.requestId, data: { resource, ...reading, observedAt: new Date().toISOString() } };
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
        const transport = configTransport(target);
        const plan = await new StructuredConfigPlanner().createPlan(
          `plan-${request.requestId}`,
          target.id,
          documents as ReadonlyArray<{ resource: string; value: unknown }>,
          transport,
        );
        const publicPlan: ChangePlan = {
          ...plan,
          diffs: plan.diffs.map((diff) => ({
            ...diff,
            before: transport.projectForRead(diff.resource, diff.before),
            after: transport.projectForRead(diff.resource, diff.after),
          })),
        };

        if (request.action === 'pbx.plan') {
          return { ok: true, requestId: request.requestId, data: { plan: publicPlan } };
        }
        if (plan.diffs.length === 0) {
          return { ok: true, requestId: request.requestId, data: { plan: publicPlan, result: { status: 'applied', message: 'Nothing to change; the target already matches.' } } };
        }

        const result = await new ConfigTransaction(
          transport,
          () => new Date(),
          async (runtimePlan) => await reloadAndVerifyRuntime(target, runtimePlan),
        ).apply(plan);
        return {
          ok: result.status === 'applied',
          requestId: request.requestId,
          code: result.status === 'applied' ? undefined : 'CONFIG_APPLY_FAILED',
          message: result.status === 'applied' ? undefined : result.message,
          data: { plan: publicPlan, result },
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
      if (request.action === 'authenticator.list') {
        await authLocks.awaitReconciliation();
        return { ok: true, requestId: request.requestId, data: await authLocks.authenticator.list() };
      }
      if (request.action === 'authenticator.reconciliation') return { ok: true, requestId: request.requestId, data: (await authLocks.awaitReconciliation()).authenticator };
      if (request.action === 'authenticator.register') {
        const reconciliation = (await authLocks.awaitReconciliation()).authenticator; if (reconciliation.status !== 'reconciled') return { ok: true, requestId: request.requestId, data: { ok: false, code: 'reconciliation-blocked', message: `${reconciliation.warning} Affected entries: ${reconciliation.affectedIds.join(', ') || 'unresolved state'}.`, reconciliation } };
        const input = request.payload as never;
        return { ok: true, requestId: request.requestId, data: await authLocks.authenticator.register(input) };
      }
      if (request.action === 'authenticator.confirm') {
        const reconciliation = (await authLocks.awaitReconciliation()).authenticator; if (reconciliation.status !== 'reconciled') return { ok: true, requestId: request.requestId, data: { ok: false, code: 'reconciliation-blocked', message: `${reconciliation.warning} Affected entries: ${reconciliation.affectedIds.join(', ') || 'unresolved state'}.`, reconciliation } };
        const id = typeof request.payload?.id === 'string' ? request.payload.id : '';
        const code = typeof request.payload?.code === 'string' ? request.payload.code : '';
        return { ok: true, requestId: request.requestId, data: await authLocks.authenticator.confirmAndArm(id, code, Date.now(), 1) };
      }
      if (request.action === 'authenticator.remove') {
        const reconciliation = (await authLocks.awaitReconciliation()).authenticator; if (reconciliation.status !== 'reconciled') return { ok: true, requestId: request.requestId, data: { status: 'pending', message: `${reconciliation.warning} Affected entries: ${reconciliation.affectedIds.join(', ') || 'unresolved state'}.`, recoverable: true } };
        const id = typeof request.payload?.id === 'string' ? request.payload.id : '';
        return { ok: true, requestId: request.requestId, data: await authLocks.authenticator.remove(id) };
      }
      if (request.action === 'authenticator.snapshot') {
        const id = typeof request.payload?.id === 'string' ? request.payload.id : '';
        return { ok: true, requestId: request.requestId, data: await authLocks.codeSnapshot(id) };
      }
      if (request.action === 'authenticator.restore') {
        const reconciliation = (await authLocks.awaitReconciliation()).authenticator; if (reconciliation.status !== 'reconciled') return { ok: true, requestId: request.requestId, data: { status: 'unavailable', message: `${reconciliation.warning} Affected entries: ${reconciliation.affectedIds.join(', ') || 'unresolved state'}.`, reconciliation } satisfies HistoryRestoreReceipt };
        const commitId = typeof request.payload?.commitId === 'string' ? request.payload.commitId : '';
        const restored = await authLocks.history.restore(commitId);
        if (!restored.ok) return { ok: true, requestId: request.requestId, data: { status: 'unavailable', message: restored.message } satisfies HistoryRestoreReceipt };
        if (!restored.value.snapshot || typeof restored.value.snapshot !== 'object') return { ok: true, requestId: request.requestId, data: { status: 'malformed', message: 'The selected history snapshot is malformed.' } satisfies HistoryRestoreReceipt };
        if ((restored.value.snapshot as { kind?: string }).kind === 'authenticator-entry-deleted') return { ok: true, requestId: request.requestId, data: { status: 'non-restorable', message: 'This deletion is explicitly non-restorable because its vault credential was removed.' } satisfies HistoryRestoreReceipt };
        const applied = await authLocks.authenticator.restoreRedacted(restored.value.snapshot);
        if (!applied.ok) return { ok: true, requestId: request.requestId, data: { status: 'unavailable', message: applied.message } satisfies HistoryRestoreReceipt };
        await authLocks.history.record({ action: 'restored', stableRecordId: applied.value.id, subject: `Authenticator ${applied.value.issuer} restored`, snapshot: { kind: 'authenticator-entry', entry: applied.value } });
        return { ok: true, requestId: request.requestId, data: { status: 'applied', entry: applied.value } satisfies HistoryRestoreReceipt };
      }
      if (request.action === 'toy-lock.initialize') {
        return { ok: true, requestId: request.requestId, data: await authLocks.locksReady };
      }
      if (request.action === 'toy-lock.list') {
        await authLocks.locksReady;
        return { ok: true, requestId: request.requestId, data: authLocks.locks.list() };
      }
      if (request.action === 'toy-lock.recovery') {
        return { ok: true, requestId: request.requestId, data: authLocks.locks.recovery };
      }
      if (request.action === 'toy-lock.reconciliation') return { ok: true, requestId: request.requestId, data: (await authLocks.awaitReconciliation()).locks };
      if (request.action === 'toy-lock-credential.create') {
        const reconciliation = (await authLocks.awaitReconciliation()).locks;
        if (reconciliation.status !== 'reconciled') return { ok: true, requestId: request.requestId, data: { ok: false, message: reconciliation.warning } };
        const targetId = typeof request.payload?.targetId === 'string' ? request.payload.targetId.trim() : '';
        const method = request.payload?.method === 'totp' ? 'totp' : request.payload?.method === 'password' ? 'password' : undefined;
        const value = typeof request.payload?.value === 'string' ? request.payload.value : '';
        if (!targetId || !method || !value) return { ok: false, requestId: request.requestId, code: 'TOY_LOCK_CREDENTIAL_INVALID', message: 'A target, credential method, and credential value are required.' };
        if (value.length > 512 || (method === 'password' && value.length < 8)) return { ok: false, requestId: request.requestId, code: 'TOY_LOCK_CREDENTIAL_INVALID', message: method === 'password' ? 'A toy-lock password must contain at least 8 characters.' : 'The TOTP secret is outside its bound.' };
        if (method === 'totp') {
          const normalized = value.replace(/\s+/gu, '').replace(/=+$/u, '').toUpperCase();
          if (!/^[A-Z2-7]+$/u.test(normalized) || [1, 3, 6].includes(normalized.length % 8)) return { ok: false, requestId: request.requestId, code: 'TOY_LOCK_CREDENTIAL_INVALID', message: 'The TOTP secret is not a bounded base32 value.' };
        }
        const vaultAccount = `toy-lock/${targetId}/${randomUUID()}`;
        const saved = await authLocks.vault.setSecret(vaultAccount, value, method === 'password' ? 'password-hash' : 'totp');
        if (!saved.ok) return { ok: false, requestId: request.requestId, code: saved.code, message: saved.message };
        return { ok: true, requestId: request.requestId, data: { vaultAccount, method } };
      }
      if (request.action === 'toy-lock.create') {
        const reconciliation = (await authLocks.awaitReconciliation()).locks; if (reconciliation.status !== 'reconciled') return { ok: true, requestId: request.requestId, data: { ok: false, code: 'persistence-unavailable', message: `${reconciliation.warning} Affected locks: ${reconciliation.affectedIds.join(', ') || 'unresolved state'}.`, recoverable: true, reconciliation } satisfies Exclude<ToyLockCreateReceipt, { ok: true }> };
        await authLocks.locksReady;
        const payload = request.payload as Omit<import('../shared/locks.js').CreateToyLockInput, 'at'>;
        const result = await authLocks.locks.create(payload);
        if (!result.ok) {
          const credential = (request.payload as { credential?: ToyLockCredentialReference } | undefined)?.credential;
          if (credential) await authLocks.vault.remove(credential).catch(() => false);
        }
        if (!result.ok) return { ok: true, requestId: request.requestId, data: mapToyLockMutationFailure(result) };
        return { ok: true, requestId: request.requestId, data: result };
      }
      if (request.action === 'toy-lock.unlock') {
        const reconciliation = (await authLocks.awaitReconciliation()).locks; if (reconciliation.status !== 'reconciled') return { ok: true, requestId: request.requestId, data: { ok: false, code: 'persistence-unavailable', message: `${reconciliation.warning} Affected locks: ${reconciliation.affectedIds.join(', ') || 'unresolved state'}.`, waitCreated: false, reconciliation } };
        await authLocks.locksReady;
        const id = typeof request.payload?.id === 'string' ? request.payload.id : '';
        const encoded = typeof request.payload?.candidateBase64 === 'string' ? request.payload.candidateBase64 : '';
        if (encoded.length > 2_048 || !/^[A-Za-z0-9+/]*={0,2}$/u.test(encoded)) return { ok: false, requestId: request.requestId, code: 'TOY_LOCK_CANDIDATE_INVALID', message: 'The unlock value is outside its encoded safety bound.' };
        const candidate = Uint8Array.from(Buffer.from(encoded, 'base64'));
        if (candidate.length > 512) return { ok: false, requestId: request.requestId, code: 'TOY_LOCK_CANDIDATE_INVALID', message: 'The unlock value is outside its decoded safety bound.' };
        const surfaceId = typeof request.payload?.surfaceId === 'string' ? request.payload.surfaceId : undefined;
        const result = await authLocks.locks.unlock(id, candidate, surfaceId);
        if (!result.ok && result.code === 'verification-failed') { await authLocks.createLadderWait(id); return { ok: true, requestId: request.requestId, data: { ...result, waitCreated: true } }; }
        if (!result.ok) return { ok: true, requestId: request.requestId, data: mapToyLockFailure(result) };
        return { ok: true, requestId: request.requestId, data: result };
      }
      if (request.action === 'toy-lock.relock') {
        const reconciliation = (await authLocks.awaitReconciliation()).locks; if (reconciliation.status !== 'reconciled') return { ok: true, requestId: request.requestId, data: { ok: false, code: 'persistence-unavailable', message: `${reconciliation.warning} Affected locks: ${reconciliation.affectedIds.join(', ') || 'unresolved state'}.`, recoverable: true, reconciliation } satisfies Exclude<ToyLockRelockReceipt, { ok: true }> };
        await authLocks.locksReady;
        const id = typeof request.payload?.id === 'string' ? request.payload.id : '';
        const result = await authLocks.locks.relock(id);
        return { ok: true, requestId: request.requestId, data: result.ok ? result : mapToyLockMutationFailure(result) };
      }
      if (request.action === 'toy-lock.remove') {
        const reconciliation = (await authLocks.awaitReconciliation()).locks;
        if (reconciliation.status !== 'reconciled') return { ok: true, requestId: request.requestId, data: blockedToyLockRemovalByReconciliation(reconciliation) };
        await authLocks.locksReady;
        const id = typeof request.payload?.id === 'string' ? request.payload.id : '';
        return { ok: true, requestId: request.requestId, data: await authLocks.locks.remove(id) };
      }
      if (request.action === 'support-ticket.list') {
        return { ok: true, requestId: request.requestId, data: await authLocks.tickets.list() };
      }
      if (request.action === 'support-ticket.create') {
        const payload = request.payload as { category?: string; description?: string; severity?: string } | undefined;
        return { ok: true, requestId: request.requestId, data: await authLocks.tickets.create({ category: payload?.category ?? '', description: payload?.description ?? '', severity: payload?.severity ?? '' }) };
      }
      if (request.action === 'support-ticket.advance') {
        const id = typeof request.payload?.id === 'string' ? request.payload.id : '';
        return { ok: true, requestId: request.requestId, data: await authLocks.tickets.advance(id) };
      }
      if (request.action === 'unlock-ladder.issue') {
        const payload = request.payload as { lockoutId?: string; budgetScopeId?: string; schoolMode?: boolean } | undefined;
        return { ok: true, requestId: request.requestId, data: await authLocks.issueLadder({ lockoutId: payload?.lockoutId ?? '', budgetScopeId: payload?.budgetScopeId ?? '', schoolMode: settingsRegistry().get('schoolMode.enabled') === 'true' }) };
      }
      if (request.action === 'unlock-ladder.hit') {
        const nonce = typeof request.payload?.nonce === 'string' ? request.payload.nonce : '';
        const spawnId = typeof request.payload?.spawnId === 'number' ? request.payload.spawnId : -1;
        const cell = typeof request.payload?.cell === 'number' ? request.payload.cell : -1;
        return { ok: true, requestId: request.requestId, data: await authLocks.hitLadder(nonce, spawnId, cell) };
      }
      if (request.action === 'unlock-ladder.grade') {
        const nonce = typeof request.payload?.nonce === 'string' ? request.payload.nonce : '';
        return { ok: true, requestId: request.requestId, data: await authLocks.gradeLadder(nonce, request.payload?.answer as never) };
      }
      if (request.action.startsWith('local-history.')) {
        const history = authLocks.history;
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
