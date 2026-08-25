/**
 * The user-owned half of the settings-source host allowlist: what a host has to look
 * like to be added, and how the persisted list round-trips through JSON.
 *
 * `SettingsSourceFetcher` trusts its allowlist completely -- see its own tests -- so
 * every one of these is really asking the same question from a different angle: can
 * anything other than one exact hostname ever reach that trusted list?
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SETTINGS_SOURCE_ALLOWLIST_KEY, normalizeHost, parseAllowlist, serializeAllowlist,
  validateAllowlistHost,
} from '../../control-plane/settings-source-allowlist.js';

/* --- validateAllowlistHost ----------------------------------------------------------- */

test('an ordinary hostname is accepted', () => {
  assert.deepEqual(validateAllowlistHost('settings.example.net'), []);
});

test('an empty host is refused', () => {
  const problems = validateAllowlistHost('');
  assert.equal(problems.length, 1);
  assert.match(problems[0].message, /cannot be empty/u);
  assert.equal(validateAllowlistHost('   ').length, 1, 'whitespace-only did not read as empty');
});

test('whitespace inside a host is refused', () => {
  const problems = validateAllowlistHost('settings example.net');
  assert.equal(problems.length, 1);
  assert.match(problems[0].message, /whitespace/u);
});

test('a wildcard is refused by name, not merely as an invalid hostname', () => {
  /* Distinct from the generic "not a hostname" refusal below, so the UI can tell a person
   * exactly why "*.example.net" will never work here, rather than showing the same
   * generic parse failure a typo would get. */
  const problems = validateAllowlistHost('*.example.net');
  assert.equal(problems.length, 1);
  assert.match(problems[0].message, /wildcard/u);
});

test('a whole URL is refused rather than silently narrowed to its host', () => {
  /* Silently extracting the hostname from a pasted URL would let "https://good.example/
   * ../evil.example" or similar confusion through unnoticed. Refuse it and say why, so
   * the person retypes the bare host on purpose. */
  for (const value of [
    'https://settings.example.net/console',
    'settings.example.net/console',
    'settings.example.net?x=1',
    'settings.example.net#frag',
    'user:pw@settings.example.net',
    'settings.example.net:8443',
  ]) {
    const problems = validateAllowlistHost(value);
    assert.equal(problems.length, 1, `"${value}" was not refused`);
    assert.match(problems[0].message, /not a plain hostname/u, `"${value}" got the wrong refusal`);
  }
});

test('an unparseable value is refused as an invalid hostname', () => {
  /* A forbidden host code point (`[` outside a bracketed IPv6 literal) is rejected by
   * the URL parser itself, with no scheme/path/query/whitespace/wildcard involved --
   * the one case none of the earlier, more specific refusals already catch. */
  const problems = validateAllowlistHost('exa[mple.net');
  assert.equal(problems.length, 1);
  assert.match(problems[0].message, /not a valid hostname/u);
});

test('case is not a reason to refuse -- comparison is case-insensitive throughout', () => {
  assert.deepEqual(validateAllowlistHost('Settings.Example.NET'), []);
});

/* --- normalizeHost --------------------------------------------------------------------- */

test('normalizeHost trims and lowercases', () => {
  assert.equal(normalizeHost('  Settings.Example.NET  '), 'settings.example.net');
});

/* --- parseAllowlist: untrusted input on the way back in -------------------------------- */

test('nothing persisted parses to an empty list', () => {
  assert.deepEqual(parseAllowlist(undefined), []);
  assert.deepEqual(parseAllowlist(''), []);
});

test('malformed JSON parses to an empty list rather than throwing at startup', () => {
  assert.deepEqual(parseAllowlist('{not json'), []);
});

test('a JSON value that is not an array parses to an empty list', () => {
  assert.deepEqual(parseAllowlist('"settings.example.net"'), []);
  assert.deepEqual(parseAllowlist('{"host":"settings.example.net"}'), []);
  assert.deepEqual(parseAllowlist('42'), []);
});

test('an invalid entry is dropped rather than widening the allowlist', () => {
  /* This is the one guard standing between "somebody hand-edited settings.json" and a
   * host `SettingsSourceFetcher` was never actually asked to trust. */
  const raw = JSON.stringify(['good.example.net', 'https://bad.example.net/x', '*.example.net', '', 42, null]);
  assert.deepEqual(parseAllowlist(raw), ['good.example.net']);
});

test('duplicates collapse, case-insensitively', () => {
  const raw = JSON.stringify(['settings.example.net', 'Settings.Example.NET', ' settings.example.net ']);
  assert.deepEqual(parseAllowlist(raw), ['settings.example.net']);
});

test('a valid list survives whole, in order, lowercased', () => {
  const raw = JSON.stringify(['B.example.net', 'a.example.net']);
  assert.deepEqual(parseAllowlist(raw), ['b.example.net', 'a.example.net']);
});

/* --- serializeAllowlist / round trip ---------------------------------------------------- */

test('serializeAllowlist round-trips through parseAllowlist unchanged', () => {
  const hosts = ['a.example.net', 'b.example.net'];
  assert.deepEqual(parseAllowlist(serializeAllowlist(hosts)), hosts);
});

test('an empty list serializes and parses back empty', () => {
  assert.deepEqual(parseAllowlist(serializeAllowlist([])), []);
});

/* --- the storage key itself, pinned so the renderer and the main process cannot drift -- */

test('the storage key is exactly what durable-storage-backed settings use', () => {
  assert.equal(SETTINGS_SOURCE_ALLOWLIST_KEY, 'console.settingsSourceAllowlist');
});
