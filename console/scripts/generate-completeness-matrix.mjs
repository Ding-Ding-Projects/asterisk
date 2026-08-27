#!/usr/bin/env node
/*
 * Generate the checked-in completeness matrix from the hand-written canonical
 * requirement set below. This file deliberately does not inspect source files,
 * discover routes, or infer features from implementation. The arrays are the
 * contract; the generated JSON is the auditable matrix.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// `--root=<dir>` points every read and write at a copy of the tree instead of this checkout.
// It exists so a guard can prove `--check` is capable of reporting drift at all: run it against
// a copied tree with one byte changed and require it to fail. Without that, a `--check` neutered
// into always agreeing still prints its PASS line, and a guard that only reads that line stays
// green -- which is exactly what the first version of this pass's own guard did.
const rootOverride = process.argv.find((argument) => argument.startsWith('--root='));
const root = rootOverride ? resolve(rootOverride.slice('--root='.length)) : resolve(import.meta.dirname, '..', '..');
const baselineCommit = '088ecde1a6';

// `--check` re-derives every generated artifact and compares it with what is committed,
// instead of overwriting it. Without this the generator is a producer nobody re-runs, and a
// stale table inside it is invisible until somebody runs it and reads a several-thousand-line
// diff -- which is how six site features sat recorded `absent` for days after they were built.
const checkOnly = process.argv.includes('--check');
const drifted = [];

// Compare with line endings normalised. This checkout runs with core.autocrlf=true, so the
// committed JSON is CRLF on disk here and LF in the repository, while writeFileSync below
// emits LF. Comparing raw bytes would fail on every Windows checkout for a reason that has
// nothing to do with drift.
const normalise = (text) => text.replace(/\r\n/gu, '\n');

function emit(relativePath, text) {
  const absolute = resolve(root, relativePath);
  if (!checkOnly) { writeFileSync(absolute, text, 'utf8'); return; }
  const committed = normalise(readFileSync(absolute, 'utf8'));
  if (committed !== normalise(text)) drifted.push(relativePath);
}

const features = [
  ['language-modes', 'Language modes'], ['funny-levels', 'Funny levels'],
  ['dialog-emojis', 'Dialog emojis'], ['school-mode', 'School mode'],
  ['narration', 'Narration'], ['scheduled-settings', 'Scheduled settings'],
  ['external-settings-sources', 'External settings sources'], ['dim-sum-surprise', 'Dim sum surprise'],
  ['regex-builder', 'Regex builder'], ['non-blocking-notifications', 'Non-blocking notifications'],
  ['status-hub', 'Status Hub'], ['material-appearance', 'Material appearance'],
  ['app-logo-customization', 'App logo customization'], ['local-file-converter', 'Local file converter'],
  ['ollama-suite-manager', 'Local Ollama suite manager'], ['browser-style-tabs', 'Browser-style tabs'],
  ['tab-groups-and-searches', 'Tab groups and searches'], ['command-palette', 'Command palette'],
  ['destructive-action-confirmation', 'Destructive action confirmation'], ['local-version-history', 'Local version history'],
  ['changelog-viewer', 'Changelog viewer'], ['external-editor-handoff', 'External editor handoff'],
  ['complete-exports', 'Complete exports'], ['bulk-actions', 'Bulk actions'],
  ['accessibility', 'Accessibility'], ['responsive-sizing', 'Responsive sizing'],
  ['personal-vocabulary-upload', 'Personal vocabulary upload'], ['per-element-toy-locks', 'Per-element toy locks'],
  ['support-tickets', 'Support Tickets'], ['unlock-ladder', 'Unlock ladder'],
  ['built-in-authenticator', 'Built-in authenticator'], ['attention-modes', 'Attention modes'],
  ['browser-extension-download-surfaces', 'Browser extension download surfaces'],
  ['offline-documentation-browser', 'Offline documentation browser'], ['app-display-name', 'App display name'],
  ['guided-forms', 'Guided forms'], ['bounded-overlays', 'Bounded overlays'],
  ['context-menu-shortcuts', 'Context-menu shortcuts'], ['long-operation-progress', 'Long-operation progress'],
  ['in-context-recovery', 'In-context recovery'], ['provider-markup-rendering', 'Provider markup rendering'],
  ['forge-publishing', 'Forge publishing'], ['collapsible-filters', 'Collapsible filters'],
  ['automatic-updates', 'Automatic updates'],
].map(([id, title]) => ({
  id,
  title,
  requirementIds: ['implementation', 'registration', 'route', 'documentation', 'localization', 'persistence', 'focused-checks', 'negative-evidence', 'built-interaction', 'captures', 'design-parity', 'provenance'],
}));

const featureDocs = new Set([
  'language-modes', 'funny-levels', 'dialog-emojis', 'school-mode', 'narration',
  'scheduled-settings', 'external-settings-sources', 'dim-sum-surprise', 'regex-builder',
  'non-blocking-notifications', 'status-hub', 'material-appearance', 'app-logo-customization',
  'local-file-converter', 'ollama-suite-manager', 'browser-style-tabs', 'tab-groups-and-searches', 'command-palette', 'destructive-action-confirmation',
  'local-version-history', 'changelog-viewer', 'external-editor-handoff', 'complete-exports',
  'bulk-actions', 'accessibility', 'responsive-sizing', 'personal-vocabulary-upload',
  'per-element-toy-locks', 'support-tickets', 'unlock-ladder', 'built-in-authenticator',
  'attention-modes', 'browser-extension-download-surfaces', 'offline-documentation-browser',
  'app-display-name', 'guided-forms', 'bounded-overlays', 'context-menu-shortcuts',
  'long-operation-progress', 'in-context-recovery', 'provider-markup-rendering', 'forge-publishing',
  'collapsible-filters', 'automatic-updates',
]);

const desktopStatus = {
  'language-modes': 'partial', 'funny-levels': 'partial', 'dialog-emojis': 'partial', 'school-mode': 'partial',
  narration: 'partial', 'scheduled-settings': 'partial', 'external-settings-sources': 'partial', 'dim-sum-surprise': 'partial',
  'regex-builder': 'partial', 'non-blocking-notifications': 'partial', 'status-hub': 'partial', 'material-appearance': 'partial',
  'app-logo-customization': 'partial', 'local-file-converter': 'implemented-unverified', 'ollama-suite-manager': 'implemented-unverified',
  'browser-style-tabs': 'implemented-unverified', 'tab-groups-and-searches': 'partial', 'command-palette': 'partial',
  'destructive-action-confirmation': 'implemented-unverified', 'local-version-history': 'partial', 'changelog-viewer': 'partial',
  'external-editor-handoff': 'partial', 'complete-exports': 'partial', 'bulk-actions': 'partial', 'accessibility': 'partial',
  'responsive-sizing': 'partial', 'personal-vocabulary-upload': 'partial', 'per-element-toy-locks': 'partial',
  'support-tickets': 'partial', 'unlock-ladder': 'partial', 'built-in-authenticator': 'partial', 'attention-modes': 'implemented-unverified',
  'browser-extension-download-surfaces': 'partial', 'offline-documentation-browser': 'partial', 'app-display-name': 'partial',
  'guided-forms': 'partial', 'bounded-overlays': 'partial', 'context-menu-shortcuts': 'partial', 'long-operation-progress': 'partial',
  'in-context-recovery': 'partial', 'provider-markup-rendering': 'partial', 'forge-publishing': 'implemented-unverified',
  'collapsible-filters': 'partial', 'automatic-updates': 'implemented-unverified',
};

// The published site's status per canonical feature.
//
// This table is the producer for BOTH `console/site/feature-registry.json` and the six
// `site-*` surfaces of the canonical matrix, so a value that goes stale here goes stale in
// two committed artifacts at once and in the same direction. It did: six features the site
// genuinely built between 2026-08-24 and 2026-08-26 -- responsive-sizing, guided-forms,
// built-in-authenticator, context-menu-shortcuts, long-operation-progress and
// in-context-recovery -- were still recorded `absent` here long after each one's own pass had
// written a real note into the registry describing what it had built. Re-running the generator
// would have quietly reverted all six.
//
// `--check` exists so that cannot happen again silently: it re-derives both artifacts and
// fails when either has drifted from this table, rather than waiting for somebody to run the
// generator and read a 3,000-line diff.
const siteStatus = {
  'language-modes': 'partial', 'funny-levels': 'partial', 'dialog-emojis': 'implemented-unverified', 'school-mode': 'implemented-unverified',
  narration: 'implemented-unverified', 'scheduled-settings': 'partial', 'external-settings-sources': 'absent', 'dim-sum-surprise': 'absent',
  'regex-builder': 'implemented-unverified', 'non-blocking-notifications': 'implemented-unverified', 'status-hub': 'absent',
  'material-appearance': 'partial', 'app-logo-customization': 'partial', 'local-file-converter': 'absent',
  'ollama-suite-manager': 'absent', 'browser-style-tabs': 'absent', 'tab-groups-and-searches': 'absent', 'command-palette': 'partial',
  'destructive-action-confirmation': 'partial', 'local-version-history': 'implemented-unverified', 'changelog-viewer': 'implemented-unverified',
  'external-editor-handoff': 'absent', 'complete-exports': 'implemented-unverified', 'bulk-actions': 'implemented-unverified',
  accessibility: 'partial', 'responsive-sizing': 'partial', 'personal-vocabulary-upload': 'implemented-unverified',
  'per-element-toy-locks': 'absent', 'support-tickets': 'absent', 'unlock-ladder': 'absent', 'built-in-authenticator': 'implemented-unverified',
  'attention-modes': 'implemented-unverified', 'browser-extension-download-surfaces': 'absent',
  'offline-documentation-browser': 'partial', 'app-display-name': 'implemented-unverified', 'guided-forms': 'partial',
  'bounded-overlays': 'implemented-unverified', 'context-menu-shortcuts': 'implemented-unverified', 'long-operation-progress': 'implemented-unverified',
  'in-context-recovery': 'implemented-unverified', 'provider-markup-rendering': 'implemented-unverified', 'forge-publishing': 'absent',
  'collapsible-filters': 'implemented-unverified', 'automatic-updates': 'implemented-unverified',
};

const desktopDestinations = ['dash', 'live', 'endpoints', 'trunks', 'trunkauth', 'canvas', 'ivr', 'queues', 'voicemail', 'confbridge', 'moh', 'codecs', 'cdr', 'ami', 'modules', 'logger', 'security', 'cli', 'memory', 'sync', 'skills', 'hub', 'vocab', 'ops', 'secrets', 'servers', 'arcade', 'notifications', 'history', 'customise', 'appearance', 'about'];
const transientStates = ['appearOpen', 'ceremonyOpen', 'ctxOpen', 'infoOpen', 'lockOpen', 'onboardOpen', 'paletteOpen', 'regexOpen', 'renameOpen', 'subOpen', 'sureOpen', 'tabColourOpen', 'tabFilterOpen', 'toastOpen', 'tourOpen', 'unlockOpen', 'wizardOpen'];
const sitePages = ['index', 'product', 'documentation', 'downloads', 'status', 'settings'];
const docsRoutes = [
  'README', 'agent/README', 'agent/hub', 'agent/memory', 'agent/ops', 'agent/secrets', 'agent/skills', 'agent/sync',
  'app/README', 'app/about', 'app/appearance', 'app/arcade', 'app/customise', 'app/history', 'app/notifications', 'app/servers',
  'data/README', 'data/ami', 'data/cdr', 'installer-iso', 'media/README', 'media/codecs', 'media/confbridge', 'media/moh', 'media/voicemail',
  'pbx/README', 'pbx/canvas', 'pbx/dash', 'pbx/endpoints', 'pbx/ivr', 'pbx/live', 'pbx/queues', 'pbx/trunkauth', 'pbx/trunks',
  'platform/README', 'platform/accessibility', 'platform/app-display-name', 'platform/app-logo-customization', 'platform/attention-modes',
  'platform/automatic-updates', 'platform/bounded-overlays', 'platform/browser-extension-download-surfaces', 'platform/browser-style-tabs',
  'platform/built-in-authenticator', 'platform/bulk-actions', 'platform/changelog-viewer', 'platform/collapsible-filters', 'platform/command-palette',
  'platform/complete-exports', 'platform/context-menu-shortcuts', 'platform/destructive-action-confirmation', 'platform/dialog-emojis',
  'platform/dim-sum-surprise', 'platform/external-editor-handoff', 'platform/external-settings-sources', 'platform/forge-publishing',
  'platform/funny-levels', 'platform/guided-forms', 'platform/in-context-recovery', 'platform/language-modes', 'platform/local-version-history',
  'platform/long-operation-progress', 'platform/material-appearance', 'platform/narration', 'platform/non-blocking-notifications',
  'platform/offline-documentation-browser', 'platform/per-element-toy-locks', 'platform/personal-vocabulary-upload', 'platform/provider-markup-rendering',
  'platform/regex-builder', 'platform/responsive-sizing', 'platform/scheduled-settings', 'platform/school-mode', 'platform/status-hub',
  'platform/support-tickets', 'platform/tab-groups-and-searches', 'platform/unlock-ladder', 'system/README', 'system/cli', 'system/logger',
  'system/modules', 'system/security',
];

const surfaces = [
  { id: 'desktop-shell', kind: 'desktop', route: 'desktop://console/main', registry: 'desktop' },
  { id: 'desktop-login', kind: 'desktop-login', route: 'desktop://console/login', registry: 'desktop' },
  { id: 'desktop-setup', kind: 'desktop-setup', route: 'desktop://console/setup', registry: 'desktop' },
  ...desktopDestinations.map((id) => ({ id: `desktop-destination-${id}`, kind: 'desktop-destination', route: `desktop://console/destination/${id}`, registry: 'desktop' })),
  ...transientStates.map((id) => ({ id: `desktop-overlay-${id}`, kind: 'desktop-overlay', route: `desktop://console/overlay/${id}`, registry: 'desktop' })),
  ...sitePages.map((id) => ({ id: `site-${id}`, kind: 'site-page', route: `https://ding-ding-projects.github.io/asterisk/${id === 'index' ? '' : `${id}.html`}`, registry: 'site' })),
  ...docsRoutes.map((id) => ({ id: `site-docs-${id.replaceAll('/', '-')}`, kind: 'generated-docs-route', route: `https://ding-ding-projects.github.io/asterisk/docs/${id}.html`, registry: 'docs' })),
  { id: 'extension-start-download', kind: 'browser-extension-state', route: 'extension://capture/start-download', registry: 'extension' },
  { id: 'extension-downloading', kind: 'browser-extension-state', route: 'extension://capture/downloading', registry: 'extension' },
  { id: 'extension-download-complete', kind: 'browser-extension-state', route: 'extension://capture/download-complete', registry: 'extension' },
];

const negativeCases = [
  'whole-feature-disappearance', 'whole-page-disappearance', 'renamed-symbol', 'commented-symbol',
  'stale-commit', 'missing-evidence', 'route-only-prose', 'fake-success', 'sample-data',
];

/* These are exact owner symbols, not substring hints. A symbol is recorded only
 * when the source audit named the declaration or registration that owns it. */
