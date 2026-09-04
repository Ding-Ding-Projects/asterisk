import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import {
  captureTuplesEqual,
  normalizeCaptureTuple,
  strictParityEvidence,
  validateEvidenceProvenance,
  validateTransientStateCoverage,
} from '../../scripts/design-parity-contract.mjs';
import { parseCaptureTuple, referenceRouteFor } from '../../scripts/design-parity-capture.mjs';
import { verifyDesignParityEvidence } from '../../scripts/design-parity-evidence-on-disk.mjs';
import { verifyCapturedParityEvidence } from '../../scripts/design-parity-captures-on-disk.mjs';

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

test('schema-v2 capture guard binds region and chrome records to raw capture hashes', () => {
  const id = 'dash';
  const commit = 'a'.repeat(40);
  const pngBytes = Buffer.from('png');
  const hash = createHash('sha256').update(pngBytes).digest('hex');
  const entry = {
    id,
    state: tuple.state,
    tuple,
    referenceCapture: 'reference.png',
    builtCapture: 'built.png',
    sideBySide: 'side.png',
    visualDiff: 'diff.json',
    regionLedger: 'regions.json',
    chromeParity: 'chrome.json',
    materialAudit: 'material.json',
  };
  const v2 = {
    ...inventory,
    captureContract: { ...inventory.captureContract, transientStateFamilies: ['default'] },
    evidenceTemplates: {
      referenceCapture: 'reference.png', builtCapture: 'built.png', sideBySide: 'side.png',
      visualDiff: 'diff.json', regionLedger: 'regions.json', chromeParity: 'chrome.json', materialAudit: 'material.json',
    },
    destinations: [{ id, status: 'compiled' }],
  };
  const recordBase = { tuple, sourceCommit: commit, generatedBy: 'capture@2' };
  const regions = { ...recordBase, destinationId: id, bar: 'chrome-parity', exclusions: [{ x: 0, y: 0, width: 10, height: 10 }], comparedAreas: ['rail'], areas: { rail: { role: 'chrome' }, contentPane: { role: 'data' } } };
  const chrome = { ...recordBase, destinationId: id, bar: 'chrome-parity', verdict: 'match', dimensions: { reference: { width: tuple.width, height: tuple.height }, built: { width: tuple.width, height: tuple.height } }, diffPixelCount: 0, comparedFraction: 0.8, excluded: { rectangles: regions.exclusions }, paletteCheck: { thresholdExceeded: false }, stalenessCheck: { checked: true, stale: false }, referenceCapture: entry.referenceCapture, builtCapture: entry.builtCapture, regionLedger: entry.regionLedger, referenceCaptureSha256: hash, builtCaptureSha256: hash };
  const diff = { ...recordBase, destinationId: id, verdict: 'match', dimensions: { reference: { width: tuple.width, height: tuple.height }, built: { width: tuple.width, height: tuple.height } }, referenceCapture: entry.referenceCapture, builtCapture: entry.builtCapture, referenceCaptureSha256: hash, builtCaptureSha256: hash };
  const material = { ...recordBase, destinationId: id, conforms: true, defects: [] };
  const pathRecords = { 'regions.json': regions, 'chrome.json': chrome, 'diff.json': diff };
  const manifest = { destinations: [entry] };
  const ledger = (side) => ({ ...recordBase, side, results: [{ id, captured: true, bytes: pngBytes.length, sha256: hash }] });
  const runDiff = { ...recordBase, side: 'diff', results: [{ id, verdict: 'match' }] };
  const read = (path) => {
    const name = String(path).split(/[\\/]/).pop();
    if (pathRecords[name]) return JSON.stringify(pathRecords[name]);
    return pngBytes;
  };
  const evidence = { root: 'C:/fixture', manifest, inventory: v2, reference: ledger('reference'), built: ledger('built'), diff: runDiff, exists: () => true, read };
  assert.doesNotThrow(() => verifyCapturedParityEvidence(evidence));
  const badHash = { ...pathRecords, 'chrome.json': { ...chrome, builtCaptureSha256: '0'.repeat(64) } };
  assert.throws(() => verifyCapturedParityEvidence({ ...evidence, read: (path) => {
    const name = String(path).split(/[\\/]/).pop(); return badHash[name] ? JSON.stringify(badHash[name]) : read(path);
  } }), /builtCaptureSha256 does not match/);
});
