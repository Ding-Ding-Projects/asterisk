import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseVoicemailUsers,
  parseVoicemailZones,
  parseConfbridgeList,
  parseMohClasses,
  parseCodecs,
  parseTranslations,
  parseAclRules,
  parseManagerSettings,
  parseManagerUsers,
  parseAriApps,
  parseAriUsers,
  parseBridges,
  parseApplications,
  parseCdrStatus,
  parseLoggerChannels,
  parseSysinfo,
  parseUptime,
} from '../../control-plane/asterisk-parsers.js';

// ---------------------------------------------------------------- voicemail users
// apps/app_voicemail.c HVSU_OUTPUT_FORMAT "%-10s %-5s %-25s %-10s %6s\n"

test('parseVoicemailUsers reads a realistic sample', () => {
  const sample = [
    'Context    Mbox  User                      Zone            NewMsg',
    'default    1234  Alice Example              america          3',
    'default    5678  Bob Example                america          0',
    '2 voicemail users configured.',
  ].join('\n');
  const { users, total } = parseVoicemailUsers(sample);
  assert.equal(users.length, 2);
  assert.deepEqual(users[0], { context: 'default', mailbox: '1234', fullName: 'Alice Example', zone: 'america', newMessages: 3 });
  assert.equal(users[1].mailbox, '5678');
  assert.equal(total, 2);
});

test('parseVoicemailUsers returns empty on empty input', () => {
  assert.deepEqual(parseVoicemailUsers(''), { users: [], total: undefined });
});

test('parseVoicemailUsers skips a malformed line rather than crashing', () => {
  const sample = [
    'Context    Mbox  User                      Zone            NewMsg',
    'not a real row at all',
    'default    1234  Alice Example              america          3',
  ].join('\n');
  const { users } = parseVoicemailUsers(sample);
  assert.equal(users.length, 1);
  assert.equal(users[0].mailbox, '1234');
});

test('parseVoicemailUsers preserves report order', () => {
  const sample = [
    'default    3333  Zeta                       america          0',
    'default    1111  Alpha                      america          0',
  ].join('\n');
  const { users } = parseVoicemailUsers(sample);
  assert.deepEqual(users.map((u) => u.mailbox), ['3333', '1111']);
});

test('parseVoicemailUsers leaves newMessages undefined for a non-numeric value', () => {
  const sample = 'default    1234  Alice Example              america          n/a';
  const { users } = parseVoicemailUsers(sample);
  assert.equal(users[0].newMessages, undefined);
});

// ---------------------------------------------------------------- voicemail zones
// apps/app_voicemail.c HVSZ_OUTPUT_FORMAT "%-15s %-20s %-45s\n"

test('parseVoicemailZones reads a realistic sample', () => {
  const sample = [
    'Zone            Timezone             Message Format',
    'america         America/New_York     "vm-received" q \'digits/at\' M',
  ].join('\n');
  const rows = parseVoicemailZones(sample);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].zone, 'america');
  assert.equal(rows[0].timezone, 'America/New_York');
});

test('parseVoicemailZones returns empty on empty input', () => {
  assert.deepEqual(parseVoicemailZones(''), []);
});

test('parseVoicemailZones skips a malformed line', () => {
  const sample = ['Zone            Timezone             Message Format', 'garbage'].join('\n');
  assert.deepEqual(parseVoicemailZones(sample), []);
});

// ---------------------------------------------------------------- confbridge list
// apps/app_confbridge.c "%-32s %6u %6u %-6s %s\n"

test('parseConfbridgeList reads a realistic sample', () => {
  const sample = [
    'Conference Bridge Name           Users  Marked Locked Muted',
    '================================ ====== ====== ====== =====',
    '1000                                  3      1 No     No',
    '2000                                  1      0 Yes    Yes',
  ].join('\n');
  const rows = parseConfbridgeList(sample);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], { name: '1000', users: 3, marked: 1, locked: false, muted: false });
  assert.deepEqual(rows[1], { name: '2000', users: 1, marked: 0, locked: true, muted: true });
});

test('parseConfbridgeList returns empty on empty input', () => {
  assert.deepEqual(parseConfbridgeList(''), []);
});

test('parseConfbridgeList skips a malformed line', () => {
  const sample = [
    'Conference Bridge Name           Users  Marked Locked Muted',
    'nonsense row here',
  ].join('\n');
  assert.deepEqual(parseConfbridgeList(sample), []);
});

