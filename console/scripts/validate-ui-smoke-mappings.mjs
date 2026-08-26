#!/usr/bin/env node
/** Validate the committed repository, wiki, issue, and Pages evidence map. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadUiSmokeManifest } from './ui-smoke-manifest-loader.mjs';

const root = resolve(import.meta.dirname, '..', '..');
const inventoryRoot = resolve(root, 'console/inventories/ui-smoke');
const manifest = loadUiSmokeManifest();
const map = JSON.parse(readFileSync(resolve(inventoryRoot, 'docs-evidence-map.json'), 'utf8'));
const captureIndex = JSON.parse(readFileSync(resolve(inventoryRoot, 'capture-index.json'), 'utf8'));

function fail(message) { throw new Error(`UI smoke mapping invalid: ${message}`); }

export function validateMappings() {
  if (map.schemaVersion !== 2 || map.rawRunRootNotCommitted !== true) fail('mapping schema or raw root privacy drift');
  for (const key of ['repositoryDocs', 'wiki', 'issue', 'pages']) if (typeof map.mappings?.[key] !== 'string' || !map.mappings[key]) fail(`missing top-level ${key} mapping`);
  if (captureIndex.schemaVersion !== 2 || captureIndex.rawRunRootNotCommitted !== true) fail('capture index privacy drift');
  if (!Array.isArray(captureIndex.surfaces) || captureIndex.surfaces.length !== 143) fail('capture index surface count drift');
  const seen = new Set();
  for (const row of manifest.rows) {
    if (seen.has(row.id)) fail(`duplicate row ${row.id}`);
    seen.add(row.id);
    if (!row.promotion?.comparisonPath || !row.promotion?.visualDiffPath) fail(`${row.id} lacks comparison and visual diff mappings`);
    if (!row.promotion.canonicalRoot.startsWith('console/docs/evidence/ui-smoke/{integratedCommit}/')) fail(`${row.id} canonical path leaves the evidence root`);
    for (const mapping of ['docs', 'wiki', 'issue', 'pages']) if (typeof row.mappings?.[mapping] !== 'string' || !row.mappings[mapping]) fail(`${row.id} lacks ${mapping} mapping`);
  }
  if (seen.size !== 17127) fail('row mapping count drift');
  return { surfaceCount: captureIndex.surfaces.length, rowCount: seen.size, status: 'mapping-contract-valid-runtime-evidence-unrun' };
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/validate-ui-smoke-mappings.mjs')) { const result = validateMappings(); console.log(`PASS: ${result.surfaceCount} surfaces and ${result.rowCount} rows have canonical evidence mapping contracts; ${result.status}`); }
