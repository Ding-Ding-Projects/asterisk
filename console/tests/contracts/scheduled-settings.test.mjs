/**
 * Contract: scheduled settings actually compute what they claim to, and actually apply
 * what they compute.
 *
 * Two files carry this feature. `scheduled-settings.ts` is a pure decision engine -- given
 * a base, some rules and an instant, what SHOULD be in force -- and never mutates anything.
 * `schedule-runner.ts` is the half that turns that decision into real changes: it remembers
 * a per-key baseline the first time a rule overrides it, and puts that exact baseline back
 * when the window ends, which is the property the whole feature rests on ("an override
 * never becomes the base").
 *
 * Node's built-in TypeScript type-stripping lets this plain `.mjs` file `import()` the real
 * `.ts` modules directly and call the real functions -- no renderer bundler, no duplicated
 * reimplementation of the math to accidentally drift from the original. `schedule-runner.ts`
 * imports `./scheduled-settings` without an extension, which Node's own resolver refuses, so
 * a tiny inline loader hook retries a failed relative specifier with `.ts` appended. That
 * hook does nothing else and changes no behaviour of the modules it loads.
 *
 * Everything downstream of "does App.tsx actually use this" is checked textually against
 * the real source, the same way the rest of this suite does it, because App.tsx is TSX and
 * type-stripping does not touch JSX.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { register } from 'node:module';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');

/* schedule-runner.ts imports './scheduled-settings' with no extension. Node's ESM resolver
 * only accepts that inside a bundler; retry the bare relative specifier with '.ts' appended
 * before giving up, and do nothing else. */
const loaderSrc = `
export async function resolve(specifier, context, nextResolve) {
  try { return await nextResolve(specifier, context); }
  catch (err) {
    if (specifier.startsWith('.') && !specifier.endsWith('.ts')) return nextResolve(specifier + '.ts', context);
    throw err;
  }
}
`;
register(`data:text/javascript,${encodeURIComponent(loaderSrc)}`, import.meta.url);

const engine = await import('../../app/renderer/src/scheduled-settings.ts');
const runner = await import('../../app/renderer/src/schedule-runner.ts');

function makeRule(overrides = {}) {
  return {
    id: 'r1', label: 'Evening', enabled: true,
    startTime: { hour: 9, minute: 0 }, endTime: { hour: 17, minute: 0 },
    days: 'everyday', settings: { lang_mode: 'yue' },
    ...overrides,
  };
}

test('validateRule accepts a well-formed rule and reports every problem at once for a bad one', () => {
  assert.equal(engine.validateRule(makeRule()).valid, true);

  const bad = engine.validateRule({
    id: '', label: '', enabled: 'yes',
    startTime: { hour: 9, minute: 0 }, endTime: { hour: 9, minute: 0 }, // zero-width
    startDate: { year: 2026, month: 4, day: 31 }, // rolls forward, must be refused
    days: [], settings: { x: 5 },
  });
  assert.equal(bad.valid, false);
  /* Every distinct problem is reported in the same pass, not just the first one found. */
  assert.ok(bad.errors.some((e) => e.includes('id must be')));
  assert.ok(bad.errors.some((e) => e.includes('label must be')));
  assert.ok(bad.errors.some((e) => e.includes('enabled must be')));
  assert.ok(bad.errors.some((e) => e.includes('must not be equal')));
  assert.ok(bad.errors.some((e) => e.includes('not a real calendar date')));
  assert.ok(bad.errors.some((e) => e.includes('days must be')));
  assert.ok(bad.errors.some((e) => e.includes('every value in settings must be a string')));
});

test('validateRuleSet catches a duplicate id across two otherwise-valid rules', () => {
  const result = engine.validateRuleSet([makeRule({ id: 'dup' }), makeRule({ id: 'dup' })]);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('already used by an earlier rule')));
});

test('matchesAt: a same-day window is inclusive of its start minute and exclusive of its end minute', () => {
  const rule = makeRule({ startTime: { hour: 9, minute: 0 }, endTime: { hour: 17, minute: 0 } });
  // Monday 2026-01-05.
  assert.equal(engine.matchesAt(rule, new Date(2026, 0, 5, 8, 59)), false, 'one minute before start');
  assert.equal(engine.matchesAt(rule, new Date(2026, 0, 5, 9, 0)), true, 'exactly at start');
  assert.equal(engine.matchesAt(rule, new Date(2026, 0, 5, 16, 59)), true, 'one minute before end');
  assert.equal(engine.matchesAt(rule, new Date(2026, 0, 5, 17, 0)), false, 'exactly at end');
});

