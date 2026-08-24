#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const appSource = readFileSync(join(root, 'app', 'renderer', 'src', 'App.tsx'), 'utf8');
const designSource = readFileSync(join(root, '..', 'design', 'Asterisk Console M3.dc.html'), 'utf8');
const inventorySource = readFileSync(join(root, 'app', 'renderer', 'src', 'event-copy-inventory.ts'), 'utf8');
const localeSource = readFileSync(join(root, 'app', 'renderer', 'src', 'locale-yue.ts'), 'utf8');
const records = new Map([...inventorySource.matchAll(/key: '([^']+)'[^\n]*status: '(localized|english-fallback)'/g)].map((match) => [match[1], match[2]]));
if (!records.has('* unlisted dynamic event') || !records.has('<dynamic-title>') || !records.has('<dynamic-body>')) throw new Error('Dynamic event inventory is missing its explicit fallback records.');
const localeKeys = new Set([...localeSource.matchAll(/^  '([^']+)':/gm)].map((match) => match[1]));
for (const [key, status] of records) {
  if (status === 'localized' && !localeKeys.has(key)) throw new Error(`Inventory marks ${key} localized, but no exact Cantonese entry exists.`);
  if (status === 'english-fallback' && !inventorySource.includes(`key: '${key}'`) ) throw new Error(`Fallback inventory row for ${key} is not exact.`);
}
const callSites = [appSource, designSource].flatMap((source) => [...source.matchAll(/this\.(?:toast|fire)\(\s*'([^']+)'/g)].map((match) => match[1]));
const missing = [...new Set(callSites)].filter((key) => !records.has(key));
if (missing.length > 0 && !inventorySource.includes('Any dynamic title or body absent from this inventory')) throw new Error(`Dynamic event call sites are not covered: ${missing.join(', ')}`);
const templateCalls = [appSource, designSource].filter((source) => /this\.(?:toast|fire)\(\s*`/u.test(source));
if (templateCalls.length > 0 && !records.has('<dynamic-body>')) throw new Error('Template event call sites have no explicit fallback inventory row.');
console.log(`Dynamic event inventory verified: ${records.size} rows, ${new Set(callSites).size} exact call-site keys, ${templateCalls.length} template source(s).`);
