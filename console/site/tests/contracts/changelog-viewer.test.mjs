/**
 * Contract: changelog-viewer.
 *
 * The site now ships a real changelog: every released version, newest first, each
 * change line carrying the real commit that made it. So this file stopped being a pin
 * on an absence and became a contract on a feature.
 *
 * Two things make a changelog viewer worth testing carefully, and neither is the list.
 *
 * The first is that its content is a FACTUAL EXTERNAL RECORD. Every other string this
 * site renders is its own copy, restyled by the funny sliders and rewritten by the
 * personal-vocabulary walker. A change summary is neither: it is what the release said,
 * and a viewer that quietly restyles it, or lets a local vocabulary file rewrite a
 * commit summary, has stopped being a record of anything. So the entries carry
 * `data-no-vocab`, and the funny-level copy reaches the description around them and
 * nothing inside them.
 *
 * The second is the commit link, which is the only part of an entry a reader can check
 * for themselves. A wrong one is worse than none, because it sends them somewhere
 * confidently irrelevant -- so `changelogCommitUrl` refuses anything that is not exactly
 * 40 hexadecimal characters and refuses to invent a repository, and the site build
 * verifies every referenced id against real git objects before it will emit a link at
 * all.
 *
 * The behavioural half runs the real extracted source rather than asserting patterns
 * over it, in the style `app-display-name.test.mjs` and `complete-exports.test.mjs`
 * already established here -- and it runs it against the REAL generated release history
 * rather than an invented fixture, because a parser proved only against text written to
 * suit it has been proved against nothing.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const consoleRoot = resolve(siteRoot, '..');
/* CRLF stripped before anything is matched across lines. A newline-only pattern against
 * a CRLF checkout matches nothing, and an assertion that matches nothing passes in the
 * one direction nobody notices. */
const read = (p) => readFileSync(resolve(siteRoot, p), 'utf8').replaceAll('\r\n', '\n');
const readConsole = (p) => readFileSync(resolve(consoleRoot, p), 'utf8').replaceAll('\r\n', '\n');
const json = (p) => JSON.parse(read(p));

const PAGES = ['index', 'product', 'documentation', 'downloads', 'status', 'settings'];
const pageSource = Object.fromEntries(PAGES.map((name) => [name, read(`${name}.html`)]));
const app = read('app.js');
const build = read('build.mjs');
const downloads = pageSource.downloads;
const registry = json('feature-registry.json');
const locales = json('locales/feature-registry.json');

/* ------------------------------------------------------------------ *
 * The real release history, read from the file the site build injects.
 * ------------------------------------------------------------------ */

const GENERATED_BUNDLE = 'app/renderer/src/generated/changelog-bundle.ts';

/** The real generated Markdown -- the exact bytes `site/build.mjs` bakes into app.js. */
function realChangelogMarkdown() {
  const src = readConsole(GENERATED_BUNDLE);
  const marker = 'export const CHANGELOG_MARKDOWN: string = ';
  const start = src.indexOf(marker);
  assert.notEqual(start, -1, `${GENERATED_BUNDLE} no longer exports CHANGELOG_MARKDOWN`);
  const from = start + marker.length;
  const lineEnd = src.slice(from).search(/[\r\n]/u);
  const literal = src.slice(from, from + lineEnd).trim().replace(/;$/u, '');
  return JSON.parse(literal);
}

const REAL_MARKDOWN = realChangelogMarkdown();
const REAL_REPOSITORY = 'https://github.com/anthropic-experimental/asterisk';

