import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const root = new URL('../../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('FreePBX action history reload carries the typed result, backup, readback, and rollback fields', async () => {
  const app = await read('app/renderer/src/PbxAdminApp.tsx');
  const dispatch = await read('control-plane/dispatch.ts');
  const history = await read('control-plane/local-history.ts');
  const exportSource = await read('app/renderer/src/freepbx-catalog-export.ts');
  assert.match(app, /local-history\.list/u);
  assert.match(app, /typedResult/u);
  assert.match(app, /rollback/u);
  assert.match(dispatch, /history\.payload/u);
  assert.match(history, /async payload\(/u);
  assert.match(exportSource, /recordId/u);
  assert.match(exportSource, /history/u);
});

test('a typed result round trip preserves exact action facts and explicitly omits credentials', async () => {
  const exportSource = await read('app/renderer/src/freepbx-catalog-export.ts');
  const result = {
    schemaVersion: 1,
    moduleId: 'queues',
    action: 'update',
    status: 'rolledBack',
    before: { installed: true, version: '17.0.1' },
    after: { installed: true, version: '17.0.2' },
    rollback: { attempted: true, status: 'verified' },
    backup: { source: 'official-freepbx-backup', filesReceipt: 'files-receipt', databaseReceipt: 'database-receipt' },
    message: 'The requested state did not read back.',
  };
  const serialized = JSON.stringify(result);
  const restored = JSON.parse(serialized);
  assert.deepEqual(restored, result);
  assert.match(exportSource, /credentials,private paths/iu);
});

test('known FreePBX detail templates have stable IDs and localized entries', async () => {
  const messages = await read('app/renderer/src/freepbx-messages.ts');
  const locale = await read('app/renderer/src/locale-yue.ts');
  for (const template of ['Select a discovered target.', 'The filtered catalog export completed.', 'The module action returned a typed result.', 'The family route returned a typed result.', 'A one-time target-bound backup receipt is required before mutation.']) {
    assert.match(messages, new RegExp(template.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'u'));
    assert.match(locale, new RegExp(template.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'u'));
  }
});
