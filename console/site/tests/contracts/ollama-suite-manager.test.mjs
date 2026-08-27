/**
 * Contract: ollama-suite-manager. The honest state is "absent" -- no Ollama
 * integration of any kind exists in the site.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(siteRoot, p), 'utf8').replaceAll('\r\n', '\n');
const json = (p) => JSON.parse(read(p));

const PAGES = ['index', 'product', 'documentation', 'downloads', 'status', 'settings'];
const everyPage = PAGES.map((name) => read(`${name}.html`)).join('\n');
const app = read('app.js');
const registry = json('feature-registry.json');

test('the site feature registry carries a row for ollama-suite-manager', () => {
  assert.ok(registry.features['ollama-suite-manager'], 'no ollama-suite-manager row in site/feature-registry.json');
});

test('the word "ollama" never appears anywhere in the published site or in app.js', () => {
  assert.doesNotMatch(everyPage, /ollama/iu, 'an Ollama integration now appears in the markup -- the "absent" state needs re-checking');
  assert.doesNotMatch(app, /ollama/iu, 'an Ollama integration now appears in app.js -- re-check the "absent" state');
  assert.doesNotMatch(app, /11434/u, "Ollama's default local port now appears in app.js -- a loopback client may have landed");
});

test('the registry records ollama-suite-manager as absent, and the code agrees', () => {
  assert.equal(registry.features['ollama-suite-manager'].status, 'absent',
    'no Ollama integration of any kind exists in the site -- "absent" is the honest state');
});
