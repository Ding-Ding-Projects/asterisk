#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateParityInventory } from './inventory-validation.mjs';

const root = resolve(import.meta.dirname, '..', '..');
const source = JSON.parse(readFileSync(resolve(root, 'console/inventories/design-parity.json'), 'utf8'));
const clone = () => structuredClone(source);

function mustFail(name, mutate) {
  const candidate = clone();
  mutate(candidate);
  try { validateParityInventory(candidate, { allowUnverified: true }); }
  catch (error) { console.log(`RED: ${name}: ${error.message}`); return; }
  throw new Error(`${name}: deliberate break stayed green`);
}

validateParityInventory(source, { allowUnverified: true });
mustFail('change the source archive digest', (data) => { data.sourceArchive.sha256 = `0${data.sourceArchive.sha256.slice(1)}`; });
mustFail('remove one exact destination', (data) => { data.destinations = data.destinations.filter(({ id }) => id !== 'dash'); });
mustFail('rename a destination with a containing suffix', (data) => { data.destinations[0].id = 'dash-renamed'; });
// The row carries concrete final artifacts, so exercise each required field against one
// named row. This stays hand-written: iterating Object.keys(row) would stop watching a field
// the same change deleted from both the inventory and the negative fixture.
for (const field of ['rail', 'id', 'status', 'referenceRoute', 'builtRoute', 'builtCapture']) {
  mustFail(`remove destination 'dash' field '${field}'`, (data) => { delete data.destinations[0][field]; });
}
mustFail('change one rail count', (data) => { data.auditBaseline.railCounts.pbx = 7; });
mustFail('remove one binding event', (data) => { delete data.auditBaseline.declarativeBindings.mouseup; });
mustFail('remove one transient-state family', (data) => { data.transientStateFamilies.pop(); });
// Keep one deliberate red fixture per exact, hand-written evidence template. These must not be
// derived from Object.keys(data.evidenceTemplates), because the entire point is to detect a key
// that has disappeared from the inventory itself.
for (const templateKey of [
  'referenceRoute', 'builtRoute', 'referenceCapture', 'builtCapture', 'sideBySide',
  'visualDiff', 'regionLedger', 'chromeParity', 'materialAudit',
]) {
  mustFail(`remove the '${templateKey}' evidence template`, (data) => { delete data.evidenceTemplates[templateKey]; });
}
for (const field of ['method', 'test', 'coverage']) {
  mustFail(`remove compiledEvidence field '${field}'`, (data) => { delete data.compiledEvidence[field]; });
  mustFail(`empty compiledEvidence field '${field}'`, (data) => { data.compiledEvidence[field] = ''; });
}
mustFail('claim a compiled destination without naming the design compiler', (data) => { data.compiledEvidence.method = 'hand matched by eye'; });
mustFail('use a status the validator does not define', (data) => { data.destinations[0].status = 'looks-right'; });
mustFail('remove the chrome-parity bar declaration entirely', (data) => { delete data.chromeParityBar; });
mustFail('soften the chrome-parity tolerance away from exact', (data) => { data.chromeParityBar.tolerance = 8; });
mustFail('lower the floor on how much of the frame a mask may hide', (data) => { data.chromeParityBar.minimumComparedFraction = 0.02; });
mustFail('drop the floor on how much of the frame a mask may hide', (data) => { delete data.chromeParityBar.minimumComparedFraction; });
mustFail('reclassify the navigation rail as data, so a divergence there stops counting', (data) => { data.chromeParityBar.areas.rail.role = 'data'; });
mustFail('give an area a role the bar does not define', (data) => { data.chromeParityBar.areas.rail.role = 'decorative'; });
mustFail('declare an area role with no reason behind it', (data) => { delete data.chromeParityBar.areas.statusCell.why; });
mustFail('reclassify the destination screen as chrome, so its invented sample content is compared', (data) => { data.chromeParityBar.areas.contentPane.role = 'chrome'; });
/* The reverse direction of the move this bar's newest decision made. commandCell was pinned
 * `chrome` on a reason that turned out to be false and is now pinned `data`; putting it back
 * would widen the bar by comparing the design's invented connection reading against the
 * application's real one, which is the one thing the bar exists not to do. Widening is the
 * safer direction to get wrong, which is exactly why it needs a break of its own — a bar that
 * only refuses narrowing would let this back in silently. */
mustFail('reclassify the connection pill as chrome, so the design\'s invented reading is compared again', (data) => { data.chromeParityBar.areas.commandCell.role = 'chrome'; });
mustFail('drop one area from the bar entirely', (data) => { delete data.chromeParityBar.areas.tabStrip; });
mustFail('add an area the pinned bar never decided a role for', (data) => { data.chromeParityBar.areas.mysteryPanel = { role: 'data', why: 'nobody said' }; });
mustFail('strip the explanation of why the tolerance is zero', (data) => { delete data.chromeParityBar.whyToleranceIsZero; });
validateParityInventory(source, { allowUnverified: true });
console.log('GREEN: restored design parity inventory passed exact-boundary validation.');
