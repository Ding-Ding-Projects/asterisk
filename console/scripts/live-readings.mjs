#!/usr/bin/env node
/**
 * Verifies every reading this console takes against a live Asterisk exchange.
 *
 * WHAT A "READING" IS HERE, AND WHY THE LIST IS HAND-WRITTEN.
 *
 * A reading is one (command, parser) pair that a screen actually consumes: the console runs
 * an allowlisted `asterisk -rx` command through `LocalAsteriskCliGateway`, and hands the
 * stdout to a parser whose shape a destination renders. Every one of them is enumerated in
 * `READINGS` below, by hand, against the two places the product wires them -- the
 * `AsteriskReadings` methods and `dispatch.ts`'s `parsedView`. A registry that discovered its
 * own contents by scanning exports could not fail when a reading disappeared, which is the one
 * failure this exists to catch, so the list is written out and a coverage check requires every
 * exported parser and every gateway-backed reader to appear in it.
 *
 * WHAT WAS ACTUALLY DONE, AND IN WHAT ORDER.
 *
 *   1. Baseline. Every one of the allowlisted read-only command lines is run against the live
 *      target through the production gateway and its exact stdout committed. Not only the ones
 *      a parser consumes: the CLI screen will run any of them through `readings.raw()`, so a
 *      command that does not exist on a target is a reading that screen takes too.
 *   2. Population. The exchange as provisioned has no configured objects at all -- every
 *      shipped sample file is comment-only -- so twelve of the readings would otherwise be
 *      verified against `No objects found.`, which proves the command runs and proves nothing
 *      about the parser. A fixture is therefore written through the console's own
 *      `StructuredConfigPlanner` / `ConfigTransaction` / `WslConfigTransport` path, and
 *      Asterisk is reloaded so the objects become visible to the CLI.
 *   3. Populated capture. Every command is run again. A command whose bytes are unchanged
 *      records `sameAsBaseline` rather than committing a second identical file.
 *   4. Restore. Every backup handle the transaction handed back is rolled back, Asterisk is
 *      reloaded again, and the exchange is re-read to prove it is back where it started.
 *
 * WHAT `--check` RE-DERIVES, AND WHAT IT CANNOT.
 *
 * The live half is a fact about one moment and cannot be re-run without a target. The parse
 * half can: `--check` reads the committed captures back, re-runs the production parser over
 * each one, and requires the canonical JSON to hash to exactly what was recorded. So a parser
 * that moves after a capture turns this red rather than leaving a stale claim standing. It
 * also re-hashes every capture file, and fails when the allowlist has gained a command that
 * has no capture -- a new command with no record would otherwise simply not be verified while
 * the ledger went on saying every command was.
 *
 * It cannot re-derive the gateway, the executor, the reload or the restore. Those are recorded
 * once, and `notVerified` in the ledger says so in the ledger's own words rather than here.
 *
 *   node console/scripts/live-readings.mjs --check
 *   npx tsx console/scripts/live-readings.mjs --capture [--distribution=NAME]
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  AsteriskReadings,
  LocalAsteriskCliGateway,
  READ_ONLY_COMMANDS,
  parseChannels,
  parseChannelStats,
  parseContacts,
  parseEndpointDetail,
  parseEndpoints,
  parseIax2Peers,
  parseIax2Registry,
  parseModules,
  parsePjsipAuths,
  parseQueues,
  parseRegistrations,
  parseUptimeSeconds,
} from '../control-plane/asterisk-readings.js';
import {
  parseAclRules,
  parseAriApps,
  parseCdrStatus,
  parseCodecs,
  parseConfbridgeList,
  parseLoggerChannels,
  parseManagerSettings,
  parseManagerUsers,
  parseMohClasses,
  parseSysinfo,
  parseTranslations,
  parseUptime,
  parseVoicemailUsers,
  parseVoicemailZones,
} from '../control-plane/asterisk-parsers.js';
import { parseDialplanGraph } from '../control-plane/dialplan-graph.js';

export const CONSOLE_ROOT = resolve(import.meta.dirname, '..');
export const EVIDENCE_DIRECTORY = join(CONSOLE_ROOT, 'release', 'evidence', 'live-exchange');
export const LEDGER_PATH = join(EVIDENCE_DIRECTORY, 'readings.json');
export const CAPTURE_DIRECTORY = join(EVIDENCE_DIRECTORY, 'readings');

/** The endpoint the fixture creates, and the id `pjsip show endpoint <id>` is run for. */
export const FIXTURE_ENDPOINT = 'ding-live-probe';

/**
 * Every reading the product takes, and the exact production wiring each one comes from.
 *
 * `entry` names where the console calls it, so a reader can go and look rather than take this
 * table's word for it. `parser` is the real exported function, applied here to the same bytes
 * the gateway returned, which is what makes `--check` able to re-derive the result later.
 */
