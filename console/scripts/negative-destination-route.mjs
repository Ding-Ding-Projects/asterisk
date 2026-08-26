#!/usr/bin/env node
/**
 * Deliberate red-then-green proof for the destination-route mapping and its wiring.
 *
 * Two things are guarded here and neither can be checked by looking at the running product.
 * The first is the mapping: every audited destination now records its final reference route,
 * product route and built capture, and the validator requires each to be the template
 * expansion at the pinned capture tuple AND requires the product route to parse, in the
 * application's own parser, into that row's own destination. The second is the wiring, whose
 * main-process half no test in this repository can drive -- it needs a real Electron app, a
 * real registered scheme and a real operating system to hand it a link.
 *
 * So each lie below is planted ON ITS OWN, against the real committed files, and must be
 * refused; the untouched tree must then be accepted. One at a time, because breaking three
 * things and seeing one complaint proves only that something among them is watched.
 *
 * The wiring cases comment a line out rather than deleting it. That is how a wiring line
 * usually dies -- somebody comments it out while chasing something else -- and it is the
 * exact break a substring needle cannot see, so it is the one worth planting.
 *
 * Nothing here writes to disk: the wiring check takes its own `read`, and the inventory is
 * validated from a structured clone.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateParityInventory } from './inventory-validation.mjs';
import { WIRING, checkDestinationRouteWiring } from './destination-route-wiring.mjs';

const root = resolve(import.meta.dirname, '..', '..');
const inventoryPath = resolve(root, 'console/inventories/design-parity.json');
const source = JSON.parse(readFileSync(inventoryPath, 'utf8'));
const clone = () => structuredClone(source);
const rowFor = (data, id) => data.destinations.find((destination) => destination.id === id);

let failures = 0;

/** The honest inventory must pass before any lie is planted, or every RED below is free. */
validateParityInventory(source, { allowUnverified: true });
console.log('GREEN (correct): the untouched inventory passes route-mapping validation.');

function mustFail(description, mutate) {
  const candidate = clone();
  mutate(candidate);
  try {
    validateParityInventory(candidate, { allowUnverified: true });
  } catch (error) {
    console.log(`RED   (correct): ${description}\n        -> ${error.message}`);
    return;
  }
  console.error(`GREEN (WRONG):  ${description}: the validator accepted a lie`);
  failures += 1;
}

mustFail('a destination stops recording its reference route', (data) => { delete rowFor(data, 'dash').referenceRoute; });
mustFail('a destination stops recording its product route', (data) => { delete rowFor(data, 'queues').builtRoute; });
mustFail('a destination stops recording its built capture', (data) => { delete rowFor(data, 'about').builtCapture; });
mustFail('a row is mapped to another destination\'s product route', (data) => { rowFor(data, 'dash').builtRoute = rowFor(data, 'about').builtRoute; });
mustFail('a row is mapped to another destination\'s reference route', (data) => { rowFor(data, 'cli').referenceRoute = rowFor(data, 'logger').referenceRoute; });
mustFail('a row is mapped to another destination\'s built capture', (data) => { rowFor(data, 'moh').builtCapture = rowFor(data, 'codecs').builtCapture; });
mustFail('a product route is given a scheme the application does not answer', (data) => { rowFor(data, 'ivr').builtRoute = rowFor(data, 'ivr').builtRoute.replace('ding-pbx:', 'https:'); });
mustFail('a product route names a destination this console does not have', (data) => {
  const row = rowFor(data, 'secrets');
  row.builtRoute = row.builtRoute.replace('/secrets?', '/nowhere?');
});
mustFail('the product-route template stops being a route the application can parse', (data) => {
  data.evidenceTemplates.builtRoute = data.evidenceTemplates.builtRoute.replace('//destination/', '//screen/');
  for (const destination of data.destinations) destination.builtRoute = destination.builtRoute.replace('//destination/', '//screen/');
});
/* The two below exist because the equality check above would otherwise hide the resolve
 * check completely -- a row regenerated from a bad template agrees with that template, so
 * only a template that produces a WELL-FORMED route to the wrong place reaches the last two
 * branches. Without these the resolve branches would be unreachable code wearing the
 * appearance of a guard. */
