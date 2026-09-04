#!/usr/bin/env node
/**
 * Deliberate red-then-green proof for site/tests/contracts/per-element-toy-locks.test.mjs.
 *
 * A lock is unusually easy to ship broken in a way nothing complains about, and the
 * failures point in both directions. "The record is stored", "the wizard is on the
 * page" and "the method has three factors" are all true of a lock that refuses
 * absolutely nothing -- and a lock that refuses too much is just as silent, because an
 * element whose own right-click menu is also refused simply looks like an element with
 * no way out.
 *
 * So the contract test runs the real extracted source against a recording DOM -- and
 * this file is what says that test would actually notice if it stopped.
 *
 * One break at a time, always. Breaking three things and watching five assertions fail
 * proves only that something among them is watched; it hid a wiring line in this
 * repository once already.
 *
 * Every break edits a real file on disk, because that is the only way to exercise a
 * test that reads its subject off the filesystem. Two properties keep that safe:
 *
 *   - the original bytes are restored in a `finally`, and the restore is verified
 *     rather than assumed, so an interrupted run cannot leave a planted break behind;
 *   - a break whose replacement did not change the bytes is reported as a FAILED CASE
 *     rather than counted as a pass. An edit that never landed reads exactly like a
 *     guard that held, and a replacement that matched nothing is the commonest way to
 *     fake a green.
 *
 * Usage:  node scripts/negative-per-element-toy-locks-site.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..', '..');
const consoleRoot = resolve(repo, 'console');
const TEST = 'site/tests/contracts/per-element-toy-locks.test.mjs';

const file = (relative) => resolve(consoleRoot, relative);
const APP = file('site/app.js');
const SETTINGS = file('site/settings.html');
const CSS = file('site/styles.css');
const REGISTRY = file('site/feature-registry.json');
const LOCALES = file('site/locales/feature-registry.json');
const ARTICLE = file('docs/platform/per-element-toy-locks.md');

/**
 * Replaces `from` with `to` exactly once, refusing anything that is not exactly once.
 *
 * Anchors are written with `\n` and rewritten to whatever the file on disk actually
 * uses. Parts of this checkout are CRLF, and a newline-only anchor against a CRLF file
 * matches nothing at all -- which, without the exactly-once check below, would read as
 * a guard that held rather than as a break that never happened.
 */
const swap = (path, from, to) => () => {
  const before = readFileSync(path, 'utf8');
  const eol = before.includes('\r\n') ? '\r\n' : '\n';
  const anchor = from.split('\n').join(eol);
  const replacement = to.split('\n').join(eol);
  const occurrences = before.split(anchor).length - 1;
  if (occurrences !== 1) {
    throw new Error(`the break anchor appears ${occurrences} time(s), not once: ${JSON.stringify(anchor.slice(0, 60))}`);
  }
  return { path, before, after: before.split(anchor).join(replacement) };
};

/**
 * Each case is one lie, and the comment beside it is the defect it stands for -- the
 * thing that would ship, silently, if the assertion it trips were deleted.
 */
