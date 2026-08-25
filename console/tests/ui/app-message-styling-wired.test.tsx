/**
 * The App-level proof: `renderMessage()` and `buildDialog()` returning the right
 * string in isolation (see funny-levels.test.tsx and dialog-emojis.test.tsx) is exactly
 * what already passed while the feature did nothing -- neither had a caller anywhere
 * outside its own test file. This file instantiates the real `App` and calls its real
 * `fire`/`toast`/`areYouSure`, the three dialog and message-box surfaces the compiled
 * shell exposes, then reads back what actually landed in component state. If App.tsx's
 * wrapping were ever removed, every "genuinely differs" assertion below would start
 * failing -- see the BREAK CHECK section, which was run against the unwrapped shell to
 * prove it.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

(globalThis as unknown as { window?: unknown }).window ??= globalThis;
(globalThis as unknown as { crypto?: unknown }).crypto ??= { randomUUID: () => 'test-uuid' };

const { App } = await import('../../app/renderer/src/App.tsx');
const { funnyLevel, setFunnyLevel } = await import('../../app/renderer/src/funny-levels.ts');
const { ALL_DIALOG_EMOJI, DIALOG_EMOJI, setEmojisEnabled } = await import('../../app/renderer/src/dialog-emojis.ts');
const { setLanguageMode } = await import('../../app/renderer/src/text-boundary.ts');

interface AppInstance {
  state: Record<string, unknown>;
  durableStorage: { storage: { getItem(k: string): string | null; setItem(k: string, v: string): void } };
  fire(title: string, body: string): void;
  toast(message: string): void;
  areYouSure(title: string, body: string, seconds: number, onConfirm: () => void): void;
  setVal(control: { id?: string; label?: string }, value: unknown): void;
  renderVals(): Record<string, unknown>;
  componentDidMount?(): void;
}

/**
 * A minimal synchronous React updater. `App` is instantiated directly here rather than
 * through ReactDOM's reconciler (there is no DOM in this test environment, and no live
 * PBX reading for the design's table screens to read from either -- see
 * app-no-sample-data.test.tsx for the same constraint). With no real updater assigned,
 * React's default `ReactNoopUpdateQueue` silently drops every `setState` call, which
 * would make every assertion below pass or fail for the wrong reason: `fire`, `toast`
 * and `areYouSure` all reach the screen through `this.setState`, so this has to behave
 * the way a mounted component's updater actually does.
 */
function withSyncUpdater(instance: AppInstance): AppInstance {
  (instance as unknown as { updater: unknown }).updater = {
    isMounted: () => true,
    enqueueForceUpdate() {},
    enqueueReplaceState(publicInstance: AppInstance, state: Record<string, unknown>) { publicInstance.state = state; },
    enqueueSetState(publicInstance: AppInstance, partial: unknown) {
      const next = typeof partial === 'function'
        ? (partial as (s: Record<string, unknown>) => Record<string, unknown>)(publicInstance.state)
        : partial as Record<string, unknown>;
      publicInstance.state = { ...publicInstance.state, ...next };
    },
  };
  return instance;
}

/** A fresh, unmounted `App` with a synchronous updater and English display mode.
 *  `componentDidMount` is never called, so no async discovery or storage bootstrap
 *  kicks off underneath a synchronous test -- exactly the pattern
 *  app-no-sample-data.test.tsx already uses for the same reason. */
function freshApp(): AppInstance {
  setLanguageMode('en');
  class Bare extends (App as unknown as new (props: unknown) => AppInstance) {
    componentDidMount() { /* no async discovery in a synchronous test */ }
  }
  return withSyncUpdater(new (Bare as unknown as new () => AppInstance)());
}

/* --- fire(): the celebratory title/body popup --------------------------------------- */

