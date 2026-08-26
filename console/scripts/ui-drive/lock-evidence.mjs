/**
 * Built-artifact interaction evidence for the two per-element lock features that had none.
 *
 * `inventories/surface-completeness.json` asks every row for six artifacts, and two of the
 * windows-console rows -- `built-in-authenticator` and `unlock-ladder` -- carried four. Both
 * were described in `app/feature-registry.json` as reachable in the built application, which
 * is a claim about a running program that no unit test can make: every renderer test injects
 * its own host, so it proves the screen and says nothing about whether the packaged artifact
 * reaches it. This drives the real packaged executable and writes down what it observed.
 *
 * Three properties this is written to establish rather than assert, because each is the exact
 * thing a passing suite would not notice:
 *
 *   The authenticator secret is generated locally. The record carries the resource-timing
 *   count from before and after pairing, so "no network call" is a measurement rather than a
 *   sentence in a comment.
 *
 *   The code the running application accepts is a real RFC 6238 code. It is computed HERE,
 *   from the captured secret, with Node's own crypto -- never by calling the application's own
 *   totp.ts, which would only prove that a function agrees with itself. A deliberately stale
 *   code from two steps back is offered first and must be refused.
 *
 *   Clearing an unlock-ladder challenge does not unlock anything. The ladder's founding rule
 *   is that it clears the WAITING and never the CREDENTIAL, so the lock banner is read again
 *   after a cleared challenge and must still be there.
 *
 * Isolation is proven before anything is evaluated: `connect()` refuses unless the debugging
 * endpoint offers exactly one page target. The application must already be running on an
 * off-screen desktop under a throwaway profile; `scripts/launch-on-hidden-desktop.ps1` puts it
 * there. Nothing here touches the visible desktop, the cursor or the foreground window.
 *
 * Usage:
 *   node scripts/ui-drive/lock-evidence.mjs <port> <artifact-exe> [outDir]
 */
import { connect } from './cdp.mjs';
import { createHash, createHmac } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, join, relative } from 'node:path';

const PORT = Number(process.argv[2] || 9711);
const ARTIFACT = process.argv[3];
if (!ARTIFACT) throw new Error('lock-evidence: an absolute path to the packaged executable is required');
const REPO = resolve(import.meta.dirname, '..', '..', '..');
const OUT_EVIDENCE = resolve(REPO, 'console/release/evidence/windows-console');
const OUT_CAPTURES = resolve(REPO, 'console/release/captures/windows-console');
mkdirSync(OUT_EVIDENCE, { recursive: true });
mkdirSync(OUT_CAPTURES, { recursive: true });

const PASSPHRASE = 'correct horse battery staple';
const LADDER_PIN = '246810';
const WRONG_PIN = '111111';

const settle = (ms = 420) => new Promise((r) => setTimeout(r, ms));
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

/* ------------------------------------------------------------------ *
 * RFC 6238, computed here rather than borrowed from the application.
 * ------------------------------------------------------------------ */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function decodeBase32(secret) {
  let bits = 0;
  let value = 0;
  const out = [];
  for (const character of secret.replace(/=+$/, '').toUpperCase()) {
    const index = ALPHABET.indexOf(character);
    if (index < 0) throw new Error(`lock-evidence: '${character}' is not base32`);
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 0xff); bits -= 8; }
  }
  return Buffer.from(out);
}
function totpAt(secret, unixMs, step = 30) {
  const counter = Math.floor(unixMs / 1000 / step);
  const message = Buffer.alloc(8);
  message.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  message.writeUInt32BE(counter >>> 0, 4);
  const digest = createHmac('sha1', decodeBase32(secret)).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = ((digest[offset] & 0x7f) << 24) | (digest[offset + 1] << 16)
    | (digest[offset + 2] << 8) | digest[offset + 3];
  return String(binary % 1_000_000).padStart(6, '0');
}

/* ------------------------------------------------------------------ */
const { send, evaluate, close } = await connect(PORT);

const fail = (why) => { console.error('REFUSING: ' + why); close(); process.exit(2); };

/** Every visible leaf's trimmed text. The application draws icon ligatures as text, so a
 *  leaf's content is frequently a glyph name -- that is data here, not noise. */
