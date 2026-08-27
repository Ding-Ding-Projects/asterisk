#!/usr/bin/env node
/**
 * The destination-level half of the `.msym` axis-pin question, and the only measurement that
 * shows why removing the pin could not be judged from the committed captures alone.
 *
 * `design-parity-msym-axes.mjs` renders the icons in isolation and settles the mechanism. This
 * one asks the question the parity captures ask: with the pin gone, do the two sides' chrome
 * regions actually converge on a real destination? Answering it needs FOUR comparisons rather
 * than two, because the pin's removal and the capture run that measured it are two changes:
 *
 *   Rold/Bold   the recorded baseline -- the previously committed captures of both sides
 *   Rold/Bnew   the pin removed, compared against the OLD reference capture
 *   Rnew/Bold   the pinned build, compared against the NEW reference capture
 *   Rnew/Bnew   both retaken in one session, by one browser, in one rendering mode
 *
 * The middle two are the point. Either change on its own makes the divergence WORSE, and only
 * both together converge -- so a pass that had removed the pin and kept the committed reference
 * captures would have measured the correct repair as a regression and, quite reasonably, backed
 * it out. That is recorded here because it is the sort of result that is obvious once seen and
 * invisible before.
 *
 * The old captures come out of Git rather than out of a copy left in a scratch directory, so
 * the baseline is named by a commit that anybody can check rather than by a folder that only
 * existed on one machine.
 *
 * Usage:
 *   node scripts/design-parity-msym-destination.mjs --baseline=<commit-ish> [--only=a,b]
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { decodePNG } from './png-codec.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');
const CONSOLE_ROOT = resolve(REPO_ROOT, 'console');
const INVENTORY = JSON.parse(readFileSync(join(CONSOLE_ROOT, 'inventories', 'design-parity.json'), 'utf8'));
const MANIFEST = JSON.parse(readFileSync(join(CONSOLE_ROOT, 'design-reference', 'capture-manifest.generated.json'), 'utf8'));
const EVIDENCE = join(CONSOLE_ROOT, 'release', 'evidence', 'parity', 'msym-axis-pin-destination.json');

/** The four (reference, built) pairings, in the order they are reported. */
export const PAIRINGS = [
  { key: 'baseline', reference: 'old', built: 'old', what: 'the recorded baseline: both sides as previously committed' },
  { key: 'pinRemovedOnly', reference: 'old', built: 'new', what: 'the pin removed, against the old reference capture' },
  { key: 'referenceRetakenOnly', reference: 'new', built: 'old', what: 'the pinned build, against the new reference capture' },
  { key: 'both', reference: 'new', built: 'new', what: 'both sides retaken in one session by one browser' },
];

const inRect = (x, y, rect) => x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height;

/**
 * Differing pixels per declared area, attributing each differing pixel to the FIRST area whose
 * union rectangle contains it.
 *
 * First-match rather than every-match because the unions overlap: counting a pixel under two
 * areas would make the per-area figures sum to more than the frame's own differing count, and
 * the whole value of this table is that its columns can be compared to each other.
 */
export function differencesByArea(a, b, areas) {
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error(`design-parity-msym-destination: capture sizes differ (${a.width}x${a.height} against ${b.width}x${b.height})`);
  }
  const entries = Object.entries(areas);
  const tally = Object.fromEntries(entries.map(([name]) => [name, 0]));
  let outsideEveryArea = 0;
  for (let y = 0; y < a.height; y += 1) {
    for (let x = 0; x < a.width; x += 1) {
      const at = ((y * a.width) + x) * 4;
      if (a.pixels[at] === b.pixels[at] && a.pixels[at + 1] === b.pixels[at + 1]
        && a.pixels[at + 2] === b.pixels[at + 2] && a.pixels[at + 3] === b.pixels[at + 3]) continue;
      const hit = entries.find(([, area]) => inRect(x, y, area.union));
      if (hit) tally[hit[0]] += 1;
      else outsideEveryArea += 1;
    }
  }
  return { tally, outsideEveryArea };
}

/** A committed file's bytes at a named commit. Throws by name when the path is not there. */
export function bytesAtCommit(commitish, repoRelativePath) {
  try {
    return execFileSync('git', ['show', `${commitish}:${repoRelativePath}`], { cwd: REPO_ROOT, maxBuffer: 64 * 1024 * 1024 });
  } catch (error) {
    throw new Error(`design-parity-msym-destination: cannot read ${repoRelativePath} at ${commitish} (${error.message.split('\n')[0]})`);
  }
}

const argValue = (name, fallback) => {
  const hit = process.argv.find((argument) => argument.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

function selectedDestinations() {
  const only = argValue('only');
  if (!only) return MANIFEST.destinations.map((entry) => entry.id);
  return only.split(',').map((id) => id.trim()).filter(Boolean);
}

function main() {
  const baseline = argValue('baseline');
  if (!baseline) {
    console.error('usage: design-parity-msym-destination.mjs --baseline=<commit-ish> [--only=a,b]');
    process.exit(2);
  }
  const resolvedBaseline = execFileSync('git', ['rev-parse', baseline], { cwd: REPO_ROOT }).toString().trim();
  const referenceTemplate = INVENTORY.evidenceTemplates.referenceCapture;
  const builtTemplate = INVENTORY.evidenceTemplates.builtCapture;
  const ledgerTemplate = INVENTORY.evidenceTemplates.regionLedger;

  const destinations = [];
  for (const id of selectedDestinations()) {
    const areas = JSON.parse(readFileSync(resolve(REPO_ROOT, ledgerTemplate.replaceAll('{id}', id)), 'utf8')).areas;
    const images = {
      referenceold: decodePNG(bytesAtCommit(resolvedBaseline, referenceTemplate.replaceAll('{id}', id))),
      builtold: decodePNG(bytesAtCommit(resolvedBaseline, builtTemplate.replaceAll('{id}', id))),
      referencenew: decodePNG(readFileSync(resolve(REPO_ROOT, referenceTemplate.replaceAll('{id}', id)))),
      builtnew: decodePNG(readFileSync(resolve(REPO_ROOT, builtTemplate.replaceAll('{id}', id)))),
    };
    const pairings = {};
    for (const pairing of PAIRINGS) {
      const { tally, outsideEveryArea } = differencesByArea(images[`reference${pairing.reference}`], images[`built${pairing.built}`], areas);
      pairings[pairing.key] = { ...tally, outsideEveryArea };
    }
    destinations.push({ id, roles: Object.fromEntries(Object.entries(areas).map(([name, area]) => [name, area.role])), pairings });
    console.log(`${id}: ${PAIRINGS.map((p) => `${p.key} rail=${pairings[p.key].rail} statusCell=${pairings[p.key].statusCell}`).join('  ')}`);
  }

  const record = {
    generatedAt: new Date().toISOString(),
    generatedBy: 'console/scripts/design-parity-msym-destination.mjs',
    baseline: resolvedBaseline,
    pairings: PAIRINGS,
    whyFourPairings: 'The pin\'s removal and the capture run are two changes at once. Either alone raises the divergence and only both together lower it, so a pass that removed the pin and kept the committed reference captures would have read a correct repair as a regression.',
    destinations,
  };
  mkdirSync(dirname(EVIDENCE), { recursive: true });
  writeFileSync(EVIDENCE, `${JSON.stringify(record, null, 2)}\n`);
  console.log(`\nwrote console/release/evidence/parity/msym-axis-pin-destination.json (baseline ${resolvedBaseline})`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