test('matchesAt: a window crossing midnight belongs to the day it started on', () => {
  const rule = makeRule({
    startTime: { hour: 22, minute: 0 }, endTime: { hour: 2, minute: 0 }, days: [1], // Monday only
  });
  // Monday 2026-01-05 23:30 -- late-night portion, still Monday.
  assert.equal(engine.matchesAt(rule, new Date(2026, 0, 5, 23, 30)), true);
  // Tuesday 2026-01-06 01:30 -- after-midnight portion, whose start day was Monday.
  assert.equal(engine.matchesAt(rule, new Date(2026, 0, 6, 1, 30)), true);
  // Tuesday 2026-01-06 23:30 -- late-night portion on a Tuesday, and the rule is Monday-only.
  assert.equal(engine.matchesAt(rule, new Date(2026, 0, 6, 23, 30)), false);
});

test('matchesAt refuses a zero-width window even if validateRule was skipped', () => {
  const rule = makeRule({ startTime: { hour: 9, minute: 0 }, endTime: { hour: 9, minute: 0 } });
  assert.equal(engine.matchesAt(rule, new Date(2026, 0, 5, 9, 0)), false);
});

test('matchesAt honours a start/end date range', () => {
  const rule = makeRule({
    startDate: { year: 2026, month: 1, day: 10 }, endDate: { year: 2026, month: 1, day: 12 },
  });
  assert.equal(engine.matchesAt(rule, new Date(2026, 0, 9, 10, 0)), false, 'before the range');
  assert.equal(engine.matchesAt(rule, new Date(2026, 0, 10, 10, 0)), true, 'first day, inclusive');
  assert.equal(engine.matchesAt(rule, new Date(2026, 0, 12, 10, 0)), true, 'last day, inclusive');
  assert.equal(engine.matchesAt(rule, new Date(2026, 0, 13, 10, 0)), false, 'after the range');
});

test('effectiveSettings: a later rule in the array wins a key two matching rules both set', () => {
  const now = new Date(2026, 0, 5, 10, 0);
  const first = makeRule({ id: 'first', settings: { lang_mode: 'en' } });
  const second = makeRule({ id: 'second', settings: { lang_mode: 'yue' } });
  const result = engine.effectiveSettings({ lang_mode: 'both' }, [first, second], now);
  assert.equal(result.values.lang_mode, 'yue', 'documented precedence: last matching rule wins');
  assert.equal(result.sourceOf.lang_mode, 'second');
  assert.deepEqual(result.appliedRuleIds, ['first', 'second']);
});

test('effectiveSettings never mutates the base it was given', () => {
  const base = Object.freeze({ lang_mode: 'en' });
  const now = new Date(2026, 0, 5, 10, 0);
  // A frozen base would throw on write, so this alone proves no mutation is attempted.
  const result = engine.effectiveSettings(base, [makeRule()], now);
  assert.equal(result.values.lang_mode, 'yue');
  assert.equal(base.lang_mode, 'en', 'the caller\'s object was not touched');
});

test('a disabled rule never matches and never overrides anything', () => {
  const rule = makeRule({ enabled: false });
  const now = new Date(2026, 0, 5, 10, 0);
  assert.equal(engine.matchesAt(rule, now), false);
  const result = engine.effectiveSettings({ lang_mode: 'en' }, [rule], now);
  assert.equal(result.values.lang_mode, 'en');
  assert.deepEqual(result.appliedRuleIds, []);
});

/* --- the runner: the half that actually changes something -------------------------- */

test('tick(): the property the whole feature rests on -- an override never becomes the base', () => {
  // Two overlapping windows on the same key. The first sets it, the second (still inside
  // the first's window) overrides it again, then the first ends. The restored value must
  // be the ORIGINAL base, never the first rule's overridden value.
  const base = { lang_mode: 'en' };
  const early = makeRule({
    id: 'early', startTime: { hour: 9, minute: 0 }, endTime: { hour: 12, minute: 0 },
    settings: { lang_mode: 'yue' },
  });
  const overlap = makeRule({
    id: 'overlap', startTime: { hour: 10, minute: 0 }, endTime: { hour: 11, minute: 0 },
    settings: { lang_mode: 'both' },
  });

  let state = runner.EMPTY_RUNNER_STATE;
  let result = runner.tick(base, [early], new Date(2026, 0, 5, 9, 30), state);
  state = result.state;
  assert.equal(result.changes.lang_mode, 'yue');

  // Now inside the overlap window: 'overlap' also matches and wins by array precedence.
  result = runner.tick(base, [early, overlap], new Date(2026, 0, 5, 10, 30), state);
  state = result.state;
  assert.equal(result.changes.lang_mode, 'both', 'the second, later-in-array rule now wins');
  assert.equal(state.baseline.lang_mode, 'en',
    'the remembered baseline must still be the ORIGINAL base, not "yue" from the first override');

  // The overlap window ends; only 'early' still matches.
  result = runner.tick(base, [early], new Date(2026, 0, 5, 10, 45), state);
  state = result.state;
  assert.equal(result.changes.lang_mode, 'yue', 'falls back to the still-active early rule, not the base yet');

  // Now both windows have ended entirely.
  result = runner.tick(base, [], new Date(2026, 0, 5, 12, 30), state);
  assert.equal(result.changes.lang_mode, 'en',
    'restored to the ORIGINAL base -- if the overlap had corrupted the baseline this would read "yue"');
  assert.deepEqual(result.restored, ['lang_mode']);
});

