import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtempSync, existsSync, readFileSync, readdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { ExternalEditorRuntime } from '../../control-plane/external-editor-runtime.js';

function acknowledgedSpawn(): typeof import('node:child_process').spawn {
  return (() => {
    const child = new EventEmitter() as EventEmitter & { kill(): void; unref(): void; pid?: number };
    child.kill = () => {};
    child.unref = () => {};
    child.pid = 4321;
    queueMicrotask(() => child.emit('spawn'));
    return child;
  }) as unknown as typeof import('node:child_process').spawn;
}

test('materialization failure returns a typed result and removes the local file', async () => {
  const root = mkdtempSync(join(tmpdir(), 'external-editor-runtime-'));
  try {
    const runtime = new ExternalEditorRuntime({ userDataPath: root });
    const result = await runtime.openMaterializedFile({ name: 'failed.json', content: '{}', source: 'test', editorId: 'missing' });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error('Expected materialization failure');
    assert.equal(result.operationId.length > 0, true);
    assert.equal(result.stage, 'materialization');
    assert.equal(existsSync(join(root, 'external-editor-exports')), true);
    assert.deepEqual(readdirSync(join(root, 'external-editor-exports')), []);
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
    assert.deepEqual(readdirSync(join(root, 'external-editor-exports')), []);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('completed same-name materializations keep immutable operation-scoped paths and contents', async () => {
  const root = mkdtempSync(join(tmpdir(), 'external-editor-runtime-'));
  try {
    const runtime = new ExternalEditorRuntime({ userDataPath: root, spawnProcess: acknowledgedSpawn() });
    const editor = runtime.saveCustom({ name: 'Acknowledged editor', executable: process.execPath });
    const first = await runtime.openMaterializedFile({ name: 'status.json', content: '{"generation":1}', source: 'first', editorId: editor.selectedId });
    const second = await runtime.openMaterializedFile({ name: 'status.json', content: '{"generation":2}', source: 'second', editorId: editor.selectedId });
    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    if (!first.ok || !second.ok) throw new Error('Expected acknowledged materializations');
    assert.notEqual(first.materializedPath, second.materializedPath);
    assert.match(first.materializedPath!, new RegExp(`${first.operationId.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}[\\\\/]status[.]json$`, 'u'));
    assert.match(second.materializedPath!, new RegExp(`${second.operationId.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}[\\\\/]status[.]json$`, 'u'));
    assert.equal(readFileSync(first.materializedPath!, 'utf8'), '{"generation":1}');
    assert.equal(readFileSync(second.materializedPath!, 'utf8'), '{"generation":2}');
    assert.equal(first.progress.state, 'completed');
    assert.equal(second.progress.state, 'completed');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('concurrent materialization start is refused until the acknowledged handoff completes', async () => {
  const root = mkdtempSync(join(tmpdir(), 'external-editor-runtime-'));
  let child: (EventEmitter & { kill(): void; unref(): void; pid?: number }) | undefined;
  const deferredSpawn = (() => {
    child = new EventEmitter() as EventEmitter & { kill(): void; unref(): void; pid?: number };
    child.kill = () => {};
    child.unref = () => {};
    child.pid = 9876;
    return child;
  }) as unknown as typeof import('node:child_process').spawn;
  try {
    const runtime = new ExternalEditorRuntime({ userDataPath: root, spawnProcess: deferredSpawn });
    const editor = runtime.saveCustom({ name: 'Deferred editor', executable: process.execPath });
    const pending = runtime.openMaterializedFile({ name: 'one.json', content: 'one', source: 'first', editorId: editor.selectedId });
    const busy = await runtime.openMaterializedFile({ name: 'two.json', content: 'two', source: 'second', editorId: editor.selectedId });
    assert.equal(busy.ok, false);
    if (busy.ok) throw new Error('Expected busy materialization');
    assert.equal(busy.code, 'BUSY');
    child!.emit('spawn');
    const completed = await pending;
    assert.equal(completed.ok, true);
    if (!completed.ok) throw new Error('Expected acknowledged materialization');
    assert.equal(completed.pid, 9876);
    assert.equal(completed.progress.state, 'completed');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('retention bounds completed operation directories without touching the newest receipt path', async () => {
  const root = mkdtempSync(join(tmpdir(), 'external-editor-runtime-'));
  try {
    const runtime = new ExternalEditorRuntime({ userDataPath: root, spawnProcess: acknowledgedSpawn() });
    const editor = runtime.saveCustom({ name: 'Retention editor', executable: process.execPath });
    let newest: string | undefined;
    for (let index = 0; index < 33; index += 1) {
      const result = await runtime.openMaterializedFile({ name: 'retained.json', content: String(index), source: 'retention', editorId: editor.selectedId });
      assert.equal(result.ok, true);
      if (result.ok) newest = result.materializedPath;
    }
    const exportRoot = join(root, 'external-editor-exports');
    assert.equal(readdirSync(exportRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).length, 32);
    assert.ok(newest);
    assert.equal(existsSync(newest!), true);
    assert.equal(readFileSync(newest!, 'utf8'), '32');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('materialization cancellation and traversal names only clean the task-owned operation directory', async () => {
  const root = mkdtempSync(join(tmpdir(), 'external-editor-runtime-'));
  let killed = false;
  const pendingSpawn = (() => {
    const child = new EventEmitter() as EventEmitter & { kill(): void; unref(): void; pid?: number };
    child.kill = () => { killed = true; };
    child.unref = () => {};
    child.pid = 741;
    return child;
  }) as unknown as typeof import('node:child_process').spawn;
  try {
    const runtime = new ExternalEditorRuntime({ userDataPath: root, spawnProcess: pendingSpawn });
    const editor = runtime.saveCustom({ name: 'Cancellable editor', executable: process.execPath });
    const pending = runtime.openMaterializedFile({ name: '../../escape.json', content: 'safe', source: 'cancel', editorId: editor.selectedId });
    const operationId = runtime.status().operation?.operationId;
    assert.ok(operationId);
    runtime.cancelOperation(operationId!);
    const result = await pending;
    assert.equal(killed, true);
    assert.equal(result.ok, false);
    if (result.ok) throw new Error('Expected cancellation');
    assert.equal(result.code, 'MATERIALIZATION_CANCELLED');
    assert.equal(existsSync(join(root, 'escape.json')), false);
    assert.deepEqual(readdirSync(join(root, 'external-editor-exports')), []);
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

test('empty file and folder targets cancel before normalization or child start', async () => {
  const root = mkdtempSync(join(tmpdir(), 'external-editor-runtime-'));
  let spawnCalls = 0;
  const forbiddenSpawn = (() => { spawnCalls += 1; throw new Error('child start should not happen'); }) as unknown as typeof import('node:child_process').spawn;
  try {
    const runtime = new ExternalEditorRuntime({ userDataPath: root, spawnProcess: forbiddenSpawn });
    const editor = await runtime.saveCustom({ name: 'No-start editor', executable: process.execPath });
    const fileResult = await runtime.launch({ kind: 'file', path: '   ' }, editor.selectedId);
    const folderResult = await runtime.launch({ kind: 'folder', path: '' }, editor.selectedId);
    assert.equal(fileResult.ok, false);
    assert.equal(folderResult.ok, false);
    if (fileResult.ok || folderResult.ok) throw new Error('Expected empty targets to cancel');
    assert.equal(fileResult.code, 'LAUNCH_CANCELLED');
    assert.equal(folderResult.code, 'LAUNCH_CANCELLED');
    assert.equal(spawnCalls, 0);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('inaccessible persistence and materialization parents end with failed, non-running operations', async () => {
  const root = mkdtempSync(join(tmpdir(), 'external-editor-runtime-'));
  const blocker = join(root, 'blocked-parent');
  writeFileSync(blocker, 'not a directory');
  try {
    const runtime = new ExternalEditorRuntime({ userDataPath: blocker });
    const saveStatus = await runtime.saveCustom({ name: 'Blocked editor', executable: process.execPath });
    assert.equal(saveStatus.operation?.state, 'failed');
    assert.equal(saveStatus.operation?.pending, false);
    assert.equal(runtime.status().operation?.state, 'failed');
    assert.equal(runtime.status().operation?.pending, false);
    const result = await runtime.openMaterializedFile({ name: 'blocked.json', content: '{}', source: 'test', editorId: 'missing' });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error('Expected inaccessible materialization parent failure');
    assert.equal(result.stage, 'materialization');
    assert.equal(runtime.status().operation?.state, 'failed');
    assert.equal(runtime.status().operation?.pending, false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
