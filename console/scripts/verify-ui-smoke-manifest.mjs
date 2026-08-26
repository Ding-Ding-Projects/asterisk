#!/usr/bin/env node
/** Source-only validator for the reviewed UI smoke manifest. */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DESIGN_BINDING_CENSUS, EXPECTED_FEATURE_COUNT, EXPECTED_ROW_COUNT, EXPECTED_SURFACE_COUNT, FEATURES, LANGUAGE_MODES, PENDING_CONTRACTS, SURFACES, assertSourceInventory } from '../inventories/ui-smoke-inventory.mjs';

const root = resolve(import.meta.dirname, '..', '..');
const inventoryRoot = resolve(root, 'console/inventories/ui-smoke');
const manifest = JSON.parse(readFileSync(resolve(inventoryRoot, 'interaction-manifest.json'), 'utf8'));
const census = JSON.parse(readFileSync(resolve(inventoryRoot, 'control-census.json'), 'utf8'));
const surfaceIndex = JSON.parse(readFileSync(resolve(inventoryRoot, 'surface-control-index.json'), 'utf8'));
const sourceCache = new Map();
function sourceText(path) {
  const resolved = resolve(root, path);
  if (!sourceCache.has(resolved)) sourceCache.set(resolved, readFileSync(resolved, 'utf8'));
  return sourceCache.get(resolved);
}

