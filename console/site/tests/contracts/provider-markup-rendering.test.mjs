/**
 * Contract: provider-markup-rendering. site/app.js now carries one shared,
 * safe Markdown-to-block renderer (parseMarkdown/markdownInlineTokens/
 * renderMarkdownBlock), wired to a real consumer: downloads.html's installer
 * panel renders its release notes through it. This file both source-checks
 * the wiring AND executes the real parser against representative inputs --
 * including an XSS attempt and an unsafe-scheme link -- to prove the safety
 * claims are actually true, not merely that the function exists.
 *
 * "markdown" as an EXPORT FORMAT NAME (data going OUT, csv/tsv/sql/html's
 * neighbour) is unchanged and still a different thing entirely from this
 * renderer, which handles provider-authored text coming IN.
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
const downloadsHtml = read('downloads.html');
const registry = json('feature-registry.json');

test('the site feature registry carries a row for provider-markup-rendering', () => {
  assert.ok(registry.features['provider-markup-rendering'], 'no provider-markup-rendering row in site/feature-registry.json');
});

test('"markdown" as an export-format NAME is unchanged and still a different thing from the new renderer', () => {
  assert.match(app, /format==='markdown'/u, 'the markdown export-format check no longer matches -- confirm what "markdown" now refers to');
  assert.match(app, /markdown:'text\/markdown'/u, 'the markdown MIME-type mapping no longer matches -- this confirms markdown export is still a different feature from the renderer');
});

test('a real parseMarkdown/renderMarkdownBlock exist, escape raw HTML before recognising markdown syntax, and are wired to a real consumer', () => {
  assert.match(app, /function parseMarkdown\(source\)\{/u, 'parseMarkdown() no longer exists');
  assert.match(app, /function renderMarkdownBlock\(container,source,emptyMessage\)\{/u, 'renderMarkdownBlock() no longer exists');
  assert.match(app, /function markdownInlineTokens\(text\)\{\s*return escapeHtml\(text\)/u,
    'markdownInlineTokens no longer escapes raw HTML before applying any markdown syntax -- this is the safety property the parser depends on');
  assert.match(app, /const RELEASE_NOTES_MARKDOWN = '';/u, 'the release-notes data constant no longer matches');
  assert.match(app, /function initReleaseNotes\(\)\{renderMarkdownBlock\(\$\('release-notes'\),RELEASE_NOTES_MARKDOWN,'No release notes were provided yet -- no verified release manifest exists\.'\)\}/u,
    'initReleaseNotes() no longer wires the parser to a real container with an honest empty-state message');
  assert.match(app, /initReleaseNotes\(\);/u, 'initReleaseNotes() is no longer called from init()');
  assert.match(downloadsHtml, /<div id="release-notes" class="release-notes" aria-live="polite"><\/div>/u,
    'downloads.html no longer has the #release-notes container the renderer targets');
});

test('renderDestinations still builds documentation cards from plain escaped site-authored text, not from the new provider-markup parser -- that content is the site\'s own, not provider-authored', () => {
  assert.match(app, /escapeHtml\(item\.description\)/u, 'renderDestinations no longer escapes description text as plain content');
  const start = app.indexOf('function renderDestinations(');
  assert.ok(start !== -1, 'renderDestinations() not found');
  let depth = 0, i = app.indexOf('{', start);
  for (; i < app.length; i += 1) {
    if (app[i] === '{') depth += 1;
    else if (app[i] === '}') { depth -= 1; if (depth === 0) { i += 1; break; } }
  }
  assert.doesNotMatch(app.slice(start, i), /parseMarkdown|renderMarkdownBlock/u,
    'renderDestinations() now calls the Markdown renderer for the site\'s own description text -- confirm this is intentional');
});

/**
 * Executable proof, not just a source-pattern match: extract the real
 * parseMarkdown/markdownInlineTokens/escapeHtml source from app.js and run it
 * for real, against inputs a provider-authored release note plausibly
 * contains, including an XSS attempt and an unsafe link scheme. If the
 * source above ever drifts out of sync with what actually executes, this
 * block is what would catch it.
 */
function loadRealParser() {
  const grab = (name) => {
    const start = app.indexOf(`function ${name}(`);
    assert.ok(start !== -1, `${name}() not found while extracting for execution`);
    let depth = 0, i = app.indexOf('{', start);
    for (; i < app.length; i += 1) {
      if (app[i] === '{') depth += 1;
      else if (app[i] === '}') { depth -= 1; if (depth === 0) { i += 1; break; } }
    }
    return app.slice(start, i);
  };
  const source = [grab('escapeHtml'), grab('markdownInlineTokens'), grab('parseMarkdown'), 'return {parseMarkdown};'].join('\n');
  // eslint-disable-next-line no-new-func -- deliberately executing the site's own real source, not test-authored logic
  return new Function(source)();
}

test('the real parser renders headings, emphasis, inline code, lists, and safe links correctly', () => {
  const { parseMarkdown } = loadRealParser();
  const html = parseMarkdown('## v0.2.0\n\nFixed a **crash** on startup. See [details](https://example.com/notes).\n\n- item one\n- item two');
  assert.match(html, /<h4>v0\.2\.0<\/h4>/u, 'a level-2 heading did not render as a real heading element');
  assert.match(html, /<strong>crash<\/strong>/u, 'bold emphasis did not render as <strong>');
  assert.match(html, /<a href="https:\/\/example\.com\/notes" rel="noopener noreferrer">details<\/a>/u, 'a safe https link did not render as a real anchor');
  assert.match(html, /<ul><li>item one<\/li><li>item two<\/li><\/ul>/u, 'a list block did not render as <ul><li>');
  assert.doesNotMatch(html, /[#[\]]/u, 'literal Markdown source characters (#, [, ]) leaked into the rendered output instead of being converted');
});

test('the real parser escapes raw HTML in the source BEFORE recognising markdown syntax -- an XSS attempt cannot reach the DOM as markup', () => {
  const { parseMarkdown } = loadRealParser();
  const html = parseMarkdown('Note: <img src=x onerror="alert(1)"> and <script>alert(2)</script> are both just text.');
  assert.doesNotMatch(html, /<img\b/u, 'a raw <img> tag from the source was not escaped -- this is an XSS hole');
  assert.doesNotMatch(html, /<script\b/u, 'a raw <script> tag from the source was not escaped -- this is an XSS hole');
  assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/u, 'the raw <img> tag is not present as escaped text either -- confirm what actually happened to it');
});

test('the real parser refuses unsafe link schemes -- javascript: never becomes a clickable href', () => {
  const { parseMarkdown } = loadRealParser();
  const html = parseMarkdown('[click me](javascript:alert(1))');
  assert.doesNotMatch(html, /href="javascript:/iu, 'a javascript: URL was rendered as a real href -- this is an XSS hole');
  assert.match(html, /click me/u, 'the link label was dropped entirely rather than rendered as plain text');
});

test('the real parser has an honest empty result for empty/whitespace-only input, matched by renderMarkdownBlock\'s empty-state fallback', () => {
  const { parseMarkdown } = loadRealParser();
  assert.equal(parseMarkdown(''), '', 'parseMarkdown no longer returns an empty string for empty input');
  assert.equal(parseMarkdown('   \n\n  '), '', 'parseMarkdown no longer treats whitespace-only input as empty');
});

test('the registry records provider-markup-rendering as implemented, and the code agrees', () => {
  assert.equal(registry.features['provider-markup-rendering'].state, 'implemented',
    'a real, safe, shared Markdown renderer now exists and is wired to a real consumer (downloads.html release notes) with an honest empty state -- "implemented" is the honest state');
});
