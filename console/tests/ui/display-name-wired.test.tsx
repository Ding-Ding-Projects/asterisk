/**
 * The rename actually reaching a screen, rather than the helper that computes what it
 * would say if anything called it.
 *
 * `display-name.test.tsx` already exhaustively covers `nameFor()`, `displayName()` and
 * the identity that must never move -- this file does not repeat that. What was missing
 * before this lane is proof that a rename shows up anywhere at all: `nameFor()` was
 * never called outside its own tests, and `displayName()` was called exactly once, only
 * to seed the settings field's own value. Every test below fails if that regresses --
 * each one renders (or drives) the real `App`, not the display-name module alone.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// App.bridge() reads `window.dingDesktop`; outside a browser/jsdom environment there
// is no `window` global at all, so stub the minimum this render path touches -- the
// same stub every other "-wired" test in this directory uses.
(globalThis as { window?: unknown }).window ??= {} as unknown;

import { App } from '../../app/renderer/src/App';
import {
  IDENTITY, MAX_DISPLAY_NAME_LENGTH, displayName, setDisplayName, type NameStorage,
} from '../../app/renderer/src/display-name.ts';

const strip = (markup: string) => markup.replace(/<[^>]*>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');

interface ControlRef { id?: string; label?: string; kind?: string }
interface AppInstance {
  state: Record<string, unknown>;
  durableStorage: { storage: NameStorage };
  setVal: (control: ControlRef, value: unknown) => void;
}
const Base = App as unknown as new (props: unknown) => AppInstance;

/** Directly constructed App instances need React's mounted updater semantics for
 * stateful calls. The helper is intentionally synchronous because these tests inspect
 * state in the same turn as the action they exercise. */
function withSyncUpdater(instance: AppInstance): AppInstance {
  (instance as unknown as { updater: unknown }).updater = {
    isMounted: () => true,
    enqueueForceUpdate() {},
    enqueueReplaceState(publicInstance: AppInstance, state: Record<string, unknown>) { publicInstance.state = state; },
    enqueueSetState(publicInstance: AppInstance, partial: unknown) {
      const next = typeof partial === 'function'
        ? (partial as (state: Record<string, unknown>) => Record<string, unknown>)(publicInstance.state)
        : partial as Record<string, unknown>;
      publicInstance.state = { ...publicInstance.state, ...next };
    },
  };
  return instance;
}

/** Renders the real `App` (not the bare compiled shell) pinned on a screen, with the
 *  display name seeded into the exact storage handle the running app itself reads --
 *  the same pattern every other "-wired" test in this directory uses for its own
 *  screen, applied here to prove the name reaches rendered markup rather than only
 *  the helper that computes it. */
function renderAppScreen(screen: string, seedName?: string, overrides: Record<string, unknown> = {}): string {
  class Pinned extends Base {
    constructor(props: unknown) {
      super(props);
      if (seedName !== undefined) setDisplayName(this.durableStorage.storage, seedName);
      this.state = { ...this.state, screen, railId: 'app', onboardOpen: false, ...overrides };
    }
  }
  return renderToStaticMarkup(createElement(Pinned as never));
}

/** A live instance, for driving `setVal` and inspecting the resulting state directly
 *  -- `renderToStaticMarkup` never calls lifecycle methods, and a toast is `state`,
 *  not markup a static render would ever contain. */
function liveApp(seedName?: string): AppInstance {
  const instance = withSyncUpdater(new Base({}));
  if (seedName !== undefined) setDisplayName(instance.durableStorage.storage, seedName);
  return instance;
}

/* --- the title bar --------------------------------------------------------------- */

test('the title bar shows the shipped name until the app is renamed', () => {
  const text = strip(renderAppScreen('dash'));
  assert.ok(text.includes(IDENTITY.productName), `expected the shipped name in: ${text.slice(0, 200)}`);
});

test('the title bar shows the chosen name once the app has been renamed', () => {
  const text = strip(renderAppScreen('dash', 'Reception'));
  assert.ok(text.includes('Reception'), `expected the chosen name in: ${text.slice(0, 200)}`);
});

test('the title bar renders on every screen, not only the one it happened to be tested on', () => {
  for (const screen of ['dash', 'endpoints', 'about', 'customise', 'notifications']) {
    const text = strip(renderAppScreen(screen, 'Reception'));
    assert.ok(text.includes('Reception'), `screen "${screen}" did not show the chosen name`);
  }
});

/* --- the About screen -------------------------------------------------------------- */

