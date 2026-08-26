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
 *
 * The third thing, found later and cheaper to state than it was to find. Every control name
 * this driver recorded carried a Material Symbols ligature glued to the front of it -- the
 * regex builder's first tool button reads `backspaceDelete last` -- because it read raw
 * `textContent`, and its accessible-name lookup returned null on every control because the
 * compiled shell declares none. Its `dialogs` reading counted elements carrying the dialog
 * role, which this application renders nowhere, so that number was zero on every screen
 * whether a panel was open or not, and the refusal built on it never fired. Both readings
 * now come from `observe-panel.mjs`, which is one committed reader rather than a per-script
 * paste, and every click records what the panel it opened actually offered.
 */
import { connect } from './cdp.mjs';
import { createHash } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  CLICKABLE_SELECTOR, CONTROL_READING_SOURCE, OVERLAY_COUNT_SOURCE,
  observePanel, readControlLabel,
} from './observe-panel.mjs';

/* Port and output directory are arguments so a repeated drive gets a fresh window and a
 * fresh directory each pass. Driving an instance that has already had a thousand clicks
 * put through it proves nothing: it is no longer the application, it is the wreckage. */
const PORT = Number(process.argv[2] || 9555);
const OUT = process.argv[3] || 'C:/Users/cntow/AppData/Local/Temp/dingdrive/clean';
mkdirSync(join(OUT, 'shots'), { recursive: true });
const { send, evaluate, close } = await connect(PORT);
const settle = (ms = 360) => new Promise((r) => setTimeout(r, ms));

/* Read every clickable control's raw readings, keeping the index each one sits at so a
 * click can name the same element the reading came from. The readings come back plain and
 * the naming decision happens in Node, in `readControlLabel`, so one function decides what
 * a control is called for both the driver and the evidence record. */
const readClickables = () => evaluate(`(() => {
  const read = ${CONTROL_READING_SOURCE};
  return [...document.querySelectorAll(${JSON.stringify(CLICKABLE_SELECTOR)})]
    .map((e, index) => Object.assign({ index, visible: !!(e.offsetWidth || e.offsetHeight) }, read(e)));
})()`);

const namedClickables = async () => (await readClickables())
  .map((reading) => Object.assign({}, reading, readControlLabel(reading)))
  .filter((c) => c.visible && !c.disabled && c.label.length > 1);

const clickByText = async (text) => {
  const match = (await namedClickables()).find((c) => c.label.slice(0, 56) === text);
  if (!match) return { ok: false, why: 'not present on this screen' };
  /* Re-resolve by the same index against the same selector. A control that moved between
   * the reading and the click is reported as having moved, never clicked blind. */
  return evaluate(`(() => {
    const el = [...document.querySelectorAll(${JSON.stringify(CLICKABLE_SELECTOR)})][${match.index}];
    if (!el || !(el.offsetWidth || el.offsetHeight) || el.disabled) {
      return { ok: false, why: 'the control moved between being read and being clicked' };
    }
    el.click();
    return { ok: true };
  })()`);
};

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

/* `overlays` replaces a dialog-role count that was structurally always zero here. */
const STATE = `(() => ({
  elements: document.querySelectorAll('*').length,
  inputs: document.querySelectorAll('input, select, textarea').length,
  overlays: ${OVERLAY_COUNT_SOURCE},
  heading: ((document.querySelector('h1, h2, h3') || {}).textContent || '').trim().slice(0, 60),
  onboardingVisible: [...document.querySelectorAll('button')].some((b) => (b.textContent || '').trim() === 'Skip setup'),
}))()`;

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

const rails = await namedClickables();
const destinations = [...new Set(rails.map((r) => r.label.slice(0, 56)))];
if (destinations.length === 0) {
  /* A naming change that empties this list would otherwise report a clean run of nothing,
   * which is the shape of vacuous pass this repository keeps paying for. */
  console.log('REFUSING TO DRIVE: no named control was found, so the label reader matched nothing');
  close();
  process.exit(3);
}
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

  const controls = (await namedClickables()).map((c) => c.label.slice(0, 56)).filter((n) => n !== destination).slice(0, 10);
  for (const name of controls) {
    if (shot > 700) break;
    const before = await evaluate(STATE);
    const clicked = await clickByText(name);
    if (!clicked.ok) { ledger.push({ destination, control: name, skipped: clicked.why }); continue; }
    await settle(280);
    const after = await evaluate(STATE);
    if (after.onboardingVisible) { contaminated += 1; ledger.push({ destination, control: name, skipped: 'the onboarding panel reappeared; refused to capture' }); continue; }
    /* What the click actually opened, read from the page rather than asserted. This is the
     * reading twenty-five committed records left empty because nothing produced it. */
    const panel = await observePanel(evaluate);
    ledger.push({
      destination, control: name, before, after, panel,
      changed: before.elements !== after.elements || before.inputs !== after.inputs
        || before.overlays !== after.overlays || before.heading !== after.heading,
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
  panelsObserved: ledger.filter((e) => e.panel && e.panel.panelFound).length,
  panelControlsRead: ledger.reduce((n, e) => n + (e.panel ? e.panel.observedPanelControls.length : 0), 0),
  ledger,
}, null, 2));
const panels = ledger.filter((e) => e.panel && e.panel.panelFound).length;
console.log(`destinations=${destinations.length} steps=${ledger.length} captures=${shot} `
  + `changed=${ledger.filter((e) => e.changed).length} panels=${panels} refused=${contaminated}`);
close();