export const READINGS = [
  { id: 'channels', command: 'core show channels concise', parser: parseChannels, count: (v) => v.length, unit: 'live channels', entry: 'AsteriskReadings.channels', screens: ['dashboard', 'live'] },
  { id: 'endpoints', command: 'pjsip show endpoints', parser: parseEndpoints, count: (v) => v.length, unit: 'endpoints', entry: 'AsteriskReadings.endpoints', screens: ['dashboard', 'endpoints'] },
  { id: 'contacts', command: 'pjsip show contacts', parser: parseContacts, count: (v) => v.length, unit: 'contacts', entry: 'AsteriskReadings.contacts', screens: ['endpoints'] },
  { id: 'registrations', command: 'pjsip show registrations', parser: parseRegistrations, count: (v) => v.length, unit: 'outbound registrations', entry: 'AsteriskReadings.registrations', screens: ['endpoints', 'trunks', 'trunkauth'] },
  { id: 'auths', command: 'pjsip show auths', parser: parsePjsipAuths, count: (v) => v.length, unit: 'auth objects', entry: 'AsteriskReadings.auths', screens: ['trunkauth'] },
  { id: 'channelStats', command: 'pjsip show channelstats', parser: parseChannelStats, count: (v) => v.length, unit: 'per-channel codec rows', entry: 'AsteriskReadings.channelStats', screens: ['endpoints'] },
  { id: 'endpointDetail', command: `pjsip show endpoint ${FIXTURE_ENDPOINT}`, parser: parseEndpointDetail, count: (v) => (v.transport ? 1 : 0) + (v.codecs?.length ?? 0), unit: 'transport and codec values', entry: 'AsteriskReadings.endpointDetail', screens: ['endpoints'] },
  { id: 'queues', command: 'queue show', parser: parseQueues, count: (v) => v.length, unit: 'queues', entry: 'AsteriskReadings.queues', screens: ['dashboard', 'queues'] },
  { id: 'modules', command: 'module show', parser: parseModules, count: (v) => v.length, unit: 'modules', entry: 'AsteriskReadings.modules', screens: ['modules', 'cdr'] },
  { id: 'iaxPeers', command: 'iax2 show peers', parser: parseIax2Peers, count: (v) => v.length, unit: 'IAX2 peers', entry: 'AsteriskReadings.iaxPeers', screens: ['iaxpeers'] },
  { id: 'iaxRegistrations', command: 'iax2 show registry', parser: parseIax2Registry, count: (v) => v.length, unit: 'IAX2 registrations', entry: 'AsteriskReadings.iaxRegistrations', screens: ['trunks'] },
  { id: 'uptimeSeconds', command: 'core show uptime seconds', parser: parseUptimeSeconds, count: (v) => (Number.isFinite(v) ? 1 : 0), unit: 'seconds', entry: 'AsteriskReadings.uptimeSeconds', screens: ['dashboard'] },
  { id: 'dialplan', command: 'dialplan show', parser: parseDialplanGraph, count: (v) => v.nodes.length, unit: 'dialplan steps', entry: 'DialplanReadings.graph', screens: ['canvas'] },
  { id: 'voicemailUsers', command: 'voicemail show users', parser: parseVoicemailUsers, count: (v) => v.users.length, unit: 'mailboxes', entry: "dispatch parsedView 'voicemail'", screens: ['voicemail'] },
  { id: 'voicemailZones', command: 'voicemail show zones', parser: parseVoicemailZones, count: (v) => v.length, unit: 'zones', entry: "dispatch parsedView 'voicemail'", screens: ['voicemail'] },
  { id: 'confbridgeRooms', command: 'confbridge list', parser: parseConfbridgeList, count: (v) => v.length, unit: 'running conferences', entry: "dispatch parsedView 'confbridge'", screens: ['confbridge'] },
  { id: 'mohClasses', command: 'moh show classes', parser: parseMohClasses, count: (v) => v.length, unit: 'music classes', entry: "dispatch parsedView 'moh'", screens: ['moh'] },
  { id: 'codecs', command: 'core show codecs', parser: parseCodecs, count: (v) => v.length, unit: 'codecs', entry: "dispatch parsedView 'codecs'", screens: ['codecs'] },
  { id: 'translations', command: 'core show translation', parser: parseTranslations, count: (v) => v.length, unit: 'translation rows', entry: "dispatch parsedView 'codecs'", screens: ['codecs'] },
  { id: 'aclRules', command: 'acl show', parser: parseAclRules, count: (v) => v.length, unit: 'named ACLs', entry: "dispatch parsedView 'security'", screens: ['security'] },
  { id: 'cdrStatus', command: 'cdr show status', parser: parseCdrStatus, count: (v) => Object.keys(v.settings).length + v.backends.length, unit: 'settings and backends', entry: "dispatch parsedView 'cdr'", screens: ['cdr'] },
  { id: 'loggerChannels', command: 'logger show channels', parser: parseLoggerChannels, count: (v) => v.channels.length, unit: 'logger channels', entry: "dispatch parsedView 'logger'", screens: ['logger'] },
  { id: 'managerSettings', command: 'manager show settings', parser: parseManagerSettings, count: (v) => Object.keys(v.settings).length, unit: 'settings', entry: "dispatch parsedView 'ami'", screens: ['ami'] },
  { id: 'managerUsers', command: 'manager show users', parser: parseManagerUsers, count: (v) => v.users.length, unit: 'manager users', entry: "dispatch parsedView 'ami'", screens: ['ami'] },
  { id: 'ariApps', command: 'ari show apps', parser: parseAriApps, count: (v) => v.length, unit: 'connected REST applications', entry: "dispatch parsedView 'ami'", screens: ['ami'] },
  { id: 'sysinfo', command: 'core show sysinfo', parser: parseSysinfo, count: (v) => Object.keys(v.values).length, unit: 'system values', entry: "dispatch parsedView 'about'", screens: ['about', 'cli'] },
  { id: 'uptime', command: 'core show uptime seconds', parser: parseUptime, count: (v) => (v.uptimeSeconds === undefined ? 0 : 1) + (v.lastReloadSeconds === undefined ? 0 : 1), unit: 'uptime values', entry: "dispatch parsedView 'about'", screens: ['about', 'cli'] },
];

/**
 * Readings the fixture deliberately does not try to populate, and the reason each one cannot
 * be. Every entry here is a reading whose command needs something no configuration file can
 * create, so `rows: 0` against this target is the target telling the truth rather than the
 * parser failing. Recorded because a reader comparing populated row counts would otherwise
 * find four zeroes and no explanation for them.
 */
