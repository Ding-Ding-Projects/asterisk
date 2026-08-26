import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CANONICAL_FEATURE_IDS = [
  'language-modes', 'funny-levels', 'dialog-emojis', 'school-mode', 'narration', 'scheduled-settings',
  'external-settings-sources', 'dim-sum-surprise', 'regex-builder', 'non-blocking-notifications', 'status-hub',
  'material-appearance', 'app-logo-customization', 'local-file-converter', 'ollama-suite-manager', 'browser-style-tabs',
  'tab-groups-and-searches', 'command-palette', 'destructive-action-confirmation', 'local-version-history', 'changelog-viewer',
  'external-editor-handoff', 'complete-exports', 'bulk-actions', 'accessibility', 'responsive-sizing',
  'personal-vocabulary-upload', 'per-element-toy-locks', 'support-tickets', 'unlock-ladder', 'built-in-authenticator',
  'attention-modes', 'browser-extension-download-surfaces', 'offline-documentation-browser', 'app-display-name',
  'guided-forms', 'bounded-overlays', 'context-menu-shortcuts', 'long-operation-progress', 'in-context-recovery',
  'provider-markup-rendering', 'forge-publishing', 'collapsible-filters', 'automatic-updates',
];
const REQUIRED_NEGATIVE_CASES = ['whole-feature-disappearance', 'whole-page-disappearance', 'renamed-symbol', 'commented-symbol', 'stale-commit', 'missing-evidence', 'route-only-prose', 'fake-success', 'sample-data'];
const REQUIRED_SURFACE_KIND_COUNTS = { desktop: 1, 'desktop-login': 1, 'desktop-setup': 1, 'desktop-destination': 32, 'desktop-overlay': 17, 'site-page': 6, 'generated-docs-route': 82, 'browser-extension-state': 3 };
const REQUIRED_TOP_LEVEL_SURFACES = ['site-index', 'site-product', 'site-documentation', 'site-downloads', 'site-status', 'site-settings'];
const STATUS_VALUES = ['absent', 'partial', 'implemented-unverified', 'verified'];
// A component is a named UI declaration. It remains distinct from a generic
// const so the canonical inventory can state the implementation category.
const SYMBOL_KINDS = ['class', 'component', 'const', 'function', 'import', 'method', 'mount'];

