/**
 * Contract: every page this site publishes, and every script it ships, is accounted for.
 *
 * Every other contract file here reads a hand-written list of six pages -- index, product,
 * documentation, downloads, status, settings. The site publishes NINE. The three the list
 * has never mentioned are converter.html, ollama.html and history.html, and all three turn
 * out to be inert: between them they carry seventeen controls whose ids no script on this
 * site ever mentions, and history.html is a bare mount point for a module no page loads.
 *
 * That is how `local-file-converter` and `ollama-suite-manager` came to be recorded absent
 * while their pages sat in the primary navigation of all nine: the check that re-derived
 * the absence could not see the files that contradict it. An absence proved over a stale
 * list is not an absence, it is a blind spot with an assertion in front of it.
 *
 * So this file works from the filesystem rather than from a list, and requires the two
 * exceptions to be declared with their reasons. A page that gets wired turns this red and
 * the declaration has to go; a page that quietly stops being wired turns it red too.
 *
 * Nothing here says an inert page should be deleted or that the converter should be built.
 * Both are product decisions. This only refuses to let the site publish a control that
 * does nothing without that being written down somewhere a person will find it.
 *
 * Plain `.mjs`, no bundler, no build step -- this is the `localCheck` evidence column
 * and must run standalone against the published sources.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(siteRoot, p), 'utf8').replaceAll('\r\n', '\n');

const pageFiles = readdirSync(siteRoot).filter((name) => name.endsWith('.html')).sort();
const scriptFiles = readdirSync(siteRoot).filter((name) => name.endsWith('.js')).sort();
const pages = Object.fromEntries(pageFiles.map((name) => [name.replace(/\.html$/u, ''), read(name)]));
const scripts = Object.fromEntries(scriptFiles.map((name) => [name, read(name)]));
const isLoaded = (name) => Object.values(pages).some((source) => source.includes(`src="${name}"`));
/**
 * Only the scripts a page actually loads. Reading all of them would let an unloaded file
 * vouch for a control -- site/history-delivery.js names the mount point on history.html
 * and no page loads it, so a scan over every file on disk reports that page as wired when
 * a browser opening it runs none of that code.
 */
const everyScript = scriptFiles.filter(isLoaded).map((name) => scripts[name]).join('\n');

/**
 * A `<details>` is deliberately not in this set. It discloses and hides its own content
 * with no script at all, so an id nothing references is the normal, working case for one
 * -- counting it would have reported settings.html's `school-recovery` disclosure as a
 * dead control, which is a false alarm rather than a finding.
 */
const INTERACTIVE = /<(?:input|select|button|textarea|dialog|form)\b[^>]*\bid="([^"]+)"/giu;

const pageOfId = new Map();
for (const [name, source] of Object.entries(pages)) {
  for (const match of source.matchAll(/id="([^"]+)"/giu)) {
    const seen = pageOfId.get(match[1]) ?? new Set();
    seen.add(name);
    pageOfId.set(match[1], seen);
  }
}

/** Controls that exist on exactly one page, so a shared chrome id cannot vouch for a page. */
function ownControls(name) {
  return [...new Set([...pages[name].matchAll(INTERACTIVE)].map((match) => match[1]))]
    .filter((id) => pageOfId.get(id).size === 1)
    .sort();
}
const referenced = (id) => everyScript.includes(`"${id}"`) || everyScript.includes(`'${id}'`);

/**
 * Pages whose own controls no script reaches. Each entry is a recorded decision, not a
 * to-do list: the reason is what a reader gets instead of a page that looks finished.
 */
const INERT_PAGES = {
  converter: 'converter.html ships the source picker, adapter catalogue, target-format select, queue pager and cancel button of a local file converter, and site/app.js contains the string "converter" zero times. The feature is recorded absent in feature-registry.json under local-file-converter and this page is why that record needs its own sentence: the surface is published and linked from the primary navigation of all nine pages, so a reader meets the controls before they meet the absence.',
  ollama: 'ollama.html ships an endpoint field, approve and probe buttons, a model search and select, a prompt field, a chat control and a cancel button, and site/app.js contains the string "ollama" zero times. Recorded absent in feature-registry.json under ollama-suite-manager, published and linked exactly like converter.html.',
  history: 'history.html is a single empty mount point, <div id="history-delivery-page">, and the module written to fill it -- site/history-delivery.js -- is loaded by no page at all. The page therefore renders its header, its footer and nothing between them. It carries no controls of its own, so it appears here for the mount point rather than for a dead control.',
};

/**
 * Scripts this site ships that no page loads. Same rule as the pages above: declared with
 * a reason, and required to stay unloaded until somebody deliberately wires them.
 */
