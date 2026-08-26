import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  PROVENANCE_SCHEMA_VERSION,
  REQUIRED_PROVENANCE_FIELDS,
  validateProvenance,
  selectRuntimeSource,
  verifyExportedTarDigest,
  buildImageReference,
  normalizeDigest,
} from '../../scripts/asterisk-runtime-provenance.mjs';

const COMMIT = 'a'.repeat(40);
const TAR_SHA = 'b'.repeat(64);
const BASE_DIGEST = `sha256:${'c'.repeat(64)}`;
const IMAGE_DIGEST = `sha256:${'d'.repeat(64)}`;

function compiledUnpublished(overrides = {}) {
  return {
    schemaVersion: PROVENANCE_SCHEMA_VERSION,
    sourceCommit: COMMIT,
    baseImage: 'ubuntu:24.04',
    baseDigest: BASE_DIGEST,
    runtime: 'wsl2-linux-amd64',
    sha256: TAR_SHA,
    bytes: 315491328,
    generatedAt: '2026-08-25T00:00:00.000Z',
    contents: ['complete Ubuntu root filesystem'],
    sourceMethod: 'compiled',
    imageRef: null,
    imageDigest: null,
    ...overrides,
  };
}

function pulled(overrides = {}) {
  return compiledUnpublished({
    sourceMethod: 'pulled',
    imageRef: `ghcr.io/ding-ding-projects/asterisk-runtime:${COMMIT}`,
    imageDigest: IMAGE_DIGEST,
    ...overrides,
  });
}

function compiledPublished(overrides = {}) {
  return pulled({ sourceMethod: 'compiled', ...overrides });
}

// --- shape: required fields --------------------------------------------------------

test('every field this module treats as required is actually required', () => {
  assert.deepEqual(REQUIRED_PROVENANCE_FIELDS.length, new Set(REQUIRED_PROVENANCE_FIELDS).size, 'no duplicate field names');
  for (const field of REQUIRED_PROVENANCE_FIELDS) {
    const record = compiledUnpublished();
    delete record[field];
    const result = validateProvenance(record);
    assert.equal(result.ok, false, `dropping "${field}" must fail validation`);
    assert.ok(result.errors.some((e) => e.includes(field)), `the error for a missing "${field}" must name it: ${result.errors.join('; ')}`);
  }
});

test('a well-formed compiled-and-unpublished record is valid', () => {
  const result = validateProvenance(compiledUnpublished());
  assert.deepEqual(result, { ok: true, errors: [] });
});

test('a well-formed compiled-and-published record is valid', () => {
  const result = validateProvenance(compiledPublished());
  assert.equal(result.ok, true, result.errors?.join('; '));
});

test('a well-formed pulled record is valid', () => {
  const result = validateProvenance(pulled());
  assert.equal(result.ok, true, result.errors?.join('; '));
});

// --- shape: field content, not just presence ---------------------------------------

test('sourceCommit must be a full lowercase 40-character SHA', () => {
  for (const bad of ['A'.repeat(40), 'a'.repeat(39), 'a'.repeat(41), 'not-a-sha', '']) {
    const result = validateProvenance(compiledUnpublished({ sourceCommit: bad }));
    assert.equal(result.ok, false, `sourceCommit ${JSON.stringify(bad)} must be rejected`);
  }
});

test('schemaVersion must equal the current version, not merely be a number', () => {
  const result = validateProvenance(compiledUnpublished({ schemaVersion: 1 }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('schemaVersion')));
});

test('sha256 must be exactly 64 lowercase hex characters', () => {
  for (const bad of ['B'.repeat(64), 'b'.repeat(63), 'zz'.repeat(32)]) {
    assert.equal(validateProvenance(compiledUnpublished({ sha256: bad })).ok, false, bad);
  }
});

test('bytes must be a positive integer, not a float or zero', () => {
  for (const bad of [0, -1, 1.5, '1000']) {
    assert.equal(validateProvenance(compiledUnpublished({ bytes: bad })).ok, false, JSON.stringify(bad));
  }
});

test('generatedAt must parse as a real timestamp', () => {
  assert.equal(validateProvenance(compiledUnpublished({ generatedAt: 'not a date' })).ok, false);
});

test('contents must be a non-empty array of non-empty strings', () => {
  assert.equal(validateProvenance(compiledUnpublished({ contents: [] })).ok, false);
  assert.equal(validateProvenance(compiledUnpublished({ contents: [''] })).ok, false);
  assert.equal(validateProvenance(compiledUnpublished({ contents: 'not-an-array' })).ok, false);
});

test('sourceMethod must be "compiled" or "pulled", nothing else', () => {
  assert.equal(validateProvenance(compiledUnpublished({ sourceMethod: 'downloaded' })).ok, false);
  assert.equal(validateProvenance(compiledUnpublished({ sourceMethod: 'compiled' })).ok, true);
  assert.equal(validateProvenance(compiledUnpublished({ sourceMethod: 'pulled', imageRef: pulled().imageRef, imageDigest: IMAGE_DIGEST })).ok, true);
});

