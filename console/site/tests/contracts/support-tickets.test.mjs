/**
 * Contract: support-tickets. The honest state is "absent" -- no Support
 * Tickets surface exists on the site. There is nowhere on the site a user is
 * even locked out of (see per-element-toy-locks.md, unlock-ladder.md), so
 * there is nothing for a comedic recovery-ticket surface to be the recovery
 * route for.
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

test('the site feature registry carries a row for support-tickets', () => {
  assert.ok(registry.features['support-tickets'], 'no support-tickets row in site/feature-registry.json');
});

test('no support-ticket surface exists anywhere in the published markup or app.js', () => {
  assert.doesNotMatch(everyPage, /support.?ticket/iu, 'a support-ticket surface now exists in the markup -- the "absent" state needs re-checking');
  assert.doesNotMatch(app, /support.?ticket/iu, 'a support-ticket surface now exists in app.js -- re-check the "absent" state');
});

test('the registry records support-tickets as absent, and the code agrees', () => {
  assert.equal(registry.features['support-tickets'].state, 'absent',
    'no Support Tickets surface exists on the site -- "absent" is the honest state');
});
