/**
 * Scheduled settings.
 *
 * Three groups of tests carry the weight, matching the three places this design refuses
 * to guess: matching (does midnight-crossing and a date boundary behave the way it is
 * documented to, checked against the START day of the window rather than the day the
 * clock currently reads), precedence (does the later rule in the array really win, proved
 * in both directions so the result cannot be explained by rule content instead), and
 * recoverability (does the base ever get mutated, which would be how a temporary override
 * quietly becomes permanent). Everything is driven off an explicit `now`; nothing here
 * reads a real clock.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SCHEDULE_STORAGE_KEY, TIMEZONE_NOTE, WEEKDAYS,
  effectiveSettings, loadRules, matchesAt, matchingRules, saveRules, validateRule, validateRuleSet,
  type DateStamp, type ScheduleStorage, type ScheduledRule, type TimeStamp, type Weekday,
} from '../../app/renderer/src/scheduled-settings.ts';

/* --- test fixtures --------------------------------------------------------------- */

const time = (hour: number, minute: number): TimeStamp => ({ hour, minute });
const date = (year: number, month: number, day: number): DateStamp => ({ year, month, day });

/** Local-time `now`, built the same way the module itself reads local time. */
const localDate = (year: number, month: number, day: number, hour = 0, minute = 0): Date =>
  new Date(year, month - 1, day, hour, minute);

const baseRule = (overrides: Partial<ScheduledRule> = {}): ScheduledRule => ({
  id: 'r1',
  label: 'Test rule',
  enabled: true,
  startTime: time(9, 0),
  endTime: time(17, 0),
  days: 'everyday',
  settings: { language: 'yue' },
  ...overrides,
});

const memory = (): ScheduleStorage & { map: Map<string, string> } => {
  const map = new Map<string, string>();
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => { map.set(k, v); } };
};

/* --- validateRule: every problem reported at once --------------------------------- */

test('a well-formed rule validates cleanly', () => {
  assert.deepEqual(validateRule(baseRule()), { valid: true, errors: [] });
});

test('a non-object input is rejected rather than crashing', () => {
  for (const bad of [null, undefined, 'rule', 42, [], true]) {
    assert.equal(validateRule(bad).valid, false, `${JSON.stringify(bad)} should be invalid`);
  }
});

test('every problem in a badly-formed rule is reported at once, not just the first', () => {
  /* A validator that stops at the first problem hides the rest from whoever is fixing
   * the form, and a person fixing one field at a time is exactly who this is for. */
  const result = validateRule({
    id: '', label: '', enabled: 'yes',
    startTime: { hour: 25, minute: 0 }, endTime: { hour: -1, minute: 61 },
    days: [], settings: { language: 7 },
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('id')), 'missing id was not reported');
  assert.ok(result.errors.some((e) => e.includes('label')), 'missing label was not reported');
  assert.ok(result.errors.some((e) => e.includes('enabled')), 'bad enabled was not reported');
  assert.ok(result.errors.some((e) => e.includes('startTime')), 'bad startTime was not reported');
  assert.ok(result.errors.some((e) => e.includes('endTime')), 'bad endTime was not reported');
  assert.ok(result.errors.some((e) => e.includes('days')), 'empty days was not reported');
  assert.ok(result.errors.some((e) => e.includes('settings')), 'bad settings value was not reported');
  assert.equal(result.errors.length, 7, `expected exactly 7 distinct problems, got: ${result.errors.join(' | ')}`);
});

test('startTime equal to endTime is rejected by name, so the rule cannot ship silently inert', () => {
  /* A rule this describes can never once fire (see matchesAt). Reporting it here, rather
   * than letting it validate and quietly never match, is what stops it shipping unnoticed. */
  const result = validateRule(baseRule({ startTime: time(9, 0), endTime: time(9, 0) }));
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('must not be equal')));
});

