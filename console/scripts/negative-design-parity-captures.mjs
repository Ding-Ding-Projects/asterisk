#!/usr/bin/env node
/**
 * Deliberate red-then-green proof for design-parity-captures-on-disk.mjs.
 *
 * A guard nobody has watched fail proves nothing, and this one guards a hundred committed
 * PNGs whose contents no reader will check by hand. So each lie below is planted on its own,
 * against the REAL committed ledgers, and must turn the guard red; the untouched evidence
 * must then turn it green. One lie at a time, because breaking three things and seeing one
 * failure proves only that something among them is watched.
 *
 * Nothing here writes to disk: the guard takes its own `exists`/`read` so a planted lie lives
 * entirely in memory and the committed evidence is never disturbed.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { verifyCapturedParityEvidence, loadParityEvidence } from './design-parity-captures-on-disk.mjs';

const root = resolve(import.meta.dirname, '..', '..');
const honest = loadParityEvidence(root);
const clone = (value) => JSON.parse(JSON.stringify(value));

function withEvidence(mutate) {
  const evidence = {
    root,
    manifest: clone(honest.manifest),
    inventory: clone(honest.inventory),
    reference: clone(honest.reference),
    built: clone(honest.built),
    diff: clone(honest.diff),
    exists: existsSync,
    read: readFileSync,
  };
  mutate(evidence);
  return evidence;
}

function overrideJson(evidence, relativePath, mutate) {
  const target = resolve(root, relativePath);
  const originalRead = evidence.read;
  evidence.read = (candidate, encoding) => {
    if (candidate !== target) return originalRead(candidate, encoding);
    return JSON.stringify(mutate(JSON.parse(readFileSync(candidate, 'utf8'))));
  };
}

const firstCaptured = (ledger) => ledger.results.find((result) => result.captured);
const makeRefused = (ledger) => {
  const result = firstCaptured(ledger);
  if (!result) throw new Error('negative-design-parity-captures: no captured result available for refused-capture fixture');
  result.captured = false;
  result.reason = 'fixture intentionally refused before capture';
  delete result.bytes;
  delete result.sha256;
  return result;
};

const cases = [
  ['a captured reference PNG has been deleted', (e) => {
    const target = firstCaptured(e.reference).id;
    const path = resolve(root, e.inventory.evidenceTemplates.referenceCapture.replaceAll('{id}', target));
    e.exists = (candidate) => (candidate === path ? false : existsSync(candidate));
  }],
  ['a captured built PNG has been replaced with different bytes', (e) => {
    const target = firstCaptured(e.built).id;
    const path = resolve(root, e.inventory.evidenceTemplates.builtCapture.replaceAll('{id}', target));
    e.read = (candidate, encoding) => (candidate === path ? Buffer.concat([readFileSync(candidate), Buffer.from('!')]) : readFileSync(candidate, encoding));
  }],
  ['a ledger claims a capture it never took', (e) => { firstCaptured(e.reference).sha256 = '0'.repeat(64); }],
  ['the diff ledger omits an audited destination', (e) => { e.diff.results.shift(); }],
  ['the diff ledger repeats an audited destination', (e) => { e.diff.results.push({ ...e.diff.results[0] }); }],
  ['the diff ledger carries an unknown destination', (e) => { e.diff.results.push({ id: 'not-audited', skipped: 'fixture' }); }],
  ['the diff ledger is empty', (e) => { e.diff.results = []; }],
  ['a region ledger is absent from the manifest path', (e) => {
    const path = resolve(root, e.manifest.destinations[0].regionLedger);
    e.exists = (candidate) => (candidate === path ? false : existsSync(candidate));
  }],
  ['a region ledger records a different destination', (e) => {
    const entry = e.manifest.destinations[0];
    overrideJson(e, entry.regionLedger, (record) => ({ ...record, destinationId: 'not-dash' }));
  }],
  ['a stale region ledger carries a different tuple', (e) => {
    const entry = e.manifest.destinations[0];
    overrideJson(e, entry.regionLedger, (record) => ({ ...record, tuple: { ...record.tuple, width: 1280 } }));
  }],
  ['two destinations reuse one region ledger record', (e) => {
    e.manifest.destinations[1].regionLedger = e.manifest.destinations[0].regionLedger;
  }],
  ['a chrome-parity record is absent from the manifest path', (e) => {
    const path = resolve(root, e.manifest.destinations[0].chromeParity);
    e.exists = (candidate) => (candidate === path ? false : existsSync(candidate));
  }],
  ['a chrome-parity record records a different destination', (e) => {
    const entry = e.manifest.destinations[0];
    overrideJson(e, entry.chromeParity, (record) => ({ ...record, destinationId: 'not-dash' }));
  }],
  ['a stale chrome-parity record carries a different tuple', (e) => {
    const entry = e.manifest.destinations[0];
    overrideJson(e, entry.chromeParity, (record) => ({ ...record, tuple: { ...record.tuple, scale: 1.5 } }));
  }],
  ['two destinations reuse one chrome-parity record', (e) => {
    e.manifest.destinations[1].chromeParity = e.manifest.destinations[0].chromeParity;
  }],
  ['a refused capture has a file sitting there anyway', (e) => {
    const refused = makeRefused(e.built);
    const path = resolve(root, e.inventory.evidenceTemplates.builtCapture.replaceAll('{id}', refused.id));
    e.exists = (candidate) => (candidate === path ? true : existsSync(candidate));
  }],
  ['a refused capture gives no reason', (e) => {
    delete makeRefused(e.built).reason;
  }],
  ['an audited destination is missing from a run ledger', (e) => { e.reference.results.shift(); }],
  ['a diff record names a different destination', (e) => {
    const scored = e.diff.results.find((result) => !result.skipped);
    const path = resolve(root, e.inventory.evidenceTemplates.visualDiff.replaceAll('{id}', scored.id));
    e.read = (candidate, encoding) => {
      if (candidate !== path) return readFileSync(candidate, encoding);
      const record = JSON.parse(readFileSync(candidate, 'utf8'));
      record.destinationId = 'somewhere-else';
      return JSON.stringify(record);
    };
  }],
  ['a diff record disagrees with its own ledger about the verdict', (e) => {
    e.diff.results.find((result) => !result.skipped).verdict = 'match';
  }],
  ['a diff record was taken at the wrong viewport', (e) => {
    const scored = e.diff.results.find((result) => !result.skipped);
    const path = resolve(root, e.inventory.evidenceTemplates.visualDiff.replaceAll('{id}', scored.id));
    e.read = (candidate, encoding) => {
      if (candidate !== path) return readFileSync(candidate, encoding);
      const record = JSON.parse(readFileSync(candidate, 'utf8'));
      record.dimensions.built.height = 900;
      return JSON.stringify(record);
    };
  }],
];

let failures = 0;
for (const [description, mutate] of cases) {
  let threw = null;
  try {
    verifyCapturedParityEvidence(withEvidence(mutate));
  } catch (error) {
    threw = error;
  }
  if (threw) {
    console.log(`RED   (correct): ${description}\n        -> ${threw.message.split('\n')[1]?.trim() ?? threw.message}`);
  } else {
    console.error(`GREEN (WRONG):  ${description} — the guard accepted a lie`);
    failures += 1;
  }
}

try {
  const summary = verifyCapturedParityEvidence(withEvidence(() => {}));
  console.log(`GREEN (correct): the untouched evidence passes — ${summary.referenceCaptures} reference, ${summary.builtCaptures} built, ${summary.diffRecords} diffs.`);
} catch (error) {
  console.error(`RED (WRONG): the honest, untouched evidence was refused: ${error.message}`);
  failures += 1;
}

if (failures > 0) {
  console.error(`\nFAIL: ${failures} case(s) behaved backwards.`);
  process.exit(1);
}
console.log(`\nPASS: ${cases.length} planted lies refused, honest evidence accepted.`);
