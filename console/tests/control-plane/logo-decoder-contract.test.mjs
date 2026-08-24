import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const decoder = await readFile(new URL('../../control-plane/logo-decoder.ts', import.meta.url), 'utf8');
const worker = await readFile(new URL('../../control-plane/logo-decoder-worker.mjs', import.meta.url), 'utf8');
const launcher = await readFile(new URL('../../control-plane/logo-worker-job.ps1', import.meta.url), 'utf8');
const recovery = await readFile(new URL('../../control-plane/logo-worker-recovery.ps1', import.meta.url), 'utf8');

function hasStartupOrder(source) {
  const pid = source.indexOf("const pidMatch = /^WORKER_PID:(\\d+)$/u.exec(line);");
  const readyBeforePid = source.indexOf("line === 'READY'", 0);
  const strictReady = source.indexOf("The isolated decoder emitted READY before WORKER_PID.");
  return pid >= 0 && readyBeforePid > pid && strictReady > pid;
}

function hasCompleteReceipt(source) {
  return source.includes("receipt.type === 'RECOVERY_COMPLETE'")
    && source.includes('receipt.recoveryNonce === recoveryRecord.recoveryNonce')
    && source.includes('receipt.workerExitObserved === true')
    && source.includes('receipt.aclRestored === true')
    && source.includes('receipt.profileDeleted === true')
    && source.includes('receipt.recordRemoved === true')
    && source.includes('receipt.noOrphan === true');
}

test('startup protocol requires PID before START and READY', () => {
  assert.equal(hasStartupOrder(decoder), true);
  assert.equal(hasStartupOrder(decoder.replace("The isolated decoder emitted READY before WORKER_PID.", 'removed')), false);
  assert.match(worker, /line !== 'START'/u);
  assert.match(worker, /process\.stdout\.write\('READY\\n'\)/u);
});

test('supervisor cleanup uses cooperative cancellation and no blind process kill', () => {
  assert.doesNotMatch(recovery, /Stop-Process/u);
  assert.match(launcher, /CancelRequested\(recoveryPath,recoveryNonce\)/u);
  assert.match(recovery, /LogoWorkerRecoveryProfile\]::Terminate\(\$supervisorPid\)/u);
  assert.match(recovery, /The recorded supervisor identity does not match/u);
});

test('recovery requires a nonce-bound terminal receipt with no orphan proof', () => {
  assert.equal(hasCompleteReceipt(decoder), true);
  assert.equal(hasCompleteReceipt(decoder.replace("receipt.noOrphan === true", 'removed')), false);
  assert.match(recovery, /type = 'RECOVERY_COMPLETE'/u);
  assert.match(recovery, /noOrphan = .*supervisorPid/u);
});

test('helper identity is recorded, hashed, and checked before recovery', () => {
  assert.match(launcher, /recoveryScriptPath = \[IO\.Path\]::GetFullPath\(\$RecoveryScriptPath\)/u);
  assert.match(launcher, /recoveryScriptHash = \$recoveryHash/u);
  assert.match(recovery, /recoveryScriptPath/u);
  assert.match(recovery, /Get-FileDigest \$PSCommandPath/u);
  assert.match(decoder, /manifest\.recoverySha256 !== recoveryDigest/u);
  assert.equal(decoder.includes('manifest.recoverySha256 !== recoveryDigest'), true);
  assert.equal(decoder.replaceAll('manifest.recoverySha256 !== recoveryDigest', 'removed').includes('manifest.recoverySha256 !== recoveryDigest'), false);
});
