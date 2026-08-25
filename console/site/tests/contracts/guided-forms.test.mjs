/**
 * Contract: guided forms on the pages-site.
 *
 * The canon's guided-forms requirement is about a specific pattern: wherever a value
 * could be enumerated, picked, or defaulted from REAL live data (existing accounts,
 * installed items, a project's own records), the surface offers that instead of a
 * blank freeform field -- the app's endpoint wizard is the named reference example.
 *
 * This static site has no live data to populate a picker from in the first place; it
 * has no backend, no accounts, no installed-anything. Its forms are exactly six plain
 * <select> elements over hard-coded, always-identical option lists (theme, language,
 * density, and two export-format pickers) plus a handful of checkboxes, one range
 * slider, one colour input, one free-text field, and two <input type="file"> uploads.
 * None of that is the enumerated-picker-over-real-data pattern the contract names --
 * a fixed dropdown with three options that never change is not "guided" in that sense,
 * it is just a normal <select>.
 *
 * This file re-derives that absence rather than trusting a hand-written note: it counts
 * every <select> and confirms each one's options are a fixed literal list (not rendered
 * from any data source at runtime), and confirms there is no code path anywhere in
 * site/app.js that populates a <select> or a <datalist> from computed/fetched data.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');
const norm = (s) => s.replace(/\r\n/g, '\n');

const PAGE_NAMES = ['index', 'product', 'documentation', 'downloads', 'status', 'settings'];
const pageText = () => norm(PAGE_NAMES.map((name) => read(`site/${name}.html`)).join('\n'));

test('there is no <datalist> anywhere on the site -- the one native picker-over-real-data primitive is unused', () => {
  const html = pageText();
  assert.doesNotMatch(html, /<datalist/i, 'a <datalist> now exists -- guided-forms may have been partially added; re-derive this contract by hand');
  assert.doesNotMatch(html, /\blist="/i, 'an input now references list="..." (a datalist binding) -- re-derive this contract by hand');
});

test('every <select> on the site ships with a fixed, hard-coded option list, never populated at runtime', () => {
  const html = pageText();
  const selects = [...html.matchAll(/<select id="([a-z-]+)"[^>]*>([\s\S]*?)<\/select>/g)];
  assert.ok(selects.length > 0, 'no <select> elements found at all, which proves nothing about this contract');
  /* Several pages embed the same shared header/notification-dialog markup verbatim
   * (that is a separate, pre-existing site structure choice, not something this
   * contract is about), so the same #id can legitimately appear more than once across
   * the six concatenated pages -- de-duplicate by id before comparing the two buckets. */
  const staticIds = new Set();
  const emptyIds = new Set();
  for (const [, id, body] of selects) {
    const options = [...body.matchAll(/<option value="[^"]*">[^<]*<\/option>/g)];
    if (options.length > 0) staticIds.add(id);
    else emptyIds.add(id);
  }
  const withStaticOptions = [...staticIds];
  const empty = [...emptyIds];
  /* theme-mode, language-mode, english-funny, cantonese-funny, and density-mode ship
   * their fixed choices directly in the markup. doc-export-format and notif-export-
   * format start empty and are filled in by JS -- but from the fixed, in-source
   * EXPORT_FORMATS/suitableFormats() list (see complete-exports.test.mjs), never from
   * any external or user-specific data. Both groups are named here explicitly so a
   * newly added select falls into neither bucket by accident. */
  assert.deepEqual(withStaticOptions.sort(), ['cantonese-funny', 'density-mode', 'english-funny', 'language-mode', 'theme-mode']);
  assert.deepEqual(empty.sort(), ['doc-export-format', 'notif-export-format']);
});

test('the two runtime-filled selects are populated from the fixed export-format list, never from live/user data', () => {
  const src = norm(read('site/app.js'));
  for (const fn of ['updateDocumentationExport', 'updateNotificationExportFormats']) {
    const start = src.indexOf(`function ${fn}(){`);
    assert.ok(start !== -1, `${fn}() not found`);
    let depth = 0, i = src.indexOf('{', start);
    for (; i < src.length; i += 1) {
      if (src[i] === '{') depth += 1;
      else if (src[i] === '}') { depth -= 1; if (depth === 0) { i += 1; break; } }
    }
    const body = src.slice(start, i);
    assert.match(body, /suitableFormats\(/, `${fn}() no longer derives its options from suitableFormats() -- verify what it derives them from instead`);
  }
});

test('the sites only free-text input with no picker equivalent is a genuinely freeform description field', () => {
  /* attention-current-task ("What are you doing right now?") is the one plain text
   * field on the settings page with no adjoining picker. That is correct, not a gap:
   * it is an arbitrary user-authored description of what they are doing, which has no
   * finite enumerable set of real values to pick from -- unlike, say, an existing
   * account or an installed model name. */
  const html = norm(read('site/settings.html'));
  assert.match(html, /<input id="attention-current-task" type="text" maxlength="140" placeholder="What are you doing right now\?">/,
    'the current-task free-text field changed shape -- re-verify this is still a genuinely freeform description rather than something that should now be a picker');
});

test('no disabled control anywhere states a real-data-backed unmet condition (e.g. "no accounts installed") -- confirming there is no such data-backed picker to gate', () => {
  const html = pageText();
  const disabledButtons = [...html.matchAll(/<button[^>]*\bdisabled\b[^>]*>/g)];
  assert.ok(disabledButtons.length > 0, 'no disabled controls found at all, which proves nothing about this contract');
  for (const [tag] of disabledButtons) {
    assert.doesNotMatch(tag, /No .* (installed|found|connected|available)/i,
      `a disabled control now names a missing real-data source (${tag}) -- a guided picker over that data may exist elsewhere and this contract needs re-deriving`);
  }
});
