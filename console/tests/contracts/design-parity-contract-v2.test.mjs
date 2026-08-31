import assert from 'node:assert/strict';
import test from 'node:test';
import {
  captureTuplesEqual,
  normalizeCaptureTuple,
  strictParityEvidence,
  validateEvidenceProvenance,
  validateTransientStateCoverage,
} from '../../scripts/design-parity-contract.mjs';
import { parseCaptureTuple, referenceRouteFor } from '../../scripts/design-parity-capture.mjs';
import { verifyDesignParityEvidence } from '../../scripts/design-parity-evidence-on-disk.mjs';

const tuple = {
  state: 'default',
  theme: 'dark',
  width: 1440,
  height: 1000,
  scale: 1,
  locale: 'en-US',
  fixtureRevision: 'fixture-2026-08-31',
};

const inventory = {
  schemaVersion: 2,
  captureContract: { captureTuple: tuple, sourceCommit: 'a'.repeat(40), transientStateFamilies: ['paletteOpen', 'toastOpen'] },
};

test('normalizeCaptureTuple preserves optional locale and fixture identity while canonicalizing key order', () => {
  const reversed = { fixtureRevision: tuple.fixtureRevision, scale: 1, height: 1000, width: 1440, locale: 'en-US', theme: 'dark', state: 'default' };
  assert.deepEqual(normalizeCaptureTuple(reversed), normalizeCaptureTuple(tuple));
});

test('captureTuplesEqual refuses a state, viewport, scale, locale, or fixture mismatch', () => {
  for (const [key, value] of [['state', 'paletteOpen'], ['width', 1280], ['height', 800], ['scale', 1.5], ['locale', 'zh-Hant'], ['fixtureRevision', 'other']]) {
    const candidate = { ...tuple, [key]: value };
    assert.throws(() => captureTuplesEqual(tuple, candidate, `tuple ${key}`), /mismatch/);
  }
});

test('parseCaptureTuple and route generation preserve an explicit locale', () => {
  const parsed = parseCaptureTuple('destination=dash&theme=dark&locale=zh-Hant');
  assert.equal(parsed.locale, 'zh-Hant');
  const inventoryWithLocale = { evidenceTemplates: { referenceRoute: 'harness?destination={id}' } };
  assert.match(referenceRouteFor(inventoryWithLocale, 'dash', { ...tuple, locale: 'zh-Hant' }), /locale=zh-Hant/);
});

test('strictParityEvidence is opt-in for schema-v2 records and remains off for schema-v1', () => {
  assert.equal(strictParityEvidence(inventory), true);
  assert.equal(strictParityEvidence({ schemaVersion: 1 }), false);
  assert.equal(strictParityEvidence({ captureContract: { evidenceSchemaVersion: 2 } }), true);
});

test('validateEvidenceProvenance requires tuple, source commit, and generator provenance', () => {
  const record = { tuple, sourceCommit: 'a'.repeat(40), generatedBy: 'capture-tool@2' };
  assert.doesNotThrow(() => validateEvidenceProvenance(record, tuple, 'a'.repeat(40), 'record'));
  assert.throws(() => validateEvidenceProvenance({ ...record, tuple: { ...tuple, width: 1280 } }, tuple, 'a'.repeat(40), 'record'), /mismatch/);
  assert.throws(() => validateEvidenceProvenance({ ...record, sourceCommit: 'b'.repeat(40) }, tuple, 'a'.repeat(40), 'record'), /does not match/);
  assert.throws(() => validateEvidenceProvenance({ ...record, generatedBy: '' }, tuple, 'a'.repeat(40), 'record'), /generatedBy/);
});

test('validateTransientStateCoverage refuses a manifest that omits a declared state family', () => {
  const complete = { destinations: [{ id: 'dash', state: 'paletteOpen' }, { id: 'live', state: 'toastOpen' }] };
  assert.deepEqual(validateTransientStateCoverage(inventory, complete), { families: 2, covered: 2 });
  assert.throws(() => validateTransientStateCoverage(inventory, { destinations: [{ id: 'dash', state: 'paletteOpen' }] }), /toastOpen/);
  assert.throws(() => validateTransientStateCoverage({ captureContract: {} }, complete), /non-empty hand-written list/);
});

test('schema-v2 evidence guard refuses a derived record from a different tuple or commit', () => {
  const id = 'dash';
  const commit = 'a'.repeat(40);
  const v2 = {
    ...inventory,
    evidenceTemplates: {
      referenceCapture: 'reference.png', builtCapture: 'built.png', sideBySide: 'side.png',
      visualDiff: 'diff.json', regionLedger: 'regions.json', chromeParity: 'chrome.json', materialAudit: 'material.json',
    },
    chromeParityBar: { minimumComparedFraction: 0.25, areas: { contentPane: { role: 'data' }, rail: { role: 'chrome' } } },
    destinations: [{ id, status: 'verified' }],
  };
  const json = (value) => JSON.stringify(value);
  const records = {
    diff: json({ destinationId: id, tuple, sourceCommit: commit, generatedBy: 'capture@2', verdict: 'diff', paletteCheck: { thresholdExceeded: false }, stalenessCheck: { stale: false } }),
    regions: json({ destinationId: id, tuple, sourceCommit: commit, generatedBy: 'capture@2', exclusions: [{ x: 0, y: 0, width: 10, height: 10 }], comparedAreas: ['rail'], areas: { contentPane: { role: 'data' }, rail: { role: 'chrome' } } }),
    chrome: json({ destinationId: id, tuple, sourceCommit: commit, generatedBy: 'capture@2', bar: 'chrome-parity', verdict: 'match', diffPixelCount: 0, comparedFraction: 0.8, paletteCheck: { thresholdExceeded: false }, stalenessCheck: { checked: true, stale: false }, excluded: { rectangles: [{ x: 0, y: 0, width: 10, height: 10 }] } }),
    material: json({ destinationId: id, tuple, sourceCommit: commit, generatedBy: 'capture@2', conforms: true, defects: [] }),
  };
  const reader = (path) => {
    const name = String(path).split(/[\\/]/).pop();
    return records[name.replace('.json', '')] ?? 'png';
  };
  assert.doesNotThrow(() => verifyDesignParityEvidence(v2, { root: 'C:/fixture', exists: () => true, read: reader }));
  const wrongTuple = { ...records, diff: json({ ...JSON.parse(records.diff), tuple: { ...tuple, width: 1280 } }) };
  assert.throws(() => verifyDesignParityEvidence(v2, { root: 'C:/fixture', exists: () => true, read: (path) => {
    const name = String(path).split(/[\\/]/).pop(); return wrongTuple[name.replace('.json', '')] ?? 'png';
  } }), /tuple mismatch/);
  const wrongCommit = { ...records, chrome: json({ ...JSON.parse(records.chrome), sourceCommit: 'b'.repeat(40) }) };
  assert.throws(() => verifyDesignParityEvidence(v2, { root: 'C:/fixture', exists: () => true, read: (path) => {
    const name = String(path).split(/[\\/]/).pop(); return wrongCommit[name.replace('.json', '')] ?? 'png';
  } }), /does not match candidate/);
});