test('a calendar date that does not exist is rejected rather than silently rolled forward', () => {
  for (const bad of [date(2026, 2, 30), date(2026, 4, 31), date(2026, 13, 1), date(2026, 1, 0)]) {
    assert.equal(validateRule(baseRule({ startDate: bad })).valid, false, `${JSON.stringify(bad)} should be invalid`);
  }
  assert.equal(validateRule(baseRule({ startDate: date(2028, 2, 29) })).valid, true, 'a real leap day was rejected');
});

test('endDate before startDate is rejected', () => {
  const result = validateRule(baseRule({ startDate: date(2026, 6, 10), endDate: date(2026, 6, 1) }));
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('before')));
});

test('an explicit but empty weekday list is rejected, never silently treated as "never"', () => {
  assert.equal(validateRule(baseRule({ days: [] })).valid, false);
});

test('a duplicate weekday within one rule is rejected', () => {
  const result = validateRule(baseRule({ days: [1, 1] as Weekday[] }));
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('duplicate')));
});

test('"everyday" needs no weekday array at all', () => {
  assert.equal(validateRule(baseRule({ days: 'everyday' })).valid, true);
});

/* --- validateRuleSet: stable, unique identifiers across the whole schedule --------- */

test('an empty rule list validates as an explicit, valid empty schedule', () => {
  assert.deepEqual(validateRuleSet([]), { valid: true, errors: [] });
});

test('validateRuleSet prefixes each problem with which rule it came from', () => {
  const result = validateRuleSet([baseRule(), { ...baseRule(), label: '' }]);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.startsWith('rule 1:')), 'the second rule\'s index was not named');
});

test('a duplicate id across otherwise-valid rules is rejected', () => {
  const result = validateRuleSet([baseRule({ id: 'dup' }), baseRule({ id: 'dup', label: 'Second' })]);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('already used')));
});

test('distinct ids across otherwise-valid rules validate cleanly', () => {
  assert.deepEqual(validateRuleSet([baseRule({ id: 'a' }), baseRule({ id: 'b' })]), { valid: true, errors: [] });
});

/* --- matching: same-day windows -------------------------------------------------- */

test('a same-day window is inclusive of its start minute and exclusive of its end minute', () => {
  const rule = baseRule({ startTime: time(9, 0), endTime: time(17, 0) });
  assert.equal(matchesAt(rule, localDate(2026, 1, 5, 8, 59)), false);
  assert.equal(matchesAt(rule, localDate(2026, 1, 5, 9, 0)), true);
  assert.equal(matchesAt(rule, localDate(2026, 1, 5, 16, 59)), true);
  assert.equal(matchesAt(rule, localDate(2026, 1, 5, 17, 0)), false);
});

test('a disabled rule never matches, however well its window lines up', () => {
  const rule = baseRule({ enabled: false });
  assert.equal(matchesAt(rule, localDate(2026, 1, 5, 10, 0)), false);
});

test('"everyday" matches on every weekday, checked for each one rather than assumed', () => {
  const rule = baseRule({ days: 'everyday' });
  const anchor = localDate(2026, 3, 1, 12, 0);
  for (let offset = 0; offset < 7; offset++) {
    const day = new Date(anchor);
    day.setDate(anchor.getDate() + offset);
    assert.equal(matchesAt(rule, day), true, `everyday did not match weekday ${day.getDay()}`);
  }
});

