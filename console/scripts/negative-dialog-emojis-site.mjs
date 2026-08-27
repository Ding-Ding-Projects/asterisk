#!/usr/bin/env node
/**
 * Deliberate red-then-green proof for site/tests/contracts/dialog-emojis.test.mjs.
 *
 * A decoration switch is unusually easy to ship broken in a way nothing complains about.
 * "The value is stored", "the checkbox reflects it" and "the control is on the page" are
 * all true of a switch that never reaches a single pixel, and they are exactly what a
 * source-pattern test checks. Worse, the failures that matter most here are silent in the
 * other direction too: a glyph that reached an accessible name is invisible on screen and
 * audible only to somebody using a screen reader, and a glyph spliced into copy looks
 * fine until the day the switch is turned off.
 *
 * So the contract test runs the real extracted source against a recording DOM -- and this
 * file is what says that test would actually notice if it stopped.
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
 * Usage:  node scripts/negative-dialog-emojis-site.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..', '..');
const consoleRoot = resolve(repo, 'console');
const TEST = 'site/tests/contracts/dialog-emojis.test.mjs';

const file = (relative) => resolve(consoleRoot, relative);
const APP = file('site/app.js');
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
  // The switch never reaches the page at all: applyState stops applying it, so a stored
  // setting is a stored setting and nothing more. This is the defect this repository has
  // shipped most often, and it is completely invisible from the markup.
  ['applyState no longer applies the decoration',
    swap(APP, 'applyVocabulary();applyDialogEmojis();', 'applyVocabulary();')],

  // Commented out rather than deleted, because that is how a wiring line usually dies --
  // and because a bare substring needle is satisfied by the comment.
  ['the checkbox wiring is commented out rather than removed',
    swap(APP, "if($('dialog-emojis'))$('dialog-emojis').onchange=event=>update('dialogEmojis',event.target.checked);",
      "/*if($('dialog-emojis'))$('dialog-emojis').onchange=event=>update('dialogEmojis',event.target.checked);*/")],

  // The control is on the page and connected to nothing.
  ['nothing wires the checkbox to the stored setting',
    swap(APP, "if($('dialog-emojis'))$('dialog-emojis').onchange=event=>update('dialogEmojis',event.target.checked);", '')],

  // The decoration is on for everybody, including people who never asked for it.
  ['the switch defaults to on',
    swap(APP, "displayName:'',dialogEmojis:false,narration:", "displayName:'',dialogEmojis:true,narration:")],

  // The setting disappears from DEFAULTS entirely, so "Reset settings" silently stops
  // clearing it and a stored true survives a reset that claims to clear everything.
  ['the switch is no longer a default at all',
    swap(APP, "displayName:'',dialogEmojis:false,narration:", "displayName:'',narration:")],

  // The glyph goes inside the heading the dialog is labelled by, so every screen reader
  // announces it on open. Nothing about this is visible on screen.
  ['the decoration is nested inside the heading the dialog is labelled by',
    swap(APP, "const host=target.within?element.querySelector(target.within):element;",
      "const host=target.within?element.querySelector(target.within).firstElementChild:element;")],

  // The decoration is exposed to assistive technology, so its glyph name is read aloud
  // in the middle of a dialog title.
  ['the decoration is no longer hidden from assistive technology',
    swap(APP, "span.setAttribute('aria-hidden','true');", "span.setAttribute('aria-hidden','false');")],

  // The decoration becomes copy as far as the personal-vocabulary walker is concerned,
  // which caches it as an original and rewrites from that cache thereafter.
  ['the decoration is no longer excluded from the vocabulary walker',
    swap(APP, "span.setAttribute('data-no-vocab','');", '')],

  // "Off" leaves an emptied span behind: still an element in the heading row, still a
  // node to anything walking the document.
  ['turning the switch off empties the decoration instead of removing it',
    swap(APP, "if(!glyph){if(existing)existing.remove();return}",
      "if(!glyph){if(existing)existing.textContent='';return}")],

  // The code stops recognising a decoration it placed itself, which has two consequences
  // at once: every apply prepends another glyph, and turning the switch off finds nothing
  // to remove. Recorded as one lie because it is one edit -- and it is the break that
  // proves the stacking assertion is not vacuous, since a first attempt here (dropping
  // the `existing||` reuse alone) left the suite green: the new element was created and
  // then never inserted, so nothing actually stacked.
  ['the code no longer recognises a decoration it already placed',
    swap(APP, 'const existing=first&&first.className===DIALOG_EMOJI_CLASS?first:null;', 'const existing=null;')],

  // One surface decorated and the rest left alone: the palette looks perfect and the
  // other five dialogs silently ignore the switch.
  ['only the first declared surface is decorated',
    swap(APP, 'for(const target of DIALOG_EMOJI_DECORATIONS){', 'for(const target of DIALOG_EMOJI_DECORATIONS.slice(0,1)){')],

  // Message boxes are left out, so the setting's own name stops being true.
  ['message boxes already on screen are never decorated',
    swap(APP, "all('#toast-region .toast').forEach(toast=>setDialogDecoration(toast,messageBoxGlyph()));", '')],

  // A new message box arrives undecorated, so the switch appears to work until the next
  // notification and then appears to stop.
  ['a newly built message box is not decorated',
    swap(APP, 'setDialogDecoration(toast,messageBoxGlyph());region.append(toast);', 'region.append(toast);')],

  // The glyph ignores the switch, so "off" is not off for message boxes.
  ['the message-box glyph ignores the switch',
    swap(APP, 'function messageBoxGlyph(){return state.dialogEmojis?MESSAGE_BOX_GLYPH:\'\'}',
      'function messageBoxGlyph(){return MESSAGE_BOX_GLYPH}')],

  // The glyph is written as markup, so a decoration could carry an element.
  ['the decoration is written as innerHTML',
    swap(APP, 'span.textContent=glyph;', 'span.innerHTML=glyph;')],

  // An emoji spliced straight into a control label -- the exact boundary the canonical
  // contract names, and the one no assertion about setDialogDecoration could ever see.
  ['an emoji is spliced into a control label in app.js',
    swap(APP, "['Home','index.html']", "['✅ Home','index.html']")],

  // The checkbox stops being read back, so a stored choice is invisible after a reload
  // and the switch looks as though it forgot.
  ['the checkbox is no longer read back from the stored setting',
    swap(APP, "if($('dialog-emojis'))$('dialog-emojis').checked=on;", '')],

  // The status line stops naming the boundary, so somebody turning the switch on has no
  // way to know a screen-reader name is unaffected.
  ['the on-state status line stops naming the control boundary',
    swap(APP, 'Every word is exactly as it was, and no button, label or screen-reader name carries one.',
      'Every word is exactly as it was.')],

  // A funny level quietly drops one of the two facts, so the disclosure is stated at some
  // levels and not at others -- worse than never stating it, because it looks stated.
  ['the maximum English funny level stops naming controls',
    swap(APP, 'and no button, label or screen-reader name ever gets one — decoration you can look at is fine',
      'and nothing else ever gets one — decoration you can look at is fine')],

  // The Cantonese copy loses the same fact, which an English-only reviewer never sees.
  ['a Cantonese funny level stops saying the wording is unchanged',
    swap(APP, '其他一律唔郁：字句一個字都唔會變，按鈕、標籤同螢幕閱讀器名稱一律唔會有。',
      '其他一律唔郁：按鈕、標籤同螢幕閱讀器名稱一律唔會有。')],

  // The card description is unhooked from the funny levels, so it renders one tone at
  // every setting while both sliders appear to work.
  ['the card description is unhooked from the funny-level copy',
    swap(SETTINGS, '<p id="dialog-emojis-desc" data-copy="dialogEmojisDesc">', '<p id="dialog-emojis-desc">')],

  // The visible label goes, leaving a checkbox nobody can name or click the text of.
  ['the checkbox loses its visible label',
    swap(SETTINGS, '<label><input id="dialog-emojis" type="checkbox"> Show emojis in dialogs and message boxes</label>',
      '<input id="dialog-emojis" type="checkbox">')],

  // The card stops being findable from the settings search.
  ['the card loses its settings-search terms',
    swap(SETTINGS, 'data-search="dialog emoji emojis message box decoration heading icons"', 'data-search=""')],

  // Reset settings clears the switch without saying so, which is the "silently skipping"
  // defect applied to a destructive gate.
  ['the reset gate stops naming the switch among the things it clears',
    swap(SETTINGS, 'the display name you chose, the dialog emoji switch, the spoken-narration switch',
      'the display name you chose, the spoken-narration switch')],

  // The heading stops holding its own width, so the decoration pushes the title into the
  // middle of the heading bar and the switch visibly moves the layout.
  ['the dialog heading no longer holds its own width',
    swap(CSS, '.dialog-heading h2{margin:0;flex:1 1 auto}', '.dialog-heading h2{margin:0}')],

  // The message box stops being a flex row, so the decoration sits above the title
  // instead of beside it.
  ['the message box is no longer a flex row',
    swap(CSS, 'box-shadow:var(--shadow-2);display:flex;align-items:flex-start}', 'box-shadow:var(--shadow-2)}')],

  // The registry claims the feature is still absent while the code implements it.
  ['the registry claims the feature is still absent',
    swap(REGISTRY, '"dialog-emojis": {\n      "status": "implemented-unverified",', '"dialog-emojis": {\n      "status": "absent",')],

  // The localization registry claims the card is untranslated while four Cantonese
  // variants of its description ship.
  ['the localization registry claims the card is untranslated',
    swap(LOCALES, '"dialog-emojis": {\n      "state": "localized",', '"dialog-emojis": {\n      "state": "not-localized",')],
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
