import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { READ_ONLY_COMMANDS } from '../../control-plane/asterisk-readings.js';
import { CONFIGURABLE_RESOURCES } from '../../control-plane/wsl-config-transport.js';

/**
 * Proves the console's capability surface against Asterisk itself.
 *
 * This repository is the Asterisk source tree, so every claim these two lists make is
 * checkable here rather than taken on trust. That matters more than it sounds: a command
 * that does not exist fails at the target and reads to a user as a broken subsystem, and
 * a configuration file Asterisk never loads is a screen whose controls quietly do
 * nothing. Both failures look like the product is broken when the real fault is a name
 * somebody remembered instead of checked.
 */
const root = resolve(import.meta.dirname, '..', '..', '..');

/** The module directories that register CLI commands. */
const SOURCE_DIRECTORIES = ['res', 'channels', 'main', 'apps', 'pbx', 'funcs', 'cdr', 'cel', 'bridges', 'codecs', 'formats'];

function sourceFiles(): ReadonlyArray<string> {
  const found: string[] = [];
  const walk = (directory: string) => {
    let entries: ReadonlyArray<string>;
    try { entries = readdirSync(directory); } catch { return; }
    for (const entry of entries) {
      const path = join(directory, entry);
      try {
        if (readdirSync(path).length >= 0) { walk(path); continue; }
      } catch {
        if (entry.endsWith('.c')) found.push(path);
      }
    }
  };
  for (const directory of SOURCE_DIRECTORIES) walk(join(root, directory));
  return found;
}

/** One pass over the sources; scanning per command would be far too slow. */
let corpus: string | undefined;
function sources(): string {
  if (corpus === undefined) {
    corpus = sourceFiles().map((path) => {
      try { return readFileSync(path, 'utf8'); } catch { return ''; }
    }).join('\n');
  }
  return corpus;
}

test('the source tree this test checks against is really present', () => {
  const files = sourceFiles();
  assert.ok(files.length > 500, `expected the Asterisk sources, found ${files.length} C files — the check would pass by looking at nothing`);
});

/**
 * Asterisk registers a command PATH and takes its arguments separately, so a full
 * invocation is rarely a single literal in the sources: `core show channels concise` is
 * registered as `core show channels` with `[concise|verbose|count]` following it. The
 * check therefore looks for the longest leading portion that Asterisk really registers,
 * down to two words. Requiring the whole invocation rejected eight commands that
 * demonstrably work; accepting a single word would accept almost anything.
 */
function registeredPath(command: string, body: string): string | undefined {
  const words = command.split(' ');
  for (let length = words.length; length >= 2; length -= 1) {
    const candidate = words.slice(0, length).join(' ');
    /* Asterisk keeps the argument spec inside the same literal, so the registration for
     * this command reads "core show channels [concise|verbose|count]". Requiring a
     * closing quote therefore misses it. Accept the path followed by a quote or by a
     * space, which still refuses a name that merely starts the same way. */
    if (body.includes(`"${candidate}"`) || body.includes(`"${candidate} `)) return candidate;
  }
  return undefined;
}

test('every read-only command is a command Asterisk actually registers', () => {
  const body = sources();
  const missing = READ_ONLY_COMMANDS.filter((command) => registeredPath(command, body) === undefined);
  assert.deepEqual(missing, [], `these commands do not appear in the Asterisk sources:\n  ${missing.join('\n  ')}`);
});

test('negative regression: an invented command is still caught by the prefix check', () => {
  /* The real command is `geoloc show profiles`. `geolocation show profiles` was a first
   * guess while expanding the list, and only checking the sources caught it. It must
   * still be caught now the check accepts prefixes: neither the whole name nor
   * `geolocation show` is registered anywhere. */
  const body = sources();
  assert.equal(registeredPath('geolocation show profiles', body), undefined, 'the relaxed check no longer catches an invented name');
  assert.equal(registeredPath('sip show peers', body), undefined, 'chan_sip was removed from Asterisk; its commands must not pass');
  /* And a real one still resolves, so the check is not simply refusing everything. */
  assert.equal(registeredPath('geoloc show profiles', body), 'geoloc show profiles');
  assert.equal(registeredPath('core show channels concise', body), 'core show channels');
});

/**
 * A hand-written inventory of every resource CONFIGURABLE_RESOURCES is expected to
 * carry, by basename. The count tripwire below only notices the list getting shorter;
 * it says nothing if a resource is silently swapped for another one while the total
 * count holds steady or grows. This checks identity, not just size.
 */
