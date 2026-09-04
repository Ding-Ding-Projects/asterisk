import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertLaunchReceipt,
  assertPromotableEvidence,
  boundedEvaluation,
  proveSingleCDPTarget,
  validateClickEvidence,
  validateLaunchReceipt,
  validateCommittedLedger,
  verifyCaptureLedger,
} from '../../scripts/ui-drive/evidence-contract.mjs';

const CANDIDATE = '0123456789abcdef0123456789abcdef01234567';
const ARTIFACT = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
const RECEIPT = {
  version: 1,
  desktop: 'task-evidence-desktop',
  pid: 4812,
  process: {
    pid: 4812,
    creationDate: '20260831010203.000000-240',
    executablePath: 'C:/Build/Ding-PBX-Console.exe',
  },
  runRoot: 'C:/Temp/evidence-run',
  outputRoot: 'C:/Temp/evidence-run/output',
  cleaned: false,
  cdp: { port: 9555, expectedUrl: 'file:///C:/Build/console.html' },
};

const TARGET = {
  type: 'page',
  url: 'file:///C:/Build/console.html',
  webSocketDebuggerUrl: 'ws://127.0.0.1:9555/devtools/page/one',
};

const RECORD = {
  schemaVersion: 1,
  status: 'verified',
  featureId: 'regex-builder',
  candidateSha: CANDIDATE,
  artifact: 'console/release/lap-saps/Ding-PBX-Console.exe',
  artifactSha256: ARTIFACT,
  launchReceiptPath: 'console/release/evidence/ui-drive/launch-receipt.json',
  launchReceiptSha256: ARTIFACT,
  targetProof: { targetCount: 1, type: 'page', exactUrl: true, loopbackSocket: true },
  staleness: { checked: true, stale: false },
  currentness: { checked: true, candidateSha: CANDIDATE, artifactSha256: ARTIFACT },
  interaction: {
    action: 'opened the regex builder from the originating search field',
    accessibleName: 'Open regex builder',
    accessibleNameSource: 'aria-label',
    preState: { heading: 'Endpoints', inputs: 1, panel: false },
    postState: { heading: 'Endpoints', inputs: 4, panel: true },
    changed: true,
  },
  capture: {
    path: 'console/release/captures/ui-drive/regex-builder.png',
    bytes: 2048,
    sha256: ARTIFACT,
  },
  viewport: { width: 1440, height: 922 },
  scale: 1,
  theme: 'dark',
  privacy: {
    secretPayloadRecorded: false,
    privatePayloadValuesRecorded: false,
    verdict: 'pass',
    networkCalls: 0,
  },
};

test('proveSingleCDPTarget requires one exact page target and a loopback socket', () => {
  assert.deepEqual(proveSingleCDPTarget([TARGET], { port: 9555, expectedUrl: RECEIPT.cdp.expectedUrl }), {
    targetCount: 1, type: 'page', exactUrl: true, loopbackSocket: true,
  });
  for (const targets of [[TARGET, TARGET], [], [{ ...TARGET, type: 'service_worker' }]]) {
    assert.throws(() => proveSingleCDPTarget(targets, { port: 9555, expectedUrl: RECEIPT.cdp.expectedUrl }), /isolation refused/u);
  }
  assert.throws(() => proveSingleCDPTarget([{ ...TARGET, url: 'file:///C:/private?token=should-not-appear' }], { port: 9555, expectedUrl: RECEIPT.cdp.expectedUrl }), /isolation refused/u);
  assert.throws(() => proveSingleCDPTarget([{ ...TARGET, webSocketDebuggerUrl: 'ws://192.0.2.1:9555/devtools/page/one' }], { port: 9555, expectedUrl: RECEIPT.cdp.expectedUrl }), /loopback/u);
});

test('launch receipts are bound to the requested process, CDP port, and exact URL', () => {
  assert.doesNotThrow(() => assertLaunchReceipt(RECEIPT, { port: 9555, expectedUrl: RECEIPT.cdp.expectedUrl }));
  assert.match(validateLaunchReceipt({ ...RECEIPT, cleaned: true }).join('; '), /already cleaned/u);
  assert.match(validateLaunchReceipt({ ...RECEIPT, pid: 7, process: { ...RECEIPT.process, pid: 4812 } }).join('; '), /match pid/u);
  assert.match(validateLaunchReceipt(RECEIPT, { port: 9556 }).join('; '), /port/u);
  assert.throws(() => assertLaunchReceipt({ ...RECEIPT, cdp: { ...RECEIPT.cdp, expectedUrl: 'https://user:password@example.test/' } }), /credentials/u);
});

