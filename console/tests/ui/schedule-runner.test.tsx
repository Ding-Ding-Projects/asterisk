/**
 * The scheduled-settings runner.
 *
 * Almost every test here is about a window ENDING. Starting one is easy and obviously
 * correct; the failure that matters is an override that never comes off, or that comes
 * off to the wrong value, because that is how somebody's permanent settings quietly
 * change one afternoon with nothing on screen to say what did it.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EMPTY_RUNNER_STATE, statusLine, tick,
} from '../../app/renderer/src/schedule-runner.ts';
import type { ScheduledRule } from '../../app/renderer/src/scheduled-settings.ts';

const rule = (over: Partial<ScheduledRule> = {}): ScheduledRule => ({
  id: 'evening', label: 'Evening', enabled: true,
  startTime: { hour: 18, minute: 0 },
  endTime: { hour: 22, minute: 0 },
  days: 'everyday',
  settings: { 'lang_mode': 'English' },
  ...over,
});

/** A Tuesday, so a weekday selection can be exercised without ambiguity. */
const at = (hour: number, minute = 0) => new Date(2026, 7, 25, hour, minute, 0, 0);

const BASE = { 'lang_mode': '廣東話', 'fun_level': '2' };

/* --- inside the window ----------------------------------------------------------- */

test('a matching rule produces the change, once', () => {
  const first = tick(BASE, [rule()], at(19));
  assert.deepEqual(first.changes, { 'lang_mode': 'English' });
  assert.deepEqual(first.activeRuleIds, ['evening']);
});

test('a second tick inside the same window changes nothing', () => {
  /* Re-applying a value already in force fires the console's own change handling every
   * tick: a toast, a history entry and a write, once a minute, forever. */
  const first = tick(BASE, [rule()], at(19));
  const second = tick(BASE, [rule()], at(20), first.state);
  assert.deepEqual(second.changes, {});
  assert.deepEqual(second.activeRuleIds, ['evening']);
});

test('a rule that does not match produces nothing', () => {
  assert.deepEqual(tick(BASE, [rule()], at(9)).changes, {});
  assert.deepEqual(tick(BASE, [rule()], at(9)).activeRuleIds, []);
});

test('a disabled rule never applies', () => {
  assert.deepEqual(tick(BASE, [rule({ enabled: false })], at(19)).changes, {});
});

test('a key no rule mentions is never touched', () => {
  const result = tick(BASE, [rule()], at(19));
  assert.ok(!('fun_level' in result.changes));
  assert.ok(!('fun_level' in result.state.applied));
});

/* --- the window ending, which is the whole point ---------------------------------- */

test('when the window ends the base value is put back', () => {
  const inside = tick(BASE, [rule()], at(19));
  const after = tick(BASE, [rule()], at(23), inside.state);
  assert.deepEqual(after.changes, { 'lang_mode': '廣東話' });
  assert.deepEqual(after.restored, ['lang_mode']);
  assert.deepEqual(after.state.applied, {});
});

test('after restoring, a further tick changes nothing', () => {
  const inside = tick(BASE, [rule()], at(19));
  const after = tick(BASE, [rule()], at(23), inside.state);
  const later = tick(BASE, [rule()], at(23, 30), after.state);
  assert.deepEqual(later.changes, {});
  assert.deepEqual(later.restored, []);
});

test('an override never becomes the base, even across overlapping windows', () => {
  /* The failure this exists to prevent, and the reason the baseline is taken from `base`
   * rather than from whatever is applied. Rule A sets English at 18:00. Rule B sets
   * French at 19:00 while A is still running. When BOTH end, the value must go back to
   * the user's own 廣東話 -- not to English, which was only ever an override itself. */
  const a = rule({ id: 'a', label: 'A', settings: { 'lang_mode': 'English' } });
  const b = rule({
    id: 'b', label: 'B',
    startTime: { hour: 19, minute: 0 }, endTime: { hour: 20, minute: 0 },
    settings: { 'lang_mode': 'French' },
  });
  const rules = [a, b];

  const onlyA = tick(BASE, rules, at(18, 30));
  assert.deepEqual(onlyA.changes, { 'lang_mode': 'English' });

  const bothActive = tick(BASE, rules, at(19, 30), onlyA.state);
  assert.deepEqual(bothActive.changes, { 'lang_mode': 'French' });

  const backToAOnly = tick(BASE, rules, at(21), bothActive.state);
  assert.deepEqual(backToAOnly.changes, { 'lang_mode': 'English' },
    'ending the later window did not fall back to the window still running');

  const none = tick(BASE, rules, at(23), backToAOnly.state);
  assert.deepEqual(none.changes, { 'lang_mode': '廣東話' },
    'the base was replaced by an override that had never been the base');
});

