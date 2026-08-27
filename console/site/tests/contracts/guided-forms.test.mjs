/**
 * Contract: guided forms on the pages-site.
 *
 * The canon's guided-forms requirement is about a specific pattern: wherever a value
 * could be enumerated, picked, or defaulted from REAL live data (existing accounts,
 * installed items, a project's own records), the surface offers that instead of a
 * blank freeform field -- the app's endpoint wizard is the named reference example.
 *
 * This static site has no backend and no accounts, but it does now have one genuine
 * instance of the pattern: the local-history panel's action filter (#history-action-
 * filter) starts empty in markup and is populated at runtime from historyEntries --
 * this browser's own recorded local revisions, a real per-visitor record, not a fixed
 * in-source list. That is a real, if narrow, example of "the project's own records"
 * driving a picker, so it is called out and tested for on its own rather than folded
 * silently into the two pre-existing export-format selects, which are populated from a
 * fixed list and stay outside this pattern for that reason. Its history is otherwise
 * unchanged: the remaining five plain <select> elements (theme, language, density, and
 * the two export-format pickers) are still hard-coded or list-driven, not this pattern,
 * and there is still no <datalist>, no other real-data picker, and no disabled control
 * naming a missing real-data source.
 *
 * This file re-derives the current state rather than trusting a hand-written note: it
 * counts every <select> and confirms each one's options are either a fixed literal
 * list, list-derived from the in-source export-format list, or the one real local-
 * data-driven exception -- and confirms that exception really is driven by this
 * browser's own recorded data (historyEntries), never by external or fetched data.
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

/**
 * The pages plus the builder that fills them in.
 *
 * The download surfaces became templates when the site started resolving a real
 * release, so the markup for the unavailable state -- including the only disabled
 * control on the whole site -- now lives in `build.mjs` as the strings it substitutes
 * when no manifest resolves. Reading the page sources alone therefore found nothing to
 * check, and the disabled-control test below correctly refused to pass on an empty set
 * rather than reporting a vacuous success. Reading both is what restores it to checking
 * the thing it was written to check.
 */
const pageText = () => norm([...PAGE_NAMES.map((name) => read(`site/${name}.html`)), read('site/build.mjs')].join('\n'));

