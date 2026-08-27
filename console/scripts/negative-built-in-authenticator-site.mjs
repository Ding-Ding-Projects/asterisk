#!/usr/bin/env node
/**
 * Deliberate red-then-green proof for site/tests/contracts/built-in-authenticator.test.mjs.
 *
 * An authenticator is unusually easy to ship broken in a way nothing complains about.
 * "There is a six-digit code on screen" is true of a surface showing a number that never
 * changes; "the secret is safe" is true of every implementation right up until one of
 * them writes it into a history entry; and a dynamic-truncation mask dropped from the
 * HOTP step produces codes that look exactly like codes and are refused by every service
 * on earth. None of that is visible in a screenshot, and the person who finds out is the
 * one locked out of their account.
 *
 * So the contract test runs the real extracted source against a recording page, a clock
 * it holds still, and RFC 6238's own published vectors -- and this file is what says that
 * test would actually notice if it stopped.
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
 * Usage:  node scripts/negative-built-in-authenticator-site.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..', '..');
const consoleRoot = resolve(repo, 'console');
const TEST = 'site/tests/contracts/built-in-authenticator.test.mjs';

const file = (relative) => resolve(consoleRoot, relative);
const APP = file('site/app.js');
const SETTINGS = file('site/settings.html');
const CSS = file('site/styles.css');
const REGISTRY = file('site/feature-registry.json');
const LOCALES = file('site/locales/feature-registry.json');
const ARTICLE = file('docs/platform/built-in-authenticator.md');

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
  const anchor = from.split('\n').join(eol);
  const body = to.split('\n').join(eol);
  const occurrences = before.split(anchor).length - 1;
  if (occurrences !== 1) {
    throw new Error(`the break anchor appears ${occurrences} time(s), not once: ${JSON.stringify(anchor.slice(0, 70))}`);
  }
  return { path, before, after: before.split(anchor).join(body) };
};

/**
 * Each case is one lie, and the comment beside it is the defect it stands for -- the
 * thing that would ship, silently, if the assertion it trips were deleted.
 */
