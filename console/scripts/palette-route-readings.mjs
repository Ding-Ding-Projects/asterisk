/**
 * Re-derive every claim the committed palette-route readings make, without a browser.
 *
 * `scripts/ui-drive/palette-routes.mjs` drives the packaged application and writes what it saw.
 * This reads that file back on every `npm test` and refuses it if it has stopped agreeing with
 * the things it speaks for: the records that name the routes, the pictures it points at, and --
 * the part worth having -- the compiled command palette itself.
 *
 * WHY THE PALETTE IS THE INTERESTING CHECK. A reading can say "activating this row focused the
 * control `e_displayname`" and that sentence is worth nothing on its own, because nothing in it
 * says the row was supposed to reach that control. The palette entry does: `buildPalette` gives
 * a SETTING entry a `controlId` and a DESTINATION entry none, so the row's own label and context
 * determine which control the application owed the reader. Checking the focused control against
 * that turns a description of what happened into a statement about whether it was right.
 *
 * It also settles, rather than guesses at, the three routes that focused nothing. Two of them
 * activated a row whose context is the literal `Destination`; the third activated `Status hub`,
 * whose context is `Status hub sessions` -- because `buildPalette` prints the literal only when
 * a screen's title equals its label. A classifier reading the context string therefore reports
 * that third route as a setting that failed to focus anything, which is a defect that does not
 * exist. Reading the entry instead cannot make that mistake.
 *
 * Must be run with `tsx` rather than plain `node`: it imports the TypeScript palette builder and
 * the compiled design that feeds it, exactly as `audit-design-parity-material.mjs` does.
 *
 *   npx tsx scripts/palette-route-readings.mjs --check
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { deriveRoutes, reconcile } from './ui-drive/palette-route-table.mjs';
import { readRecords, READINGS_PATH, REPO, posix, sha256 } from './ui-drive/palette-route-paths.mjs';
import { buildPalette } from '../app/renderer/src/command-palette.ts';
import { ORDER, SCREENS, APPEAR_GROUPS } from '../app/renderer/src/generated/console.tsx';

if (!process.argv.includes('--check')) {
  console.error('usage: npx tsx scripts/palette-route-readings.mjs --check');
  process.exit(2);
}

const problems = [];
const complain = (why) => problems.push(why);

if (!existsSync(READINGS_PATH)) {
  console.error(`FAIL: ${posix(relative(REPO, READINGS_PATH))} does not exist`);
  process.exit(1);
}
const readings = JSON.parse(readFileSync(READINGS_PATH, 'utf8'));
const { routes, excluded } = deriveRoutes(readRecords());

/* 1. The readings cover exactly the routes the records name, and every summary total is a
 *    recount of the rows rather than a claim written beside them. */
for (const problem of reconcile(readings, routes)) complain(problem);
if (excluded.length === 0) complain('no record is excluded as reached another way, so that allowance excuses nothing');

/* 2. Every picture the readings point at exists and still hashes to what was written down. A
 *    stale capture and a rewritten record read identically without this. */
let capturesChecked = 0;
for (const route of readings.routes ?? []) {
  for (const [phase, capture] of Object.entries(route.captures ?? {})) {
    const file = resolve(REPO, capture.path);
    if (!existsSync(file)) { complain(`${route.feature}/${phase}: ${capture.path} is missing`); continue; }
    const bytes = readFileSync(file);
    if (bytes.length !== capture.bytes) {
      complain(`${route.feature}/${phase}: ${capture.path} is ${bytes.length} bytes, recorded as ${capture.bytes}`);
    }
    if (sha256(bytes) !== capture.sha256) {
      complain(`${route.feature}/${phase}: ${capture.path} no longer hashes to what the reading recorded`);
    }
    capturesChecked += 1;
  }
}
if (capturesChecked === 0) complain('no capture was checked, so the digest half of this check proved nothing');

/* 3. The artifact's provenance, re-derived from committed bytes rather than believed. The
 *    reading names the commit its executable was built from and says it established that by
 *    digest equality with an earlier committed reading; that earlier reading is on disk, so the
 *    claim is checkable here and is checked. */
