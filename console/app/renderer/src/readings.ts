import type { Observation, PbxReadView } from '../../../shared/control-plane';
import type { Codec, TranslationRow } from '../../../control-plane/asterisk-parsers.ts';

/**
 * Turns control-plane readings into the row shapes the design's own screens consume.
 * Nothing here invents a value: a cell the console has not read is `NOT_READ`, and a
 * screen with no reading carries the exact reason it has none.
 */
export const NOT_READ = '—';

export interface Channel {
  name: string; context: string; extension: string; state: string;
  application: string; callerNumber: string; durationSeconds: number;
}
export interface Endpoint { id: string; callerId?: string; state: string; channels: string; transport?: string }
/** One row of `pjsip show channelstats` — see `control-plane/asterisk-readings.ts`
 *  `parseChannelStats` for the exact format string and why the codec column has to
 *  come from a live channel rather than from `pjsip show endpoints` itself. */
export interface ChannelCodecUsage { channelName: string; endpointId: string; codec?: string }
export interface Contact { aor: string; uri: string; status: string; roundTripMs?: number }
export interface Registration { id: string; serverUri: string; status: string }
export interface QueueSummary {
  name: string; strategy: string; callers: number; members: number;
  holdtimeSeconds: number; serviceLevelPercent?: number;
}
export interface ModuleSummary { name: string; description: string; useCount: number; status: string }

export interface VoicemailUser { context: string; mailbox: string; fullName: string; zone: string; newMessages?: number }
export interface ConfbridgeConference { name: string; users: number; marked: number; locked: boolean; muted: boolean }
export interface MohClass { name: string; mode?: string; directory?: string }
export interface ManagerUser { username: string }
export interface AriApp { name: string }

interface Reading<T> { command: string; result: Observation<T> }

export interface ViewReadings {
  channels?: Reading<Channel[]>;
  endpoints?: Reading<Endpoint[]>;
  channelStats?: Reading<ChannelCodecUsage[]>;
  contacts?: Reading<Contact[]>;
  registrations?: Reading<Registration[]>;
  queues?: Reading<QueueSummary[]>;
  modules?: Reading<ModuleSummary[]>;
  uptime?: Reading<number>;
  voicemailUsers?: Reading<{ users: VoicemailUser[]; total?: number }>;
  voicemailZones?: Reading<unknown>;
  rooms?: Reading<ConfbridgeConference[]>;
  mohClasses?: Reading<MohClass[]>;
  managerUsers?: Reading<{ users: ManagerUser[]; total?: number }>;
  ariApps?: Reading<AriApp[]>;
  /** `core show codecs` / `core show translation` — the dispatcher already reads both
   *  for the `codecs` screen (see `control-plane/dispatch.ts`); these two fields are
   *  what let the codec translation graph (`codec-graph.ts`) actually reach them. */
  codecs?: Reading<Codec[]>;
  translations?: Reading<TranslationRow[]>;
}

/**
 * Every screen the console can read from a target.
 *
 * The second group had no reader at all and sat empty for want of one rather than because
 * their subsystems had nothing to say. Each now reads the commands its own subsystem
 * answers, parsed from the exact output format in Asterisk's own source.
 */
/**
 * Hand-written inventory of every destination whose screen renders a data table (the
 * design's `kind: 'table'` screens), and whether `rowsFor` can put real rows on it.
 *
 * This is deliberately not derived from `rowsFor`'s own dispatch: a derived list would
 * report a screen as "has a reader" the moment someone adds an `if` branch for it, even
 * if that branch is wrong or produces nothing. Keeping it hand-written means removing a
 * branch from `rowsFor` without updating this list is a mismatch a test can catch, not a
 * silent regression.
 *
 * `dash` is excluded: it is a stat/health-bar screen (`dashboardStats`/`healthBars`), not
 * a table, and is already backed by live channel/endpoint/queue/uptime readings.
 */
export const TABLE_DESTINATION_READERS: Record<string, boolean> = {
  live: true,
  endpoints: true,
  trunks: true,
  queues: true,
  modules: true,
  voicemail: true,
  confbridge: true,
  moh: true,
  ami: true,
};

export const READABLE_VIEWS: PbxReadView[] = [
  'dash', 'live', 'endpoints', 'trunks', 'queues', 'modules',
  'voicemail', 'confbridge', 'moh', 'codecs', 'security', 'cdr', 'logger', 'ami', 'about', 'cli',
];

