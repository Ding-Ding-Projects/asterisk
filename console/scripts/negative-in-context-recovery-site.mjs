#!/usr/bin/env node
/**
 * Deliberate red-then-green proof for site/tests/contracts/in-context-recovery.test.mjs.
 *
 * A recovery route is unusually easy to ship as something that looks like help and is
 * not, and every symptom of that points the wrong way: the region appears, it is the
 * right colour, it has a heading and a button, and the button does nothing at all. Worse,
 * the failures on the other side are silent in the direction that looks safe -- a route
 * nobody raises behaves exactly like a page with no failures in it, right up until
 * somebody's upload is refused and they are left staring at a sentence.
 *
 * So the contract test runs the real extracted source over a recording DOM and a fake
 * storage -- and this file is what says that test would actually notice if it stopped.
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
 * Usage:  node scripts/negative-in-context-recovery-site.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..', '..');
const consoleRoot = resolve(repo, 'console');
const TEST = 'site/tests/contracts/in-context-recovery.test.mjs';

const file = (relative) => resolve(consoleRoot, relative);
const APP = file('site/app.js');
const CSS = file('site/styles.css');
const REGISTRY = file('site/feature-registry.json');
const LOCALES = file('site/locales/feature-registry.json');
const ARTICLE = file('docs/platform/in-context-recovery.md');

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
  /* ---- The route is never raised, which is a feature that exists and never happens. ---- */

  // Commented out rather than deleted, because that is how a wiring line usually dies --
  // and because a bare substring needle is satisfied by the comment.
  ['the refused-dictionary route is commented out rather than removed',
    swap(APP, "    reportFailure('vocabulary-rejected',{detail:reason",
      "    //reportFailure('vocabulary-rejected',{detail:reason")],

  ['a refused dictionary raises nothing at all',
    swap(APP, "\n    reportFailure('vocabulary-rejected',{detail:reason,context:{dictionaryLoaded:Boolean(vocabularyReplacements())}});", '')],

  ['the route is raised without the reason the file was refused',
    swap(APP, "reportFailure('vocabulary-rejected',{detail:reason,", "reportFailure('vocabulary-rejected',{detail:'',")],

  ['the route is no longer told whether a dictionary is already loaded, so it cannot offer to remove one',
    swap(APP, 'context:{dictionaryLoaded:Boolean(vocabularyReplacements())}', 'context:{}')],

  ['a refused image raises nothing at all',
    swap(APP, "\n    reportFailure('logo-rejected',{detail:reason,context:{markLoaded:localCharacters('ding-pbx-logo-cache')>0}});", '')],

  ['a failed update check raises nothing',
    swap(APP, "    reportFailure('update-check-failed',{detail:failure,context:{}});\n", '')],

  ['a manifest address this page refuses to resolve raises nothing',
    swap(APP, "      reportFailure('update-check-failed',{detail:updateWatch.reason,context:{}});\n", '')],

  ['an unbuilt page no longer says, beside the disabled button, why it is disabled',
    swap(APP, "      reportFailure('page-unbuilt',{});\n", '')],

  ['the restricted presentation stops routing the one refusal nobody can act on',
    swap(APP, "      if(verdict.why==='no-digest-available')reportSchoolCannotArm(SCHOOL_ARM_REASON[verdict.why]);\n", '')],

  ['an invalid pattern silently returns again, so Apply appears to do nothing at all',
    swap(APP, "catch(error){reportFailure('regex-invalid',{detail:error.message,context:{target:regexTarget}});return}",
      'catch{return}')],

  /* ---- The guarded writer. ---- */

  ['the settings saver writes straight to storage again, so a refusal escapes through whichever setter was in use',
    swap(APP, "function save(){return reportWrite('this page’s settings',writeLocal(STORAGE_KEY,JSON.stringify(state)))}",
      'function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}')],

  ['the history saver writes straight to storage again',
    swap(APP, "function saveHistory(){return reportWrite('the local history',writeLocal(HISTORY_KEY,JSON.stringify(historyEntries.slice(0,HISTORY_LIMIT))))}",
      'function saveHistory(){localStorage.setItem(HISTORY_KEY,JSON.stringify(historyEntries.slice(0,HISTORY_LIMIT)))}')],

  ['the restricted-presentation record writes straight to storage again',
    swap(APP, "function saveSchool(){return reportWrite('the restricted-presentation record',writeLocal(SCHOOL_KEY,JSON.stringify(schoolRecord)))}",
      'function saveSchool(){localStorage.setItem(SCHOOL_KEY,JSON.stringify(schoolRecord))}')],

  ['the accepted dictionary is cached without the guard',
    swap(APP, "if(!reportWrite('the dictionary you loaded',writeLocal('ding-pbx-vocabulary-cache',JSON.stringify(parsed))))return;",
      "localStorage.setItem('ding-pbx-vocabulary-cache',JSON.stringify(parsed));")],

  ['the accepted image is cached without the guard',
    swap(APP, "if(!reportWrite('the image you added',writeLocal('ding-pbx-logo-cache',dataUrl)))return;",
      "localStorage.setItem('ding-pbx-logo-cache',dataUrl);")],

  ['writeLocal stops catching the refusal, so it is not a guard at all',
    swap(APP, 'try{localStorage.setItem(key,String(value));return{ok:true,reason:\'\'}}\n    catch(error){return{ok:false,reason:storageRefusalReason(error)}}',
      "localStorage.setItem(key,String(value));return{ok:true,reason:''}")],

  ['a refused write is reported as a success',
    swap(APP, 'function reportWrite(what,result){\n    if(result.ok){', 'function reportWrite(what,result){\n    if(true){')],

  ['a write that succeeds no longer takes the route down, so a solved problem keeps being reported',
    swap(APP, "if(result.ok){clearRecovery('page','local-storage-refused');return true}", 'if(result.ok){return true}')],

  ['a quota refusal is described in words nobody measured instead of by its cause',
    swap(APP, "if(name==='QuotaExceededError'||name==='NS_ERROR_DOM_QUOTA_REACHED')return 'this browser has no room left for this site';",
      "if(name==='QuotaExceededError'||name==='NS_ERROR_DOM_QUOTA_REACHED')return 'something went wrong';")],

  ['an unfamiliar refusal is replaced by a generic sentence rather than passed on',
    swap(APP, "return String(error&&error.message||'this browser refused the write');",
      "return 'this browser refused the write';")],

  /* ---- A solved problem that keeps being reported. ---- */

  ['a dictionary that loads leaves the previous refusal on screen',
    swap(APP, "clearRecovery('vocabulary-status','vocabulary-rejected');applyVocabulary();applyState()}catch(error)", 'applyVocabulary();applyState()}catch(error)')],

  ['an image that loads leaves the previous refusal on screen',
    swap(APP, "clearRecovery('logo-status','logo-rejected');applyLogo()}catch(error)", 'applyLogo()}catch(error)')],

  ['removing the dictionary leaves a refusal on screen about a dictionary that is gone',
    swap(APP, "    clearRecovery('vocabulary-status','vocabulary-rejected');\n    applyVocabulary();", '    applyVocabulary();')],

  ['a check that answers leaves the previous failure on screen',
    swap(APP, "        clearRecovery('update-status','update-check-failed');\n", '')],

  ['arming successfully leaves the earlier refusal on screen',
    swap(APP, "    clearRecovery('school-status','school-cannot-arm');\n", '')],

  ['clearing ignores which route it was asked about, so a successful check removes the unbuilt-page route too',
    swap(APP, "if(onlyRouteId&&region.dataset.recoveryFor!==onlyRouteId)return false;", '')],

  ['the region is hidden rather than removed, and a hidden one is still there',
    swap(APP, 'if(region.parentNode)region.parentNode.removeChild(region);', 'region.hidden=true;')],

  /* ---- Where the region goes, which is the whole canonical clause. ---- */

  ['the region is appended to the end of the card instead of beside the control that failed',
    swap(APP, 'if(host.after)host.parent.insertBefore(region,host.after.nextSibling);\n      else host.parent.prepend(region);',
      'host.parent.append(region);')],

  ['a failure whose surface is not on this page lands at the top of the page instead of nowhere',
    swap(APP, "    const anchor=el(surface);\n    if(!anchor||!anchor.parentNode)return null;",
      "    const anchor=el(surface);\n    if(!anchor||!anchor.parentNode){const main=document.querySelector('main');return main?{parent:main,after:null}:null}")],

  // The first attempt at this break swapped `after:null` for `after:undefined`, which
  // changed nothing at all: the branch below tests `if(host.after)` and both are falsy.
  // It was the break that was wrong rather than the guard, and it is recorded here
  // because an inert break reads exactly like an assertion that held.
  ['the storage route is appended to the bottom of the page rather than the top',
    swap(APP, 'else host.parent.prepend(region);', 'else host.parent.append(region);')],

  ['raising the same route twice stacks a second region under the first',
    swap(APP, '    region.dataset.recoveryFor=resolved.id;\n    region.replaceChildren();',
      '    region.dataset.recoveryFor=resolved.id;')],

  /* ---- What the region is made of. ---- */

  ['the region no longer names itself to assistive technology',
    swap(APP, "      region.setAttribute('role','group');\n", '')],

  ['the region is no longer announced when it appears',
    swap(APP, "      region.setAttribute('aria-live','polite');\n", '')],

  ['the region is labelled by an element that is not in it',
    swap(APP, "region.setAttribute('aria-labelledby',`${regionId}-heading`);", "region.setAttribute('aria-labelledby','nothing-at-all');")],

  ['a reason quoting somebody’s own file is parsed as markup',
    swap(APP, "      detail.className='recovery-detail';\n      detail.textContent=resolved.detail;",
      "      detail.className='recovery-detail';\n      detail.innerHTML=resolved.detail;")],

  ['the lead line loses its hook, so moving a slider leaves it at the wording it was built with',
    swap(APP, "    lead.dataset.copy='recoveryLead';\n", '')],

  ['the lead line is a literal instead of the localized copy',
    swap(APP, "lead.textContent=copyText('recoveryLead');", "lead.textContent='Here is what this page can do about it.';")],

  ['a fact is put under the funny sliders alongside the lead line',
    swap(APP, "      note.className='recovery-note';", "      note.className='recovery-note';note.dataset.copy='recoveryLead';")],

  ['an action renders without the id that says which one it is',
    swap(APP, "        button.dataset.recoveryAction=action.id;\n", '')],

  ['a button is rendered with no handler at all, which is the decorative control this whole feature is against',
    swap(APP, "        button.addEventListener('click',()=>{implementation.run()});\n", '')],

  // Also green on its first run, and for a better reason than the two above: the
  // branch was UNREACHABLE. `renderRecovery` used to look the facts up in a side map
  // keyed by route id, so a resolved route rendered directly lost every address, and
  // no route offers a link whose address can come back empty. The map is gone -- the
  // facts ride on the resolved route now -- and the test reaches the branch directly.
  ['a link with no address is rendered as a dead one rather than left out',
    swap(APP, '          if(!href)continue;\n', '')],

  ['the forbidden remedies stop rendering, so the fixes that lose work go unnamed',
    swap(APP, '      region.append(label,list);', '')],

  ['a route with nothing to offer renders an empty box with no explanation',
    swap(APP, "      nothing.className='recovery-nothing';\n      nothing.textContent=resolved.nothingToOffer;",
      "      nothing.className='recovery-nothing';")],

  ['the region is never handed to the personal-vocabulary walker',
    swap(APP, '    applyVocabularyToNode(region);\n', '')],

  ['the engine sends people to a message box somewhere else',
    swap(APP, '  function reportFailure(id,failure){\n', "  function reportFailure(id,failure){\n    notify('Something failed','Look elsewhere.');\n")],

  /* ---- The route table and the pure decision. ---- */

  ['a route offers a button nobody wrote',
    swap(APP, "        {id:'choose-vocabulary-file',label:'Choose another file'},",
      "        {id:'choose-vocabulary-file',label:'Choose another file'},{id:'undo-the-whole-thing',label:'Undo the whole thing'},")],

  ['an action is declared that no route can ever offer',
    swap(APP, "    'search-plainly':{kind:'action',run(){return searchPlainlyInstead()}}",
      "    'search-plainly':{kind:'action',run(){return searchPlainlyInstead()}},\n    'do-something-else':{kind:'action',run(){return true}}")],

  ['a forbidden remedy is declared that no route names',
    swap(APP, "  /** How many local-history entries the pruning action keeps. */",
      "  RECOVERY_FORBIDDEN['unplug-the-computer']='Unplugging the computer, which loses whatever else was open on it and fixes nothing here at all.';\n\n  /** How many local-history entries the pruning action keeps. */")],

  ['a route warns about a remedy nobody declared, so the warning silently vanishes',
    swap(APP, "      forbidden:['reload-the-page','clear-storage'],", "      forbidden:['reload-the-page','turn-it-off-and-on-again'],")],

  ['the unbuilt-page route offers a retry that could not possibly work',
    swap(APP, "      actions:()=>[],\n", "      actions:()=>[{id:'check-again',label:'Try again'}],\n")],

  ['the unbuilt-page route offers nothing and explains nothing',
    swap(APP, "      noActionsReason:()=>'There is nothing to try again:", "      noActionsReason:()=>'x'||'There is nothing to try again:")],

  ['a second route stops being anchored to the control it belongs beside',
    swap(APP, "      id:'regex-invalid',\n      surface:'regex-feedback',", "      id:'regex-invalid',\n      surface:'page',")],

  ['the dictionary route offers to remove a dictionary that is not loaded',
    swap(APP, "        ...(context.dictionaryLoaded?[{id:'clear-vocabulary',label:'Remove the dictionary that is loaded'}]:[])",
      "        {id:'clear-vocabulary',label:'Remove the dictionary that is loaded'}")],

  ['the storage route stops saying how much of the space each store is using',
    swap(APP, 'note:context=>`What this page is keeping here, in characters:', 'note:()=>`What this page is keeping here, somewhere:')],

  ['the storage route offers to free space that is not there',
    swap(APP, "        ...(context.markCharacters>0&&context.hasLogoControls?[{id:'clear-logo',label:'Remove the image and free that space'}]:[]),",
      "        {id:'clear-logo',label:'Remove the image and free that space'},")],

  ['a full store stops warning against the one remedy that loses everything and frees nothing',
    swap(APP, "      forbidden:['reset-settings','clear-storage'],", "      forbidden:['clear-storage'],")],

  ['recoveryFor reaches out and reads the page, so it is no longer decidable from its arguments',
    swap(APP, '    const context=(failure&&failure.context)||{};\n    const actions=(route.actions',
      '    const context=(failure&&failure.context)||{};\n    if(document.querySelector(\'main\'))void 0;\n    const actions=(route.actions')],

  ['a failure nobody routed is rendered as an empty box instead of being refused by name',
    swap(APP, "if(!route)return{ok:false,id,why:'no-route-declared'};",
      "if(!route)return{ok:true,id,surface:'page',heading:'Something failed',detail:'',note:'',actions:[],forbidden:[],nothingToOffer:''};")],

  /* ---- The pure address helpers. ---- */

  ['a page opened from a file is offered a secure address that cannot exist',
    swap(APP, "    if(String(location.protocol||'')!=='http:')return '';", '')],

  ['where the page was opened from is reported as a constant',
    swap(APP, "    if(protocol==='file:')return 'a file on this computer';", "    if(protocol)return 'somewhere';")],

  /* ---- The actions really do what their labels say. ---- */

  ['the trimmed history is never saved, so it comes back on the next load',
    swap(APP, '    historyEntries=historyEntries.slice(0,Math.max(0,Number(keep)||0));\n    saveHistory();',
      '    historyEntries=historyEntries.slice(0,Math.max(0,Number(keep)||0));')],

  ['searching plainly leaves the compiled pattern attached to the field it just released',
    swap(APP, '    regexState.delete(regexTarget);\n', '')],

  ['the builder is left open on top of the field it just released',
    swap(APP, "    const dialog=el('regex-dialog');\n    if(dialog&&dialog.close)dialog.close();\n", '')],

  ['the field’s own plain/regex status line is never re-rendered, so it still claims a pattern is in force',
    swap(APP, '    renderModeStatus(regexTarget);\n    return true;\n  }', '    return true;\n  }')],

  ['the preview is never re-run, so it still shows the error for a pattern that has been deleted',
    swap(APP, "const field=el('regex-pattern');if(!field)return false;field.value='';previewRegex();",
      "const field=el('regex-pattern');if(!field)return false;field.value='';")],

  ['checking again asks for a background check, which reports nothing back to the person who asked',
    swap(APP, "'check-again':{kind:'action',run(){checkForUpdate({manual:true});return true}}",
      "'check-again':{kind:'action',run(){checkForUpdate({manual:false});return true}}")],

  // This one stayed green on its first run, and the assertion was at fault: a file
  // input starts empty, so "it is empty afterwards" passed whether or not anything
  // cleared it. The test seeds a value first now, and this break goes red.
  ['the picker is not emptied first, so choosing the same corrected file again raises no change event',
    swap(APP, "'choose-vocabulary-file':{kind:'action',run(){const input=el('vocabulary-file');if(!input)return false;input.value='';input.click();return true}}",
      "'choose-vocabulary-file':{kind:'action',run(){const input=el('vocabulary-file');if(!input)return false;input.click();return true}}")],

  /* ---- Copy, styles and the records. ---- */

  ['the lead line loses a Cantonese level, so one slider position falls back to another’s wording',
    swap(APP, "      '深呼吸先。企喺呢度就搞得掂嘅嘢全部喺下面，唔使去探險。'\n", '')],

  ['a fact appears in the one line the sliders restyle',
    swap(APP, "      'Here is what this page can do about it, without you going anywhere else.',",
      "      'Here is what this page can do about it. Your settings live in ding-pbx-page-v2.',")],

  ['the region is declared twice in the stylesheet, so which one wins is decided by source order',
    swap(CSS, '.recovery-heading{', '.recovery{padding:0}\n.recovery-heading{')],

  ['the region is hidden by default, so nothing would ever be seen',
    swap(CSS, '.recovery-heading{margin:0 0 4px', '.recovery{display:none}\n.recovery-heading{margin:0 0 4px')],

  ['the site registry goes back to claiming there is no recovery route here',
    swap(REGISTRY, '"in-context-recovery": {\n      "status": "implemented-unverified",', '"in-context-recovery": {\n      "status": "absent",')],

  ['the localization registry forgets the line it is responsible for',
    swap(LOCALES, '"recoveryLead",\n', '')],

  ['the article goes back to saying the website has no recovery route',
    swap(ARTICLE, '**Documentation website:** Implemented, in `site/app.js`',
      '**Documentation website:** Not implemented. Implemented, in `site/app.js`')],

  // The first attempt renamed the heading and left the bare word "re-authentication"
  // standing two sentences later, which the assertion was scanning for. Both were
  // tightened: the assertion pins the REASON this surface has no equivalent, and the
  // break removes that reason.
  ['the article stops saying why the re-authentication clause has no equivalent here',
    swap(ARTICLE, 'no account, no session and no credential to refuse',
      'a different arrangement of these things')],
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
