import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CONTROL_BINDINGS,
  applyControlValues,
  readControlValues,
  unmappedControls,
} from '../../app/renderer/src/control-keys.ts';
import type { ControlBinding } from '../../app/renderer/src/control-keys.ts';
import type { ConfigValue } from '../../app/renderer/src/configuration.ts';
import { SCREENS } from '../../app/renderer/src/generated/console.tsx';

function allBindings(): Array<{ screen: string; binding: ControlBinding }> {
  const out: Array<{ screen: string; binding: ControlBinding }> = [];
  for (const [screen, bindings] of Object.entries(CONTROL_BINDINGS)) {
    for (const binding of bindings) out.push({ screen, binding });
  }
  return out;
}

// ---------------------------------------------------------------- table sanity

test('every binding names a non-empty section and key', () => {
  for (const { screen, binding } of allBindings()) {
    assert.ok(binding.section.length > 0, `${screen}/${binding.control} has an empty section`);
    assert.ok(binding.key.length > 0, `${screen}/${binding.control} has an empty key`);
    assert.ok(binding.control.length > 0, `${screen} has a binding with an empty control id`);
  }
});

test('every bound screen exists in the generated SCREENS object', () => {
  const screenIds = new Set(Object.keys(SCREENS));
  for (const screen of Object.keys(CONTROL_BINDINGS)) {
    assert.ok(screenIds.has(screen), `${screen} is not a real screen id in SCREENS`);
  }
});

test('total bound-screen and control counts are what this pass produced', () => {
  const screenCount = Object.keys(CONTROL_BINDINGS).length;
  const controlCount = allBindings().length;
  assert.equal(screenCount, 13);
  assert.equal(controlCount, 82);
});

// ---------------------------------------------------------------- boolean parsing

test('boolean parsing accepts every Asterisk spelling of yes and no', () => {
  const cfg: ConfigValue = [{ name: 'general', entries: [{ key: 'queue_log', value: 'yes' }] }];
  assert.equal(readControlValues('logger', cfg).g_queue, true);
  for (const yes of ['yes', 'true', 'on', '1', 'YES', 'On']) {
    const c: ConfigValue = [{ name: 'general', entries: [{ key: 'queue_log', value: yes }] }];
    assert.equal(readControlValues('logger', c).g_queue, true, `expected ${yes} to parse true`);
  }
  for (const no of ['no', 'false', 'off', '0', 'NO']) {
    const c: ConfigValue = [{ name: 'general', entries: [{ key: 'queue_log', value: no }] }];
    assert.equal(readControlValues('logger', c).g_queue, false, `expected ${no} to parse false`);
  }
});

test('an unrecognised boolean spelling is left unset rather than guessed', () => {
  const cfg: ConfigValue = [{ name: 'general', entries: [{ key: 'queue_log', value: 'maybe' }] }];
  assert.equal('g_queue' in readControlValues('logger', cfg), false);
});

test('invert flips a *_disable style key so the control keeps its own sense', () => {
  const enabled: ConfigValue = [{ name: 'attestation', entries: [{ key: 'global_disable', value: 'no' }] }];
  assert.equal(readControlValues('security', enabled).s_stir, true);
  const disabled: ConfigValue = [{ name: 'attestation', entries: [{ key: 'global_disable', value: 'yes' }] }];
  assert.equal(readControlValues('security', disabled).s_stir, false);

  // and round-trips back through applyControlValues negated the same way
  const next = applyControlValues('security', enabled, { s_stir: false });
  const section = next.find((s) => s.name === 'attestation');
  assert.equal(section?.entries.find((e) => e.key === 'global_disable')?.value, 'yes');
});

// ---------------------------------------------------------------- list parsing

test('list parsing splits on commas and trims surrounding whitespace', () => {
  const cfg: ConfigValue = [{ name: 'logfiles', entries: [{ key: 'console', value: ' notice , warning ,error ' }] }];
  assert.deepEqual(readControlValues('logger', cfg).g_console, ['notice', 'warning', 'error']);
});