function exactSet(actual, expected, label) {
  if (!Array.isArray(actual)) throw new Error(`${label}: array required`);
  if (actual.length !== expected.length) throw new Error(`${label}: expected ${expected.length} entries, found ${actual.length}`);
  const unique = new Set(actual);
  if (unique.size !== actual.length) throw new Error(`${label}: duplicate identifier found`);
  for (const value of expected) if (!unique.has(value)) throw new Error(`${label}: missing exact identifier '${value}'`);
  for (const value of unique) if (!expected.includes(value)) throw new Error(`${label}: unexpected identifier '${value}'`);
}
function exactKeys(record, expected, label) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error(`${label}: object required`);
  exactSet(Object.keys(record), expected, label);
}
function escaped(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function sourceHasExactSymbol(root, symbol) {
  if (!root) return true;
  const absolute = resolve(root, 'console', symbol.path);
  if (!existsSync(absolute)) throw new Error(`symbol ${symbol.path}#${symbol.name}: source path is absent`);
  const source = readFileSync(absolute, 'utf8').replace(/\r\n|\r/g, '\n');
  const name = escaped(symbol.name);
  const declaration = new RegExp(`^\\s*(?:export\\s+)?(?:async\\s+)?(?:function|class|const|let|var)\\s+${name}\\b`, 'm');
  const component = new RegExp(`^\\s*(?:export\\s+)?(?:default\\s+)?(?:function|class|const)\\s+${name}\\b`, 'm');
  const member = new RegExp(`^\\s*(?:(?:public|private|protected|static|async)\\s+)*${name}\\s*(?::|=|\\()`, 'm');
  const importOrMount = new RegExp(`^\\s*(?:import[^\\n]*\\b${name}\\b|.*\\b${name}\\b.*(?:mount|render|createRoot))`, 'm');
  const imported = symbol.kind === 'import' && new RegExp(`^\\s*import\\b[^;]*\\b${name}\\b[^;]*\\bfrom\\b`, 'ms').test(source);
  const exactComponent = symbol.kind === 'component' && component.test(source);
  if (!(exactComponent || declaration.test(source) || member.test(source) || importOrMount.test(source) || imported)) throw new Error(`symbol ${symbol.path}#${symbol.name}: exact declaration or registration is absent`);
}
function validateSymbols(value, label, root) {
  if (!Array.isArray(value)) throw new Error(`${label}: symbols array required`);
  for (const symbol of value) {
    exactKeys(symbol, ['path', 'name', 'kind'], `${label} symbol`);
    if (typeof symbol.path !== 'string' || !/^[^\\/].*\.[cm]?[jt]sx?$/u.test(symbol.path)) throw new Error(`${label}: invalid symbol path`);
    if (typeof symbol.name !== 'string' || !/^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(symbol.name)) throw new Error(`${label}: invalid exact symbol name`);
    if (!SYMBOL_KINDS.includes(symbol.kind)) throw new Error(`${label}: invalid symbol kind '${symbol.kind}'`);
    sourceHasExactSymbol(root, symbol);
  }
}
function validateEvidence(row, label, currentCommit) {
  for (const state of ['localization', 'persistence', 'focusedChecks', 'negativeEvidence', 'builtInteraction', 'captures', 'designParity']) if (!row[state] || typeof row[state] !== 'object') throw new Error(`${label}: ${state} evidence object required`);
  exactKeys(row.dataProvenance, ['kind', 'source', 'sourceRevision', 'sampleData'], `${label}.dataProvenance`);
  if (row.dataProvenance.sampleData !== false) throw new Error(`${label}: sample data is not allowed in canonical evidence`);
  exactKeys(row.negativeEvidence, ['state', 'script', 'cases'], `${label}.negativeEvidence`);
  if (row.negativeEvidence.script !== 'console/scripts/negative-surface-completeness.mjs') throw new Error(`${label}: negative regression script drift`);
  exactSet(row.negativeEvidence.cases, REQUIRED_NEGATIVE_CASES, `${label}.negativeEvidence.cases`);
  exactKeys(row.builtInteraction, ['state', 'commit', 'route', 'evidence'], `${label}.builtInteraction`);
  exactKeys(row.captures, ['state', 'currentCommit', 'paths'], `${label}.captures`);
  exactKeys(row.designParity, ['state', 'referenceRoute', 'builtRoute', 'tuple', 'rawCaptures', 'sideBySide', 'visualDiff'], `${label}.designParity`);
  exactKeys(row.designParity.tuple, ['state', 'theme', 'viewport', 'scale'], `${label}.designParity.tuple`);
  if (row.status === 'verified') {
    if (row.demoState !== 'verified') throw new Error(`${label}: verified status requires verified demoState`);
    if (row.builtInteraction.state !== 'verified' || !row.builtInteraction.commit) throw new Error(`${label}: verified status requires built interaction evidence`);
    if (row.captures.state !== 'verified' || !row.captures.currentCommit || row.captures.paths.length === 0) throw new Error(`${label}: verified status requires current-commit captures`);
    if (row.designParity.state !== 'verified' || row.designParity.rawCaptures.length === 0 || !row.designParity.sideBySide || !row.designParity.visualDiff) throw new Error(`${label}: verified status requires design parity evidence`);
    if (row.focusedChecks.state !== 'verified' || row.localization.state !== 'verified' || row.persistence.state !== 'verified') throw new Error(`${label}: verified status requires focused, localization, and persistence evidence`);
    if (currentCommit && (row.builtInteraction.commit !== currentCommit || row.captures.currentCommit !== currentCommit)) throw new Error(`${label}: evidence is stale for current commit ${currentCommit}`);
  }
}
function validateRow(row, featureId, surface, { root, currentCommit }) {
  exactKeys(row, ['featureId', 'status', 'demoState', 'dataProvenance', 'implementation', 'registration', 'route', 'documentation', 'localization', 'persistence', 'focusedChecks', 'negativeEvidence', 'builtInteraction', 'captures', 'designParity'], `${surface.id}.${featureId}`);
  if (row.featureId !== featureId) throw new Error(`${surface.id}: feature row identifier drift`);
  if (!STATUS_VALUES.includes(row.status)) throw new Error(`${surface.id}.${featureId}: invalid status '${row.status}'`);
  if (typeof row.route !== 'string' || row.route.length < 4) throw new Error(`${surface.id}.${featureId}: exact route required`);
  for (const field of ['implementation', 'registration']) {
    exactKeys(row[field], ['registry', 'paths', 'symbols'], `${surface.id}.${featureId}.${field}`);
    if (!Array.isArray(row[field].paths)) throw new Error(`${surface.id}.${featureId}.${field}.paths: array required`);
    validateSymbols(row[field].symbols, `${surface.id}.${featureId}.${field}`, root);
  }
  if (row.status !== 'absent' && !row.implementation.registry && row.implementation.symbols.length === 0 && row.implementation.paths.length === 0) throw new Error(`${surface.id}.${featureId}: route-only prose cannot claim an implemented state`);
  exactKeys(row.documentation, ['state', 'path', 'section'], `${surface.id}.${featureId}.documentation`);
  if (!['present', 'absent'].includes(row.documentation.state)) throw new Error(`${surface.id}.${featureId}: invalid documentation state`);
  validateEvidence(row, `${surface.id}.${featureId}`, currentCommit);
}

export function validateSurfaceInventory(data, { allowUnverified = false, root, currentCommit } = {}) {
  if (data?.schemaVersion !== 2) throw new Error('surface inventory: schemaVersion 2 required');
  if (data.source !== 'hand-written-canonical-requirements') throw new Error('surface inventory: canonical source marker drift');
  if (!/^[0-9a-f]{10}$/u.test(data.baselineCommit)) throw new Error('surface inventory: baseline commit must be a short hexadecimal revision');
  exactSet(data.features?.map((feature) => feature.id), CANONICAL_FEATURE_IDS, 'canonical feature identifiers');
  exactSet(data.statusValues, STATUS_VALUES, 'status values');
  if (!Array.isArray(data.requirementSet) || data.requirementSet.length !== 12) throw new Error('surface inventory: complete requirement set required');
  const requirementIds = data.requirementSet.map((requirement) => requirement.id);
  exactSet(requirementIds, ['implementation', 'registration', 'route', 'documentation', 'localization', 'persistence', 'focused-checks', 'negative-evidence', 'built-interaction', 'captures', 'design-parity', 'provenance'], 'requirement identifiers');
  for (const feature of data.features) { exactKeys(feature, ['id', 'title', 'requirementIds'], `feature ${feature.id}`); exactSet(feature.requirementIds, requirementIds, `feature ${feature.id}.requirementIds`); }
  if (!Array.isArray(data.surfaceCatalog) || !Array.isArray(data.surfaces)) throw new Error('surface inventory: surface catalog and rows required');
  exactSet(data.surfaceCatalog.map((surface) => surface.id), data.surfaces.map((surface) => surface.id), 'surface catalog and rows');
  for (const [kind, expected] of Object.entries(REQUIRED_SURFACE_KIND_COUNTS)) { const actual = data.surfaceCatalog.filter((surface) => surface.kind === kind).length; if (actual !== expected) throw new Error(`surface inventory: ${kind} requires ${expected} exact surfaces, found ${actual}`); }
  for (const id of REQUIRED_TOP_LEVEL_SURFACES) if (!data.surfaceCatalog.some((surface) => surface.id === id)) throw new Error(`surface inventory: missing exact top-level page '${id}'`);
  const docs = data.surfaceCatalog.filter((surface) => surface.kind === 'generated-docs-route');
  if (docs.some((surface) => !/^https:\/\/ding-ding-projects\.github\.io\/asterisk\/docs\/.+\.html$/u.test(surface.route))) throw new Error('surface inventory: generated docs route must be an exact published HTML route');
  const extension = data.surfaceCatalog.filter((surface) => surface.kind === 'browser-extension-state');
  exactSet(extension.map((surface) => surface.id), ['extension-start-download', 'extension-downloading', 'extension-download-complete'], 'browser-extension state identifiers');
  for (const surface of data.surfaces) {
    exactKeys(surface, ['id', 'kind', 'route', 'registry', 'rows'], `${surface.id} surface`);
    if (!data.surfaceCatalog.some((entry) => entry.id === surface.id && entry.kind === surface.kind && entry.route === surface.route)) throw new Error(`${surface.id}: catalog route mismatch`);
    exactSet(surface.rows.map((row) => row.featureId), CANONICAL_FEATURE_IDS, `${surface.id}.rows`);
    for (const row of surface.rows) { validateRow(row, row.featureId, surface, { root, currentCommit }); if (!allowUnverified && row.status !== 'verified') throw new Error(`${surface.id}.${row.featureId}: evidence remains ${row.status}`); }
  }
  exactKeys(data.negativeRegression, ['script', 'cases', 'state'], 'negative regression declaration');
  if (data.negativeRegression.script !== 'console/scripts/negative-surface-completeness.mjs') throw new Error('negative regression script drift');
  exactSet(data.negativeRegression.cases, REQUIRED_NEGATIVE_CASES, 'negative regression cases');
  return { surfaces: data.surfaces.length, featuresPerSurface: CANONICAL_FEATURE_IDS.length, rows: data.surfaces.length * CANONICAL_FEATURE_IDS.length };
}

export function validateFeatureRegistry(data, { surface, root, currentCommit } = {}) {
  if (data?.schemaVersion !== 2) throw new Error(`${surface} feature registry: schemaVersion 2 required`);
  if (data.canonicalMatrix !== 'console/inventories/surface-completeness.json') throw new Error(`${surface} feature registry: canonical matrix reference drift`);
  if (data.surface !== surface) throw new Error(`${surface} feature registry: surface identifier drift`);
  exactSet(Object.keys(data.features ?? {}), CANONICAL_FEATURE_IDS, `${surface} feature registry identifiers`);
  for (const id of CANONICAL_FEATURE_IDS) {
    const feature = data.features[id];
    if (!STATUS_VALUES.includes(feature.status)) throw new Error(`${surface}.${id}: invalid status`);
    exactKeys(feature.implementation, ['paths', 'symbols'], `${surface}.${id}.implementation`);
    exactKeys(feature.registration, ['paths', 'symbols'], `${surface}.${id}.registration`);
    validateSymbols(feature.implementation.symbols, `${surface}.${id}.implementation`, root);
    validateSymbols(feature.registration.symbols, `${surface}.${id}.registration`, root);
    if (feature.status === 'verified') throw new Error(`${surface}.${id}: verified registry claim is not permitted without evidence row`);
    if (currentCommit && feature.builtInteraction?.commit && feature.builtInteraction.commit !== currentCommit) throw new Error(`${surface}.${id}: stale built evidence`);
  }
  return { features: CANONICAL_FEATURE_IDS.length };
}

const destinationIds = ['dash', 'live', 'endpoints', 'trunks', 'trunkauth', 'canvas', 'ivr', 'queues', 'voicemail', 'confbridge', 'moh', 'codecs', 'cdr', 'ami', 'modules', 'logger', 'security', 'cli', 'memory', 'sync', 'skills', 'hub', 'vocab', 'ops', 'secrets', 'servers', 'arcade', 'notifications', 'history', 'customise', 'appearance', 'about'];
const transientStates = ['appearOpen', 'ceremonyOpen', 'ctxOpen', 'infoOpen', 'lockOpen', 'onboardOpen', 'paletteOpen', 'regexOpen', 'renameOpen', 'subOpen', 'sureOpen', 'tabColourOpen', 'tabFilterOpen', 'toastOpen', 'tourOpen', 'unlockOpen', 'wizardOpen'];
const parityTemplateKeys = ['referenceRoute', 'builtRoute', 'referenceCapture', 'builtCapture', 'sideBySide', 'visualDiff', 'materialAudit'];
const exactRails = { pbx: 8, media: 4, data: 2, system: 4, agent: 7, app: 7 };
const exactBindings = { total: 265, click: 212, change: 10, input: 10, contextmenu: 9, dragstart: 4, dragover: 4, drop: 4, dragend: 4, mousedown: 5, mouseenter: 1, mouseleave: 1, mouseup: 1 };

export function validateParityInventory(data, { allowUnverified = false } = {}) {
  if (data?.schemaVersion !== 1) throw new Error('design parity inventory: schemaVersion 1 required');
  if (data.sourceArchive?.sha256 !== '9A4284745A745C18A18B0A23D2A2F5851A79F9B6EFCBC5EE30EDCD69CEA2863F') throw new Error('design parity inventory: source archive SHA-256 drift');
  if (data.sourceArchive?.verification !== 'independent-authoritative-audit') throw new Error('design parity inventory: source verification label drift');
  exactKeys(data.evidenceTemplates, parityTemplateKeys, 'design parity evidenceTemplates');
  exactKeys(data.compiledEvidence, ['method', 'test', 'coverage'], 'design parity compiledEvidence');
  if (typeof data.compiledEvidence.test !== 'string' || !/^console\/tests\/ui\/[A-Za-z0-9._-]+\.tsx$/u.test(data.compiledEvidence.test)) throw new Error('design parity inventory: compiled rendering test is required');
  if (typeof data.compiledEvidence.method !== 'string' || !data.compiledEvidence.method.includes('console/scripts/compile-design.mjs')) throw new Error('design parity inventory: compiled design method must name the compiler');
  if (typeof data.compiledEvidence.coverage !== 'string' || !data.compiledEvidence.coverage.trim()) throw new Error('design parity inventory: compiled evidence coverage is required');
  if (data.auditBaseline?.destinationCount !== 32) throw new Error('design parity inventory: destination count must be 32');
  exactSet(Object.keys(data.auditBaseline?.railCounts ?? {}), Object.keys(exactRails), 'rail identifiers');
  for (const [rail, count] of Object.entries(exactRails)) if (data.auditBaseline.railCounts[rail] !== count) throw new Error(`design parity inventory: rail '${rail}' count drift`);
  exactSet(Object.keys(data.auditBaseline?.declarativeBindings ?? {}), Object.keys(exactBindings), 'binding identifiers');
  for (const [event, count] of Object.entries(exactBindings)) if (data.auditBaseline.declarativeBindings[event] !== count) throw new Error(`design parity inventory: binding '${event}' drift`);
  const bindingSum = Object.entries(exactBindings).filter(([event]) => event !== 'total').reduce((sum, [, count]) => sum + count, 0);
  if (bindingSum !== exactBindings.total) throw new Error('design parity validator: hard-coded binding arithmetic is invalid');
  if (data.auditBaseline.distinctExpressionCount !== 168 || data.auditBaseline.controlCount !== 479 || data.auditBaseline.transientStateFamilyCount !== 17) throw new Error('design parity inventory: audit baseline drift');
  if (!Array.isArray(data.destinations)) throw new Error('design parity inventory: destinations array required');
  exactSet(data.destinations.map((destination) => destination.id), destinationIds, 'destination identifiers');
  for (const destination of data.destinations) { exactKeys(destination, ['rail', 'id', 'status'], `destination ${destination.id} fields`); if (!(destination.rail in exactRails)) throw new Error(`destination ${destination.id}: invalid rail`); if (!['verified', 'compiled', 'unverified'].includes(destination.status)) throw new Error(`destination ${destination.id}: invalid status`); if (!allowUnverified && destination.status !== 'verified') throw new Error(`destination ${destination.id}: evidence remains ${destination.status}`); }
  exactSet(data.transientStateFamilies ?? [], transientStates, 'transient-state identifiers');
  return { destinations: data.destinations.length, transientStates: data.transientStateFamilies.length };
}
