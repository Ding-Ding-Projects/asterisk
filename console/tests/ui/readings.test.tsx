import assert from 'node:assert/strict';
import test from 'node:test';

import {
  NOT_READ,
  amiRows,
  badgeFor,
  channelRows,
  confbridgeRows,
  dashboardStats,
  endpointRows,
  formatDuration,
  formatUptime,
  healthBars,
  iaxPeerRows,
  isReadable,
  mohRows,
  moduleRows,
  queueRows,
  reasonFor,
  regexMatchLabel,
  registrationRows,
  rowsFor,
  valueOf,
  voicemailRows,
} from '../../app/renderer/src/readings.ts';
import type {
  Channel, ChannelCodecUsage, Contact, Endpoint, EndpointDetailSet, IaxPeer, IaxRegistration, ModuleSummary, QueueSummary, Registration, ViewReadings,
} from '../../app/renderer/src/readings.ts';

const NOW = '2026-08-22T12:00:00.000Z';

function available<T>(value: T): { command: string; result: { state: 'available'; observedAt: string; value: T } } {
  return { command: 'test', result: { state: 'available', observedAt: NOW, value } };
}

function unavailable(reason: string): { command: string; result: { state: 'unavailable'; observedAt: string; reason: string } } {
  return { command: 'test', result: { state: 'unavailable', observedAt: NOW, reason } };
}

// ---------------------------------------------------------------- valueOf / reasonFor

test('valueOf returns the value only for an available reading', () => {
  assert.equal(valueOf(available(5)), 5);
  assert.equal(valueOf(unavailable('nope')), undefined);
  assert.equal(valueOf(undefined), undefined);
});

test('reasonFor returns the exact unavailable reason for the first matching key', () => {
  const readings: ViewReadings = { channels: unavailable('Unable to connect to remote asterisk') };
  assert.equal(reasonFor(readings, ['channels', 'endpoints']), 'Unable to connect to remote asterisk');
});

test('reasonFor returns empty string when readings are undefined or all available', () => {
  assert.equal(reasonFor(undefined, ['channels']), '');
  assert.equal(reasonFor({ channels: available([]) }, ['channels']), '');
});

// ---------------------------------------------------------------- isReadable

test('isReadable accepts only the six read views the control plane can answer', () => {
  for (const screen of ['dash', 'live', 'endpoints', 'trunks', 'queues', 'modules']) {
    assert.equal(isReadable(screen), true);
  }
  assert.equal(isReadable('settings'), false);
  assert.equal(isReadable(''), false);
});

// ---------------------------------------------------------------- channelRows

test('channelRows prefers caller number, then extension, then NOT_READ', () => {
  const channels: Channel[] = [
    { name: 'PJSIP/1000-1', context: 'from-internal', extension: '1001', state: 'Up', application: 'Dial', callerNumber: '1000', durationSeconds: 65 },
    { name: 'PJSIP/1002-2', context: 'from-internal', extension: '1003', state: 'Ring', application: '', callerNumber: '', durationSeconds: 0 },
    { name: 'PJSIP/1004-3', context: 'from-internal', extension: '', state: 'Down', application: '', callerNumber: '', durationSeconds: 0 },
  ];
  const rows = channelRows(channels);
  assert.deepEqual(rows[0], ['PJSIP/1000-1', '1000', 'Dial', '00:01:05', 'Up']);
  assert.deepEqual(rows[1], ['PJSIP/1002-2', '1003', NOT_READ, '00:00:00', 'Ring']);
  assert.deepEqual(rows[2], ['PJSIP/1004-3', NOT_READ, NOT_READ, '00:00:00', 'Down']);
});

test('channelRows on an empty list yields no rows', () => {
  assert.deepEqual(channelRows([]), []);
});

// ---------------------------------------------------------------- endpointRows