const priorPath = resolve(REPO, readings.artifactProvenance?.reading ?? '');
if (!existsSync(priorPath)) {
  complain(`the reading names ${JSON.stringify(readings.artifactProvenance?.reading)} as the record establishing `
    + 'its artifact provenance, and no such file exists');
} else {
  const prior = JSON.parse(readFileSync(priorPath, 'utf8'));
  if (prior.artifactSha256 !== readings.artifactSha256) {
    complain('the artifact digest does not match the record its provenance is drawn from, so the commit '
      + 'it names is a claim about a different executable');
  }
  if (prior.commit !== readings.artifactProvenance?.builtAtCommit) {
    complain(`the reading says its artifact was built at ${JSON.stringify(readings.artifactProvenance?.builtAtCommit)} `
      + `while the record it draws that from says ${JSON.stringify(prior.commit)}`);
  }
}

/* And what moved in the application's own sources between that commit and the one the harness
 * ran from. Re-derived with git where both commits are present; where they are not, the check
 * says so in its own output rather than passing silently on an unverified list. */
let divergenceVerified = 'not re-derived: one of the two commits is unknown to this clone';
try {
  const listed = execFileSync('git', [
    '-C', REPO, 'diff', '--name-only',
    readings.artifactProvenance?.builtAtCommit ?? '', readings.harnessCommit ?? '', '--',
    'console/app', 'console/shared', 'console/package.json',
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim().split('\n').filter(Boolean);
  const recorded = readings.appSourcesChangedSince ?? [];
  if (listed.join('\n') !== recorded.join('\n')) {
    complain(`the reading says ${recorded.length} application source file(s) moved between the artifact's commit `
      + `and the harness's, and git says ${listed.length}: ${listed.join(', ') || '(none)'}`);
  }
  divergenceVerified = `re-derived: ${listed.length} application source file(s) moved`;
} catch {
  /* Left as the honest not-re-derived state above; never silently treated as agreement. */
}

/* 4. The row each route activated is a real palette entry, and the control the application
 *    focused is the one that entry names. */
const palette = buildPalette(
  ORDER,
  SCREENS,
  APPEAR_GROUPS,
);
if (palette.length < 100) complain(`the compiled palette built only ${palette.length} entries, so this check would prove little`);

let settings = 0;
let destinations = 0;
for (const route of readings.routes ?? []) {
  const label = route?.activation?.activatedRowLabel;
  const context = route?.activation?.activatedRowContext;
  if (typeof label !== 'string' || typeof context !== 'string') {
    complain(`${route.feature}: the reading does not say which row it activated`);
    continue;
  }
  const matches = palette.filter((entry) => entry.label === label && entry.context === context);
  if (matches.length === 0) {
    complain(`${route.feature}: activated a row ${JSON.stringify(label)} in ${JSON.stringify(context)} `
      + 'that is not an entry in the compiled palette');
    continue;
  }
  if (matches.length > 1) {
    complain(`${route.feature}: ${matches.length} palette entries share that label and context, so the `
      + 'reading cannot say which one the application opened');
    continue;
  }
  const entry = matches[0];
  const focused = route?.afterActivation?.focusedControlId ?? null;
  if (entry.controlId) {
    settings += 1;
    if (focused !== entry.controlId) {
      complain(`${route.feature}: the palette entry names control ${JSON.stringify(entry.controlId)} `
        + `but the application focused ${JSON.stringify(focused)}`);
    }
  } else {
    destinations += 1;
    if (focused !== null) {
      complain(`${route.feature}: activated a destination entry, which names no control, `
        + `yet the application focused ${JSON.stringify(focused)}`);
    }
  }
}
if (settings === 0) complain('no route activated a setting entry, so the focused-control half of this check proved nothing');
if (destinations === 0) {
  complain('no route activated a destination entry, so the branch that explains a route focusing '
    + 'nothing was never taken and this check would report a defect that is not one');
}

if (problems.length > 0) {
  for (const problem of problems) console.error('FAIL: ' + problem);
  process.exit(1);
}
console.log(`PASS: ${readings.routes.length} palette route reading(s) reconcile with the records; `
  + `${capturesChecked} capture(s) hash to what was recorded; `
  + `${settings} setting and ${destinations} destination activation(s) reached the control the compiled palette names; `
  + `artifact provenance chained to a committed reading, source divergence ${divergenceVerified}`);
