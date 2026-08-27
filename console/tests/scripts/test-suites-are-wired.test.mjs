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

/**
 * The scripts `npm test` actually runs, followed one level deep.
 *
 * This used to split `pkg.scripts.test` on `&&`, because that is what the script was. It
 * is now a runner that takes the group names as arguments, so the names are read from the
 * argument list instead -- the property being checked is unchanged, only where the list is
 * written down. The runner itself refuses to start unless that list is exactly the set of
 * `test:*` scripts, which is the half a filesystem walk cannot see.
 */
const RUNNER = 'node scripts/run-test-groups.mjs ';
const requestedGroups = () => {
  const chain = pkg.scripts.test;
  assert.ok(typeof chain === 'string' && chain.length > 0, 'package.json has no test script');
  assert.ok(chain.startsWith(RUNNER),
    'npm test no longer goes through scripts/run-test-groups.mjs, so one failing group can again stop every group after it from running');
  return chain.slice(RUNNER.length).split(/\s+/u).filter(Boolean).map((name) => `test:${name}`);
};
const chainedCommands = () => {
  const names = requestedGroups();
  assert.ok(names.length > 1, 'the test script names fewer than two groups, so this check would pass vacuously');
  for (const name of names) assert.ok(pkg.scripts[name], `npm test asks for ${name}, which package.json does not declare`);
  return names.map((name) => pkg.scripts[name]).join(' ; ');
};

test('npm test runs every group rather than stopping at the first failure', () => {
  /* The defect this was written for: `npm test` was a `&&` chain, so one stale anchor in
   * the fourth group meant the seven groups after it never ran at all -- and the exit code
   * was 1 either way, so a single visible failure was concealing thirty-three more plus a
   * whole inventory group that could not get past its own first command. */
  assert.doesNotMatch(pkg.scripts.test, /&&/u,
    'npm test chains groups with && again, which stops every group after the first failure from running');
  const declared = Object.keys(pkg.scripts).filter((name) => name.startsWith('test:')).sort();
  assert.ok(declared.length > 1, 'fewer than two test:* scripts are declared, so this check would pass vacuously');
  assert.deepEqual(requestedGroups().slice().sort(), declared,
    'npm test does not name exactly the declared test:* groups, so a group is either never run or never declared');
});

test('every directory that holds tests is reached by the npm test chain', () => {
  const directories = testDirectories();
  assert.ok(directories.length > 0, 'no test directories were discovered, so this check would prove nothing');
  const commands = chainedCommands();
  const unreached = directories.filter((dir) => !commands.includes(dir + SLASH));
  assert.deepEqual(unreached, [],
    'these directories hold tests that npm test never runs: ' + unreached.join(', '));
});

test('every deliberate red-then-green script is actually chained by npm test', () => {
  /* The same failure one layer over: a `negative-*.mjs` that nothing runs gates nothing,
   * and is worse than not having it, because a script that is assumed to be running is one
   * nobody thinks to check. Derived from the filesystem for the same reason the directory
   * walk above is -- a hand-written list cannot catch a script that was never added to it,
   * which is exactly the failure this is here to stop. */
  const scripts = readdirSync(resolve(root, 'scripts'))
    .filter((entry) => entry.startsWith('negative-') && entry.endsWith('.mjs'))
    .sort();
  assert.ok(scripts.length > 0, 'no negative scripts were discovered, so this check would prove nothing');
  const commands = chainedCommands();
  const unreached = scripts.filter((entry) => !commands.includes('scripts/' + entry));
  assert.deepEqual(unreached, [],
    'these deliberate-break scripts are never run by npm test: ' + unreached.join(', '));
});

test('the discovery finds the directories it is supposed to, so it cannot pass by finding nothing', () => {
  /* A guard whose scan silently returns an empty set reports clean forever. These three
   * are named so that a rename which empties the walk fails here rather than passing. */
  const directories = testDirectories();
  for (const expected of ['tests/contracts', 'tests/ui', 'site/tests/contracts']) {
    assert.ok(directories.includes(expected), 'the walk no longer finds ' + expected);
  }
});
