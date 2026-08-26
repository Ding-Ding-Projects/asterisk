/**
 * Contract: long-operation-progress on the pages-site.
 *
 * The canonical contract is one shape: an operation started from a dialog reports its
 * own progress inside that dialog rather than spinning, because a spinner and a hang
 * look identical from the outside. Two properties carry it, and the whole point is that
 * BOTH are present -- the submitting control is disabled for the run AND the handler
 * refuses a second entry, since a keyboard submit walks straight past a disabled button.
 * A third clause is about the expensive optional phase: offered as a choice, shown only
 * where it is relevant, saying plainly what declining leaves undone.
 *
 * The operation this site genuinely has is exporting every record set it owns. Worth
 * saying out loud rather than implying otherwise: on a browser holding four
 * notifications this finishes in milliseconds. What makes a real report worth having
 * anyway is that the unit count has no upper bound -- the changelog gains a version
 * every time this site is published -- and that a run stopped halfway has to be able to
 * say which files already exist. A spinner cannot say either thing.
 *
 * The behavioural half runs the real extracted source, against a recording page and
 * controllable timers, in the style `automatic-updates.test.mjs` established here. That
 * matters more than usual for a progress report: "there is a bar", "the button is
 * disabled" and "a run happened" are all true of a bar wired to nothing, and a
 * source-pattern test cannot tell those apart from a working one.
 *
 * The export ENGINE is not faked. The real slice of app.js is extracted and run, because
 * the one interesting decision here -- which formats may be offered when one format has
 * to serve five differently-shaped record sets -- is an intersection over that engine's
 * real suitability rules, and an intersection over a fake proves nothing about it.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
/* CRLF stripped before anything is matched across lines. A newline-only pattern against
 * a CRLF checkout matches nothing, and an assertion that matches nothing passes in the
 * one direction nobody notices. */
const read = (p) => readFileSync(resolve(siteRoot, p), 'utf8').replaceAll('\r\n', '\n');
const json = (p) => JSON.parse(read(p));

const app = read('app.js');
const settings = read('settings.html');
const styles = read('styles.css');
const registry = json('feature-registry.json');
const locales = json('locales/feature-registry.json');

/* ------------------------------------------------------------------ *
 * Running the real source.
 * ------------------------------------------------------------------ */

/** The source of one `function name(...)` declaration, brace-counted so nesting survives. */
function functionSource(src, name) {
  const found = src.indexOf(`function ${name}(`);
  assert.notEqual(found, -1, `function ${name} is not declared in site/app.js`);
  /* `runExportEverything` is declared `async function`; a slice beginning at the word
   * `function` would drop the modifier and then fail to parse its own `await`. */
  const start = src.slice(found - 6, found) === 'async ' ? found - 6 : found;
  const braceStart = src.indexOf('{', src.indexOf(')', start));
  let depth = 0;
  for (let i = braceStart; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error(`function ${name} is not brace-balanced in site/app.js`);
}

/**
 * The whole export engine, taken as one contiguous slice rather than reimplemented.
 *
 * It runs from the format list down to the end of `exportFilename`, which is every
 * converter, every suitability rule and every loss rule the site actually ships. The
 * format intersection this feature computes is only meaningful against those rules.
 */
function exportEngineSource(src) {
  const start = src.indexOf("const EXPORT_FORMATS = ['json'");
  assert.notEqual(start, -1, 'the export engine no longer begins with EXPORT_FORMATS in site/app.js');
  const tail = functionSource(src, 'exportFilename');
  const end = src.indexOf(tail, start);
  assert.notEqual(end, -1, 'exportFilename no longer follows EXPORT_FORMATS in site/app.js');
  return src.slice(start, end + tail.length);
}

/** The one line declaring the MIME map, which lives well away from the engine block. */
function mimeSource(src) {
  const line = src.split('\n').find((candidate) => candidate.includes('const EXPORT_MIME={'));
  assert.ok(line, 'EXPORT_MIME is no longer declared on a line of its own in site/app.js');
  return line;
}

function unitTableSource(src) {
  const start = src.indexOf('const EXPORT_EVERYTHING_UNITS=[');
  assert.notEqual(start, -1, 'EXPORT_EVERYTHING_UNITS is no longer declared in site/app.js');
  const end = src.indexOf('\n  ];', start);
  assert.notEqual(end, -1, 'EXPORT_EVERYTHING_UNITS is no longer terminated as expected in site/app.js');
  return src.slice(start, end + '\n  ];'.length);
}

function runStateSource(src) {
  const line = src.split('\n').find((candidate) => candidate.startsWith('  let exportRun={'));
  assert.ok(line, 'the exportRun record is no longer declared on its own line in site/app.js');
  return line;
}

const NAMES = [
  'flattenSettingRows', 'exportEverythingRows', 'exportEverythingCounts', 'planExportEverything',
  'exportEverythingFormats', 'summariseExportEverythingPlan', 'exportEverythingProgressLine',
  'exportEverythingStartDisabledReason', 'operationYield', 'renderExportEverything',
  'updateExportEverythingFormats', 'cancelExportEverything', 'runExportEverything',
  'initExportEverything',
];

/** A throwaway element that records what was done to it rather than shrugging. */
function makeElement(tag, id) {
  return {
    tagName: tag,
    id,
    hidden: false,
    disabled: false,
    checked: false,
    value: '',
    max: 1,
    textContent: '',
    innerHTML: '',
    attributes: {},
    listeners: {},
    modalOpens: 0,
    setAttribute(key, value) { this.attributes[key] = String(value); },
    removeAttribute(key) { delete this.attributes[key]; },
    addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); },
    showModal() { this.modalOpens += 1; },
    /* Deliberately ignores `disabled`, because that is the case the contract is about:
     * a disabled button is the visible guard, and something reaching the handler anyway
     * -- a keyboard submit, a stale reference -- is exactly what must be refused by the
     * handler itself. A fake that honoured `disabled` would make the second half of this
     * feature untestable while looking more realistic. */
    dispatch(type) { for (const handler of this.listeners[type] ?? []) handler(); },
  };
}