export const NOT_POPULATABLE = {
  channels: 'A channel exists only while a call is up. Nothing in a configuration file creates one, and this harness places no calls.',
  channelStats: 'Same: the command prints one row per live PJSIP channel, so an exchange with no call in progress has none.',
  confbridgeRooms: '`confbridge list` prints conferences that are running, not the rooms configured in confbridge.conf. A room with nobody in it is not listed.',
  ariApps: 'An ARI application appears once a client connects and subscribes over the REST interface. It is not a configuration object.',
};

/**
 * Commands whose output legitimately differs between any two reads of an unchanged exchange,
 * and why each one does. A restore that leaves one of these differing is a restore that
 * worked; anything NOT named here differing after the rollback is an incomplete restore and
 * the ledger says so under `unexplainedDifferences`.
 */
export const MOVES_BETWEEN_READS = {
  'core show uptime seconds': 'Uptime and time-since-reload advance between any two reads.',
  'core show sysinfo': 'Free RAM, buffer RAM and the host process count move on their own.',
  'core show threads': 'Thread addresses and the set of running threads change between reads.',
  'dialplan show': 'This one is not self-moving and is the interesting case. The harness reload brought the RUNNING dialplan into agreement with `/etc/asterisk/extensions.conf`, which already contained the shipped sample contexts before this pass began -- `[dundi-e164]` at line 287, `[iax2-trunk]` at 306, `[trunkint]` at 318. The file is restored byte for byte; what changed is that Asterisk had not reloaded pbx_config since an earlier session put that file back. `dialplan show` reads loaded state rather than file state, so the baseline capture is a real reading of a dialplan that no configuration file on the target described.',
};

/** Filename-safe form of a command line. */
export function slug(command) {
  return command.trim().toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/gu, '');
}

export function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * Canonical form of a parsed value, for the digest `--check` compares.
 *
 * Plain `JSON.stringify`, deliberately: the key order a parser produces is part of what it
 * produces, so sorting keys here would let a parser reshape its output without this noticing.
 */
export function canonical(value) {
  return JSON.stringify(value ?? null);
}

/**
 * What the target said about a command, in the terms the console itself uses.
 *
 * `unsupported` is the branch `AsteriskReadings.#read` takes on `No such command`, so it is a
 * real reading outcome rather than a harness category. `usage` is not: it is a command that
 * exists and refuses the argument list this console gives it, which the console does not
 * currently distinguish from data -- see the ledger's own findings for why that matters.
 */
export function classify(stdout) {
  const text = stdout.trim();
  if (/^No such command/u.test(text)) return 'unsupported';
  if (/^Usage:/u.test(text)) return 'usage';
  if (text.length === 0) return 'empty';
  return 'read';
}

/** Every parser this module claims to exercise, by exported name. */
export function parserNameOf(reading) {
  return reading.parser.name;
}

// ---------------------------------------------------------------- check

/**
 * Re-derives the ledger's parse half from the committed captures.
 *
 * Returns a list of problems rather than throwing on the first, so one run says everything
 * that is wrong instead of one thing at a time.
 */