const implementationSymbols = {
  'language-modes': [{ path: 'app/renderer/src/text-boundary.ts', name: 'setLanguageMode', kind: 'function' }],
  'funny-levels': [{ path: 'app/renderer/src/funny-levels.ts', name: 'setFunnyLevel', kind: 'function' }],
  'dialog-emojis': [{ path: 'app/renderer/src/dialog-emojis.ts', name: 'setEmojisEnabled', kind: 'function' }],
  'school-mode': [{ path: 'app/renderer/src/school-mode.ts', name: 'activateSchoolMode', kind: 'function' }],
  'scheduled-settings': [{ path: 'app/renderer/src/scheduled-settings.ts', name: 'loadRules', kind: 'function' }],
  'external-settings-sources': [{ path: 'app/renderer/src/external-settings-sources.ts', name: 'applyResponse', kind: 'function' }],
  'dim-sum-surprise': [{ path: 'app/renderer/src/DimSumSurprise.tsx', name: 'DimSumSurprise', kind: 'function' }],
  'status-hub': [{ path: 'app/renderer/src/status-hub-client.ts', name: 'buildPayload', kind: 'function' }],
  'app-logo-customization': [{ path: 'app/renderer/src/logo-customization.ts', name: 'acceptLogo', kind: 'function' }],
  'attention-modes': [{ path: 'app/renderer/src/attention-modes.ts', name: 'setModeEnabled', kind: 'function' }],
  'responsive-sizing': [{ path: 'app/renderer/src/runtime.ts', name: 'runtimeHint', kind: 'function' }],
  'local-file-converter': [{ path: 'app/renderer/src/surface-mounts.tsx', name: 'ConverterSurface', kind: 'mount' }],
  'ollama-suite-manager': [{ path: 'app/renderer/src/surface-mounts.tsx', name: 'OllamaSuite', kind: 'mount' }],
  narration: [{ path: 'app/renderer/src/narration.ts', name: 'Narrator', kind: 'class' }, { path: 'app/renderer/src/narration.ts', name: 'resolveVoiceStatus', kind: 'function' }],
  'regex-builder': [{ path: 'app/renderer/src/generated/console.tsx', name: 'applyTabFilter', kind: 'method' }],
  'non-blocking-notifications': [{ path: 'app/renderer/src/generated/console.tsx', name: 'toast', kind: 'method' }, { path: 'app/renderer/src/generated/console.tsx', name: 'fire', kind: 'method' }],
  'material-appearance': [{ path: 'app/renderer/src/appearance.ts', name: 'applyTheme', kind: 'function' }, { path: 'app/renderer/src/colour.ts', name: 'translate', kind: 'function' }],
  'browser-style-tabs': [{ path: 'app/renderer/src/generated/console.tsx', name: 'openScreen', kind: 'method' }, { path: 'app/renderer/src/generated/console.tsx', name: 'applyTabFilter', kind: 'method' }],
  'tab-groups-and-searches': [{ path: 'app/renderer/src/generated/console.tsx', name: 'applyTabFilter', kind: 'method' }],
  'command-palette': [{ path: 'app/renderer/src/catalog.ts', name: 'destinations', kind: 'const' }, { path: 'app/renderer/src/catalog.ts', name: 'findDestination', kind: 'function' }],
  'destructive-action-confirmation': [{ path: 'app/renderer/src/ceremony.ts', name: 'runCeremonyCommand', kind: 'function' }, { path: 'app/renderer/src/generated/console.tsx', name: 'areYouSure', kind: 'method' }],
  'changelog-viewer': [{ path: 'app/renderer/src/changelog.ts', name: 'parseChangelog', kind: 'function' }, { path: 'app/renderer/src/changelog.ts', name: 'filterAndSearch', kind: 'function' }],
  'local-version-history': [{ path: 'app/renderer/src/local-history-screen.ts', name: 'registerLocalHistoryScreen', kind: 'function' }],
  'external-editor-handoff': [{ path: 'control-plane/editor-launch.ts', name: 'detectInstalledEditors', kind: 'function' }],
  'support-tickets': [{ path: 'app/renderer/src/support-tickets.ts', name: 'openTicket', kind: 'function' }],
  accessibility: [{ path: 'app/renderer/src/accessibility-contract.ts', name: 'meetsTargetSize', kind: 'function' }],
  'complete-exports': [{ path: 'app/renderer/src/export.ts', name: 'prepareExport', kind: 'function' }],
  'bulk-actions': [{ path: 'app/renderer/src/bulk.ts', name: 'unsupportedBulkAction', kind: 'function' }, { path: 'app/renderer/src/bulk.ts', name: 'planBulkAction', kind: 'function' }],
  'personal-vocabulary-upload': [{ path: 'app/renderer/src/personal-vocabulary.ts', name: 'loadVocabularyFile', kind: 'function' }, { path: 'app/renderer/src/personal-vocabulary.ts', name: 'clearVocabulary', kind: 'function' }],
  'per-element-toy-locks': [{ path: 'app/renderer/src/generated/console.tsx', name: 'tryUnlock', kind: 'method' }],
  'unlock-ladder': [{ path: 'app/renderer/src/unlock-ladder.ts', name: 'UnlockLadder', kind: 'class' }],
  'built-in-authenticator': [{ path: 'app/renderer/src/totp.ts', name: 'generateCode', kind: 'function' }, { path: 'app/renderer/src/totp.ts', name: 'pairingUri', kind: 'function' }],
  'offline-documentation-browser': [{ path: 'app/renderer/src/docs-browser.ts', name: 'search', kind: 'function' }, { path: 'app/renderer/src/docs-markdown.ts', name: 'parseMarkdown', kind: 'function' }],
  'guided-forms': [{ path: 'app/renderer/src/endpoint-create.ts', name: 'buildEndpointDraft', kind: 'function' }],
  'browser-extension-download-surfaces': [{ path: 'app/renderer/src/download-progress-surface.tsx', name: 'DownloadProgressSurface', kind: 'function' }],
  'app-display-name': [{ path: 'app/renderer/src/display-name.ts', name: 'displayName', kind: 'function' }],
  'bounded-overlays': [{ path: 'app/renderer/src/bounded-overlays.ts', name: 'computeOverlayPlacement', kind: 'function' }],
  'context-menu-shortcuts': [{ path: 'app/renderer/src/menu-shortcuts.ts', name: 'formatBinding', kind: 'function' }],
  'long-operation-progress': [{ path: 'app/renderer/src/long-operation-progress.ts', name: 'createOperation', kind: 'function' }],
  'in-context-recovery': [{ path: 'app/renderer/src/in-context-recovery.ts', name: 'recoveryFor', kind: 'function' }],
  'collapsible-filters': [{ path: 'app/renderer/src/collapsible-filters.ts', name: 'collapsiblePanelState', kind: 'function' }],
  'provider-markup-rendering': [{ path: 'app/renderer/src/docs-markdown.ts', name: 'parseMarkdown', kind: 'function' }],
  'automatic-updates': [{ path: 'control-plane/updater.ts', name: 'resolveLatestUpdate', kind: 'function' }, { path: 'app/renderer/src/UpdateBanner.tsx', name: 'UpdateBanner', kind: 'function' }],
  'forge-publishing': [{ path: 'control-plane/forge-publishing.ts', name: 'ForgePublisher', kind: 'class' }, { path: 'app/renderer/src/App.tsx', name: 'App', kind: 'class' }],
};

