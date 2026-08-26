/**
 * Contract for the palette-route harness and for the readings it has taken.
 *
 * Two halves, and they answer different questions.
 *
 * The first is about the derivation: the route table is read out of the built-interaction
 * records rather than transcribed beside them, so a record that changes changes the table, and
 * a record that stops being a palette route has to fail loudly rather than be driven against a
 * query it no longer claims. Every one of those failures is exercised here with a fixture,
 * because a derivation that throws on nothing is a derivation that covers whatever it happened
 * to understand.
 *
 * The second is about the committed readings themselves. Twenty-five records recorded
 * `observedPanelControls: []`, and the whole point of this work is that the field now holds what
 * the palette really offered. An assertion that the committed readings still carry real controls
 * is the one thing standing between that and a future run quietly writing empty lists again --
 * which is exactly what happened the first time, undetected, twenty-five times over.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  NON_PALETTE_RECORDS, OBSERVED_FIELD, deriveRoutes, queryFromAction, recountSummary, reconcile,
} from '../../scripts/ui-drive/palette-route-table.mjs';
import { PANEL_CANDIDATES_SOURCE, PANEL_CONTROL_CAP, summarisePanel } from '../../scripts/ui-drive/observe-panel.mjs';
import { readRecords } from '../../scripts/ui-drive/palette-route-paths.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const READINGS = resolve(root, 'release/evidence/ui-drive/palette-route-readings.json');

/** A record shaped exactly as the committed ones are, so a fixture cannot pass for the wrong reason. */
const recordWith = (action, observedTarget, controls = []) => ({
  interaction: { action, observedTarget, route: 'App > somewhere', [OBSERVED_FIELD]: controls },
});

test('a typed query is read out of the record prose, and its absence is reported rather than guessed', () => {
  assert.equal(queryFromAction("opened the command palette with Ctrl+Shift+F, typed 'school', clicked"), 'school');
  assert.equal(queryFromAction("typed 'Home Assistant', clicked the 'Home Assistant entity' result"), 'Home Assistant');
  assert.equal(queryFromAction('right-clicked the row and chose Lock this element'), null);
  assert.equal(queryFromAction("typed '', clicked"), null, 'an empty query is not a query');
  assert.equal(queryFromAction(undefined), null);
  assert.equal(queryFromAction(42), null);
});

test('a record carrying the field with no query fails unless it is declared as reached another way', () => {
  const declared = Object.keys(NON_PALETTE_RECORDS)[0];
  assert.ok(declared, 'nothing is declared as reached another way, so this check would prove nothing');

  assert.throws(
    () => deriveRoutes({
      [declared]: recordWith('driven from a search row', 'section list'),
      surprise: recordWith('right-clicked something', 'a menu'),
    }),
    /surprise carries observedPanelControls but its action names no typed query/u,
    'an undeclared record with no query was absorbed instead of failing',
  );

  const { routes, excluded } = deriveRoutes({
    [declared]: recordWith('driven from a search row', 'section list'),
    school: recordWith("typed 'school', clicked", 'School mode'),
  });
  assert.deepEqual(excluded.map((e) => e.feature), [declared]);
  assert.deepEqual(routes.map((r) => r.feature), ['school']);
});

test('an allowance that no longer excuses anything is an error rather than a comment nobody removed', () => {
  assert.throws(
    () => deriveRoutes({ school: recordWith("typed 'school', clicked", 'School mode') }),
    /is declared as reached another way, but no such record/u,
  );
});

test('a route with a query but no target fails, because nothing would say what the activation reached', () => {
  const declared = Object.keys(NON_PALETTE_RECORDS)[0];
  assert.throws(
    () => deriveRoutes({
      [declared]: recordWith('driven from a search row', 'section list'),
      school: recordWith("typed 'school', clicked", '   '),
    }),
    /names a typed query but no observedTarget/u,
  );
});

test('a derivation over records that carry the field at all cannot silently cover nothing', () => {
  assert.throws(() => deriveRoutes({ nothing: { interaction: { action: 'x' } } }), /no record carries/u);
  const declared = Object.keys(NON_PALETTE_RECORDS)[0];
  assert.throws(
    () => deriveRoutes({ [declared]: recordWith('driven from a search row', 'section list') }),
    /every candidate was excluded/u,
  );
});

test('the real records still derive the palette routes this harness was built for', () => {
  const { routes, excluded } = deriveRoutes(readRecords());
  assert.ok(routes.length >= 20, `only ${routes.length} palette route(s) derived from the real records`);
  assert.deepEqual(excluded.map((e) => e.feature).sort(), Object.keys(NON_PALETTE_RECORDS).sort());
  for (const route of routes) {
    assert.ok(route.query.length > 0, `${route.feature} derived an empty query`);
    assert.ok(route.expectedTarget.length > 0, `${route.feature} derived an empty target`);
  }
});