test('evaluation results have a bounded synchronous serialisation', () => {
  assert.deepEqual(boundedEvaluation({ ok: true }), { value: { ok: true }, bytes: 11 });
  assert.throws(() => boundedEvaluation('x'.repeat(2048), 1024), /exceeds/u);
  assert.throws(() => boundedEvaluation(undefined), /undefined/u);
});

test('click evidence binds semantic states, accessible names, captures, provenance, and privacy', () => {
  const options = { candidateSha: CANDIDATE, artifactSha256: ARTIFACT, receipt: RECEIPT, receiptSha256: ARTIFACT, targetProof: RECORD.targetProof };
  assert.deepEqual(validateClickEvidence(RECORD, options), []);
  assert.doesNotThrow(() => assertPromotableEvidence(RECORD, options));

  const breaks = [
    ['candidate', { candidateSha: 'f'.repeat(40) }, /current candidate/u],
    ['artifact', { artifactSha256: '0'.repeat(64) }, /packaged output/u],
    ['receipt path', { launchReceiptPath: 'C:/private/receipt.json' }, /launchReceiptPath/u],
    ['target proof', { targetProof: { targetCount: 2 } }, /target proof/u],
    ['accessible name', { interaction: { ...RECORD.interaction, accessibleName: '' } }, /accessible name/u],
    ['pre state', { interaction: { ...RECORD.interaction, preState: null } }, /preState/u],
    ['capture path', { capture: { ...RECORD.capture, path: 'console/tmp/capture.png' } }, /capture path/u],
    ['viewport', { viewport: { width: 0, height: 0 } }, /viewport/u],
    ['staleness', { staleness: { checked: true, stale: true } }, /staleness/u],
    ['currentness', { currentness: { checked: true, candidateSha: 'f'.repeat(40), artifactSha256: ARTIFACT } }, /currentness/u],
    ['privacy', { privacy: { ...RECORD.privacy, verdict: 'unknown' } }, /privacy verdict/u],
    ['payload', { interaction: { ...RECORD.interaction, password: 'plain-value' } }, /private value/u],
    ['base32 payload', { interaction: { ...RECORD.interaction, note: 'AB234567AB234567AB234567AB' } }, /base32 payload/u],
  ];
  for (const [name, change, expected] of breaks) {
    const problems = validateClickEvidence({ ...RECORD, ...change }, options);
    assert.ok(problems.some((problem) => expected.test(problem)), `${name} was accepted: ${problems.join('; ')}`);
  }
  assert.throws(() => assertPromotableEvidence({ ...RECORD, status: 'unverified' }, options), /status/u);
});