test('fire() renders through the real funny-level pipeline, not the bare call-site text', () => {
  const instance = freshApp();
  const storage = instance.durableStorage.storage;
  setFunnyLevel(storage, 'en', 1);
  instance.fire('Connection removed', 'acme-trunk was removed from the server list.');
  const plain = instance.state.celebrateSub as string;
  assert.equal(plain, 'acme-trunk was removed from the server list.', 'level 1 should render with no frame at all');

  setFunnyLevel(storage, 'en', 5);
  instance.fire('Connection removed', 'acme-trunk was removed from the server list.');
  const loud = instance.state.celebrateSub as string;
  assert.notEqual(loud, plain, 'moving the English funny level from 1 to 5 rendered identical fire() output');
  assert.ok(loud.includes('acme-trunk was removed from the server list.'), 'the affected server name dropped out at level 5');
});

test('fire() carries the emoji switch too, and only when it is on', () => {
  const instance = freshApp();
  const storage = instance.durableStorage.storage;
  setEmojisEnabled(storage, false);
  instance.fire('Not found', 'acme-trunk is no longer in the server list.');
  const undecorated = instance.state.celebrateTitle as string;
  for (const emoji of ALL_DIALOG_EMOJI) assert.ok(!undecorated.startsWith(emoji), `${emoji} appeared with the setting off`);

  setEmojisEnabled(storage, true);
  instance.fire('Not found', 'acme-trunk is no longer in the server list.');
  const decorated = instance.state.celebrateTitle as string;
  assert.ok(decorated.startsWith(DIALOG_EMOJI.error), `expected the error emoji on a "Not found" heading, got "${decorated}"`);
});

/* --- toast(): the one-line message box ----------------------------------------------- */

test('toast() renders through the same pipeline as fire()', () => {
  const instance = freshApp();
  const storage = instance.durableStorage.storage;
  setFunnyLevel(storage, 'en', 1);
  instance.toast('Editor choice forgotten');
  const plain = instance.state.toastText as string;
  assert.equal(plain, 'Editor choice forgotten');

  setFunnyLevel(storage, 'en', 5);
  instance.toast('Editor choice forgotten');
  const loud = instance.state.toastText as string;
  assert.notEqual(loud, plain, 'toast() rendered the same text at level 1 and level 5');
  assert.ok(loud.includes('Editor choice forgotten'), 'the fact dropped out of a level-5 toast');
});

/* --- areYouSure(): every call site is a confirmation gate --------------------------- */

test('areYouSure() styles its title and body, and never mis-fires the destructive emoji into control text', () => {
  const instance = freshApp();
  const storage = instance.durableStorage.storage;
  setFunnyLevel(storage, 'en', 1);
  instance.areYouSure('Delete 1001', 'This removes 1001 and its auth and aor sections. It cannot be undone.', 3, () => {});
  const plainBody = instance.state.sureBody as string;
  assert.equal(plainBody, 'This removes 1001 and its auth and aor sections. It cannot be undone.');

  setFunnyLevel(storage, 'en', 5);
  setEmojisEnabled(storage, true);
  instance.areYouSure('Delete 1001', 'This removes 1001 and its auth and aor sections. It cannot be undone.', 3, () => {});
  const loudBody = instance.state.sureBody as string;
  assert.notEqual(loudBody, plainBody, 'areYouSure() rendered identical text across level 1 and level 5 with emoji on');
  assert.ok(loudBody.includes('1001'), 'the affected endpoint id dropped out of the confirmation body');
  assert.ok(loudBody.includes('cannot be undone'), 'the irreversibility warning dropped out of the confirmation body');
  assert.ok((instance.state.sureTitle as string).startsWith(DIALOG_EMOJI.question), 'expected areYouSure() to classify as \'question\', never guessing at \'destructive\'');
});

/* --- the two language dials are independent, at the App level, not just the module -- */

test('switching the Cantonese level alone never changes an English-mode dialog', () => {
  const instance = freshApp();
  const storage = instance.durableStorage.storage;
  setLanguageMode('en');
  setFunnyLevel(storage, 'en', 1);
  instance.fire('Ticket filed', 'Ticket 4821 was recorded.');
  const before = instance.state.celebrateSub as string;

  setFunnyLevel(storage, 'yue', 5);
  instance.fire('Ticket filed', 'Ticket 4821 was recorded.');
  const after = instance.state.celebrateSub as string;
  assert.equal(before, after, 'raising the Cantonese level changed an English-display fire() call');
});