test('every summary total is a recount of the rows, so a hand-edited one cannot survive', () => {
  const rows = [
    {
      paletteUp: { panelFound: true, [OBSERVED_FIELD]: ['a', 'b'], controlListTruncated: false },
      activation: { expectedTargetPresent: true, expectedTargetAmbiguous: false },
      afterActivation: { focusedControlId: 'x_one', panel: { panelFound: false } },
    },
    {
      paletteUp: { panelFound: true, [OBSERVED_FIELD]: ['c'], controlListTruncated: true },
      activation: { expectedTargetPresent: false, expectedTargetAmbiguous: true },
      afterActivation: { focusedControlId: null, panel: { panelFound: false } },
    },
  ];
  assert.deepEqual(recountSummary(rows), {
    routesDriven: 2,
    paletteOpened: 2,
    expectedTargetPresent: 1,
    expectedTargetAmbiguous: 1,
    routesWithFocusedControl: 1,
    noPanelAfterActivation: 2,
    readingsTruncatedAtControlCap: 1,
    totalControlsObserved: 3,
  });
  assert.deepEqual(recountSummary(null).routesDriven, 0);
});

test('reconcile names every way a readings file can disagree with the routes it speaks for', () => {
  const routes = [
    { feature: 'a', query: 'qa', expectedTarget: 'Ta' },
    { feature: 'b', query: 'qb', expectedTarget: 'Tb' },
  ];
  const row = (feature, query, expectedTarget) => ({
    feature, query, expectedTarget,
    paletteUp: { panelFound: true, [OBSERVED_FIELD]: [], controlListTruncated: false },
    activation: { expectedTargetPresent: true, expectedTargetAmbiguous: false },
    afterActivation: { focusedControlId: 'z', panel: { panelFound: false } },
  });
  const good = [row('a', 'qa', 'Ta'), row('b', 'qb', 'Tb')];
  assert.deepEqual(reconcile({ routes: good, summary: recountSummary(good) }, routes), []);

  const missing = [row('a', 'qa', 'Ta')];
  assert.match(reconcile({ routes: missing, summary: recountSummary(missing) }, routes).join(' | '),
    /b is a palette route in the records and has no reading/u);

  const extra = [...good, row('c', 'qc', 'Tc')];
  assert.match(reconcile({ routes: extra, summary: recountSummary(extra) }, routes).join(' | '),
    /c has a reading but is not a palette route/u);

  const wrongQuery = [row('a', 'typo', 'Ta'), row('b', 'qb', 'Tb')];
  assert.match(reconcile({ routes: wrongQuery, summary: recountSummary(wrongQuery) }, routes).join(' | '),
    /a was driven with "typo" but its record names "qa"/u);

  const wrongTarget = [row('a', 'qa', 'Other'), row('b', 'qb', 'Tb')];
  assert.match(reconcile({ routes: wrongTarget, summary: recountSummary(wrongTarget) }, routes).join(' | '),
    /a recorded an expected target of "Other"/u);

  const duplicated = [row('a', 'qa', 'Ta'), row('a', 'qa', 'Ta'), row('b', 'qb', 'Tb')];
  assert.match(reconcile({ routes: duplicated, summary: recountSummary(duplicated) }, routes).join(' | '),
    /a appears more than once/u);

  assert.match(reconcile({ routes: good, summary: { ...recountSummary(good), routesDriven: 99 } }, routes).join(' | '),
    /summary\.routesDriven says 99 but the per-route readings recount to 2/u);
});

