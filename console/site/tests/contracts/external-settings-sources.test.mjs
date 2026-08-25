/**
 * Contract: external-settings-sources. The honest state is "absent" -- no
 * HTTPS API integration and no Home Assistant integration exist anywhere in
 * site/app.js. This is the same underlying gap as scheduled-settings.md
 * (there is no scheduling surface for an external source to feed into
 * anyway), stated here as its own row because the contract names it
 * separately.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(siteRoot, p), 'utf8').replaceAll('\r\n', '\n');
const json = (p) => JSON.parse(read(p));

const app = read('app.js');
const registry = json('feature-registry.json');

test('the site feature registry carries a row for external-settings-sources', () => {
  assert.ok(registry.features['external-settings-sources'], 'no external-settings-sources row in site/feature-registry.json');
});

test('there is zero network fetch anywhere in app.js -- no HTTPS API source could exist without one', () => {
  assert.doesNotMatch(app, /\bfetch\(/u, 'app.js now calls fetch(...) -- an external HTTPS settings source may have been added');
});

test('no Home Assistant integration (binary_sensor, input_boolean, access token) exists anywhere', () => {
  assert.doesNotMatch(app, /home.?assistant|binary_sensor|input_boolean/iu,
    'a Home Assistant integration now exists -- the "absent" state needs re-checking');
});

test('the registry records external-settings-sources as absent, and the code agrees', () => {
  assert.equal(registry.features['external-settings-sources'].state, 'absent',
    'no HTTPS API or Home Assistant integration exists anywhere in site/app.js -- "absent" is the honest state');
});
