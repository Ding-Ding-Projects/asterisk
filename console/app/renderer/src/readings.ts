import type { Observation, PbxReadView } from '../../../shared/control-plane';
import {
  aggregateTableState,
  displayRows,
  readCell,
  sourceStatus,
  UNREAD_MARKER,
  unavailableCell,
  unreadCell,
  type DestinationTable,
  type TableCell,
  type TableReading,
} from './table-state';
import type { Codec, TranslationRow } from '../../../control-plane/asterisk-parsers.ts';

/**
 * Turns control-plane readings into the row shapes the design's own screens consume.
 * Nothing here invents a value: a cell the console has not read is `NOT_READ`, and a
 * screen with no reading carries the exact reason it has none.
 */
export const NOT_READ = UNREAD_MARKER;

export interface Channel {
  name: string; context: string; extension: string; state: string;
  application: string; callerNumber: string; durationSeconds: number;
}
export interface Endpoint { id: string; callerId?: string; state: string; channels: string }
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
  ivr: false,
  queues: true,
  modules: true,
  voicemail: true,
  confbridge: true,
  moh: true,
  ami: true,
  sync: false,
  skills: false,
  hub: false,
  vocab: false,
  ops: false,
  secrets: false,
  servers: true,
  notifications: false,
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
  return displayRows(tableStateFor(screen, readings));
}

function cellFor(value: string, reading: TableReading<unknown> | undefined, missingReason: string): TableCell {
  if (value === NOT_READ) return unreadCell(missingReason, reading?.command);
  if (!reading) return unreadCell('The source command has not been requested.');
  if (reading.result.state === 'unavailable') {
    return unavailableCell(reading.result.reason, reading.command, reading.result.observedAt);
  }
  return readCell(value, reading.command, reading.result.observedAt);
}

function cellsForRows(
  rows: string[][],
  reading: TableReading<unknown> | undefined,
  missingReason: string,
): TableCell[][] {
  return rows.map((row) => row.map((value) => cellFor(value, reading, missingReason)));
}

