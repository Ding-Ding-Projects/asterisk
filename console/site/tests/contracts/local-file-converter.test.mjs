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

const EXEMPT_SURFACE = "pages-site";
const EXEMPT_ROOT = resolve(siteRoot, '..', '..');

/* ------------------------------------------------------------------ *
 * Read this before deleting anything above.
 *
 * The absence below is a DECISION, not a gap. If you are here because a
 * registry row said `absent` and you took that as work waiting to be done,
 * stop: local-file-converter was excluded by the owner, for both surfaces, and the
 * reason is in `console/inventories/exemptions.json`. Only the owner can
 * reverse that.
 *
 * This block is here rather than only in the inventory because this is the
 * file somebody has to edit to make a newly built feature pass, so it is the
 * last place the decision can still be met before an afternoon is spent. On
 * 2026-08-27 one was: the site converter was built in full, with 57 contract
 * tests and 48 planted breaks behind it, before anything said the exclusion
 * existed.
 * ------------------------------------------------------------------ */
test('local-file-converter is excluded by owner decision, so its absence is not a gap to fill', () => {
  const inventoryRoot = resolve(EXEMPT_ROOT, 'console/inventories');
  const inventory = JSON.parse(readFileSync(resolve(inventoryRoot, 'surface-completeness.json'), 'utf8'));
  const exemptions = JSON.parse(readFileSync(resolve(inventoryRoot, 'exemptions.json'), 'utf8'));
  const surface = inventory.surfaces.find((entry) => entry.id === EXEMPT_SURFACE);
  assert.ok(surface, `${EXEMPT_SURFACE} is no longer a surface in the completeness inventory`);
  const row = surface.features.find((entry) => entry.id === 'local-file-converter');
  assert.equal(row?.status, 'exempt',
    'local-file-converter is no longer marked exempt for this surface -- if the owner reversed the exclusion, this whole file needs rewriting rather than this one line');
  const decision = exemptions.exemptions.find((entry) => entry.feature === 'local-file-converter');
  assert.ok(decision?.surfaces.includes(EXEMPT_SURFACE),
    'the exemption record no longer covers this surface');
  assert.equal(decision.decidedBy, 'owner', 'the exclusion is no longer recorded as the owner\'s decision');
  assert.ok(decision.reason.length > 40, 'the exclusion no longer carries a reason worth disagreeing with');
});
