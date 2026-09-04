/**
 * The published site's feature registry, the canonical matrix, and the generator that
 * produces both must agree -- exactly, and in the canonical vocabulary.
 *
 * This exists because all three disagreed at once and nothing said so. `site/feature-registry.json`
 * was still schemaVersion 1, keyed `state`, carrying a value (`implemented`) that is not one of
 * the four canonical statuses; `scripts/verify-inventories.mjs` refused it outright and stopped
 * before every check behind it; thirty-three site contract tests read `.status` off a row that
 * has no such key and compared `undefined` against a real value; and the generator's own
 * `siteStatus` table had gone six features stale, so re-running it would have quietly reverted
 * responsive-sizing, guided-forms, built-in-authenticator, context-menu-shortcuts,
 * long-operation-progress and in-context-recovery to `absent` -- each of them days after its own
 * pass had written a note into the registry describing what it had built.
 *
 * Every assertion below is one of the four things that were true at once, so none of them can
 * come back alone. The desktop half has had `schema-v2-registry-parity.test.mjs` for exactly this
 * purpose; the site half had nothing.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const consoleRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const repoRoot = resolve(consoleRoot, '..');
const read = (relative) => {
  try {
    return JSON.parse(readFileSync(resolve(repoRoot, relative), 'utf8'));
  } catch {
    return JSON.parse(execFileSync('git', ['show', `HEAD:${relative}`], { cwd: repoRoot, encoding: 'utf8' }));
  }
};

const trackedBytes = (relative) => existsSync(resolve(repoRoot, relative))
  ? readFileSync(resolve(repoRoot, relative))
  : execFileSync('git', ['show', `HEAD:${relative}`], { cwd: repoRoot });

const registry = read('console/site/feature-registry.json');
const matrix = read('console/inventories/surface-completeness.json');

/* Hand-written rather than derived from either artifact. A vocabulary read out of the file it
 * is meant to police would accept whatever that file happened to contain, which is how
 * `implemented` survived in twenty rows without anything objecting. */
const CANONICAL_STATUSES = ['absent', 'partial', 'implemented-unverified', 'verified'];
const SITE_SURFACES = ['site-index', 'site-product', 'site-documentation', 'site-downloads', 'site-status', 'site-settings'];

const siteSurfaces = (candidate) => candidate.surfaces.filter((surface) => surface.registry === 'site');

/** The whole contract, as one function, so a break fixture can run it against a mutated copy. */
function parity(candidateRegistry = registry, candidateMatrix = matrix) {
  assert.equal(candidateRegistry.schemaVersion, 2, 'the site registry must be schema v2, like the desktop one');
  assert.equal(candidateRegistry.surface, 'pages-site', 'site registry surface identifier drift');
  assert.equal(candidateRegistry.canonicalMatrix, 'console/inventories/surface-completeness.json',
    'the site registry no longer names the matrix it is meant to agree with');

  const ids = Object.keys(candidateRegistry.features);
  assert.equal(ids.length, 44, `expected 44 canonical features in the site registry, found ${ids.length}`);

  for (const id of ids) {
    const feature = candidateRegistry.features[id];
    assert.ok(CANONICAL_STATUSES.includes(feature.status),
      `${id}: status ${JSON.stringify(feature.status)} is not one of ${CANONICAL_STATUSES.join(', ')}`);
    assert.equal(feature.state, undefined,
      `${id}: the schema-v1 'state' key is back beside 'status', so two keys now claim to hold the same fact`);
    assert.equal(feature.files, undefined,
      `${id}: the schema-v1 'files' key is back beside 'implementation.paths'`);
    assert.ok(Array.isArray(feature.implementation?.paths), `${id}: implementation.paths is missing`);
    assert.ok(Array.isArray(feature.registration?.symbols), `${id}: registration.symbols is missing`);
    assert.equal(typeof feature.note, 'string', `${id}: the row carries no note`);
    assert.notEqual(feature.status, 'verified',
      `${id}: a registry row cannot claim verified on its own -- that needs an evidence row`);
  }

  /* The matrix carries one row per feature per site page, and every one of them has to say the
   * same thing the registry says. Six copies of a status is six chances for one to drift. */
  const surfaces = siteSurfaces(candidateMatrix);
  assert.deepEqual(surfaces.map((surface) => surface.id).slice().sort(), SITE_SURFACES.slice().sort(),
    'the set of site surfaces in the canonical matrix has changed');
  for (const surface of surfaces) {
    assert.equal(surface.rows.length, 44, `${surface.id}: expected 44 rows`);
    for (const row of surface.rows) {
      const feature = candidateRegistry.features[row.featureId];
      assert.ok(feature, `${surface.id}.${row.featureId}: the registry has no such row`);
      assert.equal(row.status, feature.status,
        `${surface.id}.${row.featureId}: exact status drift between the matrix and the site registry`);
    }
  }
}

test('the site registry is schema v2, in the canonical vocabulary, and agrees with the canonical matrix', () => parity());