const cases = [
  // ---- The feature is never reached ----

  // Commented out rather than deleted, because that is how a wiring line usually dies --
  // and because a bare substring needle is satisfied by the comment.
  ['the init call is commented out rather than removed',
    swap(APP, 'initMomentum();initAuthenticator();', 'initMomentum();/*initAuthenticator();*/')],

  ['nothing calls initAuthenticator at all',
    swap(APP, 'initMomentum();initAuthenticator();', 'initMomentum();')],

  ['initAuthenticator stops returning early on a page with no authenticator card',
    swap(APP, "    const card=$('authenticator-card');\n    if(!card)return;", "    const card=$('authenticator-card');")],

  ['the one-second tick is never started, so the codes on screen freeze at whatever they were',
    swap(APP, '    setInterval(authTick,1000);', '')],

  ['the Add control is no longer wired, so the dialog can never be opened',
    swap(APP, "    $('authenticator-add')?.addEventListener('click',()=>{", '    const unusedAdd=(()=>{')],

  ['the Save control is no longer wired, so a filled-in draft can never be stored',
    swap(APP, "    $('auth-save')?.addEventListener('click',()=>{authSaveDraft()});", '')],

  ['the account search is no longer wired, so typing filters nothing',
    swap(APP, "    $('authenticator-search')?.addEventListener('input',event=>authRenderList(event.target.value));", '')],

  ['Select this page is no longer wired',
    swap(APP, "    $('auth-select-page')?.addEventListener('click',()=>{", '    const unusedSelectPage=(()=>{')],

  ['Remove selected is no longer wired, so the bulk route is decoration',
    swap(APP, "    $('auth-remove-selected')?.addEventListener('click',()=>{", '    const unusedRemoveSelected=(()=>{')],

  ['the removal confirmation is no longer wired, so nothing can answer it',
    swap(APP, "    $('auth-confirm-yes')?.addEventListener('click',()=>{", '    const unusedConfirmYes=(()=>{')],

  ['the redacted account export is no longer wired',
    swap(APP, "    $('auth-export-selected')?.addEventListener('click',()=>{", '    const unusedExport=(()=>{')],

  ['the secrets export dialog can no longer be opened',
    swap(APP, "    $('auth-export-secrets')?.addEventListener('click',()=>{", '    const unusedSecrets=(()=>{')],

  ['the pasted-link route is no longer wired',
    swap(APP, "    $('auth-uri-apply')?.addEventListener('click',()=>{", '    const unusedUri=(()=>{')],

  ['the reveal control is no longer wired, so a hidden secret can never be checked by eye',
    swap(APP, "    $('auth-secret-reveal')?.addEventListener('click',()=>{", '    const unusedReveal=(()=>{')],

  // ---- The arithmetic. Every one of these still produces six plausible digits ----

  // The sign-bit mask. Without it a negative intermediate makes the code wrong roughly
  // half the time, which reads as an intermittent fault rather than a broken algorithm.
  ['dynamic truncation drops the sign-bit mask',
    swap(APP, '    const binCode=((signature[offset]&0x7f)<<24)', '    const binCode=((signature[offset]&0xff)<<24)')],

  ['the truncation offset is taken from the first byte rather than the last',
    swap(APP, '    const offset=signature[signature.length-1]&0x0f;', '    const offset=signature[0]&0x0f;')],

  ['the counter is written little-endian rather than big-endian',
    swap(APP, '    for(let i=7;i>=0;i-=1){bytes[i]=value%256;value=Math.floor(value/256)}',
      '    for(let i=0;i<8;i+=1){bytes[i]=value%256;value=Math.floor(value/256)}')],

  ['the code is reduced modulo a fixed six digits rather than the digits the account declares',
    swap(APP, '    return String(binCode%10**digits).padStart(digits,\'0\');',
      '    return String(binCode%10**6).padStart(digits,\'0\');')],

  ['a code with a leading zero loses it, so a six-digit account sometimes shows five',
    swap(APP, '    return String(binCode%10**digits).padStart(digits,\'0\');',
      '    return String(binCode%10**digits);')],

  ['the step is counted in milliseconds rather than seconds',
    swap(APP, '  function authStepFor(atMs,period){return Math.floor(atMs/1000/period)}',
      '  function authStepFor(atMs,period){return Math.floor(atMs/period)}')],

  ['verification stops allowing any skew, so a code read a second before the boundary is refused',
    swap(APP, '    const bound=Math.max(0,Math.floor(skewSteps));', '    const bound=0;')],

  ['verification widens to two steps, so a code a minute old is still accepted',
    swap(APP, '    const bound=Math.max(0,Math.floor(skewSteps));', '    const bound=2;')],

  ['verification stops checking the shape of what it was handed',
    swap(APP, "    if(typeof code!=='string'||code.length!==digits||!/^\\d+$/.test(code))return false;", '')],

  ['the countdown rounds down, so a fresh code claims one second less than it has',
    swap(APP, '    return remaining===normalised?normalised:Math.ceil(remaining);',
      '    return remaining===normalised?normalised:Math.floor(remaining);')],

  // ---- base32: the quiet way to store a different secret from the one you were given ----

  ['an unknown character is skipped rather than refused, so a mistyped secret becomes a different one',
    swap(APP, "      if(index===-1)throw new Error(`The secret contains a character that is not base32: ${character}`);", '      if(index===-1)continue;')],

  ['the secret is no longer upper-cased, so a lower-case one decodes to nothing',
    swap(APP, "    const cleaned=String(value||'').replace(/\\s+/g,'').replace(/=+$/g,'').toUpperCase();",
      "    const cleaned=String(value||'').replace(/=+$/g,'');")],

  // ---- Parameters: refusing to guess ----

  ['an algorithm this page cannot compute quietly becomes SHA-1',
    swap(APP, "    if(!mapped)throw new Error(`This page can compute SHA-1, SHA-256 and SHA-512 codes; the link asks for ${String(algorithm)}.`);",
      "    if(!mapped)return 'SHA-1';")],

  ['the digit bound is widened, so a four-digit account is accepted and computed wrongly',
    swap(APP, '    if(!Number.isInteger(value)||value<6||value>8)throw new Error(`A code has between 6 and 8 digits; this one asks for ${String(digits)}.`);',
      '    if(!Number.isInteger(value)||value<1||value>16)throw new Error(`A code has between 6 and 8 digits; this one asks for ${String(digits)}.`);')],

  ['the period bound disappears, so a zero-second period reaches the arithmetic',
    swap(APP, '    if(!Number.isInteger(value)||value<1||value>AUTH_PERIOD_MAX)throw new Error(`A code lasts between 1 and ${AUTH_PERIOD_MAX} seconds; this one asks for ${String(period)}.`);',
      '')],

  // ---- otpauth:// links ----

  ['a counter-based link is accepted and treated as a time-based one',
    swap(APP, "    if(parsed.host!=='totp')throw new Error(`This page keeps time-based accounts only; that link is for ${parsed.host}.`);", '')],

  ['a link with no secret is accepted, so an account is stored that can never produce a code',
    swap(APP, "    if(!secret)throw new Error('That link carries no secret, so there is nothing to compute a code from.');", '')],

  ['the issuer in the label is dropped when the link carries no issuer parameter',
    swap(APP, '      issuer:(parsed.searchParams.get(\'issuer\')??issuerFromLabel).slice(0,AUTH_LABEL_MAX),',
      "      issuer:(parsed.searchParams.get('issuer')??'').slice(0,AUTH_LABEL_MAX),")],

  ['the algorithm in the link is ignored, so a SHA-256 account is stored as SHA-1',
    swap(APP, "      algorithm:authNormaliseAlgorithm(parsed.searchParams.get('algorithm')),", "      algorithm:'SHA-1',")],

  // ---- The secret leaves its own store ----

  ['the local-history entry names the secret it was careful not to name',
    swap(APP, "    recordHistory('authenticator-account-added',`An authenticator account was added: ${authEntryTitle(entry)} (${authEntryMeta(entry)}). The secret is not in this entry.`);",
      "    recordHistory('authenticator-account-added',`An authenticator account was added: ${authEntryTitle(entry)} (${entry.secret}).`);")],

  ['the ordinary account export writes the real secret rather than the word omitted',
    swap(APP, "      digits:entry.digits,period:entry.period,secret:'omitted',", '      digits:entry.digits,period:entry.period,secret:entry.secret,')],

  ['the redacted settings export stops naming the store it left out',
    swap(APP, 'restrictedPresentation:schoolExportSummary(),authenticator:authExportSummary()', 'restrictedPresentation:schoolExportSummary()')],

  ['the export summary reports the secret count as the secrets themselves',
    swap(APP, "  function authExportSummary(){return {accounts:authEntries.length,secrets:'omitted',storedSeparatelyIn:AUTH_KEY}}",
      '  function authExportSummary(){return {accounts:authEntries.length,secrets:authEntries.map(entry=>entry.secret),storedSeparatelyIn:AUTH_KEY}}')],

  ['the accounts move into the settings store, where every history snapshot serializes them',
    swap(APP, "  function authSaveEntries(){return reportWrite('your authenticator accounts',writeLocal(AUTH_KEY,JSON.stringify(authEntries)))}",
      "  function authSaveEntries(){state.authenticator=authEntries;return reportWrite('your authenticator accounts',writeLocal(AUTH_KEY,JSON.stringify(authEntries)))}")],

  // A browser out of room refuses the write and the account is gone at the next load,
  // with nothing on screen having said so. This is the one store where that silence
  // costs the reader a credential rather than a preference.
  ['the account store writes straight past the guard that reports a refused write',
    swap(APP, "  function authSaveEntries(){return reportWrite('your authenticator accounts',writeLocal(AUTH_KEY,JSON.stringify(authEntries)))}",
      '  function authSaveEntries(){localStorage.setItem(AUTH_KEY,JSON.stringify(authEntries))}')],

  ['a refused write is reported as a different store, so the sentence names the wrong thing',
    swap(APP, "return reportWrite('your authenticator accounts',writeLocal(AUTH_KEY", "return reportWrite('something',writeLocal(AUTH_KEY")],

  ['removing an account leaves its secret in storage',
    swap(APP, '    authEntries=authEntries.filter(entry=>!wanted.has(entry.id));\n    authSaveEntries();',
      '    authEntries=authEntries.filter(entry=>!wanted.has(entry.id));')],

  // ---- The one gate that writes a usable secret ----

  ['a half-travelled slider authorizes the secrets export',
    swap(APP, '      if(value>=100&&authSecretsReady()){authPerformSecretsExport();$(\'auth-secrets-dialog\')?.close()}',
      "      if(value>=1&&authSecretsReady()){authPerformSecretsExport();$('auth-secrets-dialog')?.close()}")],

  ['one key is enough to arm the slider',
    swap(APP, "  function authSecretsReady(){return Boolean($('auth-secrets-key-1')?.checked&&$('auth-secrets-key-2')?.checked)}",
      "  function authSecretsReady(){return Boolean($('auth-secrets-key-1')?.checked||$('auth-secrets-key-2')?.checked)}")],

  ['the slider is live before either key is turned',
    swap(APP, '    slider.disabled=!authSecretsReady();', '    slider.disabled=false;')],

  ['the secrets export writes a redacted file, so the gate guards something that was never sensitive',
    swap(APP, '      digits:entry.digits,period:entry.period,secret:entry.secret,link:authPairingUri(entry),',
      "      digits:entry.digits,period:entry.period,secret:'omitted',link:'omitted',")],

  ['the secrets export records the secrets in local history on its way out',
    swap(APP, "    recordHistory('authenticator-secrets-exported',`${rows.length} authenticator secret${rows.length===1?'':'s'} were written to a file in the clear. This entry names the count and no secret.`);",
      "    recordHistory('authenticator-secrets-exported',`Wrote ${rows.map(row=>row.secret).join(', ')} to a file.`);")],

  // ---- Saving something that can never work ----

  ['a duplicate secret is accepted, so one account shows under two names',
    swap(APP, "    if(authEntries.some(entry=>entry.secret===secret))return 'This page already keeps an account with that exact secret. Adding it twice would show you the same code under two names.';", '')],

  ['an account with no name at all is accepted',
    swap(APP, "    if(!String(draft.issuer||'').trim()&&!String(draft.account||'').trim())return 'Give the account a service name, a user name, or both, so you can tell its code from the others.';", '')],

  ['saving stops requiring a code this page actually computed, so a truncated secret is stored',
    swap(APP, "    catch(error){return {ok:false,reason:`This page could not compute a code from that secret: ${error.message}`}}",
      '    catch{code=undefined}')],

  ['a supplied cross-check code is accepted whether or not it matches',
    swap(APP, '    const matches=await authVerifyCode(draft,supplied,atMs,AUTH_SKEW_STEPS);',
      '    const matches=true;')],

  ['skipping the cross-check stops saying what was not checked',
    swap(APP, "    if(!supplied)return {ok:true,code,crossChecked:false,note:'Saved without a cross-check. Nothing has confirmed that this secret is the one the service issued — only that a code can be computed from it.'};",
      '    if(!supplied)return {ok:true,code,crossChecked:false,note:\'Saved.\'};')],

  ['the Save control stays live while the draft is refused',
    swap(APP, '    if(save)save.disabled=Boolean(problem);', '    if(save)save.disabled=false;')],

  // ---- The list: a reading that is invented rather than taken ----

  ['the countdown never moves, so the row cannot say how long the code has left',
    swap(APP, '        if(metaCell)metaCell.textContent=`${authEntryMeta(entry)} · ${authSecondsRemaining(entry.period,atMs)}s left · next ${authGroupCode(next)}`;',
      '        if(metaCell)metaCell.textContent=`${authEntryMeta(entry)} · 30s left · next ${authGroupCode(next)}`;')],

  ['the next-code peek is computed from the current step, so it repeats the code already on screen',
    swap(APP, '        next=await authGenerateCode(entry,(authStepFor(atMs,entry.period)+1)*entry.period*1000);',
      '        next=await authGenerateCode(entry,atMs);')],

  ['the code cell is written once and never updated again',
    swap(APP, '        codeCell.textContent=authGroupCode(code);', '        if(!codeCell.textContent||codeCell.textContent===\'—\')codeCell.textContent=authGroupCode(code);')],

  ['the announcer speaks on every tick, so a screen reader hears the countdown once a second',
    swap(APP, '        if(authLastCodes.get(entry.id)!==code){changed.push(entry);authLastCodes.set(entry.id,code)}',
      '        {changed.push(entry);authLastCodes.set(entry.id,code)}')],

  ['the announcer never speaks, so a new code arrives silently',
    swap(APP, "    if(!region||!changed.length)return;", '    if(!region||!changed.length)return;\n    if(true)return;')],

  ['a stored record that cannot produce a code is discarded without a count',
    swap(APP, '      return {entries,dropped:dropped+Math.max(0,raw.length-AUTH_ENTRY_LIMIT)};', '      return {entries,dropped:0};')],

  ['the empty state is blank, so an empty list and a broken one look the same',
    swap(APP, "`<p class=\"empty-state\">${escapeHtml(authEntries.length?'No account matches this search.':'No accounts yet. Add one with an otpauth:// link, a QR code, or the secret the service showed you.')}</p>`",
      '\'<p class="empty-state"></p>\'')],

  ['a row checkbox loses its accessible name, so a screen reader reads a column of unlabelled boxes',
    swap(APP, '`<label class="auth-select"><input type="checkbox" ${selected?\'checked\':\'\'} aria-label="Select ${escapeHtml(authEntryTitle(entry))}"></label>`',
      '`<label class="auth-select"><input type="checkbox" ${selected?\'checked\':\'\'}></label>`')],

  ['reordering changes the list on screen and never reaches storage',
    swap(APP, '    authEntries=next;\n    authSaveEntries();', '    authEntries=next;')],

  ['bulk removal removes before the confirmation is answered',
    swap(APP, '      if($(\'auth-confirm-text\'))$(\'auth-confirm-text\').textContent=`${summariseBulk(plan)} Each removal deletes that account\'s secret from this browser, and nothing here can give it back.`;\n      box.hidden=false;',
      "      if($('auth-confirm-text'))$('auth-confirm-text').textContent=`${summariseBulk(plan)} Each removal deletes that account's secret from this browser, and nothing here can give it back.`;\n      box.hidden=false;\n      authRemoveEntries([...authSelection.selected]);")],

  ['the removal preview stops saying the secret cannot be recovered',
    swap(APP, "Each removal deletes that account's secret from this browser, and nothing here can give it back.", 'Removing them.')],

  // ---- Capability: offering a scan this browser cannot perform ----

  ['the capability sentence claims a detector this browser does not have',
    swap(APP, "    if(!authDetectorAvailable())return 'This browser reports no barcode detector, so the three reading routes — an image file, the clipboard, and the camera — are not offered here. Paste the otpauth:// link or type the secret instead. Nothing is missing from the account itself: a typed secret and a scanned one are the same secret.';",
      '')],

  ['the reading routes stay on screen when the browser can perform none of them',
    swap(APP, "    if(!authDetectorAvailable()&&$('auth-qr-file-row'))$('auth-qr-file-row').hidden=true;", '')],

  ['the camera route stays on screen on a browser with no camera access',
    swap(APP, "    if(!authCameraAvailable()&&$('auth-qr-camera'))$('auth-qr-camera').hidden=true;", '')],

  ['the clipboard route stops requiring a detector, so it offers a read it cannot finish',
    swap(APP, "  function authClipboardAvailable(){return authDetectorAvailable()&&typeof navigator!=='undefined'&&Boolean(navigator.clipboard&&navigator.clipboard.read)}",
      "  function authClipboardAvailable(){return typeof navigator!=='undefined'&&Boolean(navigator.clipboard&&navigator.clipboard.read)}")],

  ['a QR that is not an authenticator link is accepted and parsed anyway',
    swap(APP, "    const link=values.find(value=>value.toLowerCase().startsWith('otpauth://'));", '    const link=values[0];')],

  // ---- The clock sentence, which is the honest half of a missing feature ----

  ['the clock note stops saying this page cannot measure the clock',
    swap(APP, "    return 'Codes come from this computer’s own clock. Nothing here asks the network what the time is, so this page cannot tell you the clock is wrong — if every code from every account is refused, a clock that has drifted is the first thing to check.';",
      "    return 'Codes come from this computer’s clock.';")],

  // ---- Markup, styling and the neighbours that had to move ----

  ['the card description is unhooked from the funny-level copy',
    swap(SETTINGS, '<p id="authenticator-desc" data-copy="authenticatorDesc">', '<p id="authenticator-desc">')],

  ['the announcer stops being a live region',
    swap(SETTINGS, '<p id="authenticator-announcer" class="sr-only" role="status" aria-live="polite">', '<p id="authenticator-announcer" class="sr-only" role="status">')],

  ['the account list becomes a live region, so the countdown is spoken every second',
    swap(SETTINGS, '<div id="authenticator-list" class="auth-list">', '<div id="authenticator-list" class="auth-list" aria-live="polite">')],

  ['the account search loses its anchored regular-expression builder',
    swap(SETTINGS, '<button class="regex-trigger" type="button" data-regex-for="authenticator-search" aria-label="Build a regular expression for authenticator account search">.*</button>', '')],

  ['the card loses its settings-search terms',
    swap(SETTINGS, 'data-search="authenticator totp otp one-time code two factor 2fa pairing qr secret account codes security"', 'data-search=""')],

  ['the reset gate stops naming the accounts among the things it deliberately does not clear',
    swap(SETTINGS, 'It also leaves your authenticator accounts alone', 'It also leaves some things alone')],

  ['Export everything stops saying which record set it does not write',
    swap(SETTINGS, '<p id="export-everything-excluded" class="setting-note">', '<p id="export-everything-unnamed" class="setting-note">')],

  ['the code stops being monospaced, so grouped digits shift width as they change',
    swap(CSS, '.auth-code{font-family:var(--font-mono);', '.auth-code{')],

  ['the row stops wrapping on a narrow screen, so its actions are pushed off the edge',
    swap(CSS, '@media(max-width:620px){.auth-entry{flex-wrap:wrap}', '@media(max-width:620px){.auth-entry{')],

  // ---- The registries and the article ----

  ['the registry claims the feature is still absent',
    swap(REGISTRY, '"state": "implemented",\n      "note": "Built on 2026-08-26. site/settings.html carries a SECURITY card', '"state": "absent",\n      "note": "Built on 2026-08-26. site/settings.html carries a SECURITY card')],

  ['the localization registry claims the card is untranslated',
    swap(LOCALES, '"state": "localized",\n      "mechanism": "console/site/app.js -- the COPY table (per-key en/zh variants at four funny levels), copyText() as the selector, and applyVocabularyText() over the result",\n      "copyKeys": [\n        "authenticatorDesc"\n      ],',
      '"state": "not-localized",\n      "mechanism": "console/site/app.js -- the COPY table (per-key en/zh variants at four funny levels), copyText() as the selector, and applyVocabularyText() over the result",\n      "copyKeys": [\n        "authenticatorDesc"\n      ],')],

  ['the new COPY key is missing from the known list',
    swap(LOCALES, '"authenticatorDesc",\n    ', '    ')],

  ['the maximum English funny level stops saying nothing is sent anywhere',
    swap(APP, "The secrets stay in this browser and nothing is sent anywhere, to anyone, ever.", 'The secrets are handled carefully.')],

  ['a Cantonese variant stops saying the code is computed on this page',
    swap(APP, '每一個驗證碼都係喺呢版用你登記嗰個密鑰計出嚟。', '每一個驗證碼都會顯示喺呢度。')],

  ['the shipped card description drifts from the plainest funny-level variant',
    swap(SETTINGS, 'Keeps one-time-code accounts for other services in this browser and shows their codes here.',
      'Keeps one-time-code accounts for other services in this browser.')],

  ['the article stops explaining which half of the contract this surface implements',
    swap(ARTICLE, '- **Pairing out.**', '- **Handing a secret outward.**')],
];

