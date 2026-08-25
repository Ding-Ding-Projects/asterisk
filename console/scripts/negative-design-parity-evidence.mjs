#!/usr/bin/env node
/**
 * Deliberate red-then-green proof for design-parity-evidence-on-disk.mjs.
 *
 * The point of this check is that a design-parity row cannot claim `verified` without the
 * reference/built captures, side-by-side comparison and visual-diff evidence genuinely
 * existing AND genuinely recording a match. Each case below plants exactly one lie and
 * requires the resulting refusal to be attributable to that lie; the untouched inventory
 * (every destination still `compiled`, none `verified`) must then check nothing and pass.
 *
 * Every fixture below marks exactly one destination `verified` on a clone, so a case
 * failing for the wrong reason (or passing for the wrong reason) cannot hide behind a
 * second planted lie.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { verifyDesignParityEvidence } from './design-parity-evidence-on-disk.mjs';

const root = resolve(import.meta.dirname, '..', '..');
const source = JSON.parse(readFileSync(resolve(root, 'console/inventories/design-parity.json'), 'utf8'));
const clone = () => structuredClone(source);
const targetId = source.destinations[0].id;

function mustFail(name, mutate, fsOverrides = {}) {
  const candidate = clone();
  mutate(candidate);
  try { verifyDesignParityEvidence(candidate, { root, ...fsOverrides }); }
  catch (error) { console.log(`RED: ${name}: ${error.message.split('\n')[0]}`); return; }
  throw new Error(`${name}: deliberate break stayed green`);
}

const honestDiff = (id) => JSON.stringify({
  destinationId: id, verdict: 'match', diffPixelCount: 0,
  paletteCheck: { blackFraction: 0, thresholdExceeded: false },
  stalenessCheck: { checked: true, stale: false },
});
const honestAudit = (id) => JSON.stringify({ destinationId: id, conforms: true, defects: [] });
const honestFs = (id) => ({
  exists: () => true,
  read: (path) => {
    const p = String(path);
    if (p.endsWith('-diff.json')) return honestDiff(id);
    if (p.endsWith('-material.json')) return honestAudit(id);
    return 'binary-capture-placeholder';
  },
});

verifyDesignParityEvidence(source, { root });
console.log('GREEN (baseline): every destination is still compiled, so nothing was checked — 0 verified rows.');

mustFail(
  'claim verified while every evidence artifact is absent',
  (data) => { data.destinations[0].status = 'verified'; },
  { exists: () => false, read: () => '' },
);

mustFail(
  'claim verified while only the side-by-side comparison is absent',
  (data) => { data.destinations[0].status = 'verified'; },
  {
    exists: (path) => !String(path).endsWith('-comparison.png'),
    read: (path) => {
      const p = String(path);
      if (p.endsWith('-diff.json')) return honestDiff(targetId);
      if (p.endsWith('-material.json')) return honestAudit(targetId);
      return '';
    },
  },
);

mustFail(
  'claim verified with a visualDiff that records a real pixel mismatch (verdict: diff)',
  (data) => { data.destinations[0].status = 'verified'; },
  {
    exists: () => true,
    read: (path) => {
      const p = String(path);
      if (p.endsWith('-diff.json')) {
        return JSON.stringify({ destinationId: targetId, verdict: 'diff', diffPixelCount: 900, paletteCheck: { thresholdExceeded: false }, stalenessCheck: { stale: false } });
      }
      if (p.endsWith('-material.json')) return honestAudit(targetId);
      return '';
    },
  },
);

mustFail(
  'claim verified with a visualDiff evidencing a different destination id',
  (data) => { data.destinations[0].status = 'verified'; },
  {
    exists: () => true,
    read: (path) => {
      const p = String(path);
      if (p.endsWith('-diff.json')) return honestDiff('some-other-destination-entirely');
      if (p.endsWith('-material.json')) return honestAudit(targetId);
      return '';
    },
  },
);

mustFail(
  'claim verified with a visualDiff whose built capture is flagged as unpainted (paletteCheck exceeded)',
  (data) => { data.destinations[0].status = 'verified'; },
  {
    exists: () => true,
    read: (path) => {
      const p = String(path);
      if (p.endsWith('-diff.json')) {
        return JSON.stringify({ destinationId: targetId, verdict: 'match', diffPixelCount: 0, paletteCheck: { blackFraction: 0.4, thresholdExceeded: true }, stalenessCheck: { stale: false } });
      }
      if (p.endsWith('-material.json')) return honestAudit(targetId);
      return '';
    },
  },
);

mustFail(
  'claim verified with a visualDiff whose built capture is flagged stale (older than its own build)',
  (data) => { data.destinations[0].status = 'verified'; },
  {
    exists: () => true,
    read: (path) => {
      const p = String(path);
      if (p.endsWith('-diff.json')) {
        return JSON.stringify({ destinationId: targetId, verdict: 'match', diffPixelCount: 0, paletteCheck: { thresholdExceeded: false }, stalenessCheck: { checked: true, stale: true } });
      }
      if (p.endsWith('-material.json')) return honestAudit(targetId);
      return '';
    },
  },
);

mustFail(
  'claim verified with a materialAudit recording unresolved conformance defects',
  (data) => { data.destinations[0].status = 'verified'; },
  {
    exists: () => true,
    read: (path) => {
      const p = String(path);
      if (p.endsWith('-diff.json')) return honestDiff(targetId);
      if (p.endsWith('-material.json')) return JSON.stringify({ destinationId: targetId, conforms: false, defects: ['legacy switch control found on this screen'] });
      return '';
    },
  },
);

mustFail(
  'claim verified with a visualDiff that is present but not valid JSON',
  (data) => { data.destinations[0].status = 'verified'; },
  {
    exists: () => true,
    read: (path) => (String(path).endsWith('-diff.json') ? 'not json at all' : honestAudit(targetId)),
  },
);

// The honest positive case: every artifact present, every claim inside it true. This has
// to be checked too, or this whole file would only prove the guard refuses everything —
// which passes a red-then-green eyeball while being just as useless as no guard at all.
{
  const candidate = clone();
  candidate.destinations[0].status = 'verified';
  const result = verifyDesignParityEvidence(candidate, { root, ...honestFs(targetId) });
  if (result.verifiedRows !== 1) throw new Error('a fully evidenced verified row was not accepted — the guard refuses everything rather than refusing lies');
  console.log(`GREEN: a fully evidenced verified row for '${targetId}' is accepted (${result.checked} artifacts resolved).`);
}

verifyDesignParityEvidence(source, { root });
console.log('GREEN: restored design parity inventory (all destinations still compiled) checked 0 verified rows.');
