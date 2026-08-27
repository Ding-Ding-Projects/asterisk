/**
 * Contract: the product route the design-parity evidence records is a route the product
 * actually resolves.
 *
 * Every one of the thirty-two audited destinations has carried a `ding-pbx://destination/<id>`
 * string in the parity evidence since that evidence was written. Nothing resolved it: no
 * scheme was registered, no argument was read, and the inventory's own `builtRouteStatus`
 * said so in a sentence nobody had to read to use the file. That is a mapping to nothing,
 * and it is the exact shape this project keeps being bitten by -- wired at one end and
 * consumed at neither.
 *
 * So the tests below are in two halves, and the second is the one that matters. The first
 * exercises the parser on its own. The second takes the strings that are ACTUALLY COMMITTED
 * in the inventory and in the capture manifest, hands each to the parser the running
 * application uses, and requires it to come back naming that row's own destination. A
 * template that stopped agreeing with the parser, or a row pointing at somebody else's
 * screen, fails here rather than in a screenshot nobody takes.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DESTINATION_ROUTE_APPLIES, DESTINATION_ROUTE_DEFAULTS, DESTINATION_ROUTE_HOST, DESTINATION_ROUTE_SCHEME,
  firstDestinationRouteArgument, formatDestinationRoute, parseDestinationRoute, resolveDestinationRoute,
  type DestinationRoute,
} from '../../shared/destination-route.js';
import { createDestinationRouteRouter } from '../../app/electron/deep-link.js';

const consoleRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const readJson = (relative: string) => JSON.parse(readFileSync(resolve(consoleRoot, relative), 'utf8'));

const inventory = readJson('inventories/design-parity.json') as {
  captureContract: { captureTuple: Record<string, unknown> };
  destinations: { id: string; rail: string; referenceRoute: string; builtRoute: string; builtCapture: string }[];
};
const manifest = readJson('design-reference/capture-manifest.generated.json') as {
  destinationCount: number;
  destinations: { id: string; builtRoute: string; builtCapture: string; referenceRoute: string }[];
};

const ids = inventory.destinations.map((destination) => destination.id);

const ok = (raw: string): DestinationRoute => {
  const parsed = parseDestinationRoute(raw);
  assert.equal(parsed.ok, true, `expected '${raw}' to parse: ${parsed.ok ? '' : parsed.reason}`);
  return (parsed as { ok: true; route: DestinationRoute }).route;
};
const refused = (raw: unknown): string => {
  const parsed = parseDestinationRoute(raw);
  assert.equal(parsed.ok, false, `expected ${JSON.stringify(raw)} to be refused, it parsed`);
  return (parsed as { ok: false; reason: string }).reason;
};

test('a full route parses into the destination and the whole capture tuple', () => {
  const route = ok('ding-pbx://destination/endpoints?state=default&theme=light&width=1280&height=800&scale=2');
  assert.deepEqual(route, { destinationId: 'endpoints', state: 'default', theme: 'light', width: 1280, height: 800, scale: 2 });
});

test('an omitted tuple field takes the recorded default rather than becoming undefined', () => {
  assert.deepEqual(ok('ding-pbx://destination/dash'), { destinationId: 'dash', ...DESTINATION_ROUTE_DEFAULTS });
});

test('the scheme and the authority are both required, exactly', () => {
  assert.match(refused('http://destination/dash'), /scheme is 'http:'/);
  assert.match(refused('ding-pbx://server/dash'), /authority is 'server'/);
  /* The opaque spelling parses as a URL and carries no authority. Refused rather than
   * un-picked from the path: one canonical spelling is what lets a recorded route and an
   * accepted route be compared as strings. */
  assert.match(refused('ding-pbx:destination/dash'), /has no '\/\/destination\/' authority/);
});

test('a scheme that merely starts the same way is not this scheme', () => {
  /* `String.startsWith` on the raw text would have taken this one. */
  assert.match(refused('ding-pbx-evil://destination/dash'), /scheme is 'ding-pbx-evil:'/);
});

test('the path must name exactly one destination', () => {
  assert.match(refused('ding-pbx://destination/'), /exactly one path segment/);
  assert.match(refused('ding-pbx://destination/dash/extra'), /exactly one path segment/);
  /* A percent-encoded traversal decodes to something with slashes in it, which is not an id. */
  assert.match(refused('ding-pbx://destination/..%2F..%2Fetc'), /is not a destination id/);
});

