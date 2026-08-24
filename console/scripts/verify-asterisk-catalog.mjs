#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', '..');

export function validateAsteriskCatalog(catalog, inventory, files = new Set()) {
  if (catalog?.schemaVersion !== 1) throw new Error('Asterisk catalogue schemaVersion 1 required');
  if (!Array.isArray(catalog.modules) || !Array.isArray(catalog.resources) || !Array.isArray(catalog.apiResources)) throw new Error('Asterisk catalogue modules, resources and ARI resource arrays required');
  if (!Array.isArray(inventory?.sourceFamilies) || inventory.sourceFamilies.length !== 12) throw new Error('Asterisk catalogue family inventory must list all 12 source families');
  const actualFamilies = new Set(catalog.modules.map((entry) => entry.family));
  for (const family of inventory.sourceFamilies) if (!actualFamilies.has(family)) throw new Error(`Asterisk catalogue missing source family '${family}'`);
  const ids = [...catalog.modules, ...catalog.resources, ...catalog.apiResources].map((entry) => entry.id);
  if (new Set(ids).size !== ids.length) throw new Error('Asterisk catalogue identifiers must be unique');
  if (catalog.counts?.modules !== catalog.modules.length || catalog.counts?.resources !== catalog.resources.length || catalog.counts?.apiResources !== catalog.apiResources.length) throw new Error('Asterisk catalogue counts drift');
  if (catalog.counts.modules !== inventory.expectedCounts?.modules || catalog.counts.resources !== inventory.expectedCounts?.resources || catalog.counts.apiResources !== inventory.expectedCounts?.apiResources) throw new Error('Asterisk catalogue hand-written expected counts drift');
  for (const entry of [...catalog.modules, ...catalog.resources, ...catalog.apiResources]) {
    if (!entry.id || !entry.source || !entry.description || !entry.kind) throw new Error(`Asterisk catalogue record is incomplete: ${entry.id ?? '<missing id>'}`);
    if (!Number.isSafeInteger(entry.sourceBytes ?? entry.bytes) || (entry.sourceBytes ?? entry.bytes) <= 0) throw new Error(`Asterisk catalogue record has no nonempty source bytes: ${entry.id}`);
    if (!/^[a-f0-9]{64}$/u.test(entry.provenance?.sourceSha256 ?? '')) throw new Error(`Asterisk catalogue record has no SHA-256 provenance: ${entry.id}`);
    if (entry.kind === 'module' && !/^[a-f0-9]{64}$/u.test(entry.provenance?.buildGraph?.makefileSha256 ?? '')) throw new Error(`Asterisk module record has no build-graph hash: ${entry.id}`);
    if (entry.kind === 'module' && !/^[a-f0-9]{64}$/u.test(entry.provenance?.buildGraph?.menuselectTreeSha256 ?? '')) throw new Error(`Asterisk module record has no menuselect-tree hash: ${entry.id}`);
    const sourcePath = resolve(root, entry.source);
    if (!existsSync(sourcePath)) throw new Error(`Asterisk catalogue source is absent: ${entry.source}`);
    const actualHash = createHash('sha256').update(readFileSync(sourcePath)).digest('hex');
    if (actualHash !== entry.provenance.sourceSha256) throw new Error(`Asterisk catalogue source hash drift: ${entry.source}`);
    if (entry.kind === 'module') {
      const makefilePath = resolve(root, entry.provenance.buildGraph.makefile);
      if (!existsSync(makefilePath)) throw new Error(`Asterisk catalogue build graph is absent: ${entry.provenance.buildGraph.makefile}`);
      const makefileHash = createHash('sha256').update(readFileSync(makefilePath)).digest('hex');
      if (makefileHash !== entry.provenance.buildGraph.makefileSha256) throw new Error(`Asterisk catalogue build graph hash drift: ${entry.provenance.buildGraph.makefile}`);
      const treePath = resolve(root, entry.provenance.buildGraph.menuselectTree);
      if (!existsSync(treePath)) throw new Error(`Asterisk catalogue menuselect tree is absent: ${entry.provenance.buildGraph.menuselectTree}`);
      const treeHash = createHash('sha256').update(readFileSync(treePath)).digest('hex');
      if (treeHash !== entry.provenance.buildGraph.menuselectTreeSha256) throw new Error(`Asterisk catalogue menuselect tree hash drift: ${entry.provenance.buildGraph.menuselectTree}`);
    }
    if (!Array.isArray(entry.unavailableReasons) || entry.unavailableReasons.length === 0) throw new Error(`Asterisk catalogue record has no unavailable reason: ${entry.id}`);
  }
  for (const path of [...(inventory.requiredGeneratedFiles ?? []), ...(inventory.requiredDocs ?? []), ...(inventory.requiredImplementationFiles ?? []), ...(inventory.requiredLocalizationFiles ?? []), ...(inventory.requiredActionFiles ?? []), ...(inventory.requiredEvidenceFiles ?? [])]) {
    if (files.size > 0 && !files.has(path)) throw new Error(`Asterisk catalogue required file is absent: ${path}`);
  }
  const actionSource = readText('console/shared/control-plane.ts');
  for (const action of inventory.requiredRuntimeActions ?? []) if (!new RegExp(`['"]${escapeRegExp(action)}['"]`).test(actionSource)) throw new Error(`Asterisk catalogue runtime action is not registered: ${action}`);
  const readingsSource = readText('console/control-plane/asterisk-readings.ts');
  for (const command of inventory.requiredRuntimeCommands ?? []) if (!new RegExp(`['"]${escapeRegExp(command)}['"]`).test(readingsSource)) throw new Error(`Asterisk catalogue runtime command is not allowlisted: ${command}`);
  const reconciliationSource = readText('console/control-plane/asterisk-runtime-catalog.ts');
  for (const boundary of inventory.requiredBoundaries ?? []) {
    const needle = boundary.startsWith('unknown') ? 'state: "unknown"' : 'unverified-installed-module';
    if (!reconciliationSource.includes(needle)) throw new Error(`Asterisk catalogue boundary is not implemented: ${boundary}`);
  }
  return { modules: catalog.modules.length, resources: catalog.resources.length, total: ids.length };
}

function readText(path) { return readFileSync(resolve(root, path), 'utf8'); }
function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'); }

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/verify-asterisk-catalog.mjs')) {
  try {
    const catalog = JSON.parse(readText('console/control-plane/generated/asterisk-catalog.json'));
    const inventory = JSON.parse(readText('console/inventories/asterisk-capability-catalog.json'));
    const required = Object.values(inventory).flatMap((value) => Array.isArray(value) ? value : []).filter((path) => typeof path === 'string' && path.includes('/'));
    const files = new Set(required.filter((path) => existsSync(resolve(root, path))));
    const result = validateAsteriskCatalog(catalog, inventory, files);
    console.log(`PASS: ${result.modules} source modules, ${result.resources} configuration resources, ${result.total} catalogue records.`);
  } catch (error) {
    console.error(`FAIL: ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  }
}
