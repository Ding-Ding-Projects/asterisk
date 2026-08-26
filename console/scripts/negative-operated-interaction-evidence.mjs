#!/usr/bin/env node
/**
 * Deliberate red-then-green proof for operated-interaction-evidence.mjs.
 *
 * That guard is the only thing standing between the inventory and thirty-five rows whose six
 * artifacts are all present and whose records establish nothing, so a version of it that had
 * quietly stopped guarding would look exactly like this one and print exactly the same PASS.
 *
 * Every lie below is planted alone against the real committed inventory and the real committed
 * records, and must turn the guard red; the untouched evidence must then turn it green. One at a
 * time, breaking six things and seeing one failure proves only that something among them is
 * watched, which is not what anybody needs to know.
 *
 * Nothing here writes to disk. The guard takes its own `exists` and `read`, so each planted lie
 * lives in memory and the committed evidence is never disturbed.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { verifyOperatedInteractionEvidence, operationProofs } from './operated-interaction-evidence.mjs';

const root = resolve(dirname(import.meta.dirname), '..');
const inventoryPath = resolve(root, 'console/inventories/surface-completeness.json');
const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8'));
const recordPath = (id) => resolve(root, `console/release/evidence/windows-console/${id}.json`);
const readRecord = (id) => JSON.parse(readFileSync(recordPath(id), 'utf8'));

/** Rewrites one record's JSON on the way through the guard, leaving every other read alone. */
const rewriting = (id, mutate) => (candidate, encoding) => {
  if (candidate !== recordPath(id)) return readFileSync(candidate, encoding);
  const record = readRecord(id);
  mutate(record);
  return JSON.stringify(record, null, 2);
};

/** A copy of the inventory with one row's status changed, so the committed file stays untouched. */
const withStatus = (featureId, status) => {
  const copy = JSON.parse(JSON.stringify(inventory));
  const surface = copy.surfaces.find((entry) => entry.id === 'windows-console');
  const feature = surface.features.find((entry) => entry.id === featureId);
  if (!feature) throw new Error(`negative-operated-interaction-evidence: no windows-console row '${featureId}'`);
  feature.status = status;
  return copy;
};

/* A row that is honestly unverified today and whose record is one of the ones that photographed
 * a control rather than operating it. Promoting it is the exact careless edit this guards. */
const photographedRow = 'collapsible-filters';
if (inventory.surfaces.find((s) => s.id === 'windows-console').features
  .find((f) => f.id === photographedRow)?.status !== 'unverified') {
  throw new Error(`negative-operated-interaction-evidence: '${photographedRow}' is no longer the unverified row this proof plants on`);
}

const cases = [
  ['an unverified row is promoted with no operation proof named for it', () => ({
    inventory: withStatus(photographedRow, 'verified'),
  })],
  ['a proven row is demoted, leaving its proof behind claiming it', () => ({
    inventory: withStatus('regex-builder', 'unverified'),
  })],
  ['a verified row has lost its built-interaction record entirely', () => ({
    exists: (candidate) => (candidate === recordPath('unlock-ladder') ? false : existsSync(candidate)),
  })],
  ['a verified row\'s record is no longer valid JSON', () => ({
    read: (candidate, encoding) => (candidate === recordPath('unlock-ladder') ? '{ not json' : readFileSync(candidate, encoding)),
  })],
  ['the recorded click left the document identical either side of itself', () => ({
    read: rewriting('regex-builder', (record) => { record.interaction.domAfterClick = record.interaction.domBeforeClick; }),
  })],
  ['the before/after pair has been dropped from a record that needs one', () => ({
    read: rewriting('regex-builder', (record) => { delete record.interaction.domAfterClick; }),
  })],
  ['a record admits in its own words that it captured a control without clicking it', () => ({
    read: rewriting('regex-builder', (record) => {
      record.interaction.action = 'navigated to the section list and captured its regex affordance without clicking';
    }),
  })],
  ['an observed list has come back empty, as twenty-five unpromoted rows already do', () => ({
    read: rewriting('regex-builder', (record) => { record.interaction.observedPanelControls = []; }),
  })],
  ['an observed list has come back holding blank strings', () => ({
    read: rewriting('regex-builder', (record) => { record.interaction.observedFlags = ['', '   ']; }),
  })],
  ['a flag that has to be true was recorded false', () => ({
    read: rewriting('built-in-authenticator', (record) => { record.interaction.liveCodeAccepted = false; }),
  })],
  ['a count that has to be positive was recorded as zero', () => ({
    read: rewriting('unlock-ladder', (record) => { record.interaction.challengeOfferedOnAttempt = 0; }),
  })],
  ['a reading that has to be present was recorded as null', () => ({
    read: rewriting('built-in-authenticator', (record) => { record.interaction.resourceEntriesAfterPairing = null; }),
  })],
  ['a short reading was blanked out', () => ({
    read: rewriting('unlock-ladder', (record) => { record.interaction.rung = '   '; }),
  })],
  ['a piece of observed on-screen copy was truncated to a fragment', () => ({
    read: rewriting('automatic-updates', (record) => { record.interaction.bannerText = 'An update'; }),
  })],
  ['a record dropped the observation that the unsigned build was disclosed', () => ({
    read: rewriting('automatic-updates', (record) => { delete record.interaction.unsignedDisclosureShown; }),
  })],
  ['the whole interaction block was dropped', () => ({
    read: rewriting('unlock-ladder', (record) => { delete record.interaction; }),
  })],
];

let failures = 0;
for (const [description, build] of cases) {
  const { inventory: planted = inventory, ...overrides } = build();
  let threw = null;
  try {
    verifyOperatedInteractionEvidence({ root, inventory: planted, exists: existsSync, read: readFileSync, ...overrides });
  } catch (error) {
    threw = error;
  }
  if (threw) {
    console.log(`RED   (correct): ${description}\n        -> ${threw.message.split('\n')[1]?.trim() ?? threw.message}`);
  } else {
    console.error(`GREEN (WRONG):  ${description}, the guard accepted a lie`);
    failures += 1;
  }
}

/* Kept apart from the list above because it is the only case that mutates the exported map, and
 * it must be put back whatever happens. It proves the guard fails closed on a proof it cannot
 * interpret rather than skipping the observation and reporting clean. */
{
  const proof = operationProofs['windows-console.unlock-ladder'];
  const original = proof.observations.rung;
  proof.observations.rung = 'a-shape-nobody-wrote';
  let threw = null;
  try {
    verifyOperatedInteractionEvidence({ root, inventory });
  } catch (error) {
    threw = error;
  } finally {
    proof.observations.rung = original;
  }
  if (threw) {
    console.log(`RED   (correct): a proof names a shape the guard cannot check\n        -> ${threw.message.split('\n')[1]?.trim()}`);
  } else {
    console.error('GREEN (WRONG):  a proof names a shape the guard cannot check, it was skipped silently');
    failures += 1;
  }
}

try {
  const summary = verifyOperatedInteractionEvidence({ root, inventory });
  console.log(`GREEN (correct): the untouched evidence passes, ${summary.checkedRows} verified rows, ${summary.checkedObservations} observations.`);
} catch (error) {
  console.error(`RED (WRONG): the honest, untouched evidence was refused: ${error.message}`);
  failures += 1;
}

if (failures > 0) {
  console.error(`\nFAIL: ${failures} case(s) behaved backwards.`);
  process.exit(1);
}
console.log(`\nPASS: ${cases.length + 1} planted lies refused, honest evidence accepted.`);