test('a destination id is lowercase, and a differently-cased one is refused rather than folded', () => {
  /* Folding would make two spellings of one route, and only one of them would ever be the
   * one written down in the evidence. */
  assert.match(refused('ding-pbx://destination/DASH'), /'DASH' is not a destination id/);
});

test("a transient state name parses, and a differently-cased 'default' does not", () => {
  /* The inventory's seventeen transient-state families are camelCase, so a state rule as
   * strict as the destination-id rule would refuse a route to any of them. */
  assert.equal(ok('ding-pbx://destination/dash?state=paletteOpen').state, 'paletteOpen');
  assert.match(refused('ding-pbx://destination/dash?state=Default'), /'state' is 'Default'/);
});

test('a tuple field that is not a number, is empty, or is out of bounds is refused', () => {
  assert.match(refused('ding-pbx://destination/dash?width=wide'), /'width' must be a positive number/);
  assert.match(refused('ding-pbx://destination/dash?height='), /'height' is empty/);
  assert.match(refused('ding-pbx://destination/dash?scale=0'), /'scale' must be a positive number/);
  assert.match(refused('ding-pbx://destination/dash?width=99999'), /'width' must be at most 16384/);
  assert.match(refused('ding-pbx://destination/dash?theme=solarized'), /'theme' is 'solarized'/);
});

test('nothing that is not a string, and no empty string, is ever a route', () => {
  for (const value of [undefined, null, 42, {}, [], '', '   ']) assert.match(refused(value), /no route was supplied|is not a URL/);
});

test('resolving is a separate question from parsing, and an unknown id is refused there', () => {
  const route = ok('ding-pbx://destination/nowhere');
  const resolution = resolveDestinationRoute(route, ids);
  assert.equal(resolution.ok, false);
  assert.match((resolution as { ok: false; reason: string }).reason, /no destination called 'nowhere'/);
});

test('an empty catalogue resolves nothing rather than accepting everything', () => {
  /* The vacuous direction: `[].includes(x)` is false for every x, so this would already
   * refuse -- but a caller handed an empty catalogue has a bug worth naming, not a route
   * worth refusing quietly. */
  const resolution = resolveDestinationRoute(ok('ding-pbx://destination/dash'), []);
  assert.equal(resolution.ok, false);
  assert.match((resolution as { ok: false; reason: string }).reason, /no destination catalogue was supplied/);
});

test('formatting and parsing are each other, for every audited destination', () => {
  for (const id of ids) {
    const route = formatDestinationRoute(id);
    assert.equal(ok(route).destinationId, id);
  }
  assert.throws(() => formatDestinationRoute('Not An Id'), /is not a destination id/);
});

test('the command line is scanned for an argument that parses, not one that merely contains the scheme', () => {
  const argv = ['C:\\app\\ding.exe', '--switch=ding-pbx://destination/evil', 'ding-pbx://destination/queues'];
  assert.equal(firstDestinationRouteArgument(argv), 'ding-pbx://destination/queues');
  assert.equal(firstDestinationRouteArgument(['C:\\app\\ding.exe', '--squirrel-firstrun']), undefined);
  assert.equal(firstDestinationRouteArgument([]), undefined);
});

test('the constants the route is spelled from are the ones the tests assume', () => {
  /* Named so a rename cannot quietly change the scheme while every test above keeps
   * passing on its own hard-coded strings. */
  assert.equal(DESTINATION_ROUTE_SCHEME, 'ding-pbx:');
  assert.equal(DESTINATION_ROUTE_HOST, 'destination');
  assert.deepEqual([...DESTINATION_ROUTE_APPLIES], ['destinationId'],
    'the application acts on the destination alone; widening this is a decision about somebody else\'s window and settings');
});

/* ---- the router that holds a route until the renderer exists ------------------------- */

test('a route offered while nothing can receive it is held, and flushed when something can', () => {
  const delivered: DestinationRoute[] = [];
  let ready = false;
  const router = createDestinationRouteRouter((route) => { if (!ready) return false; delivered.push(route); return true; });

  const offered = router.offer('ding-pbx://destination/queues');
  assert.deepEqual(offered, { ok: true, delivered: false });
  assert.equal(router.pending()?.destinationId, 'queues');
  assert.deepEqual(delivered, []);

  ready = true;
  assert.equal(router.flush(), true);
  assert.deepEqual(delivered.map((route) => route.destinationId), ['queues']);
  assert.equal(router.pending(), undefined);
  assert.equal(router.flush(), false, 'a second flush must not redeliver a route already taken');
});