/**
 * Two halves, pinned separately, because they used to be one and that was the defect.
 *
 * The name lived in the `<h1>`, which made the heading read `About Material Asterisk`
 * where the design's own reads `About`. The parity capture driver settles on the heading
 * to prove it arrived at the destination it clicked towards, so About was the single
 * destination of thirty-two with no built capture at all -- recorded in
 * `release/evidence/parity/run-built.json` as `heading settled on 'About Ding PBX
 * Console', not 'About'`.
 *
 * So the heading is now the design's, and the rename reaches the About screen's body
 * instead. Both facts need their own assertion: a test that only checked the name was
 * somewhere on the screen would pass again the moment somebody moved it back into the
 * heading, which is exactly the regression that would silently cost the capture a second
 * time.
 */

/** The `<h1>` text, read the way the capture driver reads it rather than off the whole
 *  screen -- `strip()` flattens the heading and the subheading into one run of words, so
 *  a name that moved from one to the other would be invisible to it. */
function heading(markup: string): string {
  const match = markup.match(/<h1[^>]*>([\s\S]*?)<\/h1>/u);
  assert.ok(match, 'the rendered screen has no <h1> at all');
  return match[1].replace(/<[^>]*>/gu, '').trim();
}

test("the About heading is exactly the design's own 'About', so the parity driver can settle on it", () => {
  assert.equal(heading(renderAppScreen('about')), 'About');
});

test('the About heading stays exactly "About" even once the app has been renamed', () => {
  assert.equal(heading(renderAppScreen('about', 'Reception')), 'About');
});

test('the About screen still names the shipped console in its body until the app is renamed', () => {
  const text = strip(renderAppScreen('about'));
  assert.ok(
    text.includes(`This console is ${IDENTITY.productName}.`),
    `expected the shipped name on the About screen: ${text.slice(0, 400)}`,
  );
});

test('the About screen shows the chosen name in its body once the app has been renamed', () => {
  const text = strip(renderAppScreen('about', 'Reception'));
  assert.ok(
    text.includes('This console has been renamed to Reception.'),
    `expected the chosen name on the About screen: ${text.slice(0, 400)}`,
  );
});

test('the renamed About screen keeps stating the shipped-name-only boundary, where a reader would look for it', () => {
  const text = strip(renderAppScreen('about', 'Reception'));
  assert.ok(
    text.includes(`Diagnostics and bug reports still say ${IDENTITY.productName}`),
    `the About screen no longer discloses the boundary: ${text.slice(0, 400)}`,
  );
});

test("the About screen keeps the design's own subheading rather than displacing it", () => {
  const text = strip(renderAppScreen('about', 'Reception'));
  assert.ok(
    text.includes('Build provenance and the policies this console is bound by.'),
    `the design's About subheading was displaced: ${text.slice(0, 400)}`,
  );
});

/* --- shipped-name-only surfaces stay exactly that, even from inside a renamed app --- */

/**
 * The rename control's own explanatory copy (its `info`) is behind progressive
 * disclosure -- an "Explain this setting" button that opens a dialog -- per this
 * project's own settings contract. The compiled control renderer's `buildCtl` never
 * copies `info` onto the object handed to the M3 control at all; it only captures it
 * inside an `onInfoLegacy` closure, so it is neither present in `renderToStaticMarkup`
 * output nor readable off `renderVals()`'s `groups`. What is checkable, and what
 * actually matters here, is that this copy is a **static schema string with no bound
 * value at all** -- so nothing App.tsx does can make it reactive to a rename in the
 * first place. That is source fact, not render behaviour, so it is read from the
 * compiled schema the same way the sibling `main.ts`/`preload.cjs` checks below read
 * Electron-only wiring this test file cannot exercise by running it.
 */
test('the rename control still discloses the shipped name literally, as a static string with no bound value', async () => {
  /* This is the opposite failure to guard against: a rename must not leak into copy
   * that is *explaining* the shipped-name-only boundary, or the sentence "diagnostics
   * still say Material Asterisk" would render self-contradictory nonsense once renamed. */
  const generated = await read('app/renderer/src/generated/console.tsx');
  const match = generated.match(/ctl\('id_name',[^)]*\{[^}]*\}\)/u);
  assert.ok(match, 'id_name control declaration not found in the compiled design output');
  const declaration = match[0];
  assert.ok(declaration.includes(IDENTITY.productName), `id_name's own copy no longer names the shipped name: ${declaration}`);
  /* Not `{{ ... }}`-interpolated, i.e. not bound to any `v.xxx` -- a plain string
   * literal the compiler carried through unchanged, so it cannot vary at runtime. */
  assert.equal(/\{\{[^}]*\}\}/u.test(declaration), false, `id_name's copy is unexpectedly bound to a live value: ${declaration}`);
});

