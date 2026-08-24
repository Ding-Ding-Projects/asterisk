export const DATE_RANGE_SCHEMA_VERSION = 1;

export function localIsoDay(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp.slice(0, 10);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseInclusiveBoundary(value: string, endOfDay: boolean): Date {
  const candidate = /^\d{4}-\d{2}-\d{2}$/u.test(value)
    ? new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`)
    : new Date(value);
  if (Number.isNaN(candidate.getTime())) throw new Error(`Invalid date boundary: ${value}`);
  return candidate;
}