const IDS = [
  'export-everything-open', 'export-everything-dialog', 'export-everything-format',
  'export-everything-changelog', 'export-everything-optional', 'export-everything-decline',
  'export-everything-plan', 'export-everything-progress', 'export-everything-progress-text',
  'export-everything-disabled-reason', 'export-everything-reentry', 'export-everything-start',
  'export-everything-cancel',
];

const SAMPLE_SETTINGS = { theme: 'dark', fontScale: 100, attention: { focus: false, currentTask: 'x' } };
const SAMPLE_DESTINATIONS = [
  { id: 'dashboard', name: 'Dashboard', group: 'Overview', article: 'app/dashboard', description: 'A', icon: '@' },
  { id: 'about', name: 'About', group: 'App', article: 'app/about', description: 'B', icon: '#' },
];
const SAMPLE_NOTIFICATIONS = [
  { id: 'n1', title: 'One', body: 'first', time: 1756000000000 },
  { id: 'n2', title: 'Two', body: 'second', time: 1756000001000 },
  { id: 'n3', title: 'Three', body: 'third', time: 1756000002000 },
];
const SAMPLE_HISTORY = [
  { id: 'h1', time: 1756000003000, action: 'setting-changed', summary: 'theme changed to dark.' },
];
const SAMPLE_CHANGELOG = [
  { version: 'v0.1.5', date: '2026-08-20', category: 'Fixed', summary: 'A', commit: 'a'.repeat(40), commitUrl: '', exportedRange: '2026-08-20' },
  { version: 'v0.1.6', date: '2026-08-21', category: 'Added', summary: 'B', commit: 'b'.repeat(40), commitUrl: '', exportedRange: '2026-08-21' },
  { version: 'v0.1.6', date: '2026-08-21', category: 'Added', summary: 'C', commit: 'c'.repeat(40), commitUrl: '', exportedRange: '2026-08-21' },
  { version: 'v0.1.6', date: '2026-08-21', category: 'Added', summary: 'D', commit: 'd'.repeat(40), commitUrl: '', exportedRange: '2026-08-21' },
];

/**
 * Build a throwaway page and run the real export-everything operation against it.
 *
 * Every collaborator records rather than stubs. The downloads made, the notifications
 * raised and every progress sentence the run wrote are all kept, because "it exported"
 * and "it exported and never said which file it was on" are the two outcomes this
 * feature exists to tell apart.
 */
function loadRun({
  settingsSnapshot = SAMPLE_SETTINGS,
  destinations = SAMPLE_DESTINATIONS,
  notifications = SAMPLE_NOTIFICATIONS,
  history = SAMPLE_HISTORY,
  changelog = SAMPLE_CHANGELOG,
  includeChangelogChecked = true,
  present = IDS,
  breakUnit = null,
  vocabulary = (text) => text,
} = {}) {
  const elements = new Map();
  for (const id of present) elements.set(id, makeElement(id.endsWith('-dialog') ? 'dialog' : 'div', id));
  const $ = (id) => elements.get(id) ?? null;
  const changelogBox = $('export-everything-changelog');
  if (changelogBox) changelogBox.checked = includeChangelogChecked;

  const downloads = [];
  const raised = [];
  const timers = [];

  const state = { notifications };
  const body = `${exportEngineSource(app)}\n${mimeSource(app)}\n${unitTableSource(app)}\n${runStateSource(app)}\n`
    + `${NAMES.map((name) => functionSource(app, name)).join('\n')}\n`
    + 'return { '
    + `${NAMES.join(', ')}, EXPORT_EVERYTHING_UNITS, EXPORT_FORMATS, run: () => exportRun };`;

  // eslint-disable-line no-new-func -- deliberately re-running the real extracted source
  const api = new Function(
    '$', 'document', 'state', 'historyEntries', 'DESTINATIONS', 'CHANGELOG_MARKDOWN',
    'snapshotState', 'parseChangelog', 'changelogExportRows', 'download', 'notify',
    'applyVocabularyText', 'setTimeout', body,
  )(
    $,
    { createElement: (tag) => makeElement(tag, '') },
    state,
    history,
    destinations,
    'markdown-is-never-parsed-here',
    () => JSON.parse(JSON.stringify(settingsSnapshot)),
    () => ({ entries: changelog.length ? [{ version: 'v', date: 'd', changes: changelog }] : [] }),
    (entries) => (entries.length ? changelog : []),
    (name, text, mime) => {
      if (breakUnit && name.includes(breakUnit)) throw new Error('the disk said no');
      downloads.push({ name, text, mime });
    },
    (title, text, narration) => raised.push({ title, body: text, narration }),
    vocabulary,
    (handler) => { timers.push(handler); return timers.length; },
  );

  return { ...api, $, elements, state, downloads, notifications: raised, timers, render: api.renderExportEverything };
}

