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
 * WHAT `--reparse` IS FOR, AND WHY IT IS NOT A WAY ROUND `--check`.
 *
 * A parser that is deliberately changed after a capture makes `--check` red, and correctly so:
 * the recorded hash no longer describes what the parser produces. The repair is not to edit a
 * hash by hand -- four hashes typed into JSON is exactly the shape of evidence nobody can
 * check -- but to re-derive the parse half from the same committed bytes. That is `--reparse`.
 *
 * It touches only the three fields a parser decides: `parsedSha256`, `rows` and `summary` (or
 * `threw`). Every live-half field -- the capture hashes, the production readers, the fixture,
 * the restore, the commit the captures were taken at -- is left exactly as the run recorded
 * it, because nothing here re-runs any of that and rewriting it would describe a run that
 * never happened. It prints every field it changed, and refuses to write when the captures on
 * disk no longer hash to what the ledger says they do, so it cannot launder a tampered capture
 * into a fresh-looking hash.
 *
 *   node console/scripts/live-readings.mjs --check
 *   node console/scripts/live-readings.mjs --reparse
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
  parseMediaCacheItems,
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

/** Where `--capture-added` writes, kept apart from the phase directories on purpose. */
export const ADDED_CAPTURE_PREFIX = 'added';

/**
 * Commands allowlisted **after** the fixture-and-restore run this ledger's phases record.
 *
 * This exists because `checkLedger` requires every allowlisted command to have a capture,
 * which is right: a command added to the allowlist later is a command nothing has ever run
 * against a target, and without that requirement the ledger's headline count would go on
 * claiming all of them were covered. But the requirement has only two honest answers, and
 * "re-run the whole fixture cycle" is not always one of them -- so this is the other:
 * a command gets its own run, its own captures and its own provenance, recorded separately
 * rather than backdated into a phase it was never part of. Writing today's bytes into
 * `phases.baseline` would claim they came from that commit, that exchange and that
 * fixture, and they did not.
 *
 * It is not an escape hatch. `--check` still requires each entry to have a committed
 * capture that hashes to what was recorded and re-parses to the recorded digest, and it
 * **fails** on an entry naming a command no longer in the allowlist, so a stale row cannot
 * sit here quietly satisfying a coverage check for a command that no longer exists.
 *
 * `populate` and `restore` are what make a capture worth having. A command run against an
 * empty subsystem proves the command runs and proves nothing about the parser -- the same
 * reason the main run wrote a fixture -- so an entry that can populate its subsystem does,
 * captures it, and puts it back. `restoreProof` is checked by `--capture-added` itself: the
 * bytes after the restore must equal the bytes before the populate.
 */