export function checkLedger(ledger, readCapture) {
  const problems = [];
  const phases = Object.entries(ledger.phases ?? {});
  if (phases.length === 0) problems.push('The ledger records no phases at all.');

  for (const [phaseName, phase] of phases) {
    const captureFor = new Map();
    for (const record of phase.commands ?? []) {
      const path = record.capture ?? record.sameAsBaseline;
      if (typeof path !== 'string') {
        problems.push(`${phaseName}: ${record.command} names neither a capture nor a baseline it matches.`);
        continue;
      }
      let text;
      try {
        text = readCapture(path);
      } catch {
        problems.push(`${phaseName}: the capture ${path} for \`${record.command}\` is missing.`);
        continue;
      }
      captureFor.set(record.command, text);
      if (record.capture) {
        const actual = sha256(text);
        if (actual !== record.stdoutSha256) {
          problems.push(`${phaseName}: ${path} hashes ${actual}, recorded ${record.stdoutSha256}.`);
        }
        if (text.length !== record.stdoutLength) {
          problems.push(`${phaseName}: ${path} is ${text.length} characters, recorded ${record.stdoutLength}.`);
        }
      }
    }

    /* Every allowlisted command line must have a record. A command added to the allowlist
     * after this ran is a command nothing has ever run against a target, and the ledger's
     * headline count would otherwise keep saying every one of them was covered. */
    const recorded = new Set((phase.commands ?? []).map((record) => record.command));
    for (const command of READ_ONLY_COMMANDS) {
      if (!recorded.has(command)) problems.push(`${phaseName}: the allowlisted command \`${command}\` has no capture.`);
    }

    for (const record of phase.readings ?? []) {
      const reading = READINGS.find((candidate) => candidate.id === record.id);
      if (!reading) {
        problems.push(`${phaseName}: the ledger records a reading \`${record.id}\` that no longer exists.`);
        continue;
      }
      if (record.parser !== parserNameOf(reading)) {
        problems.push(`${phaseName}: ${record.id} was parsed by ${record.parser}, and is now wired to ${parserNameOf(reading)}.`);
        continue;
      }
      const text = captureFor.get(reading.command);
      if (text === undefined) {
        problems.push(`${phaseName}: ${record.id} has no capture of \`${reading.command}\` to re-parse.`);
        continue;
      }
      /* A parser that threw is a recorded outcome, not a hole in the ledger: the production
       * reader turns it into an `unavailable` reading carrying the target's own words, which
       * is the behaviour the baseline `endpointDetail` record measures. So the throw is
       * re-derived like any other result -- it must still throw, and with the same message. */
      let digest;
      let threw;
      try {
        digest = sha256(canonical(reading.parser(text)));
      } catch (error) {
        threw = error instanceof Error ? error.message : String(error);
      }
      if (record.threw !== undefined) {
        if (threw === undefined) problems.push(`${phaseName}: ${record.id} was recorded as throwing ${JSON.stringify(record.threw)} and now parses cleanly.`);
        else if (threw !== record.threw) problems.push(`${phaseName}: ${record.id} threw ${JSON.stringify(threw)}, recorded ${JSON.stringify(record.threw)}.`);
        continue;
      }
      if (threw !== undefined) {
        problems.push(`${phaseName}: re-running ${record.parser} over \`${reading.command}\` threw: ${threw}`);
        continue;
      }
      if (digest !== record.parsedSha256) {
        problems.push(`${phaseName}: ${record.id} re-parses to ${digest}, recorded ${record.parsedSha256}. The parser has moved since the capture was taken.`);
      }
    }

    const readingIds = new Set((phase.readings ?? []).map((record) => record.id));
    for (const reading of READINGS) {
      if (!readingIds.has(reading.id)) problems.push(`${phaseName}: the reading \`${reading.id}\` has no record.`);
    }
  }

  /* The claims the ledger makes about itself. Each one is re-derived rather than trusted,
   * because a headline count that stopped matching its own rows would keep reading as a
   * verification long after it had stopped being one. */
  const populated = ledger.phases?.populated;
  if (populated) {
    const empty = populated.readings.filter((record) => (record.rows ?? 0) === 0).map((record) => record.id);
    const declared = ledger.counts?.readingsStillEmptyWhenPopulated ?? [];
    if (JSON.stringify(empty) !== JSON.stringify(declared)) {
      problems.push(`The ledger says ${JSON.stringify(declared)} were still empty when populated; its own rows say ${JSON.stringify(empty)}.`);
    }
    /* Every reading that stayed empty must be one this harness declared it cannot populate.
     * Without this, a reading that quietly stopped returning rows would land in that list and
     * read as a documented limitation rather than as a regression. */
    for (const id of empty) {
      if (!(id in NOT_POPULATABLE)) problems.push(`The reading \`${id}\` returned no rows against a populated exchange and is not one this harness declares unpopulatable.`);
    }
    const unavailable = (populated.productionReaders ?? []).filter((record) => record.state !== 'available');
    for (const record of unavailable) {
      problems.push(`The production reader \`${record.id}\` reported ${record.state} against the populated exchange: ${record.reason}`);
    }
  }
  if (ledger.restore?.everyFileIdentical !== true) {
    problems.push('The ledger does not claim every fixture file came back byte-identical, so the exchange was not proved restored.');
  }
  if ((ledger.restore?.unexplainedDifferences ?? ['unrecorded']).length > 0) {
    problems.push(`The restore left ${JSON.stringify(ledger.restore.unexplainedDifferences)} differing with no recorded reason.`);
  }
  return problems;
}

// ---------------------------------------------------------------- capture

/**
 * The one configuration fixture, and the reading each section exists to give rows to.
 *
 * Two shapes are deliberately avoided here, both for the same measured reason:
 * `renderConfigOver` keys the desired value by section name, so two sections sharing a name
 * collapse into the last one. The aor is therefore `<endpoint>-aor` rather than sharing the
 * endpoint's name -- the pattern nearly every real pjsip.conf uses -- and the `register =>`
 * line is merged into `iax.conf`'s existing `[general]` by `mergeFixture` below rather than
 * added as a second section called `general`. See the ledger's `findings` for what happens
 * when it is not routed around.
 */