test('list values are re-joined with plain commas on write', () => {
  const cfg: ConfigValue = [{ name: 'logfiles', entries: [{ key: 'console', value: 'notice' }] }];
  const next = applyControlValues('logger', cfg, { g_console: ['debug', 'trace', 'error'] });
  const section = next.find((s) => s.name === 'logfiles');
  assert.equal(section?.entries.find((e) => e.key === 'console')?.value, 'debug,trace,error');
});

// ---------------------------------------------------------------- number parsing

test('number parsing reads a plain integer', () => {
  const cfg: ConfigValue = [{ name: 'general', entries: [{ key: 'timeout', value: '15' }] }];
  assert.equal(readControlValues('queues', cfg).q_timeout, 15);
});

test('a non-numeric value is left unset for a number control', () => {
  const cfg: ConfigValue = [{ name: 'general', entries: [{ key: 'timeout', value: 'not-a-number' }] }];
  assert.equal('q_timeout' in readControlValues('queues', cfg), false);
});

// ---------------------------------------------------------------- readControlValues on realistic files

test('readControlValues reads a realistic queues.conf onto the queues screen', () => {
  const cfg: ConfigValue = [
    {
      name: 'general',
      entries: [
        { key: 'strategy', value: 'leastrecent' },
        { key: 'timeout', value: '20' },
        { key: 'wrapuptime', value: '30' },
        { key: 'ringinuse', value: 'no' },
        { key: 'joinempty', value: 'paused,invalid' },
        { key: 'leavewhenempty', value: 'inuse' },
      ],
    },
  ];
  const values = readControlValues('queues', cfg);
  assert.equal(values.q_strategy, 'leastrecent');
  assert.equal(values.q_timeout, 20);
  assert.equal(values.q_wrapup, 30);
  assert.equal(values.q_ringinuse, false);
  assert.deepEqual(values.q_joinempty, ['paused', 'invalid']);
  assert.deepEqual(values.q_leave, ['inuse']);
});

test('readControlValues reads a realistic voicemail.conf onto the voicemail screen', () => {
  const cfg: ConfigValue = [
    {
      name: 'general',
      entries: [
        { key: 'attach', value: 'yes' },
        { key: 'format', value: 'wav49|gsm|wav' },
        { key: 'maxmsg', value: '50' },
        { key: 'review', value: 'yes' },
        { key: 'saycid', value: 'no' },
      ],
    },
  ];
  const values = readControlValues('voicemail', cfg);
  assert.equal(values.v_attach, true);
  assert.equal(values.v_format, 'wav49|gsm|wav');
  assert.equal(values.v_maxmsg, 50);
  assert.equal(values.v_review, true);
  assert.equal(values.v_saycid, false);
});

test('readControlValues reads a realistic logger.conf onto the logger screen', () => {
  const cfg: ConfigValue = [
    { name: 'general', entries: [{ key: 'rotatestrategy', value: 'timestamp' }, { key: 'queue_log', value: 'no' }] },
    { name: 'logfiles', entries: [{ key: 'console', value: 'notice,warning,error' }, { key: 'messages', value: 'notice,warning' }] },
  ];
  const values = readControlValues('logger', cfg);
  assert.equal(values.g_rotate, 'timestamp');
  assert.equal(values.g_queue, false);
  assert.deepEqual(values.g_console, ['notice', 'warning', 'error']);
  assert.deepEqual(values.g_file, ['notice', 'warning']);
});

// ---------------------------------------------------------------- applyControlValues

test('applyControlValues changes only the bound key', () => {
  const cfg: ConfigValue = [
    {
      name: 'general',
      entries: [
        { key: 'strategy', value: 'ringall' },
        { key: 'timeout', value: '15' },
        { key: 'maxlen', value: '25' },
      ],
    },
  ];
  const next = applyControlValues('queues', cfg, { q_timeout: 45 });
  const section = next.find((s) => s.name === 'general');
  assert.equal(section?.entries.find((e) => e.key === 'timeout')?.value, '45');
  // untouched keys survive unchanged
  assert.equal(section?.entries.find((e) => e.key === 'strategy')?.value, 'ringall');
  assert.equal(section?.entries.find((e) => e.key === 'maxlen')?.value, '25');
});

