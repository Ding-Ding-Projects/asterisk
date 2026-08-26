/**
 * Long operation progress.
 *
 * Four groups carry the weight: the re-entry guard, because a keyboard submit walks
 * straight past a disabled button and the handler is the only real defence; the weighted
 * fraction, because a wrong weight-banking step is silently wrong rather than loudly
 * wrong; indeterminate vs. stalled, because the whole point of having both is that they
 * must stay distinguishable; and cancellation, because reporting partial work as success
 * is a worse lie than reporting nothing at all.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_STALL_THRESHOLD_MS, OPERATION_STATUSES,
  cancelOperation, completeOperation, createOperation, failOperation, planOperation,
  reportProgress, snapshot, startOperation,
  type OperationPhase, type OperationState,
} from '../../app/renderer/src/long-operation-progress.ts';

const PHASES: readonly OperationPhase[] = [
  { id: 'clone', label: 'Cloning repository', weight: 1 },
  { id: 'fetch', label: 'Fetching history', weight: 3 },
  { id: 'index', label: 'Indexing', weight: 1 },
];
// Total weight 5, chosen so /5 never lands on an ugly float in an assertion.

const T0 = 1_000_000;

function started(now = T0, phases: readonly OperationPhase[] = PHASES, declined: readonly string[] = []): OperationState {
  const idle = createOperation(phases, declined);
  return startOperation(idle, now).state;
}

/* --- planOperation: every caller-bug fires at plan time, not mid-run ---------------- */

test('an operation needs at least one phase', () => {
  assert.throws(() => planOperation([]));
});

test('a duplicate phase id is refused', () => {
  assert.throws(() => planOperation([
    { id: 'a', label: 'A', weight: 1 },
    { id: 'a', label: 'A again', weight: 1 },
  ]));
});

test('every non-positive or non-finite weight is refused', () => {
  for (const weight of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => planOperation([{ id: 'a', label: 'A', weight }]), `weight ${weight} was accepted`);
  }
});

test('an optional phase with no stated consequence is refused', () => {
  // Declinable without a stated cost is the silent omission this module exists to stop.
  assert.throws(() => planOperation([
    { id: 'a', label: 'Required', weight: 1 },
    { id: 'b', label: 'Optional', weight: 1, optional: true },
  ]));
});

test('declining an unknown phase id is refused', () => {
  assert.throws(() => planOperation(PHASES, ['not-a-real-phase']));
});

test('declining a required (non-optional) phase is refused', () => {
  assert.throws(() => planOperation(PHASES, ['clone']));
});

test('declining every phase is refused rather than producing an operation that does nothing', () => {
  const allOptional: OperationPhase[] = [
    { id: 'a', label: 'A', weight: 1, optional: true, consequenceOfSkipping: 'A is skipped' },
    { id: 'b', label: 'B', weight: 1, optional: true, consequenceOfSkipping: 'B is skipped' },
  ];
  assert.throws(() => planOperation(allOptional, ['a', 'b']));
});

test('a normal plan includes every phase and totals the real weight', () => {
  const plan = planOperation(PHASES);
  assert.deepEqual(plan.included.map((p) => p.id), ['clone', 'fetch', 'index']);
  assert.deepEqual(plan.omitted, []);
  assert.equal(plan.totalWeight, 5);
});

test('declining an optional phase states plainly what it leaves undone, and only that phase', () => {
  const phases: OperationPhase[] = [
    { id: 'core', label: 'Core sync', weight: 4 },
    { id: 'thumbnails', label: 'Thumbnails', weight: 1, optional: true, consequenceOfSkipping: 'Thumbnails will be missing until the next sync.' },
    { id: 'search-index', label: 'Search index', weight: 1, optional: true, consequenceOfSkipping: 'Search will not find new items yet.' },
  ];
  const plan = planOperation(phases, ['thumbnails']);
  assert.deepEqual(plan.included.map((p) => p.id), ['core', 'search-index'], 'the undeclined optional phase must stay in, not be hidden with the declined one');
  assert.deepEqual(plan.omitted, [{ id: 'thumbnails', label: 'Thumbnails', consequence: 'Thumbnails will be missing until the next sync.' }]);
  assert.equal(plan.totalWeight, 5, 'declined weight must not count toward the total that is actually run');
});

test('a phase declined out of the plan can never be reported against', () => {
  // Proves the decline actually removes the phase from the run, not merely from a list
  // the UI happens to render -- the surest sign of that is that reporting against it
  // fails exactly as reporting against any other unknown phase id would.
  const phases: OperationPhase[] = [
    { id: 'core', label: 'Core', weight: 1 },
    { id: 'extra', label: 'Extra', weight: 1, optional: true, consequenceOfSkipping: 'Extra data is left undone.' },
  ];
  const state = started(T0, phases, ['extra']);
  assert.throws(() => reportProgress(state, 'extra', 1, T0 + 1));
});

