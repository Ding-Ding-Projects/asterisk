#!/usr/bin/env node
/**
 * Deliberate red-then-green regression for the live-reading verification.
 *
 * Each break below removes exactly ONE guarded thing, runs the checks that are supposed to
 * notice, and requires them to fail; then restores it and requires them to pass. Breaking
 * several at once proves only that *something* among them is watched, which is how a guard
 * ends up watching nothing while the pass count looks identical either way.
 *
 * Three traps this guards itself against, all of which have cost this repository real time:
 *
 *  - **A break that never landed.** Every replacement asserts the file's bytes actually
 *    changed. An edit that matched nothing reports success and changes nothing, and "no
 *    effect" then looks exactly like a passing guard.
 *  - **A restore that never landed.** Every restore asserts the file is byte-identical to
 *    what it was before, so a later break cannot run against a tree the previous one damaged.
 *  - **A needle a comment satisfies.** Several breaks below comment the guarded line out
 *    rather than deleting it, because that is how a line usually dies and a substring needle
 *    is perfectly happy with one.
 *
 *     node console/scripts/negative-live-readings.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const TESTS = 'tests/live/live-readings.test.mjs';
const HARNESS = 'scripts/live-readings.mjs';
const LEDGER = 'release/evidence/live-exchange/readings.json';
const CAPTURE = 'release/evidence/live-exchange/readings/populated/pjsip-show-endpoints.txt';

/** `--check` alone, so a break that only the re-derivation can see is proved by it alone. */
const CHECK = { kind: 'check' };
/** The test group, for the coverage and honesty guards `--check` structurally cannot make. */
const SUITE = { kind: 'suite' };

/** @type {Array<{name: string, file: string, find: string, replace: string, proves: Array<{kind: string}>}>} */
const BREAKS = [
  {
    name: 'the readings table loses a parser the product still exports',
    file: HARNESS,
    find: "  { id: 'aclRules', command: 'acl show', parser: parseAclRules,",
    replace: "  { id: 'removedOnPurpose', command: 'acl show', parser: (text) => [text],",
    proves: [SUITE, CHECK],
  },
  {
    name: 'a reading stops naming the screens that consume it',
    file: HARNESS,
    find: "entry: 'AsteriskReadings.queues', screens: ['dashboard', 'queues'] }",
    replace: "entry: 'AsteriskReadings.queues', screens: [] }",
    proves: [SUITE],
  },
  /* These two are written as damage to the LEDGER rather than as damage to the guard, and the
   * distinction cost a round to learn. Commenting out `if (!recorded.has(command))` left both
   * checks green -- not because nothing watches that line, but because every command did have
   * a capture, so the condition it guards was not violated and there was nothing for it to
   * find. A break that removes a guard whose condition currently holds can never go red, and
   * it reads exactly like a guard that is watched. Violate the condition instead. */
  {
    name: 'the ledger loses the capture for an allowlisted command',
    file: LEDGER,
    find: '"command": "acl show",',
    replace: '"command": "acl show but renamed",',
    proves: [CHECK, SUITE],
  },
  {
    name: 'a recorded capture hash stops matching the bytes on disk',
    file: LEDGER,
    find: '"stdoutSha256": "',
    replace: '"stdoutSha256": "0000',
    proves: [CHECK, SUITE],
  },
  {
    name: 'an empty reading stops having to be one the harness declares unpopulatable',
    file: HARNESS,
    find: "      if (!(id in NOT_POPULATABLE)) problems.push(`The reading \\`${id}\\` returned no rows against a populated exchange and is not one this harness declares unpopulatable.`);",
    replace: "      if (false) problems.push(`The reading \\`${id}\\` returned no rows against a populated exchange and is not one this harness declares unpopulatable.`);",
    proves: [SUITE],
  },
  {
    name: 'the restore stops having to be proved',
    file: HARNESS,
    find: "  if (ledger.restore?.everyFileIdentical !== true) {",
    replace: "  if (false) {",
    proves: [SUITE],
  },
  {
    name: 'the fixture asks for two sections of one name, which the write path collapses',
    file: HARNESS,
    find: "      { name: `${FIXTURE_ENDPOINT}-aor`, entries: [e('type', 'aor')",
    replace: "      { name: FIXTURE_ENDPOINT, entries: [e('type', 'aor')",
    proves: [SUITE],
  },
  {
    name: 'the fixture stops writing the arrow separator the transport used to corrupt',
    file: HARNESS,
    find: "e('register', 'ding-live-probe:this-is-not-a-real-secret@127.0.0.1', '=>')",
    replace: "e('register', 'ding-live-probe:this-is-not-a-real-secret@127.0.0.1')",
    proves: [SUITE],
  },
  {
    name: 'the ledger loses a reading record',
    file: LEDGER,
    find: '"id": "iaxPeers",',
    replace: '"id": "iaxPeersRenamed",',
    proves: [CHECK, SUITE],
  },
  {
    name: 'a committed capture is altered after the fact',
    file: CAPTURE,
    find: 'Objects found: 1',
    replace: 'Objects found: 9',
    proves: [CHECK, SUITE],
  },
  {
    name: 'the ledger claims a reading was parsed by a function it was not',
    file: LEDGER,
    find: '"parser": "parseModules",',
    replace: '"parser": "parseModulesRenamed",',
    proves: [CHECK, SUITE],
  },
  {
    name: 'the ledger empties the honesty section',
    file: LEDGER,
    find: '"notVerified": [',
    replace: '"notVerifiedRenamed": [',
    proves: [SUITE],
  },
];

