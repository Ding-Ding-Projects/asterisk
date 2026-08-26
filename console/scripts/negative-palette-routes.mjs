/**
 * Deliberate red-then-green regression for the palette-route readings and their checker.
 *
 * A guard nobody has watched fail proves nothing. Each break below is planted ALONE, the checker
 * is run and must refuse, and the file is restored byte for byte and the checker run again and
 * must pass. Breaking several at once would prove only that something among them is watched,
 * which is how a wiring line in this repository stayed unguarded while the pass count looked
 * identical either way.
 *
 * Two properties this script insists on for itself, both learned here the hard way:
 *
 *   An edit that did not land reads exactly like a guard that held. Every break asserts the bytes
 *   really changed before the checker is run, and says which break failed to apply otherwise.
 *
 *   A break written in the shape the needle expects proves the needle fires, never that the
 *   needle is the right one. So the breaks here are written against the data as the driver really
 *   writes it -- a real feature name, a real control id, a real digest -- rather than against a
 *   convenient placeholder the checker would reject for the wrong reason.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CONSOLE_DIR = resolve(import.meta.dirname, '..');
const READINGS = resolve(CONSOLE_DIR, 'release/evidence/ui-drive/palette-route-readings.json');
const CHECKER = 'scripts/palette-route-readings.mjs';

const original = readFileSync(READINGS);

const runChecker = () => {
  try {
    execFileSync('npx', ['tsx', CHECKER, '--check'], { cwd: CONSOLE_DIR, stdio: 'pipe', shell: process.platform === 'win32' });
    return { refused: false };
  } catch (error) {
    return { refused: true, why: String(error.stderr ?? '').trim().split('\n')[0] };
  }
};

/** Every break, as a function over the parsed readings. Each returns the mutated object. */
const BREAKS = [
  ['a route is dropped from the readings',
    (r) => { r.routes = r.routes.slice(1); return r; }],
  ['a route is driven with a query its record does not name',
    (r) => { r.routes[0].query = `${r.routes[0].query} and more`; return r; }],
  ['a route claims a target its record does not name',
    (r) => { r.routes[0].expectedTarget = 'Something else entirely'; return r; }],
  ['a route appears twice',
    (r) => { r.routes.push(JSON.parse(JSON.stringify(r.routes[0]))); return r; }],
  ['a reading is added for a feature that is not a palette route',
    (r) => {
      const copy = JSON.parse(JSON.stringify(r.routes[0]));
      copy.feature = 'regex-builder';
      r.routes.push(copy);
      return r;
    }],
  ['a summary total is edited to a number the rows do not recount to',
    (r) => { r.summary.totalControlsObserved += 1; return r; }],
  ['the count of routes whose palette opened is inflated',
    (r) => { r.summary.paletteOpened += 3; return r; }],
  ['a capture digest no longer matches the picture it names',
    (r) => { r.routes[0].captures.paletteFiltered.sha256 = 'f'.repeat(64); return r; }],
  ['a capture byte count no longer matches the picture it names',
    (r) => { r.routes[0].captures.afterActivation.bytes += 1; return r; }],
  ['a capture points at a picture that is not there',
    (r) => { r.routes[0].captures.paletteFiltered.path = 'console/release/captures/ui-drive/palette-routes/not-a-file.png'; return r; }],
  ['every capture is removed, so the digest half of the check would prove nothing',
    (r) => { for (const route of r.routes) route.captures = {}; return r; }],
  ['a setting route claims it focused a control the compiled palette does not name for that row',
    (r) => {
      const route = r.routes.find((x) => typeof x.afterActivation.focusedControlId === 'string');
      route.afterActivation.focusedControlId = 'not_a_real_control';
      r.summary = null;
      return r;
    }],
  ['a setting route claims it focused nothing at all',
    (r) => {
      const route = r.routes.find((x) => typeof x.afterActivation.focusedControlId === 'string');
      route.afterActivation.focusedControlId = null;
      r.summary = null;
      return r;
    }],
  ['a destination route claims it focused a control, which a destination entry never names',
    (r) => {
      const route = r.routes.find((x) => x.afterActivation.focusedControlId === null);
      route.afterActivation.focusedControlId = 'p_theme';
      r.summary = null;
      return r;
    }],
  ['a route names a row that is not in the compiled palette at all',
    (r) => { r.routes[0].activation.activatedRowLabel = 'A row nobody ever rendered'; return r; }],
  ['a route names a row whose context belongs to a different screen',
    (r) => { r.routes[0].activation.activatedRowContext = 'Somewhere else · Not a group'; return r; }],
  ['a route stops saying which row it activated',
    (r) => { delete r.routes[0].activation.activatedRowLabel; return r; }],
  ['every route is turned into a destination, so the focused-control half proves nothing',
    (r) => {
      for (const route of r.routes) {
        route.activation.activatedRowLabel = 'Changelog';
        route.activation.activatedRowContext = 'Destination';
        route.afterActivation.focusedControlId = null;
      }
      r.summary = null;
      return r;
    }],
  ['the artifact digest no longer matches the record its provenance is chained to',
    (r) => { r.artifactSha256 = '0'.repeat(64); return r; }],
  ['the artifact claims a build commit the record it is chained to does not name',
    (r) => { r.artifactProvenance.builtAtCommit = '0000000000000000000000000000000000000000'; return r; }],
  ['the provenance is chained to a record that does not exist',
    (r) => { r.artifactProvenance.reading = 'console/release/evidence/ui-drive/no-such-reading.json'; return r; }],
  ['the list of application sources that moved since the artifact was built gains a file',
    (r) => { r.appSourcesChangedSince = [...r.appSourcesChangedSince, 'console/app/renderer/src/App.tsx']; return r; }],
  ['the list of application sources that moved since the artifact was built is emptied',
    (r) => { r.appSourcesChangedSince = []; return r; }],
  ['every route is turned into a setting, so the branch explaining a route that focuses nothing is never taken',
    (r) => {
      for (const route of r.routes) {
        route.activation.activatedRowLabel = 'Theme';
        route.activation.activatedRowContext = 'Appearance · Theme';
        route.afterActivation.focusedControlId = 'p_theme';
      }
      r.summary = null;
      return r;
    }],
];