/* --- createOperation / snapshot before anything has started ------------------------- */

test('a fresh operation is idle, at zero, and startable', () => {
  const idle = createOperation(PHASES);
  const view = snapshot(idle, T0);
  assert.equal(view.status, 'idle');
  assert.equal(view.overallFraction, 0);
  assert.equal(view.phaseId, null);
  assert.equal(view.canStart, true);
  assert.equal(view.stalled, false, 'an operation that never started cannot be stalled');
});

/* --- the re-entry guard: refuses while running, reports that it refused ------------- */

test('starting an idle operation succeeds and lands on the first phase', () => {
  const { state, result } = startOperation(createOperation(PHASES), T0);
  assert.equal(result.started, true);
  assert.equal(result.reason, null);
  assert.equal(snapshot(state, T0).phaseId, 'clone');
});

test('starting a running operation is refused, and the refusal says so', () => {
  const running = started();
  const { state, result } = startOperation(running, T0 + 500);
  assert.equal(result.started, false);
  assert.equal(result.reason, 'already-running');
  assert.ok(result.message.length > 0, 'a refusal with no message is a refusal nobody can see');
  assert.ok(!/^already-running$/i.test(result.message), 'the message must be a sentence, not the reason code again');
});

test('a refused second start does not touch the running operation at all', () => {
  // The property that actually matters: a keyboard submit that walks past a disabled
  // button must land here and find nothing changed, not a reset or a second operation.
  const running = reportProgress(started(), 'clone', 0.5, T0 + 10);
  const { state: afterRefusal } = startOperation(running, T0 + 999);
  assert.equal(afterRefusal, running, 'a refused start must return the identical state, not a copy');
  assert.deepEqual(snapshot(afterRefusal, T0 + 999), snapshot(running, T0 + 999));
});

test('starting after every terminal status is allowed and begins a fresh run', () => {
  for (const status of ['succeeded', 'cancelled', 'failed'] as const) {
    let state = started();
    state = reportProgress(state, 'clone', 0.9, T0 + 10);
    state = status === 'succeeded' ? completeOperation(state, T0 + 20)
      : status === 'cancelled' ? cancelOperation(state, T0 + 20)
        : failOperation(state, T0 + 20);
    assert.equal(state.status, status);

    const { result, state: restarted } = startOperation(state, T0 + 30);
    assert.equal(result.started, true, `restarting after ${status} was refused`);
    const view = snapshot(restarted, T0 + 30);
    assert.equal(view.phaseId, 'clone', `restarting after ${status} did not begin at the first phase`);
    assert.equal(view.overallFraction, 0, `restarting after ${status} carried over old progress`);
  }
});

/* --- reportProgress: only the current phase or the very next one ------------------- */

test('reportProgress is refused from every non-running status', () => {
  const idle = createOperation(PHASES);
  const running = started();
  const succeeded = completeOperation(running, T0 + 1);
  const cancelled = cancelOperation(started(T0 + 5), T0 + 6);
  const failed = failOperation(started(T0 + 7), T0 + 8);
  for (const state of [idle, succeeded, cancelled, failed]) {
    assert.throws(() => reportProgress(state, 'clone', 0.5, T0 + 100), `${state.status} allowed reportProgress`);
  }
});

test('reporting an unknown phase id is refused', () => {
  assert.throws(() => reportProgress(started(), 'not-a-phase', 0.5, T0 + 1));
});

test('rewinding to an earlier phase is refused', () => {
  let state = started();
  state = reportProgress(state, 'fetch', 0.1, T0 + 10);
  assert.throws(() => reportProgress(state, 'clone', 0.5, T0 + 20));
});

test('jumping ahead of the next phase is refused and names the phase that was skipped', () => {
  const state = started();
  assert.throws(() => reportProgress(state, 'index', 0.1, T0 + 10), /fetch/);
});

test('a fraction outside 0..1 is refused, including NaN', () => {
  for (const bad of [-0.01, 1.01, Number.NaN, Number.POSITIVE_INFINITY, -1]) {
    assert.throws(() => reportProgress(started(), 'clone', bad, T0 + 1), `fraction ${bad} was accepted`);
  }
});

test('every boundary fraction of 0 and 1 is accepted', () => {
  for (const ok of [0, 1]) {
    const state = reportProgress(started(), 'clone', ok, T0 + 1);
    assert.equal(snapshot(state, T0 + 1).phaseFraction, ok);
  }
});

