#!/usr/bin/env node
/**
 * Build a navigable contact-sheet index from promoted evidence.
 *
 * This is an evidence reader, not a capture tool. It reads only the
 * commit-addressed promotion root, verifies every referenced image and receipt,
 * and writes an HTML index plus a machine-readable summary. It never reads the
 * raw Lowlevel run root and never invents a missing capture.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';

const repositoryRoot = resolve(import.meta.dirname, '..', '..');

function argument(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function requireFile(path, label) {
  if (!existsSync(path)) throw new Error(`contact sheet refused: ${label} is missing`);
}

function generateIndex() {
  const promotionIndexArgument = argument('--promotion-index');
  const outputArgument = argument('--output');
  if (!promotionIndexArgument || !outputArgument) throw new Error('contact sheet requires --promotion-index and --output');
const promotionIndex = resolve(promotionIndexArgument);
  const outputHtml = resolve(outputArgument);
  const data = JSON.parse(readFileSync(promotionIndex, 'utf8'));
  if (data.schemaVersion !== 1 || data.status !== 'promoted') throw new Error('contact sheet requires a version-1 promoted index');
  if (!Array.isArray(data.rows) || data.rows.length !== 10551) throw new Error('contact sheet requires all 10551 promoted rows');
  const seen = new Set();
  const cards = [];
  const summaries = [];
  for (const row of data.rows) {
    if (seen.has(row.rowId)) throw new Error(`contact sheet refused duplicate row ${row.rowId}`);
    seen.add(row.rowId);
    const before = resolve(dirname(promotionIndex), row.captures.before.path);
    const after = resolve(dirname(promotionIndex), row.captures.after.path);
    requireFile(before, `${row.rowId} before capture`);
    requireFile(after, `${row.rowId} after capture`);
    if (sha256(before) !== row.captures.before.sha256 || sha256(after) !== row.captures.after.sha256) {
      throw new Error(`contact sheet refused stale or modified capture ${row.rowId}`);
    }
    if (row.beforeReview?.metadataTypes?.length || row.afterReview?.metadataTypes?.length) {
      throw new Error(`contact sheet refused metadata-bearing capture ${row.rowId}`);
    }
    if (!row.comparisonPath || !row.visualDiffPath) {
      throw new Error(`contact sheet refused incomplete visual evidence mapping ${row.rowId}`);
    }
    const diffPath = row.visualDiffPath.startsWith('console/') ? resolve(repositoryRoot, row.visualDiffPath) : resolve(dirname(promotionIndex), row.visualDiffPath);
    requireFile(diffPath, `${row.rowId} visual diff`);
    const diff = JSON.parse(readFileSync(diffPath, 'utf8'));
    if (diff.schemaVersion !== 1 || diff.status !== 'reviewed' || diff.integratedCommit !== data.integratedCommit || diff.coverage !== 'all-rows' || !Array.isArray(diff.comparedRowIds) || !/^[0-9a-f]{64}$/iu.test(diff.referenceSha256 ?? '') || !/^[0-9a-f]{64}$/iu.test(diff.builtSha256 ?? '') || !/^[0-9a-f]{64}$/iu.test(diff.diffSha256 ?? '')) throw new Error(`contact sheet refused unreviewed visual diff ${row.rowId}`);
    const beforeSrc = before.replaceAll('\\', '/').split('/').slice(-2).join('/');
    const afterSrc = after.replaceAll('\\', '/').split('/').slice(-2).join('/');
    cards.push(`<article id="${escapeHtml(row.rowId)}"><h3>${escapeHtml(row.rowId)}</h3><p>${escapeHtml(row.altText)}</p><div class="pair"><figure><img src="${escapeHtml(beforeSrc)}" alt="${escapeHtml(row.altText)}, before action"><figcaption>Before</figcaption></figure><figure><img src="${escapeHtml(afterSrc)}" alt="${escapeHtml(row.altText)}, after action"><figcaption>After</figcaption></figure></div><p><a href="${escapeHtml(row.mappings.docs)}">Docs</a> · <a href="${escapeHtml(row.mappings.wiki)}">Wiki</a> · <a href="${escapeHtml(row.mappings.pages)}">Pages</a></p></article>`);
    summaries.push({ rowId: row.rowId, surfaceId: row.surfaceId, beforeSha256: row.captures.before.sha256, afterSha256: row.captures.after.sha256, altText: row.altText });
  }
  const html = `<!doctype html><meta charset="utf-8"><title>UI smoke evidence ${escapeHtml(data.integratedCommit)}</title><style>body{font-family:system-ui,sans-serif;background:#101510;color:#e5ebe3;margin:2rem}main{display:grid;gap:1rem}article{border:1px solid #4a5a44;border-radius:12px;padding:1rem;background:#192219}.pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem}figure{margin:0}img{display:block;width:100%;height:auto;border-radius:8px}figcaption{margin-top:.35rem;font-weight:600}@media(max-width:720px){.pair{grid-template-columns:1fr}}</style><h1>UI smoke evidence</h1><p>Integrated commit: <code>${escapeHtml(data.integratedCommit)}</code>. Promoted rows: ${data.rows.length}. Each image was hash-compared before this index was written.</p><main>${cards.join('\n')}</main>`;
  writeFileSync(outputHtml, `${html}\n`, 'utf8');
  const summaryPath = outputHtml.replace(/\.html?$/u, '.json');
  writeFileSync(summaryPath, `${JSON.stringify({ schemaVersion: 1, status: 'indexed', integratedCommit: data.integratedCommit, rowCount: summaries.length, rows: summaries }, null, 2)}\n`, 'utf8');
  return { rowCount: summaries.length, outputHtml, summaryPath };
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/generate-ui-smoke-contact-sheet.mjs')) {
  const result = generateIndex();
  console.log(`wrote contact-sheet index for ${result.rowCount} promoted rows`);
}
