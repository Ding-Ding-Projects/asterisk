import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (path) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const registry = read('app/feature-registry.json');
const matrix = read('inventories/surface-completeness.json');
const desktop = matrix.surfaces.find((surface) => surface.id === 'desktop-shell');

test('schema-v2 desktop registry has exactly the canonical forty-four rows', () => {
  assert.equal(registry.schemaVersion, 2);
  assert.ok(desktop, 'desktop-shell is required in the hand-written surface catalog');
  assert.equal(Object.keys(registry.features).length, 44);
  assert.equal(desktop.rows.length, 44);
  assert.deepEqual([...desktop.rows.map((row) => row.featureId)].sort(), Object.keys(registry.features).sort());
});

test('an absent source claim contains no implementation or registration seam', () => {
  for (const [id, feature] of Object.entries(registry.features)) {
    if (feature.status !== 'absent') continue;
    assert.deepEqual(feature.implementation.paths, [], `${id}: absent feature has an implementation path`);
    assert.deepEqual(feature.implementation.symbols, [], `${id}: absent feature has an implementation symbol`);
    assert.deepEqual(feature.registration.paths, [], `${id}: absent feature has a registration path`);
    assert.deepEqual(feature.registration.symbols, [], `${id}: absent feature has a registration symbol`);
  }
});

test('the desktop matrix mirrors every exact nested registry status and seam', () => {
  for (const row of desktop.rows) {
    const feature = registry.features[row.featureId];
    assert.equal(row.status, feature.status, `${row.featureId}: status drift`);
    assert.deepEqual(row.implementation.symbols, feature.implementation.symbols, `${row.featureId}: implementation symbols drift`);
    assert.deepEqual(row.registration.symbols, feature.registration.symbols, `${row.featureId}: registration symbols drift`);
  }
});