// ---------------------------------------------------------------- moh classes
// res/res_musiconhold.c handle_cli_moh_show_classes: "Class: %s\n" + "\tKey: value\n"

test('parseMohClasses reads a realistic sample', () => {
  const sample = [
    'Class: default',
    '\tMode: files',
    '\tDirectory: default',
    'Class: ringback',
    '\tMode: custom',
    '\tDirectory: <none>',
    '\tApplication: /usr/bin/mpg123',
    '\tKill Escalation Delay: 100 ms',
    '\tKill Method: process',
  ].join('\n');
  const rows = parseMohClasses(sample);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].name, 'default');
  assert.equal(rows[0].mode, 'files');
  assert.equal(rows[1].application, '/usr/bin/mpg123');
  assert.equal(rows[1].directory, undefined);
});

test('parseMohClasses returns empty on empty input', () => {
  assert.deepEqual(parseMohClasses(''), []);
});

test('parseMohClasses skips a malformed line rather than crashing', () => {
  const sample = ['Class: default', 'not a key value line'].join('\n');
  const rows = parseMohClasses(sample);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].mode, undefined);
});

// ---------------------------------------------------------------- codecs
// main/codec.c "%8s %-5s %-12s %-16s %7s %s\n" / "%8u %-5s %-12s %-16s %7d (%s)\n"

test('parseCodecs reads a realistic sample', () => {
  const sample = [
    'Disclaimer: this command is for informational purposes only.',
    '\tIt does not indicate anything about your configuration.',
    '      ID TYPE  NAME         FORMAT           QUALITY DESCRIPTION',
    '------------------------------------------------------------------------------------------------',
    '       1 audio g723         g723               1 (G.723.1)',
    '       3 audio ulaw         ulaw               2 (G.711 u-law)',
  ].join('\n');
  const rows = parseCodecs(sample);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], { id: 1, type: 'audio', name: 'g723', format: 'g723', quality: 1, description: 'G.723.1' });
  assert.equal(rows[1].description, 'G.711 u-law');
});

test('parseCodecs returns empty on empty input', () => {
  assert.deepEqual(parseCodecs(''), []);
});

test('parseCodecs skips a malformed line', () => {
  const sample = ['      ID TYPE  NAME         FORMAT           QUALITY DESCRIPTION', 'garbage line'].join('\n');
  assert.deepEqual(parseCodecs(sample), []);
});

// ---------------------------------------------------------------- translations
// main/translate.c handle_show_translation_table: header row of codec names, then rows

test('parseTranslations reads a realistic sample', () => {
  const sample = [
    '         Translation times between formats (in microseconds) for one second of data',
    '          Source Format (Rows) Destination Format (Columns)',
    '',
    '        ulaw  alaw slin',
    '  ulaw     -   148   88',
    '  alaw   148     -   88',
  ].join('\n');
  const rows = parseTranslations(sample);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].sourceFormat, 'ulaw');
  assert.equal(rows[0].costs.alaw, 148);
  assert.equal(rows[0].costs.ulaw, undefined);
  assert.equal(rows[1].costs.slin, 88);
});

test('parseTranslations returns empty on empty input', () => {
  assert.deepEqual(parseTranslations(''), []);
});

test('parseTranslations skips a header-only input with no data rows', () => {
  const sample = [
    '         Translation times between formats (in microseconds) for one second of data',
    '          Source Format (Rows) Destination Format (Columns)',
    '',
    '        ulaw  alaw',
  ].join('\n');
  assert.deepEqual(parseTranslations(sample), []);
});

// ---------------------------------------------------------------- acl show
// main/named_acl.c cli_display_named_acl_list: "\nacl\n---\n" then one name per line

test('parseAclRules reads a realistic sample', () => {
  const sample = ['acl', '---', 'trusted-networks', 'internal-only'].join('\n');
  const rows = parseAclRules(sample);
  assert.deepEqual(rows, [{ name: 'trusted-networks' }, { name: 'internal-only' }]);
});

test('parseAclRules returns empty on empty input', () => {
  assert.deepEqual(parseAclRules(''), []);
});

test('parseAclRules returns empty when the configuration is unavailable', () => {
  const sample = ['acl', '---', "ACL configuration isn't available."].join('\n');
  assert.deepEqual(parseAclRules(sample), []);
});

