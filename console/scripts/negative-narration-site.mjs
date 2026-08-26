#!/usr/bin/env node
/**
 * Deliberate red-then-green proof for site/tests/contracts/narration.test.mjs.
 *
 * A narrator is unusually easy to ship broken in ways nothing complains about, and the
 * worst of them are silent in the direction that looks fine. "The setting is stored",
 * "the checkbox reflects it" and "the queue has an item in it" are all true of a
 * narrator that never utters a syllable. And the failure that matters most here is
 * inaudible as well as invisible: a voice whose `localService` is false synthesises on
 * somebody else's server, so a narrator handed vocabulary-substituted text would carry
 * a private dictionary off this computer without a single symptom on screen.
 *
 * So the contract test runs the real extracted source against a recording DOM and a
 * fake speech engine -- and this file is what says that test would actually notice if
 * it stopped.
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
 *     guard that held, and an anchor written with `\n` against a CRLF file is the
 *     commonest way to fake a green.
 *
 * Usage:  node scripts/negative-narration-site.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..', '..');
const consoleRoot = resolve(repo, 'console');
const TEST = 'site/tests/contracts/narration.test.mjs';

const file = (relative) => resolve(consoleRoot, relative);
const APP = file('site/app.js');
const SETTINGS = file('site/settings.html');
const CSS = file('site/styles.css');
const REGISTRY = file('site/feature-registry.json');
const LOCALES = file('site/locales/feature-registry.json');

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
  /* ---- The narrator never reaches the page at all. ---- */

  // applyState stops applying it, so the card shows whatever the markup shipped with and
  // a stored setting is a stored setting and nothing more. This is the defect this
  // repository has shipped most often, and it is invisible from the markup.
  ['applyState no longer applies the narration settings',
    swap(APP, 'applyDialogEmojis();applyNarration();', 'applyDialogEmojis();')],

  // Commented out rather than deleted, because that is how a wiring line usually dies --
  // and because a bare substring needle is satisfied by the comment.
  ['the initNarration() call is commented out rather than removed',
    swap(APP, 'initDisplayName();initNarration();', 'initDisplayName();/*initNarration();*/')],

  ['nothing starts the narrator at all',
    swap(APP, 'initDisplayName();initNarration();', 'initDisplayName();')],

  // Every control is on the page, connected to nothing.
  ['the master switch is bound to nothing',
    swap(APP, "toggle.onchange=event=>{setNarration('enabled',event.target.checked);commitNarration('enabled')};",
      '')],

  ['the rate slider is bound to nothing',
    swap(APP, "if(rate){rate.oninput=event=>setNarration('rate',event.target.value);rate.onchange=()=>commitNarration('rate')}",
      '')],

  /* ---- Off is not off. ---- */

  // On for everybody, including people who never asked to be spoken to.
  ['narration defaults to on',
    swap(APP, "narration:{enabled:false,language:'en'", "narration:{enabled:true,language:'en'")],

  // The switch stops mid-sentence work, so turning it off leaves the browser talking.
  ['turning it off no longer stops the sentence in progress',
    swap(APP, 'if(!next.enabled)narrationSilence();', '')],

  /* The guard that actually prevents speech once the narrator has been silenced.
   *
   * Worth recording, because the obvious break here is the wrong one: removing the
   * drain loop's OUTER guard instead leaves the queue emptying item by item and the
   * per-line guard below refusing each one, so nothing is spoken either way and the
   * planted break survives. It was written that way first, it went green, and the
   * finding is that the outer guard is a fast path rather than the thing that stops
   * the narrator. This one is the thing that stops the narrator. */
  ['the narrator keeps speaking queued lines after it has been silenced',
    swap(APP, '          if(!state.narration.enabled||narrationQuiet())break;\n', '')],

  // A reset turns narration off and leaves it talking.
  ['a reset no longer silences the narrator',
    swap(APP, '    narrationSilence();\n    applyState();', '    applyState();')],

  /* ---- One at a time, and not too often. ---- */

  // Every line is handed to the engine the moment it arrives, so two voices talk over
  // each other and "Both" becomes English and Cantonese simultaneously.
  ['the queue stops waiting for one utterance to end before starting the next',
    swap(APP, '          await speakNarrationLine(line);', '          speakNarrationLine(line);')],

  // A superseded line stacks behind the newer one, so the narrator reads a backlog of
  // stale status lines.
  ['a superseded line stacks instead of being replaced',
    swap(APP, '      if(narrationQueue[index].category===category)narrationQueue.splice(index,1);', '')],

  // The rate limit never fires, so a burst of settings changes is read out in full.
  ['the cooldown never applies',
    swap(APP, "if(!request.isError&&typeof last==='number'&&request.now-last<cooldown)return{speak:false,why:'cooldown'};",
      '')],

  // The rate limit applies to errors too, so a failure arriving straight after a notice
  // is dropped -- the one line the person most needs to hear.
  ['an error is rate-limited like anything else',
    swap(APP, "if(!request.isError&&typeof last==='number'", "if(typeof last==='number'")],

  // Low stimulation stops silencing it, so a request for quiet keeps talking.
  ['Low stimulation no longer silences the narrator',
    swap(APP, "if(request.quiet)return{speak:false,why:'quiet'};", '')],

  // An undeclared category gets a default rate limit instead of being refused, which is
  // how a typo becomes a category of its own with nobody's limit on it.
  ['an undeclared category is given a default rather than refused',
    swap(APP, 'return entry?entry.cooldownMs:null}', 'return entry?entry.cooldownMs:4000}')],

  /* ---- The privacy boundary. ---- */

  // The load-bearing one: narrated text now goes through the personal vocabulary, so a
  // network-backed voice carries a private replacement off this computer. Nothing on
  // screen changes.
  ['narrated text is taken after the personal vocabulary is applied',
    swap(APP, "if(source&&source.copyKey)return{en:copyLevel(source.copyKey,'en'),zh:copyLevel(source.copyKey,'zh')};",
      "if(source&&source.copyKey)return{en:applyVocabularyText(copyLevel(source.copyKey,'en')),zh:copyLevel(source.copyKey,'zh')};")],

  // A rejected vocabulary file now speaks its own reason, and those reasons quote the
  // file -- a duplicate term, an over-long replacement.
  ['a rejected vocabulary file speaks the reason it shows',
    swap(APP, "narrate('error',{en:'The personal vocabulary file was rejected. The reason is beside the upload control; it is not read aloud, because it can quote the file.',zh:'個人詞彙檔案唔收得。原因寫咗喺上載控制項隔籬，唔會讀出嚟，因為入面可能引用返個檔案嘅內容。'},{isError:true});",
      "narrate('error',{en:`The personal vocabulary file was rejected. ${reason}`},{isError:true});")],

  // One rejection route slips back out of the single writer, so the rule holds for the
  // branches somebody remembered and not for the one they did not.
  ['a vocabulary rejection writes its own status line again, bypassing the one writer',
    swap(APP, 'if(file.size>65536){rejectVocabulary(`the file is ${Math.round(file.size/1024)} KiB and the limit is 64 KiB.`);return}',
      "if(file.size>65536){$('vocabulary-status').textContent=`Rejected: the file is ${Math.round(file.size/1024)} KiB and the limit is 64 KiB.`;return}")],

  // A logo rejection stops narrating at all, so the asymmetry stops being a decision and
  // becomes an accident.
  ['a logo rejection route stops going through its writer',
    swap(APP, "if(!/^image\\/(png|jpeg|svg\\+xml)$/.test(file.type)){rejectLogo('only PNG, JPEG, or SVG images are accepted.');return}",
      "if(!/^image\\/(png|jpeg|svg\\+xml)$/.test(file.type)){$('logo-status').textContent='Rejected: only PNG, JPEG, or SVG images are accepted.';return}")],

  // A notification stops saying what to narrate, so it is silently mute -- which looks
  // exactly like a narrator that decided not to bother.
  ['a notification stops saying what to narrate',
    swap(APP, ",{category:'setting',copyKey:'notifSettingsReset'});", ');')],

  // notify stops narrating anything at all.
  ['notify no longer narrates the event it just recorded',
    swap(APP, "if(narration)narrate(narration.category||'notification',narrationTextFor(narration),{isError:Boolean(narration.isError)});",
      '')],

  /* ---- Voices, and what the status line says about them. ---- */

  // The network warning disappears, so the one fact that says the words leave this
  // computer is gone while everything still works.
  ['a network-backed voice is no longer named as one',
    swap(APP, "return voice&&voice.localService===false\n      ? ' It is network-backed,", "return voice&&voice.localService===true\n      ? ' It is network-backed,")],

  // A chosen voice that is not installed here is quietly reset, so the picker reads as
  // though nothing was ever chosen -- a different fact entirely.
  ['a chosen voice this computer lacks is thrown away rather than kept',
    swap(APP, "return{kind:'fallback',chosenVoiceId:chosenId,", "return{kind:'fallback',chosenVoiceId:'',")],

  // The kept choice loses its option, so the select cannot show it and snaps to
  // automatic.
  ['the kept choice loses the option that lets the picker show it',
    swap(APP, '        if(chosen&&!options.some(option=>option.value===chosen)){\n          options.push(makeNarrationOption(chosen,`${chosen} — not installed here`));\n        }',
      '')],

  // The display name is stored instead of the stable identity, so a profile written on
  // one computer silently stops matching on another.
  ['the display name is stored instead of the stable voice identity',
    swap(APP, 'const chosen=chosenId?voices.find(voice=>voice&&voice.voiceURI===chosenId)||null:null;',
      'const chosen=chosenId?voices.find(voice=>voice&&voice.name===chosenId)||null:null;')],

  // Mandarin outranks Cantonese for the Cantonese track, so `zh-CN` reads Cantonese text
  // in a different language.
  ['a Mandarin voice is treated as an equally good Cantonese one',
    swap(APP, "prefixes:['yue','zh'],preferred:['yue','zh-hk']", "prefixes:['yue','zh'],preferred:[]")],

  // The prefix match becomes a plain startsWith, so `eng` matches `en` and a Middle
  // English voice turns up in the English picker.
  ['a language prefix matches anything that merely starts with the letters',
    swap(APP, 'return value===prefix||value.startsWith(`${prefix}-`)}', 'return value.startsWith(prefix)}')],

  // No speech synthesis at all reads the same as no voice for a language, so two
  // different problems get one unhelpful sentence.
  ['a browser with no speech synthesis reports the same thing as one with no voice',
    swap(APP, "return{kind:'no-engine',chosenVoiceId:String(chosenId||''),effectiveVoiceId:'',message:'This browser has no speech synthesis, so nothing can be spoken here at all.'};",
      "return{kind:'no-engine',chosenVoiceId:String(chosenId||''),effectiveVoiceId:'',message:`No voice on this computer can read ${label} yet. Some browsers report their voices a moment after the page loads; this line updates when they do.`};")],

  // The empty-list sentence stops allowing for a list that simply has not arrived, so a
  // computer with forty voices is told it has none.
  ['the empty voice list stops allowing for a list that arrives late',
    swap(APP, ` yet. Some browsers report their voices a moment after the page loads; this line updates when they do.\`};
      return{kind:'automatic'`, `.\`};
      return{kind:'automatic'`)],

  // The late-arrival subscription goes, so the picker is read once and reports "no
  // voices" on most browsers for ever.
  ['the voice list is read once rather than re-read when the browser reports it late',
    swap(APP, "      engine.addEventListener('voiceschanged',narrationVoicesListener);", '')],

  // Leaving the page leaves the narrator talking into the next one and leaves a
  // subscription behind per page visited.
  ['leaving the page no longer stops the narrator or drops the subscription',
    swap(APP, "    addEventListener('pagehide',()=>{\n      narrationSilence();", "    addEventListener('pagehideXX',()=>{\n      narrationSilence();")],

  /* ---- Which language a line is read in. ---- */

  // The fallback goes, so a line the site has no Cantonese wording for is silently not
  // spoken at all -- which looks exactly like a narrator that has stopped working.
  ['a line with no wording in the narrated language is dropped rather than read in its own',
    swap(APP, 'return wanted.length?wanted:order.filter(has);', 'return wanted;')],

  // The narrated language stops narrowing anything, so choosing English still reads
  // Cantonese as well.
  ['the narrated language stops narrowing which tracks are spoken',
    swap(APP, 'const wanted=order.filter(key=>narrationSelectionIncludes(selection,key)&&has(key));',
      'const wanted=order.filter(key=>has(key));')],

  /* ---- Bounds. ---- */

  // The stored value goes to the engine unclamped, so a hand-edited settings blob hands
  // the browser a rate of 99.
  ['the stored rate reaches the engine unclamped',
    swap(APP, 'utterance.rate=clampNarrationValue(state.narration.rate,NARRATION_RATE);',
      'utterance.rate=state.narration.rate;')],

  // The slider offers a range the code will not honour, so its ends do nothing.
  ['the slider offers a range wider than the code clamps to',
    swap(SETTINGS, '<input id="narration-rate" type="range" min="0.5" max="2"', '<input id="narration-rate" type="range" min="0.5" max="4"')],

  /* ---- The card. ---- */

  ['a control loses its visible label',
    swap(SETTINGS, '<label for="narration-voice-zh">Cantonese voice</label>', '')],

  ['a status line stops being a live region',
    swap(SETTINGS, '<p id="narration-status-en" role="status">', '<p id="narration-status-en">')],

  ['the narrated-language options drift from what the code understands',
    swap(SETTINGS, '<option value="both">Both, English first</option>', '<option value="yue">Cantonese only, honest</option>')],

  ['the card stops saying it cannot detect a screen reader',
    swap(SETTINGS, '<p class="setting-note">A browser cannot tell whether a screen reader is running',
      '<p class="setting-note">This narrator steps aside for a screen reader')],

  ['the card loses its settings-search terms',
    swap(SETTINGS, 'data-search="narration narrator speech speak voice tts spoken read aloud rate pitch"', 'data-search="narration"')],

  ['the card description is unhooked from the funny-level copy',
    swap(SETTINGS, '<p id="narration-desc" data-copy="narrationDesc">', '<p id="narration-desc">')],

  ['the reset gate stops naming the narrator among the things it clears',
    swap(SETTINGS, 'the spoken-narration switch and its chosen voices, ', '')],

  ['the maximum English funny level stops saying it is off until switched on',
    swap(APP, "'Hands the page a voice. It stays off, mouth firmly shut, until you switch it on,",
      "'Hands the page a voice. It talks the moment you arrive,")],

  ['a Cantonese funny level stops saying it only reads what is on screen',
    swap(APP, '開咗都淨係讀畫面上已經有嘅嘢', '開咗就乜都讀')],

  ['the narration labels lose the rule that makes them read as labels',
    swap(CSS, '.setting-card-stack label[for^="narration-"]{', '.setting-card-stack label[for^="narrationX-"]{')],

  /* ---- The restricted presentation, which removes Cantonese from this page. ----
   *
   * Two guards rather than one, and both are needed: the queue-level filter never sees a
   * line whose two halves are already inside one queued item, and the per-line guard
   * never sees a line that was refused before it was ever queued. */

  ['a Cantonese track is queued anyway while the restricted presentation is on',
    swap(APP, "const spokenTracks=NARRATION_TRACKS.map(track=>track.key).filter(key=>!(schoolActive()&&key!=='en'));",
      'const spokenTracks=NARRATION_TRACKS.map(track=>track.key);')],

  ['a Cantonese half already queued is still read after the restricted presentation arrives',
    swap(APP, "          if(schoolActive()&&line.track!=='en')continue;\n", '')],

  /* ---- The registries. ---- */

  ['the registry claims the feature is still absent',
    swap(REGISTRY, '"narration": {\n      "state": "implemented",', '"narration": {\n      "state": "absent",')],

  ['the registry stops recording the vocabulary boundary',
    swap(REGISTRY, 'narrationTextFor() reads copyLevel(), the per-language copy before vocabulary substitution',
      'narrationTextFor() reads the copy')],

  ['the localization registry claims the card is untranslated',
    swap(LOCALES, '"narration": {\n      "state": "localized",', '"narration": {\n      "state": "not-localized",')],
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
