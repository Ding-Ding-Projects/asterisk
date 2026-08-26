/**
 * Guards on the live-reading verification and the ledger it produced.
 *
 * The point of separation here: `--check` re-derives what the committed captures parse to,
 * and these tests guard the things `--check` structurally cannot -- that the hand-written
 * `READINGS` table still covers every parser and every gateway-backed reader the product
 * has, that the evidence on disk is actually there, and that the ledger's honesty fields
 * have not been quietly emptied. A rule-shaped check passes on a table that lost a row; only
 * a comparison against the product's own exports can fail for that.
 */
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  CAPTURE_DIRECTORY,
  LEDGER_PATH,
  MOVES_BETWEEN_READS,
  NOT_POPULATABLE,
  READINGS,
  canonical,
  capturesOnDisk,
  checkLedger,
  classify,
  fixtureSections,
  mergeFixture,
  reparseLedger,
  sha256,
  slug,
} from '../../scripts/live-readings.mjs';
import { READ_ONLY_COMMANDS } from '../../control-plane/asterisk-readings.js';
import * as parsers from '../../control-plane/asterisk-parsers.js';
import * as readingsModule from '../../control-plane/asterisk-readings.js';

const ledger = JSON.parse(readFileSync(LEDGER_PATH, 'utf8'));

test('every parser the product exports is exercised by a reading', () => {
  const exercised = new Set(READINGS.map((reading) => reading.parser.name));
  const exported = Object.entries(parsers)
    .filter(([name, value]) => name.startsWith('parse') && typeof value === 'function')
    .map(([name]) => name);
  assert.ok(exported.length > 0, 'no parsers were found to check against, so this asserted nothing');
  const missing = exported.filter((name) => !exercised.has(name));
  assert.deepEqual(missing, [], `these exported parsers are in no reading: ${missing.join(', ')}`);
});

test('every gateway-backed reading parser is exercised too', () => {
  /* `asterisk-readings.ts` exports its own parsers beside the class. They are the ones a
   * discovery-only sweep of `asterisk-parsers.ts` alone would miss entirely. */
  const exercised = new Set(READINGS.map((reading) => reading.parser.name));
  const exported = Object.entries(readingsModule)
    .filter(([name, value]) => name.startsWith('parse') && typeof value === 'function')
    .map(([name]) => name);
  assert.ok(exported.length >= 10, `expected the reading parsers to be found, saw ${exported.length}`);
  const missing = exported.filter((name) => !exercised.has(name));
  assert.deepEqual(missing, [], `these reading parsers are in no reading: ${missing.join(', ')}`);
});

test('every reading names a command the console is allowed to run', () => {
  const allowed = new Set(READ_ONLY_COMMANDS);
  for (const reading of READINGS) {
    const ok = allowed.has(reading.command) || reading.command.startsWith('pjsip show endpoint ');
    assert.ok(ok, `${reading.id} names \`${reading.command}\`, which is not an allowlisted command line`);
  }
});

test('every reading declares how a row is counted and what a row is', () => {
  for (const reading of READINGS) {
    assert.equal(typeof reading.count, 'function', `${reading.id} has no count function`);
    assert.ok(typeof reading.unit === 'string' && reading.unit.length > 0, `${reading.id} does not say what a row is`);
    assert.ok(Array.isArray(reading.screens) && reading.screens.length > 0, `${reading.id} names no screen that consumes it`);
    assert.ok(typeof reading.entry === 'string' && reading.entry.length > 0, `${reading.id} names no production entry point`);
  }
});

test('the ledger covers every allowlisted command in both phases', () => {
  const phases = Object.keys(ledger.phases);
  assert.deepEqual(phases, ['baseline', 'populated']);
  for (const name of phases) {
    const recorded = new Set(ledger.phases[name].commands.map((record) => record.command));
    for (const command of READ_ONLY_COMMANDS) {
      assert.ok(recorded.has(command), `${name} has no record for \`${command}\``);
    }
  }
});

