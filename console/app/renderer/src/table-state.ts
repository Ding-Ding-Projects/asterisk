import type { Observation } from '../../../shared/control-plane';

export const UNREAD_MARKER = '—';

export type TableCellState = 'read' | 'unread' | 'unavailable';

export interface TableCell {
  readonly value: string;
  readonly state: TableCellState;
  readonly source?: string;
  readonly observedAt?: string;
  readonly reason?: string;
  readonly accessibleProvenance: string;
}

export interface TableReading<T> {
  readonly command: string;
  readonly result: Observation<T>;
}

export type TableSourceState = 'unread' | 'read' | 'verified-empty' | 'unavailable';

export interface TableSourceStatus {
  readonly key: string;
  readonly command?: string;
  readonly state: TableSourceState;
  readonly observedAt?: string;
  readonly reason?: string;
}

export type DestinationTableState = 'unread' | 'verified-empty' | 'read' | 'partial' | 'unavailable';

export interface DestinationTable {
  readonly destination: string;
  readonly state: DestinationTableState;
  readonly rows: ReadonlyArray<ReadonlyArray<TableCell>>;
  readonly sources: ReadonlyArray<TableSourceStatus>;
  readonly summary: string;
  readonly observedAt?: string;
}

export const readCell = (value: unknown, source: string, observedAt: string): TableCell => ({
  value: String(value),
  state: 'read',
  source,
  observedAt,
  accessibleProvenance: `${String(value)}. Read from ${source} at ${observedAt}.`,
});

export const unreadCell = (reason: string, source?: string): TableCell => ({
  value: UNREAD_MARKER,
  state: 'unread',
  source,
  reason,
  accessibleProvenance: `Not read. ${reason}`,
});

export const unavailableCell = (reason: string, source?: string, observedAt?: string): TableCell => ({
  value: UNREAD_MARKER,
  state: 'unavailable',
  source,
  observedAt,
  reason,
  accessibleProvenance: `Unavailable. ${reason}`,
});

function collectionLength(value: unknown): number | undefined {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === 'object' && Array.isArray((value as { users?: unknown }).users)) {
    return ((value as { users: unknown[] }).users).length;
  }
  return undefined;
}

export function sourceStatus<T>(key: string, reading: TableReading<T> | undefined): TableSourceStatus {
  if (!reading) return { key, state: 'unread', reason: `${key} has not been requested.` };
  if (reading.result.state === 'unavailable') {
    return {
      key,
      command: reading.command,
      state: 'unavailable',
      observedAt: reading.result.observedAt,
      reason: reading.result.reason,
    };
  }
  return {
    key,
    command: reading.command,
    state: collectionLength(reading.result.value) === 0 ? 'verified-empty' : 'read',
    observedAt: reading.result.observedAt,
  };
}

/** Aggregates every command required by one destination without hiding partial results. */
export function aggregateTableState(
  destination: string,
  sources: ReadonlyArray<TableSourceStatus>,
  rows: ReadonlyArray<ReadonlyArray<TableCell>>,
): DestinationTable {
  const unread = sources.filter((source) => source.state === 'unread');
  const unavailable = sources.filter((source) => source.state === 'unavailable');
  const observed = sources.filter((source) => source.state === 'read' || source.state === 'verified-empty');
  const timestamps = sources.map((source) => source.observedAt).filter((value): value is string => !!value).sort();

  let state: DestinationTableState;
  if (observed.length === 0 && unavailable.length === 0) state = 'unread';
  else if (observed.length === 0 && unavailable.length > 0 && unread.length === 0) state = 'unavailable';
  else if (unread.length > 0 || unavailable.length > 0) state = 'partial';
  else if (rows.length === 0) state = 'verified-empty';
  else state = 'read';

  const details = sources.map((source) => {
    const command = source.command ? `${source.command}: ` : '';
    return `${command}${source.state}${source.reason ? ` (${source.reason})` : ''}`;
  });

  const summary = state === 'verified-empty'
    ? 'The required commands completed and returned no rows.'
    : state === 'read'
      ? `${rows.length} row${rows.length === 1 ? '' : 's'} read from the selected target.`
      : state === 'unread'
        ? 'The required commands have not been read from the selected target.'
        : state === 'unavailable'
          ? `No required command returned data. ${details.join('; ')}`
          : `Some required commands did not return data. ${details.join('; ')}`;

  return {
    destination,
    state,
    rows,
    sources,
    summary,
    observedAt: timestamps.at(-1),
  };
}

export function displayRows(table: DestinationTable): string[][] {
  return table.rows.map((row) => row.map((cell) => cell.value));
}