export const COMMANDS_ALLOWLISTED_AFTER_THE_RUN = [
  {
    command: 'media cache show all',
    parser: parseMediaCacheItems,
    /* `slug()` would give the same string; naming it means the committed path cannot move
     * silently when a slug rule changes. */
    slug: 'media-cache-show-all',
    reason:
      'The allowlist previously carried the bare `media cache show`, which is the singular CLI entry (`main/media_cache.c` line 528) and refuses any argc but 4, so it could only ever answer with its usage line. `media cache show all` (line 477) is the container listing that actually produces a reading, and it replaced it.',
    unpopulatedIs:
      'the header and separator with no items: this target has fetched nothing, which is the empty state the Music on Hold screen has to be able to tell apart from an unread one',
    /**
     * The media cache cannot be populated by writing a configuration file -- it holds what
     * Asterisk fetched at run time, so it is filled the way a running Asterisk fills it, by
     * retrieving a URI. `media cache create` is not a route: it needs the scheme backend to
     * implement a create wizard, and `res_http_media_cache` implements only retrieval, so
     * on this target it answers `Unable to create '<uri>' associated with local file '<f>'`.
     *
     * Two URIs, deliberately: one comfortably inside the format's 40-column pad and one at
     * 78 characters, well past it. `%-40s` has no precision, so it pads and never truncates,
     * and that is the property the parser depends on -- an unpadded long line beside a
     * padded short one is what proves it rather than asserts it.
     */
    populate: async ({ shell, distribution }) => {
      const server = [
        "use strict; use warnings; use IO::Socket::INET;",
        "my $body = do { local $/; open my $fh, '<:raw', '/var/lib/asterisk/sounds/en/activated.gsm' or die $!; <$fh> };",
        "my $srv = IO::Socket::INET->new(LocalAddr=>'127.0.0.1', LocalPort=>18080, Listen=>8, ReuseAddr=>1, Proto=>'tcp') or die $!;",
        "while (my $c = $srv->accept) {",
        "  while (my $l = <$c>) { last if $l =~ /^\\r?\\n$/ }",
        "  print $c \"HTTP/1.1 200 OK\\r\\nContent-Type: audio/gsm\\r\\nContent-Length: \" . length($body) . \"\\r\\nConnection: close\\r\\n\\r\\n\";",
        "  print $c $body; close $c;",
        "}",
      ].join('\n');
      /* Base64, because `$name` does not survive the trip. Something between `spawn` and the
       * Linux side of `wsl.exe` expands a `$`-sigil identifier and replaces it with nothing:
       * measured, with `shell: false` on the Node side and the payload inside a *quoted*
       * heredoc on the shell side, which should make expansion impossible at both ends and
       * does not. `my $body = 1; my $fh; local $/;` arrives as `my  = 1; my ; local $/;` --
       * `$/` survives only because it is not an identifier. Nothing reports it: the file is
       * written, the shell exits 0, and the failure surfaces much later as a perl syntax
       * error nobody is looking at. Base64 has no `$` in it, so no layer can find one. */
      const payload = Buffer.from(`${server}\n`, 'utf8').toString('base64');
      await shell(`printf %s ${payload} | base64 -d > /tmp/ding-media-probe.pl`);
      await shell('nohup perl /tmp/ding-media-probe.pl >/dev/null 2>&1 & sleep 1');
      for (const uri of MEDIA_CACHE_PROBE_URIS) {
        await shell(`asterisk -rx "media cache refresh ${uri}"`);
      }
      return { distribution, probes: MEDIA_CACHE_PROBE_URIS };
    },
    restore: async ({ shell }) => {
      for (const uri of MEDIA_CACHE_PROBE_URIS) {
        await shell(`asterisk -rx "media cache delete ${uri}"`);
      }
      /* Matched on the interpreter and the full script path rather than on the bare script
       * name. `pkill -f ding-media-probe` matches the `sh -c` process running this very
       * command, kills the shell mid-list, and leaves the `rm` below unrun -- measured, and
       * it is why the two probe files survived the first attempt at this cleanup. */
      await shell("pkill -f '^perl /tmp/ding-media-probe[.]pl$' || true");
      await shell('rm -f /tmp/ding-media-probe.pl');
    },
  },
];

/** The URIs `--capture-added` asks the target to fetch, and then deletes again. */
export const MEDIA_CACHE_PROBE_URIS = [
  'http://127.0.0.1:18080/probe.gsm',
  'http://127.0.0.1:18080/a-deliberately-long-path-that-overruns-forty-columns.gsm',
];

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
 * Verifies the commands allowlisted after the recorded run, and returns the set of command
 * lines they cover so the per-phase coverage check can stop asking for a capture that was
 * never going to exist in that phase.
 *
 * Everything a phase capture must satisfy, one of these must satisfy too: a committed file,
 * a hash that still matches its bytes, and a parse that still produces the recorded digest.
 * On top of that it must name a command the allowlist still carries and say why it is here,
 * because the failure this whole mechanism could otherwise introduce is a row that goes on
 * covering a command nobody runs.
 *
 * Deliberately returns an empty set when the ledger has no such section at all: a ledger
 * whose every allowlisted command was in its phases needs none, and requiring the key would
 * fail a ledger that is simply complete.
 */