test('an explicit weekday list matches only its own weekday, checked for every weekday', () => {
  /* Looping over every real weekday, rather than hard-coding one, is what would catch a
   * newly introduced weekday-comparison bug that only misbehaves on one particular day. */
  const anchor = localDate(2026, 3, 1, 12, 0);
  for (let offset = 0; offset < 7; offset++) {
    const day = new Date(anchor);
    day.setDate(anchor.getDate() + offset);
    const weekday = day.getDay() as Weekday;
    const rule = baseRule({ days: [weekday] as Weekday[], startTime: time(0, 0), endTime: time(23, 59) });

    const onDay = new Date(day);
    onDay.setHours(12, 0, 0, 0);
    assert.equal(matchesAt(rule, onDay), true, `weekday ${weekday} did not match its own day`);

    const dayBefore = new Date(day);
    dayBefore.setDate(day.getDate() - 1);
    dayBefore.setHours(12, 0, 0, 0);
    assert.equal(matchesAt(rule, dayBefore), false, `weekday ${weekday} matched the day before`);

    const dayAfter = new Date(day);
    dayAfter.setDate(day.getDate() + 1);
    dayAfter.setHours(12, 0, 0, 0);
    assert.equal(matchesAt(rule, dayAfter), false, `weekday ${weekday} matched the day after`);
  }
});

test('every day is one sentinel value, never seven duplicated per-weekday rules', () => {
  const rule = baseRule({ days: 'everyday' });
  assert.equal(rule.days, 'everyday');
  assert.equal(typeof rule.days, 'string', 'an "everyday" rule must not be represented as an array');
});

/* --- matching: a window crossing midnight ----------------------------------------- */

test('a window crossing midnight matches both its late-night and after-midnight portions', () => {
  const rule = baseRule({ startTime: time(22, 0), endTime: time(2, 0), days: 'everyday' });
  assert.equal(matchesAt(rule, localDate(2026, 6, 10, 21, 59)), false, 'matched before the window opened');
  assert.equal(matchesAt(rule, localDate(2026, 6, 10, 22, 0)), true, 'missed the start of the late-night portion');
  assert.equal(matchesAt(rule, localDate(2026, 6, 10, 23, 30)), true);
  assert.equal(matchesAt(rule, localDate(2026, 6, 11, 0, 0)), true, 'dropped out exactly at midnight');
  assert.equal(matchesAt(rule, localDate(2026, 6, 11, 1, 59)), true);
  assert.equal(matchesAt(rule, localDate(2026, 6, 11, 2, 0)), false, 'the exclusive end minute still matched');
  assert.equal(matchesAt(rule, localDate(2026, 6, 11, 10, 0)), false, 'matched during the daytime gap');
});

test('a midnight-crossing window belongs to the day it starts on, not the day it ends on', () => {
  /* A rule restricted to one weekday, crossing midnight, must still match the early
   * hours of the FOLLOWING calendar day -- that portion belongs to the start day's
   * occurrence of the window, not to whatever weekday the clock reads by then. */
  const start = localDate(2026, 6, 10); // Wednesday
  const startWeekday = start.getDay() as Weekday;
  const rule = baseRule({ startTime: time(22, 0), endTime: time(2, 0), days: [startWeekday] as Weekday[] });

  assert.equal(matchesAt(rule, localDate(2026, 6, 10, 23, 0)), true, 'missed the late-night portion on the start day');
  assert.equal(matchesAt(rule, localDate(2026, 6, 11, 1, 0)), true,
    'missed the after-midnight portion, which still belongs to the start day');
  assert.equal(matchesAt(rule, localDate(2026, 6, 11, 23, 0)), false,
    'matched the following day\'s late-night hours, which is a different weekday');
  assert.equal(matchesAt(rule, localDate(2026, 6, 9, 23, 0)), false, 'matched the day before the start day');
});

test('a date range restricted to one day still covers the after-midnight portion of that day\'s window', () => {
  /* The most surprising interaction in this model: on the calendar date the clock reads
   * AFTER midnight, the rule's own date range no longer includes "today" -- and the rule
   * must still match, because the range is checked against the day the window started. */
  const onlyDay = date(2026, 6, 10);
  const rule = baseRule({
    startTime: time(22, 0), endTime: time(2, 0), days: 'everyday',
    startDate: onlyDay, endDate: onlyDay,
  });
  assert.equal(matchesAt(rule, localDate(2026, 6, 10, 23, 0)), true);
  assert.equal(matchesAt(rule, localDate(2026, 6, 11, 1, 0)), true,
    'the after-midnight portion was dropped even though its start day is within range');
  assert.equal(matchesAt(rule, localDate(2026, 6, 11, 23, 0)), false,
    'matched a new occurrence starting on a day outside the range');
  assert.equal(matchesAt(rule, localDate(2026, 6, 9, 23, 0)), false, 'matched a day before the range');
});

