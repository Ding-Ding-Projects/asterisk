#!/usr/bin/env node
/**
 * Deliberate red-then-green proof for site/tests/contracts/support-tickets.test.mjs.
 *
 * A joke surface is an unusually easy place to ship a real defect, because everything
 * about it invites the reader to stop checking. "The card is there", "a ticket was
 * written" and "the resolution appeared" are all true of a desk that quietly posts the
 * description somewhere, or names a storage key nobody has ever written, or lets an
 * uploaded vocabulary file rewrite the one sentence promising nothing was sent. Each of
 * those looks exactly like a working desk from outside, and the last two look exactly
 * like a working desk from inside the source too.
 *
 * So the contract test runs the real extracted source against a recording page with the
 * network wired to throw -- and this file is what says that test would actually notice
 * if it stopped.
 *
 * One break at a time, always. Breaking three things and watching five assertions fail
 * proves only that something among them is watched; it hid a wiring line in this
 * repository once already.
 *
 * Every break edits a real file on disk, because that is the only way to exercise a test
 * that reads its subject off the filesystem. Three properties keep that safe:
 *
 *   - the original bytes are restored in a `finally`, and the restore is verified rather
 *     than assumed;
 *   - a break whose replacement did not change the bytes is reported as a FAILED CASE
 *     rather than counted as a pass. An edit that never landed reads exactly like a guard
 *     that held, and an anchor that matched nothing is the commonest way to fake a green;
 *   - **and a `finally` is not enough, which this script learned the hard way.** A run
 *     killed by an outer timeout dies inside a blocking `execFileSync` and never unwinds,
 *     so the planted break stays on disk -- where it reads as an ordinary line of the
 *     feature. One did, on 2026-08-26: a `setInterval` this script plants to prove the
 *     desk does not advance its own tickets sat in `site/app.js` for half an hour, and was
 *     found only because the contract test it exists to trip went red and somebody read
 *     the failure. So: the process traps SIGINT, SIGTERM and SIGHUP and restores before
 *     dying, and a run that finds an already-red baseline says out loud that a previous
 *     kill is the likeliest cause and names the files to check.
 *
 * Usage:  node scripts/negative-support-tickets-site.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..', '..');
const consoleRoot = resolve(repo, 'console');
const TEST = 'site/tests/contracts/support-tickets.test.mjs';

const file = (relative) => resolve(consoleRoot, relative);
const APP = file('site/app.js');
const SETTINGS = file('site/settings.html');
const DOCS = file('site/documentation.html');
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
  // ---- The desk never reaches the page ----

  // Commented out rather than deleted, because that is how a wiring line usually dies --
  // and because a bare substring needle is satisfied by the comment. The whole feature
  // becomes dead code and the settings page carries three controls that do nothing.
  ['the init call is commented out rather than removed',
    swap(APP, 'initUpdates();initSupport();', 'initUpdates();/*initSupport();*/')],

  ['nothing calls initSupport at all',
    swap(APP, 'initUpdates();initSupport();', 'initUpdates();')],

  ['the settings route into the desk is wired to nothing',
    swap(APP, "    $('support-open-settings')?.addEventListener('click',openSupportDesk);\n", '')],

  // The route that matters most, and the one nobody would notice was gone until they
  // were already locked out and looking for it.
  ['the recovery route is wired to nothing',
    swap(APP, "    $('support-open-recovery')?.addEventListener('click',openSupportDesk);\n", '')],

  ['the submit button is wired to nothing',
    swap(APP, "    $('support-submit')?.addEventListener('click',submitSupportForm);\n", '')],

  ['arriving from the Help link no longer opens the desk',
    swap(APP, "    if(supportRouteFromHash(typeof location==='undefined'?'':location.hash))openSupportDesk();\n", '')],

  ['the hash route answers any hash at all, so every settings visit opens the desk',
    swap(APP, "  function supportRouteFromHash(hash){return String(hash||'')==='#support-tickets'}",
      '  function supportRouteFromHash(hash){return true}')],

  ['the recovery button is moved out of the disclosure a locked-out reader opens',
    swap(SETTINGS, '<p id="school-recovery-text"></p><button id="support-open-recovery" class="text-button" type="button">Open Support Tickets</button></details>',
      '<p id="school-recovery-text"></p></details><button id="support-open-recovery" class="text-button" type="button">Open Support Tickets</button>')],

  ['the documentation page stops linking to the desk',
    swap(DOCS, '<a class="text-button" id="support-open-help" href="settings.html#support-tickets">Support Tickets</a>', '')],

  // ---- Something is sent somewhere ----

  // The single worst defect this surface could ship, because the copy promises the exact
  // opposite in so many words and a posted ticket looks identical from the outside.
  ['the ticket is quietly posted somewhere as well as being stored',
    swap(APP, '    saveSupport();\n    recordHistory(\'support-ticket-opened\'',
      '    saveSupport();\n    fetch(\'https://tickets.example.invalid/new\',{method:\'POST\',body:JSON.stringify(ticket)});\n    recordHistory(\'support-ticket-opened\'')],

  // ---- Something is deleted ----

  ['the resolution clears the storage it is supposed to only name',
    swap(APP, "    try{navigator.clipboard?.writeText?.(text)}catch{",
      "    for(const key of resolution.keys)localStorage.removeItem(key);\n    try{navigator.clipboard?.writeText?.(text)}catch{")],

  ['the resolution claims to delete things',
    swap(APP, '      deletesAnything:false,', '      deletesAnything:true,')],

  ['the resolution stops saying that this page will not do the clearing',
    swap(APP, 'This page does not clear anything for you, and there is no button here that will.',
      'Clearing site storage is straightforward.')],

  // ---- The key list stops being true ----

  // The defect this whole feature is arranged around: the panel is the one place a
  // locked-out reader is told what to clear, and a list that has drifted sends them to
  // clear the wrong things and come back still locked out.
  ['the key list quietly drops the key holding the lock itself',
    swap(APP, '    return [STORAGE_KEY,HISTORY_KEY,SCHOOL_KEY,SUPPORT_KEY,AUTH_KEY,VOCABULARY_CACHE_KEY,LOGO_CACHE_KEY];',
      '    return [STORAGE_KEY,HISTORY_KEY,SUPPORT_KEY,AUTH_KEY,VOCABULARY_CACHE_KEY,LOGO_CACHE_KEY];')],

  // AUTH_KEY joined the list at the merge with the built-in authenticator, which was built
  // on a separate branch the same day. Dropped on purpose here because it is the key with
  // the least to fall back on: the authenticator card offers no clear button of its own and
  // the settings reset deliberately leaves it alone, so this panel is the only route to it.
  ['the key list drops the authenticator store, which nothing else on the page can clear',
    swap(APP, '    return [STORAGE_KEY,HISTORY_KEY,SCHOOL_KEY,SUPPORT_KEY,AUTH_KEY,VOCABULARY_CACHE_KEY,LOGO_CACHE_KEY];',
      '    return [STORAGE_KEY,HISTORY_KEY,SCHOOL_KEY,SUPPORT_KEY,VOCABULARY_CACHE_KEY,LOGO_CACHE_KEY];')],

  ['the key list names a key nothing has ever written',
    swap(APP, '    return [STORAGE_KEY,HISTORY_KEY,SCHOOL_KEY,SUPPORT_KEY,AUTH_KEY,VOCABULARY_CACHE_KEY,LOGO_CACHE_KEY];',
      "    return [STORAGE_KEY,HISTORY_KEY,SCHOOL_KEY,SUPPORT_KEY,AUTH_KEY,VOCABULARY_CACHE_KEY,LOGO_CACHE_KEY,'ding-pbx-pages-preferences'];")],

  ['the key list is hand-written back to literals, so it can drift from the constants',
    swap(APP, '    return [STORAGE_KEY,HISTORY_KEY,SCHOOL_KEY,SUPPORT_KEY,AUTH_KEY,VOCABULARY_CACHE_KEY,LOGO_CACHE_KEY];',
      "    return ['ding-pbx-pages-v2','ding-pbx-pages-history-v1','ding-pbx-pages-school-v1','ding-pbx-pages-support-v1','ding-pbx-pages-authenticator-v1','ding-pbx-vocabulary-cache','ding-pbx-logo-cach'];")],

  ['an unreported origin renders as an empty string rather than as a reading nobody took',
    swap(APP, "      origin:origin||'this page’s own origin, which this browser did not report',", '      origin,')],

  // ---- The disclosure stops being unrewritable ----

  ['the disclosure is passed through the personal-vocabulary replacer, so an uploaded file can edit it',
    swap(APP, "    all('.support-disclosure').forEach(node=>{node.textContent=SUPPORT_DISCLOSURE});",
      "    all('.support-disclosure').forEach(node=>{node.textContent=applyVocabularyText(SUPPORT_DISCLOSURE)});")],

  ['the disclosure comes from the copy layer, so a funny level can rewrite it',
    swap(APP, "    all('.support-disclosure').forEach(node=>{node.textContent=SUPPORT_DISCLOSURE});",
      "    all('.support-disclosure').forEach(node=>{node.textContent=copyText('supportDesc')});")],

  ['the disclosure stops saying that no network request is made',
    swap(APP, 'no network request is made, no data is collected', 'no data is collected')],

  ['the disclosure is dropped from the dialog, so only the settings card carries it',
    swap(SETTINGS, '<p class="support-disclosure">Nothing here is sent anywhere.', '<p class="support-disclosure-note">Nothing here is sent anywhere.')],

  ['the severity note stops admitting that severity changes nothing',
    swap(APP, "    if($('support-severity-note'))$('support-severity-note').textContent=SUPPORT_SEVERITY_NOTE;\n", '')],

  // ---- The restricted presentation hides its own way out ----

  ['the restricted presentation removes the ticket desk along with everything else',
    swap(APP, "  const SCHOOL_SUPPRESSED=[", "  const SCHOOL_SUPPRESSED=[\n    {selector:'#support-tickets-card',what:'the support tickets card'},")],

  // ---- A ticket stops behaving like a ticket ----

  ['every ticket wears the same number',
    swap(APP, '    const sequence=supportStore.sequence+1;', '    const sequence=1;')],

  ['the counter is not persisted, so the numbers restart after a reload',
    swap(APP, '      const sequence=Number.isInteger(raw.sequence)&&raw.sequence>=0?raw.sequence:tickets.length;',
      '      const sequence=0;')],

  ['a refused form is stored anyway',
    swap(APP, '    const verdict=supportFormVerdict(form);\n    if(!verdict.ok)return verdict;', '    const verdict=supportFormVerdict(form);')],

  ['an empty description is accepted',
    swap(APP, "    if(description===''){", '    if(false){')],

  ['the over-length refusal stops naming the real length and the real bound',
    swap(APP, '      return{ok:false,field:\'support-description\',reason:`That is ${description.length} characters and the limit is ${SUPPORT_DESCRIPTION_MAX}. Nothing was recorded — shorten it and try again.`};',
      "      return{ok:false,field:'support-description',reason:'That is too long.'};")],

  ['a category outside the offered list is accepted',
    swap(APP, '    if(!SUPPORT_CATEGORIES.some(item=>item.id===(form&&form.category))){', '    if(false){')],

  // The decorative-control defect at close range. A first attempt at this break renamed a
  // severity id inside SUPPORT_SEVERITIES itself and stayed GREEN, correctly: the select
  // is built from that same constant, so the two cannot disagree that way and there was
  // no defect to catch. The real shape is an option hard-coded into the markup beside the
  // generated ones -- offered, chosen, and refused with nothing saying why.
  ['a severity is offered that the validator refuses, so a real choice does nothing',
    swap(APP, "      severitySelect.innerHTML=SUPPORT_SEVERITIES.map(item=>`<option value=\"${item.id}\">${escapeHtml(item.label)}</option>`).join('');",
      "      severitySelect.innerHTML=SUPPORT_SEVERITIES.map(item=>`<option value=\"${item.id}\">${escapeHtml(item.label)}</option>`).join('')+'<option value=\"cosmic\">Cosmic</option>';")],

  ['a category is offered that the validator refuses',
    swap(APP, "      categorySelect.innerHTML=SUPPORT_CATEGORIES.map(item=>`<option value=\"${item.id}\">${escapeHtml(item.label)}</option>`).join('');",
      "      categorySelect.innerHTML=SUPPORT_CATEGORIES.map(item=>`<option value=\"${item.id}\">${escapeHtml(item.label)}</option>`).join('')+'<option value=\"billing\">Billing</option>';")],

  ['a resolved ticket can be chased forever, so the status means nothing',
    swap(APP, '    if(index===SUPPORT_STATUSES.length-1)return{ok:false,reason:\'That ticket is already resolved.\'};',
      '    if(index===-1)return{ok:false,reason:\'That ticket is already resolved.\'};')],

  ['the desk advances its own tickets on a timer, so the status is a fiction that moves',
    swap(APP, '    renderSupport();\n    if(supportRouteFromHash(', '    renderSupport();\n    setInterval(()=>renderSupport(),30000);\n    if(supportRouteFromHash(')],

  // The append-only property, and what makes the bulk close safe without a two-key gate.
  ['reopening rewrites the update history rather than appending to it',
    swap(APP, "    ticket.updates=[...ticket.updates,{status:'received',at:now,note:'Reopened. Nothing was deleted; every earlier update is still listed.'}];",
      "    ticket.updates=[{status:'received',at:now,note:'Reopened. Nothing was deleted; every earlier update is still listed.'}];")],

  ['an already-open ticket can be reopened again, appending an update that means nothing',
    swap(APP, "    if(ticket.status==='received')return{ok:false,reason:'That ticket is already open.'};\n", '')],

  ['the canned answer is not stored, so a later slider move rewrites an answer already read',
    swap(APP, "      updates:[{status:'received',at:now,note:copyText('supportFirstResponse')}]",
      '      updates:[]')],

  ['the canned answer indexes the funny level directly, walking past the restricted presentation',
    swap(APP, "note:copyText('supportFirstResponse')", "note:copyLevel('supportFirstResponse','en')")],

  // A first attempt here deleted `loadSupport`'s explicit shape guard and stayed GREEN,
  // correctly: every malformed value the contract test feeds it makes the line below throw
  // anyway, and the surrounding `catch` returns the same empty store. The guard is clearer
  // than relying on a throw and stays, but deleting it is not a defect and must not be
  // listed as one. What IS a defect is trusting the parsed value wholesale, which is the
  // break below -- a stored `{"tickets":[{"id":1}]}` then becomes a ticket with no number,
  // no status and no description, rendered as though somebody had written it.
  ['a parsed stored value is trusted wholesale rather than being rebuilt from what it holds',
    swap(APP, '      return{schemaVersion:1,sequence,tickets};', '      return raw;')],

  ['a stored ticket in a status this code has never heard of is rendered anyway',
    swap(APP, '&&SUPPORT_STATUSES.includes(item.status)', '')],

  ['the store is written unbounded, so one browser can hold an unbounded list',
    swap(APP, "    return reportWrite('the support ticket',writeLocal(SUPPORT_KEY,JSON.stringify({...supportStore,tickets:supportStore.tickets.slice(0,SUPPORT_LIMIT)})));",
      "    return reportWrite('the support ticket',writeLocal(SUPPORT_KEY,JSON.stringify(supportStore)));")],

  // Added at the merge with in-context recovery, which made `writeLocal` the one writer
  // every store on this page goes through. Going round it does not throw and does not fail
  // to store anything on a browser with room -- it simply stops REPORTING, so the one
  // reader who needed to hear about it, on a browser with no room left, is told nothing and
  // finds an empty desk on their next visit with no explanation waiting.
  ['the desk writes straight at storage again, so a refused ticket is silently lost',
    swap(APP, "    return reportWrite('the support ticket',writeLocal(SUPPORT_KEY,JSON.stringify({...supportStore,tickets:supportStore.tickets.slice(0,SUPPORT_LIMIT)})));",
      '    localStorage.setItem(SUPPORT_KEY,JSON.stringify({...supportStore,tickets:supportStore.tickets.slice(0,SUPPORT_LIMIT)}));return true;')],

  // The other half of the same wiring, and not redundant: a reporter that swallows the
  // verdict leaves every refused write looking like a successful one to its caller.
  ['the write verdict is discarded, so a refusal reads to the caller as a save',
    swap(APP, "    return reportWrite('the support ticket',writeLocal(SUPPORT_KEY",
      "    reportWrite('the support ticket',writeLocal(SUPPORT_KEY")],

  ['nothing is recorded in local history, so a ticket appears from nowhere',
    swap(APP, "    recordHistory('support-ticket-opened',`Support ticket ${ticket.number} was opened in this browser.`);\n", '')],

  // ---- The list stops telling the truth ----

  ['the empty desk renders nothing at all, which reads as a list that failed to load',
    swap(APP, ":'<p class=\"empty-state\">No tickets in this browser yet. The form above writes one, and it goes no further than this page.</p>';", ":'';")],

  ['a description is rendered as markup rather than escaped',
    swap(APP, '<p class="support-description">${escapeHtml(ticket.description)}</p>', '<p class="support-description">${ticket.description}</p>')],

  ['a selected ticket the search no longer shows is still counted as selected',
    swap(APP, '    supportSelection={anchor:supportSelection.anchor,selected:new Set([...supportSelection.selected].filter(id=>lastSupportOrder.includes(id)))};\n', '')],

  ['the resolution is shown on every ticket, resolved or not',
    swap(APP, "${ticket.status==='resolved'?supportResolutionMarkup():''}", '${supportResolutionMarkup()}')],

  ['a resolved ticket still offers a Chase control that would do nothing',
    swap(APP, '${ticket.status===\'resolved\'?\' disabled title="This ticket is already resolved; reopen it to move it again."\':\'\'}', '')],

  ['ticket search stops going through the shared matcher, so the regex builder attaches to nothing',
    swap(APP, "matchText(supportTicketText(ticket),query,'support-search')", 'supportTicketText(ticket).includes(query)')],

  ['the export carries the internal id, which means nothing outside this browser',
    swap(APP, '      number:ticket.number,\n      category:supportCategoryLabel(ticket.category),',
      '      id:ticket.id,\n      number:ticket.number,\n      category:supportCategoryLabel(ticket.category),')],

  ['the bulk close declares itself irreversible, though a closed ticket can be reopened',
    swap(APP, '      },{destructive:false});', '      },{destructive:true});')],

  ['the bulk close stops going through the shared plan, so it never reports what it skipped',
    swap(APP, "      const plan=planBulk('Close',[...supportSelection.selected],id=>{", '      const plan={action:\'Close\',selected:[...supportSelection.selected],affected:[...supportSelection.selected],skipped:[],destructive:false};const unusedVerdict=(id=>{')],

  // ---- The surface stops obeying the rules every other surface here obeys ----

  ['the card description is unhooked from the funny-level sliders',
    swap(SETTINGS, '<p id="support-desc" data-copy="supportDesc">', '<p id="support-desc">')],

  ['the card is dropped from the settings search',
    swap(SETTINGS, 'id="support-tickets-card" data-search="support ticket tickets help desk recovery locked out forgotten value clear storage"',
      'id="support-tickets-card" data-search="support"')],

  ['the search field loses the anchored regular-expression builder beside it',
    swap(SETTINGS, '<button class="regex-trigger" type="button" data-regex-for="support-search" aria-label="Build a regular expression for ticket search">.*</button>', '')],

  ['the desk stops being a bounded overlay, so a long list would run off the page',
    swap(SETTINGS, '<dialog id="support-dialog" class="overlay-card" aria-labelledby="support-title">',
      '<dialog id="support-dialog" class="support-panel" aria-labelledby="support-title">')],

  ['the description box loses its label',
    swap(SETTINGS, '<label for="support-description">What happened?<textarea id="support-description"',
      '<div><textarea aria-label="What happened?" id="support-description"')],

  ['the new ticket list stops announcing itself',
    swap(SETTINGS, '<div id="support-list" class="support-list" aria-live="polite">', '<div id="support-list" class="support-list">')],

  ['the disclosure is styled as one more muted aside',
    swap(CSS, '.support-disclosure{margin:12px 0;padding:12px 14px;border:1px solid var(--outline);',
      '.support-disclosure{margin:12px 0;padding:12px 14px;border:0;')],

  ['a long unbroken word in a description pushes the row wider than the dialog',
    swap(CSS, '.support-description{margin:0 0 10px;overflow-wrap:anywhere}', '.support-description{margin:0 0 10px}')],

  ['the reset gate stops saying it leaves the tickets alone',
    swap(SETTINGS, ' It leaves the support tickets in this browser alone for the same reason as the switch itself: they are the recorded route back out of that lock.', '')],

  // ---- The records stop agreeing with the code ----

  ['the registry still calls the feature absent',
    swap(REGISTRY, '"support-tickets": {\n      "status": "implemented-unverified",', '"support-tickets": {\n      "status": "absent",')],

  ['the registry names only the script, not the page the desk is built into',
    swap(REGISTRY, '          "site/app.js",\n          "site/settings.html",\n          "site/documentation.html",',
      '          "site/app.js",\n          "site/documentation.html",')],

  ['the localization registry still calls the feature untranslated',
    swap(LOCALES, '"support-tickets": {\n      "state": "localized",', '"support-tickets": {\n      "state": "not-localized",')],

  ['one of the two new copy keys is missing from the known-keys list',
    swap(LOCALES, '    "supportDesc",\n    "supportFirstResponse",', '    "supportDesc",')],
];

