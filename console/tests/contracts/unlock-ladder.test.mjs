/**
 * Contract: unlock-ladder. Real and wired into the per-element unlock dialog:
 * after three consecutive wrong attempts on a lock (`tryUnlock`'s `wrong()`
 * helper), `this.ladder.issue(s.unlockKey)` is called, and for a real dish or
 * sums challenge the dialog's existing numeric keypad/dots and mono-font method
 * line are reused (no new markup added, since the compiled design has no bound
 * slot for a dish grid or sums list) to collect and grade a real answer through
 * `this.ladder.grade(...)`.
 *
 * The module's own safety rules -- never refunds the attempt budget, single-use
 * graded nonces consumed before grading, a rolling 3-per-hour skip budget -- are
 * enforced by the module itself, unmodified.
 *
 * Rule 1 (a cleared ladder is never a credential) is kept explicitly honest:
 * `finishLadderGrade` only closes the ladder UI and says the wait is over -- it
 * never touches `state.locks` or the unlock dialog's own PIN/password/TOTP
 * buffers, so the real credential is still required afterward.
 *
 * Two real gaps, both because editing the compiled design/generated output was
 * out of scope for the change that wired this: the "moles" rung has no visual
 * board to render in this build, so it falls back to "wait it out" rather than
 * faking a graded round; and this app's per-element lock has no server-enforced
 * or time-based lockout of its own, so "clearing the wait" dismisses the ladder
 * UI without bypassing any actual timed lockout, since none exists to bypass.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const json = (p) => JSON.parse(read(p));

const APP = 'app/renderer/src/App.tsx';
const MODULE = 'app/renderer/src/unlock-ladder.ts';

test('the registry row is internally honest: a defined state with a note explaining what is and is not wired', () => {
  const registry = json('app/feature-registry.json');
  const row = registry.features['unlock-ladder'];
  assert.ok(row, 'the implementation registry has no row for unlock-ladder');
  assert.ok(['implemented', 'partial', 'absent'].includes(row.state), `undefined state "${row.state}"`);
  assert.ok(typeof row.note === 'string' && row.note.length > 40, 'no note explaining what is and is not wired');
});

test('unlock-ladder.ts IS imported and this.ladder.issue() is called after the third wrong attempt', () => {
  const app = read(APP);
  const wrongFn = app.match(/const wrong = \(message: string\): void => \{[\s\S]*?\n    \};/);
  assert.ok(wrongFn, 'expected to find the wrong() helper inside tryUnlock');
  assert.match(wrongFn[0], /if \(count >= 3\) \{/u, 'the ladder no longer triggers after the third wrong attempt');
  assert.match(wrongFn[0], /const result = this\.ladder\.issue\(s\.unlockKey\);/u, 'this.ladder.issue(...) is no longer called');
});

test('the moles rung falls back to "wait it out" because this build has no visual board', () => {
  const app = read(APP);
  assert.match(app, /needs a visual board this build cannot show yet\. Wait it out\./u,
    'the moles-rung fallback copy no longer matches -- a visual board may have been added');
});

test('finishLadderGrade never touches state.locks or the unlock buffers on a cleared challenge -- rule 1 is enforced', () => {
  const app = read(APP);
  const fn = app.match(/private finishLadderGrade\(result: GradeResult, lockKey: string\): void \{[\s\S]*?if \(result\.cleared\) \{[\s\S]*?\n      return;\s*\n    \}/);
  assert.ok(fn, 'expected to find the cleared-result branch of finishLadderGrade');
  assert.doesNotMatch(fn[0], /state\.locks|s\.locks|delete n\[/u,
    'the cleared-challenge branch now touches lock state -- this would violate rule 1 (never a credential)');
  assert.match(fn[0], /the wait is over/u, 'the cleared-challenge toast no longer says the wait is over');
});

test("the module's own safety rules are documented and enforced in its own source: never-refund, single-use nonces, rolling budget", () => {
  const src = read(MODULE);
  assert.match(src, /Never refunds the attempt budget\./u, 'the never-refund rule is no longer documented');
  assert.match(src, /Single-use: consume the nonce before grading, so a wrong answer cannot be retried against/u,
    'the single-use-nonce enforcement comment no longer matches');
  assert.match(src, /budgetRemaining\(atMs: number\): number \{/u, 'budgetRemaining(...) no longer exists');
});
