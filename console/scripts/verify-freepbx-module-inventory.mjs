#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', '..');
const catalog = JSON.parse(readFileSync(resolve(root, 'console/catalog/freepbx-module-catalog.json'), 'utf8'));
const inventory = JSON.parse(readFileSync(resolve(root, 'console/inventories/freepbx-module-surface.json'), 'utf8'));
const evidence = JSON.parse(readFileSync(resolve(root, 'console/inventories/freepbx-module-evidence.json'), 'utf8'));
const runtimeSource = readFileSync(resolve(root, 'console/control-plane/freepbx-runtime.ts'), 'utf8');
const adapterSource = readFileSync(resolve(root, 'console/app/renderer/src/freepbx-module-adapters.ts'), 'utf8');
const familyRuntimeSource = readFileSync(resolve(root, 'console/control-plane/freepbx-family-runtime.ts'), 'utf8');
const targetTransportSource = readFileSync(resolve(root, 'console/control-plane/wsl-config-transport.ts'), 'utf8');
const rendererSource = readFileSync(resolve(root, 'console/app/renderer/src/PbxAdminApp.tsx'), 'utf8');
const regexWorkerSource = readFileSync(resolve(root, 'console/app/renderer/src/bounded-regex-worker.ts'), 'utf8');

function unique(values, label) {
  const duplicates = values.filter((value, index) => values.indexOf(value) !== index);
  if (duplicates.length) throw new Error(`${label} repeats: ${[...new Set(duplicates)].join(', ')}`);
  return new Set(values);
}

