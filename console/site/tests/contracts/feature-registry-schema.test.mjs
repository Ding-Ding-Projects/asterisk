/**
 * Contract: the pages-site feature registry is the shape its own readers demand.
 *
 * This file exists because the registry had three readers that disagreed about it, and
 * nothing anywhere held them together:
 *
 *   - `console/scripts/inventory-validation.mjs` requires schemaVersion 2, a `status`
 *     field drawn from a fixed vocabulary, and `implementation`/`registration` objects.
 *   - thirty-three assertions in the sibling contract files here read `.status` and
 *     compare it against that same vocabulary.
 *   - `console/scripts/generate-completeness-matrix.mjs`, which WRITES this file, emits
 *     exactly that shape.
 *
 * The committed data was schemaVersion 1 with a `state` field instead, so every one of
 * those thirty-three assertions compared `undefined` against a string literal and could
 * never pass -- and `verify-inventories.mjs`, which is the first command in the
 * `test:inventories` chain, threw on the schemaVersion before any of the thirty-seven
 * gates behind it ran. A disagreement between an artifact and the checks that speak for
 * it is worth a check of its own, so this is it.
 *
 * Everything here is re-derived from the real validator and the real generator rather
 * than restated. A restated copy of a rule is the thing that drifted in the first place.
 *
 * Plain `.mjs`, no bundler, no build step -- this is the `localCheck` evidence column
 * and must run standalone against the published sources.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { validateFeatureRegistry } from '../../../scripts/inventory-validation.mjs';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const repoRoot = resolve(siteRoot, '..', '..');
const read = (p) => readFileSync(resolve(siteRoot, p), 'utf8').replaceAll('\r\n', '\n');
const registry = JSON.parse(read('feature-registry.json'));

const validatorSource = readFileSync(resolve(repoRoot, 'console/scripts/inventory-validation.mjs'), 'utf8').replaceAll('\r\n', '\n');
const generatorSource = readFileSync(resolve(repoRoot, 'console/scripts/generate-completeness-matrix.mjs'), 'utf8').replaceAll('\r\n', '\n');

/** The status vocabulary, lifted out of the validator rather than typed again here. */
function statusVocabulary() {
  const match = validatorSource.match(/^const STATUS_VALUES = \[([^\]]*)\];$/mu);
  assert.ok(match, 'inventory-validation.mjs no longer declares STATUS_VALUES on one line -- re-derive this reader');
  const values = [...match[1].matchAll(/'([^']+)'/gu)].map((entry) => entry[1]);
  assert.ok(values.length >= 2, `the status vocabulary read back as ${values.length} entries, which is too few to be the real one`);
  return values;
}

test('the committed registry passes the real validator, not a restatement of it', () => {
  // The same call verify-inventories.mjs makes, with the same repository root, so this
  // suite and that gate cannot disagree about whether the file is well formed.
  const result = validateFeatureRegistry(registry, { surface: 'pages-site', root: repoRoot, currentCommit: null });
  assert.equal(result.features, Object.keys(registry.features).length);
});

test('every row carries a status from the validator own vocabulary, and no leftover state field', () => {
  const vocabulary = statusVocabulary();
  for (const [id, row] of Object.entries(registry.features)) {
    assert.ok(vocabulary.includes(row.status), `${id}: status '${row.status}' is outside the validator vocabulary ${vocabulary.join(', ')}`);
    assert.equal(Object.hasOwn(row, 'state'), false,
      `${id}: a schema-1 'state' field is back beside 'status' -- two names for one fact is how this drifted the first time`);
    assert.equal(Object.hasOwn(row, 'files'), false,
      `${id}: a schema-1 'files' list is back beside implementation.paths -- one list, one truth`);
  }
});

test('no site row claims verified, because no pages-site row has built evidence yet', () => {
  for (const [id, row] of Object.entries(registry.features)) {
    assert.notEqual(row.status, 'verified', `${id}: a registry row cannot claim verified without an evidence row behind it`);
  }
});

test('every path a row names is a file that exists', () => {
  for (const [id, row] of Object.entries(registry.features)) {
    for (const group of ['implementation', 'registration']) {
      for (const path of row[group].paths) {
        assert.ok(existsSync(resolve(repoRoot, 'console', path)),
          `${id}.${group}: names ${path}, which is not in the tree`);
      }
      for (const symbol of row[group].symbols) {
        assert.ok(row[group].paths.includes(symbol.path) || row.implementation.paths.includes(symbol.path),
          `${id}.${group}: names symbol ${symbol.name} in ${symbol.path}, a file the row itself never lists`);
      }
    }
  }
});

test('an absent row names no implementation, and a non-absent row names at least one path', () => {
  for (const [id, row] of Object.entries(registry.features)) {
    if (row.status === 'absent') {
      assert.deepEqual(row.implementation.symbols, [], `${id}: recorded absent while naming an implementation symbol`);
      assert.deepEqual(row.registration.symbols, [], `${id}: recorded absent while naming a registration symbol`);
    } else {
      assert.ok(row.implementation.paths.length > 0, `${id}: claims ${row.status} while naming no file at all`);
    }
  }
});

test('every row carries a note, because a status with no reason is not evidence', () => {
  for (const [id, row] of Object.entries(registry.features)) {
    assert.equal(typeof row.note, 'string', `${id}: no note`);
    assert.ok(row.note.trim().length > 40, `${id}: the note is ${row.note.trim().length} characters, too short to say why the status is what it is`);
  }
});

/* ------------------------------------------------------------------
 * The generator that writes this file.
 * ------------------------------------------------------------------
 * `generate-completeness-matrix.mjs` holds its own hard-written table of pages-site
 * statuses and rewrites this registry from it. That table went stale -- it still called
 * eight features absent that have since been built -- so re-running the generator would
 * have silently reverted them. The table and the committed file are now required to
 * agree, which turns that from a silent revert into a red check.
 * ------------------------------------------------------------------ */

/** Reads the generator own siteStatus table out of its source. */
function generatorSiteStatus() {
  const start = generatorSource.indexOf('const siteStatus = {');
  assert.notEqual(start, -1, 'generate-completeness-matrix.mjs no longer declares siteStatus -- re-derive this reader');
  const end = generatorSource.indexOf('\n};', start);
  assert.notEqual(end, -1, 'the siteStatus table is no longer terminated on its own line');
  const body = generatorSource.slice(start, end);
  const table = {};
  for (const entry of body.matchAll(/(?:'([a-z-]+)'|([a-z]+)):\s*'([a-z-]+)'/gu)) {
    table[entry[1] ?? entry[2]] = entry[3];
  }
  return table;
}

test('the generator status table is read back as a real table, so the comparison below is not vacuous', () => {
  const table = generatorSiteStatus();
  assert.equal(Object.keys(table).length, Object.keys(registry.features).length,
    `the generator table read back as ${Object.keys(table).length} entries against ${Object.keys(registry.features).length} registry rows -- the reader above has stopped matching the source`);
});

test('the generator status table agrees with the committed registry, row for row', () => {
  const table = generatorSiteStatus();
  const disagreements = [];
  for (const [id, row] of Object.entries(registry.features)) {
    if (table[id] !== row.status) disagreements.push(`${id}: generator says ${table[id]}, registry says ${row.status}`);
  }
  assert.deepEqual(disagreements, [],
    're-running generate-completeness-matrix.mjs would rewrite these rows to something the audited registry disagrees with');
});