const cases = [
  /* ---------------------------------------------------------------- per element */

  // Every lock hashed under one salt. Two locks with the same value would then share a
  // digest, and a digest lifted from one record would open the other. Nothing on screen
  // changes and every lock still opens with its own value.
  ['one shared salt instead of one per lock',
    swap(APP, 'function lockSalt(){const api=lockCryptoApi();return api?lockHex(api.getRandomValues(new Uint8Array(16))):\'\'}',
      "function lockSalt(){return lockCryptoApi()?'00000000000000000000000000000000':''}")],

  // The key stops carrying the page, so a lock made on the settings page resolves --
  // and locks a completely different element -- on every other page with that id.
  ['the key no longer carries the page it belongs to',
    swap(APP, 'if(id)return `${where}::#${id}`;', 'if(id)return `page::#${id}`;')],

  // Sibling elements collapse onto one key: locking the second button locks the first.
  ['two sibling elements are given the same key',
    swap(APP, "parts.unshift(siblings.length>1&&index>=0?`${tag}[${index+1}]`:tag);", 'parts.unshift(tag);')],

  // A key nothing can resolve is accepted, so a record can be written for an element
  // that can never be found again -- and never unlocked.
  ['an unresolvable key is accepted when a lock is created',
    swap(APP, "if(!input.key||!lockKeySelector(input.key))return{ok:false,why:'no-element'};", '')],

  // A malformed record survives normalisation, which locks an element behind a
  // credential nothing can check: no value opens it, ever.
  ['a record with a missing factor is loaded anyway',
    swap(APP, 'const digest=lockNormaliseFactorDigest(raw.factors&&raw.factors[factor]);\n      if(!digest)return null;',
      'const digest=lockNormaliseFactorDigest(raw.factors&&raw.factors[factor]);')],

  // The record map moves to a key built per element. Nothing can enumerate the store to
  // clear it, and an element's rename orphans its lock permanently.
  ['the storage key is built from the element rather than being fixed',
    swap(APP, "const raw=JSON.parse(localStorage.getItem(LOCK_KEY)||'{}');",
      "const raw=JSON.parse(localStorage.getItem(`${LOCK_KEY}`)||'{}');")],

  // The store stops going through the guarded writer, so a browser with no room refuses
  // the write in silence and the lock is gone at the next load with nothing having said
  // so -- which reads, from the outside, as the lock unlocking itself.
  ['the store writes past the guarded writer',
    swap(APP, "function lockSaveRecords(){return reportWrite('your element locks',writeLocal(LOCK_KEY,JSON.stringify(lockRecords)))}",
      'function lockSaveRecords(){writeLocal(LOCK_KEY,JSON.stringify(lockRecords));return true}')],

  // One of the six methods disappears. The wizard still works, and the missing
  // combination is simply never offered.
  ['one of the six methods is dropped',
    swap(APP, "{id:'password+pin+totp',label:'A password, then a PIN, then a one-time code',factors:['password','pin','totp']}\n", '')],

  // A method's factors are reordered without its name changing, so the prompt asks for
  // the second thing first while calling itself by the old name.
  ['a method asks for its factors in an order its own name does not describe',
    swap(APP, "{id:'pin+password',label:'A PIN, then a password',factors:['pin','password']},",
      "{id:'pin+password',label:'A PIN, then a password',factors:['password','pin']},")],

  /* --------------------------------------------- refused, and still the way in */

  // The element is genuinely disabled. Its action is refused -- and so is the click
  // that would have opened its unlock prompt, so the lock becomes permanent.
  ['a locked element is natively disabled, which destroys its own unlock route',
    swap(APP, "element.setAttribute('aria-disabled','true');\n      if(element.querySelector",
      "element.setAttribute('aria-disabled','true');element.disabled=true;\n      if(element.querySelector")],

  // Nothing announces the state, so a locked control is indistinguishable from a
  // working one to anybody using a screen reader.
  ['a locked element is no longer announced as disabled',
    swap(APP, "element.setAttribute('aria-disabled','true');\n      if(element.querySelector",
      "if(element.querySelector")],

  // Only clicks are intercepted. A locked text field can still be typed into, pasted
  // into and dragged into, which is most of what a locked field would be for.
  ['only clicks are refused, so a locked field can still be edited',
    swap(APP, "const LOCK_GUARDED_EVENTS=['pointerdown','mousedown','click','keydown','input','change','dragstart','paste','contextmenu'];",
      "const LOCK_GUARDED_EVENTS=['click','contextmenu'];")],

  // The guard moves to the bubble phase, so every handler already bound to the element
  // runs first and the refusal arrives after the action it was refusing.
  ['the guard listens in the bubble phase rather than the capture phase',
    swap(APP, 'for(const type of LOCK_GUARDED_EVENTS)document.addEventListener(type,lockGuard,true);',
      'for(const type of LOCK_GUARDED_EVENTS)document.addEventListener(type,lockGuard,false);')],

  // The event is stopped but nothing opens. A locked element becomes a control that
  // does nothing when clicked and says nothing about why.
  ['a refused click no longer opens the unlock prompt',
    swap(APP, 'if(verdict.prompt)openLockPrompt(key,element);', '')],

  // The event is refused and then allowed to carry on to every other listener, so the
  // action runs anyway while the prompt opens on top of it.
  ['the refused event carries on to the other listeners',
    swap(APP, 'event.preventDefault();\n    event.stopPropagation();\n    event.stopImmediatePropagation?.();',
      'event.preventDefault();')],

  // The guard finds only shut locks, so an open one-use unlock never has its use
  // counted -- "just this once" quietly becomes "until this page is reloaded".
  ['the guard stops finding an element whose lock is open',
    swap(APP, "return element.closest('[data-lock-key]');", "return element.closest('[data-locked=\"1\"]');")],

  // Typing into the unlock prompt is refused by the very lock it is trying to open.
  ['the unlock prompt is refused by the lock it belongs to',
    swap(APP, "if(input.insidePrompt)return{refuse:false,prompt:false,why:'prompt'};", '')],

  // Right-clicking a locked element is refused too, so its lock cannot be managed and
  // clearing the whole site's storage becomes the only way out.
  ['right-clicking a locked element is refused, hiding its own management',
    swap(APP, "if(input.type==='contextmenu')return{refuse:false,prompt:false,why:'menu'};", '')],

  /* ----------------------------------------------------- the prompt and the budget */

  // The first factor of a multi-factor method opens the lock on its own.
  ['one factor opens a method that asks for several',
    swap(APP, 'if(lockPrompt.step+1<lockPrompt.factors.length){', 'if(false){')],

  // A wrong step keeps the factors already verified, so somebody can bank a password
  // and then work on the code at leisure -- which is not what "an attempt" means.
  ['a wrong step keeps the factors already verified in that attempt',
    swap(APP, 'lockPrompt.step=0;\n      const after=lockNoteAttempt(key,now);', 'const after=lockNoteAttempt(key,now);')],

  // Nothing is spent on a wrong value, so the budget never runs out and a lock with a
  // four-digit PIN can be worked through at machine speed.
  ['a wrong value costs nothing, so the budget never runs out',
    swap(APP, 'const after=lockNoteAttempt(key,now);', 'const after=lockAttemptVerdict(lockAttempts.get(key),now);')],

  // The rate limit is checked and then ignored.
  ['the rate limit is computed and then not enforced',
    swap(APP, 'if(!before.allowed){', 'if(false){')],

  // The refusal stops saying how many tries are left, so somebody has no idea whether
  // the next wrong guess costs them a minute.
  ['the refusal stops saying how many tries are left',
    swap(APP, '${after.remaining} ${after.remaining===1?\'try\':\'tries\'} left before this waits a minute. ', '')],

  // The refusal stops saying that nothing was deleted, on the one surface where
  // somebody has every reason to fear that something was.
  ['the refusal stops saying that nothing was deleted',
    swap(APP, 'Nothing was deleted, and nothing has escalated.`);\n      return{ok:false,why:\'wrong-value\'};',
      'That is all.`);\n      return{ok:false,why:\'wrong-value\'};')],

  // The compare returns on the first differing character, so how long it takes says how
  // much of the value was right.
  ['the credential compare short-circuits on the first difference',
    swap(APP, 'for(let index=0;index<digestHex.length;index+=1)difference|=digestHex.charCodeAt(index)^stored.digestHex.charCodeAt(index);',
      'for(let index=0;index<digestHex.length;index+=1){if(digestHex[index]!==stored.digestHex[index])return{open:false,why:\'wrong-value\'}}')],

  // A one-time code is accepted from any step at all, which turns a time-based factor
  // into a fixed one somebody can screenshot once.
  ['a one-time code from any instant is accepted',
    swap(APP, 'const LOCK_TOTP_SKEW_STEPS=1;', 'const LOCK_TOTP_SKEW_STEPS=1000;')],

  /* ----------------------------------------------------------- unlock duration */

  // "Just this once" never expires, so the shortest duration silently becomes the
  // longest one.
  ['a one-use unlock survives its use',
    swap(APP, "if(entry.mode==='once')return Number(entry.uses||0)>0?{open:false,why:'used'}:{open:true,why:'once'};",
      "if(entry.mode==='once')return{open:true,why:'once'};")],

  // A timed unlock never expires either.
  ['a timed unlock never expires',
    swap(APP, "if(entry.mode==='minutes')return nowMs<Number(entry.until||0)?{open:true,why:'timed',msLeft:entry.until-nowMs}:{open:false,why:'expired'};",
      "if(entry.mode==='minutes')return{open:true,why:'timed'};")],

  // An unrecognised mode is treated as open, so a hand-edited record unlocks everything.
  ['an unknown duration is treated as open',
    swap(APP, "return{open:false,why:'unknown-mode'};", "return{open:true,why:'unknown-mode'};")],

  // The open state is persisted, so a reload no longer relocks anything and
  // locked-on-launch quietly stops being true.
  ['the open state is written down, so a reload no longer relocks',
    swap(APP, 'lockOpened.set(key,{mode,uses:0,until:mode===\'minutes\'?nowMs+minutes*60000:0});',
      "lockOpened.set(key,{mode,uses:0,until:mode==='minutes'?nowMs+minutes*60000:0});writeLocal('ding-pbx-pages-open-v1',key);")],

  /* --------------------------------------------------------------- the wizard */

  // The create button stops reading the same verdict its status line is written from,
  // so the sentence and the button can disagree about whether a draft is acceptable.
  ['the create button no longer reads the verdict its status line is written from',
    swap(APP, "if(button)button.disabled=!verdict.ok;", 'if(button)button.disabled=false;')],

  // A PIN of letters is accepted, so the keypad cannot enter it and the manual field is
  // the only way in -- which is a keypad that looks like it works and cannot.
  ['a PIN of letters is accepted',
    swap(APP, "if(!/^\\d+$/.test(pin))return{ok:false,why:'pin-not-digits'};", '')],

  // The two PIN fields stop having to agree, so a typo becomes a lock nobody can open.
  ['the two PIN fields no longer have to agree',
    swap(APP, "if(pin!==String(input.pinConfirm||''))return{ok:false,why:'pin-mismatch'};", '')],

  // An unreadable one-time-code secret is accepted, so the factor can never produce a
  // code and the lock is shut forever.
  ['an unreadable one-time-code secret is accepted',
    swap(APP, "try{authDecodeBase32(secret)}catch{return{ok:false,why:'totp-unreadable'}}", '')],

  // A browser with no cryptographic digest is allowed to create a lock, which could
  // only keep the value in the clear.
  ['a lock is created in a browser that has no digest to hash with',
    swap(APP, "if(!input.hasDigest)return{ok:false,why:'no-digest-available'};", '')],

  // The wizard keeps the value fields after it closes, so the next thing to open it
  // shows the last PIN somebody typed.
  ['the wizard keeps its value fields after closing',
    swap(APP, "for(const id of ['lock-wizard-pin','lock-wizard-pin-confirm','lock-wizard-password','lock-wizard-password-confirm','lock-wizard-totp-secret']){\n      const field=$(id);if(field)field.value='';\n    }\n    const opener=lockWizard.opener;",
      'const opener=lockWizard.opener;')],

  // Focus is not returned, so a keyboard user is left at the top of the document.
  ['closing the wizard does not return focus to the element',
    swap(APP, "lockWizard={key:'',element:null,opener:null,name:'',kind:'element'};\n    opener?.focus?.();",
      "lockWizard={key:'',element:null,opener:null,name:'',kind:'element'};")],

  // Every factor block is shown for every method, so a PIN-only lock asks for a
  // password and a one-time code it will never check.
  ['the wizard shows every factor block whichever method is chosen',
    swap(APP, "show('lock-wizard-totp-block',factors.includes('totp'));", "show('lock-wizard-totp-block',true);")],

  // A pasted pairing link's secret is written into a status line -- on screen, in a
  // capture, and in whatever a reader pastes into an issue.
  ['the wizard prints a pasted secret rather than its length',
    swap(APP, 'The secret is ${parsed.secret.length} characters and is not shown here.',
      'The secret is ${parsed.secret}.')],

  /* --------------------------------------------------------------- the keypad */

  // The keypad is shuffled for everybody, whether they asked for it or not: slower for
  // every user and safer for none.
  ['the keypad is shuffled whether the reader asked for it or not',
    swap(APP, 'if(!shuffle)return digits;', '')],

  // The keys lose their own accessible names, so a screen reader reads ten unnamed
  // buttons.
  ['the keypad keys lose their accessible names',
    swap(APP, "attributes:{type:'button','data-lock-digit':digit,'aria-label':`Digit ${digit}`}",
      "attributes:{type:'button','data-lock-digit':digit}")],

  // The keypad writes into a field nothing reads, so tapping digits does nothing at all
  // while the manual field goes on working perfectly.
  ['the keypad writes into a field the submission does not read',
    swap(APP, 'if(digit)value.value=`${value.value}${digit}`;', 'if(digit)value.dataset.pending=`${value.value}${digit}`;')],

  /* ------------------------------------------------------------- honest about it */

  // The recovery line stops naming the route, so somebody who has forgotten a value has
  // nowhere to go.
  ['the recovery line stops naming the way out',
    swap(APP, "const LOCK_RECOVERY_LINE='Forgotten it? Nothing on this page can give it back. Clear this site’s storage in your browser: every lock here goes with it, along with the rest of this page’s local data.';",
      "const LOCK_RECOVERY_LINE='Forgotten it? Try to remember it.';")],

  // The wizard stops carrying the recovery line, so it is only on the surface somebody
  // reaches after they are already locked out.
  ['the wizard stops carrying the recovery line',
    swap(APP, "lockAppend(wizard,'p',{id:'lock-wizard-recovery',className:'setting-note',text:LOCK_RECOVERY_LINE});",
      "lockAppend(wizard,'p',{id:'lock-wizard-recovery',className:'setting-note'});")],

  // The toy-lock disclosure stops saying what this is not, on the surface where
  // somebody is deciding whether to rely on it.
  ['the unlock prompt stops saying this is not a security boundary',
    swap(APP, "lockAppend(prompt,'p',{id:'lock-unlock-toy',className:'setting-note',text:LOCK_TOY_LINE});",
      "lockAppend(prompt,'p',{id:'lock-unlock-toy',className:'setting-note',text:'This element is protected.'});")],

  // The card's own description quietly claims protection at one funny level. Every
  // other level still reads correctly, so this is invisible unless the slider is moved.
  ['a funny level drops the disclosure and claims protection instead',
    swap(APP, 'It is a speed bump you built for yourself, not a security boundary: it encrypts nothing and stops nobody else who has this computer. Every lock carries its own value, so opening one opens nothing else, and clearing this site’s storage takes the lot with it',
      'It keeps that control secure. Every lock carries its own value, so opening one opens nothing else, and clearing this site’s storage takes the lot with it')],

  // A Cantonese level drops the same disclosure, which an English-only reviewer never
  // sees.
  ['a Cantonese funny level drops the disclosure',
    swap(APP, '呢個係你自己set畀自己嘅減速墩，唔係安全防線：佢冇加密任何嘢，亦都攔唔住其他攞得到呢部電腦嘅人。每個鎖有自己嘅值，所以開一個唔會連帶開其他，而清除呢個網站嘅儲存空間就會將全部移除',
      '每個鎖有自己嘅值，所以開一個唔會連帶開其他，而清除呢個網站嘅儲存空間就會將全部移除')],

  // The card description is unhooked from the funny levels, so it renders one tone at
  // every setting while both sliders appear to work.
  ['the card description is unhooked from the funny-level copy',
    swap(SETTINGS, '<p id="locks-desc" data-copy="locksDesc">', '<p id="locks-desc">')],

  /* ------------------------------------------------------------------- the card */

  // The list filter stops going through the shared search engine, so the builder
  // anchored beside it announces itself and filters nothing.
  ['the list filter no longer goes through the shared search engine',
    swap(APP, ".filter(record=>matchText(`${lockRowLabel(record)} ${record.key} ${lockIsOpen(record.key,Date.now())?'open unlocked':'locked'}`,query,'locks-search'));",
      '.filter(()=>true);')],

  // A locked element stops being findable by the word locked, so a search that ought to
  // find it comes back empty and reads as the lock not existing.
  ['a locked element is no longer findable by the word locked',
    swap(APP, "${lockIsOpen(record.key,Date.now())?'open unlocked':'locked'}", '${record.created}')],

  // The export carries the salt and the digest. Neither is the value, but both are
  // exactly what an offline attempt at the value needs.
  ['the export writes the credential material it says it omits',
    swap(APP, "credentials:'omitted'\n    }));", 'credentials:JSON.stringify(record.factors)\n    }));')],

  // The export stops saying what it leaves out, so a reader has no way to know whether
  // the file is safe to send anywhere.
  ['the export stops stating what it leaves out',
    swap(APP, ' No PIN, password, salt, digest or one-time-code secret is written: every row carries the word omitted where a credential would be.', '')],

  // A shut lock can be removed, which is the way around every lock on the site at once.
  ['a lock that has not been opened can be removed anyway',
    swap(APP, "return lockIsOpen(key,Date.now())?true:'that element is still locked -- open it first, or clear this site’s storage';",
      'return true;')],

  // The removal stops reporting what it skipped, so a bulk remove silently drops the
  // locks it could not touch and reports success.
  ['the bulk removal no longer reports what it skipped',
    swap(APP, "const plan=planBulk('Remove',[...lockSelection.selected],lockRemovalVerdict,{destructive:true});",
      "const plan=planBulk('Remove',[...lockSelection.selected],()=>true,{destructive:true});")],

  // The list stops offering a way to lock an opened element again, so an unlock lasting
  // until the page closes cannot be ended early.
  ['there is no way to lock an opened element again',
    swap(APP, '<button type="button" class="text-button" data-lock-relock="${escapeHtml(record.key)}">Lock again</button>', '')],

  // Selecting a row stops going through the shared bulk model, so this list grows its
  // own selection behaviour and diverges from the other two the first time one is fixed.
  ['the list grows its own selection instead of the shared bulk model',
    swap(APP, 'lockSelection=bulkClick(lockSelection,row.dataset.lockRow,{shift:event.shiftKey,ctrl:event.ctrlKey||event.metaKey||isCheckbox},lockOrder);',
      'lockSelection={anchor:row.dataset.lockRow,selected:new Set([row.dataset.lockRow])};')],

  // A browser holding nothing but unreadable records says "nothing is locked" -- true
  // of what it could read, and silent about the records it threw away.
  ['dropped records are reported only when something else survived',
    swap(APP, 'to lock one.${dropped}`', 'to lock one.`')],

  /* --------------------------------------------------------------- the wiring */

  // The lock command is offered and connected to nothing: exactly the decorative
  // control the whole rest of these rules forbid.
  ['the right-click command no longer opens the wizard',
    swap(APP, "run:ctx=>openLockWizard(ctx)}", 'run:()=>{}}')],

  // Commented out rather than deleted, because that is how a wiring line usually dies
  // -- and because a bare substring needle is satisfied by the comment.
  ['the initLocks() call is commented out rather than removed',
    swap(APP, 'initAuthenticator();initConverter();initLocks();', 'initAuthenticator();initConverter();/*initLocks();*/')],

  // applyState stops marking locked elements, so a reload shows every locked control
  // looking and behaving exactly like an unlocked one until something else re-applies.
  ['applyState no longer marks locked elements',
    swap(APP, 'applyDialogEmojis();applyLocks();applyNarration();', 'applyDialogEmojis();applyNarration();')],

  // The dialogs are built modally, so an anchored per-element surface becomes a
  // centred one that traps focus away from the element it is about.
  ['the dialogs are opened modally rather than anchored',
    swap(APP, 'if(dialog.show)dialog.show();\n    renderLockWizard();', 'if(dialog.showModal)dialog.showModal();\n    renderLockWizard();')],

  // The anchored dialog stops being bounded by the viewport, so on a short window its
  // buttons are below the bottom edge with no way to scroll to them.
  ['an anchored dialog no longer scrolls when it is taller than the viewport',
    swap(APP, "dialog.style.overflowY=placed.scrolls?'auto':'';", '')],

  /* ------------------------------------------------------- surfaces and records */

  // The card loses its settings-search terms, so somebody who knows the feature by name
  // cannot find it.
  ['the card loses its settings-search terms',
    swap(SETTINGS, 'data-search="lock locks locked element control pin password one-time code otp toy speed bump unlock keypad"', 'data-search=""')],

  // The card stops saying how to reach the command, which is the only route to it.
  ['the card stops saying how to reach the lock command',
    swap(SETTINGS, '<kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>K</kbd>', 'a keyboard shortcut')],

  // Export everything stops saying it leaves the locks out, so their absence from the
  // file is silent.
  ['Export everything stops saying it leaves the locks out',
    swap(SETTINGS, ' Element locks are left out for the same reason and redacted the same way on their own card: every row names the element, the page and the method, and carries the word omitted where a PIN, a password, a salt, a digest or a one-time-code secret would be.', '')],

  // The keypad keys drop below a usable touch target.
  ['the keypad keys drop below a usable touch size',
    swap(CSS, '.lock-key{min-height:48px;min-width:48px;', '.lock-key{min-height:22px;min-width:22px;')],

  // A locked element looks exactly like a working one.
  ['a locked element is styled identically to an unlocked one',
    swap(CSS, '.locked-element[aria-disabled="true"]{opacity:.72;cursor:not-allowed}', '')],

  // The registry claims the feature is still absent while the code implements it.
  ['the registry claims the feature is still absent',
    swap(REGISTRY, '"per-element-toy-locks": {\n      "status": "implemented-unverified",', '"per-element-toy-locks": {\n      "status": "absent",')],

  // The localization registry claims the card is untranslated while four Cantonese
  // variants of its description ship.
  ['the localization registry claims the card is untranslated',
    swap(LOCALES, '"per-element-toy-locks": {\n      "state": "localized",', '"per-element-toy-locks": {\n      "state": "not-localized",')],

  // The article goes back to saying the website has no locks, which is the sentence
  // that was wrong in the first place.
  ['the article claims the website still has no locks',
    swap(ARTICLE, '**Documentation website:** Implemented 2026-08-26,', '**Documentation website:** Not implemented,')],

  // The article stops saying that none of this has been run in a browser, which is the
  // one thing a reader cannot check for themselves from the code.
  ['the article stops saying that nothing here has been run in a browser',
    swap(ARTICLE, '**Not verified in a browser.**', '**Verified.**')],
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