function verify(catalogValue, inventoryValue) {
  if (catalogValue.schemaVersion !== 1 || inventoryValue.schemaVersion !== 1) throw new Error('FreePBX catalog and inventory must use schemaVersion 1.');
  if (inventoryValue.catalogDestination !== 'freepbx-catalog' || inventoryValue.runtimeAdapter !== 'console/control-plane/freepbx-runtime.ts' || inventoryValue.familyRuntime !== 'console/control-plane/freepbx-family-runtime.ts' || typeof inventoryValue.sourceAuthority !== 'string' || inventoryValue.exclusionRecords !== 'catalog.exclusions') throw new Error('FreePBX inventory is missing the native catalog destination, runtime adapter, family backend, source authority, or exclusion records.');
  if (!Array.isArray(catalogValue.exclusions) || catalogValue.counts?.exclusions !== catalogValue.exclusions.length) throw new Error('FreePBX catalog exclusions are missing or miscounted.');
  if (inventoryValue.expectedCounts?.publishedModules !== catalogValue.modules.length || inventoryValue.expectedCounts?.exclusions !== catalogValue.exclusions.length || inventoryValue.expectedCounts?.families !== inventoryValue.families.length || inventoryValue.expectedCounts?.actionableRecords !== catalogValue.modules.length || inventoryValue.expectedCounts?.nonActionableRecords !== catalogValue.exclusions.length) throw new Error('FreePBX catalog counts no longer match the hand-written expected counts.');
  const catalogIds = unique(catalogValue.modules.map((module) => module.moduleId), 'catalog module ids');
  const inventoryIds = unique(inventoryValue.modules, 'inventory module ids');
  const families = unique(inventoryValue.families, 'inventory families');
  if (evidence.schemaVersion !== 1) throw new Error('FreePBX evidence inventory must use schemaVersion 1.');
  const evidenceModuleIds = unique(evidence.modules, 'evidence module ids');
  if (JSON.stringify([...catalogIds].sort()) !== JSON.stringify([...evidenceModuleIds].sort())) throw new Error('FreePBX module evidence does not enumerate exactly the catalog module IDs.');
  const evidenceFamilies = unique(evidence.families, 'evidence family ids');
  if (JSON.stringify([...families].sort()) !== JSON.stringify([...evidenceFamilies].sort())) throw new Error('FreePBX evidence does not enumerate exactly the family IDs.');
  const exclusionIds = unique(catalogValue.exclusions.map((exclusion) => exclusion.recordId), 'catalog exclusion record ids');
  const evidenceExclusionIds = unique(evidence.exclusions, 'evidence exclusion record ids');
  if (JSON.stringify([...exclusionIds].sort()) !== JSON.stringify([...evidenceExclusionIds].sort())) throw new Error('FreePBX exclusion evidence does not enumerate exactly the exclusion record IDs.');
  const missing = [...catalogIds].filter((id) => !inventoryIds.has(id));
  const stale = [...inventoryIds].filter((id) => !catalogIds.has(id));
  if (missing.length || stale.length) throw new Error(`catalog/inventory mismatch; missing=${missing.join(',') || 'none'} stale=${stale.join(',') || 'none'}`);
  const familyPolicySource = adapterSource.slice(adapterSource.indexOf('const FAMILY_POLICIES'), adapterSource.indexOf('const FALLBACK'));
  const familyPolicyKeys = unique([...familyPolicySource.matchAll(/^\s*["']?([a-z0-9-]+)["']?\s*:\s*\{/gimu)].map((match) => match[1]), 'adapter policy keys');
  if (JSON.stringify([...families].sort()) !== JSON.stringify([...familyPolicyKeys].sort())) throw new Error('FreePBX adapter policy keys do not exactly match the hand-written family inventory.');
  if (!adapterSource.includes('FREEPBX_MODULE_CATALOG.modules.map(moduleAdapterFor)')) throw new Error('FreePBX per-module adapters are not derived from the complete catalog.');
  const nativeTaskOwners = new Map();
  for (const module of catalogValue.modules) {
    if (!module.source || typeof module.source.revision !== 'string' || !/^[0-9a-f]{40}$/u.test(module.source.revision)) throw new Error(`${module.moduleId} has no pinned source revision.`);
    if (!module.documentation || typeof module.documentation.moduleXml !== 'string') throw new Error(`${module.moduleId} has no published metadata documentation link.`);
    if (!Array.isArray(module.configurationResources) || !Array.isArray(module.fwconsoleCommands) || !Array.isArray(module.apiCapabilities)) throw new Error(`${module.moduleId} is missing structured capability metadata.`);
    if (!Array.isArray(module.uiFamilies) || module.uiFamilies.length === 0) throw new Error(`${module.moduleId} is missing a UI family.`);
    if (module.nativeTaskId) {
      const owners = nativeTaskOwners.get(module.nativeTaskId) ?? [];
      owners.push(module.moduleId);
      nativeTaskOwners.set(module.nativeTaskId, owners);
    }
    if (module.nativeAliasOf && !catalogIds.has(module.nativeAliasOf)) throw new Error(`${module.moduleId} aliases missing native task ${module.nativeAliasOf}.`);
    for (const family of module.uiFamilies) if (!families.has(family)) throw new Error(`${module.moduleId} uses unlisted UI family ${family}.`);
    if (!module.availability || typeof module.availability.reason !== 'string' || module.availability.reason.length < 20) throw new Error(`${module.moduleId} is missing an exact availability reason.`);
  }
  for (const [taskId, owners] of nativeTaskOwners) if (owners.length > 1) throw new Error(`native task ${taskId} has colliding owners: ${owners.join(', ')}`);
  for (const exclusion of catalogValue.exclusions) {
    if (typeof exclusion.recordId !== 'string' || catalogIds.has(exclusion.recordId) || typeof exclusion.moduleId !== 'string' || typeof exclusion.reason !== 'string' || typeof exclusion.source !== 'string' || exclusion.actionable !== false) throw new Error('FreePBX exclusion records must be disjoint non-actionable records with recordId, moduleId, reason, and source.');
  }
  return { modules: catalogIds.size, families: families.size, unavailable: catalogValue.counts.unavailableModules, exclusions: catalogValue.exclusions.length };
}

function verifyRuntime(source) {
  const required = [
    "'wsl.exe', ['-d', this.#target.wslDistribution!, '--', 'fwconsole', ...args]",
    "'docker', ['exec', this.#target.dockerContext!, 'fwconsole', ...args]",
    "const ACTIONS = new Set<FreePbxModuleAction>",
    "!request.confirmed &&",
    "expectedRevision",
    "readModule(request.moduleId)",
    "rollbackAction",
    "await this.handshake()",
    "this.#receipts.consume",
    "database: 'unknown'",
    "webService: 'unknown'",
  ];
  for (const marker of required) if (!source.includes(marker)) throw new Error(`FreePBX runtime adapter is missing exact contract marker: ${marker}`);
  if (/child_process|(?<![.\w])spawn\s*\(/u.test(source)) throw new Error('FreePBX runtime adapter must use the typed ProcessExecutor, not a direct process or shell path.');
  if (/\bSELECT\s+.+\s+FROM\b|\bDELETE\s+FROM\b|\bINSERT\s+INTO\b|\bUPDATE\s+\w+\s+SET\b/iu.test(source)) throw new Error('FreePBX runtime adapter must not contain direct SQL.');
}

function verifyAdapters(source) {
  for (const marker of ['moduleAdapterFor', 'FREEPBX_FAMILY_ADAPTERS', 'files-and-database', 'published-api-transaction', 'metadata-only']) {
    if (!source.includes(marker)) throw new Error(`FreePBX adapter source is missing ${marker}.`);
  }
}

function verifyFamilyRuntime(source) {
  for (const marker of ['FAMILY_BACKENDS', 'new WslConfigTransport', 'StructuredConfigPlanner', 'new ConfigTransaction', "backend: 'published-api'", "backend: 'metadata-only'"]) {
    if (!source.includes(marker)) throw new Error(`FreePBX family backend is missing ${marker}.`);
  }
  if (/child_process|(?<![.\w])spawn\s*\(/u.test(source)) throw new Error('FreePBX family backend must use the typed ProcessExecutor boundary.');
}

function verifyTargetTransport(source) {
  for (const marker of ['target?: Pick<TargetProfile', 'connectionKind === "localDocker"', 'dockerContext']) if (!source.includes(marker)) throw new Error(`Shared target transport is missing ${marker}.`);
}

function verifyProductionBindings(source) {
  for (const marker of ['freepbx.family.schema', 'freepbx.family.read', 'freepbx.family.plan', 'freepbx.family.apply', 'freepbx-family-read', 'freepbx-family-plan', 'freepbx-family-apply', 'freePbxFamilySchemaKey']) {
    if (!source.includes(marker)) throw new Error(`FreePBX renderer is missing production binding ${marker}.`);
  }
}

function verifyRegexWorker(source) {
  for (const marker of ['new Worker', 'worker.terminate()', 'MAX_REGEX_EVALUATION_MS']) if (!source.includes(marker)) throw new Error(`FreePBX regex worker is missing ${marker}.`);
}

const result = verify(catalog, inventory);
verifyRuntime(runtimeSource);
verifyAdapters(adapterSource);
verifyFamilyRuntime(familyRuntimeSource);
verifyTargetTransport(targetTransportSource);
verifyProductionBindings(rendererSource);
verifyRegexWorker(regexWorkerSource);
if (process.argv.includes('--probe-negative')) {
  const broken = { ...inventory, modules: inventory.modules.slice(1) };
  let failedClosed = false;
  try { verify(catalog, broken); } catch { failedClosed = true; }
  if (!failedClosed) throw new Error('negative inventory regression did not fail closed.');
  let familyFailedClosed = false;
  try { verify(catalog, { ...inventory, families: inventory.families.slice(1) }); } catch { familyFailedClosed = true; }
  if (!familyFailedClosed) throw new Error('negative family-adapter regression did not fail closed.');
  let runtimeFailedClosed = false;
  try { verifyRuntime(runtimeSource.replace("!request.confirmed &&", "!request.confirmedRemoved &&")); } catch { runtimeFailedClosed = true; }
  if (!runtimeFailedClosed) throw new Error('negative runtime regression did not fail closed.');
  let rendererFailedClosed = false;
  try { verifyProductionBindings(rendererSource.replaceAll('freepbx.family.apply', 'freepbx.family.removed')); } catch { rendererFailedClosed = true; }
  if (!rendererFailedClosed) throw new Error('negative production family binding regression did not fail closed.');
  let regexWorkerFailedClosed = false;
  try { verifyRegexWorker(regexWorkerSource.replaceAll('new Worker', 'removed Worker')); } catch { regexWorkerFailedClosed = true; }
  if (!regexWorkerFailedClosed) throw new Error('negative regex worker regression did not fail closed.');
  console.log('negative inventory regression: red on one removed module, restored catalog: green');
}
console.log(`FreePBX module inventory verified structurally: ${result.modules} modules, ${result.families} families, ${result.exclusions} exclusion records, ${result.unavailable} unavailable or unverified entries.`);