export function checkAddedCommands(ledger, readCapture, problems) {
  const covered = new Set();
  const records = ledger.commandsAllowlistedAfterThisRun;
  if (records === undefined) return covered;
  if (!Array.isArray(records)) {
    problems.push('commandsAllowlistedAfterThisRun is present but is not a list.');
    return covered;
  }

  const allowlisted = new Set(READ_ONLY_COMMANDS);
  const declared = new Map(COMMANDS_ALLOWLISTED_AFTER_THE_RUN.map((entry) => [entry.command, entry]));

  for (const record of records) {
    const where = `commandsAllowlistedAfterThisRun[${record.command ?? '?'}]`;
    if (typeof record.command !== 'string') {
      problems.push(`${where}: names no command.`);
      continue;
    }
    /* A row for a command the allowlist no longer carries is the one way this section could
     * quietly become a hole: it would keep satisfying nothing while looking like evidence. */
    if (!allowlisted.has(record.command)) {
      problems.push(`${where}: records a command that is no longer in the allowlist.`);
      continue;
    }
    const entry = declared.get(record.command);
    if (!entry) {
      problems.push(`${where}: is not declared in COMMANDS_ALLOWLISTED_AFTER_THE_RUN, so nothing says why it is recorded apart from the phases.`);
      continue;
    }
    if (typeof record.reason !== 'string' || record.reason.trim().length === 0) {
      problems.push(`${where}: records no reason for being allowlisted after the run.`);
      continue;
    }
    if (typeof record.runFromCommit !== 'string' || record.runFromCommit.length === 0) {
      problems.push(`${where}: does not say which commit it was run from.`);
      continue;
    }

    let anyCapture = false;
    for (const state of ['unpopulated', 'populated', 'afterRestore']) {
      const capture = record.captures?.[state];
      if (capture === undefined) continue;
      anyCapture = true;
      let text;
      try {
        text = readCapture(capture.path);
      } catch {
        problems.push(`${where}: the capture ${capture.path} for its ${state} state is missing.`);
        continue;
      }
      const actual = sha256(text);
      if (actual !== capture.stdoutSha256) {
        problems.push(`${where}: ${capture.path} hashes ${actual}, recorded ${capture.stdoutSha256}.`);
        continue;
      }
      if (capture.parsedSha256 !== undefined) {
        const digest = sha256(canonical(entry.parser(text)));
        if (digest !== capture.parsedSha256) {
          problems.push(`${where}: ${entry.parser.name} over ${capture.path} now digests ${digest}, recorded ${capture.parsedSha256}.`);
        }
      }
    }
    if (!anyCapture) {
      problems.push(`${where}: records no capture at all, so nothing here was ever run against a target.`);
      continue;
    }

    /* The restore is proved from the committed bytes rather than from the run's own word for
     * it: the state after the restore must hash to the state before the populate. */
    if (record.captures?.populated && record.captures?.afterRestore) {
      if (record.captures.afterRestore.stdoutSha256 !== record.captures.unpopulated?.stdoutSha256) {
        problems.push(`${where}: the capture taken after the restore does not hash to the one taken before the populate, so the subsystem was not put back.`);
      }
    }
    covered.add(record.command);
  }

  /* A declared entry with no record is a command someone meant to run and did not. */
  for (const entry of COMMANDS_ALLOWLISTED_AFTER_THE_RUN) {
    if (!records.some((record) => record.command === entry.command)) {
      problems.push(`commandsAllowlistedAfterThisRun: \`${entry.command}\` is declared in COMMANDS_ALLOWLISTED_AFTER_THE_RUN but the ledger records no run of it.`);
    }
  }

  return covered;
}

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

  const addedCommands = checkAddedCommands(ledger, readCapture, problems);

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
      if (recorded.has(command)) continue;
      /* Covered by its own run instead -- see `COMMANDS_ALLOWLISTED_AFTER_THE_RUN`. The
       * records themselves are checked once, below, rather than once per phase, because
       * they belong to no phase; what happens here is only that they satisfy coverage. */
      if (addedCommands.has(command)) continue;
      problems.push(`${phaseName}: the allowlisted command \`${command}\` has no capture.`);
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

// ---------------------------------------------------------------- reparse

/**
 * Re-derives the parse half of the ledger from the committed captures, in place.
 *
 * Returns `{ ledger, changes, problems }` rather than writing anything, so the caller owns
 * the decision and a test can drive it without a filesystem. `changes` names every field that
 * moved and both of its values; `problems` is non-empty when the re-derivation cannot be
 * trusted, and a non-empty `problems` must stop the write.
 *
 * The narrowness is the point. Only `parsedSha256`, `rows`, `summary` and `threw` are touched
 * -- the four things a parser decides -- and the record is rebuilt field by field rather than
 * replaced wholesale, so a field this does not understand survives untouched instead of
 * quietly disappearing.
 */
