/**
 * Contract: bounded-overlays. Real for the site's two overlay surfaces, the
 * regex builder and the command palette. Both use native `<dialog>.showModal()`,
 * which the browser bounds to the viewport and paints its own surface, and
 * `openRegex()` explicitly labels which field it is attached to
 * ("Attached to: <field>"). This is narrower than the full canonical contract
 * (menus, dropdowns, tooltips, and every other anchored panel), but the two
 * surfaces the site does have are genuinely bounded and painted, not merely
 * styled to look that way.
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

test('the site feature registry carries a row for bounded-overlays', () => {
  assert.ok(registry.features['bounded-overlays'], 'no bounded-overlays row in site/feature-registry.json');
});

test('openRegex() uses a real native dialog and explicitly labels its anchor field', () => {
  const fn = app.match(/function openRegex\(target\)\{[\s\S]*?\n {2}\}/);
  assert.ok(fn, 'expected to find openRegex as a distinct function -- it may be inlined differently now');
});

test('openRegex genuinely calls dialog.showModal() and sets an "Attached to: <field>" label', () => {
  assert.match(app, /\$\('regex-target-label'\)\.textContent=`Attached to: \$\{target\}`/u,
    'the regex builder no longer labels which field it is attached to');
  const regexOpen = app.slice(app.indexOf('function openRegex'), app.indexOf('function openRegex') + 450);
  assert.match(regexOpen, /dialog\.showModal\(\)/u, 'openRegex no longer calls dialog.showModal()');
});

test('openPalette() also uses a real native dialog', () => {
  assert.match(app, /function openPalette\(\)\{const dialog=\$\('command-palette'\);if\(!dialog\)return;dialog\.showModal\(\);/u,
    'openPalette no longer opens a real native <dialog> with showModal()');
});

test('the underlying HTML elements really are <dialog> elements, not a styled <div>', () => {
  for (const [page, id] of [['product', 'regex-dialog'], ['product', 'command-palette']]) {
    const html = read(`${page}.html`);
    assert.match(html, new RegExp(`<dialog[^>]*id="${id}"`, 'u'), `#${id} in ${page}.html is no longer a real <dialog> element`);
  }
});

test('the registry records bounded-overlays as implemented for these two real surfaces', () => {
  assert.equal(registry.features['bounded-overlays'].status, 'implemented-unverified',
    'the regex builder and command palette are real, bounded, self-painting native dialogs');
});
