/**
 * Contract: provider-markup-rendering. The honest state is "absent". The
 * word "markdown" does appear in app.js, but only as an EXPORT FORMAT NAME
 * beside csv/tsv/sql/html -- data going OUT as Markdown text, never
 * remote/provider-authored Markdown coming IN and being parsed into real
 * blocks. Documentation content in `renderDestinations()` is inserted as
 * plain escaped text/HTML the site itself built, not rendered from any
 * provider-authored markup.
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

test('the site feature registry carries a row for provider-markup-rendering', () => {
  assert.ok(registry.features['provider-markup-rendering'], 'no provider-markup-rendering row in site/feature-registry.json');
});

test('"markdown" in app.js is an export-format NAME, not a parser -- confirmed by its neighbours in the same format list', () => {
  assert.match(app, /format==='markdown'/u, 'the markdown export-format check no longer matches -- confirm what "markdown" now refers to');
  assert.match(app, /markdown:'text\/markdown'/u, 'the markdown MIME-type mapping no longer matches -- this confirms markdown is an output format, not a parser');
});

test('there is no Markdown-to-block parser anywhere -- documentation content is inserted as plain escaped text/HTML the site itself built', () => {
  assert.doesNotMatch(app, /parseMarkdown|renderMarkdownBlock|docsBlocks/iu,
    'a Markdown-to-block parser now exists -- the "absent" state needs re-checking');
  assert.match(app, /escapeHtml\(item\.description\)/u, 'renderDestinations no longer escapes description text as plain content -- re-check how documentation content is inserted');
});

test('the registry records provider-markup-rendering as absent, and the code agrees', () => {
  assert.equal(registry.features['provider-markup-rendering'].state, 'absent',
    'no renderer for remote/provider-authored Markdown or rich text exists; the site\'s "markdown" is only an export format name -- "absent" is the honest state');
});
