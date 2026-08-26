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
 *  `parseChannelStats` for the exact format string. This is the codec negotiated on a
 *  live channel, which is a different reading from `EndpointDetail.codecs` below. */
export interface ChannelCodecUsage { channelName: string; endpointId: string; codec?: string }
/** One endpoint's configured transport and codecs, from `pjsip show endpoint <id>` —
 *  see `control-plane/asterisk-readings.ts` `parseEndpointDetail`. */
export interface EndpointDetail { transport?: string; codecs?: string[] }
/** Every endpoint detail one view read, plus the ids it did not read and so cannot
 *  report on — see `AsteriskReadings.endpointDetails` for the budget that bounds it. */
export interface EndpointDetailSet { byEndpoint: Record<string, EndpointDetail>; notRead: string[] }
export interface Contact { aor: string; uri: string; status: string; roundTripMs?: number }
export interface Registration { id: string; serverUri: string; status: string }
/** `iax2 show peers` -- see `control-plane/asterisk-readings.ts` `parseIax2Peers` for the
 *  exact format string and why `name` already has any CLI-appended `/<username>` split off. */
export interface IaxPeer { name: string; host: string; dynamic: boolean; trunk: boolean; status: string }
/** `iax2 show registry` -- see `control-plane/asterisk-readings.ts` `parseIax2Registry`. */
export interface IaxRegistration { host: string; username: string; refresh: number; state: string }
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
/** `cdr show status` (`main/cdr.c` `handle_cli_status`) -- see
 *  `control-plane/asterisk-parsers.ts` `parseCdrStatus`. `settings` is the plain
 *  key/value block ("Logging", "Mode", ...); `backends` is the "* Registered Backends"
 *  list, one entry per backend module the target's running Asterisk has actually
 *  loaded and registered, with `suspended` set when the CLI printed "(suspended)"
 *  after its name. This is the "loaded" half of the CDR/CEL backend status readout on
 *  the `cdr` screen -- the "configured" half comes from cdr.conf/cel_odbc.conf/
 *  cel_pgsql.conf's own sections, read the ordinary `pbx.config` way. */
export interface CdrStatus { settings: Record<string, string>; backends: Array<{ name: string; suspended: boolean }> }

interface Reading<T> { command: string; result: Observation<T> }

export interface ViewReadings {
  channels?: Reading<Channel[]>;
  endpoints?: Reading<Endpoint[]>;
  channelStats?: Reading<ChannelCodecUsage[]>;
  endpointDetails?: Reading<EndpointDetailSet>;
  contacts?: Reading<Contact[]>;
  registrations?: Reading<Registration[]>;
  iaxRegistrations?: Reading<IaxRegistration[]>;
  iaxPeers?: Reading<IaxPeer[]>;
  queues?: Reading<QueueSummary[]>;
  modules?: Reading<ModuleSummary[]>;
  uptime?: Reading<number>;
  voicemailUsers?: Reading<{ users: VoicemailUser[]; total?: number }>;
  voicemailZones?: Reading<unknown>;
  rooms?: Reading<ConfbridgeConference[]>;
  mohClasses?: Reading<MohClass[]>;
  managerUsers?: Reading<{ users: ManagerUser[]; total?: number }>;
  ariApps?: Reading<AriApp[]>;
  cdrStatus?: Reading<CdrStatus>;
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
  iaxpeers: true,
  queues: true,
  modules: true,
  voicemail: true,
  confbridge: true,
  moh: true,
  ami: true,
  /* `security` is a genuine reader, just not THIS one. There is no read-only CLI command
   * that prints one line per `permit=`/`deny=` rule inside a chosen named ACL -- `acl
   * show` (parsed by `parseAclRules` above) only prints the bare list of ACL names, which
   * is why `rowsFor` below has no `security` branch and never will. The rules themselves
   * come from `acl.conf` through the structured `pbx.config` transport every
   * configuration screen already uses, and `App.tsx`'s `applyRows` feeds the table from
   * `aclRuleRows(this.aclConfigValue())` (`app/renderer/src/acl-editor.ts`) directly,
   * bypassing `readings`/`rowsFor` entirely. `false` here is therefore accurate to what
   * this specific inventory claims -- "can `rowsFor` put real rows on it" -- while the
   * screen itself is fully wired through its own, more appropriate path. */
  security: false,
};

