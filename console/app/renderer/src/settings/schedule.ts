import type {
  ScheduleRule,
  ScheduledSettingTarget,
  ScheduledValue,
  Weekday,
} from '../../../../shared/settings-schema';

export interface ScheduleSourceStates {
  /** External rules activate only when the privileged source reader reports true. */
  readonly [ruleId: string]: boolean | undefined;
}

export interface ScheduleEvaluation {
  overrides: Partial<Record<ScheduledSettingTarget, ScheduledValue>>;
  ruleForTarget: Partial<Record<ScheduledSettingTarget, string>>;
  activeRuleIds: string[];
}

interface ZonedParts {
  date: string;
  weekday: Weekday;
  minutes: number;
}

const weekdayByName: Record<string, Weekday> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

function zonedParts(at: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short',
  }).formatToParts(at);
  const part = (type: 'year' | 'month' | 'day' | 'hour' | 'minute' | 'weekday'): string =>
    parts.find((entry) => entry.type === type)?.value ?? '';
  const hour = Number(part('hour'));
  const minute = Number(part('minute'));
  return {
    date: `${part('year')}-${part('month')}-${part('day')}`,
    weekday: weekdayByName[part('weekday')] ?? 0,
    minutes: hour * 60 + minute,
  };
}

function minutes(value: string): number {
  const [hour, minute] = value.split(':').map(Number);
  return hour! * 60 + minute!;
}

function previousDate(date: string): string {
  const instant = new Date(`${date}T00:00:00Z`);
  instant.setUTCDate(instant.getUTCDate() - 1);
  return instant.toISOString().slice(0, 10);
}

function weekdayMatches(rule: ScheduleRule, weekday: Weekday): boolean {
  return rule.weekdays === 'every-day' || rule.weekdays.includes(weekday);
}

function dateMatches(rule: ScheduleRule, date: string): boolean {
  return (!rule.startDate || date >= rule.startDate) && (!rule.endDate || date <= rule.endDate);
}

/**
 * Equal start/end times mean a full-day window. Cross-midnight windows attribute the
 * after-midnight portion to the weekday and date on which that window began.
 */
export function scheduleRuleMatches(rule: ScheduleRule, at: Date, timeZone: string): boolean {
  if (!rule.enabled) return false;
  const local = zonedParts(at, timeZone);
  const start = minutes(rule.startTime);
  const end = minutes(rule.endTime);
  if (start === end) return dateMatches(rule, local.date) && weekdayMatches(rule, local.weekday);
  if (start < end) {
    return local.minutes >= start && local.minutes < end
      && dateMatches(rule, local.date)
      && weekdayMatches(rule, local.weekday);
  }
  if (local.minutes >= start) return dateMatches(rule, local.date) && weekdayMatches(rule, local.weekday);
  if (local.minutes < end) {
    const startDate = previousDate(local.date);
    const startWeekday = ((local.weekday + 6) % 7) as Weekday;
    return dateMatches(rule, startDate) && weekdayMatches(rule, startWeekday);
  }
  return false;
}

/** Deterministic precedence: higher priority wins, then later list position. */
export function evaluateSchedule(
  rules: readonly ScheduleRule[],
  timeZone: string,
  at: Date,
  sourceStates: ScheduleSourceStates = {},
): ScheduleEvaluation {
  const matched = rules
    .map((rule, index) => ({ rule, index }))
    .filter(({ rule }) => scheduleRuleMatches(rule, at, timeZone))
    .filter(({ rule }) => rule.source.kind === 'local' || sourceStates[rule.id] === true)
    .sort((left, right) => left.rule.priority - right.rule.priority || left.index - right.index);

  const overrides: Partial<Record<ScheduledSettingTarget, ScheduledValue>> = {};
  const ruleForTarget: Partial<Record<ScheduledSettingTarget, string>> = {};
  for (const { rule } of matched) {
    for (const assignment of rule.assignments) {
      overrides[assignment.target] = assignment.value;
      ruleForTarget[assignment.target] = rule.id;
    }
  }
  return { overrides, ruleForTarget, activeRuleIds: matched.map(({ rule }) => rule.id) };
}
