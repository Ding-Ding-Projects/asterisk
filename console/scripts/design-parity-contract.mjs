#!/usr/bin/env node
/**
 * Shared schema-v2 checks for deterministic design-parity evidence.
 *
 * The capture tuple is data, not prose. These helpers validate and compare the
 * structured values so a record cannot quietly move to another state, viewport,
 * scale, locale, or screen while retaining a plausible description.
 */

export const PARITY_EVIDENCE_SCHEMA_VERSION = 2;
export const REQUIRED_TUPLE_KEYS = Object.freeze(['state', 'theme', 'width', 'height', 'scale']);

const VALID_THEMES = new Set(['dark', 'light']);
const SHA256 = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/i;

export function normalizeCaptureTuple(value, label = 'capture tuple') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  const missing = REQUIRED_TUPLE_KEYS.filter((key) => !(key in value));
  if (missing.length > 0) throw new Error(`${label} is missing ${missing.join(', ')}`);
  if (typeof value.state !== 'string' || value.state.trim() === '') throw new Error(`${label}.state must be a non-empty string`);
  if (typeof value.theme !== 'string' || !VALID_THEMES.has(value.theme)) throw new Error(`${label}.theme must be dark or light`);
  for (const key of ['width', 'height', 'scale']) {
    if (typeof value[key] !== 'number' || !Number.isFinite(value[key]) || value[key] <= 0) {
      throw new Error(`${label}.${key} must be a positive finite number`);
    }
  }
  for (const key of ['locale', 'screen', 'fixtureRevision']) {
    if (key in value && (typeof value[key] !== 'string' || value[key].trim() === '')) {
      throw new Error(`${label}.${key} must be a non-empty string when present`);
    }
  }
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, value[key]]));
}

export function captureTuplesEqual(expected, actual, label = 'capture tuple') {
  const left = normalizeCaptureTuple(expected, `${label} expected`);
  const right = normalizeCaptureTuple(actual, `${label} actual`);
  const leftText = JSON.stringify(left);
  const rightText = JSON.stringify(right);
  if (leftText !== rightText) {
    throw new Error(`${label} mismatch: expected ${leftText}, received ${rightText}`);
  }
  return true;
}

export function strictParityEvidence(inventory) {
  return inventory?.schemaVersion >= PARITY_EVIDENCE_SCHEMA_VERSION
    || inventory?.captureContract?.evidenceSchemaVersion >= PARITY_EVIDENCE_SCHEMA_VERSION
    || inventory?.captureContract?.strictEvidence === true;
}

export function expectedSourceCommit(inventory) {
  const value = inventory?.captureContract?.sourceCommit ?? inventory?.sourceCommit;
  if (value == null) return null;
  if (typeof value !== 'string' || !SHA256.test(value)) {
    throw new Error(`design-parity sourceCommit must be a 40 or 64 character hexadecimal SHA, got '${value}'`);
  }
  return value.toLowerCase();
}

export function validateEvidenceProvenance(record, expectedTuple, expectedCommit, label) {
  captureTuplesEqual(expectedTuple, record?.tuple, `${label} tuple`);
  if (typeof record?.sourceCommit !== 'string' || !SHA256.test(record.sourceCommit)) {
    throw new Error(`${label} sourceCommit must be a 64-character hexadecimal SHA`);
  }
  if (expectedCommit && record.sourceCommit.toLowerCase() !== expectedCommit) {
    throw new Error(`${label} sourceCommit '${record.sourceCommit}' does not match candidate '${expectedCommit}'`);
  }
  if (typeof record?.generatedBy !== 'string' || record.generatedBy.trim() === '') {
    throw new Error(`${label} generatedBy provenance is missing`);
  }
}

export function validateTransientStateCoverage(inventory, manifest) {
  const families = inventory?.captureContract?.transientStateFamilies ?? inventory?.transientStateFamilies;
  if (!Array.isArray(families) || families.length === 0) {
    throw new Error('design-parity transientStateFamilies must be a non-empty hand-written list');
  }
  const entries = Array.isArray(manifest?.destinations) ? manifest.destinations : [];
  const states = new Set(entries.map((entry) => entry.state).filter((state) => typeof state === 'string'));
  const missing = families.filter((family) => !states.has(family));
  if (missing.length > 0) throw new Error(`design-parity manifest is missing transient state families: ${missing.join(', ')}`);
  return { families: families.length, covered: families.filter((family) => states.has(family)).length };
}
