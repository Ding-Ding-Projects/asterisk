/**
 * Contract: the site's per-surface inventory registry carries the schema that every
 * other reader of it expects, and agrees with the canonical matrix it names.
 *
 * This exists because the file quietly went backwards. `site/feature-registry.json` had
 * been migrated to schema v2 -- `status` on each row, `implementation.paths` beside it,
 * a `canonicalMatrix` reference at the top -- and a later integration merge took an older
 * copy wholesale, restoring schema v1 with its `state` and `files` fields. Nothing about
 * that reads as a mistake in a diff: the file is still valid JSON, still names all 44
 * canonical features, and still records an honest-looking judgement for every one of them.
 *
 * What it cost was measured rather than guessed: 33 assertions across 26 of the sibling
 * contract files in this directory went red, and `scripts/verify-inventories.mjs` refused
 * at its first registry check, which is the first line of `npm run test:inventories` -- so
 * the whole inventory gate stopped running rather than reporting. The desktop half of the
 * same pair, `app/feature-registry.json`, was untouched and stayed on v2, so the two
 * registries disagreed about their own schema with nothing saying so.
 *
 * Every check here is about the shape and the agreement, never about whether a particular
 * feature is any good. The per-feature files beside this one own that judgement.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const consoleRoot = resolve(siteRoot, '..');
const json = (p) => JSON.parse(readFileSync(resolve(consoleRoot, p), 'utf8'));

const REGISTRY_PATH = 'site/feature-registry.json';
const MATRIX_PATH = 'inventories/surface-completeness.json';
/** The path the registry must name for itself, spelled from the repository root. */
const MATRIX_REFERENCE = 'console/inventories/surface-completeness.json';

const registry = json(REGISTRY_PATH);
const matrix = json(MATRIX_PATH);

/* The canonical identifiers and the legal statuses are read from the matrix rather than
 * retyped here. A list this file carried itself would agree with whatever it was last
 * edited to say, which is the drift it exists to catch. */
const canonicalIds = matrix.features.map((feature) => feature.id);
const statusValues = matrix.statusValues;
const siteSurfaces = matrix.surfaces.filter((surface) => surface.registry === 'site');

test('the sources this contract reads are populated, so nothing below can pass by finding nothing', () => {
  assert.ok(canonicalIds.length > 0, `${MATRIX_PATH} lists no canonical features`);
  assert.ok(Array.isArray(statusValues) && statusValues.length > 0, `${MATRIX_PATH} declares no status values`);
  assert.ok(siteSurfaces.length > 0, `${MATRIX_PATH} holds no surface whose registry is the site`);
  assert.ok(Object.keys(registry.features ?? {}).length > 0, `${REGISTRY_PATH} holds no feature rows`);
});

test('the registry declares schema v2, its own surface, and the matrix it answers to', () => {
  assert.equal(registry.schemaVersion, 2,
    'the site registry is not schema v2 -- scripts/inventory-validation.mjs refuses anything else, and 26 sibling contracts read status rather than state');
  assert.equal(registry.surface, 'pages-site');
  assert.equal(registry.canonicalMatrix, MATRIX_REFERENCE,
    'the registry no longer names the canonical matrix, so nothing ties its judgements to the inventory that carries them');
});

test('the registry names exactly the canonical features, no more and no fewer', () => {
  assert.deepEqual(Object.keys(registry.features).slice().sort(), canonicalIds.slice().sort());
});

test('every row carries a status, and none retains the legacy schema-v1 fields', () => {
  /* `state` and `files` are the v1 spelling. They are checked by exact key presence rather
   * than by a text search, because a row that carries both spellings reads as migrated in
   * every grep and is exactly as broken as one that carries only the old one. */
  for (const id of canonicalIds) {
    const row = registry.features[id];
    assert.ok(Object.hasOwn(row, 'status'), `${id}: the row carries no status`);
    assert.ok(statusValues.includes(row.status), `${id}: status '${row.status}' is not one the matrix allows`);
    assert.equal(Object.hasOwn(row, 'state'), false,
      `${id}: the row still carries the legacy v1 'state' field`);
    assert.equal(Object.hasOwn(row, 'files'), false,
      `${id}: the row still carries the legacy v1 'files' field -- schema v2 records those as implementation.paths`);
  }
});

test('every row records where the feature lives in the exact shape the validator checks', () => {
  for (const id of canonicalIds) {
    const row = registry.features[id];
    for (const half of ['implementation', 'registration']) {
      assert.deepEqual(Object.keys(row[half]).slice().sort(), ['paths', 'symbols'],
        `${id}.${half}: schema v2 records exactly paths and symbols`);
      assert.ok(Array.isArray(row[half].paths), `${id}.${half}.paths is not an array`);
      assert.ok(Array.isArray(row[half].symbols), `${id}.${half}.symbols is not an array`);
    }
    assert.ok(typeof row.note === 'string' && row.note.length > 0,
      `${id}: the row records a status with no note explaining it`);
  }
});

test('a row that claims an implementation names at least one file it lives in', () => {
  /* The one place shape and honesty meet: `absent` is allowed to name nothing, because
   * there is nothing to name. Anything else has to say where it is, or the row is a
   * judgement with no subject. */
  for (const id of canonicalIds) {
    const row = registry.features[id];
    if (row.status === 'absent') continue;
    assert.ok(row.implementation.paths.length > 0,
      `${id}: the row claims '${row.status}' and names no implementation path`);
  }
});

test('the registry and the canonical matrix record the same status for every feature', () => {
  /* Two files hold this judgement, and before this check they had drifted on six of the
   * 44: the matrix still called built-in-authenticator, context-menu-shortcuts,
   * long-operation-progress and in-context-recovery absent from the site long after each
   * one shipped there, and called responsive-sizing and guided-forms absent where the
   * registry called them partial. Neither file is wrong to hold the value; what was wrong
   * was that nothing compared them. */
  let compared = 0;
  for (const surface of siteSurfaces) {
    assert.equal(surface.rows.length, canonicalIds.length,
      `${surface.id}: the surface does not carry every canonical feature`);
    for (const row of surface.rows) {
      assert.equal(row.status, registry.features[row.featureId].status,
        `${surface.id}.${row.featureId}: the matrix and site/feature-registry.json disagree about this feature's status`);
      compared += 1;
    }
  }
  assert.equal(compared, siteSurfaces.length * canonicalIds.length,
    'the comparison did not reach every row, so its silence means nothing');
});
