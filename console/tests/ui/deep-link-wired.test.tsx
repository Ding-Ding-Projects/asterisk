import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

(globalThis as { window?: unknown }).window ??= {} as unknown;

import { App } from '../../app/renderer/src/App';
import type { DeepLinkDelivery } from '../../shared/deep-link';

/**
 * `deep-link.test.ts` proves the rules. This proves they reach a screen.
 *
 * A route parsed and then dropped on the way to the renderer is this repository's oldest
 * recurring defect and its most invisible: nothing throws, no test fails, and the only
 * symptom is a link that does nothing -- which is indistinguishable from one the operating
 * system never routed here at all. Every assertion below runs the real `App`'s own methods
 * against a fake bridge, and the navigation is read out of the update the compiled shell's
 * own `openScreen` produced rather than out of a stub standing in for it.
 */

const inRepo = (relative: string) => resolve(import.meta.dirname, '..', '..', relative);

interface Reachable {
  state: Record<string, unknown>;
  setState(update: unknown): void;
  toast(message: string): void;
  listenForDeepLinks(): void;
  componentWillUnmount(): void;
}

interface FakeBridge {
  pending(): Promise<DeepLinkDelivery[]>;
  onNavigate(listener: (delivery: DeepLinkDelivery) => void): () => void;
}

/**
 * A real `App` with its two outward edges captured: `setState`, so the navigation the
 * shell's own `openScreen` performs can be read rather than stubbed out, and `toast`, so a
 * refusal's exact words can be read.
 */
function harness(bridge: FakeBridge | undefined) {
  const win = (globalThis as { window: Record<string, unknown> }).window;
  win.dingDesktop = bridge ? { deepLink: bridge } : undefined;
  /* The compiled shell's own `componentWillUnmount` drops a window key listener, so the
   * unmount test below needs these to exist. Supplied here rather than skipping unmount:
   * a listener that outlives the component is exactly what that test is for. */
  win.addEventListener ??= () => undefined;
  win.removeEventListener ??= () => undefined;
  const app = new (App as unknown as new (props: unknown) => Reachable)({}) as Reachable;
  const updates: Array<Record<string, unknown>> = [];
  const toasts: string[] = [];
  app.setState = (update: unknown) => {
    const resolved = typeof update === 'function'
      ? (update as (state: Record<string, unknown>) => Record<string, unknown>)(app.state)
      : update as Record<string, unknown>;
    updates.push(resolved);
    app.state = { ...app.state, ...resolved };
  };
  app.toast = (message: string) => { toasts.push(message); };
  return { app, updates, toasts };
}

const opening = (id: string): DeepLinkDelivery => ({
  ok: true,
  target: { destinationId: id, state: 'default', theme: 'dark', width: 1440, height: 1000, scale: 1 },
});

const settle = () => new Promise((done) => { setTimeout(done, 0); });

test('a link queued before the renderer existed is drained on mount and opens its screen', async () => {
  let pendingCalls = 0;
  const { app, updates, toasts } = harness({
    pending: async () => { pendingCalls += 1; return [opening('cdr')]; },
    onNavigate: () => () => undefined,
  });
  app.listenForDeepLinks();
  await settle();
  assert.equal(pendingCalls, 1, 'the renderer never pulled the queue, so a link that started the process is lost');
  const navigation = updates.find((update) => update.screen !== undefined);
  assert.ok(navigation, `expected a navigation, got: ${JSON.stringify(updates)}`);
  assert.equal(navigation.screen, 'cdr');
  /* The rail moves with the screen. Setting `screen` alone lands on the right destination
   * beside the previous rail's section list, which is a half-navigation that looks fine in
   * a screenshot of the content pane. */
  assert.equal(navigation.railId, 'data', `expected the Data rail to open with the CDR screen, got: ${JSON.stringify(navigation)}`);
  assert.ok(toasts.some((line) => line.includes('from a link.')), `expected the arrival said out loud, got: ${JSON.stringify(toasts)}`);
});

test('a link arriving while the console is already running opens its screen too', async () => {
  let push: ((delivery: DeepLinkDelivery) => void) | undefined;
  const { app, updates } = harness({
    pending: async () => [],
    onNavigate: (listener) => { push = listener; return () => { push = undefined; }; },
  });
  app.listenForDeepLinks();
  await settle();
  assert.ok(push, 'nothing subscribed to the live channel, so only a link that started the process would ever arrive');
  push(opening('appearance'));
  const navigation = updates.find((update) => update.screen === 'appearance');
  assert.ok(navigation, `expected the pushed link to navigate, got: ${JSON.stringify(updates)}`);
  assert.equal(navigation.railId, 'app');
});

test('a refused link says why, and does not navigate anywhere', async () => {
  const { app, updates, toasts } = harness({
    pending: async () => [{ ok: false, url: 'ding-pbx://destination/dash?theme=light', reason: 'This console has only a dark theme, so a link asking for the light one cannot be opened as written.' }],
    onNavigate: () => () => undefined,
  });
  app.listenForDeepLinks();
  await settle();
  assert.deepEqual(updates.filter((update) => update.screen !== undefined), [], 'a refused link moved the screen anyway');
  assert.ok(
    toasts.some((line) => line.includes('could not be opened') && line.includes('only a dark theme')),
    `expected the refusal reported verbatim, got: ${JSON.stringify(toasts)}`,
  );
});

