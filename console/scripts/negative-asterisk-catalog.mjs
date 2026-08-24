#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateAsteriskCatalog } from './verify-asterisk-catalog.mjs';

const root = resolve(import.meta.dirname, '..', '..');
const catalog = JSON.parse(readFileSync(resolve(root, 'console/control-plane/generated/asterisk-catalog.json'), 'utf8'));
const inventory = JSON.parse(readFileSync(resolve(root, 'console/inventories/asterisk-capability-catalog.json'), 'utf8'));
const files = new Set([...inventory.requiredGeneratedFiles, ...inventory.requiredDocs]);

function mustReject(label, mutation, inventoryValue = inventory, filesValue = files) {
  const copy = structuredClone(catalog);
  mutation(copy);
  try {
    validateAsteriskCatalog(copy, inventoryValue, filesValue);
  } catch {
    return;
  }
  throw new Error(`negative Asterisk catalogue regression stayed green: ${label}`);
}

mustReject('removed module family', (copy) => { copy.modules = copy.modules.filter((entry) => entry.family !== 'apps'); });
mustReject('removed module record', (copy) => { copy.modules = copy.modules.slice(1); copy.counts.modules -= 1; });
mustReject('missing unavailable reason', (copy) => { copy.modules[0].unavailableReasons = []; });
mustReject('duplicate identifier', (copy) => { copy.resources[0].id = copy.modules[0].id; });
mustReject('removed documentation article', (copy) => {
  const missing = new Set(files);
  missing.delete('console/docs/system/asterisk-capability-catalog.md');
  copy.__missingFiles = missing;
}, inventory, new Set([...files].filter((path) => path !== 'console/docs/system/asterisk-capability-catalog.md')));
mustReject('removed runtime action', () => {}, { ...inventory, requiredRuntimeActions: ['pbx.catalog-missing'] });
console.log('PASS: Asterisk catalogue negative regressions turned red for every deliberate deletion and restored green.');
