// The testable half of the Asterisk WSL rootfs provenance contract.
//
// console/scripts/asterisk-wsl-rootfs-common.ps1 is the runtime implementation - it is
// what actually writes console/resources/asterisk-wsl-rootfs.json, and it needs Docker
// and a real Ubuntu container engine to exercise end to end, which this test suite does
// not have. What CAN be exercised without any of that is the *shape* of the contract:
// what a valid provenance record looks like, which of the two sources
// (build-asterisk-wsl-bundle.ps1 compiling, or build-asterisk-wsl-bundle-from-image.ps1
// pulling) a caller should pick, how an image reference is built, and what it means for
// an exported tar to disagree with the digest its own provenance claims for it.
//
// This module is the single written-down statement of that contract. The PowerShell
// implementation mirrors it (New-AsteriskRootfsProvenance, Resolve-AsteriskImageReference,
// Publish-AsteriskRuntimeImage in asterisk-wsl-rootfs-common.ps1); this file is what the
// automated suite can actually run.

export const PROVENANCE_SCHEMA_VERSION = 2;

export const REQUIRED_PROVENANCE_FIELDS = Object.freeze([
  'schemaVersion',
  'sourceCommit',
  'baseImage',
  'baseDigest',
  'runtime',
  'sha256',
  'bytes',
  'generatedAt',
  'contents',
  'sourceMethod',
  'imageRef',
  'imageDigest',
]);

const COMMIT_RE = /^[0-9a-f]{40}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const DIGEST_RE = /^sha256:[0-9a-f]{64}$/;
const SOURCE_METHODS = new Set(['compiled', 'pulled']);

/**
 * Validate an Asterisk WSL rootfs provenance record.
 *
 * Returns { ok: true } or { ok: false, errors: string[] }. Never throws on a malformed
 * record - the record itself is untrusted input (it was written by a script, possibly
 * an old one, possibly a partially-written one) and the caller decides what to do with
 * a bad shape.
 */