mustFail('the product-route template gains a suffix, so every route names a destination that does not exist', (data) => {
  data.evidenceTemplates.builtRoute = data.evidenceTemplates.builtRoute.replace('/{id}?', '/{id}-x?');
  for (const destination of data.destinations) destination.builtRoute = destination.builtRoute.replace(`/${destination.id}?`, `/${destination.id}-x?`);
});
mustFail('the product-route template pins one screen and moves the id into the query, so every link opens the dashboard', (data) => {
  data.evidenceTemplates.builtRoute = 'ding-pbx://destination/dash?state=default&theme=dark&width=1440&height=1000&scale=1&row={id}';
  for (const destination of data.destinations) {
    destination.builtRoute = `ding-pbx://destination/dash?state=default&theme=dark&width=1440&height=1000&scale=1&row=${destination.id}`;
  }
});
mustFail('the capture tuple is widened, so every recorded route would re-derive to agree with it', (data) => { data.captureContract.captureTuple.width = 1920; });
mustFail('the capture tuple switches theme', (data) => { data.captureContract.captureTuple.theme = 'light'; });
mustFail('the capture tuple loses a field entirely', (data) => { delete data.captureContract.captureTuple.scale; });
mustFail('a destination row grows a field nobody decided on', (data) => { rowFor(data, 'dash').navigationPlan = { steps: [] }; });

/* ---- the wiring, one commented-out line at a time ------------------------------------- */

const honestWiring = checkDestinationRouteWiring({ root });
if (honestWiring.problems.length === 0) {
  console.log(`GREEN (correct): all ${honestWiring.anchors} wiring anchors are present in the untouched tree.`);
} else {
  for (const problem of honestWiring.problems) console.error(`RED (WRONG): the honest, untouched tree was refused: ${problem}`);
  failures += 1;
}

/** Comments out the first line matching `pattern`, and refuses to pretend it did if it did not. */
function commentOut(text, pattern) {
  const lines = text.split('\r').join('').split('\n');
  const index = lines.findIndex((line) => pattern.test(line));
  if (index === -1) throw new Error(`negative-destination-route: no line matched ${pattern}, so the break never landed`);
  const before = lines[index];
  lines[index] = before.replace(/^(\s*)/, '$1// ');
  const next = lines.join('\n');
  if (next === text.split('\r').join('')) throw new Error(`negative-destination-route: commenting out ${pattern} changed nothing`);
  return next;
}

for (const [relative, pattern, consequence] of WIRING) {
  const absolute = resolve(root, relative);
  const broken = commentOut(readFileSync(absolute, 'utf8'), pattern);
  const { problems } = checkDestinationRouteWiring({
    root,
    read: (path, encoding) => (path === absolute ? broken : readFileSync(path, encoding)),
  });
  const description = `${relative}: ${consequence}`;
  if (problems.length > 0) {
    console.log(`RED   (correct): ${description}`);
  } else {
    console.error(`GREEN (WRONG):  ${description}: the check accepted a commented-out wiring line`);
    failures += 1;
  }
}

validateParityInventory(source, { allowUnverified: true });
const restored = checkDestinationRouteWiring({ root });
if (restored.problems.length > 0) {
  for (const problem of restored.problems) console.error(`RED (WRONG): the restored tree was refused: ${problem}`);
  failures += 1;
}

if (failures > 0) {
  console.error(`\nFAIL: ${failures} case(s) behaved backwards.`);
  process.exit(1);
}
console.log(`\nPASS: 15 inventory lies and ${WIRING.length} commented-out wiring lines each refused; the honest tree accepted.`);
