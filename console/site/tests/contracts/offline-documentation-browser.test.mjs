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
 * in place. `site/app.js` does now carry a shared Markdown renderer
 * (parseMarkdown/renderMarkdownBlock, see provider-markup-rendering.test.mjs)
 * -- but it renders downloads.html's release notes, an unrelated surface, and
 * is never called from renderDestinations() for article content. So the gap
 * this file is about is unchanged: there is still no in-page documentation-
 * ARTICLE renderer here, which remains the console app's docs-markdown.ts, a
 * different module entirely.
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

test('each result still links OUT to a separate static article page -- provider-markup-rendering added a shared Markdown renderer elsewhere, but renderDestinations does not use it for articles', () => {
  assert.match(app, /href="\$\{BASE\}docs\/\$\{item\.article\}\.html"/u,
    'each result no longer links out to a static per-article page -- an in-page renderer may have been added, which would change this row');
  /* parseMarkdown/renderMarkdownBlock now exist in app.js (see
   * provider-markup-rendering.test.mjs), wired to downloads.html's release-notes
   * region -- an unrelated surface. What still does NOT exist is an in-page
   * documentation-ARTICLE renderer: renderDestinations() builds each destination
   * card from escapeHtml(item.description) plus an outbound docs/*.html link, never
   * from parseMarkdown/renderMarkdownBlock. Confirm that directly rather than by a
   * blind absence check now that those identifiers legitimately appear elsewhere. */
  const start = app.indexOf('function renderDestinations(');
  assert.ok(start !== -1, 'renderDestinations() not found');
  let depth = 0, i = app.indexOf('{', start);
  for (; i < app.length; i += 1) {
    if (app[i] === '{') depth += 1;
    else if (app[i] === '}') { depth -= 1; if (depth === 0) { i += 1; break; } }
  }
  const body = app.slice(start, i);
  assert.doesNotMatch(body, /parseMarkdown|renderMarkdownBlock|docsBlocks/iu,
    'renderDestinations() now calls the Markdown renderer for article content -- an in-page renderer may have been added, which would change this row');
  assert.match(body, /escapeHtml\(item\.description\)/u, 'renderDestinations no longer builds cards from plain escaped description text');
});

test('per-article export exists as a real function, initDocumentationExport', () => {
  assert.match(app, /function initDocumentationExport\(\)/u, 'initDocumentationExport no longer exists');
});

test('the registry records offline-documentation-browser as partial', () => {
  assert.equal(registry.features['offline-documentation-browser'].state, 'partial',
    'a real, searchable, embedded catalogue with per-article export exists, but articles render as separate static pages rather than in-page parsed blocks');
});