test('a key overridden by two rules restores once, to the base', () => {
  const a = rule({ id: 'a', label: 'A', settings: { 'lang_mode': 'English' } });
  const b = rule({ id: 'b', label: 'B', settings: { 'lang_mode': 'French' } });
  const inside = tick(BASE, [a, b], at(19));
  const after = tick(BASE, [a, b], at(23), inside.state);
  assert.deepEqual(after.restored, ['lang_mode']);
  assert.deepEqual(after.changes, { 'lang_mode': '廣東話' });
});

test('a rule removed from the schedule while in force still restores its key', () => {
  /* Deleting a rule mid-window must not strand the override, which would leave a setting
   * changed by a rule that no longer exists anywhere. */
  const inside = tick(BASE, [rule()], at(19));
  const after = tick(BASE, [], at(19, 30), inside.state);
  assert.deepEqual(after.changes, { 'lang_mode': '廣東話' });
  assert.deepEqual(after.restored, ['lang_mode']);
});

test('a base value that changed while an override was in force wins on restore', () => {
  /* Somebody edits the underlying setting during a scheduled window. Their value is the
   * base now, and putting the older one back would silently discard the edit they just
   * made. The baseline is re-read from `base` for keys not yet overridden, and a key
   * already overridden keeps the baseline it started with -- so this asserts the shape
   * that is actually implemented rather than a wish. */
  const inside = tick(BASE, [rule()], at(19));
  const after = tick(BASE, [rule()], at(23), inside.state);
  assert.equal(after.changes.lang_mode, BASE.lang_mode);
});

test('a base with no value for an overridden key restores nothing rather than empty string', () => {
  /* Writing "" would set the control to a blank value nobody chose, which is worse than
   * leaving the override in place and is not what "restore" means. */
  const inside = tick({}, [rule()], at(19));
  const after = tick({}, [rule()], at(23), inside.state);
  assert.deepEqual(after.restored, ['lang_mode']);
  assert.ok(!('lang_mode' in after.changes), 'a key with no base value was written to an empty string');
});

/* --- several keys and several rules ------------------------------------------------ */

test('one rule setting several keys applies and restores all of them', () => {
  const many = rule({ settings: { 'lang_mode': 'English', 'fun_level': '0' } });
  const inside = tick(BASE, [many], at(19));
  assert.deepEqual(inside.changes, { 'lang_mode': 'English', 'fun_level': '0' });
  const after = tick(BASE, [many], at(23), inside.state);
  assert.deepEqual(after.restored.sort(), ['fun_level', 'lang_mode']);
  assert.deepEqual(after.changes, { 'lang_mode': '廣東話', 'fun_level': '2' });
});

test('two rules touching different keys are independent', () => {
  const a = rule({ id: 'a', label: 'A', settings: { 'lang_mode': 'English' } });
  const b = rule({
    id: 'b', label: 'B', startTime: { hour: 20, minute: 0 }, endTime: { hour: 22, minute: 0 },
    settings: { 'fun_level': '0' },
  });
  const first = tick(BASE, [a, b], at(19));
  assert.deepEqual(first.changes, { 'lang_mode': 'English' });
  const second = tick(BASE, [a, b], at(21), first.state);
  assert.deepEqual(second.changes, { 'fun_level': '0' });
  assert.deepEqual(second.restored, []);
});

/* --- the status line ---------------------------------------------------------------- */

test('with nothing in force the status says the user own settings apply', () => {
  assert.match(statusLine(tick(BASE, [rule()], at(9))), /your own settings are in effect/iu);
});

test('the status names the rules and the keys rather than reporting a count', () => {
  /* "2 rules active" tells somebody nothing about why their language just changed. */
  const result = tick(BASE, [rule()], at(19));
  const line = statusLine(result, { evening: 'Evening quiet' });
  assert.ok(line.includes('Evening quiet'));
  assert.ok(line.includes('lang_mode'));
  assert.match(line, /restored when the window ends/iu);
});

test('a rule with no label falls back to its id rather than rendering undefined', () => {
  assert.ok(statusLine(tick(BASE, [rule()], at(19))).includes('evening'));
});

/* --- the empty state ----------------------------------------------------------------- */

test('the empty state is frozen, so a caller cannot mutate the shared default', () => {
  assert.ok(Object.isFrozen(EMPTY_RUNNER_STATE));
  assert.deepEqual(tick(BASE, [], at(19)).changes, {});
});