export function fixtureSections() {
  const e = (key, value, separator) => (separator ? { key, value, separator } : { key, value });
  return {
    '/etc/asterisk/pjsip.conf': [
      { name: `${FIXTURE_ENDPOINT}-transport`, entries: [e('type', 'transport'), e('protocol', 'udp'), e('bind', '127.0.0.1:5099')] },
      {
        name: FIXTURE_ENDPOINT,
        entries: [
          e('type', 'endpoint'), e('context', 'default'), e('disallow', 'all'),
          e('allow', 'ulaw'), e('allow', 'alaw'), e('allow', 'g722'),
          e('transport', `${FIXTURE_ENDPOINT}-transport`), e('auth', `${FIXTURE_ENDPOINT}-auth`),
          e('aors', `${FIXTURE_ENDPOINT}-aor`),
        ],
      },
      { name: `${FIXTURE_ENDPOINT}-auth`, entries: [e('type', 'auth'), e('auth_type', 'userpass'), e('username', FIXTURE_ENDPOINT), e('password', 'this-is-not-a-real-secret')] },
      { name: `${FIXTURE_ENDPOINT}-aor`, entries: [e('type', 'aor'), e('max_contacts', '1'), e('contact', 'sip:ding-live-probe@127.0.0.1:5099')] },
      { name: `${FIXTURE_ENDPOINT}-registration`, entries: [e('type', 'registration'), e('transport', `${FIXTURE_ENDPOINT}-transport`), e('outbound_auth', `${FIXTURE_ENDPOINT}-auth`), e('server_uri', 'sip:127.0.0.1:5099'), e('client_uri', 'sip:ding-live-probe@127.0.0.1:5099'), e('retry_interval', '3600')] },
    ],
    '/etc/asterisk/queues.conf': [
      { name: 'ding-live-probe-queue', entries: [e('strategy', 'ringall'), e('timeout', '15'), e('member', 'Local/1000@default')] },
    ],
    /* `dingvm`, not `ding-live-probe-vm`. `voicemail show users` is a fixed-width table whose
     * context field is ten characters, and `parseVoicemailUsers` drops any row that overruns
     * it rather than misassigning the columns -- so an eighteen-character context would have
     * added a mailbox the reading could not see, and this fixture would have proved nothing
     * about parsing a new row. The shipped sample's own overrunning row is left alone and
     * reported in `findings` instead. */
    '/etc/asterisk/voicemail.conf': [
      { name: 'dingvm', entries: [e('4242', '4242,Ding Live Probe,,,attach=no')] },
    ],
    '/etc/asterisk/musiconhold.conf': [
      { name: 'ding-live-probe-moh', entries: [e('mode', 'files'), e('directory', 'moh')] },
    ],
    '/etc/asterisk/acl.conf': [
      { name: 'ding-live-probe-acl', entries: [e('deny', '0.0.0.0/0.0.0.0'), e('permit', '127.0.0.1/255.255.255.255'), e('permit', '10.0.0.0/255.0.0.0')] },
    ],
    '/etc/asterisk/manager.conf': [
      { name: 'ding-live-probe-ami', entries: [e('secret', 'this-is-not-a-real-secret'), e('read', 'system,call'), e('write', 'system,call')] },
    ],
    /* `register =>` is the arrow form, which is exactly the separator the transport used to
     * corrupt on an unchanged round trip. Writing one here means the fixture exercises that
     * repair against a live exchange rather than against a sample file. */
    '/etc/asterisk/iax.conf': [
      { name: 'ding-live-probe-iax', entries: [e('type', 'friend'), e('host', '127.0.0.1'), e('port', '4569'), e('context', 'default'), e('disallow', 'all'), e('allow', 'ulaw')] },
      { name: 'general', entries: [e('register', 'ding-live-probe:this-is-not-a-real-secret@127.0.0.1', '=>')] },
    ],
  };
}

/**
 * Folds the fixture's sections into a resource's existing value without ever producing two
 * sections that share a name.
 *
 * A fixture section whose name the file already has is appended to that section's entries; a
 * name the file does not have becomes a new section at the end. Refuses outright rather than
 * writing when the file it is given already contains a duplicate name, because the write path
 * cannot represent one and the honest outcome there is to say so by name rather than to
 * discover it three steps later as `Post-read mismatch`.
 */
export function mergeFixture(existing, additions) {
  const names = existing.map((section) => section.name);
  const duplicated = names.filter((name, index) => names.indexOf(name) !== index);
  if (duplicated.length > 0) {
    throw new Error(`This file already repeats the section name(s) ${[...new Set(duplicated)].join(', ')}, which the write path collapses. Nothing was written.`);
  }
  const fixtureNames = additions.map((section) => section.name);
  if (new Set(fixtureNames).size !== fixtureNames.length) {
    throw new Error('The fixture itself repeats a section name, which the write path collapses.');
  }
  const merged = existing.map((section) => {
    const addition = additions.find((candidate) => candidate.name === section.name);
    return addition ? { name: section.name, entries: [...section.entries, ...addition.entries] } : section;
  });
  const appended = additions.filter((section) => !names.includes(section.name));
  return [...merged, ...appended];
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--check')) {
    const ledger = JSON.parse(readFileSync(LEDGER_PATH, 'utf8'));
    const problems = checkLedger(ledger, (path) => readFileSync(join(CAPTURE_DIRECTORY, path), 'utf8'));
    if (problems.length > 0) {
      console.error(`live-readings --check found ${problems.length} problem(s):`);
      for (const problem of problems) console.error(`  - ${problem}`);
      process.exitCode = 1;
      return;
    }
    const phases = Object.keys(ledger.phases).length;
    console.log(`live-readings --check: ${phases} phase(s), ${READ_ONLY_COMMANDS.length} commands, ${READINGS.length} readings re-derived from committed bytes.`);
    return;
  }
  if (!argv.includes('--capture')) {
    console.error('Usage: live-readings.mjs --check | --capture [--distribution=NAME]');
    process.exitCode = 2;
    return;
  }
  await capture(argv);
}

