#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateSurfaceInventory, validateParityInventory } from './inventory-validation.mjs';
import { verifyEvidenceOnDisk, verifyExemptions, verifyExemptionRegistries } from './evidence-on-disk.mjs';
import { verifyDesignParityEvidence } from './design-parity-evidence-on-disk.mjs';

const root = resolve(import.meta.dirname, '..', '..');
const allowUnverified = process.argv.includes('--allow-unverified');
const readJson = (relativePath) => JSON.parse(readFileSync(resolve(root, relativePath), 'utf8'));

try {
  const inventory = readJson('console/inventories/surface-completeness.json');
  const surface = validateSurfaceInventory(inventory, { allowUnverified });
  const parityInventory = readJson('console/inventories/design-parity.json');
  const parity = validateParityInventory(parityInventory, { allowUnverified });
  const evidence = verifyEvidenceOnDisk(inventory, { root });
  const parityEvidence = verifyDesignParityEvidence(parityInventory, { root });
  const exemptionRecord = readJson('console/inventories/exemptions.json');
  const exemptions = verifyExemptions(inventory, exemptionRecord);
  const exemptionRegistries = verifyExemptionRegistries(inventory, exemptionRecord, { root });
  const rows = surface.surfaces * surface.featuresPerSurface;
  console.log(`PASS: ${surface.surfaces} surfaces x ${surface.featuresPerSurface} exact feature rows; ${parity.destinations} destinations; ${parity.transientStates} transient-state families.`);
  console.log(`PASS: ${evidence.verifiedRows}/${rows} rows claim verified; ${evidence.checked} claimed evidence artifacts resolved on disk.`);
  console.log(`PASS: ${parityEvidence.verifiedRows}/${parity.destinations} design-parity destinations claim verified; ${parityEvidence.checked} claimed capture/diff/audit artifacts resolved on disk and pass content review.`);
  console.log(`PASS: ${exemptions.exemptRows} row(s) exempt, each with a recorded reason, decider and date.`);
  console.log(`PASS: ${exemptionRegistries.checked} exempt row(s) are recorded absent in their own surface registry, each pointing at the exclusion.`);
} catch (error) {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
}