test('endpointRows joins a contact by AOR, and marks transport/codecs NOT_READ when genuinely absent', () => {
  const endpoints: Endpoint[] = [
    { id: '1000', state: 'Not in use', channels: '0 of inf' },
    { id: '1001', state: 'Unavailable', channels: '0 of inf' },
  ];
  const contacts: Contact[] = [{ aor: '1000', uri: 'sip:1000@10.0.0.5:5060', status: 'Avail', roundTripMs: 12.3 }];
  const rows = endpointRows(endpoints, contacts);
  assert.deepEqual(rows[0], ['1000', 'sip:1000@10.0.0.5:5060', NOT_READ, NOT_READ, 'Not in use']);
  assert.deepEqual(rows[1], ['1001', NOT_READ, NOT_READ, NOT_READ, 'Unavailable']);
});

test('endpointRows reads the transport off the endpoint and the codec off a matching live channel', () => {
  const endpoints: Endpoint[] = [
    { id: '1000', state: 'Not in use', channels: '1 of inf', transport: 'transport-udp' },
    // No active channel for 2000, and no explicit transport: both columns stay honest.
    { id: '2000', state: 'Not in use', channels: '0 of inf' },
  ];
  const channelStats: ChannelCodecUsage[] = [
    { channelName: 'PJSIP/1000-00000001', endpointId: '1000', codec: 'ulaw' },
  ];
  const rows = endpointRows(endpoints, [], channelStats);
  // With no parameter table read, the only codec available is the one negotiated on a
  // live call -- which is a different reading from the endpoint's configured list, so the
  // cell says which one it is showing rather than letting the two look alike.
  assert.deepEqual(rows[0], ['1000', NOT_READ, 'transport-udp', 'ulaw (in use)', 'Not in use']);
  assert.deepEqual(rows[1], ['2000', NOT_READ, NOT_READ, NOT_READ, 'Not in use']);
});

test('endpointRows ignores a channel-stats row with no codec rather than showing a blank value', () => {
  const endpoints: Endpoint[] = [{ id: '1000', state: 'Not in use', channels: '1 of inf' }];
  // A channel that is up but reports no codec (e.g. direct media -- parseChannelStats
  // never emits a row for those, but the row shape is still validated defensively here).
  const channelStats: ChannelCodecUsage[] = [{ channelName: 'PJSIP/1000-00000001', endpointId: '1000' }];
  const rows = endpointRows(endpoints, [], channelStats);
  assert.deepEqual(rows[0], ['1000', NOT_READ, NOT_READ, NOT_READ, 'Not in use']);
});

test('endpointRows reads the configured transport and codecs off the endpoint detail', () => {
  const endpoints: Endpoint[] = [{ id: '1000', state: 'Not in use', channels: '0 of inf' }];
  const details: EndpointDetailSet = {
    byEndpoint: { 1000: { transport: 'transport-tcp', codecs: ['ulaw', 'alaw', 'g722'] } },
    notRead: [],
  };
  const rows = endpointRows(endpoints, [], [], details);
  assert.deepEqual(rows[0], ['1000', NOT_READ, 'transport-tcp', 'ulaw, alaw, g722', 'Not in use']);
});

test('endpointRows prefers the configured codec list over the one codec a live call negotiated', () => {
  const endpoints: Endpoint[] = [{ id: '1000', state: 'In use', channels: '1 of inf' }];
  const channelStats: ChannelCodecUsage[] = [
    { channelName: 'PJSIP/1000-00000001', endpointId: '1000', codec: 'alaw' },
  ];
  const details: EndpointDetailSet = { byEndpoint: { 1000: { codecs: ['ulaw', 'alaw'] } }, notRead: [] };
  const rows = endpointRows(endpoints, [], channelStats, details);
  // The column is headed "Codecs": the endpoint's own list is what belongs in it, and it
  // is not silently replaced by whichever single codec one call happened to settle on.
  assert.deepEqual(rows[0], ['1000', NOT_READ, NOT_READ, 'ulaw, alaw', 'In use']);
});