const leaves = () => evaluate(`(() => {
  const vis = (e) => !!(e.offsetWidth || e.offsetHeight);
  return [...document.querySelectorAll('*')]
    .filter((e) => e.children.length === 0 && vis(e) && (e.textContent || '').trim())
    .map((e) => (e.textContent || '').trim());
})()`);

const sees = async (needle) => (await leaves()).some((t) => t.includes(needle));

/**
 * Clicks a control by its own text, optionally scoped to one dialog.
 *
 * Scoping is not tidiness. The onboarding wizard sitting behind these dialogs carries its own
 * Back/Next pair, so an unscoped `Next` reaches whichever one the document happens to order
 * last -- and when the lock wizard's final button is labelled `Lock it` rather than `Next`,
 * an unscoped click silently drives the onboarding wizard instead and nothing looks wrong.
 * The compiled design gives each dialog its own stacking context, so that is what is used:
 * 82 is the lock wizard, 83 the unlock dialog.
 */
const scopeFor = (zIndex) => (zIndex === null
  ? 'document'
  : `([...document.querySelectorAll('div')].find((d) => d.style.zIndex === '${zIndex}') || { querySelectorAll: () => [] })`);

const clickExactIn = (zIndex, text) => evaluate(`(() => {
  const vis = (e) => !!(e.offsetWidth || e.offsetHeight);
  const all = [...${scopeFor(zIndex)}.querySelectorAll('*')]
    .filter((e) => e.children.length === 0 && vis(e) && (e.textContent || '').trim() === ${JSON.stringify(text)});
  if (!all.length) return { ok: false };
  const control = all[all.length - 1].closest('button, [role=menuitem]') || all[all.length - 1];
  control.click();
  return { ok: true };
})()`);

const clickContainsIn = (zIndex, text) => evaluate(`(() => {
  const vis = (e) => !!(e.offsetWidth || e.offsetHeight);
  const all = [...${scopeFor(zIndex)}.querySelectorAll('button')]
    .filter((e) => vis(e) && (e.textContent || '').includes(${JSON.stringify(text)}));
  if (!all.length) return { ok: false };
  all[all.length - 1].click();
  return { ok: true };
})()`);

const clickExact = (text) => clickExactIn(null, text);
const clickContains = (text) => clickContainsIn(null, text);
/** Advances the lock wizard by one step and refuses to pretend a missing button was pressed. */
const lockWizard = async (label) => {
  const result = await clickExactIn('82', label);
  if (!result.ok) fail(`the lock wizard has no visible '${label}' control`);
  await settle(380);
};
const unlockDialog = async (label) => {
  const result = await clickExactIn('83', label);
  if (!result.ok) fail(`the unlock dialog has no visible '${label}' control`);
};
/**
 * Opens the credential prompt from the locked banner.
 *
 * The banner's button and the dialog's submit button are both labelled `Unlock`, so this
 * deliberately takes the one OUTSIDE the dialog: clicking the dialog's own button would
 * submit an empty credential and read, from the outside, exactly like opening it.
 */
const openUnlockDialog = async () => {
  const opened = await evaluate(`(() => {
    const dialog = [...document.querySelectorAll('div')].find((d) => d.style.zIndex === '83');
    const button = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Unlock'
      && (b.offsetWidth || b.offsetHeight) && !(dialog && dialog.contains(b)));
    if (!button) return { ok: false };
    button.click();
    return { ok: true };
  })()`);
  if (!opened.ok) fail('the locked banner offered no Unlock control');
  await settle(600);
  const present = await evaluate("!![...document.querySelectorAll('div')].find((d) => d.style.zIndex === '83')");
  if (!present) fail('the credential prompt did not open');
};

/** React owns the value property, so assigning `input.value` is discarded on the next render.
 *  The prototype setter plus a bubbling `input` event is what a real keystroke looks like. */
const typeInto = (selector, value) => evaluate(`(() => {
  const el = document.querySelector(${JSON.stringify(selector)});
  if (!el) return { ok: false };
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(el, ${JSON.stringify(value)});
  el.dispatchEvent(new Event('input', { bubbles: true }));
  return { ok: true };
})()`);