export const isReadable = (screen: string): screen is PbxReadView =>
  (READABLE_VIEWS as string[]).includes(screen);

export function valueOf<T>(reading: Reading<T> | undefined): T | undefined {
  return reading?.result.state === 'available' ? reading.result.value : undefined;
}

/** The exact reason a screen has no rows, or an empty string when it does. */
export function reasonFor(readings: ViewReadings | undefined, keys: Array<keyof ViewReadings>): string {
  if (!readings) return '';
  for (const key of keys) {
    const reading = readings[key];
    if (reading && reading.result.state === 'unavailable') return reading.result.reason;
  }
  return '';
}

export function rowsFor(screen: string, readings: ViewReadings | undefined): string[][] {
  if (!readings) return [];
  if (screen === 'live') return channelRows(valueOf(readings.channels) ?? []);
  if (screen === 'endpoints') {
    return endpointRows(valueOf(readings.endpoints) ?? [], valueOf(readings.contacts) ?? [], valueOf(readings.channelStats) ?? []);
  }
  if (screen === 'trunks') return registrationRows(valueOf(readings.registrations) ?? []);
  if (screen === 'queues') return queueRows(valueOf(readings.queues) ?? []);
  if (screen === 'modules') return moduleRows(valueOf(readings.modules) ?? []);
  if (screen === 'voicemail') return voicemailRows(valueOf(readings.voicemailUsers)?.users ?? []);
  if (screen === 'confbridge') return confbridgeRows(valueOf(readings.rooms) ?? []);
  if (screen === 'moh') return mohRows(valueOf(readings.mohClasses) ?? []);
  if (screen === 'ami') return amiRows(valueOf(readings.managerUsers)?.users ?? [], valueOf(readings.ariApps) ?? []);
  return [];
}

/** `voicemail.conf` mailboxes. The design's columns are Box, Owner, Email, New, Storage;
 *  `voicemail show users` gives box, owner name and unread count but never an email
 *  address or the storage backend, so those two stay `NOT_READ` rather than guessed. */
export function voicemailRows(users: VoicemailUser[]): string[][] {
  return users.map((user) => [
    user.mailbox,
    user.fullName || NOT_READ,
    NOT_READ,
    user.newMessages === undefined ? NOT_READ : String(user.newMessages),
    NOT_READ,
  ]);
}

/** `confbridge.conf` rooms. The design's columns are Room, Bridge profile, Users,
 *  Recording, State; `confbridge list` names neither the bridge profile nor whether a
 *  room is being recorded, so both stay `NOT_READ`. */
export function confbridgeRows(rooms: ConfbridgeConference[]): string[][] {
  return rooms.map((room) => [
    room.name,
    NOT_READ,
    String(room.users),
    NOT_READ,
    room.locked ? 'Locked' : room.users > 0 ? 'Active' : 'Idle',
  ]);
}

/** `musiconhold.conf` classes. The design's columns are Class, Mode, Source, Tracks;
 *  `moh show classes` gives the mode and directory but never a track count. */
export function mohRows(classes: MohClass[]): string[][] {
  return classes.map((mohClass) => [
    mohClass.name,
    mohClass.mode ?? NOT_READ,
    mohClass.directory ?? NOT_READ,
    NOT_READ,
  ]);
}

/** `manager.conf`/`ari.conf` API users. The design's columns are User, Interface,
 *  Permissions, State; neither `manager show users` nor `ari show apps` prints per-user
 *  permission classes, connection state, or (for AMI) the interface beyond "this is a
 *  manager user" -- those cells stay `NOT_READ`. */
export function amiRows(managerUsers: ManagerUser[], ariApps: AriApp[]): string[][] {
  return [
    ...managerUsers.map((user) => [user.username, 'AMI', NOT_READ, NOT_READ]),
    ...ariApps.map((app) => [app.name, 'ARI', NOT_READ, NOT_READ]),
  ];
}

/**
 * One row per configured server, for the design's own "Deploy & servers" table.
 *
 * That table shipped with three invented rows in the design reference — `pbx-hq`,
 * `pbx-lab`, `pbx-edge` — which the console blanks like every other sample. Blanking
 * them left the screen permanently empty, so a console that could hold several servers
 * showed none of them. These are the real ones.
 *
 * The columns are the design's: Profile, Route, Target, Interface, State. A field the
 * console genuinely has no value for is `NOT_READ`, never a plausible-looking guess —
 * a made-up hostname on a connection screen is worse than an empty cell, because
 * somebody will try to use it.
 */
