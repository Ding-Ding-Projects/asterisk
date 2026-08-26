#!/usr/bin/env node
/**
 * Deliberate red-then-green proof for site/tests/contracts/school-mode.test.mjs.
 *
 * A mode that restricts a page is unusually easy to ship as a switch that restricts
 * nothing, and every symptom of that points the wrong way: the record says on, the card
 * says on, the checkbox reflects it, and the page carries on exactly as it did. Worse,
 * the failures on the other side are silent in the direction that looks safe -- a lock
 * whose value is sitting in local storage in the clear behaves identically to one whose
 * value was never stored, right up until somebody opens the developer tools.
 *
 * So the contract test runs the real extracted source over a recording DOM, a fake
 * storage and Node's own Web Crypto -- and this file is what says that test would
 * actually notice if it stopped.
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
 *     rather than counted as a pass. An edit that never landed reads exactly like a
 *     guard that held, and an anchor written with `\n` against a CRLF file is the
 *     commonest way to fake a green.
 *
 * Usage:  node scripts/negative-school-mode-site.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..', '..');
const consoleRoot = resolve(repo, 'console');
const TEST = 'site/tests/contracts/school-mode.test.mjs';

const file = (relative) => resolve(consoleRoot, relative);
const APP = file('site/app.js');
const SETTINGS = file('site/settings.html');
const CSS = file('site/styles.css');
const REGISTRY = file('site/feature-registry.json');
const LOCALES = file('site/locales/feature-registry.json');
const ARTICLE = file('docs/platform/school-mode.md');

/**
 * Replaces `from` with `to` exactly once, refusing anything that is not exactly once.
 *
 * Anchors are written with `\n` and rewritten to whatever the file on disk actually
 * uses, for the CRLF reason above.
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
  /* ---- The mode never reaches the page at all. ---- */

  // The record says on and the page carries on unchanged. This is the defect this
  // repository has shipped most often, and it is invisible from the markup.
  ['applyState no longer applies the mode',
    swap(APP, 'function applyState(){applySchoolMode();', 'function applyState(){')],

  // Commented out rather than deleted, because that is how a wiring line usually dies --
  // and because a bare substring needle is satisfied by the comment.
  ['the initSchool() call is commented out rather than removed',
    swap(APP, 'initDisplayName();initNarration();initSchool();', 'initDisplayName();initNarration();/*initSchool();*/')],

  ['nothing starts the card at all',
    swap(APP, 'initDisplayName();initNarration();initSchool();', 'initDisplayName();initNarration();')],

  ['nothing subscribes to the shared record, so a second tab is a second answer',
    swap(APP, 'function init(){ensureAttentionUI();initSchoolWatch();', 'function init(){ensureAttentionUI();')],

  /* ---- The record, and the two ways it must not be reachable. ---- */

  ['the record shares the settings key, so a reset would clear it',
    swap(APP, "const SCHOOL_KEY='ding-pbx-pages-school-v1';", "const SCHOOL_KEY='ding-pbx-pages-v2';")],

  ['a record that says on with no credential locks the page with no way back',
    swap(APP, 'function schoolActive(){return Boolean(schoolRecord.on&&schoolRecord.secret)}',
      'function schoolActive(){return Boolean(schoolRecord.on)}')],

  ['a corrupt record locks the page instead of falling back to off',
    swap(APP, '}catch{return schoolDefaultRecord()}',
      "}catch{return{on:true,name:'',secret:{algorithm:'SHA-256',saltHex:'a',digestHex:'b'}}}")],

  ['"Reset settings" reaches the record, which makes it a way around the lock',
    swap(APP, '  function performSettingsReset(){\n    Object.assign(state,DEFAULTS);',
      '  function performSettingsReset(){\n    Object.assign(state,DEFAULTS);localStorage.removeItem(SCHOOL_KEY);')],

  /* ---- The credential. ---- */

  ['the value that turns the mode off is stored beside its own digest',
    swap(APP, 'schoolRecord={...schoolRecord,on:true,secret:{algorithm:SCHOOL_DIGEST,saltHex,digestHex}};',
      'schoolRecord={...schoolRecord,on:true,secret:{algorithm:SCHOOL_DIGEST,saltHex,digestHex,value:secret}};')],

  ['the salt is a constant, so the same value always produces the same digest',
    swap(APP, 'return schoolHex(api.getRandomValues(new Uint8Array(16)));',
      "return '00000000000000000000000000000000';")],

  ['the typed value is left sitting in the field behind the locked page',
    swap(APP, "if(secretField)secretField.value='';\n    if(confirmField)confirmField.value='';",
      "if(confirmField)confirmField.value='';")],

  ['arming accepts a confirmation that does not match',
    swap(APP, "    if(secret!==String(input.confirm||''))return{arm:false,why:'mismatch'};\n", '')],

  ['arming accepts a value below the stated minimum',
    swap(APP, "    if(secret.length<SCHOOL_SECRET_MIN)return{arm:false,why:'too-short'};\n", '')],

  ['arming accepts a value past the stated maximum',
    swap(APP, "    if(secret.length>SCHOOL_SECRET_MAX)return{arm:false,why:'too-long'};\n", '')],

  ['arming a mode that is already on is allowed',
    swap(APP, "    if(input&&input.alreadyOn)return{arm:false,why:'already-on'};\n", '')],

  ['a browser with no cryptographic digest arms anyway',
    swap(APP, "    if(!input||!input.hasDigest)return{arm:false,why:'no-digest-available'};\n", '')],

  /* ---- Turning it off. ---- */

  ['any value at all turns the mode off',
    swap(APP, "return difference===0?{unlock:true,why:'match'}:{unlock:false,why:'wrong-value'};",
      "return{unlock:true,why:'match'};")],

  ['the comparison stops at the first difference, so its timing leaks how much was right',
    swap(APP, '      difference|=digestHex.charCodeAt(index)^stored.digestHex.charCodeAt(index);',
      '      if(digestHex.charCodeAt(index)!==stored.digestHex.charCodeAt(index))break;')],

  ['unlocking leaves a digest of somebody value on disk for a lock that is gone',
    swap(APP, 'schoolRecord={...schoolRecord,on:false,secret:null};', 'schoolRecord={...schoolRecord,on:false};')],

  ['a wrong value is not counted, so nothing on screen changes when one is offered',
    swap(APP, '      schoolWrongAttempts+=1;\n', '')],

  ['a wrong value leaves no trace in the local history',
    swap(APP, "      recordHistory('presentation-mode','A value that does not match was offered to the restricted presentation on this page; nothing changed.');\n", '')],

  ['unlocking is attempted even when the mode is not on',
    swap(APP, "    if(!schoolActive())return{unlock:false,why:'not-on'};\n", '')],

  /* ---- Removed, not hidden. ---- */

  ['the covered capabilities are hidden rather than removed',
    swap(APP, '    node.parentNode.replaceChild(marker,node);', '    node.hidden=true;')],

  ['one covered capability is quietly dropped from the list',
    swap(APP, "    {id:'personal-vocabulary',selector:'#settings-vocabulary-card',what:'the personal-vocabulary upload'},\n", '')],

  ['a removed control comes back as a fresh node, so everything bound to it is dead',
    swap(APP, 'if(held.marker.parentNode)held.marker.parentNode.replaceChild(held.node,held.marker);',
      "if(held.marker.parentNode)held.marker.parentNode.replaceChild(document.createElement('div'),held.marker);")],

  ['restoring twice throws instead of doing nothing the second time',
    swap(APP, '    const held=schoolRetained.get(entry.id);\n    if(!held)return;\n', '    const held=schoolRetained.get(entry.id);\n')],

  ['the placeholder left behind carries the name of the mode',
    swap(APP, "    const marker=document.createComment('');", '    const marker=document.createComment(SCHOOL_SHIPPED_NAME);')],

  ['el() cannot see a control that is currently held out of the document',
    swap(APP, '    for(const held of schoolRetained.values()){\n      if(held.node.id===id)return held.node;',
      '    for(const held of []){\n      if(held.node.id===id)return held.node;')],

  /* ---- Plain English. ---- */

  ['the funny levels are not forced down, so restricted copy is still playful',
    swap(APP, 'if(state.attention.simplifiedLanguage||schoolActive()){', 'if(state.attention.simplifiedLanguage){')],

  ['the effective language ignores the mode entirely',
    swap(APP, "function effectiveLanguage(){return schoolActive()?'en':state.language}",
      'function effectiveLanguage(){return state.language}')],

  ['the document language attribute still claims the stored language',
    swap(APP, "    if(on)document.documentElement.lang='en';\n", '')],

  ['the personal vocabulary goes on substituting from the file it kept',
    swap(APP, '    if(schoolActive())return text;\n', '')],

  ['the uploaded vocabulary file is destroyed rather than set aside',
    swap(APP, '    schoolWrongAttempts=0;\n    applyState();\n    recordHistory(\'presentation-mode\',\'The restricted presentation on this page was turned on.\');',
      "    schoolWrongAttempts=0;\n    localStorage.removeItem('ding-pbx-vocabulary-cache');\n    applyState();\n    recordHistory('presentation-mode','The restricted presentation on this page was turned on.');")],

  /* ---- The name. ---- */

  ['the heading is not rewritten, so a renamed mode still shows the shipped name',
    swap(APP, '    if(title)title.textContent=name;\n', '')],

  ['the search keywords are not rewritten from the chosen name',
    swap(APP, '    card.dataset.search=schoolSearchKeywords();\n', '')],

  ['the search keywords are built from the shipped name rather than the chosen one',
    swap(APP, 'return `${schoolName()} restricted plain english only lock`.toLowerCase()',
      'return `${SCHOOL_SHIPPED_NAME} restricted plain english only lock`.toLowerCase()')],

  ['the chosen name is not capped, so a pasted essay becomes the heading',
    swap(APP, "schoolRecord={...schoolRecord,name:String(raw||'').slice(0,SCHOOL_NAME_MAX)};",
      "schoolRecord={...schoolRecord,name:String(raw||'')};")],

  ['a history entry names the mode, so the next rename strands the old name in the record',
    swap(APP, "recordHistory('presentation-mode','The restricted presentation on this page was renamed.');",
      "recordHistory('presentation-mode',`${schoolName()} was renamed.`);")],

  ['a stored notification names the mode, with the same consequence',
    swap(APP, "notify('Page presentation','This page is in plain English until the restricted presentation is turned off again.'",
      "notify('Page presentation',`${schoolName()} is on, so this page is in plain English.`")],

  ['the description in the COPY table names the mode, so a rename can never be complete',
    swap(APP, 'While this is on, the page presents itself in plain English only. The Cantonese',
      'While School mode is on, the page presents itself in plain English only. The Cantonese')],

  /* ---- One switch, across every tab. ---- */

  ['the storage subscription listens for an event that never fires',
    swap(APP, "window.addEventListener('storage',event=>{", "window.addEventListener('storage-none',event=>{")],

  ['the whole store being cleared elsewhere is ignored',
    swap(APP, 'if(event&&event.key!==null&&event.key!==SCHOOL_KEY)return;', 'if(event&&event.key!==SCHOOL_KEY)return;')],

  ['every unrelated storage change re-applies the whole page',
    swap(APP, 'if(event&&event.key!==null&&event.key!==SCHOOL_KEY)return;', 'if(false)return;')],

  /* ---- The export. ---- */

  ['the redacted export carries the credential it says it omits',
    swap(APP, "credential:'omitted',storedSeparatelyIn:SCHOOL_KEY", 'credential:schoolRecord.secret,storedSeparatelyIn:SCHOOL_KEY')],

  ['the export stops mentioning the mode at all',
    swap(APP, ',restrictedPresentation:schoolExportSummary()', '')],

  ['the recovery text stops naming the record somebody would have to clear',
    swap(APP, "removes ${SCHOOL_KEY} along with", 'removes that record along with')],

  /* ---- The markup and the stylesheet. ---- */

  ['the card loses the search keywords it ships with',
    swap(SETTINGS, ' data-search="school mode restricted plain english only lock pin passphrase"', '')],

  ['the value is typed in the clear',
    swap(SETTINGS, '<input id="school-unlock" type="password"', '<input id="school-unlock" type="text"')],

  ['the status line stops being a live region',
    swap(SETTINGS, '<p id="school-status" role="status">', '<p id="school-status">')],

  ['the card stops saying it is not a security boundary',
    swap(SETTINGS, 'This is a speed bump you set for yourself, not a security boundary.',
      'This keeps the page in plain English.')],

  ['the display rule beats [hidden], so the group nobody is in the state for stays operable',
    swap(CSS, '#school-name-controls[hidden],#school-arm-controls[hidden],#school-unlock-controls[hidden]{display:none}\n', '')],

  /* ---- The registries and the article. ---- */

  ['the registry claims the feature is still absent',
    swap(REGISTRY, '"school-mode": {\n      "state": "implemented",', '"school-mode": {\n      "state": "absent",')],

  ['the registry note stops recording that the value is not stored',
    swap(REGISTRY, 'only a random 16-byte salt and the SHA-256 digest of salt-and-value',
      'only a derived value')],

  ['the localization registry claims the card is untranslated',
    swap(LOCALES, '"school-mode": {\n      "state": "localized",', '"school-mode": {\n      "state": "not-localized",')],

  ['the article loses its section for this surface',
    swap(ARTICLE, '## The pages-site', '## Notes')],

  ['the article stops telling a locked-out reader exactly what to clear',
    swap(ARTICLE, "Clearing this site's storage in the browser removes `ding-pbx-pages-school-v1` along with",
      "Clearing this site's storage in the browser removes the record along with")],
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