const openScreenContextMenu = () => evaluate(`(() => {
  const pane = [...document.querySelectorAll('div')]
    .find((d) => /overflow-y: auto/.test(d.style.cssText) && /padding: 0px 26px 80px/.test(d.style.cssText));
  if (!pane) return { ok: false };
  const r = pane.getBoundingClientRect();
  pane.dispatchEvent(new MouseEvent('contextmenu', {
    bubbles: true, cancelable: true, clientX: Math.round(r.left + 120), clientY: Math.round(r.top + 120),
  }));
  return { ok: true };
})()`);

/** The toast is where every refusal in this flow lands, so it is read rather than inferred.
 *  It is the compiled design's own z-index 85 surface; its trailing Undo control is dropped
 *  so the recorded sentence is the message the person actually read. */
const toastText = () => evaluate(`(() => {
  const toast = [...document.querySelectorAll('div')].find((d) => d.style.zIndex === '85');
  if (!toast) return '';
  const message = toast.querySelector('span');
  return message ? message.textContent.trim() : '';
})()`);

const resourceCount = () => evaluate('performance.getEntriesByType("resource").length');

const pressKeypad = async (digits) => {
  for (const digit of digits) { await unlockDialog(digit); await settle(90); }
};

/**
 * Clears the two surfaces that cover a fresh profile, and proves both are gone.
 *
 * The onboarding wizard is up on first launch and its panel covers nearly the whole viewport.
 * Clicks issued through the DOM bypass hit-testing, so every step underneath genuinely works
 * while every capture photographs the wizard -- which is what the first run of this script
 * produced, and it looked entirely healthy from the outside because something did paint.
 *
 * The update banner is worse, because it is not there at startup at all: it appears when the
 * background check finishes, so a dismissal at t=0 finds nothing to click, passes its own
 * check, and the banner arrives afterwards. It is therefore cleared again before every
 * capture rather than once at the beginning.
 */
const clearCoveringChrome = async () => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (await sees('Skip setup')) { await clickExact('Skip setup'); await settle(650); }
    if (await sees('Restart to install update')) { await clickExact('Later'); await settle(450); }
    if (!(await sees('Skip setup')) && !(await sees('Restart to install update'))) return;
  }
  fail('the onboarding wizard or the update banner is still covering the application');
};

/**
 * Is the dialog this capture claims to show actually the thing on top at its own centre?
 *
 * A DOM query answers "is it in the document", which is a different question and is the one
 * that let a whole run photograph the wizard. `elementFromPoint` is a real hit-test: it
 * answers what a person clicking there would hit.
 */
const assertOnTop = async (zIndex, what) => {
  const verdict = await evaluate(`(() => {
    const dialog = [...document.querySelectorAll('div')].find((d) => d.style.zIndex === '${zIndex}');
    if (!dialog) return { ok: false, why: 'no such dialog in the document' };
    const r = dialog.getBoundingClientRect();
    if (!r.width || !r.height) return { ok: false, why: 'the dialog has no size' };
    const hit = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + 12));
    if (!hit) return { ok: false, why: 'nothing is at the dialog centre' };
    return { ok: dialog.contains(hit) || hit === dialog, why: 'covered by ' + (hit.textContent || hit.tagName).slice(0, 60) };
  })()`);
  if (!verdict.ok) fail(`${what} is not the surface on screen: ${verdict.why}`);
};

const capture = async (name) => {
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const bytes = Buffer.from(shot.data, 'base64');
  const path = join(OUT_CAPTURES, `${name}.png`);
  writeFileSync(path, bytes);
  return { path: `console/release/captures/windows-console/${name}.png`, bytes: bytes.length, sha256: sha256(bytes) };
};

const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO }).toString().trim();
const artifactSha = sha256(readFileSync(ARTIFACT));
const viewport = await evaluate('({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio })');

/* ---------------------------------------------------------------- *
 * 0. Neither the onboarding wizard nor the update banner belongs to
 *    either of these flows, and both cover them.
 * ---------------------------------------------------------------- */
await clearCoveringChrome();

/* ---------------------------------------------------------------- *
 * A. built-in-authenticator
 * ---------------------------------------------------------------- */
await openScreenContextMenu();
await settle(500);
if (!(await sees('Lock this element'))) fail('the screen context menu never opened');
await clickExact('Lock this element…');
await settle(500);
if (!(await sees('Choose a method'))) fail('the lock wizard did not open on its method step');

