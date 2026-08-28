#!/usr/bin/env node
/**
 * Deliberate red-then-green proof for site/tests/contracts/context-menu-shortcuts.test.mjs.
 *
 * A shortcut column is unusually easy to ship broken, and every symptom points the wrong
 * way: the menu opens, the item is listed, the chord is printed in the right place and in
 * the right notation, and the only thing wrong is that pressing it does nothing. Nobody
 * reports that as a bug in the menu -- they report it as their keyboard, or as the page
 * being slow, or not at all.
 *
 * So the contract test runs the real extracted source over a recording page, and this file
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
 *     rather than counted as a pass. An edit that never landed reads exactly like a
 *     guard that held, and an anchor written with `\n` against a CRLF file is the
 *     commonest way to fake a green.
 *
 * Usage:  node scripts/negative-context-menu-site.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..', '..');
const consoleRoot = resolve(repo, 'console');
const TEST = 'site/tests/contracts/context-menu-shortcuts.test.mjs';

const file = (relative) => resolve(consoleRoot, relative);
const APP = file('site/app.js');
const CSS = file('site/styles.css');
const INDEX = file('site/index.html');
const REGISTRY = file('site/feature-registry.json');
const LOCALES = file('site/locales/feature-registry.json');
const ARTICLE = file('docs/platform/context-menu-shortcuts.md');

/**
 * Replaces `from` with `to` exactly once, refusing anything that is not exactly once.
 *
 * Anchors are written with `\n` and rewritten to whatever the file on disk actually uses,
 * for the CRLF reason above.
 */
const swap = (path, from, to) => () => {
  const before = readFileSync(path, 'utf8');
  const eol = before.includes('\r\n') ? '\r\n' : '\n';
  from = from.split('\n').join(eol);
  to = to.split('\n').join(eol);
  const occurrences = before.split(from).length - 1;
  if (occurrences !== 1) {
    throw new Error(`the break anchor appears ${occurrences} time(s), not once: ${JSON.stringify(from.slice(0, 70))}`);
  }
  return { path, before, after: before.split(from).join(to) };
};

/**
 * Each case is one lie, and the comment beside it is the defect it stands for -- the thing
 * that would ship, silently, if the assertion it trips were deleted.
 */
