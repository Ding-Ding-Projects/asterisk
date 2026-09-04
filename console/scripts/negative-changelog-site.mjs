#!/usr/bin/env node
/**
 * Deliberate red-then-green proof for site/tests/contracts/changelog-viewer.test.mjs.
 *
 * A changelog is unusually easy to ship broken in a way that looks entirely healthy. It
 * renders a list; the list is long; everything on it is plausible. The failures that
 * matter are the quiet ones:
 *
 *   - the parser drops half its input and the page looks like a short release history;
 *   - a commit link points somewhere confidently irrelevant, which is worse than no link;
 *   - the funny sliders or the personal-vocabulary walker reach the entries, so a factual
 *     record of what a release said quietly becomes this site's own prose;
 *   - the export ignores the filter and hands somebody the whole history while the screen
 *     shows one version.
 *
 * None of those throw, and none of them look wrong in a screenshot. So the contract test
 * runs the real extracted source against real generated release history -- and this file
 * is what says that test would actually notice if it stopped.
 *
 * One break at a time, always. Breaking three things and watching five assertions fail
 * proves only that something among them is watched; it hid a wiring line in this
 * repository once already.
 *
 * Every break edits a real file on disk, because that is the only way to exercise a test
 * that reads its subject off the filesystem. Two properties keep that safe:
 *
 *   - the original bytes are restored in a `finally`, and the restore is verified rather
 *     than assumed, so an interrupted run cannot leave a planted break behind;
 *   - a break whose replacement did not change the bytes is reported as a FAILED CASE
 *     rather than counted as a pass. An edit that never landed reads exactly like a guard
 *     that held, and an anchor that matched nothing is the commonest way to fake a green.
 *
 * Usage:  node scripts/negative-changelog-site.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..', '..');
const consoleRoot = resolve(repo, 'console');
const TEST = 'site/tests/contracts/changelog-viewer.test.mjs';

const file = (relative) => resolve(consoleRoot, relative);
const APP = file('site/app.js');
const DOWNLOADS = file('site/downloads.html');
const BUILD = file('site/build.mjs');
const REGISTRY = file('site/feature-registry.json');
const LOCALES = file('site/locales/feature-registry.json');
const WORKFLOW = resolve(repo, '.github', 'workflows', 'pages.yml');

/**
 * Replaces `from` with `to` exactly once, refusing anything that is not exactly once.
 *
 * Anchors are written with `\n` and rewritten to whatever the file on disk actually uses.
 * Parts of this checkout are CRLF, and a newline-only anchor against a CRLF file matches
 * nothing at all -- which, without the exactly-once check below, would read as a guard
 * that held rather than as a break that never happened.
 */
const swap = (path, from, to) => () => {
  const before = readFileSync(path, 'utf8');
  const eol = before.includes('\r\n') ? '\r\n' : '\n';
  from = from.split('\n').join(eol);
  to = to.split('\n').join(eol);
  const occurrences = before.split(from).length - 1;
  if (occurrences !== 1) {
    throw new Error(`the break anchor appears ${occurrences} time(s), not once: ${JSON.stringify(from.slice(0, 60))}`);
  }
  return { path, before, after: before.split(from).join(to) };
};

/**
 * Each case is one lie, and the comment beside it is the defect it stands for -- the
 * thing that would ship, silently, if the assertion it trips were deleted.
 */