/** Drive a run to completion, releasing each queued yield and letting microtasks run. */
async function settle(h, promise) {
  let done = false;
  const wrapped = promise.then((value) => { done = true; return value; });
  for (let i = 0; i < 500 && !done; i += 1) {
    for (const handler of h.timers.splice(0)) handler();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  }
  assert.ok(done, 'the export run never settled -- it is parked on something the fake timer does not release');
  return wrapped;
}

const counts = (h) => h.exportEverythingCounts();
const plan = (h, includeChangelog = true) => h.planExportEverything({ includeChangelog, counts: counts(h) });

/* ------------------------------------------------------------------ *
 * The registry rows agree with the code.
 * ------------------------------------------------------------------ */

test('the site feature registry carries an implemented row for long-operation-progress', () => {
  const row = registry.features['long-operation-progress'];
  assert.ok(row, 'no long-operation-progress row in site/feature-registry.json');
  assert.equal(row.state, 'implemented',
    'the site now runs a real reported multi-unit operation, so "absent" is no longer the honest state');
  for (const file of ['site/app.js', 'site/settings.html', 'site/styles.css']) {
    assert.ok(row.files.includes(file), `the row no longer names ${file}`);
  }
});

test('the localization registry records the copy this feature added', () => {
  const row = locales.features['long-operation-progress'];
  assert.equal(row.state, 'localized', 'the feature ships four English and four Cantonese variants of its description');
  assert.deepEqual(row.copyKeys, ['exportEverythingDesc']);
  assert.ok(locales.knownCopyKeys.includes('exportEverythingDesc'),
    'exportEverythingDesc is not listed among the known COPY keys');
});

/* ------------------------------------------------------------------ *
 * The markup, and the two easy ways to ship it broken.
 * ------------------------------------------------------------------ */

test('the dialog is a real <dialog>, labelled by its own heading, carrying every element the run writes to', () => {
  assert.match(settings, /<dialog id="export-everything-dialog" class="overlay-card" aria-labelledby="export-everything-title" aria-describedby="export-everything-desc">/u,
    'the Export everything dialog is missing, or is no longer a real <dialog> labelled by its own heading');
  for (const id of IDS) {
    assert.ok(settings.includes(`id="${id}"`), `the dialog no longer carries #${id}`);
  }
  assert.match(settings, /<p id="export-everything-desc" data-copy="exportEverythingDesc">/u,
    'the description is no longer wired to the funny-level sliders');
});

test('the progress report is a real determinate <progress>, not a styled div and not an indeterminate sweep', () => {
  const element = settings.match(/<progress id="export-everything-progress"[^>]*>/u);
  assert.ok(element, '#export-everything-progress is no longer a <progress> element');
  assert.match(element[0], /\bmax="1"/u, 'the bar ships without a max, which is an indeterminate bar -- the spinner this contract refuses');
  assert.match(element[0], /\bvalue="0"/u, 'the bar ships without a value');
  assert.match(settings, /<label for="export-everything-progress">/u, 'the bar has no label of its own');
  assert.match(settings, /<p id="export-everything-progress-text" class="mono" role="status" aria-live="polite">/u,
    'the progress sentence is no longer announced -- a bar alone gives a screen reader a percentage and no words');
});

test('Start and Cancel are type="button", so starting a run does not submit the dialog closed', () => {
  /* Both live inside <form method="dialog">, where a button with no type is a submit
   * button and a submit CLOSES the dialog. Getting this wrong ships an operation whose
   * whole progress report is destroyed at the instant it begins -- and it looks
   * completely correct in the markup. */
  for (const id of ['export-everything-start', 'export-everything-cancel']) {
    const button = settings.match(new RegExp(`<button[^>]*id="${id}"[^>]*>`, 'u'));
    assert.ok(button, `#${id} is missing from settings.html`);
    assert.match(button[0], /type="button"/u,
      `#${id} is not type="button" -- inside <form method="dialog"> it would submit and close the dialog the moment it is pressed`);
  }
  assert.match(settings, /<button id="export-everything-open" type="button" class="text-button">Export everything&hellip;<\/button>/u,
    'the settings toolbar no longer opens the dialog, or its button is not type="button"');
});