test('parseAclRules preserves report order', () => {
  const sample = ['acl', '---', 'zzz-last', 'aaa-first'].join('\n');
  assert.deepEqual(parseAclRules(sample).map((r) => r.name), ['zzz-last', 'aaa-first']);
});

// ---------------------------------------------------------------- manager show settings
// main/manager.c handle_manager_show_settings: "  %-25.25s  %-15.55s\n" label/value pairs

test('parseManagerSettings reads a realistic sample', () => {
  const sample = [
    'Global Settings:',
    '----------------',
    '  Manager (AMI):             Yes',
    '  Web Manager (AMI/HTTP):    No',
    '  HTTP Timeout (seconds):    30',
  ].join('\n');
  const { settings } = parseManagerSettings(sample);
  assert.equal(settings['Manager (AMI)'], 'Yes');
  assert.equal(settings['Web Manager (AMI/HTTP)'], 'No');
  assert.equal(settings['HTTP Timeout (seconds)'], '30');
});

test('parseManagerSettings returns empty settings on empty input', () => {
  assert.deepEqual(parseManagerSettings(''), { settings: {} });
});

test('parseManagerSettings skips a malformed line', () => {
  const sample = ['Global Settings:', '----------------', 'not a key value line at all'].join('\n');
  assert.deepEqual(parseManagerSettings(sample), { settings: {} });
});

// ---------------------------------------------------------------- manager show users
// main/manager.c handle_showmanagers: "\nusername\n--------\n" ... "%d manager users configured.\n"

test('parseManagerUsers reads a realistic sample', () => {
  const sample = ['username', '--------', 'admin', 'operator', '-------------------', '2 manager users configured.'].join(
    '\n',
  );
  const { users, total } = parseManagerUsers(sample);
  assert.deepEqual(users, [{ username: 'admin' }, { username: 'operator' }]);
  assert.equal(total, 2);
});

test('parseManagerUsers returns empty on empty input', () => {
  assert.deepEqual(parseManagerUsers(''), { users: [], total: undefined });
});

test('parseManagerUsers handles the no-users message without producing a fake row', () => {
  const sample = 'There are no manager users.';
  assert.deepEqual(parseManagerUsers(sample), { users: [], total: undefined });
});

// ---------------------------------------------------------------- ari show apps
// res/ari/cli.c ari_show_apps: "Application Name         \n" + "=====...\n" + one name per line

test('parseAriApps reads a realistic sample', () => {
  const sample = ['Application Name         ', '=========================', 'my-stasis-app', 'ivr-app'].join('\n');
  assert.deepEqual(parseAriApps(sample), [{ name: 'my-stasis-app' }, { name: 'ivr-app' }]);
});

test('parseAriApps returns empty on empty input', () => {
  assert.deepEqual(parseAriApps(''), []);
});

test('parseAriApps returns empty when applications cannot be retrieved', () => {
  const sample = 'Unable to retrieve registered applications!';
  assert.deepEqual(parseAriApps(sample), []);
});

// ---------------------------------------------------------------- ari show users
// res/ari/cli.c ari_show_users: "r/o?  ACL?  Username\n" + "----  ----  --------\n" + rows

test('parseAriUsers reads a realistic sample', () => {
  const sample = ['r/o?  ACL?  Username', '----  ----  --------', 'No    Yes   admin', 'Yes   No    dashboard'].join('\n');
  assert.deepEqual(parseAriUsers(sample), [
    { readOnly: false, hasAcl: true, username: 'admin' },
    { readOnly: true, hasAcl: false, username: 'dashboard' },
  ]);
});

test('parseAriUsers returns empty on empty input', () => {
  assert.deepEqual(parseAriUsers(''), []);
});

// ---------------------------------------------------------------- bridge show all
// main/bridge.c handle_bridge_show_all: "%-36s %-36s %5s %-15s %-15s %s\n"

test('parseBridges reads a realistic sample', () => {
  const header = 'Bridge-ID'.padEnd(36) + ' ' + 'Name'.padEnd(36) + ' ' + 'Chans'.padStart(5) + ' ' + 'Type'.padEnd(15) + ' ' + 'Technology'.padEnd(15) + ' ' + 'Duration';
  const row = 'a1b2c3d4-0000-0000-0000-000000000001'.padEnd(36) + ' ' + 'into-conf'.padEnd(36) + ' ' + '3'.padStart(5) + ' ' + 'basic'.padEnd(15) + ' ' + 'simple_bridge'.padEnd(15) + ' ' + '00:04:12';
  const sample = [header, row].join('\n');
  assert.deepEqual(parseBridges(sample), [
    { id: 'a1b2c3d4-0000-0000-0000-000000000001', name: 'into-conf', channels: 3, bridgeType: 'basic', technology: 'simple_bridge', duration: '00:04:12' },
  ]);
});