/* --- the notification (toast) surface ---------------------------------------------- */

/**
 * `this.toast` is spied by direct reassignment on the instance rather than read back
 * from `state.toastText`. Direct construction has no live reconciler attached, so
 * the synchronous mounted-equivalent updater above keeps `setState` observable without
 * a DOM mount. Overwriting the
 * instance's own `toast` property sidesteps `setState` entirely and observes exactly
 * what the wiring decided to say, in the exact order it said it -- which is the thing
 * these tests are actually about. */
function spyToast(app: AppInstance & { toast: (message: string) => void }): string[] {
  const calls: string[] = [];
  app.toast = (message: string) => calls.push(message);
  return calls;
}

test('setting a name toasts the chosen-name confirmation, as the last (and therefore winning) toast call', () => {
  /* baseSetVal's own generic "<label> set to <value>" toast is called too -- explicitly,
   * and deliberately, so the control's change is still recorded in local history the
   * same way every other control's is (see the comment on `this.baseSetVal(control,
   * value)` in App.tsx). What matters for the notification surface is that the rename
   * confirmation is the one that actually ends up shown: in the real, mounted app both
   * calls land in the same synchronous state update, and only the last one's text
   * survives it. */
  const app = liveApp() as AppInstance & { toast: (message: string) => void };
  const calls = spyToast(app);
  app.setVal({ id: 'id_name', label: 'Display name', kind: 'text' }, 'Reception');
  assert.deepEqual(calls, ['Display name set to Reception', 'Renamed to Reception']);
});

test('the rename is actually persisted by the same setVal call that shows the toast', () => {
  const app = liveApp();
  app.setVal({ id: 'id_name', label: 'Display name', kind: 'text' }, 'Reception');
  assert.equal(displayName(app.durableStorage.storage), 'Reception');
});

test('an invalid name shows a refusal, toasts nothing, and stores nothing', () => {
  const app = liveApp() as AppInstance & { toast: (message: string) => void };
  const calls = spyToast(app);
  app.setVal({ id: 'id_name', label: 'Display name', kind: 'text' }, '   ');
  assert.deepEqual(calls, []);
  assert.equal(displayName(app.durableStorage.storage), IDENTITY.productName);
});

test('resetting toasts the shipped-name confirmation last, too', () => {
  const app = liveApp('Reception') as AppInstance & { toast: (message: string) => void };
  const calls = spyToast(app);
  app.setVal({ id: 'id_name_reset', label: 'Restore the shipped name', kind: 'switch' }, true);
  assert.deepEqual(calls, ['Restore the shipped name set to true', `Name restored to ${IDENTITY.productName}`]);
  assert.equal(displayName(app.durableStorage.storage), IDENTITY.productName);
});

/**
 * Proved by breaking it on purpose: removing the `return` that follows the explicit
 * `this.baseSetVal(control, value)` call in `languageAwareSetVal`'s `id_name` branch
 * lets execution fall through to the *shared* `this.baseSetVal(control, value)` at the
 * very bottom of the method too, so `baseSetVal` runs -- and toasts its own generic
 * message -- a second time, after the rename confirmation. That makes the generic
 * message the last (and therefore winning) toast instead, and this test catches it:
 * with the bug, `calls[calls.length - 1]` is `'Display name set to Reception'`, not
 * the rename confirmation. Restoring the `return` turns it back green.
 */
test('the rename confirmation is the last toast call, so it is the one that actually wins', () => {
  const app = liveApp() as AppInstance & { toast: (message: string) => void };
  const calls = spyToast(app);
  app.setVal({ id: 'id_name', label: 'Display name', kind: 'text' }, 'Reception');
  assert.equal(calls[calls.length - 1], 'Renamed to Reception', `expected the rename confirmation to win the toast race: ${JSON.stringify(calls)}`);
});

/* --- the native window title (main process) ---------------------------------------- */