const cases = [
  // ---- The parser --------------------------------------------------------------

  // A change line without its commit is accepted, so an entry ships with an id of
  // whatever happened to be in scope. This is the failure that produces a link to the
  // wrong commit rather than no link.
  ['a change line is accepted without a 40-character commit',
    swap(APP, "const CHANGELOG_CHANGE_ITEM = /^-\\s+(.+?)\\s+\\(([0-9a-fA-F]{40})\\)\\s*$/;",
      "const CHANGELOG_CHANGE_ITEM = /^-\\s+(.+?)(?:\\s+\\(([0-9a-fA-F]*)\\))?\\s*$/;")],

  // The two grammars drift apart, so the site and the desktop console read one
  // generated changelog two different ways and nothing anywhere says so.
  ['the site version heading stops accepting the em dash the generator emits',
    swap(APP, "const CHANGELOG_VERSION_HEADING = /^##\\s+(\\S+)\\s+[—-]\\s+(\\d{4}-\\d{2}-\\d{2})\\s*$/;",
      "const CHANGELOG_VERSION_HEADING = /^##\\s+(\\S+)\\s+-\\s+(\\d{4}-\\d{2}-\\d{2})\\s*$/;")],

  // Unreadable input is thrown away in silence, so a viewer showing half its input is
  // indistinguishable from one reading a short release history.
  ['unreadable lines are dropped instead of counted',
    swap(APP, '      if(!change||!current){skipped+=1;continue}', '      if(!change||!current){continue}')],

  // The skipped count is computed and then never reported, which is the same failure
  // one step later: wired at one end, consumed at neither.
  ['the unreadable-line count is never shown to the reader',
    swap(APP, "      if(skipped>0)notes.push(`${skipped} line${skipped===1?'':'s'} of the release history did not match the changelog grammar and ${skipped===1?'was':'were'} not shown.`);",
      '')],

  // ---- Commit links ------------------------------------------------------------

  // Any old string becomes a link. A 39-character id, a truncated one, a branch name --
  // all of them get an anchor built around them and all of them go nowhere.
  ['the commit id is no longer required to be exactly 40 hexadecimal characters',
    swap(APP, "    if(!CHANGELOG_SHA40.test(String(commit||'')))return '';", '')],

  // A repository that is not an https URL is accepted, so `javascript:` or an empty
  // string composes into something that is not a link to anything.
  ['any repository string is accepted, not only an https URL',
    swap(APP, "    if(!/^https:\\/\\/\\S+$/.test(base))return '';", "    if(!base)return '';")],

  // The reason the ids carry no link exists only as a per-id `title`, which a pointer
  // reaches and a keyboard does not, so a screen-reader reader sees bare ids and no
  // explanation anywhere.
  ['the missing-repository reason is left as a tooltip only',
    swap(APP, "        notes.push('This build resolved no repository, so each commit id is shown as text rather than as a link.');", '')],

  // The reverse: a build that DID resolve a repository reports that it did not, which is
  // a false statement on a page whose whole job is being checkable.
  ['a build with a working repository still says it has none',
    swap(APP, "      if(CHANGELOG_MARKDOWN&&!changelogCommitUrl('0'.repeat(40),CHANGELOG_REPOSITORY_URL)){",
      '      if(CHANGELOG_MARKDOWN){')],

  // The whole list becomes a live region, so every keystroke in the search announces
  // twenty versions. Completely invisible unless somebody is listening to it.
  ['the entry list becomes a live region',
    swap(DOWNLOADS, '<div id="changelog-entries" class="changelog-entries" data-no-vocab></div>',
      '<div id="changelog-entries" class="changelog-entries" data-no-vocab aria-live="polite"></div>')],

  // The count stops being announced, so a screen-reader reader gets no signal at all
  // that their search changed anything.
  ['the count line stops being announced',
    swap(DOWNLOADS, '<span id="changelog-count" class="filter-status" aria-live="polite">',
      '<span id="changelog-count" class="filter-status">')],

  // Commented out rather than deleted, because that is how a line usually dies -- and
  // because a bare substring needle is satisfied by the comment.
  ['the entry renderer no longer falls back to plain text when no link can be built',
    swap(APP, '        const link=url\n', '        const link=true/*url*/\n')],

  // Release text reaches the page as markup. Nothing about this is visible until the
  // day a summary contains a bracket.
  ['a change summary is written into the page unescaped',
    swap(APP, '        return `<li>${escapeHtml(change.summary)} ${link}</li>`;',
      '        return `<li>${change.summary} ${link}</li>`;')],

  // ---- Filtering ---------------------------------------------------------------

  // The date bound becomes exclusive, so a range that names a real release day silently
  // omits that day's releases.
  ['the "from" date bound becomes exclusive',
    swap(APP, '      if(from&&entry.date<from)return false;', '      if(from&&entry.date<=from)return false;')],

  // Search stops reaching the change text, so searching for something a release
  // actually said finds nothing and looks like the release never happened.
  ['search no longer reaches the change summaries',
    swap(APP, '      `${entry.version} ${entry.changes.map(change=>`${change.category} ${change.summary}`).join(\' \')}`,',
      '      `${entry.version}`,')],

  // Search stops using the shared regular-expression state, so the anchored builder
  // beside this field applies to every other search on the site and not to this one.
  ['search stops honouring the anchored regular-expression builder',
    swap(APP, "      query,'changelog-search'));", "      query,'no-such-search-field'));")],

  // A half-typed date is treated as no bound at all with nothing said, so the filter
  // silently widens back to everything while the reader is still looking at what they
  // typed.
  ['a half-typed date is ignored in silence',
    swap(APP, "    if(from.bad)problems.push('The “from” date is incomplete, so it is being ignored. What you typed has been left alone.');",
      '')],

  // An impossible range renders as an empty list with no explanation, which reads as
  // "there are no releases" rather than "you asked for an empty window".
  ['an impossible date range is no longer reported',
    swap(APP, '      problems.push(`The “from” date (${from.value}) is after the “to” date (${to.value}), so no version can fall between them.`);',
      '')],

  // The 7-day preset is a 7-day window that excludes today, so "Last 7 days" quietly
  // omits the release published this morning.
  ['the "last N days" presets stop being inclusive of today',
    swap(APP, '    return {from:new Date(today.getTime()-(days-1)*day).toISOString().slice(0,10),to:end};',
      '    return {from:new Date(today.getTime()-days*day).toISOString().slice(0,10),to:end};')],

  // An unknown preset invents a range instead of leaving the dates alone.
  ['an unrecognised preset invents a range',
    swap(APP, '    if(!days)return undefined;', "    if(!days)return {from:'',to:''};")],

  // An option is offered that computes nothing, so choosing it does visibly nothing.
  ['the markup offers a preset the code cannot compute',
    swap(DOWNLOADS, '<option value="d90">Last 90 days</option>', '<option value="d180">Last 180 days</option>')],

  // ---- The boundary: a record, not this site's copy -----------------------------

  // The personal-vocabulary walker is let into the entries, so a local vocabulary file
  // can rewrite what a release said. Entirely invisible to anyone without that file.
  ['the vocabulary walker is let into the changelog entries',
    swap(DOWNLOADS, '<div id="changelog-entries" class="changelog-entries" data-no-vocab',
      '<div id="changelog-entries" class="changelog-entries"')],

  // The description loses its funny-level hook, so the one string around the list that
  // is this site's own copy stops being styled with the rest of the site.
  ['the description is no longer wired to the funny sliders',
    swap(DOWNLOADS, '<p id="changelog-desc" data-copy="changelogDesc">', '<p id="changelog-desc">')],

  // A funny-level variant quietly stops mentioning the commit, so the promise the
  // viewer rests on holds at some settings and not others.
  ['a funny-level variant stops mentioning the commit behind each line',
    swap(APP, "      'Every version that actually shipped, newest first, each line carrying the commit that did it. Filter by date, search it, export what you can see. The entries stay exactly as the release wrote them, because that is the point of them.',",
      "      'Every version that actually shipped, newest first. Filter by date, search it, export what you can see. The entries stay exactly as the release wrote them, because that is the point of them.',")],

  // ---- Export ------------------------------------------------------------------

  // The export ignores the active filter and hands over the whole history while the
  // screen shows one version. The file looks perfectly well-formed.
  ['the export ignores the active search and date range',
    swap(APP, "    const {matches}=changelogVisibleEntries(query);\n    const rows=changelogExportRows(matches);",
      '    const {entries}=changelogVisibleEntries(query);\n    const rows=changelogExportRows(entries);')],

  // The exported file no longer states the range it covers, so a file on somebody's
  // disk a month later says nothing about what it is a changelog OF.
  ['the exported rows stop stating their own range',
    swap(APP, '          exportedRange:range,\n', '')],

  // The range is computed once for the whole history rather than for what was exported,
  // so a filtered export claims a range it does not cover.
  ['a filtered export claims the range of the whole history',
    swap(APP, '  function changelogExportRows(entries){\n    const range=changelogRangeLabel(entries);',
      '  function changelogExportRows(entries){\n    const range=changelogRangeLabel(parseChangelog(CHANGELOG_MARKDOWN).entries);')],

  // The format list is hard-coded rather than derived, so a format the engine would
  // refuse for these rows is offered anyway.
  ['the export format list stops being derived from what the engine judges suitable',
    swap(APP, '    const rows=changelogExportRows(matches),formats=suitableFormats(rows),previous=select.value;',
      "    const rows=changelogExportRows(matches),formats=['json'],previous=select.value;")],

  // An export runs with nothing on screen and writes an empty file.
  ['an export runs with nothing shown',
    swap(APP, '    if(!rows.length)return undefined;', '')],

  // ---- Wiring ------------------------------------------------------------------

  // Commented out rather than removed, for the same reason as above: this is how a
  // wiring line actually dies, and a substring needle is satisfied by the comment.
  ['the startup call is commented out rather than removed',
    swap(APP, 'initReleaseNotes();initChangelog();initUpdates();', 'initReleaseNotes();/*initChangelog();*/initUpdates();')],

  // The first render never happens, so the section is empty until somebody types.
  ['nothing renders the changelog until the reader touches a control',
    swap(APP, '    rerender();\n  }\n', '  }\n')],

  // Typing in the search no longer re-renders, so the search box does nothing at all.
  ['typing in the search no longer re-renders',
    swap(APP, "    $('changelog-search')?.addEventListener('input',rerender);", '')],

  // The early return goes, so every page without a changelog runs the whole init.
  ['initChangelog stops returning early on a page with no changelog',
    swap(APP, "    if(!$('changelog-entries'))return;", '')],

  // The panel stops being remembered, so a reader who collapses it finds it open again
  // on the next page load.
  ['the filter panel stops remembering whether it was collapsed',
    swap(APP, "'settings-filters-panel':'settingsFilters','changelog-filters-panel':'changelogFilters'};",
      "'settings-filters-panel':'settingsFilters'};")],

  // The setting disappears from DEFAULTS, so "Reset settings" silently stops clearing it.
  ['the collapsed state is no longer a stored default',
    swap(APP, 'settingsFilters:false,changelogFilters:false}};', 'settingsFilters:false}};')],

  // The regular-expression builder loses its anchor to this field, so the trigger opens
  // a builder attached to nothing.
  ['the search loses its anchored regular-expression builder',
    swap(DOWNLOADS, '<button class="regex-trigger" type="button" data-regex-for="changelog-search"',
      '<button class="regex-trigger" type="button"')],

  // The date field stops being a date field, so it loses its calendar, its month and
  // year jump, and its own report of a half-typed value.
  ['the "from" bound stops being a native date field',
    swap(DOWNLOADS, '<input id="changelog-date-from" type="date"', '<input id="changelog-date-from" type="text"')],

  // ---- The build ---------------------------------------------------------------

  // The committed source ships a stale copy of the release history, which is then never
  // refreshed and is wrong from the first release after it was written.
  ['the committed source ships a hard-coded changelog instead of an empty one',
    swap(APP, "  const CHANGELOG_MARKDOWN = '';",
      "  const CHANGELOG_MARKDOWN = '## 9.9.9 — 2026-01-01\\n### General\\n- Something (0123456789abcdef0123456789abcdef01234567)';")],

  // The build stops injecting anything, so the published page carries the honest empty
  // state forever while looking exactly as though it were working.
  ['the build no longer injects the real release history',
    swap(BUILD, `    text = replaceOnce(text, "const CHANGELOG_MARKDOWN = '';", \`const CHANGELOG_MARKDOWN = \${JSON.stringify(changelogValues.markdown)};\`, asset);`,
      '')],

  // Links are emitted without ever asking git whether the commits exist, so a rewritten
  // history publishes a page full of 404s.
  ['the build stops verifying the commits it is about to link to',
    swap(BUILD, "    report = execFileSync('git', ['cat-file', '--batch-check'], {",
      "    report = commits.map((c) => `${c} commit 1`).join('\\n') && String({")],

  // git reporting a commit missing becomes a warning, so the build ships the dead links
  // it was just told about.
  ['a commit git reports missing no longer fails the build',
    swap(BUILD, '    throw new Error(`Changelog: git reports ${missing.length} referenced commit(s) missing from this repository, `\n      + `so their links would be dead: ${missing.slice(0, 5).join(\', \')}`);',
      '    console.log(`Changelog: ${missing.length} referenced commit(s) are missing.`);')],

  // THE DEFECT THAT ACTUALLY SHIPPED. A shallow clone that simply never fetched the
  // objects reports them missing, and reading that as "the repository lost them" fails
  // the build on a repository that has every one of them. It broke a real Pages deploy;
  // 45 breaks had gone red and green beforehand and none of them saw it, because they
  // were all about the shape of the resolver rather than the judgement inside it.
  ['a missing object in a shallow clone is read as a dead link again',
    swap(BUILD, "  return shallow === false ? 'dead' : 'unverifiable';", "  return 'dead';")],

  // The other direction: a complete clone reporting a commit missing stops failing, so a
  // genuinely dead link ships.
  ['a complete clone reporting a missing commit no longer fails the build',
    swap(BUILD, "  return shallow === false ? 'dead' : 'unverifiable';", "  return 'unverifiable';")],

  // Nothing missing stops meaning verified, so a perfectly good build drops its links.
  ['a clean verification stops counting as verified',
    swap(BUILD, "  if (missingCount === 0) return 'verified';", "  if (missingCount < 0) return 'verified';")],

  // An unknown clone depth is treated as a complete clone, so a machine where git will
  // not answer fails the build instead of declining to link.
  ['an unknown clone depth is treated as a complete clone',
    swap(BUILD, "    if (answer === 'false') return false;\n    return undefined;", '    return false;')],

  // The resolver stops asking about depth at all and asserts a complete clone, which is
  // the state the defect shipped in. Wired at one end and consumed at neither is this
  // repository's most-repeated failure, and a pure function nobody calls is exactly it.
  //
  // A weaker break was tried here first and is recorded rather than replaced quietly:
  // breaking the git invocation itself inside `isShallowCheckout` left everything green,
  // and correctly so. Every failure path in that function returns `undefined`, and
  // `undefined` is already treated as "cannot tell", so a broken invocation degrades to
  // dropping the links rather than to anything wrong. The only genuinely dangerous
  // answer is a WRONG `false`, and that has its own case above.
  ['the resolver stops asking about depth and asserts a complete clone',
    swap(BUILD, 'changelogVerificationVerdict(missing.length, isShallowCheckout())',
      'changelogVerificationVerdict(missing.length, false)')],

  // The Pages checkout goes back to one commit, so the build is correct and the
  // published changelog silently loses every commit link -- the quiet half of the same
  // defect, where nothing fails and the page just gets worse.
  ['the Pages checkout goes back to cloning one commit',
    swap(WORKFLOW, '          fetch-depth: 200\n', '')],

  // A repository that is not https is passed through to the page.
  ['the build stops refusing a repository URL that is not https',
    swap(BUILD, "  if (!/^https:\\/\\/\\S+$/.test(repository)) {", '  if (false) {')],

  // ---- The registries ----------------------------------------------------------

  // The registry claims the feature is still absent while the code implements it.
  ['the registry claims the feature is still absent',
    swap(REGISTRY, '"changelog-viewer": {\n      "status": "implemented-unverified",', '"changelog-viewer": {\n      "status": "absent",')],

  // The recorded file list drifts from where the feature actually lives, so the next
  // person looking for it is sent to the wrong files.
  ['the registry forgets one of the files the feature lives in',
    swap(REGISTRY, '          "site/app.js",\n          "site/build.mjs",\n          "site/downloads.html",',
      '          "site/app.js",\n          "site/downloads.html",')],

  // The localization registry claims the description is untranslated while four
  // Cantonese variants of it ship.
  ['the localization registry claims the description is untranslated',
    swap(LOCALES, '"changelog-viewer": {\n      "state": "localized",', '"changelog-viewer": {\n      "state": "not-localized",')],

  // The copy key disappears from the recorded set, so the registry no longer knows what
  // it is claiming coverage of.
  //
  // Anchored to this entry alone rather than to it and whatever happens to follow it. The
  // pair broke on 2026-08-26 when the right-click menu added two keys that sort between
  // them, and this script's own did-the-bytes-change assertion reported it as a FAILED
  // CASE rather than letting it pass as a guard that held. The four leading spaces are
  // what tell this entry in `knownCopyKeys` apart from the same key eight spaces deep
  // inside a feature row.
  ['the recorded copy-key list forgets changelogDesc',
    swap(LOCALES, '    "changelogDesc",\n', '')],
];

