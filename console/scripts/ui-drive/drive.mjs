/**
 * Deep UI drive, third attempt, with the two things the first two got wrong.
 *
 * The first was breadth-only: it recomputed the clickable list each step, so once a click
 * navigated the indices pointed at a different screen.
 *
 * The second is the expensive one and is why this exists. A fresh profile opens on an
 * onboarding wizard whose panel covers 1440x879 of a 1440x922 viewport. Clicks issued
 * through the DOM bypass hit-testing, so navigation genuinely worked underneath while
 * every capture photographed the wizard. Both the debugging protocol and native window
 * capture agreed on those pixels, so nothing about the capture path looked wrong -- and a
 * check for "did anything paint" passes perfectly, because something did. It was simply
 * not the thing the filename claimed.
 *
 * So: dismiss the wizard and PROVE it is gone before capturing anything, and record the
 * visible heading beside every capture so a picture can be checked against its own claim.
 */
import { connect } from './cdp.mjs';
import { createHash } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

/* Port and output directory are arguments so a repeated drive gets a fresh window and a
 * fresh directory each pass. Driving an instance that has already had a thousand clicks
 * put through it proves nothing: it is no longer the application, it is the wreckage. */
const PORT = Number(process.argv[2] || 9555);
const OUT = process.argv[3] || 'C:/Users/cntow/AppData/Local/Temp/dingdrive/clean';
mkdirSync(join(OUT, 'shots'), { recursive: true });
const { send, evaluate, close } = await connect(PORT);
const settle = (ms = 360) => new Promise((r) => setTimeout(r, ms));

const clickByText = (text) => evaluate(`(() => {
  const wanted = ${JSON.stringify(text)};
  const el = [...document.querySelectorAll('button, [role=tab], input[type=checkbox], select, a[href]')]
    .find((e) => ((e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 56)) === wanted
      && (e.offsetWidth || e.offsetHeight) && !e.disabled);
  if (!el) return { ok: false, why: 'not present on this screen' };
  el.click();
  return { ok: true };
})()`);

/* The wizard is identified by its own Skip control, not by a full-viewport element:
 * `.attn-content` is the application's own content wrapper and legitimately fills the
 * screen, so treating size as the signal refuses to drive a perfectly healthy app. */
const onboarding = () => evaluate(`(() => {
  const skip = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Skip setup');
  const heading = ((document.querySelector('h1, h2, h3') || {}).textContent || '').trim();
  return { present: !!skip, heading: heading.slice(0, 60) };
})()`);

/* Dismiss, then verify. An unverified dismissal is what produced 873 pictures of a wizard. */
await clickByText('Skip setup');
await settle(700);
let wizard = await onboarding();
if (wizard.present) { await clickByText('Skip setup'); await settle(900); wizard = await onboarding(); }
if (wizard.present) {
  console.log('REFUSING TO DRIVE: the onboarding wizard is still up');
  close();
  process.exit(2);
}
/* The update banner overlays every capture and belongs to no flow. */
await clickByText('Later');
await settle(400);
console.log('onboarding clear; showing: ' + JSON.stringify(wizard));

const STATE = `(() => ({
  elements: document.querySelectorAll('*').length,
  inputs: document.querySelectorAll('input, select, textarea').length,
  dialogs: document.querySelectorAll('[role=dialog]').length,
  heading: ((document.querySelector('h1, h2, h3') || {}).textContent || '').trim().slice(0, 60),
  onboardingVisible: [...document.querySelectorAll('button')].some((b) => (b.textContent || '').trim() === 'Skip setup'),
}))()`;

const CONTROLS = `(() => [...document.querySelectorAll('button, [role=tab], input[type=checkbox], select, a[href]')]
  .map((e) => ({ name: (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 56),
                 visible: !!(e.offsetWidth || e.offsetHeight), disabled: !!e.disabled }))
  .filter((e) => e.visible && !e.disabled && e.name.length > 1))()`;

let shot = 0;
const pad = (n) => String(n).padStart(4, '0');
const safe = (s) => s.replace(/[^a-zA-Z0-9]+/g, '-').slice(0, 44) || 'x';
const shoot = async (label) => {
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  const bytes = Buffer.from(data, 'base64');
  const file = join(OUT, 'shots', `${pad(shot++)}-${safe(label)}.png`);
  writeFileSync(file, bytes);
  return { file: file.split(/[\/]/).pop(), sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length };
};

const rails = await evaluate(CONTROLS);
const destinations = [...new Set(rails.map((r) => r.name))];
const ledger = [];
let contaminated = 0;

for (const destination of destinations) {
  if (shot > 700) break;
  const entered = await clickByText(destination);
  if (!entered.ok) { ledger.push({ destination, skipped: entered.why }); continue; }
  await settle();
  const state = await evaluate(STATE);
  if (state.onboardingVisible) { contaminated += 1; ledger.push({ destination, skipped: 'the onboarding panel reappeared; refused to capture' }); continue; }
  ledger.push({ destination, action: 'enter', after: state, capture: await shoot(`enter-${destination}`) });

  const controls = (await evaluate(CONTROLS)).map((c) => c.name).filter((n) => n !== destination).slice(0, 10);
  for (const name of controls) {
    if (shot > 700) break;
    const before = await evaluate(STATE);
    const clicked = await clickByText(name);
    if (!clicked.ok) { ledger.push({ destination, control: name, skipped: clicked.why }); continue; }
    await settle(280);
    const after = await evaluate(STATE);
    if (after.onboardingVisible) { contaminated += 1; ledger.push({ destination, control: name, skipped: 'the onboarding panel reappeared; refused to capture' }); continue; }
    ledger.push({
      destination, control: name, before, after,
      changed: before.elements !== after.elements || before.inputs !== after.inputs || before.dialogs !== after.dialogs || before.heading !== after.heading,
      capture: await shoot(`${destination}--${name}`),
    });
    await clickByText(destination);
    await settle(200);
  }
}

writeFileSync(join(OUT, 'ledger.json'), JSON.stringify({
  generatedAt: new Date().toISOString(),
  artifact: 'console/dist built renderer under Electron on an off-screen Windows desktop',
  driver: 'loopback Chrome DevTools Protocol, exactly one page target verified before any evaluation',
  onboardingDismissedBeforeCapture: true,
  capturesRefusedBecauseTheOnboardingPanelReappeared: contaminated,
  destinations: destinations.length,
  steps: ledger.length,
  captures: shot,
  changedCount: ledger.filter((e) => e.changed).length,
  ledger,
}, null, 2));
console.log(`destinations=${destinations.length} steps=${ledger.length} captures=${shot} changed=${ledger.filter((e) => e.changed).length} refused=${contaminated}`);
close();
