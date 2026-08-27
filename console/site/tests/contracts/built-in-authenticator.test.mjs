/**
 * Contract: built-in-authenticator. The honest state is "absent" -- no
 * TOTP/authenticator surface, QR generation, or code display exists in
 * site/app.js.
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

test('the site feature registry carries a row for built-in-authenticator', () => {
  assert.ok(registry.features['built-in-authenticator'], 'no built-in-authenticator row in site/feature-registry.json');
});

test('no TOTP, authenticator, or pairing-URI logic exists anywhere in app.js', () => {
  assert.doesNotMatch(app, /totp|authenticator|otpauth:\/\//iu, 'a TOTP/authenticator surface now exists in app.js -- the "absent" state needs re-checking');
});

test('the registry records built-in-authenticator as absent, and the code agrees', () => {
  assert.equal(registry.features['built-in-authenticator'].status, 'absent',
    'no TOTP/authenticator surface, QR generation, or code display exists in site/app.js -- "absent" is the honest state');
});
