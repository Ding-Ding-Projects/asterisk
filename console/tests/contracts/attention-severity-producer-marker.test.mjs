import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSymbols } from '../../scripts/inventory-validation.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const inventoryPath = resolve(repoRoot, 'console/app/renderer/src/attention-inventory.ts');
const appPath = resolve(repoRoot, 'console/app/renderer/src/App.tsx');
const appSource = execFileSync('git', ['show', 'HEAD:console/app/renderer/src/App.tsx'], { cwd: repoRoot, encoding: 'utf8' });
const readInventory = () => readFileSync(inventoryPath, 'utf8').replace(/\r\n|\r/g, '\n');
const markerFromInventory = (inventory) => {
  const match = /^\s*\[905,\s*12,\s*'fire',\s*'error',\s*false,\s*"([^"]+)"\],$/mu.exec(inventory);
  assert.ok(match, 'the phone-start producer must have one exact inventory tuple');
  return match[1];
};

function assertLiveMarker(inventory, source = appSource) {
  const marker = markerFromInventory(inventory);
  assert.equal(source.split(marker).length - 1, 1, 'the phone-start producer marker must have exactly one live owner');
  assert.match(source, /^\s*this\.fire\('The phone system did not start'/mu, 'the marker must bind to the live fire call');
}

test('phone-start severity producer marker is exact and live', () => {
  const inventory = readInventory();
  assertLiveMarker(inventory);
});

test('phone-start marker break turns red and restoration turns green', () => {
  const inventory = readInventory();
  const marker = markerFromInventory(inventory);
  const broken = inventory.replace(marker, "notifyEvent('The phone system did not start'");
  assert.notEqual(broken, inventory, 'the deliberate marker break was not planted');
  assert.throws(() => assertLiveMarker(broken), /exact inventory tuple|exactly one live owner/u);
  assertLiveMarker(inventory);
});

test('candidate symbol validation ignores a modified local source mutation', () => {
  const original = readFileSync(appPath, 'utf8');
  const declaration = /^\s{2}fire\(title: string, body: string, isError\?: boolean\): void;$/mu;
  assert.match(original, declaration, 'the candidate source must contain the fire declaration');
  const commented = original.replace(declaration, '  // fire(title: string, body: string, isError?: boolean): void;');
  assert.notEqual(commented, original, 'the local source mutation was not planted');
  assert.doesNotMatch(commented, declaration, 'the working-copy declaration must be commented out');
  writeFileSync(appPath, commented, 'utf8');
  try {
    assert.doesNotThrow(() => validateSymbols(
      [{ path: 'app/renderer/src/App.tsx', name: 'fire', kind: 'method' }],
      'candidate App.tsx symbols',
      repoRoot,
    ), 'validation must read the candidate Git object, not the mutated working copy');
  } finally {
    writeFileSync(appPath, original, 'utf8');
  }
});