export function reparseLedger(ledger, readCapture) {
  const changes = [];
  const problems = [];

  for (const [phaseName, phase] of Object.entries(ledger.phases ?? {})) {
    const captureFor = new Map();
    for (const record of phase.commands ?? []) {
      const path = record.capture ?? record.sameAsBaseline;
      if (typeof path !== 'string') continue;
      let text;
      try {
        text = readCapture(path);
      } catch {
        problems.push(`${phaseName}: the capture ${path} for \`${record.command}\` is missing.`);
        continue;
      }
      /* A capture whose bytes no longer hash to what the ledger recorded is a capture that
       * has been altered, and re-deriving a parse hash from it would stamp that alteration
       * with a fresh-looking record. Refuse rather than launder it. */
      if (record.capture && sha256(text) !== record.stdoutSha256) {
        problems.push(`${phaseName}: ${path} no longer hashes to what the ledger recorded, so it is not the bytes that run captured.`);
        continue;
      }
      captureFor.set(record.command, text);
    }

    for (const record of phase.readings ?? []) {
      const reading = READINGS.find((candidate) => candidate.id === record.id);
      if (!reading) {
        problems.push(`${phaseName}: the ledger records a reading \`${record.id}\` that no longer exists, so it cannot be re-derived.`);
        continue;
      }
      const text = captureFor.get(reading.command);
      if (text === undefined) {
        problems.push(`${phaseName}: ${record.id} has no usable capture of \`${reading.command}\` to re-parse.`);
        continue;
      }
      const note = (field, before, after) => {
        if (JSON.stringify(before) === JSON.stringify(after)) return;
        changes.push({ phase: phaseName, id: record.id, field, before, after });
      };

      let value;
      let threw;
      try {
        value = reading.parser(text);
      } catch (error) {
        threw = error instanceof Error ? error.message : String(error);
      }

      /* The parser this record names is re-derived too, so a reading rewired to a different
       * parser is recorded as such rather than silently keeping the old name beside a new
       * hash. */
      note('parser', record.parser, parserNameOf(reading));
      record.parser = parserNameOf(reading);

      if (threw !== undefined) {
        note('threw', record.threw, threw);
        note('parsedSha256', record.parsedSha256, undefined);
        record.threw = threw;
        delete record.parsedSha256;
        delete record.rows;
        delete record.unit;
        delete record.summary;
        continue;
      }

      const digest = sha256(canonical(value));
      const rows = reading.count(value);
      const summary = summarize(value);
      note('threw', record.threw, undefined);
      note('parsedSha256', record.parsedSha256, digest);
      note('rows', record.rows, rows);
      note('summary', record.summary, summary);
      delete record.threw;
      record.parsedSha256 = digest;
      record.rows = rows;
      record.unit = reading.unit;
      record.summary = summary;
    }
  }

  /* `readingsStillEmptyWhenPopulated` is derived from the rows this just recomputed, and
   * `checkLedger` compares the two, so leaving it stale would make `--check` red immediately
   * after a `--reparse` that succeeded. It is a restatement of the rows rather than a claim
   * about the live run, which is why it is in scope here and the fixture and restore are not. */
  const populated = ledger.phases?.populated;
  if (populated && ledger.counts) {
    const empty = populated.readings.filter((record) => (record.rows ?? 0) === 0).map((record) => record.id);
    const before = ledger.counts.readingsStillEmptyWhenPopulated;
    if (JSON.stringify(before) !== JSON.stringify(empty)) {
      changes.push({ phase: 'counts', id: 'readingsStillEmptyWhenPopulated', field: 'counts', before, after: empty });
      ledger.counts.readingsStillEmptyWhenPopulated = empty;
    }
    const withRows = populated.readings.filter((record) => (record.rows ?? 0) > 0).length;
    if (ledger.counts.readingsWithRowsWhenPopulated !== withRows) {
      changes.push({ phase: 'counts', id: 'readingsWithRowsWhenPopulated', field: 'counts', before: ledger.counts.readingsWithRowsWhenPopulated, after: withRows });
      ledger.counts.readingsWithRowsWhenPopulated = withRows;
    }
  }

  return { ledger, changes, problems };
}

// ---------------------------------------------------------------- capture

