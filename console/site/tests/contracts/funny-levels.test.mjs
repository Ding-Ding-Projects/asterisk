/**
 * Contract: the pages-site funny-level sliders.
 *
 * The canon requires two independent per-language funny-level sliders (English and
 * Cantonese, 1-5 in the canon, 0-3 as shipped here) that style *voice*, never *facts*.
 * site/app.js genuinely implements this: a COPY table keyed by message id, each entry
 * holding a four-step English array and a four-step Cantonese array, selected by
 * state.englishFunny / state.cantoneseFunny through copyLevel(). That much is real and
 * independently re-derived below, not trusted from a hand-written note.
 *
 * What is NOT true is that the sliders restyle the site. Only a handful of strings are
 * ever reached -- five through a `data-copy` markup hook and seven more through direct
 * `copyText('key')` calls in notification/empty-state code. Everything else on the six
 * pages (headings, card copy, destination descriptions, documentation prose) is a fixed
 * string with no lever attached to it. This file pins both halves: the mechanism is
 * real, and its reach is narrow. Neither fact may be asserted from a hand note again --
 * both are recomputed from site/app.js and the page markup every run.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');
/** CRLF is present throughout this source tree; normalise before any line-anchored match. */
const norm = (s) => s.replace(/\r\n/g, '\n');

const PAGE_NAMES = ['index', 'product', 'documentation', 'downloads', 'status', 'settings'];
const pageText = () => norm(PAGE_NAMES.map((name) => read(`site/${name}.html`)).join('\n'));

/**
 * Parses the COPY table without a single lazy cross-item regex: each key is located by
 * an anchored, indented `key:{en:[` line first, which bounds every subsequent search to
 * that one key's own slice of text (from its start to the *next* key's start, or the
 * block's end). Only inside that already-bounded slice is a `[\s\S]*?` used, where it
 * cannot bridge into a neighbouring entry because there is no neighbouring entry left
 * in the slice to bridge into.
 */
