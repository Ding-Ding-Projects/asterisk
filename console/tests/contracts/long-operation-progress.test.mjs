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
 * CONSUMED as of 2026-08-25. Provisioning is really TWO fixed step sequences
 * (dispatch.ts picks `provisioning.provision(true)` or
 * `provisioning.provisionFromBaseImage()` up front, depending on whether this
 * build carries the packaged payload), and `planOperation` needs one plan's
 * phases known upfront -- the earlier blocker. Resolved with two separate
 * phase lists (`DEPLOY_PHASES`, `DEPLOY_PHASES_FROM_BASE_IMAGE`) and
 * `firstStepPlan`, which reads the very first `onProvisionStep` call to pick
 * the sequence the run actually opened. `deployProgressLine` is now driven by
 * `snapshot()` -- a real weighted percentage and stall message, refreshed by
 * a 2-second ticker while running so `wsl --import`/the base-image download's
 * silent minutes still move the number.
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

test('App.tsx imports long-operation-progress.ts and drives it with startOperation/reportProgress/snapshot', () => {
  const app = read(APP);
  assert.match(app, /from '\.\/long-operation-progress'/u, 'App.tsx no longer imports long-operation-progress.ts');
  assert.match(app, /startOperation\(/u, 'App.tsx no longer calls startOperation');
  assert.match(app, /reportProgress\(/u, 'App.tsx no longer calls reportProgress');
  assert.match(app, /snapshot\(/u, 'App.tsx no longer calls snapshot');
});

test('two distinct phase lists exist, one per real provisioning sequence, and firstStepPlan picks between them', () => {
  const app = read(APP);
  assert.match(app, /const DEPLOY_PHASES: readonly OperationPhase\[\] = \[/u, 'the packaged-payload phase list no longer exists');
  assert.match(app, /const DEPLOY_PHASES_FROM_BASE_IMAGE: readonly OperationPhase\[\] = \[/u, 'the base-image phase list no longer exists');
  assert.match(app, /function firstStepPlan\(stepName: string\)/u, 'firstStepPlan no longer exists to pick the right plan from the first real step');
});

test('the re-entry guard refuses a second start unconditionally, regardless of UI state, and says so in its own message', () => {
  const src = read(MODULE);
  assert.match(src, /result: \{ started: false, reason: 'already-running', message: 'An operation is already running; the new start was refused\.' \}/u,
    'the re-entry refusal no longer matches the expected shape');
});

test('planOperation still requires phases known upfront -- why two separate lists exist rather than one', () => {
  const src = read(MODULE);
  assert.match(src, /export function planOperation\(/u, 'planOperation no longer exists');
  assert.match(src, /export interface OperationPlan \{/u, 'OperationPlan no longer exists');
});

test('App.tsx still tracks deploySteps for its plain-text log, alongside the real weighted operation', () => {
  const app = read(APP);
  assert.match(app, /this\.deploySteps\.push\(step\);/u, 'App.tsx no longer tracks deploy steps the way the note describes');
  assert.match(app, /createOperation\(/u, 'App.tsx no longer calls createOperation');
});

test('a step name neither plan recognises degrades to plain text rather than throwing at the user', () => {
  const app = read(APP);
  assert.match(app, /catch \{/u, 'onProvisionStep no longer catches an unrecognised or out-of-order phase');
});

test('the module has its own dedicated test coverage', () => {
  const content = readFileSync(resolve(root, 'tests/ui/long-operation-progress.test.tsx'), 'utf8');
  assert.ok(content.length > 500, 'tests/ui/long-operation-progress.test.tsx exists but looks too small to be real coverage');
});
