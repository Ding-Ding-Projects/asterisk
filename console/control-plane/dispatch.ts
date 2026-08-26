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
import type { ProvisionStep } from './wsl-provisioning.js';
import { SettingsSourceFetcher } from './settings-source-fetcher.js';
import { SETTINGS_SOURCE_ALLOWLIST_KEY, parseAllowlist } from './settings-source-allowlist.js';
import { AsteriskService } from './asterisk-service.js';
import {
  parseVoicemailUsers, parseVoicemailZones, parseConfbridgeList, parseMohClasses, parseCodecs,
  parseTranslations, parseAclRules, parseManagerSettings, parseManagerUsers, parseManagerConnections, parseAriApps,
  parseAriUsers, parseBridges, parseApplications,
  parseCdrStatus, parseLoggerChannels, parseSysinfo, parseUptime, parseMediaCacheItems,
} from './asterisk-parsers.js';
import { planDeployment, runDeployment, type DeployTarget } from './console-deploy.js';
import { WslConfigTransport, CONFIGURABLE_RESOURCES, StructuredConfigPlanner, ConfigTransaction, ConfigHistory, MediaLibrary, LocalHistory } from './index.js';
import { ServerInventory, SettingsRegistry, parseSettingsSnapshot } from './index.js';
import type { ServerInventoryStore, ServerRecord, SettingsSnapshotStore } from './index.js';
import { atomicWriteFileSync } from './atomic-file.js';
import {
  AsteriskReadings, DialplanReadings, LocalAsteriskCliGateway, NodeProcessExecutor, READ_ONLY_COMMANDS, TargetDiscovery,
  isAllowedCommandLine, isAllowlistedWriteCommand,
} from './index.js';
import {
  DIALPLAN_FILE_RESOURCE, compareDialplanToFile, parseExtensionsConfSections,
} from './dialplan-divergence.js';
import type { DialplanDivergence } from './dialplan-divergence.js';
import type { DialplanGraph, DialplanReading } from './dialplan-graph.js';
import type { Observation } from '../shared/control-plane.js';
import { AgiLibrary, DEFAULT_AGI_DIRECTORY, agiReferences } from './index.js';
import type { ReadOnlyCommand, ReadOnlyCommandLine, TargetProfile, ConfigValue } from './index.js';
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
  /** Hosts an external settings source may reach. Given explicitly, used exactly as
   *  given (an empty array here still refuses every source). Omitted, the fetcher falls
   *  back to whatever is persisted under `console.settingsSourceAllowlist` in this
   *  installation's own `settings.json` -- the list the settings-sources screen's
   *  allowlist controls write to. Either way an empty result refuses everything. */
  allowedSettingsSourceHosts?: readonly string[];
  /** Reads a settings-source token from the OS credential vault. */
  readSettingsSourceToken?: (credentialKey: string) => Promise<string | undefined>;
  /**
   * Called as each provisioning step finishes, so a caller can show progress while a
   * deploy runs rather than only when it ends. Optional: the hosted server passes
   * nothing and behaves exactly as before.
   */
  onProvisionStep?: (step: ProvisionStep) => void;
}

/**
 * Everything the `endpoints` screen reads, in one place a test can reach.
 *
 * Registrations are read here too (not only for `trunks`) so the endpoint reachability
 * graph can draw the outbound-registration edge for an endpoint that is also a trunk
 * identity, exactly as `pjsip show registrations` reports it.
 *
 * Transport and Codecs are read twice over, from two commands that answer two different
 * questions. `endpointDetails` reads each endpoint's own parameter table (`pjsip show
 * endpoint <id>`) for the transport and codecs it is *configured* with, which is the
 * reading that exists whether or not a call is up. `channelStats` reads the codec actually
 * negotiated on a live channel, which exists only while one is. The plural `pjsip show
 * endpoints` prints neither -- see `parseEndpointDetail`.
 *
 * The detail fan-out needs the endpoint list first, so it cannot join the parallel group;
 * everything that can still run alongside it does.
 *
 * Exported rather than inlined into `readView` below because this is a seam: a reading
 * taken here and dropped on the way out reaches the screen as an empty column with no
 * failing test anywhere, which is the defect this repository keeps repeating.
 */
