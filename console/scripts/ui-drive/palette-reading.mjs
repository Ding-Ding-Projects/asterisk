/**
 * One real reading of the command palette, taken from the packaged application.
 *
 * WHY THIS SURFACE. Twenty-five of the twenty-six committed built-interaction records under
 * `release/evidence/windows-console/` recorded `observedPanelControls: []`, and every one of
 * those twenty-five was driven the same way: open the command palette with Ctrl+Shift+F, type
 * a query, click a result. `docs/evidence/panel-observation.md` established that nothing in
 * this repository ever produced that field and repaired the reader. It did not establish what
 * the reader returns when it is pointed at the palette, and it could not: the repair pass
 * explicitly ran no application. This does, so the next pass drives twenty-five routes knowing
 * what a good reading looks like instead of discovering it twenty-five times.
 *
 * WHAT IT IS WRITTEN TO ESTABLISH, each one a thing a passing suite cannot say:
 *
 *   The chord works in the packaged build. Every one of those records says "opened the command
 *   palette with Ctrl+Shift+F" and nothing has ever proved that chord reaches the handler in a
 *   real window. It is sent here as a real key event through the input domain, never by calling
 *   the application's own toggle, which would only prove that a function agrees with itself.
 *
 *   The palette carries the dialog role, and the count is read either side of opening it. The
 *   claim this replaces -- that no element in this renderer carries that role, so a dialog-role
 *   count "can only ever be zero" -- was asserted in the harness header, in the evidence
 *   document, and in a test whose needle was the JSX spelling while the palette card is
 *   hyperscript. It was false, and false specifically about this surface.
 *
 *   The reader finds the palette through its SCRIM. `.palette-card` is neither positioned nor
 *   z-indexed, so it is never a candidate; `.palette-scrim` is `position: fixed; z-index: 1000`
 *   and wraps the card rather than sitting beside it. That makes the reading honest and coarse
 *   at once: the controls found are the card's, the rectangle reported is the whole viewport,
 *   and a palette therefore can never read as anchored to anything. All three are recorded.
 *
 *   The moment those twenty-five readings were taken has no panel in it. Activating a result
 *   closes the palette before it teleports, so a reading taken after the click sees whatever is
 *   left. The last phase takes exactly that reading, so the record says what the empty lists
 *   were a reading OF rather than merely that they were empty.
 *
 * Isolation is proven before anything is evaluated: `connect()` refuses unless the debugging
 * endpoint offers exactly one page target. The application must already be running on an
 * off-screen desktop under a throwaway profile; `scripts/launch-on-hidden-desktop.ps1` puts it
 * there. Nothing here touches the visible desktop, the cursor or the foreground window.
 *
 * Usage:
 *   node scripts/ui-drive/palette-reading.mjs <port> <artifact-exe> [query]
 */
import { connect } from './cdp.mjs';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, join, relative } from 'node:path';
import { CLICKABLE_SELECTOR, CONTROL_READING_SOURCE, OVERLAY_COUNT_SOURCE, observePanel, readControlLabel } from './observe-panel.mjs';

const PORT = Number(process.argv[2] || 9731);
const ARTIFACT = process.argv[3];
/* `language` is not an arbitrary example: it is the exact query `language-modes.json` records,
 * so this reading is of the same route one of the twenty-five empty records was taken on. */
const QUERY = process.argv[4] || 'language';
if (!ARTIFACT) throw new Error('palette-reading: an absolute path to the packaged executable is required');

const REPO = resolve(import.meta.dirname, '..', '..', '..');
const OUT_EVIDENCE = resolve(REPO, 'console/release/evidence/ui-drive');
const OUT_CAPTURES = resolve(REPO, 'console/release/captures/ui-drive');
mkdirSync(OUT_EVIDENCE, { recursive: true });
mkdirSync(OUT_CAPTURES, { recursive: true });

const settle = (ms = 420) => new Promise((r) => setTimeout(r, ms));
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const { send, evaluate, close } = await connect(PORT);
const fail = (why) => { console.error('REFUSING: ' + why); close(); process.exit(2); };

/* Read the dialog-role count the same way the retired reading did, so the number this records
 * is the number that reading would have produced rather than a differently-shaped one. */
const DIALOG_ROLE_COUNT = `document.querySelectorAll('[role=dialog]').length`;

