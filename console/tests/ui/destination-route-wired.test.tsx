/**
 * Contract: a `ding-pbx://destination/<id>` link actually opens that screen.
 *
 * `tests/control-plane/destination-route.test.ts` proves the parser, the router that holds a
 * route until the renderer exists, and that every route the parity evidence records resolves
 * to its own row. None of that says a link reaches the application: a parser nobody calls and
 * a bridge nobody subscribes to would pass every one of those tests. This file drives the
 * real `App`.
 *
 * The navigation is exercised rather than stubbed. `setState` on an unmounted React component
 * is a no-op, so a test that merely called `openDestinationRoute` and read `state.screen`
 * would pass whatever the code did -- the shape of vacuous guard this project has been bitten
 * by more than once. `Driven` below applies updates the way React would, so the screen and the
 * rail this asserts on are the ones the compiled shell's own `openScreen` actually wrote.
 *
 * The four source anchors at the end cover the one thing behaviour cannot: that the listener
 * is subscribed at all. Each is anchored to a whole line, because a needle for
 * `listenForDestinationRoutes()` is satisfied by `// this.listenForDestinationRoutes();`,
 * which is how a wiring line usually dies.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/* The minimum `window` this render path touches, the same stub every other "-wired" test in
 * this directory uses -- plus the two event methods `componentWillUnmount` calls, since this
 * file is the only one that drives a real teardown. */
(globalThis as { window?: unknown }).window ??= {
  addEventListener: () => undefined, removeEventListener: () => undefined,
} as unknown;

import { App } from '../../app/renderer/src/App';
import type { DestinationRoute } from '../../shared/destination-route.js';
import { WIRING, checkDestinationRouteWiring } from '../../scripts/destination-route-wiring.mjs';

const consoleRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
/* Line endings stripped before matching: this checkout is CRLF, and a `$`-anchored pattern
 * written against `\n` silently matches nothing, which reads exactly like a clean pass. */
const source = (relative: string) => readFileSync(resolve(consoleRoot, relative), 'utf8').split('\r').join('');

interface Driveable {
  state: Record<string, unknown>;
  setState(update: unknown): void;
  toast(message: string): void;
  openScreen(id: string): void;
  componentDidMount(): void;
  componentWillUnmount(): void;
}
const Base = App as unknown as new (props: unknown) => Driveable;

/** A real `App` whose `setState` applies, and whose toasts are collected. */
class Driven extends Base {
  toasts: string[] = [];

  constructor(props: unknown) {
    super(props);
    /* Assigned here rather than declared as a method: `App`'s own constructor sets
     * `this.toast` as an INSTANCE property (the humour/quiet-hours gate), which shadows any
     * prototype override a subclass declares. A prototype `toast` here would silently never
     * be called, and the assertion below would then be about an array nothing ever wrote to. */
    this.toast = (message: string) => { this.toasts.push(message); };
  }

  setState(update: unknown): void {
    const patch = typeof update === 'function'
      ? (update as (state: Record<string, unknown>) => Record<string, unknown>)(this.state)
      : update as Record<string, unknown>;
    this.state = { ...this.state, ...patch };
  }
}

/** Subscribes the real listener to a fake bridge, and hands back the send function. */
function subscribed(): { app: Driven; send: (route: DestinationRoute) => void; unsubscribed: () => boolean } {
  const listeners: ((route: DestinationRoute) => void)[] = [];
  let removed = false;
  (globalThis as { window?: Record<string, unknown> }).window!.dingDesktop = {
    deepLink: {
      onDestination(listener: (route: DestinationRoute) => void) {
        listeners.push(listener);
        return () => { removed = true; };
      },
    },
  };
  const app = new Driven({});
  (app as unknown as { listenForDestinationRoutes(): void }).listenForDestinationRoutes();
  assert.equal(listeners.length, 1, 'the renderer did not subscribe to the deep-link bridge');
  return { app, send: (route) => listeners[0](route), unsubscribed: () => removed };
}