export function serverRows(servers: ReadonlyArray<ServerRow>): string[][] {
  return servers.map((server) => [
    server.name,
    ROUTE_LABELS[server.connectionKind] ?? server.connectionKind,
    serverTarget(server),
    server.port ? `port ${server.port}` : NOT_READ,
    /* The reason travels with the state. A server that is merely "unreachable" tells
     * nobody why, and the why is the only part anybody can act on. */
    server.reason ? `${STATE_LABELS[server.state] ?? server.state} — ${server.reason}` : STATE_LABELS[server.state] ?? server.state,
  ]);
}

/** The subset of a configured server this module needs. Kept local so the renderer's
 *  row-building does not depend on the control plane's own record shape. */
export interface ServerRow {
  name: string;
  connectionKind: string;
  host?: string;
  port?: number;
  user?: string;
  wslDistribution?: string;
  dockerContext?: string;
  state: string;
  reason?: string;
}

const ROUTE_LABELS: Record<string, string> = {
  local: 'Local',
  wsl: 'Local WSL',
  docker: 'Local Docker',
  ssh: 'SSH',
  'ssh-docker': 'SSH Docker',
};

const STATE_LABELS: Record<string, string> = {
  idle: 'Not connected',
  connecting: 'Connecting',
  connected: 'Connected',
  unreachable: 'Unreachable',
  refused: 'Refused',
};

/** Whatever actually identifies this server, in the order that is most use to a reader. */
function serverTarget(server: ServerRow): string {
  if (server.wslDistribution) return server.wslDistribution;
  if (server.dockerContext) return server.dockerContext;
  if (server.host) return server.user ? `${server.user}@${server.host}` : server.host;
  return NOT_READ;
}

export function channelRows(channels: Channel[]): string[][] {
  return channels.map((channel) => [
    channel.name,
    channel.callerNumber || channel.extension || NOT_READ,
    channel.application || NOT_READ,
    formatDuration(channel.durationSeconds),
    channel.state,
  ]);
}

/**
 * Transport comes straight off the endpoint reading (`pjsip show endpoints`' own
 * recursed `Transport:` child line — see `parseEndpoints`). Codecs come from a separate
 * `pjsip show channelstats` reading matched back to an endpoint by id, because that is
 * the only CLI output that ever prints one for the plural endpoint listing — see
 * `parseChannelStats`. Both stay `NOT_READ` rather than a guess when genuinely absent:
 * most endpoints have no explicit `transport=`, and an idle endpoint has no live
 * channel to read a codec off.
 */
export function endpointRows(endpoints: Endpoint[], contacts: Contact[], channelStats: ChannelCodecUsage[] = []): string[][] {
  const byAor = new Map(contacts.map((contact) => [contact.aor, contact]));
  const codecByEndpoint = new Map<string, string>();
  for (const stat of channelStats) {
    if (stat.codec && !codecByEndpoint.has(stat.endpointId)) codecByEndpoint.set(stat.endpointId, stat.codec);
  }
  return endpoints.map((endpoint) => [
    endpoint.id,
    byAor.get(endpoint.id)?.uri ?? NOT_READ,
    endpoint.transport ?? NOT_READ,
    codecByEndpoint.get(endpoint.id) ?? NOT_READ,
    endpoint.state,
  ]);
}

export function registrationRows(registrations: Registration[]): string[][] {
  return registrations.map((registration) => [
    registration.id,
    registration.serverUri,
    NOT_READ,
    NOT_READ,
    registration.status,
  ]);
}

export function queueRows(queues: QueueSummary[]): string[][] {
  return queues.map((queue) => [
    queue.name,
    queue.strategy,
    String(queue.members),
    String(queue.callers),
    queue.serviceLevelPercent === undefined ? NOT_READ : `${queue.serviceLevelPercent}%`,
  ]);
}

export function moduleRows(modules: ModuleSummary[]): string[][] {
  return modules.map((module) => [module.name, module.description, String(module.useCount), module.status]);
}

export interface Stat { icon: string; label: string; value: string; delta: string }

