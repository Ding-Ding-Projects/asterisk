/**
 * Reviewed, hand-written source inventory for the final UI smoke evidence pass.
 *
 * The 143 records below name real routes, runtime screens, design state
 * families, site routes, and viewport equivalents. Actual control ids live in
 * the checked-in control census and are joined by surface id. Nothing in the
 * runtime generator discovers controls from pixels, DOM output, or a guessed
 * modulo assignment.
 */

export const INVENTORY_VERSION = 2;
export const EXPECTED_FEATURE_COUNT = 44;
export const EXPECTED_SURFACE_COUNT = 143;
// Re-derived from the current checked-in design/runtime census: 5,486 real
// action cases across three language modes, plus 669 route/equivalent proofs.
export const EXPECTED_ROW_COUNT = 17127;
export const LANGUAGE_MODES = ['en', 'yue', 'both'];
export const PENDING_CONTRACTS = [
  { id: 'migration', status: 'pending-implementation', reason: 'No implementation commit is present in this repository, so no executable control, route, receipt, or evidence row is claimed.' },
  { id: 'backup', status: 'pending-implementation', reason: 'No implementation commit is present in this repository, so backup evidence is intentionally absent rather than padded.' },
  { id: 'local-git-history', status: 'pending-implementation', reason: 'No user-facing local history implementation commit is present for this contract lane.' },
  { id: 'configurable-shared-instructions', status: 'pending-implementation', reason: 'No implementation commit is present for a user-configurable shared-instructions setting.' },
  { id: 'asterisk-admin-resource-wiring', status: 'pending-implementation', reason: 'Asterisk resource wiring is not integrated into this evidence lane, so no placeholder controls or rows are claimed.' },
  { id: 'freepbx-parity', status: 'pending-implementation', reason: 'FreePBX parity has no integrated implementation commit in this lane, so no synthetic surface or evidence is counted.' },
  { id: 'migration-successor', status: 'pending-implementation', reason: 'The migration successor identity has no integrated implementation commit, so its real ids and mappings remain absent.' },
];

export const FEATURES = [
  'language-modes', 'funny-levels', 'dialog-emojis', 'school-mode', 'narration',
  'scheduled-settings', 'external-settings-sources', 'dim-sum-surprise',
  'regex-builder', 'non-blocking-notifications', 'status-hub', 'material-appearance',
  'app-logo-customization', 'local-file-converter', 'ollama-suite-manager',
  'browser-style-tabs', 'tab-groups-and-searches', 'command-palette',
  'destructive-action-confirmation', 'local-version-history', 'changelog-viewer',
  'external-editor-handoff', 'complete-exports', 'bulk-actions', 'accessibility',
  'responsive-sizing', 'personal-vocabulary-upload', 'per-element-toy-locks',
  'support-tickets', 'unlock-ladder', 'built-in-authenticator', 'attention-modes',
  'browser-extension-download-surfaces', 'offline-documentation-browser',
  'app-display-name', 'guided-forms', 'bounded-overlays', 'context-menu-shortcuts',
  'long-operation-progress', 'in-context-recovery', 'provider-markup-rendering',
  'forge-publishing', 'collapsible-filters', 'automatic-updates',
];

const destinationIds = [
  'dash', 'live', 'endpoints', 'trunks', 'trunkauth', 'canvas', 'ivr', 'queues',
  'voicemail', 'confbridge', 'moh', 'codecs', 'cdr', 'ami', 'modules', 'logger',
  'security', 'cli', 'memory', 'sync', 'skills', 'hub', 'vocab', 'ops', 'secrets',
  'servers', 'arcade', 'notifications', 'history', 'customise', 'appearance', 'about',
];

const crossSurfaceIds = [
  'fcodes', 'iaxpeers', 'httpd', 'docs', 'changelog',
  'onboarding', 'tour', 'settings-shell', 'settings-language', 'settings-appearance',
  'settings-audio', 'settings-schedule', 'settings-external-sources', 'settings-vocabulary',
  'settings-accessibility', 'settings-attention', 'settings-updater', 'settings-history',
  'settings-logo', 'settings-display-name', 'settings-advanced', 'settings-editor',
  'settings-notifications', 'settings-tabs', 'settings-locks', 'settings-authenticator',
  'palette', 'tab-overflow', 'tab-group-picker', 'regex-builder', 'appearance-editor',
  'colour-picker', 'font-picker', 'lock-wizard', 'support-tickets', 'authenticator',
  'history-manager', 'update-window',
];