test('the generated bundle this contract reads really does carry release history, so nothing below passes vacuously', () => {
  assert.ok(REAL_MARKDOWN.length > 200,
    `the generated changelog is only ${REAL_MARKDOWN.length} characters -- every behavioural test below would be proving nothing`);
  assert.ok((REAL_MARKDOWN.match(/^## /gmu) || []).length >= 3,
    'the generated changelog holds fewer than three versions, so filtering and searching could not be exercised');
});

/* ------------------------------------------------------------------ *
 * Running the real source.
 * ------------------------------------------------------------------ */

/** The source of one `function name(...)` declaration, brace-counted so nesting survives. */
function functionSource(src, name) {
  const start = src.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `function ${name} is not declared in site/app.js`);
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

/** The literal source between two anchors, both of which must exist exactly once. */
function regionSource(src, startAnchor, endAnchor) {
  assert.equal(src.split(startAnchor).length - 1, 1, `expected exactly one ${JSON.stringify(startAnchor)} in site/app.js`);
  assert.equal(src.split(endAnchor).length - 1, 1, `expected exactly one ${JSON.stringify(endAnchor)} in site/app.js`);
  const start = src.indexOf(startAnchor);
  const end = src.indexOf(endAnchor, start);
  assert.ok(end > start, `${JSON.stringify(endAnchor)} appears before ${JSON.stringify(startAnchor)} in site/app.js`);
  return src.slice(start, end);
}

/* The grammar constants, taken whole rather than retyped. A test carrying its own copy
 * of a production regular expression proves nothing about the original -- and gets its
 * escaping wrong, which this repository has been bitten by before. */
const CHANGELOG_CONSTANTS = regionSource(app, '  const CHANGELOG_SHA40 = ', '\n\n  function parseChangelog(');
/* The export engine, run for real so an exported file is a real exported file rather
 * than whatever a stub decided to hand back. */
const EXPORT_ENGINE = regionSource(app, '  const EXPORT_FORMATS = ',
  '\n  // ============================================================================\n  // Selection and bulk-operation model');

const NAMES = [
  'parseChangelog', 'changelogCommitUrl', 'changelogFilterByDate', 'changelogSearch',
  'changelogRangeLabel', 'changelogExportRows', 'changelogDateBounds', 'changelogPresetRange',
  'changelogVisibleEntries', 'changelogEntryMarkup', 'renderChangelog', 'updateChangelogExport',
  'changelogExportText', 'matchText', 'escapeHtml',
];

/**
 * Build a throwaway page and run the real changelog code against it.
 *
 * Every collaborator is a recorder rather than a shrug: the vocabulary walker records
 * that it was asked to run, the element registry records which ids were reached for, and
 * `regexState` is a real Map so the regular-expression path is the real one rather than
 * a described one.
 */
function loadChangelog({
  markdown = REAL_MARKDOWN,
  repository = REAL_REPOSITORY,
  from = '', to = '', fromBad = false, toBad = false,
  query = '', format = '',
} = {}) {
  const entriesEl = { innerHTML: '' };
  const countEl = { textContent: '' };
  const problemsEl = { textContent: '' };
  const lossEl = { textContent: '' };
  const formatEl = { innerHTML: '', value: format };
  const searchEl = { value: query };
  const fromEl = { value: from, validity: { badInput: fromBad } };
  const toEl = { value: to, validity: { badInput: toBad } };
  const elements = {
    'changelog-entries': entriesEl,
    'changelog-count': countEl,
    'changelog-problems': problemsEl,
    'changelog-export-loss': lossEl,
    'changelog-export-format': formatEl,
    'changelog-search': searchEl,
    'changelog-date-from': fromEl,
    'changelog-date-to': toEl,
  };
  const idsAsked = [];
  const $ = (id) => {
    idsAsked.push(id);
    return elements[id] ?? null;
  };
  const vocabularyRuns = [];
  const regexState = new Map();

  const body = `${CHANGELOG_CONSTANTS}\n${EXPORT_ENGINE}\n`
    + `${NAMES.map((name) => functionSource(app, name)).join('\n')}\n`
    + 'return { ' + NAMES.join(', ') + ', CHANGELOG_PRESETS, suitableFormats };';
  const api = new Function(
    '$', 'CHANGELOG_MARKDOWN', 'CHANGELOG_REPOSITORY_URL', 'regexState', 'applyVocabulary', body,
  )($, markdown, repository, regexState, () => vocabularyRuns.push(true));

  return {
    ...api, elements, entriesEl, countEl, problemsEl, lossEl, formatEl,
    searchEl, fromEl, toEl, idsAsked, vocabularyRuns, regexState,
  };
}

/* ------------------------------------------------------------------ *
 * The grammar, proved against the real generated release history.
 * ------------------------------------------------------------------ */

test('the parser reads the real generated release history into real versions, dates and commits', () => {
  const api = loadChangelog();
  const { entries } = api.parseChangelog(REAL_MARKDOWN);
  assert.ok(entries.length >= 3, `parsed only ${entries.length} versions out of the real generated changelog`);
  for (const entry of entries) {
    assert.match(entry.date, /^\d{4}-\d{2}-\d{2}$/u, `version ${entry.version} carries a date that is not an ISO calendar date`);
    assert.ok(entry.version.length > 0, 'a parsed entry has an empty version');
    for (const change of entry.changes) {
      assert.match(change.commit, /^[0-9a-f]{40}$/iu,
        `"${change.summary}" carries a commit id that is not 40 hexadecimal characters`);
      assert.ok(change.summary.length > 0, `version ${entry.version} carries an empty change summary`);
      assert.ok(change.category.length > 0, `version ${entry.version} carries a change with no category`);
    }
  }
});

test('every commit id the parser found is really present in the generated source it was read from', () => {
  /* The parser inventing a plausible-looking SHA is the one failure that would produce a
   * link going somewhere confidently irrelevant, so the ids are checked back against the
   * bytes rather than only against their own shape. */
  const api = loadChangelog();
  const { entries } = api.parseChangelog(REAL_MARKDOWN);
  const found = entries.flatMap((entry) => entry.changes.map((change) => change.commit));
  assert.ok(found.length > 0, 'no commits were parsed at all, so this check would prove nothing');
  for (const commit of found) {
    assert.ok(REAL_MARKDOWN.includes(`(${commit})`),
      `${commit} does not appear in the generated changelog it was supposedly read from`);
  }
});

test('a line that looks like the grammar and is not is counted as skipped, never silently dropped', () => {
  const api = loadChangelog();
  const broken = [
    '## 1.0.0 — 2026-01-01',
    '### General',
    '- A change with a real commit (0123456789abcdef0123456789abcdef01234567)',
    '- A change with no commit at all',
    '- A change with a short commit (0123456789abcdef)',
    '## a heading with no date',
    'a stray line of prose',
  ].join('\n');
  const { entries, skipped } = api.parseChangelog(broken);
  assert.equal(entries.length, 1, 'the one well-formed version was not the only entry produced');
  assert.equal(entries[0].changes.length, 1, 'a change line without a valid 40-hex commit was accepted');
  assert.equal(skipped, 4, `expected 4 unreadable lines to be counted, got ${skipped}`);
});

test('the real generated release history reports its own unreadable lines rather than hiding them', () => {
  /* Two versions in the real history carry "Release published; no new commits recorded
   * against the previous tag." -- a real line, deliberately not a change entry. It is
   * counted and reported rather than quietly dropped, and its version still renders with
   * an honest "no changes recorded" body instead of disappearing. */
  const api = loadChangelog();
  const { entries, skipped } = api.parseChangelog(REAL_MARKDOWN);
  const empty = entries.filter((entry) => entry.changes.length === 0);
  assert.equal(skipped, empty.length,
    `${skipped} lines were unreadable but ${empty.length} versions came out empty -- those two numbers should account for each other`);
  api.renderChangelog('');
  if (skipped > 0) {
    assert.match(api.problemsEl.textContent, new RegExp(`${skipped} lines? of the release history did not match`, 'u'),
      'the unreadable-line count is not reported to the reader');
  }
});

test('the site grammar is the same grammar the desktop renderer parses, not a second one that drifted', () => {
  const desktop = readConsole('app/renderer/src/changelog.ts');
  for (const [siteName, desktopName] of [
    ['CHANGELOG_VERSION_HEADING', 'VERSION_HEADING'],
    ['CHANGELOG_CATEGORY_HEADING', 'CATEGORY_HEADING'],
    ['CHANGELOG_CHANGE_ITEM', 'CHANGE_ITEM'],
  ]) {
    const sitePattern = app.match(new RegExp(`const ${siteName} = (/.*/);?$`, 'mu'));
    const desktopPattern = desktop.match(new RegExp(`const ${desktopName} = (/.*/);?$`, 'mu'));
    assert.ok(sitePattern, `site/app.js no longer declares ${siteName} as a regular-expression literal`);
    assert.ok(desktopPattern, `app/renderer/src/changelog.ts no longer declares ${desktopName} as a regular-expression literal`);
    assert.equal(sitePattern[1], desktopPattern[1],
      `${siteName} and ${desktopName} have drifted apart -- the site and the console would read one generated changelog differently`);
  }
});

/* ------------------------------------------------------------------ *
 * Commit links: refuse, never guess.
 * ------------------------------------------------------------------ */

test('a commit link is built only from exactly 40 hexadecimal characters and a real https repository', () => {
  const api = loadChangelog();
  const good = '0123456789abcdef0123456789abcdef01234567';
  assert.equal(api.changelogCommitUrl(good, REAL_REPOSITORY), `${REAL_REPOSITORY}/commit/${good}`);
  assert.equal(api.changelogCommitUrl(good, `${REAL_REPOSITORY}/`), `${REAL_REPOSITORY}/commit/${good}`,
    'a trailing slash on the repository produced a doubled separator');
  for (const bad of ['', '0123456789abcdef', `${good}0`, 'z'.repeat(40), ' '.repeat(40), null, undefined]) {
    assert.equal(api.changelogCommitUrl(bad, REAL_REPOSITORY), '', `${JSON.stringify(bad)} was accepted as a commit id`);
  }
  for (const bad of ['', '   ', 'github.com/x/y', 'http://github.com/x/y', 'javascript:alert(1)', 'file:///etc']) {
    assert.equal(api.changelogCommitUrl(good, bad), '', `${JSON.stringify(bad)} was accepted as a repository URL`);
  }
});

test('with no repository resolved the commit id renders as text and no anchor is emitted at all', () => {
  const api = loadChangelog({ repository: '' });
  api.renderChangelog('');
  assert.ok(api.entriesEl.innerHTML.includes('changelog-commit'), 'the commit id is not rendered at all');
  assert.ok(!api.entriesEl.innerHTML.includes('<a class="changelog-commit'),
    'an anchor was emitted with no repository resolved -- that link would go nowhere');
  assert.ok(api.entriesEl.innerHTML.includes('No repository URL was resolved'),
    'nothing explains why the id carries no link');
  /* And the same reason is said once in words, not only in a tooltip. A `title` is
   * reachable with a pointer and by nothing else, so on its own it leaves a keyboard or
   * screen-reader reader looking at unlinked ids with no explanation at all. */
  assert.match(api.problemsEl.textContent, /resolved no repository/u,
    'the missing-repository reason exists only as a per-id tooltip, which a keyboard reader never reaches');

  const linked = loadChangelog();
  linked.renderChangelog('');
  assert.doesNotMatch(linked.problemsEl.textContent, /resolved no repository/u,
    'a build that DID resolve a repository still reports that it did not');
});

test('with a repository resolved every rendered commit is a real anchor to that repository', () => {
  const api = loadChangelog();
  api.renderChangelog('');
  const hrefs = [...api.entriesEl.innerHTML.matchAll(/<a class="changelog-commit mono" href="([^"]+)"/gu)].map((m) => m[1]);
  assert.ok(hrefs.length > 0, 'no commit anchors were rendered from the real release history');
  for (const href of hrefs) {
    assert.match(href, new RegExp(`^${REAL_REPOSITORY}/commit/[0-9a-f]{40}$`, 'u'), `${href} is not a well-formed commit URL`);
  }
});

test('a summary carrying markup is escaped rather than rendered -- release text is data, not markup', () => {
  const api = loadChangelog();
  const hostile = '## 9.9.9 — 2026-02-02\n### General\n'
    + '- Fix <img src=x onerror=alert(1)> & "quotes" (0123456789abcdef0123456789abcdef01234567)';
  const { entries } = api.parseChangelog(hostile);
  const markup = api.changelogEntryMarkup(entries[0]);
  assert.ok(!markup.includes('<img'), 'a summary containing markup reached the page as markup');
  assert.ok(markup.includes('&lt;img'), 'the summary was not escaped');
  assert.ok(markup.includes('&amp;'), 'an ampersand in a summary was not escaped');
});

/* ------------------------------------------------------------------ *
 * Filtering: date and search compose, and neither overrides the other.
 * ------------------------------------------------------------------ */

test('the real release-date set is preserved, while an isolated fixture proves inclusive multi-day range semantics', () => {
  const api = loadChangelog();
  const { entries: realEntries } = api.parseChangelog(REAL_MARKDOWN);
  const realDates = [...new Set(realEntries.map((entry) => entry.date))].sort();
  assert.ok(realDates.length >= 1, 'the real release history has no parseable release date');
  assert.equal(api.changelogFilterByDate(realEntries, '', '').length, realEntries.length,
    'an empty range dropped factual release-history entries');

  /* The current real tag cadence can put many releases on one calendar day. This is a
   * deliberately isolated filter input, not a second changelog and not a claim that
   * these are releases. Its only job is to make both inclusive endpoints observable. */
  const entries = [
    { version: 'range-fixture-earlier', date: '2026-02-03', changes: [] },
    { version: 'range-fixture-middle', date: '2026-02-04', changes: [] },
    { version: 'range-fixture-later', date: '2026-02-05', changes: [] },
  ];
  const first = '2026-02-03';
  const last = '2026-02-05';

  assert.equal(api.changelogFilterByDate(entries, '', '').length, entries.length, 'an empty range dropped fixture entries');
  assert.ok(api.changelogFilterByDate(entries, first, first).every((entry) => entry.date === first),
    'a single-day range let another day through');
  assert.ok(api.changelogFilterByDate(entries, first, first).length > 0, 'a single-day range on the fixture matched nothing');
  assert.equal(api.changelogFilterByDate(entries, first, last).length, entries.length,
    'the full range dropped an entry, so one of the bounds is exclusive');
  assert.deepEqual(api.changelogFilterByDate(entries, '', first).map((entry) => entry.date), [first],
    'an absent lower bound did not leave the lower end open');
  assert.deepEqual(api.changelogFilterByDate(entries, last, '').map((entry) => entry.date), [last],
    'an absent upper bound did not leave the upper end open');
  assert.equal(api.changelogFilterByDate(entries, last, first).length, 0, 'a reversed range still matched something');
});

test('search reaches the version, the category and the change text, and composes with the date range', () => {
  const api = loadChangelog();
  const { entries } = api.parseChangelog(REAL_MARKDOWN);
  const sample = entries.find((entry) => entry.changes.length > 0);
  assert.ok(sample, 'the real release history has no version with any changes');

  assert.equal(api.changelogSearch(entries, '').length, entries.length, 'an empty query filtered something out');
  assert.deepEqual(api.changelogSearch(entries, sample.version).map((e) => e.version), [sample.version],
    'searching for an exact version did not return exactly that version');
  assert.ok(api.changelogSearch(entries, sample.changes[0].category).length > 0, 'searching a real category matched nothing');
  assert.ok(api.changelogSearch(entries, sample.changes[0].summary.slice(0, 12)).length > 0, 'searching real change text matched nothing');
  assert.equal(api.changelogSearch(entries, 'no version has ever said this').length, 0, 'a query nothing contains still matched');

  /* Composition: a search that would match, restricted to a day it did not happen on. */
  const otherDay = entries.find((entry) => entry.date !== sample.date);
  if (otherDay) {
    const dated = api.changelogFilterByDate(entries, otherDay.date, otherDay.date);
    assert.equal(api.changelogSearch(dated, sample.version).length, 0,
      'the search overrode the date range instead of composing with it');
  }
});

test('search uses the same regular-expression state every other search field on this site uses', () => {
  const api = loadChangelog();
  const { entries } = api.parseChangelog(REAL_MARKDOWN);
  api.regexState.set('changelog-search', { pattern: '^0[.]0[.]', flags: 'u', enabled: true });
  assert.ok(api.changelogSearch(entries, '^0[.]0[.]').length > 0,
    'a regular expression matching the real version numbers matched nothing');
  api.regexState.set('changelog-search', { pattern: 'ZZZ-no-such-version', flags: 'u', enabled: true });
  assert.equal(api.changelogSearch(entries, 'ZZZ-no-such-version').length, 0, 'a regular expression matching nothing still matched');
  /* An invalid pattern must not throw out of the render path. */
  api.regexState.set('changelog-search', { pattern: '([unclosed', flags: 'u', enabled: true });
  assert.doesNotThrow(() => api.changelogSearch(entries, '([unclosed'), 'an invalid pattern threw instead of matching nothing');
});

test('a half-typed date is reported inline and ignored, and the field is never written to', () => {
  const api = loadChangelog({ from: '', fromBad: true });
  const bounds = api.changelogDateBounds();
  assert.equal(bounds.from, '', 'a field reporting badInput still contributed a bound');
  assert.equal(bounds.problems.length, 1, 'the incomplete date was not reported');
  assert.match(bounds.problems[0], /incomplete/u);
  assert.match(bounds.problems[0], /left alone/u, 'the reader is not told their typing survived');
  /* The whole point: the code never assigns to the field, so what was typed stays. */
  assert.ok(!/\$\('changelog-date-(from|to)'\)\.value\s*=/u.test(functionSource(app, 'changelogDateBounds')),
    'changelogDateBounds writes to a date field, which would discard what the reader typed');
});

test('a range whose start is after its end says so instead of silently showing nothing', () => {
  const api = loadChangelog({ from: '2026-12-31', to: '2026-01-01' });
  const bounds = api.changelogDateBounds();
  assert.equal(bounds.problems.length, 1, 'an impossible range was not reported');
  assert.match(bounds.problems[0], /2026-12-31/u, 'the reported problem does not name the dates involved');
  api.renderChangelog('');
  assert.match(api.problemsEl.textContent, /is after/u, 'the impossible range never reached the page');
});

test('the presets compute real ranges from a real date, and "every version" clears both bounds', () => {
  const api = loadChangelog();
  const today = new Date('2026-08-26T00:00:00Z');
  assert.deepEqual(api.changelogPresetRange('all', today), { from: '', to: '' });
  assert.deepEqual(api.changelogPresetRange('year', today), { from: '2026-01-01', to: '2026-08-26' });
  assert.deepEqual(api.changelogPresetRange('d7', today), { from: '2026-08-20', to: '2026-08-26' },
    'the 7-day preset is not an inclusive 7-day window ending today');
  assert.deepEqual(api.changelogPresetRange('d30', today), { from: '2026-07-28', to: '2026-08-26' });
  assert.deepEqual(api.changelogPresetRange('d90', today), { from: '2026-05-29', to: '2026-08-26' });
  assert.equal(api.changelogPresetRange('', today), undefined, 'the "custom range" option overwrote the dates');
  assert.equal(api.changelogPresetRange('not-a-preset', today), undefined, 'an unknown preset invented a range');

  /* The markup must offer exactly the presets the code knows how to compute, or an
   * option in the list does nothing at all when it is chosen. */
  const select = downloads.match(/<select id="changelog-date-preset"[^>]*>([\s\S]*?)<\/select>/u);
  assert.ok(select, 'the preset select is not on downloads.html');
  const values = [...select[1].matchAll(/<option value="([^"]*)"/gu)].map((m) => m[1]).filter(Boolean);
  assert.deepEqual(values.slice().sort(), ['all', 'd30', 'd7', 'd90', 'year'].sort(),
    'the offered presets and the computable presets have drifted apart');
  for (const value of values) {
    assert.notEqual(api.changelogPresetRange(value, today), undefined, `the offered preset "${value}" computes no range`);
  }
  /* And every one of them is named in the table the code documents them by. */
  assert.deepEqual(Object.keys(api.CHANGELOG_PRESETS).slice().sort(), values.slice().sort(),
    'the documented preset table and the offered options disagree');
});

/* ------------------------------------------------------------------ *
 * Rendering.
 * ------------------------------------------------------------------ */

test('the viewer renders every version in the real release history, with its date and its changes', () => {
  const api = loadChangelog();
  api.renderChangelog('');
  const { entries } = api.parseChangelog(REAL_MARKDOWN);
  for (const entry of entries) {
    assert.ok(api.entriesEl.innerHTML.includes(`data-version="${entry.version}"`), `version ${entry.version} was not rendered`);
    assert.ok(api.entriesEl.innerHTML.includes(`datetime="${entry.date}"`), `version ${entry.version} was rendered with no date`);
  }
  const changes = entries.flatMap((entry) => entry.changes);
  assert.ok(changes.length > 0, 'the real release history holds no changes, so this would prove nothing');
  for (const change of changes) {
    assert.ok(api.entriesEl.innerHTML.includes(change.commit.slice(0, 10)), `the commit for "${change.summary}" was not rendered`);
  }
  assert.ok(api.vocabularyRuns.length > 0, 'the render never let the page finish applying its own local wording');
});

test('a version with no recorded changes says so rather than rendering as an empty box', () => {
  const api = loadChangelog();
  const markdown = '## 1.0.0 — 2026-01-01\n\n### General\n- Release published; no new commits recorded against the previous tag.';
  const { entries } = api.parseChangelog(markdown);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].changes.length, 0);
  assert.match(api.changelogEntryMarkup(entries[0]), /No changes were recorded against this version/u);
});

