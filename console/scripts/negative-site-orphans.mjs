#!/usr/bin/env node
/**
 * Deliberate red-then-green regression for `scripts/site-orphans.mjs`.
 *
 * One break at a time, each planted alone, each watched go red, each restored and watched
 * go green again. Breaking several at once would prove only that SOMETHING among them is
 * watched, which is exactly how a wiring line in this repository went unguarded while the
 * pass count looked identical either way.
 *
 * Every break is also checked for having LANDED. An edit that silently matched nothing
 * reads exactly like a guard that held, and that is the one failure this file cannot
 * afford to have.
 *
 *   node scripts/negative-site-orphans.mjs
 */
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const guardPath = resolve(root, 'scripts/site-orphans.mjs');
const sitePath = (name) => resolve(root, 'site', name);

/** Runs the guard. Returns true when it passed. */
function guardPasses() {
  try {
    execFileSync(process.execPath, [guardPath], { cwd: root, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

const cases = [];

/**
 * @param {string} name what is being removed
 * @param {() => () => void} plant performs the break and returns its own undo
 */
function planted(name, plant) {
  cases.push({ name, plant });
}

/** Rewrites one file, returning an undo that puts the exact original bytes back. */
function rewrite(path, transform) {
  const original = readFileSync(path);
  const before = original.toString('utf8');
  const after = transform(before);
  if (after === before) {
    throw new Error(`the break for ${path} changed nothing -- an edit that never applied reads exactly like a guard that held`);
  }
  writeFileSync(path, after, 'utf8');
  return () => writeFileSync(path, original);
}

/** Creates a file, returning an undo that deletes it. */
function create(path, contents) {
  if (existsSync(path)) throw new Error(`${path} already exists; this break would destroy it`);
  writeFileSync(path, contents, 'utf8');
  return () => unlinkSync(path);
}

// 1. A new orphan page arrives and nobody records it. This is the original defect.
planted('an unrecorded orphan page', () =>
  create(sitePath('__negative-orphan.html'), '<!doctype html><title>unrecorded</title>\n'));

// 2. A new orphan script arrives and nobody records it.
planted('an unrecorded orphan script', () =>
  create(sitePath('__negative-orphan.js'), '// unrecorded\n'));

// 3. The record goes stale in the other direction: an entry that is no longer an orphan.
//    Publishing converter.html without removing its entry must be caught, or the list
//    silently stops describing the tree.
planted('a stale record for a file that is now published', () =>
  rewrite(sitePath('build.mjs'), (text) =>
    text.replace("const assets = ['index.html'", "const assets = ['converter.html', 'index.html'")));

// 4. An entry naming a file that no longer exists.
planted('a record naming a file that is gone', () =>
  rewrite(guardPath, (text) =>
    text.replace("file: 'full-builder.js'", "file: '__never-existed.js'")));

// 5. An entry with no real reason beside it.
planted('an entry recorded with no reason', () =>
  rewrite(guardPath, (text) =>
    text.replace(
      "{ file: 'changelog-data.js', reason: 'referenced by no page, by build.mjs, or by app.js.' }",
      "{ file: 'changelog-data.js', reason: 'orphan' }")));

// 6. The whole record emptied. A guard whose list is empty must not report success.
planted('the entire orphan record emptied', () =>
  rewrite(guardPath, (text) =>
    text.replace(/const KNOWN_ORPHANS = \[[\s\S]*?\n\];/u, 'const KNOWN_ORPHANS = [];')));

if (!guardPasses()) {
  console.error('negative-site-orphans: the guard is already failing before any break was planted; fix that first.');
  process.exit(1);
}

let failures = 0;
for (const { name, plant } of cases) {
  let undo;
  try {
    undo = plant();
  } catch (error) {
    console.error(`negative-site-orphans: could not plant "${name}": ${error.message}`);
    failures += 1;
    continue;
  }
  const stayedGreen = guardPasses();
  undo();
  if (stayedGreen) {
    console.error(`negative-site-orphans: RED expected, GREEN observed -- ${name} is not guarded.`);
    failures += 1;
    continue;
  }
  if (!guardPasses()) {
    console.error(`negative-site-orphans: GREEN expected after restoring ${name}, still RED -- the undo did not restore the tree.`);
    failures += 1;
    continue;
  }
  console.log(`negative-site-orphans: ${name} -- red when broken, green when restored.`);
}

if (failures > 0) process.exit(1);
console.log(`negative-site-orphans: ${cases.length} breaks, each planted alone, all red then green again.`);