test('Cantonese display mode renders real Cantonese framing at level 5, distinct from English', () => {
  const instance = freshApp();
  const storage = instance.durableStorage.storage;
  setFunnyLevel(storage, 'en', 1);
  setFunnyLevel(storage, 'yue', 5);

  setLanguageMode('en');
  instance.fire('Ticket filed', 'Ticket 4821 was recorded.');
  const enText = instance.state.celebrateSub as string;

  setLanguageMode('yue');
  instance.fire('Ticket filed', 'Ticket 4821 was recorded.');
  const yueText = instance.state.celebrateSub as string;

  assert.notEqual(yueText, enText, 'switching display language with two different stored levels rendered identical text');
  assert.ok(yueText.includes('Ticket 4821 was recorded.'), 'the fact dropped out of the Cantonese-framed dialog');
  assert.match(yueText, /[一-鿿]/u, 'expected real Cantonese characters once the Cantonese dial applied');
  setLanguageMode('en');
});

/* --- the fun_level / chaos-dial control id collision, fixed at the design level ----- */

test('BREAK CHECK proof: the funny-level slider no longer overflows the unrelated chaos-dial lookup table', () => {
  /* Before the fix, both this copy-styling slider and a legacy random-appearance-chaos
   * dial (0-4, indexing a 5-entry table) shared the control id `fun_level`. Setting the
   * slider to its own maximum of 5 therefore indexed the chaos dial's table one past its
   * end. The dial now reads its own `chaos_level` key, so the funny-level value cannot
   * reach it at all. */
  const instance = freshApp();
  (instance.state.values as Record<string, unknown>).fun_level = 5;
  const rendered = instance.renderVals() as { funName: string; funLevel: string };
  assert.equal(rendered.funName, 'Balanced', 'the chaos dial read the funny-level slider and fell off the end of its own table');
  assert.equal(rendered.funLevel, '2', 'the chaos dial should still be reading its own default, not the funny-level value');
});

test('driving the chaos dial through its own 0-4 range no longer corrupts the persisted funny-level setting', () => {
  /* This is the collision's other direction: both controls previously routed through
   * the same setVal interception (`languageAwareSetVal` acts on any control whose id is
   * 'fun_level'), so picking a chaos-dial level of 1-4 -- itself a valid funny level --
   * silently overwrote whatever the person had chosen on the Customise screen. */
  const instance = freshApp();
  const storage = instance.durableStorage.storage;
  setFunnyLevel(storage, 'en', 5);
  instance.setVal({ id: 'chaos_level', label: 'Chaos level' }, 4);
  assert.equal(funnyLevel(storage, 'en'), 5, 'picking a chaos-dial level corrupted the persisted funny-level setting');
});

/* --- BREAK CHECK, run for real: the unwrapped shell fails these assertions ---------- */

test('BREAK CHECK proof: calling the SHELL\'s own unwrapped fire() (bypassing App\'s wrapping) fails the "genuinely differs" assertion', () => {
  /* This is the shape of the exact defect this lane fixed: before App.tsx wrapped
   * fire/toast/areYouSure, calling the shell's own implementation directly rendered the
   * bare call-site string regardless of the stored funny level. Reaching for the base
   * (pre-wrap) function here, captured by App's own constructor under `baseFire`,
   * reproduces that old behaviour without needing a second copy of the shell. */
  const instance = freshApp();
  const storage = instance.durableStorage.storage;
  const base = (instance as unknown as { baseFire: (title: string, body: string) => void }).baseFire;

  setFunnyLevel(storage, 'en', 1);
  base.call(instance, 'Connection removed', 'acme-trunk was removed from the server list.');
  const level1 = instance.state.celebrateSub as string;

  setFunnyLevel(storage, 'en', 5);
  base.call(instance, 'Connection removed', 'acme-trunk was removed from the server list.');
  const level5 = instance.state.celebrateSub as string;

  assert.equal(level1, level5, 'sanity check: the unwrapped shell fire() is level-blind, exactly as it was before this fix');
  assert.throws(() => assert.notEqual(level1, level5), assert.AssertionError,
    'the wired test above would not have failed against the unfixed, unwrapped implementation');
});
