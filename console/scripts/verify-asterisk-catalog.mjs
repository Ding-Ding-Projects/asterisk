#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', '..');

export function validateAsteriskCatalog(catalog, inventory, files = new Set()) {
  if (!(files instanceof Set) || files.size === 0) throw new Error('Asterisk catalogue evidence file set is empty');
  if (catalog?.schemaVersion !== 1) throw new Error('Asterisk catalogue schemaVersion 1 required');
  if (!/^[a-f0-9]{64}$/u.test(catalog.catalogRevision ?? '')) throw new Error('Asterisk catalogue revision is missing');
  const { catalogRevision, ...catalogWithoutRevision } = catalog;
  if (createHash('sha256').update(JSON.stringify(catalogWithoutRevision)).digest('hex') !== catalogRevision) throw new Error('Asterisk catalogue revision hash drift');
  if (!Array.isArray(catalog.modules) || !Array.isArray(catalog.resources) || !Array.isArray(catalog.apiResources)) throw new Error('Asterisk catalogue modules, resources and ARI resource arrays required');
  if (!Array.isArray(inventory?.sourceFamilies) || inventory.sourceFamilies.length !== 12) throw new Error('Asterisk catalogue family inventory must list all 12 source families');
  const actualFamilies = new Set(catalog.modules.map((entry) => entry.family));
  for (const family of inventory.sourceFamilies) if (!actualFamilies.has(family)) throw new Error(`Asterisk catalogue missing source family '${family}'`);
  const ids = [...catalog.modules, ...catalog.resources, ...catalog.apiResources].map((entry) => entry.id);
  if (new Set(ids).size !== ids.length) throw new Error('Asterisk catalogue identifiers must be unique');
  const operationIds = catalog.apiResources.flatMap((entry) => entry.apiOperations ?? []).map((operation) => operation.id);
  if (operationIds.some((id) => typeof id !== 'string' || id.length === 0) || new Set(operationIds).size !== operationIds.length) throw new Error('Asterisk ARI operation identifiers must be unique and nonempty');
  const amiActionCount = catalog.modules.reduce((count, entry) => count + entry.registrations.amiActions.length, 0);
  const amiEventCount = catalog.modules.reduce((count, entry) => count + entry.registrations.amiEvents.length, 0);
  const registrationCounts = Object.fromEntries(['cli', 'amiActions', 'amiEvents', 'agi', 'applications', 'functions', 'codecs', 'formats', 'channels'].map((field) => [field, catalog.modules.reduce((count, entry) => count + entry.registrations[field].length, 0)]));
  if (registrationCounts.cli !== inventory.expectedRegistrations?.cli || amiActionCount !== inventory.expectedRegistrations?.amiActions || amiEventCount !== inventory.expectedRegistrations?.amiEvents || registrationCounts.agi !== inventory.expectedRegistrations?.agi || registrationCounts.applications !== inventory.expectedRegistrations?.applications || registrationCounts.functions !== inventory.expectedRegistrations?.functions || registrationCounts.codecs !== inventory.expectedRegistrations?.codecs || registrationCounts.formats !== inventory.expectedRegistrations?.formats || registrationCounts.channels !== inventory.expectedRegistrations?.channels || operationIds.length !== inventory.expectedRegistrations?.ariOperations) throw new Error('Asterisk registration counts drift');
  const ariOperations = catalog.apiResources.flatMap((entry) => entry.apiOperations ?? []);
  if (ariOperations.filter((operation) => operation.websocket).length !== inventory.expectedRegistrations?.ariWebSocketOperations) throw new Error('Asterisk ARI WebSocket operation count drift');
  if (ariOperations.some((operation) => !operation.responseSchema || !Array.isArray(operation.parameters) || !operation.requestSchema)) throw new Error('Asterisk ARI operation schema is incomplete');
  if (catalog.counts?.modules !== catalog.modules.length || catalog.counts?.resources !== catalog.resources.length || catalog.counts?.apiResources !== catalog.apiResources.length) throw new Error('Asterisk catalogue counts drift');
  if (catalog.counts.modules !== inventory.expectedCounts?.modules || catalog.counts.resources !== inventory.expectedCounts?.resources || catalog.counts.apiResources !== inventory.expectedCounts?.apiResources) throw new Error('Asterisk catalogue hand-written expected counts drift');
  const configSources = walkFiles(resolve(root, 'configs')).map((path) => relative(root, path).replaceAll('\\', '/')).filter((path) => !path.endsWith('/README'));
  const catalogConfigSources = catalog.resources.map((entry) => entry.source).sort();
  if (configSources.slice().sort().join('\n') !== catalogConfigSources.join('\n')) throw new Error('Asterisk catalogue configuration resource set is incomplete or has an unexpected file');
  const apiSources = walkFiles(resolve(root, 'rest-api', 'api-docs')).filter((path) => path.endsWith('.json')).map((path) => relative(root, path).replaceAll('\\', '/')).sort();
  const catalogApiSources = catalog.apiResources.map((entry) => entry.source).sort();
  if (apiSources.join('\n') !== catalogApiSources.join('\n')) throw new Error('Asterisk catalogue ARI resource set is incomplete or has an unexpected file');
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
  const requiredFiles = [...(inventory.requiredGeneratedFiles ?? []), ...(inventory.requiredDocs ?? []), ...(inventory.requiredImplementationFiles ?? []), ...(inventory.requiredLocalizationFiles ?? []), ...(inventory.requiredActionFiles ?? []), ...(inventory.requiredEvidenceFiles ?? [])];
  for (const path of requiredFiles) if (!files.has(path)) throw new Error(`Asterisk catalogue required file is absent: ${path}`);
  if (files.size !== new Set(requiredFiles).size) throw new Error('Asterisk catalogue evidence file set contains unexpected paths');
  for (const binding of inventory.requiredBindings ?? []) {
    if (!binding || typeof binding.file !== 'string' || typeof binding.needle !== 'string') throw new Error('Asterisk catalogue binding inventory entry is malformed');
    if (!readText(binding.file).includes(binding.needle)) throw new Error(`Asterisk catalogue production binding is absent: ${binding.file} :: ${binding.needle}`);
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
  const actionEvidence = JSON.parse(readText('console/inventories/asterisk-actions-evidence.json'));
  if (actionEvidence.status !== 'implemented-unverified' || !Array.isArray(actionEvidence.actions) || actionEvidence.actions.length !== 19) throw new Error('Asterisk action evidence inventory is incomplete');
  const actionCatalogSource = readText('console/control-plane/asterisk-action-catalog.ts');
  for (const path of ['console/docs/system/asterisk-capability-catalog.md', 'console/site/asterisk-action-registry.json', 'console/inventories/asterisk-actions-evidence.json', 'local-history.record', 'catalogue-record-search', 'command-palette-action-result', 'bulk-action-preview', 'catalogue-export', 'native-labelled-control']) {
    if (!actionCatalogSource.includes(path)) throw new Error(`Asterisk action surface mapping is missing: ${path}`);
  }
  return { modules: catalog.modules.length, resources: catalog.resources.length, total: ids.length };
}

function readText(path) { return readFileSync(resolve(root, path), 'utf8'); }
function walkFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? walkFiles(path) : [path];
  });
}
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
