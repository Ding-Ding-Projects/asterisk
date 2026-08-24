#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { validateFeatureRegistry, validateParityInventory, validateSurfaceInventory } from './inventory-validation.mjs';

const root = resolve(import.meta.dirname, '..', '..');
const allowUnverified = process.argv.includes('--allow-unverified');
const currentCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const readJson = (relativePath) => JSON.parse(readFileSync(resolve(root, relativePath), 'utf8'));

try {
  const matrix = validateSurfaceInventory(readJson('console/inventories/surface-completeness.json'), { allowUnverified, root, currentCommit });
  const desktop = validateFeatureRegistry(readJson('console/app/feature-registry.json'), { surface: 'windows-console', root, currentCommit });
  const site = validateFeatureRegistry(readJson('console/site/feature-registry.json'), { surface: 'pages-site', root, currentCommit });
  const parity = validateParityInventory(readJson('console/inventories/design-parity.json'), { allowUnverified });
  const exemptions = readJson('console/inventories/exemptions.json');
  if (exemptions.schemaVersion !== 2 || !Array.isArray(exemptions.exemptions) || exemptions.exemptions.length !== 0) throw new Error('exemptions: canonical feature set must have no exemptions');
  console.log(`PASS: ${matrix.surfaces} exact surfaces x ${matrix.featuresPerSurface} canonical features = ${matrix.rows} rows.`);
  console.log(`PASS: desktop registry ${desktop.features} features; site registry ${site.features} features; ${parity.destinations} design destinations and ${parity.transientStates} transient states.`);
  console.log(`PASS: all converter and Ollama rows remain required; exemptions=${exemptions.exemptions.length}.`);
} catch (error) {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
}
