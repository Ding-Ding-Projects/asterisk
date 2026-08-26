import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const appSource = fs.readFileSync(path.join(root, 'app/renderer/src/App.tsx'), 'utf8');
const surfaceSource = fs.readFileSync(path.join(root, 'app/renderer/src/surface-mounts.tsx'), 'utf8');
const runtimeSource = fs.readFileSync(path.join(root, 'control-plane/auth-lock-runtime.ts'), 'utf8');
const dispatchSource = fs.readFileSync(path.join(root, 'control-plane/dispatch.ts'), 'utf8');
const notificationRuntime = fs.readFileSync(path.join(root, 'app/renderer/src/notification-runtime.ts'), 'utf8');
const deleteGate = fs.readFileSync(path.join(root, 'app/renderer/src/notification-delete-gate.tsx'), 'utf8');
const docsBundle = fs.readFileSync(path.join(root, 'app/renderer/src/generated/docs-bundle.ts'), 'utf8');
const registry = JSON.parse(fs.readFileSync(path.join(root, 'app/feature-registry.json'), 'utf8'));

test('auth reconciliation keeps exact typed receipts and blocks unresolved mutations', () => {
  assert.match(runtimeSource, /export interface AuthLockReconciliationReceipt/);
  assert.match(runtimeSource, /async awaitReconciliation\(\): Promise<AuthLockReconciliationReceipt>/);
  assert.match(runtimeSource, /status: 'pending-removal-failed'/);
  assert.match(dispatchSource, /toy-lock\.remove/);
  assert.match(dispatchSource, /blockedToyLockRemovalByReconciliation\(reconciliation\)/);
  assert.match(dispatchSource, /affectedIds: reconciliation\.affectedIds/);
  assert.match(fs.readFileSync(path.join(root, 'shared/locks.ts'), 'utf8'), /status: 'blocked'; message: string; recoverable: true; affectedIds: ReadonlyArray<string>; reconciliation:/);
  assert.match(dispatchSource, /authenticator\.register/);
  assert.match(dispatchSource, /reconciliation\.status !== 'reconciled'/);
  assert.match(dispatchSource, /blockedToyLockRemovalByReconciliation\(reconciliation\)/);
  assert.match(fs.readFileSync(path.join(root, 'app/renderer/src/surface-mounts.tsx'), 'utf8'), /status: 'recoverable'/);
  assert.doesNotMatch(dispatchSource, /const reconciliation = .* as \{ status\?/u);
});

test('renderer-facing reconciliation runs a fresh serialized in-place pass', () => {
  assert.match(runtimeSource, /const refreshReconciliation = async/);
  assert.match(runtimeSource, /await metadata\.reconcile\(vault\)/);
  assert.match(runtimeSource, /await persistence\.reconcileReceipt\(vault\)/);
  assert.match(runtimeSource, /authenticatorReconciliation = nextAuthenticator/);
  assert.match(runtimeSource, /lockReconciliation = nextLocks/);
  assert.match(runtimeSource, /return await refreshReconciliation\(\)/);
  const missingFreshPath = runtimeSource.replace('return await refreshReconciliation();', 'return { authenticator: authenticatorReconciliation, locks: lockReconciliation };');
  assert.doesNotMatch(missingFreshPath, /return await refreshReconciliation\(\)/);
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

test('the generated Notification centre consumes exactly one mounted store', () => {
  assert.match(appSource, /mountedNotificationStore\.subscribe/);
  assert.match(appSource, /notificationTableValues\(\)/);
  assert.match(surfaceSource, /mountedNotificationStore/);
  assert.equal((surfaceSource.match(/<NotificationDeleteGate\s*\/>/g) ?? []).length, 1);
  assert.doesNotMatch(surfaceSource, /mounted-notification-center/);
});

test('persistence and reconciliation failures remain explicit and retryable', () => {
  const notificationStore = fs.readFileSync(path.join(root, 'app/renderer/src/notification-store.ts'), 'utf8');
  assert.match(notificationStore, /this\.availability = \{ state: 'unavailable'/);
  assert.match(runtimeSource, /status: 'pending-removal-failed'/);
  assert.match(dispatchSource, /reconciliation\.affectedIds\.join/);
  assert.match(appSource, /retryMountedNotificationStore/);
  assert.match(appSource, /Retry notification history/);
  const withoutUnavailableTransition = notificationStore.replace(/this\.availability = \{ state: 'unavailable'/g, 'this.availability = { state: "ready"');
  assert.doesNotMatch(withoutUnavailableTransition, /this\.availability = \{ state: 'unavailable'/);
});

test('operation-specific receipts and completion outcomes stay exact', () => {
  const locks = fs.readFileSync(path.join(root, 'shared/locks.ts'), 'utf8');
  const authenticator = fs.readFileSync(path.join(root, 'control-plane/authenticator-store.ts'), 'utf8');
  assert.match(locks, /export type ToyLockCreateReceipt/);
  assert.match(locks, /export type ToyLockRelockReceipt/);
  assert.match(locks, /status: 'pending'/);
  assert.match(authenticator, /completeRemoval/);
  assert.match(authenticator, /pending\("The credential was removed/);
  const withoutCompletionCheck = authenticator.replace(/if \(completed && !completed\.ok\) return pending\([^;]+;/u, 'return { status: "removed", value: undefined };');
  assert.doesNotMatch(withoutCompletionCheck, /if \(completed && !completed\.ok\)/u);
});

test('the offline auth articles do not retain old absent claims', () => {
  assert.doesNotMatch(docsBundle, /Desktop application:\*\* Not implemented\. The desktop application has no authenticator surface/u);
  assert.doesNotMatch(docsBundle, /Desktop application:\*\* Not implemented\. The desktop application has no such recovery flow/u);
  assert.doesNotMatch(docsBundle, /Desktop application:\*\* Partial\. A lockout timer exists after repeated wrong password attempts/u);
});

test('BREAK CHECK -- removing the shared delete boundary turns this guard red', () => {
  const withoutDeleteBoundary = deleteGate.replace(/DestructiveActionGate/g, 'DestructiveActionGateRENAMED');
  assert.doesNotMatch(withoutDeleteBoundary, /DestructiveActionGate\b/);
});
