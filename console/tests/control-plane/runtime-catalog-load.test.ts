import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { reconcileAsteriskCatalog } from '../../control-plane/asterisk-runtime-catalog.js';
import { createControlPlaneDispatcher } from '../../control-plane/dispatch.js';

const ROOT = resolve(import.meta.dirname, '..', '..');
const runtimeCatalogSource = readFileSync(resolve(ROOT, 'control-plane/asterisk-runtime-catalog.ts'), 'utf8');
const mainProcessSource = readFileSync(resolve(ROOT, 'app/electron/main.ts'), 'utf8');

test('runtime catalog, dispatcher, and Electron bridge seam load from one parseable boundary', () => {
  const catalog = reconcileAsteriskCatalog({ observedAt: '2026-08-26T00:00:00.000Z' });
  assert.equal(catalog.counts.sourceRecords, 517, 'the source-backed catalog contract changed');
  assert.ok(catalog.records.length >= 517);

  const dispatcher = createControlPlaneDispatcher({
    userDataPath: resolve(ROOT, '.test-runtime-catalog-load'),
    resourcesPath: ROOT,
    hosted: true,
  });
  assert.equal(typeof dispatcher.controlPlaneRequest, 'function');
  assert.match(mainProcessSource, /createControlPlaneDispatcher\(/u, 'the Electron main process no longer imports the real dispatcher');
  assert.match(mainProcessSource, /ipcMain\.handle\('control-plane:request'/u, 'the Electron IPC bridge no longer reaches the dispatcher');
});

test('negative regression: the malformed unescaped literal template suffix is rejected', () => {
  assert.throws(() => new RegExp('\\.{format}$', 'u'), SyntaxError, 'the malformed expression must remain a parse failure');
  assert.doesNotMatch(runtimeCatalogSource, /replace\(\/\\\.\{format\}\$\/u, ""\)/u,
    'the source reintroduced the malformed unescaped template suffix');
  assert.match(runtimeCatalogSource, /replace\(\/\\\.\\\{format\\\}\$\/u, ""\)/u,
    'the literal `{format}` suffix is not escaped exactly');
});
