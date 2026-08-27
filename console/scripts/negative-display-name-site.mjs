#!/usr/bin/env node
/**
 * Deliberate red-then-green proof for site/tests/contracts/app-display-name.test.mjs.
 *
 * A rename is unusually easy to ship broken in a way nothing complains about. "The value
 * is stored", "the setting persists" and "the control is on the page" are all true of a
 * rename that never reaches a single pixel, and they are exactly what a source-pattern
 * test checks. So the contract test runs the real extracted source against a recording
 * page -- and this file is what says that test would actually notice if it stopped.
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
 *     that held, and a `sed` that matched nothing is the commonest way to fake a green.
 *
 * Usage:  node scripts/negative-display-name-site.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..', '..');
const consoleRoot = resolve(repo, 'console');
const TEST = 'site/tests/contracts/app-display-name.test.mjs';

const file = (relative) => resolve(consoleRoot, relative);
const APP = file('site/app.js');
const SETTINGS = file('site/settings.html');
const INDEX = file('site/index.html');
const REGISTRY = file('site/feature-registry.json');

/**
 * Replaces `from` with `to` exactly once, refusing anything that is not exactly once.
 *
 * Anchors are written with `\n` and rewritten to whatever the file on disk actually uses.
 * Parts of this checkout are CRLF, and a newline-only anchor against a CRLF file matches
 * nothing at all -- which, without the exactly-once check below, would read as a guard
 * that held rather than as a break that never happened. Two of the cases here did exactly
 * that on their first run.
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
  // The rename never reaches the page at all: applyState stops applying it, so a stored
  // name is a stored name and nothing more.
  ['applyState no longer applies the display name',
    swap(APP, 'applyLogo();applyDisplayName();applyVocabulary();', 'applyLogo();applyVocabulary();')],

  // The ordering trap. applyVocabularyToNode caches the first text it sees per node and
  // rewrites from that cache forever after, so running it first puts the shipped name
  // straight back after every rename -- with nothing failing to say so.
  ['the vocabulary walker runs before the rename, reverting it every time',
    swap(APP, 'applyLogo();applyDisplayName();applyVocabulary();', 'applyLogo();applyVocabulary();applyDisplayName();')],

  // The control is on the page and connected to nothing. This is the defect this
  // repository has shipped most often, and it is invisible from the markup.
  /* The anchor gained a neighbour on 2026-08-26, when initNarration() was wired into
   * initSettings beside this call. It moved because this script's own did-the-bytes-
   * change check reported the break as a FAILED CASE rather than letting an edit that
   * never landed read as a guard that held. */
  ['nothing calls initDisplayName(), so the field and the reset button are inert',
    swap(APP, 'initDisplayName();initNarration();', 'initNarration();')],

  // Commented out rather than deleted, because that is how a wiring line usually dies --
  // and because a bare substring needle is satisfied by the comment.
  ['the initDisplayName() call is commented out rather than removed',
    swap(APP, 'initDisplayName();initNarration();', '/*initDisplayName();*/initNarration();')],

  // One brand line renamed and the other left alone: the header changes, the footer does
  // not, and a screenshot of the top of the page looks perfect.
  ['only the first brand line is renamed',
    swap(APP, "all('.brand-name').forEach(el=>{el.textContent=name});",
      "all('.brand-name').slice(0,1).forEach(el=>{el.textContent=name});")],

  // Renames compound: composing against the live title instead of the shipped one means
  // the second rename has nothing left to replace.
  ['the tab title is recomposed from the previous rename instead of the shipped title',
    swap(APP, 'document.title=SHIPPED_TITLE.split(SHIPPED_PRODUCT_NAME).join(name);',
      'document.title=document.title.split(SHIPPED_PRODUCT_NAME).join(name);')],

  // The bound disappears, so a hand-edited settings file can put an arbitrarily long
  // string into the brand cell.
  ['the stored name is no longer bounded',
    swap(APP, 'state.displayName=String(raw||\'\').slice(0,DISPLAY_NAME_MAX);', 'state.displayName=String(raw||\'\');')],

  // The field is rewritten under the person typing into it, so the cursor jumps and
  // half a name becomes the whole name.
  ['the focused field is overwritten mid-keystroke',
    swap(APP, 'if(field&&document.activeElement!==field)field.value=state.displayName||\'\';',
      'if(field)field.value=state.displayName||\'\';')],

  // A typed name becomes markup.
  ['the display name is written as innerHTML',
    swap(APP, 'all(\'.brand-name\').forEach(el=>{el.textContent=name});',
      'all(\'.brand-name\').forEach(el=>{el.innerHTML=name});')],

  // Identity derived from the label: renaming the page silently orphans every setting
  // the person had stored under the old key. This is the failure the whole boundary
  // exists to prevent, and nothing about the rename itself would ever surface it.
  ['the storage key is derived from the display name',
    swap(APP, "const STORAGE_KEY = 'ding-pbx-pages-v2';",
      'const STORAGE_KEY = `ding-pbx-pages-v2-${String(state.displayName||\'\')}`;')],

  // The rename reaches the metadata other people read, so a link somebody pastes into a
  // chat window claims a product that does not exist.
  ['app.js rewrites the og: metadata other people read',
    swap(APP, 'document.title=SHIPPED_TITLE.split(SHIPPED_PRODUCT_NAME).join(name);',
      'document.title=SHIPPED_TITLE.split(SHIPPED_PRODUCT_NAME).join(name);'
      + 'const m=document.querySelector(\'meta[property="og:site_name"]\');if(m)m.content=name;')],

  // History fills with one entry per keystroke, which makes the local-history panel
  // useless for exactly the change it is recording.
  ['every keystroke writes its own history entry',
    swap(APP, 'save();\n    applyDisplayName();\n  }\n  function commitDisplayName(){',
      'save();\n    applyDisplayName();\n    recordHistory(\'display-name-changed\',\'typed\');\n  }\n  function commitDisplayName(){')],

  // The status line stops naming the shipped product, so somebody who renamed the page
  // has no way to know what a file they export will say.
  ['the renamed status line stops naming the shipped product',
    swap(APP, '? `This site calls itself “${name}” here. Downloads, exports and the link preview other people see still say ${SHIPPED_PRODUCT_NAME}.`',
      '? `This site calls itself “${name}” here.`')],

  // Whitespace becomes a name, so the brand cell renders empty and the site looks broken.
  ['whitespace alone is accepted as a name',
    swap(APP, "const chosen=String(state.displayName||'').trim();", "const chosen=String(state.displayName||'');")],

  // A funny level quietly drops the boundary, so the disclosure is stated at some levels
  // and not at others -- which is worse than never stating it, because it looks stated.
  ['the maximum English funny level stops naming the shipped product',
    swap(APP, 'stubbornly stay Material Asterisk', 'stubbornly stay put')],

  // One page loses its hook, so five pages rename and the sixth silently does not.
  ['one page loses its footer brand-name hook',
    swap(INDEX, '<strong class="brand-name">Material Asterisk</strong><small>Documentation &amp; download surface</small>',
      '<strong>Material Asterisk</strong><small>Documentation &amp; download surface</small>')],

  // Reset settings clears the chosen name without saying so, which is the "silently
  // skipping" defect applied to a destructive gate.
  ['the reset gate stops naming the display name among the things it clears',
    swap(SETTINGS, 'text size, the display name you chose, the dialog emoji switch, the spoken-narration switch',
      'text size, the dialog emoji switch, the spoken-narration switch')],

  // The card stops being findable from the settings search.
  ['the card loses its settings-search terms',
    swap(SETTINGS, 'data-search="display name rename brand identity title chrome"', 'data-search=""')],

  // The description stops going through the funny-level boundary, so it renders one tone
  // at every setting while the sliders appear to work.
  ['the card description is unhooked from the funny-level copy',
    swap(SETTINGS, '<p id="display-name-desc" data-copy="displayNameDesc">', '<p id="display-name-desc">')],

  // The registry claims the feature is still absent while the code implements it.
  ['the registry claims the feature is still absent',
    swap(REGISTRY, '"app-display-name": {\n      "status": "implemented-unverified",',
      '"app-display-name": {\n      "state": "absent",')],
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
