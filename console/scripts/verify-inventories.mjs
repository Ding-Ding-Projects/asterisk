#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { validateReleaseValidationInventory, validateSurfaceInventory, validateParityInventory } from './inventory-validation.mjs';
import { verifyEvidenceOnDisk, verifyExemptions } from './evidence-on-disk.mjs';

const root = resolve(import.meta.dirname, '..', '..');
const allowUnverified = process.argv.includes('--allow-unverified');
const readJson = (relativePath) => JSON.parse(readFileSync(resolve(root, relativePath), 'utf8'));

try {
  const inventory = readJson('console/inventories/surface-completeness.json');
  const surface = validateSurfaceInventory(inventory, { allowUnverified });
  const parity = validateParityInventory(readJson('console/inventories/design-parity.json'), { allowUnverified });
  const evidence = verifyEvidenceOnDisk(inventory, { root });
  const exemptions = verifyExemptions(inventory, readJson('console/inventories/exemptions.json'));
  const release = validateReleaseValidationInventory(readJson('console/inventories/release-validation.json'));
  const eventCensus = spawnSync(process.execPath, [resolve(root, 'console', 'scripts', 'verify-event-copy-inventory.mjs')], { cwd: resolve(root, 'console'), encoding: 'utf8', shell: false });
  if (eventCensus.status !== 0) throw new Error(`event-copy census failed: ${(eventCensus.stderr || eventCensus.stdout).trim()}`);
  const probePath = spawnSync(process.execPath, [resolve(root, 'console', 'scripts', 'verify-probe-path-fixture.mjs')], { cwd: resolve(root, 'console'), encoding: 'utf8', shell: false });
  if (probePath.status !== 0) throw new Error(`probe path fixture failed: ${(probePath.stderr || probePath.stdout).trim()}`);
  const packageJson = readJson('console/package.json');
  for (const check of readJson('console/inventories/release-validation.json').checks) {
    if (!existsSync(resolve(root, check.source))) throw new Error(`release validation ${check.id}: source path missing: ${check.source}`);
    if (check.command && !Object.values(packageJson.scripts ?? {}).some((script) => script.includes(check.command) || check.command.includes(script))) throw new Error(`release validation ${check.id}: command is not present in an exact package script: ${check.command}`);
  }
  const rows = surface.surfaces * surface.featuresPerSurface;
  console.log(`PASS: ${surface.surfaces} surfaces x ${surface.featuresPerSurface} exact feature rows; ${parity.destinations} destinations; ${parity.transientStates} transient-state families.`);
  console.log(`PASS: ${evidence.verifiedRows}/${rows} rows claim verified; ${evidence.checked} claimed evidence artifacts resolved on disk.`);
  console.log(`PASS: ${exemptions.exemptRows} row(s) exempt, each with a recorded reason, decider and date.`);
  console.log(`PASS: ${release.checks} release-equivalent native-vault checks are inventoried with exact source paths and commands.`);
  console.log(`PASS: dynamic event census invoked: ${eventCensus.stdout.trim()}`);
  console.log(`PASS: probe path fixture invoked: ${probePath.stdout.trim()}`);
} catch (error) {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
}