test('every capture the ledger names is on disk and hashes to what was recorded', () => {
  let hashed = 0;
  for (const [name, phase] of Object.entries(ledger.phases)) {
    for (const record of phase.commands) {
      if (!record.capture) continue;
      const path = join(CAPTURE_DIRECTORY, record.capture);
      assert.ok(existsSync(path), `${name}: ${record.capture} is missing`);
      assert.equal(sha256(readFileSync(path, 'utf8')), record.stdoutSha256, `${name}: ${record.capture} does not hash to its record`);
      hashed += 1;
    }
  }
  assert.ok(hashed > 60, `expected the baseline alone to carry a capture per command, hashed ${hashed}`);
});

test('no capture on disk is orphaned by the ledger', () => {
  const named = new Set();
  for (const phase of Object.values(ledger.phases)) {
    for (const record of phase.commands) if (record.capture) named.add(record.capture.replace(/\\/gu, '/'));
  }
  const onDisk = capturesOnDisk();
  assert.ok(onDisk.length > 0, 'no captures were found on disk, so this asserted nothing');
  const orphans = onDisk.filter((path) => !named.has(path));
  assert.deepEqual(orphans, [], `these captures belong to no ledger record: ${orphans.join(', ')}`);
});

test('--check re-derives the ledger from the committed captures', () => {
  const problems = checkLedger(ledger, (path) => readFileSync(join(CAPTURE_DIRECTORY, path), 'utf8'));
  assert.deepEqual(problems, []);
});

test('--check fails when a parser stops producing what was recorded', () => {
  const damaged = structuredClone(ledger);
  const record = damaged.phases.populated.readings.find((entry) => entry.id === 'endpoints');
  record.parsedSha256 = sha256('not what the parser produces');
  const problems = checkLedger(damaged, (path) => readFileSync(join(CAPTURE_DIRECTORY, path), 'utf8'));
  assert.ok(problems.some((problem) => problem.includes('endpoints re-parses to')), problems.join('\n'));
});

test('--check fails when a reading returns no rows and is not declared unpopulatable', () => {
  const damaged = structuredClone(ledger);
  const record = damaged.phases.populated.readings.find((entry) => entry.id === 'endpoints');
  record.rows = 0;
  damaged.counts.readingsStillEmptyWhenPopulated = damaged.phases.populated.readings
    .filter((entry) => (entry.rows ?? 0) === 0)
    .map((entry) => entry.id);
  const problems = checkLedger(damaged, (path) => readFileSync(join(CAPTURE_DIRECTORY, path), 'utf8'));
  assert.ok(problems.some((problem) => problem.includes('`endpoints` returned no rows')), problems.join('\n'));
});

// ---------------------------------------------------------------- --reparse
//
// A parser that is deliberately changed after a capture makes `--check` red. The repair is
// to re-derive the parse half from the same committed bytes, not to hand-edit a hash, so
// `--reparse` is itself a piece of evidence machinery and gets guarded like one.

const readCapture = (path) => readFileSync(join(CAPTURE_DIRECTORY, path), 'utf8');

test('--reparse is a no-op against a ledger that already matches its captures', () => {
  const { changes, problems } = reparseLedger(structuredClone(ledger), readCapture);
  assert.deepEqual(problems, []);
  assert.deepEqual(changes, [], `nothing should move: ${JSON.stringify(changes)}`);
});

test('--reparse restores a hand-damaged parse hash and says exactly what it moved', () => {
  const damaged = structuredClone(ledger);
  const record = damaged.phases.populated.readings.find((entry) => entry.id === 'voicemailUsers');
  const wasHash = record.parsedSha256;
  record.parsedSha256 = sha256('not what the parser produces');
  record.rows = 99;

  const { ledger: repaired, changes, problems } = reparseLedger(damaged, readCapture);
  assert.deepEqual(problems, []);
  const fields = changes.filter((change) => change.id === 'voicemailUsers').map((change) => change.field).sort();
  assert.deepEqual(fields, ['parsedSha256', 'rows']);
  const fixed = repaired.phases.populated.readings.find((entry) => entry.id === 'voicemailUsers');
  assert.equal(fixed.parsedSha256, wasHash);
  assert.equal(fixed.rows, 3);
  assert.deepEqual(checkLedger(repaired, readCapture), []);
});

