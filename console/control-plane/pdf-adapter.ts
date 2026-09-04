import { createHash } from 'node:crypto';
import { lstat, readFile, writeFile } from 'node:fs/promises';
import { PDFDocument, degrees, type PDFPage } from 'pdf-lib';
import type {
  PdfInspectResult,
  PdfOperationPlan,
} from '../shared/converter.js';
import type { PdfOperationExecutor, PdfOutputInspector } from './converter-pdf.js';

const MAX_PDF_BYTES = 64 * 1024 * 1024;
const MAX_PAGES = 10_000;

function abortIfNeeded(signal?: AbortSignal): void {
  if (signal?.aborted) {
    const error = new Error('PDF operation was cancelled.');
    error.name = 'AbortError';
    throw error;
  }
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function signed(bytes: Uint8Array): boolean {
  return /\/ByteRange\s*\[/u.test(new TextDecoder('latin1').decode(bytes));
}

function encrypted(bytes: Uint8Array): boolean {
  return /\/Encrypt(?:\s|\/|>>)/u.test(new TextDecoder('latin1').decode(bytes));
}

async function readPdf(path: string, signal?: AbortSignal): Promise<Uint8Array> {
  abortIfNeeded(signal);
  const info = await lstat(path);
  if (info.isSymbolicLink() || !info.isFile() || info.size === 0 || info.size > MAX_PDF_BYTES) {
    throw new Error(`PDF source must be a non-empty regular file of at most ${MAX_PDF_BYTES} bytes.`);
  }
  const bytes = new Uint8Array(await readFile(path));
  abortIfNeeded(signal);
  if (bytes.byteLength !== info.size) throw new Error('PDF source changed while it was being read.');
  return bytes;
}

async function loadPdf(bytes: Uint8Array): Promise<PDFDocument> {
  if (encrypted(bytes)) throw new Error('Encrypted PDF input is an opaque capability that pdf-lib cannot read or modify.');
  try {
    return await PDFDocument.load(bytes, { throwOnInvalidObject: true, ignoreEncryption: false });
  } catch (error) {
    throw new Error(`PDF bytes could not be parsed by the bundled pdf-lib adapter: ${error instanceof Error ? error.message : 'invalid PDF'}`);
  }
}

function pageFingerprint(page: PDFPage, index: number): string {
  return sha256(`${index}:${page.node.toString()}:${page.getWidth()}:${page.getHeight()}:${page.getRotation().angle}`);
}

function metadataValue(value: string | undefined): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export class PdfLibInspector implements PdfOutputInspector {
  readonly inspectorId = 'pdf-lib-independent-inspector';

  async inspect(path: string, signal?: AbortSignal): Promise<PdfInspectResult> {
    const bytes = await readPdf(path, signal);
    const isEncrypted = encrypted(bytes);
    const isSigned = signed(bytes);
    if (isEncrypted) {
      return { pageCount: 0, rotations: [], pageFingerprints: [], metadata: {}, encrypted: true, signed: isSigned, opaqueCapabilities: ['encrypted PDF page and metadata inspection is unavailable'] };
    }
    const document = await loadPdf(bytes);
    const pages = document.getPages();
    if (pages.length < 1 || pages.length > MAX_PAGES) throw new Error(`PDF page count must be between 1 and ${MAX_PAGES}.`);
    const metadata: Record<string, string> = {};
    const fields: ReadonlyArray<[string, string | undefined]> = [
      ['title', document.getTitle()], ['author', document.getAuthor()], ['subject', document.getSubject()],
      ['creator', document.getCreator()], ['producer', document.getProducer()], ['keywords', document.getKeywords()],
    ];
    for (const [key, value] of fields) { const normalized = metadataValue(value); if (normalized) metadata[key] = normalized; }
    return {
      pageCount: pages.length,
      rotations: pages.map(page => page.getRotation().angle),
      pageFingerprints: pages.map(pageFingerprint),
      metadata,
      encrypted: false,
      signed: isSigned,
      opaqueCapabilities: isSigned ? ['signature bytes cannot be preserved after a modifying PDF operation'] : [],
    };
  }
}

function copyMetadata(source: PDFDocument, destination: PDFDocument): void {
  const values: ReadonlyArray<[string, string | undefined]> = [
    ['title', source.getTitle()], ['author', source.getAuthor()], ['subject', source.getSubject()],
    ['creator', source.getCreator()], ['producer', source.getProducer()],
  ];
  for (const [key, value] of values) {
    if (value === undefined) continue;
    if (key === 'title') destination.setTitle(value);
    else if (key === 'author') destination.setAuthor(value);
    else if (key === 'subject') destination.setSubject(value);
    else if (key === 'creator') destination.setCreator(value);
    else destination.setProducer(value);
  }
  const keywords = source.getKeywords();
  if (keywords) destination.setKeywords(keywords.split(',').map(part => part.trim()).filter(Boolean));
}

async function copiedPages(source: PDFDocument, indices: readonly number[]): Promise<PDFDocument> {
  const output = await PDFDocument.create();
  copyMetadata(source, output);
  const pages = await output.copyPages(source, [...indices]);
  for (const page of pages) output.addPage(page);
  return output;
}

function pageIndices(count: number, pages: readonly number[]): number[] {
  if (pages.some(page => page < 1 || page > count)) throw new Error('PDF page numbers must refer to existing one-based pages.');
  return pages.map(page => page - 1);
}

export class PdfLibExecutor implements PdfOperationExecutor {
  readonly adapterId = 'pdf-toolkit';

  async execute(plan: PdfOperationPlan, temporaryOutputPath: string, signal?: AbortSignal): Promise<void> {
    abortIfNeeded(signal);
    const sourceBytes = await Promise.all(plan.request.sourcePaths.map(path => readPdf(path, signal)));
    if (sourceBytes.some(signed)) throw new Error('Signed PDF input cannot be modified because pdf-lib cannot preserve its signature bytes.');
    const documents = await Promise.all(sourceBytes.map(loadPdf));
    const first = documents[0]!;
    let output: PDFDocument;
    switch (plan.request.operation) {
      case 'inspect':
        output = await copiedPages(first, first.getPages().map((_page, index) => index));
        break;
      case 'split': {
        const ranges = plan.request.ranges;
        const indices: number[] = [];
        for (const [start, end] of ranges) indices.push(...pageIndices(first.getPageCount(), Array.from({ length: end - start + 1 }, (_value, index) => start + index)));
        output = await copiedPages(first, indices);
        break;
      }
      case 'merge': {
        output = await PDFDocument.create();
        for (const document of documents) {
          copyMetadata(document, output);
          const pages = await output.copyPages(document, document.getPages().map((_page, index) => index));
          for (const page of pages) output.addPage(page);
        }
        break;
      }
      case 'extract': output = await copiedPages(first, pageIndices(first.getPageCount(), plan.request.pages)); break;
      case 'reorder': output = await copiedPages(first, pageIndices(first.getPageCount(), plan.request.pageOrder)); break;
      case 'rotate': {
        output = await copiedPages(first, first.getPages().map((_page, index) => index));
        for (const pageNumber of plan.request.pages) {
          const page = output.getPage(pageNumber - 1);
          page.setRotation(degrees((page.getRotation().angle + plan.request.degrees) % 360));
        }
        break;
      }
      case 'metadata': {
        output = await copiedPages(first, first.getPages().map((_page, index) => index));
        const metadata = plan.request.metadata as Readonly<Record<string, string | null>>;
        for (const [key, value] of Object.entries(metadata)) {
          if (value !== null && value.length > 4_096) throw new Error(`PDF metadata value ${key} is too large.`);
          if (!['title', 'author', 'subject', 'creator', 'producer', 'keywords'].includes(key)) throw new Error(`PDF metadata field ${key} is unsupported by the bundled adapter.`);
          const text = value ?? '';
          if (key === 'title') output.setTitle(text); else if (key === 'author') output.setAuthor(text); else if (key === 'subject') output.setSubject(text); else if (key === 'creator') output.setCreator(text); else if (key === 'producer') output.setProducer(text); else output.setKeywords(text ? text.split(',').map(part => part.trim()).filter(Boolean) : []);
        }
        break;
      }
    }
    abortIfNeeded(signal);
    const bytes = await output.save({ useObjectStreams: false, addDefaultPage: false });
    if (bytes.byteLength === 0 || bytes.byteLength > plan.limits.maxOutputBytes) throw new Error(`PDF output exceeded the ${plan.limits.maxOutputBytes}-byte limit.`);
    await writeFile(temporaryOutputPath, bytes, { flag: 'wx', mode: 0o600 });
  }
}

export const PDF_LIB_RUNTIME = 'pdf-lib@1.17.1';