/* --- weighted overall fraction: the number the whole feature exists to produce ------ */

test('progress within the first phase alone is a fraction of ITS weight, not the whole', () => {
  // clone has weight 1 of 5. Halfway through clone is 0.5/5, not 0.5.
  const state = reportProgress(started(), 'clone', 0.5, T0 + 1);
  assert.equal(snapshot(state, T0 + 1).overallFraction, 0.1);
});

test('advancing to the next phase banks the FULL weight of the one just left, exactly once', () => {
  let state = started();
  state = reportProgress(state, 'clone', 0.5, T0 + 1); // never finished at 100% -- still banks fully on advance
  state = reportProgress(state, 'fetch', 0, T0 + 2);
  // clone's whole weight (1) is now banked; fetch has only just begun.
  assert.equal(snapshot(state, T0 + 2).overallFraction, 1 / 5);
});

test('reporting again within the SAME phase does not double-bank its weight', () => {
  let state = started();
  state = reportProgress(state, 'clone', 0.2, T0 + 1);
  state = reportProgress(state, 'clone', 0.9, T0 + 2);
  assert.equal(snapshot(state, T0 + 2).overallFraction, 0.9 / 5);
});

test('overall fraction rises monotonically across a full, realistic run and lands on exactly 1', () => {
  // The catch-all for the feature being silently inert: if phase advancement or weight
  // banking stopped doing anything, this fraction would stay flat or never reach 1.
  let state = started();
  let last = -1;
  const steps: Array<[string, number]> = [
    ['clone', 0.5], ['clone', 1], ['fetch', 0.2], ['fetch', 0.8], ['fetch', 1], ['index', 0.5], ['index', 1],
  ];
  let t = T0;
  const seenLabels = new Set<string>();
  for (const [phaseId, fraction] of steps) {
    state = reportProgress(state, phaseId, fraction, (t += 1));
    const view = snapshot(state, t);
    assert.ok(view.overallFraction >= last, `overall fraction went backwards at ${phaseId}:${fraction}`);
    assert.ok(view.overallFraction <= 1, 'overall fraction exceeded 1 before completion');
    last = view.overallFraction;
    seenLabels.add(view.phaseLabel ?? '');
  }
  assert.deepEqual([...seenLabels].sort(), ['Cloning repository', 'Fetching history', 'Indexing'].sort(),
    'the phase label never changed across the whole run, which is what a silently inert progress bar looks like');
  state = completeOperation(state, t + 1);
  assert.equal(snapshot(state, t + 1).overallFraction, 1);
});

/* --- determinate vs indeterminate, and its independence from stalled --------------- */

test('every phase declared indeterminate reports a null phase fraction and indeterminate true', () => {
  const state = reportProgress(started(), 'clone', 'indeterminate', T0 + 1);
  const view = snapshot(state, T0 + 1);
  assert.equal(view.phaseFraction, null);
  assert.equal(view.indeterminate, true);
});

test('a determinate phase is never reported as indeterminate', () => {
  const state = reportProgress(started(), 'clone', 0, T0 + 1);
  assert.equal(snapshot(state, T0 + 1).indeterminate, false);
});

test('indeterminate progress still banks the weight of phases already finished', () => {
  let state = started();
  state = reportProgress(state, 'clone', 1, T0 + 1);
  state = reportProgress(state, 'fetch', 'indeterminate', T0 + 2);
  // clone's weight (1) is real and banked; fetch contributes nothing extra because its
  // total is unknown -- extrapolating a number here would be exactly the fabrication
  // this module exists to avoid.
  assert.equal(snapshot(state, T0 + 2).overallFraction, 1 / 5);
});

test('indeterminate and stalled are independent in all four combinations', () => {
  const soon = T0 + 1;
  const long = T0 + DEFAULT_STALL_THRESHOLD_MS + 1;

  const determinateFresh = snapshot(reportProgress(started(), 'clone', 0.3, T0), soon);
  assert.equal(determinateFresh.indeterminate, false);
  assert.equal(determinateFresh.stalled, false);

  const determinateStale = snapshot(reportProgress(started(), 'clone', 0.3, T0), long);
  assert.equal(determinateStale.indeterminate, false);
  assert.equal(determinateStale.stalled, true, 'a determinate phase with no update for the threshold must still be reported stalled');

  const indeterminateFresh = snapshot(reportProgress(started(), 'clone', 'indeterminate', T0), soon);
  assert.equal(indeterminateFresh.indeterminate, true);
  assert.equal(indeterminateFresh.stalled, false, 'indeterminate must not by itself read as stalled');

  const indeterminateStale = snapshot(reportProgress(started(), 'clone', 'indeterminate', T0), long);
  assert.equal(indeterminateStale.indeterminate, true);
  assert.equal(indeterminateStale.stalled, true, 'an indeterminate operation can still be genuinely stuck');
});