test('an empty result is an honest no-match message, and a build with no history says that instead', () => {
  const matched = loadChangelog({ query: 'no version has ever said this' });
  matched.renderChangelog('no version has ever said this');
  assert.match(matched.entriesEl.innerHTML, /No version matches the current search and date range/u);

  const none = loadChangelog({ markdown: '' });
  none.renderChangelog('');
  assert.match(none.entriesEl.innerHTML, /No release history was resolved for this build/u,
    'a build with no injected history borrowed the no-match wording, which would blame the reader for the build');
  assert.match(none.countEl.textContent, /No versions are available in this build/u);
});

test('the count line states matched versions, total versions, change count and the real range', () => {
  const api = loadChangelog();
  api.renderChangelog('');
  const { entries } = api.parseChangelog(REAL_MARKDOWN);
  const changes = entries.reduce((total, entry) => total + entry.changes.length, 0);
  assert.match(api.countEl.textContent, new RegExp(`^${entries.length} of ${entries.length} versions? `, 'u'),
    `the count line reads ${JSON.stringify(api.countEl.textContent)}`);
  assert.ok(api.countEl.textContent.includes(`${changes} change`), 'the count line does not state the number of changes');
  assert.ok(api.countEl.textContent.includes(api.changelogRangeLabel(entries)), 'the count line does not state the range it covers');
});

