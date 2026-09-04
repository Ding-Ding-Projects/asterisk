import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const consoleRoot = fileURLToPath(new URL('../..', import.meta.url));

test('the isolated logo worker is emitted and included by the packaged Electron file set', () => {
  const tsconfig = JSON.parse(readFileSync(resolve(consoleRoot, 'app/electron/tsconfig.json'), 'utf8')) as { compilerOptions?: { allowJs?: boolean }; include?: string[] };
  assert.equal(tsconfig.compilerOptions?.allowJs, true);
  assert.ok(tsconfig.include?.includes('../../control-plane/**/*.js'));
  assert.equal(existsSync(resolve(consoleRoot, 'control-plane/logo-decoder-worker.js')), true);
  const builder = readFileSync(resolve(consoleRoot, 'electron-builder.yml'), 'utf8');
  assert.match(builder, /- dist-electron\/\*\*\//u);
});
