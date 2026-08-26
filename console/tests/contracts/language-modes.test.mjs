/**
 * Contract: the localization evidence registries describe what the sources actually
 * contain.
 *
 * A registry is only evidence if it cannot be edited into agreement. Every state in
 * both files is recomputed here from the real source -- the console's Cantonese
 * catalog and the site's COPY table -- and any row that disagrees fails. Marking a
 * feature `localized` therefore requires translating it, not editing JSON.
 *
 * Plain `.mjs` on purpose: this is the `localCheck` evidence column, which must run
 * without the renderer's TypeScript pipeline. It reads both sources as text, so it
 * keeps working if either module's imports change.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');
const json = (p) => JSON.parse(read(p));

const inventory = json('inventories/surface-completeness.json');
const consoleLocales = json('app/locales/feature-registry.json');
const siteLocales = json('site/locales/feature-registry.json');

/** Catalog keys, read out of the module rather than imported, so this stays plain JS. */
const catalogKeys = () => {
  const src = read('app/renderer/src/locale-yue.ts');
  const single = [...src.matchAll(/^ {2}'([^']+)':/gmu)].map((m) => m[1]);
  const double = [...src.matchAll(/^ {2}"([^"]+)":/gmu)].map((m) => m[1]);
  return new Set([...single, ...double]);
};

/** The site's COPY keys, read the same way out of its bundle source. */
const siteCopyKeys = () => {
  const src = read('site/app.js');
  const body = src.slice(src.indexOf('const COPY = {'), src.indexOf('function copyText(key)'));
  return new Set([...body.matchAll(/(\w+):\s*\{/gu)].map((m) => m[1]).filter((k) => k !== 'en' && k !== 'zh'));
};

const expectedState = (required, present) => {
  if (required.length === 0) return 'not-localized';
  return required.every((k) => present.has(k)) ? 'localized' : 'partial';
};

test('both surfaces have a localization registry, and it covers every canonical feature', () => {
  for (const [surface, registry] of [['windows-console', consoleLocales], ['pages-site', siteLocales]]) {
    const explicitSurfaces = inventory.surfaces.filter((entry) => entry.registry === (surface === 'pages-site' ? 'site' : 'desktop'));
    assert.ok(explicitSurfaces.length > 0, `${surface}: canonical matrix has no explicit surfaces`);
    const expected = inventory.features.map((feature) => feature.id);
    assert.deepEqual(Object.keys(registry.features).sort(), [...expected].sort(),
      `${surface}: the localization registry and canonical feature matrix disagree about which features exist`);
    for (const entry of explicitSurfaces) {
      assert.deepEqual(entry.rows.map((row) => row.featureId).sort(), [...expected].sort(),
        `${surface}: explicit surface ${entry.id} is missing a canonical feature row`);
    }
  }
});

test('every console row states what the catalog actually contains', () => {
  const present = catalogKeys();
  assert.ok(present.size > 0, 'the catalog parsed as empty, so every row below would pass vacuously');
  for (const [id, row] of Object.entries(consoleLocales.features)) {
    assert.equal(row.state, expectedState(row.labels, present),
      `${id}: registry says "${row.state}" but the catalog says otherwise`);
    assert.deepEqual(row.localizedLabels, row.labels.filter((l) => present.has(l)), `${id}: localizedLabels drifted`);
    assert.deepEqual(row.untranslatedLabels, row.labels.filter((l) => !present.has(l)), `${id}: untranslatedLabels drifted`);
  }
});

test('every site row states what the COPY table actually contains', () => {
  const present = siteCopyKeys();
  assert.ok(present.size > 0, 'the COPY table parsed as empty, so every row below would pass vacuously');
  assert.deepEqual([...present].sort(), [...siteLocales.knownCopyKeys].sort(),
    'the recorded COPY keys no longer match site/app.js');
  for (const [id, row] of Object.entries(siteLocales.features)) {
    assert.equal(row.state, expectedState(row.copyKeys, present),
      `${id}: registry says "${row.state}" but the COPY table says otherwise`);
  }
});

test('a row can never claim a label or key that does not exist', () => {
  /* The failure this is really guarding: a row marked localized whose labels were
   * invented, which would read as translated coverage that no user ever sees. */
  const present = catalogKeys();
  for (const [id, row] of Object.entries(consoleLocales.features)) {
    if (row.state !== 'localized') continue;
    for (const label of row.labels) {
      assert.ok(present.has(label), `${id} is marked localized but "${label}" is not in the catalog`);
    }
    assert.ok(row.labels.length > 0, `${id} is marked localized while naming no labels at all`);
  }
});

test('every row names the mechanism that would localize it', () => {
  /* A `not-localized` row must distinguish missing translation from missing wiring,
   * because those are completely different amounts of work for whoever picks it up. */
  for (const [surface, registry] of [['console', consoleLocales], ['site', siteLocales]]) {
    for (const [id, row] of Object.entries(registry.features)) {
      assert.ok(row.mechanism && row.mechanism.length > 20, `${surface}/${id}: no mechanism recorded`);
      assert.ok(row.note && row.note.length > 20, `${surface}/${id}: no note recorded`);
    }
  }
});

test('the recorded language modes match the ones the code implements', () => {
  const boundary = read('app/renderer/src/text-boundary.ts');
  const declared = [...boundary.matchAll(/'(en|yue|both)'/gu)].map((m) => m[1]);
  for (const mode of consoleLocales.languageModes) {
    assert.ok(declared.includes(mode), `the registry lists "${mode}" but the boundary does not implement it`);
  }
});

test('the console honestly reports partial coverage rather than rounding up', () => {
  /* This asserts the shape of the truth, not a target: some features are translated
   * and some are not, and a registry claiming otherwise in either direction is the
   * thing that makes evidence worthless. */
  const states = Object.values(consoleLocales.features).map((r) => r.state);
  assert.ok(states.includes('localized'), 'no feature is localized, so the mechanism is not actually in use');
  assert.ok(states.includes('not-localized'), 'every feature claims localization, which the catalog does not support');
});