test('--reparse refuses to write when a capture no longer hashes to what was recorded', () => {
  // Otherwise it would launder an altered capture into a fresh-looking parse hash, which is
  // the one thing an evidence-rewriting mode must never be able to do.
  const damaged = structuredClone(ledger);
  const command = damaged.phases.populated.commands.find((entry) => entry.capture);
  command.stdoutSha256 = sha256('bytes nobody captured');
  const { problems } = reparseLedger(damaged, readCapture);
  assert.ok(
    problems.some((problem) => problem.includes('not the bytes that run captured')),
    problems.join('\n'),
  );
});

test('--reparse leaves every live-half field of the ledger alone', () => {
  // It re-derives what a parser decides and nothing else: the fixture, the restore, the
  // production readers and the commit these captures were taken at are facts about one
  // moment against one exchange, and rewriting any of them would describe a run that
  // never happened.
  const before = structuredClone(ledger);
  const { ledger: after } = reparseLedger(structuredClone(ledger), readCapture);
  for (const key of ['commit', 'performedAt', 'exchange', 'fixture', 'restore', 'notVerified', 'findings']) {
    assert.deepEqual(after[key], before[key], `--reparse moved ${key}, which it does not measure`);
  }
  for (const [name, phase] of Object.entries(after.phases)) {
    assert.deepEqual(phase.commands, before.phases[name].commands, `--reparse moved ${name} capture records`);
    assert.deepEqual(phase.productionReaders, before.phases[name].productionReaders, `--reparse moved ${name} production readers`);
  }
});

test('the ledger records the exact voicemail line the reading could not turn into a row', () => {
  // The finding this evidence carries is that the target reported four mailboxes and the
  // screen showed three. The parser now hands the fourth back by name, and the ledger --
  // re-derived from the same committed bytes -- carries it, so the finding and the record
  // of it cannot drift apart.
  for (const [name, phase] of Object.entries(ledger.phases)) {
    const record = phase.readings.find((entry) => entry.id === 'voicemailUsers');
    assert.deepEqual(
      record.summary.dropped,
      ['myaliases  1234@devices                                           0'],
      `${name} does not name the dropped mailbox`,
    );
    assert.equal(
      record.summary.total - record.rows,
      record.summary.dropped.length,
      `${name}: the trailer, the rows and the dropped lines do not add up`,
    );
  }
});

test('--check fails when the restore was not proved', () => {
  const damaged = structuredClone(ledger);
  damaged.restore.everyFileIdentical = false;
  const problems = checkLedger(damaged, (path) => readFileSync(join(CAPTURE_DIRECTORY, path), 'utf8'));
  assert.ok(problems.some((problem) => problem.includes('not proved restored')), problems.join('\n'));
});

test('the exchange was restored, byte for byte, and nothing differs unexplained', () => {
  assert.equal(ledger.restore.everyFileIdentical, true);
  assert.deepEqual(ledger.restore.unexplainedDifferences, []);
  assert.ok(ledger.restore.resources.length >= 7, 'the fixture touched fewer resources than it declares');
  for (const entry of ledger.restore.resources) {
    assert.equal(entry.identical, true, `${entry.resource} did not come back byte-identical`);
    assert.equal(entry.sha256Before, entry.sha256After);
  }
  for (const difference of ledger.restore.commandsStillDifferent) {
    assert.ok(MOVES_BETWEEN_READS[difference.command], `${difference.command} differs after the restore with no recorded reason`);
  }
});

