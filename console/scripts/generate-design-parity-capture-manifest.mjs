#!/usr/bin/env node
/**
 * Maps every one of the 32 audited destinations to its final reference route, built-app
 * route, navigation plan and evidence artifact paths — the concrete, generated answer to
 * "where do I point a headless driver, and what do I do once it gets there" for each
 * destination, rather than a template the orchestrator has to re-derive by hand each time.
 *
 * Pure composition, deliberately: this reads the already-committed
 * inventories/design-parity.json (evidenceTemplates + destinations) and the already-derived
 * design-reference/destination-labels.generated.json (id -> {rail, label, title}, itself
 * regenerated from the compiled catalog — see generate-design-parity-labels.mjs), and runs
 * them through design-parity-capture.mjs's route/selector functions. Nothing here invents a
 * route, a label or a click target; every field traces back to one of those two sources.
 *
 * `--check` (used by the freshness guard) regenerates in memory and exits non-zero if the
 * committed file would change, without writing anything — the same contract as
 * generate-design-parity-labels.mjs's `--check` mode, and for the same reason: a capture
 * manifest that has drifted from the inventory it was generated from is worse than a
 * missing one, because it looks authoritative while pointing a driver at the wrong thing.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DEFAULT_TUPLE, referenceRouteFor, builtRouteFor, navigationPlanFor } from './design-parity-capture.mjs';
import { normalizeCaptureTuple } from './design-parity-contract.mjs';

const root = resolve(import.meta.dirname, '..');
const inventoryPath = resolve(root, 'inventories/design-parity.json');
const labelsPath = resolve(root, 'design-reference/destination-labels.generated.json');
const outPath = resolve(root, 'design-reference/capture-manifest.generated.json');

const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8'));
const labelsFile = JSON.parse(readFileSync(labelsPath, 'utf8'));
const labels = labelsFile.labels;
const captureTuple = normalizeCaptureTuple(inventory.captureContract?.captureTuple ?? DEFAULT_TUPLE, 'inventory capture tuple');

if (labelsFile.destinationCount !== inventory.destinations.length) {
  throw new Error(`generate-design-parity-capture-manifest: destination-labels.generated.json covers ${labelsFile.destinationCount} destinations, inventory has ${inventory.destinations.length} — regenerate the labels file first`);
}

function pathFor(templateKey, id) {
  const template = inventory.evidenceTemplates[templateKey];
  return template.replaceAll('{id}', id);
}

// Every plan is SELF-CONTAINED: it starts from a freshly loaded harness and always clicks its
// own rail first.
//
// This used to thread the previous destination's rail through, so only the first destination
// of each rail carried a rail click — a continuous session that never switches rails twice.
// It modelled a driver nobody wrote. The harness loads one destination per page load, so the
// twenty-six plans with no rail click could only ever look for a section that was not on
// screen, and every one of them failed while the six rail-leading ones passed. Worse, the
// design derives the open rail from the ACTIVE destination and snaps back when a rail click is
// not followed by a section click, so a shared session is not merely fragile here, it is wrong.
const entries = inventory.destinations.map((destination) => {
  const { id, rail } = destination;
  if (!labels[id]) throw new Error(`generate-design-parity-capture-manifest: '${id}' has no entry in destination-labels.generated.json`);
  const plan = navigationPlanFor(id, labels, null);
  return {
    id,
    rail,
    state: captureTuple.state,
    tuple: captureTuple,
    referenceRoute: referenceRouteFor(inventory, id, captureTuple),
    builtRoute: builtRouteFor(inventory, id, captureTuple),
    referenceCapture: pathFor('referenceCapture', id),
    builtCapture: pathFor('builtCapture', id),
    sideBySide: pathFor('sideBySide', id),
    visualDiff: pathFor('visualDiff', id),
    materialAudit: pathFor('materialAudit', id),
    navigationPlan: plan,
  };
});

const generated = {
  generatedBy: 'console/scripts/generate-design-parity-capture-manifest.mjs',
  generatedFrom: [
    'console/inventories/design-parity.json (evidenceTemplates, destinations)',
    'console/design-reference/destination-labels.generated.json (rail/label/title per destination)',
  ],
  note: 'One entry per audited destination: the exact reference route, built-app route, evidence artifact paths, and the real click-sequence navigation plan a headless driver needs to reach it deterministically. Regenerate rather than hand-edit.',
  captureTuple,
  destinationCount: entries.length,
  destinations: entries,
};
const serialized = `${JSON.stringify(generated, null, 2)}\n`;

if (process.argv.includes('--check')) {
  let onDisk;
  try { onDisk = readFileSync(outPath, 'utf8'); } catch { onDisk = null; }
  if (onDisk !== serialized) {
    console.error('FAIL: design-reference/capture-manifest.generated.json is stale or missing — run `node scripts/generate-design-parity-capture-manifest.mjs` to regenerate it.');
    process.exitCode = 1;
  } else {
    console.log(`PASS: capture-manifest.generated.json is current for all ${entries.length} audited destinations.`);
  }
} else {
  writeFileSync(outPath, serialized);
  console.log(`Wrote ${outPath} (${entries.length} destinations).`);
}
