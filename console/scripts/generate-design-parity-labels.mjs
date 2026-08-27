#!/usr/bin/env -S npx tsx
/**
 * Derives the id -> {rail, label, title} lookup the design-reference capture harness uses
 * to know which rail icon and which section button to click for a given destination.
 *
 * This is deliberately NOT a hand-typed copy of the design's own labels: hand-typing them
 * would drift the moment the design changes, and a selector built from a stale label
 * silently clicks nothing (or the wrong thing). Instead it imports the already-compiled,
 * already-tested navigation catalog (app/renderer/src/catalog.ts, which is derived
 * straight from the compiled design reference — see design-parity.test.tsx, which already
 * proves every destination's title/label survive compilation) and filters it down to
 * exactly the 32 destination ids this design-parity audit covers.
 *
 * The actual computation (rail translation, drift detection, serialization) lives in
 * design-parity-labels.mjs, which is plain JS and unit-tested with plain `node:test` —
 * this file is only the thin TypeScript-importing wrapper around it, since importing
 * catalog.ts is the one part that genuinely needs a TS-capable runtime.
 *
 * Must be run with `tsx` (not plain `node`): `npx tsx scripts/generate-design-parity-labels.mjs [--check]`.
 *
 * `--check` (used by the freshness guard) regenerates in memory and exits non-zero if the
 * committed file would change, without writing anything.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { destinations, rails } from '../app/renderer/src/catalog';
import { computeLabels, serializeLabels } from './design-parity-labels.mjs';

const root = resolve(import.meta.dirname, '..');
const outPath = resolve(root, 'design-reference/destination-labels.generated.json');
const inventory = JSON.parse(readFileSync(resolve(root, 'inventories/design-parity.json'), 'utf8'));

const generated = computeLabels(inventory, destinations, rails);
const serialized = serializeLabels(generated);

if (process.argv.includes('--check')) {
  let onDisk;
  try { onDisk = readFileSync(outPath, 'utf8'); } catch { onDisk = null; }
  if (onDisk !== serialized) {
    console.error('FAIL: design-reference/destination-labels.generated.json is stale or missing — run `npx tsx scripts/generate-design-parity-labels.mjs` to regenerate it.');
    process.exitCode = 1;
  } else {
    console.log(`PASS: destination-labels.generated.json is current for all ${generated.destinationCount} audited destinations.`);
  }
} else {
  writeFileSync(outPath, serialized);
  console.log(`Wrote ${outPath} (${generated.destinationCount} destinations).`);
}