test('tick(): re-applying an already-in-force value produces no change on the next tick', () => {
  const base = { lang_mode: 'en' };
  const rule = makeRule();
  const first = runner.tick(base, [rule], new Date(2026, 0, 5, 10, 0), runner.EMPTY_RUNNER_STATE);
  assert.deepEqual(first.changes, { lang_mode: 'yue' });
  const second = runner.tick(base, [rule], new Date(2026, 0, 5, 10, 1), first.state);
  assert.deepEqual(second.changes, {},
    'the same value re-applied every tick would fire a toast/history/write once a minute forever');
});

test('statusLine names the rule and the key, not just a count', () => {
  const base = { lang_mode: 'en' };
  const rule = makeRule({ id: 'r1', label: 'Evening Cantonese' });
  const result = runner.tick(base, [rule], new Date(2026, 0, 5, 10, 0), runner.EMPTY_RUNNER_STATE);
  const line = runner.statusLine(result, { r1: 'Evening Cantonese' });
  assert.match(line, /Evening Cantonese/);
  assert.match(line, /lang_mode/);
  assert.equal(runner.statusLine({ ...result, state: { baseline: {}, applied: {} } }),
    'No schedule is in force; your own settings are in effect.');
});

/* --- wiring: App.tsx actually drives the runner on a tick, through baseSetVal ------- */

const app = read('app/renderer/src/App.tsx');
const generated = read('app/renderer/src/generated/console.tsx');

test('App imports the real engine and runner rather than a local reimplementation', () => {
  assert.match(app, /^import \{ loadRules \} from '\.\/scheduled-settings';/m);
  assert.match(app, /^import \{ EMPTY_RUNNER_STATE, statusLine, tick, type RunnerState \} from '\.\/schedule-runner';/m);
});

test('the scheduler is started at mount and torn down on unmount', () => {
  assert.match(app, /this\.startScheduler\(\);/, 'startScheduler is never called');
  assert.match(app, /if \(this\.scheduleTimer\) clearInterval\(this\.scheduleTimer\);/,
    'the interval is never cleared, so it would keep firing after the component is gone');
});

test('every scheduled change is pushed through baseSetVal, the same path a manual edit takes', () => {
  const start = app.indexOf('private runScheduleTick(): void {');
  assert.ok(start > 0, 'runScheduleTick has been renamed or removed');
  const body = app.slice(start, app.indexOf('\n  }', start));
  assert.match(body, /const result = tick\(this\.scheduleBase, rules, new Date\(\), this\.scheduleState\);/);
  assert.match(body, /this\.baseSetVal\(\{ id: key, label: key, kind: 'text' \}, value\);/,
    'a scheduled change bypasses baseSetVal, so it would skip validation, persistence and every language/emoji/attention interception a manual edit gets');
});

test('the status control exists in the design and is answered from the runner\'s own state', () => {
  assert.match(generated, /ctl\('sch_status','What is in force now','text',/);
  assert.match(generated, /action:'schedule-status'/);
  assert.match(app, /if \(action === 'schedule-status'\) return this\.scheduleStatusLine;/);
});

/* --- the honest gap: there is no way to author a rule anywhere in this build -------- */

test('PIN: saveRules is never called anywhere the running app can reach', () => {
  /* The engine can persist a rule list (saveRules/loadRules round-trip, proven above by
   * import), but nothing in App.tsx, the generated shell, or the control plane ever calls
   * saveRules. The only way a ScheduledRule ever enters storage in a real build is by
   * hand-editing the "console.scheduledSettings.rules" localStorage key directly -- there
   * is no date/time picker, no weekday selector, no "add rule" control anywhere. */
  assert.doesNotMatch(app, /saveRules\(/, 'App now calls saveRules -- update this pin, a rule-authoring UI has shipped');
  assert.doesNotMatch(generated, /saveRules\(/);
});

test('PIN: the design\'s "Scheduled settings" group renders exactly one control -- a readout, never an editor', () => {
  const at = generated.indexOf("title:'Scheduled settings'");
  assert.ok(at > 0, 'the Scheduled settings group has been renamed or removed -- update this pin');
  /* Bounded to the next group's own "{ title:'" rather than the first ']', because a
   * control's own option list (e.g. a select's {options:[...]}) closes with ']' long
   * before the group itself does -- an earlier version of this test tripped on exactly
   * that in the sibling external-editor-handoff test and had to be fixed the same way. */
  const next = generated.indexOf("{ title:'", at + 10);
  const group = generated.slice(at, next);
  const controlIds = [...group.matchAll(/ctl\('([a-z0-9_]+)'/g)].map((m) => m[1]);
  assert.deepEqual(controlIds, ['sch_status'],
    'a rule-editing control was added to the Scheduled settings group -- this pin is now stale and should be replaced with real coverage of it');
});