test('the range label is a real span, a single date, or an honest statement that there is none', () => {
  const api = loadChangelog();
  assert.equal(api.changelogRangeLabel([]), 'no entries');
  assert.equal(api.changelogRangeLabel([{ date: '2026-01-01', changes: [] }]), '2026-01-01');
  assert.equal(api.changelogRangeLabel([{ date: '2026-03-01', changes: [] }, { date: '2026-01-01', changes: [] }]),
    '2026-01-01 to 2026-03-01', 'the range label does not order its own bounds');
});

/* ------------------------------------------------------------------ *
 * Export: what is shown, in every format, stating its own range.
 * ------------------------------------------------------------------ */

test('export rows carry the version, date, category, summary, commit and a resolved link', () => {
  const api = loadChangelog();
  const { entries } = api.parseChangelog(REAL_MARKDOWN);
  const rows = api.changelogExportRows(entries);
  assert.ok(rows.length > 0, 'the real release history exported no rows');
  assert.deepEqual(Object.keys(rows[0]).slice().sort(),
    ['category', 'commit', 'commitUrl', 'date', 'exportedRange', 'summary', 'version']);
  for (const row of rows) {
    assert.equal(row.commitUrl, `${REAL_REPOSITORY}/commit/${row.commit}`,
      'an exported row carries a link that does not match its own commit');
  }
});