const EXPECTED_RESOURCE_BASENAMES: ReadonlyArray<string> = [
  "pjsip.conf",
  "extensions.conf",
  "queues.conf",
  "voicemail.conf",
  "confbridge.conf",
  "musiconhold.conf",
  "cdr.conf",
  "manager.conf",
  "logger.conf",
  "rtp.conf",
  "modules.conf",
  "acl.conf",
  "chan_dahdi.conf",
  "iax.conf",
  "res_fax.conf",
  "cel.conf",
  "cel_odbc.conf",
  "cel_pgsql.conf",
  "res_odbc.conf",
  "extconfig.conf",
  "sorcery.conf",
  "res_pgsql.conf",
  "res_ldap.conf",
  "cdr_odbc.conf",
  "cdr_pgsql.conf",
  "http.conf",
  "ari.conf",
  "stir_shaken.conf",
  "geolocation.conf",
  "phoneprov.conf",
  "features.conf",
  "res_parking.conf",
  "sla.conf",
  "dundi.conf",
  "calendar.conf",
  "queuerules.conf",
  "udptl.conf",
  "res_stun_monitor.conf",
  "res_snmp.conf",
  "prometheus.conf",
  "xmpp.conf",
  "adsi.conf",
  "asterisk.conf",
  "festival.conf",
  "cli_aliases.conf",
  "cli_permissions.conf",
  "indications.conf",
  "agents.conf",
  "followme.conf",
  "meetme.conf",
  "minivm.conf",
  "extensions_minivm.conf",
  "amd.conf",
  "alarmreceiver.conf",
  "ss7.timers",
  "aeap.conf",
  "ccss.conf",
  "chan_websocket.conf",
  "websocket_client.conf",
  "motif.conf",
  "unistim.conf",
  "pjproject.conf",
  "pjsip_notify.conf",
  "pjsip_wizard.conf",
  "iaxprov.conf",
  "phoneprov_users.conf",
  "cdr_adaptive_odbc.conf",
  "cdr_beanstalkd.conf",
  "cdr_custom.conf",
  "cdr_manager.conf",
  "cdr_sqlite3_custom.conf",
  "cel_beanstalkd.conf",
  "cel_custom.conf",
  "cel_sqlite3_custom.conf",
  "res_config_odbc.conf",
  "res_config_sqlite3.conf",
  "func_odbc.conf",
  "hep.conf",
  "res_curl.conf",
  "res_http_media_cache.conf",
  "cli.conf",
  "codecs.conf",
  "dnsmgr.conf",
  "dsp.conf",
  "enum.conf",
  "resolver_unbound.conf",
  "res_corosync.conf",
  "say.conf",
  "smdi.conf",
  "statsd.conf",
  "stasis.conf",
];

test('every hand-written expected resource is still on the allowlist by name', () => {
  const actual = new Set(CONFIGURABLE_RESOURCES.map((resource) => basename(resource)));
  const expected = new Set(EXPECTED_RESOURCE_BASENAMES);
  const missing = [...expected].filter((name) => !actual.has(name));
  const unexpected = [...actual].filter((name) => !expected.has(name));
  assert.deepEqual(missing, [], `these expected resources are gone from CONFIGURABLE_RESOURCES:
  ${missing.join('\n  ')}`);
  assert.deepEqual(unexpected, [], `these resources are on CONFIGURABLE_RESOURCES but not in the hand-written expected list above — add them there deliberately:
  ${unexpected.join('\n  ')}`);
});

test('every configurable resource is a file Asterisk actually ships a sample for', () => {
  const samples = join(root, 'configs', 'samples');
  const missing = CONFIGURABLE_RESOURCES.filter((resource) => !existsSync(join(samples, `${basename(resource)}.sample`)));
  assert.deepEqual(missing, [], `these files have no Asterisk sample, so Asterisk may never read them:\n  ${missing.join('\n  ')}`);
});

test('every configurable resource is an absolute path under the configuration directory', () => {
  for (const resource of CONFIGURABLE_RESOURCES) {
    assert.ok(resource.startsWith('/etc/asterisk/'), `${resource} is not under the configuration directory`);
    assert.ok(!resource.includes('..'), `${resource} contains a traversal`);
    assert.equal(resource.split('/').length, 4, `${resource} is not a direct child of the configuration directory`);
  }
});

test('neither list carries a duplicate', () => {
  assert.equal(new Set(READ_ONLY_COMMANDS).size, READ_ONLY_COMMANDS.length, 'a command is listed twice');
  assert.equal(new Set(CONFIGURABLE_RESOURCES).size, CONFIGURABLE_RESOURCES.length, 'a resource is listed twice');
});

test('the surface has actually grown, so a regression that empties it fails', () => {
  /* Tripwires, not targets. A list that silently shrinks is the failure mode here:
   * capability quietly disappears and every screen above it goes empty with no error. */
  assert.ok(READ_ONLY_COMMANDS.length >= 60, `only ${READ_ONLY_COMMANDS.length} read-only commands remain`);
  assert.ok(CONFIGURABLE_RESOURCES.length >= 85, `only ${CONFIGURABLE_RESOURCES.length} configurable resources remain`);
});

test('no read-only command is one that writes', () => {
  /* Every command here is run without confirmation, so a write hiding among the reads
   * would change a live exchange from a screen that only meant to look at it. */
  const writes = ['reload', 'set ', 'add ', 'remove ', 'delete', 'restart', 'stop', 'shutdown', 'originate', 'unload', 'load '];
  for (const command of READ_ONLY_COMMANDS) {
    for (const write of writes) {
      assert.ok(!command.includes(write), `"${command}" contains "${write.trim()}" and may not be read-only`);
    }
  }
});

test('the bare, argument-free "media cache show" is not allowlisted', () => {
  /* `main/media_cache.c` `media_cache_handle_show_item` registers the three-word path
   * `media cache show` and requires `a->argc == 4` -- a URI this allowlist has no id to
   * supply, since every entry here is a complete, argument-free command line. A bare
   * invocation therefore only ever prints its own `Usage: media cache show <uri>` line
   * (exit code 0, verified against a live target -- see docs/evidence/live-readings.md
   * finding 3), which `AsteriskReadings` cannot tell apart from real data and the CLI
   * screen renders as a successful reading. */
  assert.ok(!(READ_ONLY_COMMANDS as readonly string[]).includes('media cache show'));
  /* `media cache show all` (`media_cache_handle_show_all`) is the real no-argument
   * command -- a genuinely different, four-word registered path -- and is deliberately
   * not allowlisted in its place: that would be a new live-target reading nothing has
   * actually run, which is exactly what `live-readings --check`'s coverage rule ("a
   * command added to the allowlist after this ran is a command nothing has ever run
   * against a target") exists to catch. */
  assert.ok(!(READ_ONLY_COMMANDS as readonly string[]).includes('media cache show all'));
});