const STATE = `(() => ({
  elements: document.querySelectorAll('*').length,
  inputs: document.querySelectorAll('input, select, textarea').length,
  overlays: ${OVERLAY_COUNT_SOURCE},
  dialogRoleElements: ${DIALOG_ROLE_COUNT},
  heading: ((document.querySelector('h1, h2, h3') || {}).textContent || '').trim().slice(0, 60),
  onboardingVisible: [...document.querySelectorAll('button')].some((b) => (b.textContent || '').trim() === 'Skip setup'),
  /* Recorded rather than assumed away. 'Later' is clicked below, and the banner comes back on
   * its own once the background check moves on to downloading -- so a capture from this run
   * carries it, and a record claiming it was dismissed would be describing a different
   * picture. It sits in its own strip above the title bar and covers no part of the palette. */
  updateBanner: ((document.querySelector('.update-banner') || {}).textContent || '').trim().slice(0, 80),
}))()`;

/* Where focus ended up. A palette result is supposed to open the destination AND reveal and
 * focus the exact control, so the control's own id is the reading that separates "landed on
 * the right screen" from "teleported", and no screenshot states it outright. */
const FOCUS = `(() => {
  const el = document.activeElement;
  if (!el || el === document.body) return { focused: null };
  const row = el.closest ? el.closest('[data-ctl]') : null;
  return {
    focused: el.tagName.toLowerCase(),
    focusedControlId: row ? row.getAttribute('data-ctl') : null,
    focusedName: ((el.getAttribute && el.getAttribute('aria-label')) || (el.textContent || '')).trim().slice(0, 60),
  };
})()`;

const namedClickables = async () => (await evaluate(`(() => {
  const read = ${CONTROL_READING_SOURCE};
  return [...document.querySelectorAll(${JSON.stringify(CLICKABLE_SELECTOR)})]
    .map((e, index) => Object.assign({ index, visible: !!(e.offsetWidth || e.offsetHeight) }, read(e)));
})()`)).map((reading) => Object.assign({}, reading, readControlLabel(reading)))
  .filter((c) => c.visible && !c.disabled && c.label.length > 1);

const clickByText = async (text) => {
  const match = (await namedClickables()).find((c) => c.label.slice(0, 56) === text);
  if (!match) return { ok: false, why: 'not present on this screen' };
  return evaluate(`(() => {
    const el = [...document.querySelectorAll(${JSON.stringify(CLICKABLE_SELECTOR)})][${match.index}];
    if (!el || !(el.offsetWidth || el.offsetHeight) || el.disabled) return { ok: false, why: 'the control moved between being read and being clicked' };
    el.click();
    return { ok: true };
  })()`);
};

/* --- clear the two surfaces that belong to no flow ------------------------------------ *
 * A fresh profile opens on an onboarding wizard covering almost the whole viewport, and the
 * update banner arrives late, after its own background check, so it cannot be dismissed once
 * at startup. Both are dismissed and their absence is proved rather than assumed. */
await clickByText('Skip setup');
await settle(700);
if ((await evaluate(STATE)).onboardingVisible) {
  await clickByText('Skip setup');
  await settle(900);
}
if ((await evaluate(STATE)).onboardingVisible) fail('the onboarding wizard is still up');
await clickByText('Later');
await settle(400);

/* --- phase 1: before the palette ------------------------------------------------------ */
const before = await evaluate(STATE);
const panelBefore = await observePanel(evaluate);

/* --- phase 2: the real chord ---------------------------------------------------------- *
 * CTRL (2) | SHIFT (8) = 10. `rawKeyDown` rather than `keyDown` because a modified key
 * generates no character, and the handler reads `event.key` from the raw event. */
const CTRL_SHIFT = 2 | 8;
const chord = async (type) => send('Input.dispatchKeyEvent', {
  type, modifiers: CTRL_SHIFT, key: 'F', code: 'KeyF', windowsVirtualKeyCode: 70, nativeVirtualKeyCode: 70,
});
await chord('rawKeyDown');
await chord('keyUp');
await settle(500);

const opened = await evaluate(STATE);
const paletteUp = await evaluate(`!!document.querySelector('.palette-card')`);
if (!paletteUp) fail('Ctrl+Shift+F did not open the command palette in the packaged application');
const panelOpened = await observePanel(evaluate);

/* --- phase 3: a real query, typed --------------------------------------------------- *
 * `Input.insertText` rather than assigning `.value`: the field is a controlled React input
 * reading `event.target.value`, and an assignment sets the property without producing the
 * event, so the component would never see it and the list would never filter. */
await evaluate(`(() => { const f = document.querySelector('.palette-field'); if (f) f.focus(); return !!f; })()`);
await send('Input.insertText', { text: QUERY });
await settle(420);

