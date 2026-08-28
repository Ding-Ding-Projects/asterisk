/**
 * Contract: the runner behind `npm test` cannot report a red run as a clean one.
 *
 * That is the whole risk of replacing a `&&` chain with something that keeps going. The
 * chain had exactly one virtue -- it could not possibly finish green after a failure --
 * and anything replacing it has to earn that back explicitly rather than by looking
 * careful. So the verdict is a pure function of what the groups did, and it is proved
 * here against fabricated results instead of being trusted.
 *
 * The empty case is checked first and deliberately: a summary that returned "ok" for a
 * run in which nothing happened would be the worst possible defect in this file, and it
 * is exactly the shape this repository has been bitten by before -- a guard that passes
 * because it found nothing to look at.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { declaredGroups, resolveGroups, summarise, tapTotals } from '../../scripts/run-test-groups.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

const result = (group, code, totals = null) => ({ group, code, totals, seconds: 0.1 });

test('a run in which no group reported anything is refused, not called green', () => {
  assert.equal(summarise([]).ok, false);
  assert.equal(summarise(null).ok, false);
  assert.match(summarise([]).lines[0], /no test group reported a result/u);
});

test('one failing group among many turns the whole run red and is named', () => {
  const verdict = summarise([result('ui', 0), result('contracts', 1), result('site', 0)]);
  assert.equal(verdict.ok, false);
  assert.deepEqual(verdict.failed, ['contracts']);
});

test('every group failing is reported as every group, not as the first one', () => {
  /* The point of the change: a chain reported one failure however many there were. */
  const verdict = summarise([result('a', 1), result('b', 1), result('c', 1)]);
  assert.deepEqual(verdict.failed, ['a', 'b', 'c']);
});

test('a run is green only when every group exited zero', () => {
  assert.equal(summarise([result('a', 0), result('b', 0)]).ok, true);
  assert.equal(summarise([result('a', 0), result('b', 7)]).ok, false);
});

test('each group gets its own line, carrying its verdict and its counts', () => {
  const verdict = summarise([
    result('ui', 0, { tests: 48, pass: 48, fail: 0 }),
    result('contracts', 1, { tests: 554, pass: 553, fail: 1 }),
  ]);
  assert.equal(verdict.lines.length, 2);
  assert.match(verdict.lines[0], /^PASS {2}ui .*48\/48 passed, 0 failed/u);
  assert.match(verdict.lines[1], /^FAIL {2}contracts .*553\/554 passed, 1 failed/u);
});

test('a group that emitted no TAP totals says so rather than reporting zero of zero', () => {
  const verdict = summarise([result('inventories', 1, { tests: null, pass: null, fail: null })]);
  assert.match(verdict.lines[0], /no TAP totals/u);
});

test('TAP totals are summed across every plan the group emitted, and absent when there are none', () => {
  /* `test:inventories` runs plain scripts and emits none; `test:site` runs several files
   * and emits several plans, so the last one alone would understate the group. */
  assert.deepEqual(tapTotals('# tests 3\n# pass 3\n# fail 0\n# tests 4\n# pass 2\n# fail 2\n'),
    { tests: 7, pass: 5, fail: 2 });
  assert.deepEqual(tapTotals('PASS: everything is fine\n'), { tests: null, pass: null, fail: null });
});

test('the group list is refused unless it is exactly the declared test:* scripts', () => {
  const declared = declaredGroups(pkg);
  assert.ok(declared.length > 1, 'package.json declares fewer than two test:* scripts, so this check would prove nothing');
  assert.deepEqual(resolveGroups(pkg, declared), declared);
  assert.throws(() => resolveGroups(pkg, declared.slice(1)), /are not in the npm test list/u,
    'a declared group left out of the list is a suite nobody runs, which is the defect one layer up from the one this runner fixes');
  assert.throws(() => resolveGroups(pkg, [...declared, 'nonexistent']), /not declared as test:\* scripts/u);
  assert.throws(() => resolveGroups(pkg, []), /no test groups were requested/u);
  assert.throws(() => resolveGroups({ scripts: { build: 'x' } }, declared), /declares no test:\* scripts/u);
});

test('the runner is what npm test actually invokes, and it names every declared group', () => {
  /* The set, not the order. Which group runs first is a running choice -- the cheap ones
   * before the slow ones -- and pinning the exact string would refuse a reordering that
   * changes nothing. What must not drift is that a declared group is named at all. */
  const prefix = 'node scripts/run-test-groups.mjs ';
  assert.ok(pkg.scripts.test.startsWith(prefix), 'npm test does not go through the runner');
  const named = pkg.scripts.test.slice(prefix.length).split(/\s+/u).filter(Boolean);
  assert.deepEqual(named.slice().sort(), declaredGroups(pkg).slice().sort(),
    'npm test and the declared test:* scripts have drifted apart');
  assert.equal(new Set(named).size, named.length, 'a group is named twice, so it would run twice');
});
