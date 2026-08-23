import type { Observation, PbxReadView } from '../../../shared/control-plane';

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
export interface Endpoint { id: string; callerId?: string; state: string; channels: string }
export interface Contact { aor: string; uri: string; status: string; roundTripMs?: number }
export interface Registration { id: string; serverUri: string; status: string }
export interface QueueSummary {
  name: string; strategy: string; callers: number; members: number;
  holdtimeSeconds: number; serviceLevelPercent?: number;
}
export interface ModuleSummary { name: string; description: string; useCount: number; status: string }

interface Reading<T> { command: string; result: Observation<T> }

export interface ViewReadings {
  channels?: Reading<Channel[]>;
  endpoints?: Reading<Endpoint[]>;
  contacts?: Reading<Contact[]>;
  registrations?: Reading<Registration[]>;
  queues?: Reading<QueueSummary[]>;
  modules?: Reading<ModuleSummary[]>;
  uptime?: Reading<number>;
}

/** Every table screen the console can read, and every one it cannot. */
export const READABLE_VIEWS: PbxReadView[] = ['dash', 'live', 'endpoints', 'trunks', 'queues', 'modules'];

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
  if (screen === 'endpoints') return endpointRows(valueOf(readings.endpoints) ?? [], valueOf(readings.contacts) ?? []);
  if (screen === 'trunks') return registrationRows(valueOf(readings.registrations) ?? []);
  if (screen === 'queues') return queueRows(valueOf(readings.queues) ?? []);
  if (screen === 'modules') return moduleRows(valueOf(readings.modules) ?? []);
  return [];
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