const typed = await evaluate(`(() => {
  const field = document.querySelector('.palette-field');
  const hint = document.querySelector('.palette-hint');
  const rows = [...document.querySelectorAll('.palette-row')];
  return {
    fieldValue: field ? field.value : null,
    hint: hint ? (hint.textContent || '').trim() : null,
    rowCount: rows.length,
    firstRowLabel: rows.length ? ((rows[0].querySelector('.palette-label') || {}).textContent || '').trim() : null,
    firstRowContext: rows.length ? ((rows[0].querySelector('.palette-context') || {}).textContent || '').trim() : null,
  };
})()`);
if (typed.fieldValue !== QUERY) fail(`the palette field holds ${JSON.stringify(typed.fieldValue)} rather than the typed query`);
if (typed.rowCount === 0) fail(`the palette matched nothing for ${JSON.stringify(QUERY)}, so there is no result to activate`);

const panelFiltered = await observePanel(evaluate);
const filteredState = await evaluate(STATE);

const shoot = async (name) => {
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  const bytes = Buffer.from(data, 'base64');
  const file = join(OUT_CAPTURES, `${name}.png`);
  writeFileSync(file, bytes);
  return { capture: relative(REPO, file).split('\\').join('/'), captureSha256: sha256(bytes), captureBytes: bytes.length };
};
const paletteCapture = await shoot('palette-open-filtered');

/* --- phase 4: activating a result, which is where the twenty-five readings were taken -- */
await evaluate(`(() => { const r = document.querySelector('.palette-row'); if (r) r.click(); return !!r; })()`);
await settle(700);
const after = await evaluate(STATE);
const panelAfter = await observePanel(evaluate);
const focusAfter = await evaluate(FOCUS);
const afterCapture = await shoot('palette-after-activation');

const artifactBytes = readFileSync(ARTIFACT);
const record = {
  schemaVersion: 1,
  reading: 'command-palette',
  /* The commit the ARTIFACT was built from, which is what every record in this repository
   * means by the field, and never the commit this record lands in -- a record cannot carry
   * its own future SHA. `harnessUncommitted` says outright whether the driving code that
   * produced this had itself been committed yet, so the two cannot be quietly conflated. */
  commit: execFileSync('git', ['-C', REPO, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  harnessUncommitted: execFileSync(
    'git', ['-C', REPO, 'status', '--porcelain', '--', 'console/scripts/ui-drive'], { encoding: 'utf8' },
  ).trim().length > 0,
  artifact: relative(REPO, ARTIFACT).split('\\').join('/'),
  artifactSha256: sha256(artifactBytes),
  verification: 'inspected-real-packaged-artifact',
  launch: {
    method: 'Lowlevel hidden Windows desktop',
    isolatedProfile: 'a task-scoped --user-data-dir created for this run only',
    driver: 'loopback Chrome DevTools Protocol, exactly one page target verified before any evaluation',
  },
  query: QUERY,
  phases: {
    beforeChord: { state: before, panel: panelBefore },
    chordOpened: {
      state: opened,
      panel: panelOpened,
      chord: 'Ctrl+Shift+F dispatched as a real key event, not by calling the application toggle',
    },
    queryTyped: { state: filteredState, panel: panelFiltered, typed },
    resultActivated: { state: after, panel: panelAfter, focus: focusAfter },
  },
  captures: { paletteOpen: paletteCapture, afterActivation: afterCapture },
};
const path = join(OUT_EVIDENCE, 'command-palette-reading.json');
writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`);

console.log(`dialogRoleElements before=${before.dialogRoleElements} opened=${opened.dialogRoleElements} after=${after.dialogRoleElements}`);
console.log(`panelFound before=${panelBefore.panelFound} opened=${panelOpened.panelFound} filtered=${panelFiltered.panelFound} after=${panelAfter.panelFound}`);
console.log(`observedPanelControls filtered=${panelFiltered.observedPanelControls.length} after=${panelAfter.observedPanelControls.length}`);
console.log(`hint=${JSON.stringify(typed.hint)} firstRow=${JSON.stringify(typed.firstRowLabel)}`);
console.log(`landedOn=${JSON.stringify(after.heading)} focusedControlId=${JSON.stringify(focusAfter.focusedControlId)}`);
console.log(`updateBanner=${JSON.stringify(after.updateBanner)}`);
console.log(`wrote ${relative(REPO, path).split('\\').join('/')}`);
close();