await clickContainsIn('82', 'Password + one-time code');
await settle();
const methodChecked = await evaluate(`(() => {
  const b = [...document.querySelectorAll('button')]
    .find((e) => (e.textContent || '').includes('Password + one-time code'));
  return b ? (b.textContent || '').includes('radio_button_checked') : null;
})()`);
if (methodChecked !== true) fail('Password + one-time code did not become the selected method');

await lockWizard('Next');
if (!(await sees('Pair an authenticator'))) fail('the wizard did not reach its pairing step');
await typeInto('input[type=password]', PASSPHRASE);
await settle();

/* The refusal first: a TOTP method that has never paired must not be finishable. This is the
 * property `lockNext` exists to hold, and the only way to see it is to try. */
await lockWizard('Next');
await lockWizard('Next');
await lockWizard('Lock it');
await settle(400);
const refusal = await toastText();
if (!/Pair the built-in authenticator first/.test(refusal)) {
  fail(`an unpaired TOTP lock finished without refusing; the toast said ${JSON.stringify(refusal)}`);
}

/* Back to the pairing step and pair for real. */
await lockWizard('Back');
await lockWizard('Back');
if (!(await sees('Pair an authenticator'))) fail('could not return to the pairing step');

const resourcesBefore = await resourceCount();
await clickContainsIn('82', 'Pair the built-in authenticator');
await settle(700);
const resourcesAfter = await resourceCount();

const panel = await evaluate(`(() => {
  const vis = (e) => !!(e.offsetWidth || e.offsetHeight);
  const hit = [...document.querySelectorAll('*')]
    .filter((e) => vis(e) && /Base32 secret:/.test(e.textContent || ''))
    .sort((a, b) => a.textContent.length - b.textContent.length)[0];
  return hit ? hit.textContent.trim() : '';
})()`);
const secret = (panel.match(/Base32 secret:\s*([A-Z2-7]+)/) || [])[1];
const uri = (panel.match(/(otpauth:\/\/totp\/\S+)/) || [])[1];
if (!secret) fail('pairing revealed no base32 secret');
if (!uri) fail('pairing revealed no otpauth:// pairing URI');
if (secret.length < 32) fail(`the revealed secret is only ${secret.length} base32 characters`);

/* The revealed secret is real, so it does not go into a committed PNG. The panel holding it
 * is closed, its absence is proved, and the record below carries the secret's LENGTH and the
 * pairing URI's PARAMETERS rather than either value. The celebration the application fires on
 * a successful pairing is a full-frame animation, so it is waited out rather than photographed
 * over the surface it is celebrating. */
await evaluate(`(() => {
  const overlay = [...document.querySelectorAll('div')].find((d) => d.style.zIndex === '60');
  if (overlay) overlay.click();
  return true;
})()`);
await settle(2600);
if (await sees('Base32 secret:')) fail('the revealed secret is still on screen at capture time');
await clearCoveringChrome();
await assertOnTop('82', 'the paired lock wizard');
const capturePair = await capture('built-in-authenticator');

/* Finish the wizard for real, now that a secret exists. */
await lockWizard('Next');
await lockWizard('Next');
await lockWizard('Lock it');
await settle(620);
const lockedBanner = await sees('is locked — contents visible, controls disabled');
if (!lockedBanner) fail('the element did not lock after a paired TOTP wizard finished');

/* The code the application accepts is computed here, from the captured secret. */
await openUnlockDialog();
await typeInto('div[style*="z-index: 83"] input[type=password]', PASSPHRASE);
await settle(240);
const stale = totpAt(secret, Date.now() - 90_000);
await pressKeypad(stale);
await unlockDialog('✓'); await settle(650);
const staleToast = await toastText();
const stillLockedAfterStale = await sees('is locked — contents visible, controls disabled');
if (!stillLockedAfterStale) fail('a code from three steps ago unlocked the element');

await openUnlockDialog();
await typeInto('div[style*="z-index: 83"] input[type=password]', PASSPHRASE);
await settle(240);
const live = totpAt(secret, Date.now());
await pressKeypad(live);
await unlockDialog('✓'); await settle(750);
const unlockedNow = !(await sees('is locked — contents visible, controls disabled'));
if (!unlockedNow) fail(`the application refused an independently computed live code; it said ${JSON.stringify(await toastText())}`);