// --- the inconsistent-state guard: this is the one worth breaking on purpose -------

test('imageRef without imageDigest is rejected (partial publish state)', () => {
  const result = validateProvenance(compiledUnpublished({ imageRef: `ghcr.io/owner/asterisk-runtime:${COMMIT}` }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('together')));
});

test('imageDigest without imageRef is rejected (partial publish state)', () => {
  const result = validateProvenance(compiledUnpublished({ imageDigest: IMAGE_DIGEST }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('together')));
});

test('a "pulled" record with no image digest is rejected: a pull that points at nothing proves nothing', () => {
  const result = validateProvenance(compiledUnpublished({ sourceMethod: 'pulled' }));
  assert.equal(result.ok, false);
});

test('imageRef must be tagged with the exact sourceCommit, not some other tag', () => {
  const result = validateProvenance(pulled({ imageRef: 'ghcr.io/ding-ding-projects/asterisk-runtime:latest' }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('sourceCommit')));
});

test('imageRef must be lowercase (OCI registries reject mixed-case repository paths)', () => {
  const result = validateProvenance(pulled({ imageRef: `ghcr.io/Ding-Ding-Projects/asterisk-runtime:${COMMIT}` }));
  assert.equal(result.ok, false);
});

test('imageDigest must be a real sha256 digest, not a bare hex string', () => {
  const result = validateProvenance(pulled({ imageDigest: 'd'.repeat(64) }));
  assert.equal(result.ok, false);
});

// --- fallback selection --------------------------------------------------------------

test('selects the pulled image when the pull produced a real digest', () => {
  assert.equal(selectRuntimeSource({ pulled: true, imageDigest: IMAGE_DIGEST }), 'pulled');
});

test('falls back to compiling when nothing was pulled', () => {
  assert.equal(selectRuntimeSource({ pulled: false, imageDigest: null }), 'compiled');
});

test('falls back to compiling when the pull "succeeded" but no digest could be resolved', () => {
  // This is the case that actually matters: docker pull can exit 0 against a tag whose
  // digest we then fail to resolve (registry hiccup, malformed inspect output). Treat
  // that the same as no pull at all rather than trusting an unproven image.
  assert.equal(selectRuntimeSource({ pulled: true, imageDigest: null }), 'compiled');
  assert.equal(selectRuntimeSource({ pulled: true, imageDigest: 'not-a-digest' }), 'compiled');
});

// --- tar-digest verification: refuse a payload that disagrees with its own provenance --

test('accepts an exported tar whose measured digest matches its provenance', () => {
  assert.equal(verifyExportedTarDigest({ actualSha256: TAR_SHA, provenance: compiledUnpublished() }), true);
});

test('refuses an exported tar whose measured digest disagrees with its provenance', () => {
  const wrong = 'f'.repeat(64);
  assert.throws(
    () => verifyExportedTarDigest({ actualSha256: wrong, provenance: compiledUnpublished() }),
    /does not match its provenance/,
  );
  // Prove the check is meaningful in both directions: correcting the digest back to the
  // one the provenance actually claims must stop throwing.
  assert.doesNotThrow(() => verifyExportedTarDigest({ actualSha256: TAR_SHA, provenance: compiledUnpublished() }));
});

test('refuses a malformed actualSha256 outright rather than comparing it loosely', () => {
  assert.throws(() => verifyExportedTarDigest({ actualSha256: 'short', provenance: compiledUnpublished() }));
});

// --- image reference construction -----------------------------------------------------

test('builds the expected lowercase, commit-tagged image reference', () => {
  const ref = buildImageReference({ registry: 'ghcr.io', owner: 'Ding-Ding-Projects', sourceCommit: COMMIT });
  assert.equal(ref, `ghcr.io/ding-ding-projects/asterisk-runtime:${COMMIT}`);
});

test('rejects a short or invalid commit when building an image reference', () => {
  assert.throws(() => buildImageReference({ registry: 'ghcr.io', owner: 'owner', sourceCommit: 'deadbeef' }));
});

test('rejects an empty owner or registry when building an image reference', () => {
  assert.throws(() => buildImageReference({ registry: 'ghcr.io', owner: '', sourceCommit: COMMIT }));
  assert.throws(() => buildImageReference({ registry: '', owner: 'owner', sourceCommit: COMMIT }));
});

// --- digest normalization ---------------------------------------------------------------

test('normalizeDigest accepts a bare hex digest and adds the sha256: prefix', () => {
  assert.equal(normalizeDigest('e'.repeat(64)), `sha256:${'e'.repeat(64)}`);
});

test('normalizeDigest leaves an already-prefixed digest alone', () => {
  const value = `sha256:${'e'.repeat(64)}`;
  assert.equal(normalizeDigest(value), value);
});

test('normalizeDigest rejects a value that is not 64 hex characters either way', () => {
  assert.throws(() => normalizeDigest('sha256:tooshort'));
  assert.throws(() => normalizeDigest('g'.repeat(64)));
});
