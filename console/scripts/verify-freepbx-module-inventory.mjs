#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', '..');
const catalog = JSON.parse(readFileSync(resolve(root, 'console/catalog/freepbx-module-catalog.json'), 'utf8'));
const inventory = JSON.parse(readFileSync(resolve(root, 'console/inventories/freepbx-module-surface.json'), 'utf8'));
const runtimeSource = readFileSync(resolve(root, 'console/control-plane/freepbx-runtime.ts'), 'utf8');
const adapterSource = readFileSync(resolve(root, 'console/app/renderer/src/freepbx-module-adapters.ts'), 'utf8');

function unique(values, label) {
  const duplicates = values.filter((value, index) => values.indexOf(value) !== index);
  if (duplicates.length) throw new Error(`${label} repeats: ${[...new Set(duplicates)].join(', ')}`);
  return new Set(values);
}

function verify(catalogValue, inventoryValue) {
  if (catalogValue.schemaVersion !== 1 || inventoryValue.schemaVersion !== 1) throw new Error('FreePBX catalog and inventory must use schemaVersion 1.');
  if (inventoryValue.catalogDestination !== 'freepbx-catalog' || inventoryValue.runtimeAdapter !== 'console/control-plane/freepbx-runtime.ts' || typeof inventoryValue.sourceAuthority !== 'string' || inventoryValue.exclusionRecords !== 'catalog.exclusions') throw new Error('FreePBX inventory is missing the native catalog destination, runtime adapter, source authority, or exclusion records.');
  if (!Array.isArray(catalogValue.exclusions) || catalogValue.counts?.exclusions !== catalogValue.exclusions.length) throw new Error('FreePBX catalog exclusions are missing or miscounted.');
  const catalogIds = unique(catalogValue.modules.map((module) => module.moduleId), 'catalog module ids');
  const inventoryIds = unique(inventoryValue.modules, 'inventory module ids');
  const missing = [...catalogIds].filter((id) => !inventoryIds.has(id));
  const stale = [...inventoryIds].filter((id) => !catalogIds.has(id));
  if (missing.length || stale.length) throw new Error(`catalog/inventory mismatch; missing=${missing.join(',') || 'none'} stale=${stale.join(',') || 'none'}`);
  const families = unique(inventoryValue.families, 'inventory families');
  for (const family of families) if (!adapterSource.includes(family)) throw new Error(`FreePBX family ${family} has no explicit adapter policy.`);
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
  const exclusionIds = unique(catalogValue.exclusions.map((exclusion) => exclusion.recordId), 'catalog exclusion record ids');
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

const result = verify(catalog, inventory);
verifyRuntime(runtimeSource);
verifyAdapters(adapterSource);
if (process.argv.includes('--probe-negative')) {
  const broken = { ...inventory, modules: inventory.modules.slice(1) };
  let failedClosed = false;
  try { verify(catalog, broken); } catch { failedClosed = true; }
  if (!failedClosed) throw new Error('negative inventory regression did not fail closed.');
  let runtimeFailedClosed = false;
  try { verifyRuntime(runtimeSource.replace("!request.confirmed &&", "!request.confirmedRemoved &&")); } catch { runtimeFailedClosed = true; }
  if (!runtimeFailedClosed) throw new Error('negative runtime regression did not fail closed.');
  console.log('negative inventory regression: red on one removed module, restored catalog: green');
}
console.log(`FreePBX module inventory verified structurally: ${result.modules} modules, ${result.families} families, ${result.exclusions} exclusion records, ${result.unavailable} unavailable or unverified entries.`);
