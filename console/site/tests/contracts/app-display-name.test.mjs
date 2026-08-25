/**
 * Contract: app-display-name. The honest state is "absent" -- no renameable
 * display-name setting was found on the site. The site does read/write
 * `state.attention.currentTask` and similar named settings, but there is no
 * control anywhere that lets a user rename what the site calls itself in its
 * own chrome.
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

test('the site feature registry carries a row for app-display-name', () => {
  assert.ok(registry.features['app-display-name'], 'no app-display-name row in site/feature-registry.json');
});

test('no renameable display-name setting or control exists anywhere in the published markup or app.js', () => {
  assert.doesNotMatch(everyPage, /display.?name|rename.?the.?(app|site|page)/iu, 'a display-name control now exists in the markup -- the "absent" state needs re-checking');
  assert.doesNotMatch(app, /displayName|IDENTITY\.productName/iu, 'a display-name mechanism now exists in app.js -- re-check the "absent" state');
});

test('the registry records app-display-name as absent, and the code agrees', () => {
  assert.equal(registry.features['app-display-name'].state, 'absent',
    'no renameable display-name setting was found on the site -- "absent" is the honest state');
});
