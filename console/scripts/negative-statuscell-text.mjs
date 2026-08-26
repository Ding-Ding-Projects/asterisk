#!/usr/bin/env node
/**
 * Deliberate red-then-green proof for design-parity-statuscell-text.mjs's check stage.
 *
 * That check is the only thing standing between "the built application inherits a font weight
 * the design does not" and a paragraph of prose nobody can verify. It rests on two committed
 * PNGs and a JSON record, none of which a reader will compare by hand, which is exactly the
 * shape of evidence that quietly goes stale.
 *
 * So each lie below is planted on its own, against the real committed evidence, and must make
 * the check report a problem; the untouched evidence must then report none. One lie at a time,
 * because breaking three things and seeing one complaint proves only that something among them
 * is watched.
 *
 * Nothing here writes to disk: the check takes its own `read`/`exists`, so a planted lie lives
 * entirely in memory.
 *
 * Deliberately narrowed to two destinations. The check re-derives the localisation on all 32
 * when it runs for real, and doing that once per planted lie would decode sixty-four
 * 1440x1000 PNGs per case for no extra proof.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  checkStatusCellTextEvidence, EVIDENCE, AS_DESIGNED_PNG, APPEARANCE_DEFAULTS_PNG,
} from './design-parity-statuscell-text.mjs';

const root = resolve(import.meta.dirname, '..', '..');
const IDS = ['dash', 'about'];
const absolute = (relativePath) => resolve(root, relativePath);
const APP_TSX = absolute('console/app/renderer/src/App.tsx');

/** Reads the honest evidence record once, so a case can mutate a copy of it. */
const honestRecord = () => JSON.parse(readFileSync(absolute(EVIDENCE), 'utf8'));

/**
 * Runs the check with one file's bytes replaced, or one path made to vanish.
 *
 * `swap` maps an absolute path to replacement bytes; `hide` is a set of absolute paths that
 * report as absent. Everything else falls through to the real filesystem, so each case differs
 * from the honest run by exactly the one thing it plants.
 */
function checkWith({ swap = new Map(), hide = new Set() } = {}) {
  return checkStatusCellTextEvidence({
    root,
    ids: IDS,
    exists: (path) => (hide.has(path) ? false : existsSync(path)),
    read: (path, encoding) => {
      if (!swap.has(path)) return readFileSync(path, encoding);
      const bytes = swap.get(path);
      return encoding ? bytes.toString(encoding) : bytes;
    },
  });
}

const recordSwappedTo = (mutate) => {
  const record = honestRecord();
  mutate(record);
  return new Map([[absolute(EVIDENCE), Buffer.from(`${JSON.stringify(record, null, 2)}\n`, 'utf8')]]);
};

const cases = [
  ['the record claims a different differing-pixel count', () => ({
    swap: recordSwappedTo((record) => { record.differingPixelsPerDestination = 554; }),
  })],
  ['the record claims the differences sit in different columns', () => ({
    swap: recordSwappedTo((record) => { record.columnRuns = [{ from: 1088, to: 1214 }]; }),
  })],
  ['the as-designed frame is really the built capture', () => ({
    swap: new Map([[absolute(AS_DESIGNED_PNG), readFileSync(absolute('console/release/captures/parity/dash-built.png'))]]),
  })],
  ['the appearance-defaults frame is really the reference capture', () => ({
    swap: new Map([[absolute(APPEARANCE_DEFAULTS_PNG), readFileSync(absolute('console/release/captures/parity/dash-reference.png'))]]),
  })],
  ['a reproduction frame has been deleted', () => ({ hide: new Set([absolute(APPEARANCE_DEFAULTS_PNG)]) })],
  ['the evidence record itself has been deleted', () => ({ hide: new Set([absolute(EVIDENCE)]) })],
  ["App.tsx no longer writes the appearance weight to the root", () => ({
    swap: new Map([[APP_TSX, Buffer.from(
      readFileSync(APP_TSX, 'utf8').replace("root.style.setProperty('font-weight', weightVal)", "root.style.setProperty('font-stretch', weightVal)"),
      'utf8',
    )]]),
  })],
  ["App.tsx's appearance weight default is no longer 500", () => ({
    swap: new Map([[APP_TSX, Buffer.from(
      readFileSync(APP_TSX, 'utf8').replace("weight: str('ap_weight', '500')", "weight: str('ap_weight', '400')"),
      'utf8',
    )]]),
  })],
];

let failures = 0;
for (const [description, plant] of cases) {
  const { problems } = checkWith(plant());
  if (problems.length > 0) {
    console.log(`RED   (correct): ${description}\n        -> ${problems[0]}`);
  } else {
    console.error(`GREEN (WRONG):  ${description}: the check accepted a lie`);
    failures += 1;
  }
}

const honest = checkWith();
if (honest.problems.length === 0) {
  console.log(`GREEN (correct): the untouched evidence passes on ${honest.destinations.length} destination(s)`
    + `: as-designed vs reference ${honest.measured.plainVsReference}, appearance defaults vs built ${honest.measured.themedVsBuilt}.`);
} else {
  for (const problem of honest.problems) console.error(`RED (WRONG): the honest, untouched evidence was refused: ${problem}`);
  failures += 1;
}

if (failures > 0) {
  console.error(`\nFAIL: ${failures} case(s) behaved backwards.`);
  process.exit(1);
}
console.log(`\nPASS: ${cases.length} planted lies refused, honest evidence accepted.`);
