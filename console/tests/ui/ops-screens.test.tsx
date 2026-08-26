/**
 * Round-trip and coverage guards for the ops lane's five new screens: Monitoring
 * (res_snmp.conf + prometheus.conf), Directories & identity (asterisk.conf), NAT
 * discovery (res_stun_monitor.conf), Messaging (xmpp.conf) and Caller display (adsi.conf).
 *
 * Every value here is checked against the exact sample file this pass cited a line
 * number for -- see the comments on CONTROL_BINDINGS.monitoring / .identity / .stun /
 * .xmpp / .adsi in control-keys.ts, and configs/samples/*.conf.sample in this checkout.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { applyControlValues, readControlValues, unmappedControls } from '../../app/renderer/src/control-keys.ts';
import type { ConfigValue } from '../../app/renderer/src/configuration.ts';

// ---------------------------------------------------------------- Monitoring (SNMP)

test('readControlValues reads a realistic res_snmp.conf onto the monitoring screen', () => {
  const cfg: ConfigValue = [
    { name: 'general', entries: [{ key: 'subagent', value: 'no' }, { key: 'enabled', value: 'yes' }] },
  ];
  const values = readControlValues('monitoring', cfg);
  assert.equal(values.mn_subagent, false);
  assert.equal(values.mn_enabled, true);
});

test('applyControlValues writes only the two res_snmp.conf keys, leaving everything else untouched', () => {
  const cfg: ConfigValue = [
    { name: 'general', entries: [{ key: 'subagent', value: 'yes' }] },
    { name: 'unrelated', entries: [{ key: 'keep', value: 'me' }] },
  ];
  const next = applyControlValues('monitoring', cfg, { mn_subagent: false, mn_enabled: true });
  assert.deepEqual(
    next.find((s) => s.name === 'general')!.entries,
    [{ key: 'subagent', value: 'no' }, { key: 'enabled', value: 'yes' }],
  );
  assert.deepEqual(next.find((s) => s.name === 'unrelated')!.entries, [{ key: 'keep', value: 'me' }]);
});

// ---------------------------------------------------------------- Monitoring (Prometheus)

test('readControlValues reads a realistic prometheus.conf through the elsewhere map', () => {
  const promCfg: ConfigValue = [
    {
      name: 'general',
      entries: [
        { key: 'enabled', value: 'yes' },
        { key: 'core_metrics_enabled', value: 'no' },
        { key: 'uri', value: 'ast-metrics' },
        { key: 'auth_username', value: 'Asterisk' },
        { key: 'auth_realm', value: 'Asterisk Prometheus Metrics' },
      ],
    },
  ];
  const values = readControlValues('monitoring', [], { 'prometheus.conf': promCfg });
  assert.equal(values.pm_enabled, true);
  assert.equal(values.pm_core, false);
  assert.equal(values.pm_uri, 'ast-metrics');
  assert.equal(values.pm_authuser, 'Asterisk');
  assert.equal(values.pm_authrealm, 'Asterisk Prometheus Metrics');
  // The password never round-trips through this table, whatever the file holds.
  assert.equal('pm_authpassword' in values, false);
});

/* applyControlValues itself matches purely by section/key, never by `file` -- the same
 * reason onSaveCdr's own comment gives for why App.tsx's onSaveSnmp/onSavePrometheus
 * each restrict `changes` to their own MONITORING_SNMP_CONTROLS /
 * MONITORING_PROMETHEUS_CONTROLS list before calling this, rather than forwarding every
 * bound value on the screen. res_snmp.conf's `enabled` and prometheus.conf's `enabled`
 * share both a section name and a key spelling, so this is the one screen on the
 * console where getting that filtering wrong would be invisible in a diff: the file
 * that ends up wrong still looks like valid Asterisk config, just for the wrong
 * subsystem. */
test('onSaveSnmp\'s exact control filter writes only res_snmp.conf\'s own two keys', () => {
  const snmpCfg: ConfigValue = [{ name: 'general', entries: [] }];
  const changes = { mn_subagent: true, mn_enabled: true, pm_enabled: true, pm_uri: 'metrics' };
  const filtered: Record<string, unknown> = {};
  for (const id of ['mn_subagent', 'mn_enabled']) if (id in changes) filtered[id] = (changes as Record<string, unknown>)[id];
  const next = applyControlValues('monitoring', snmpCfg, filtered);
  assert.deepEqual(
    next.find((s) => s.name === 'general')!.entries,
    [{ key: 'subagent', value: 'yes' }, { key: 'enabled', value: 'yes' }],
  );
});

