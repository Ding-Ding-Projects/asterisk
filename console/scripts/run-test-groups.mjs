#!/usr/bin/env node
/**
 * Runs every test group and reports all of them, instead of stopping at the first red.
 *
 * `npm test` used to be a `&&` chain of eleven groups. That reads as a reasonable thing
 * to write and it hides work: one stale anchor in the fourth group meant the seven groups
 * after it never ran at all, and the exit code said "1" either way. Measured on this
 * repository on 2026-08-27, a single failing assertion in `tests/contracts` was concealing
 * thirty-three failing site contracts, a `test:inventories` group that could not get past
 * its own first command, and several real defects underneath that. Nobody was hiding
 * anything; the chain was.
 *
 * So every group runs, every group's own verdict is printed, and the summary at the end
 * names each one. The exit code is still a single bit -- what changes is that a red run
 * now tells you how much is red.
 *
 * It deliberately does NOT keep a hand-written list of groups. The argument list must be
 * exactly the set of `test:*` scripts in package.json: a group added and never run is the
 * failure this file exists to stop, and a hand-written list is the classic way to
 * reintroduce it.
 */
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Every `test:*` script the package declares, in declaration order. */
export function declaredGroups(pkg) {
  return Object.keys(pkg.scripts ?? {})
    .filter((name) => name.startsWith('test:'))
    .map((name) => name.slice('test:'.length));
}

/**
 * The requested groups, refused unless they are exactly the declared ones.
 *
 * Both directions matter and they fail for different reasons. A requested group that is
 * not declared would run nothing; a declared group that is not requested is a suite
 * nobody runs, which is the same defect one layer up from the one this file fixes.
 */
export function resolveGroups(pkg, requested) {
  const declared = declaredGroups(pkg);
  if (declared.length === 0) throw new Error('package.json declares no test:* scripts at all, so this runner would run nothing');
  if (requested.length === 0) throw new Error('no test groups were requested, so this runner would run nothing');
  const missing = declared.filter((name) => !requested.includes(name));
  const unknown = requested.filter((name) => !declared.includes(name));
  if (unknown.length) throw new Error(`these groups are not declared as test:* scripts: ${unknown.join(', ')}`);
  if (missing.length) throw new Error(`these declared test:* groups are not in the npm test list, so nothing runs them: ${missing.join(', ')}`);
  return requested;
}

/** The last TAP total of each kind, when the group emitted any. */
export function tapTotals(output) {
  const read = (label) => {
    const matches = [...String(output).matchAll(new RegExp(`^# ${label} (\\d+)$`, 'gmu'))];
    if (matches.length === 0) return null;
    return matches.reduce((total, match) => total + Number(match[1]), 0);
  };
  return { tests: read('tests'), pass: read('pass'), fail: read('fail') };
}

/**
 * The whole verdict, as a pure function of what the groups did.
 *
 * Kept separate from the running so it can be proved with fabricated results. A summary
 * that reported green for an empty run would be the worst possible defect in a file whose
 * entire purpose is to stop a red run reading as a clean one, so that case is refused
 * outright rather than trusted to never happen.
 */
export function summarise(results) {
  if (!Array.isArray(results) || results.length === 0) {
    return { ok: false, failed: [], lines: ['no test group reported a result at all'] };
  }
  const failed = results.filter((result) => result.code !== 0).map((result) => result.group);
  const lines = results.map((result) => {
    const totals = result.totals ?? {};
    const counts = totals.tests === null || totals.tests === undefined
      ? 'no TAP totals'
      : `${totals.pass ?? 0}/${totals.tests} passed, ${totals.fail ?? 0} failed`;
    return `${result.code === 0 ? 'PASS' : 'FAIL'}  ${result.group.padEnd(16)} exit ${result.code}  ${counts}  ${result.seconds}s`;
  });
  return { ok: failed.length === 0, failed, lines };
}

function runGroup(group) {
  return new Promise((done) => {
    const started = Date.now();
    const child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', `test:${group}`], {
      cwd: packageRoot,
      shell: process.platform === 'win32',
      stdio: ['inherit', 'pipe', 'pipe'],
    });
    let output = '';
    /* Forwarded as it arrives as well as accumulated: a group that takes ten minutes
     * should not look like a hang, and the totals still have to be read afterwards. */
    child.stdout.on('data', (chunk) => { output += chunk; process.stdout.write(chunk); });
    child.stderr.on('data', (chunk) => { output += chunk; process.stderr.write(chunk); });
    child.on('close', (code) => done({
      group,
      code: code ?? 1,
      totals: tapTotals(output),
      seconds: Math.round((Date.now() - started) / 100) / 10,
    }));
  });
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const pkg = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8'));
  const groups = resolveGroups(pkg, process.argv.slice(2));
  const results = [];
  for (const group of groups) {
    process.stdout.write(`\n===== test:${group}\n`);
    results.push(await runGroup(group));
  }
  const verdict = summarise(results);
  process.stdout.write(`\n===== summary\n${verdict.lines.join('\n')}\n`);
  if (!verdict.ok) {
    process.stdout.write(`\nFAILED GROUPS: ${verdict.failed.join(', ')}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write('\nEvery test group passed.\n');
  }
}