/** Only readings that were actually observed become tiles. */
export function dashboardStats(readings: ViewReadings | undefined): Stat[] {
  const stats: Stat[] = [];
  const channels = valueOf(readings?.channels);
  if (channels) {
    stats.push({ icon: 'call', label: 'Active channels', value: String(channels.length), delta: 'core show channels' });
  }
  const endpoints = valueOf(readings?.endpoints);
  if (endpoints) {
    const up = endpoints.filter((endpoint) => !/^Unavailable$/iu.test(endpoint.state)).length;
    stats.push({ icon: 'smartphone', label: 'Endpoints up', value: `${up}/${endpoints.length}`, delta: 'pjsip show endpoints' });
  }
  const queues = valueOf(readings?.queues);
  if (queues) {
    const waiting = queues.reduce((total, queue) => total + queue.callers, 0);
    stats.push({ icon: 'groups', label: 'Queue waiting', value: String(waiting), delta: `${queues.length} queues` });
  }
  const uptime = valueOf(readings?.uptime);
  if (uptime !== undefined) {
    stats.push({ icon: 'speed', label: 'Uptime', value: formatUptime(uptime), delta: 'core show uptime' });
  }
  return stats;
}

export interface HealthBar { label: string; value: string; pct: string }

/** Every bar needs a real numerator and a real denominator, so unread ratios are omitted. */
export function healthBars(readings: ViewReadings | undefined): HealthBar[] {
  const bars: HealthBar[] = [];
  const endpoints = valueOf(readings?.endpoints);
  if (endpoints?.length) {
    const up = endpoints.filter((endpoint) => !/^Unavailable$/iu.test(endpoint.state)).length;
    bars.push({ label: 'Endpoints reachable', value: `${up} of ${endpoints.length}`, pct: percent(up, endpoints.length) });
  }
  const queues = valueOf(readings?.queues);
  if (queues?.length) {
    const staffed = queues.filter((queue) => queue.members > 0).length;
    bars.push({ label: 'Queues with members', value: `${staffed} of ${queues.length}`, pct: percent(staffed, queues.length) });
  }
  return bars;
}

export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.trunc(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  return `${pad(hours)}:${pad(minutes)}:${pad(safe % 60)}`;
}

export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86_400);
  if (days > 0) return `${days}d ${Math.floor((seconds % 86_400) / 3600)}h`;
  const hours = Math.floor(seconds / 3600);
  if (hours > 0) return `${hours}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 60)}m`;
}

const percent = (part: number, whole: number): string => `${Math.round((part / whole) * 100)}%`;
const pad = (value: number): string => String(value).padStart(2, '0');

/**
 * The nav-rail badge next to a destination. The design bakes in a plausible-looking count
 * per destination (`SCREENS[id].badge`); those are sample data and must never render. A
 * badge only ever shows a count of rows this session has actually read — falling back
 * across every screen that could have produced that count — and is empty otherwise. No
 * screen fires an extra read just to fill in a badge.
 */
export function badgeFor(screen: string, readings: Partial<Record<string, ViewReadings>>): string {
  const channels = valueOf(readings.live?.channels) ?? valueOf(readings.dash?.channels);
  const endpoints = valueOf(readings.endpoints?.endpoints) ?? valueOf(readings.dash?.endpoints);
  const registrations = valueOf(readings.trunks?.registrations);
  const queues = valueOf(readings.queues?.queues) ?? valueOf(readings.dash?.queues);
  const modules = valueOf(readings.modules?.modules);
  if (screen === 'live' && channels) return String(channels.length);
  if (screen === 'endpoints' && endpoints) return String(endpoints.length);
  if (screen === 'trunks' && registrations) return String(registrations.length);
  if (screen === 'queues' && queues) return String(queues.length);
  if (screen === 'modules' && modules) return String(modules.length);
  return '';
}

/**
 * The regex builder's match count. The design hardcodes a fake '184 matches'; this counts
 * real matches of the current pattern against whatever text corpus it is actually filtering.
 * When there is no corpus to search, it says so rather than implying a search ran.
 */
export function regexMatchLabel(pattern: string, corpus: string[]): string {
  if (!corpus.length) return 'nothing to search';
  if (!pattern) return `${corpus.length} of ${corpus.length} shown`;
  let re: RegExp;
  try {
    re = new RegExp(pattern, 'i');
  } catch {
    return 'invalid pattern';
  }
  const matches = corpus.filter((text) => re.test(text)).length;
  return `${matches} match${matches === 1 ? '' : 'es'}`;
}