const UNLOADED_SCRIPTS = {
  'history-delivery.js': 'The local delivery workspace behind history.html. No page has a <script src> for it, so nothing on the site runs it.',
  'changelog-data.js': 'Generated changelog data read through window.DING_SITE_CHANGELOG by history-delivery.js, which is itself never loaded.',
  'release-manifest.js': 'Generated release manifest read through window.DING_SITE_RELEASE_MANIFEST by history-delivery.js, which is itself never loaded.',
  'full-builder.js': 'A second regular-expression builder implementation. site/app.js carries the builder the pages actually use.',
};

test('the measurement is not vacuous: this site really does publish nine pages and five scripts', () => {
  // Every assertion below is of the form "nothing was found". A run over an empty
  // directory would satisfy all of them, so the count is pinned first.
  assert.ok(pageFiles.length >= 9, `only ${pageFiles.length} pages were read -- too few to trust a not-found result from them`);
  assert.ok(scriptFiles.length >= 5, `only ${scriptFiles.length} scripts were read`);
  const controls = Object.keys(pages).reduce((total, name) => total + ownControls(name).length, 0);
  assert.ok(controls > 100, `only ${controls} page-owned controls were found across the whole site`);
});

test('every page a reader can open loads at least one script', () => {
  for (const [name, source] of Object.entries(pages)) {
    const loaded = [...source.matchAll(/<script[^>]*\bsrc="([^"]+)"/giu)].map((match) => match[1]);
    assert.ok(loaded.length > 0, `${name}.html loads no script at all`);
  }
});

test('a page that is not declared inert has at least one control a script reaches', () => {
  for (const name of Object.keys(pages)) {
    if (Object.hasOwn(INERT_PAGES, name)) continue;
    const own = ownControls(name);
    if (own.length === 0) continue;
    const reached = own.filter(referenced);
    assert.ok(reached.length > 0,
      `${name}.html publishes ${own.length} control(s) of its own and no script mentions any of them: ${own.join(', ')}. Either wire it, or declare it in INERT_PAGES with the reason a reader deserves.`);
  }
});

test('a page declared inert really is inert, so the declaration cannot outlive the state it describes', () => {
  for (const [name, reason] of Object.entries(INERT_PAGES)) {
    assert.ok(Object.hasOwn(pages, name), `INERT_PAGES names ${name}.html, which this site does not publish`);
    assert.ok(reason.length > 80, `${name}: the recorded reason is ${reason.length} characters, too short to be one`);
    const reached = ownControls(name).filter(referenced);
    assert.deepEqual(reached, [],
      `${name}.html is declared inert but a script now reaches ${reached.join(', ')} -- remove the declaration rather than leaving a stale one`);
  }
});

test('converter.html and ollama.html carry the controls this record says they carry', () => {
  // Named exactly, because the two registry rows that call these features absent point
  // here for the other half of the story, and a count is what makes that checkable.
  assert.deepEqual(ownControls('converter'),
    ['converter-cancel', 'converter-files', 'converter-format-search', 'converter-next', 'converter-prev', 'converter-target-format']);
  assert.equal(ownControls('ollama').length, 11);
  assert.equal(scripts['app.js'].includes('converter'), false, 'site/app.js now mentions the converter -- re-derive the absent record');
  assert.equal(scripts['app.js'].includes('ollama'), false, 'site/app.js now mentions Ollama -- re-derive the absent record');
});

test('every shipped script is either loaded by a page or declared unloaded, with a reason', () => {
  for (const name of scriptFiles) {
    const loadedBy = Object.entries(pages).filter(([, source]) => source.includes(`src="${name}"`)).map(([page]) => page);
    if (loadedBy.length > 0) {
      assert.equal(Object.hasOwn(UNLOADED_SCRIPTS, name), false,
        `${name} is declared unloaded but ${loadedBy.join(', ')} load it -- remove the declaration`);
      continue;
    }
    assert.ok(Object.hasOwn(UNLOADED_SCRIPTS, name),
      `${name} is shipped and no page loads it. Either load it, or declare it in UNLOADED_SCRIPTS with the reason.`);
    assert.ok(UNLOADED_SCRIPTS[name].length > 40, `${name}: the recorded reason is too short to be one`);
  }
});

test('every declared unloaded script is a file this site actually ships', () => {
  for (const name of Object.keys(UNLOADED_SCRIPTS)) {
    assert.ok(scriptFiles.includes(name), `UNLOADED_SCRIPTS names ${name}, which is not in site/`);
  }
});

test('history.html is the mount point this record says it is, and nothing fills it', () => {
  assert.match(pages.history, /<div id="history-delivery-page"><\/div>/u,
    'history.html no longer carries the empty mount point this record describes');
  assert.ok(scripts['history-delivery.js'].includes('history-delivery-page'),
    'site/history-delivery.js no longer names the mount point it was written for -- this record describes the wrong module');
  assert.equal(everyScript.includes('history-delivery-page'), false,
    'a LOADED script now fills the history mount point -- history.html is no longer inert, so re-derive its record');
});
