#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateSurfaceInventory, validateParityInventory } from './inventory-validation.mjs';
import { verifyEvidenceOnDisk, verifyExemptions } from './evidence-on-disk.mjs';
import { verifyEvidenceIntegrity } from './evidence-integrity.mjs';
import { verifyDocumentationAgreement } from './documentation-agreement.mjs';
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
  const integrity = verifyEvidenceIntegrity(inventory, { root });
  const agreement = verifyDocumentationAgreement(inventory, readJson('console/inventories/documentation-agreement.json'), { root });
  const parityEvidence = verifyDesignParityEvidence(parityInventory, { root });
  const exemptions = verifyExemptions(inventory, readJson('console/inventories/exemptions.json'));
  const rows = surface.surfaces * surface.featuresPerSurface;
  console.log(`PASS: ${surface.surfaces} surfaces x ${surface.featuresPerSurface} exact feature rows; ${parity.destinations} destinations; ${parity.transientStates} transient-state families.`);
  console.log(`PASS: ${evidence.verifiedRows}/${rows} rows claim verified; ${evidence.checked} claimed evidence artifacts resolved on disk.`);
  console.log(`PASS: ${integrity.boundCaptures} capture(s) bound to their own built-interaction record by path, digest and byte length, each row's documentation agreeing with its surface registry.`);
  console.log(`PASS: documentation/registry census holds at ${agreement.agree} agreeing, ${agreement.disagree} disagreeing and ${agreement.undeclared} undeclared of ${agreement.pairs} surface-feature pairs.`);
  console.log(`PASS: ${parityEvidence.verifiedRows}/${parity.destinations} design-parity destinations claim verified; ${parityEvidence.checked} claimed capture/diff/audit artifacts resolved on disk and pass content review.`);
  console.log(`PASS: ${exemptions.exemptRows} row(s) exempt, each with a recorded reason, decider and date.`);
} catch (error) {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
}