test('endpointRows spells out an endpoint that allows no codec at all', () => {
  const endpoints: Endpoint[] = [{ id: '1000', state: 'Not in use', channels: '0 of inf' }];
  // Asterisk printed `allow : (nothing)` -- a real reading, and not the same thing as
  // never having looked, so it must not render as the not-read placeholder.
  const details: EndpointDetailSet = { byEndpoint: { 1000: { codecs: [] } }, notRead: [] };
  const rows = endpointRows(endpoints, [], [], details);
  assert.deepEqual(rows[0], ['1000', NOT_READ, NOT_READ, 'none allowed', 'Not in use']);
});

test('endpointRows reports a transport the detail names even when the endpoints listing omitted it', () => {
  // `config_transport.c` `cli_iterate` prints no `Transport:` child line when the id does
  // not resolve to a transport on the target, so the plural listing shows nothing for an
  // endpoint pinned to a transport that is missing -- which is the case worth seeing.
  const endpoints: Endpoint[] = [{ id: '1000', state: 'Unavailable', channels: '0 of inf' }];
  const details: EndpointDetailSet = { byEndpoint: { 1000: { transport: 'transport-tls' } }, notRead: [] };
  const rows = endpointRows(endpoints, [], [], details);
  assert.equal(rows[0][2], 'transport-tls');
});

test('endpointRows leaves an endpoint the detail budget skipped as NOT_READ rather than guessing', () => {
  const endpoints: Endpoint[] = [
    { id: '1000', state: 'Not in use', channels: '0 of inf' },
    { id: '9999', state: 'Not in use', channels: '0 of inf' },
  ];
  const details: EndpointDetailSet = { byEndpoint: { 1000: { codecs: ['ulaw'] } }, notRead: ['9999'] };
  const rows = endpointRows(endpoints, [], [], details);
  assert.deepEqual(rows[0], ['1000', NOT_READ, NOT_READ, 'ulaw', 'Not in use']);
  assert.deepEqual(rows[1], ['9999', NOT_READ, NOT_READ, NOT_READ, 'Not in use']);
});

// ---------------------------------------------------------------- registrationRows

test('registrationRows marks the trunk/transport columns the console does not read', () => {
  const registrations: Registration[] = [{ id: 'trunk1', serverUri: 'sip:sip.example.com:5060', status: 'Registered' }];
  assert.deepEqual(registrationRows(registrations), [['trunk1', 'sip:sip.example.com:5060', NOT_READ, NOT_READ, 'Registered']]);
});

test('registrationRows appends IAX2 registrations after the PJSIP ones, named the way register => is written', () => {
  const registrations: Registration[] = [{ id: 'trunk1', serverUri: 'sip:sip.example.com:5060', status: 'Registered' }];
  const iaxRegistrations: IaxRegistration[] = [
    { host: '203.0.113.9:4569', username: 'markpasswd', refresh: 60, state: 'Registered' },
    // iax.conf's own `register => host` form (no username) has nothing to join with `@`.
    { host: '198.51.100.4:4569', username: '', refresh: 120, state: 'Unregistered' },
  ];
  assert.deepEqual(registrationRows(registrations, iaxRegistrations), [
    ['trunk1', 'sip:sip.example.com:5060', NOT_READ, NOT_READ, 'Registered'],
    ['markpasswd@203.0.113.9:4569', '203.0.113.9:4569', NOT_READ, NOT_READ, 'Registered'],
    ['198.51.100.4:4569', '198.51.100.4:4569', NOT_READ, NOT_READ, 'Unregistered'],
  ]);
});

test('registrationRows with no IAX2 registrations behaves exactly as before -- PJSIP only', () => {
  const registrations: Registration[] = [{ id: 'trunk1', serverUri: 'sip:sip.example.com:5060', status: 'Registered' }];
  assert.deepEqual(registrationRows(registrations, []), registrationRows(registrations));
});

// ---------------------------------------------------------------- iaxPeerRows