function run(step) {
  if (step.kind === 'check') {
    return spawnSync('npx', ['tsx', 'scripts/live-readings.mjs', '--check'], { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' });
  }
  return spawnSync('npx', ['tsx', '--test', TESTS], { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' });
}

function label(step) {
  return step.kind === 'check' ? 'live-readings --check' : TESTS;
}

let failures = 0;
for (const planted of BREAKS) {
  const path = resolve(root, planted.file);
  const original = readFileSync(path, 'utf8');

  /* Split on the newline alone. Several of these files are checked out with CRLF on this
   * platform, and a needle written with \n matches nothing in one -- which reports success,
   * changes no bytes, and reads exactly like a guard that passed. */
  if (!original.includes(planted.find)) {
    console.error(`  the needle for "${planted.name}" is not in ${planted.file}; the break could not be planted`);
    failures += 1;
    continue;
  }
  const damaged = original.replace(planted.find, planted.replace);
  if (damaged === original) {
    console.error(`  planting "${planted.name}" changed no bytes`);
    failures += 1;
    continue;
  }
  writeFileSync(path, damaged, 'utf8');

  try {
    for (const step of planted.proves) {
      const result = run(step);
      if (result.status === 0) {
        console.error(`  RED EXPECTED: "${planted.name}" left ${label(step)} passing`);
        failures += 1;
      } else {
        console.log(`  red  ${label(step)} -- ${planted.name}`);
      }
    }
  } finally {
    writeFileSync(path, original, 'utf8');
    if (readFileSync(path, 'utf8') !== original) {
      console.error(`  the restore of ${planted.file} did not land`);
      failures += 1;
    }
  }

  for (const step of planted.proves) {
    const result = run(step);
    if (result.status !== 0) {
      console.error(`  GREEN EXPECTED: ${label(step)} still fails after restoring "${planted.name}"`);
      console.error(result.stdout?.split('\n').filter((line) => line.startsWith('not ok')).slice(0, 4).join('\n'));
      failures += 1;
    }
  }
}

if (failures > 0) {
  console.error(`negative-live-readings: ${failures} problem(s)`);
  process.exit(1);
}
console.log(`negative-live-readings: ${BREAKS.length} breaks each planted alone, each went red, each restored green.`);
