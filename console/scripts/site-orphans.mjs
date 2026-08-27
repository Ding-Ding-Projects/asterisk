#!/usr/bin/env node
/**
 * Every file in `site/` that nothing reaches.
 *
 * This exists because of a specific, verified failure. `site/converter.html`,
 * `site/ollama.html` and `site/history.html` are full pages -- file pickers, adapter
 * catalogues, endpoint approval, progress lists, searches with their own anchored
 * regular-expression builders -- and every control on all three is inert. `site/app.js`
 * binds none of their element ids, `site/build.mjs` copies six HTML pages and none of
 * these three, and no published page links to them, so they have no address on the
 * published site at all. Four scripts beside them (`full-builder.js`,
 * `history-delivery.js`, `release-manifest.js`, `changelog-data.js`) are referenced by no
 * page, by the build, or by `app.js`.
 *
 * None of that failed anything. The site's own contract tests read a hard-coded list of
 * the six published pages, so an orphan page is invisible to every absence claim they
 * make: `local-file-converter.test.mjs` could assert that no converter surface existed
 * anywhere in the markup while a complete converter surface sat in the same directory.
 * A published article described the site converter's queue states in the present tense.
 *
 * So the point of this script is not to forbid an orphan. It is to make an orphan a fact
 * somebody wrote down. The list below is hand-written, and the check fails in BOTH
 * directions: a file that becomes an orphan without being added here is a new dead
 * surface, and a file listed here that is no longer an orphan is a list that has gone
 * stale. A discovery-only check would pass on a directory of nothing but orphans.
 *
 *   node scripts/site-orphans.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'site');
const read = (name) => readFileSync(resolve(siteRoot, name), 'utf8').replaceAll('\r\n', '\n');

/**
 * The hand-written record. Each entry names the file and why it is unreachable, and both
 * halves are checked: `unreachable` is proved against the real tree, and the reason is
 * required to be present so a future entry cannot be added as a bare filename.
 */
const KNOWN_ORPHANS = [
  {
    file: 'converter.html',
    reason: 'local-file-converter markup from the 2026-08-23 demo lane. app.js binds none of its ids and build.mjs does not publish it. docs/platform/local-file-converter.md records the correction.',
  },
  {
    file: 'ollama.html',
    reason: 'ollama-suite-manager markup from the same demo lane, in the same state. docs/platform/ollama-suite-manager.md records the correction.',
  },
  {
    file: 'history.html',
    reason: 'delivery-history markup from the same demo lane, unwired and unpublished.',
  },
  { file: 'full-builder.js', reason: 'referenced by no page, by build.mjs, or by app.js.' },
  { file: 'history-delivery.js', reason: 'referenced by no page, by build.mjs, or by app.js.' },
  { file: 'release-manifest.js', reason: 'referenced by no page, by build.mjs, or by app.js.' },
  { file: 'changelog-data.js', reason: 'referenced by no page, by build.mjs, or by app.js.' },
];

/** The pages `site/build.mjs` actually copies, read from the build rather than restated here. */
function publishedAssets() {
  const build = read('build.mjs');
  const declaration = build.match(/^const assets = \[([^\]]*)\];/mu);
  if (!declaration) throw new Error('site/build.mjs no longer declares `const assets = [...]`; this check cannot tell what is published');
  const names = [...declaration[1].matchAll(/'([^']+)'/gu)].map((match) => match[1]);
  if (names.length === 0) throw new Error('site/build.mjs declares an empty asset list, so every page would read as an orphan');
  return names;
}

/**
 * A file is reachable when the build copies it, or when something the build copies names
 * it. Two hops is enough for this tree and no more is claimed: a page published by the
 * build, or `app.js`, naming the file is what makes it reachable.
 */
function reachableFiles() {
  const published = publishedAssets();
  const reachable = new Set(published);
  const sources = published.map((name) => ({ name, text: read(name) }));
  for (const { name, text } of sources) {
    for (const candidate of siteFiles()) {
      if (candidate === name) continue;
      /* Word-bounded on the left so `app.js` cannot be matched by `some-app.js`, and the
       * literal dot escaped so `appXjs` is not a hit. */
      const needle = new RegExp(`(^|[^\\w./-])${candidate.replace(/[.]/gu, '[.]')}`, 'u');
      if (needle.test(text)) reachable.add(candidate);
    }
  }
  return reachable;
}

/** Top-level `.html` and `.js` files in `site/`. Directories are out of scope for this check. */
function siteFiles() {
  return readdirSync(siteRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /[.](?:html|js|mjs)$/u.test(entry.name))
    .map((entry) => entry.name)
    /* build.mjs is the thing doing the publishing; asking whether it is published is not
     * a question with an answer. */
    .filter((name) => name !== 'build.mjs' && name !== 'generate-changelog.mjs');
}

const files = siteFiles();
if (files.length === 0) throw new Error('no site files were found at all, so every check below would pass vacuously');

const reachable = reachableFiles();
const actualOrphans = files.filter((name) => !reachable.has(name)).sort();
const recordedOrphans = KNOWN_ORPHANS.map((entry) => entry.file).sort();

const problems = [];

for (const entry of KNOWN_ORPHANS) {
  if (!entry.reason || entry.reason.length < 20) {
    problems.push(`${entry.file} is recorded as an orphan with no real reason beside it`);
  }
  if (!files.includes(entry.file)) {
    problems.push(`${entry.file} is recorded as an orphan but no longer exists in site/; remove the entry`);
  }
}

for (const name of actualOrphans) {
  if (!recordedOrphans.includes(name)) {
    problems.push(`site/${name} is reachable from nothing -- not from a published page, not from app.js, and build.mjs does not publish it. Either wire it and publish it, or record it in KNOWN_ORPHANS with the reason.`);
  }
}

for (const name of recordedOrphans) {
  if (files.includes(name) && !actualOrphans.includes(name)) {
    problems.push(`site/${name} is recorded as an orphan and is now reachable. Remove it from KNOWN_ORPHANS -- a stale list is how the next real orphan gets waved through.`);
  }
}

if (problems.length > 0) {
  for (const problem of problems) console.error(`site-orphans: ${problem}`);
  process.exit(1);
}

console.log(`site-orphans: ${files.length} site files, ${actualOrphans.length} unreachable and all ${actualOrphans.length} recorded.`);
