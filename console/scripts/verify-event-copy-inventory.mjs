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
if (census.status !== 'implemented-unverified' || census.sources.length !== 3 || census.templates.length !== 12) throw new Error('Dynamic event census is missing its exact source or template rows.');
if (!inventorySource.includes('census.calls') || !inventorySource.includes('callIds') || !inventorySource.includes('dynamicEventCopyRecordByCallId')) throw new Error('Runtime event inventory is not derived from every censused call record.');
const compilerPath = join(root, 'scripts', 'compile-design.mjs');
const compilerHash = createHash('sha256').update(readFileSync(compilerPath)).digest('hex');
const localeKeys = new Set([...localeSource.matchAll(/^  '([^']+)':/gm)].map((match) => match[1]));
const sourceIds = new Set();
for (const source of census.sources) {
  if (!source.id || sourceIds.has(source.id) || !/^[0-9a-f]{64}$/u.test(source.sha256) || source.compilerRevision !== compilerHash) throw new Error(`Dynamic event census source identity or compiler revision is invalid: ${source.id}`);
  sourceIds.add(source.id);
  const sourceText = readFileSync(join(root, '..', source.path), 'utf8');
  if (createHash('sha256').update(sourceText).digest('hex') !== source.sha256) throw new Error(`Dynamic event census source hash drift: ${source.path}`);
  if (!/this\.(?:toast|fire|toastWithId|fireWithId)\(/u.test(sourceText)) throw new Error(`Dynamic event census source has no toast or dialog call form: ${source.path}`);
}
const exactCalls = [];
for (const source of census.sources) {
  const sourceText = readFileSync(join(root, '..', source.path), 'utf8');
  const callPattern = /\.(toast|fire|toastWithId|fireWithId)\s*\(/g;
  const occurrenceByLocation = new Map();
  let match;
  while ((match = callPattern.exec(sourceText))) {
    const location = sourceText.slice(0, match.index).split('\n').length;
    const kind = match[1].replace(/WithId$/u, '');
    const slot = `${source.id}:${location}:${kind}`;
    const occurrence = occurrenceByLocation.get(slot) ?? 0;
    occurrenceByLocation.set(slot, occurrence + 1);
    let argumentText = sourceText.slice(match.index + match[0].length, match.index + match[0].length + 500).replace(/\s+/gu, ' ').trim();
    const explicitId = match[1].endsWith('WithId') ? /^'([^']+)'\s*,\s*/u.exec(argumentText) : undefined;
    if (explicitId) argumentText = argumentText.slice(explicitId[0].length);
    const first = argumentText[0] ?? '';
    const shape = first === "'" || first === '"' ? 'literal' : first === '`' ? 'template' : 'expression';
    const close = shape === 'literal' ? argumentText.indexOf(first, 1) : shape === 'template' ? argumentText.indexOf('`', 1) : -1;
    const value = close > 0 ? argumentText.slice(1, close) : undefined;
    const id = explicitId?.[1] ?? `event-${source.id}-${location}-${kind}-${occurrence}`;
    exactCalls.push({
      id,
      sourceId: source.id,
      location,
      kind: kind === 'toast' ? 'toast' : 'dialog',
      shape,
      ...(shape === 'literal' ? { literal: value } : {}),
      ...(shape === 'template' ? { template: value } : {}),
      status: shape === 'literal' && value && localeKeys.has(value) ? 'localized' : 'english-fallback',
      fallback: 'plain-english-track',
    });
  }
}
if (!Array.isArray(census.calls) || census.calls.length !== exactCalls.length) throw new Error(`Dynamic event census call count drift: expected ${census.calls?.length ?? 0}, found ${exactCalls.length}.`);
for (let index = 0; index < exactCalls.length; index += 1) {
  const actual = exactCalls[index];
  const expected = census.calls[index];
  for (const field of ['id', 'sourceId', 'location', 'kind', 'shape', 'status', 'fallback']) {
    if (actual[field] !== expected[field]) throw new Error(`Dynamic event census call drift at ${actual.id}: ${field} differs.`);
  }
  if (actual.literal !== expected.literal || actual.template !== expected.template) throw new Error(`Dynamic event census literal/template drift at ${actual.id}.`);
  if (actual.status === 'localized' && !localeKeys.has(actual.literal)) throw new Error(`Dynamic event census marks ${actual.id} localized without an exact Cantonese entry.`);
  if (actual.status === 'english-fallback' && actual.fallback !== 'plain-english-track') throw new Error(`Dynamic event census fallback is not explicit at ${actual.id}.`);
}
const records = new Map([...inventorySource.matchAll(/key: '([^']+)'[^\n]*status: '(localized|english-fallback)'/g)].map((match) => [match[1], match[2]]));
for (const template of census.templates) {
  if (!template.id || template.sourceId !== 'app-event-source' || !Number.isInteger(template.location) || !Array.isArray(template.placeholders) || template.placeholders.length === 0 || template.fallback !== 'plain-english-track' || !records.has(template.id)) throw new Error(`Dynamic template inventory row is incomplete: ${template.id}`);
  const sourceLines = appSource.split('\n');
  const line = sourceLines[template.location - 1] ?? '';
  const templateTexts = [...line.matchAll(/`([^`]*)`/g)].map((match) => match[1]);
  const siblingTemplates = census.templates.filter((candidate) => candidate.location === template.location);
  const siblingIndex = siblingTemplates.findIndex((candidate) => candidate.id === template.id);
  const sourceTemplate = templateTexts[siblingIndex];
  if (sourceTemplate === undefined) throw new Error(`Dynamic template source is missing at ${template.id}.`);
  const placeholders = [...sourceTemplate.matchAll(/\$\{\s*([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)/g)].map((match) => match[1].replace(/^this\./u, ''));
  if (JSON.stringify([...new Set(placeholders)].sort()) !== JSON.stringify([...new Set(template.placeholders)].sort())) throw new Error(`Dynamic template placeholder drift at ${template.id}.`);
}
for (const [key, status] of records) {
  if (status === 'localized' && !localeKeys.has(key)) throw new Error(`Inventory marks ${key} localized, but no exact Cantonese entry exists.`);
  if (status === 'english-fallback' && !inventorySource.includes(`key: '${key}'`) ) throw new Error(`Fallback inventory row for ${key} is not exact.`);
}
const callSites = [...appSource.matchAll(/this\.(?:toast|fire)WithId\('([^']+)'/g)].map((match) => match[1]);
const censusIds = new Set(census.calls.map((call) => call.id));
const missing = [...new Set(callSites)].filter((key) => !censusIds.has(key));
if (missing.length > 0) throw new Error(`Dynamic event call sites are not covered: ${missing.join(', ')}`);
const templateCallLocations = [...appSource.matchAll(/this\.(?:toast|fire)WithId\('[^']+',\s*`/g)].map((match) => appSource.slice(0, match.index).split('\n').length);
const templateLocations = [...new Set(templateCallLocations)];
if (census.templates.some((template) => !templateLocations.includes(template.location))) throw new Error(`Template call-site census drift: found ${templateLocations.join(', ')} expected every template location to be present.`);
console.log(`Dynamic event census verified: ${records.size} rows, ${exactCalls.length} exact App/design/generated calls, ${new Set(callSites).size} App call-site keys, ${census.templates.length} exact template records across ${templateLocations.length} App call locations, ${census.sources.length} censused source files.`);
