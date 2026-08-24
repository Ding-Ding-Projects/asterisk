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
  if (cleanFrom && cleanTo && cleanFrom > cleanTo) return { ok: false, error: 'From date must be on or before To date.' };
  return { ok: true, ...(cleanFrom ? { from: cleanFrom } : {}), ...(cleanTo ? { to: cleanTo } : {}) };
}

export function dateRangeContains(date: string, range: InclusiveDateRange): boolean {
  return (!range.from || date >= range.from) && (!range.to || date <= range.to);
}