test('parseBridges reads the header alone as no bridges, not an error', () => {
  const header = 'Bridge-ID'.padEnd(36) + ' ' + 'Name'.padEnd(36) + ' ' + 'Chans'.padStart(5) + ' ' + 'Type'.padEnd(15) + ' ' + 'Technology'.padEnd(15) + ' ' + 'Duration';
  assert.deepEqual(parseBridges(header), []);
});

test('parseBridges returns empty on empty input', () => {
  assert.deepEqual(parseBridges(''), []);
});

// ---------------------------------------------------------------- core show applications
// main/pbx_app.c handle_show_applications: banner, "  %20s: %s\n" rows, trailing count

test('parseApplications reads a realistic sample', () => {
  const sample = [
    '    -= Registered Asterisk Applications =-',
    '                Dial: Attempt a call to a channel or channels',
    '            Playback: Play a file',
    '    -= 2 Applications Registered =-',
  ].join('\n');
  assert.deepEqual(parseApplications(sample), [
    { name: 'Dial', synopsis: 'Attempt a call to a channel or channels' },
    { name: 'Playback', synopsis: 'Play a file' },
  ]);
});

test('parseApplications returns empty when nothing at all is registered', () => {
  assert.deepEqual(parseApplications('There are no registered applications'), []);
});

test('parseApplications returns empty on empty input', () => {
  assert.deepEqual(parseApplications(''), []);
});

// ---------------------------------------------------------------- cdr show status
// main/cdr.c handle_cli_status: key/value pairs plus "* Registered Backends" section

test('parseCdrStatus reads a realistic sample', () => {
  const sample = [
    'Call Detail Record (CDR) settings',
    '----------------------------------',
    '  Logging:                    Enabled',
    '  Mode:                       Simple',
    '* Registered Backends',
    '  -------------------',
    '    cdr_csv',
    '    cdr_custom (suspended)',
  ].join('\n');
  const { settings, backends } = parseCdrStatus(sample);
  assert.equal(settings['Logging'], 'Enabled');
  assert.equal(settings['Mode'], 'Simple');
  assert.deepEqual(backends, [
    { name: 'cdr_csv', suspended: false },
    { name: 'cdr_custom', suspended: true },
  ]);
});

test('parseCdrStatus returns empty on empty input', () => {
  assert.deepEqual(parseCdrStatus(''), { settings: {}, backends: [] });
});

test('parseCdrStatus reports no backends when none are registered', () => {
  const sample = ['Call Detail Record (CDR) settings', '* Registered Backends', '    (none)'].join('\n');
  const { backends } = parseCdrStatus(sample);
  assert.deepEqual(backends, []);
});

// ---------------------------------------------------------------- logger show channels
// main/logger.c handle_logger_show_channels: FORMATL rows + " - " + level names

test('parseLoggerChannels reads a realistic sample', () => {
  const sample = [
    'Logger queue limit: 1000',
    '',
    'Channel                             Type     Formatter  Status    Configuration',
    '-------                             ----     ---------  ------    -------------',
    '/var/log/asterisk/messages          File     plain      Enabled - error warning notice ',
    'console                             Console  plain      Enabled - verbose ',
  ].join('\n');
  const { queueLimit, channels } = parseLoggerChannels(sample);
  assert.equal(queueLimit, 1000);
  assert.equal(channels.length, 2);
  assert.equal(channels[0].channel, '/var/log/asterisk/messages');
  assert.deepEqual(channels[0].levels, ['error', 'warning', 'notice']);
  assert.equal(channels[1].type, 'Console');
});

test('parseLoggerChannels returns empty channel list on empty input', () => {
  assert.deepEqual(parseLoggerChannels(''), { queueLimit: undefined, channels: [] });
});

test('parseLoggerChannels skips a malformed line', () => {
  const sample = ['Logger queue limit: 5', 'not a channel row'].join('\n');
  const { channels } = parseLoggerChannels(sample);
  assert.deepEqual(channels, []);
});

