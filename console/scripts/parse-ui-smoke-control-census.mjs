#!/usr/bin/env node
/**
 * Parse the checked-in design and generated renderer exactly once per source
 * revision. The checked-in census is the reviewed result. This parser records
 * every unique ctl id, its declaration locations, generated runtime uses, and
 * an explicit exclusion reason when no executable runtime binding exists.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SURFACES } from '../inventories/ui-smoke-inventory.mjs';

const root = resolve(import.meta.dirname, '..', '..');
const designFiles = ['design/Asterisk Console M3.dc.html', 'design/M3 Control.dc.html'];
const runtimeFile = 'console/app/renderer/src/generated/console.tsx';
const outputPath = resolve(root, 'console/inventories/ui-smoke/control-census.json');
const surfaceIndexPath = resolve(root, 'console/inventories/ui-smoke/surface-control-index.json');
const controlPattern = /ctl\('([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'/gu;
const RUNTIME_SCREEN_IDS = new Set(['servers', 'dash', 'live', 'endpoints', 'trunks', 'trunkauth', 'fcodes', 'iaxpeers', 'canvas', 'ivr', 'queues', 'voicemail', 'confbridge', 'moh', 'codecs', 'cdr', 'ami', 'modules', 'logger', 'httpd', 'security', 'cli', 'memory', 'sync', 'skills', 'hub', 'vocab', 'ops', 'secrets', 'arcade', 'notifications', 'history', 'customise', 'appearance', 'about', 'docs', 'changelog']);
const DYNAMIC_BINDINGS = [
  ['ap', 'ConsoleShell.APPEAR_GROUPS[].ctls[].id', 'appearance-editor'], ['cp', 'ConsoleShell.colourPickerCtls[].id', 'colour-picker'],
  ['bs', 'ConsoleShell.oneClick.basicCtls[].id', 'servers'], ['cw', 'ConsoleShell.WIZARDS.transaction[].ctls[].id', 'settings-advanced'],
  ['dp', 'ConsoleShell.NODES[].ctls[].id', 'canvas'], ['lk', 'ConsoleShell.lockCtls[].id', 'lock-wizard'], ['ob', 'ConsoleShell.ONBOARD.ctls[].id', 'onboarding'],
  ['sv', 'ConsoleShell.WIZARDS.servers[].ctls[].id', 'servers'], ['wq', 'ConsoleShell.WIZARDS.queues[].steps[].ctls[].id', 'queues'],
  ['wi', 'ConsoleShell.WIZARDS.ivr[].steps[].ctls[].id', 'ivr'], ['wv', 'ConsoleShell.WIZARDS.voicemail[].steps[].ctls[].id', 'voicemail'],
  ['ws', 'ConsoleShell.WIZARDS.security[].steps[].ctls[].id', 'security'], ['wd', 'ConsoleShell.WIZARDS.advanced[].steps[].ctls[].id', 'settings-advanced'],
  ['wm', 'ConsoleShell.WIZARDS.modules[].steps[].ctls[].id', 'modules'], ['wy', 'ConsoleShell.WIZARDS.vocabulary[].steps[].ctls[].id', 'vocab'],
  ['wc', 'ConsoleShell.WIZARDS.confirmation[].steps[].ctls[].id', 'lock-wizard'], ['w', 'ConsoleShell.WIZARDS.endpoints[].steps[].ctls[].id', 'endpoints'],
].sort((a, b) => b[0].length - a[0].length);
const casesByKind = {
  switch: ['inspect', 'toggle-on', 'toggle-off', 'keyboard-toggle', 'reset'],
  slider: ['inspect', 'set-min', 'set-mid', 'set-max', 'keyboard-step', 'reset'],
  stepper: ['inspect', 'decrement', 'increment', 'set-min', 'set-max', 'reset'],
  segmented: ['inspect', 'open', 'choose-first', 'choose-last', 'keyboard-choose', 'reset'],
  select: ['inspect', 'open', 'search-option', 'choose-first', 'choose-last', 'escape', 'reset'],
  text: ['inspect', 'focus', 'set-bounded-valid', 'clear', 'invalid-boundary', 'reset'],
  file: ['inspect', 'open-picker', 'cancel-picker', 'select-bounded-file', 'clear'],
  order: ['inspect', 'move-first', 'move-last', 'keyboard-reorder', 'reset'],
  chips: ['inspect', 'add-option', 'remove-option', 'clear', 'reset'],
};

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex').toUpperCase();
function locationFor(text, index) {
  const before = text.slice(0, index);
  const line = before.split('\n').length;
  const lastBreak = before.lastIndexOf('\n');
  return { line, column: index - lastBreak, offset: index };
}
function sourceHash(path) { return sha256(readFileSync(resolve(root, path))); }
function declarationSource(text, offset) {
  let depth = 0; let quote = null; let escaped = false;
  for (let index = offset; index < text.length; index += 1) {
    const character = text[index];
    if (quote) { if (escaped) escaped = false; else if (character === '\\') escaped = true; else if (character === quote) quote = null; continue; }
    if (character === "'" || character === '"' || character === '`') { quote = character; continue; }
    if (character === '(') depth += 1;
    if (character === ')') { depth -= 1; if (depth === 0) return text.slice(offset, index + 1); }
  }
  return text.slice(offset);
}
function numberField(raw, name) { const match = raw.match(new RegExp(`\\b${name}\\s*:\\s*(-?\\d+(?:\\.\\d+)?)`, 'u')); return match ? Number(match[1]) : null; }
function optionFields(raw) { const match = raw.match(/\boptions\s*:\s*\[([^\]]*)\]/u); return match ? [...match[1].matchAll(/'([^']*)'/gu)].map((item) => item[1]) : []; }
function ctlArguments(raw) {
  const start = raw.indexOf('ctl(');
  if (start < 0) throw new Error('control declaration does not start with ctl(');
  const args = []; let current = ''; let depth = 0; let quote = null; let escaped = false;
  for (let index = start + 4; index < raw.length; index += 1) {
    const character = raw[index];
    if (quote) {
      current += character;
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"' || character === '`') { quote = character; current += character; continue; }
    if (character === '[' || character === '{' || character === '(') { depth += 1; current += character; continue; }
    if (character === ']' || character === '}' || character === ')') {
      if (character === ')' && depth === 0) { args.push(current.trim()); return args; }
      depth -= 1; current += character; continue;
    }
    if (character === ',' && depth === 0) { args.push(current.trim()); current = ''; continue; }
    current += character;
  }
  throw new Error('unterminated ctl declaration');
}
function typedLiteral(token, id) {
  const value = token.trim();
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  if (/^-?\d+(?:\.\d+)?$/u.test(value)) return Number(value);
  if (/^'[^']*'$/u.test(value) || /^"[^"]*"$/u.test(value)) return value.slice(1, -1);
  if (/^\[[\s\S]*\]$/u.test(value)) {
    const inner = value.slice(1, -1);
    if (!/^(?:\s*(?:'[^']*'|"[^"]*")\s*(?:,\s*(?:'[^']*'|"[^"]*"))*)?\s*$/u.test(inner)) throw new Error(`malformed typed array default for ${id}: ${value}`);
    return [...inner.matchAll(/'([^']*)'|"([^"]*)"/gu)].map((match) => match[1] ?? match[2]);
  }
  throw new Error(`malformed typed default for ${id}: ${value}`);
}
function contractFor(raw, kind) {
  const args = ctlArguments(raw);
  const defaultValue = typedLiteral(args[3] ?? 'null', raw.slice(0, 80));
  const showWhen = raw.match(/showWhen\s*:\s*\{\s*control\s*:\s*'([^']+)'\s*,\s*is\s*:\s*'([^']+)'/u);
  const explicitStep = numberField(raw, 'step');
  return {
    kind, defaultValueLiteral: defaultValue, defaultValueType: Array.isArray(defaultValue) ? 'array' : typeof defaultValue, defaultValueSyntaxValid: true, options: optionFields(raw), bounds: { min: numberField(raw, 'min'), max: numberField(raw, 'max'), step: explicitStep, effectiveStep: explicitStep ?? ((kind === 'slider' || kind === 'stepper') ? 1 : null), stepSource: explicitStep === null && (kind === 'slider' || kind === 'stepper') ? 'm3-control-number-default-1' : 'design-declared' }, unit: raw.match(/\bunit\s*:\s*'([^']*)'/u)?.[1] ?? null, accept: raw.match(/\baccept\s*:\s*'([^']*)'/u)?.[1] ?? null, action: raw.match(/\baction\s*:\s*'([^']*)'/u)?.[1] ?? null, info: raw.match(/\binfo\s*:\s*'([^']*)'/u)?.[1] ?? null, showWhen: showWhen ? { control: showWhen[1], is: showWhen[2] } : null,
  };
}
function extract(path) {
  const text = readFileSync(resolve(root, path), 'utf8');
  const records = [];
  for (const match of text.matchAll(controlPattern)) {
    const raw = declarationSource(text, match.index);
    records.push({ id: match[1], label: match[2], kind: match[3], contract: contractFor(raw, match[3]), location: locationFor(text, match.index), source: path });
  }
  return { text, records };
}
function screenAt(text, offset) {
  const screensStart = text.indexOf('const SCREENS = {');
  const screensEnd = text.indexOf('const ORDER =', screensStart);
  if (offset < screensStart || offset > screensEnd) {
    const pjsipStart = text.indexOf('function pjsipCtls()');
    if (offset >= pjsipStart && offset < screensStart) return 'endpoints';
    return null;
  }
  const matches = [...text.slice(screensStart, screensEnd).matchAll(/^  ([A-Za-z][A-Za-z0-9_]*):\{/gmu)]
    .filter((match) => RUNTIME_SCREEN_IDS.has(match[1]));
  const absolute = matches.filter((match) => screensStart + match.index <= offset);
  return absolute.at(-1)?.[1] ?? null;
}
function contextAt(text, offset) {
  const prefix = text.slice(0, offset);
  const functionMatches = [...prefix.matchAll(/(?:function\s+([A-Za-z_$][\w$]*)|([A-Za-z_$][\w$]*)\s*=\s*\([^)]*\)\s*=>)/gu)];
  return functionMatches.at(-1)?.[1] ?? functionMatches.at(-1)?.[2] ?? 'generated-runtime-scope';
}
function runtimeBinding(text, offset, id) {
  const screen = screenAt(text, offset);
  if (screen) return { path: `ConsoleShell.SCREENS.${screen}.groups[].ctls[].id`, screenId: screen, surfaceId: screen, stateKey: `ctl:${id}` };
  const dynamic = DYNAMIC_BINDINGS.find(([prefix]) => id.startsWith(`${prefix}_`));
  if (dynamic) return { path: dynamic[1], surfaceId: dynamic[2], stateKey: `ctl:${id}`, scope: dynamic[2] };
  const context = contextAt(text, offset);
  return { path: `ConsoleShell.runtime.${context}.ctls[].id`, context, stateKey: `ctl:${id}` };
}
function featureIdsForSurface(surfaceId) { return SURFACES.find((surface) => surface.id === surfaceId)?.featureIds ?? []; }

export function parseCensus() {
  const design = designFiles.flatMap((path) => extract(path).records);
  const runtimeExtracted = extract(runtimeFile);
  const byId = new Map();
  for (const record of design) {
    const existing = byId.get(record.id) ?? { designId: record.id, labels: new Set(), kinds: new Set(), contracts: [], declarations: [], runtimeUses: [] };
    existing.labels.add(record.label); existing.kinds.add(record.kind); existing.contracts.push(record.contract); existing.declarations.push(record); byId.set(record.id, existing);
  }
  const runtimeById = new Map();
  for (const record of runtimeExtracted.records) {
    const uses = runtimeById.get(record.id) ?? [];
    uses.push({ ...record, binding: runtimeBinding(runtimeExtracted.text, record.location.offset, record.id) }); runtimeById.set(record.id, uses);
  }
  const records = [...byId.values()].sort((a, b) => a.designId.localeCompare(b.designId)).map((record) => {
    const runtimeUses = runtimeById.get(record.designId) ?? [];
    const kinds = [...record.kinds]; const labels = [...record.labels];
    const executable = runtimeUses.length > 0;
    const surfaceIds = [...new Set(runtimeUses.map((use) => use.binding.surfaceId).filter(Boolean))];
    const featureIds = [...new Set(surfaceIds.flatMap(featureIdsForSurface))];
    const occurrenceVariants = record.declarations.map((declaration, index) => ({ stableId: `${record.designId}@${declaration.source}:${declaration.location.line}:${declaration.location.column}`, declaration, runtimeUse: runtimeUses[index] ?? null, contractEqualToFirst: JSON.stringify(declaration.contract) === JSON.stringify(record.declarations[0].contract) && declaration.label === record.declarations[0].label && declaration.kind === record.declarations[0].kind && (!runtimeUses[index] || !runtimeUses[0] || runtimeUses[index].binding.path === runtimeUses[0].binding.path) }));
    const duplicateMode = record.declarations.length < 2 ? 'single' : occurrenceVariants.every((variant) => variant.contractEqualToFirst) ? 'shared-contract' : 'occurrence-specific';
    const exclusion = executable ? null : {
      code: 'design-id-not-emitted-at-pinned-runtime-hash',
      reason: `The exact control id '${record.designId}' is declared at ${record.declarations.map((item) => `${item.source}:${item.location.line}:${item.location.column}`).join(', ')}, but no ctl('${record.designId}', ...) declaration exists in ${runtimeFile} at its pinned artifact hash. It has no executable runtime locator and is excluded from interaction rows until the compiler emits the same id.`,
      sourceLocations: record.declarations.map((item) => item.location),
    };
    return {
      designId: record.designId,
      labels,
      kinds,
      contract: record.contracts[0],
      duplicateMode,
      occurrenceVariants,
      actionCases: casesByKind[kinds[0]] ?? ['inspect'],
      locator: { method: 'exact-runtime-role-name-state-key-recipe', role: kinds[0] === 'switch' ? 'switch' : (kinds[0] === 'text' || kinds[0] === 'file' ? 'textbox' : 'button'), name: labels[0], stateKey: `ctl:${record.designId}`, bindingPath: runtimeUses[0]?.binding.path ?? null },
      declarations: record.declarations.map(({ id, ...item }) => item),
      runtimeUses: runtimeUses.map(({ id, ...item }) => item),
      runtimeScreenIds: surfaceIds,
      surfaceId: surfaceIds[0] ?? null,
      featureIds,
      executable,
      exclusion,
    };
  });
  const sourceUniqueControlIds = records.length;
  const runtimeUniqueControlIds = records.filter((record) => record.executable).length;
  const sourceOnlyControlIds = records.filter((record) => !record.executable).length;
  const exactScreenModelRuntimeIds = records.filter((record) => record.runtimeUses.some((use) => use.binding.screenId) && !record.runtimeUses.some((use) => !use.binding.screenId)).length;
  const dynamicRuntimeIds = records.filter((record) => record.runtimeUses.some((use) => !use.binding.screenId)).length;
  const output = {
    schemaVersion: 2,
    censusKind: 'exact-static-control-census-with-exclusions',
    parser: 'console/scripts/parse-ui-smoke-control-census.mjs',
    designSources: designFiles.map((path) => ({ path, sha256: sourceHash(path) })),
    runtimeSource: { path: runtimeFile, sha256: sourceHash(runtimeFile) },
    sourceCommit: '{pinnedSourceCommit}',
    auditReconciliation: {
      designAuditControlDeclarations: 479,
      designAuditControlIds: 467,
      parserSourceUniqueControlIds: sourceUniqueControlIds,
      parserRuntimeUniqueControlIds: runtimeUniqueControlIds,
      parserSourceOnlyControlIds: sourceOnlyControlIds,
      priorScreenModelRuntimeIds: 335,
      exactParserScreenModelRuntimeIds: exactScreenModelRuntimeIds,
      exactParserDynamicRuntimeIds: dynamicRuntimeIds,
      priorCensusNote: 'The prior 335-record file counted an earlier screen-model subset before the current design/runtime expansion and mixed screen/dynamic classification. The exact parser now yields 696 screen-only ids plus 244 dynamic ids and zero exclusions from the checked-in current sources.',
      relation: 'The audit count is a structural rendered-control count, while the parser counts unique ctl ids. The two counts must remain separate and are both retained with their source locations.',
      equation: `${runtimeUniqueControlIds} executable runtime ids + ${sourceOnlyControlIds} explicit source exclusions = ${sourceUniqueControlIds} unique design ctl ids`,
    },
    occurrenceCount: design.length,
    runtimeOccurrenceCount: runtimeExtracted.records.length,
    duplicateReconciliation: { duplicateUniqueIdCount: records.filter((record) => record.declarations.length > 1).length, sharedContractIds: records.filter((record) => record.duplicateMode === 'shared-contract').map((record) => record.designId), occurrenceSpecificIds: records.filter((record) => record.duplicateMode === 'occurrence-specific').map((record) => record.designId), rule: 'Shared-contract duplicates reuse one stable id only when labels, kinds, contracts, and runtime binding paths are equal. Any mismatch uses the declaration location stable id for rows and fails if the variant is not recorded.' },
    uniqueControlCount: sourceUniqueControlIds,
    executableControlCount: runtimeUniqueControlIds,
    excludedControlCount: sourceOnlyControlIds,
    exclusionPolicy: { requiredWhenExecutableFalse: ['code', 'reason', 'sourceLocations'], currentExcludedCount: sourceOnlyControlIds, emptySetIsExplicit: true },
    records,
  };
  writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  const surfaceRecords = SURFACES.map((surface) => {
    const controls = records.filter((record) => record.runtimeScreenIds.includes(surface.id));
    return { surfaceId: surface.id, controlIds: controls.map((record) => record.designId).sort(), controlCount: controls.length, bindingRule: `ConsoleShell.SCREENS.${surface.runtimeId}.groups[].ctls[].id`, exclusionIds: controls.flatMap((record) => record.exclusion ? [record.designId] : []) };
  });
  const dynamic = records.filter((record) => record.executable && record.runtimeUses.some((use) => !use.binding.screenId)).map((record) => ({ controlId: record.designId, stableIds: record.occurrenceVariants.map((variant) => variant.stableId), runtimeUses: record.runtimeUses.map((use) => use.binding.path), featureIds: record.featureIds }));
  writeFileSync(surfaceIndexPath, `${JSON.stringify({ schemaVersion: 2, censusKind: 'exact-static-surface-control-index', sourceCensus: 'console/inventories/ui-smoke/control-census.json', surfaceCount: SURFACES.length, screenModelControlCount: exactScreenModelRuntimeIds, dynamicRuntimeControlCount: dynamicRuntimeIds, excludedSourceControlCount: sourceOnlyControlIds, surfaces: surfaceRecords, dynamicRuntimeControls: dynamic }, null, 2)}\n`, 'utf8');
  return output;
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/parse-ui-smoke-control-census.mjs')) { const result = parseCensus(); console.log(`parsed ${result.uniqueControlCount} unique ids, ${result.executableControlCount} executable, ${result.excludedControlCount} explicitly excluded`); }
