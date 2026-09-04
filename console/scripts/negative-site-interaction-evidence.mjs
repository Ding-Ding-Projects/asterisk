#!/usr/bin/env node
/**
 * Deliberate red-then-green proof for site-interaction-evidence.mjs.
 *
 * That guard speaks for ten committed records and their pictures, none of which anyone is going
 * to check by hand, so it is exactly the kind of guard that can quietly stop guarding and still
 * print PASS. Each lie below is planted alone, against the real committed evidence, and must turn
 * it red; the untouched evidence must then turn it green. One at a time, because breaking three
 * things and seeing one failure proves only that something among them is watched.
 *
 * Nothing here writes to disk. The guard takes its own `exists`, `read` and `list`, so every
 * planted lie lives in memory and the committed records are never disturbed.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { verifySiteInteractionEvidence, drivenSiteRecords, REQUIRED_SOURCES } from './site-interaction-evidence.mjs';

const root = resolve(import.meta.dirname, '..', '..');
const inventory = JSON.parse(readFileSync(resolve(root, 'console/inventories/surface-completeness.json'), 'utf8'));
const registry = JSON.parse(readFileSync(resolve(root, 'console/site/feature-registry.json'), 'utf8'));
const directory = resolve(root, 'console/release/evidence/pages-site');
const recordPath = (id) => resolve(directory, `${id}.json`);
const readRecord = (id) => JSON.parse(readFileSync(recordPath(id), 'utf8'));

/** Rewrites one record's JSON on the way through the guard, leaving every other read alone. */
const rewriting = (id, mutate) => (candidate, encoding) => {
  if (candidate !== recordPath(id)) return readFileSync(candidate, encoding);
  const record = readRecord(id);
  mutate(record);
  return JSON.stringify(record, null, 2);
};

/** A registry with one feature's state changed, so "only an implemented feature may be driven" can be tested. */
const registryWith = (id, state) => ({
  ...registry,
  features: { ...registry.features, [id]: { ...registry.features[id], state } },
});

const victim = 'regex-builder';
const second = 'collapsible-filters';

const cases = [
  ['a record names a capture that is not there', () => ({
    exists: (candidate) => (candidate === resolve(root, readRecord(victim).capture) ? false : existsSync(candidate)),
  })],
  ['a capture has been replaced with different bytes', () => {
    const path = resolve(root, readRecord(victim).capture);
    return { read: (candidate, encoding) => (candidate === path ? Buffer.concat([readFileSync(candidate), Buffer.from('!')]) : readFileSync(candidate, encoding)) };
  }],
  ['a record claims a digest its capture does not have', () => ({
    read: rewriting(victim, (record) => { record.captureSha256 = '0'.repeat(64); }),
  })],
  ['a record claims a byte count its capture does not have', () => ({
    read: rewriting(victim, (record) => { record.captureBytes += 1; }),
  })],
  ['a record borrows another feature\'s picture', () => ({
    read: rewriting(victim, (record) => { record.capture = `console/release/captures/pages-site/${second}.png`; }),
  })],
  ['a record names no built page under console/site/dist', () => ({
    read: rewriting(victim, (record) => { record.artifact = 'console/site/settings.html'; }),
  })],
  ['a record gives no digest for the built page it was taken from', () => ({
    read: rewriting(victim, (record) => { record.artifactSha256 = 'not-a-digest'; }),
  })],
  ['a record no longer claims it inspected the real built site', () => ({
    read: rewriting(victim, (record) => { record.verification = 'read-the-source'; }),
  })],
  ['a record names a different feature than its own filename', () => ({
    read: rewriting(victim, (record) => { record.feature = 'something-else'; }),
  })],
  ['a record stops naming the element its capture claims to show', () => ({
    read: rewriting(victim, (record) => { delete record.subject; }),
  })],
  ['a record pins no digest for a tracked source', () => ({
    read: rewriting(victim, (record) => { record.sources = record.sources.filter((s) => s.path !== REQUIRED_SOURCES[0]); }),
  })],
  ['the site runtime has changed since the record was driven', () => ({
    read: rewriting(victim, (record) => {
      record.sources = record.sources.map((s) => (s.path === REQUIRED_SOURCES[0] ? { ...s, sha256: 'a'.repeat(64) } : s));
    }),
  })],
  ['a record exists for a feature the registry calls absent', () => ({
    registry: registryWith(victim, 'absent'),
  })],
  ['a record exists for a feature the registry only calls partial', () => ({
    registry: registryWith(victim, 'partial'),
  })],
  ['a driven record has stopped being written at all', () => ({
    list: (candidate) => readdirSync(candidate).filter((entry) => entry !== `${second}.json`),
    exists: (candidate) => (candidate === recordPath(second) ? false : existsSync(candidate)),
    read: (candidate, encoding) => {
      if (candidate === recordPath(second)) throw new Error('ENOENT: the record was removed for this case');
      return readFileSync(candidate, encoding);
    },
  })],
  ['a driven record dropped the observation that the setting survived a reload', () => ({
    read: rewriting('attention-modes', (record) => { delete record.interaction.survivedReload; }),
  })],
  ['a driven record dropped the observation that the history outlived a settings reset', () => ({
    read: rewriting('local-version-history', (record) => { delete record.interaction.historySurvivedSettingsReset; }),
  })],
  ['a driven record dropped the observation that no modal opened for a notification', () => ({
    read: rewriting('non-blocking-notifications', (record) => { delete record.interaction.noModalOpenedByTheNotification; }),
  })],
];

let failures = 0;
for (const [description, build] of cases) {
  const overrides = build();
  let threw = null;
  try {
    verifySiteInteractionEvidence({
      root, inventory, registry, exists: existsSync, read: readFileSync, list: readdirSync, ...overrides,
    });
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
  const summary = verifySiteInteractionEvidence({ root, inventory, registry });
  console.log(`GREEN (correct): the untouched evidence passes — ${summary.checked} records, ${summary.drivenRecords} driven.`);
} catch (error) {
  console.error(`RED (WRONG): the honest, untouched evidence was refused: ${error.message}`);
  failures += 1;
}

if (Object.keys(drivenSiteRecords).length === 0) {
  console.error('FAIL: the hand-written driven-record list is empty, so it guards nothing');
  failures += 1;
}

if (failures > 0) {
  console.error(`\nFAIL: ${failures} case(s) behaved backwards.`);
  process.exit(1);
}
console.log(`\nPASS: ${cases.length} planted lies refused, honest evidence accepted.`);
