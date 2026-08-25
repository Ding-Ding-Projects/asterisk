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
  catch (error) {
    // The first bullet, not merely the count. A case that goes red for some reason
    // unrelated to the lie it planted reads exactly like one that worked if only the
    // headline is printed, which is how a case quietly stops testing what it names.
    const [headline, firstProblem] = error.message.split('\n');
    console.log(`RED: ${name}: ${headline}\n       ${(firstProblem ?? '').trim()}`);
    return;
  }
  throw new Error(`${name}: deliberate break stayed green`);
}

/**
 * The whole-frame diff an honest row carries: a real comparison that found the data
 * divergence this project put there on purpose. Deliberately `verdict: 'diff'` rather than
 * `'match'` — a `match` here would mean the application had grown the design's invented
 * sample rows back, which is the opposite of what a verified row should claim.
 */
const honestDiff = (id) => JSON.stringify({
  destinationId: id, verdict: 'diff', diffPixelCount: 828314,
  paletteCheck: { blackFraction: 0, thresholdExceeded: false },
  stalenessCheck: { checked: true, stale: false },
});

/** The three data rectangles this application's chromeParityBar declares, at the capture tuple. */
const EXCLUSIONS = [
  { area: 'contentPane', x: 356, y: 78, width: 1084, height: 946 },
  { area: 'commandCell', x: 538, y: 0, width: 534, height: 40 },
  { area: 'statusCell', x: 1060, y: 0, width: 380, height: 40 },
];
const honestLedger = (id, overrides = {}) => JSON.stringify({
  destinationId: id,
  bar: 'chrome-parity',
  areas: {
    brandCell: { role: 'chrome' }, menuCell: { role: 'chrome' }, commandCell: { role: 'data' },
    statusCell: { role: 'data' }, tabStrip: { role: 'chrome' }, rail: { role: 'chrome' },
    sectionList: { role: 'chrome' }, contentPane: { role: 'data' },
  },
  exclusions: EXCLUSIONS,
  comparedAreas: ['brandCell', 'menuCell', 'tabStrip', 'rail', 'sectionList'],
  ...overrides,
});
const honestChrome = (id, overrides = {}) => JSON.stringify({
  destinationId: id, bar: 'chrome-parity', verdict: 'match', diffPixelCount: 0,
  comparedFraction: 0.2954, minimumComparedFraction: 0.25,
  excluded: { rectangles: EXCLUSIONS },
  paletteCheck: { blackFraction: 0, thresholdExceeded: false },
  stalenessCheck: { checked: true, stale: false },
  ...overrides,
});
const honestAudit = (id) => JSON.stringify({ destinationId: id, conforms: true, defects: [] });

