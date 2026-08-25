/**
 * Contract: browser-style-tabs. The honest state here is "absent" -- this file exists
 * to pin that fact, not to manufacture evidence that the feature exists.
 *
 * The site does carry markup literally classed "local-tabs" on three pages, which is
 * exactly the kind of thing a careless scan could mistake for tab support. Read
 * closely it is a plain in-page anchor nav (`<a href="#section">`) with no ARIA tab
 * semantics, no JavaScript panel-switching, no overflow/reorder/pin/group behaviour,
 * and no keyboard roving-tabindex model -- none of what the canonical browser-style
 * tab contract requires. This file proves both halves: the markup exists (so the
 * absence claim is about real semantics, not an empty page), and the tab machinery
 * genuinely does not.
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
const pageSource = Object.fromEntries(PAGES.map((name) => [name, read(`${name}.html`)]));
const everyPage = Object.values(pageSource).join('\n');
const app = read('app.js');
const registry = json('feature-registry.json');

test('the site feature registry carries a row for browser-style-tabs', () => {
  assert.ok(registry.features['browser-style-tabs'], 'no browser-style-tabs row in site/feature-registry.json');
});

test('the "local-tabs" markup that does exist is present, so the absence claim is meaningful rather than vacuous', () => {
  const withLocalTabs = PAGES.filter((name) => /class="local-tabs"/u.test(pageSource[name]));
  assert.ok(withLocalTabs.length >= 1, 'no page carries "local-tabs" markup at all -- confirm the feature was never even attempted before trusting the negative tests below');
});

test('"local-tabs" is a plain anchor nav to in-page sections, not a tab strip', () => {
  const nav = pageSource.product.match(/<nav class="local-tabs"[^>]*>([\s\S]*?)<\/nav>/u);
  assert.ok(nav, 'product.html no longer carries a local-tabs nav to check');
  const links = [...nav[1].matchAll(/<a href="#[^"]+"/gu)];
  assert.ok(links.length >= 2, 'the local-tabs nav has fewer than two hash-anchor links, so it is not even a real section jumplist');
  assert.doesNotMatch(nav[1], /role="tab"/u, 'a local-tabs link now carries role="tab" -- the feature may have actually landed');
});

test('no ARIA tab semantics (tablist, tab, tabpanel, aria-selected) exist anywhere in the published site', () => {
  assert.doesNotMatch(everyPage, /role="tablist"|role="tab"|role="tabpanel"|aria-selected/u,
    'ARIA tab semantics now exist in the markup -- the "absent" state needs re-checking, not this test');
});

test('app.js has no tab-strip logic: no panel switching, reordering, pinning, grouping, or overflow handling', () => {
  assert.doesNotMatch(app, /initTabs|tabStrip|tabGroup|pinTab|reorderTab/iu,
    'app.js now defines tab-management functions -- the "absent" state needs re-checking, not this test');
});

test('the registry records browser-style-tabs as absent, and the code agrees', () => {
  assert.equal(registry.features['browser-style-tabs'].state, 'absent',
    'the site is a handful of separately navigated pages with a plain in-page anchor nav; there is no browser-style tab strip, docking, overflow, reordering, pinning, grouping, or the four discovery searches the canonical contract requires -- "absent" is the honest state');
});
