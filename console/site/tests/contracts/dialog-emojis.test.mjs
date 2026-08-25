/**
 * Contract: dialog-emojis. The honest state is "absent" -- there is no
 * show-emojis-in-dialogs toggle and no emoji-decoration logic anywhere in
 * site/app.js. This site has no dialog-emoji surface at all, in either
 * direction: no setting to persist and nothing that would apply it.
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

test('the site feature registry carries a row for dialog-emojis', () => {
  assert.ok(registry.features['dialog-emojis'], 'no dialog-emojis row in site/feature-registry.json');
});

test('no dialog-emoji setting or toggle exists anywhere in the published markup', () => {
  assert.doesNotMatch(everyPage, /dialog.?emoji|emoji.?toggle/iu, 'a dialog-emoji setting now exists -- the "absent" state needs re-checking');
});

test('app.js has no emoji-decoration function of any kind', () => {
  assert.doesNotMatch(app, /decorateDialog|emojiFor|dlgEmoji/iu, 'app.js now defines emoji-decoration logic -- the "absent" state needs re-checking');
});

test('the registry records dialog-emojis as absent, and the code agrees', () => {
  assert.equal(registry.features['dialog-emojis'].state, 'absent',
    'no show-emojis-in-dialogs toggle or emoji-decoration logic exists anywhere in site/app.js -- "absent" is the honest state');
});