/**
 * The one configuration fixture, and the reading each section exists to give rows to.
 *
 * Two shapes are deliberately avoided here, both for the same measured reason:
 * `renderConfigOver` used to key the desired value by section name, so two sections sharing a
 * name collapsed into the last one. The aor is therefore `<endpoint>-aor` rather than sharing
 * the endpoint's name -- the pattern nearly every real pjsip.conf uses -- and the `register =>`
 * line is merged into `iax.conf`'s existing `[general]` by `mergeFixture` below rather than
 * added as a second section called `general`. See the ledger's `findings` for what happened
 * when it was not routed around.
 *
 * That collapse is repaired: `renderConfigOver` now matches sections occurrence by occurrence
 * and round-trips a repeated name byte for byte, held by the tests in
 * `tests/control-plane/config-round-trip.test.ts`. The fixture is left as it was captured
 * regardless, because the committed captures were taken under this shape and rewriting the
 * fixture without re-running it against a live target would describe a run that never
 * happened. Widening it belongs to the next capture pass.
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
 * writing when the file it is given already contains a duplicate name.
 *
 * That refusal was originally there because the write path could not represent a repeated
 * name at all. It can now, so the refusal is no longer a defect being routed around -- it is
 * what keeps this fold unambiguous. With a name appearing twice, "append these entries to
 * that section" has two answers and this function has no basis for choosing between them,
 * and quietly picking one would put fixture rows somewhere the ledger does not describe.
 * Saying so by name still beats discovering it three steps later as `Post-read mismatch`.
 */