export function validateProvenance(record) {
  const errors = [];
  if (record === null || typeof record !== 'object' || Array.isArray(record)) {
    return { ok: false, errors: ['provenance must be a JSON object'] };
  }

  for (const field of REQUIRED_PROVENANCE_FIELDS) {
    if (!(field in record)) errors.push(`missing required field: ${field}`);
  }
  if (errors.length > 0) return { ok: false, errors };

  if (record.schemaVersion !== PROVENANCE_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${PROVENANCE_SCHEMA_VERSION}, got ${JSON.stringify(record.schemaVersion)}`);
  }
  if (typeof record.sourceCommit !== 'string' || !COMMIT_RE.test(record.sourceCommit)) {
    errors.push('sourceCommit must be a full 40-character lowercase hex commit SHA');
  }
  if (typeof record.baseImage !== 'string' || record.baseImage.length === 0) {
    errors.push('baseImage must be a non-empty string');
  }
  if (typeof record.baseDigest !== 'string' || !DIGEST_RE.test(record.baseDigest)) {
    errors.push('baseDigest must match sha256:<64 hex characters>');
  }
  if (typeof record.runtime !== 'string' || record.runtime.length === 0) {
    errors.push('runtime must be a non-empty string');
  }
  if (typeof record.sha256 !== 'string' || !SHA256_RE.test(record.sha256)) {
    errors.push('sha256 must be exactly 64 lowercase hex characters');
  }
  if (!Number.isInteger(record.bytes) || record.bytes <= 0) {
    errors.push('bytes must be a positive integer');
  }
  if (typeof record.generatedAt !== 'string' || Number.isNaN(Date.parse(record.generatedAt))) {
    errors.push('generatedAt must be a parseable ISO-8601 timestamp');
  }
  if (!Array.isArray(record.contents) || record.contents.length === 0 || record.contents.some((c) => typeof c !== 'string' || c.length === 0)) {
    errors.push('contents must be a non-empty array of non-empty strings');
  }
  if (typeof record.sourceMethod !== 'string' || !SOURCE_METHODS.has(record.sourceMethod)) {
    errors.push(`sourceMethod must be one of: ${[...SOURCE_METHODS].join(', ')}`);
  }

  const hasRef = record.imageRef !== null && record.imageRef !== undefined;
  const hasDigest = record.imageDigest !== null && record.imageDigest !== undefined;
  if (hasRef !== hasDigest) {
    errors.push('imageRef and imageDigest must be recorded together, or both be null');
  }
  if (hasRef && (typeof record.imageRef !== 'string' || record.imageRef.length === 0 || record.imageRef !== record.imageRef.toLowerCase())) {
    errors.push('imageRef must be a non-empty, all-lowercase string when present');
  }
  if (hasDigest && (typeof record.imageDigest !== 'string' || !DIGEST_RE.test(record.imageDigest))) {
    errors.push('imageDigest must match sha256:<64 hex characters> when present');
  }
  if (hasRef && typeof record.sourceCommit === 'string' && typeof record.imageRef === 'string' && !record.imageRef.endsWith(`:${record.sourceCommit}`)) {
    errors.push('imageRef must be tagged with the exact sourceCommit');
  }
  if (record.sourceMethod === 'pulled' && !hasDigest) {
    errors.push("a 'pulled' record must carry an imageDigest; a pull with nothing to point at proves nothing");
  }

  return errors.length === 0 ? { ok: true, errors: [] } : { ok: false, errors };
}

/**
 * The fallback-selection contract: prefer the pulled image, fall back to compiling only
 * when the pull did not produce a usable, digest-resolved image. This is the same
 * decision build-asterisk-wsl-bundle-from-image.ps1 makes; it is written here as a pure
 * function so the decision itself - not the Docker calls around it - can be asserted on.
 */
export function selectRuntimeSource({ pulled, imageDigest }) {
  if (pulled && typeof imageDigest === 'string' && DIGEST_RE.test(imageDigest)) return 'pulled';
  return 'compiled';
}

/**
 * Refuse an exported tar whose measured digest disagrees with what its own provenance
 * claims. Throws with both digests in the message; never silently accepts a mismatch.
 */
export function verifyExportedTarDigest({ actualSha256, provenance }) {
  if (typeof actualSha256 !== 'string' || !SHA256_RE.test(actualSha256)) {
    throw new Error(`actualSha256 must be exactly 64 lowercase hex characters, got ${JSON.stringify(actualSha256)}`);
  }
  const expected = provenance && provenance.sha256;
  if (expected !== actualSha256) {
    throw new Error(`exported rootfs tar does not match its provenance: provenance says sha256:${expected}, the exported file is sha256:${actualSha256}`);
  }
  return true;
}

/** Build the lowercase, digest-pinnable image reference for one exact source commit. */
export function buildImageReference({ registry, owner, sourceCommit }) {
  if (typeof sourceCommit !== 'string' || !COMMIT_RE.test(sourceCommit)) {
    throw new Error(`buildImageReference requires a full 40-character commit SHA, got ${JSON.stringify(sourceCommit)}`);
  }
  if (typeof owner !== 'string' || owner.length === 0) {
    throw new Error('buildImageReference requires a non-empty owner');
  }
  if (typeof registry !== 'string' || registry.length === 0) {
    throw new Error('buildImageReference requires a non-empty registry host');
  }
  return `${registry.toLowerCase()}/${owner.toLowerCase()}/asterisk-runtime:${sourceCommit}`;
}

/** Normalize a digest value to the canonical `sha256:<64 hex>` form. */
export function normalizeDigest(digest) {
  if (typeof digest !== 'string') throw new Error('normalizeDigest requires a string');
  const value = digest.startsWith('sha256:') ? digest : `sha256:${digest}`;
  if (!DIGEST_RE.test(value)) throw new Error(`not a valid sha256 digest: ${JSON.stringify(digest)}`);
  return value;
}

// --- optional CLI: `node asterisk-runtime-provenance.mjs validate <path>` ------------
//
// Neither PowerShell producer calls this - they write the file directly via
// New-AsteriskRootfsProvenance and are the actual source of truth for the shape. This
// is a standalone, human- or CI-invokable check of a real, already-written
// asterisk-wsl-rootfs.json against the same contract the tests above exercise, useful
// after a real build (local or CI) to confirm the file on disk actually matches the
// contract rather than only the fixtures in the test file matching it.
//
// A plain `import.meta.url === 'file://' + process.argv[1]` string comparison looks
// right and is wrong on Windows: import.meta.url is a proper file:// URL
// (file:///C:/path/with/forward/slashes), while process.argv[1] is a raw OS path
// (C:\path\with\backslashes) - the two can never be equal by concatenation, so the
// guard below would silently never fire and this whole CLI would silently never run.
// url.pathToFileURL() does the real conversion on every platform.
const isDirectlyExecuted = process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href;
if (isDirectlyExecuted) {
  const [, , command, path] = process.argv;
  if (command !== 'validate' || !path) {
    console.error('usage: node asterisk-runtime-provenance.mjs validate <path-to-asterisk-wsl-rootfs.json>');
    process.exit(2);
  }
  const { readFileSync } = await import('node:fs');
  let record;
  try {
    record = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    console.error(`could not read or parse ${path}: ${error.message}`);
    process.exit(2);
  }
  const result = validateProvenance(record);
  if (result.ok) {
    console.log(`${path} is a valid provenance record (sourceMethod: ${record.sourceMethod}, imageDigest: ${record.imageDigest ?? 'none'}).`);
    process.exit(0);
  }
  console.error(`${path} is not a valid provenance record:`);
  for (const error of result.errors) console.error(`  - ${error}`);
  process.exit(1);
}