test('the chosen name is pushed to the native window title through the desktop bridge', () => {
  const calls: string[] = [];
  (globalThis as { window: { dingDesktop?: unknown } }).window.dingDesktop = {
    platform: 'win32',
    window: { minimize() {}, toggleMaximize() {}, close() {}, setTitle(title: string) { calls.push(title); } },
    controlPlane: { request: async () => undefined },
  };
  try {
    const app = liveApp();
    app.setVal({ id: 'id_name', label: 'Display name', kind: 'text' }, 'Reception');
    assert.deepEqual(calls, ['Reception']);
  } finally {
    delete (globalThis as { window: { dingDesktop?: unknown } }).window.dingDesktop;
  }
});

test('resetting pushes the shipped name to the native window title too', () => {
  const calls: string[] = [];
  (globalThis as { window: { dingDesktop?: unknown } }).window.dingDesktop = {
    platform: 'win32',
    window: { minimize() {}, toggleMaximize() {}, close() {}, setTitle(title: string) { calls.push(title); } },
    controlPlane: { request: async () => undefined },
  };
  try {
    const app = liveApp('Reception');
    app.setVal({ id: 'id_name_reset', label: 'Restore the shipped name', kind: 'switch' }, true);
    assert.deepEqual(calls, [IDENTITY.productName]);
  } finally {
    delete (globalThis as { window: { dingDesktop?: unknown } }).window.dingDesktop;
  }
});

test('with no bridge at all, the window-title push is a safe no-op rather than a crash', () => {
  const app = liveApp();
  assert.doesNotThrow(() => app.setVal({ id: 'id_name', label: 'Display name', kind: 'text' }, 'Reception'));
});

/* --- identity, from the wired surface rather than the module's own tests ----------- */

test('the identity moves with nothing the wired surfaces touch', () => {
  const app = liveApp();
  const before = { ...IDENTITY };
  app.setVal({ id: 'id_name', label: 'Display name', kind: 'text' }, 'Reception');
  assert.deepEqual({ ...IDENTITY }, before);
});

/* --- main.ts / preload wiring: source-scanned, the way this project already proves
 * Electron-only code that cannot be imported into a plain Node test --------------- */

const root = new URL('../../', import.meta.url);
const read = (path: string) => readFile(new URL(path, root), 'utf8');

test('main.ts installs a bounded IPC handler that pushes the title to the native window', async () => {
  const main = await read('app/electron/main.ts');
  assert.match(main, /ipcMain\.on\('window:set-title',/u);
  assert.match(main, /mainWindow\?\.setTitle\(/u);
  /* Bounded, not trusted blindly: the same length ceiling the renderer itself
   * enforces before a name is ever stored, applied a second time at the process
   * boundary the IPC message actually crosses. */
  assert.match(main, /MAX_DISPLAY_NAME_LENGTH/u);
});

test('main.ts still creates the window with the shipped name as its literal initial title', async () => {
  /* The renderer syncs the real title once it mounts; the constructor's own literal
   * is what shows for the instant before that happens, and it must be the shipped
   * name, never a placeholder that could be mistaken for a chosen one. */
  const main = await read('app/electron/main.ts');
  assert.match(main, new RegExp(`title:\\s*'${IDENTITY.productName}'`, 'u'));
});

test('preload exposes setTitle on the real runtime bridge, not only its TypeScript source', async () => {
  const preloadRuntime = await read('app/electron/preload.cjs');
  const preloadSource = await read('app/electron/preload.ts');
  for (const preload of [preloadRuntime, preloadSource]) {
    assert.match(preload, /setTitle:\s*\(?title(?::\s*string)?\)?\s*=>\s*ipcRenderer\.send\('window:set-title', title\)/u);
  }
});

test('the electron project reference can actually type-check the display-name module it imports', async () => {
  /* app/electron/tsconfig.json lists its sources explicitly rather than by a glob
   * over the renderer tree; importing a renderer module from main.ts without adding
   * it here compiles with a plain node/tsx runner (which does not care) and then
   * fails only under `tsc -b`, the thing `npm run build` actually runs. */
  const tsconfig = JSON.parse(await read('app/electron/tsconfig.json')) as { include: string[] };
  assert.ok(
    tsconfig.include.includes('../renderer/src/display-name.ts'),
    'app/electron/tsconfig.json must include display-name.ts for `tsc -b` to see the import in main.ts',
  );
});

test('the pushed title is bounded by the same ceiling the renderer enforces before ever storing a name', () => {
  assert.ok(MAX_DISPLAY_NAME_LENGTH > 0 && MAX_DISPLAY_NAME_LENGTH < 1000, 'sanity: the ceiling main.ts re-checks is a real bound');
});
