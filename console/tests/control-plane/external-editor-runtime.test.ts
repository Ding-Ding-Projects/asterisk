import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtempSync, existsSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { ExternalEditorRuntime } from '../../control-plane/external-editor-runtime.js';

test('materialization failure returns a typed result and removes the local file', async () => {
  const root = mkdtempSync(join(tmpdir(), 'external-editor-runtime-'));
  try {
    const runtime = new ExternalEditorRuntime({ userDataPath: root });
    const result = await runtime.openMaterializedFile({ name: 'failed.json', content: '{}', source: 'test', editorId: 'missing' });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error('Expected materialization failure');
    assert.equal(result.operationId.length > 0, true);
    assert.equal(result.stage, 'materialization');
    assert.equal(existsSync(join(root, 'external-editor-exports', 'failed.json')), false);
    assert.equal(runtime.status().operation?.state, 'failed');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('active launch cancellation kills the child and returns a typed cancelled receipt', async () => {
  const root = mkdtempSync(join(tmpdir(), 'external-editor-runtime-'));
  const target = join(root, 'target.txt');
  writeFileSync(target, 'target');
  let killed = false;
  const fakeSpawn = (() => {
    const child = new EventEmitter() as EventEmitter & { kill(): void; unref(): void; pid?: number };
    child.kill = () => { killed = true; };
    child.unref = () => {};
    child.pid = 1234;
    return child;
  }) as unknown as typeof import('node:child_process').spawn;
  try {
    const runtime = new ExternalEditorRuntime({ userDataPath: root, spawnProcess: fakeSpawn });
    const editor = await runtime.saveCustom({ name: 'Fake editor', executable: process.execPath });
    const launch = runtime.launch({ kind: 'file', path: target }, editor.selectedId);
    const operationId = runtime.status().operation?.operationId;
    assert.ok(operationId);
    const status = runtime.cancelOperation(operationId);
    assert.equal(status.operation?.state, 'cancelled');
    assert.equal(killed, true);
    const result = await launch;
    assert.equal(result.ok, false);
    if (result.ok) throw new Error('Expected launch cancellation');
    assert.equal(result.code, 'LAUNCH_CANCELLED');
    assert.equal(result.cancelled, true);
    assert.equal(result.operationId, operationId);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('synchronous spawn failure returns a typed failure and removes its materialization', async () => {
  const root = mkdtempSync(join(tmpdir(), 'external-editor-runtime-'));
  const throwingSpawn = (() => { throw new Error('synchronous spawn failure'); }) as unknown as typeof import('node:child_process').spawn;
  try {
    const runtime = new ExternalEditorRuntime({ userDataPath: root, spawnProcess: throwingSpawn });
    const editor = await runtime.saveCustom({ name: 'Throwing editor', executable: process.execPath });
    const result = await runtime.openMaterializedFile({ name: 'sync-failure.json', content: '{}', source: 'test', editorId: editor.selectedId });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error('Expected synchronous spawn failure');
    assert.equal(result.code, 'SPAWN_FAILED');
    assert.equal(result.stage, 'materialization');
    assert.equal(runtime.status().operation?.state, 'failed');
    assert.equal(existsSync(join(root, 'external-editor-exports', 'sync-failure.json')), false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('picker operation status, busy refusal, and cancellation share one runtime contract', () => {
  const root = mkdtempSync(join(tmpdir(), 'external-editor-runtime-'));
  try {
    const runtime = new ExternalEditorRuntime({ userDataPath: root });
    const operation = runtime.beginPicker('pick-folder');
    assert.ok(operation);
    assert.equal(runtime.status().operation?.operationId, operation.operationId);
    assert.equal(runtime.status().operation?.pending, true);
    assert.equal(runtime.beginPicker('pick-executable'), undefined);
    const cancelledStatus = runtime.cancelOperation(operation.operationId);
    assert.equal(cancelledStatus.operation?.state, 'cancelled');
    assert.equal(cancelledStatus.operation?.pending, true);
    const receipt = runtime.completePicker(operation.operationId, 'pick-folder', undefined, true);
    assert.equal(receipt.reason, 'programmatic-cancelled');
    assert.equal(receipt.canceled, true);
    assert.equal(receipt.operation.pending, false);
    assert.equal(runtime.status().operation?.pending, false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
