/**
 * Every method the compiled shell calls on itself exists on the app that mounts it.
 *
 * This exists because one did not. `setVal` in `generated/console.tsx` -- the setter every
 * control on every screen goes through -- ends its `setState` callback with
 * `this.onUserMutation('control:' + (c.id || 'unknown'))`, and nothing in this tree defined
 * it. Changing any control threw `this.onUserMutation is not a function`.
 *
 * Three things had to line up for that to ship, and each is worth naming because each is
 * still true of the next callback somebody drops:
 *
 *  - The generated shell begins `// @ts-nocheck`, so calling a method that does not exist
 *    is not a type error. `tsc -b` was clean over it.
 *  - The shell is compiled from the design and the app subclasses it, so the call and the
 *    definition live in different files with no compiler relating them.
 *  - The one test covering that exact call site assigns `shell.onUserMutation = ...` onto
 *    its own instance before driving it. It proves the call is made; it cannot see whether
 *    anything answers it. That is the whole shape of "a test that injects the dependency
 *    proves the screen and nothing about the wiring", and it kept 1,858 renderer tests
 *    green over a crash on the commonest interaction the console has.
 *
 * So this reads the calls out of the shipped shell rather than from a list. A list catches
 * a callback implemented wrongly and can never catch one nobody remembered to add, which
 * is exactly the failure here.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/* App.bridge() reads `window.dingDesktop`; outside a browser there is no `window` at all,
 * so stub the minimum the constructor touches -- the same stub every other "-wired" test
 * in this directory uses. */
(globalThis as { window?: unknown }).window ??= {} as unknown;

import { App } from '../../app/renderer/src/App';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const shell = readFileSync(resolve(root, 'app/renderer/src/generated/console.tsx'), 'utf8').replace(/\r\n|\r/gu, '\n');

interface ControlRef { id?: string; label?: string; kind?: string; value?: unknown }
type Instance = Record<string, unknown> & {
  state: Record<string, unknown>;
  setVal: (control: ControlRef, value: unknown) => void;
};
const Base = App as unknown as new (props: unknown) => Instance;

/** React's mounted updater semantics, applied synchronously so a setState callback runs
 *  in the same turn -- which is where the missing call actually fired. */
function withSyncUpdater(instance: Instance): Instance {
  (instance as unknown as { updater: unknown }).updater = {
    isMounted: () => true,
    enqueueForceUpdate() {},
    enqueueReplaceState(target: Instance, state: Record<string, unknown>) { target.state = state; },
    enqueueSetState(target: Instance, partial: unknown, callback?: () => void) {
      const next = typeof partial === 'function'
        ? (partial as (state: Record<string, unknown>) => Record<string, unknown>)(target.state)
        : partial as Record<string, unknown>;
      target.state = { ...target.state, ...next };
      callback?.();
    },
  };
  return instance;
}

/** Every `this.name(` the shipped shell makes on itself. */
function selfCalls(): string[] {
  const names = new Set<string>();
  for (const match of shell.matchAll(/this\.([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/gu)) names.add(match[1]);
  return [...names].sort();
}

test('the scan finds the shell calls, so nothing below can pass by finding nothing', () => {
  const names = selfCalls();
  assert.ok(shell.length > 100000, `the compiled shell read as ${shell.length} chars, too small to be the real one`);
  assert.ok(names.length > 40, `only ${names.length} self-calls were found in the compiled shell`);
  assert.ok(names.includes('onUserMutation'), 'the shell no longer calls onUserMutation, so this regression cannot recur through it');
  assert.ok(names.includes('setState'), 'the scan is not finding ordinary React calls, so its pattern has stopped matching');
});

test('every method the compiled shell calls on itself resolves on a real App instance', () => {
  const instance = new Base({});
  const missing = selfCalls().filter((name) => typeof instance[name] !== 'function');
  assert.deepEqual(missing, [],
    `the compiled shell calls these on itself and nothing defines them: ${missing.join(', ')}`);
});

test('changing a control does not throw, which is the symptom the missing callback produced', () => {
  const instance = withSyncUpdater(new Base({}));
  /* The real `setVal`, on the real App, with no method assigned onto the instance first.
   * Before `onUserMutation` was defined this threw inside the setState callback. */
  instance.setVal({ id: 'att_focus', label: 'Focus', kind: 'switch', value: false }, true);
  assert.equal((instance.state.values as Record<string, unknown>)['att_focus'], true,
    'the control value did not reach the shell state, so this passed without exercising the setter');
});
