/**
 * The mutation hook the compiled shell calls, proved on the real `App` with nothing
 * supplied that the running application would not supply for itself.
 *
 * This file exists because of a bug that shipped and that a four-thousand-test suite
 * could not see. `scripts/extend-pbx-m3.mjs` injects
 * `this.onUserMutation('control:' + (c.id || 'unknown'))` into the compiled shell's
 * value writer, inside the callback React runs after the state write commits. No class
 * declared `onUserMutation`. So every accepted control value in the packaged console
 * threw `TypeError: this.onUserMutation is not a function`.
 *
 * Two habits hid it, and both are worth naming because either alone is enough:
 *
 *   1. `generated-control-mutation.test.tsx` assigns its own `onUserMutation` onto the
 *      shell before calling `setVal`. It is a fair test of the shell in isolation and it
 *      says nothing whatever about whether a subclass supplies the method -- the seam it
 *      stubs is exactly the seam that was broken.
 *   2. Every harness that drives the real `App` stubbed `enqueueSetState` and dropped
 *      its `callback` argument. That argument is the only place this call runs, so the
 *      call never executed in any test in the repository.
 *
 * Everything below therefore uses an updater that runs the callback, and stubs no part
 * of the attention path. The first test is the one that would have caught the original
 * bug on the day it landed.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

// App.bridge() reads `window.dingDesktop`; outside a browser there is no `window` global
// at all, so stub the minimum this path touches -- the same stub every other "-wired"
// test in this directory uses.
(globalThis as { window?: unknown }).window ??= {} as unknown;

import { App } from '../../app/renderer/src/App';
import { ATTENTION_MUTATION_ACTIONS } from '../../app/renderer/src/attention-modes';

interface ControlRef { id?: string; label?: string; kind?: string; value?: unknown }
interface AppInstance {
  state: Record<string, unknown>;
  setVal: (control: ControlRef, value: unknown) => void;
  set: (key: string, value: unknown) => void;
  onUserMutation: (source?: string) => void;
}
const Base = App as unknown as new (props: unknown) => AppInstance;

/**
 * A mounted component's updater, including the part the other harnesses leave out.
 *
 * `callback` is React's post-commit callback. Running it is what makes this a test of
 * the application rather than of an application-shaped object, and it is the single
 * difference between this harness and the five it is modelled on.
 */
function withCommittingUpdater(instance: AppInstance): AppInstance {
  (instance as unknown as { updater: unknown }).updater = {
    isMounted: () => true,
    enqueueForceUpdate() {},
    enqueueReplaceState(publicInstance: AppInstance, state: Record<string, unknown>) { publicInstance.state = state; },
    enqueueSetState(publicInstance: AppInstance, partial: unknown, callback?: () => void) {
      const patch = typeof partial === 'function'
        ? (partial as (state: Record<string, unknown>) => Record<string, unknown>)(publicInstance.state)
        : partial as Record<string, unknown>;
      publicInstance.state = { ...publicInstance.state, ...patch };
      callback?.();
    },
  };
  return instance;
}

function liveApp(): AppInstance {
  return withCommittingUpdater(new Base({}));
}

/** Records every mutation the instance reports, without replacing the method under
 *  test -- the real `onUserMutation` still runs and still moves the clock. */
function watchMutations(app: AppInstance): string[] {
  const seen: string[] = [];
  const real = app.onUserMutation.bind(app);
  app.onUserMutation = (source?: string): void => { seen.push(String(source)); real(source); };
  return seen;
}

/** The private field the attention rail reads for "Last change ... ago". */
const lastChangeAt = (app: AppInstance): number =>
  (app as unknown as { lastChangeAt: number }).lastChangeAt;

/**
 * Winds the clock back before an action, so "did it move" is answerable.
 *
 * The first draft of these tests read the field, acted, and asserted the new value was
 * `>= ` the old one. It cannot fail: a method whose body has been emptied leaves the
 * field at whatever it already held, and any number is `>=` itself. Two runs of
 * `Date.now()` inside one synchronous test are frequently the same millisecond too, so
 * a strict `>` on the untouched field would have been flaky rather than wrong. Setting
 * it to an unmistakable past value removes both problems.
 */
const STALE = 1_000;
function windClockBack(app: AppInstance): void {
  (app as unknown as { lastChangeAt: number }).lastChangeAt = STALE;
}

/* --- the crash ------------------------------------------------------------------- */

test('changing a control on the real App does not throw, with React\'s commit callback run', () => {
  const app = liveApp();
  /* Nothing is assigned onto the instance here. If `onUserMutation` is missing from the
   * class again, this throws `this.onUserMutation is not a function`, which is exactly
   * what the packaged console did on every control change. */
  app.setVal({ id: 'att_focus', label: 'Focus', kind: 'switch', value: false }, true);
});

test('the App itself declares the method the compiled shell calls', () => {
  assert.equal(typeof liveApp().onUserMutation, 'function',
    'the compiled shell calls this.onUserMutation from its value writer; nothing else declares it');
});

test('an accepted control change moves the clock the attention rail reads', () => {
  const app = liveApp();
  assert.equal(typeof lastChangeAt(app), 'number');
  const seen = watchMutations(app);
  windClockBack(app);
  app.setVal({ id: 'att_focus', label: 'Focus', kind: 'switch', value: false }, true);
  assert.deepEqual(seen, ['control:att_focus']);
  assert.ok(lastChangeAt(app) > STALE, 'the last-change reading did not move, so "Last change ... ago" would be frozen');
});

/* --- the twelve keys the shell writes through set() -------------------------------- */

const SET_KEYS = ATTENTION_MUTATION_ACTIONS.filter((action) => action.action === 'set').map((action) => action.key);

test('the inventory still names twelve distinct set() mutation keys', () => {
  /* A floor and a shape, so a later edit that empties the list cannot make every
   * per-key assertion below pass by iterating over nothing. */
  assert.equal(SET_KEYS.length, 12);
  assert.equal(new Set(SET_KEYS).size, 12);
});

for (const key of SET_KEYS) {
  test(`set('${key}', ...) reports a mutation and moves the clock`, () => {
    const app = liveApp();
    const seen = watchMutations(app);
    windClockBack(app);
    app.set(key, `${String(app.state[key])}-changed`);
    assert.deepEqual(seen, [`set:${key}`], `changing ${key} reported ${JSON.stringify(seen)}`);
    assert.ok(lastChangeAt(app) > STALE, `changing ${key} did not move the last-change reading`);
  });
}

test('writing the same value again reports nothing, so the idle reading is not resettable by repeating yourself', () => {
  const app = liveApp();
  app.set('canvasTool', 'split');
  const seen = watchMutations(app);
  app.set('canvasTool', 'split');
  assert.deepEqual(seen, [], 'an unchanged value was reported as a mutation');
});

test('navigation is not a mutation', () => {
  /* `set()` is the shell's general state writer and most of what goes through it is
   * passive. Reporting all of it would make "nothing has changed for 40 minutes"
   * answerable by scrolling, which is the reading Momentum exists to give. */
  const app = liveApp();
  const seen = watchMutations(app);
  app.set('screen', 'endpoints');
  app.set('railId', 'agent');
  assert.deepEqual(seen, []);
});

test('a passive key that is not on the list stays off it', () => {
  assert.equal(SET_KEYS.includes('screen'), false, 'the screen you are looking at is not your data');
  assert.equal(SET_KEYS.includes('railId'), false);
});
