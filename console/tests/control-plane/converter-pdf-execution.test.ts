import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { executePdfOperationAtomic, validatePdfOperationRequest } from '../../control-plane/converter-pdf.js';

test('PDF request validation rejects unsafe shapes before an executor is called', () => {
  assert.throws(() => validatePdfOperationRequest({ operation: 'merge', sourcePaths: ['relative.pdf', 'other.pdf'] }), /absolute/u);
  assert.throws(() => validatePdfOperationRequest({ operation: 'reorder', sourcePaths: ['C:\\one.pdf'], pageOrder: [1, 1] }), /repeat/u);
  assert.throws(() => validatePdfOperationRequest({ operation: 'rotate', sourcePaths: ['C:\\one.pdf'], pages: [1], degrees: 45 as never }), /90, 180, or 270/u);
});

test('PDF execution writes through a temporary path and independently validates before replacement', async () => {
  const root = await mkdtemp(join(tmpdir(), 'asterisk-pdf-'));
  const sourceA = join(root, 'one.pdf');
  const sourceB = join(root, 'two.pdf');
  const destination = join(root, 'merged.pdf');
  try {
    await writeFile(sourceA, '%PDF-1.7\nsource-one', 'ascii');
    await writeFile(sourceB, '%PDF-1.7\nsource-two', 'ascii');
    let executorCalls = 0;
    const result = await executePdfOperationAtomic(
      {
        adapterId: 'pdf-toolkit',
        request: { operation: 'merge', sourcePaths: [sourceA, sourceB] },
        limits: { maxInputBytes: 1024, maxOutputBytes: 1024, timeoutMs: 1000, memoryMb: 16, maxTemporaryBytes: 4096 },
        disclosures: [],
      },
      destination,
      false,
      { adapterId: 'pdf-toolkit', execute: async (_plan, temporaryPath) => { executorCalls += 1; await writeFile(temporaryPath, '%PDF-1.7\nmerged', 'ascii'); } },
      { inspectorId: 'independent-inspector', inspect: async () => ({ pageCount: 1, rotations: [0], pageFingerprints: ['merged'], metadata: {}, encrypted: false, signed: false, opaqueCapabilities: [] }) },
      { pageCount: 1, pageFingerprints: ['merged'], rotations: [0] },
    );
    assert.equal(executorCalls, 1);
    assert.equal(result.pageCount, 1);
    assert.equal(await readFile(destination, 'utf8'), '%PDF-1.7\nmerged');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