const registrationSymbols = {
  'local-file-converter': [{ path: 'app/renderer/src/main.tsx', name: 'SurfaceMounts', kind: 'mount' }],
  'ollama-suite-manager': [{ path: 'app/renderer/src/main.tsx', name: 'SurfaceMounts', kind: 'mount' }],
  narration: [], 'regex-builder': [], 'non-blocking-notifications': [{ path: 'app/renderer/src/generated/console.tsx', name: 'ConsoleShell', kind: 'class' }],
  'material-appearance': [], 'browser-style-tabs': [{ path: 'app/renderer/src/generated/console.tsx', name: 'ConsoleShell', kind: 'class' }],
  'tab-groups-and-searches': [{ path: 'app/renderer/src/generated/console.tsx', name: 'ConsoleShell', kind: 'class' }],
  'command-palette': [], 'destructive-action-confirmation': [{ path: 'app/renderer/src/App.tsx', name: 'runCeremonyCommand', kind: 'import' }],
  'changelog-viewer': [{ path: 'app/renderer/src/App.tsx', name: 'changelogVals', kind: 'method' }], 'complete-exports': [],
  'bulk-actions': [{ path: 'app/renderer/src/App.tsx', name: 'bulkSelectionVals', kind: 'method' }], 'personal-vocabulary-upload': [{ path: 'app/renderer/src/App.tsx', name: 'loadVocabularyFile', kind: 'import' }],
  'per-element-toy-locks': [{ path: 'app/renderer/src/generated/console.tsx', name: 'tryUnlock', kind: 'method' }], 'unlock-ladder': [],
  'built-in-authenticator': [], 'offline-documentation-browser': [{ path: 'app/renderer/src/App.tsx', name: 'docsVals', kind: 'method' }],
  'guided-forms': [{ path: 'app/renderer/src/App.tsx', name: 'onboardDeploy', kind: 'method' }], 'provider-markup-rendering': [{ path: 'app/renderer/src/App.tsx', name: 'docsVals', kind: 'method' }],
  'automatic-updates': [{ path: 'app/renderer/src/main.tsx', name: 'UpdateBanner', kind: 'mount' }],
  'forge-publishing': [{ path: 'control-plane/dispatch.ts', name: 'createControlPlaneDispatcher', kind: 'function' }, { path: 'app/electron/main.ts', name: 'createControlPlaneDispatcher', kind: 'import' }],
};

