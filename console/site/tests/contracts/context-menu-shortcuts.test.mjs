/**
 * Contract: context-menu-shortcuts. The honest state is "absent" -- no
 * context menu (`oncontextmenu` handling) exists anywhere on the site, so
 * there is nothing for a shortcut column to be displayed on.
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

test('the site feature registry carries a row for context-menu-shortcuts', () => {
  assert.ok(registry.features['context-menu-shortcuts'], 'no context-menu-shortcuts row in site/feature-registry.json');
});

test('no oncontextmenu handling or custom context menu exists anywhere on the site', () => {
  assert.doesNotMatch(everyPage, /oncontextmenu/iu, 'oncontextmenu handling now exists in the markup -- the "absent" state needs re-checking');
  assert.doesNotMatch(app, /contextmenu|context.?menu/iu, 'context-menu logic now exists in app.js -- re-check the "absent" state');
});

test('the registry records context-menu-shortcuts as absent, and the code agrees', () => {
  assert.equal(registry.features['context-menu-shortcuts'].status, 'absent',
    'no context menu exists anywhere on the site -- "absent" is the honest state');
});