test('two routes arriving before the window is ready leave the newest, not the first', () => {
  let ready = false;
  const delivered: string[] = [];
  const router = createDestinationRouteRouter((route) => { if (!ready) return false; delivered.push(route.destinationId); return true; });
  router.offer('ding-pbx://destination/queues');
  router.offer('ding-pbx://destination/about');
  ready = true;
  router.flush();
  assert.deepEqual(delivered, ['about'], 'the person asked twice; they meant the second answer');
});

test('an argument that is not a route is refused and does not throw away a route already held', () => {
  const router = createDestinationRouteRouter(() => false);
  router.offer('ding-pbx://destination/queues');
  const refusal = router.offer('--squirrel-firstrun');
  assert.equal(refusal.ok, false);
  assert.equal(router.pending()?.destinationId, 'queues');
});

test('a send that throws is treated as a send that did not happen', () => {
  const router = createDestinationRouteRouter(() => { throw new Error('the window went away'); });
  assert.deepEqual(router.offer('ding-pbx://destination/dash'), { ok: true, delivered: false });
  assert.equal(router.pending()?.destinationId, 'dash');
});

/* ---- the committed mapping ----------------------------------------------------------- */

test('every route the inventory records resolves, in this application, to its own row', () => {
  assert.equal(inventory.destinations.length, 32, 'the mapping check would prove less on a shorter list');
  for (const destination of inventory.destinations) {
    const parsed = parseDestinationRoute(destination.builtRoute);
    assert.equal(parsed.ok, true, `${destination.id}: the application refuses its own recorded route`);
    const resolved = resolveDestinationRoute((parsed as { ok: true; route: DestinationRoute }).route, ids);
    assert.equal(resolved.ok, true, `${destination.id}: its recorded route resolves to nothing`);
    assert.equal((resolved as { ok: true; destinationId: string }).destinationId, destination.id,
      `${destination.id}: its recorded route opens somebody else's screen`);
  }
});

test("the inventory's recorded routes are exactly what the route spelling produces", () => {
  /* Two authorities exist on purpose -- the inventory's `evidenceTemplates.builtRoute`
   * fills a template, and `formatDestinationRoute` builds the same string from the parser's
   * own constants -- and this is where they are pinned equal. Either drifting alone is the
   * failure; neither file can notice it by itself. */
  const tuple = inventory.captureContract.captureTuple as { theme: 'dark' | 'light'; state: string; width: number; height: number; scale: number };
  for (const destination of inventory.destinations) {
    assert.equal(destination.builtRoute, formatDestinationRoute(destination.id, tuple), `${destination.id}: template and spelling disagree`);
  }
});

test('the capture manifest and the inventory name the same route and the same capture per destination', () => {
  assert.equal(manifest.destinationCount, inventory.destinations.length);
  const byId = new Map(manifest.destinations.map((entry) => [entry.id, entry]));
  for (const destination of inventory.destinations) {
    const entry = byId.get(destination.id);
    assert.ok(entry, `${destination.id} is absent from the capture manifest`);
    assert.equal(entry.builtRoute, destination.builtRoute, `${destination.id}: manifest and inventory disagree about the product route`);
    assert.equal(entry.referenceRoute, destination.referenceRoute, `${destination.id}: manifest and inventory disagree about the reference route`);
    assert.equal(entry.builtCapture, destination.builtCapture, `${destination.id}: manifest and inventory disagree about the built capture`);
  }
});

test('every recorded built capture is a real file, one per destination and never shared', () => {
  const seen = new Set<string>();
  for (const destination of inventory.destinations) {
    const path = resolve(consoleRoot, '..', destination.builtCapture);
    const bytes = readFileSync(path);
    assert.ok(bytes.length > 0, `${destination.id}: its recorded built capture is empty`);
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${destination.id}: its recorded built capture is not a PNG`);
    assert.equal(seen.has(destination.builtCapture), false, `${destination.id}: two rows are mapped to one capture`);
    seen.add(destination.builtCapture);
  }
  assert.equal(seen.size, 32);
});