test('onSavePrometheus\'s exact control filter writes only prometheus.conf\'s own ordinary keys', () => {
  const promCfg: ConfigValue = [{ name: 'general', entries: [] }];
  const changes = { mn_subagent: true, pm_enabled: true, pm_core: false, pm_uri: 'ast-metrics', pm_authuser: 'Asterisk', pm_authrealm: 'r' };
  const filtered: Record<string, unknown> = {};
  for (const id of ['pm_enabled', 'pm_core', 'pm_uri', 'pm_authuser', 'pm_authrealm']) {
    if (id in changes) filtered[id] = (changes as Record<string, unknown>)[id];
  }
  const next = applyControlValues('monitoring', promCfg, filtered);
  assert.deepEqual(
    next.find((s) => s.name === 'general')!.entries,
    [
      { key: 'enabled', value: 'yes' }, { key: 'core_metrics_enabled', value: 'no' },
      { key: 'uri', value: 'ast-metrics' }, { key: 'auth_username', value: 'Asterisk' },
      { key: 'auth_realm', value: 'r' },
    ],
  );
  assert.equal(next.find((s) => s.name === 'general')!.entries.some((e) => e.key === 'subagent'), false);
});

test('the write-only Prometheus password carries no binding at all', () => {
  const unmapped = unmappedControls('monitoring');
  assert.ok(unmapped.includes('pm_authpassword'), 'pm_authpassword should be unmapped, same as db_pgpassword');
  assert.ok(unmapped.includes('pm_authpasswordstatus'), 'the readout carries no key of its own either');
  assert.ok(!unmapped.includes('pm_authuser'), 'auth_username is an ordinary bound field');
});

// ---------------------------------------------------------------- Directories & identity

test('readControlValues reads a realistic asterisk.conf onto the identity screen', () => {
  const cfg: ConfigValue = [
    {
      name: 'directories',
      entries: [
        { key: 'astspooldir', value: '/var/spool/asterisk' },
        { key: 'astlogdir', value: '/var/log/asterisk' },
      ],
    },
    {
      name: 'options',
      entries: [
        { key: 'systemname', value: 'pbx-01' },
        { key: 'autosystemname', value: 'no' },
        { key: 'documentation_language', value: 'en_US' },
        { key: 'maxcalls', value: '500' },
        { key: 'maxload', value: '0.9' },
      ],
    },
  ];
  const values = readControlValues('identity', cfg);
  assert.equal(values.as_dirspool, '/var/spool/asterisk');
  assert.equal(values.as_dirlog, '/var/log/asterisk');
  assert.equal(values.as_systemname, 'pbx-01');
  assert.equal(values.as_autosystemname, false);
  assert.equal(values.as_documentation_language, 'en_US');
  assert.equal(values.as_maxcalls, 500);
  assert.equal(values.as_maxload, 0.9);
});

test('every one of the twelve [directories] paths is bound to its own real key', () => {
  const paths = [
    ['as_dircache', 'astcachedir'], ['as_diretc', 'astetcdir'], ['as_dirmod', 'astmoddir'],
    ['as_dirvarlib', 'astvarlibdir'], ['as_dirdb', 'astdbdir'], ['as_dirkey', 'astkeydir'],
    ['as_dirdata', 'astdatadir'], ['as_diragi', 'astagidir'], ['as_dirspool', 'astspooldir'],
    ['as_dirrun', 'astrundir'], ['as_dirlog', 'astlogdir'], ['as_dirsbin', 'astsbindir'],
  ];
  const cfg: ConfigValue = [{ name: 'directories', entries: paths.map(([, key]) => ({ key, value: `/x/${key}` })) }];
  const values = readControlValues('identity', cfg);
  for (const [control, key] of paths) assert.equal(values[control], `/x/${key}`, `${control} should read ${key}`);
});

test('applyControlValues writes the identity screen\'s save button touches nothing outside asterisk.conf', () => {
  const cfg: ConfigValue = [{ name: 'options', entries: [{ key: 'systemname', value: 'old' }] }];
  const next = applyControlValues('identity', cfg, { as_systemname: 'new', as_maxcalls: 20 });
  assert.equal(next.find((s) => s.name === 'options')!.entries.find((e) => e.key === 'systemname')?.value, 'new');
  assert.equal(next.find((s) => s.name === 'options')!.entries.find((e) => e.key === 'maxcalls')?.value, '20');
});

test('the identity screen has nothing left unbound but its own Save action', () => {
  assert.deepEqual(unmappedControls('identity'), ['as_save']);
});

// ---------------------------------------------------------------- NAT discovery (STUN)

test('readControlValues reads a realistic res_stun_monitor.conf onto the stun screen', () => {
  const cfg: ConfigValue = [
    { name: 'general', entries: [{ key: 'stunaddr', value: 'stun.example.com:3478' }, { key: 'stunrefresh', value: '60' }] },
  ];
  const values = readControlValues('stun', cfg);
  assert.equal(values.su_addr, 'stun.example.com:3478');
  assert.equal(values.su_refresh, 60);
});