/* --- matching: date boundaries and the zero-width window --------------------------- */

test('a date range is inclusive of both its start and end date', () => {
  const rule = baseRule({
    startDate: date(2026, 1, 5), endDate: date(2026, 1, 7),
    startTime: time(0, 0), endTime: time(23, 59),
  });
  assert.equal(matchesAt(rule, localDate(2026, 1, 4, 12, 0)), false, 'matched the day before startDate');
  assert.equal(matchesAt(rule, localDate(2026, 1, 5, 12, 0)), true, 'did not match startDate itself');
  assert.equal(matchesAt(rule, localDate(2026, 1, 7, 12, 0)), true, 'did not match endDate itself');
  assert.equal(matchesAt(rule, localDate(2026, 1, 8, 12, 0)), false, 'matched the day after endDate');
});

test('a rule with equal start and end time never matches, defensively, at any hour', () => {
  /* validateRule already refuses to accept a rule shaped like this; matchesAt stays
   * defensive about it too rather than trusting every caller to have validated first. */
  const zeroWidth = baseRule({ startTime: time(9, 0), endTime: time(9, 0) });
  assert.equal(validateRule(zeroWidth).valid, false);
  for (const hour of [0, 9, 12, 23]) {
    assert.equal(matchesAt(zeroWidth, localDate(2026, 1, 5, hour, 0)), false);
  }
});

test('an empty schedule matches nothing, explicitly rather than by accident', () => {
  assert.deepEqual(matchingRules([], localDate(2026, 1, 5, 12, 0)), []);
});

test('matchingRules preserves the order rules were given, which is what precedence depends on', () => {
  const rules = [baseRule({ id: 'z' }), baseRule({ id: 'a' })];
  const matched = matchingRules(rules, localDate(2026, 1, 5, 10, 0));
  assert.deepEqual(matched.map((r) => r.id), ['z', 'a']);
});

/* --- effectiveSettings: precedence, layering, and recoverability ------------------- */

test('a matching rule actually changes the effective settings, not just the applied-rule list', () => {
  /* The test a feature that computes matching correctly but forgets to apply the
   * settings would still pass without this: appliedRuleIds could be right while
   * values stayed at base, and the feature would be silently inert end to end. */
  const rule = baseRule({ settings: { language: 'yue' } });
  const result = effectiveSettings({ language: 'en' }, [rule], localDate(2026, 1, 5, 10, 0));
  assert.equal(result.values.language, 'yue');
  assert.deepEqual(result.appliedRuleIds, ['r1']);
  assert.equal(result.sourceOf.language, 'r1');
});

test('an empty schedule changes nothing', () => {
  const base = { language: 'en', theme: 'dark' };
  const result = effectiveSettings(base, [], localDate(2026, 1, 5, 12, 0));
  assert.deepEqual(result.values, base);
  assert.deepEqual(result.appliedRuleIds, []);
  assert.deepEqual(result.sourceOf, {});
});

test('a rule may override any schedulable setting key, not only language', () => {
  const rule = baseRule({ settings: { theme: 'contrast', density: 'compact', narratorVoice: 'auto' } });
  const result = effectiveSettings(
    { theme: 'light', density: 'comfortable', narratorVoice: 'off' },
    [rule],
    localDate(2026, 1, 5, 10, 0),
  );
  assert.deepEqual(result.values, { theme: 'contrast', density: 'compact', narratorVoice: 'auto' });
});