const pagesRouteIds = [
  'site-home', 'site-product', 'site-documentation', 'site-downloads', 'site-status', 'site-settings',
  'site-docs-index', 'site-docs-platform', 'site-docs-pbx', 'site-docs-media', 'site-docs-data', 'site-docs-system', 'site-docs-agent', 'site-docs-installer', 'site-docs-updates', 'site-docs-accessibility', 'site-docs-tabs', 'site-docs-export', 'site-docs-support', 'site-docs-ui-smoke',
];

const pagesControlIds = [
  'site-settings-language', 'site-settings-funny-levels', 'site-settings-emoji',
  'site-settings-school', 'site-settings-vocabulary', 'site-settings-logo',
  'site-settings-display-name', 'site-settings-appearance', 'site-settings-schedule',
  'site-settings-accessibility', 'site-settings-attention', 'site-settings-tabs',
  'site-settings-history', 'site-settings-notifications', 'site-settings-export',
  'site-settings-search', 'site-feature-filter', 'site-surface-filter', 'site-release-filter',
  'site-changelog-filter', 'site-regex-dialog', 'site-palette-dialog', 'site-tab-menu',
  'site-context-menu', 'site-notification-centre',
];

const sharedStateIds = [
  'state-default', 'state-empty', 'state-loading', 'state-success', 'state-error',
  'state-offline', 'state-disabled', 'state-locked', 'state-unlocked', 'state-confirmation',
  'state-progress', 'state-cancelled', 'state-no-match', 'state-invalid-input',
  'state-narrow', 'state-high-scale', 'state-bilingual',
];

const accessibilityIds = [
  'layout-light-theme', 'layout-dark-theme', 'layout-contrast-theme',
  'layout-width-320', 'layout-width-640', 'layout-width-920', 'layout-width-1440',
  'layout-scale-100', 'layout-scale-125', 'layout-scale-150', 'layout-scale-200',
];

const FEATURE_SURFACE_MAP = {
  'language-modes': 'settings-language', 'funny-levels': 'settings-language',
  'dialog-emojis': 'settings-language', 'school-mode': 'settings-language',
  narration: 'settings-audio', 'scheduled-settings': 'settings-schedule',
  'external-settings-sources': 'settings-external-sources', 'dim-sum-surprise': 'arcade',
  'regex-builder': 'regex-builder', 'non-blocking-notifications': 'notifications',
  'status-hub': 'hub', 'material-appearance': 'appearance-editor',
  'app-logo-customization': 'settings-logo', 'local-file-converter': 'settings-advanced',
  'ollama-suite-manager': 'settings-advanced', 'browser-style-tabs': 'settings-tabs',
  'tab-groups-and-searches': 'tab-group-picker', 'command-palette': 'palette',
  'destructive-action-confirmation': 'lock-wizard', 'local-version-history': 'history-manager',
  'changelog-viewer': 'changelog', 'external-editor-handoff': 'settings-editor',
  'complete-exports': 'settings-editor', 'bulk-actions': 'settings-notifications',
  accessibility: 'settings-accessibility', 'responsive-sizing': 'layout-width-320',
  'personal-vocabulary-upload': 'settings-vocabulary', 'per-element-toy-locks': 'settings-locks',
  'support-tickets': 'support-tickets', 'unlock-ladder': 'state-locked',
  'built-in-authenticator': 'authenticator', 'attention-modes': 'settings-attention',
  'browser-extension-download-surfaces': 'update-window', 'offline-documentation-browser': 'docs',
  'app-display-name': 'settings-display-name', 'guided-forms': 'settings-advanced',
  'bounded-overlays': 'appearance-editor', 'context-menu-shortcuts': 'settings-tabs',
  'long-operation-progress': 'update-window', 'in-context-recovery': 'state-error',
  'provider-markup-rendering': 'docs', 'forge-publishing': 'settings-editor',
  'collapsible-filters': 'settings-notifications', 'automatic-updates': 'settings-updater',
};