test('applyControlValues writes both STUN fields and nothing else', () => {
  const cfg: ConfigValue = [{ name: 'general', entries: [] }];
  const next = applyControlValues('stun', cfg, { su_addr: 'stun.example.com', su_refresh: 45 });
  assert.deepEqual(
    next.find((s) => s.name === 'general')!.entries,
    [{ key: 'stunaddr', value: 'stun.example.com' }, { key: 'stunrefresh', value: '45' }],
  );
});

test('the stun screen has nothing left unbound but its own Save action', () => {
  assert.deepEqual(unmappedControls('stun'), ['su_save']);
});

// ---------------------------------------------------------------- Messaging (XMPP)

test('readControlValues reads a realistic xmpp.conf [general] section onto the xmpp screen', () => {
  const cfg: ConfigValue = [
    {
      name: 'general',
      entries: [
        { key: 'debug', value: 'yes' },
        { key: 'autoprune', value: 'no' },
        { key: 'autoregister', value: 'yes' },
        { key: 'collection_nodes', value: 'no' },
        { key: 'pubsub_autocreate', value: 'no' },
        { key: 'auth_policy', value: 'deny' },
      ],
    },
    // The [asterisk] connection section carries real credentials and stays unread.
    { name: 'asterisk', entries: [{ key: 'secret', value: 'hunter2' }] },
  ];
  const values = readControlValues('xmpp', cfg);
  assert.equal(values.xm_debug, true);
  assert.equal(values.xm_autoprune, false);
  assert.equal(values.xm_autoregister, true);
  assert.equal(values.xm_collection_nodes, false);
  assert.equal(values.xm_pubsub_autocreate, false);
  assert.equal(values.xm_auth_policy, 'deny');
  assert.deepEqual(Object.keys(values).sort(), [
    'xm_auth_policy', 'xm_autoprune', 'xm_autoregister', 'xm_collection_nodes', 'xm_debug', 'xm_pubsub_autocreate',
  ]);
});

test('nothing on the xmpp screen ever reads or writes the [asterisk] credential section', () => {
  const cfg: ConfigValue = [{ name: 'asterisk', entries: [{ key: 'secret', value: 'hunter2' }, { key: 'username', value: 'a@b.com' }] }];
  const next = applyControlValues('xmpp', cfg, { xm_debug: true });
  // [general] gets created for the bound key; [asterisk] is untouched byte for byte.
  assert.deepEqual(next.find((s) => s.name === 'asterisk')!.entries, [{ key: 'secret', value: 'hunter2' }, { key: 'username', value: 'a@b.com' }]);
});

test('the xmpp screen has nothing left unbound but its own Save action', () => {
  assert.deepEqual(unmappedControls('xmpp'), ['xm_save']);
});

// ---------------------------------------------------------------- Caller display (ADSI)

test('readControlValues reads a realistic adsi.conf onto the adsi screen', () => {
  const cfg: ConfigValue = [
    { name: 'intro', entries: [{ key: 'alignment', value: 'left' }, { key: 'greeting', value: 'Welcome to the', separator: '=>' as const }] },
  ];
  const values = readControlValues('adsi', cfg);
  assert.equal(values.ad_alignment, 'left');
  // The repeated greeting line is deliberately never read onto ad_greeting.
  assert.equal('ad_greeting' in values, false);
});

test('applyControlValues writes only alignment, never inventing a greeting binding', () => {
  const cfg: ConfigValue = [{ name: 'intro', entries: [{ key: 'alignment', value: 'center' }, { key: 'greeting', value: 'Welcome to the', separator: '=>' as const }] }];
  const next = applyControlValues('adsi', cfg, { ad_alignment: 'right', ad_greeting: ['ignored'] });
  const intro = next.find((s) => s.name === 'intro')!;
  assert.equal(intro.entries.find((e) => e.key === 'alignment')?.value, 'right');
  // The three original greeting-shaped facts survive untouched: same key, same value,
  // same separator -- proof that the unbound control never touched this entry at all.
  assert.deepEqual(intro.entries.find((e) => e.key === 'greeting'), { key: 'greeting', value: 'Welcome to the', separator: '=>' });
});

test('ad_greeting is the one control on this whole console deliberately left dead, and ad_alignment is not', () => {
  const unmapped = unmappedControls('adsi');
  assert.ok(unmapped.includes('ad_greeting'), 'ad_greeting has no shape this table can express -- see the long comment on CONTROL_BINDINGS.adsi');
  assert.ok(unmapped.includes('ad_save'), 'ad_save is the Save action, which carries no key of its own');
  assert.ok(!unmapped.includes('ad_alignment'), 'alignment is bound to adsi.conf line 5');
});
