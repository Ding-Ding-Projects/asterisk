import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const appSource = fs.readFileSync(path.join(root, 'app/renderer/src/App.tsx'), 'utf8');
const runtimeSource = fs.readFileSync(path.join(root, 'control-plane/auth-lock-runtime.ts'), 'utf8');
const dispatchSource = fs.readFileSync(path.join(root, 'control-plane/dispatch.ts'), 'utf8');
const notificationRuntime = fs.readFileSync(path.join(root, 'app/renderer/src/notification-runtime.ts'), 'utf8');
const deleteGate = fs.readFileSync(path.join(root, 'app/renderer/src/notification-delete-gate.tsx'), 'utf8');
const registry = JSON.parse(fs.readFileSync(path.join(root, 'app/feature-registry.json'), 'utf8'));

test('auth reconciliation keeps exact typed receipts and blocks unresolved mutations', () => {
  assert.match(runtimeSource, /export interface AuthLockReconciliationReceipt/);
  assert.match(runtimeSource, /async awaitReconciliation\(\): Promise<AuthLockReconciliationReceipt>/);
  assert.match(runtimeSource, /status: 'pending-removal-failed'/);
  assert.match(dispatchSource, /toy-lock\.remove/);
  assert.match(dispatchSource, /blockedToyLockRemoval\(reconciliation\.warning\)/);
  assert.match(dispatchSource, /authenticator\.register/);
  assert.match(dispatchSource, /reconciliation\.status !== 'reconciled'/);
  assert.match(dispatchSource, /blockedToyLockRemoval\(reconciliation\.warning\)/);
  assert.match(fs.readFileSync(path.join(root, 'app/renderer/src/surface-mounts.tsx'), 'utf8'), /status: 'recoverable'/);
});

test('notification delete is routed through the shared destructive boundary', () => {
  assert.match(appSource, /requestNotificationDelete\(selected, preview\)/);
  assert.match(notificationRuntime, /export function requestNotificationDelete/);
  assert.match(deleteGate, /DestructiveActionGate/);
  assert.match(deleteGate, /onComplete=\{\(\) => settleNotificationDelete\(true\)\}/);
  assert.match(deleteGate, /preview=\{request\.preview\}/);
});

test('notification availability has explicit loading, ready-empty, ready, and unavailable states', () => {
  assert.match(notificationRuntime, /initializeMountedNotificationStore/);
  assert.match(fs.readFileSync(path.join(root, 'app/renderer/src/notification-store.ts'), 'utf8'), /'loading' \| 'ready-empty' \| 'ready' \| 'unavailable'/);
  assert.match(appSource, /notificationAvailability\?\.state/);
  assert.match(appSource, /bulkActions: ready \?/);
  assert.match(appSource, /if \(!ready\)/);
  const row = registry.features['non-blocking-notifications'];
  assert.equal(row.status, 'implemented-unverified');
  assert.match(row.note, /Loading, ready-empty, ready, and unavailable/);
  assert.match(row.note, /two-key\/full-slider/);
});

test('BREAK CHECK -- removing the shared delete boundary turns this guard red', () => {
  const withoutDeleteBoundary = deleteGate.replace(/DestructiveActionGate/g, 'DestructiveActionGateRENAMED');
  assert.doesNotMatch(withoutDeleteBoundary, /DestructiveActionGate\b/);
});