test('iaxPeerRows renders the live iax2 show peers reading, never an invented row', () => {
  // dynamic and trunk deliberately differ within each row (rather than both true or both
  // false) so a column swap between the two is actually detectable here, not only in the
  // separate rowsFor(iaxpeers) test below.
  const peers: IaxPeer[] = [
    { name: 'branch-office', host: '203.0.113.9', dynamic: true, trunk: false, status: 'Registered' },
    { name: 'carrier-iax', host: '198.51.100.4', dynamic: false, trunk: true, status: 'UNREACHABLE' },
  ];
  assert.deepEqual(iaxPeerRows(peers), [
    ['branch-office', '203.0.113.9', 'yes', 'no', 'Registered'],
    ['carrier-iax', '198.51.100.4', 'no', 'yes', 'UNREACHABLE'],
  ]);
});

test('iaxPeerRows on an empty reading yields no rows, honestly', () => {
  assert.deepEqual(iaxPeerRows([]), []);
});

// ---------------------------------------------------------------- queueRows

test('queueRows formats service level or NOT_READ when it was not observed', () => {
  const queues: QueueSummary[] = [
    { name: 'support1', strategy: 'ringall', callers: 2, members: 3, holdtimeSeconds: 30, serviceLevelPercent: 92.3 },
    { name: 'support2', strategy: 'leastrecent', callers: 0, members: 0, holdtimeSeconds: 0 },
  ];
  const rows = queueRows(queues);
  assert.deepEqual(rows[0], ['support1', 'ringall', '3', '2', '92.3%']);
  assert.deepEqual(rows[1], ['support2', 'leastrecent', '0', '0', NOT_READ]);
});

// ---------------------------------------------------------------- moduleRows

test('moduleRows carries name, description, use count, and status', () => {
  const modules: ModuleSummary[] = [{ name: 'app_queue.so', description: 'True Call Queueing', useCount: 12, status: 'Running' }];
  assert.deepEqual(moduleRows(modules), [['app_queue.so', 'True Call Queueing', '12', 'Running']]);
});

// ---------------------------------------------------------------- rowsFor

test('rowsFor dispatches to the matching parser by screen name', () => {
  const readings: ViewReadings = {
    channels: available<Channel[]>([{ name: 'c1', context: '', extension: '', state: 'Up', application: '', callerNumber: '1000', durationSeconds: 1 }]),
    queues: available<QueueSummary[]>([{ name: 'q1', strategy: 'ringall', callers: 1, members: 1, holdtimeSeconds: 0 }]),
  };
  assert.equal(rowsFor('live', readings).length, 1);
  assert.equal(rowsFor('queues', readings).length, 1);
  assert.deepEqual(rowsFor('endpoints', readings), []);
});

test('rowsFor(endpoints) hands the endpoint detail reading to the row builder', () => {
  // Not a restatement of the endpointRows tests above: those call the builder directly, so
  // every one of them passes whether or not `rowsFor` ever passes the reading along. This
  // is the seam -- a detail set read by the control plane and dropped on the way to the
  // table would show as two placeholder columns and no failing test anywhere.
  const readings: ViewReadings = {
    endpoints: available<Endpoint[]>([{ id: '1000', state: 'Not in use', channels: '0 of inf' }]),
    endpointDetails: available<EndpointDetailSet>({
      byEndpoint: { 1000: { transport: 'transport-tcp', codecs: ['ulaw', 'alaw'] } },
      notRead: [],
    }),
  };
  assert.deepEqual(rowsFor('endpoints', readings), [
    ['1000', NOT_READ, 'transport-tcp', 'ulaw, alaw', 'Not in use'],
  ]);
});

test('rowsFor(endpoints) still builds rows when only the endpoint listing was read', () => {
  const readings: ViewReadings = {
    endpoints: available<Endpoint[]>([{ id: '1000', state: 'Not in use', channels: '0 of inf' }]),
    endpointDetails: unavailable('`asterisk -rx "pjsip show endpoint 1000"` failed'),
  };
  assert.deepEqual(rowsFor('endpoints', readings), [['1000', NOT_READ, NOT_READ, NOT_READ, 'Not in use']]);
});