/* The summary is recounted from the rows, so a break that edits a row without touching the
 * summary would be caught by the recount rather than by the assertion it was written for. Those
 * breaks set `summary` to null and it is rebuilt here from the mutated rows, so each one reaches
 * the check it exists to exercise. */
const { recountSummary } = await import('./ui-drive/palette-route-table.mjs');

let failures = 0;
for (const [name, apply] of BREAKS) {
  const before = readFileSync(READINGS, 'utf8');
  const mutated = apply(JSON.parse(before));
  if (mutated.summary === null) mutated.summary = recountSummary(mutated.routes);
  const after = `${JSON.stringify(mutated, null, 2)}\n`;
  if (after === before) {
    console.error(`DID NOT APPLY: ${name}`);
    failures += 1;
    continue;
  }
  writeFileSync(READINGS, after);
  const broken = runChecker();
  writeFileSync(READINGS, original);
  const restored = runChecker();

  if (!broken.refused) { console.error(`STAYED GREEN: ${name}`); failures += 1; continue; }
  if (restored.refused) { console.error(`DID NOT RECOVER: ${name} :: ${restored.why}`); failures += 1; continue; }
  console.log(`red then green: ${name}`);
}

writeFileSync(READINGS, original);
if (failures > 0) {
  console.error(`FAIL: ${failures} of ${BREAKS.length} deliberate break(s) did not behave`);
  process.exit(1);
}
console.log(`PASS: ${BREAKS.length} deliberate breaks, each planted alone, each red then green`);