function copyTable() {
  const src = norm(read('site/app.js'));
  const start = src.indexOf('const COPY = {');
  const end = src.indexOf('function copyLevel(key,lang){');
  assert.ok(start !== -1 && end !== -1 && end > start, 'could not locate the COPY table boundaries in site/app.js');
  const block = src.slice(start, end);
  const keyStarts = [...block.matchAll(/^ {4}(\w+):\{en:\[/gm)];
  assert.ok(keyStarts.length > 0, 'the COPY table parsed as no keys at all, so every row below would pass vacuously');
  const table = {};
  for (let i = 0; i < keyStarts.length; i += 1) {
    const key = keyStarts[i][1];
    const chunkStart = keyStarts[i].index;
    const chunkEnd = i + 1 < keyStarts.length ? keyStarts[i + 1].index : block.length;
    const chunk = block.slice(chunkStart, chunkEnd);
    const enMatch = chunk.match(/en:\[([\s\S]*?)\],zh:\[/);
    const zhMatch = chunk.match(/zh:\[([\s\S]*?)\]\},?/);
    assert.ok(enMatch, `${key}: no English array found inside its own bounded chunk`);
    assert.ok(zhMatch, `${key}: no Cantonese array found inside its own bounded chunk`);
    const enCount = (enMatch[1].match(/^\s*'/gm) || []).length;
    const zhCount = (zhMatch[1].match(/^\s*'/gm) || []).length;
    table[key] = { enCount, zhCount };
  }
  return table;
}

test('the COPY table defines a genuine four-level voice for both languages, on every key', () => {
  const table = copyTable();
  /* Last moved on 2026-08-26, 13 -> 14, when the settings page gained its spoken
   * narrator and with it a `narrationDesc` description; the same day it had moved
   * 10 -> 11, 11 -> 12 and 12 -> 13 for the display-name, dialog-emoji and changelog
   * cards. An exact pin is the point: a number that drifts fails and gets explained
   * rather than quietly widened. */
  assert.equal(Object.keys(table).length, 14,
    `expected exactly 14 COPY keys, found ${Object.keys(table).length} -- update this pin if a message was deliberately added or removed`);
  for (const [key, counts] of Object.entries(table)) {
    assert.equal(counts.enCount, 4, `${key}: expected 4 English funny-level variants (Plain/Mild/Playful/Maximum), found ${counts.enCount}`);
    assert.equal(counts.zhCount, 4, `${key}: expected 4 Cantonese funny-level variants, found ${counts.zhCount}`);
  }
});

test('copyLevel indexes each language array by its OWN independent slider value', () => {
  const src = norm(read('site/app.js'));
  const start = src.indexOf('function copyLevel(key,lang){');
  assert.ok(start !== -1, 'copyLevel() not found');
  let depth = 0, i = src.indexOf('{', start);
  for (; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') { depth -= 1; if (depth === 0) { i += 1; break; } }
  }
  const body = src.slice(start, i);
  assert.ok(body.includes(`level=lang==='zh'?state.cantoneseFunny:state.englishFunny`),
    'copyLevel no longer reads the two independent slider fields -- the two languages could now share one level');
  assert.ok(body.includes('arr[Math.min(arr.length-1,Math.max(0,Number(level)||0))]'),
    'copyLevel no longer clamps the level into the array bounds the way it did when this was pinned');
});

test('the settings page ships two independently valued 4-step funny sliders, one per language', () => {
  const html = norm(read('site/settings.html'));
  function selectOptions(id) {
    const openMatch = html.match(new RegExp(`<select id="${id}"[^>]*>`));
    assert.ok(openMatch, `<select id="${id}"> not found on settings.html`);
    const start = openMatch.index + openMatch[0].length;
    const end = html.indexOf('</select>', start);
    assert.ok(end !== -1, `</select> not found for #${id}`);
    return [...html.slice(start, end).matchAll(/<option value="([^"]*)">([^<]*)<\/option>/g)]
      .map((m) => ({ value: m[1], label: m[2] }));
  }
  const expected = [
    { value: '0', label: 'Plain' }, { value: '1', label: 'Mild' },
    { value: '2', label: 'Playful' }, { value: '3', label: 'Maximum' },
  ];
  assert.deepEqual(selectOptions('english-funny'), expected, 'english-funny select options drifted from the 4-step design');
  assert.deepEqual(selectOptions('cantonese-funny'), expected, 'cantonese-funny select options drifted from the 4-step design');

  const line = norm(read('site/app.js')).split('\n').find((l) => l.includes('const DEFAULTS = {'));
  assert.ok(line, 'DEFAULTS object literal line not found');
  assert.match(line, /(?:^|[{,])englishFunny:0(?=[,}])/, 'DEFAULTS no longer carries its own englishFunny:0 field');
  assert.match(line, /(?:^|[{,])cantoneseFunny:0(?=[,}])/, 'DEFAULTS no longer carries its own cantoneseFunny:0 field, distinct from englishFunny');
});

test('every COPY key is genuinely reached from real markup or a real call site -- none of it is dead', () => {
  const keys = Object.keys(copyTable());
  const html = pageText();
  const wiredKeys = new Set([...html.matchAll(/data-copy="(\w+)"/g)].map((m) => m[1]));
  const src = norm(read('site/app.js'));
  const calledKeys = new Set([...src.matchAll(/copyText\('(\w+)'\)/g)].map((m) => m[1]));
  assert.ok(wiredKeys.size > 0 && calledKeys.size > 0, 'neither reach mechanism found anything, so this would pass vacuously');
  for (const key of keys) {
    assert.ok(wiredKeys.has(key) || calledKeys.has(key),
      `${key} is declared in COPY but is reached from neither a data-copy hook nor a copyText('${key}') call -- it is dead copy`);
  }
  for (const key of wiredKeys) {
    assert.ok(keys.includes(key), `a page carries data-copy="${key}" for a COPY key that does not exist`);
  }
  for (const key of calledKeys) {
    assert.ok(keys.includes(key), `site/app.js calls copyText('${key}') for a COPY key that does not exist`);
  }
});

test('the funny sliders reach only a small, explicitly wired subset of the six pages, not the pages themselves', () => {
  /* This is the fact that makes "partial" the honest classification rather than
   * "implemented": the mechanism above is real, but only these six strings in the
   * whole site actually have a data-copy hook attached to them. The set last grew on
   * 2026-08-26, when the settings page's spoken narrator was built with its description
   * wired to the sliders from the start, as the changelog, dialog-emoji and display-name
   * cards had been earlier the same day -- seven of fourteen keys is still nowhere near
   * the whole page, so the classification does not change.
   *
   * Worth saying beside this list, because it is the one place the reach deliberately
   * STOPS rather than merely not having got there yet: the changelog entries the new
   * description sits above are a factual external record, and are never restyled at any
   * level. Adding a hook to them would be a defect rather than progress. */
  const html = pageText();
  const wiredKeys = new Set([...html.matchAll(/data-copy="(\w+)"/g)].map((m) => m[1]));
  assert.deepEqual([...wiredKeys].sort(),
    ['changelogDesc', 'dialogEmojisDesc', 'displayNameDesc', 'heroLede', 'motionDesc', 'narrationDesc', 'themeDesc'],
    'the set of markup-wired funny-level strings changed -- if it grew, the "partial" classification may need revisiting');
  const totalKeys = Object.keys(copyTable()).length;
  assert.ok(wiredKeys.size < totalKeys,
    'every COPY key is now markup-wired, so the funny levels would actually reach the whole page -- this would no longer be partial');
});

test('the page headline itself carries no funny-level hook at all', () => {
  /* A concrete, breakable pin: the single most prominent string on the homepage is
   * completely untouched by either slider. If this literal text or its lack of a
   * data-copy attribute ever changes, this must be re-examined by hand, not silently
   * patched to keep passing. */
  const index = norm(read('site/index.html'));
  const literal = '<h1>Every write to your PBX<br><em>is a plan.</em></h1>';
  const at = index.indexOf(literal);
  assert.ok(at !== -1, 'the pinned homepage headline text was not found verbatim -- the page copy changed, re-verify by hand');
  /* The literal above is the complete opening tag through the complete closing tag, so
   * checking the literal itself (rather than a surrounding window that would also catch
   * the unrelated data-copy="heroLede" paragraph right after it) is the correct scope. */
  assert.doesNotMatch(literal, /data-copy=/,
    'the homepage headline now carries a data-copy hook -- the "narrow reach" pin above needs updating');
});