const cases = [
  /* ---- The feature never reaches the page at all. ---- */

  // Commented out rather than deleted, because that is how a wiring line usually dies --
  // and because a bare substring needle is satisfied by the comment.
  ['the initContextMenu() call is commented out rather than removed',
    swap(APP, 'applyState();initContextMenu();initNavigation();', 'applyState();/*initContextMenu();*/initNavigation();')],

  ['nothing starts the menu at all',
    swap(APP, 'applyState();initContextMenu();initNavigation();', 'applyState();initNavigation();')],

  // The filter's plain-text-versus-regex readout is rendered by applyState(). Build the
  // menu after it and the readout is blank until something else happens to re-render it.
  ['the menu is built after applyState(), so its first readout is missed',
    swap(APP, 'ensureContextMenuUI();applyState();', 'applyState();ensureContextMenuUI();')],

  // On body rather than document: every element still "has" a menu right up until one is
  // rendered outside the body, and nothing says which.
  ['the right-click listener is moved off document',
    swap(APP, "    document.addEventListener('contextmenu',event=>{", "    document.body.addEventListener('contextmenu',event=>{")],

  /* ---- The shortcut column: the whole point of the feature. ---- */

  // The defect this feature exists to prevent, in its purest form. Everything looks right.
  ['the printed shortcut is restated rather than derived from the chord',
    swap(APP, 'shortcut:chordLabel(action.chord,platform),', "shortcut:action.chord?'Alt+Shift+C':'',")],

  ['the item carries a copy of its chord rather than the chord itself',
    swap(APP, '          chord:action.chord,', '          chord:action.chord?{...action.chord}:null,')],

  ['the matcher stops checking Alt, so three chords collapse onto one',
    swap(APP, "      &&Boolean(event.altKey)===candidate.alt\n", '')],

  ['the matcher stops checking Shift',
    swap(APP, "      &&Boolean(event.shiftKey)===candidate.shift\n", '')],

  ['the platform notation is ignored and everything prints as Windows',
    swap(APP, "    const apple=/mac|iphone|ipad|ipod/i.test(String(platform||''));", '    const apple=false;')],

  // aria-keyshortcuts has its own fixed grammar. "Ctrl" there is read out as nonsense.
  ['the assistive-technology spelling uses the visible notation instead of the specified one',
    swap(APP, "    if(candidate.ctrl)parts.push('Control');", "    if(candidate.ctrl)parts.push('Ctrl');")],

  // Drift from initNavigation's own binding: the menu prints a chord nothing dispatches.
  ['the palette chord in the table drifts from the one initNavigation binds',
    swap(APP, "{id:'command-palette',label:'Command palette',chord:chord('f',{ctrl:true,shift:true})",
      "{id:'command-palette',label:'Command palette',chord:chord('g',{ctrl:true,shift:true})")],

  // Two live handlers on one chord, the second calling showModal() on an open dialog.
  ['the dispatcher stops excluding the chord another binding owns',
    swap(APP, "      .filter(item=>item.id!=='command-palette');", '      ;')],

  // A chord the browser answers first. The label is printed and never fires.
  ['an action is bound to a chord the browser claims first',
    swap(APP, "{id:'copy-section-link',label:'Copy a link to this section',chord:chord('l',{alt:true,shift:true})",
      "{id:'copy-section-link',label:'Copy a link to this section',chord:chord('r',{ctrl:true,shift:true})")],

  ['the reserved-chord lookup answers "not reserved" to everything',
    swap(APP, 'function reservedChordClaim(candidate){return RESERVED_CHORDS.find(entry=>chordEquals(entry.chord,candidate))||null}',
      'function reservedChordClaim(candidate){return candidate&&null}')],

  // Firefox fires access keys on the same Alt+Shift pair every chord here uses.
  ['a page declares an accesskey, which Firefox fires on the same Alt+Shift chord',
    swap(INDEX, '<main', '<main accesskey="m"')],

  /* ---- Filtering, and the destructive item it must not strand. ---- */

  // Typing three letters would leave a destructive action invisible on screen and live on
  // the keyboard -- an accident nobody can explain afterwards.
  ['an item hidden by the filter stays live on the keyboard',
    swap(APP, '    return (menuState.visibleIds||[]).includes(item.id);', '    return true;')],

  ['a shortcut fires an item that is not available',
    swap(APP, '    if(!item||!item.enabled)return false;\n    if(!menuState||!menuState.open)return true;',
      '    if(!item)return false;\n    if(!menuState||!menuState.open)return true;')],

  ['clicking runs an item that is not available',
    swap(APP, '    if(!item||!item.enabled)return;\n    const action=MENU_ACTIONS.find(entry=>entry.id===id);',
      '    if(!item)return;\n    const action=MENU_ACTIONS.find(entry=>entry.id===id);')],

  ['filtering reorders the menu, so the same keystroke lands somewhere else',
    swap(APP, '    return items.filter(item=>matchText(`${item.label} ${item.shortcut} ${item.unavailableReason}`,trimmed,target));',
      '    return items.filter(item=>matchText(`${item.label} ${item.shortcut} ${item.unavailableReason}`,query,target)).slice().reverse();')],

  ['filtering hands back copies, so a filtered item could carry a different action',
    swap(APP, '    return items.filter(item=>matchText(`${item.label} ${item.shortcut} ${item.unavailableReason}`,trimmed,target));',
      '    return items.filter(item=>matchText(`${item.label} ${item.shortcut} ${item.unavailableReason}`,query,target)).map(item=>({...item}));')],

  // The exact shape master fixed on the site's other search fields the same day: a
  // builder that announces itself and then filters nothing the moment the box is empty.
  ['the filter short-circuits on an empty query and ignores its own active pattern',
    swap(APP, "    const trimmed=String(query||'').trim();\n    return items.filter(item=>matchText(",
      "    const trimmed=String(query||'').trim();\n    if(!trimmed)return items.slice();\n    return items.filter(item=>matchText(")],

  ['the filter passes the untrimmed query, so a stray space filters everything away',
    swap(APP, '${item.unavailableReason}`,trimmed,target));', '${item.unavailableReason}`,query,target));')],

  ['the menu filter reads another field\'s compiled pattern',
    swap(APP, '${item.unavailableReason}`,trimmed,target));', "${item.unavailableReason}`,trimmed,'feature-search'));")],

  ['an empty result renders a blank surface rather than saying anything',
    swap(APP, "    if(visible.length===0){\n      const empty=document.createElement('li');", '    if(false){\n      const empty=document.createElement(\'li\');')],

  ['the empty-result count stops saying how many were offered',
    swap(APP, 'return `No action matches “${trimmed}”. ${total} action${total===1?\'\':\'s\'} were offered for this element.`;',
      'return `No action matches “${trimmed}”.`;')],

  /* ---- The two entries that must never become available. ---- */

  ['the lock entry becomes conditionally available',
    swap(APP, "      unavailable:()=>'this site ships no per-element lock: per-element-toy-locks is recorded absent in site/feature-registry.json',",
      "      unavailable:ctx=>ctx.page.palette?null:'this site ships no per-element lock: per-element-toy-locks is recorded absent in site/feature-registry.json',")],

  ['the lock entry stops naming the registry row that records why',
    swap(APP, "'this site ships no per-element lock: per-element-toy-locks is recorded absent in site/feature-registry.json'",
      "'this is not available'")],

  ['the per-element appearance entry gains a body, so something would happen',
    swap(APP, "{id:'element-appearance',label:'Edit this element’s appearance…',chord:null,kinds:'any',\n      unavailable:()=>'this site has no per-element appearance editor: material-appearance is recorded partial in site/feature-registry.json',\n      run:()=>{}},",
      "{id:'element-appearance',label:'Edit this element’s appearance…',chord:null,kinds:'any',\n      unavailable:()=>'this site has no per-element appearance editor: material-appearance is recorded partial in site/feature-registry.json',\n      run:ctx=>{ctx.element?.focus?.()}},")],

  /* ---- The destructive action. ---- */

  ['the destructive reset gains a keyboard shortcut',
    swap(APP, "{id:'reset-settings',label:'Reset this site’s settings…',chord:null,kinds:'any',destructive:true,",
      "{id:'reset-settings',label:'Reset this site’s settings…',chord:chord('x',{alt:true,shift:true}),kinds:'any',destructive:true,")],

  ['the reset stops being marked destructive',
    swap(APP, "kinds:'any',destructive:true,\n      unavailable:ctx=>ctx.page.resetGate", "kinds:'any',\n      unavailable:ctx=>ctx.page.resetGate")],

  ['the reset goes round the two-key gate instead of through it',
    swap(APP, "      run:()=>$('settings-reset')?.click()},", '      run:()=>performSettingsReset()},')],

  /* ---- Naming an element, and the icon trap. ---- */

  ['a glyph is accepted as an element\'s name',
    swap(APP, "      const stripped=text.replace(/^[^\\p{L}\\p{N}]+/u,'').trim();\n      if(!stripped)continue;\n      return stripped.length>60?`${stripped.slice(0,59)}…`:stripped;",
      '      return text.length>60?`${text.slice(0,59)}…`:text;')],

  /* ---- Position. ---- */

  ['the menu stops flipping and is laid over the point it opened from',
    swap(APP, '    if(x+menuWidth+margin>viewWidth){left=x-menuWidth;flippedX=true}', '    if(false){left=x-menuWidth;flippedX=true}')],

  ['the menu stops being bounded to the viewport height',
    swap(APP, '    const height=Math.min(menuHeight,available);', '    const height=menuHeight;')],

  ['the height bound loses the scrollbar that keeps it honest',
    swap(CSS, 'gap:8px;overflow:auto;padding:12px;', 'gap:8px;overflow:hidden;padding:12px;')],

  ['the menu is raised over the toast region, so it covers its own notifications',
    swap(CSS, '.context-menu{position:fixed;z-index:150;', '.context-menu{position:fixed;z-index:250;')],

  /* ---- Keyboard and assistive technology. ---- */

  ['Escape closes the menu instead of clearing the filter first',
    swap(APP, "      if(input&&input.value){input.value='';renderContextMenuList();return}", '      if(false){}')],

  ['focus is not returned to the element the menu was opened from',
    swap(APP, '    if(restoreFocus)opener?.focus?.();', '    if(false)opener?.focus?.();')],

  ['the shortcut stops being exposed to assistive technology as a shortcut',
    swap(APP, "        li.setAttribute('aria-keyshortcuts',item.ariaShortcut);\n", '')],

  ['the visible shortcut is announced as well, so it is read out twice',
    swap(APP, "        keys.setAttribute('aria-hidden','true');", "        keys.setAttribute('data-hidden','true');")],

  ['an unavailable item stops being exposed as disabled',
    swap(APP, "      if(!item.enabled)li.setAttribute('aria-disabled','true');", '      if(false){}')],

  ['Shift and right-click no longer fall through to the browser\'s own menu',
    swap(APP, '      if(event.shiftKey)return;\n      event.preventDefault();', '      event.preventDefault();')],

  /* ---- The filter's own regex builder. ---- */

  ['the menu\'s regex builder is attached to a different field',
    swap(APP, '    trigger.dataset.regexFor=CONTEXT_MENU_SEARCH_ID;', "    trigger.dataset.regexFor='feature-search';")],

  ['the builder trigger loses the class initSearch() binds it by',
    swap(APP, "    trigger.type='button';trigger.className='regex-trigger context-menu-regex';",
      "    trigger.type='button';trigger.className='context-menu-regex';")],

  ['the mode readout loses the class renderAllModeStatuses() finds it by',
    swap(APP, "    status.className='mode-status mono';", "    status.className='mono';")],

  /* ---- Copy, and the records that speak for the feature. ---- */

  ['the keyboard hint stops being rendered through the language table',
    swap(APP, "    if($('context-menu-foot'))$('context-menu-foot').textContent=copyText('contextMenuHint');",
      "    if($('context-menu-foot'))$('context-menu-foot').textContent='Shift+F10 opens this menu.';")],

  ['the keyboard hint loses the hook applyCopy() re-renders it through',
    swap(APP, "    foot.dataset.copy='contextMenuHint';", '')],

  ['the touch route stops arming a long press',
    swap(APP, '    longPress.timer=setTimeout(()=>{longPress.timer=null;openContextMenu({element:target,x,y,opener:target})},CONTEXT_MENU_LONG_PRESS_MS);',
      '    longPress.timer=null;')],

  ['the registry claims the menu does not exist',
    swap(REGISTRY, '"context-menu-shortcuts": {\n      "status": "implemented-unverified",', '"context-menu-shortcuts": {\n      "status": "absent",')],

  ['the localization registry claims the menu is untranslated',
    swap(LOCALES, '"context-menu-shortcuts": {\n      "state": "localized",', '"context-menu-shortcuts": {\n      "state": "not-localized",')],

  ['the article loses its section for this surface',
    swap(ARTICLE, '## The pages-site', '## Notes')],

  ['the article stops recording the access-key collision the design depends on',
    swap(ARTICLE, '**Firefox activates access keys with Alt+Shift**', '**Firefox does something with modifiers**')],
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
