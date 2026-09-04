#!/usr/bin/env node
/**
 * Proves the committed design-parity captures are the ones the run ledgers claim.
 *
 * design-parity-evidence-on-disk.mjs guards a `verified` ROW: it only looks at destinations
 * the inventory already claims are verified, so while every row is still `compiled` it checks
 * nothing at all. That is correct for what it guards and useless for what is now on disk —
 * ninety-odd real PNGs and thirty-two diff records that no test has an opinion about. A guard
 * that only inspects rows already claiming success cannot notice a capture that was deleted,
 * replaced, or taken from a different screen.
 *
 * So this checks the run ledgers against the filesystem, in both directions:
 *   - every audited destination appears exactly once in each side's ledger;
 *   - every capture the ledger says it took exists, with the exact byte count and sha256 it
 *     recorded — a replaced or re-cropped PNG is a different capture and says so;
 *   - every capture the ledger says it did NOT take is genuinely absent, with a stated reason,
 *     so a stale file from an earlier run cannot sit there looking like evidence;
 *   - every diff record names its own destination, at the capture tuple's dimensions, with its
 *     side-by-side comparison present.
 *
 * It deliberately does NOT require a `match` verdict. Whether the built application should be
 * pixel-identical to the design is a question about the product, answered in the inventory;
 * this only refuses evidence that is missing, stale, or about something else.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  captureTuplesEqual,
  expectedSourceCommit,
  strictParityEvidence,
  validateEvidenceProvenance,
  validateTransientStateCoverage,
} from './design-parity-contract.mjs';

const sha256Of = (bytes) => createHash('sha256').update(bytes).digest('hex');
const rectKey = (rect) => `${rect?.x},${rect?.y},${rect?.width},${rect?.height}`;
function validRectangle(rect, tuple) {
  return Number.isInteger(rect?.x) && Number.isInteger(rect?.y)
    && Number.isInteger(rect?.width) && Number.isInteger(rect?.height)
    && rect.width > 0 && rect.height > 0
    && rect.x >= 0 && rect.y >= 0
    && rect.x + rect.width <= tuple.width
    && rect.y + rect.height <= tuple.height;
}

export function verifyCapturedParityEvidence({
  root, manifest, inventory, reference, built, diff, exists = existsSync, read = readFileSync,
}) {
  if (typeof root !== 'string' || root.length === 0) throw new Error('verifyCapturedParityEvidence requires an absolute repository root');
  const problems = [];
  const ids = manifest.destinations.map((entry) => entry.id);
  const pathFor = (key, id) => resolve(root, inventory.evidenceTemplates[key].replaceAll('{id}', id));
  const strict = strictParityEvidence(inventory);
  const tuple = inventory.captureContract?.captureTuple;
  const expectedCommit = strict ? expectedSourceCommit(inventory) : null;
  const entryById = new Map();
  const requiredManifestPaths = ['referenceCapture', 'builtCapture', 'sideBySide', 'visualDiff', 'regionLedger', 'chromeParity', 'materialAudit'];
  const manifestPathOwners = new Map();
  for (const entry of manifest.destinations ?? []) {
    if (entryById.has(entry.id)) problems.push(`manifest: '${entry.id}' appears more than once`);
    entryById.set(entry.id, entry);
    for (const key of requiredManifestPaths) {
      if (typeof entry[key] !== 'string' || entry[key].length === 0 || entry[key].includes('{id}')) {
        problems.push(`manifest: '${entry.id}' ${key} path is missing or unresolved`);
      } else if (key === 'regionLedger' || key === 'chromeParity') {
        const ownerKey = `${key}:${entry[key]}`;
        const owner = manifestPathOwners.get(ownerKey);
        if (owner) problems.push(`manifest: ${key} path '${entry[key]}' is reused by '${owner}' and '${entry.id}'`);
        else manifestPathOwners.set(ownerKey, entry.id);
      }
    }
  }
  if (strict) {
    try { captureTuplesEqual(tuple, tuple, 'inventory capture tuple'); }
    catch (error) { problems.push(error.message); }
    try { validateTransientStateCoverage(inventory, manifest); }
    catch (error) { problems.push(error.message); }
  }

  for (const [side, ledger] of [['reference', reference], ['built', built], ['diff', diff]]) {
    if (!strict) continue;
    try { validateEvidenceProvenance(ledger, tuple, expectedCommit, `${side} run ledger`); }
    catch (error) { problems.push(error.message); }
  }

  const checkSide = (side, ledger, artifactKey) => {
    const seen = new Map();
    for (const result of ledger.results ?? []) {
      if (seen.has(result.id)) problems.push(`${side}: '${result.id}' appears more than once in the ledger`);
      seen.set(result.id, result);
    }
    for (const id of ids) {
      const result = seen.get(id);
      if (!result) { problems.push(`${side}: audited destination '${id}' is absent from the run ledger`); continue; }
      const path = pathFor(artifactKey, id);
      if (result.captured) {
        if (!exists(path)) { problems.push(`${side}: '${id}' is recorded as captured but ${artifactKey} is absent`); continue; }
        const bytes = read(path);
        if (bytes.length !== result.bytes) problems.push(`${side}: '${id}' ${artifactKey} is ${bytes.length} bytes, the ledger recorded ${result.bytes}`);
        if (sha256Of(bytes) !== result.sha256) problems.push(`${side}: '${id}' ${artifactKey} does not match the sha256 the ledger recorded — this is a different capture`);
      } else {
        if (!result.reason) problems.push(`${side}: '${id}' was not captured and the ledger gives no reason`);
        if (exists(path)) problems.push(`${side}: '${id}' was not captured, yet ${artifactKey} exists — a stale file from an earlier run reads as evidence`);
      }
    }
    for (const id of seen.keys()) {
      if (!ids.includes(id)) problems.push(`${side}: ledger carries '${id}', which is not one of the ${ids.length} audited destinations`);
    }
  };

  checkSide('reference', reference, 'referenceCapture');
  checkSide('built', built, 'builtCapture');

  const diffSeen = new Map();
  for (const result of diff.results ?? []) {
    if (diffSeen.has(result.id)) problems.push(`diff: '${result.id}' appears more than once in the ledger`);
    diffSeen.set(result.id, result);
  }
  for (const id of ids) {
    if (!diffSeen.has(id)) problems.push(`diff: audited destination '${id}' is absent from the run ledger`);
  }
  for (const id of diffSeen.keys()) {
    if (!ids.includes(id)) problems.push(`diff: ledger carries '${id}', which is not one of the ${ids.length} audited destinations`);
  }
  if (diff.results?.length !== ids.length) {
    problems.push(`diff: ledger has ${diff.results?.length ?? 0} result(s), expected exactly ${ids.length}`);
  }

  for (const result of diff.results ?? []) {
    if (!ids.includes(result.id)) { problems.push(`diff: ledger carries '${result.id}', which is not an audited destination`); continue; }
    if (result.skipped) continue;
    const diffPath = pathFor('visualDiff', result.id);
    const sidePath = pathFor('sideBySide', result.id);
    if (!exists(diffPath)) { problems.push(`diff: '${result.id}' has no visualDiff record`); continue; }
    if (!exists(sidePath)) problems.push(`diff: '${result.id}' has no side-by-side comparison image`);
    let record;
    try { record = JSON.parse(read(diffPath, "utf8")); } catch (error) { problems.push(`diff: '${result.id}' record is not valid JSON (${error.message})`); continue; }
    if (record.destinationId !== result.id) problems.push(`diff: the record at ${result.id} names destination '${record.destinationId}' — this is evidence for a different row`);
    if (record.verdict !== result.verdict) problems.push(`diff: '${result.id}' record says '${record.verdict}' while the ledger says '${result.verdict}'`);
    const entry = entryById.get(result.id);
    if (typeof record.generatedBy !== 'string' || record.generatedBy.trim() === '') problems.push(`diff: '${result.id}' generator provenance is missing`);
    if (strict) {
      try { validateEvidenceProvenance(record, tuple, expectedCommit, `diff ${result.id}`); }
      catch (error) { problems.push(error.message); }
    } else {
      try { captureTuplesEqual(tuple, record.tuple, `diff ${result.id} tuple`); }
      catch (error) { problems.push(error.message); }
    }
    if (record.referenceCapture !== entry.referenceCapture) problems.push(`diff: '${result.id}' references '${record.referenceCapture}', not the manifest reference capture`);
    if (record.builtCapture !== entry.builtCapture) problems.push(`diff: '${result.id}' references '${record.builtCapture}', not the manifest built capture`);
    for (const [key, artifactKey] of [['referenceCaptureSha256', 'referenceCapture'], ['builtCaptureSha256', 'builtCapture']]) {
      const expectedHash = record[key];
      if (strict && !/^[0-9a-f]{64}$/i.test(String(expectedHash ?? ''))) {
        problems.push(`diff: '${result.id}' ${key} is missing or not a SHA-256 digest`);
      } else if (expectedHash) {
        const rawPath = pathFor(artifactKey, result.id);
        try {
          if (sha256Of(read(rawPath)) !== String(expectedHash).toLowerCase()) problems.push(`diff: '${result.id}' ${key} does not match ${artifactKey}`);
        } catch (error) { problems.push(`diff: '${result.id}' cannot read ${artifactKey} for hash validation (${error.message})`); }
      }
    }
    for (const which of ['reference', 'built']) {
      const dimensions = record.dimensions?.[which];
      if (!dimensions || dimensions.width !== tuple.width || dimensions.height !== tuple.height) {
        problems.push(`diff: '${result.id}' ${which} capture is ${dimensions?.width}x${dimensions?.height}, not the capture tuple's ${tuple.width}x${tuple.height}`);
      }
    }
  }

  for (const id of ids) {
    const entry = entryById.get(id);
    for (const [kind, manifestKey, bar] of [['region', 'regionLedger', 'chrome-parity'], ['chrome', 'chromeParity', 'chrome-parity']]) {
      const path = resolve(root, entry[manifestKey]);
      if (!exists(path)) { problems.push(`${kind}: '${id}' record is absent at ${entry[manifestKey]}`); continue; }
      let record;
      try { record = JSON.parse(read(path, 'utf8')); }
      catch (error) { problems.push(`${kind}: '${id}' record is not valid JSON (${error.message})`); continue; }
      if (record.destinationId !== id) problems.push(`${kind}: '${id}' record names destination '${record.destinationId}'`);
      if (record.bar !== bar) problems.push(`${kind}: '${id}' record has bar '${record.bar}', not '${bar}'`);
      try { captureTuplesEqual(tuple, record.tuple, `${kind} ${id} tuple`); }
      catch (error) { problems.push(error.message); }
      if (strict) {
        try { validateEvidenceProvenance(record, tuple, expectedCommit, `${kind} ${id}`); }
        catch (error) { problems.push(error.message); }
      }
      if (typeof record.generatedBy !== 'string' || record.generatedBy.trim() === '') problems.push(`${kind}: '${id}' generator provenance is missing`);
      if (kind === 'region') {
        if (!Array.isArray(record.exclusions) || record.exclusions.length === 0) problems.push(`${kind}: '${id}' record has no measured exclusions`);
        for (const rectangle of record.exclusions ?? []) {
          if (!validRectangle(rectangle, tuple)) problems.push(`${kind}: '${id}' has an invalid or out-of-viewport exclusion rectangle`);
        }
      }
      if (kind !== 'chrome') continue;
      if (!Array.isArray(record.excluded?.rectangles) || record.excluded.rectangles.length === 0) problems.push(`chrome: '${id}' record has no applied exclusion rectangles`);
      for (const rectangle of record.excluded?.rectangles ?? []) {
        if (!validRectangle(rectangle, tuple)) problems.push(`chrome: '${id}' has an invalid or out-of-viewport applied exclusion rectangle`);
      }
      for (const which of ['reference', 'built']) {
        const dimensions = record.dimensions?.[which];
        if (!dimensions || dimensions.width !== tuple.width || dimensions.height !== tuple.height) {
          problems.push(`chrome: '${id}' ${which} dimensions do not match the capture tuple`);
        }
      }
      if (typeof record.comparedFraction !== 'number' || record.comparedFraction <= 0 || record.comparedFraction > 1) problems.push(`chrome: '${id}' comparedFraction is missing or outside (0,1]`);
      if (record.stalenessCheck?.checked !== true || record.stalenessCheck?.stale !== false) problems.push(`chrome: '${id}' staleness check is missing or did not pass`);
      if (record.regionLedger !== entry.regionLedger) problems.push(`chrome: '${id}' references '${record.regionLedger}', not the manifest region ledger`);
      if (record.referenceCapture !== entry.referenceCapture) problems.push(`chrome: '${id}' references '${record.referenceCapture}', not the manifest reference capture`);
      if (record.builtCapture !== entry.builtCapture) problems.push(`chrome: '${id}' references '${record.builtCapture}', not the manifest built capture`);
      const ledgerPath = resolve(root, entry.regionLedger);
      let ledger;
      try { ledger = JSON.parse(read(ledgerPath, 'utf8')); }
      catch (error) { problems.push(`chrome: '${id}' cannot read its region ledger (${error.message})`); continue; }
      const applied = (record.excluded?.rectangles ?? []).map(rectKey).sort().join(' | ');
      const measured = (ledger.exclusions ?? []).map(rectKey).sort().join(' | ');
      if (applied !== measured) problems.push(`chrome: '${id}' excluded rectangles differ from its region ledger`);
      for (const [key, artifactKey] of [['referenceCaptureSha256', 'referenceCapture'], ['builtCaptureSha256', 'builtCapture']]) {
        const expectedHash = record[key];
        if (strict && !/^[0-9a-f]{64}$/i.test(String(expectedHash ?? ''))) {
          problems.push(`chrome: '${id}' ${key} is missing or not a SHA-256 digest`);
        } else if (expectedHash) {
          const rawPath = pathFor(artifactKey, id);
          try {
            if (sha256Of(read(rawPath)) !== String(expectedHash).toLowerCase()) problems.push(`chrome: '${id}' ${key} does not match ${artifactKey}`);
          } catch (error) { problems.push(`chrome: '${id}' cannot read ${artifactKey} for hash validation (${error.message})`); }
        }
      }
    }
  }

  if (problems.length > 0) {
    const shown = problems.slice(0, 12).join('\n  - ');
    const more = problems.length > 12 ? `\n  - ...and ${problems.length - 12} more` : '';
    throw new Error(`${problems.length} design-parity capture problem(s):\n  - ${shown}${more}`);
  }
  return {
    destinations: ids.length,
    referenceCaptures: (reference.results ?? []).filter((r) => r.captured).length,
    builtCaptures: (built.results ?? []).filter((r) => r.captured).length,
    diffRecords: (diff.results ?? []).filter((r) => !r.skipped).length,
  };
}

/** Reads the four committed files this guard compares, from a repository root. */
export function loadParityEvidence(root) {
  const read = (relative) => JSON.parse(readFileSync(resolve(root, relative), 'utf8'));
  return {
    root,
    manifest: read('console/design-reference/capture-manifest.generated.json'),
    inventory: read('console/inventories/design-parity.json'),
    reference: read('console/release/evidence/parity/run-reference.json'),
    built: read('console/release/evidence/parity/run-built.json'),
    diff: read('console/release/evidence/parity/run-diff.json'),
  };
}

// pathToFileURL, not a hand-built `file://` + slash swap: on Windows the hand-built form does
// not equal import.meta.url, so the guard never matches and the script silently does nothing —
// which reads exactly like a clean pass.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = resolve(import.meta.dirname, '..', '..');
  const summary = verifyCapturedParityEvidence(loadParityEvidence(root));
  console.log(`PASS: ${summary.referenceCaptures} reference and ${summary.builtCaptures} built captures across ${summary.destinations} destinations, with ${summary.diffRecords} diff records, all match their run ledgers.`);
}