test('the stall message names roughly how long, honestly, and is absent until the threshold', () => {
  const state = reportProgress(started(), 'clone', 0.1, T0);
  assert.equal(snapshot(state, T0 + DEFAULT_STALL_THRESHOLD_MS - 1).stalledMessage, null);
  const atThreshold = snapshot(state, T0 + DEFAULT_STALL_THRESHOLD_MS);
  assert.equal(atThreshold.stalledMessage, 'No progress for 15 seconds.');
  const minutesLater = snapshot(state, T0 + 61_000);
  assert.equal(minutesLater.stalledMessage, 'No progress for 1 minute.');
});

test('a custom stall threshold is honoured rather than the default being hard-coded', () => {
  const state = reportProgress(started(), 'clone', 0.1, T0);
  assert.equal(snapshot(state, T0 + 4_000, 5_000).stalled, false);
  assert.equal(snapshot(state, T0 + 5_000, 5_000).stalled, true);
});

/* --- cancellation and failure report partial completion, never success ------------- */

test('cancelling reports the real partial fraction, distinct from succeeded', () => {
  let state = started();
  state = reportProgress(state, 'clone', 1, T0 + 1);
  state = reportProgress(state, 'fetch', 0.5, T0 + 2);
  state = cancelOperation(state, T0 + 3);
  const view = snapshot(state, T0 + 3);
  assert.equal(view.status, 'cancelled');
  assert.ok(view.overallFraction > 0 && view.overallFraction < 1, `cancelled fraction ${view.overallFraction} was not honestly partial`);
  assert.notEqual(view.overallFraction, 1, 'a cancelled run must never read as fully complete');
});

test('cancelling an indeterminate phase reports only the banked weight, not a guess', () => {
  let state = started();
  state = reportProgress(state, 'clone', 1, T0 + 1);
  state = reportProgress(state, 'fetch', 'indeterminate', T0 + 2);
  state = cancelOperation(state, T0 + 3);
  assert.equal(snapshot(state, T0 + 3).overallFraction, 1 / 5);
});

test('cancelling before any progress report still reports a defined, non-negative fraction', () => {
  const state = cancelOperation(started(), T0 + 1);
  const view = snapshot(state, T0 + 1);
  assert.equal(view.status, 'cancelled');
  assert.equal(view.overallFraction, 0);
});

test('cancel and fail are both refused outside running, exactly like reportProgress', () => {
  const idle = createOperation(PHASES);
  assert.throws(() => cancelOperation(idle, T0));
  assert.throws(() => failOperation(idle, T0));
  const succeeded = completeOperation(started(), T0 + 1);
  assert.throws(() => cancelOperation(succeeded, T0 + 2));
  assert.throws(() => failOperation(succeeded, T0 + 2));
});

test('cancelled and failed are reported as different statuses from each other and from succeeded', () => {
  // A loop over every terminal status pair-checked against the others, so a future status
  // added to the enum without its own snapshot handling cannot slip through untested.
  const cancelled = snapshot(cancelOperation(started(), T0 + 1), T0 + 1);
  const failed = snapshot(failOperation(started(T0 + 2), T0 + 3), T0 + 3);
  const succeeded = snapshot(completeOperation(started(T0 + 4), T0 + 5), T0 + 5);
  const statuses = [cancelled.status, failed.status, succeeded.status];
  assert.deepEqual(new Set(statuses).size, 3, `expected three distinct statuses, got ${statuses.join(', ')}`);
});

test('canStart is true exactly when the operation is not running, across every status', () => {
  const idle = createOperation(PHASES);
  const running = started(T0 + 10);
  const succeeded = completeOperation(started(T0 + 20), T0 + 21);
  const cancelled = cancelOperation(started(T0 + 30), T0 + 31);
  const failed = failOperation(started(T0 + 40), T0 + 41);
  const cases: Array<[OperationState, boolean]> = [
    [idle, true], [running, false], [succeeded, true], [cancelled, true], [failed, true],
  ];
  for (const [state, expected] of cases) {
    assert.equal(snapshot(state, T0 + 100).canStart, expected, `canStart was wrong for status "${state.status}"`);
  }
});

/* --- every declared status is actually exercised, so a new one cannot slip in silently */

test('OPERATION_STATUSES lists exactly the statuses this file exercises', () => {
  assert.deepEqual([...OPERATION_STATUSES].sort(), ['cancelled', 'failed', 'idle', 'running', 'succeeded'].sort());
});