test('rowsFor returns no rows for an unrecognized screen or undefined readings', () => {
  assert.deepEqual(rowsFor('settings', { channels: available([]) }), []);
  assert.deepEqual(rowsFor('live', undefined), []);
});

test('rowsFor(trunks) merges PJSIP and IAX2 registrations, never PJSIP alone', () => {
  const readings: ViewReadings = {
    registrations: available<Registration[]>([{ id: 'trunk1', serverUri: 'sip:sip.example.com:5060', status: 'Registered' }]),
    iaxRegistrations: available<IaxRegistration[]>([{ host: '203.0.113.9:4569', username: 'joe', refresh: 60, state: 'Registered' }]),
  };
  assert.equal(rowsFor('trunks', readings).length, 2);
});

test('rowsFor(iaxpeers) reads the live iax2 show peers rows', () => {
  const readings: ViewReadings = {
    iaxPeers: available<IaxPeer[]>([{ name: 'branch-office', host: '203.0.113.9', dynamic: true, trunk: false, status: 'Registered' }]),
  };
  assert.deepEqual(rowsFor('iaxpeers', readings), [['branch-office', '203.0.113.9', 'yes', 'no', 'Registered']]);
});

// ---------------------------------------------------------------- dashboardStats

test('dashboardStats only creates tiles for readings that were actually observed', () => {
  const readings: ViewReadings = {
    channels: available<Channel[]>([{ name: 'c1', context: '', extension: '', state: 'Up', application: '', callerNumber: '', durationSeconds: 0 }]),
    uptime: available(3665),
  };
  const stats = dashboardStats(readings);
  const labels = stats.map((stat) => stat.label);
  assert.ok(labels.includes('Active channels'));
  assert.ok(labels.includes('Uptime'));
  assert.equal(labels.includes('Endpoints up'), false);
  assert.equal(labels.includes('Queue waiting'), false);
  const uptimeStat = stats.find((stat) => stat.label === 'Uptime');
  assert.equal(uptimeStat?.value, '1h 1m');
});

test('dashboardStats counts endpoints that are not Unavailable as up', () => {
  const readings: ViewReadings = {
    endpoints: available<Endpoint[]>([
      { id: '1000', state: 'Not in use', channels: '0 of inf' },
      { id: '1001', state: 'Unavailable', channels: '0 of inf' },
    ]),
  };
  const stat = dashboardStats(readings).find((entry) => entry.label === 'Endpoints up');
  assert.equal(stat?.value, '1/2');
});

test('dashboardStats produces no tiles when nothing has been read', () => {
  assert.deepEqual(dashboardStats(undefined), []);
  assert.deepEqual(dashboardStats({}), []);
});

// ---------------------------------------------------------------- healthBars

test('healthBars omits a bar when its denominator was never observed', () => {
  assert.deepEqual(healthBars(undefined), []);
  assert.deepEqual(healthBars({ endpoints: available<Endpoint[]>([]) }), []);
});

test('healthBars computes reachable endpoints and staffed queues as exact ratios', () => {
  const readings: ViewReadings = {
    endpoints: available<Endpoint[]>([
      { id: '1000', state: 'Not in use', channels: '0 of inf' },
      { id: '1001', state: 'Unavailable', channels: '0 of inf' },
      { id: '1002', state: 'Not in use', channels: '0 of inf' },
    ]),
    queues: available<QueueSummary[]>([
      { name: 'q1', strategy: 'ringall', callers: 0, members: 2, holdtimeSeconds: 0 },
      { name: 'q2', strategy: 'ringall', callers: 0, members: 0, holdtimeSeconds: 0 },
    ]),
  };
  const bars = healthBars(readings);
  assert.deepEqual(bars.find((bar) => bar.label === 'Endpoints reachable'), {
    label: 'Endpoints reachable', value: '2 of 3', pct: '67%',
  });
  assert.deepEqual(bars.find((bar) => bar.label === 'Queues with members'), {
    label: 'Queues with members', value: '1 of 2', pct: '50%',
  });
});

