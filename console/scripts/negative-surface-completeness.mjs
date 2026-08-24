#!/usr/bin/env node
/* Red then green proof for the canonical matrix. Every case targets one exact
 * boundary, including claims that used to pass through substring discovery. */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { validateSurfaceInventory } from './inventory-validation.mjs';

const root = resolve(import.meta.dirname, '..', '..');
const source = JSON.parse(readFileSync(resolve(root, 'console/inventories/surface-completeness.json'), 'utf8'));
const currentCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const clone = () => structuredClone(source);
const firstRow = (data, id = 'desktop-shell') => data.surfaces.find((surface) => surface.id === id).rows.find((row) => row.featureId === 'narration');

function mustFail(name, mutate) {
  const candidate = clone();
  mutate(candidate);
  try { validateSurfaceInventory(candidate, { allowUnverified: true, root, currentCommit }); }
  catch (error) { console.log(`RED: ${name}: ${error.message}`); return; }
  throw new Error(`${name}: deliberate break stayed green`);
}

function makeVerified(row) {
  row.status = 'verified';
  row.demoState = 'verified';
  row.localization.state = 'verified';
  row.persistence.state = 'verified';
  row.focusedChecks.state = 'verified';
  row.builtInteraction = { state: 'verified', commit: currentCommit, route: row.route, evidence: 'built-interaction-record' };
  row.captures = { state: 'verified', currentCommit, paths: ['console/release/captures/current.png'] };
  row.designParity = { state: 'verified', referenceRoute: 'design-reference://current', builtRoute: row.route, tuple: { state: 'default', theme: 'dark', viewport: '1280x800', scale: '1x' }, rawCaptures: ['reference.png', 'built.png'], sideBySide: 'side-by-side.png', visualDiff: 'diff.json' };
}

validateSurfaceInventory(source, { allowUnverified: true, root, currentCommit });
mustFail('whole-feature-disappearance', (data) => { data.features = data.features.filter((feature) => feature.id !== 'narration'); for (const surface of data.surfaces) surface.rows = surface.rows.filter((row) => row.featureId !== 'narration'); });
mustFail('whole-page-disappearance', (data) => { data.surfaceCatalog = data.surfaceCatalog.filter((surface) => surface.id !== 'site-index'); data.surfaces = data.surfaces.filter((surface) => surface.id !== 'site-index'); });
mustFail('renamed-symbol', (data) => { firstRow(data).implementation.symbols[0].name = 'NarratorRenamed'; });
mustFail('commented-symbol', (data) => { firstRow(data).implementation.symbols[0].name = '//Narrator'; });
mustFail('stale-commit', (data) => { const row = firstRow(data); makeVerified(row); row.builtInteraction.commit = '0000000000'; });
mustFail('missing-evidence', (data) => { const row = firstRow(data); makeVerified(row); row.captures.paths = []; });
mustFail('route-only-prose', (data) => { const row = firstRow(data); row.status = 'partial'; row.implementation = { registry: null, paths: [], symbols: [] }; });
mustFail('fake-success', (data) => { const row = firstRow(data); makeVerified(row); row.focusedChecks.state = 'not-run'; });
mustFail('sample-data', (data) => { firstRow(data).dataProvenance.sampleData = true; });
validateSurfaceInventory(source, { allowUnverified: true, root, currentCommit });
console.log('GREEN: restored canonical matrix passed exact-boundary validation.');