const siteImplementationSymbols = {
  'language-modes': [{ path: 'site/app.js', name: 'applyLanguage', kind: 'function' }],
  'funny-levels': [{ path: 'site/app.js', name: 'copyLevel', kind: 'function' }],
  'scheduled-settings': [{ path: 'site/app.js', name: 'initSettings', kind: 'function' }],
  'regex-builder': [{ path: 'site/app.js', name: 'openRegex', kind: 'function' }, { path: 'site/app.js', name: 'applyRegex', kind: 'function' }],
  'non-blocking-notifications': [{ path: 'site/app.js', name: 'notify', kind: 'function' }, { path: 'site/app.js', name: 'renderNotifications', kind: 'function' }],
  'material-appearance': [{ path: 'site/app.js', name: 'applyState', kind: 'function' }, { path: 'site/app.js', name: 'initColourTranslator', kind: 'function' }],
  'app-logo-customization': [{ path: 'site/app.js', name: 'applyLogo', kind: 'function' }, { path: 'site/app.js', name: 'loadLogo', kind: 'function' }],
  'command-palette': [{ path: 'site/app.js', name: 'openPalette', kind: 'function' }],
  'complete-exports': [{ path: 'site/app.js', name: 'exportRows', kind: 'function' }],
  'bulk-actions': [{ path: 'site/app.js', name: 'bulkClick', kind: 'function' }, { path: 'site/app.js', name: 'bulkSelectAll', kind: 'function' }],
  accessibility: [{ path: 'site/app.js', name: 'initNavigation', kind: 'function' }],
  'personal-vocabulary-upload': [{ path: 'site/app.js', name: 'loadVocabulary', kind: 'function' }],
  'attention-modes': [{ path: 'site/app.js', name: 'updateAttention', kind: 'function' }],
  'offline-documentation-browser': [{ path: 'site/app.js', name: 'renderDestinations', kind: 'function' }],
  'app-display-name': [{ path: 'site/app.js', name: 'applyDisplayName', kind: 'function' }],
  'automatic-updates': [{ path: 'site/app.js', name: 'initUpdates', kind: 'function' }],
  'changelog-viewer': [{ path: 'site/app.js', name: 'initChangelog', kind: 'function' }],
  'dialog-emojis': [{ path: 'site/app.js', name: 'applyDialogEmojis', kind: 'function' }],
  'local-version-history': [{ path: 'site/app.js', name: 'recordHistory', kind: 'function' }, { path: 'site/app.js', name: 'restoreHistoryEntry', kind: 'function' }],
  narration: [{ path: 'site/app.js', name: 'applyNarration', kind: 'function' }, { path: 'site/app.js', name: 'pumpNarration', kind: 'function' }],
  'provider-markup-rendering': [{ path: 'site/app.js', name: 'renderMarkdownBlock', kind: 'function' }],
  'school-mode': [{ path: 'site/app.js', name: 'applySchoolMode', kind: 'function' }],
  'bounded-overlays': [{ path: 'site/app.js', name: 'openRegex', kind: 'function' }, { path: 'site/app.js', name: 'openPalette', kind: 'function' }],
  'collapsible-filters': [{ path: 'site/app.js', name: 'updateFilterStatus', kind: 'function' }],
};
const siteRegistrationSymbols = {
  'local-file-converter': [{ path: 'site/app.js', name: 'init', kind: 'function' }],
  'ollama-suite-manager': [{ path: 'site/app.js', name: 'init', kind: 'function' }],
  'language-modes': [{ path: 'site/app.js', name: 'init', kind: 'function' }], 'funny-levels': [{ path: 'site/app.js', name: 'init', kind: 'function' }],
  'scheduled-settings': [{ path: 'site/app.js', name: 'init', kind: 'function' }], 'regex-builder': [{ path: 'site/app.js', name: 'init', kind: 'function' }],
  'non-blocking-notifications': [{ path: 'site/app.js', name: 'init', kind: 'function' }], 'material-appearance': [{ path: 'site/app.js', name: 'init', kind: 'function' }],
  'app-logo-customization': [{ path: 'site/app.js', name: 'init', kind: 'function' }], 'command-palette': [{ path: 'site/app.js', name: 'init', kind: 'function' }],
  'complete-exports': [{ path: 'site/app.js', name: 'init', kind: 'function' }], 'bulk-actions': [{ path: 'site/app.js', name: 'init', kind: 'function' }],
  accessibility: [{ path: 'site/app.js', name: 'init', kind: 'function' }], 'personal-vocabulary-upload': [{ path: 'site/app.js', name: 'init', kind: 'function' }],
  'attention-modes': [{ path: 'site/app.js', name: 'init', kind: 'function' }], 'offline-documentation-browser': [{ path: 'site/app.js', name: 'init', kind: 'function' }],
  'app-display-name': [{ path: 'site/app.js', name: 'initSettings', kind: 'function' }],
  'automatic-updates': [{ path: 'site/app.js', name: 'init', kind: 'function' }],
  'changelog-viewer': [{ path: 'site/app.js', name: 'init', kind: 'function' }],
  'dialog-emojis': [{ path: 'site/app.js', name: 'initSettings', kind: 'function' }],
  'local-version-history': [{ path: 'site/app.js', name: 'initSettings', kind: 'function' }],
  narration: [{ path: 'site/app.js', name: 'initSettings', kind: 'function' }],
  'provider-markup-rendering': [{ path: 'site/app.js', name: 'init', kind: 'function' }],
  'school-mode': [{ path: 'site/app.js', name: 'initSettings', kind: 'function' }],
  'bounded-overlays': [{ path: 'site/app.js', name: 'init', kind: 'function' }], 'collapsible-filters': [{ path: 'site/app.js', name: 'init', kind: 'function' }],
};