/** Every evidence file honest, so one planted lie at a time is the only thing under test. */
const honestFs = (id, overrides = {}) => ({
  exists: () => true,
  read: (path) => {
    const p = String(path);
    if (p.endsWith('-diff.json')) return overrides.diff ?? honestDiff(id);
    if (p.endsWith('-regions.json')) return overrides.regions ?? honestLedger(id);
    if (p.endsWith('-chrome.json')) return overrides.chrome ?? honestChrome(id);
    if (p.endsWith('-material.json')) return overrides.material ?? honestAudit(id);
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
  { ...honestFs(targetId), exists: (path) => !String(path).endsWith('-comparison.png') },
);

mustFail(
  'claim verified while only the region ledger is absent',
  (data) => { data.destinations[0].status = 'verified'; },
  { ...honestFs(targetId), exists: (path) => !String(path).endsWith('-regions.json') },
);

mustFail(
  'claim verified while only the chrome-parity record is absent',
  (data) => { data.destinations[0].status = 'verified'; },
  { ...honestFs(targetId), exists: (path) => !String(path).endsWith('-chrome.json') },
);

mustFail(
  'claim verified with a chrome-parity record that found a real chrome divergence',
  (data) => { data.destinations[0].status = 'verified'; },
  honestFs(targetId, { chrome: honestChrome(targetId, { verdict: 'diff', diffPixelCount: 28354 }) }),
);

mustFail(
  'claim verified with a chrome-parity record whose verdict says match while its pixel count does not',
  (data) => { data.destinations[0].status = 'verified'; },
  honestFs(targetId, { chrome: honestChrome(targetId, { verdict: 'match', diffPixelCount: 12 }) }),
);

mustFail(
  'claim verified with a chrome-parity record evidencing a different destination id',
  (data) => { data.destinations[0].status = 'verified'; },
  honestFs(targetId, { chrome: honestChrome('some-other-destination-entirely') }),
);

mustFail(
  'claim verified with a chrome-parity record that measured some other bar',
  (data) => { data.destinations[0].status = 'verified'; },
  honestFs(targetId, { chrome: honestChrome(targetId, { bar: 'whole-frame-pixels' }) }),
);

mustFail(
  'claim verified with a mask so wide it falls below the declared compared-fraction floor',
  (data) => { data.destinations[0].status = 'verified'; },
  honestFs(targetId, { chrome: honestChrome(targetId, { comparedFraction: 0.04 }) }),
);

mustFail(
  'claim verified while the inventory declares no compared-fraction floor at all',
  (data) => { data.destinations[0].status = 'verified'; delete data.chromeParityBar.minimumComparedFraction; },
  honestFs(targetId),
);

mustFail(
  'claim verified with a chrome-parity record whose staleness check never ran',
  (data) => { data.destinations[0].status = 'verified'; },
  honestFs(targetId, { chrome: honestChrome(targetId, { stalenessCheck: { checked: false, stale: false } }) }),
);

mustFail(
  'claim verified with a chrome-parity record whose built capture is flagged unpainted',
  (data) => { data.destinations[0].status = 'verified'; },
  honestFs(targetId, { chrome: honestChrome(targetId, { paletteCheck: { blackFraction: 0.4, thresholdExceeded: true } }) }),
);

mustFail(
  'claim verified with a chrome-parity record citing a mask the region ledger never recorded',
  (data) => { data.destinations[0].status = 'verified'; },
  honestFs(targetId, {
    chrome: honestChrome(targetId, { excluded: { rectangles: [{ area: 'contentPane', x: 0, y: 0, width: 1440, height: 1000 }] } }),
  }),
);

mustFail(
  'claim verified with a region ledger that excludes nothing, quietly restoring whole-frame identity',
  (data) => { data.destinations[0].status = 'verified'; },
  honestFs(targetId, { regions: honestLedger(targetId, { exclusions: [] }) }),
);

mustFail(
  'claim verified with a region ledger that names no compared areas',
  (data) => { data.destinations[0].status = 'verified'; },
  honestFs(targetId, { regions: honestLedger(targetId, { comparedAreas: [] }) }),
);

mustFail(
  'claim verified with a region ledger measuring an area the inventory declares no role for',
  (data) => { data.destinations[0].status = 'verified'; },
  honestFs(targetId, {
    regions: honestLedger(targetId, {
      areas: { contentPane: { role: 'data' }, mysteryPanel: { role: 'chrome' } },
    }),
  }),
);

mustFail(
  'claim verified with a region ledger that calls a declared chrome area data',
  (data) => { data.destinations[0].status = 'verified'; },
  honestFs(targetId, {
    regions: honestLedger(targetId, {
      areas: { rail: { role: 'data' }, contentPane: { role: 'data' } },
    }),
  }),
);

mustFail(
  'claim verified with a region ledger measured on a different screen',
  (data) => { data.destinations[0].status = 'verified'; },
  honestFs(targetId, { regions: honestLedger('some-other-destination-entirely') }),
);

mustFail(
  'claim verified with a whole-frame visualDiff that was refused rather than taken',
  (data) => { data.destinations[0].status = 'verified'; },
  honestFs(targetId, {
    diff: JSON.stringify({
      destinationId: targetId, verdict: 'refused', reasons: ['dimension mismatch'],
      paletteCheck: { thresholdExceeded: false }, stalenessCheck: { checked: true, stale: false },
    }),
  }),
);

mustFail(
  'claim verified with a visualDiff evidencing a different destination id',
  (data) => { data.destinations[0].status = 'verified'; },
  honestFs(targetId, { diff: honestDiff('some-other-destination-entirely') }),
);

mustFail(
  'claim verified with a visualDiff whose built capture is flagged as unpainted (paletteCheck exceeded)',
  (data) => { data.destinations[0].status = 'verified'; },
  honestFs(targetId, {
    diff: JSON.stringify({
      destinationId: targetId, verdict: 'diff', diffPixelCount: 900,
      paletteCheck: { blackFraction: 0.4, thresholdExceeded: true }, stalenessCheck: { checked: true, stale: false },
    }),
  }),
);

mustFail(
  'claim verified with a visualDiff whose built capture is flagged stale (older than its own build)',
  (data) => { data.destinations[0].status = 'verified'; },
  honestFs(targetId, {
    diff: JSON.stringify({
      destinationId: targetId, verdict: 'diff', diffPixelCount: 900,
      paletteCheck: { thresholdExceeded: false }, stalenessCheck: { checked: true, stale: true },
    }),
  }),
);

mustFail(
  'claim verified with a materialAudit recording unresolved conformance defects',
  (data) => { data.destinations[0].status = 'verified'; },
  honestFs(targetId, { material: JSON.stringify({ destinationId: targetId, conforms: false, defects: ['legacy switch control found on this screen'] }) }),
);

mustFail(
  'claim verified with a visualDiff that is present but not valid JSON',
  (data) => { data.destinations[0].status = 'verified'; },
  honestFs(targetId, { diff: 'not json at all' }),
);

mustFail(
  'claim verified with a chrome-parity record that is present but not valid JSON',
  (data) => { data.destinations[0].status = 'verified'; },
  honestFs(targetId, { chrome: 'not json at all' }),
);

mustFail(
  'claim verified with a region ledger that is present but not valid JSON',
  (data) => { data.destinations[0].status = 'verified'; },
  honestFs(targetId, { regions: 'not json at all' }),
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
