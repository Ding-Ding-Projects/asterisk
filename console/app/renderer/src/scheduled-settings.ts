/**
 * Scheduled settings.
 *
 * A rule turns a set of settings overrides on for a while and off again automatically.
 * The design exists to prevent one specific failure: a temporary override quietly
 * becoming the user's permanent setting because nothing ever un-applies it. So every
 * function here is a pure, one-shot computation from a base snapshot plus whichever
 * rules currently match `now` -- nothing here mutates the base, and no rule is ever
 * "applied" by writing into storage. The moment `now` moves outside a rule's window,
 * that rule's effect is gone, because it was never persisted anywhere to begin with.
 *
 * Two more failures this guards against explicitly, because guessing about either is
 * worse than refusing to compute an answer:
 *
 *  - TIME ZONE. Every date and time in a rule is the wall-clock local time of whichever
 *    clock the caller supplies as `now`. This model never reads a clock, never converts
 *    a zone, and never assumes UTC -- it only compares the local fields `now` already
 *    carries (getFullYear/getMonth/getDate/getHours/getMinutes/getDay). Callers pass a
 *    `Date` built however their platform builds local time; this file trusts it.
 *  - PRECEDENCE. When several enabled rules match at once and set the same setting key,
 *    the LAST matching rule in the array wins. That is the whole rule: a plain,
 *    documented, testable ordering, rather than an unstated "whichever one the code
 *    happened to loop to last."
 *
 * "Every day" is represented as the sentinel `'everyday'`, never as seven duplicated
 * per-weekday rules -- so a rule that should run every day is one rule, not seven, and
 * cannot drift out of sync with itself if a caller edits six of the seven and forgets one.
 */

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Matches `Date#getDay()`: 0 is Sunday. */
export const WEEKDAYS: readonly Weekday[] = [0, 1, 2, 3, 4, 5, 6];

export type DaySelection = 'everyday' | readonly Weekday[];

export interface DateStamp {
  year: number;
  /** 1-12, not the zero-based month `Date` uses internally. */
  month: number;
  day: number;
}

export interface TimeStamp {
  hour: number;
  minute: number;
}

export interface ScheduledRule {
  id: string;
  label: string;
  enabled: boolean;
  /** Inclusive. Absent means "no lower bound". */
  startDate?: DateStamp;
  /** Inclusive. Absent means "no upper bound". */
  endDate?: DateStamp;
  startTime: TimeStamp;
  endTime: TimeStamp;
  days: DaySelection;
  /** Any schedulable setting, not only language -- caller decides what the keys mean. */
  settings: Record<string, string>;
}

export const TIMEZONE_NOTE =
  'Every date and time in a rule is the local wall-clock time of whichever Date the ' +
  'caller passes as "now"; this model never reads a clock or converts time zones itself.';

/* --- validation: every problem reported at once, never a guess ----------------------- */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidTime(value: unknown): value is TimeStamp {
  if (!isPlainObject(value)) return false;
  const { hour, minute } = value;
  return Number.isInteger(hour) && (hour as number) >= 0 && (hour as number) <= 23
    && Number.isInteger(minute) && (minute as number) >= 0 && (minute as number) <= 59;
}

function isValidDate(value: unknown): value is DateStamp {
  if (!isPlainObject(value)) return false;
  const { year, month, day } = value;
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if ((month as number) < 1 || (month as number) > 12) return false;
  if ((day as number) < 1 || (day as number) > 31) return false;
  // A date that Date itself would silently roll forward (31 April -> 1 May) is rejected
  // rather than normalised: silently moving a user's chosen date is exactly the kind of
  // guess this model refuses to make.
  const rolled = new Date(year as number, (month as number) - 1, day as number);
  return rolled.getFullYear() === year && rolled.getMonth() === (month as number) - 1
    && rolled.getDate() === day;
}

function dateKey(date: DateStamp): number {
  return date.year * 10000 + date.month * 100 + date.day;
}