function symbolsFor(map, id) {
  return (map[id] ?? []).map((symbol) => ({ ...symbol }));
}

function symbolsForSurface(surface, id, registration = false) {
  if (surface.registry === 'site') return symbolsFor(registration ? siteRegistrationSymbols : siteImplementationSymbols, id);
  return symbolsFor(registration ? registrationSymbols : implementationSymbols, id);
}

function statusFor(surface, id) {
  if (surface.registry === 'desktop') return desktopStatus[id];
  if (surface.registry === 'site') return siteStatus[id];
  return 'absent';
}

function rowFor(surface, feature) {
  const doc = featureDocs.has(feature.id) ? `console/docs/platform/${feature.id}.md` : null;
  const registry = surface.registry === 'desktop' ? 'console/app/feature-registry.json' : surface.registry === 'site' ? 'console/site/feature-registry.json' : null;
  const registryRef = registry ? `${registry}#features.${feature.id}` : null;
  return {
    featureId: feature.id,
    status: statusFor(surface, feature.id),
    demoState: 'not-run',
    dataProvenance: { kind: 'manual-source-audit', source: 'hand-written canonical requirement set', sourceRevision: baselineCommit, sampleData: false },
    implementation: { registry: registryRef, paths: [], symbols: symbolsForSurface(surface, feature.id) },
    registration: { registry: registryRef, paths: [], symbols: symbolsForSurface(surface, feature.id, true) },
    route: surface.route,
    documentation: { state: doc ? 'present' : 'absent', path: doc, section: doc ? `# ${feature.title}` : null },
    localization: { state: 'unverified', paths: [], symbols: [] },
    persistence: { state: 'unverified', paths: [], symbols: [] },
    focusedChecks: { state: 'not-run', commands: [] },
    negativeEvidence: { state: 'not-run', script: 'console/scripts/negative-surface-completeness.mjs', cases: negativeCases },
    builtInteraction: { state: 'not-run', commit: null, route: null, evidence: null },
    captures: { state: 'not-run', currentCommit: null, paths: [] },
    designParity: { state: 'not-run', referenceRoute: null, builtRoute: surface.route, tuple: { state: null, theme: null, viewport: null, scale: null }, rawCaptures: [], sideBySide: null, visualDiff: null },
  };
}

