/**
 * Contract: local-file-converter. The honest state is "absent". The site's
 * many `to*()` functions (`toJson`, `toXml`, `toYaml`, `toSql`, `toToml`,
 * `toDelimited`, `toMarkdown`, `toHtml`) convert the documentation/
 * notification EXPORT data into different text formats -- this is export
 * formatting (see complete-exports.md), not a general-purpose local file
 * converter with a category catalogue and bundled offline adapters. There is
 * no file-picker-driven converter surface, no adapter registry, and no
 * category catalogue anywhere in the site.
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

test('the site feature registry carries a row for local-file-converter', () => {
  assert.ok(registry.features['local-file-converter'], 'no local-file-converter row in site/feature-registry.json');
});

test('the site has real to*() format functions, so the absence claim is about a converter SURFACE, not about text formatting existing at all', () => {
  const formatFns = [...app.matchAll(/function to(Json|Xml|Yaml|Sql|Toml|Delimited|Markdown|Html)\(/gu)];
  assert.ok(formatFns.length >= 4, `expected several real to*() export-format functions, found ${formatFns.length}`);
});

test('there is no file-picker-driven converter surface, adapter registry, or category catalogue anywhere', () => {
  assert.doesNotMatch(app, /adapter.?registry|category.?catalogue|category.?catalog/iu,
    'an adapter registry or category catalogue now exists -- the "absent" state needs re-checking');
  assert.doesNotMatch(everyPage, /file.?converter|convert.?a.?file/iu, 'a file-converter surface now appears in the markup -- re-check the "absent" state');
});

test('the registry records local-file-converter as absent, and the code agrees', () => {
  assert.equal(registry.features['local-file-converter'].state, 'absent',
    "the site's to*() functions are export formatting for existing data, not a general-purpose converter with an adapter registry and category catalogue -- \"absent\" is the honest state");
});
