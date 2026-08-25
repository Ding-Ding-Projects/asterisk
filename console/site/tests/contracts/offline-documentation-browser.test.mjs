/**
 * Contract: offline-documentation-browser (pages-site surface -- see
 * tests/contracts/offline-documentation-browser.test.mjs on the console side,
 * which is a genuinely different, richer implementation: in-app parsed
 * Markdown rendering versus this site's plain outbound links).
 *
 * `documentation.html` plus `renderDestinations()`/`initDocumentationExport()`
 * in `site/app.js` present a real searchable documentation catalogue with
 * per-article export. The `DESTINATIONS` catalogue is a plain array literal
 * embedded directly in `app.js`, not fetched separately at runtime -- there
 * are zero `fetch(...)` calls anywhere in the file, so there is no network
 * request for the catalogue beyond the ordinary one-time load of the page's
 * own script.
 *
 * The real gap: each result links OUT to a separate static article page
 * (`docs/${item.article}.html`) rather than rendering parsed article content
 * in place. There is no in-page Markdown-to-block renderer here at all --
 * that is the console app's docs-markdown.ts, a different module entirely.
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

test('the site feature registry carries a row for offline-documentation-browser', () => {
  assert.ok(registry.features['offline-documentation-browser'], 'no offline-documentation-browser row in site/feature-registry.json');
});

test('DESTINATIONS is a real embedded catalogue, not an empty placeholder', () => {
  assert.match(app, /const DESTINATIONS = \[/u, 'the DESTINATIONS catalogue no longer exists');
  const idMatches = [...app.matchAll(/\{id:'/gu)];
  assert.ok(idMatches.length > 10, `expected a substantial catalogue of destination entries, found ${idMatches.length}`);
});

test('there is zero network fetch anywhere in app.js -- the catalogue is embedded, not fetched separately', () => {
  assert.doesNotMatch(app, /\bfetch\(/u, 'app.js now calls fetch(...) -- the "no network request beyond the page load" claim needs re-checking');
});

test('renderDestinations genuinely searches the real catalogue and reports a real match count', () => {
  assert.match(app, /const matches=DESTINATIONS\.filter\(item=>matchText\(`\$\{item\.name\} \$\{item\.group\} \$\{item\.description\}`,query,'feature-search'\)\)/u,
    'renderDestinations no longer filters the real catalogue by name/group/description');
});

test('each result links OUT to a separate static article page -- there is no in-page Markdown block renderer', () => {
  assert.match(app, /href="\$\{BASE\}docs\/\$\{item\.article\}\.html"/u,
    'each result no longer links out to a static per-article page -- an in-page renderer may have been added, which would change this row');
  assert.doesNotMatch(app, /parseMarkdown|renderMarkdownBlock|docsBlocks/iu,
    'an in-page Markdown-to-block renderer now exists on the site -- update this row toward the console app\'s richer implementation');
});

test('per-article export exists as a real function, initDocumentationExport', () => {
  assert.match(app, /function initDocumentationExport\(\)/u, 'initDocumentationExport no longer exists');
});

test('the registry records offline-documentation-browser as partial', () => {
  assert.equal(registry.features['offline-documentation-browser'].state, 'partial',
    'a real, searchable, embedded catalogue with per-article export exists, but articles render as separate static pages rather than in-page parsed blocks');
});
