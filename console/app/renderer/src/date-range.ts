import { localIsoDay, normalizeLocalDateInterval } from '../../../shared/date-range';

/** Shared inclusive ISO date-range semantics for History and Changelog screens. */
export interface InclusiveDateRange {
  from?: string;
  to?: string;
}

export interface DateRangeValidation {
  ok: boolean;
  from?: string;
  to?: string;
  error?: string;
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateInclusiveDateRange(from: string, to: string): DateRangeValidation {
  const cleanFrom = from.trim();
  const cleanTo = to.trim();
  if (cleanFrom && !isIsoDate(cleanFrom)) return { ok: false, error: 'From date must use a valid YYYY-MM-DD calendar date.' };
  if (cleanTo && !isIsoDate(cleanTo)) return { ok: false, error: 'To date must use a valid YYYY-MM-DD calendar date.' };
  try {
    const normalized = normalizeLocalDateInterval(cleanFrom, cleanTo);
    return { ok: true, ...(normalized.fromDay ? { from: normalized.fromDay } : {}), ...(normalized.toDay ? { to: normalized.toDay } : {}) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'The date range is invalid.' };
  }
}

export function dateRangeContains(date: string, range: InclusiveDateRange): boolean {
  return (!range.from || date >= range.from) && (!range.to || date <= range.to);
}

export { localIsoDay };

export interface CalendarDay {
  iso: string;
  label: string;
  inMonth: boolean;
}

export function calendarDays(month: string): CalendarDay[] {
  const match = /^(\d{4})-(\d{2})$/u.exec(month);
  const year = match ? Number(match[1]) : new Date().getFullYear();
  const monthIndex = match ? Number(match[2]) - 1 : new Date().getMonth();
  const first = new Date(year, monthIndex, 1);
  const start = new Date(year, monthIndex, 1 - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    const pad = (value: number) => String(value).padStart(2, '0');
    return { iso: `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`, label: String(day.getDate()), inMonth: day.getMonth() === monthIndex };
  });
}

export function shiftCalendarMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const value = new Date(year || new Date().getFullYear(), (monthNumber || new Date().getMonth() + 1) - 1 + delta, 1);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
}
