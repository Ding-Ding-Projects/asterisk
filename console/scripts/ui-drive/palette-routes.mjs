/**
 * Every command-palette route the built-interaction records claim, driven and read.
 *
 * WHAT THIS IS FOR. Twenty-five of the twenty-six records under `release/evidence/windows-console/`
 * that carry `observedPanelControls` recorded an empty list, and `docs/evidence/panel-observation.md`
 * established two separate reasons for that: nothing in this repository ever produced the field,
 * and every one of the twenty-five readings was taken at a moment with no panel in it, because
 * activating a palette result closes the palette before it teleports. The previous pass repaired
 * the reader and drove exactly one of the twenty-five, which settled what a good reading looks
 * like and settled nothing about the other twenty-four. This drives all twenty-five, at both of
 * the moments that pass identified: with the palette up and filtered, and again once whatever the
 * result teleports to has opened.
 *
 * WHAT EACH ROUTE ESTABLISHES, none of which a passing suite can say:
 *
 *   The chord opens the palette on the screen the previous route left behind. Every route is
 *   entered from wherever the last one landed, which is how a person uses it and is not how any
 *   unit test exercises it. `startedOn` records that screen, so a route that only works from the
 *   dashboard is visible as such rather than averaged away.
 *
 *   The query filters to real, named results. The palette's own hint is read verbatim -- `7 of
 *   883` -- so a list that rendered unfiltered is distinguishable from one that matched.
 *
 *   The result the record names is either there or it is not, and the reading says which. Three of
 *   the twenty-five name their target in prose rather than as a row label, so an exact match is
 *   the wrong thing to force: the driver reports `expectedTargetPresent: false` and names the row
 *   it activated instead. A substitution recorded as a match would be worth less than no reading.
 *
 *   Activating teleports rather than landing nearby. `focusedControlId` is the exact control the
 *   application focused, which no screenshot states outright.
 *
 *   And the second reading is taken where the twenty-five were taken. It is expected to find no
 *   panel, because a settings screen is a page rather than an overlay -- and recording
 *   `panelFound: false` with its reason is the same fact the empty lists were stating, said so it
 *   cannot be mistaken for a panel that offered nothing.
 *
 * Isolation is proven before anything is evaluated: `connect()` refuses unless the debugging
 * endpoint offers exactly one page target. The application must already be running on an
 * off-screen desktop under a throwaway profile; `scripts/launch-on-hidden-desktop.ps1` puts it
 * there. Nothing here touches the visible desktop, the cursor or the foreground window.
 *
 * The reading is separated from the judging on purpose. This file OBSERVES: which controls the
 * panel held, which row was activated, which control ended up focused. Whether a route should
 * have focused a control at all depends on whether the row it activated is a destination or a
 * setting, which the rendered row cannot say -- so `scripts/palette-route-readings.mjs` decides
 * that against the compiled palette, and this driver never guesses at it.
 *
 * Usage:
 *   node scripts/ui-drive/palette-routes.mjs --capture <port> <artifact-exe>
 *
 * Checked by:
 *   npx tsx scripts/palette-route-readings.mjs --check
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { CLICKABLE_SELECTOR, CONTROL_READING_SOURCE, observePanel, readControlLabel } from './observe-panel.mjs';
import { deriveRoutes, reconcile, recountSummary } from './palette-route-table.mjs';
import { readRecords, READINGS_PATH, CAPTURES_DIR, REPO, posix, sha256 } from './palette-route-paths.mjs';

const OUT_EVIDENCE = resolve(REPO, 'console/release/evidence/ui-drive');

const PORT = Number(process.argv[3] || 9742);
const ARTIFACT = process.argv[4];
if (!process.argv.includes('--capture') || !ARTIFACT) {
  console.error('usage: palette-routes.mjs --capture <port> <artifact-exe>');
  process.exit(2);
}

const { connect } = await import('./cdp.mjs');
const { send, evaluate, close } = await connect(PORT);
const settle = (ms = 420) => new Promise((r) => setTimeout(r, ms));
const fail = (why) => { console.error('REFUSING: ' + why); close(); process.exit(2); };

mkdirSync(OUT_EVIDENCE, { recursive: true });
mkdirSync(CAPTURES_DIR, { recursive: true });

const { routes, excluded } = deriveRoutes(readRecords());

const STATE = `(() => ({
  elements: document.querySelectorAll('*').length,
  heading: ((document.querySelector('h1, h2, h3') || {}).textContent || '').trim().slice(0, 60),
  onboardingVisible: [...document.querySelectorAll('button')].some((b) => (b.textContent || '').trim() === 'Skip setup'),
  /* Recorded at every phase rather than dismissed in prose. The banner arrives after its own
   * background check, comes back on its own as that check moves on, and sits in a strip above
   * the title bar; a record claiming a clear screen while its picture shows one is describing
   * a different picture. */
  updateBanner: ((document.querySelector('.update-banner') || {}).textContent || '').trim().slice(0, 80),
  paletteUp: !!document.querySelector('.palette-card'),
}))()`;

const FOCUS = `(() => {
  const el = document.activeElement;
  if (!el || el === document.body) return { focused: null, focusedControlId: null, focusedName: '' };
  const row = el.closest ? el.closest('[data-ctl]') : null;
  return {
    focused: el.tagName.toLowerCase(),
    focusedControlId: row ? row.getAttribute('data-ctl') : null,
    focusedName: ((el.getAttribute && el.getAttribute('aria-label')) || (el.textContent || '')).trim().slice(0, 60),
  };
})()`;

/** The palette's own rows, label and context kept apart as the markup keeps them. */
const ROWS = `(() => {
  const rows = [...document.querySelectorAll('.palette-row')];
  const hint = document.querySelector('.palette-hint');
  const field = document.querySelector('.palette-field');
  return {
    fieldValue: field ? field.value : null,
    hint: hint ? (hint.textContent || '').trim() : null,
    rowCount: rows.length,
    rows: rows.slice(0, 12).map((r) => ({
      label: ((r.querySelector('.palette-label') || {}).textContent || '').trim(),
      context: ((r.querySelector('.palette-context') || {}).textContent || '').trim(),
    })),
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
  if (!match) return false;
  return evaluate(`(() => {
    const el = [...document.querySelectorAll(${JSON.stringify(CLICKABLE_SELECTOR)})][${match.index}];
    if (!el || !(el.offsetWidth || el.offsetHeight) || el.disabled) return false;
    el.click();
    return true;
  })()`);
};

/* A real key event through the input domain, never the application's own toggle -- calling that
 * would only prove a function agrees with itself. `rawKeyDown` because a modified key generates
 * no character and the handler reads `event.key` off the raw event. */
const key = async (name, code, vk, modifiers = 0) => {
  for (const type of ['rawKeyDown', 'keyUp']) {
    await send('Input.dispatchKeyEvent', { type, modifiers, key: name, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
  }
};
const CTRL_SHIFT = 2 | 8;
const openPalette = () => key('F', 'KeyF', 70, CTRL_SHIFT);
const pressEscape = () => key('Escape', 'Escape', 27);

const shoot = async (name) => {
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  const bytes = Buffer.from(data, 'base64');
  const file = join(CAPTURES_DIR, `${name}.png`);
  writeFileSync(file, bytes);
  return { path: posix(relative(REPO, file)), sha256: sha256(bytes), bytes: bytes.length };
};

/* --- clear the two surfaces that belong to no flow ------------------------------------- */
await clickByText('Skip setup');
await settle(800);
if ((await evaluate(STATE)).onboardingVisible) { await clickByText('Skip setup'); await settle(900); }
if ((await evaluate(STATE)).onboardingVisible) fail('the onboarding wizard is still up');
await clickByText('Later');
await settle(400);

const routeReadings = [];
for (const route of routes) {
  /* Whatever the previous route left open is closed first, and the palette's absence is proved
   * rather than assumed -- a chord sent while the palette is already up would close it, and the
   * reading would then be of a screen rather than of a palette. */
  await pressEscape();
  await settle(320);
  if ((await evaluate(STATE)).paletteUp) { await pressEscape(); await settle(400); }
  const startState = await evaluate(STATE);
  if (startState.paletteUp) fail(`${route.feature}: the palette is still up before its own chord was sent`);

  await openPalette();
  await settle(480);
  const openedState = await evaluate(STATE);
  if (!openedState.paletteUp) fail(`${route.feature}: Ctrl+Shift+F did not open the command palette`);

  /* The field is a controlled React input reading `event.target.value`, so the query is typed
   * through the input domain; assigning `.value` sets the property without producing the event
   * and the list would never filter -- a difference invisible in a finished screenshot. */
  await evaluate(`(() => { const f = document.querySelector('.palette-field'); if (f) f.focus(); return !!f; })()`);
  const prefilled = (await evaluate(ROWS)).fieldValue;
  if (typeof prefilled === 'string' && prefilled.length > 0) {
    await key('a', 'KeyA', 65, 2);
  }
  await send('Input.insertText', { text: route.query });
  await settle(420);

  const typed = await evaluate(ROWS);
  if (typed.fieldValue !== route.query) {
    fail(`${route.feature}: the palette field holds ${JSON.stringify(typed.fieldValue)} rather than the typed query`);
  }
  const paletteUp = await observePanel(evaluate);
  const filteredState = await evaluate(STATE);
  const paletteCapture = await shoot(`${route.feature}-palette`);

  const matchingRows = typed.rows.filter((row) => row.label === route.expectedTarget);
  const expectedTargetPresent = matchingRows.length > 0;
  const activated = await evaluate(`(() => {
    const rows = [...document.querySelectorAll('.palette-row')];
    const read = (r) => ({
      label: ((r.querySelector('.palette-label') || {}).textContent || '').trim(),
      context: ((r.querySelector('.palette-context') || {}).textContent || '').trim(),
    });
    const row = rows.find((r) => read(r).label === ${JSON.stringify(route.expectedTarget)}) || rows[0] || null;
    if (!row) return { activated: false, label: null, context: null };
    const chosen = read(row);
    row.click();
    return { activated: true, label: chosen.label, context: chosen.context };
  })()`);
  await settle(760);

  const afterState = await evaluate(STATE);
  const afterPanel = await observePanel(evaluate);
  const focus = await evaluate(FOCUS);
  const afterCapture = await shoot(`${route.feature}-after`);

  routeReadings.push({
    feature: route.feature,
    query: route.query,
    expectedTarget: route.expectedTarget,
    recordedRoute: route.recordedRoute,
    recordedControlCount: route.recordedControlCount,
    startedOn: { heading: startState.heading, elements: startState.elements },
    chord: {
      sentAs: 'Ctrl+Shift+F dispatched as a real key event, not by calling the application toggle',
      paletteOpened: openedState.paletteUp,
      fieldWasPrefilled: typeof prefilled === 'string' && prefilled.length > 0,
    },
    paletteUp: {
      ...paletteUp,
      hint: typed.hint,
      rowCount: typed.rowCount,
      rows: typed.rows,
      elements: filteredState.elements,
      updateBanner: filteredState.updateBanner,
    },
    activation: {
      expectedTargetPresent,
      /* How many rows carry that exact label. Recorded because it is not always one: `display
       * name` returns two rows both labelled `Display name`, separated only by their context --
       * one on `Endpoints - Identity` and one on `Customise everything - Identity`. A record
       * whose prose says it "clicked the 'Display name' result" therefore does not identify
       * which result, and a driver matching on the label alone takes whichever the palette
       * ranked first. That is a finding about the record and about the palette, not a defect in
       * the reading, so it is reported rather than resolved by a rule nobody argued for. */
      expectedTargetRowsMatching: matchingRows.length,
      expectedTargetAmbiguous: matchingRows.length > 1,
      expectedTargetContexts: matchingRows.map((row) => row.context),
      activatedRowLabel: activated.label,
      activatedRowContext: activated.context,
      /* Named rather than silently substituted. Three of the twenty-five records describe their
       * target in prose instead of quoting a row label, and a reading that reported those as
       * matches would be worth less than no reading at all. */
      choice: expectedTargetPresent ? 'the row the record names' : 'the first matching row, because the record names its target in prose',
    },
    afterActivation: {
      heading: afterState.heading,
      elements: afterState.elements,
      paletteStillUp: afterState.paletteUp,
      updateBanner: afterState.updateBanner,
      focusedControlId: focus.focusedControlId,
      focusedTag: focus.focused,
      focusedName: focus.focusedName,
      panel: afterPanel,
    },
    captures: { paletteFiltered: paletteCapture, afterActivation: afterCapture },
  });

  console.log(`${route.feature.padEnd(34)} q=${JSON.stringify(route.query).padEnd(20)} `
    + `controls=${String(paletteUp.observedPanelControls.length).padStart(2)} `
    + `target=${expectedTargetPresent ? 'named' : 'prose '} `
    + `-> ${JSON.stringify(afterState.heading)} ctl=${JSON.stringify(focus.focusedControlId)}`);
}

const artifactBytes = readFileSync(ARTIFACT);
const artifactSha256 = sha256(artifactBytes);

/* Where the artifact came from, established from committed bytes rather than asserted.
 *
 * The previous reading in this directory carries a `commit` field documented as the commit its
 * artifact was built from, and produced by `git rev-parse HEAD` -- which is the commit the DRIVER
 * ran from. Those coincided there and they do not here, so the field said something false the
 * moment the two came apart, which is the "comment asserting a property nobody verified" trap in
 * its purest form: the code and the sentence beside it disagreed and only the sentence was read.
 *
 * Both are recorded separately now, and the artifact's own commit is not taken on trust. This run
 * drove the same executable that reading drove, so the two records must name the same digest; if
 * they do, the earlier record's commit is this artifact's commit, and the chain is re-derivable by
 * anyone from two committed files. If they do not, the run stops rather than guessing. */
const priorPath = resolve(OUT_EVIDENCE, 'command-palette-reading.json');
const prior = JSON.parse(readFileSync(priorPath, 'utf8'));
if (prior.artifactSha256 !== artifactSha256) {
  fail(`the artifact does not hash to the one ${posix(relative(REPO, priorPath))} was taken from, so its build `
    + 'commit cannot be established from a committed record; build from this tree or record the provenance another way');
}

const record = {
  schemaVersion: 1,
  reading: 'command-palette-routes',
  /* The commit this driving code ran from. Never the commit the artifact was built from, and
   * never the commit this record lands in -- a record cannot carry its own future SHA. */
  harnessCommit: execFileSync('git', ['-C', REPO, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  harnessUncommitted: execFileSync(
    'git', ['-C', REPO, 'status', '--porcelain', '--', 'console/scripts/ui-drive'], { encoding: 'utf8' },
  ).trim().length > 0,
  artifact: posix(relative(REPO, ARTIFACT)),
  artifactSha256,
  artifactProvenance: {
    builtAtCommit: prior.commit,
    establishedBy: 'byte-for-byte digest equality with an earlier committed reading of the same executable',
    reading: posix(relative(REPO, priorPath)),
  },
  verification: 'inspected-real-packaged-artifact',
  launch: {
    method: 'off-screen Win32 desktop via console/scripts/launch-on-hidden-desktop.ps1',
    isolatedProfile: 'a task-scoped --user-data-dir created for this run only',
    driver: 'loopback Chrome DevTools Protocol, exactly one page target verified before any evaluation',
  },
  routesExcluded: excluded,
  notReadHere: [
    'no route activated the control it teleported to; each one was focused and left alone, so '
    + 'nothing here says what any of these settings do when operated',
    'no windows-console record was rewritten and no inventory row moved to verified',
    'the reading after activation is of whatever the destination is; where it reports no panel '
    + 'that is a fact about a page, not a verdict on the feature',
    'a control list standing on the shared reader\'s cap carries controlListTruncated, and the '
    + 'controls past the cap were never read -- the count beside it is what the panel held',
    'the artifact was not built from harnessCommit; artifactProvenance names the commit it was '
    + 'built from and how that was established, and appSourcesChangedSince names what moved between them',
  ],
  /* Everything the application's own sources gained between the artifact's commit and this run,
   * so a reader can see exactly how far the thing driven is from the tree the reading landed in
   * rather than being told it is close. */
  appSourcesChangedSince: execFileSync('git', [
    '-C', REPO, 'diff', '--name-only', prior.commit, 'HEAD', '--',
    'console/app', 'console/shared', 'console/package.json',
  ], { encoding: 'utf8' }).trim().split('\n').filter(Boolean),
  summary: recountSummary(routeReadings),
  routes: routeReadings,
};
writeFileSync(READINGS_PATH, `${JSON.stringify(record, null, 2)}\n`);

const problems = reconcile(record, routes);
if (problems.length > 0) {
  for (const problem of problems) console.error('WROTE A FILE THAT DOES NOT RECONCILE: ' + problem);
  close();
  process.exit(1);
}
console.log(JSON.stringify(record.summary));
console.log(`wrote ${posix(relative(REPO, READINGS_PATH))}`);
close();
