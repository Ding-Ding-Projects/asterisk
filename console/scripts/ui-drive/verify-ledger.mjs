#!/usr/bin/env node
/*
 * Committed-ledger promotion entry point.
 *
 * A legacy ledger is useful historical evidence, but it is not a promotion candidate. This
 * command therefore requires a separate task-owned metadata file containing the current
 * candidate, packaged output, launch receipt, target proof, theme, and receipt digest. It
 * returns a nonzero status for missing or unverified values rather than treating a legacy
 * record as a passing claim.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateCommittedLedger } from './evidence-contract.mjs';

const root = resolve(import.meta.dirname, '..', '..', '..');
const valueFor = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const ledgerPath = valueFor('--ledger') || resolve(root, 'console/release/evidence/ui-drive/ledger.json');
const metadataPath = valueFor('--metadata');

let ledger;
try { ledger = JSON.parse(readFileSync(ledgerPath, 'utf8')); }
catch (error) {
  console.error(`REFUSED: could not read committed UI-drive ledger: ${error.message}`);
  process.exit(1);
}

let metadata = {};
if (metadataPath) {
  try { metadata = JSON.parse(readFileSync(metadataPath, 'utf8')); }
  catch (error) {
    console.error(`REFUSED: metadata is not valid JSON: ${error.message}`);
    process.exit(1);
  }
}

const result = validateCommittedLedger(ledger, {
  root,
  receipt: metadata.receipt,
  candidateSha: metadata.candidateSha,
  artifactSha256: metadata.artifactSha256,
  receiptSha256: metadata.receiptSha256,
  targetProof: metadata.targetProof,
  theme: metadata.theme,
});

console.log(JSON.stringify({
  verdict: result.verdict,
  checkedEntries: result.checkedEntries ?? 0,
  problems: result.problems,
}, null, 2));
process.exitCode = result.verdict === 'verified' ? 0 : 1;
