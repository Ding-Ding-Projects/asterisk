/**
 * Contract: browser-extension-download-surfaces. The honest state is
 * "absent" -- this is a static documentation/marketing site, not a browser
 * extension. There is no manifest.json, no Start-download dialog, and no
 * Downloading/complete dialog surface anywhere in the site.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(siteRoot, p), 'utf8').replaceAll('\r\n', '\n');
const json = (p) => JSON.parse(read(p));

const app = read('app.js');
const registry = json('feature-registry.json');

test('the site feature registry carries a row for browser-extension-download-surfaces', () => {
  assert.ok(registry.features['browser-extension-download-surfaces'], 'no browser-extension-download-surfaces row in site/feature-registry.json');
});

test('the site has no browser-extension manifest.json', () => {
  assert.equal(existsSync(resolve(siteRoot, 'manifest.json')), false, 'a manifest.json now exists at the site root -- the "absent" state needs re-checking');
});

test('no Start-download/Downloading/complete dialog surface exists in app.js', () => {
  assert.doesNotMatch(app, /start.?download.?dialog|downloading.?dialog/iu,
    'a Start-download or Downloading dialog surface now exists -- re-check the "absent" state');
});

test('the registry records browser-extension-download-surfaces as absent, and the code agrees', () => {
  assert.equal(registry.features['browser-extension-download-surfaces'].state, 'absent',
    'this is a static documentation/marketing site; there is no browser extension and no download-capture dialog surfaces -- "absent" is the honest state');
});