test('every reading that stayed empty is one the harness says cannot be populated', () => {
  const empty = ledger.phases.populated.readings.filter((record) => (record.rows ?? 0) === 0).map((record) => record.id);
  assert.deepEqual(empty.slice().sort(), Object.keys(NOT_POPULATABLE).slice().sort());
  for (const id of empty) {
    assert.ok(NOT_POPULATABLE[id].length > 40, `${id} has no real explanation for returning nothing`);
  }
});

test('every production reader was driven and reported a real result', () => {
  const populated = ledger.phases.populated.productionReaders;
  assert.ok(populated.length >= 14, `expected every gateway-backed reader to be driven, saw ${populated.length}`);
  for (const record of populated) {
    assert.equal(record.state, 'available', `${record.id} reported ${record.state}: ${record.reason}`);
  }
  /* The one baseline reader that is unavailable is the interesting one: the endpoint did not
   * exist yet, and the reader turned the parser's throw into an honest reason in the target's
   * own words rather than an empty screen. */
  const detail = ledger.phases.baseline.productionReaders.find((record) => record.id === 'endpointDetail');
  assert.equal(detail.state, 'unavailable');
  assert.match(detail.reason, /Unable to find object/u);
});

test('the ledger says what it did not verify', () => {
  assert.ok(ledger.notVerified.length >= 4, 'the honesty section has been emptied');
  for (const note of ledger.notVerified) assert.ok(note.length > 60, `a notVerified entry says almost nothing: ${note}`);
  assert.ok(ledger.findings.length >= 3, 'the findings this run measured have been removed');
  for (const finding of ledger.findings) {
    assert.ok(finding.measured.length > 60, `${finding.id} records no measurement`);
    assert.ok(finding.notFixedHere.length > 40, `${finding.id} does not say why it was not fixed here`);
  }
});

test('the reload is recorded as harness machinery rather than a console capability', () => {
  assert.match(ledger.exchange.reload.issuedBy, /this harness/u);
  assert.match(ledger.exchange.reload.why, /no reload action/u);
});

test('mergeFixture refuses a value the write path cannot represent', () => {
  const existing = [{ name: 'general', entries: [{ key: 'a', value: '1' }] }];
  const merged = mergeFixture(existing, [{ name: 'general', entries: [{ key: 'b', value: '2' }] }]);
  assert.deepEqual(merged, [{ name: 'general', entries: [{ key: 'a', value: '1' }, { key: 'b', value: '2' }] }]);

  assert.throws(
    () => mergeFixture([{ name: 'x', entries: [] }, { name: 'x', entries: [] }], []),
    /already repeats the section name/u,
  );
  assert.throws(
    () => mergeFixture([], [{ name: 'y', entries: [] }, { name: 'y', entries: [] }]),
    /fixture itself repeats a section name/u,
  );
});

test('the fixture itself never asks for two sections of one name', () => {
  for (const [resource, sections] of Object.entries(fixtureSections())) {
    const names = sections.map((section) => section.name);
    assert.equal(new Set(names).size, names.length, `${resource} repeats a section name`);
  }
});

test('the fixture writes the arrow separator the transport used to corrupt', () => {
  const iax = fixtureSections()['/etc/asterisk/iax.conf'];
  const registers = iax.flatMap((section) => section.entries).filter((entry) => entry.key === 'register');
  assert.equal(registers.length, 1);
  assert.equal(registers[0].separator, '=>');
});

test('classify separates a usage line from data and from an absent command', () => {
  assert.equal(classify('No such command \'dahdi show status\''), 'unsupported');
  assert.equal(classify('Usage: media cache show <uri>'), 'usage');
  assert.equal(classify('   '), 'empty');
  assert.equal(classify('Endpoint: 6001'), 'read');
});

test('slug and canonical are stable', () => {
  assert.equal(slug('core show channels concise'), 'core-show-channels-concise');
  assert.equal(slug('pjsip show endpoint ding-live-probe'), 'pjsip-show-endpoint-ding-live-probe');
  assert.equal(canonical(undefined), 'null');
  assert.equal(canonical({ b: 1, a: 2 }), '{"b":1,"a":2}', 'key order is part of what a parser produces and must not be sorted away');
});