const EXTRA_STATE_SURFACES = new Set([
  ...destinationIds, ...crossSurfaceIds, ...pagesControlIds.slice(0, 16), ...accessibilityIds,
]);
const BASE_ROUTE_CASES = ['exact-route-open', 'one-target-privacy-proof', 'lifecycle-cleanup-proof', 'redaction-and-receipt-proof'];
const EXTRA_ROUTE_CASE = 'state-transition-observable';
const DESIGN_REFERENCE_ROUTE = {
  framework: 'x-dc',
  sourceFile: 'design/Asterisk Console M3.dc.html',
  frameworkFile: 'design/support.js',
  requiredMarkers: ['<x-dc>', '<script type="text/x-dc"', '<script src="./support.js"'],
  url: 'file://{repositoryRoot}/design/Asterisk%20Console%20M3.dc.html',
};
const BUILT_RUNTIME_REGISTRATION = {
  sourceFile: 'console/app/electron/main.ts',
  sourceLine: 165,
  registrationPattern: "mainWindow.loadFile(join(import.meta.dirname, '../../../dist/index.html'))",
  rendererSource: 'console/app/renderer/src/generated/console.tsx',
  rendererNavigationPattern: 'openScreen = (k) => this.setState(st => ({ rndNonce:st.rndNonce + 1, screen:k, railId:SCREENS[k] ? SCREENS[k].rail : st.railId }))',
  expectedUrl: 'file://{builtRendererPath}',
};
const RUNTIME_NAVIGATION = {
  onboarding: "startOnboarding()",
  tour: "setState({ tourOpen:true, tourStep:0 })",
  'settings-shell': "openScreen('customise')",
  'settings-language': "openScreen('customise'); focus('lang_mode')",
  'settings-appearance': "openScreen('appearance')",
  'settings-audio': "openScreen('customise'); focus('fun_sound')",
  'settings-schedule': "openScreen('customise'); focus('y_every')",
  'settings-external-sources': "openScreen('customise'); focus('ht_status')",
  'settings-vocabulary': "openScreen('appearance'); focus('va_file')",
  'settings-accessibility': "openScreen('customise'); focus('th_contrast')",
  'settings-attention': "openScreen('customise'); focus('att_focus')",
  'settings-updater': "openScreen('ops'); focus('o_check')",
  'settings-history': "openScreen('history')",
  'settings-logo': "openScreen('customise'); focus('ed_choice')",
  'settings-display-name': "openScreen('customise'); focus('id_name')",
  'settings-advanced': "openScreen('customise'); focus('bh_start')",
  'settings-editor': "openScreen('customise'); focus('ed_choice')",
  'settings-notifications': "openScreen('notifications')",
  'settings-tabs': "openScreen('customise'); focus('ly_tabs')",
  'settings-locks': "openScreen('customise'); action('openUnlock')",
  'settings-authenticator': "openScreen('customise'); action('openUnlock'); setState({ lockStep:1 })",
  palette: 'togglePalette()',
  'tab-overflow': "setState({ ctxOpen:true, ctxSub:'tabs' })",
  'tab-group-picker': "setState({ ctxOpen:true, ctxSub:'gtabs' })",
  'regex-builder': 'openNavRegex()',
  'appearance-editor': "setState({ appearOpen:true, appearTarget:'selected' })",
  'colour-picker': "setState({ tabColourOpen:true })",
  'font-picker': "setState({ appearOpen:true, appearTarget:'font' })",
  'lock-wizard': 'openUnlock()',
  'support-tickets': "openScreen('customise'); focus('sup_category')",
  authenticator: "openScreen('customise'); action('openUnlock'); setState({ lockStep:1 })",
  'history-manager': "openScreen('history')",
  'update-window': "openScreen('ops')",
};
const PAGES_ROUTE_PATHS = {
  'site-home': 'index.html', 'site-product': 'product.html', 'site-documentation': 'documentation.html', 'site-downloads': 'downloads.html', 'site-status': 'status.html', 'site-settings': 'settings.html',
  'site-docs-index': 'docs/README.html', 'site-docs-platform': 'docs/platform/README.html', 'site-docs-pbx': 'docs/pbx/README.html', 'site-docs-media': 'docs/media/README.html', 'site-docs-data': 'docs/data/README.html', 'site-docs-system': 'docs/system/README.html', 'site-docs-agent': 'docs/agent/README.html', 'site-docs-installer': 'docs/installer-iso.html', 'site-docs-updates': 'docs/platform/automatic-updates.html', 'site-docs-accessibility': 'docs/platform/accessibility.html', 'site-docs-tabs': 'docs/platform/browser-style-tabs.html', 'site-docs-export': 'docs/platform/complete-exports.html', 'site-docs-support': 'docs/platform/support-tickets.html', 'site-docs-ui-smoke': 'docs/platform/ui-smoke-evidence.html',
};
const PAGES_CONTROL_PATHS = {
  'site-settings-language': 'settings.html#language-mode', 'site-settings-funny-levels': 'settings.html#english-funny', 'site-settings-emoji': 'settings.html#main', 'site-settings-school': 'settings.html#main', 'site-settings-vocabulary': 'settings.html#vocabulary-file', 'site-settings-logo': 'settings.html#logo-file', 'site-settings-display-name': 'settings.html#main', 'site-settings-appearance': 'settings.html#accent-color', 'site-settings-schedule': 'settings.html#schedule-enabled', 'site-settings-accessibility': 'settings.html#attention-settings', 'site-settings-attention': 'settings.html#attention-settings', 'site-settings-tabs': 'settings.html#main', 'site-settings-history': 'settings.html#notification-history', 'site-settings-notifications': 'settings.html#notification-open', 'site-settings-export': 'settings.html#settings-export', 'site-settings-search': 'settings.html#settings-search',
  'site-feature-filter': 'documentation.html#documentation-filters-panel', 'site-surface-filter': 'documentation.html#destination-map-panel', 'site-release-filter': 'downloads.html#main', 'site-changelog-filter': 'docs/platform/automatic-updates.html#article-content', 'site-regex-dialog': 'documentation.html#regex-dialog', 'site-palette-dialog': 'documentation.html#command-palette', 'site-tab-menu': 'documentation.html#destination-grid', 'site-context-menu': 'documentation.html#destination-grid', 'site-notification-centre': 'settings.html#notifications-dialog',
};
const DETERMINISTIC_STATE_ACTIONS = {
  'state-default': "setState({ screen:'dash', infoOpen:false, wizardOpen:false, paletteOpen:false })",
  'state-empty': "openScreen('memory'); set('tableFilter','All')",
  'state-loading': "setState({ oneClickRunning:true, oneClickStep:1 })",
  'state-success': "toast('UI smoke success receipt')",
  'state-error': "toast('UI smoke error receipt')",
  'state-offline': "setState({ toastOpen:true, toastText:'Offline' })",
  'state-disabled': "setState({ lockOpen:true, lockStep:0 })",
  'state-locked': 'openUnlock()', 'state-unlocked': 'closeUnlock()',
  'state-confirmation': "areYouSure('UI smoke confirmation','Bounded source fixture',3,()=>{})",
  'state-progress': "setState({ oneClickRunning:true, oneClickStep:1 })",
  'state-cancelled': 'cancelCeremony()',
  'state-no-match': "set('tableFilter','__ui_smoke_no_match__')",
  'state-invalid-input': "set('rxText','[')",
  'state-narrow': 'resizeViewport(320,900)', 'state-high-scale': "set('zoom',200)", 'state-bilingual': "set('values',Object.assign({}, this.state.values, { lang_mode:'both' }))",
};
const DETERMINISTIC_LAYOUT_ACTIONS = {
  'layout-light-theme': "setVal({ id:'th_mode', label:'Theme mode' }, 'Light')", 'layout-dark-theme': "setVal({ id:'th_mode', label:'Theme mode' }, 'Dark')", 'layout-contrast-theme': "setVal({ id:'th_contrast', label:'Contrast' }, 100)",
  'layout-width-320': 'resizeViewport(320,900)', 'layout-width-640': 'resizeViewport(640,900)', 'layout-width-920': 'resizeViewport(920,900)', 'layout-width-1440': 'resizeViewport(1440,1000)',
  'layout-scale-100': "set('zoom',100)", 'layout-scale-125': "set('zoom',125)", 'layout-scale-150': "set('zoom',150)", 'layout-scale-200': "set('zoom',200)",
};