// ---------------------------------------------------------------- core show sysinfo
// main/asterisk.c handle_show_sysinfo: "  Key:             value\n" lines

test('parseSysinfo reads a realistic sample', () => {
  const sample = [
    'System Statistics',
    '-----------------',
    '  System Uptime:             12 hours',
    '  Total RAM:                 16384000 KiB',
    '  Free RAM:                  2048000 KiB',
    '  Number of Processes:       210 ',
  ].join('\n');
  const { values } = parseSysinfo(sample);
  assert.equal(values['System Uptime'], '12 hours');
  assert.equal(values['Total RAM'], '16384000 KiB');
  assert.equal(values['Number of Processes'], '210');
});

test('parseSysinfo returns empty on empty input', () => {
  assert.deepEqual(parseSysinfo(''), { values: {} });
});

test('parseSysinfo skips a malformed line', () => {
  const sample = ['System Statistics', '-----------------', 'not a key value line'].join('\n');
  assert.deepEqual(parseSysinfo(sample), { values: {} });
});

// ---------------------------------------------------------------- core show uptime seconds
// main/cli.c print_uptimestr(printsec=1): "System uptime: <n>\n" / "Last reload: <n>\n"

test('parseUptime reads a realistic sample', () => {
  const sample = 'System uptime: 123456\nLast reload: 42\n';
  assert.deepEqual(parseUptime(sample), { uptimeSeconds: 123456, lastReloadSeconds: 42 });
});

test('parseUptime returns undefined fields on empty input', () => {
  assert.deepEqual(parseUptime(''), { uptimeSeconds: undefined, lastReloadSeconds: undefined });
});

test('parseUptime leaves lastReloadSeconds undefined when no reload has happened', () => {
  const sample = 'System uptime: 5\n';
  assert.deepEqual(parseUptime(sample), { uptimeSeconds: 5, lastReloadSeconds: undefined });
});

test('parseUptime does not turn a non-numeric uptime value into NaN', () => {
  const sample = 'System uptime: not-a-number\n';
  const result = parseUptime(sample);
  assert.equal(result.uptimeSeconds, undefined);
  assert.equal(Number.isNaN(result.uptimeSeconds as unknown as number), false);
});

// ---------------------------------------------------------------- live-target fixtures
//
// Captured verbatim from a running Asterisk on 2026-08-23 via:
//   wsl -d ding-pbx-console --user root -- asterisk -rx "<command>"
// Kept as regression fixtures so a parser change is checked against real output, not
// only against hand-written samples.

test('parseVoicemailUsers reads the live target output', () => {
  const sample = [
    'Context    Mbox  User                      Zone       NewMsg',
    'default    1234  Example Mailbox                           0',
    'myaliases  1234@devices                                           0',
    'other      1234  Company2 User                             0',
    '3 voicemail users configured.',
  ].join('\n');
  const { users, total } = parseVoicemailUsers(sample);
  assert.equal(total, 3);
  // The middle row has no full name or zone printed for an alias mailbox; the parser
  // must not misassign the trailing count into the wrong column, so it is dropped
  // rather than guessed.
  assert.deepEqual(
    users.map((u) => u.mailbox),
    ['1234', '1234'],
  );
  assert.equal(users[0].context, 'default');
  assert.equal(users[0].fullName, 'Example Mailbox');
  assert.equal(users[0].zone, '');
  assert.equal(users[1].context, 'other');
});

test('parseConfbridgeList reads the live target output (no rooms configured)', () => {
  const sample = [
    'Conference Bridge Name           Users  Marked Locked Muted',
    '================================ ====== ====== ====== =====',
  ].join('\n');
  assert.deepEqual(parseConfbridgeList(sample), []);
});

test('parseMohClasses reads the live target output', () => {
  const sample = ['Class: default', '\tMode: files', '\tDirectory: moh'].join('\n');
  const rows = parseMohClasses(sample);
  assert.deepEqual(rows, [{ name: 'default', mode: 'files', directory: 'moh' }]);
});

test('parseManagerUsers reads the live target output (no users configured)', () => {
  const sample = 'There are no manager users.\n';
  assert.deepEqual(parseManagerUsers(sample), { users: [], total: undefined });
});

test('parseAriApps reads the live target output (no apps registered)', () => {
  const sample = ['Application Name         ', '========================='].join('\n');
  assert.deepEqual(parseAriApps(sample), []);
});