/**
 * The contract test, bounded.
 *
 * The bound is not caution about a slow machine -- the whole file runs in about 200ms --
 * it is about a planted break that leaks a handle. One of the cases below plants a
 * `setInterval`, and extracted code that reaches a REAL timer keeps the test process
 * alive after its last assertion: `execFileSync` then blocks forever and the script
 * stalls on that one case rather than reporting it. The harness in the contract test
 * records timers instead of scheduling them, which is the actual repair; this is the
 * backstop for the next break nobody predicted. A run that exceeds the bound is red,
 * which is honest -- a test process that will not exit has failed.
 */
const runTest = () => {
  try {
    execFileSync(process.execPath, ['--test', TEST], {
      cwd: consoleRoot, stdio: 'pipe', timeout: 60_000, killSignal: 'SIGKILL',
    });
    return 'green';
  } catch {
    return 'red';
  }
};

/**
 * The one break currently on disk, if any, and the signal handlers that put it back.
 *
 * `finally` covers a thrown error and covers nothing at all about being killed, which is
 * the case that actually happened. A handler cannot cover SIGKILL either -- nothing can --
 * but it covers the timeouts and interrupts that a person or a harness will realistically
 * send, and that is the difference between a break that is always cleaned up and one that
 * quietly becomes part of the feature.
 */
let inFlight = null;
const restoreInFlight = () => {
  if (!inFlight) return;
  writeFileSync(inFlight.path, inFlight.before);
  console.error(`\nINTERRUPTED: restored the planted break in ${inFlight.path}`);
  inFlight = null;
};
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => { restoreInFlight(); process.exit(130); });
}
process.on('uncaughtException', (error) => { restoreInFlight(); throw error; });

const baseline = runTest();
if (baseline !== 'green') {
  console.error('FAIL: the untouched contract test is already red, so nothing below would mean anything.');
  console.error('      The likeliest cause is a previous run of this script that was killed mid-case and');
  console.error('      never unwound, leaving one planted break on disk. Check these files against the');
  console.error('      branch they should match before looking anywhere else:');
  for (const path of [APP, SETTINGS, DOCS, CSS, REGISTRY, LOCALES]) console.error(`        ${path}`);
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
    inFlight = { path: planted.path, before: planted.before };
    writeFileSync(planted.path, planted.after);
    broken = runTest();
  } finally {
    writeFileSync(planted.path, planted.before);
    inFlight = null;
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
