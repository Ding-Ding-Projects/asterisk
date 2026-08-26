#!/usr/bin/env node
/**
 * Deliberate red-then-green proof for site/tests/contracts/automatic-updates.test.mjs.
 *
 * A version watch is unusually easy to ship broken in a way nothing complains about.
 * "The constant is there", "the button is on the page" and "a check ran" are all true of
 * a watch that never notices anything, and a watch that notices nothing looks exactly
 * like a site that has not been republished. The failures that matter most are silent in
 * the other direction too: a comparison resting on the version label reports `current`
 * about a page that is not, and a poll that notifies every half hour is nagging that
 * only shows up to somebody who left a tab open.
 *
 * So the contract test runs the real extracted source against a recording page and a
 * fake network -- and this file is what says that test would actually notice if it
 * stopped.
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
 * Usage:  node scripts/negative-automatic-updates-site.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..', '..');
const consoleRoot = resolve(repo, 'console');
const TEST = 'site/tests/contracts/automatic-updates.test.mjs';

const file = (relative) => resolve(consoleRoot, relative);
const APP = file('site/app.js');
const BUILD = file('site/build.mjs');
const SETTINGS = file('site/settings.html');
const CSS = file('site/styles.css');
const REGISTRY = file('site/feature-registry.json');
const LOCALES = file('site/locales/feature-registry.json');

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
  // ---- The watch never reaches the page ----

  // Commented out rather than deleted, because that is how a wiring line usually dies --
  // and because a bare substring needle is satisfied by the comment. The whole feature
  // becomes dead code and every unit assertion about it keeps passing.
  ['the init call is commented out rather than removed',
    swap(APP, 'initChangelog();initUpdates();', 'initChangelog();/*initUpdates();*/')],

  ['nothing calls initUpdates at all',
    swap(APP, 'initChangelog();initUpdates();', 'initChangelog();')],

  ['init never checks on startup, so the page only learns anything half an hour in',
    swap(APP, "    renderUpdateState();\n    checkForUpdate({manual:false});\n    startUpdateWatch();",
      '    renderUpdateState();\n    startUpdateWatch();')],

  ['init never starts the background schedule',
    swap(APP, "    checkForUpdate({manual:false});\n    startUpdateWatch();", '    checkForUpdate({manual:false});')],

  ['the Check for updates button is wired to nothing',
    swap(APP, "    if($('update-check'))$('update-check').onclick=()=>{checkForUpdate({manual:true})};\n", '')],

  ['the banner is never put on the page',
    swap(APP, '  function initUpdates(){\n    ensureUpdateUI();', '  function initUpdates(){')],

  // ---- The comparison stops meaning anything ----

  // The defect this whole feature is arranged around: two builds of one release wear one
  // label, so a check on the label reports "current" about a page that is not.
  ['the verdict compares the version label instead of the commit',
    swap(APP, 'if(deployed.commit===running.commit)return {state:\'current\',direction:\'same\'};',
      'if(deployed.version===running.version)return {state:\'current\',direction:\'same\'};')],

  ['every difference is announced as newer, so a roll-back reads as an update',
    swap(APP, "    if(order===-1)return {state:'available',direction:'newer'};\n    if(order===1)return {state:'available',direction:'older'};",
      "    if(order===1)return {state:'available',direction:'newer'};")],

  ['unorderable labels are guessed at rather than left unknown',
    swap(APP, '    if(!a||!b)return null;', '    if(!a||!b)return -1;')],

  ['version labels are compared as strings, so v0.1.10 sorts before v0.1.5',
    swap(APP, '    for(let i=0;i<3;i+=1)if(a[i]!==b[i])return a[i]<b[i]?-1:1;\n    return 0;',
      '    const l=String(left),r=String(right);\n    if(l===r)return 0;\n    return l<r?-1:1;')],

  ['an unbuilt page is treated as a build like any other',
    swap(APP, "    if(!running||!running.commit)return {state:'unbuilt',direction:'unknown'};\n", '')],

  // ---- The one request stops being safe ----

  ['the manifest address is no longer refused when it leaves this origin',
    swap(APP, '    if(there.origin!==here.origin)return null;\n', '')],

  ['the request address is written as an absolute URL instead of being resolved',
    swap(APP, '    const url=versionManifestUrl(BASE,document.baseURI);',
      "    const url='https://example.invalid/version.json';")],

  ['the request carries credentials',
    swap(APP, "cache:'no-store',credentials:'omit',signal:controller.signal", "cache:'no-store',signal:controller.signal")],

  ['the request may be answered from cache, so a reload is never noticed',
    swap(APP, "cache:'no-store',credentials:'omit'", "cache:'default',credentials:'omit'")],

  ['a request that never answers is left hanging forever',
    swap(APP, '    const timer=setTimeout(()=>{controller.abort()},UPDATE_FETCH_TIMEOUT_MS);', '    const timer=0;')],

  ['an unbuilt page asks anyway, and a failing request reads as a site that is down',
    swap(APP, "      updateWatch={...updateWatch,state:'unbuilt',direction:'unknown',reason:'',inFlight:false};\n      renderUpdateState();\n      return updateWatch;\n",
      "      updateWatch={...updateWatch,state:'unbuilt',direction:'unknown',reason:'',inFlight:false};\n      renderUpdateState();\n")],

  ['a second check may run while one is already in flight',
    swap(APP, '    if(updateWatch.inFlight)return updateWatch;\n', '')],

  // ---- The reader stops refusing things ----

  ['the size bound is applied after the JSON is parsed instead of before it',
    swap(APP, "    if(text.length>UPDATE_MANIFEST_MAX_BYTES)return {ok:false,reason:`the published version manifest is larger than the ${UPDATE_MANIFEST_MAX_BYTES}-byte bound this page will read`};\n", '')],

  ['a manifest declaring any schema version is read',
    swap(APP, '    if(parsed.schemaVersion!==1)', '    if(false)')],

  ['a partial or upper-case commit is accepted as an identity',
    swap(APP, "    if(typeof commit!=='string'||!/^[0-9a-f]{40}$/.test(commit))", "    if(typeof commit!=='string'||commit.length===0)")],

  ['any string at all passes as a build time',
    swap(APP, "    if(typeof builtAt!=='string'||!Number.isFinite(Date.parse(builtAt)))", "    if(typeof builtAt!=='string')")],

  ['an array is read as a manifest',
    swap(APP, "    if(typeof parsed!=='object'||parsed===null||Array.isArray(parsed))", "    if(typeof parsed!=='object')")],

  // ---- The banner stops behaving ----

  // The exact defect this pass shipped and the test caught: `repeat` read after the state
  // had already moved to `checking`, so it was always false and every poll notified.
  ['the already-announced check reads the state after it has moved to checking',
    swap(APP, 'const repeat=previous.state===\'available\'', 'const repeat=updateWatch.state===\'available\'')],

  ['Later is not remembered, so the banner returns on the very next poll',
    swap(APP, '    state.updateDismissedCommit=updateWatch.deployed.commit;\n    save();\n', '')],

  ['Later is not persisted, so it comes straight back on the next page of this site',
    swap(APP, '    state.updateDismissedCommit=updateWatch.deployed.commit;\n    save();',
      '    state.updateDismissedCommit=updateWatch.deployed.commit;')],

  ['Later silences every future build, not just the one it was said about',
    swap(APP, "&&state.updateDismissedCommit!==deployed.commit;", "&&state.updateDismissedCommit==='';")],

  ['the reload control is decoration -- it looks live and reloads nothing',
    swap(APP, "    reload.addEventListener('click',()=>{location.reload()});\n", '')],

  ['the page reloads itself the moment it notices, without asking',
    swap(APP, "    reload.addEventListener('click',()=>{location.reload()});",
      '    location.reload();')],

  ['the banner no longer says what reloading costs',
    swap(APP, "    note.textContent=applyVocabularyText('Reloading fetches the published page. Your settings are saved as you change them, but anything typed into a field and not yet saved is lost.');\n", '')],

  ['the banner is not announced to a screen reader',
    swap(APP, "    banner.setAttribute('role','status');banner.setAttribute('aria-live','polite');",
      "    banner.setAttribute('aria-live','polite');")],

  ['the banner headline skips the personal vocabulary',
    swap(APP, '    headline.textContent=applyVocabularyText(updateHeadline(updateWatch));',
      '    headline.textContent=updateHeadline(updateWatch);')],

  ['the card status line skips the personal vocabulary',
    swap(APP, "    if($('update-status'))$('update-status').textContent=applyVocabularyText(updateStatusLine(updateWatch,running));",
      "    if($('update-status'))$('update-status').textContent=updateStatusLine(updateWatch,running);")],

  ['a disabled check button says nothing about why',
    swap(APP, '      if(why)button.title=why;else button.removeAttribute(\'title\');\n', '')],

  ['a background poll that fails reports back every half hour',
    swap(APP, '    if(manual)notify(\'Update check failed\'', '    if(true)notify(\'Update check failed\'')],

  ['a failed check leaves the previous verdict on screen instead of saying it failed',
    swap(APP, "    updateWatch={...updateWatch,inFlight:false,state:'failed',reason:failure,checkedAt:Date.now()};\n    renderUpdateState();",
      "    updateWatch={...updateWatch,inFlight:false,reason:failure,checkedAt:Date.now()};\n    renderUpdateState();")],

  // ---- The build stops publishing a truthful identity ----

  ['the build invents a commit rather than refusing to name one it cannot resolve',
    swap(BUILD, "    return { resolved: false, reason: 'git could not name the commit this site was built from' };",
      "    return { resolved: true, version: 'unversioned', commit: '0'.repeat(40), builtAt: new Date().toISOString() };")],

  ['the build bakes an identity into a page whose manifest it never publishes',
    swap(BUILD, "if (buildIdentity.resolved) {\n  await writeFile(join(output, 'version.json')", "if (false) {\n  await writeFile(join(output, 'version.json')")],

  ['the build stops baking the commit, so every published page reports itself unbuilt',
    swap(BUILD, `      text = replaceOnce(text, "const SITE_BUILD_COMMIT = '';", \`const SITE_BUILD_COMMIT = \${JSON.stringify(buildIdentity.commit)};\`, asset);\n`, '')],

  ['the committed source ships a build identity of its own, which is stale the day after',
    swap(APP, "  const SITE_BUILD_COMMIT = '';", "  const SITE_BUILD_COMMIT = 'dd46f8dcbf727f5a8b895f4d9275e0e97752f9bf';")],

  // ---- The records stop agreeing with the code ----

  ['the settings card is gone from the page',
    swap(SETTINGS, '<article class="setting-card setting-card-stack" data-search="update updates version published deployed reload check current changelog">',
      '<article class="setting-card setting-card-stack" data-search="update">')],

  ['the card stops naming the four clauses this surface cannot support',
    swap(SETTINGS, 'there is no staged download, no signature to verify, no restart, and nothing to roll back',
      'updates work differently here')],

  ['the description is unhooked from the funny-level sliders',
    swap(SETTINGS, '<p id="updates-desc" data-copy="updatesDesc">', '<p id="updates-desc">')],

  ['a hidden banner still occupies the page',
    swap(CSS, '.update-banner[hidden]{display:none}\n', '')],

  ['the registry still calls the feature absent',
    swap(REGISTRY, '"automatic-updates": {\n      "state": "implemented",', '"automatic-updates": {\n      "state": "absent",')],

  ['the registry names only the page, not the build that publishes what it checks against',
    swap(REGISTRY, '        "site/app.js",\n        "site/build.mjs",\n        "site/settings.html",',
      '        "site/app.js",\n        "site/settings.html",')],

  ['the localization registry still calls the feature untranslated',
    swap(LOCALES, '"automatic-updates": {\n      "state": "localized",', '"automatic-updates": {\n      "state": "not-localized",')],

  ['the new copy key is missing from the known-keys list',
    swap(LOCALES, '    "themeDesc",\n    "updatesDesc"', '    "themeDesc"')],

  // A reset clears the dismissal and then nothing re-renders, so a banner somebody has
  // just been given back stays invisible until the next poll half an hour later.
  ['applyState stops re-rendering the watch, so a settings reset changes nothing on screen',
    swap(APP, 'renderAllModeStatuses();renderUpdateState();renderSupportCopy()}', 'renderAllModeStatuses();renderSupportCopy()}')],

  ['the reset gate stops naming the dismissal it clears',
    swap(SETTINGS, ', and any published-version banner you set aside with Later', '')],
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