const routeTo = (destinationId: string): DestinationRoute =>
  ({ destinationId, state: 'default', theme: 'dark', width: 1440, height: 1000, scale: 1 });

test.afterEach(() => { delete (globalThis as { window?: Record<string, unknown> }).window!.dingDesktop; });

test('a route delivered by the bridge opens that destination, and its rail with it', () => {
  const { app, send } = subscribed();
  assert.equal(app.state.screen, 'dash', 'the console did not start where this test assumes');
  send(routeTo('queues'));
  assert.equal(app.state.screen, 'queues');
  assert.equal(app.state.railId, 'pbx', 'the screen moved and the rail did not, so the section list belongs to another group');
});

test('a route to another rail moves the rail too', () => {
  const { app, send } = subscribed();
  send(routeTo('about'));
  assert.equal(app.state.screen, 'about');
  assert.equal(app.state.railId, 'app');
});

test('every one of the audited destinations recorded in the inventory can be opened this way', () => {
  const inventory = JSON.parse(readFileSync(resolve(consoleRoot, 'inventories/design-parity.json'), 'utf8')) as { destinations: { id: string }[] };
  assert.equal(inventory.destinations.length, 32, 'this would prove less on a shorter list');
  const { app, send } = subscribed();
  for (const destination of inventory.destinations) {
    send(routeTo(destination.id));
    assert.equal(app.state.screen, destination.id, `a link to '${destination.id}' did not open it`);
  }
});

test('a route naming a destination this console does not have says so and moves nothing', () => {
  const { app, send } = subscribed();
  send(routeTo('queues'));
  send(routeTo('nowhere'));
  assert.equal(app.state.screen, 'queues', 'an unknown destination must not navigate anywhere at all');
  assert.deepEqual(app.toasts, ["That link could not be opened: this console has no destination called 'nowhere'"]);
});

test('nothing is subscribed when the surface has no deep-link bridge', () => {
  /* The hosted HTTP surface has no registered protocol client. Degrading to doing nothing
   * is correct; throwing on a missing optional bridge is not. */
  (globalThis as { window?: Record<string, unknown> }).window!.dingDesktop = {};
  const app = new Driven({});
  assert.doesNotThrow(() => (app as unknown as { listenForDestinationRoutes(): void }).listenForDestinationRoutes());
});

test('the listener is dropped on unmount', () => {
  const { app, unsubscribed } = subscribed();
  assert.equal(unsubscribed(), false);
  app.componentWillUnmount();
  assert.equal(unsubscribed(), true, 'a listener that outlives the component fires into a dead tree on the next reload');
});

/* ---- the wiring behaviour cannot see -------------------------------------------------- */

test('every line the route is wired on is present, in the renderer, the main process and the preload', () => {
  /* The anchors live in `scripts/destination-route-wiring.mjs` rather than here so
   * `scripts/negative-destination-route.mjs` can plant one lie at a time against the same
   * check this asserts on. Two copies of a rule are two rules, and only one of them ever
   * gets updated. */
  const { problems, anchors } = checkDestinationRouteWiring({ root: resolve(consoleRoot, '..') });
  assert.ok(anchors >= 12, 'the anchor list shrank, so this proves less than it did');
  assert.deepEqual(problems, []);
});

test('the anchors are checked against the files this test believes they are in', () => {
  /* A guard whose file list quietly emptied would report clean forever. */
  const files = new Set(WIRING.map(([relative]) => relative));
  for (const expected of [
    'console/app/renderer/src/App.tsx', 'console/app/electron/main.ts', 'console/app/electron/preload.cjs',
  ]) assert.ok(files.has(expected), `nothing is anchored in ${expected} any more`);
  /* And the shared source reader this file uses is not silently reading nothing. */
  assert.ok(source('app/electron/main.ts').includes('destinationRoutes'), 'main.ts read back without the router');
});