async function capture(argv) {
  /* Imported here rather than at the top so that `--check`, which `npm test` runs on every
   * machine and against no target at all, never loads the code that writes to an exchange.
   * A read-only re-derivation of committed bytes has no business importing the transaction
   * engine, and keeping it out of the module graph is the only way to be sure it does not. */
  const { NodeProcessExecutor } = await import('../control-plane/executor.js');
  const { WslConfigTransport } = await import('../control-plane/wsl-config-transport.js');
  const { ConfigTransaction, StructuredConfigPlanner } = await import('../control-plane/config-transaction.js');

  const named = argv.find((argument) => argument.startsWith('--distribution='));
  const distribution = named ? named.slice('--distribution='.length) : 'ding-pbx-console';
  const target = { id: 'live', displayName: distribution, connectionKind: 'wsl', wslDistribution: distribution };
  const executor = new NodeProcessExecutor({ allowedExecutables: ['wsl.exe'] });
  const gateway = new LocalAsteriskCliGateway(executor);
  const readings = new AsteriskReadings(gateway);
  const { DialplanReadings } = await import('../control-plane/dialplan-graph.js');
  const dialplanReadings = new DialplanReadings(gateway);

  /* Reloading is not something this console can do -- there is no reload action in the
   * control plane, which is a recorded roadmap gap -- so the harness issues it directly and
   * says so. It is the only command here that is not a production code path. */
  const reload = async () => {
    const result = await executor.execute({ executable: 'wsl.exe', args: ['-d', distribution, '--', 'asterisk', '-rx', 'core reload'], timeoutMs: 60_000 });
    await new Promise((done) => setTimeout(done, 3_000));
    return result.stdout.trim();
  };

  const version = (await gateway.run(target, 'core show version')).stdout.trim();
  console.log(`target: ${distribution} -- ${version}`);

  rmSync(CAPTURE_DIRECTORY, { recursive: true, force: true });
  mkdirSync(CAPTURE_DIRECTORY, { recursive: true });

  const runPhase = async (name, baselineTexts) => {
    mkdirSync(join(CAPTURE_DIRECTORY, name), { recursive: true });
    const commands = [];
    const texts = new Map();
    const all = [...READ_ONLY_COMMANDS, `pjsip show endpoint ${FIXTURE_ENDPOINT}`];
    for (const command of all) {
      const result = await gateway.run(target, command);
      const stdout = result.stdout;
      texts.set(command, stdout);
      const baseline = baselineTexts?.get(command);
      const record = {
        command,
        status: result.status,
        exitCode: result.exitCode,
        outcome: classify(stdout),
        stdoutLength: stdout.length,
        stdoutSha256: sha256(stdout),
        redactedMarkers: (stdout.match(/\[REDACTED\]/gu) ?? []).length,
      };
      if (baseline !== undefined && baseline === stdout) {
        record.sameAsBaseline = `baseline/${slug(command)}.txt`;
      } else {
        const relative = `${name}/${slug(command)}.txt`;
        writeFileSync(join(CAPTURE_DIRECTORY, relative), stdout, 'utf8');
        record.capture = relative;
      }
      commands.push(record);
      process.stdout.write('.');
    }
    process.stdout.write('\n');

    const readingRecords = READINGS.map((reading) => {
      const text = texts.get(reading.command) ?? '';
      const record = {
        id: reading.id,
        command: reading.command,
        entry: reading.entry,
        parser: parserNameOf(reading),
        screens: reading.screens,
        outcome: classify(text),
      };
      try {
        const value = reading.parser(text);
        record.parsedSha256 = sha256(canonical(value));
        record.rows = reading.count(value);
        record.unit = reading.unit;
        record.summary = summarize(value);
      } catch (error) {
        record.threw = error instanceof Error ? error.message : String(error);
      }
      if (name === 'populated' && NOT_POPULATABLE[reading.id]) record.notPopulatable = NOT_POPULATABLE[reading.id];
      return record;
    });

    /* The parser records above prove the parse half against real bytes. These prove the OTHER
     * half: the production reader itself, gateway and all, called exactly as a screen calls
     * it, reporting the `CapabilityResult` a screen would render. A parser that is correct
     * behind a reader that reports `unavailable` is a screen that shows nothing, and only
     * this half can tell the two apart. */
    const readers = [];
    for (const [id, invoke] of Object.entries(productionReaders(readings, dialplanReadings, target))) {
      const reading = await invoke();
      const result = reading.result;
      readers.push({
        id,
        command: reading.command,
        state: result.state,
        ...(result.state === 'available' ? {} : { reason: result.reason }),
        ...(result.state === 'available' ? { rows: countOf(id, result.value) } : {}),
      });
    }
    return { capturedAt: new Date().toISOString(), commands, readings: readingRecords, productionReaders: readers, texts };
  };

  console.log('baseline capture');
  const baseline = await runPhase('baseline', undefined);

  console.log('writing the fixture through the production transaction path');
  const transport = new WslConfigTransport({ executor, distribution });
  const sections = fixtureSections();
  /* Hashed on the target, not through the transport, so the restore proof is about the bytes
   * on disk rather than about the shape this console happens to parse them into. */
  const fileHash = async (path) => {
    const result = await executor.execute({ executable: 'wsl.exe', args: ['-d', distribution, '--', 'sha256sum', path], timeoutMs: 30_000 });
    return result.stdout.trim().split(/\s+/u)[0] ?? 'unreadable';
  };
  const hashesBefore = {};
  const desired = [];
  for (const [resource, extra] of Object.entries(sections)) {
    hashesBefore[resource] = await fileHash(resource);
    const existing = await transport.read(resource);
    desired.push({ resource, value: mergeFixture(existing, extra) });
  }
  const plan = await new StructuredConfigPlanner().createPlan('live-readings-fixture', target.id, desired, transport);
  const applied = await new ConfigTransaction(transport).apply(plan);
  console.log(`  ${applied.status}: ${applied.message}`);
  if (applied.status !== 'applied') throw new Error(`The fixture did not apply: ${applied.message}`);
  const reloadOutput = await reload();

  console.log('populated capture');
  const populated = await runPhase('populated', baseline.texts);

  console.log('restoring the exchange');
  const restored = [];
  for (const backup of [...(applied.backups ?? [])].reverse()) {
    await transport.rollback(backup.handle);
    restored.push(backup.resource);
  }
  for (const resource of Object.keys(sections)) {
    const after = await fileHash(resource);
    restored[restored.indexOf(resource)] = { resource, sha256Before: hashesBefore[resource], sha256After: after, identical: after === hashesBefore[resource] };
  }
  await reload();
  const afterRestore = await runPhase('after-restore', baseline.texts);
  rmSync(join(CAPTURE_DIRECTORY, 'after-restore'), { recursive: true, force: true });
  const stillDifferent = afterRestore.commands
    .filter((record) => record.capture !== undefined)
    .map((record) => record.command);
  const unexplained = stillDifferent.filter((command) => !(command in MOVES_BETWEEN_READS));

  const ledger = {
    schemaVersion: 1,
    title: 'Every console reading run against a live Asterisk exchange',
    commit: gitCommit(),
    performedAt: new Date().toISOString(),
    exchange: {
      kind: 'WSL2 distribution provisioned by the console\'s own runtime.provision path',
      distribution,
      asteriskVersion: version,
      gateway: 'LocalAsteriskCliGateway over NodeProcessExecutor -- the production read path, not a re-implementation',
      writePath: 'StructuredConfigPlanner -> ConfigTransaction -> WslConfigTransport -- the production write path',
      reload: {
        command: 'asterisk -rx "core reload"',
        issuedBy: 'this harness, directly',
        why: 'The control plane has no reload action, so there is no production path to call. Recorded as harness machinery rather than presented as a console capability.',
        output: reloadOutput,
      },
    },
    counts: {
      allowlistedCommands: READ_ONLY_COMMANDS.length,
      commandLinesRun: baseline.commands.length,
      readings: READINGS.length,
      readingsParsedWithoutThrowing: populated.readings.filter((record) => record.threw === undefined).length,
      readingsWithRowsWhenPopulated: populated.readings.filter((record) => (record.rows ?? 0) > 0).length,
      readingsStillEmptyWhenPopulated: populated.readings.filter((record) => (record.rows ?? 0) === 0).map((record) => record.id),
      commandsUnsupportedByThisTarget: baseline.commands.filter((record) => record.outcome === 'unsupported').length,
      productionReadersDriven: populated.productionReaders.length,
      productionReadersAvailableWhenPopulated: populated.productionReaders.filter((record) => record.state === 'available').length,
    },
    fixture: {
      resources: Object.keys(sections),
      endpoint: FIXTURE_ENDPOINT,
      applyStatus: applied.status,
      completedActions: applied.completedActions,
      backups: (applied.backups ?? []).map((backup) => backup.resource),
    },
    restore: {
      /* Every fixture resource hashed on the target before the write and after the rollback.
       * `identical` is what makes "the exchange was restored" a measurement rather than a
       * claim about what `cp` is supposed to do. */
      resources: restored,
      everyFileIdentical: restored.every((entry) => entry.identical === true),
      commandsStillDifferent: stillDifferent.map((command) => ({ command, why: MOVES_BETWEEN_READS[command] ?? 'Not explained. This is an incomplete restore.' })),
      unexplainedDifferences: unexplained,
    },
    phases: {
      baseline: { capturedAt: baseline.capturedAt, commands: baseline.commands, readings: baseline.readings, productionReaders: baseline.productionReaders },
      populated: { capturedAt: populated.capturedAt, commands: populated.commands, readings: populated.readings, productionReaders: populated.productionReaders },
    },
    findings: [
      {
        id: 'render-over-collapses-repeated-section-names',
        severity: 'high',
        summary: 'The write path keys a desired configuration by section name, so a file that legitimately repeats one cannot be written at all, and the attempt rewrites the earlier section as a copy of the later one before the post-read catches it.',
        foundWhile: 'Applying this fixture. The first attempt added a second `[general]` to iax.conf and the transaction reported `Post-read mismatch for /etc/asterisk/iax.conf` and rolled back.',
        measured: 'An UNCHANGED round trip of `[6001] type=endpoint context=default allow=ulaw` followed by `[6001] type=aor max_contacts=1` -- the pattern nearly every real pjsip.conf uses -- renders `type = endpoint` as `type = aor`, deletes `context` and `allow`, and inserts `max_contacts` into the first section. Parsed section entry counts go from [3, 2] to [2, 2].',
        whereItIs: 'renderConfigOver in control-plane/wsl-config-transport.ts builds `wanted` with `wanted.set(section.name, section.entries)`, so the last section of a repeated name overwrites every earlier one.',
        failsSafe: true,
        whyItFailsSafe: 'ConfigTransaction compares the parsed post-read against the desired value, and the collapsed result is not equal to it, so the apply rolls back and reports a failure rather than leaving the file damaged.',
        cost: 'Such a resource cannot be written by this console at all, and the operator is told `Post-read mismatch`, which names nothing about repeated section names.',
        notFixedHere: 'This is a write-path repair and this pass verifies readings. The fixture routes around it -- see fixtureSections -- and the gap is recorded on the roadmap instead of being closed quietly inside an unrelated change.',
      },
      {
        id: 'voicemail-rows-dropped-without-saying-so',
        severity: 'medium',
        summary: 'The voicemail reading drops a mailbox whose context or mailbox field overruns its fixed-width column, and the screen renders the shortened list with nothing to say a row is missing.',
        measured: `The live target's own trailer said ${voicemailTotal(populated) ?? '?'} voicemail users configured; the reading produced ${voicemailRows(populated) ?? '?'} and the Voicemail screen renders exactly those. The dropped row is the shipped sample's \`myaliases 1234@devices\`, whose mailbox runs past the five-character field.`,
        whereItIs: 'parseVoicemailUsers in control-plane/asterisk-parsers.ts drops an unparseable row by design and says so in its own comment; app/renderer/src/readings.ts line 170 renders `users` and never reads the `total` beside it.',
        cost: 'A mailbox that exists is absent from the screen with no explanation, which is the shape of defect this project treats as a blocker: an incomplete list is indistinguishable from a complete one. `parseManagerUsers` carries the same `total` beside the same kind of list and the same screen ignores it too.',
        notFixedHere: 'Dropping the row is deliberate -- misassigning its columns would be worse. What is missing is that nothing surfaces the gap, and that is a screen change rather than reading verification. Recorded on the roadmap.',
      },
      {
        id: 'usage-text-is-read-as-data',
        severity: 'medium',
        summary: '`media cache show` is allowlisted without the argument it requires, so the target answers with its usage line and the console treats that line as a successful reading.',
        measured: 'The live target returned `Usage: media cache show <uri>` with exit code 0. `AsteriskReadings.#read` only diverts on `No such command` and `Unable to connect to remote asterisk`, so this reaches the CLI screen as available output.',
        cost: 'A screen shows a usage message where a reading belongs. No parser consumes this command today, so nothing is currently mis-parsed; what is wrong is that the allowlist carries a line that can never produce a reading.',
        notFixedHere: 'Recorded on the roadmap. Fixing it means either removing the entry or giving the object-command mechanism a second member, and both are allowlist decisions rather than reading verification.',
      },
    ],
    notVerified: [
      'The live half is a fact about one moment. `--check` re-derives the parse half from the committed captures and cannot re-run the gateway, the executor, the reload or the restore.',
      'Four readings cannot be populated from configuration at all -- see `notPopulatable` on each. Their zero rows are the target being truthful, not the parser failing.',
      'Nothing here writes to an exchange anybody depends on. The target is a distribution this console created and may destroy.',
      'The executor redacts stdout before returning it, so a capture is what the console sees rather than what Asterisk printed. `redactedMarkers` counts where that happened.',
    ],
  };
  writeFileSync(LEDGER_PATH, `${JSON.stringify(ledger, undefined, 2)}\n`, 'utf8');
  console.log(`wrote ${LEDGER_PATH}`);
  console.log(`  ${ledger.counts.readingsWithRowsWhenPopulated} of ${READINGS.length} readings returned rows once populated`);
  console.log(`  ${ledger.counts.commandsUnsupportedByThisTarget} of ${READ_ONLY_COMMANDS.length} commands are not built into this target`);
}

