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
  parseTranslations, parseAclRules, parseManagerSettings, parseManagerUsers, parseAriApps, parseAriUsers,
  parseBridges, parseApplications,
  parseCdrStatus, parseLoggerChannels, parseSysinfo, parseUptime, parseMediaCacheItems,
} from './asterisk-parsers.js';
import { DIALPLAN_FILE_RESOURCE, compareDialplanToFile, parseExtensionsConfSections } from './dialplan-divergence.js';
import { WslConfigTransport, CONFIGURABLE_RESOURCES, StructuredConfigPlanner, ConfigTransaction, ConfigHistory, MediaLibrary, LocalHistory, agiReferences } from './index.js';
import { AgiLibrary, DEFAULT_AGI_DIRECTORY } from './agi-library.js';
import { ServerInventory, SettingsRegistry } from './index.js';
import type { ServerInventoryStore, SettingsSnapshotStore } from './index.js';
import { atomicWriteFileSync } from './atomic-file.js';
import { SettingsSourceFetcher } from './settings-source-fetcher.js';
import { parseAllowlist, SETTINGS_SOURCE_ALLOWLIST_KEY } from './settings-source-allowlist.js';
import type { ServerInventorySnapshot } from './server-inventory.js';
import type { RawConfigReader } from './wsl-config-transport.js';
import { ConverterRegistry } from './converter-registry.js';
import { executePdfOperationAtomic, pdfCapabilities, planPdfOperation, validatePdfOperationRequest, type PdfOperationExecutor, type PdfOutputInspector } from './converter-pdf.js';
import { ConverterStore } from './converter-store.js';
import { ConverterRunner } from './converter-runner.js';
import { ConverterQueue } from './converter-queue.js';
import { sniffFileType } from './converter-sniff.js';
import { OllamaClient } from './ollama-client.js';
import { createOllamaRuntimeHandlers } from './ollama-client.js';
import { OllamaStore } from './ollama-store.js';
import { OllamaPullQueue, createOllamaPullHandlers } from './ollama-pulls.js';
import { OllamaChat, createOllamaChatHandlers } from './ollama-chat.js';
import { OllamaCatalog, createOllamaCatalogHandlers, type OllamaCatalogPageSource } from './ollama-catalog.js';
import { createOllamaFitHandlers } from './ollama-fit.js';
import { OllamaHarnessManager, createOllamaHarnessHandlers, type OllamaHarnessOptions } from './ollama-harness.js';
import { createLogoConversionHandlers } from './logo-converter.js';
import { LogoStore, logoStoreHandlers } from './logo-store.js';
import { PngIsolatedLogoDecoder } from './logo-decoder.js';
import { PdfLibExecutor, PdfLibInspector } from './pdf-adapter.js';
import type { LogoSourceInput } from '../shared/logo.js';
import { VocabularyStore } from './vocabulary-store.js';
import { DownloadTransferManager } from './download-transfer-manager.js';
import { createStatusHubClient, createVaultReference, type StatusHubClient } from './status-hub-client.js';
import type { StatusHubCredentialReferences, StatusHubProjectRegistrationRequest } from '../shared/status-hub.js';
import type { ConverterRequest, ConverterSniffResult, PdfOperationRequest } from '../shared/converter.js';
import { FORGE_CONPTY_HELPER_SHA256, FORGE_GH_SHA256, FileForgeStateStore, ForgePublisher } from './forge-publishing.js';
import { AsteriskReadings, DialplanReadings, LocalAsteriskCliGateway, NodeProcessExecutor, READ_ONLY_COMMANDS, TargetDiscovery, isAllowedCommandLine } from './index.js';
import type { ChangePlan, ReadOnlyCommand, ReadOnlyCommandLine, TargetProfile, ConfigValue } from './index.js';
import { isAllowlistedWriteCommand } from './write-commands.js';
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