test('every exported row states the range of the export it came from', () => {
  const api = loadChangelog();
  const { entries } = api.parseChangelog(REAL_MARKDOWN);
  const expected = api.changelogRangeLabel(entries);
  const rows = api.changelogExportRows(entries);
  assert.ok(rows.every((row) => row.exportedRange === expected),
    'not every exported row states the same range, so the file does not state its own range');
  /* And a narrowed export states the NARROWED range, not the whole history's. */
  const one = entries.find((entry) => entry.changes.length > 0);
  const narrowed = api.changelogExportRows([one]);
  assert.ok(narrowed.length > 0 && narrowed.every((row) => row.exportedRange === one.date),
    'a filtered export still claims the range of the unfiltered history');
});

test('the export honours the current search and date range rather than dumping everything', () => {
  const api = loadChangelog();
  const { entries } = api.parseChangelog(REAL_MARKDOWN);
  const one = entries.find((entry) => entry.changes.length > 0);
  api.searchEl.value = one.version;
  const result = api.changelogExportText();
  assert.ok(result, 'the export produced nothing while a real version was matched');
  assert.equal(result.rows.length, one.changes.length, 'the export ignored the active search');
  assert.ok(result.rows.every((row) => row.version === one.version), 'the export included a version the search excluded');
  assert.ok(result.text.includes(one.changes[0].commit), 'the exported text does not carry the commit it claims to');
  assert.equal(result.range, one.date, 'the export reports a range other than the one it covers');
});

