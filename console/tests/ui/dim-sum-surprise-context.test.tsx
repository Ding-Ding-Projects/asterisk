/**
 * dim-sum-surprise-context.ts.
 *
 * dim-sum-surprise.ts was always correct and always untested-in-anger: nothing ever
 * called `surpriseFor` with a real signal, because nothing translated the running
 * console's own state into the `StartupContext` it expects. These tests cover that
 * translation directly, with no DOM and no React involved -- see
 * dim-sum-surprise-runtime.test.tsx for the part that proves the translation is
 * actually reached from the real mount chain.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createLaunchGate, decideDimSumSurprise, resolveStartupContext, type RuntimeSignals,
} from '../../app/renderer/src/dim-sum-surprise-context.ts';
import { SUPPRESSED_CONTEXTS, type Dish } from '../../app/renderer/src/dim-sum-surprise.ts';

const DISHES: readonly Dish[] = [
  { id: 'har-gow', nameEn: 'Shrimp dumpling', nameZhHant: '蝦餃', asset: 'assets/dim-sum/har-gow.webp' },
  { id: 'siu-mai', nameEn: 'Pork dumpling', nameZhHant: '燒賣', asset: 'assets/dim-sum/siu-mai.webp' },
];

const QUIET: RuntimeSignals = {
  isFirstLaunch: false, updaterState: 'idle', unsavedDraftCount: 0, restartPending: false, lowStimulationEnabled: false,
};

/* --- resolveStartupContext: each suppressed context, reachable on its own -------- */

test('a first launch resolves to first-run, however calm everything else is', () => {
  assert.equal(resolveStartupContext({ ...QUIET, isFirstLaunch: true }), 'first-run');
});

test('an unreviewed PBX draft resolves to mid-task', () => {
  assert.equal(resolveStartupContext({ ...QUIET, unsavedDraftCount: 1 }), 'mid-task');
});

test('a pending restart resolves to mid-task even with no drafts open', () => {
  assert.equal(resolveStartupContext({ ...QUIET, restartPending: true }), 'mid-task');
});

test('a failed update check resolves to error, not update', () => {
  assert.equal(resolveStartupContext({ ...QUIET, updaterState: 'failed' }), 'error');
});

test('every other non-idle updater state resolves to update', () => {
  for (const state of ['checking', 'available', 'downloading', 'ready'] as const) {
    assert.equal(resolveStartupContext({ ...QUIET, updaterState: state }), 'update', `${state} was not treated as an update`);
  }
});

test('low-stimulation mode resolves to quiet-hours', () => {
  assert.equal(resolveStartupContext({ ...QUIET, lowStimulationEnabled: true }), 'quiet-hours');
});

test('an idle updater, no drafts, no restart, not first launch, no low stimulation is normal', () => {
  assert.equal(resolveStartupContext(QUIET), 'normal');
});

test('every value this module can produce is either normal or one of the pure module\'s own suppressed contexts', () => {
  const possible: RuntimeSignals[] = [
    { ...QUIET },
    { ...QUIET, isFirstLaunch: true },
    { ...QUIET, unsavedDraftCount: 3 },
    { ...QUIET, restartPending: true },
    { ...QUIET, updaterState: 'failed' },
    { ...QUIET, updaterState: 'downloading' },
    { ...QUIET, lowStimulationEnabled: true },
  ];
  for (const signals of possible) {
    const context = resolveStartupContext(signals);
    assert.ok(context === 'normal' || (SUPPRESSED_CONTEXTS as readonly string[]).includes(context), `resolveStartupContext invented a context: ${context}`);
  }
});

/* --- priority: only one context wins when several signals are true at once ------- */

test('first-run outranks every other signal', () => {
  const signals: RuntimeSignals = {
    isFirstLaunch: true, updaterState: 'failed', unsavedDraftCount: 5, restartPending: true, lowStimulationEnabled: true,
  };
  assert.equal(resolveStartupContext(signals), 'first-run');
});

test('an unreviewed draft outranks an update in progress', () => {
  const signals: RuntimeSignals = {
    isFirstLaunch: false, updaterState: 'downloading', unsavedDraftCount: 1, restartPending: false, lowStimulationEnabled: false,
  };
  assert.equal(resolveStartupContext(signals), 'mid-task');
});

test('an update in progress outranks low-stimulation mode', () => {
  const signals: RuntimeSignals = {
    isFirstLaunch: false, updaterState: 'ready', unsavedDraftCount: 0, restartPending: false, lowStimulationEnabled: true,
  };
  assert.equal(resolveStartupContext(signals), 'update');
});

/* --- createLaunchGate: exactly one draw per gate ---------------------------------- */

test('a fresh gate consumes true exactly once, false forever after', () => {
  const gate = createLaunchGate();
  assert.equal(gate.consume(), true);
  assert.equal(gate.consume(), false);
  assert.equal(gate.consume(), false);
});

test('two independent gates do not share state', () => {
  const a = createLaunchGate();
  const b = createLaunchGate();
  assert.equal(a.consume(), true);
  assert.equal(b.consume(), true, 'gate b was affected by consuming gate a');
});

/* --- decideDimSumSurprise: the whole wiring, in one call -------------------------- */

test('a winning draw on a genuinely idle launch produces a surprise', () => {
  const result = decideDimSumSurprise({
    dishes: DISHES, signals: QUIET, draw: 0.01, pick: 0, gate: createLaunchGate(),
  });
  assert.ok(result, 'no surprise was produced for a winning draw on an ordinary launch');
  assert.equal(result!.dish.id, 'har-gow');
});

test('the draw happens once per gate and not twice: a second decision on the same gate produces nothing', () => {
  const gate = createLaunchGate();
  const first = decideDimSumSurprise({ dishes: DISHES, signals: QUIET, draw: 0.01, pick: 0, gate });
  assert.ok(first, 'the first decision on a fresh gate did not fire on a winning draw');

  const second = decideDimSumSurprise({ dishes: DISHES, signals: QUIET, draw: 0.01, pick: 0, gate });
  assert.equal(second, undefined, 'a second decision on an already-consumed gate produced a surprise -- the real rate is now higher than stated');
});

test('every suppressed context really suppresses the surprise, even on a winning draw', () => {
  const bySignal: Record<(typeof SUPPRESSED_CONTEXTS)[number], RuntimeSignals> = {
    'first-run': { ...QUIET, isFirstLaunch: true },
    error: { ...QUIET, updaterState: 'failed' },
    update: { ...QUIET, updaterState: 'downloading' },
    'mid-task': { ...QUIET, unsavedDraftCount: 2 },
    'quiet-hours': { ...QUIET, lowStimulationEnabled: true },
  };
  for (const context of SUPPRESSED_CONTEXTS) {
    const signals = bySignal[context];
    assert.equal(resolveStartupContext(signals), context, `fixture for ${context} did not actually resolve to it`);
    const result = decideDimSumSurprise({
      dishes: DISHES, signals, draw: 0.01, pick: 0, gate: createLaunchGate(),
    });
    assert.equal(result, undefined, `${context} did not suppress a winning draw`);
  }
});

test('an empty catalogue -- the real bundled state today -- never fires, whatever the signals say', () => {
  const result = decideDimSumSurprise({
    dishes: [], signals: QUIET, draw: 0.01, pick: 0, gate: createLaunchGate(),
  });
  assert.equal(result, undefined);
});