test('the collector still counts the controls before it cuts them, or the truncation flag is dead', () => {
  /* This assertion exists because its absence was measured. Commenting out the collector's own
   * `operableControls` line left every test green: `summarisePanel` would then report
   * `controlListTruncated: null` forever, and the tests below would keep passing because they
   * hand it a panel object of their own making rather than one the collector built. Producer
   * unguarded, consumer well guarded -- the same shape, from the producer side again.
   *
   * Anchored to a whole line, because a needle for the bare property name is satisfied by the
   * commented-out line that is how such a line usually dies.
   *
   * A line-anchored `$` against a CRLF file normally matches nothing and reports clean forever,
   * which is the trap this repository has been caught by before. It does not apply to the FIRST
   * assertion below: `observe-panel.mjs` really is CRLF on this checkout, but ECMAScript
   * normalises line terminators inside a template literal, so `PANEL_CANDIDATES_SOURCE` is LF
   * whatever the file is. Written down because that looks exactly like a latent defect to anyone
   * who checks the file's line endings and stops there. The assertions that read the file text
   * directly use plain substrings and never a `$`. */
  assert.match(PANEL_CANDIDATES_SOURCE, /^\s*operableControls: operable\.length,$/mu,
    'the candidate collector no longer reports how many controls the panel held before the cut, '
    + 'so nothing can ever tell a truncated reading from a complete one');
  /* Read from the FILE, not from the rendered template. This assertion was first written against
   * `PANEL_CANDIDATES_SOURCE` and it stayed green when the interpolation was replaced by the bare
   * literal `60`, because the template renders to the same string either way -- a guard that moves
   * with the constant it guards, which is the same failure this harness's z-index check already
   * had once. Once the cut is a literal, changing the constant leaves the two silently apart and
   * every truncation flag becomes wrong. */
  const readerSource = readFileSync(resolve(root, 'scripts/ui-drive/observe-panel.mjs'), 'utf8');
  assert.ok(readerSource.includes('.slice(0, ${PANEL_CONTROL_CAP})'),
    'the collector cuts at a bare literal rather than at the named cap, so the constant and the cut '
    + 'can drift apart without anything saying so');
  assert.ok(PANEL_CANDIDATES_SOURCE.includes(`.slice(0, ${PANEL_CONTROL_CAP})`),
    'the rendered collector does not cut at the cap the constant names');
  assert.match(PANEL_CANDIDATES_SOURCE, /^\s*const operable = \[\.\.\.el\.querySelectorAll/mu,
    'the count and the cut no longer come from the same list, so the reported total could be of '
    + 'something other than what was cut');
});

test('a control list standing on the cap says so, and one taken before the count existed says it does not know', () => {
  const panel = (operableControls) => ({
    zIndex: 1000, visible: true, rect: { x: 0, y: 0, width: 100, height: 100 }, inputs: 1,
    operableControls, controls: [{ textWithoutIcons: 'One' }],
  });
  assert.equal(summarisePanel(panel(PANEL_CONTROL_CAP + 1)).controlListTruncated, true);
  assert.equal(summarisePanel(panel(PANEL_CONTROL_CAP)).controlListTruncated, false,
    'a panel holding exactly the cap was not truncated, so reporting it as such would be a false alarm');
  assert.equal(summarisePanel(panel(undefined)).controlListTruncated, null);
  assert.equal(summarisePanel(panel(PANEL_CONTROL_CAP + 1)).operableControlsInPanel, PANEL_CONTROL_CAP + 1);
});

test('the checker is actually run by npm test, and the driver it checks is still here', () => {
  /* `test-suites-are-wired.test.mjs` derives its list from the filesystem and covers every
   * `negative-*.mjs`; this checker is not one of those, so nothing else would notice it falling
   * out of the chain. A checker nothing runs gates nothing, and is worse than not having one,
   * because a check that is assumed to be running is one nobody thinks to look at. */
  const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
  const chain = Object.values(pkg.scripts).join(' ; ');
  assert.ok(chain.includes('scripts/palette-route-readings.mjs --check'),
    'the palette-route checker is no longer invoked by any npm script');
  assert.ok(pkg.scripts.test.includes('test:inventories'),
    'the chain that holds the checker is no longer reached by npm test');

  for (const file of [
    'scripts/ui-drive/palette-routes.mjs',
    'scripts/ui-drive/palette-route-table.mjs',
    'scripts/ui-drive/palette-route-paths.mjs',
    'scripts/palette-route-readings.mjs',
  ]) {
    assert.ok(existsSync(resolve(root, file)), `${file} is gone, so the readings have no producer or no checker`);
  }
});

test('the committed readings carry real controls, which is the whole thing this work exists to produce', () => {
  assert.ok(existsSync(READINGS), 'no palette-route readings are committed');
  const readings = JSON.parse(readFileSync(READINGS, 'utf8'));
  assert.ok(readings.routes.length >= 20, `only ${readings.routes.length} route(s) were driven`);

  const empty = readings.routes.filter((r) => (r.paletteUp?.[OBSERVED_FIELD] ?? []).length === 0);
  assert.deepEqual(empty.map((r) => r.feature), [],
    'these routes recorded an empty control list again, which is the exact reading this work replaced');

  const shut = readings.routes.filter((r) => r.paletteUp?.panelFound !== true);
  assert.deepEqual(shut.map((r) => r.feature), [], 'these routes recorded no panel while the palette was up');

  for (const route of readings.routes) {
    assert.ok(route.captures?.paletteFiltered?.sha256, `${route.feature} has no capture of its filtered palette`);
    assert.ok(route.captures?.afterActivation?.sha256, `${route.feature} has no capture of where it landed`);
    assert.ok(typeof route.paletteUp.hint === 'string' && /\d+ of \d+/u.test(route.paletteUp.hint),
      `${route.feature} did not record the palette's own count, so a list that never filtered would look the same`);
  }

  /* The record's own honesty fields, asserted so a later run cannot drop them and leave the file
   * reading as a stronger claim than it is. */
  assert.ok(Array.isArray(readings.notReadHere) && readings.notReadHere.length >= 3);
  assert.equal(readings.verification, 'inspected-real-packaged-artifact');
  assert.match(readings.artifactSha256, /^[0-9a-f]{64}$/u);
});