/** Validates one rule against untyped input (JSON.parse output, storage, a form). */
export function validateRule(input: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isPlainObject(input)) {
    return { valid: false, errors: ['a rule must be an object'] };
  }
  const r = input;

  if (typeof r.id !== 'string' || r.id.trim() === '') errors.push('id must be a non-empty string');
  if (typeof r.label !== 'string' || r.label.trim() === '') errors.push('label must be a non-empty string');
  if (typeof r.enabled !== 'boolean') errors.push('enabled must be true or false');

  const startTimeValid = isValidTime(r.startTime);
  const endTimeValid = isValidTime(r.endTime);
  if (!startTimeValid) errors.push('startTime must have an hour 0-23 and a minute 0-59');
  if (!endTimeValid) errors.push('endTime must have an hour 0-23 and a minute 0-59');
  if (startTimeValid && endTimeValid) {
    const start = r.startTime as TimeStamp;
    const end = r.endTime as TimeStamp;
    if (start.hour === end.hour && start.minute === end.minute) {
      // A zero-width window can never match anything (see matchesAt). Reporting that here
      // is what stops the feature from shipping silently inert: a rule that validates
      // clean but can never once fire would otherwise look correct at every other check.
      errors.push('startTime and endTime must not be equal -- that window can never match');
    }
  }

  if (r.startDate !== undefined && !isValidDate(r.startDate)) errors.push('startDate is not a real calendar date');
  if (r.endDate !== undefined && !isValidDate(r.endDate)) errors.push('endDate is not a real calendar date');
  if (isValidDate(r.startDate) && isValidDate(r.endDate)
    && dateKey(r.startDate) > dateKey(r.endDate)) {
    errors.push('endDate is before startDate');
  }

  if (r.days === undefined) {
    errors.push('days must be "everyday" or a non-empty array of weekdays');
  } else if (r.days !== 'everyday') {
    if (!Array.isArray(r.days) || r.days.length === 0) {
      errors.push('days must be "everyday" or a non-empty array of weekdays');
    } else if (!r.days.every((d) => WEEKDAYS.includes(d as Weekday))) {
      errors.push('days contains a value that is not a weekday 0-6');
    } else if (new Set(r.days).size !== r.days.length) {
      errors.push('days contains a duplicate weekday');
    }
  }

  if (!isPlainObject(r.settings)) {
    errors.push('settings must be an object mapping setting key to a string value');
  } else if (!Object.values(r.settings).every((v) => typeof v === 'string')) {
    errors.push('every value in settings must be a string');
  }

  return { valid: errors.length === 0, errors };
}

/** Validates a whole list, including that identifiers are stable and unique within it. */
export function validateRuleSet(rules: readonly unknown[]): ValidationResult {
  const errors: string[] = [];
  const seenIds = new Set<string>();
  rules.forEach((rule, index) => {
    const result = validateRule(rule);
    for (const err of result.errors) errors.push(`rule ${index}: ${err}`);
    if (result.valid) {
      const id = (rule as ScheduledRule).id;
      if (seenIds.has(id)) errors.push(`rule ${index}: id "${id}" is already used by an earlier rule in this set`);
      seenIds.add(id);
    }
  });
  return { valid: errors.length === 0, errors };
}

/* --- matching: which rules apply at a given instant ----------------------------------- */

function timeToMinutes(time: TimeStamp): number {
  return time.hour * 60 + time.minute;
}

