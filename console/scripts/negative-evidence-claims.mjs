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
import { verifyEvidenceOnDisk } from './evidence-on-disk.mjs';

const root = resolve(import.meta.dirname, '..', '..');
const source = JSON.parse(readFileSync(resolve(root, 'console/inventories/surface-completeness.json'), 'utf8'));
const clone = () => structuredClone(source);

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

mustFail(
  'claim verified while every evidence artifact is absent',
  (data) => { data.surfaces[0].features[0].status = 'verified'; },
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
