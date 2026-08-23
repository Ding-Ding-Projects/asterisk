import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';

const root = resolve(import.meta.dirname, '..', '..', '..');

/**
 * Terms that must never appear in a shipped or published surface.
 *
 * This list is hand-written on purpose. A rule that merely checks the terms it can
 * already find passes cleanly on a file that has none, so it can never notice a term
 * arriving later; only an explicit list can. Every entry is matched case-insensitively
 * as a whole word or phrase.
 *
 * The point is not tidiness. This repository is public, the design reference is
 * committed, and the compiler carries the reference's copy verbatim into the packaged
 * application and from there into every published installer. A term that reaches the
 * reference reaches users.
 */
const FORBIDDEN = [
  'gerk tong hui', 'lap sap tong', 'poke guy', 'jerjer', 'mat day', 'day teet hui',
  'herng ha yern geen', 'yern geen', 'chicken ai', 'oak kay', 'fay gay', 'sai shee ghan',
  'cheap version', 'shek q', 'chong leung', 'da geep', 'ultrahui', 'githui', 'deen no',
  'deen wah', 'yere dow', 'pow gook', 'lang gui', 'swiftie', 'see fut', 'huishot',
  'huipoint', 'fong dook', 'bay cheen', 'fow shan yow hay', 'dhan go', 'tow fat',
  'cup chun', 'bang dook', 'mo cheen', 'fat dat', 'huikey', 'huiflare', 'dew hui',
  'dewed hui', 'i am dewing hui', 'hong kong dim sum', 'yum tong', 'yum leung cha',
  'fun gow', 'baby pig', 'ahsook', 'heapandyville',
];

/* Surfaces that ship or publish. The design reference is included because the
 * compiler copies its text into the renderer verbatim. */
const SCANNED = [
  'design',
  'console/app',
  'console/site',
  'console/shared',
  'console/control-plane',
];

const TEXT = new Set(['.ts', '.tsx', '.js', '.mjs', '.css', '.html', '.json', '.md']);
const SKIP = new Set(['node_modules', 'dist', 'dist-electron', 'release', 'uploads', '.git']);

function walk(dir, found = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) { walk(path, found); continue; }
    if (TEXT.has(extname(entry))) found.push(path);
  }
  return found;
}

export function scanForPrivateVocabulary(files, read = (path) => readFileSync(path, 'utf8')) {
  const hits = [];
  for (const path of files) {
    const lower = read(path, 'utf8').toLowerCase();
    for (const term of FORBIDDEN) {
      if (lower.includes(term)) hits.push(`${path}: ${term}`);
    }
  }
  return hits;
}

test('no shipped or published surface contains a private vocabulary term', () => {
  const files = SCANNED.flatMap((relative) => walk(resolve(root, relative)));
  /* Tripwire, not a target. The five scanned trees hold 41 text files today; if a walk
   * silently stops descending, the scan would pass by looking at almost nothing, which
   * is the failure mode this whole check exists to avoid. */
  assert.ok(files.length >= 35, `the walk collapsed: expected to scan the whole tree, scanned only ${files.length}`);
  const hits = scanForPrivateVocabulary(files);
  assert.deepEqual(hits, [], `private vocabulary reached a shipped surface:\n  ${hits.join('\n  ')}`);
});

test('negative regression: a planted term turns the scan red', () => {
  const planted = scanForPrivateVocabulary(['pretend.ts'], () => 'const label = "Local Yere Dow";');
  assert.equal(planted.length, 1, 'the scan failed to notice a planted term');
  assert.match(planted[0], /yere dow/u);
});

test('negative regression: ordinary copy stays green', () => {
  const clean = scanForPrivateVocabulary(['pretend.ts'], () => 'const label = "Local Docker container";');
  assert.deepEqual(clean, [], 'the scan flags ordinary wording, so it refuses everything rather than refusing leaks');
});