test('the optional row and the empty status lines take no space when they have nothing to say', () => {
  assert.match(styles, /\.operation-optional\[hidden\]\{display:none\}/u,
    'a hidden optional row would still occupy the dialog');
  assert.match(styles, /#export-everything-decline:empty\{display:none\}/u, 'an empty decline line would leave a gap');
  assert.match(styles, /#export-everything-disabled-reason:empty,#export-everything-reentry:empty\{display:none\}/u,
    'the empty status lines would leave gaps');
  assert.doesNotMatch(styles, /\.operation-progress progress\{[^}]*animation/u,
    'the bar has gained an animation -- a bar that moves whatever is happening is a spinner');
});

/* ------------------------------------------------------------------ *
 * What the run would do, decided before it starts.
 * ------------------------------------------------------------------ */

test('every record set with rows is included, and an empty one is skipped by name with its reason', () => {
  const h = loadRun({ notifications: [], history: [] });
  const result = plan(h);
  assert.deepEqual(result.included.map((unit) => unit.id), ['settings', 'destinations', 'changelog']);
  assert.deepEqual(result.skipped.map((unit) => unit.id), ['notifications', 'history']);
  for (const unit of result.skipped) {
    assert.match(unit.reason, new RegExp(`^${unit.label} has no rows in this browser yet`, 'u'),
      'a skipped record set no longer says which one it was, or why');
  }
});

test('the row counts are real, and the totals are the sum of what will actually be written', () => {
  const h = loadRun();
  const result = plan(h);
  const byId = Object.fromEntries(result.included.map((unit) => [unit.id, unit.rows]));
  assert.equal(byId.destinations, SAMPLE_DESTINATIONS.length);
  assert.equal(byId.notifications, SAMPLE_NOTIFICATIONS.length);
  assert.equal(byId.history, SAMPLE_HISTORY.length);
  assert.equal(byId.changelog, SAMPLE_CHANGELOG.length);
  assert.equal(byId.settings, 4, 'the settings snapshot flattens to four leaves in this fixture');
  assert.equal(result.totalUnits, 5);
  assert.equal(result.totalRows, Object.values(byId).reduce((sum, n) => sum + n, 0));
});

test('declining the changelog moves it to skipped and says exactly what that leaves out', () => {
  const h = loadRun();
  const kept = plan(h, true);
  const declined = plan(h, false);
  assert.equal(kept.totalUnits, 5);
  assert.equal(declined.totalUnits, 4);
  assert.equal(declined.totalRows, kept.totalRows - SAMPLE_CHANGELOG.length);
  const skipped = declined.skipped.find((unit) => unit.id === 'changelog');
  assert.equal(skipped.reason, 'Changelog was declined. Its 4 rows are left out of this export.',
    'declining the expensive phase no longer says how much it leaves out');
});

test('the plan summary names every included record set with its count, and repeats every skip reason', () => {
  const h = loadRun({ notifications: [] });
  const result = plan(h, false);
  const summary = h.summariseExportEverythingPlan(result, 'csv');
  assert.match(summary, /^3 files will be written as CSV, covering \d+ rows: /u, `unexpected summary: ${summary}`);
  assert.ok(summary.includes('Local settings (4)') && summary.includes('Destination catalogue (2)'));
  for (const unit of result.skipped) assert.ok(summary.includes(unit.reason), `the summary drops: ${unit.reason}`);
});

test('a plan with nothing in it says so rather than offering a run that would write no file', () => {
  const h = loadRun({ settingsSnapshot: {}, destinations: [], notifications: [], history: [], changelog: [] });
  const result = plan(h);
  assert.equal(result.totalUnits, 0);
  const summary = h.summariseExportEverythingPlan(result, 'json');
  assert.match(summary, /^Nothing would be written: every record set on this page is either empty or declined\. /u,
    `unexpected summary: ${summary}`);
  /* And then names all five anyway, rather than stopping at the headline. "Nothing to
   * export" and "these five are the things that are empty" are different amounts of
   * help to somebody who expected a file and is working out which record set they
   * thought they had. */
  for (const unit of result.skipped) assert.ok(summary.includes(unit.reason), `the summary drops: ${unit.reason}`);
  assert.equal(result.skipped.length, 5);
  assert.equal(h.exportEverythingStartDisabledReason(h.run(), result),
    'Nothing is selected to write: every record set on this page is either empty or declined.');
});

/* ------------------------------------------------------------------ *
 * One format for the whole run, so the list offered is an intersection.
 * ------------------------------------------------------------------ */

test('the offered formats are the intersection across the record sets this run will write', () => {
  /* A column name that is neither a valid XML element name nor a plain SQL identifier
   * makes the real engine drop xml and sql for THAT record set. One format serves all
   * five, so it has to disappear from the whole run -- otherwise the other four would be
   * written correctly and the fifth damaged, silently, with nothing comparing them.
   *
   * Driven through the changelog, because it is the one unit whose columns come from
   * outside this table: `exportEverythingRows` maps the other four onto fixed key sets
   * of its own, so on ordinary data the intersection narrows nothing today. It is a
   * guard against the next record set somebody adds rather than a live difference, and
   * saying that plainly is better than a fixture that implies otherwise. */
  const h = loadRun();
  const wide = h.exportEverythingFormats(plan(h));
  const awkward = loadRun({
    changelog: [{ 'not a name': 1, version: 'v0.1.5', date: '2026-08-20', summary: 'A' }],
  });
  const narrow = awkward.exportEverythingFormats(plan(awkward));
  assert.ok(wide.includes('xml') && wide.includes('sql'), 'the ordinary fixture should offer xml and sql');
  assert.ok(!narrow.includes('xml') && !narrow.includes('sql'),
    'a record set the engine judges unsuitable for xml/sql no longer removes them from the whole run');
  assert.ok(narrow.includes('json') && narrow.includes('csv'), 'the intersection removed formats that are still suitable');
});

test('with nothing included, the full list is offered rather than an empty select nobody can use', () => {
  const h = loadRun({ settingsSnapshot: {}, destinations: [], notifications: [], history: [], changelog: [] });
  assert.deepEqual(h.exportEverythingFormats(plan(h)), h.EXPORT_FORMATS);
});

test('the select is filled from that intersection, and a chosen format survives a re-render', () => {
  const h = loadRun();
  h.updateExportEverythingFormats();
  const select = h.$('export-everything-format');
  const offered = [...select.innerHTML.matchAll(/<option value="([a-z]+)">/gu)].map((match) => match[1]);
  assert.deepEqual(offered, h.exportEverythingFormats(plan(h)));
  assert.equal(select.value, offered[0], 'the select does not settle on a real option');
  select.value = 'csv';
  h.updateExportEverythingFormats();
  assert.equal(select.value, 'csv', 'a chosen format is discarded on the next refresh');
});

/* ------------------------------------------------------------------ *
 * The report itself.
 * ------------------------------------------------------------------ */

test('the run reports real progress: the bar counts units, and the final line names every file', async () => {
  const h = loadRun();
  h.$('export-everything-format').value = 'json';
  const expected = plan(h);
  await settle(h, h.runExportEverything({ format: 'json', includeChangelog: true }));

  assert.equal(h.downloads.length, expected.totalUnits, 'the run did not write one file per included record set');
  const bar = h.$('export-everything-progress');
  assert.equal(bar.max, expected.totalUnits, 'the bar counts against something other than the units this run writes');
  assert.equal(bar.value, expected.totalUnits, 'the bar did not reach its own maximum on a completed run');

  const line = h.$('export-everything-progress-text').textContent;
  assert.match(line, /^Finished\. 5 of 5 written, \d+ rows\./u, `unexpected final line: ${line}`);
  for (const download of h.downloads) assert.ok(line.includes(download.name), `the final report never names ${download.name}`);
});

/**
 * Every sentence the page showed during one run, sampled from the element itself.
 *
 * Observed from the element rather than from the return value: a run that computed a
 * perfect progress line and never wrote it to the page is exactly the failure a
 * return-value assertion cannot see.
 */
async function linesDuringRun(h) {
  const seen = [];
  const observe = () => seen.push(h.$('export-everything-progress-text').textContent);
  const promise = h.runExportEverything({ format: 'json', includeChangelog: true });
  observe();
  for (let i = 0; i < 20 && h.timers.length; i += 1) {
    for (const handler of h.timers.splice(0)) handler();
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    observe();
  }
  await settle(h, promise);
  return seen;
}

test('the sentence changes as the run moves, naming each record set in turn -- it is a report, not a fixed string', async () => {
  const h = loadRun();
  const seen = await linesDuringRun(h);
  const running = seen.filter((text) => text.startsWith('Writing '));
  assert.ok(running.length >= 3, `expected several distinct in-progress lines on the page, saw: ${JSON.stringify(seen)}`);
  for (const label of ['Local settings', 'Destination catalogue', 'Notification history']) {
    assert.ok(running.some((text) => text.includes(label)), `no in-progress line ever named ${label}`);
  }
  assert.ok(new Set(running).size > 1, 'every in-progress line was identical, which is a spinner wearing a sentence');
});

test('every in-progress line names the record set its own index refers to', async () => {
  /* The off-by-one this exists to catch does not look like an off-by-one. It reads as
   * the report simply naming the wrong thing -- "Writing 3 of 5: Destination
   * catalogue" while the destinations finished two steps ago -- and it survives every
   * assertion of the form "some line mentions this label", because every label still
   * appears somewhere. Found by planting exactly that break and watching this file stay
   * green, which is what the negative script is for. */
  const h = loadRun();
  const included = plan(h).included.map((unit) => unit.label);
  const seen = await linesDuringRun(h);
  const running = seen.filter((text) => text.startsWith('Writing '));
  assert.ok(running.length >= 3, `expected several in-progress lines, saw: ${JSON.stringify(seen)}`);
  for (const line of running) {
    const parsed = line.match(/^Writing (\d+) of (\d+): (.+?) \(\d+ rows\)\./u);
    assert.ok(parsed, `an in-progress line no longer carries an index and a name: ${line}`);
    const [, index, total, label] = parsed;
    assert.equal(Number(total), included.length, `the line counts against the wrong total: ${line}`);
    assert.ok(Number(index) >= 1 && Number(index) <= included.length, `the index is outside the run: ${line}`);
    assert.equal(label, included[Number(index) - 1],
      `the report says it is writing ${index} of ${total} and names ${label}, which is number ${included.indexOf(label) + 1}`);
  }
});

test('between units the report counts what is done rather than naming a record set nobody is writing', () => {
  const h = loadRun();
  assert.equal(h.exportEverythingProgressLine({
    state: 'running', total: 5, done: 2, rowsTotal: 14, rowsDone: 6, current: '', currentRows: 0, written: [],
  }), '2 of 5 written, 6 of 14 rows done.');
});

test('both kinds of line actually reach the page, so neither is a branch nothing can reach', async () => {
  /* The one that is easy to lose is the count between units. Rendered and then
   * superseded by the next announcement inside the same synchronous block, it never
   * paints, and it then reads in the source exactly like a line somebody sees. The run
   * has to pause after it as well as after an announcement for both to be real. */
  const h = loadRun();
  const seen = await linesDuringRun(h);
  assert.ok(seen.some((line) => /^Writing \d+ of \d+: /u.test(line)),
    `no announcement line ever reached the page: ${JSON.stringify(seen)}`);
  assert.ok(seen.some((line) => /^\d+ of \d+ written, \d+ of \d+ rows done\.$/u.test(line)),
    `no between-units count ever reached the page, so that branch is unreachable: ${JSON.stringify(seen)}`);
});

test('the progress sentence carries the counts in words as well as on the bar', () => {
  const h = loadRun();
  assert.equal(h.exportEverythingProgressLine({
    state: 'running', total: 5, done: 2, rowsTotal: 14, rowsDone: 6, current: 'Changelog', currentRows: 4, written: [],
  }), 'Writing 3 of 5: Changelog (4 rows). 6 of 14 rows done.');
  assert.equal(h.exportEverythingProgressLine({
    state: 'idle', total: 0, done: 0, rowsTotal: 0, rowsDone: 0, current: '', currentRows: 0, written: [],
  }), 'Not started. Nothing has been written.');
});

/* ------------------------------------------------------------------ *
 * Both halves of the duplicate-submission guard.
 * ------------------------------------------------------------------ */

test('the Start control is disabled for the whole run, and says which condition is unmet', async () => {
  const h = loadRun();
  const start = h.$('export-everything-start');
  const promise = h.runExportEverything({ format: 'json', includeChangelog: true });
  assert.equal(start.disabled, true, 'the submitting control is not disabled while the run is in flight');
  assert.equal(start.attributes.title, 'An export is already running. Wait for it to finish, or cancel it.');
  assert.equal(h.$('export-everything-disabled-reason').textContent, start.attributes.title,
    'the reason is only in a tooltip, so a keyboard or touch user is told nothing');
  assert.equal(h.$('export-everything-cancel').disabled, false, 'cancel is not reachable during the run it cancels');
  await settle(h, promise);
  assert.equal(start.disabled, false, 'the control never came back');
  assert.equal(start.attributes.title, undefined, 'a stale disabled reason is left on the control');
});

test('the handler itself refuses a second entry, counts it, and shows it -- the disabled button is not the guard', async () => {
  const h = loadRun();
  const first = h.runExportEverything({ format: 'json', includeChangelog: true });
  /* Straight into the handler, exactly as a keyboard submit or a stale reference would
   * arrive, with `disabled` never consulted. */
  const refusedA = await h.runExportEverything({ format: 'json', includeChangelog: true });
  const refusedB = await h.runExportEverything({ format: 'csv', includeChangelog: false });
  assert.equal(refusedA.started, false);
  assert.equal(refusedA.reason, 'an export is already running');
  assert.equal(refusedB.started, false);
  assert.equal(h.$('export-everything-reentry').textContent,
    '2 further start requests were refused while an export was already running.',
    'the refusals are swallowed rather than reported');
  const result = await settle(h, first);
  assert.equal(h.downloads.length, result.plan.totalUnits,
    'a refused second entry still managed to write files, so it was not refused at all');
  assert.equal(new Set(h.downloads.map((download) => download.name)).size, h.downloads.length,
    'a file was written twice, which is what a missing re-entry guard looks like');
});

test('pressing Start twice writes one run, because the click handler goes through the same refusal', async () => {
  const h = loadRun();
  h.initExportEverything();
  const start = h.$('export-everything-start');
  start.dispatch('click');
  start.dispatch('click');
  await settle(h, Promise.resolve());
  assert.ok(h.downloads.length > 0, 'no run started at all, so this proves nothing about the second press');
  assert.equal(new Set(h.downloads.map((download) => download.name)).size, h.downloads.length,
    'the second press produced duplicate files');
  assert.match(h.$('export-everything-reentry').textContent, /^1 further start request was refused/u);
});

/* ------------------------------------------------------------------ *
 * Stopping early, and being honest about it.
 * ------------------------------------------------------------------ */

test('cancelling while the first record set is announced stops before anything is written', async () => {
  const h = loadRun();
  const promise = h.runExportEverything({ format: 'json', includeChangelog: true });
  /* The run has announced unit one and parked, which is the window in which somebody
   * reads the name and decides they did not want it after all. */
  assert.equal(h.downloads.length, 0, 'the run wrote a file before the browser could paint the name of it');
  assert.match(h.$('export-everything-progress-text').textContent, /^Writing 1 of 5: Local settings/u);
  assert.equal(h.cancelExportEverything(), true);
  const result = await settle(h, promise);
  assert.equal(result.cancelled, true);
  assert.equal(h.downloads.length, 0, 'a cancelled run wrote the unit it had only announced');
  assert.equal(h.$('export-everything-progress-text').textContent,
    'Cancelled after 0 of 5. No file was written.');
});

test('cancelling mid-run keeps what was written and names it, rather than claiming nothing happened', async () => {
  const h = loadRun();
  const promise = h.runExportEverything({ format: 'json', includeChangelog: true });
  for (const handler of h.timers.splice(0)) handler();
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  assert.equal(h.downloads.length, 1, 'the first unit had not been written after one turn of the loop');
  assert.equal(h.cancelExportEverything(), true);

  /* Sampled from the moment of the cancel onward, because the outcome alone cannot
   * distinguish the two checks the loop makes. Dropping the one at the top of the loop
   * leaves the outcome identical -- same files, same sentence -- and changes only what
   * the page SAYS on the way there: it announces the next record set, and then reports
   * a run that stopped before it. A flash of "Writing 2 of 5" on a run that wrote one
   * file is the report contradicting itself. */
  const after = [];
  let done = false;
  const wrapped = promise.then((value) => { done = true; return value; });
  for (let i = 0; i < 20 && !done; i += 1) {
    for (const handler of h.timers.splice(0)) handler();
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    after.push(h.$('export-everything-progress-text').textContent);
  }
  const result = await wrapped;
  assert.equal(result.cancelled, true);
  assert.equal(h.downloads.length, 1, 'a cancelled run kept writing files after it was cancelled');
  assert.deepEqual(result.written, ['ding-pbx-page-settings.json']);
  assert.ok(!after.some((line) => line.startsWith('Writing ')),
    `the page announced a record set after the run had been cancelled: ${JSON.stringify(after)}`);
  assert.equal(h.$('export-everything-progress-text').textContent,
    'Cancelled after 1 of 5. Already written: ding-pbx-page-settings.json.',
    'a cancelled run does not say which files already exist, which is the one thing only it can know');
});

test('cancelling when nothing is running changes nothing and says so', () => {
  const h = loadRun();
  assert.equal(h.cancelExportEverything(), false);
  assert.equal(h.run().state, 'idle');
  assert.equal(h.run().cancelRequested, false);
});

test('a unit that fails names itself, keeps the files already written, and stops the run there', async () => {
  const h = loadRun({ breakUnit: 'ding-pbx-notifications' });
  const result = await settle(h, h.runExportEverything({ format: 'json', includeChangelog: true }));
  assert.equal(result.failed, true);
  assert.deepEqual(h.downloads.map((download) => download.name),
    ['ding-pbx-page-settings.json', 'ding-pbx-destinations.json']);
  const line = h.$('export-everything-progress-text').textContent;
  assert.match(line, /^Stopped after 2 of 5: Notification history could not be written \(the disk said no\)\./u,
    `a failed unit no longer names itself: ${line}`);
  assert.ok(line.includes('ding-pbx-destinations.json'),
    'a failed run does not name the good files it already produced, so somebody would delete them');
  assert.equal(h.notifications.length, 0, 'a failed run still announced that the export finished');
});

test('a run with nothing to write refuses to start rather than reporting an empty success', async () => {
  const h = loadRun({ settingsSnapshot: {}, destinations: [], notifications: [], history: [], changelog: [] });
  const result = await h.runExportEverything({ format: 'json', includeChangelog: true });
  assert.equal(result.started, false);
  assert.equal(result.reason, 'nothing to write');
  assert.equal(h.downloads.length, 0);
  assert.equal(h.$('export-everything-progress-text').textContent,
    'Stopped after 0 of 0: nothing was selected to write. No file was written.');
});

/* ------------------------------------------------------------------ *
 * The expensive optional phase.
 * ------------------------------------------------------------------ */

test('the changelog choice is shown only where it is relevant, with what declining costs beside it', () => {
  const withChangelog = loadRun();
  withChangelog.render();
  assert.equal(withChangelog.$('export-everything-optional').hidden, false,
    'the choice is hidden on a build that actually has a changelog to decline');
  assert.match(withChangelog.$('export-everything-decline').textContent,
    /^The changelog is the only record set here with no upper bound/u,
    'the decline sentence no longer says what leaving it out costs');
  assert.ok(withChangelog.$('export-everything-decline').textContent.includes('commit ids'),
    'the decline sentence no longer names what is actually left out');

  const without = loadRun({ changelog: [] });
  without.render();
  assert.equal(without.$('export-everything-optional').hidden, true,
    'a choice is offered to leave out something that does not exist -- a question with one answer');
  assert.equal(without.$('export-everything-decline').textContent, '',
    'a decline sentence is shown for a record set that is not there');
});

test('declining the changelog really does leave it out of the files written', async () => {
  const h = loadRun({ includeChangelogChecked: false });
  await settle(h, h.runExportEverything({ format: 'json', includeChangelog: false }));
  assert.equal(h.downloads.length, 4);
  assert.ok(!h.downloads.some((download) => download.name.includes('changelog')),
    'the changelog was written despite being declined');
});

/* ------------------------------------------------------------------ *
 * What goes into the files, and what deliberately does not.
 * ------------------------------------------------------------------ */

test('the settings file is flat rows of dotted paths and scalars, so no format has to report a loss', () => {
  const h = loadRun();
  const rows = h.exportEverythingRows('settings');
  assert.deepEqual(rows, [
    { setting: 'theme', value: 'dark' },
    { setting: 'fontScale', value: '100' },
    { setting: 'attention.focus', value: 'false' },
    { setting: 'attention.currentTask', value: 'x' },
  ]);
  for (const row of rows) assert.equal(typeof row.value, 'string', 'a settings value is not a scalar');
});

test('the notification array cannot reach the settings file, because the snapshot drops it first', () => {
  /* Two halves, because either alone is satisfied by a broken build: the run reads the
   * snapshot rather than the live state, and the snapshot really is what removes the
   * array. Notifications are this run's own third unit; exporting them twice, under two
   * different shapes, is the failure being refused. */
  assert.match(app, /^  function snapshotState\(\)\{const clone=JSON\.parse\(JSON\.stringify\(state\)\);delete clone\.notifications;return clone\}$/mu,
    'snapshotState no longer drops the notification array');
  assert.match(functionSource(app, 'exportEverythingRows'), /case 'settings':return flattenSettingRows\(snapshotState\(\),''\)/u,
    'the settings unit no longer reads the redacted snapshot');
});

test('the destination catalogue exports its facts and not its rail glyph', () => {
  const h = loadRun();
  const rows = h.exportEverythingRows('destinations');
  assert.deepEqual(Object.keys(rows[0]), ['id', 'name', 'group', 'article', 'description']);
  assert.ok(!('icon' in rows[0]), 'the icon glyph is now a column, which is chrome rather than a fact');
});

test('an unknown unit is refused rather than silently exporting nothing', () => {
  const h = loadRun();
  assert.throws(() => h.exportEverythingRows('invented'), /Unknown export unit: invented/u);
});

test('nothing here reaches a network: the whole operation is text and a local download', () => {
  const source = [unitTableSource(app), ...NAMES.map((name) => functionSource(app, name))].join('\n');
  for (const primitive of ['fetch(', 'XMLHttpRequest', 'navigator.sendBeacon', 'WebSocket', 'EventSource']) {
    assert.ok(!source.includes(primitive),
      `the export-everything run now uses ${primitive} -- every record set here is local, and an export that phones home is a different feature`);
  }
});

/* ------------------------------------------------------------------ *
 * Wiring. A feature reached from nowhere is dead code that tests green.
 * ------------------------------------------------------------------ */

test('init() reaches initExportEverything on a statement boundary, not behind a comment', () => {
  assert.match(app, /^\s*function init\(\)\{[\s\S]*?initUpdates\(\);initExportEverything\(\);initTimeAwareness\(\)/mu,
    'init() no longer calls initExportEverything -- or the call has been commented out, which a bare substring needle would not notice');
});

test('the open button opens the dialog, and every control in it is wired', () => {
  const h = loadRun();
  h.initExportEverything();
  h.$('export-everything-open').dispatch('click');
  assert.equal(h.$('export-everything-dialog').modalOpens, 1, 'the open button does not open the dialog');
  for (const [id, type] of [['export-everything-format', 'change'], ['export-everything-changelog', 'change'],
    ['export-everything-start', 'click'], ['export-everything-cancel', 'click']]) {
    assert.ok((h.$(id).listeners[type] ?? []).length > 0, `#${id} has no ${type} listener, so it does nothing at all`);
  }
  assert.ok(h.$('export-everything-plan').textContent.length > 0, 'opening the dialog reports no plan');
});

test("reopening after a finished run reports nothing rather than the last run's tail", async () => {
  const h = loadRun();
  h.initExportEverything();
  await settle(h, h.runExportEverything({ format: 'json', includeChangelog: true }));
  assert.match(h.$('export-everything-progress-text').textContent, /^Finished\./u);
  h.$('export-everything-open').dispatch('click');
  assert.equal(h.$('export-everything-progress-text').textContent, 'Not started. Nothing has been written.',
    'a leftover Finished line reads as this attempt having already succeeded');
  assert.equal(h.$('export-everything-progress').value, 0, 'the bar still shows the last run');
});

test('a page without the dialog is skipped rather than crashed on', () => {
  const h = loadRun({ present: [] });
  assert.doesNotThrow(() => h.initExportEverything());
  assert.doesNotThrow(() => h.renderExportEverything());
});

test('every sentence the dialog shows passes through the personal-vocabulary walker', () => {
  const h = loadRun({ vocabulary: (text) => `<<${text}>>` });
  h.render();
  for (const id of ['export-everything-plan', 'export-everything-progress-text', 'export-everything-decline']) {
    assert.match(h.$(id).textContent, /^<<.*>>$/u, `#${id} is written without going through applyVocabularyText`);
  }
});

test('a completed run says so as a message box, in both languages, and claims only what happened', async () => {
  const h = loadRun();
  const result = await settle(h, h.runExportEverything({ format: 'json', includeChangelog: true }));
  assert.equal(h.notifications.length, 1);
  const [note] = h.notifications;
  assert.equal(note.title, 'Export finished');
  assert.match(note.body, new RegExp(`Wrote ${result.plan.totalUnits} files covering \\d+ rows\\.`, 'u'));
  assert.ok(note.narration.en && note.narration.zh, 'the narrated line is not bilingual');
  assert.equal(note.narration.category, 'export');
});
