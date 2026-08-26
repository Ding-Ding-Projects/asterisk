#!/usr/bin/env node
/**
 * Transactionally promote accepted evidence from an external raw run root.
 *
 * The raw root must be outside the repository. All inputs are validated before a
 * same-volume staged directory is atomically renamed into the commit-addressed
 * canonical directory. Existing canonical output is never overwritten.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { inflateSync } from 'node:zlib';
import { RECEIPT_ALLOWED_KEYS, validatePrivacyValue } from './ui-smoke-privacy.mjs';

const root = resolve(import.meta.dirname, '..', '..');
const manifestPath = resolve(root, 'console/inventories/ui-smoke/interaction-manifest.json');
const REQUIRED_RECEIPTS = ['interaction-receipt-v1.json', 'outcome-receipt-v1.json', 'privacy-receipt-v1.json', 'alt-text.json', 'pixel-review-receipt-v1.json', 'evidence-receipt-v1.json'];
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function argument(name) { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : null; }
function fail(message) { throw new Error(`promotion refused: ${message}`); }
function requireFile(path, label) { if (!existsSync(path)) fail(`${label} is missing`); return path; }
function sha256(path) { return createHash('sha256').update(readFileSync(path)).digest('hex'); }
function readJson(path, label) { requireFile(path, label); try { return JSON.parse(readFileSync(path, 'utf8')); } catch { fail(`${label} is not valid JSON`); } }
function assertSchema(value, label, required) { if (value?.schemaVersion !== 1) fail(`${label} must use schemaVersion 1`); for (const field of required) if (!(field in value)) fail(`${label} is missing ${field}`); }

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => { let value = index; for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? (0xEDB88320 ^ (value >>> 1)) : (value >>> 1); return value >>> 0; });
function crc32(bytes) { let value = 0xFFFFFFFF; for (const byte of bytes) value = CRC_TABLE[(value ^ byte) & 0xFF] ^ (value >>> 8); return (value ^ 0xFFFFFFFF) >>> 0; }
function unfilter(raw, width, height, bytesPerPixel, stride) {
  const output = Buffer.alloc(height * stride); let sourceOffset = 0;
  for (let row = 0; row < height; row += 1) {
    const filter = raw[sourceOffset++]; const start = row * stride; const prior = row ? start - stride : -1;
    for (let column = 0; column < stride; column += 1) {
      const left = column >= bytesPerPixel ? output[start + column - bytesPerPixel] : 0; const up = prior >= 0 ? output[prior + column] : 0; const upLeft = prior >= 0 && column >= bytesPerPixel ? output[prior + column - bytesPerPixel] : 0; const value = raw[sourceOffset++];
      output[start + column] = filter === 0 ? value : filter === 1 ? (value + left) & 0xFF : filter === 2 ? (value + up) & 0xFF : filter === 3 ? (value + Math.floor((left + up) / 2)) & 0xFF : filter === 4 ? (value + (Math.abs(left - up) <= Math.abs(up - upLeft) && Math.abs(left - up) <= Math.abs(left - upLeft) ? left : Math.abs(up - upLeft) <= Math.abs(left - upLeft) ? up : upLeft)) & 0xFF : (() => { throw new Error(`unsupported PNG filter ${filter}`); })();
    }
  }
  return output;
}
function inspectPng(path, label) {
  const bytes = readFileSync(path);
  if (!bytes.subarray(0, 8).equals(PNG_SIGNATURE)) fail(`${label} is not a PNG`);
  let offset = 8; let width = 0; let height = 0; let bitDepth = 0; let colourType = 0; let interlace = 0; let sawIhdr = false; let sawIend = false; const idat = []; let palette = null; let transparency = null; const metadataTypes = [];
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset); const type = bytes.subarray(offset + 4, offset + 8).toString('ascii'); const dataStart = offset + 8; const dataEnd = dataStart + length; const crcOffset = dataEnd;
    if (dataEnd + 4 > bytes.length) fail(`${label} has a truncated ${type} chunk`);
    const expectedCrc = bytes.readUInt32BE(crcOffset); const actualCrc = crc32(Buffer.concat([bytes.subarray(offset + 4, offset + 8), bytes.subarray(dataStart, dataEnd)])); if (expectedCrc !== actualCrc) fail(`${label} has a CRC mismatch in ${type}`);
    if (type === 'IHDR') { if (length !== 13) fail(`${label} has an invalid IHDR length`); width = bytes.readUInt32BE(dataStart); height = bytes.readUInt32BE(dataStart + 4); bitDepth = bytes[dataStart + 8]; colourType = bytes[dataStart + 9]; interlace = bytes[dataStart + 12]; sawIhdr = true; }
    else if (type === 'IDAT') idat.push(bytes.subarray(dataStart, dataEnd));
    else if (type === 'PLTE') palette = bytes.subarray(dataStart, dataEnd);
    else if (type === 'tRNS') transparency = bytes.subarray(dataStart, dataEnd);
    else if (['tEXt', 'iTXt', 'zTXt', 'eXIf', 'iCCP'].includes(type)) metadataTypes.push(type);
    if (type === 'IEND') { sawIend = true; offset = dataEnd + 4; break; }
    offset = dataEnd + 4;
  }
  if (!sawIhdr || !sawIend) fail(`${label} is missing IHDR or IEND`);
  if (offset !== bytes.length) fail(`${label} contains trailing bytes after IEND`);
  if (bitDepth !== 8 || interlace !== 0 || ![0, 2, 3, 4, 6].includes(colourType)) fail(`${label} uses an unsupported PNG encoding`);
  if (!width || !height || width > 10000 || height > 10000) fail(`${label} has invalid dimensions ${width}x${height}`);
  const channels = colourType === 6 ? 4 : colourType === 2 ? 3 : colourType === 4 ? 2 : 1; const stride = width * channels; const raw = inflateSync(Buffer.concat(idat)); const pixels = unfilter(raw, width, height, channels, stride); const rgba = Buffer.alloc(width * height * 4);
  for (let index = 0; index < width * height; index += 1) { const source = index * channels; const target = index * 4; if (colourType === 6) pixels.copy(rgba, target, source, source + 4); else if (colourType === 2) { pixels.copy(rgba, target, source, source + 3); rgba[target + 3] = 255; } else if (colourType === 4) { rgba[target] = pixels[source]; rgba[target + 1] = pixels[source]; rgba[target + 2] = pixels[source]; rgba[target + 3] = pixels[source + 1]; } else if (colourType === 0) { rgba[target] = pixels[source]; rgba[target + 1] = pixels[source]; rgba[target + 2] = pixels[source]; rgba[target + 3] = 255; } else { if (!palette || palette.length % 3) fail(`${label} palette is missing or malformed`); const paletteIndex = pixels[source]; if (paletteIndex * 3 + 2 >= palette.length) fail(`${label} palette index is out of range`); rgba[target] = palette[paletteIndex * 3]; rgba[target + 1] = palette[paletteIndex * 3 + 1]; rgba[target + 2] = palette[paletteIndex * 3 + 2]; rgba[target + 3] = transparency?.[paletteIndex] ?? 255; } }
  return { width, height, metadataTypes, bytes: bytes.byteLength, sha256: sha256(path), crcStatus: 'verified', iend: true, pixelSha256: createHash('sha256').update(rgba).digest('hex') };
}

function copyAndCompare(source, destination, label) {
  requireFile(source, label); mkdirSync(dirname(destination), { recursive: true }); copyFileSync(source, destination);
  const sourceHash = sha256(source); const destinationHash = sha256(destination);
  if (sourceHash !== destinationHash) fail(`${label} changed during promotion`);
  return { path: destination, sha256: destinationHash, bytes: readFileSync(destination).byteLength };
}

function assertSha(value, label) { if (typeof value !== 'string' || !/^[0-9a-f]{64}$/iu.test(value)) fail(`${label} must be a lowercase 64-hex SHA-256`); }
function assertCleanReceipt(receipt, row, sourceCommit, integratedCommit, rawRunRoot, name) {
  const requiredByName = {
    'interaction-receipt-v1.json': ['planId', 'rowId', 'sourceCommit', 'integratedCommit', 'inventoryDigest', 'runtimeIdentity', 'routeTuple', 'target', 'action', 'before', 'after', 'outcome', 'observablePredicate', 'status', 'redactionStatus'],
    'outcome-receipt-v1.json': ['planId', 'rowId', 'actionType', 'predicate', 'observed', 'observedAt', 'beforeSha256', 'afterSha256', 'status'],
    'privacy-receipt-v1.json': ['planId', 'rowId', 'sourceCommit', 'integratedCommit', 'runtimeIdentity', 'routeTuple', 'rawRunRootNotCommitted', 'networkRequests', 'targetIsolation', 'redactionStatus', 'redactedKeys'],
    'alt-text.json': ['rowId', 'before', 'after', 'state', 'targetName'],
    'pixel-review-receipt-v1.json': ['rowId', 'beforeWidth', 'beforeHeight', 'beforePixelSha256', 'afterWidth', 'afterHeight', 'afterPixelSha256', 'beforeMetadataTypes', 'afterMetadataTypes', 'pixelReviewStatus', 'reviewedAt'],
    'evidence-receipt-v1.json': ['rowId', 'integratedCommit', 'canonicalRoot', 'sourceSha256', 'destinationSha256', 'bytePreserving', 'comparisonPath', 'visualDiffPath'],
  };
  assertSchema(receipt, `${row.id} ${name}`, requiredByName[name] ?? ['rowId']);
  if (receipt.rowId !== row.id) fail(`${row.id} ${name} row id mismatch`);
  if (receipt.sourceCommit !== undefined && receipt.sourceCommit !== sourceCommit) fail(`${row.id} ${name} source commit stale`);
  if (receipt.integratedCommit !== undefined && receipt.integratedCommit !== integratedCommit) fail(`${row.id} ${name} integrated commit stale`);
  if (receipt.redactionStatus !== undefined && receipt.redactionStatus !== 'clean') fail(`${row.id} ${name} is not redaction-clean`);
  if (name === 'privacy-receipt-v1.json' && receipt.rawRunRootNotCommitted !== true) fail(`${row.id} privacy receipt does not prove the raw root stayed outside the repository`);
  if (name === 'evidence-receipt-v1.json') {
    if (receipt.canonicalRoot !== `console/docs/evidence/ui-smoke/${integratedCommit}/${row.surfaceId}/`) fail(`${row.id} evidence canonical root drift`);
    if (receipt.bytePreserving !== true) fail(`${row.id} evidence is not byte-preserving`);
    assertSha(receipt.sourceSha256, `${row.id} evidence sourceSha256`); assertSha(receipt.destinationSha256, `${row.id} evidence destinationSha256`);
    if (receipt.sourceSha256 !== receipt.destinationSha256) fail(`${row.id} evidence source and destination hashes differ`);
  }
  if (name === 'pixel-review-receipt-v1.json' && receipt.pixelReviewStatus !== 'reviewed') fail(`${row.id} pixel review is not reviewed`);
  try { validatePrivacyValue(receipt, { allowedKeys: RECEIPT_ALLOWED_KEYS, repositoryRoot: root, rawRunRoot }); } catch (error) { fail(`${row.id} ${name} privacy validation failed: ${error.message}`); }
}

function promote() {
  const rawArg = argument('--raw-root'); const integratedCommit = argument('--integrated-commit'); const sourceCommit = argument('--source-commit');
  const outputArg = argument('--output-root');
  if (!rawArg || !integratedCommit || !sourceCommit) fail('--raw-root, --integrated-commit, and --source-commit are required');
  if (!/^[0-9a-f]{7,64}$/u.test(integratedCommit) || !/^[0-9a-f]{7,64}$/u.test(sourceCommit)) fail('commit ids must be hexadecimal');
  const rawRoot = resolve(rawArg); const canonicalBase = resolve(root, 'console/docs/evidence/ui-smoke'); const outputRoot = resolve(outputArg ?? canonicalBase);
  if (outputRoot !== canonicalBase) fail(`canonical output root is fixed at ${canonicalBase}`);
  const relativeRaw = relative(root, rawRoot);
  if (relativeRaw === '' || (!relativeRaw.startsWith('..') && !relativeRaw.startsWith(`..${sep}`))) fail('rawRunRootNotCommitted requires the raw root to be outside the repository');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (manifest.schemaVersion !== 2 || manifest.rows?.length !== 10551) fail('reviewed manifest must be schemaVersion 2 with 10551 rows');
  const canonicalRoot = resolve(outputRoot, integratedCommit); const stageRoot = resolve(outputRoot, '.staging', `${integratedCommit}-${Date.now()}`);
  if (existsSync(canonicalRoot)) fail(`canonical output already exists at ${canonicalRoot}, refusing overwrite`);
  const prepared = []; const surfaces = new Map();
  try {
    for (const row of manifest.rows) {
      const surfaceDir = join(rawRoot, 'captures', row.surfaceId); const rawBefore = join(surfaceDir, `${row.id}-before.png`); const rawAfter = join(surfaceDir, `${row.id}-after.png`);
      const beforeReview = inspectPng(requireFile(rawBefore, `${row.id} before capture`), `${row.id} before capture`); const afterReview = inspectPng(requireFile(rawAfter, `${row.id} after capture`), `${row.id} after capture`);
      if (beforeReview.metadataTypes.length || afterReview.metadataTypes.length) fail(`${row.id} capture contains metadata chunks`);
      const rawReceiptDir = join(rawRoot, 'receipts', row.surfaceId); const receiptValues = {}; const receiptCopies = {};
      for (const name of REQUIRED_RECEIPTS) { const source = join(rawReceiptDir, `${row.id}-${name}`); const receipt = readJson(source, `${row.id} ${name}`); assertCleanReceipt(receipt, row, sourceCommit, integratedCommit, rawRoot, name); receiptValues[name] = receipt; receiptCopies[name] = { source: source, destination: join(stageRoot, row.surfaceId, `${row.id}-${name}`) }; }
      const interaction = receiptValues['interaction-receipt-v1.json']; const outcome = receiptValues['outcome-receipt-v1.json'];
      if (interaction.planId !== outcome.planId || interaction.rowId !== outcome.rowId || interaction.sourceCommit !== sourceCommit || interaction.integratedCommit !== integratedCommit) fail(`${row.id} receipt identity relation drift`);
      if (outcome.beforeSha256 !== interaction.before.sha256 || outcome.afterSha256 !== interaction.after.sha256) fail(`${row.id} outcome receipt capture hash relation drift`);
      const pixelReview = receiptValues['pixel-review-receipt-v1.json'];
      if (pixelReview.beforeWidth !== beforeReview.width || pixelReview.beforeHeight !== beforeReview.height || pixelReview.beforePixelSha256 !== beforeReview.pixelSha256 || pixelReview.afterWidth !== afterReview.width || pixelReview.afterHeight !== afterReview.height || pixelReview.afterPixelSha256 !== afterReview.pixelSha256 || pixelReview.beforeMetadataTypes.length !== 0 || pixelReview.afterMetadataTypes.length !== 0) fail(`${row.id} pixel review does not match the fully decoded PNGs`);
      const canonicalDir = join(stageRoot, row.surfaceId); const before = copyAndCompare(rawBefore, join(canonicalDir, `${row.id}-before.png`), `${row.id} before capture`); const after = copyAndCompare(rawAfter, join(canonicalDir, `${row.id}-after.png`), `${row.id} after capture`); for (const name of REQUIRED_RECEIPTS) receiptCopies[name] = copyAndCompare(receiptCopies[name].source, receiptCopies[name].destination, `${row.id} ${name}`);
      const promoted = { rowId: row.id, surfaceId: row.surfaceId, sourceCommit, integratedCommit, before, after, beforeReview, afterReview, receipts: receiptCopies, altText: row.captures.after.altText, promotionMetadata: { rawRunRootNotCommitted: true, canonicalRoot: `console/docs/evidence/ui-smoke/${integratedCommit}/${row.surfaceId}/`, bytePreserving: true }, comparisonPath: `console/docs/evidence/ui-smoke/${integratedCommit}/indexes/${row.surfaceId}-comparison.png`, visualDiffPath: `console/docs/evidence/ui-smoke/${integratedCommit}/diffs/${row.surfaceId}.json` };
      prepared.push(promoted); surfaces.set(row.surfaceId, row.surfaceId);
    }
    for (const surfaceId of surfaces.keys()) {
      const rawComparison = join(rawRoot, 'indexes', `${surfaceId}-comparison.png`); const rawDiff = join(rawRoot, 'diffs', `${surfaceId}.json`);
      const comparisonReview = inspectPng(requireFile(rawComparison, `${surfaceId} labelled comparison`), `${surfaceId} labelled comparison`); if (comparisonReview.metadataTypes.length) fail(`${surfaceId} comparison contains metadata chunks`);
      const diff = readJson(rawDiff, `${surfaceId} visual diff`); assertSchema(diff, `${surfaceId} visual diff`, manifest.visualDiffSchema.required); const expectedSurfaceRows = manifest.rows.filter((row) => row.surfaceId === surfaceId).map((row) => row.id).sort(); const actualDiffRows = [...(diff.comparedRowIds ?? [])].sort(); if (diff.surfaceId !== surfaceId || diff.integratedCommit !== integratedCommit || diff.status !== 'reviewed' || diff.coverage !== 'all-rows' || !/^[0-9a-f]{64}$/iu.test(diff.referenceSha256) || !/^[0-9a-f]{64}$/iu.test(diff.builtSha256) || !/^[0-9a-f]{64}$/iu.test(diff.diffSha256) || diff.referenceSha256 !== comparisonReview.sha256 || diff.diffSha256 !== sha256(rawDiff) || JSON.stringify(actualDiffRows) !== JSON.stringify(expectedSurfaceRows)) fail(`${surfaceId} visual diff is not content-bound to every row of the integrated commit`);
      copyAndCompare(rawComparison, join(stageRoot, 'indexes', `${surfaceId}-comparison.png`), `${surfaceId} labelled comparison`); copyAndCompare(rawDiff, join(stageRoot, 'diffs', `${surfaceId}.json`), `${surfaceId} visual diff`);
    }
    const index = { schemaVersion: 1, status: 'promoted', sourceManifest: 'console/inventories/ui-smoke/interaction-manifest.json', sourceCommit, integratedCommit, canonicalRoot: `console/docs/evidence/ui-smoke/${integratedCommit}/`, rawRunRootNotCommitted: true, bytePreserving: true, rowCount: prepared.length, rows: prepared, mappings: { docs: `console/docs/evidence/ui-smoke/${integratedCommit}/index.html`, wiki: `wiki/UI-smoke-evidence.md#${integratedCommit}`, issue: 'GitHub issue comment with one inline before and after pair per accepted row', pages: `console/site/documentation.html#ui-smoke-evidence-${integratedCommit}` } };
    const cards = prepared.map((row) => `<article id="${row.rowId}"><h3>${row.rowId}</h3><p>${row.altText}</p><img src="${row.surfaceId}/${row.rowId}-before.png" alt="${row.altText}, before"><img src="${row.surfaceId}/${row.rowId}-after.png" alt="${row.altText}, after with receipt"></article>`).join('\n');
    writeFileSync(join(stageRoot, 'index.html'), `<!doctype html><meta charset="utf-8"><title>UI smoke evidence ${integratedCommit}</title><h1>UI smoke evidence</h1><p>Integrated commit: <code>${integratedCommit}</code>. Promoted rows: ${prepared.length}.</p>${cards}\n`, 'utf8');
    writeFileSync(join(stageRoot, 'promotion-index-v1.json'), `${JSON.stringify(index, null, 2)}\n`, 'utf8');
    mkdirSync(dirname(canonicalRoot), { recursive: true }); renameSync(stageRoot, canonicalRoot);
    return index;
  } catch (error) { if (existsSync(stageRoot)) rmSync(stageRoot, { recursive: true, force: true }); throw error; }
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/promote-ui-smoke-evidence.mjs')) { const result = promote(); console.log(`promoted ${result.rowCount} accepted rows into ${result.canonicalRoot}`); }