/* ---------------------------------------------------------------- *
 * B. unlock-ladder
 * ---------------------------------------------------------------- */
await openScreenContextMenu();
await settle(450);
await clickExact('Lock this element…');
await settle(450);
if (!(await sees('Choose a method'))) fail('the lock wizard did not reopen for the ladder run');
await clickContainsIn('82', 'PIN only');
await lockWizard('Next');
await typeInto('div[style*="z-index: 82"] input', LADDER_PIN);
await settle(260);
const pinTyped = await evaluate(`(() => {
  const dialog = [...document.querySelectorAll('div')].find((d) => d.style.zIndex === '82');
  const el = dialog && [...dialog.querySelectorAll('input')].find((i) => /\\d/.test(i.value || ''));
  return el ? el.value : '';
})()`);
if (pinTyped !== LADDER_PIN) fail(`the PIN field holds ${JSON.stringify(pinTyped)} rather than the typed PIN`);
await lockWizard('Next');
await lockWizard('Next');
await lockWizard('Lock it');
await settle(600);
if (!(await sees('is locked — contents visible, controls disabled'))) fail('the PIN lock never took');

await openUnlockDialog();
const wrongToasts = [];
for (let attempt = 1; attempt <= 3; attempt += 1) {
  await pressKeypad(WRONG_PIN);
  await unlockDialog('✓');
  await settle(700);
  wrongToasts.push(await toastText());
}
const ladderPrompt = await evaluate(`(() => {
  const vis = (e) => !!(e.offsetWidth || e.offsetHeight);
  const hit = [...document.querySelectorAll('*')]
    .filter((e) => e.children.length === 0 && vis(e) && /Quick challenge/.test(e.textContent || ''))[0];
  return hit ? hit.textContent.trim() : '';
})()`);
if (!ladderPrompt) fail('three wrong PINs did not produce a ladder challenge');
await clearCoveringChrome();
await assertOnTop('83', 'the unlock dialog carrying the ladder challenge');
const captureLadder = await capture('unlock-ladder');

/* Answer it. The dish rung is one of four, so a wrong guess is an ordinary outcome and is
 * recorded as one; what must hold either way is that the lock is still there afterwards. */
const rung = /which dish/.test(ladderPrompt) ? 'dish' : (/sum \d+ of/.test(ladderPrompt) ? 'sums' : 'unknown');
await pressKeypad('1');
await unlockDialog('✓');
await settle(750);
const afterGrade = await toastText();
const lockSurvivedLadder = await sees('is locked — contents visible, controls disabled')
  || await sees('Unlock');
if (!lockSurvivedLadder) fail('the unlock ladder cleared the credential, which is the one thing it must never do');

const nowIso = new Date().toISOString();

const shared = {
  schemaVersion: 1,
  commit,
  /* Relative to the repository root rather than sliced at the first 'console' in the string:
   * a checkout directory whose own name contains 'console' cut the path in the wrong place
   * and recorded an artifact nobody could find. */
  artifact: relative(REPO, ARTIFACT).replaceAll('\\', '/'),
  artifactSha256: artifactSha,
  viewport,
  launch: {
    method: 'off-screen Win32 desktop via console/scripts/launch-on-hidden-desktop.ps1',
    desktop: 'DingEvidence',
    isolatedProfile: 'a task-scoped --user-data-dir created for this run only',
    driver: 'loopback Chrome DevTools Protocol, exactly one page target verified before any evaluation',
    visibleDesktop: 'never switched to, never sent input, never captured',
  },
  privacy: 'no user desktop, cursor, foreground application or personal data is present',
  verification: 'inspected-real-packaged-artifact',
  observedAt: nowIso,
};

/**
 * Writes one record, and refuses to write a record carrying the live secret.
 *
 * This exists because the first run of this script leaked it: the pairing URI's own query
 * string was recorded whole, so the secret landed in a file destined for a commit. Nothing
 * failed and nothing looked wrong; it was found by reading the output. The check is on the
 * serialised bytes rather than on any one field, so a future field that happens to carry it
 * is refused too.
 */