const requirements = [
  ['implementation', 'Exact implementation paths and symbols'], ['registration', 'Exact registration paths and symbols'], ['route', 'Addressable deterministic route'],
  ['documentation', 'Feature article or explicit absent record'], ['localization', 'Localized copy and fallback evidence'], ['persistence', 'Persistence path or explicit non-persistent state'],
  ['focused-checks', 'Focused local checks and counts'], ['negative-evidence', 'Red then green negative regression evidence'], ['built-interaction', 'Real built artifact interaction evidence'],
  ['captures', 'Current-commit raw capture evidence'], ['design-parity', 'Reference and built parity tuple and diff evidence'], ['provenance', 'Exact data provenance and sample-data declaration'],
].map(([id, title]) => ({ id, title, required: true }));

const matrix = {
  schemaVersion: 2,
  matrixVersion: '2026-08-23.1',
  source: 'hand-written-canonical-requirements',
  baselineCommit,
  statusValues: ['absent', 'partial', 'implemented-unverified', 'verified'],
  requirementSet: requirements,
  features,
  surfaceCatalog: surfaces.map(({ id, kind, route }) => ({ id, kind, route })),
  surfaces: surfaces.map((surface) => ({ ...surface, rows: features.map((feature) => rowFor(surface, feature)) })),
  negativeRegression: { script: 'console/scripts/negative-surface-completeness.mjs', cases: negativeCases, state: 'not-run-under-yum-leung-cha' },
};