function featureForSurface(id, group) {
  const direct = Object.entries(FEATURE_SURFACE_MAP).find(([, surfaceId]) => surfaceId === id)?.[0];
  if (direct) return direct;
  if (group === 'desktop-destination') return 'accessibility';
  if (group === 'pages-route') return 'offline-documentation-browser';
  if (group === 'pages-control-surface') return 'guided-forms';
  if (group === 'shared-state') return 'accessibility';
  return 'responsive-sizing';
}

function featuresForSurface(id, group) {
  const mapped = Object.entries(FEATURE_SURFACE_MAP).filter(([, surfaceId]) => surfaceId === id).map(([feature]) => feature);
  return mapped.length ? mapped : [featureForSurface(id, group)];
}

function routeTuple(id, group, state) {
  const stateQuery = `state=${encodeURIComponent(state)}`;
  if (group === 'desktop-destination') return {
    kind: 'electron-file', reference: DESIGN_REFERENCE_ROUTE, runtimeRegistration: BUILT_RUNTIME_REGISTRATION,
    expectedUrl: BUILT_RUNTIME_REGISTRATION.expectedUrl,
    transition: { from: BUILT_RUNTIME_REGISTRATION.expectedUrl, action: `openScreen('${id}')`, to: BUILT_RUNTIME_REGISTRATION.expectedUrl },
  };
  if (group === 'desktop-cross-surface') return {
    kind: 'electron-file', reference: DESIGN_REFERENCE_ROUTE, runtimeRegistration: BUILT_RUNTIME_REGISTRATION,
    expectedUrl: BUILT_RUNTIME_REGISTRATION.expectedUrl,
    transition: { from: BUILT_RUNTIME_REGISTRATION.expectedUrl, action: RUNTIME_NAVIGATION[id] ?? `openScreen('${id}')`, to: BUILT_RUNTIME_REGISTRATION.expectedUrl },
  };
  if (group === 'pages-route' || group === 'pages-control-surface') {
    const page = group === 'pages-control-surface' ? PAGES_CONTROL_PATHS[id] : PAGES_ROUTE_PATHS[id];
    if (!page) throw new Error(`no committed Pages file mapping exists for ${id}`);
    const servedPath = page.split('#')[0];
    const anchor = page.includes('#') ? page.slice(page.indexOf('#') + 1) : null;
    const sourceFile = servedPath.startsWith('docs/') ? `console/docs/${servedPath.slice(5).replace(/\.html$/u, '.md')}` : `console/site/${servedPath}`;
    return {
      kind: 'edge-hidden-desktop',
      reference: { sourceFile, servedPath: `/${page}`, anchor, anchorSource: anchor === 'article-content' ? 'console/site/build.mjs' : sourceFile, indexHome: servedPath === 'index.html', reachability: 'source-file-served-route-and-anchor-required' },
      expectedUrl: `https://ding-ding-projects.github.io/asterisk/${page}`,
      transition: { from: 'about:blank', action: `navigate('${page}')`, to: `https://ding-ding-projects.github.io/asterisk/${page}` },
    };
  }
  if (group === 'shared-state') return {
    kind: 'electron-file', reference: DESIGN_REFERENCE_ROUTE, runtimeRegistration: BUILT_RUNTIME_REGISTRATION,
    expectedUrl: BUILT_RUNTIME_REGISTRATION.expectedUrl,
    transition: { from: BUILT_RUNTIME_REGISTRATION.expectedUrl, action: DETERMINISTIC_STATE_ACTIONS[id], to: BUILT_RUNTIME_REGISTRATION.expectedUrl, observableState: id },
  };
  return {
    kind: 'electron-file', reference: DESIGN_REFERENCE_ROUTE, runtimeRegistration: BUILT_RUNTIME_REGISTRATION,
    expectedUrl: BUILT_RUNTIME_REGISTRATION.expectedUrl,
    transition: { from: BUILT_RUNTIME_REGISTRATION.expectedUrl, action: DETERMINISTIC_LAYOUT_ACTIONS[id], to: BUILT_RUNTIME_REGISTRATION.expectedUrl, observableViewport: id },
  };
}