// ---------------------------------------------------------------- formatDuration / formatUptime

test('formatDuration renders HH:MM:SS and clamps negative or fractional seconds to zero', () => {
  assert.equal(formatDuration(0), '00:00:00');
  assert.equal(formatDuration(65), '00:01:05');
  assert.equal(formatDuration(3661), '01:01:01');
  assert.equal(formatDuration(-5), '00:00:00');
  assert.equal(formatDuration(59.9), '00:00:59');
});

test('formatUptime picks the coarsest unit that applies', () => {
  assert.equal(formatUptime(45), '0m');
  assert.equal(formatUptime(3665), '1h 1m');
  assert.equal(formatUptime(90_000), '1d 1h');
  assert.equal(formatUptime(59), '0m');
});

// ---------------------------------------------------------------- badgeFor

test('badgeFor is empty for every destination with no matching reading', () => {
  assert.equal(badgeFor('live', {}), '');
  assert.equal(badgeFor('endpoints', {}), '');
  assert.equal(badgeFor('trunks', {}), '');
  assert.equal(badgeFor('iaxpeers', {}), '');
  assert.equal(badgeFor('queues', {}), '');
  assert.equal(badgeFor('modules', {}), '');
  assert.equal(badgeFor('dash', {}), '');
  assert.equal(badgeFor('canvas', {}), '');
  assert.equal(badgeFor('history', {}), '');
  assert.equal(badgeFor('trunkauth', {}), '');
});

test('badgeFor reports the real row count once that screen has been read', () => {
  const channels: Channel[] = [
    { name: 'c1', context: '', extension: '', state: 'Up', application: '', callerNumber: '', durationSeconds: 0 },
    { name: 'c2', context: '', extension: '', state: 'Up', application: '', callerNumber: '', durationSeconds: 0 },
  ];
  assert.equal(badgeFor('live', { live: { channels: available(channels) } }), '2');
});

test('badgeFor falls back to a dash reading for the same data without firing a new read', () => {
  const endpoints: Endpoint[] = [{ id: '1000', state: 'Not in use', channels: '0 of inf' }];
  assert.equal(badgeFor('endpoints', { dash: { endpoints: available(endpoints) } }), '1');
});

test('badgeFor never reports a count for a screen it was not asked about', () => {
  const channels: Channel[] = [{ name: 'c1', context: '', extension: '', state: 'Up', application: '', callerNumber: '', durationSeconds: 0 }];
  assert.equal(badgeFor('endpoints', { live: { channels: available(channels) } }), '');
});

test('badgeFor(trunks) counts PJSIP and IAX2 registrations together, so it never under-reports the merged table', () => {
  const registrations: Registration[] = [{ id: 'trunk1', serverUri: 'sip:sip.example.com:5060', status: 'Registered' }];
  const iaxRegistrations: IaxRegistration[] = [
    { host: '203.0.113.9:4569', username: 'a', refresh: 60, state: 'Registered' },
    { host: '198.51.100.4:4569', username: 'b', refresh: 60, state: 'Unregistered' },
  ];
  assert.equal(badgeFor('trunks', { trunks: { registrations: available(registrations), iaxRegistrations: available(iaxRegistrations) } }), '3');
  // IAX2-only, no PJSIP registrations read yet at all -- still counted, not silently zero.
  assert.equal(badgeFor('trunks', { trunks: { iaxRegistrations: available(iaxRegistrations) } }), '2');
});

test('badgeFor(iaxpeers) reports the real iax2 show peers count once read', () => {
  const iaxPeers: IaxPeer[] = [{ name: 'branch-office', host: '203.0.113.9', dynamic: true, trunk: false, status: 'Registered' }];
  assert.equal(badgeFor('iaxpeers', { iaxpeers: { iaxPeers: available(iaxPeers) } }), '1');
});