test('there is no <datalist> anywhere on the site -- the one native picker-over-real-data primitive is unused', () => {
  const html = pageText();
  assert.doesNotMatch(html, /<datalist/i, 'a <datalist> now exists -- guided-forms may have been partially added; re-derive this contract by hand');
  assert.doesNotMatch(html, /\blist="/i, 'an input now references list="..." (a datalist binding) -- re-derive this contract by hand');
});

test('every <select> on the site is either a fixed, hard-coded option list, or one of the two known runtime-filled exceptions -- one list-derived, one real-data-driven', () => {
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
   * any external or user-specific data. changelog-export-format joined those two on
   * 2026-08-26 and is filled the same way, from suitableFormats() over whichever
   * changelog rows are currently on screen. history-action-filter also starts empty and
   * is filled in by JS, but from this browser's own recorded local-history actions
   * (historyEntries) -- real per-visitor data, checked in the next test.
   * changelog-date-preset joined the static bucket on the same day: its five named
   * ranges are fixed choices in the markup, and the changelog contract pins that list
   * equal to the set of presets the code can actually compute, so an option that would
   * do nothing when chosen fails there rather than here. narration-language joined the
   * static bucket on 2026-08-26 with the spoken narrator, and the narration contract
   * pins its three options equal to the selections narrationTracksFor understands.
   * narration-voice-en and narration-voice-zh joined the empty bucket the same day:
   * like history-action-filter they are filled from real per-visitor data -- the
   * speech voices this browser actually reports -- which is precisely why they cannot
   * be a fixed list in the markup, since nothing can know what is installed on a
   * computer it has not asked. export-everything-format joined the empty bucket on
   * 2026-08-26 with the Export everything dialog, filled the same way as the other
   * three format pickers -- from suitableFormats(), narrowed to the intersection
   * across the record sets that run will actually write, since one format is chosen
   * for all of them. auth-export-format joined the empty bucket on 2026-08-26 with the
   * built-in authenticator, filled from suitableFormats() over the selected accounts
   * exactly like the other format pickers. auth-algorithm and auth-digits joined the
   * static bucket the same day, and they are fixed lists for a reason worth stating:
   * they are not preferences but the set of parameters this page can actually compute a
   * code from, so an option outside them would be one that produces codes no service
   * accepts. The authenticator contract pins both lists equal to what the code accepts.
   * All eleven empty-in-markup selects are named here explicitly so a newly added select
   * falls into neither bucket by accident. */
  assert.deepEqual(withStaticOptions.sort(),
    ['auth-algorithm', 'auth-digits', 'cantonese-funny', 'changelog-date-preset', 'density-mode',
      'english-funny', 'language-mode', 'narration-language', 'theme-mode']);
  /* Three more joined the empty bucket on 2026-08-26 with the Support Tickets desk, and
   * they are the same two shapes already listed above rather than a third: support-export-
   * format is filled from suitableFormats() over whichever tickets are selected, exactly
   * like the other export selects, and support-category and support-severity are filled
   * from the in-source SUPPORT_CATEGORIES and SUPPORT_SEVERITIES lists. Those two are
   * fixed choices and could have shipped in the markup; they are built from the constants
   * instead so that the validator refusing an unknown value and the list offering the
   * values cannot come to disagree -- which is checked in that feature's own contract
   * rather than here. */
  assert.deepEqual(empty.sort(), ['auth-export-format', 'changelog-export-format', 'doc-export-format',
    'export-everything-format', 'history-action-filter', 'narration-voice-en', 'narration-voice-zh',
    'notif-export-format', 'support-category', 'support-export-format', 'support-severity']);
});

test('the five export-format selects are populated from the fixed export-format list, never from live/user data', () => {
  const src = norm(read('site/app.js'));
  /* `exportEverythingFormats` rather than its caller. The Export everything dialog
   * keeps the suitability decision in a pure function, so the intersection across
   * record sets can be tested without a DOM, and `updateExportEverythingFormats`
   * only writes that answer into the select. Naming the caller here would look
   * consistent with the other three and check nothing at all. */
  for (const fn of ['updateDocumentationExport', 'updateNotificationExportFormats', 'updateChangelogExport',
    'exportEverythingFormats', 'authUpdateExportFormats']) {
    const start = src.indexOf(`function ${fn}(`);
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

test('history-action-filter IS the real exception -- genuinely populated from this browser\'s own recorded local-history entries, not a fixed list', () => {
  /* This is the one place on the site the canonical guided-forms pattern -- a picker
   * enumerated from real, local, per-visitor records rather than a blank field or a
   * fixed list -- actually exists. renderHistory() rebuilds the option list from
   * historyActionOptions(), which derives the set from historyEntries itself (the
   * append-only local-history array), rather than from any hard-coded action list. */
  const src = norm(read('site/app.js'));
  assert.match(src, /function historyActionOptions\(\)\{return \[\.\.\.new Set\(historyEntries\.map\(item=>item\.action\)\)\]\.sort\(\)\}/,
    'historyActionOptions() no longer derives the action list from the real historyEntries array -- re-check whether this is still the real-data-driven exception');
  const start = src.indexOf('function renderHistory(');
  assert.ok(start !== -1, 'renderHistory() not found');
  let depth = 0, i = src.indexOf('{', start);
  for (; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') { depth -= 1; if (depth === 0) { i += 1; break; } }
  }
  const body = src.slice(start, i);
  assert.match(body, /historyActionOptions\(\)/, 'renderHistory() no longer calls historyActionOptions() to populate #history-action-filter');
  assert.match(body, /\$\('history-action-filter'\)/, 'renderHistory() no longer touches #history-action-filter directly');
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
