#!/usr/bin/env node
/**
 * Generate the reviewed UI smoke interaction manifest.
 *
 * This generator consumes checked-in, reviewed route and control records. It
 * never discovers controls from a rendered page and never launches a runtime.
 * The generated rows are a cross-product of real control action cases and
 * explicit language modes, plus explicit route and state proof cases.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, rmSync, renameSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  DESIGN_BINDING_CENSUS,
  EXPECTED_FEATURE_COUNT,
  EXPECTED_ROW_COUNT,
  EXPECTED_SURFACE_COUNT,
  FEATURES,
  INVENTORY_VERSION,
  LANGUAGE_MODES,
  PENDING_CONTRACTS,
  SURFACES,
  assertSourceInventory,
} from '../inventories/ui-smoke-inventory.mjs';

const root = resolve(import.meta.dirname, '..', '..');
const outputDir = resolve(root, 'console/inventories/ui-smoke');
const controlCensus = JSON.parse(readFileSync(resolve(outputDir, 'control-census.json'), 'utf8'));
const surfaceControlIndex = JSON.parse(readFileSync(resolve(outputDir, 'surface-control-index.json'), 'utf8'));

const REDACTION = {
  schemaVersion: 1,
  rawRunRootNotCommitted: true,
  neverPersist: ['passwords', 'pins', 'totpSecrets', 'accessTokens', 'authorizationHeaders', 'privateKeys', 'cookies', 'clipboardContents', 'callContent', 'environmentValues', 'privatePaths', 'rawNetworkBodies'],
  recursiveAllowlist: {
    allowed: ['rowId', 'surfaceId', 'featureId', 'routeTuple', 'target', 'action', 'before', 'after', 'outcome', 'observablePredicate', 'altText', 'sourceCommit', 'integratedCommit', 'artifactPath', 'artifactSha256', 'profileId', 'desktopName', 'processId', 'hwnd', 'cdpPort', 'targetId', 'cleanupState'],
    rejectUnknownKeys: true,
    rejectCredentialLikeKeys: true,
    rejectCredentialLikeValues: true,
  },
  failureMode: 'fail-closed',
};

const DESTRUCTIVE_CONTROL_IDS = new Set(['da_restart', 'da_stop']);

const RECEIPT_SCHEMAS = {
  interaction: {
    schemaVersion: 1,
    required: ['planId', 'rowId', 'sourceCommit', 'integratedCommit', 'inventoryDigest', 'runtimeIdentity', 'routeTuple', 'target', 'action', 'before', 'after', 'outcome', 'observablePredicate', 'status', 'redactionStatus'],
    status: ['accepted', 'failed', 'cancelled', 'stale'],
    types: { schemaVersion: 'integer', planId: 'string', rowId: 'string', sourceCommit: 'sha256', integratedCommit: 'sha256', inventoryDigest: 'sha256', runtimeIdentity: 'object', routeTuple: 'object', target: 'object', action: 'object', before: 'object', after: 'object', outcome: 'object', observablePredicate: 'string', status: 'enum', redactionStatus: 'enum' },
    enums: { redactionStatus: ['clean', 'red'] },
    relations: ['rowId equals plan.rowIds entry', 'sourceCommit equals ledger.sourceCommit', 'integratedCommit is ancestor-proven', 'before.sha256 and after.sha256 are lowercase 64-hex strings'],
    rule: 'The receipt is accepted only when the independent observable predicate is true and before and after hashes are present.',
  },
  outcome: {
    schemaVersion: 1,
    required: ['planId', 'rowId', 'actionType', 'predicate', 'observed', 'observedAt', 'beforeSha256', 'afterSha256', 'status'],
    types: { schemaVersion: 'integer', planId: 'string', rowId: 'string', actionType: 'string', predicate: 'string', observed: 'object', observedAt: 'iso-8601', beforeSha256: 'sha256', afterSha256: 'sha256', status: 'enum' },
    enums: { status: ['accepted', 'failed', 'cancelled', 'stale'] },
    relations: ['rowId equals interaction.rowId', 'beforeSha256 equals interaction.before.sha256', 'afterSha256 equals interaction.after.sha256'],
    rule: 'Outcome values come from a separate observable read, not from the action command result.',
  },
  privacy: {
    schemaVersion: 1,
    required: ['planId', 'rowId', 'sourceCommit', 'integratedCommit', 'runtimeIdentity', 'routeTuple', 'rawRunRootNotCommitted', 'networkRequests', 'targetIsolation', 'redactionStatus', 'redactedKeys'],
    rule: 'Privacy receipt proves the raw root stayed outside the repository and the exact one-target proof held.',
    types: { schemaVersion: 'integer', planId: 'string', rowId: 'string', sourceCommit: 'sha256', integratedCommit: 'sha256', runtimeIdentity: 'object', routeTuple: 'object', rawRunRootNotCommitted: 'boolean', networkRequests: 'integer', targetIsolation: 'object', redactionStatus: 'enum', redactedKeys: 'array' },
    enums: { redactionStatus: ['clean', 'red'] },
    relations: ['networkRequests equals 0 for local-only actions', 'targetIsolation.targetCount equals 1', 'rawRunRootNotCommitted equals true'],
  },
  altText: {
    schemaVersion: 1,
    required: ['rowId', 'before', 'after', 'state', 'targetName'],
    rule: 'Alt text names the exact surface, state, target, and visible receipt without relying on pixels alone.',
    types: { schemaVersion: 'integer', rowId: 'string', before: 'string', after: 'string', state: 'string', targetName: 'string' },
    relations: ['rowId equals interaction.rowId', 'before and after are non-empty accessible descriptions'],
  },
  pixelReview: {
    schemaVersion: 1,
    required: ['rowId', 'beforeWidth', 'beforeHeight', 'beforePixelSha256', 'afterWidth', 'afterHeight', 'afterPixelSha256', 'beforeMetadataTypes', 'afterMetadataTypes', 'pixelReviewStatus', 'reviewedAt'],
    rule: 'Pixel review records PNG signature, dimensions, metadata absence, and a human or approved reviewer status without copying private pixels into the receipt.',
    types: { schemaVersion: 'integer', rowId: 'string', beforeWidth: 'integer', beforeHeight: 'integer', beforePixelSha256: 'sha256', afterWidth: 'integer', afterHeight: 'integer', afterPixelSha256: 'sha256', beforeMetadataTypes: 'array', afterMetadataTypes: 'array', pixelReviewStatus: 'enum', reviewedAt: 'iso-8601' },
    enums: { pixelReviewStatus: ['reviewed', 'failed'] },
    relations: ['PNG dimensions and pixel hashes equal the fully decoded files', 'metadata arrays are empty for accepted evidence'],
  },
  evidence: {
    schemaVersion: 1,
    required: ['rowId', 'integratedCommit', 'canonicalRoot', 'sourceSha256', 'destinationSha256', 'bytePreserving', 'comparisonPath', 'visualDiffPath'],
    rule: 'Evidence is promoted only after the source and destination hashes match and the comparison and visual-diff records exist.',
    types: { schemaVersion: 'integer', rowId: 'string', integratedCommit: 'sha256', canonicalRoot: 'path', sourceSha256: 'sha256', destinationSha256: 'sha256', bytePreserving: 'boolean', comparisonPath: 'path', visualDiffPath: 'path' },
    relations: ['sourceSha256 equals destinationSha256', 'canonicalRoot equals console/docs/evidence/ui-smoke/{integratedCommit}/', 'bytePreserving equals true'],
  },
};
const VISUAL_DIFF_SCHEMA = { schemaVersion: 1, required: ['surfaceId', 'integratedCommit', 'status', 'comparedRowIds', 'coverage', 'referenceSha256', 'builtSha256', 'diffSha256', 'reviewedAt'], types: { surfaceId: 'string', integratedCommit: 'sha256', status: 'enum', comparedRowIds: 'array', coverage: 'enum', referenceSha256: 'sha256', builtSha256: 'sha256', diffSha256: 'sha256', reviewedAt: 'iso-8601' }, enums: { status: ['reviewed', 'failed'], coverage: ['all-rows', 'partial'] }, relations: ['comparedRowIds equals every manifest row for the surface', 'coverage equals all-rows', 'all hashes are lowercase 64-hex strings'] };

const EXECUTION_CONTRACT = {
  version: 2,
  route: 'cheap-lowlevel-headless-cdp-and-lifecycle-only',
  forbiddenRoutes: ['browser-plugin', 'chrome-plugin', 'computer-use', 'visible-desktop', 'visible-input'],
  pagesRoute: {
    launchKind: 'edge-hidden-desktop',
    controlRoute: 'cheap-lowlevel-headless-plus-loopback-cdp-only',
    exactTargetProof: "targets.length === 1 && targets[0].type === 'page' && targets[0].url === expectedUrl && targets[0].webSocketDebuggerUrl.startsWith('ws://127.0.0.1:')",
    noExtensionTargets: true,
    noRestoredTargets: true,
  },
  lifecycle: ['preflight', 'launch-directly', 'resolve-title-and-class', 'prove-one-cdp-target', 'capture-before', 'resolve-control', 'perform-one-bounded-action', 'read-independent-observable', 'capture-after', 'validate-receipts', 'stage-canonical-evidence', 'hash-compare', 'atomic-publish-no-overwrite', 'disconnect-cdp', 'cleanup-owned-identities'],
  provenance: {
    commands: ['git rev-parse --verify {sourceCommit}^{commit}', 'git rev-parse --verify {integratedCommit}^{commit}', 'git merge-base --is-ancestor {sourceCommit} {integratedCommit}', 'git diff --exit-code {sourceCommit}:console/inventories/ui-smoke-inventory.mjs {integratedCommit}:console/inventories/ui-smoke-inventory.mjs'],
    objectTypeRequired: 'commit', ancestryRequired: true, canonicalInventoryDigestRequired: true,
  },
  failClosedOn: ['missing-control', 'unreachable-control', 'inert-control', 'duplicate-stable-id', 'changed-count', 'stale-commit', 'missing-capture', 'missing-receipt', 'false-result', 'second-cdp-target', 'wrong-cdp-url', 'redaction-violation', 'hash-mismatch', 'overwrite-attempt'],
  runtimeIdentity: {
    required: ['artifactPath', 'artifactSha256', 'profileId', 'profilePath', 'desktopName', 'processId', 'hwnd', 'cdpPort', 'targetId', 'cleanupState'],
    reResolveBefore: ['processId', 'hwnd', 'cdpPort', 'targetId'],
    cleanupOnlyRecorded: true,
  },
  promotion: {
    rawRunRoot: '{taskOwnedLowlevelRunRoot}',
    rawRunRootNotCommitted: true,
    canonicalRoot: 'console/docs/evidence/ui-smoke/{integratedCommit}/',
    stageRoot: 'console/docs/evidence/ui-smoke/.staging/{integratedCommit}/{runId}/',
    bytePreserving: true,
    atomicPublish: true,
    overwriteExisting: false,
    requiredArtifactsPerAcceptedRow: ['before.png', 'after.png', 'interaction-receipt-v1.json', 'outcome-receipt-v1.json', 'privacy-receipt-v1.json', 'alt-text.json', 'pixel-review-receipt-v1.json', 'evidence-receipt-v1.json'],
    mappings: { docs: 'console/docs/evidence/ui-smoke/{integratedCommit}/index.html', wiki: 'wiki/UI-smoke-evidence.md#{integratedCommit}', issue: 'GitHub issue comment with an inline before and after pair per row', pages: 'console/site/documentation.html#ui-smoke-evidence-{integratedCommit}' },
  },
};

function inventoryDigest() {
  const canonical = { inventoryVersion: INVENTORY_VERSION, features: FEATURES, pendingContracts: PENDING_CONTRACTS, surfaces: SURFACES, controlCensus, surfaceControlIndex, designBindingCensus: DESIGN_BINDING_CENSUS, languageModes: LANGUAGE_MODES };
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

function surfaceById(id) {
  const surface = SURFACES.find((candidate) => candidate.id === id);
  if (!surface) throw new Error(`control census names unknown surface ${id}`);
  return surface;
}

function controlById(id) {
  const control = controlCensus.records.find((candidate) => candidate.designId === id);
  if (!control) throw new Error(`surface index names unknown control ${id}`);
  return control;
}
function controlVariants(record) {
  if (record.duplicateMode !== 'occurrence-specific') return [{ ...record, stableId: record.designId, occurrenceSpecific: false, label: record.labels[0], kind: record.kinds[0], runtimeBinding: record.runtimeUses[0].binding.path, locator: record.locator, contract: record.contract, declarations: record.declarations, runtimeUses: record.runtimeUses }];
  return record.occurrenceVariants.map((variant) => ({
    ...record, stableId: variant.stableId, occurrenceSpecific: true, label: variant.declaration.label, kind: variant.declaration.kind, kinds: [variant.declaration.kind], contract: variant.declaration.contract,
    surfaceId: variant.runtimeUse.binding.surfaceId, runtimeBinding: variant.runtimeUse.binding.path,
    locator: { ...record.locator, name: variant.declaration.label, bindingPath: variant.runtimeUse.binding.path }, declarations: [variant.declaration], runtimeUses: [variant.runtimeUse], actionCases: casesForKind(variant.declaration.kind),
  }));
}
function casesForKind(kind) {
  return { switch: ['inspect', 'toggle-on', 'toggle-off', 'keyboard-toggle', 'reset'], slider: ['inspect', 'set-min', 'set-mid', 'set-max', 'keyboard-step', 'reset'], stepper: ['inspect', 'decrement', 'increment', 'set-min', 'set-max', 'reset'], segmented: ['inspect', 'open', 'choose-first', 'choose-last', 'keyboard-choose', 'reset'], select: ['inspect', 'open', 'search-option', 'choose-first', 'choose-last', 'escape', 'reset'], text: ['inspect', 'focus', 'set-bounded-valid', 'clear', 'invalid-boundary', 'reset'], file: ['inspect', 'open-picker', 'cancel-picker', 'select-bounded-file', 'clear'], order: ['inspect', 'move-first', 'move-last', 'keyboard-reorder', 'reset'], chips: ['inspect', 'add-option', 'remove-option', 'clear', 'reset'] }[kind] ?? ['inspect'];
}

function routeFields(surface, phase) {
  return {
    kind: surface.routeTuple.kind,
    reference: surface.routeTuple.reference,
    runtimeRegistration: surface.routeTuple.runtimeRegistration ?? null,
    expectedUrl: surface.routeTuple.expectedUrl,
    transition: surface.routeTuple.transition,
    phase,
    exactUrlEquality: true,
  };
}

function runtimeIdentity() {
  return {
    adapter: 'ui-smoke-lowlevel-adapter', artifactPath: '{builtArtifactPath}', artifactSha256: '{builtArtifactSha256}', profileId: '{taskProfileId}', profilePath: '{taskProfilePath}',
    desktopName: '{hiddenDesktopName}', processId: '{ownedProcessId}', hwnd: '{resolvedHwnd}', cdpPort: '{taskLoopbackCdpPort}', targetId: '{soleCdpTargetId}', cleanupState: 'pending',
  };
}

function destructiveSafety(controlId, actionCase) {
  const destructive = DESTRUCTIVE_CONTROL_IDS.has(controlId);
  return {
    level: destructive ? 'destructive' : 'non-destructive',
    confirmationRequired: destructive,
    keys: destructive ? ['sureCells', 'sureYes'] : [],
    slider: destructive ? { stateKey: 'sureProgress', predicate: 'sureHits >= sureNeed', requiredHits: controlId === 'da_restart' || controlId === 'da_stop' ? 3 : null, exactCompletion: true } : null,
    cancel: destructive ? { control: 'closeSure', keyboard: 'Escape', returnsFocusTo: controlId } : null,
    sourceBehavior: destructive ? { sourceFile: 'console/app/renderer/src/generated/console.tsx', controlAction: controlId === 'da_restart' ? 'daemon-restart' : 'daemon-stop', opener: 'areYouSure', confirmationState: ['sureOpen', 'sureHits', 'sureNeed', 'sureCell', 'sureAction'], completionHandler: 'sureYes', cancelHandler: 'closeSure' } : null,
    sourceMustRemainUnchangedUntilReceipt: true,
    actionCase,
  };
}

function fixtureFor(control, actionCase) {
  const kind = control.kinds[0];
  const contract = control.contract;
  const numeric = contract?.bounds ?? {};
  if (kind === 'file') return { type: 'bounded-local-file', name: `ui-smoke-${control.designId}.fixture`, accept: contract.accept, maxBytes: 65536, network: false };
  if (kind === 'text') return { type: 'bounded-text', value: `Smoke fixture for ${control.designId}`, maxBytes: 256, invalidValueBytes: 257 };
  if (kind === 'slider' || kind === 'stepper') return { type: 'bounded-number', case: actionCase, min: numeric.min, max: numeric.max, step: numeric.effectiveStep, stepSource: numeric.stepSource, declaredBoundsRequired: true, invalidBoundary: numeric.min === null ? null : numeric.min - (numeric.effectiveStep ?? 1) };
  if (kind === 'select' || kind === 'segmented' || kind === 'chips') return { type: 'declared-option', case: actionCase, options: contract.options, first: contract.options[0] ?? null, last: contract.options.at(-1) ?? null, enumerateFromControl: true, maxOptions: 64 };
  return { type: 'none' };
}
function actionSemantics(control, actionCase) {
  const contract = control.contract ?? {};
  const bounds = contract.bounds ?? {};
  const options = contract.options ?? [];
  const handlers = {
    inspect: { sourceFile: 'console/app/renderer/src/generated/m3-control.tsx', path: 'v.ctl.onInfo', sourceNeedle: 'onClick: fn(v.ctl.onInfo)', event: 'onClick' },
    toggle: { sourceFile: 'console/app/renderer/src/generated/m3-control.tsx', path: 'v.ctl.toggle', sourceNeedle: 'onClick: fn(v.ctl.toggle)', event: 'onClick' },
    options: { sourceFile: 'console/app/renderer/src/generated/m3-control.tsx', path: 'v.ctl.options[].pick', sourceNeedle: 'v.ctl.options', event: 'onClick' },
    stepper: { sourceFile: 'console/app/renderer/src/generated/m3-control.tsx', path: 'v.ctl.stepper', sourceNeedle: 'onClick: fn(v.ctl.inc)', event: 'onClick' },
    slider: { sourceFile: 'console/app/renderer/src/generated/m3-control.tsx', path: 'v.ctl.onSlide', sourceNeedle: 'onInput: fn(v.ctl.onSlide)', event: 'onInput' },
    text: { sourceFile: 'console/app/renderer/src/generated/m3-control.tsx', path: 'v.onEditableTextInput', sourceNeedle: 'onInput: fn(v.onEditableTextInput)', event: 'onInput' },
    file: { sourceFile: 'console/app/renderer/src/generated/m3-control.tsx', path: 'v.ctl.onPick', sourceNeedle: 'onChange: fn(v.ctl.onPick)', event: 'onChange' },
    clear: { sourceFile: 'console/app/renderer/src/generated/m3-control.tsx', path: 'v.ctl.onClear', sourceNeedle: 'onClick: fn(v.ctl.onClear)', event: 'onClick' },
    order: { sourceFile: 'console/app/renderer/src/generated/m3-control.tsx', path: 'v.ctl.items', sourceNeedle: 'v.ctl.items', event: 'onClick' },
    chips: { sourceFile: 'console/app/renderer/src/generated/m3-control.tsx', path: 'v.ctl.pool', sourceNeedle: 'onClick: fn($p.add)', event: 'onClick' },
    reset: { sourceFile: 'console/app/renderer/src/generated/console.tsx', path: 'ConsoleShell.setVal', sourceNeedle: 'setVal = (c, v)', event: 'adapter-reset' },
  };
  const kind = control.kinds?.[0] ?? 'text';
  const family = kind === 'switch' ? 'toggle' : kind === 'segmented' || kind === 'select' ? 'options' : kind === 'stepper' ? 'stepper' : kind === 'slider' ? 'slider' : kind === 'text' ? 'text' : kind === 'file' ? 'file' : kind === 'order' ? 'order' : kind === 'chips' ? 'chips' : 'inspect';
  let handler = actionCase === 'inspect' ? handlers.inspect : actionCase === 'reset' ? handlers.reset : actionCase === 'clear' ? handlers.clear : handlers[family] ?? handlers.inspect;
  if (actionCase === 'move-first') handler = { ...handlers.order, sourceNeedle: 'onClick: fn($i.up)' };
  if (actionCase === 'move-last') handler = { ...handlers.order, sourceNeedle: 'onClick: fn($i.down)' };
  if (actionCase === 'keyboard-reorder') handler = { ...handlers.order, sourceNeedle: 'c.move' };
  if (actionCase === 'add-option') handler = { ...handlers.chips, sourceNeedle: 'onClick: fn($p.add)' };
  if (actionCase === 'remove-option') handler = { ...handlers.chips, sourceNeedle: 'onClick: fn($i.drop)' };
  if (actionCase === 'toggle-on') return { operation: 'write', expectedValue: true, valueSource: 'explicit-boolean-on', handler };
  if (actionCase === 'toggle-off') return { operation: 'write', expectedValue: false, valueSource: 'explicit-boolean-off', handler };
  if (actionCase === 'keyboard-toggle') return { operation: 'write', expectedValue: typeof contract.defaultValueLiteral === 'boolean' ? !contract.defaultValueLiteral : null, valueSource: 'keyboard-toggle-of-declared-default', handler };
  if (actionCase === 'set-min') return { operation: 'write', expectedValue: bounds.min, valueSource: 'declared-min', handler };
  if (actionCase === 'set-max') return { operation: 'write', expectedValue: bounds.max, valueSource: 'declared-max', handler };
  if (actionCase === 'set-mid') return { operation: 'write', expectedValue: bounds.min !== null && bounds.max !== null ? (bounds.min + bounds.max) / 2 : null, valueSource: 'declared-bounds-midpoint', handler };
  if (actionCase === 'increment' || actionCase === 'keyboard-step') return { operation: 'write', delta: bounds.effectiveStep ?? 1, valueSource: bounds.stepSource ?? 'platform-default-step-1', handler };
  if (actionCase === 'decrement') return { operation: 'write', delta: -(bounds.effectiveStep ?? 1), valueSource: bounds.stepSource ?? 'platform-default-step-1', handler };
  if (actionCase === 'choose-first') return { operation: 'write', expectedValue: options[0] ?? null, valueSource: 'first-declared-option', handler };
  if (actionCase === 'choose-last') return { operation: 'write', expectedValue: options.at(-1) ?? null, valueSource: 'last-declared-option', handler };
  if (actionCase === 'reset') return { operation: 'reset', expectedValue: contract.defaultValueLiteral, valueSource: 'declared-default', handler, adapterOnly: true };
  if (actionCase === 'invalid-boundary') return { operation: 'reject', expectedValue: 'validation-error', preValue: contract.defaultValueLiteral, valueSource: 'one-step-outside-declared-bound', handler };
  if (actionCase === 'clear') return { operation: 'write', expectedValue: '', valueSource: 'explicit-clear', handler };
  return { operation: 'read-or-open', expectedValue: contract.defaultValueLiteral, valueSource: 'declared-default', handler };
}
function disabledContract(surface, control) {
  const conditional = control.contract?.showWhen;
  return {
    enabledPredicate: `control(${control.designId}).disabled === false and aria-disabled is false`,
    disabledPredicate: conditional ? `control(${control.designId}) is not rendered or is disabled until ctl:${conditional.control} equals ${JSON.stringify(conditional.is)}` : `screen lock state s.locks[s.screen] disables ${control.designId} and openUnlock() is the recovery action`,
    disabledReason: conditional ? `Requires ctl:${conditional.control} to equal ${JSON.stringify(conditional.is)}` : `Surface ${surface.id} is locked; use openUnlock() before changing ${control.designId}`,
    writeRefusalSource: { sourceFile: 'console/app/renderer/src/generated/console.tsx', function: 'setVal', rule: 'A disabled or locked action must not call commit or write a value. The receipt fails if setVal dispatches while disabled.' },
  };
}
function observableExpression(control, semantics) {
  const role = JSON.stringify(control.locator.role); const name = JSON.stringify(control.locator.name); const expected = JSON.stringify(semantics.expectedValue);
  const list = `[...document.querySelectorAll('[role='+${role}+'],button,input,select,textarea')].filter(x => (x.getAttribute('aria-label')||x.textContent||'').trim() === ${name})`;
  if (control.kinds[0] === 'switch') return `(()=>{const es=${list}; return es.length===1 && es[0].getAttribute('aria-checked') === String(${expected});})()`;
  if (semantics.operation === 'reject') return `(()=>{const es=${list}; const error=document.querySelector('[aria-invalid="true"],[role="alert"],.error-message'); return es.length===1 && Boolean(error) && String(es[0].value ?? es[0].textContent ?? '').trim() === String(${JSON.stringify(semantics.preValue)});})()`;
  return `(()=>{const es=${list}; if(es.length!==1) return false; const e=es[0]; return ${expected}===null || String(e.value ?? e.textContent ?? '').trim() === String(${expected});})()`;
}

function controlRow(surface, control, language, actionCase) {
  const id = `control.${surface.id}.${control.stableId}.${language}.${actionCase}`;
  const destructive = destructiveSafety(control.designId, actionCase);
  const selector = { method: control.locator.method, role: control.locator.role, name: control.locator.name, stateKey: control.locator.stateKey, surfaceRuntimeId: surface.runtimeId };
  const semantics = actionSemantics(control, actionCase);
  const predicate = observableExpression(control, semantics);
  return {
    id, rowKind: 'real-control-action', featureId: control.featureIds[0], featureIds: control.featureIds,
    surfaceId: surface.id, designId: control.designId, ...(control.occurrenceSpecific ? { occurrenceStableId: control.stableId } : {}), designBinding: { sourceFile: control.declarations[0]?.source, controlId: control.designId, ...(control.occurrenceSpecific ? { occurrenceStableId: control.stableId } : {}), kind: control.kind, label: control.label, occurrenceCount: control.declarations.length, declarationLocations: control.declarations.map((declaration) => ({ source: declaration.source, line: declaration.location.line, column: declaration.location.column })), runtimeUseLocations: control.runtimeUses.map((use) => ({ source: use.source, line: use.location.line, column: use.location.column, bindingPath: use.binding.path })) }, runtimeBinding: control.runtimeBinding, language, route: routeFields(surface, 'control-action'),
    target: { stableId: `control:${surface.runtimeId}:${control.stableId}`, selector, duplicateCountMustEqual: 1, ariaRole: control.locator.role, accessibleName: control.locator.name },
    precondition: { exactUrl: surface.routeTuple.expectedUrl, sourceCommit: '{sourceCommit}', targetIsSoleCdpPage: true, controlEnabledOrDisabledStateRecorded: true },
    action: { type: actionCase, exact: `${control.kinds[0]}:${actionCase}`, controlAction: control.contract.action, semantics, repeatCount: 1, boundedFixture: fixtureFor(control, actionCase), target: selector, noImplicitSubmit: true },
    expected: { visible: `The ${control.locator.name} control exposes its ${actionCase} result or its explicit disabled reason.`, preActionState: { stateKey: control.locator.stateKey, defaultValue: control.contract.defaultValueLiteral, conditional: control.contract.showWhen }, postActionState: { predicate, expectedValue: semantics.expectedValue, validation: semantics.operation === 'reject' ? 'error is visible and value remains unchanged' : 'value and receipt are visible' }, disabledState: disabledContract(surface, control), observablePredicate: predicate, receipt: `Independent read of ${control.locator.stateKey} and the visible notification or field value.`, disabledPredicate: 'A disabled control has an accessible disabled state and an adjacent exact reason; the action is not sent.', falseResult: 'Missing, duplicate, inert, contradictory, or unexplained unchanged state fails the row.' },
    destructiveSafety: destructive,
    runtimeIdentity: runtimeIdentity(),
    captures: {
      before: { filename: `${surface.id}/${id}-before.png`, altText: `${surface.id}, ${language}, ${control.locator.name}, before ${actionCase}` },
      after: { filename: `${surface.id}/${id}-after.png`, altText: `${surface.id}, ${language}, ${control.locator.name}, after ${actionCase} with the visible receipt` },
    },
    requiredReceiptSchemas: Object.keys(RECEIPT_SCHEMAS),
    mappings: { docs: `console/docs/evidence/ui-smoke/{integratedCommit}/${surface.id}/${id}`, wiki: `wiki/UI-smoke-evidence.md#{integratedCommit}-${id}`, issue: `GitHub issue comment anchor ${id}`, pages: `console/site/documentation.html#ui-smoke-evidence-{integratedCommit}-${id}` },
    promotion: { rawBefore: `{taskOwnedLowlevelRunRoot}/captures/${surface.id}/${id}-before.png`, rawAfter: `{taskOwnedLowlevelRunRoot}/captures/${surface.id}/${id}-after.png`, canonicalRoot: `console/docs/evidence/ui-smoke/{integratedCommit}/${surface.id}/`, comparisonPath: `console/docs/evidence/ui-smoke/{integratedCommit}/indexes/${surface.id}-comparison.png`, visualDiffPath: `console/docs/evidence/ui-smoke/{integratedCommit}/diffs/${surface.id}.json` },
    redaction: REDACTION,
  };
}

function routeRow(surface, routeCase, index) {
  const featureId = surface.featureIds[index % surface.featureIds.length];
  const id = `surface.${surface.id}.route.${routeCase}`;
  const isPage = surface.routeTuple.kind === 'edge-hidden-desktop';
  const predicate = routeCase === 'one-target-privacy-proof'
    ? "targets.length === 1 && targets[0].type === 'page' && targets[0].url === expectedUrl && targets[0].webSocketDebuggerUrl.startsWith('ws://127.0.0.1:')"
    : routeCase === 'exact-route-open' ? `location.href === '${surface.routeTuple.expectedUrl}'`
      : routeCase === 'state-transition-observable' ? surface.group === 'layout-state' ? (surface.id.includes('width-') ? `window.innerWidth === ${Number(surface.id.split('-').at(-1))}` : surface.id.includes('scale-') ? `window.visualViewport.scale >= ${Number(surface.id.split('-').at(-1)) / 100}` : 'document.body.dataset.theme !== undefined') : `location.href === '${surface.routeTuple.expectedUrl}'`
        : routeCase === 'lifecycle-cleanup-proof' ? 'cleanupState.processExited && cleanupState.desktopClosed && cleanupState.profileRemoved' : 'privacyReceipt.redactionStatus === clean';
  return {
    id, rowKind: surface.equivalent ? 'equivalent-surface-proof' : 'route-lifecycle-proof', featureId, featureIds: surface.featureIds,
    surfaceId: surface.id, designId: surface.designId, designBinding: { sourceFile: surface.source, surfaceId: surface.designId, equivalent: surface.equivalent }, runtimeBinding: surface.runtimeId, language: 'neutral', route: routeFields(surface, routeCase),
    target: { stableId: `surface:${surface.runtimeId}`, selector: `surface:${surface.runtimeId}`, duplicateCountMustEqual: 1, expectedUrl: surface.routeTuple.expectedUrl, targetType: 'page' },
    precondition: { sourceCommit: '{sourceCommit}', integratedCommit: '{integratedCommit}', exactUrl: surface.routeTuple.expectedUrl, routeTransition: surface.routeTuple.transition, targetIsSoleCdpPage: true, pageRouteUsesHiddenEdge: isPage },
    action: { type: routeCase, exact: routeCase, repeatCount: 1, boundedFixture: { type: 'none' }, routeTransition: surface.routeTuple.transition },
    expected: { visible: `The ${surface.id} ${routeCase} result is visible and labelled with its exact state.`, observablePredicate: predicate, deterministicTransition: surface.routeTuple.transition, receipt: `Independent route and lifecycle receipt for ${surface.id}.`, falseResult: 'Any second target, wrong URL, stale identity, missing receipt, or unexplained state fails the row.' },
    destructiveSafety: { level: 'non-destructive', confirmationRequired: false, keys: [], slider: null, cancel: null, sourceMustRemainUnchangedUntilReceipt: true, actionCase: routeCase },
    runtimeIdentity: runtimeIdentity(),
    captures: { before: { filename: `${surface.id}/${id}-before.png`, altText: `${surface.id}, ${routeCase}, before` }, after: { filename: `${surface.id}/${id}-after.png`, altText: `${surface.id}, ${routeCase}, after with the visible receipt` } },
    requiredReceiptSchemas: Object.keys(RECEIPT_SCHEMAS),
    mappings: { docs: `console/docs/evidence/ui-smoke/{integratedCommit}/${surface.id}/${id}`, wiki: `wiki/UI-smoke-evidence.md#{integratedCommit}-${id}`, issue: `GitHub issue comment anchor ${id}`, pages: `console/site/documentation.html#ui-smoke-evidence-{integratedCommit}-${id}` },
    promotion: { rawBefore: `{taskOwnedLowlevelRunRoot}/captures/${surface.id}/${id}-before.png`, rawAfter: `{taskOwnedLowlevelRunRoot}/captures/${surface.id}/${id}-after.png`, canonicalRoot: `console/docs/evidence/ui-smoke/{integratedCommit}/${surface.id}/`, comparisonPath: `console/docs/evidence/ui-smoke/{integratedCommit}/indexes/${surface.id}-comparison.png`, visualDiffPath: `console/docs/evidence/ui-smoke/{integratedCommit}/diffs/${surface.id}.json` },
    redaction: REDACTION,
  };
}

function buildRows() {
  const rows = [];
  for (const record of controlCensus.records) for (const variant of controlVariants(record)) {
    const surface = surfaceById(variant.surfaceId ?? record.surfaceId);
    for (const language of LANGUAGE_MODES) for (const actionCase of variant.actionCases) rows.push(controlRow(surface, variant, language, actionCase));
  }
  for (const surface of SURFACES) for (let index = 0; index < surface.routeCases.length; index += 1) rows.push(routeRow(surface, surface.routeCases[index], index));
  return rows;
}
function derivedControlActionCaseCount() { return controlCensus.records.flatMap(controlVariants).reduce((sum, control) => sum + control.actionCases.length, 0); }

function buildManifest() {
  const counts = assertSourceInventory();
  if (surfaceControlIndex.schemaVersion !== 2) throw new Error('surface control index schema drift');
  const rows = buildRows();
  if (rows.length !== EXPECTED_ROW_COUNT) throw new Error(`generated row count drift: expected ${EXPECTED_ROW_COUNT}, got ${rows.length}`);
  const ids = rows.map((row) => row.id);
  if (new Set(ids).size !== ids.length) throw new Error('interaction ids must be unique');
  const covered = new Set(rows.flatMap((row) => row.featureIds));
  if (covered.size !== EXPECTED_FEATURE_COUNT) throw new Error('interaction rows do not cover all features');
  return {
    schemaVersion: 2, generatedBy: 'console/scripts/generate-ui-smoke-manifest.mjs', sourceInventory: 'console/inventories/ui-smoke-inventory.mjs', pendingContracts: PENDING_CONTRACTS, sourceControlCensus: 'console/inventories/ui-smoke/control-census.json', sourceSurfaceControlIndex: 'console/inventories/ui-smoke/surface-control-index.json', visualDiffSchema: VISUAL_DIFF_SCHEMA,
    inventoryDigest: inventoryDigest(), rowFormula: { controlActionCaseCount: derivedControlActionCaseCount(), languageModeCount: LANGUAGE_MODES.length, controlRows: derivedControlActionCaseCount() * LANGUAGE_MODES.length, routeProofRows: SURFACES.reduce((sum, surface) => sum + surface.routeCases.length, 0), totalRows: rows.length }, sourceCounts: { ...counts, rowCount: rows.length, uniqueControlCount: controlCensus.uniqueControlCount, executableControlCount: controlCensus.executableControlCount, excludedControlCount: controlCensus.excludedControlCount, priorScreenModelRuntimeIds: controlCensus.auditReconciliation.priorScreenModelRuntimeIds, exactParserScreenModelRuntimeIds: controlCensus.auditReconciliation.exactParserScreenModelRuntimeIds, dynamicRuntimeControlCount: controlCensus.auditReconciliation.parserRuntimeUniqueControlIds - controlCensus.auditReconciliation.exactParserScreenModelRuntimeIds, controlOccurrenceCount: controlCensus.occurrenceCount, occurrenceSpecificDuplicateCount: controlCensus.duplicateReconciliation.occurrenceSpecificIds.length, languageModeCount: LANGUAGE_MODES.length },
    designBindingCensus: DESIGN_BINDING_CENSUS, execution: EXECUTION_CONTRACT, receiptSchemas: RECEIPT_SCHEMAS, redaction: REDACTION, rows,
  };
}

const CAPTURE_INDEX = { schemaVersion: 2, status: 'planned-no-captures-produced', canonicalRoot: 'console/docs/evidence/ui-smoke/{integratedCommit}/', rawRunRootNotCommitted: true, note: 'This index names future evidence locations only. It does not assert that any capture exists.', surfaces: SURFACES.map((surface) => ({ surfaceId: surface.id, canonicalDirectory: surface.evidence.captures, rawRunDirectory: surface.evidence.rawRunRoot, routeTuple: surface.routeTuple, routeCases: surface.routeCases, featureIds: surface.featureIds, contactSheet: surface.evidence.contactSheet, comparisonPath: `console/docs/evidence/ui-smoke/{integratedCommit}/indexes/${surface.id}-comparison.png`, visualDiffPath: `console/docs/evidence/ui-smoke/{integratedCommit}/diffs/${surface.id}.json`, labelledComparisonRequired: true, visualDiffRequired: true })) };
const NEGATIVE_REGRESSIONS = [
  { id: 'remove-control-census-record', mutation: 'remove one actual designId from control-census.json', expected: 'row count, binding join, and control coverage fail' },
  { id: 'replace-runtime-id', mutation: 'change one control runtimeBinding or stateKey', expected: 'real-control binding validation fails' },
  { id: 'change-route-tuple', mutation: 'change one exact expectedUrl or transition target', expected: 'route proof fails exact URL equality' },
  { id: 'second-cdp-target', mutation: 'add a second target to a one-target receipt', expected: 'privacy proof fails closed' },
  { id: 'stale-source-commit', mutation: 'change sourceCommit without ancestry proof', expected: 'provenance validator fails' },
  { id: 'missing-receipt-field', mutation: 'remove one required version-1 receipt field', expected: 'receipt validator fails' },
  { id: 'hash-mismatch', mutation: 'change one destination SHA-256', expected: 'promotion fails before publish' },
  { id: 'overwrite-canonical-output', mutation: 'place an existing file at a canonical target', expected: 'transaction refuses overwrite' },
  { id: 'raw-root-in-repository', mutation: 'set rawRunRootNotCommitted to false', expected: 'privacy validation fails' },
  { id: 'destructive-safety-drop', mutation: 'remove sureCells, sureYes, sureProgress, or closeSure from a destructive row', expected: 'destructive action validation fails' },
  { id: 'invalid-aria-target', mutation: 'remove the role or accessible name from a control target', expected: 'target validation fails' },
  { id: 'empty-fixture-bound', mutation: 'remove byte or option bounds from a fixture', expected: 'bounded-input validation fails' },
  { id: 'visual-diff-missing', mutation: 'remove a labelled comparison or visual-diff record', expected: 'evidence validation fails' },
];

function writeJson(name, value) { const path = resolve(outputDir, name); mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }
const SHARD_ROW_LIMIT = 250;
const SHARD_BYTE_CAP = 20 * 1024 * 1024;
function writeShardedManifest(manifest) {
  const stage = resolve(outputDir, `.interaction-manifest-stage-${process.pid}`); const finalDir = resolve(outputDir, 'shards');
  rmSync(stage, { recursive: true, force: true }); mkdirSync(stage, { recursive: true });
  const shards = [];
  for (let offset = 0, ordinal = 0; offset < manifest.rows.length; offset += SHARD_ROW_LIMIT, ordinal += 1) {
    const rows = manifest.rows.slice(offset, offset + SHARD_ROW_LIMIT); const name = `interaction-${String(ordinal).padStart(4, '0')}.json`; const bytes = Buffer.from(`${JSON.stringify(rows)}\n`);
    if (bytes.length > SHARD_BYTE_CAP) throw new Error(`shard ${name} exceeds ${SHARD_BYTE_CAP} bytes`);
    writeFileSync(resolve(stage, name), bytes); shards.push({ ordinal, path: `shards/${name}`, rowCount: rows.length, firstRowId: rows[0].id, lastRowId: rows.at(-1).id, byteSize: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  const index = { schemaVersion: 3, generatedBy: manifest.generatedBy, inventoryDigest: manifest.inventoryDigest, totalRows: manifest.rows.length, rowSequenceSha256: createHash('sha256').update(Buffer.from(manifest.rows.map((row) => row.id).join('\n'))).digest('hex'), storage: { kind: 'deterministic-shards', maxRowsPerShard: SHARD_ROW_LIMIT, maxShardBytes: SHARD_BYTE_CAP }, shards, manifest: { ...manifest, rows: undefined } };
  const indexStage = resolve(outputDir, `.interaction-manifest-index-${process.pid}.json`); writeFileSync(indexStage, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
  rmSync(finalDir, { recursive: true, force: true }); renameSync(stage, finalDir); renameSync(indexStage, resolve(outputDir, 'interaction-manifest.json'));
}

export function generate() {
  const manifest = buildManifest();
  writeShardedManifest(manifest);
  writeJson('capture-index.json', CAPTURE_INDEX);
  writeJson('design-binding-census.json', DESIGN_BINDING_CENSUS);
  writeJson('execution-schema.json', { schemaVersion: 2, title: 'Resumeable UI smoke execution ledger', ledgerExecutor: 'console/scripts/run-ui-smoke-ledger.mjs', required: ['planId', 'sourceCommit', 'integratedCommit', 'inventoryDigest', 'batchNumber', 'rowIds', 'status', 'events', 'runtimeIdentity'], statuses: ['planned', 'running', 'paused', 'completed', 'failed', 'cancelled', 'stale'], eventSchema: { required: ['planId', 'rowId', 'sourceCommit', 'integratedCommit', 'inventoryDigest', 'actionType', 'phase', 'beforeSha256', 'afterSha256', 'status', 'redactionStatus'], hashType: 'sha256-or-null-before-capture', runtimeIdentityRequired: true }, legalTransitions: { planned: ['running', 'cancelled', 'stale'], running: ['running', 'paused', 'completed', 'failed', 'cancelled', 'stale'], paused: ['running', 'cancelled', 'stale'], failed: ['running', 'cancelled', 'stale'], cancelled: ['running', 'stale'], stale: ['planned'], completed: ['completed'] }, batchRules: { maxRowsPerBatch: 24, maxConcurrentApplications: 1, maxPollSeconds: 30, maxCaptureBytes: 33554432, cancellation: 'cooperative-and-visible', noOverlapAcrossBatches: true }, runtimeIdentity: EXECUTION_CONTRACT.runtimeIdentity, provenance: { commands: ['git rev-parse --verify {sourceCommit}^{commit}', 'git rev-parse --verify {integratedCommit}^{commit}', 'git merge-base --is-ancestor {sourceCommit} {integratedCommit}', 'git diff --exit-code {sourceCommit}:console/inventories/ui-smoke-inventory.mjs {integratedCommit}:console/inventories/ui-smoke-inventory.mjs'], requireObjectTypeCommit: true, requireAncestry: true }, redaction: REDACTION, receiptSchemas: RECEIPT_SCHEMAS });
  writeJson('negative-regressions.json', { schemaVersion: 2, regressions: NEGATIVE_REGRESSIONS });
  writeJson('docs-evidence-map.json', { schemaVersion: 2, sourceManifest: 'console/inventories/ui-smoke/interaction-manifest.json', canonicalRoot: 'console/docs/evidence/ui-smoke/{integratedCommit}/', rawRunRootNotCommitted: true, mappings: { repositoryDocs: 'console/docs/evidence/ui-smoke/{integratedCommit}/index.html', wiki: 'wiki/UI-smoke-evidence.md#{integratedCommit}', issue: 'GitHub issue comment with inline before and after evidence per row', pages: 'console/site/documentation.html#ui-smoke-evidence-{integratedCommit}' }, mappingValidator: 'Each surface id and row id must resolve to all four mappings after integration.' });
  return manifest;
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/generate-ui-smoke-manifest.mjs')) { const result = generate(); console.log(`wrote ${result.rows.length} rows from ${result.sourceCounts.uniqueControlCount} real controls across ${result.sourceCounts.surfaceCount} surfaces`); }
