#!/usr/bin/env node
/**
 * Split the reviewed manifest into bounded cheap-Lowlevel lifecycle plans.
 * This writes plans only. It never starts Electron, Edge, CDP, Lowlevel, or a
 * visible application, and it never creates runtime evidence.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', '..');
const manifestPath = resolve(root, 'console/inventories/ui-smoke/interaction-manifest.json');
const outputDir = resolve(root, 'console/inventories/ui-smoke/lowlevel-plans');
const BATCH_SIZE = 24;
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

if (manifest.schemaVersion !== 2 || manifest.rows?.length !== 10330) throw new Error('the reviewed manifest must be schemaVersion 2 with 10330 rows');
if (manifest.execution?.route !== 'cheap-lowlevel-headless-cdp-and-lifecycle-only') throw new Error('manifest route is not the sanctioned cheap Lowlevel route');
if (manifest.execution?.promotion?.rawRunRootNotCommitted !== true) throw new Error('manifest does not enforce rawRunRootNotCommitted');

const PROVENANCE = {
  inventoryDigest: manifest.inventoryDigest,
  sourceCommit: '{sourceCommit}',
  integratedCommit: '{integratedCommit}',
  commands: [
    'git rev-parse --verify {sourceCommit}^{commit}',
    'git rev-parse --verify {integratedCommit}^{commit}',
    'git merge-base --is-ancestor {sourceCommit} {integratedCommit}',
    'git diff --exit-code {sourceCommit}:console/inventories/ui-smoke-inventory.mjs {integratedCommit}:console/inventories/ui-smoke-inventory.mjs',
    'git diff --exit-code {sourceCommit}:console/inventories/ui-smoke/control-census.json {integratedCommit}:console/inventories/ui-smoke/control-census.json',
  ],
  objectTypeRequired: 'commit',
  ancestryRequired: true,
};

const RUNTIME = {
  artifactPath: '{builtArtifactPath}', artifactSha256: '{builtArtifactSha256}', profileId: '{taskProfileId}', profilePath: '{taskProfilePath}',
  desktopName: '{hiddenDesktopName}', processId: '{ownedProcessId}', hwnd: '{resolvedHwnd}', cdpPort: '{taskLoopbackCdpPort}', targetId: '{soleCdpTargetId}', cleanupState: 'pending',
};

const LIFECYCLE = [
  { phase: 'preflight', route: 'cheap-lowlevel', action: 'require startup, launch, window, screenshot, background-input, and cleanup capabilities' },
  { phase: 'provenance', route: 'git', action: 'verify object type, ancestry, canonical inventory digest, artifact path, and artifact SHA-256' },
  { phase: 'launch', route: 'cheap-lowlevel', action: 'launch the exact artifact directly on a unique hidden desktop with a unique profile' },
  { phase: 'resolve-window', route: 'cheap-lowlevel', action: 'resolve the owned window by exact title and class, then re-resolve before every destructive process action' },
  { phase: 'target-proof', route: 'loopback-cdp', action: "require exactly one page target, exact normalized URL equality, and a non-empty loopback WebSocket URL; omit awaitPromise" },
  { phase: 'capture-before', route: 'cheap-lowlevel', action: 'capture the exact before state into the raw run root, then inspect PNG signature, dimensions, metadata, and pixel-review receipt' },
  { phase: 'resolve-control', route: 'cheap-lowlevel-plus-cdp', action: 'find the exact stable runtime id, accessible role, accessible name, and state key exactly once' },
  { phase: 'action', route: 'cheap-lowlevel-plus-cdp', action: 'perform one bounded action with the declared fixture and no implicit submit' },
  { phase: 'observable', route: 'loopback-cdp', action: 'read the exact independent observable predicate and receipt, never trusting command return status' },
  { phase: 'capture-after', route: 'cheap-lowlevel', action: 'capture the exact after state into the raw run root and inspect it' },
  { phase: 'receipts', route: 'local', action: 'validate interaction, outcome, privacy, alt-text, and evidence receipt schemas at version 1' },
  { phase: 'promote', route: 'local', action: 'stage under the same volume, hash-compare, publish atomically, and refuse overwrite' },
  { phase: 'cleanup', route: 'cheap-lowlevel', action: 'disconnect CDP and clean only the recorded profile, process tree, window, and desktop' },
];

function pageLaunch(row) {
  if (row.route.kind !== 'edge-hidden-desktop') return null;
  return {
    executable: '{edgeExecutablePath}',
    arguments: ['--guest', '--disable-sync', '--disable-extensions', '--disable-component-extensions-with-background-pages', '--no-first-run', '--no-default-browser-check', '--disable-features=msEdgeFirstRunExperience,msEdgeSignin,msEdgeSync', '--user-data-dir={taskProfilePath}', '--remote-debugging-port={taskLoopbackCdpPort}', '--app={exactExpectedUrl}'],
    exactExpectedUrl: row.route.expectedUrl,
    targetProof: "json/list.length === 1 && json/list[0].type === 'page' && json/list[0].url === exactExpectedUrl",
    profileIsolation: 'new task-scoped profile, deleted only by recorded cleanup',
  };
}

function planFor(batchNumber, rows) {
  return {
    schemaVersion: 2,
    planId: `ui-smoke-batch-${String(batchNumber).padStart(3, '0')}`,
    batchNumber, batchSize: rows.length, rowIds: rows.map((row) => row.id),
    sourceManifest: 'console/inventories/ui-smoke/interaction-manifest.json', inventoryDigest: manifest.inventoryDigest,
    adapter: 'console/scripts/ui-smoke-lowlevel-adapter.mjs',
    route: 'cheap-lowlevel-headless-cdp-and-lifecycle-only', forbiddenRoutes: manifest.execution.forbiddenRoutes,
    provenance: PROVENANCE, runtimeIdentity: RUNTIME, rawRunRoot: '{taskOwnedLowlevelRunRoot}', rawRunRootNotCommitted: true, canonicalRoot: 'console/docs/evidence/ui-smoke/{integratedCommit}/',
    batchRules: { maxRows: BATCH_SIZE, timeoutSeconds: 30, maxConcurrentApplications: 1, maxCaptureBytes: 33554432, cancellation: 'cooperative-and-visible', resumeAllowed: true, noOverlapAcrossBatches: true },
    lifecycle: LIFECYCLE,
    rows: rows.map((row) => ({
      id: row.id, rowKind: row.rowKind, featureId: row.featureId, featureIds: row.featureIds, surfaceId: row.surfaceId,
      route: row.route, exactExpectedUrl: row.route.expectedUrl, routeTransition: row.route.transition, pageLaunch: pageLaunch(row),
      target: row.target, precondition: row.precondition, action: row.action, expected: row.expected, destructiveSafety: row.destructiveSafety,
      runtimeIdentity: row.runtimeIdentity, captures: row.captures, promotion: row.promotion,
      requiredReceiptSchemas: Object.keys(manifest.receiptSchemas), redaction: manifest.redaction, failClosedOn: manifest.execution.failClosedOn,
    })),
    resume: { requireSourceCommitMatch: true, requireIntegratedCommitAncestry: true, requireInventoryDigestMatch: true, reResolveRuntimeIdentity: true, completedRowRequires: ['before-hash', 'outcome-receipt-v1', 'after-hash', 'privacy-receipt-v1', 'evidence-receipt-v1', 'atomic-promotion'] },
  };
}

export function generatePlans() {
  mkdirSync(outputDir, { recursive: true });
  const plans = [];
  for (let offset = 0, batchNumber = 1; offset < manifest.rows.length; offset += BATCH_SIZE, batchNumber += 1) {
    const rows = manifest.rows.slice(offset, offset + BATCH_SIZE);
    const plan = planFor(batchNumber, rows);
    const filename = `${plan.planId}.json`;
    writeFileSync(resolve(outputDir, filename), `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
    plans.push({ planId: plan.planId, filename, rowCount: rows.length, firstRowId: rows[0].id, lastRowId: rows.at(-1).id });
  }
  const index = { schemaVersion: 2, generatedBy: 'console/scripts/generate-lowlevel-smoke-plans.mjs', sourceManifest: 'console/inventories/ui-smoke/interaction-manifest.json', inventoryDigest: manifest.inventoryDigest, batchSize: BATCH_SIZE, rowCount: manifest.rows.length, batchCount: plans.length, route: 'cheap-lowlevel-headless-cdp-and-lifecycle-only', rawRunRootNotCommitted: true, status: 'planned-no-runtime-actions-performed', plans };
  writeFileSync(resolve(outputDir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`, 'utf8');
  return index;
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/generate-lowlevel-smoke-plans.mjs')) { const result = generatePlans(); console.log(`wrote ${result.batchCount} plans for ${result.rowCount} rows`); }