function dateOf(now: Date): DateStamp {
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

function addDays(date: DateStamp, delta: number): DateStamp {
  return dateOf(new Date(date.year, date.month - 1, date.day + delta));
}

function weekdayOf(date: DateStamp): Weekday {
  return new Date(date.year, date.month - 1, date.day).getDay() as Weekday;
}

function dayAllowed(date: DateStamp, days: DaySelection): boolean {
  return days === 'everyday' || days.includes(weekdayOf(date));
}

function inDateRange(date: DateStamp, rule: ScheduledRule): boolean {
  if (rule.startDate && dateKey(date) < dateKey(rule.startDate)) return false;
  if (rule.endDate && dateKey(date) > dateKey(rule.endDate)) return false;
  return true;
}

/**
 * Whether one rule is active at `now`.
 *
 * A window's weekday and date-range constraints are checked against the day the window
 * STARTS on, never the day it ends on. That is what makes a rule like "Monday 22:00 to
 * 02:00" behave the way a person means it: the whole window, including the part after
 * midnight on Tuesday, belongs to Monday. Two candidate start days are therefore checked
 * against `now`: today, for the part of a window that has not yet crossed midnight, and
 * yesterday, for the part of a window that crossed midnight before `now`.
 *
 * startTime === endTime is a zero-width window and never matches. validateRule refuses to
 * accept one, but this function stays defensive about it too, rather than trusting every
 * caller to have validated first.
 */
export function matchesAt(rule: ScheduledRule, now: Date): boolean {
  if (!rule.enabled) return false;

  const startMin = timeToMinutes(rule.startTime);
  const endMin = timeToMinutes(rule.endTime);
  if (startMin === endMin) return false;

  const today = dateOf(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  if (startMin < endMin) {
    // Same-day window: [startMin, endMin). endMin is exclusive, so a rule ending at
    // 09:00 has stopped applying by 09:00 itself.
    if (nowMin < startMin || nowMin >= endMin) return false;
    return dayAllowed(today, rule.days) && inDateRange(today, rule);
  }

  // startMin > endMin: the window crosses midnight.
  if (nowMin >= startMin) {
    // The late-night portion, still on the start day.
    return dayAllowed(today, rule.days) && inDateRange(today, rule);
  }
  if (nowMin < endMin) {
    // The after-midnight portion; the window's start day was yesterday.
    const yesterday = addDays(today, -1);
    return dayAllowed(yesterday, rule.days) && inDateRange(yesterday, rule);
  }
  return false;
}

/** Every enabled, currently-matching rule, in the same order they were given. */
export function matchingRules(rules: readonly ScheduledRule[], now: Date): ScheduledRule[] {
  return rules.filter((rule) => matchesAt(rule, now));
}

/* --- effective settings: base layered under whichever rules currently match ----------- */

export interface EffectiveSettings {
  /** Base settings with every matching rule's overrides layered on top. */
  values: Record<string, string>;
  /** Matched rule ids, in the order their overrides were applied (array order). */
  appliedRuleIds: string[];
  /** For each key a rule actually overrode, the id of the rule that won it. */
  sourceOf: Record<string, string>;
}

/**
 * Layers whichever rules match `now` over `base`, later rules in the array winning any
 * key more than one matching rule sets. `base` is never mutated and is not itself part of
 * the returned object, so the caller's permanent settings stay exactly what they were --
 * an override here can never silently become the base, because there is no path by which
 * it would ever be written back into it.
 */
export function effectiveSettings(
  base: Readonly<Record<string, string>>,
  rules: readonly ScheduledRule[],
  now: Date,
): EffectiveSettings {
  const matched = matchingRules(rules, now);
  const values: Record<string, string> = { ...base };
  const sourceOf: Record<string, string> = {};
  for (const rule of matched) {
    if (!rule.enabled) continue; // matchingRules already excludes these; kept as a second guard
    for (const [key, value] of Object.entries(rule.settings)) {
      values[key] = value;
      sourceOf[key] = rule.id;
    }
  }
  return { values, appliedRuleIds: matched.map((rule) => rule.id), sourceOf };
}

/* --- storage: an injected interface, never localStorage directly ---------------------- */

export interface ScheduleStorage {
  getItem(key: string): string | null | undefined;
  setItem(key: string, value: string): void;
}

export const SCHEDULE_STORAGE_KEY = 'console.scheduledSettings.rules';

/**
 * Reads the stored rule list, if any.
 *
 * Missing storage, an empty value, unparsable JSON, a non-array value, and any array
 * entry that fails validateRule all read as "no schedule" for that entry rather than
 * throwing -- an empty schedule is an explicit, tested state (see the test suite), not an
 * error condition. A rule that fails validation is dropped rather than trusted partially.
 */
export function loadRules(storage: ScheduleStorage | undefined): ScheduledRule[] {
  const raw = storage?.getItem(SCHEDULE_STORAGE_KEY);
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((item) => validateRule(item).valid) as ScheduledRule[];
}

export function saveRules(storage: ScheduleStorage, rules: readonly ScheduledRule[]): void {
  storage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(rules));
}