// ---------------------------------------------------------------- regexMatchLabel

test('regexMatchLabel says there is nothing to search against an empty corpus', () => {
  assert.equal(regexMatchLabel('', []), 'nothing to search');
  assert.equal(regexMatchLabel('foo', []), 'nothing to search');
});

test('regexMatchLabel counts real matches against a real corpus', () => {
  assert.equal(regexMatchLabel('a', ['cat', 'dog', 'bat']), '2 matches');
  assert.equal(regexMatchLabel('a', ['dog']), '0 matches');
  assert.equal(regexMatchLabel('cat', ['cat', 'dog']), '1 match');
});

test('regexMatchLabel reports an invalid pattern instead of throwing', () => {
  assert.equal(regexMatchLabel('(', ['cat']), 'invalid pattern');
});

// ---------------------------------------------------------------- newly-wired screens

test('voicemailRows fills only what voicemail show users actually reads', () => {
  const rows = voicemailRows([
    { context: 'default', mailbox: '1001', fullName: 'Ada Deng', zone: '', newMessages: 3 },
    { context: 'default', mailbox: '1010', fullName: '', zone: '', newMessages: undefined },
  ]);
  assert.deepEqual(rows, [
    ['1001', 'Ada Deng', NOT_READ, '3', NOT_READ],
    ['1010', NOT_READ, NOT_READ, NOT_READ, NOT_READ],
  ]);
});

test('confbridgeRows never invents a bridge profile or recording state', () => {
  const rows = confbridgeRows([
    { name: '9000', users: 3, marked: 1, locked: false, muted: false },
    { name: '9001', users: 0, marked: 0, locked: true, muted: false },
  ]);
  assert.deepEqual(rows, [
    ['9000', NOT_READ, '3', NOT_READ, 'Active'],
    ['9001', NOT_READ, '0', NOT_READ, 'Locked'],
  ]);
});

test('mohRows leaves the track count NOT_READ, which moh show classes never reports', () => {
  const rows = mohRows([{ name: 'default', mode: 'files', directory: 'moh' }]);
  assert.deepEqual(rows, [['default', 'files', 'moh', NOT_READ]]);
});

test('amiRows lists manager users and ARI apps with unreadable columns marked honestly', () => {
  const rows = amiRows([{ username: 'monitor' }], [{ name: 'stasis-app' }]);
  assert.deepEqual(rows, [
    ['monitor', 'AMI', NOT_READ, NOT_READ],
    ['stasis-app', 'ARI', NOT_READ, NOT_READ],
  ]);
});

test('rowsFor dispatches voicemail/confbridge/moh/ami to their own row builders', () => {
  const readings: ViewReadings = {
    voicemailUsers: available({ users: [{ context: 'default', mailbox: '1001', fullName: 'Ada Deng', zone: '', newMessages: 1 }] }),
    rooms: available([{ name: '9000', users: 1, marked: 0, locked: false, muted: false }]),
    mohClasses: available([{ name: 'default', mode: 'files' }]),
    managerUsers: available({ users: [{ username: 'monitor' }] }),
    ariApps: available([]),
  };
  assert.equal(rowsFor('voicemail', readings).length, 1);
  assert.equal(rowsFor('confbridge', readings).length, 1);
  assert.equal(rowsFor('moh', readings).length, 1);
  assert.equal(rowsFor('ami', readings).length, 1);
  assert.deepEqual(rowsFor('cdr', readings), []);
});

test('a screen with an unavailable reading reports the real reason, not silence', () => {
  const readings: ViewReadings = { rooms: unavailable('`asterisk -rx "confbridge list"` failed: No such command') };
  assert.equal(reasonFor(readings, ['rooms']), '`asterisk -rx "confbridge list"` failed: No such command');
});
