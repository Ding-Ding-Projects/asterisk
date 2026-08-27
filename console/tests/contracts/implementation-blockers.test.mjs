import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const registry = JSON.parse(readFileSync(resolve(root, 'app/feature-registry.json'), 'utf8'));
const partial = Object.entries(registry.features).filter(([, feature]) => feature.status === 'partial');

test('partial schema-v2 rows are substantive and explicitly not built-artifact claims', () => {
  assert.ok(partial.length > 0, 'partial rows must not disappear from the registry');
  for (const [id, feature] of partial) {
    assert.ok(feature.note.length > 60, `${id}: partial note is too vague to describe the remaining evidence gap`);
    assert.ok(feature.implementation.paths.length + feature.implementation.symbols.length > 0,
      `${id}: partial status needs an exact implementation seam`);
    assert.equal(feature.builtInteraction.state, 'not-run', `${id}: no built interaction was run in this integration lane`);
    assert.equal(feature.captures.state, 'not-run', `${id}: no current-commit HuiShot was taken in this integration lane`);
    assert.equal(feature.designParity.state, 'not-run', `${id}: no design parity verdict was earned in this integration lane`);
  }
});

test('implemented-unverified rows retain an exact source seam and no verified verdict', () => {
  for (const [id, feature] of Object.entries(registry.features)) {
    if (feature.status !== 'implemented-unverified') continue;
    assert.ok(feature.implementation.paths.length + feature.implementation.symbols.length > 0,
      `${id}: implemented-unverified status needs a source seam`);
    assert.notEqual(feature.status, 'verified');
    assert.equal(feature.builtInteraction.state, 'not-run');
    assert.equal(feature.captures.state, 'not-run');
  }
});
