import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const json = (path) => JSON.parse(read(path));
const inventory = json('inventories/surface-completeness.json');
const desktop = inventory.surfaces.find((surface) => surface.id === 'desktop-shell');
const implementation = json('app/feature-registry.json').features;
const locales = json('app/locales/feature-registry.json');

const catalogKeys = () => new Set([...read('app/renderer/src/locale-yue.ts').matchAll(/^ {2,}'([^']+)':/gmu)].map((match) => match[1]));

test('desktop localization registry follows the schema-v2 desktop feature set', () => {
  assert.ok(desktop, 'desktop-shell must exist');
  assert.deepEqual(Object.keys(locales.features).sort(), desktop.rows.map((row) => row.featureId).sort());
});

test('the current locale-yue export is parsed as the catalog the registry describes', () => {
  const keys = catalogKeys();
  assert.ok(keys.size > 50, 'locale-yue catalog parse is unexpectedly empty');
  for (const [id, row] of Object.entries(locales.features)) {
    const present = row.labels.filter((label) => keys.has(label));
    const expected = row.labels.length === 0 ? 'not-localized' : present.length === row.labels.length ? 'localized' : 'partial';
    assert.equal(row.state, expected, `${id}: localization state must follow the current locale-yue export`);
    assert.deepEqual(row.localizedLabels, present, `${id}: localizedLabels drift`);
    assert.deepEqual(row.untranslatedLabels, row.labels.filter((label) => !keys.has(label)), `${id}: untranslatedLabels drift`);
  }
});

test('English fallback is never upgraded by registry prose', () => {
  for (const [id, row] of Object.entries(locales.features)) {
    const feature = implementation[id];
    assert.ok(feature, `${id}: missing implementation row`);
    if (row.state === 'localized') continue;
    assert.notEqual(feature.status, 'verified', `${id}: untranslated desktop copy cannot carry a verified implementation claim`);
    if (row.state === 'not-localized') assert.ok(['not-implemented', 'no-label-surface'].includes(row.blockedBy), `${id}: unlocalized row needs an explicit fallback reason`);
  }
});