export function mergeFixture(existing, additions) {
  const names = existing.map((section) => section.name);
  const duplicated = names.filter((name, index) => names.indexOf(name) !== index);
  if (duplicated.length > 0) {
    throw new Error(`This file already repeats the section name(s) ${[...new Set(duplicated)].join(', ')}, so which of them the fixture should be folded into is ambiguous. Nothing was written.`);
  }
  const fixtureNames = additions.map((section) => section.name);
  if (new Set(fixtureNames).size !== fixtureNames.length) {
    throw new Error('The fixture itself repeats a section name, so the section each addition belongs to is ambiguous.');
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
  if (argv.includes('--reparse')) {
    const { ledger, changes, problems } = reparseLedger(
      JSON.parse(readFileSync(LEDGER_PATH, 'utf8')),
      (path) => readFileSync(join(CAPTURE_DIRECTORY, path), 'utf8'),
    );
    if (problems.length > 0) {
      console.error(`live-readings --reparse refused to write, ${problems.length} problem(s):`);
      for (const problem of problems) console.error(`  - ${problem}`);
      process.exitCode = 1;
      return;
    }
    if (changes.length === 0) {
      console.log('live-readings --reparse: the parse half already matches the committed captures; nothing written.');
      return;
    }
    /* Printed rather than summarised. A mode that rewrites recorded evidence has to say
     * exactly what it rewrote, or it is indistinguishable from one that rewrote anything. */
    for (const change of changes) {
      console.log(`  ${change.phase}/${change.id}.${change.field}: ${JSON.stringify(change.before)} -> ${JSON.stringify(change.after)}`);
    }
    writeFileSync(LEDGER_PATH, `${JSON.stringify(ledger, undefined, 2)}\n`, 'utf8');
    console.log(`live-readings --reparse: ${changes.length} field(s) re-derived from committed captures; wrote ${LEDGER_PATH}`);
    return;
  }
  if (argv.includes('--capture-added')) {
    await captureAdded(argv);
    return;
  }
  if (!argv.includes('--capture')) {
    console.error('Usage: live-readings.mjs --check | --reparse | --capture | --capture-added [--distribution=NAME]');
    process.exitCode = 2;
    return;
  }
  await capture(argv);
}

/**
 * Runs every command in `COMMANDS_ALLOWLISTED_AFTER_THE_RUN` against a target, populates and
 * restores whatever subsystem each one reads, and writes the result into the ledger's
 * `commandsAllowlistedAfterThisRun` section.
 *
 * It touches nothing else in the ledger. The phases, the fixture, the restore and every
 * production-reader result stay exactly as the run that produced them recorded, because this
 * is a different run against a different exchange state and merging the two would describe a
 * run that never happened.
 */
async function captureAdded(argv) {
  const { NodeProcessExecutor } = await import('../control-plane/executor.js');
  const named = argv.find((argument) => argument.startsWith('--distribution='));
  const distribution = named ? named.slice('--distribution='.length) : 'ding-pbx-console';
  const target = { id: 'live', displayName: distribution, connectionKind: 'wsl', wslDistribution: distribution };
  const executor = new NodeProcessExecutor({ allowedExecutables: ['wsl.exe'] });
  const gateway = new LocalAsteriskCliGateway(executor);

  /* The populate and restore steps are not production paths and are not pretending to be:
   * this console has no way to put a file into a target's media cache, which is the whole
   * reason the subsystem needs filling by hand before a capture of it is worth anything.
   * The command being captured still goes through the gateway. */
  const shell = async (script) => {
    const result = await executor.execute({
      executable: 'wsl.exe',
      args: ['-d', distribution, '--', 'sh', '-c', script],
      timeoutMs: 60_000,
    });
    return result.stdout;
  };

  const version = (await gateway.run(target, 'core show version')).stdout.trim();
  const runFromCommit = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: CONSOLE_ROOT, encoding: 'utf8' }).stdout.trim();
  console.log(`target: ${distribution} -- ${version}`);

  mkdirSync(join(CAPTURE_DIRECTORY, ADDED_CAPTURE_PREFIX), { recursive: true });

  const records = [];
  for (const entry of COMMANDS_ALLOWLISTED_AFTER_THE_RUN) {
    const take = async (state) => {
      const result = await gateway.run(target, entry.command);
      const relative = `${ADDED_CAPTURE_PREFIX}/${entry.slug}.${state}.txt`;
      writeFileSync(join(CAPTURE_DIRECTORY, relative), result.stdout, 'utf8');
      const parsed = entry.parser(result.stdout);
      /* Both shapes, because a parser here returns either a bare array of rows or a result
       * object carrying them beside what it refused. Reading only `.items` would record no
       * count at all for the first kind, which reads as "no rows" rather than "nobody
       * counted" -- and a zero nobody measured is exactly the sort of number this ledger
       * exists to keep out. */
      const rows = Array.isArray(parsed) ? parsed.length : parsed?.items?.length;
      return {
        path: relative,
        status: result.status,
        exitCode: result.exitCode,
        outcome: classify(result.stdout),
        stdoutLength: result.stdout.length,
        stdoutSha256: sha256(result.stdout),
        redactedMarkers: (result.stdout.match(/\[REDACTED\]/gu) ?? []).length,
        parsedSha256: sha256(canonical(parsed)),
        rows,
      };
    };

    const captures = { unpopulated: await take('unpopulated') };
    let populated;
    if (entry.populate) {
      populated = await entry.populate({ shell, distribution });
      captures.populated = await take('populated');
      /* A populate that changed nothing has to fail here, loudly, and this assertion exists
       * because its absence already cost a run. The first `--capture-added` wrote three
       * identical captures of an empty listing: the perl source had been silently mangled in
       * transit, every `media cache refresh` answered `Unable to refresh`, and the restore
       * proof below *passed* -- because after-restore trivially equals before-populate when
       * the populate did nothing at all. Three green captures, a satisfied restore proof, and
       * no rows anywhere. A proof whose condition cannot be violated is not a proof. */
      if (captures.populated.stdoutSha256 === captures.unpopulated.stdoutSha256) {
        throw new Error(`${entry.command}: the populate step changed nothing -- the populated capture is byte-identical to the unpopulated one, so there is no populated state to verify a parser against.`);
      }
      await entry.restore({ shell, distribution });
      captures.afterRestore = await take('after-restore');
    }
    /* Proved here as well as in `--check`, so a run that failed to put the target back says
     * so at the moment it happened rather than leaving it for a later reader to notice. */
    const restored = captures.afterRestore === undefined
      || captures.afterRestore.stdoutSha256 === captures.unpopulated.stdoutSha256;
    if (!restored) {
      throw new Error(`${entry.command}: the target was not put back -- after-restore hashes ${captures.afterRestore.stdoutSha256}, before ${captures.unpopulated.stdoutSha256}`);
    }
    records.push({
      command: entry.command,
      parser: entry.parser.name,
      reason: entry.reason,
      unpopulatedIs: entry.unpopulatedIs,
      populatedBy: populated ?? null,
      restored,
      ranAt: new Date().toISOString(),
      runFromCommit,
      exchange: { distribution, version },
      gateway: 'LocalAsteriskCliGateway over NodeProcessExecutor -- the production read path, not a re-implementation',
      notFromThePhaseRun: 'These bytes are a separate run against a separate exchange state. The phases, fixture, restore and production-reader records above are untouched by it.',
      captures,
    });
    console.log(`  ${entry.command}: ${Object.keys(captures).join(', ')}${restored ? '' : ' -- NOT RESTORED'}`);
  }

  const ledger = JSON.parse(readFileSync(LEDGER_PATH, 'utf8'));
  ledger.commandsAllowlistedAfterThisRun = records;
  writeFileSync(LEDGER_PATH, `${JSON.stringify(ledger, undefined, 2)}\n`, 'utf8');
  console.log(`live-readings --capture-added: ${records.length} command(s); wrote ${LEDGER_PATH}`);
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
