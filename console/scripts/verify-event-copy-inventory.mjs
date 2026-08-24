#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const appSource = readFileSync(join(root, 'app', 'renderer', 'src', 'App.tsx'), 'utf8');
const designSource = readFileSync(join(root, '..', 'design', 'Asterisk Console M3.dc.html'), 'utf8');
const inventorySource = readFileSync(join(root, 'app', 'renderer', 'src', 'event-copy-inventory.ts'), 'utf8');
const localeSource = readFileSync(join(root, 'app', 'renderer', 'src', 'locale-yue.ts'), 'utf8');
const census = JSON.parse(readFileSync(join(root, 'inventories', 'event-copy-census.json'), 'utf8'));
if (census.status !== 'implemented-unverified' || census.sources.length !== 3 || census.templates.length !== 2) throw new Error('Dynamic event census is missing its exact source or template rows.');
const compilerPath = join(root, 'scripts', 'compile-design.mjs');
const compilerHash = createHash('sha256').update(readFileSync(compilerPath)).digest('hex');
const sourceIds = new Set();
for (const source of census.sources) {
  if (!source.id || sourceIds.has(source.id) || !/^[0-9a-f]{64}$/u.test(source.sha256) || source.compilerRevision !== compilerHash) throw new Error(`Dynamic event census source identity or compiler revision is invalid: ${source.id}`);
  sourceIds.add(source.id);
  const sourceText = readFileSync(join(root, '..', source.path), 'utf8');
  if (createHash('sha256').update(sourceText).digest('hex') !== source.sha256) throw new Error(`Dynamic event census source hash drift: ${source.path}`);
  if (!/this\.(?:toast|fire)\(/u.test(sourceText)) throw new Error(`Dynamic event census source has no toast or dialog call form: ${source.path}`);
}
const records = new Map([...inventorySource.matchAll(/key: '([^']+)'[^\n]*status: '(localized|english-fallback)'/g)].map((match) => [match[1], match[2]]));
if (!records.has('<dynamic-title>') || !records.has('<dynamic-body>')) throw new Error('Dynamic event inventory is missing its explicit template fallback records.');
const localeKeys = new Set([...localeSource.matchAll(/^  '([^']+)':/gm)].map((match) => match[1]));
for (const [key, status] of records) {
  if (status === 'localized' && !localeKeys.has(key)) throw new Error(`Inventory marks ${key} localized, but no exact Cantonese entry exists.`);
  if (status === 'english-fallback' && !inventorySource.includes(`key: '${key}'`) ) throw new Error(`Fallback inventory row for ${key} is not exact.`);
}
const callSites = [...appSource.matchAll(/this\.(?:toast|fire)\(\s*'([^']+)'/g)].map((match) => match[1]);
const missing = [...new Set(callSites)].filter((key) => !records.has(key));
if (missing.length > 0) throw new Error(`Dynamic event call sites are not covered: ${missing.join(', ')}`);
const templateCalls = [appSource, designSource].filter((source) => /this\.(?:toast|fire)\(\s*`/u.test(source));
if (templateCalls.length > 0 && !records.has('<dynamic-body>')) throw new Error('Template event call sites have no explicit fallback inventory row.');
console.log(`Dynamic event census verified: ${records.size} rows, ${new Set(callSites).size} App call-site keys, ${templateCalls.length} template source(s), ${census.sources.length} censused source files.`);
