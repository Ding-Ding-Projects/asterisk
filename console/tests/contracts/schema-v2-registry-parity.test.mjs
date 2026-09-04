import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (path) => {
  try {
    return JSON.parse(readFileSync(resolve(root, path), 'utf8'));
  } catch {
    return JSON.parse(execFileSync('git', ['show', `HEAD:console/${path}`], { cwd: root, encoding: 'utf8' }));
  }
};
const registry = read('app/feature-registry.json');
const matrix = read('inventories/surface-completeness.json');
const desktop = matrix.surfaces.find((surface) => surface.id === 'desktop-shell');

function parity(candidateRegistry = registry, candidateMatrix = matrix) {
  const surface = candidateMatrix.surfaces.find((entry) => entry.id === 'desktop-shell');
  assert.ok(surface, 'exact desktop-shell route is required');
  assert.equal(surface.route, 'desktop://console/main', 'exact desktop-shell route');
  assert.equal(candidateRegistry.schemaVersion, 2);
  assert.equal(candidateRegistry.canonicalMatrix, 'console/inventories/surface-completeness.json');
  assert.equal(surface.rows.length, 44);
  for (const row of surface.rows) {
    const feature = candidateRegistry.features[row.featureId];
    assert.ok(feature, `${row.featureId}: whole registry row disappeared`);
    assert.equal(row.status, feature.status, `${row.featureId}: exact status drift`);
    assert.deepEqual(row.implementation.symbols, feature.implementation.symbols, `${row.featureId}: implementation symbol drift`);
    assert.deepEqual(row.registration.symbols, feature.registration.symbols, `${row.featureId}: registration symbol drift`);
    assert.equal(row.builtInteraction.state, 'not-run', `${row.featureId}: built interaction was not run`);
    assert.equal(row.captures.state, 'not-run', `${row.featureId}: capture was not run`);
  }
}

test('schema-v2 desktop registry and canonical matrix agree', () => parity());
test('status removal turns red', () => {
  const candidate = structuredClone(registry);
  delete candidate.features.narration.status;
  assert.throws(() => parity(candidate), /status drift/);
});
test('exact implementation symbol removal turns red', () => {
  const candidate = structuredClone(registry);
  candidate.features.narration.implementation.symbols = [];
  assert.throws(() => parity(candidate), /implementation symbol drift/);
});
test('route removal turns red', () => {
  const candidate = structuredClone(matrix);
  candidate.surfaces.find((surface) => surface.id === 'desktop-shell').route = 'desktop://wrong';
  assert.throws(() => parity(registry, candidate), /exact desktop-shell route/);
});
test('evidence upgrade without a real run turns red', () => {
  const candidate = structuredClone(matrix);
  candidate.surfaces.find((surface) => surface.id === 'desktop-shell').rows[0].captures.state = 'verified';
  assert.throws(() => parity(registry, candidate), /capture was not run/);
});