const CONTROL_PLANE_ACTIONS = new Set<string>([
  'server.list', 'server.connect', 'pbx.snapshot', 'pbx.apply', 'pbx.plan', 'pbx.read', 'pbx.command', 'pbx.config',
  'server.inventory.list', 'server.inventory.add', 'server.inventory.update', 'server.inventory.remove', 'server.inventory.set-active',
  'runtime.status', 'runtime.provision', 'runtime.stop', 'runtime.remove',
  'daemon.status', 'daemon.start', 'daemon.stop', 'daemon.restart',
  'history.list', 'history.restore', 'media.list', 'media.upload', 'media.remove',
  'local-history.list', 'local-history.record', 'local-history.restore',
  'settings.snapshot', 'settings.write', 'settings.remove', 'settings.source.fetch',
  'logo.inspect', 'logo.convert', 'logo.cache.read', 'logo.cache.write', 'logo.cache.clear',
  'vocabulary.status', 'vocabulary.replace', 'vocabulary.clear',
  'converter.catalog', 'converter.pdf-capabilities', 'converter.pdf-validate', 'converter.pdf-execute', 'converter.sniff',
  'converter.queue.create', 'converter.queue.enqueue-one', 'converter.queue.page',
  'converter.queue.start', 'converter.queue.pause', 'converter.queue.resume', 'converter.queue.cancel',
  'ollama.snapshot',
  'ollama.health', 'ollama.version', 'ollama.models.installed', 'ollama.models.running', 'ollama.model.show', 'ollama.model.delete', 'ollama.model.copy',
  'ollama.catalog.get', 'ollama.catalog.refresh', 'ollama.catalog.reconcile', 'ollama.fit.evaluate',
  'ollama.pulls.list', 'ollama.pulls.enqueue', 'ollama.pulls.cancel', 'ollama.pulls.retry', 'ollama.pulls.reconcile',
  'ollama.chat.sessions', 'ollama.chat.create', 'ollama.chat.rename', 'ollama.chat.delete', 'ollama.chat.send', 'ollama.chat.retry', 'ollama.chat.regenerate', 'ollama.chat.stop',
  'ollama.harness.profiles', 'ollama.harness.register', 'ollama.harness.preflight', 'ollama.harness.launch', 'ollama.harness.restore',
  'status-hub.register', 'status-hub.project', 'status-hub.sessions', 'status-hub.session', 'status-hub.replies', 'status-hub.answer',
  'dim-sum.cache.read',
]);