function fail(message) { throw new Error(`UI smoke manifest invalid: ${message}`); }
function digest() {
  const canonical = { inventoryVersion: 2, features: FEATURES, pendingContracts: PENDING_CONTRACTS, surfaces: SURFACES, controlCensus: census, surfaceControlIndex: surfaceIndex, designBindingCensus: DESIGN_BINDING_CENSUS, languageModes: LANGUAGE_MODES };
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

export function validateManifest(value = manifest) {
  const counts = assertSourceInventory();
  if (value.schemaVersion !== 2) fail('schemaVersion must be 2');
  if (!Array.isArray(value.pendingContracts) || value.pendingContracts.length !== 7 || value.pendingContracts.some((contract) => contract.status !== 'pending-implementation' || !contract.reason)) fail('pending implementation contracts drift');
  if (census.schemaVersion !== 2 || census.uniqueControlCount !== 566 || census.executableControlCount !== 566 || census.excludedControlCount !== 0) fail('exact control census counts drift');
  if (census.auditReconciliation?.designAuditControlDeclarations !== 479 || census.auditReconciliation?.designAuditControlIds !== 467 || census.auditReconciliation?.priorScreenModelRuntimeIds !== 335 || census.auditReconciliation?.exactParserScreenModelRuntimeIds !== 323 || census.auditReconciliation?.exactParserDynamicRuntimeIds !== 243) fail('design census reconciliation drift');
  if (surfaceIndex.schemaVersion !== 2 || surfaceIndex.screenModelControlCount !== 323 || surfaceIndex.dynamicRuntimeControlCount !== 243 || surfaceIndex.excludedSourceControlCount !== 0 || !Array.isArray(surfaceIndex.dynamicRuntimeControls) || surfaceIndex.dynamicRuntimeControls.length !== 243) fail('surface control index dynamic reconciliation drift');
  const expectedDynamicIds = census.records.filter((record) => record.runtimeUses.some((use) => !use.binding.screenId)).map((record) => record.designId).sort();
  const actualDynamicIds = surfaceIndex.dynamicRuntimeControls.map((record) => record.controlId).sort();
  if (JSON.stringify(expectedDynamicIds) !== JSON.stringify(actualDynamicIds)) fail('surface control index dynamic IDs drift');
  for (const record of census.records) {
    if (!record.designId || !record.declarations?.length || !record.runtimeUses?.length || !record.surfaceId || !record.featureIds?.length || !record.locator?.bindingPath) fail(`control ${record.designId} lacks declaration, runtime use, feature, surface, or locator evidence`);
      if (!record.executable && (!record.exclusion?.code || !record.exclusion?.reason)) fail(`excluded control ${record.designId} lacks an explicit exclusion reason`);
      if (record.contract?.defaultValueSyntaxValid !== true) fail(`control ${record.designId} has malformed typed default syntax`);
    if (record.declarations.length > 1) {
      if (record.duplicateMode === 'occurrence-specific') {
        if (!Array.isArray(record.occurrenceVariants) || record.occurrenceVariants.length !== record.declarations.length || record.occurrenceVariants.some((variant) => !variant.stableId || !variant.runtimeUse?.binding?.path)) fail(`duplicate ${record.designId} lacks occurrence-specific stable bindings`);
      } else if (record.duplicateMode !== 'shared-contract') fail(`duplicate ${record.designId} has no duplicate reconciliation mode`);
    }
  }
  if (counts.featureCount !== EXPECTED_FEATURE_COUNT || counts.surfaceCount !== EXPECTED_SURFACE_COUNT) fail('source inventory counts drift');
  if (value.sourceCounts?.rowCount !== EXPECTED_ROW_COUNT || value.rows?.length !== EXPECTED_ROW_COUNT) fail('row count must remain exactly 10551');
  if (value.rowFormula?.controlActionCaseCount !== 3294 || value.rowFormula?.languageModeCount !== 3 || value.rowFormula?.controlRows !== 9882 || value.rowFormula?.routeProofRows !== 669 || value.rowFormula?.totalRows !== 10551) fail('row formula drift');
  if (value.sourceCounts?.uniqueControlCount !== census.uniqueControlCount) fail('control census count drift');
  if (value.sourceCounts?.controlOccurrenceCount !== census.occurrenceCount || value.sourceCounts?.occurrenceSpecificDuplicateCount !== census.duplicateReconciliation.occurrenceSpecificIds.length) fail('control occurrence reconciliation drift');
  if (value.sourceCounts?.dynamicRuntimeControlCount !== 243 || surfaceIndex.dynamicRuntimeControlCount !== 243 || surfaceIndex.dynamicRuntimeControls?.length !== 243) fail('dynamic runtime record count drift');
  if (value.sourceCounts?.languageModeCount !== LANGUAGE_MODES.length) fail('language mode count drift');
  if (value.inventoryDigest !== digest()) fail('canonical inventory digest drift');
  if (value.designBindingCensus?.sourceArchiveSha256 !== DESIGN_BINDING_CENSUS.sourceArchiveSha256) fail('design archive hash drift');
  if (value.designBindingCensus?.destinationCount !== 32 || value.designBindingCensus?.controlCount !== 479 || value.designBindingCensus?.distinctExpressionCount !== 168 || value.designBindingCensus?.transientStateFamilyCount !== 17) fail('design binding census drift');
  for (const schemaName of ['interaction', 'outcome', 'privacy', 'altText', 'pixelReview', 'evidence']) { const schema = value.receiptSchemas?.[schemaName]; if (schema?.schemaVersion !== 1 || !Array.isArray(schema.required) || !schema.types || !Array.isArray(schema.relations)) fail(`receipt schema ${schemaName} is incomplete`); }
  if (value.execution?.route !== 'cheap-lowlevel-headless-cdp-and-lifecycle-only') fail('execution route drift');
  if (value.execution?.promotion?.rawRunRootNotCommitted !== true) fail('raw run root privacy rule missing');
  if (value.execution?.promotion?.canonicalRoot !== 'console/docs/evidence/ui-smoke/{integratedCommit}/') fail('canonical root drift');
  for (const command of ['git rev-parse --verify {sourceCommit}^{commit}', 'git rev-parse --verify {integratedCommit}^{commit}', 'git merge-base --is-ancestor {sourceCommit} {integratedCommit}']) if (!value.execution || !JSON.stringify(value.execution).includes(command)) fail(`missing provenance command ${command}`);
  const surfaces = new Map(SURFACES.map((surface) => [surface.id, surface]));
  const controls = new Map(census.records.map((record) => [record.designId, record]));
  const ids = new Set();
  const coveredFeatures = new Set();
  let controlRows = 0;
  let routeRows = 0;
  for (const row of value.rows) {
    if (ids.has(row.id)) fail(`duplicate row ${row.id}`);
    ids.add(row.id);
    const surface = surfaces.get(row.surfaceId);
    if (!surface) fail(`${row.id} references unknown surface`);
    for (const feature of row.featureIds ?? []) { if (!FEATURES.includes(feature)) fail(`${row.id} references unknown feature ${feature}`); coveredFeatures.add(feature); }
    if (row.route?.expectedUrl !== surface.routeTuple.expectedUrl) fail(`${row.id} expected URL drift`);
    if (row.route?.exactUrlEquality !== true) fail(`${row.id} does not require exact URL equality`);
    if (/ding-pbx:/iu.test(row.route?.expectedUrl ?? '') || /ding-pbx:/iu.test(JSON.stringify(row.route?.transition ?? {}))) fail(`${row.id} contains an unregistered custom protocol route`);
    if (row.route?.kind === 'electron-file') {
      if (row.route.runtimeRegistration?.sourceFile !== 'console/app/electron/main.ts' || !row.route.runtimeRegistration?.registrationPattern || !row.route.runtimeRegistration?.rendererNavigationPattern) fail(`${row.id} lacks Electron loadFile and navigation registration proof`);
      if (row.route.reference?.framework !== 'x-dc' || row.route.reference?.frameworkFile !== 'design/support.js') fail(`${row.id} lacks the committed design framework route proof`);
      const mainSource = sourceText(row.route.runtimeRegistration.sourceFile); const rendererSource = sourceText(row.route.runtimeRegistration.rendererSource);
      if (!mainSource.includes(row.route.runtimeRegistration.registrationPattern) || !rendererSource.includes(row.route.runtimeRegistration.rendererNavigationPattern)) fail(`${row.id} runtime registration proof does not match source`);
      if (!existsSync(resolve(root, row.route.reference.sourceFile)) || !existsSync(resolve(root, row.route.reference.frameworkFile))) fail(`${row.id} design framework source is unreachable`);
      const designSource = sourceText(row.route.reference.sourceFile);
      for (const marker of row.route.reference.requiredMarkers ?? []) if (!designSource.includes(marker)) fail(`${row.id} design framework marker is missing: ${marker}`);
    }
    if (row.route?.kind === 'edge-hidden-desktop') {
      if (!row.route.reference?.sourceFile || !row.route.reference?.servedPath) fail(`${row.id} Pages route lacks a real source file and served path`);
      if (!existsSync(resolve(root, row.route.reference.sourceFile))) fail(`${row.id} Pages source file is absent at ${row.route.reference.sourceFile}`);
      if (row.route.reference.anchor) {
        if (!row.route.reference.anchorSource || !existsSync(resolve(root, row.route.reference.anchorSource))) fail(`${row.id} Pages anchor source is absent`);
        const anchorSource = sourceText(row.route.reference.anchorSource);
        if (!anchorSource.includes(`id=\"${row.route.reference.anchor}\"`) && !anchorSource.includes(`id='${row.route.reference.anchor}'`) && !(row.route.reference.anchor === 'article-content' && anchorSource.includes('id="article-content"'))) fail(`${row.id} Pages anchor #${row.route.reference.anchor} is not present in its source or wrapper`);
      }
    }
    if (!row.designBinding?.sourceFile || !row.designBinding?.surfaceId && !row.designBinding?.controlId) fail(`${row.id} lacks row-level design binding`);
    if (row.precondition?.targetIsSoleCdpPage !== true) fail(`${row.id} lacks one-target proof precondition`);
    if (row.runtimeIdentity?.adapter !== 'ui-smoke-lowlevel-adapter' || row.runtimeIdentity?.artifactPath !== '{builtArtifactPath}' || row.runtimeIdentity?.artifactSha256 !== '{builtArtifactSha256}') fail(`${row.id} artifact identity contract drift`);
    if (!row.captures?.before?.filename || !row.captures?.after?.filename || !row.captures.before.altText || !row.captures.after.altText) fail(`${row.id} lacks paired capture names and alt text`);
    if (!Array.isArray(row.requiredReceiptSchemas) || row.requiredReceiptSchemas.length !== 6) fail(`${row.id} lacks the six version-1 receipt schema bindings`);
    for (const mapping of ['docs', 'wiki', 'issue', 'pages']) if (typeof row.mappings?.[mapping] !== 'string' || !row.mappings[mapping]) fail(`${row.id} lacks ${mapping} mapping`);
    if (row.promotion?.canonicalRoot !== `console/docs/evidence/ui-smoke/{integratedCommit}/${row.surfaceId}/`) fail(`${row.id} canonical promotion path drift`);
    if (row.redaction?.rawRunRootNotCommitted !== true || row.redaction?.recursiveAllowlist?.rejectUnknownKeys !== true) fail(`${row.id} recursive privacy allowlist drift`);
    if (row.rowKind === 'real-control-action') {
      controlRows += 1;
      const control = controls.get(row.designId);
      if (!control) fail(`${row.id} references unknown design control`);
      const expectedBinding = row.occurrenceStableId ? control.occurrenceVariants.find((variant) => variant.stableId === row.occurrenceStableId)?.runtimeUse?.binding.path : control.runtimeUses[0].binding.path;
      if (!row.runtimeBinding || row.runtimeBinding !== expectedBinding) fail(`${row.id} runtime binding drift`);
      if (JSON.stringify([...(row.featureIds ?? [])].sort()) !== JSON.stringify([...(control.featureIds ?? [])].sort())) fail(`${row.id} control feature ownership drift`);
      if (control.duplicateMode === 'occurrence-specific' && (!row.occurrenceStableId || !row.id.includes(row.occurrenceStableId))) fail(`${row.id} duplicate occurrence stable id is missing`);
      if (row.target?.duplicateCountMustEqual !== 1 || !row.target.accessibleName || !row.target.ariaRole) fail(`${row.id} lacks exact accessible target contract`);
      if (row.action?.repeatCount !== 1 || !row.action?.boundedFixture) fail(`${row.id} lacks bounded action fixture`);
      if (!row.action?.semantics?.handler?.sourceFile || !row.action.semantics.handler.path || !row.action.semantics.handler.sourceNeedle || !existsSync(resolve(root, row.action.semantics.handler.sourceFile))) fail(`${row.id} lacks an exact source handler binding`);
      const handlerSource = sourceText(row.action.semantics.handler.sourceFile);
      if (!handlerSource.includes(row.action.semantics.handler.sourceNeedle)) fail(`${row.id} handler source needle is absent`);
      if (['slider', 'stepper'].includes(control.kinds?.[0]) && (!Number.isFinite(row.action.boundedFixture?.min) || !Number.isFinite(row.action.boundedFixture?.max) || !Number.isFinite(row.action.boundedFixture?.step))) fail(`${row.id} numeric bounds are incomplete`);
      if (row.occurrenceStableId && !row.id.includes(row.occurrenceStableId)) fail(`${row.id} occurrence stable id is not carried by the row id`);
      if (control.kinds?.[0] === 'switch' && !row.expected?.observablePredicate?.includes('aria-checked')) fail(`${row.id} switch observable does not prove the requested checked state`);
      if (row.action?.type === 'invalid-boundary' && !row.expected?.observablePredicate?.includes('aria-invalid')) fail(`${row.id} invalid-boundary observable does not prove validation and unchanged value`);
      if (control.contract?.defaultValueSyntaxValid !== true) fail(`${row.id} has malformed default value syntax`);
      if (row.destructiveSafety?.level === 'destructive') {
        if (!row.destructiveSafety.confirmationRequired || row.destructiveSafety.keys.length !== 2 || row.destructiveSafety.slider?.stateKey !== 'sureProgress' || row.destructiveSafety.cancel?.control !== 'closeSure' || row.destructiveSafety.sourceBehavior?.opener !== 'areYouSure' || row.destructiveSafety.sourceBehavior?.completionHandler !== 'sureYes' || row.action.controlAction !== row.destructiveSafety.sourceBehavior.controlAction) fail(`${row.id} destructive safety contract drift`);
      }
    } else if (row.rowKind === 'route-lifecycle-proof' || row.rowKind === 'equivalent-surface-proof') {
      routeRows += 1;
      if (!row.action?.routeTransition || row.action.repeatCount !== 1) fail(`${row.id} route transition contract drift`);
    } else fail(`${row.id} has unknown row kind`);
  }
  if (coveredFeatures.size !== EXPECTED_FEATURE_COUNT) fail(`feature coverage is ${coveredFeatures.size}, expected ${EXPECTED_FEATURE_COUNT}`);
  const actionCountByKind = { switch: 5, slider: 6, stepper: 6, segmented: 6, select: 7, text: 6, file: 5, order: 5, chips: 5 };
  const expectedControlCases = census.records.reduce((sum, control) => sum + (control.duplicateMode === 'occurrence-specific' ? control.occurrenceVariants.reduce((variantSum, variant) => variantSum + (actionCountByKind[variant.declaration.kind] ?? 1), 0) : control.actionCases.length), 0);
  const expectedControlRows = expectedControlCases * LANGUAGE_MODES.length;
  const expectedRouteRows = SURFACES.reduce((sum, surface) => sum + surface.routeCases.length, 0);
  if (controlRows !== expectedControlRows || routeRows !== expectedRouteRows || controlRows + routeRows !== EXPECTED_ROW_COUNT) fail(`derived row formula drift: controls ${controlRows}/${expectedControlRows}, routes ${routeRows}/${expectedRouteRows}`);
  return { featureCount: counts.featureCount, surfaceCount: counts.surfaceCount, uniqueControlCount: census.uniqueControlCount, controlRows, routeRows, rowCount: ids.size, runtimeEvidence: 'unrun' };
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/verify-ui-smoke-manifest.mjs')) { const result = validateManifest(); console.log(`PASS: ${result.featureCount} features, ${result.surfaceCount} surfaces, ${result.uniqueControlCount} real controls, ${result.rowCount} rows; runtime evidence remains ${result.runtimeEvidence}`); }