#!/usr/bin/env node
/**
 * Proves the windows-console built-interaction records are about the pictures beside them.
 *
 * `evidence-on-disk.mjs` guards a `verified` ROW, and only asks whether each of the six named
 * files exists. That is the right question for a row's claim and a weak one for the artifacts
 * themselves: a record whose capture was deleted, re-cropped, replaced by a screenshot of a
 * different screen, or taken from a build nobody shipped passes every existence check there is.
 * The record and the picture are two halves of one claim and nothing tied them together.
 *
 * So this checks, for every record naming a feature the inventory knows about:
 *
 *   - its capture exists, at exactly the byte count and sha256 the record wrote down, so a
 *     replaced or re-taken PNG is a different capture and is reported as one;
 *   - it names the packaged artifact it was taken from, with a 64-character digest, so a
 *     record cannot describe a build it never opened;
 *   - it carries no run of base32 long enough to be an authenticator secret. That check is on
 *     the whole serialised record rather than any one field, because the leak this exists to
 *     stop came through a URI's query string rather than through a field anybody named.
 *
 * And a hand-written list, because a rule alone cannot notice a record that was never written:
 * the two lock features driven by `scripts/ui-drive/lock-evidence.mjs` must each have a record
 * that names itself, states it inspected the real packaged artifact, and carries the specific
 * observations that run established. A pattern-only guard passes cleanly on an empty directory.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * The records whose content this guard has an opinion about, and what each must show.
 *
 * Hand-written on purpose. Every other check here is shaped like "if a record exists then it
 * must be consistent", which is satisfied perfectly by a record that does not exist -- so a
 * driven record that quietly stopped being produced would disappear from the guard along with
 * itself. These two cannot.
 */
export const drivenLockRecords = {
  'built-in-authenticator': [
    'resourceEntriesBeforePairing',
    'resourceEntriesAfterPairing',
    'pairedSecretLengthBase32',
    'staleCodeRefusedWith',
    'liveCodeAccepted',
  ],
  'unlock-ladder': [
    'challengeOfferedOnAttempt',
    'rung',
    'challengePrompt',
    'lockStillPresentAfterChallenge',
  ],
};

/** Long enough that a real base32 secret matches and an ordinary shouty word does not. */
const BASE32_SECRET = /[A-Z2-7]{26,}/;

export function verifyBuiltInteractionEvidence({
  root, inventory, exists = existsSync, read = readFileSync, list = readdirSync,
} = {}) {
  if (typeof root !== 'string' || root.length === 0) {
    throw new Error('verifyBuiltInteractionEvidence requires an absolute repository root');
  }
  const surface = inventory.surfaces.find((entry) => entry.id === 'windows-console');
  if (!surface) throw new Error('verifyBuiltInteractionEvidence: the inventory has no windows-console surface');
  const featureIds = new Set(inventory.requiredFeatureIds);
  const directory = resolve(root, 'console/release/evidence/windows-console');
  const problems = [];
  const seen = new Set();
  let checked = 0;

  for (const entry of list(directory)) {
    if (!entry.endsWith('.json')) continue;
    const id = entry.slice(0, -'.json'.length);
    /* A record whose name is not a feature id belongs to something else and is left alone;
     * the inventory is what decides which rows this guard speaks for. */
    if (!featureIds.has(id)) continue;
    seen.add(id);
    checked += 1;
    const text = read(resolve(directory, entry), 'utf8');
    let record;
    try { record = JSON.parse(text); } catch { problems.push(`${id}: the record is not valid JSON`); continue; }

    if (BASE32_SECRET.test(text)) {
      problems.push(`${id}: the record carries a base32 run long enough to be an authenticator secret`);
    }
    if (typeof record.artifact !== 'string' || !record.artifact.startsWith('console/')) {
      problems.push(`${id}: the record does not name a repository-relative packaged artifact`);
    }
    if (typeof record.artifactSha256 !== 'string' || !/^[0-9a-f]{64}$/.test(record.artifactSha256)) {
      problems.push(`${id}: the record gives no 64-character digest for the artifact it was taken from`);
    }
    if (typeof record.capture !== 'string') { problems.push(`${id}: the record names no capture`); continue; }
    const capturePath = resolve(root, record.capture);
    if (!exists(capturePath)) { problems.push(`${id}: the capture the record names is absent at ${record.capture}`); continue; }
    const bytes = read(capturePath);
    if (bytes.length !== record.captureBytes) {
      problems.push(`${id}: the capture is ${bytes.length} bytes, the record wrote down ${record.captureBytes}`);
    }
    if (createHash('sha256').update(bytes).digest('hex') !== record.captureSha256) {
      problems.push(`${id}: the capture does not hash to what the record wrote down -- this is a different picture`);
    }
  }

  for (const [id, required] of Object.entries(drivenLockRecords)) {
    if (!seen.has(id)) { problems.push(`${id}: the driven lock record is missing entirely`); continue; }
    const record = JSON.parse(read(resolve(directory, `${id}.json`), 'utf8'));
    if (record.feature !== id) problems.push(`${id}: the record names feature ${JSON.stringify(record.feature)}`);
    if (record.verification !== 'inspected-real-packaged-artifact') {
      problems.push(`${id}: the record does not claim to have inspected the real packaged artifact`);
    }
    for (const key of required) {
      if (!(key in (record.interaction ?? {}))) problems.push(`${id}: the record never observed '${key}'`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`${problems.length} built-interaction evidence problem(s):\n  - ${problems.join('\n  - ')}`);
  }
  return { checked, drivenRecords: Object.keys(drivenLockRecords).length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = resolve(import.meta.dirname, '..', '..');
  try {
    const inventory = JSON.parse(readFileSync(resolve(root, 'console/inventories/surface-completeness.json'), 'utf8'));
    const result = verifyBuiltInteractionEvidence({ root, inventory });
    console.log(`PASS: ${result.checked} windows-console built-interaction record(s) match their captures; `
      + `${result.drivenRecords} driven lock record(s) present with their observations.`);
  } catch (error) {
    console.error(`FAIL: ${error.message}`);
    process.exitCode = 1;
  }
}