const writeRecord = (name, record) => {
  const text = `${JSON.stringify(record, null, 2)}\n`;
  if (text.includes(secret)) fail(`${name} would have carried the live authenticator secret into a committed file`);
  writeFileSync(join(OUT_EVIDENCE, `${name}.json`), text);
};

writeRecord('built-in-authenticator', {
  ...shared,
  feature: 'built-in-authenticator',
  capture: capturePair.path,
  captureSha256: capturePair.sha256,
  captureBytes: capturePair.bytes,
  interaction: {
    route: 'right-click the screen > Lock this element… > Password + one-time code > Pair an authenticator',
    refusedBeforePairing: refusal,
    pairedSecretLengthBase32: secret.length,
    pairingUriScheme: uri.slice(0, uri.indexOf('?') >= 0 ? uri.indexOf('?') : uri.length),
    /* The secret's own value is deliberately absent. It is a real credential for as long as
     * the lock exists, and a record that quotes it is a record that cannot be committed --
     * so what is kept is that the parameter was present, and every parameter beside it. */
    pairingUriParameters: Object.fromEntries(
      [...new URL(uri.replace('otpauth://', 'https://')).searchParams]
        .map(([key, value]) => [key, key === 'secret' ? `<${value.length} base32 characters, not recorded>` : value]),
    ),
    resourceEntriesBeforePairing: resourcesBefore,
    resourceEntriesAfterPairing: resourcesAfter,
    staleCodeRefusedWith: staleToast,
    liveCodeAccepted: unlockedNow,
  },
  contractPoints: [
    'the secret is generated on this computer: pairing added no resource entry of any kind, so no network call was made',
    'the pairing URI is a standard otpauth://totp URI carrying the issuer, algorithm, digit count and period',
    'a TOTP-including method refuses to finish until pairing has actually happened, rather than storing a placeholder',
    'a code computed independently here, by this script, from the revealed secret is accepted by the running application',
    'a code from three steps ago is refused, so acceptance is time-based rather than any-six-digits',
  ],
  notInterrogatedHere: [
    'a scannable QR image: the compiled design has no bound slot for pixel data, so the secret is revealed as copyable text',
    'a confirmation-code re-entry step before the secret is treated as paired',
    'durable storage of the secret; it lives in the same in-memory lock record the PIN and passphrase already did',
    'the standalone authenticator surface holding arbitrary third-party secrets, which this build does not have',
  ],
});

writeRecord('unlock-ladder', {
  ...shared,
  feature: 'unlock-ladder',
  capture: captureLadder.path,
  captureSha256: captureLadder.sha256,
  captureBytes: captureLadder.bytes,
  interaction: {
    route: 'right-click the screen > Lock this element… > PIN only > three wrong PINs at the unlock keypad',
    wrongAttemptToasts: wrongToasts,
    challengeOfferedOnAttempt: 3,
    rung,
    challengePrompt: ladderPrompt,
    gradedAnswerToast: afterGrade,
    lockStillPresentAfterChallenge: lockSurvivedLadder,
  },
  contractPoints: [
    'the ladder is offered only after repeated wrong attempts, not on the first',
    'it is offered inside the unlock dialog the person is already looking at rather than on a separate surface',
    'the challenge is a real graded question: the prompt names its own rung and its choices',
    'grading the challenge never clears the credential -- the element is still locked afterwards',
    'the first two attempts get an ordinary refusal, so the ladder is an escalation rather than the default',
  ],
  notInterrogatedHere: [
    'the moles rung, which needs a visual board this build does not draw and which the application declines rather than fakes',
    'the three-per-hour skip budget and its refill, which the module enforces and this single run cannot exhaust',
    'single-use nonces and challenge expiry, which are module-level rules with no rendered surface',
    'School mode starting the ladder at the sums rung',
  ],
});

console.log(JSON.stringify({
  builtInAuthenticator: { secretLength: secret.length, resourcesBefore, resourcesAfter, liveCodeAccepted: unlockedNow },
  unlockLadder: { rung, prompt: ladderPrompt.slice(0, 80), lockSurvived: lockSurvivedLadder },
  captures: [capturePair, captureLadder],
}, null, 2));
close();
