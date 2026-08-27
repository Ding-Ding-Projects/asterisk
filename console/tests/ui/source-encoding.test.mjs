import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';

const root = resolve(import.meta.dirname, '..', '..');

/**
 * Every source file must be valid UTF-8, and must not carry the wreckage of having been
 * decoded as something else.
 *
 * Both halves were earned the hard way in one sitting. An edit written through a tool
 * that defaulted to the platform's legacy code page turned a single ellipsis into one
 * byte no UTF-8 reader accepts, and the bundler refused the whole module - naming the
 * *importing* file, not the unreadable one, which sends the search to the wrong place.
 *
 * The repair was then worse than the fault. Re-encoding the whole file as UTF-8 assumed
 * every byte in it was legacy, so every character that had been perfectly correct got
 * encoded a second time, and every dash and ellipsis turned into three stray letters.
 * That version built cleanly, passed every test, and put mojibake on screen - which is
 * precisely why a valid-UTF-8 check alone would not have caught it.
 */
const SCANNED = ['app', 'control-plane', 'shared', 'site', 'scripts', 'tests'];
const TEXT = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.css', '.html', '.json', '.md']);
const SKIP = new Set(['node_modules', 'dist', 'dist-electron', 'release', 'uploads', '.git']);

/** The printable half of Windows-1252 that does not agree with Latin-1. */
const CP1252_HIGH = {
  0x80: 0x20ac, 0x82: 0x201a, 0x83: 0x0192, 0x84: 0x201e, 0x85: 0x2026, 0x86: 0x2020,
  0x87: 0x2021, 0x88: 0x02c6, 0x89: 0x2030, 0x8a: 0x0160, 0x8b: 0x2039, 0x8c: 0x0152,
  0x8e: 0x017d, 0x91: 0x2018, 0x92: 0x2019, 0x93: 0x201c, 0x94: 0x201d, 0x95: 0x2022,
  0x96: 0x2013, 0x97: 0x2014, 0x98: 0x02dc, 0x99: 0x2122, 0x9a: 0x0161, 0x9b: 0x203a,
  0x9c: 0x0153, 0x9e: 0x017e, 0x9f: 0x0178,
};

/**
 * What one character looks like after the round trip this check exists to catch.
 *
 * Derived rather than written out: a file that spelled these sequences literally would
 * be flagged by its own check, and excluding it would leave exactly the hole the check
 * is for.
 */
const asLegacy = (character) =>
  Array.from(new TextEncoder().encode(character))
    .map((byte) => String.fromCharCode(CP1252_HIGH[byte] ?? byte))
    .join('');

/** Characters common enough here that their corrupted form is worth naming. */
const MOJIBAKE = ['—', '–', '…', '“', '’', '·', ' '].map(asLegacy);

function walk(dir, found = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) { walk(path, found); continue; }
    if (TEXT.has(extname(entry))) found.push(path);
  }
  return found;
}

/** Everything below space except the three that legitimately appear in source. */
const CONTROL_CHARACTERS = new RegExp(
  /* Built from code points rather than written as a literal: an escape in a regex
   * literal has to survive every layer between the editor and the file, and the
   * first version of this line arrived with real control characters in it -- the
   * exact corruption it exists to catch. */
  '[' + [[0, 8], [11, 12], [14, 31], [127, 127]]
    .map(([from, to]) => String.fromCharCode(from) + '-' + String.fromCharCode(to))
    .join('') + ']',
  'u',
);

export function scanEncoding(files, read = (path) => readFileSync(path)) {
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const faults = [];
  for (const path of files) {
    let text;
    try {
      text = decoder.decode(read(path));
    } catch {
      faults.push(`${path}: not valid UTF-8`);
      continue;
    }
    for (const sequence of MOJIBAKE) {
      if (text.includes(sequence)) faults.push(`${path}: contains re-encoded text`);
    }
    /* A stray control character is valid UTF-8, so the decode above passes and the
     * mojibake scan sees nothing. It survived into a source file in this repository: a
     * NUL landed where a separator should have been, TypeScript compiled it, the tests
     * went green, and the only symptom was grep reporting the file as binary. Anything
     * below space that is not tab, newline or carriage return has no business in source. */
    const control = text.match(CONTROL_CHARACTERS);
    if (control) {
      const at = text.indexOf(control[0]);
      const line = text.slice(0, at).split(String.fromCharCode(10)).length;
      faults.push(`${path}: control character U+${control[0].codePointAt(0).toString(16).padStart(4, '0').toUpperCase()} at line ${line}`);
    }
  }
  return faults;
}

test('every source file is valid UTF-8 and free of re-encoded text', () => {
  const files = SCANNED.flatMap((relative) => walk(resolve(root, relative)));
  /* Tripwire: a walk that silently stopped descending would pass by scanning almost
   * nothing, which is the failure this check exists to prevent. */
  assert.ok(files.length >= 100, `the walk collapsed: scanned only ${files.length} files`);
  assert.deepEqual(scanEncoding(files), []);
});

test('negative regression: a stray legacy byte turns the scan red', () => {
  /* 0x85 is an ellipsis in Windows-1252 and an invalid standalone byte in UTF-8 - the
   * exact byte that broke the build. */
  const planted = scanEncoding(['pretend.ts'], () => new Uint8Array([0x27, 0x68, 0x69, 0x85, 0x27]));
  assert.equal(planted.length, 1);
  assert.match(planted[0], /not valid UTF-8/u);
});

test('negative regression: double-encoded text turns the scan red although it is valid UTF-8', () => {
  const planted = scanEncoding(['pretend.ts'], () =>
    Buffer.from(`const dash = "${asLegacy('—')} oops";`, 'utf8'));
  assert.equal(planted.length, 1, 'mojibake passed as acceptable because the bytes decode cleanly');
  assert.match(planted[0], /re-encoded text/u);
});

test('a control character is caught although the bytes are valid UTF-8', () => {
  /* The decode succeeds and the mojibake scan finds nothing, which is exactly why this
   * needed its own check rather than being assumed covered by the two above. */
  const planted = scanEncoding(['pretend.ts'], () =>
    Buffer.from(`const key = \`a${String.fromCharCode(0)}b\`;`, 'utf8'));
  assert.equal(planted.length, 1, 'a NUL passed as acceptable source');
  assert.match(planted[0], /control character U\+0000 at line 1/u);
});

test('tab, newline and carriage return are not treated as control characters', () => {
  /* All three are ordinary in source, and a check that rejected them would fail on every
   * file in the repository. */
  const CR = String.fromCharCode(13);
  const LF = String.fromCharCode(10);
  const TAB = String.fromCharCode(9);
  const planted = scanEncoding(['pretend.ts'], () =>
    Buffer.from(`const a = 1;${CR}${LF}${TAB}const b = 2;${LF}`, 'utf8'));
  assert.deepEqual(planted, []);
});

test('negative regression: ordinary correct text stays green', () => {
  const planted = scanEncoding(['pretend.ts'], () =>
    Buffer.from('const dash = "— fine"; // 蝦餃', 'utf8'));
  assert.deepEqual(planted, [], 'the scan rejects correct text, so it refuses everything rather than refusing faults');
});
