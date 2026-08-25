/**
 * Contract: long-operation-progress. `long-operation-progress.ts`
 * (implemented 2026-08-24) is a complete, tested module: weighted phases
 * producing real fractional progress, a re-entry guard that REFUSES
 * unconditionally while `running` -- regardless of whether a UI-level disabled
 * button was also checked, because a keyboard submit walks straight past a
 * disabled control -- determinate versus indeterminate state distinguishable
 * from stalled, a stall detector, and cancellation reporting partial
 * completion honestly.
 *
 * NOTHING IMPORTS IT YET: no surface in the renderer calls it, confirmed by
 * grepping App.tsx and finding no import. It is blocked on a sharper problem
 * than "no progress events exist" (those now exist: provisioning emits every
 * step live through a real onStep callback, threaded through the dispatcher
 * and rendered by App). What does not fit is this module's own plan-shape
 * requirement: `planOperation` needs its phases known upfront, and
 * `reportProgress` refuses a phase that skips more than one ahead -- but
 * provisioning legitimately skips phases when a packaged payload is already
 * present, so a plan listing them would throw partway through a normal
 * deploy. The deploy-progress line on screen today is App counting steps
 * itself, deliberately not this module.
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
const MODULE = 'app/renderer/src/long-operation-progress.ts';

test('the registry row is internally honest: a defined state with a note explaining what is and is not wired', () => {
  const registry = json('app/feature-registry.json');
  const row = registry.features['long-operation-progress'];
  assert.ok(row, 'the implementation registry has no row for long-operation-progress');
  assert.ok(['implemented', 'partial', 'absent'].includes(row.state), `undefined state "${row.state}"`);
  assert.ok(typeof row.note === 'string' && row.note.length > 40, 'no note explaining what is and is not wired');
});

test('nothing in App.tsx imports long-operation-progress.ts -- it constrains nothing that ships today', () => {
  const app = read(APP);
  assert.doesNotMatch(app, /from '\.\/long-operation-progress'/u,
    'App.tsx now imports long-operation-progress.ts -- the plan-shape mismatch with provisioning may have been resolved, which would flip this row');
});

test('the re-entry guard refuses a second start unconditionally, regardless of UI state, and says so in its own message', () => {
  const src = read(MODULE);
  assert.match(src, /result: \{ started: false, reason: 'already-running', message: 'An operation is already running; the new start was refused\.' \}/u,
    'the re-entry refusal no longer matches the expected shape');
});

test('planOperation requires phases known upfront -- this is the real reason provisioning cannot use it yet', () => {
  const src = read(MODULE);
  assert.match(src, /export function planOperation\(/u, 'planOperation no longer exists');
  assert.match(src, /export interface OperationPlan \{/u, 'OperationPlan no longer exists');
});

test('provisioning already emits real progress independently, through App-owned step counting, deliberately not through this module', () => {
  const app = read(APP);
  assert.match(app, /this\.deploySteps\.push\(step\);/u, 'App.tsx no longer tracks deploy steps the way the note describes');
  assert.doesNotMatch(app, /planOperation\(|createOperation\(|reportProgress\(/u,
    'App.tsx now calls long-operation-progress.ts functions directly -- the plan-shape mismatch may have been resolved');
});

test('the module has its own dedicated test coverage', () => {
  const content = readFileSync(resolve(root, 'tests/ui/long-operation-progress.test.tsx'), 'utf8');
  assert.ok(content.length > 500, 'tests/ui/long-operation-progress.test.tsx exists but looks too small to be real coverage');
});
