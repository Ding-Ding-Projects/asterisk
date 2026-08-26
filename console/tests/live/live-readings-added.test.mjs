/**
 * The ledger section that records commands allowlisted after the fixture-and-restore run.
 *
 * `checkLedger` requires every allowlisted command to have a capture, which is right: a
 * command added later is one nothing has ever run against a target, and without that
 * requirement the ledger's headline count would go on claiming all of them were covered.
 * `commandsAllowlistedAfterThisRun` is the other honest answer to that requirement -- a
 * command gets its own run, its own captures and its own provenance, recorded apart from a
 * phase it was never part of rather than backdated into one.
 *
 * A mechanism that satisfies a coverage check is a mechanism that can become a hole in it,
 * so what is tested here is mostly the refusals.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  COMMANDS_ALLOWLISTED_AFTER_THE_RUN,
  CAPTURE_DIRECTORY,
  LEDGER_PATH,
  checkLedger,
  sha256,
} from '../../scripts/live-readings.mjs';
import { READ_ONLY_COMMANDS } from '../../control-plane/asterisk-readings.ts';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const readCapture = (path) => readFileSync(join(CAPTURE_DIRECTORY, path), 'utf8');
const ledger = () => JSON.parse(readFileSync(LEDGER_PATH, 'utf8'));
/** Structured clone so a mutation in one test cannot reach another. */
const damaged = (mutate) => {
  const copy = ledger();
  mutate(copy);
  return copy;
};

test('the committed ledger passes its own check', () => {
  assert.deepEqual(checkLedger(ledger(), readCapture), []);
});

test('every declared command is in the allowlist and recorded in the ledger', () => {
  assert.ok(COMMANDS_ALLOWLISTED_AFTER_THE_RUN.length > 0,
    'nothing is declared, so every assertion below would pass by finding nothing');
  const allowlisted = new Set(READ_ONLY_COMMANDS);
  const recorded = new Set(ledger().commandsAllowlistedAfterThisRun.map((r) => r.command));
  for (const entry of COMMANDS_ALLOWLISTED_AFTER_THE_RUN) {
    assert.ok(allowlisted.has(entry.command), `${entry.command} is declared but not allowlisted`);
    assert.ok(recorded.has(entry.command), `${entry.command} is declared but the ledger records no run of it`);
  }
});

test('a record for a command no longer in the allowlist is refused', () => {
  /* The one way this section could quietly become a hole: a stale row satisfying coverage
   * for a command nobody runs any more. */
  const gone = 'sip show peers';
  assert.ok(!new Set(READ_ONLY_COMMANDS).has(gone),
    `${gone} is allowlisted after all, so this test would prove nothing`);
  const problems = checkLedger(damaged((l) => {
    l.commandsAllowlistedAfterThisRun[0].command = gone;
  }), readCapture);
  assert.ok(problems.some((p) => /no longer in the allowlist/u.test(p)), problems.join('; '));
});

test('a record for an allowlisted command nothing declares is refused', () => {
  /* The neighbouring branch, and a different failure: the command is real and allowlisted,
   * but nothing in the source says why it is recorded outside the phases -- so the row is a
   * bare assertion rather than evidence. */
  const problems = checkLedger(damaged((l) => {
    l.commandsAllowlistedAfterThisRun[0].command = 'core show version';
  }), readCapture);
  assert.ok(problems.some((p) => /is not declared in COMMANDS_ALLOWLISTED_AFTER_THE_RUN/u.test(p)), problems.join('; '));
});

test('a record with no reason is refused', () => {
  const problems = checkLedger(damaged((l) => {
    delete l.commandsAllowlistedAfterThisRun[0].reason;
  }), readCapture);
  assert.ok(problems.some((p) => /records no reason/u.test(p)), problems.join('; '));
});

test('a record that does not say which commit it ran from is refused', () => {
  const problems = checkLedger(damaged((l) => {
    delete l.commandsAllowlistedAfterThisRun[0].runFromCommit;
  }), readCapture);
  assert.ok(problems.some((p) => /does not say which commit/u.test(p)), problems.join('; '));
});

test('a record with no captures at all is refused', () => {
  /* Otherwise a row could satisfy coverage while nothing was ever run against a target,
   * which is precisely the state the coverage check exists to catch. */
  const problems = checkLedger(damaged((l) => {
    l.commandsAllowlistedAfterThisRun[0].captures = {};
  }), readCapture);
  assert.ok(problems.some((p) => /records no capture at all/u.test(p)), problems.join('; '));
});

test('a capture whose recorded hash stops matching its bytes is refused', () => {
  const problems = checkLedger(damaged((l) => {
    l.commandsAllowlistedAfterThisRun[0].captures.populated.stdoutSha256 = sha256('not these bytes');
  }), readCapture);
  assert.ok(problems.some((p) => /hashes .* recorded/u.test(p)), problems.join('; '));
});

test('a capture whose parse digest stops matching is refused', () => {
  /* This is what turns the suite red when a parser moves after a capture was taken, rather
   * than leaving a stale claim standing. */
  const problems = checkLedger(damaged((l) => {
    l.commandsAllowlistedAfterThisRun[0].captures.populated.parsedSha256 = sha256('stale');
  }), readCapture);
  assert.ok(problems.some((p) => /now digests/u.test(p)), problems.join('; '));
});

test('a claimed restore that the committed bytes do not show is refused', () => {
  const problems = checkLedger(damaged((l) => {
    l.commandsAllowlistedAfterThisRun[0].captures.afterRestore.stdoutSha256 = sha256('different');
  }), readCapture);
  assert.ok(problems.some((p) => /the subsystem was not put back|hashes .* recorded/u.test(p)), problems.join('; '));
});

test('a declared command the ledger never ran is refused', () => {
  const problems = checkLedger(damaged((l) => {
    l.commandsAllowlistedAfterThisRun = [];
  }), readCapture);
  assert.ok(problems.some((p) => /the ledger records no run of it/u.test(p)), problems.join('; '));
  /* And the allowlist coverage check goes red too, which is the failure that matters: with
   * no record the command has no capture in either phase. */
  assert.ok(problems.some((p) => /has no capture/u.test(p)), problems.join('; '));
});

test('the harness refuses a populate that changed nothing', () => {
  /* Asserted on the source rather than by running a populate, which needs a live target.
   * It earned its place: the first `--capture-added` run wrote three identical captures of
   * an empty listing because the perl payload had been mangled in transit, and the restore
   * proof passed -- after-restore trivially equals before-populate when the populate did
   * nothing. A proof whose condition cannot be violated is not a proof. */
  const source = readFileSync(join(root, 'scripts', 'live-readings.mjs'), 'utf8').replace(/\r/gu, '');
  assert.ok(source.length > 1000, 'live-readings.mjs was not read');
  assert.match(source, /^\s*if \(captures\.populated\.stdoutSha256 === captures\.unpopulated\.stdoutSha256\) \{$/mu);
});

test('the recorded run has a populated state with more rows than its empty one', () => {
  /* The claim the whole section is for. A command verified only against an empty subsystem
   * proves the command runs and proves nothing about the parser. */
  const record = ledger().commandsAllowlistedAfterThisRun
    .find((r) => r.command === 'media cache show all');
  assert.ok(record, 'the media cache run is not in the ledger');
  assert.equal(record.captures.unpopulated.rows, 0);
  assert.ok(record.captures.populated.rows > 0, 'the populated capture has no rows');
  assert.equal(record.captures.afterRestore.rows, 0);
  assert.equal(record.restored, true);
});