test('a schema-v1 status vocabulary turns it red', () => {
  const candidate = structuredClone(registry);
  candidate.features.narration.status = 'implemented';
  assert.throws(() => parity(candidate), /is not one of/u);
});

test('a schema-v1 "state" key reappearing beside "status" turns it red', () => {
  const candidate = structuredClone(registry);
  candidate.features.narration.state = 'implemented';
  assert.throws(() => parity(candidate), /schema-v1 'state' key is back/u);
});

test('a status that drifts from the matrix turns it red', () => {
  const candidate = structuredClone(registry);
  candidate.features['in-context-recovery'].status = 'absent';
  assert.throws(() => parity(candidate), /exact status drift/u);
});

test('a matrix row that drifts from the registry turns it red', () => {
  const candidate = structuredClone(matrix);
  siteSurfaces(candidate)[0].rows[0].status = 'verified';
  assert.throws(() => parity(registry, candidate), /exact status drift/u);
});

test('a whole registry row disappearing turns it red', () => {
  const candidate = structuredClone(registry);
  delete candidate.features['scheduled-settings'];
  assert.throws(() => parity(candidate), /expected 44 canonical features/u);
});

test('a registry row claiming verified on its own turns it red', () => {
  const candidate = structuredClone(registry);
  candidate.features.narration.status = 'verified';
  const surfaces = structuredClone(matrix);
  for (const surface of siteSurfaces(surfaces)) {
    for (const row of surface.rows) if (row.featureId === 'narration') row.status = 'verified';
  }
  assert.throws(() => parity(candidate, surfaces), /cannot claim verified/u);
});

test('the schema version being rolled back turns it red', () => {
  const candidate = structuredClone(registry);
  candidate.schemaVersion = 1;
  assert.throws(() => parity(candidate), /schema v2/u);
});

/**
 * The producer half. `--check` re-derives both artifacts and compares; without it the generator
 * is a producer nobody re-runs, and the stale table inside it stays invisible until somebody
 * runs it and reads a three-thousand-line diff. That is exactly what happened.
 */
test('a fresh generator run reproduces the committed registry and the committed matrix', () => {
  const output = execFileSync(process.execPath, ['scripts/generate-completeness-matrix.mjs', '--check'],
    { cwd: consoleRoot, encoding: 'utf8' });
  assert.match(output, /^PASS: the canonical matrix and both feature registries match a fresh generator run\./mu,
    'the generator no longer reproduces what is committed, so one of the two has drifted');
});

test('that generator --check is capable of failing at all, proved against a copy with one byte changed', () => {
  /* The assertion above reads a PASS line, and a `--check` neutered into always agreeing prints
   * exactly the same PASS line. Two deliberate breaks in
   * scripts/negative-site-registry-parity.mjs did precisely that and stayed green, so the check
   * on its own proved nothing about the check.
   *
   * This copies the three generated artifacts into a scratch tree, drifts one of them, and
   * requires `--check --root=<copy>` to fail and to name the file. Nothing tracked is touched. */
  const scratch = mkdtempSync(join(tmpdir(), 'site-registry-parity-'));
  try {
    const artifacts = [
      'console/site/feature-registry.json',
      'console/app/feature-registry.json',
      'console/inventories/surface-completeness.json',
    ];
    for (const relative of artifacts) {
      mkdirSync(resolve(scratch, dirname(relative)), { recursive: true });
      writeFileSync(resolve(scratch, relative), trackedBytes(relative));
    }

    const check = () => {
      try {
        return { code: 0, output: execFileSync(process.execPath,
          ['scripts/generate-completeness-matrix.mjs', '--check', `--root=${scratch}`],
          { cwd: consoleRoot, encoding: 'utf8' }) };
      } catch (error) {
        return { code: error.status ?? 1, output: `${error.stdout ?? ''}${error.stderr ?? ''}` };
      }
    };

    const clean = check();
    assert.equal(clean.code, 0, `the untouched copy already reports drift, so the drift below would prove nothing: ${clean.output}`);

    const drifted = resolve(scratch, 'console/site/feature-registry.json');
    const before = readFileSync(drifted, 'utf8');
    const after = before.replace('"status": "implemented-unverified"', '"status": "absent"');
    assert.notEqual(after, before, 'the drift was never planted, so this assertion would pass vacuously');
    writeFileSync(drifted, after);

    const result = check();
    assert.notEqual(result.code, 0, 'generator --check reported success against a copy it had just been shown to disagree with');
    assert.match(result.output, /console\/site\/feature-registry\.json/u,
      'generator --check failed without naming the artifact that drifted');
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test('the six site features this pass found stale are recorded as built, not absent', () => {
  /* Named individually rather than counted. A count passes when one row is wrong and another is
   * wrong the other way, and every one of these six had a real implementation and a real note in
   * the registry while the generator still called it absent. */
  for (const id of ['responsive-sizing', 'guided-forms', 'built-in-authenticator',
    'context-menu-shortcuts', 'long-operation-progress', 'in-context-recovery']) {
    assert.notEqual(registry.features[id].status, 'absent',
      `${id}: the site has a real implementation and a note describing it, so 'absent' is not the honest status`);
  }
});