const runTest = () => {
  try {
    execFileSync(process.execPath, ['--test', TEST], { cwd: consoleRoot, stdio: 'pipe' });
    return 'green';
  } catch {
    return 'red';
  }
};

const baseline = runTest();
if (baseline !== 'green') {
  console.error('FAIL: the untouched contract test is already red, so nothing below would mean anything.');
  process.exit(1);
}

let failures = 0;
for (const [name, plant] of cases) {
  let planted;
  try {
    planted = plant();
  } catch (error) {
    console.error(`FAILED CASE  ${name}: ${error.message}`);
    failures += 1;
    continue;
  }
  if (planted.after === planted.before) {
    /* The break that never landed. It reads exactly like a guard that held, so it is a
     * failure of this script rather than a pass for the test. */
    console.error(`FAILED CASE  ${name}: the replacement changed no bytes, so nothing was broken`);
    failures += 1;
    continue;
  }

  let broken;
  try {
    writeFileSync(planted.path, planted.after);
    broken = runTest();
  } finally {
    writeFileSync(planted.path, planted.before);
    if (readFileSync(planted.path, 'utf8') !== planted.before) {
      console.error(`FAILED CASE  ${name}: the original bytes were NOT restored -- repair this file by hand`);
      process.exit(1);
    }
  }

  const restored = runTest();
  const ok = broken === 'red' && restored === 'green';
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  broke=${broken.padEnd(5)} restored=${restored.padEnd(5)}  ${name}`);
}

if (failures > 0) {
  console.error(`FAIL: ${failures} of ${cases.length} planted break(s) did not turn the contract test red and green again.`);
  process.exit(1);
}
console.log(`PASS: ${cases.length} planted break(s), each alone, each turning `
  + `${TEST} red and then green again on restore.`);