let failures = 0;
let planted = 0;

const runTest = () => {
  try {
    execFileSync(process.execPath, ['--test', TEST], { cwd: consoleRoot, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
};

console.log(`Baseline: ${TEST}`);
if (!runTest()) {
  console.error('FAILED: the contract test is already red before anything was planted.');
  process.exit(1);
}

for (const [label, prepare] of cases) {
  let edit;
  try {
    edit = prepare();
  } catch (error) {
    console.error(`FAILED CASE  ${label}\n             ${error.message}`);
    failures += 1;
    continue;
  }
  if (edit.after === edit.before) {
    console.error(`FAILED CASE  ${label}\n             the replacement changed no bytes, so nothing was actually broken`);
    failures += 1;
    continue;
  }
  planted += 1;
  let brokeRed = false;
  let restoredGreen = false;
  try {
    writeFileSync(edit.path, edit.after);
    brokeRed = !runTest();
  } finally {
    writeFileSync(edit.path, edit.before);
    if (readFileSync(edit.path, 'utf8') !== edit.before) {
      console.error(`FAILED CASE  ${label}\n             the restore did not put the original bytes back`);
      process.exit(1);
    }
    restoredGreen = runTest();
  }
  if (brokeRed && restoredGreen) {
    console.log(`ok    broke=red   restored=green  ${label}`);
  } else {
    failures += 1;
    console.error(`FAIL  broke=${brokeRed ? 'red' : 'GREEN'} restored=${restoredGreen ? 'green' : 'RED'}  ${label}`);
  }
}

if (failures > 0) {
  console.error(`\nFAILED: ${failures} planted break(s) did not turn ${TEST} red, or could not be planted at all.`);
  process.exit(1);
}
console.log(`\nPASS: ${planted} planted break(s), each alone, each turning ${TEST} red and then green again on restore.`);
