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
    for (const which of ['reference', 'built']) {
      const dimensions = record.dimensions?.[which];
      if (!dimensions || dimensions.width !== tuple.width || dimensions.height !== tuple.height) {
        problems.push(`diff: '${result.id}' ${which} capture is ${dimensions?.width}x${dimensions?.height}, not the capture tuple's ${tuple.width}x${tuple.height}`);
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