export async function readEndpointsView(readings: AsteriskReadings, target: TargetProfile) {
  const [endpoints, contacts, registrations, channelStats] = await Promise.all([
    readings.endpoints(target), readings.contacts(target), readings.registrations(target),
    readings.channelStats(target),
  ]);
  const endpointDetails = await readings.endpointDetails(
    target,
    endpoints.result.state === 'available' ? (endpoints.result.value ?? []).map((endpoint) => endpoint.id) : [],
  );
  return { endpoints, contacts, registrations, channelStats, endpointDetails };
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
  const { userDataPath, resourcesPath, hosted, onProvisionStep } = options;
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

  /**
   * The durable settings store backing every renderer control that must survive a
   * relaunch (the appearance editor, the personal-vocabulary cache, the settings-source
   * allowlist below, and any future caller) -- see `control-plane/settings-store.ts`.
   * Written atomically: a plain `writeFileSync` here would leave a truncated
   * `settings.json` behind if the process were killed mid-write, or fail outright on
   * Windows when Defender/the indexer/a sync client has the destination momentarily
   * open. Declared here, ahead of the settings-source fetcher below, because the
   * fetcher's default allowlist is read out of this same registry -- see there for why.
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

  /*
   * Built once, at construction. The allowlist an explicit caller supplies is used
   * exactly as given -- that is how the tests below pin a fixed set of hosts, and how a
   * hosted server could supply its own without touching a settings file at all. Absent
   * that, the default is read out of the SAME persisted settings registry the renderer's
   * allowlist-management screen writes to (`console.settingsSourceAllowlist`, via
   * `settings.write`) -- this is the fix for the defect this file used to ship with: the
   * allowlist option was never threaded from `app/electron/main.ts` at all, so in every
   * real install the allowlist was permanently empty and every external settings source
   * was refused forever, however many hosts a person believed they had allowed.
   *
   * If NEITHER supplies anything, this still resolves to an empty list, which still
   * refuses every source rather than permitting every source -- a fetcher configured
   * with nothing is not a fetcher configured with no restrictions, and that stays the
   * safe direction for the default. What changed is that a person now has a real way to
   * widen it on purpose, and that widening actually reaches this fetcher.
   *
   * Read once, at construction, like every other consumer of `settingsRegistry()` --
   * a host added after this process started takes effect on the next restart, which the
   * allowlist-management screen says plainly rather than implying the change is live.
   */
  const settingsSourceFetcher = new SettingsSourceFetcher({
    allowedHosts: options.allowedSettingsSourceHosts ?? parseAllowlist(settingsRegistry().get(SETTINGS_SOURCE_ALLOWLIST_KEY)),
    readToken: options.readSettingsSourceToken,
  });
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

  /* Shared by `readView`'s `restbrowser` case and every branch of `parsedView` below:
   * run one allowlisted read-only CLI command and parse its output, carrying the
   * command's own unavailable reason through untouched when the read itself failed. */
  const read = async <T>(target: TargetProfile, command: ReadOnlyCommand, parse: (text: string) => T) => {
    const reading = await readings.raw(target, command);
    return reading.result.state === 'available'
      ? { command, result: { ...reading.result, value: parse(String(reading.result.value ?? '')) } }
      : { command, result: reading.result };
  };

  async function readView(target: TargetProfile, view: PbxReadView) {
    if (view === 'dash') {
      const [channels, endpoints, queues, uptime] = await Promise.all([
        readings.channels(target), readings.endpoints(target), readings.queues(target), readings.uptimeSeconds(target),
      ]);
      return { channels, endpoints, queues, uptime };
    }
    if (view === 'live') return { channels: await readings.channels(target) };
    if (view === 'endpoints') return await readEndpointsView(readings, target);
    if (view === 'trunks') {
      // IAX2 registrations read alongside the PJSIP ones so the trunks table stops being
      // PJSIP-only -- `iax2 show registry` is the IAX2 counterpart to `pjsip show
      // registrations`, both real outbound-registration state, neither one a substitute
      // for the other.
      const [registrations, iaxRegistrations] = await Promise.all([
        readings.registrations(target), readings.iaxRegistrations(target),
      ]);
      return { registrations, iaxRegistrations };
    }
    if (view === 'iaxpeers') return { iaxPeers: await readings.iaxPeers(target) };
    /* The trunk-authentication screen. Registrations are read alongside the auth objects
     * so the screen can say which outbound registration exists at all on this target --
     * the two together are what "this trunk authenticates as X" is made of. Neither
     * command prints a credential; see `parsePjsipAuths` for the one that would. */
    if (view === 'trunkauth') {
      const [auths, registrations] = await Promise.all([
        readings.auths(target), readings.registrations(target),
      ]);
      return { auths, registrations };
    }
    if (view === 'queues') return { queues: await readings.queues(target) };
    /* The canvas draws `dialplan show`, which is *loaded* state and never the file. The
     * divergence reading beside it is what stops the drawing being read as the file: see
     * readDialplanDivergence below. Sequential, not parallel, because it compares against
     * the contexts this exact run reported. */
    if (view === 'canvas') {
      const dialplan = await dialplanReadings.graph(target);
      return { dialplan, dialplanFile: await readDialplanDivergence(target, dialplan) };
    }
    if (view === 'modules') return { modules: await readings.modules(target) };
    /* The REST resource browser. Channels, bridges and registered dialplan
     * applications are read the same way `dash`/`live` already read channels above --
     * live off the target through the Asterisk CLI, not through a raw HTTP call to
     * ARI, which is what "REST" names here rather than the wire protocol: `ari show
     * apps`/`ari show users` are themselves introspection of the REST interface's own
     * registered applications and configured users, the two things that actually
     * gate what an external REST client may do against this target. A genuine live
     * *event* stream (a call starting, a bridge forming, while this screen is open)
     * needs a websocket/SSE transport this control plane does not have -- the same gap
     * the Manager and REST screen already states plainly rather than pretending to
     * close; this screen states it too, on the About group below. */
    if (view === 'restbrowser') {
      const bridgeCommand: ReadOnlyCommand = 'bridge show all';
      const applicationsCommand: ReadOnlyCommand = 'core show applications';
      const [channels, bridgesReading, applicationsReading, ariApps, ariUsers] = await Promise.all([
        readings.channels(target),
        read(target, bridgeCommand, parseBridges),
        read(target, applicationsCommand, parseApplications),
        read(target, 'ari show apps', parseAriApps),
        read(target, 'ari show users', parseAriUsers),
      ]);
      return { channels, bridges: bridgesReading, applications: applicationsReading, ariApps, ariUsers };
    }
    /* Dialplan scripting visibility. `extensions.conf`'s AGI-family calls, cross-checked
     * against what the target's own AGI directory (`asterisk.conf`'s `astagidir`,
     * falling back to Asterisk's shipped default when that field is empty or unread)
     * actually holds -- two facts this console could previously only look at
     * separately, on two different screens, and never side by side. */
    if (view === 'agiscripts') {
      const transport = new WslConfigTransport({ executor: processExecutor, distribution: target.wslDistribution! });
      const [dialplan, asteriskConf] = await Promise.all([
        dialplanReadings.graph(target),
        transport.read('/etc/asterisk/asterisk.conf').catch((): ConfigValue => []),
      ]);
      const directories = asteriskConf.find((section) => section.name === 'directories');
      const astagidir = directories?.entries.find((entry) => entry.key === 'astagidir')?.value?.trim() || DEFAULT_AGI_DIRECTORY;
      const agiLibrary = new AgiLibrary({ executor: processExecutor, distribution: target.wslDistribution! });
      const files = await agiLibrary.list(astagidir);
      const references = dialplan.result.state === 'available' && dialplan.result.value
        ? agiReferences(dialplan.result.value)
        : [];
      return { dialplan, astagidir, files, references };
    }

    const parsed = await parsedView(target, view);
    if (parsed) return parsed;
    return { modules: await readings.modules(target) };
  }

  /**
   * Whether the dialplan Asterisk is running still matches the `extensions.conf` on the
   * target, and the exact reason when that cannot be said.
   *
   * The file's text never leaves this function. `readText` deliberately does not redact,
   * because a redacted read is the wrong thing to write back — so the bytes are parsed
   * here and only the derived facts (context names, directive lines, counts) go out to the
   * renderer.
   */
  async function readDialplanDivergence(
    target: TargetProfile,
    dialplan: DialplanReading<DialplanGraph>,
  ): Promise<Observation<DialplanDivergence>> {
    const observedAt = new Date().toISOString();
    /* No contexts means the dialplan itself could not be read, and comparing a file against
     * nothing would report every section in it as missing from a dialplan nobody read. */
    if (!dialplan.contexts) {
      return {
        state: 'unavailable',
        observedAt,
        reason: `the running dialplan could not be read, so there is nothing to compare ${DIALPLAN_FILE_RESOURCE} against`,
      };
    }
    try {
      const transport = new WslConfigTransport({ executor: processExecutor, distribution: target.wslDistribution! });
      const text = await transport.readText(DIALPLAN_FILE_RESOURCE);
      return {
        state: 'available',
        observedAt,
        value: compareDialplanToFile(dialplan.contexts, parseExtensionsConfSections(text), dialplan.contextsReported),
      };
    } catch (error) {
      return {
        state: 'unavailable',
        observedAt,
        reason: `${DIALPLAN_FILE_RESOURCE} could not be read: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async function parsedView(target: TargetProfile, view: PbxReadView) {
    const readHere = <T>(command: ReadOnlyCommand, parse: (text: string) => T) => read(target, command, parse);

    if (view === 'voicemail') {
      const [users, zones] = await Promise.all([
        readHere('voicemail show users', parseVoicemailUsers),
        readHere('voicemail show zones', parseVoicemailZones),
      ]);
      return { voicemailUsers: users, voicemailZones: zones };
    }
    if (view === 'confbridge') return { rooms: await readHere('confbridge list', parseConfbridgeList) };
    if (view === 'moh') {
      /* The Music on Hold destination is this console's one media surface -- its feature
       * record (`app/renderer/src/pbx-admin-model.ts`, `moh-settings`) declares
       * `tools: ['config', 'media']` -- so the target's media cache is read here beside the
       * classes. The two are genuinely different things and the screen says so: a class
       * names a directory an operator put files in, while a cache item is something
       * Asterisk fetched from a URI at run time and stored itself. Either reading can fail
       * without costing the other, so they are read together and reported apart. */
      const [mohClasses, mediaCacheItems] = await Promise.all([
        readHere('moh show classes', parseMohClasses),
        readHere('media cache show all', parseMediaCacheItems),
      ]);
      return { mohClasses, mediaCacheItems };
    }
    if (view === 'codecs') {
      const [codecs, translations] = await Promise.all([
        readHere('core show codecs', parseCodecs),
        readHere('core show translation', parseTranslations),
      ]);
      return { codecs, translations };
    }
    if (view === 'security') return { aclRules: await readHere('acl show', parseAclRules) };
    if (view === 'cdr') {
      // `modules` is fetched here too (the same `readings.modules()` the `modules` view
      // above uses) so the CDR/CEL screen's own backend-status readouts can say whether
      // a cdr_*/cel_* backend module is actually loaded on the target, not only whether
      // cdr show status's own "Registered Backends" list (which only ever lists CDR,
      // never CEL, backends) happens to mention it.
      const [cdrStatus, modules] = await Promise.all([
        readHere('cdr show status', parseCdrStatus),
        readings.modules(target),
      ]);
      return { cdrStatus, modules };
    }
    if (view === 'logger') return { loggerChannels: await readHere('logger show channels', parseLoggerChannels) };
    if (view === 'ami') {
      // `manager show connected` is the live-session counterpart to `manager show
      // users`'s configured-account list: which AMI/HTTP clients are actually holding a
      // socket open right now, and the file descriptor `manager kick session` needs to
      // end one of them -- the one genuinely operable action this read-only CLI surface
      // has for a connected session (see `write-commands.ts`).
      const [settings, users, apps, connected] = await Promise.all([
        readHere('manager show settings', parseManagerSettings),
        readHere('manager show users', parseManagerUsers),
        readHere('ari show apps', parseAriApps),
        readHere('manager show connected', parseManagerConnections),
      ]);
      return { managerSettings: settings, managerUsers: users, ariApps: apps, managerConnections: connected };
    }
    if (view === 'about' || view === 'cli') {
      const [sysinfo, uptime] = await Promise.all([
        readHere('core show sysinfo', parseSysinfo),
        readHere('core show uptime seconds', parseUptime),
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
        onStep: onProvisionStep,
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

  // `FileSettingsStore` and `settingsRegistry()` moved up beside the settings-source
  // fetcher above, because the fetcher's default allowlist now reads from this same
  // registry and needs it to exist before that point in the function body.

  async function controlPlaneRequest(request: ControlPlaneRequest): Promise<ControlPlaneResponse> {
    try {
      if (hosted && HOSTED_UNSUPPORTED_ACTIONS.has(request.action)) {
        return {
          ok: false, requestId: request.requestId, code: 'ACTION_UNSUPPORTED_HOSTED',
          message: `"${request.action}" manages a Windows WSL distribution and cannot run on a hosted server. ` +
            'Install and administer Asterisk on this VM directly; the console will connect to it as a target.',
        };
      }

      if (request.action === 'settings.source.fetch') {
        const payload = (request.payload ?? {}) as { url?: unknown; credentialKey?: unknown };
        if (typeof payload.url !== 'string') {
          return { ok: false, requestId: request.requestId, code: 'SOURCE_URL_REQUIRED',
            message: 'A settings source needs a URL.' };
        }
        const result = await settingsSourceFetcher.fetchSource({
          url: payload.url,
          credentialKey: typeof payload.credentialKey === 'string' ? payload.credentialKey : undefined,
        });
        /* Two different outcomes, deliberately not collapsed. A source answering 503 is a
         * REQUEST THAT SUCCEEDED and a response the renderer must classify -- returning it
         * as a control-plane failure would hide the status behind a generic error and lose
         * the difference between "the source said no" and "the source was never asked".
         * A refused host or a timeout is the second kind: no response exists to classify. */
        if (result.reason !== undefined) {
          /* `reason` never carries the token: the fetcher derives it from the error's name
           * rather than its message for exactly this reason. */
          return { ok: false, requestId: request.requestId, code: 'SOURCE_UNREACHABLE',
            message: result.reason };
        }
        return { ok: true, requestId: request.requestId, data: result };
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
        /* `isAllowedCommandLine` covers the whole read-only list, including the object
         * commands (`pjsip show endpoint <id>`) a plain `READ_ONLY_COMMANDS.includes`
         * check has never matched -- this used to refuse every one of those outright,
         * which is why no screen driving this same ceremony route could ever look up one
         * endpoint's own negotiated codecs. `isAllowlistedWriteCommand` is the second,
         * deliberately tiny allowlist in `write-commands.ts` for the handful of
         * non-read-only lines this console runs at all (module load/unload/reload,
         * ending a live AMI session) -- both are checked by exact shape before anything
         * reaches the target, never a free-text command taken on trust. */
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
      if (request.action === 'deploy.console') {
        /* Refused hosted. The desktop app is where somebody sits in front of the machine
         * holding their SSH keys; a server reaching out to install itself elsewhere is a
         * different product with a different threat model. */
        if (hosted) {
          return { ok: false, requestId: request.requestId, code: 'DEPLOY_NOT_HOSTED',
            message: 'Deploying to another machine is a desktop action; the hosted server does not do it.' };
        }
        const payload = request.payload ?? {};
        const bundlePath = typeof payload.bundlePath === 'string' ? payload.bundlePath : '';
        const stamp = typeof payload.stamp === 'string' ? payload.stamp : '';
        const deployTarget: DeployTarget = {
          host: typeof payload.host === 'string' ? payload.host : '',
          port: typeof payload.port === 'number' ? payload.port : 22,
          user: typeof payload.user === 'string' ? payload.user : '',
          knownHostsPath: typeof payload.knownHostsPath === 'string' ? payload.knownHostsPath : '',
        };
        let plan;
        try {
          plan = planDeployment(deployTarget, bundlePath, stamp);
        } catch (error) {
          /* The refusal reason is the useful part: an invalid host, an ephemeral known_hosts
           * store, a stamp that could shape a path. Reported as itself, not as a failure. */
          return { ok: false, requestId: request.requestId, code: 'DEPLOY_REFUSED',
            message: error instanceof Error ? error.message : 'That deployment was refused.' };
        }
        /* Its own executor. The shared one allows wsl.exe and docker, and widening it would
         * hand every other action the ability to reach another machine. */
        const outcome = await runDeployment({
          executor: new NodeProcessExecutor({ allowedExecutables: ['ssh', 'scp'] }),
          plan,
          target: deployTarget,
          onStep: (step) => onProvisionStep?.({ name: step.name, ok: step.ok, detail: step.detail }),
        });
        return {
          ok: outcome.ok,
          requestId: request.requestId,
          code: outcome.ok ? undefined : 'DEPLOY_FAILED',
          message: outcome.ok ? undefined : outcome.steps[outcome.steps.length - 1]?.detail,
          data: outcome,
        } as ControlPlaneResponse;
      }
      if (
        request.action === 'history.list' || request.action === 'history.restore'
        || request.action === 'history.diff' || request.action === 'history.prune'
      ) {
        const target = await resolveTarget(request.serverId);
        const history = new ConfigHistory({ executor: processExecutor, distribution: target.wslDistribution! });
        if (request.action === 'history.list') {
          const resource = typeof request.payload?.resource === 'string' ? request.payload.resource : undefined;
          return { ok: true, requestId: request.requestId, data: { entries: await history.list(resource), observedAt: new Date().toISOString() } };
        }
        if (request.action === 'history.prune') {
          const resource = typeof request.payload?.resource === 'string' ? request.payload.resource : '';
          const keep = typeof request.payload?.keep === 'number' ? request.payload.keep : NaN;
          if (!resource) return { ok: false, requestId: request.requestId, code: 'RESOURCE_REQUIRED', message: 'No resource was named to prune.' };
          try {
            const pruned = await history.prune(resource, keep);
            return { ok: true, requestId: request.requestId, data: pruned };
          } catch (error) {
            return { ok: false, requestId: request.requestId, code: 'HISTORY_PRUNE_FAILED', message: error instanceof Error ? error.message : 'That prune was refused.' };
          }
        }
        const handle = typeof request.payload?.handle === 'string' ? request.payload.handle : '';
        if (!handle) return { ok: false, requestId: request.requestId, code: 'HANDLE_REQUIRED', message: 'No recovery point was named.' };
        if (request.action === 'history.diff') {
          try {
            const diff = await history.diff(handle);
            return { ok: true, requestId: request.requestId, data: diff };
          } catch (error) {
            return { ok: false, requestId: request.requestId, code: 'HISTORY_DIFF_FAILED', message: error instanceof Error ? error.message : 'That comparison was refused.' };
          }
        }
        const restored = await history.restore(handle);
        return {
          ok: restored.ok,
          requestId: request.requestId,
          code: restored.ok ? undefined : 'HISTORY_RESTORE_FAILED',
          message: restored.ok ? undefined : restored.detail,
          data: restored,
        } as ControlPlaneResponse;
      }
      if (
        request.action === 'media.list' || request.action === 'media.upload'
        || request.action === 'media.remove' || request.action === 'media.read'
      ) {
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

        /* The "audition" action on the Sound prompts screen: read a file's bytes back so
         * the renderer can try to play them, without giving the renderer a filesystem path
         * or a shell of its own -- exactly the same boundary `upload` and `remove` already
         * keep. */
        if (request.action === 'media.read') {
          return { ok: true, requestId: request.requestId, data: await library.read(root, name) };
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
          /* `branch` travels with the list rather than its own round trip: the History
           * screen always wants both together, and there is nothing to read the
           * branch name for on its own. */
          return {
            ok: true, requestId: request.requestId,
            data: { entries: withPayload, counts: await history.actionCounts(), branch: await history.branch() },
          };
        }
        if (request.action === 'local-history.record') {
          const entry = request.payload as unknown as Parameters<LocalHistory['record']>[0];
          return { ok: true, requestId: request.requestId, data: await history.record(entry) };
        }
        if (request.action === 'local-history.restore') {
          const commitId = typeof request.payload?.commitId === 'string' ? request.payload.commitId : '';
          return { ok: true, requestId: request.requestId, data: await history.restore(commitId) };
        }
        if (request.action === 'local-history.diff') {
          const commitId = typeof request.payload?.commitId === 'string' ? request.payload.commitId : '';
          return { ok: true, requestId: request.requestId, data: await history.diff(commitId) };
        }
        if (request.action === 'local-history.compare') {
          const fromId = typeof request.payload?.fromId === 'string' ? request.payload.fromId : '';
          const toId = typeof request.payload?.toId === 'string' ? request.payload.toId : '';
          return { ok: true, requestId: request.requestId, data: { files: await history.compareFiles(fromId, toId) } };
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