test('the export produces real output in every format the engine offers for these rows', () => {
  const api = loadChangelog();
  const { entries } = api.parseChangelog(REAL_MARKDOWN);
  const rows = api.changelogExportRows(entries);
  /* The list checked is the one the reader is actually offered -- the select the code
   * fills -- rather than a list this test decided on. */
  api.renderChangelog('');
  const offered = [...api.formatEl.innerHTML.matchAll(/<option value="([^"]+)"/gu)].map((m) => m[1]);
  assert.deepEqual(offered, api.suitableFormats(rows), 'the offered formats are not the ones the engine judged suitable');
  assert.ok(offered.length >= 8, `only ${offered.length} export formats were offered for a flat table of strings`);
  for (const wanted of ['json', 'csv', 'sql', 'markdown']) {
    assert.ok(offered.includes(wanted), `a flat table of plain strings should be exportable as ${wanted.toUpperCase()}`);
  }
  for (const format of offered) {
    api.formatEl.value = format;
    const result = api.changelogExportText();
    assert.ok(result && result.text.length > 0, `${format} produced no output`);
    assert.ok(result.text.includes(rows[0].commit), `${format} output does not carry a real commit id`);
  }
});

test('with nothing shown the export refuses rather than writing an empty file, and says why', () => {
  const api = loadChangelog({ query: 'no version has ever said this' });
  api.searchEl.value = 'no version has ever said this';
  assert.equal(api.changelogExportText(), undefined, 'an export ran with nothing on screen');
  api.renderChangelog('no version has ever said this');
  assert.match(api.lossEl.textContent, /nothing to export/u, 'the empty export state is not explained');
});

/* ------------------------------------------------------------------ *
 * The boundary: release history is a record, not this site's copy.
 * ------------------------------------------------------------------ */

test('the rendered entries are held outside the personal-vocabulary walker', () => {
  assert.match(downloads, /<div id="changelog-entries" class="changelog-entries" data-no-vocab/u,
    'the changelog entries are no longer marked data-no-vocab, so a local vocabulary file could rewrite a commit summary');
});

test('the funny-level copy reaches the description and never the entries themselves', () => {
  const api = loadChangelog();
  api.renderChangelog('');
  assert.ok(!api.idsAsked.includes('changelog-desc'),
    'the render path reaches for the description element, which would let it restyle a factual record');
  const markup = functionSource(app, 'changelogEntryMarkup');
  assert.ok(!markup.includes('copyText('), 'an entry is rendered through the funny-level copy table');
  assert.ok(!markup.includes('applyVocabularyText('), 'an entry is rendered through the vocabulary replacer');
});