test('the committed UI-drive ledger keeps capture paths relative and refuses legacy absolute paths', () => {
  const root = resolve(import.meta.dirname, '..', '..', '..');
  const ledger = JSON.parse(readFileSync(resolve(root, 'console/release/evidence/ui-drive/ledger.json'), 'utf8'));
  assert.equal(ledger.capturePathPolicy, 'repository-relative durable capture paths only');
  assert.equal(ledger.privacy?.verdict, 'pass');
  assert.ok(Array.isArray(ledger.ledger) && ledger.ledger.length > 0, 'the ledger must not pass with no click records');
  for (const entry of ledger.ledger) {
    if (!entry.capture) continue;
    assert.match(entry.capture.path, /^console\/release\/captures\/ui-drive\//u);
    assert.doesNotMatch(entry.capture.path, /^[A-Za-z]:[\\/]/u);
    assert.doesNotMatch(entry.capture.path, /AppData|Users|Temp/iu);
  }
  assert.deepEqual(verifyCaptureLedger(ledger, { root }), []);
});

test('verifyCaptureLedger rejects a missing, replaced, duplicated, or orphaned picture', () => {
  const honest = {
    ledger: [
      { capture: { path: 'console/release/captures/ui-drive/a.png', bytes: 3, sha256: '039058c6f2c0cb492c533b0a4d14ef9778f6a3f7f7f9f9d5f1f5f4f5f6f7f8f9' } },
    ],
  };
  const files = new Map([['C:/root/console/release/captures/ui-drive/a.png', Buffer.from('abc')]]);
  const key = (path) => String(path).replaceAll('\\', '/');
  const read = (path) => files.get(key(path));
  const exists = (path) => files.has(key(path));
  const list = () => ['a.png'];
  const digest = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
  honest.ledger[0].capture.sha256 = digest;
  assert.deepEqual(verifyCaptureLedger(honest, { root: 'C:/root', exists, read, list }), []);
  assert.match(verifyCaptureLedger({ ledger: [{ capture: { ...honest.ledger[0].capture, path: 'C:/private/a.png' } }] }, { root: 'C:/root', exists, read, list }).join('; '), /non-relative/u);
  assert.match(verifyCaptureLedger({ ledger: [{ capture: { ...honest.ledger[0].capture, sha256: '0'.repeat(64) } }] }, { root: 'C:/root', exists, read, list }).join('; '), /digest mismatch/u);
  assert.match(verifyCaptureLedger(honest, { root: 'C:/root', exists: () => false, read, list }).join('; '), /missing capture/u);
  assert.match(verifyCaptureLedger({ ledger: [honest.ledger[0], honest.ledger[0]] }, { root: 'C:/root', exists, read, list }).join('; '), /repeats capture/u);
  assert.match(verifyCaptureLedger(honest, { root: 'C:/root', exists, read, list: () => ['a.png', 'orphan.png'], requireNoOrphans: true }).join('; '), /unreferenced/u);
});

test('committed-ledger promotion is refused for null, stale, unknown, or private evidence', () => {
  const capturePath = 'console/release/captures/ui-drive/a.png';
  const digest = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
  const evidence = {
    ...RECORD,
    status: 'verified',
    capture: { path: capturePath, bytes: 3, sha256: digest },
  };
  const ledger = {
    schemaVersion: 2,
    capturePathPolicy: 'repository-relative durable capture paths only',
    candidateSha: CANDIDATE,
    artifact: RECORD.artifact,
    artifactSha256: ARTIFACT,
    receiptPath: RECORD.launchReceiptPath,
    receiptSha256: ARTIFACT,
    targetProof: RECORD.targetProof,
    viewport: RECORD.viewport,
    scale: RECORD.scale,
    theme: 'dark',
    staleness: { checked: true, stale: false },
    currentness: { checked: true, candidateSha: CANDIDATE, artifactSha256: ARTIFACT },
    privacy: { secretPayloadRecorded: false, privatePayloadValuesRecorded: false, verdict: 'pass', networkCalls: 0 },
    ledger: [{ destination: 'Regex builder', target: evidence.interaction, before: {}, after: {}, changed: true, capture: evidence.capture, evidence }],
  };
  const files = new Map([['C:/root/console/release/captures/ui-drive/a.png', Buffer.from('abc')]]);
  const key = (path) => String(path).replaceAll('\\', '/');
  const fsOptions = { root: 'C:/root', exists: (path) => files.has(key(path)), read: (path) => files.get(key(path)), list: () => ['a.png'] };
  const validOptions = { receipt: RECEIPT, candidateSha: CANDIDATE, artifactSha256: ARTIFACT, receiptSha256: ARTIFACT, targetProof: RECORD.targetProof, theme: 'dark', ...fsOptions };
  assert.equal(validateCommittedLedger(ledger, validOptions).verdict, 'verified');

  const cases = [
    ['null candidate', { candidateSha: null }, /candidate SHA/u],
    ['null packaged output', { artifactSha256: null }, /packaged output SHA/u],
    ['null receipt', { receipt: null }, /receipt/u],
    ['missing exact target proof', { targetProof: null }, /single-target proof/u],
    ['unknown theme', { theme: 'solarized' }, /theme/u],
    ['stale capture', { ledger: { ...ledger, staleness: { checked: true, stale: true } } }, /staleness/u],
    ['private payload', { ledger: { ...ledger, ledger: [{ ...ledger.ledger[0], evidence: { ...evidence, interaction: { ...evidence.interaction, password: 'plain-value' } } }] } }, /private value/u],
  ];
  for (const [name, change, expected] of cases) {
    const { ledger: changedLedger = ledger, ...optionChange } = change;
    const result = validateCommittedLedger(changedLedger, { ...validOptions, ...optionChange });
    assert.equal(result.verdict, 'refused', `${name} should not promote`);
    assert.ok(result.problems.some((problem) => expected.test(problem)), `${name} did not name the refusal: ${result.problems.join('; ')}`);
  }
});

test('the committed legacy ledger entry point returns a nonzero refusal verdict', () => {
  const root = resolve(import.meta.dirname, '..', '..', '..');
  const legacy = JSON.parse(readFileSync(resolve(root, 'console/release/evidence/ui-drive/ledger.json'), 'utf8'));
  const result = validateCommittedLedger(legacy, {
    root, receipt: null, candidateSha: null, artifactSha256: null, receiptSha256: null, targetProof: null, theme: null,
  });
  assert.equal(result.verdict, 'refused');
  assert.ok(result.problems.some((problem) => /schemaVersion|candidate SHA|receipt/u.test(problem)));
});