function makeSurface(id, group, index, overrides = {}) {
  const state = overrides.state ?? (group === 'shared-state' ? id.replace(/^state-/, '') : 'default');
  return {
    id, group, kind: overrides.kind ?? group, runtimeId: overrides.runtimeId ?? id,
    designId: overrides.designId ?? id, featureId: overrides.featureId ?? featureForSurface(id, group), featureIds: overrides.featureIds ?? featuresForSurface(id, group), state,
    routeTuple: routeTuple(id, group, state),
    routeCases: EXTRA_STATE_SURFACES.has(id) ? [...BASE_ROUTE_CASES, EXTRA_ROUTE_CASE] : BASE_ROUTE_CASES,
    controlBinding: `control-census.json#surfaceId=${id}`,
    equivalent: overrides.equivalent ?? null,
    evidence: {
      canonicalRoot: 'console/docs/evidence/ui-smoke/{integratedCommit}/',
      captures: `console/docs/evidence/ui-smoke/{integratedCommit}/${id}/`,
      contactSheet: `console/docs/evidence/ui-smoke/{integratedCommit}/indexes/${id}.png`,
      rawRunRoot: '{taskOwnedLowlevelRunRoot}/captures/',
    },
    source: overrides.source ?? 'design/Asterisk Console M3.dc.html', order: index,
  };
}