/** The endpoint view combines the list with bounded per-endpoint configuration evidence. */
export async function readEndpointsView(readings: AsteriskReadings, target: TargetProfile) {
  const [endpoints, contacts, registrations, channelStats] = await Promise.all([
    readings.endpoints(target), readings.contacts(target), readings.registrations(target), readings.channelStats(target),
  ]);
  const endpointIds = endpoints.result.state === 'available' ? (endpoints.result.value ?? []).map((endpoint) => endpoint.id) : [];
  const endpointDetails = await readings.endpointDetails(target, endpointIds);
  return { endpoints, contacts, registrations, channelStats, endpointDetails };
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

function decodeLocalBytes(value: unknown, label: string, maximumBytes: number): Uint8Array {
  if (typeof value !== 'string' || value.length === 0 || value.length > Math.ceil(maximumBytes / 3) * 4 + 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(value)) {
    throw new Error(`${label} must be canonical bounded Base64 text.`);
  }
  const bytes = new Uint8Array(Buffer.from(value, 'base64'));
  if (bytes.byteLength === 0 || bytes.byteLength > maximumBytes || Buffer.from(bytes).toString('base64') !== value) {
    throw new Error(`${label} is empty, oversized, or not canonical Base64.`);
  }
  return bytes;
}

function localLogoSource(payload: Record<string, unknown>): LogoSourceInput {
  const metadataValue = payload.metadata;
  const metadata = metadataValue !== null && typeof metadataValue === 'object' && !Array.isArray(metadataValue)
    ? metadataValue as Record<string, unknown>
    : undefined;
  return {
    kind: 'local',
    bytes: decodeLocalBytes(payload.bytesBase64, 'Logo source bytes', 8 * 1024 * 1024),
    metadata: metadata ? {
      filename: typeof metadata.filename === 'string' ? metadata.filename.slice(0, 256) : undefined,
      declaredMime: typeof metadata.declaredMime === 'string' ? metadata.declaredMime.slice(0, 128) : undefined,
      declaredExtension: typeof metadata.declaredExtension === 'string' ? metadata.declaredExtension.slice(0, 32) : undefined,
    } : undefined,
  };
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
  statusHubBaseUrl?: string;
  statusHubCredentials?: StatusHubCredentialReferences;
  allowedSettingsSourceHosts?: readonly string[];
  readSettingsSourceToken?: (credentialKey: string) => Promise<string | undefined>;
  /** Optional verified official catalogue transport. The default is explicitly unavailable,
   * because Ollama's loopback API does not expose an exhaustive online catalogue. */
  ollamaCatalogSource?: OllamaCatalogPageSource;
  /** Optional allowlisted harness configuration. Without it, harness actions stay registered
   * in the request schema but return the normal unavailable-action response. */
  ollamaHarness?: Omit<OllamaHarnessOptions, 'client' | 'store'>;
  /** An independently packaged PDF writer and inspector. Neither is inferred from PATH. */
  pdfExecutor?: PdfOperationExecutor;
  pdfInspector?: PdfOutputInspector;
}

export function createControlPlaneDispatcher(options: ControlPlaneDispatcherOptions) {
  const { userDataPath, resourcesPath, hosted } = options;
  const converterRegistry = ConverterRegistry.create();
  const ollamaClient = new OllamaClient();
  const ollamaStore = new OllamaStore(join(userDataPath, 'ollama-state.json'));
  const ollamaPullQueue = new OllamaPullQueue({ client: ollamaClient, store: ollamaStore });
  const ollamaChat = new OllamaChat({ client: ollamaClient });
  const ollamaCatalog = new OllamaCatalog({
    client: ollamaClient,
    store: ollamaStore,
    source: options.ollamaCatalogSource ?? {
      readPage: async () => {
        throw new Error('No verified official Ollama catalogue transport is configured for this build.');
      },
    },
  });
  const ollamaHarness = options.ollamaHarness
    ? new OllamaHarnessManager({ client: ollamaClient, store: ollamaStore, ...options.ollamaHarness })
    : undefined;
  const logoStore = new LogoStore({ rootPath: join(userDataPath, 'logo-cache') });
  // The decoder is deliberately absent until a packaged isolated image process is
  // supplied. Inspection and cache validation remain available, while conversion
  // returns a typed decoder-unavailable result instead of pretending to convert.
  const logoHandlers = createLogoConversionHandlers(new PngIsolatedLogoDecoder(), logoStoreHandlers(logoStore));
  const vocabularyStore = new VocabularyStore({ rootPath: join(userDataPath, 'vocabulary-cache') });
  const ollamaHandlers = {
    ...createOllamaRuntimeHandlers(ollamaClient),
    ...createOllamaPullHandlers(ollamaPullQueue),
    ...createOllamaChatHandlers(ollamaChat),
    ...createOllamaCatalogHandlers(ollamaCatalog),
    ...createOllamaFitHandlers(),
    ...(ollamaHarness ? createOllamaHarnessHandlers(ollamaHarness) : {}),
  };
  const ollamaReady = ollamaPullQueue.initialize();
  const downloadTransfers = new DownloadTransferManager(userDataPath);
  const statusHubClient: StatusHubClient | undefined = options.statusHubBaseUrl
    ? createStatusHubClient({ baseUrl: options.statusHubBaseUrl, credentials: options.statusHubCredentials })
    : undefined;
  const converterQueue = converterRegistry.then(async (registry) => {
    const store = new ConverterStore({ rootPath: join(userDataPath, 'converter-queues') });
    await store.initialize();
    const queue = new ConverterQueue({ store, registry, runner: new ConverterRunner({ registry }) });
    await queue.initialize();
    return queue;
  });
  const processExecutor = new NodeProcessExecutor({ allowedExecutables: ['wsl.exe', 'docker', 'git', 'gh', 'powershell.exe'] });
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

  async function readDialplanDivergence(target: TargetProfile, dialplan: Awaited<ReturnType<DialplanReadings['graph']>>) {
    const transport = configTransport(target);
    const text = await transport.readText(DIALPLAN_FILE_RESOURCE);
    return {
      state: 'available' as const,
      observedAt: new Date().toISOString(),
      value: compareDialplanToFile(dialplan.contexts ?? [], parseExtensionsConfSections(text), dialplan.contextsReported),
    };
  }

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
    if (view === 'endpoints') return await readEndpointsView(readings, target);
    if (view === 'trunks') return { registrations: await readings.registrations(target) };
    if (view === 'trunkauth') {
      const [auths, registrations] = await Promise.all([
        readings.auths(target), readings.registrations(target),
      ]);
      return { auths, registrations };
    }
    if (view === 'queues') return { queues: await readings.queues(target) };
    if (view === 'canvas') {
      const dialplan = await dialplanReadings.graph(target);
      return { dialplan, dialplanFile: await readDialplanDivergence(target, dialplan) };
    }
    if (view === 'modules') return { modules: await readings.modules(target) };
    if (view === 'restbrowser') {
      const read = async <T>(command: ReadOnlyCommand, parse: (text: string) => T) => {
        const reading = await readings.raw(target, command);
        return reading.result.state === 'available'
          ? { command, result: { ...reading.result, value: parse(String(reading.result.value ?? '')) } }
          : { command, result: reading.result };
      };
      const [channels, bridges, applications, ariApps, ariUsers] = await Promise.all([
        readings.channels(target),
        read('bridge show all', parseBridges),
        read('core show applications', parseApplications),
        read('ari show apps', parseAriApps),
        read('ari show users', parseAriUsers),
      ]);
      return { channels, bridges, applications, ariApps, ariUsers };
    }
    if (view === 'agiscripts') {
      const transport = configTransport(target);
      const [dialplan, asteriskConf] = await Promise.all([
        dialplanReadings.graph(target),
        transport.read('/etc/asterisk/asterisk.conf').catch((): ConfigValue => []),
      ]);
      const directories = asteriskConf.find((section) => section.name === 'directories');
      const astagidir = directories?.entries.find((entry) => entry.key === 'astagidir')?.value?.trim() || DEFAULT_AGI_DIRECTORY;
      const files = await new AgiLibrary({ executor: processExecutor, distribution: target.wslDistribution! }).list(astagidir);
      const references = dialplan.result.state === 'available' && dialplan.result.value
        ? agiReferences(dialplan.result.value)
        : [];
      return { dialplan, astagidir, files, references };
    }

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
    const readHere = read;

    if (view === 'voicemail') {
      const [users, zones] = await Promise.all([
        read('voicemail show users', parseVoicemailUsers),
        read('voicemail show zones', parseVoicemailZones),
      ]);
      return { voicemailUsers: users, voicemailZones: zones };
    }
    if (view === 'confbridge') return { rooms: await read('confbridge list', parseConfbridgeList) };
    if (view === 'moh') {
      const [mohClasses, mediaCache] = await Promise.all([
        read('moh show classes', parseMohClasses),
        readHere('media cache show all', parseMediaCacheItems),
      ]);
      return { mohClasses, mediaCache };
    }
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
      // The rootfs generator (scripts/asterisk-runtime-provenance.mjs) writes schemaVersion 2;
      // pinning 1 here made every correctly built payload report "unavailable" and sent the
      // deploy wizard to the base-image fallback that the package does not carry.
      const valid = (record.schemaVersion === 1 || record.schemaVersion === 2)
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

  function statusHubUnavailable(requestId: string): ControlPlaneResponse {
    return { ok: false, requestId, code: 'STATUS_HUB_UNAVAILABLE', message: 'The Status Hub is not configured for this installation.' };
  }

  function statusHubResult<T>(requestId: string, result: { ok: true; value: T } | { ok: false; error: { code: string; message: string } }): ControlPlaneResponse {
    return result.ok
      ? { ok: true, requestId, data: result.value }
      : { ok: false, requestId, code: result.error.code, message: result.error.message };
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
          return { schemaVersion: 1 as const, servers: parsed.servers, activeServerId: parsed.activeServerId };
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

  function createSettingsSourceFetcher(): SettingsSourceFetcher {
    const allowedHosts = options.allowedSettingsSourceHosts
      ?? parseAllowlist(settingsRegistry().get(SETTINGS_SOURCE_ALLOWLIST_KEY));
    return new SettingsSourceFetcher({ allowedHosts, readToken: options.readSettingsSourceToken });
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
    // Same rule as server.connect: any `Asterisk <identity>` answer is the daemon speaking.
    if (!/^Asterisk\s+\S+/imu.test(identity)) {
      throw new Error('The selected daemon did not return a valid identity after reload.');
    }
  }

  let cachedForgePublisher: ForgePublisher | undefined;
  let forgeHistoryReady: Promise<import('./local-history.js').LocalHistory> | undefined;
  async function forgePublisher(): Promise<ForgePublisher> {
    if (cachedForgePublisher) return cachedForgePublisher;
    if (!forgeHistoryReady) {
      forgeHistoryReady = (async () => {
        const history = new LocalHistory({ executor: processExecutor, repositoryPath: join(userDataPath, 'history') });
        await history.initialize();
        return history;
      })();
    }
    const history = await forgeHistoryReady;
    cachedForgePublisher = new ForgePublisher({
      executor: processExecutor,
      store: new FileForgeStateStore(join(userDataPath, 'forge-publishing.json')),
      history,
      conptyHelperPath: join(resourcesPath, 'forge', 'forge-device-signin.ps1'),
      conptyStatePath: join(userDataPath, 'forge-device-state.json'),
      bundledGhPath: join(resourcesPath, 'forge', 'gh.exe'),
      bundledGhSha256: FORGE_GH_SHA256,
      conptyHelperSha256: FORGE_CONPTY_HELPER_SHA256,
    });
    return cachedForgePublisher;
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

      if (request.action === 'converter.catalog' || request.action === 'converter.pdf-capabilities' || request.action === 'converter.pdf-validate' || request.action === 'converter.pdf-execute') {
        const registry = await converterRegistry;
        if (request.action === 'converter.catalog') {
          return {
            ok: true,
            requestId: request.requestId,
            data: { categories: registry.categories(), formats: registry.formats(), adapters: registry.adapters() },
          };
        }
        if (request.action === 'converter.pdf-capabilities') return { ok: true, requestId: request.requestId, data: pdfCapabilities(registry) };
        const payload = request.payload && typeof request.payload === 'object' && !Array.isArray(request.payload)
          ? request.payload as Record<string, unknown>
          : {};
        const operation = payload.request;
        if (!operation || typeof operation !== 'object' || Array.isArray(operation)) {
          return { ok: false, requestId: request.requestId, code: 'PDF_REQUEST_REQUIRED', message: 'A PDF operation request is required.' };
        }
        try {
          validatePdfOperationRequest(operation as never);
          if (request.action === 'converter.pdf-execute') {
            const pdfAdapter = registry.adapter('pdf-toolkit');
            const packagedPdfAvailable = pdfAdapter?.availability.state === 'enabled';
            const pdfExecutor = options.pdfExecutor ?? (packagedPdfAvailable ? new PdfLibExecutor() : undefined);
            const pdfInspector = options.pdfInspector ?? (packagedPdfAvailable ? new PdfLibInspector() : undefined);
            if (!pdfExecutor || !pdfInspector) return { ok: false, requestId: request.requestId, code: 'PDF_EXECUTOR_UNAVAILABLE', message: 'No independently verified offline PDF writer and inspector are configured for this build.' };
            const acknowledgedDisclosureIds = Array.isArray(payload.acknowledgedDisclosureIds) ? payload.acknowledgedDisclosureIds.filter((value): value is string => typeof value === 'string') : [];
            const plan = planPdfOperation(registry, operation as never, acknowledgedDisclosureIds);
            const destinationPath = typeof payload.destinationPath === 'string' ? payload.destinationPath : '';
            const overwriteApproved = payload.overwriteApproved === true;
            const expectation = payload.expectation && typeof payload.expectation === 'object' && !Array.isArray(payload.expectation) ? payload.expectation : {};
            const pdfRequest = operation as PdfOperationRequest;
            if (pdfRequest.operation === 'inspect') {
              const inspected = await pdfInspector.inspect(pdfRequest.sourcePaths[0]!);
              return { ok: true, requestId: request.requestId, data: { plan, result: inspected } };
            }
            const result = await executePdfOperationAtomic(plan, destinationPath, overwriteApproved, pdfExecutor, pdfInspector, expectation as never);
            return { ok: true, requestId: request.requestId, data: { plan, result } };
          }
          return { ok: true, requestId: request.requestId, data: { valid: true, request: operation, capabilities: pdfCapabilities(registry) } };
        } catch (error) {
          return { ok: false, requestId: request.requestId, code: 'PDF_REQUEST_INVALID', message: error instanceof Error ? error.message : 'The PDF operation request is invalid.' };
        }
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
        const [health, version, installed, running, catalog] = await Promise.all([
          ollamaClient.health(), ollamaClient.version(), ollamaClient.installedModels(), ollamaClient.runningModels(),
          ollamaCatalog.get(),
        ]);
        return { ok: true, requestId: request.requestId, data: { observedAt, endpoint: ollamaClient.endpoint, health, version, installed, running, catalog } };
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
      if (request.action.startsWith('status-hub.')) {
        if (!statusHubClient) return statusHubUnavailable(request.requestId);
        if (request.action === 'status-hub.register') {
          const payload = (request.payload ?? {}) as Partial<StatusHubProjectRegistrationRequest>;
          return statusHubResult(request.requestId, await statusHubClient.registerProject(payload as StatusHubProjectRegistrationRequest));
        }
        if (request.action === 'status-hub.project') {
          const projectId = typeof request.payload?.projectId === 'string' ? request.payload.projectId : '';
          return statusHubResult(request.requestId, await statusHubClient.getProject(projectId));
        }
        if (request.action === 'status-hub.sessions') {
          const projectId = typeof request.payload?.projectId === 'string' ? request.payload.projectId : '';
          return statusHubResult(request.requestId, await statusHubClient.listSessions(projectId));
        }
        if (request.action === 'status-hub.session') {
          const sessionId = typeof request.payload?.sessionId === 'string' ? request.payload.sessionId : '';
          return statusHubResult(request.requestId, await statusHubClient.getSession(sessionId));
        }
        if (request.action === 'status-hub.replies') {
          const sessionId = typeof request.payload?.sessionId === 'string' ? request.payload.sessionId : '';
          const cursor = typeof request.payload?.cursor === 'string' ? request.payload.cursor : undefined;
          return statusHubResult(request.requestId, await statusHubClient.getReplies(sessionId, cursor));
        }
        if (request.action === 'status-hub.answer') {
          const sessionId = typeof request.payload?.sessionId === 'string' ? request.payload.sessionId : '';
          const questionId = typeof request.payload?.questionId === 'string' ? request.payload.questionId : '';
          const answer = typeof request.payload?.answer === 'string' ? request.payload.answer : '';
          return statusHubResult(request.requestId, await statusHubClient.deliverQuestion(sessionId, questionId, answer));
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
      if (request.action.startsWith('logo.')) {
        const payload = request.payload && typeof request.payload === 'object' && !Array.isArray(request.payload)
          ? request.payload as Record<string, unknown>
          : {};
        try {
          if (request.action === 'logo.inspect') {
            return { ok: true, requestId: request.requestId, data: logoHandlers.inspect(localLogoSource(payload)) };
          }
          if (request.action === 'logo.convert') {
            const sourceValue = payload.source && typeof payload.source === 'object' && !Array.isArray(payload.source)
              ? payload.source as Record<string, unknown>
              : payload;
            const targets = Array.isArray(payload.targets) ? payload.targets : [];
            return {
              ok: true,
              requestId: request.requestId,
              data: await logoHandlers.convert({ source: localLogoSource(sourceValue), crop: payload.crop as never, targets: targets as never }),
            };
          }
          if (request.action === 'logo.cache.read') return { ok: true, requestId: request.requestId, data: await logoStore.readForRenderer() };
          if (request.action === 'logo.cache.clear') {
            await logoHandlers.cache.clear({ kind: payload.kind === 'reset' ? 'reset' : 'clear' });
            return { ok: true, requestId: request.requestId, data: { cleared: true } };
          }
          if (request.action === 'logo.cache.write') {
            if (!payload.result || typeof payload.result !== 'object' || Array.isArray(payload.result)) {
              return { ok: false, requestId: request.requestId, code: 'LOGO_CACHE_INPUT_INVALID', message: 'A validated logo conversion result is required.' };
            }
            const selectedPresetId = typeof payload.selectedPresetId === 'string' ? payload.selectedPresetId : undefined;
            return { ok: true, requestId: request.requestId, data: await logoHandlers.cache.write({ kind: 'write', result: payload.result as never, selectedPresetId }) };
          }
        } catch (error) {
          return { ok: false, requestId: request.requestId, code: 'LOGO_OPERATION_FAILED', message: error instanceof Error ? error.message : 'The local logo operation failed.' };
        }
      }
      if (request.action.startsWith('vocabulary.')) {
        try {
          if (request.action === 'vocabulary.status') {
            return { ok: true, requestId: request.requestId, data: await vocabularyStore.status() };
          }
          if (request.action === 'vocabulary.clear') {
            return { ok: true, requestId: request.requestId, data: await vocabularyStore.clear() };
          }
          const rawText = typeof request.payload?.text === 'string' ? request.payload.text : undefined;
          if (rawText === undefined) return { ok: false, requestId: request.requestId, code: 'VOCABULARY_TEXT_REQUIRED', message: 'A local vocabulary JSON file is required.' };
          return { ok: true, requestId: request.requestId, data: await vocabularyStore.replace(rawText) };
        } catch (error) {
          return { ok: false, requestId: request.requestId, code: 'VOCABULARY_OPERATION_FAILED', message: error instanceof Error ? error.message : 'The local vocabulary operation failed.' };
        }
      }
      if (request.action === 'settings.source.fetch') {
        const url = typeof request.payload?.url === 'string' ? request.payload.url : '';
        if (!url) return { ok: false, requestId: request.requestId, code: 'SOURCE_URL_REQUIRED', message: 'A settings source URL is required.' };
        const credentialKey = typeof request.payload?.credentialKey === 'string' ? request.payload.credentialKey : undefined;
        const settingsSourceFetcher = createSettingsSourceFetcher();
        const result = await settingsSourceFetcher.fetchSource({ url, credentialKey });
        if (!result.ok && result.status === 0) return { ok: false, requestId: request.requestId, code: 'SOURCE_UNREACHABLE', message: result.reason ?? 'The settings source could not be reached.' };
        return { ok: true, requestId: request.requestId, data: result };
      }
      if (hosted && request.action.startsWith('forge.')) {
        return { ok: false, requestId: request.requestId, code: 'FORGE_UNSUPPORTED_HOSTED', message: `"${request.action}" is available only in the desktop application because it uses the local provider sign-in store and local git checkout.` };
      }
      if (request.action.startsWith('forge.')) {
        const forge = await forgePublisher();
        if (request.action === 'forge.capabilities') {
          return { ok: true, requestId: request.requestId, data: { providers: forge.capabilities(), state: forge.state() } };
        }
        if (request.action === 'forge.accounts.list') {
          const result = await forge.listAccounts();
          return { ok: result.status === 'succeeded' || result.status === 'pending', requestId: request.requestId, code: result.status === 'succeeded' || result.status === 'pending' ? undefined : `FORGE_${result.status.toUpperCase().replaceAll('-', '_')}`, message: result.message, data: { accounts: result.data ?? forge.state().accounts, activeAccountId: forge.state().activeAccountId, receipts: forge.state().receipts, operation: forge.state().operation, device: forge.state().device, corruption: forge.state().corruption, receipt: result.receipt, reauthAction: result.reauthAction } } as ControlPlaneResponse;
        }
        if (request.action === 'forge.account.add') {
          const result = await forge.addAccount((request.payload ?? {}) as import('./forge-publishing.js').ForgeAccountRequest);
          return { ok: result.status === 'succeeded', requestId: request.requestId, code: result.status === 'succeeded' ? undefined : `FORGE_${result.status.toUpperCase().replaceAll('-', '_')}`, message: result.status === 'succeeded' ? undefined : result.message, data: { account: result.data, reauthAction: result.reauthAction } } as ControlPlaneResponse;
        }
        if (request.action === 'forge.account.refresh') {
          const accountId = typeof request.payload?.accountId === 'string' ? request.payload.accountId : '';
          const result = await forge.refreshAccount(accountId);
          return { ok: result.status === 'succeeded', requestId: request.requestId, code: result.status === 'succeeded' ? undefined : `FORGE_${result.status.toUpperCase().replaceAll('-', '_')}`, message: result.status === 'succeeded' ? undefined : result.message, data: { account: result.data, reauthAction: result.reauthAction } } as ControlPlaneResponse;
        }
        if (request.action === 'forge.account.activate') {
          const accountId = typeof request.payload?.accountId === 'string' ? request.payload.accountId : '';
          const result = await forge.activateAccount(accountId);
          return { ok: result.status === 'succeeded', requestId: request.requestId, code: result.status === 'succeeded' ? undefined : `FORGE_${result.status.toUpperCase().replaceAll('-', '_')}`, message: result.status === 'succeeded' ? undefined : result.message, data: { account: result.data, activeAccountId: forge.state().activeAccountId, reauthAction: result.reauthAction } } as ControlPlaneResponse;
        }
        if (request.action === 'forge.account.sign-out') {
          const accountId = typeof request.payload?.accountId === 'string' ? request.payload.accountId : '';
          const result = await forge.signOut(accountId);
          return { ok: result.status === 'succeeded', requestId: request.requestId, code: result.status === 'succeeded' ? undefined : `FORGE_${result.status.toUpperCase().replaceAll('-', '_')}`, message: result.status === 'succeeded' ? undefined : result.message, data: { result: result.data } } as ControlPlaneResponse;
        }
        if (request.action === 'forge.owners.list') {
          const accountId = typeof request.payload?.accountId === 'string' ? request.payload.accountId : undefined;
          const result = await forge.listOwners(accountId);
          return { ok: result.status === 'succeeded' || result.status === 'partial', requestId: request.requestId, code: result.status === 'succeeded' || result.status === 'partial' ? undefined : `FORGE_${result.status.toUpperCase().replaceAll('-', '_')}`, message: result.message, data: { owners: result.data ?? [], reauthAction: result.reauthAction, operation: forge.state().operation } } as ControlPlaneResponse;
        }
        if (request.action === 'forge.publish') {
          const result = await forge.publish((request.payload ?? {}) as import('./forge-publishing.js').ForgePublishRequest);
          return { ok: result.status === 'succeeded', requestId: request.requestId, code: result.status === 'succeeded' ? undefined : `FORGE_${result.status.toUpperCase().replaceAll('-', '_')}`, message: result.status === 'succeeded' ? undefined : result.message, data: { receipt: result.receipt ?? result.data, operation: forge.state().operation, reauthAction: result.reauthAction } } as ControlPlaneResponse;
        }
        if (request.action === 'forge.receipts.list') {
          return { ok: true, requestId: request.requestId, data: { receipts: forge.state().receipts, operation: forge.state().operation, corruption: forge.state().corruption } };
        }
        if (request.action === 'forge.operation.status') {
          const requestedOperationId = typeof request.payload?.operationId === 'string' ? request.payload.operationId : undefined;
          if (requestedOperationId && requestedOperationId !== forge.state().operation.id) {
            return { ok: false, requestId: request.requestId, code: 'FORGE_STALE_OPERATION', message: 'The requested forge operation id is stale; the current operation was not returned.' } as ControlPlaneResponse;
          }
          return { ok: true, requestId: request.requestId, data: { operation: forge.state().operation, device: forge.state().device } };
        }
        if (request.action === 'forge.state.reset-corruption') {
          const result = forge.resetCorruption();
          return { ok: result.status === 'succeeded', requestId: request.requestId, code: result.status === 'succeeded' ? undefined : 'FORGE_CORRUPTION_RESET_FAILED', message: result.status === 'succeeded' ? undefined : result.message, data: { state: result.data } } as ControlPlaneResponse;
        }
        if (request.action === 'forge.operation.cancel') {
          const result = forge.cancel();
          return { ok: result.status === 'cancelled', requestId: request.requestId, code: result.status === 'cancelled' ? undefined : 'FORGE_CANCEL_FAILED', message: result.status === 'cancelled' ? undefined : result.message, data: { operation: result.data } } as ControlPlaneResponse;
        }
        if (request.action === 'forge.auth.sign-in') {
          const result = await forge.signIn((request.payload ?? {}) as import('./forge-publishing.js').ForgeSignInRequest);
          return { ok: result.status === 'succeeded' || result.status === 'pending', requestId: request.requestId, code: result.status === 'succeeded' || result.status === 'pending' ? undefined : `FORGE_${result.status.toUpperCase().replaceAll('-', '_')}`, message: result.message, data: { accounts: result.data ?? forge.state().accounts, activeAccountId: forge.state().activeAccountId, receipt: result.receipt, operation: forge.state().operation, device: forge.state().device, reauthAction: result.reauthAction } } as ControlPlaneResponse;
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
        // The CLI answering `core show version` is the proof that Asterisk is running. Its
        // identity is whatever it prints: a runtime built from a source checkout without a
        // .version file answers `Asterisk UNKNOWN__and_probably_unsupported`, and a
        // digits-only pattern refused that live daemon as "not ready" for a whole release line.
        const asteriskAvailable = asterisk.status === 'succeeded' && /^Asterisk\s+\S+/imu.test(asteriskOutput);
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
        const readOnly = isAllowedCommandLine(command);
        const write = !readOnly && isAllowlistedWriteCommand(command);
        if (!readOnly && !write) {
          return { ok: false, requestId: request.requestId, code: 'COMMAND_NOT_ALLOWLISTED', message: `"${command}" is not in the command allowlist, so it was not run.` };
        }
        const target = await resolveTarget(request.serverId);
        const result = readOnly
          ? await cliGateway.run(target, command as ReadOnlyCommandLine)
          : await cliGateway.runUnchecked(target, command);
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

        const result = await new ConfigTransaction(transport, () => new Date()).apply(plan);
        /* Writing the file is half of "applied". Asterisk keeps running the old dialplan and
         * endpoints until it reloads, and reloadAndVerifyRuntime existed for exactly that
         * while nothing called it: two real deploys on 2026-09-05 wrote pjsip.conf and
         * extensions.conf, reported Deployed, and changed nothing in the running PBX until a
         * hand-typed reload. A failed reload is reported as such, with the file already
         * written, rather than pretending either half did not happen. */
        if (result.status === 'applied') {
          try {
            await reloadAndVerifyRuntime(target, plan);
          } catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            return {
              ok: false,
              requestId: request.requestId,
              code: 'CONFIG_RELOAD_FAILED',
              message: `The file was written and backed up, but Asterisk did not reload or verify it: ${reason}`,
              data: { plan: publicPlan, result: { ...result, status: 'written-not-reloaded', message: reason } },
            } as ControlPlaneResponse;
          }
        }
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

  return { controlPlaneRequest, bundledAsteriskRuntime, serverInventory, downloadTransfers };
}

export type ControlPlaneDispatcher = ReturnType<typeof createControlPlaneDispatcher>;
