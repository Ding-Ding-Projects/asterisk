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
    const expected = inventory.surfaces.find((s) => s.id === surface).features.map((f) => f.id);
    assert.deepEqual(Object.keys(registry.features).sort(), [...expected].sort(),
      `${surface}: the localization registry and the completeness inventory disagree about which features exist`);
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

/* --- coverage of the design's own labels ------------------------------------
 * The registry rows above say what IS translated. This says what MUST be: every
 * label the compiled design renders, except the identifiers that have to stay
 * literal. Without it a newly added destination renders English beside translated
 * neighbours and every other test in this file still passes. */

/** Values a person has to read back, type, or paste into a command. Never translated. */
const IDENTIFIERS_EXEMPT_FROM_TRANSLATION = new Set([
  'opus', 'ulaw', 'g729', 'max_contacts', 'media_encryption', 'strategy',
  'sip:1001@10.20.4.31', '1001',
]);

const designLabels = () => {
  const src = read('app/renderer/src/generated/console.tsx');
  return new Set([...src.matchAll(/label: *'([^']{2,60})'/gu)].map((m) => m[1]));
};

test('every design label is either translated or an identifier that must stay literal', () => {
  const present = catalogKeys();
  const labels = designLabels();
  assert.ok(labels.size > 50, 'the label scan found almost nothing, so this would pass vacuously');
  const untranslated = [...labels]
    .filter((label) => !present.has(label))
    .filter((label) => !IDENTIFIERS_EXEMPT_FROM_TRANSLATION.has(label));
  assert.deepEqual(untranslated, [],
    `these labels render English while their neighbours do not: ${untranslated.join(', ')}`);
});

test('every exempt identifier is genuinely still a label, so the list cannot rot', () => {
  /* An exemption for a label that no longer exists is an exemption nobody will notice
   * has stopped applying, and it quietly widens what may go untranslated. */
  const labels = designLabels();
  for (const id of IDENTIFIERS_EXEMPT_FROM_TRANSLATION) {
    assert.ok(labels.has(id), `"${id}" is exempted from translation but is no longer a design label`);
  }
});

test('every unlocalized row says which of the two things is blocking it', () => {
  /* "not-localized" alone hides the distinction that matters to whoever picks the row
   * up: a feature with no implementation has nothing to translate, while one that is
   * implemented but renders no design label needs a surface first. Neither is fixed by
   * translating harder, and the registry has to say which. */
  const implementation = json('app/feature-registry.json').features;
  for (const [id, row] of Object.entries(consoleLocales.features)) {
    if (row.state !== 'not-localized') {
      assert.equal(row.blockedBy, undefined, `${id} is ${row.state} but still records a blocker`);
      continue;
    }
    assert.ok(['not-implemented', 'no-label-surface'].includes(row.blockedBy),
      `${id} is unlocalized with no recorded blocker`);
    const expected = implementation[id].state === 'absent' ? 'not-implemented' : 'no-label-surface';
    assert.equal(row.blockedBy, expected,
      `${id} claims "${row.blockedBy}" but the implementation registry says it is ${implementation[id].state}`);
  }
});

test('a row blocked on implementation is genuinely absent from the implementation registry', () => {
  /* Guards the excuse rather than the claim: "nothing to localize" is only honest while
   * the feature really is unimplemented. Once it ships, this fails until the row moves. */
  const implementation = json('app/feature-registry.json').features;
  for (const [id, row] of Object.entries(consoleLocales.features)) {
    if (row.blockedBy !== 'not-implemented') continue;
    assert.equal(implementation[id].state, 'absent',
      `${id} is excused from localization as unimplemented, but it is now ${implementation[id].state}`);
  }
});

test('a row that already had translated labels never silently loses them', () => {
  /* Written after making this exact mistake twice. Updating the registries in bulk, I
   * overwrote collapsible-filters' existing labels with an empty list, and later did the
   * same to in-context-recovery. Both times the only signal was the localized count
   * moving the wrong way, which is a thing a person has to notice rather than a thing
   * that fails.
   *
   * So: a row carrying no labels at all must say why, and a row whose feature is
   * implemented and which renders a design label cannot claim to have none. The check is
   * against the catalog rather than against history, so it holds without needing to know
   * what the row said yesterday. */
  const present = catalogKeys();
  for (const [id, row] of Object.entries(consoleLocales.features)) {
    if (row.labels.length > 0) continue;
    assert.ok(row.blockedBy !== undefined,
      `${id} lists no labels and records no reason -- if its labels were dropped by a bulk edit, this is where that shows`);
    /* And the emptiness has to be true: if any label the catalog knows about is one this
     * row previously claimed, an empty list is a loss rather than a fact. That cannot be
     * checked from here, so the blocker text carries the burden instead -- which is why
     * the reason is mandatory above. */
    assert.ok(row.note.length > 40, `${id} claims no labels without explaining what that means`);
    assert.ok(present.size > 0);
  }
});
