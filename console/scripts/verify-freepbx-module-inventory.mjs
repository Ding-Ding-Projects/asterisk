#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', '..');
const catalog = JSON.parse(readFileSync(resolve(root, 'console/catalog/freepbx-module-catalog.json'), 'utf8'));
const inventory = JSON.parse(readFileSync(resolve(root, 'console/inventories/freepbx-module-surface.json'), 'utf8'));

function unique(values, label) {
  const duplicates = values.filter((value, index) => values.indexOf(value) !== index);
  if (duplicates.length) throw new Error(`${label} repeats: ${[...new Set(duplicates)].join(', ')}`);
  return new Set(values);
}

function verify(catalogValue, inventoryValue) {
  if (catalogValue.schemaVersion !== 1 || inventoryValue.schemaVersion !== 1) throw new Error('FreePBX catalog and inventory must use schemaVersion 1.');
  const catalogIds = unique(catalogValue.modules.map((module) => module.moduleId), 'catalog module ids');
  const inventoryIds = unique(inventoryValue.modules, 'inventory module ids');
  const missing = [...catalogIds].filter((id) => !inventoryIds.has(id));
  const stale = [...inventoryIds].filter((id) => !catalogIds.has(id));
  if (missing.length || stale.length) throw new Error(`catalog/inventory mismatch; missing=${missing.join(',') || 'none'} stale=${stale.join(',') || 'none'}`);
  const families = unique(inventoryValue.families, 'inventory families');
  for (const module of catalogValue.modules) {
    if (!module.source || typeof module.source.revision !== 'string' || !/^[0-9a-f]{40}$/u.test(module.source.revision)) throw new Error(`${module.moduleId} has no pinned source revision.`);
    if (!module.documentation || typeof module.documentation.moduleXml !== 'string') throw new Error(`${module.moduleId} has no published metadata documentation link.`);
    if (!Array.isArray(module.configurationResources) || !Array.isArray(module.fwconsoleCommands) || !Array.isArray(module.apiCapabilities)) throw new Error(`${module.moduleId} is missing structured capability metadata.`);
    if (!Array.isArray(module.uiFamilies) || module.uiFamilies.length === 0) throw new Error(`${module.moduleId} is missing a UI family.`);
    for (const family of module.uiFamilies) if (!families.has(family)) throw new Error(`${module.moduleId} uses unlisted UI family ${family}.`);
    if (!module.availability || typeof module.availability.reason !== 'string' || module.availability.reason.length < 20) throw new Error(`${module.moduleId} is missing an exact availability reason.`);
  }
  return { modules: catalogIds.size, families: families.size, unavailable: catalogValue.counts.unavailableModules };
}

const result = verify(catalog, inventory);
if (process.argv.includes('--probe-negative')) {
  const broken = { ...inventory, modules: inventory.modules.slice(1) };
  let failedClosed = false;
  try { verify(catalog, broken); } catch { failedClosed = true; }
  if (!failedClosed) throw new Error('negative inventory regression did not fail closed.');
  console.log('negative inventory regression: red on one removed module, restored catalog: green');
}
console.log(`FreePBX module inventory verified structurally: ${result.modules} modules, ${result.families} families, ${result.unavailable} unavailable or unverified entries.`);
