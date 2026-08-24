export const DATE_RANGE_SCHEMA_VERSION = 1;

export interface NormalizedLocalDateInterval {
  fromDay?: string;
  toDay?: string;
  fromMs?: number;
  toMs?: number;
}

export function localIsoDay(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp.slice(0, 10);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseInclusiveBoundary(value: string, endOfDay: boolean): Date {
  const dayMatch = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  const candidate = dayMatch
    ? new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`)
    : new Date(value);
  if (Number.isNaN(candidate.getTime())) throw new Error(`Invalid date boundary: ${value}`);
  if (dayMatch && (candidate.getFullYear() !== Number(dayMatch[1]) || candidate.getMonth() + 1 !== Number(dayMatch[2]) || candidate.getDate() !== Number(dayMatch[3]))) {
    throw new Error(`Invalid date boundary: ${value}`);
  }
  return candidate;
}

export function normalizeLocalDateInterval(from = '', to = ''): NormalizedLocalDateInterval {
  const cleanFrom = from.trim();
  const cleanTo = to.trim();
  const fromDate = cleanFrom ? parseInclusiveBoundary(cleanFrom, false) : undefined;
  const toDate = cleanTo ? parseInclusiveBoundary(cleanTo, true) : undefined;
  if (fromDate && toDate && fromDate.getTime() > toDate.getTime()) {
    throw new Error('From date must be on or before To date.');
  }
  return {
    ...(cleanFrom ? { fromDay: localIsoDay(fromDate!.toISOString()), fromMs: fromDate!.getTime() } : {}),
    ...(cleanTo ? { toDay: localIsoDay(toDate!.toISOString()), toMs: toDate!.getTime() } : {}),
  };
}