test('the description IS wired to the funny sliders, with four real variants in each language', () => {
  assert.match(downloads, /<p id="changelog-desc" data-copy="changelogDesc">/u,
    'the changelog description carries no data-copy hook, so the sliders never reach it');
  const start = app.indexOf('changelogDesc:{en:[');
  assert.notEqual(start, -1, 'COPY has no changelogDesc entry');
  const chunk = app.slice(start, app.indexOf(']},', start));
  const en = chunk.match(/en:\[([\s\S]*?)\],zh:\[/u);
  const zh = chunk.match(/zh:\[([\s\S]*?)$/u);
  assert.ok(en && zh, 'changelogDesc does not carry both an English and a Cantonese array');
  const enVariants = en[1].split('\n').filter((line) => line.trim().startsWith("'"));
  const zhVariants = zh[1].split('\n').filter((line) => line.trim().startsWith("'"));
  assert.equal(enVariants.length, 4, 'changelogDesc does not carry four English variants');
  assert.equal(zhVariants.length, 4, 'changelogDesc does not carry four Cantonese variants');
  /* Every variant must still say the two things that make the viewer trustworthy: each
   * line carries the real commit, and what you see is what you export. A fact stated at
   * some funny levels and not at others is a fact nobody can rely on. */
  for (const variant of enVariants) {
    assert.match(variant, /commit/u, `an English changelogDesc variant does not mention the commit: ${variant.trim().slice(0, 50)}`);
    assert.match(variant, /export/u, `an English changelogDesc variant does not mention exporting: ${variant.trim().slice(0, 50)}`);
  }
  for (const variant of zhVariants) {
    assert.match(variant, /commit/u, 'a Cantonese changelogDesc variant does not mention the commit');
    assert.match(variant, /匯出/u, 'a Cantonese changelogDesc variant does not mention exporting');
  }
});

/* ------------------------------------------------------------------ *
 * Markup, wiring and the build.
 * ------------------------------------------------------------------ */

test('downloads.html carries the whole changelog surface, reachable from its own section tab', () => {
  assert.match(downloads, /<a href="#changelog">Changelog<\/a>/u, 'the changelog has no entry in the page section tabs');
  assert.match(downloads, /<section class="changelog-stage" id="changelog" aria-labelledby="changelog-title">/u,
    'the changelog section is missing or is no longer labelled by its own heading');
  for (const id of [
    'changelog-title', 'changelog-desc', 'changelog-filters-panel', 'changelog-search',
    'changelog-search-mode-status', 'changelog-date-preset', 'changelog-date-from', 'changelog-date-to',
    'changelog-problems', 'changelog-export-format', 'changelog-export', 'changelog-copy',
    'changelog-export-loss', 'changelog-count', 'changelog-entries',
  ]) {
    assert.ok(downloads.includes(`id="${id}"`), `downloads.html no longer carries #${id}`);
  }
});

test('the count line is the live region and the entry list is not, so a search is not read back in full', () => {
  /* Twenty versions re-rendered on every keystroke, inside a live region, is the whole
   * list announced on every keystroke. The count line -- "3 of 20 versions · 4 changes ·
   * 2026-08-24 to 2026-08-26" -- says that the result changed and by how much, which is
   * the useful amount. */
  assert.match(downloads, /<span id="changelog-count" class="filter-status" aria-live="polite">/u,
    'the changelog count is no longer announced, so a screen-reader reader gets no signal that the filter changed');
  const list = downloads.match(/<div id="changelog-entries"[^>]*>/u);
  assert.ok(list, 'the changelog entry list is not on downloads.html');
  assert.doesNotMatch(list[0], /aria-live/u,
    'the entry list is a live region, so every keystroke in the search announces the whole changelog');
  assert.match(downloads, /<p id="changelog-problems" class="export-loss" role="status" aria-live="polite">/u,
    'the changelog problem line is no longer announced, so an ignored date is reported only visually');
});

test('the search field carries the anchored regular-expression builder and its live mode status', () => {
  assert.match(downloads, /<button class="regex-trigger" type="button" data-regex-for="changelog-search"/u,
    'the changelog search has no anchored regex-builder trigger beside it');
  assert.match(downloads, /<p class="mode-status mono" id="changelog-search-mode-status"/u,
    'the changelog search has no plain-versus-regex mode status line');
  assert.match(downloads, /aria-label="Build a regular expression for changelog search"/u,
    'the regex trigger has no accessible name of its own');
});

test('every control in the panel has a real label, and the date fields are real date fields', () => {
  for (const id of ['changelog-search', 'changelog-date-preset', 'changelog-date-from', 'changelog-date-to', 'changelog-export-format']) {
    assert.ok(new RegExp(`<label class="sr-only" for="${id}">`, 'u').test(downloads), `#${id} has no label`);
  }
  assert.match(downloads, /<input id="changelog-date-from" type="date"/u, 'the "from" bound is not a native date field, so it has no calendar');
  assert.match(downloads, /<input id="changelog-date-to" type="date"/u, 'the "to" bound is not a native date field, so it has no calendar');
  assert.match(downloads, /<input id="changelog-search" type="search"/u, 'the changelog search is not a search field');
});

test('the panel is a real collapsible whose collapsed state is a persisted user choice', () => {
  assert.match(downloads, /<details class="collapsible-panel sticky-tools" id="changelog-filters-panel" open><summary>Search &amp; date range<span id="changelog-count"/u,
    'the changelog filter panel no longer matches the expected collapsible shape');
  assert.match(app, /'changelog-filters-panel':'changelogFilters'/u,
    'the panel is not wired into initCollapsibles, so its state is forgotten');
  assert.match(app, /^  const DEFAULTS = \{.*changelogFilters:false.*\};$/mu,
    'changelogFilters is not a stored default, so "Reset settings" would not clear it');
});

test('initChangelog is genuinely called at startup and genuinely wires every control', () => {
  const init = functionSource(app, 'init');
  assert.ok(/(^|[;{(\s])initChangelog\(\)/u.test(init), 'init() does not call initChangelog()');
  const body = functionSource(app, 'initChangelog');
  /* Each control is checked for its OWN listener, anchored to the start of a line.
   *
   * Both weaker forms were tried and both were toothless, which is why this looks the
   * way it does. `body.includes("$('changelog-search')")` is satisfied by the `rerender`
   * closure that reads the field's value, and `body.includes("addEventListener('input',
   * rerender)")` is satisfied by either date field -- so deleting the search listener
   * outright left the whole suite green. The line anchor also refuses a listener that
   * has been commented out, which is how a wiring line usually dies. */
  for (const [id, event] of [
    ['changelog-search', 'input'], ['changelog-date-from', 'input'], ['changelog-date-to', 'input'],
    ['changelog-date-preset', 'change'], ['changelog-export-format', 'change'],
    ['changelog-export', 'click'], ['changelog-copy', 'click'],
  ]) {
    const listener = new RegExp(`^\\s*\\$\\('${id}'\\)\\?\\.addEventListener\\('${event}',`, 'mu');
    assert.match(body, listener, `#${id} has no '${event}' listener of its own in initChangelog`);
  }
  /* The first render is the LAST statement of the function, so the section is populated
   * on load rather than staying empty until somebody types. Anchored to the closing
   * brace, because a bare `rerender();` is satisfied by any of the handlers above. */
  assert.match(body, /\n\s*rerender\(\);\s*\n\s*\}$/u, 'initChangelog never performs the first render');
  assert.ok(/if\(!\$\('changelog-entries'\)\)return;/u.test(body),
    'initChangelog no longer returns early on a page without the changelog, so the other five pages would run it');
});

test('the source ships the two declarations empty and the build replaces exactly those two', () => {
  assert.match(app, /^  const CHANGELOG_MARKDOWN = '';$/mu,
    'the committed source no longer ships an empty changelog -- a page served from source must not carry a stale copy');
  assert.match(app, /^  const CHANGELOG_REPOSITORY_URL = '';$/mu, 'the committed source no longer ships an empty repository URL');
  assert.ok(build.includes('replaceOnce(text, "const CHANGELOG_MARKDOWN = \'\';"'),
    'site/build.mjs no longer injects the real release history');
  assert.ok(build.includes('replaceOnce(text, "const CHANGELOG_REPOSITORY_URL = \'\';"'),
    'site/build.mjs no longer injects the repository URL');
});

test('a "missing" report from a shallow clone is treated as unverifiable, never as a dead link', () => {
  /* This is the assertion that would have stopped a real broken deploy, and it is here
   * because nothing did. The first version of this build reasoned: git answered, git
   * said missing, therefore the commit is gone, therefore fail. That is false in exactly
   * the case CI runs in -- `actions/checkout` clones one commit deep, so `cat-file`
   * correctly reported all 26 referenced commits as absent FROM THAT CHECKOUT, and the
   * Pages build died on a repository that had every one of them.
   *
   * 45 planted breaks all went red and green beforehand and not one of them caught it,
   * because every check was about the SHAPE of the resolver rather than about the
   * judgement inside it. So the judgement is a pure function now, and this runs it. */
  const verdict = new Function(`${functionSource(build, 'changelogVerificationVerdict')}\nreturn changelogVerificationVerdict;`)();

  assert.equal(verdict(0, true), 'verified', 'nothing missing in a shallow clone is still nothing missing');
  assert.equal(verdict(0, false), 'verified');
  assert.equal(verdict(0, undefined), 'verified');

  assert.equal(verdict(26, true), 'unverifiable',
    'a shallow clone that lacks the objects was read as proof the repository lost them -- this is the exact defect that broke a deploy');
  assert.equal(verdict(1, true), 'unverifiable');

  assert.equal(verdict(26, undefined), 'unverifiable',
    'an unknown clone depth was treated as a complete clone -- an unknown is not a proof');

  assert.equal(verdict(1, false), 'dead',
    'a complete clone reporting a commit missing no longer fails the build, so a genuinely dead link would ship');
});

test('the shallow answer is read from git and an unparseable answer is not read as "complete"', () => {
  const src = functionSource(build, 'isShallowCheckout');
  assert.ok(src.includes("'--is-shallow-repository'"),
    'the build no longer asks git whether this checkout is shallow, so it cannot tell a missing object from a lost commit');
  assert.ok(src.includes("if (answer === 'false') return false;"),
    'only an explicit "false" should establish a complete clone');
  assert.ok(/return undefined;\s*\n\s*\} catch \{\s*\n\s*return undefined;/u.test(src),
    'an unrecognised answer or a git that will not run must both come back undefined, never false');
  /* And it is genuinely CALLED. A pure function nobody calls is this repository's
   * most-repeated defect, and here it would restore the exact broken deploy: the verdict
   * would be handed a hard-coded answer instead of a real one. */
  assert.ok(functionSource(build, 'resolveChangelog').includes('changelogVerificationVerdict(missing.length, isShallowCheckout())'),
    'resolveChangelog no longer asks how deep this checkout is before deciding what a missing object means');
});

test('the Pages workflow fetches deep enough for the commits the changelog links to', () => {
  /* Without this the build is correct and the published changelog silently loses every
   * commit link, which is the quiet half of the same defect: nothing fails, the page
   * renders, and the one part a reader can check for themselves is gone. */
  const workflow = readFileSync(resolve(consoleRoot, '..', '.github', 'workflows', 'pages.yml'), 'utf8').replaceAll('\r\n', '\n');
  const depth = workflow.match(/^\s*fetch-depth:\s*(\d+)\s*$/mu);
  assert.ok(depth, 'the Pages checkout no longer sets a fetch-depth, so it clones one commit and can verify nothing');
  assert.ok(Number(depth[1]) === 0 || Number(depth[1]) >= 100,
    `fetch-depth is ${depth[1]}, which is not enough history to hold the commits between the last twenty release tags`);
});

test('the build refuses to emit a link it has not verified against real git objects', () => {
  assert.ok(build.includes("execFileSync('git', ['cat-file', '--batch-check']"),
    'site/build.mjs no longer verifies the referenced commits against this repository');
  const resolver = build.slice(build.indexOf('function resolveChangelog()'), build.indexOf('function readGeneratedString('));
  assert.ok(resolver.length > 100, 'resolveChangelog was not found in site/build.mjs');
  assert.ok(resolver.includes('throw new Error'), 'a commit git reports missing no longer fails the build');
  /* Every path that cannot verify must drop the repository rather than the history: no
   * link at all keeps the promise exactly, and losing the history would not. */
  const returns = [...resolver.matchAll(/return \{ markdown[^}]*\}/gu)].map((m) => m[0]);
  assert.ok(returns.length >= 3, `expected several honest fallbacks in resolveChangelog, found ${returns.length}`);
  for (const statement of returns) {
    assert.ok(/repository: ''/u.test(statement) || /repository \}/u.test(statement),
      `resolveChangelog returns a repository that is neither verified nor empty: ${statement}`);
  }
  assert.ok(resolver.includes('/^https:'), 'the build no longer refuses a repository URL that is not https');
});

/* ------------------------------------------------------------------ *
 * The registries.
 * ------------------------------------------------------------------ */

test('the site feature registry records changelog-viewer as implemented, with a note that says what shipped', () => {
  const row = registry.features['changelog-viewer'];
  assert.ok(row, 'no changelog-viewer row in site/feature-registry.json');
  assert.equal(row.status, 'implemented-unverified',
    'a real version list with date filtering, search, commit links and export should read as implemented');
  assert.ok(typeof row.note === 'string' && row.note.length > 200, 'the row records a state with no note explaining it');
  assert.deepEqual(row.implementation.paths.slice().sort(), ['site/app.js', 'site/build.mjs', 'site/downloads.html', 'site/styles.css'],
    'the recorded file list has drifted from the files the feature actually lives in');
});

test('the localization registry records the description as localized and knows its copy key', () => {
  const row = locales.features['changelog-viewer'];
  assert.ok(row, 'no changelog-viewer row in site/locales/feature-registry.json');
  assert.equal(row.state, 'localized');
  assert.deepEqual(row.copyKeys, ['changelogDesc']);
  assert.deepEqual(row.missingCopyKeys, []);
  assert.ok(locales.knownCopyKeys.includes('changelogDesc'), 'changelogDesc is missing from the recorded COPY keys');
});

test('the status page is still a build timeline rather than a second, competing changelog', () => {
  /* Kept from the version of this file that pinned the feature absent. The status page
   * narrates the site's own build; now that a real changelog exists elsewhere, two
   * surfaces claiming to be the release history would be worse than one. */
  const timeline = pageSource.status.match(/<ol class="status-timeline"[^>]*>([\s\S]*?)<\/ol>/u);
  assert.ok(timeline, 'status.html no longer carries its status-timeline list');
  assert.doesNotMatch(timeline[1], /[0-9a-f]{40}/u,
    'the status timeline now carries a full commit SHA -- it may have grown into a changelog');
});

test('the changelog lives on exactly one page, so there is one place to look', () => {
  const carrying = PAGES.filter((name) => pageSource[name].includes('id="changelog-entries"'));
  assert.deepEqual(carrying, ['downloads'], `the changelog surface appears on ${carrying.join(', ')}`);
});
