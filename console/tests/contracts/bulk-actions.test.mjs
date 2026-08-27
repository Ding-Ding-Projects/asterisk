import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8').replace(/\r\n/g, '\n');
const app = read('app/renderer/src/App.tsx');
const bulk = read('app/renderer/src/bulk.ts');
const generated = read('app/renderer/src/generated/console.tsx');

test('the mounted renderer imports the selection-model bulk engine', () => {
  assert.match(app, /parseBulkDeleteCeremony, planBulkAction, runBulkAction, unsupportedBulkAction,/);
  assert.match(app, /clearSelection as bulkClearSelection, createSelection, invertSelection, selectPage,/);
});

test('the bulk engine exposes typed plans, bounded execution, partial outcomes, progress, and typed undo receipts', () => {
  for (const symbol of ['planBulkAction', 'runBulkAction', 'undoBulkAction', 'BulkMutationReceipt', 'BulkItemOutcome', 'BulkUndoPlan']) {
    assert.match(bulk, new RegExp(`export (?:async )?(?:function|interface|type) ${symbol}\\b`), `${symbol} must remain exported`);
  }
  assert.match(bulk, /status: 'cancelled'/, 'cancellation must remain a typed outcome');
  assert.match(bulk, /status: 'timed-out'/, 'deadline expiry must remain a typed outcome');
  assert.match(bulk, /onProgress\?\./, 'execution must report bounded progress');
  assert.match(bulk, /inverseToken\?: string;/, 'receipts must keep an inverse token when available');
  assert.match(bulk, /historyRevision\?: string;/, 'receipts must keep a history revision when available');
});

test('the mounted bulk method plans exact selected ids, leaves unsupported write verbs honestly unavailable, and executes the real engine', () => {
  assert.match(app, /const selection = \{ \.\.\.createSelection\(context\), selectedIds: new Set\(sel\) \};/);
  assert.match(app, /const plan = planBulkAction\(action, collection, selection\);/);
  assert.match(app, /unsupportedBulkAction\(verb\.toLowerCase\(\), verb, `Bulk \$\{verb\.toLowerCase\(\)\} is unavailable because this table has no verified write executor\.`/);
  assert.match(app, /const result = await runBulkAction\(plan, \{ concurrency: 1 \}\);/);
  assert.match(app, /result\.counts\.exported} completed; \$\{result\.counts\.skipped} skipped; \$\{result\.counts\.failed} failed/);
});

test('compiled export and delete affordances are intercepted into the canonical bulk method', () => {
  assert.match(generated, /hostAction\('export-json', \{ subject:'selection', name:'selection', data:sel \}\)/);
  assert.match(generated, /this\.ceremony\('Delete ' \+ sel\.length \+ ' objects', 'delete ' \+ sel\.join\(' '\)\)/);
  assert.match(app, /kind === 'export-json' && payload\.subject === 'selection'/);
  assert.match(app, /this\.bulk\('Exported', Array\.isArray\(payload\.data\)/);
  assert.match(app, /const bulkDeleteIds = parseBulkDeleteCeremony\(title, command\);/);
  assert.match(app, /this\.bulk\('Deleted', bulkDeleteIds\);/);
});

test('negative regression: removing the real executor call makes this contract red', () => {
  const removed = app.replace(/const result = await runBulkAction\(plan, \{ concurrency: 1 \}\);/, 'const result = undefined;');
  assert.doesNotMatch(removed, /const result = await runBulkAction\(plan, \{ concurrency: 1 \}\);/);
});
