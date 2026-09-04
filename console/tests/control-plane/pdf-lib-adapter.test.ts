import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { PdfLibExecutor, PdfLibInspector } from '../../control-plane/pdf-adapter.js';
import { executePdfOperationAtomic } from '../../control-plane/converter-pdf.js';
import type { PdfOperationPlan, PdfValidationExpectation } from '../../shared/converter.js';

async function pdfBytes(pageCount: number, title?: string): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  if (title) document.setTitle(title);
  for (let index = 0; index < pageCount; index += 1) document.addPage([200 + index, 300 + index]);
  return await document.save({ useObjectStreams: false });
}

function plan(request: PdfOperationPlan['request']): PdfOperationPlan {
  return {
    adapterId: 'pdf-toolkit',
    request,
    limits: { maxInputBytes: 64 * 1024 * 1024, maxOutputBytes: 64 * 1024 * 1024, timeoutMs: 30_000, memoryMb: 256, maxPages: 10_000, maxTemporaryBytes: 128 * 1024 * 1024 },
    disclosures: [],
  };
}

test('pdf-lib inspector reports pages and metadata without claiming encrypted or signed support', async () => {
  const root = await mkdtemp(join(tmpdir(), 'asterisk-pdf-lib-'));
  const path = join(root, 'source.pdf');
  try {
    await writeFile(path, await pdfBytes(2, 'Service fixture'));
    const result = await new PdfLibInspector().inspect(path);
    assert.equal(result.pageCount, 2);
    assert.equal(result.encrypted, false);
    assert.equal(result.signed, false);
    assert.equal(result.metadata.title, 'Service fixture');
    assert.equal(result.pageFingerprints.length, 2);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('pdf-lib executor supports split, merge, extract, reorder, rotate, and metadata atomically', async () => {
  const root = await mkdtemp(join(tmpdir(), 'asterisk-pdf-lib-'));
  const sourceA = join(root, 'a.pdf'); const sourceB = join(root, 'b.pdf');
  try {
    await writeFile(sourceA, await pdfBytes(2)); await writeFile(sourceB, await pdfBytes(1));
    const executor = new PdfLibExecutor(); const inspector = new PdfLibInspector();
    const run = async (request: PdfOperationPlan['request'], name: string, expectation: PdfValidationExpectation = {}) => {
      const destination = join(root, name);
      await executePdfOperationAtomic(plan(request), destination, false, executor, inspector, expectation);
      return await inspector.inspect(destination);
    };
    assert.equal((await run({ operation: 'split', sourcePaths: [sourceA], ranges: [[2, 2]] }, 'split.pdf')).pageCount, 1);
    assert.equal((await run({ operation: 'merge', sourcePaths: [sourceA, sourceB] }, 'merge.pdf')).pageCount, 3);
    assert.equal((await run({ operation: 'extract', sourcePaths: [sourceA], pages: [1] }, 'extract.pdf')).pageCount, 1);
    assert.equal((await run({ operation: 'reorder', sourcePaths: [sourceA], pageOrder: [2, 1] }, 'reorder.pdf')).pageCount, 2);
    const rotated = await run({ operation: 'rotate', sourcePaths: [sourceA], pages: [2], degrees: 90 }, 'rotate.pdf');
    assert.deepEqual(rotated.rotations, [0, 90]);
    const metadata = await run({ operation: 'metadata', sourcePaths: [sourceA], metadata: { title: 'Updated fixture', author: 'Service test' } }, 'metadata.pdf');
    assert.equal(metadata.metadata.title, 'Updated fixture');
    assert.equal(metadata.metadata.author, 'Service test');
    assert.ok((await readFile(join(root, 'metadata.pdf'))).byteLength > 0);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('encrypted and signed capability facts are explicit and modifying signed input is refused', async () => {
  const root = await mkdtemp(join(tmpdir(), 'asterisk-pdf-lib-'));
  const encryptedPath = join(root, 'encrypted.pdf'); const signedPath = join(root, 'signed.pdf');
  try {
    await writeFile(encryptedPath, '%PDF-1.7\n/Encrypt << /Filter /Standard >>', 'ascii');
    const inspector = new PdfLibInspector();
    const encryptedResult = await inspector.inspect(encryptedPath);
    assert.equal(encryptedResult.encrypted, true);
    assert.match(encryptedResult.opaqueCapabilities[0] ?? '', /encrypted/u);
    const signedBytes = Buffer.concat([Buffer.from(await pdfBytes(1)), Buffer.from('\n/ByteRange [0 1 2 3]\n', 'ascii')]);
    await writeFile(signedPath, signedBytes);
    const signedResult = await inspector.inspect(signedPath);
    assert.equal(signedResult.signed, true);
    await assert.rejects(
      new PdfLibExecutor().execute(plan({ operation: 'merge', sourcePaths: [signedPath, signedPath] }), join(root, 'out.pdf')),
      /Signed PDF input cannot be modified/u,
    );
  } finally { await rm(root, { recursive: true, force: true }); }
});