export const READABLE_VIEWS: PbxReadView[] = [
  'dash', 'live', 'endpoints', 'trunks', 'iaxpeers', 'queues', 'modules',
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
    return endpointRows(
      valueOf(readings.endpoints) ?? [],
      valueOf(readings.contacts) ?? [],
      valueOf(readings.channelStats) ?? [],
      valueOf(readings.endpointDetails),
    );
  }
  if (screen === 'trunks') return registrationRows(valueOf(readings.registrations) ?? [], valueOf(readings.iaxRegistrations) ?? []);
  if (screen === 'iaxpeers') return iaxPeerRows(valueOf(readings.iaxPeers) ?? []);
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
 * Both columns are fed from the endpoint's own parameter table (`pjsip show endpoint
 * <id>` — see `parseEndpointDetail`), which is the only CLI output that carries either
 * value for an endpoint that is merely configured rather than on a call.
 *
 * Transport falls back to the `Transport:` child line of `pjsip show endpoints` (see
 * `parseEndpoints`) when no detail was read. The two agree whenever both exist; the
 * detail additionally reports a `transport=` naming a transport the target does not
 * have, which the child line omits entirely (`config_transport.c` `cli_iterate` returns
 * -1 when the id does not resolve) — an endpoint pinned to a transport that is not there
 * is exactly the one worth seeing.
 *
 * Codecs falls back to the codec negotiated on a live channel (`parseChannelStats`), and
 * says so in the cell, because that is a different reading: one codec in use on one call
 * rather than the list the endpoint offers. A reader must never have to guess which of
 * the two a cell is showing.
 *
 * Anything genuinely unread stays `NOT_READ` rather than becoming a guess — an endpoint
 * past `MAX_ENDPOINT_DETAILS` with no live channel has neither reading available.
 */
export function endpointRows(
  endpoints: Endpoint[],
  contacts: Contact[],
  channelStats: ChannelCodecUsage[] = [],
  details: EndpointDetailSet | undefined = undefined,
): string[][] {
  const byAor = new Map(contacts.map((contact) => [contact.aor, contact]));
  const codecByEndpoint = new Map<string, string>();
  for (const stat of channelStats) {
    if (stat.codec && !codecByEndpoint.has(stat.endpointId)) codecByEndpoint.set(stat.endpointId, stat.codec);
  }
  return endpoints.map((endpoint) => {
    const detail = details?.byEndpoint[endpoint.id];
    const inUse = codecByEndpoint.get(endpoint.id);
    /* An empty `allow=` is a real reading — Asterisk printed `(nothing)` — but "this
     * endpoint allows no codec" is not something an empty cell says, so it is spelled
     * out rather than falling through to the live-channel branch below. */
    const codecs = detail?.codecs
      ? (detail.codecs.length > 0 ? detail.codecs.join(', ') : 'none allowed')
      : inUse
        ? `${inUse} (in use)`
        : NOT_READ;
    return [
      endpoint.id,
      byAor.get(endpoint.id)?.uri ?? NOT_READ,
      detail?.transport ?? endpoint.transport ?? NOT_READ,
      codecs,
      endpoint.state,
    ];
  });
}

/**
 * `pjsip show registrations` rows, plus the IAX2 counterpart the trunks table used to
 * have no reader for at all. An IAX2 registration (`iax2 show registry`, `iax.conf`'s
 * own `register =>` lines -- see `configs/samples/iax.conf.sample` line 305) has no
 * named object of its own the way a PJSIP `[registration]` section does, so the row it
 * gets here is named the same way `register => user[:secret]@host` itself is: username
 * and host, joined by `@`, or the bare host when the line sets no username. Auth and
 * Outbound stay `NOT_READ` for an IAX2 row exactly as they already do for a PJSIP one:
 * neither CLI command prints either, so guessing a value there would be no more honest
 * for one protocol than the other.
 */
export function registrationRows(registrations: Registration[], iaxRegistrations: IaxRegistration[] = []): string[][] {
  return [
    ...registrations.map((registration) => [
      registration.id,
      registration.serverUri,
      NOT_READ,
      NOT_READ,
      registration.status,
    ]),
    ...iaxRegistrations.map((registration) => [
      registration.username ? `${registration.username}@${registration.host}` : registration.host,
      registration.host,
      NOT_READ,
      NOT_READ,
      registration.state,
    ]),
  ];
}

/** `iax2 show peers` rows for the IAX peers table -- the live counterpart to iax.conf's
 *  own peer/friend sections, read alongside them the same way `endpointRows` reads
 *  `pjsip show endpoints` alongside pjsip.conf. Selecting a row loads that exact peer's
 *  real configuration into the editor below (see `iax-peers.ts`); nothing here is
 *  invented, and a target with no configured peers renders an honestly empty table. */
export function iaxPeerRows(peers: IaxPeer[]): string[][] {
  return peers.map((peer) => [
    peer.name,
    peer.host,
    peer.dynamic ? 'yes' : 'no',
    peer.trunk ? 'yes' : 'no',
    peer.status,
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
  const iaxRegistrations = valueOf(readings.trunks?.iaxRegistrations);
  const iaxPeers = valueOf(readings.iaxpeers?.iaxPeers);
  const queues = valueOf(readings.queues?.queues) ?? valueOf(readings.dash?.queues);
  const modules = valueOf(readings.modules?.modules);
  if (screen === 'live' && channels) return String(channels.length);
  if (screen === 'endpoints' && endpoints) return String(endpoints.length);
  /* The badge counts every row the table actually shows, PJSIP and IAX2 alike -- not
   * only PJSIP's, or the badge would silently under-report once IAX2 rows joined the
   * table below. */
  if (screen === 'trunks' && (registrations || iaxRegistrations)) {
    return String((registrations?.length ?? 0) + (iaxRegistrations?.length ?? 0));
  }
  if (screen === 'iaxpeers' && iaxPeers) return String(iaxPeers.length);
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
