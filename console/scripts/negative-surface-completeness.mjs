#!/usr/bin/env node
/* Red then green proof for the canonical matrix. Every case targets one exact
 * boundary, including claims that used to pass through substring discovery. */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { validateSurfaceInventory, validateSymbolSource } from './inventory-validation.mjs';

const root = resolve(import.meta.dirname, '..', '..');
const source = JSON.parse(readFileSync(resolve(root, 'console/inventories/surface-completeness.json'), 'utf8'));
const currentCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const firstRow = (data, id = 'desktop-shell') => data.surfaces.find((surface) => surface.id === id).rows.find((row) => row.featureId === 'narration');

function mustFail(name, mutate, options = {}) {
  const restore = mutate(source) ?? (() => {});
  try { validateSurfaceInventory(source, { allowUnverified: true, root, currentCommit, checkBaseline: false, ...options }); }
  catch (error) { console.log(`RED: ${name}: ${error.message}`); return; }
  finally { restore(); }
  throw new Error(`${name}: deliberate break stayed green`);
}

function mustFailSource(name, mutate, symbol, source) {
  const broken = mutate(source);
  if (broken === source) throw new Error(`${name}: deliberate source break was not planted`);
  try { validateSymbolSource(broken, symbol); }
  catch (error) { console.log(`RED: ${name}: ${error.message}`); validateSymbolSource(source, symbol); return; }
  throw new Error(`${name}: deliberate source break stayed green`);
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
mustFail('whole-feature-disappearance', (data) => {
  const features = data.features;
  const rows = data.surfaces.map((surface) => surface.rows);
  data.features = features.filter((feature) => feature.id !== 'narration');
  for (const surface of data.surfaces) surface.rows = surface.rows.filter((row) => row.featureId !== 'narration');
  return () => { data.features = features; data.surfaces.forEach((surface, index) => { surface.rows = rows[index]; }); };
}, { sourceChecks: false });
mustFail('whole-page-disappearance', (data) => {
  const surfaceCatalog = data.surfaceCatalog;
  const surfaces = data.surfaces;
  data.surfaceCatalog = surfaceCatalog.filter((surface) => surface.id !== 'site-index');
  data.surfaces = surfaces.filter((surface) => surface.id !== 'site-index');
  return () => { data.surfaceCatalog = surfaceCatalog; data.surfaces = surfaces; };
}, { sourceChecks: false });
mustFail('renamed-symbol', (data) => {
  const symbol = firstRow(data).implementation.symbols[0];
  const name = symbol.name;
  symbol.name = 'NarratorRenamed';
  return () => { symbol.name = name; };
}, { sourceChecks: true });
const sourceFixture = `${execFileSync('git', ['show', 'HEAD:console/app/renderer/src/App.tsx'], { cwd: root, encoding: 'utf8' }).replace(/\r\n|\r/g, '\n')}\nfunction candidateMarkerFixture() {}\ncandidateMarkerFixture();\n`;
const sourceFixtureSymbol = { path: 'app/renderer/src/App.tsx', name: 'candidateMarkerFixture', kind: 'function' };
const sourceFixtureDeclaration = /^function candidateMarkerFixture\(\) \{\}$/mu;
if (!sourceFixtureDeclaration.test(sourceFixture)) throw new Error('commented-symbol fixture has no live candidate declaration and call');
validateSymbolSource(sourceFixture, sourceFixtureSymbol);
mustFailSource('commented-symbol', (source) => source.replace(sourceFixtureDeclaration, '  // fire(title: string, body: string, isError?: boolean): void;'), sourceFixtureSymbol, sourceFixture);
mustFail('stale-commit', (data) => {
  const row = firstRow(data);
  const original = structuredClone(row);
  makeVerified(row);
  row.builtInteraction.commit = '0000000000';
  return () => Object.assign(row, original);
}, { sourceChecks: false });
mustFail('missing-evidence', (data) => {
  const row = firstRow(data);
  const original = structuredClone(row);
  makeVerified(row);
  row.captures.paths = [];
  return () => Object.assign(row, original);
}, { sourceChecks: false });
mustFail('route-only-prose', (data) => {
  const row = firstRow(data);
  const original = structuredClone(row.implementation);
  const status = row.status;
  row.status = 'partial';
  row.implementation = { registry: null, paths: [], symbols: [] };
  return () => { row.status = status; row.implementation = original; };
}, { sourceChecks: false });
mustFail('fake-success', (data) => {
  const row = firstRow(data);
  const original = structuredClone(row);
  makeVerified(row);
  row.focusedChecks.state = 'not-run';
  return () => Object.assign(row, original);
}, { sourceChecks: false });
mustFail('sample-data', (data) => {
  const provenance = firstRow(data).dataProvenance;
  const sampleData = provenance.sampleData;
  provenance.sampleData = true;
  return () => { provenance.sampleData = sampleData; };
}, { sourceChecks: false });
validateSurfaceInventory(source, { allowUnverified: true, root, currentCommit });
console.log('GREEN: restored canonical matrix passed exact-boundary validation.');
