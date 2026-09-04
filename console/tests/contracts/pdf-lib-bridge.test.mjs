import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const consoleRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const read = path => readFileSync(resolve(consoleRoot, path), 'utf8').replace(/\r\n/gu, '\n');

test('the Electron bridge reaches the dispatcher that supplies packaged PDF adapters', () => {
  const main = read('app/electron/main.ts');
  const dispatch = read('control-plane/dispatch.ts');
  assert.match(main, /createControlPlaneDispatcher\(/u);
  assert.match(dispatch, /new PdfLibExecutor\(\)|new PdfLibInspector\(\)/u);
  assert.match(dispatch, /converter\.pdf-execute/u);
  assert.doesNotMatch(dispatch, /process\.env\.PATH|\bwhich\(/u);
});

test('the pinned PDF See Fut is resolved from the packaged module tree, never through PATH', () => {
  const packageJson = JSON.parse(read('package.json'));
  assert.equal(packageJson.dependencies['pdf-lib'], '1.17.1');
  const registry = read('control-plane/converter-registry.ts');
  assert.match(registry, /require\.resolve\('pdf-lib'\)/u);
  assert.match(registry, /packageJson\.version !== '1\.17\.1'/u);
  assert.match(registry, /packageJson\.license !== 'MIT'/u);
  assert.doesNotMatch(registry, /process\.env\.PATH|\bwhich\(/u);
});
