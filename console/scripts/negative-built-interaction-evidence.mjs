#!/usr/bin/env node
/**
 * Deliberate red-then-green proof for built-interaction-evidence.mjs.
 *
 * That guard speaks for thirty-nine committed records and their pictures, none of which anyone
 * is going to check by hand, so it is exactly the kind of guard that can quietly stop guarding
 * and still print PASS. Each lie below is planted alone, against the real committed evidence,
 * and must turn it red; the untouched evidence must then turn it green. One at a time, because
 * breaking three things and seeing one failure proves only that something among them is watched.
 *
 * Nothing here writes to disk. The guard takes its own `exists`, `read` and `list`, so every
 * planted lie lives in memory and the committed records are never disturbed.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { verifyBuiltInteractionEvidence, drivenLockRecords } from './built-interaction-evidence.mjs';

const root = resolve(import.meta.dirname, '..', '..');
const inventory = JSON.parse(readFileSync(resolve(root, 'console/inventories/surface-completeness.json'), 'utf8'));
const directory = resolve(root, 'console/release/evidence/windows-console');
const recordPath = (id) => resolve(directory, `${id}.json`);
const readRecord = (id) => JSON.parse(readFileSync(recordPath(id), 'utf8'));

/** Rewrites one record's JSON on the way through the guard, leaving every other read alone. */
const rewriting = (id, mutate) => (candidate, encoding) => {
  if (candidate !== recordPath(id)) return readFileSync(candidate, encoding);
  const record = readRecord(id);
  mutate(record);
  return JSON.stringify(record, null, 2);
};

const anyFeatureRecord = readdirSync(directory)
  .filter((entry) => entry.endsWith('.json'))
  .map((entry) => entry.slice(0, -'.json'.length))
  .find((id) => inventory.requiredFeatureIds.includes(id) && !(id in drivenLockRecords));
if (!anyFeatureRecord) throw new Error('negative-built-interaction-evidence: no ordinary feature record to plant on');

const cases = [
  ['a record names a capture that is not there', () => ({
    exists: (candidate) => (candidate === resolve(root, readRecord(anyFeatureRecord).capture) ? false : existsSync(candidate)),
  })],
  ['a capture has been replaced with different bytes', () => {
    const path = resolve(root, readRecord(anyFeatureRecord).capture);
    return { read: (candidate, encoding) => (candidate === path ? Buffer.concat([readFileSync(candidate), Buffer.from('!')]) : readFileSync(candidate, encoding)) };
  }],
  ['a record claims a digest its capture does not have', () => ({
    read: rewriting(anyFeatureRecord, (record) => { record.captureSha256 = '0'.repeat(64); }),
  })],
  ['a record claims a byte count its capture does not have', () => ({
    read: rewriting(anyFeatureRecord, (record) => { record.captureBytes += 1; }),
  })],
  ['a record names no packaged artifact', () => ({
    read: rewriting(anyFeatureRecord, (record) => { record.artifact = 'somewhere/else.exe'; }),
  })],
  ['a record gives no digest for the artifact it was taken from', () => ({
    read: rewriting(anyFeatureRecord, (record) => { record.artifactSha256 = 'not-a-digest'; }),
  })],
  ['a record carries an authenticator secret', () => ({
    read: rewriting('built-in-authenticator', (record) => {
      record.interaction.pairingUriParameters.secret = 'MASFATRXKZNY6BWVMLCLJJGHGJWDZ4XW';
    }),
  })],
  ['a driven lock record has stopped being written at all', () => ({
    list: (candidate) => readdirSync(candidate).filter((entry) => entry !== 'unlock-ladder.json'),
    exists: (candidate) => (candidate === recordPath('unlock-ladder') ? false : existsSync(candidate)),
    read: (candidate, encoding) => {
      if (candidate === recordPath('unlock-ladder')) throw new Error('ENOENT: the record was removed for this case');
      return readFileSync(candidate, encoding);
    },
  })],
  ['a driven lock record names a different feature', () => ({
    read: rewriting('unlock-ladder', (record) => { record.feature = 'something-else'; }),
  })],
  ['a driven lock record no longer claims it opened the real artifact', () => ({
    read: rewriting('built-in-authenticator', (record) => { record.verification = 'looked-at-the-source'; }),
  })],
  ['a driven lock record dropped the observation that pairing made no network call', () => ({
    read: rewriting('built-in-authenticator', (record) => { delete record.interaction.resourceEntriesAfterPairing; }),
  })],
  ['a driven lock record dropped the observation that the lock survived the challenge', () => ({
    read: rewriting('unlock-ladder', (record) => { delete record.interaction.lockStillPresentAfterChallenge; }),
  })],
];

let failures = 0;
for (const [description, build] of cases) {
  let threw = null;
  try {
    verifyBuiltInteractionEvidence({ root, inventory, exists: existsSync, read: readFileSync, list: readdirSync, ...build() });
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
  const summary = verifyBuiltInteractionEvidence({ root, inventory });
  console.log(`GREEN (correct): the untouched evidence passes — ${summary.checked} records, ${summary.drivenRecords} driven.`);
} catch (error) {
  console.error(`RED (WRONG): the honest, untouched evidence was refused: ${error.message}`);
  failures += 1;
}

if (failures > 0) {
  console.error(`\nFAIL: ${failures} case(s) behaved backwards.`);
  process.exit(1);
}
console.log(`\nPASS: ${cases.length} planted lies refused, honest evidence accepted.`);
