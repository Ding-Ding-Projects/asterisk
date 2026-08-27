/**
 * Contract: personal-vocabulary-upload, recomputed from the published site.
 *
 * settings.html carries the upload control; site/app.js's loadVocabulary() validates
 * the file locally (size bound, schema version, bounded replacement count, bounded
 * string lengths, duplicate-key rejection) and stores the result only in
 * localStorage, never transmitting it. This file checks each bound directly against
 * the source rather than trusting the registry's summary of them.
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
const app = read('app.js');
const appLines = app.split('\n');
const registry = json('feature-registry.json');

/**
 * The body of one function, bounded by the NEXT top-level function declaration
 * rather than by a lazy [\s\S]*? scan or a guessed fixed line count -- so it can
 * never bleed into a neighbouring function, and it does not silently truncate a
 * long body the way a fixed line count already did once while writing this file.
 */
function functionBody(signaturePattern) {
  const startIndex = appLines.findIndex((l) => signaturePattern.test(l));
  assert.ok(startIndex >= 0, `no source line matched ${signaturePattern}`);
  let endIndex = appLines.findIndex(
    (l, i) => i > startIndex && /^\s*(?:async )?function \w+\(/.test(l),
  );
  if (endIndex === -1) endIndex = appLines.length;
  assert.ok(endIndex - startIndex < 60, `${signaturePattern} matched a suspiciously huge body (${endIndex - startIndex} lines) -- the next-function boundary probably missed`);
  return appLines.slice(startIndex, endIndex).join('\n');
}

test('the site feature registry carries a row for personal-vocabulary-upload', () => {
  assert.ok(registry.features['personal-vocabulary-upload'], 'no personal-vocabulary-upload row in site/feature-registry.json');
});

test('the upload control lives on settings.html, and nowhere else', () => {
  const withControl = PAGES.filter((name) => /id="vocabulary-file"/u.test(pageSource[name]));
  assert.deepEqual(withControl, ['settings'], 'the vocabulary-file control moved -- update this test alongside the registry');
  assert.match(pageSource.settings, /id="vocabulary-file"[^>]*type="file"[^>]*accept="application\/json,\.json"/u,
    'settings.html no longer offers a real JSON file picker for the vocabulary upload');
  assert.match(pageSource.settings, /id="vocabulary-clear"/u, 'settings.html has no clear/reset control for the loaded vocabulary');
});

test('the upload states plainly, right next to the control, that no data leaves the browser', () => {
  const card = pageSource.settings.match(/<article class="setting-card vocabulary-card"[\s\S]*?<\/article>/u);
  assert.ok(card, 'settings.html no longer carries the vocabulary-card article');
  assert.match(card[0], /No data leaves this browser/u, 'the vocabulary card no longer states its local-only boundary');
});

test('a file over 64 KiB is rejected before it is even parsed', () => {
  const body = functionBody(/^\s*async function loadVocabulary\(event\)\{/);
  assert.match(body, /file\.size>65536/u, 'loadVocabulary no longer enforces the 64 KiB size bound');
});

test('a file that does not declare schema version 1 is rejected, in either accepted spelling', () => {
  const body = functionBody(/^\s*async function loadVocabulary\(event\)\{/);
  assert.match(body, /raw&&raw\.version!==undefined\?raw\.version:raw&&raw\.schemaVersion/u,
    'loadVocabulary no longer accepts both "version" and "schemaVersion" as the schema field');
  assert.match(body, /if\(parsed\.version!==1\)throw new Error/u, 'loadVocabulary no longer rejects a non-1 schema version');
});

test('the replacement list is bounded to 256 entries, and each entry is bounded in length', () => {
  const body = functionBody(/^\s*async function loadVocabulary\(event\)\{/);
  assert.match(body, /parsed\.replacements\.length>256/u, 'loadVocabulary no longer bounds the replacement count to 256');
  assert.match(body, /item\.from\.length>128/u, 'loadVocabulary no longer bounds a replacement\'s "from" length to 128');
  assert.match(body, /item\.to\.length>256/u, 'loadVocabulary no longer bounds a replacement\'s "to" length to 256');
});

test('a duplicate "from" key across two replacement entries is rejected, not silently kept', () => {
  const body = functionBody(/^\s*async function loadVocabulary\(event\)\{/);
  assert.match(body, /Duplicate keys are not accepted/u, 'loadVocabulary no longer rejects duplicate replacement keys');
});

test('a validated upload is stored only in localStorage, under the documented cache key', () => {
  const body = functionBody(/^\s*async function loadVocabulary\(event\)\{/);
  /* Through `writeLocal` since in-context recovery landed -- the one writer every store
   * on this page goes through, so a browser refusing the write is reported where it
   * happened rather than thrown past whichever setter was in use. The property is
   * unchanged and still exact: the validated file goes to that one local key. */
  assert.match(body, /writeLocal\('ding-pbx-vocabulary-cache',JSON\.stringify\(parsed\)\)/u,
    'loadVocabulary no longer caches the validated vocabulary in localStorage');
  assert.match(app, /function writeLocal\(key,value\)\{\s*try\{localStorage\.setItem\(key,String\(value\)\)/u,
    'writeLocal no longer writes to localStorage, so the line above no longer proves the file is cached locally');
  assert.doesNotMatch(body, /fetch\(|XMLHttpRequest|navigator\.sendBeacon/u,
    'loadVocabulary now performs a network call -- the local-only claim is no longer true');
});

test('clearing the vocabulary removes the cache and restores the original-wording status line', () => {
  /* `el(` rather than `$(` since the restricted presentation landed: that mode removes
   * the whole vocabulary card from the document while it is on, and this handler is
   * bound once at load. `el()` resolves an id whether the control is in the document or
   * currently held out of it, so the control works when it comes back instead of
   * returning as a dead one. */
  /* The handler moved into a named `clearVocabulary` when in-context recovery landed,
   * because two things clear the dictionary now: this button, and the recovery route
   * raised when a file is refused. Both halves are checked -- that the button is wired
   * to it, and that it is what removes the cache and restores the wording -- so a button
   * wired to a function that no longer clears anything cannot pass either half. */
  const line = app.split('\n').find((l) => /\bel\('vocabulary-clear'\)\.onclick=/.test(l));
  assert.ok(line, 'the vocabulary-clear click handler was not found');
  assert.match(line, /el\('vocabulary-clear'\)\.onclick=clearVocabulary;/u, 'the vocabulary-clear button is no longer wired to clearVocabulary');
  const clear = functionBody(/^\s*function clearVocabulary\(\)\{/);
  assert.match(clear, /localStorage\.removeItem\('ding-pbx-vocabulary-cache'\)/u, 'clearing no longer removes the vocabulary cache');
  assert.match(clear, /original wording is active/u, 'clearing no longer restores the original-wording status text');
});

test('the general settings export explicitly omits the personal vocabulary rather than silently leaking it', () => {
  assert.match(app, /personalVocabulary:'omitted'/u, 'the settings export no longer states that personal vocabulary was omitted');
});

test('the registry records personal-vocabulary-upload as implemented, and every bound above holds', () => {
  /* `state` was the flat shape the pages-site registry briefly carried; schema v2 spells
   * the same fact `status`, and its vocabulary distinguishes "built" from "verified". */
  assert.equal(registry.features['personal-vocabulary-upload'].status, 'implemented-unverified',
    'a real, bounded, local-only, duplicate-rejecting JSON upload exists on settings.html -- "implemented" is the honest state');
  /* The reader this row names was renamed loadVocabularyFromInput -> loadVocabulary; the
   * row followed it, and this pins the pair so the next rename cannot slip past. */
  assert.deepEqual(registry.features['personal-vocabulary-upload'].implementation.symbols.map((symbol) => symbol.name).sort(),
    ['loadVocabulary'], 'the row no longer names the function that actually reads the uploaded file');
});