/**
 * Every reading the console takes through a gateway-backed reader, as the screens call it.
 *
 * `endpointDetails` is the plural set rather than the single detail, because that is what
 * `readEndpointsView` calls and it is the one reader with a budget and a `notRead` list.
 */
export function productionReaders(readings, dialplanReadings, target) {
  return {
    channels: () => readings.channels(target),
    endpoints: () => readings.endpoints(target),
    contacts: () => readings.contacts(target),
    registrations: () => readings.registrations(target),
    auths: () => readings.auths(target),
    channelStats: () => readings.channelStats(target),
    endpointDetail: () => readings.endpointDetail(target, FIXTURE_ENDPOINT),
    endpointDetails: async () => {
      const endpoints = await readings.endpoints(target);
      const ids = endpoints.result.state === 'available' ? endpoints.result.value.map((endpoint) => endpoint.id) : [];
      return await readings.endpointDetails(target, ids);
    },
    queues: () => readings.queues(target),
    modules: () => readings.modules(target),
    iaxPeers: () => readings.iaxPeers(target),
    iaxRegistrations: () => readings.iaxRegistrations(target),
    uptimeSeconds: () => readings.uptimeSeconds(target),
    dialplan: () => dialplanReadings.graph(target),
  };
}

/** Rows for a production reader's value, in the same terms the parser table uses. */
function countOf(id, value) {
  if (id === 'endpointDetails') return Object.keys(value.byEndpoint).length;
  const reading = READINGS.find((candidate) => candidate.id === id);
  if (!reading) return undefined;
  try {
    return reading.count(value);
  } catch {
    return undefined;
  }
}