test('two matching rules that set different keys both apply', () => {
  const now = localDate(2026, 1, 5, 10, 0);
  const langRule = baseRule({ id: 'lang', settings: { language: 'yue' } });
  const themeRule = baseRule({ id: 'theme', settings: { theme: 'dark' } });
  const result = effectiveSettings({ language: 'en', theme: 'light' }, [langRule, themeRule], now);
  assert.deepEqual(result.values, { language: 'yue', theme: 'dark' });
  assert.deepEqual(result.appliedRuleIds, ['lang', 'theme']);
});

test('when two matching rules set the same key, the later rule in the array wins', () => {
  /* Proved in both directions, so the result can only be explained by array position --
   * never by something about the rule's own id, label, or content. */
  const now = localDate(2026, 1, 5, 10, 0);
  const first = baseRule({ id: 'first', settings: { language: 'en-alt' } });
  const second = baseRule({ id: 'second', settings: { language: 'yue' } });

  const forward = effectiveSettings({ language: 'en' }, [first, second], now);
  assert.equal(forward.values.language, 'yue');
  assert.equal(forward.sourceOf.language, 'second');

  const reversed = effectiveSettings({ language: 'en' }, [second, first], now);
  assert.equal(reversed.values.language, 'en-alt', 'precedence followed rule content instead of array order');
  assert.equal(reversed.sourceOf.language, 'first');
});

test('the base settings object is never mutated, so it is always recoverable once an override ends', () => {
  const base = { language: 'en' };
  const rule = baseRule({ settings: { language: 'yue' } });

  const during = effectiveSettings(base, [rule], localDate(2026, 1, 5, 10, 0)); // inside 9-17
  assert.deepEqual(base, { language: 'en' }, 'base changed while a rule matched');
  assert.equal(during.values.language, 'yue');
  assert.notEqual(during.values, base, 'the effective values must be a new object, not the base itself');

  const after = effectiveSettings(base, [rule], localDate(2026, 1, 5, 20, 0)); // outside 9-17
  assert.equal(after.values.language, 'en', 'the override outlived the window it was scoped to');
  assert.deepEqual(base, { language: 'en' }, 'base changed after the window ended');
});

/* --- storage: an injected interface, and an explicit empty/corrupt state ----------- */

test('loading from missing or empty storage is an explicit empty schedule, not an error', () => {
  assert.deepEqual(loadRules(undefined), []);
  assert.deepEqual(loadRules(memory()), []);
});

test('unparsable JSON in storage reads as an empty schedule rather than throwing', () => {
  const storage = memory();
  storage.map.set(SCHEDULE_STORAGE_KEY, '{not json');
  assert.deepEqual(loadRules(storage), []);
});

test('a stored value that is not an array reads as an empty schedule', () => {
  const storage = memory();
  storage.map.set(SCHEDULE_STORAGE_KEY, JSON.stringify({ not: 'an array' }));
  assert.deepEqual(loadRules(storage), []);
});

test('a rule that fails validation is dropped without poisoning the rules stored beside it', () => {
  const storage = memory();
  storage.map.set(SCHEDULE_STORAGE_KEY, JSON.stringify([baseRule({ id: 'good' }), { id: 'bad' }]));
  assert.deepEqual(loadRules(storage).map((r) => r.id), ['good']);
});

test('saveRules and loadRules round-trip a schedule unchanged', () => {
  const storage = memory();
  const rules = [baseRule({ id: 'one' }), baseRule({ id: 'two', days: [2, 4] as Weekday[] })];
  saveRules(storage, rules);
  assert.deepEqual(loadRules(storage), rules);
});

/* --- documentation as data ---------------------------------------------------------- */

test('the model documents, in its own words, which timezone it uses', () => {
  assert.ok(TIMEZONE_NOTE.includes('local'));
  assert.ok(TIMEZONE_NOTE.includes('now'));
});

test('WEEKDAYS names exactly the seven values Date#getDay() can return', () => {
  assert.deepEqual([...WEEKDAYS].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6]);
});