test('applyControlValues preserves repeated keys elsewhere in the file', () => {
  // acl.conf-style repeated permit= entries in an unrelated section must survive a
  // write to a completely different bound section — this is the data-loss case.
  const cfg: ConfigValue = [
    {
      name: 'general',
      entries: [{ key: 'strategy', value: 'ringall' }, { key: 'timeout', value: '15' }],
    },
    {
      name: 'unrelated_acl',
      entries: [
        { key: 'permit', value: '10.0.0.0/8' },
        { key: 'permit', value: '192.168.0.0/16' },
        { key: 'deny', value: '0.0.0.0/0' },
      ],
    },
  ];
  const next = applyControlValues('queues', cfg, { q_strategy: 'leastrecent' });
  const acl = next.find((s) => s.name === 'unrelated_acl');
  assert.deepEqual(
    acl?.entries,
    [
      { key: 'permit', value: '10.0.0.0/8' },
      { key: 'permit', value: '192.168.0.0/16' },
      { key: 'deny', value: '0.0.0.0/0' },
    ],
  );
});

test('applyControlValues creates a missing key inside an existing section', () => {
  const cfg: ConfigValue = [{ name: 'general', entries: [{ key: 'strategy', value: 'ringall' }] }];
  const next = applyControlValues('queues', cfg, { q_timeout: 30 });
  const section = next.find((s) => s.name === 'general');
  assert.equal(section?.entries.length, 2);
  assert.equal(section?.entries.find((e) => e.key === 'timeout')?.value, '30');
});

test('applyControlValues creates a missing section entirely', () => {
  const cfg: ConfigValue = [];
  const next = applyControlValues('logger', cfg, { g_rotate: 'rotate' });
  const section = next.find((s) => s.name === 'general');
  assert.ok(section, 'expected the general section to be created');
  assert.equal(section?.entries.find((e) => e.key === 'rotatestrategy')?.value, 'rotate');
});

test('a no-op round trip renders identically', () => {
  const cfg: ConfigValue = [
    {
      name: 'general',
      entries: [
        { key: 'strategy', value: 'ringall' },
        { key: 'timeout', value: '15' },
        { key: 'unrelated_thing', value: 'kept-as-is' },
      ],
    },
    { name: 'other', entries: [{ key: 'x', value: 'y' }] },
  ];
  const next = applyControlValues('queues', cfg, {});
  assert.deepEqual(next, cfg);
});

test('an unmapped control passed in changes is ignored, not written', () => {
  const cfg: ConfigValue = [{ name: 'general', entries: [{ key: 'strategy', value: 'ringall' }] }];
  // q_periodic IS bound (announce-frequency); make up a control id that has no
  // binding on this screen at all and confirm nothing gets written for it.
  const next = applyControlValues('queues', cfg, { totally_unbound_control: 'nope', q_strategy: 'random' });
  const section = next.find((s) => s.name === 'general');
  assert.equal(section?.entries.length, 1);
  assert.equal(section?.entries.find((e) => e.key === 'strategy')?.value, 'random');
  assert.equal(section?.entries.some((e) => e.value === 'nope'), false);
});

// ---------------------------------------------------------------- unmappedControls

test('unmappedControls returns the real remainder for a bound screen', () => {
  const remainder = unmappedControls('queues');
  assert.deepEqual(remainder, []); // every queues control is bound

  const codecsRemainder = unmappedControls('codecs');
  assert.ok(codecsRemainder.includes('k_order'));
  assert.ok(codecsRemainder.includes('r_dtmf'));
  assert.ok(!codecsRemainder.includes('r_start'));
});

test('unmappedControls returns everything for a screen with no bindings at all', () => {
  const remainder = unmappedControls('ivr');
  assert.deepEqual(remainder, ['i_timeout', 'i_retries', 'i_invalid', 'i_direct', 'i_lang', 'i_barge']);
});

test('unmappedControls returns nothing for a screen this table has no knowledge of', () => {
  assert.deepEqual(unmappedControls('does_not_exist'), []);
});