test('a link naming a screen this build does not have is refused against the real catalogue', async () => {
  const { app, updates, toasts } = harness({
    pending: async () => [opening('nosuchscreen')],
    onNavigate: () => () => undefined,
  });
  app.listenForDeepLinks();
  await settle();
  assert.deepEqual(updates.filter((update) => update.screen !== undefined), [], 'an unknown destination moved the screen anyway');
  assert.ok(
    toasts.some((line) => line.includes("no screen called 'nosuchscreen'")),
    `expected the unknown destination named, got: ${JSON.stringify(toasts)}`,
  );
});

test('the listener is dropped on unmount', async () => {
  let subscribed = false;
  const { app } = harness({
    pending: async () => [],
    onNavigate: () => { subscribed = true; return () => { subscribed = false; }; },
  });
  app.listenForDeepLinks();
  await settle();
  assert.equal(subscribed, true);
  app.componentWillUnmount();
  assert.equal(subscribed, false, 'the deep-link listener outlived the component and will fire into a dead tree');
});

test('a surface with no deep-link bridge at all degrades rather than throwing', () => {
  const { app, toasts } = harness(undefined);
  app.listenForDeepLinks();
  assert.deepEqual(toasts, []);
});

/**
 * The three ends of the channel, checked as text because no test can load the Electron main
 * process. Each assertion is anchored to a whole line so that commenting a wiring line out --
 * the way a wiring line usually dies -- cannot leave the substring behind and satisfy it.
 */
test('the main process registers the scheme, takes the single-instance lock, and answers both channels', () => {
  const main = readFileSync(inRepo('app/electron/main.ts'), 'utf8').replace(/\r\n/gu, '\n');
  assert.match(main, /^\s*if \(app\.isPackaged\) app\.setAsDefaultProtocolClient\(DEEP_LINK_SCHEME\);$/mu,
    'nothing registers the scheme with the operating system, so no click on a link would ever reach this application');
  assert.match(main, /^\} else if \(!app\.requestSingleInstanceLock\(\)\) \{$/mu,
    'without the single-instance lock every link opens a second copy of the console instead of moving the one already running');
  assert.match(main, /^\s*app\.on\('second-instance', \(_event, argv\) => receiveDeepLink\(firstDeepLinkInArgv\(argv\)\)\);$/mu,
    'the second launch never hands its command line to the first, so the lock would silently discard every link');
  assert.match(main, /^ipcMain\.handle\('deep-link:pending', \(\): DeepLinkDelivery\[\] => \{$/mu,
    'the renderer has nothing to pull the startup queue from');
  assert.match(main, /^\s*mainWindow\.webContents\.send\('deep-link:navigate', delivery\);$/mu,
    'a link arriving while the console runs is never pushed to the renderer');
  assert.match(main, /^const startupDelivery = deliveryFor\(firstDeepLinkInArgv\(process\.argv\)\);$/mu,
    'the link this process was started with is never read off its own command line');
  assert.match(main, /^\s*if \(startupDelivery\?\.ok\) mainWindow\.setContentSize\(startupDelivery\.target\.width, startupDelivery\.target\.height\);$/mu,
    'the route declares a size and the window never takes it, so the tuple it names is not the tuple it produces');
});

test('the preload Electron actually loads exposes the channel, not only its TypeScript twin', () => {
  /* main.ts loads `preload.cjs`; `preload.ts` is its type-checked counterpart and is not
   * what runs. A feature added to the .ts alone is one `window.dingDesktop` never gets --
   * which has happened here before, to live provisioning progress, and is recorded in
   * preload.cjs's own comment. Both files are checked. */
  const cjs = readFileSync(inRepo('app/electron/preload.cjs'), 'utf8').replace(/\r\n/gu, '\n');
  assert.match(cjs, /^\s*pending: \(\) => ipcRenderer\.invoke\('deep-link:pending'\),$/mu);
  assert.match(cjs, /^\s*ipcRenderer\.on\('deep-link:navigate', handler\);$/mu);
  const ts = readFileSync(inRepo('app/electron/preload.ts'), 'utf8').replace(/\r\n/gu, '\n');
  assert.match(ts, /^\s*pending: \(\) => ipcRenderer\.invoke\('deep-link:pending'\) as Promise<DeepLinkDelivery\[\]>,$/mu);
  assert.match(ts, /^\s*ipcRenderer\.on\('deep-link:navigate', handler\);$/mu);
});

test('the renderer subscribes on mount', () => {
  const app = readFileSync(inRepo('app/renderer/src/App.tsx'), 'utf8').replace(/\r\n/gu, '\n');
  assert.match(app, /^\s*this\.listenForDeepLinks\(\);$/mu,
    'nothing calls the subscriber, so every method tested above is unreachable at run time');
});
