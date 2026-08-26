import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { createAuthLockRuntime, type AuthLockVault } from '../../control-plane/auth-lock-runtime.js';
import type { ProcessExecutor } from '../../control-plane/executor.js';

class MutableVault implements AuthLockVault {
  available = false;
  readonly removed: string[] = [];
  failRemovals = false;
  async setSecret() { return { ok: true as const, value: undefined }; }
  async getSecret() { return { ok: false as const, code: 'vault-unavailable' as const, message: 'unavailable' }; }
  async deleteSecret() { return { ok: true as const, value: undefined }; }
  async has() { return true; }
  async verify() { return false; }
  async remove(reference: { vaultAccount: string }) { if (this.failRemovals) return false; this.removed.push(reference.vaultAccount); return true; }
}

const executor: ProcessExecutor = { async execute() { return { status: 'succeeded', exitCode: 0, stdout: '', stderr: '', durationMs: 0 }; } };
const recovery = { applicationDataPath: 'C:/test-data', supportTicketRoute: '#surface=support-tickets', deletesAutomatically: false as const, disclosure: 'Test recovery.' };

async function withRuntime(run: (runtime: ReturnType<typeof createAuthLockRuntime>, vault: MutableVault, directory: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'ding-auth-reconcile-'));
  const vault = new MutableVault();
  await writeFile(join(directory, 'authenticator-records.json'), JSON.stringify({ version: 1, entries: [{ id: 'auth-pending', issuer: 'Ding', account: 'auth', parameters: { algorithm: 'SHA-1', digits: 6, period: 30 }, armed: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', credentialReference: 'vault/auth-pending' }], pendingRemovals: [{ id: 'auth-pending', credential: { vaultAccount: 'vault/auth-pending', method: 'totp' } }], tombstones: [] }));
  await writeFile(join(directory, 'toy-locks.json'), JSON.stringify({ version: 1, records: [{ schemaVersion: 1, id: 'lock-pending', targetId: 'target', credential: { vaultAccount: 'vault/lock-pending', method: 'password' }, unlockDuration: { kind: 'surface' }, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }], pendingRemovals: [{ id: 'lock-pending', credential: { vaultAccount: 'vault/lock-pending', method: 'password' } }], tombstones: [] }));
  try { await run(createAuthLockRuntime({ userDataPath: directory, vault, executor, recovery }), vault, directory); } finally { await rm(directory, { recursive: true, force: true }); }
}

test('renderer-facing reconciliation retry refreshes both receipts after vault recovery without recreating runtime', async () => {
  await withRuntime(async (runtime, vault, directory) => {
    const unavailable = await runtime.awaitReconciliation();
    assert.equal(unavailable.authenticator.status, 'pending-vault-unavailable');
    assert.equal(unavailable.locks.status, 'pending-vault-unavailable');
    assert.deepEqual(unavailable.authenticator.affectedIds, ['auth-pending']);
    assert.deepEqual(unavailable.locks.affectedIds, ['lock-pending']);

    vault.available = true;
    const reconciled = await runtime.awaitReconciliation();
    assert.equal(reconciled.authenticator.status, 'reconciled');
    assert.equal(reconciled.locks.status, 'reconciled');
    assert.deepEqual(reconciled.authenticator.affectedIds, ['auth-pending']);
    assert.deepEqual(reconciled.locks.affectedIds, ['lock-pending']);
    assert.deepEqual(vault.removed.sort(), ['vault/auth-pending', 'vault/lock-pending']);
    const authenticatorState = JSON.parse(await readFile(join(directory, 'authenticator-records.json'), 'utf8'));
    const lockState = JSON.parse(await readFile(join(directory, 'toy-locks.json'), 'utf8'));
    assert.deepEqual(authenticatorState.pendingRemovals, []);
    assert.deepEqual(lockState.pendingRemovals, []);
  });
});

test('concurrent retries serialize, retain failures, and expose structured blocked lock identities', async () => {
  await withRuntime(async (runtime, vault) => {
    vault.available = true;
    vault.failRemovals = true;
    const [first, second] = await Promise.all([runtime.awaitReconciliation(), runtime.awaitReconciliation()]);
    assert.equal(first.authenticator.status, 'pending-removal-failed');
    assert.equal(second.locks.status, 'pending-removal-failed');
    assert.deepEqual(first.authenticator.affectedIds, ['auth-pending']);
    assert.deepEqual(second.locks.affectedIds, ['lock-pending']);
  });
});