/* The two halves of the voicemail finding, read out of the phase that measured it rather than
 * typed in beside it, so the numbers in the finding cannot drift from the numbers in the
 * ledger they sit next to. */
function voicemailRecord(phase) {
  return phase.readings.find((record) => record.id === 'voicemailUsers');
}
function voicemailTotal(phase) {
  return voicemailRecord(phase)?.summary?.total;
}
function voicemailRows(phase) {
  return voicemailRecord(phase)?.rows;
}

/** A short, readable shape for the ledger, beside the exact digest. */
function summarize(value) {
  if (Array.isArray(value)) return value.length === 0 ? [] : [value[0]];
  if (value && typeof value === 'object') {
    const keys = Object.keys(value);
    return keys.length <= 4 ? value : { keys: keys.slice(0, 8), keyCount: keys.length };
  }
  return value;
}

/**
 * The commit these captures were taken at.
 *
 * Read through `git` rather than by walking `.git` by hand, because in a linked worktree
 * `.git` is a file pointing elsewhere and HEAD does not live where the obvious walk expects
 * it. A harness that silently recorded `unknown` there would stamp every capture taken in a
 * worktree with no provenance at all, which is where this work is done.
 */
function gitCommit() {
  /* The full forty characters, not an abbreviation. The site's evidence-record contract
   * requires every capture row to name a full source commit, and an abbreviation there reads
   * as provenance while being ambiguous across a large enough history. */
  const result = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: CONSOLE_ROOT, encoding: 'utf8' });
  const value = (result.stdout ?? '').trim();
  if (!/^[0-9a-f]{40}$/u.test(value)) throw new Error('Could not resolve HEAD to a full commit, so these captures would carry no provenance.');
  return value;
}

/** Present so a caller can list what is on disk without re-reading the ledger. */
export function capturesOnDisk() {
  if (!existsSync(CAPTURE_DIRECTORY)) return [];
  const out = [];
  for (const phase of readdirSync(CAPTURE_DIRECTORY, { withFileTypes: true })) {
    if (!phase.isDirectory()) continue;
    for (const file of readdirSync(join(CAPTURE_DIRECTORY, phase.name))) out.push(`${phase.name}/${file}`);
  }
  return out.sort();
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  await main();
}
