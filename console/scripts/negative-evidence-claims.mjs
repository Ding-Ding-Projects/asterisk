#!/usr/bin/env node
/**
 * Deliberate red-then-green proof for the evidence-on-disk check.
 *
 * The point of this check is that a row cannot claim `verified` without the artifacts
 * behind it, so the only way to trust it is to watch it refuse a false claim. Each case
 * below asserts a specific way of lying about evidence and must turn red; the untouched
 * inventory must then turn green.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { verifyEvidenceOnDisk, verifyExemptions } from './evidence-on-disk.mjs';

const root = resolve(import.meta.dirname, '..', '..');
const source = JSON.parse(readFileSync(resolve(root, 'console/inventories/surface-completeness.json'), 'utf8'));
/* Every fixture below plants exactly one lie and requires the resulting failure to be
 * attributable to that lie. That only holds while nothing else in the inventory already
 * claims `verified`, so the baseline strips real verifications first.
 *
 * Without this the proof breaks the moment the project succeeds at anything: the first
 * genuinely verified row makes the honest-row fixture carry two verified rows, its stubbed
 * reader can only name one of them, and the whole script throws before reaching its own
 * conclusion. It also quietly weakens the `mustFail` cases, which would start going red for
 * a row nobody planted — a deliberate break that "passes" for an unintended reason is not a
 * proof of anything.
 *
 * Exempt rows are left exactly as they are: an exemption is a recorded decision, not a claim
 * about evidence, and the exemption cases further down test it separately. */
const clone = () => {
  const copy = structuredClone(source);
  for (const surface of copy.surfaces) {
    for (const feature of surface.features) {
      if (feature.status === 'verified') feature.status = 'unverified';
    }
  }
  return copy;
};

function mustFail(name, mutate, options = {}) {
  const candidate = clone();
  mutate(candidate);
  try { verifyEvidenceOnDisk(candidate, { root, ...options }); }
  catch (error) { console.log(`RED: ${name}: ${error.message.split('\n')[0]}`); return; }
  throw new Error(`${name}: deliberate break stayed green`);
}

/* Every artifact present, so only the anchor cases below can distinguish a real
 * registry entry from an empty registry file. */
const allPresent = { exists: () => true, read: () => '' };
const anchoredPresent = { exists: () => true, read: () => 'contains language-modes and nothing else' };

verifyEvidenceOnDisk(source, { root });

/* Absence is forced rather than assumed. This case used to rely on the first row
 * happening to have no evidence on disk, which stopped being true the moment a lane
 * supplied it -- so genuine progress turned a deliberate break green and failed the
 * build. The check is about what the verifier does when an artifact is missing, not
 * about which rows currently lack one. */
mustFail(
  'claim verified while every evidence artifact is absent',
  (data) => { data.surfaces[0].features[0].status = 'verified'; },
  { exists: () => false, read: () => String() },
);

mustFail(
  'claim verified while a single capture is absent',
  (data) => { data.surfaces[0].features[0].status = 'verified'; },
  {
    exists: (path) => !String(path).endsWith('.png'),
    read: () => `contains ${source.surfaces[0].features[0].id}`,
  },
);

mustFail(
  'point an anchored registry at a file that never names the row',
  (data) => { data.surfaces[0].features[1].status = 'verified'; },
  anchoredPresent,
);

mustFail(
  'claim verified on the second surface while its artifacts are absent',
  (data) => { data.surfaces[1].features[0].status = 'verified'; },
);

/* A row whose artifacts genuinely all resolve must be accepted, or the check would be
 * refusing everything rather than refusing false claims — which passes a red-then-green
 * eyeball while being just as useless. */
const honest = clone();
honest.surfaces[0].features[0].status = 'verified';
const accepted = verifyEvidenceOnDisk(honest, {
  root,
  exists: () => true,
  read: () => `registry naming ${honest.surfaces[0].features[0].id}`,
});
if (accepted.verifiedRows !== 1 || accepted.checked !== Object.keys(honest.surfaces[0].evidenceTemplates).length) {
  throw new Error('a fully evidenced row was not accepted, so the check refuses everything rather than refusing lies');
}
console.log(`GREEN: a fully evidenced row is accepted (${accepted.checked} artifacts resolved).`);

verifyEvidenceOnDisk(source, { root });
console.log('GREEN: restored surface completeness inventory passed the evidence-on-disk check.');

/* An exemption is a decision and has to cost something to make, or the status becomes a
 * quiet way of clearing a row nobody wants to do. These prove it costs a written reason. */
const exemptions = JSON.parse(readFileSync(resolve(root, 'console/inventories/exemptions.json'), 'utf8'));
const cloneExemptions = () => structuredClone(exemptions);

function exemptionMustFail(name, mutateInventory, mutateExemptions = (data) => data) {
  const inventory = clone();
  const record = cloneExemptions();
  mutateInventory(inventory);
  mutateExemptions(record);
  try { verifyExemptions(inventory, record); }
  catch (error) { console.log(`RED: ${name}: ${error.message.split('\n')[1]?.trim() ?? error.message}`); return; }
  throw new Error(`${name}: deliberate break stayed green`);
}

verifyExemptions(source, exemptions);

exemptionMustFail(
  'mark a row exempt with no recorded reason at all',
  (data) => { data.surfaces[0].features.find((feature) => feature.id === 'narration').status = 'exempt'; },
);

exemptionMustFail(
  'record an exemption whose reason is too short to be a reason',
  () => {},
  (record) => { record.exemptions[0].reason = 'no'; },
);

exemptionMustFail(
  'record an exemption with no decider',
  () => {},
  (record) => { delete record.exemptions[0].decidedBy; },
);

exemptionMustFail(
  'leave a recorded exemption whose row is not actually marked exempt',
  (data) => { data.surfaces[0].features.find((feature) => feature.id === 'ollama-suite-manager').status = 'unverified'; },
);

verifyExemptions(source, exemptions);
console.log('GREEN: every exempt row carries a recorded reason, decider and date.');