/** Destination-specific rows plus the state of every command required to build them. */
export function tableStateFor(screen: string, readings: ViewReadings | undefined): DestinationTable {
  if (screen === 'live') {
    return aggregateTableState(screen, [sourceStatus('channels', readings?.channels)], cellsForRows(
      channelRows(valueOf(readings?.channels) ?? []), readings?.channels, 'The channel command did not expose this field.',
    ));
  }
  if (screen === 'endpoints') {
    const endpoints = valueOf(readings?.endpoints) ?? [];
    const contacts = valueOf(readings?.contacts) ?? [];
    const byAor = new Map(contacts.map((contact) => [contact.aor, contact]));
    const rows = endpoints.map((endpoint): TableCell[] => {
      const contact = byAor.get(endpoint.id);
      const observedAt = readings?.endpoints?.result.observedAt ?? '';
      return [
        observedAt ? readCell(endpoint.id, readings?.endpoints?.command ?? 'pjsip show endpoints', observedAt) : unreadCell('Endpoints have not been read.'),
        contact && readings?.contacts?.result.state === 'available'
          ? readCell(contact.uri, readings.contacts.command, readings.contacts.result.observedAt)
          : readings?.contacts?.result.state === 'unavailable'
            ? unavailableCell(readings.contacts.result.reason, readings.contacts.command, readings.contacts.result.observedAt)
            : unreadCell('No contact URI was observed for this endpoint.', readings?.contacts?.command),
        unreadCell('The endpoint summary does not expose its transport.'),
        unreadCell('The endpoint summary does not expose its codec list.'),
        observedAt ? readCell(endpoint.state, readings?.endpoints?.command ?? 'pjsip show endpoints', observedAt) : unreadCell('Endpoints have not been read.'),
      ];
    });
    return aggregateTableState(screen, [
      sourceStatus('endpoints', readings?.endpoints),
      sourceStatus('contacts', readings?.contacts),
    ], rows);
  }
  if (screen === 'trunks') {
    return aggregateTableState(screen, [sourceStatus('registrations', readings?.registrations)], cellsForRows(
      registrationRows(valueOf(readings?.registrations) ?? []), readings?.registrations,
      'The registration command does not expose this field.',
    ));
  }
  if (screen === 'queues') {
    return aggregateTableState(screen, [sourceStatus('queues', readings?.queues)], cellsForRows(
      queueRows(valueOf(readings?.queues) ?? []), readings?.queues, 'The queue command did not expose this field.',
    ));
  }
  if (screen === 'modules') {
    return aggregateTableState(screen, [sourceStatus('modules', readings?.modules)], cellsForRows(
      moduleRows(valueOf(readings?.modules) ?? []), readings?.modules, 'The module command did not expose this field.',
    ));
  }
  if (screen === 'voicemail') {
    return aggregateTableState(screen, [sourceStatus('voicemailUsers', readings?.voicemailUsers)], cellsForRows(
      voicemailRows(valueOf(readings?.voicemailUsers)?.users ?? []), readings?.voicemailUsers,
      'The voicemail command does not expose this field.',
    ));
  }
  if (screen === 'confbridge') {
    return aggregateTableState(screen, [sourceStatus('rooms', readings?.rooms)], cellsForRows(
      confbridgeRows(valueOf(readings?.rooms) ?? []), readings?.rooms, 'The conference command does not expose this field.',
    ));
  }
  if (screen === 'moh') {
    return aggregateTableState(screen, [sourceStatus('mohClasses', readings?.mohClasses)], cellsForRows(
      mohRows(valueOf(readings?.mohClasses) ?? []), readings?.mohClasses, 'The music class command does not expose this field.',
    ));
  }
  if (screen === 'ami') {
    const managerRows = cellsForRows(
      amiRows(valueOf(readings?.managerUsers)?.users ?? [], []), readings?.managerUsers,
      'The manager command does not expose this field.',
    );
    const ariRows = cellsForRows(
      amiRows([], valueOf(readings?.ariApps) ?? []), readings?.ariApps,
      'The ARI command does not expose this field.',
    );
    return aggregateTableState(screen, [
      sourceStatus('managerUsers', readings?.managerUsers),
      sourceStatus('ariApps', readings?.ariApps),
    ], [...managerRows, ...ariRows]);
  }
  return aggregateTableState(screen, [], []);
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

/** Transport and codecs need a per-endpoint read the console does not make yet. */
export function endpointRows(endpoints: Endpoint[], contacts: Contact[]): string[][] {
  const byAor = new Map(contacts.map((contact) => [contact.aor, contact]));
  return endpoints.map((endpoint) => [
    endpoint.id,
    byAor.get(endpoint.id)?.uri ?? NOT_READ,
    NOT_READ,
    NOT_READ,
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
export function badgeFor(
  screen: string,
  readings: Partial<Record<string, ViewReadings>>,
  serverCount?: number,
): string {
  const channels = valueOf(readings.live?.channels) ?? valueOf(readings.dash?.channels);
  const endpoints = valueOf(readings.endpoints?.endpoints) ?? valueOf(readings.dash?.endpoints);
  const registrations = valueOf(readings.trunks?.registrations);
  const queues = valueOf(readings.queues?.queues) ?? valueOf(readings.dash?.queues);
  const modules = valueOf(readings.modules?.modules);
  const voicemail = valueOf(readings.voicemail?.voicemailUsers)?.users;
  const conferences = valueOf(readings.confbridge?.rooms);
  const mohClasses = valueOf(readings.moh?.mohClasses);
  const managerUsers = valueOf(readings.ami?.managerUsers)?.users;
  const ariApps = valueOf(readings.ami?.ariApps);
  if (screen === 'live' && channels !== undefined) return String(channels.length);
  if (screen === 'endpoints' && endpoints !== undefined) return String(endpoints.length);
  if (screen === 'trunks' && registrations !== undefined) return String(registrations.length);
  if (screen === 'queues' && queues !== undefined) return String(queues.length);
  if (screen === 'modules' && modules !== undefined) return String(modules.length);
  if (screen === 'voicemail' && voicemail !== undefined) return String(voicemail.length);
  if (screen === 'confbridge' && conferences !== undefined) return String(conferences.length);
  if (screen === 'moh' && mohClasses !== undefined) return String(mohClasses.length);
  if (screen === 'ami' && (managerUsers !== undefined || ariApps !== undefined)) {
    return String((managerUsers?.length ?? 0) + (ariApps?.length ?? 0));
  }
  if (screen === 'servers' && serverCount !== undefined) return String(serverCount);
  return '';
}

export function serverTableState(servers: ReadonlyArray<ServerRow>, observedAt: string): DestinationTable {
  const source = 'server.inventory.list';
  const rows = serverRows(servers).map((row) => row.map((value) => value === NOT_READ
    ? unreadCell('The saved server record does not contain this field.', source)
    : readCell(value, source, observedAt)));
  return aggregateTableState('servers', [{
    key: 'servers',
    command: source,
    state: servers.length === 0 ? 'verified-empty' : 'read',
    observedAt,
  }], rows);
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
