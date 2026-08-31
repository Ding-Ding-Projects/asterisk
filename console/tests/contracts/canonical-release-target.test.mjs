import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const read = path => readFileSync(resolve(root, path), 'utf8').replace(/\r\n/gu, '\n');
const retiredTarget = 'Ding-Ding-Projects/asterisk';
const canonicalTarget = 'Ding-Ding-Projects/material-asterisk';

test('live updater and deploy service point to the maintained canonical Oak Kay', () => {
  const updater = read('app/electron/updater-runtime.ts');
  const service = read('server/deploy/ding-pbx-console.service');
  for (const source of [updater, service]) {
    assert.doesNotMatch(source, new RegExp(retiredTarget.replace('/', '\\/'), 'u'));
    assert.match(source, new RegExp(canonicalTarget.replace('/', '\\/'), 'u'));
  }
  assert.match(updater, /api\.github\.com\/repos\/Ding-Ding-Projects\/material-asterisk\/releases/u);
  assert.match(service, /Documentation=https:\/\/github\.com\/Ding-Ding-Projects\/material-asterisk/u);
});
