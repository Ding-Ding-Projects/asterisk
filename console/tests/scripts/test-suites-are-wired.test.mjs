/**
 * Contract: every directory of tests is actually run by `npm test`.
 *
 * This exists because 44 files holding 249 assertions sat in `site/tests/contracts/`
 * for some time without being run by anything. They were written carefully, they passed
 * when invoked by hand, and they gated nothing -- which is worse than not having them,
 * because a suite that is assumed to be running is one nobody thinks to check.
 *
 * Deliberately derived from the filesystem rather than from a hand-written list. A list
 * only ever catches a suite being done wrongly; it cannot catch one that was never added
 * to the list in the first place, which is exactly the failure that happened here. So the
 * directories are discovered, and the script chain has to account for every one of them.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, relative } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SLASH = String.fromCharCode(47);
const BACKSLASH = String.fromCharCode(92);
const posix = (p) => p.split(BACKSLASH).join(SLASH);

const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

/** Every directory under the package that directly contains a test file. */
const testDirectories = () => {
  const found = new Set();
  const skip = new Set(['node_modules', 'dist', 'dist-electron', 'release', '.git', 'resources']);
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      if (skip.has(entry)) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) { walk(full); continue; }
      if (entry.endsWith('.test.mjs') || entry.endsWith('.test.ts') || entry.endsWith('.test.tsx')) {
        found.add(posix(relative(root, dir)));
      }
    }
  };
  walk(root);
  return [...found].sort();
};

/** The scripts `npm test` actually chains, followed one level deep. */
const chainedCommands = () => {
  const chain = pkg.scripts.test;
  assert.ok(typeof chain === 'string' && chain.length > 0, 'package.json has no test script');
  const names = chain.split('&&').map((part) => part.trim().replace('npm run ', '')).filter(Boolean);
  assert.ok(names.length > 1, 'the test script chains nothing, so this check would pass vacuously');
  return names.map((name) => pkg.scripts[name]).filter(Boolean).join(' ; ');
};

test('every directory that holds tests is reached by the npm test chain', () => {
  const directories = testDirectories();
  assert.ok(directories.length > 0, 'no test directories were discovered, so this check would prove nothing');
  const commands = chainedCommands();
  const unreached = directories.filter((dir) => !commands.includes(dir + SLASH));
  assert.deepEqual(unreached, [],
    'these directories hold tests that npm test never runs: ' + unreached.join(', '));
});

test('the discovery finds the directories it is supposed to, so it cannot pass by finding nothing', () => {
  /* A guard whose scan silently returns an empty set reports clean forever. These three
   * are named so that a rename which empties the walk fails here rather than passing. */
  const directories = testDirectories();
  for (const expected of ['tests/contracts', 'tests/ui', 'site/tests/contracts']) {
    assert.ok(directories.includes(expected), 'the walk no longer finds ' + expected);
  }
});