emit('console/inventories/surface-completeness.json', `${JSON.stringify(matrix, null, 2)}\n`);

function readRegistry(relativePath) {
  return JSON.parse(readFileSync(resolve(root, relativePath), 'utf8'));
}

function rewriteRegistry(relativePath, surface, statuses) {
  const old = readRegistry(relativePath);
  const next = { surface, schemaVersion: 2, canonicalMatrix: 'console/inventories/surface-completeness.json', features: {} };
  for (const feature of features) {
    const source = old.features[feature.id] ?? {};
    const status = statuses[feature.id];
    const paths = Array.isArray(source.files) ? source.files : Array.isArray(source.implementation?.paths) ? source.implementation.paths : [];
    next.features[feature.id] = {
      status,
      note: typeof source.note === 'string' && !source.note.startsWith('No implementation is recorded')
        ? source.note.replaceAll(String.fromCharCode(0x2014), '-')
        : (status === 'absent'
          ? 'No source implementation or registration seam is recorded for this canonical requirement.'
          : 'Exact source seams are recorded in this schema-v2 row. Built interaction, current-commit captures, and design-parity evidence remain not-run, so this row makes no verified claim.'),
      implementation: { paths, symbols: symbolsForSurface({ registry: surface === 'pages-site' ? 'site' : 'desktop' }, feature.id) },
      registration: { paths: [], symbols: symbolsForSurface({ registry: surface === 'pages-site' ? 'site' : 'desktop' }, feature.id, true) },
      route: surface === 'windows-console' ? 'desktop://console/main' : 'https://ding-ding-projects.github.io/asterisk/',
      documentation: { path: featureDocs.has(feature.id) ? `console/docs/platform/${feature.id}.md` : null, state: featureDocs.has(feature.id) ? 'present' : 'absent' },
      localization: { state: 'unverified', paths: [], symbols: [] },
      persistence: { state: 'unverified', paths: [], symbols: [] },
      focusedChecks: { state: 'not-run', commands: [] },
      negativeEvidence: { state: 'not-run', script: 'console/scripts/negative-surface-completeness.mjs', cases: negativeCases },
      builtInteraction: { state: 'not-run', commit: null, route: null, evidence: null },
      captures: { state: 'not-run', currentCommit: null, paths: [] },
      designParity: { state: 'not-run', referenceRoute: null, builtRoute: surface === 'windows-console' ? 'desktop://console/main' : 'https://ding-ding-projects.github.io/asterisk/', tuple: { state: null, theme: null, viewport: null, scale: null }, rawCaptures: [], sideBySide: null, visualDiff: null },
    };
    if (feature.id === 'local-file-converter' || feature.id === 'ollama-suite-manager') {
      const entry = next.features[feature.id];
      if (surface === 'windows-console') {
        entry.implementation.paths = [
          'app/renderer/src/surface-mounts.tsx',
          feature.id === 'local-file-converter' ? 'app/renderer/src/converter-surface.tsx' : 'app/renderer/src/ollama-suite.tsx',
        ];
        entry.registration.paths = ['app/renderer/src/main.tsx', 'app/renderer/src/surface-mounts.tsx'];
        entry.route = feature.id === 'local-file-converter' ? 'desktop://console/#surface=converter' : 'desktop://console/#surface=ollama';
        entry.note = feature.id === 'local-file-converter'
          ? 'The converter is mounted at #surface=converter through surface-mounts.tsx and the real control-plane catalog and PDF-capability seam in dispatch.ts. The source picker, queue mutations, and packaged-worker proof remain explicitly unavailable until their privileged handlers are registered; no source, output, or sample value is invented.'
          : 'The Ollama surface is mounted at #surface=ollama through surface-mounts.tsx. Its client returns an honest bridge-not-registered state until the privileged local Ollama dispatcher is registered; no model, health, catalog, pull, chat, or harness value is assumed.';
      } else {
        entry.implementation.paths = ['site/app.js', feature.id === 'local-file-converter' ? 'site/converter.html' : 'site/ollama.html'];
        entry.registration.paths = ['site/app.js'];
        entry.note = feature.id === 'local-file-converter'
          ? 'The documentation site exposes converter.html with categorized local adapters, bounded byte inspection, a paged queue, cancellation, and an adjacent regex builder. This is implemented in site/app.js and converter.html but remains unverified because no build, browser session, or capture ran in this lane.'
          : 'The documentation site exposes ollama.html as a browser-local loopback surface with explicit endpoint approval, bounded local API reads, pull and chat cancellation, and honest Unknown catalog completeness. It remains unverified because no build, browser session, or capture ran in this lane.';
      }
    }
  }
  emit(relativePath, `${JSON.stringify(next, null, 2)}\n`);
}

rewriteRegistry('console/app/feature-registry.json', 'windows-console', desktopStatus);
rewriteRegistry('console/site/feature-registry.json', 'pages-site', siteStatus);

if (checkOnly) {
  if (drifted.length > 0) {
    console.error(`FAIL: generated inventory artifacts have drifted from this generator: ${drifted.join(', ')}`);
    console.error('Run `node scripts/generate-completeness-matrix.mjs` and review the diff, or correct the tables in that script.');
    process.exit(1);
  }
  console.log('PASS: the canonical matrix and both feature registries match a fresh generator run.');
}