export const SURFACES = [
  ...destinationIds.map((id, index) => makeSurface(id, 'desktop-destination', index, { kind: 'runtime-screen' })),
  ...crossSurfaceIds.map((id, index) => makeSurface(id, 'desktop-cross-surface', index, { kind: 'runtime-screen-or-overlay' })),
  ...pagesRouteIds.map((id, index) => makeSurface(id, 'pages-route', index, { kind: 'site-route', source: 'console/site' })),
  ...pagesControlIds.map((id, index) => makeSurface(id, 'pages-control-surface', index, { kind: 'site-control', source: 'console/site' })),
  ...sharedStateIds.map((id, index) => makeSurface(id, 'shared-state', index, {
    kind: 'design-transient-state', equivalent: { stateFamily: id.replace(/^state-/, ''), runtimeState: id.replace(/^state-/, '') }, source: 'console/inventories/design-parity.json',
  })),
  ...accessibilityIds.map((id, index) => makeSurface(id, 'layout-state', index, {
    kind: 'viewport-equivalent', equivalent: { viewport: id.replace(/^layout-/, ''), runtimeRequirement: 'responsive-layout-and-accessible-focus' }, source: 'console/inventories/design-parity.json',
  })),
];

export const DESIGN_BINDING_CENSUS = {
  sourceArchiveSha256: '9A4284745A745C18A18B0A23D2A2F5851A79F9B6EFCBC5EE30EDCD69CEA2863F',
  sourceFiles: [
    { path: 'design/Asterisk Console M3.dc.html', sha256: 'C485EDD647A3CD9EA41C8FAB1908AC245C9F0F8A4563E263F7A3BD0B5E78472B' },
    { path: 'design/M3 Control.dc.html', sha256: '4B1AF8D412B5890ED149DC1B0DF088F11AE007319A894CCCF6B0A604F54DBBBE' },
  ],
  generatedArtifact: { path: 'console/app/renderer/src/generated/console.tsx', sha256: '2C41015B1A60D0BAA415F6789C04CA941290E38D2FC6727005D76DB874AC4DBF' },
  destinationCount: 32, controlCount: 479, distinctExpressionCount: 168, transientStateFamilyCount: 17,
  declarativeBindings: { total: 265, click: 212, change: 10, input: 10, contextmenu: 9, dragstart: 4, dragover: 4, drop: 4, dragend: 4, mousedown: 5, mouseenter: 1, mouseleave: 1, mouseup: 1 },
  transientStateFamilies: ['appearOpen', 'ceremonyOpen', 'ctxOpen', 'infoOpen', 'lockOpen', 'onboardOpen', 'paletteOpen', 'regexOpen', 'renameOpen', 'subOpen', 'sureOpen', 'tabColourOpen', 'tabFilterOpen', 'toastOpen', 'tourOpen', 'unlockOpen', 'wizardOpen'],
};

export function assertSourceInventory() {
  if (FEATURES.length !== EXPECTED_FEATURE_COUNT) throw new Error(`feature count drift: expected ${EXPECTED_FEATURE_COUNT}, got ${FEATURES.length}`);
  if (new Set(FEATURES).size !== FEATURES.length) throw new Error('feature ids must be unique');
  if (PENDING_CONTRACTS.some((contract) => FEATURES.includes(contract.id))) throw new Error('pending contract must not be counted as an implemented feature');
  if (SURFACES.length !== EXPECTED_SURFACE_COUNT) throw new Error(`surface count drift: expected ${EXPECTED_SURFACE_COUNT}, got ${SURFACES.length}`);
  if (new Set(SURFACES.map((surface) => surface.id)).size !== SURFACES.length) throw new Error('surface ids must be unique');
  const missingFeatures = FEATURES.filter((feature) => !SURFACES.some((surface) => surface.featureIds.includes(feature)));
  if (missingFeatures.length) throw new Error(`feature surface bindings missing: ${missingFeatures.join(', ')}`);
  return { featureCount: FEATURES.length, surfaceCount: SURFACES.length };
}
