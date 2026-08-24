import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CONTROL_BINDINGS,
  applyControlValues,
  readControlValues,
  isUninventoried, unmappedControls,
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
  assert.equal(screenCount, 16);
  // 82 from the first pass, plus a_origin (ami/allowed_origins) and s_failaction
  // (security/failure_action) found on the second look, plus 21 on 2026-08-24: the eight
  // http.conf keys and the thirteen features.conf ones, which brought two whole screens
  // into the table for the first time. Each was checked against the sample file in this
  // checkout by hand -- key spelling and section both -- because a fan-out proposed
  // thirty-three and six of those were controls that were already bound.
  // Then eight more the same day, going through the remainder one control at a time: seven
  // http.conf keys and the last feature code. That finished features.conf entirely and left
  // http.conf with only the two halves of tlsbindaddr, which no single binding can carry.
  // And 115 once composite bindings arrived, which let the two halves of tlsbindaddr be
  // bound at last. http.conf is now completely bound, as is features.conf.
  // And 126 once section-by-type arrived, which let the IAX peers screen be bound at all:
  // iax.conf writes a peer as a named section with type=peer or type=friend inside, so a
  // binding looking for a section called peer could never have matched one.
  // And 127 with the manager TLS port, which is the same address:port shape as http.conf.
  // The remainder is recorded in docs/platform/unbound-controls.md: most of them are not
  // waiting for a key, they are shapes no single binding can carry.
  // And 128 with deny-by-default, whose off state is the key being absent rather than a
  // value: deny=no is a line Asterisk tries to read as a network.
  // And 130 with the two whose keys live in asterisk.conf rather than the file their
  // screen edits: logger verbosity and global transcoding.
  // And 131 with the permitted-networks list, which needed two shapes at once: a key that
  // repeats, and a section chosen by another control rather than named in the table.
  assert.equal(controlCount, 131);
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

test('a screen this table has no knowledge of says so, rather than answering nothing', () => {
  /* This used to assert an empty list, which encoded the defect: the caller warns only when
   * the list is non-empty, so "nobody has inventoried this screen" and "every control on it
   * is bound" were the same answer. Three real screens took that path and read as more
   * finished than the ones being honest about their gaps. */
  const answer = unmappedControls('does_not_exist');
  assert.equal(isUninventoried(answer), true);
  assert.notDeepEqual(answer, []);
  assert.equal(isUninventoried(unmappedControls('ivr')), false, 'a known screen must not answer this way');
});

// -------------------------------------------------- second-pass bindings: a_origin

test('a_origin reads ari.conf.sample allowed_origins as a comma-separated list', () => {
  // configs/samples/ari.conf.sample [general] ~line 5: ";allowed_origins =  ; Comma
  // separated list of allowed origins, for Cross-Origin Resource Sharing."
  const cfg: ConfigValue = [
    { name: 'general', entries: [{ key: 'allowed_origins', value: 'https://console.local,https://ops.example' }] },
  ];
  const values = readControlValues('ami', cfg);
  assert.deepEqual(values.a_origin, ['https://console.local', 'https://ops.example']);
});

test('a_origin writes back as a plain comma-separated allowed_origins value', () => {
  const cfg: ConfigValue = [{ name: 'general', entries: [{ key: 'enabled', value: 'yes' }] }];
  const next = applyControlValues('ami', cfg, { a_origin: ['https://console.local', '*'] });
  const section = next.find((s) => s.name === 'general');
  assert.equal(section?.entries.find((e) => e.key === 'allowed_origins')?.value, 'https://console.local,*');
  // the unrelated key already in the shared 'general' section survives untouched
  assert.equal(section?.entries.find((e) => e.key === 'enabled')?.value, 'yes');
});

// ---------------------------------------------- second-pass bindings: s_failaction

test('s_failaction value mapping reads every real failure_action spelling', () => {
  // configs/samples/stir_shaken.conf.sample [verification] template ~line 441:
  // ";failure_action = reject_request"; the "continue" and "continue_return_reason"
  // spellings are documented in the same block (~line 347-365).
  const cases: Array<[string, string]> = [
    ['continue', 'Continue'],
    ['continue_return_reason', 'Tag'],
    ['reject_request', 'Reject'],
  ];
  for (const [raw, control] of cases) {
    const cfg: ConfigValue = [{ name: 'verification', entries: [{ key: 'failure_action', value: raw }] }];
    assert.equal(readControlValues('security', cfg).s_failaction, control, `expected ${raw} to read as ${control}`);
  }
});

test('s_failaction value mapping writes every control value back to its real spelling', () => {
  const cases: Array<[string, string]> = [
    ['Continue', 'continue'],
    ['Tag', 'continue_return_reason'],
    ['Reject', 'reject_request'],
  ];
  for (const [control, raw] of cases) {
    const cfg: ConfigValue = [{ name: 'verification', entries: [{ key: 'failure_action', value: 'continue' }] }];
    const next = applyControlValues('security', cfg, { s_failaction: control });
    const section = next.find((s) => s.name === 'verification');
    assert.equal(section?.entries.find((e) => e.key === 'failure_action')?.value, raw, `expected ${control} to write ${raw}`);
  }
});

test('an unrecognised failure_action spelling is left unset rather than guessed', () => {
  const cfg: ConfigValue = [{ name: 'verification', entries: [{ key: 'failure_action', value: 'something_else' }] }];
  assert.equal('s_failaction' in readControlValues('security', cfg), false);
});

test('an unrecognised s_failaction control value is refused on write rather than passed through', () => {
  const cfg: ConfigValue = [{ name: 'verification', entries: [{ key: 'failure_action', value: 'continue' }] }];
  const next = applyControlValues('security', cfg, { s_failaction: 'Not A Real Option' });
  const section = next.find((s) => s.name === 'verification');
  // the original value survives untouched rather than being overwritten with the
  // design's own unrecognised word
  assert.equal(section?.entries.find((e) => e.key === 'failure_action')?.value, 'continue');
});

// ------------------------------------------------------------ post-second-pass sanity

test('unmappedControls reflects the two controls bound on this second look', () => {
  assert.ok(!unmappedControls('ami').includes('a_origin'));
  assert.ok(!unmappedControls('security').includes('s_failaction'));
  /* a_tlsport left this list on 2026-08-24: manager.conf writes tlsbindaddr as address:port,
   * the same shape as http.conf, so a composite binding gives the port its own half. It was
   * refused before because the model had no way to own half a value, which is a different
   * thing from the setting being unbindable -- and worth separating, because one is a
   * decision and the other is a gap. */
  assert.ok(!unmappedControls('ami').includes('a_tlsport'));
  /* a_deny left the list too, once a binding could mean the key is absent. Both it and
   * a_tlsport were recorded as refused when what was really missing was a shape. */
  assert.ok(!unmappedControls('ami').includes('a_deny'));
  /* s_permit left this list once a section could be a choice and a key could repeat. */
  for (const stillUnbound of [
    's_acl',]) {
    assert.ok(unmappedControls('security').includes(stillUnbound), `expected ${stillUnbound} to remain unmapped`);
  }
  /* k_transcode left this list once a binding could name its own file: transcode_via_sln is
   * in asterisk.conf, and this screen edits codecs.conf. k_order left it too, wired as the
   * order a new endpoint starts from, which is the only thing a global codec order can
   * honestly mean when pjsip keeps codec lists per endpoint. */
  for (const stillUnbound of ['k_opusbr', 'k_ptime', 'r_dtmf', 'r_dtls']) {
    assert.ok(unmappedControls('codecs').includes(stillUnbound), `expected ${stillUnbound} to remain unmapped`);
  }
});

// ---------------------------------------------------------------- composite values

test('two controls sharing one value each read their own half', () => {
  /* Asterisk writes tlsbindaddr as address:port, and the interface offers an address field
   * and a port stepper because that is how a person thinks about it. */
  const cfg: ConfigValue = [{ name: 'general', entries: [{ key: 'tlsbindaddr', value: '10.0.0.5:8089' }] }];
  const values = readControlValues('httpd', cfg);
  assert.equal(values.ht_tlsaddr, '10.0.0.5');
  assert.equal(values.ht_tlsport, 8089);
});

test('a bare address with no port is read as the address, never the port', () => {
  /* Asterisk accepts tlsbindaddr with no port. Treating the whole value as the second half
   * would silently move an address into a port field, which then writes back as nonsense. */
  const cfg: ConfigValue = [{ name: 'general', entries: [{ key: 'tlsbindaddr', value: '0.0.0.0' }] }];
  const values = readControlValues('httpd', cfg);
  assert.equal(values.ht_tlsaddr, '0.0.0.0');
  assert.equal(values.ht_tlsport, undefined, 'a missing half was invented rather than left absent');
});

test('changing one half leaves the other exactly as it was', () => {
  /* The whole reason composite bindings exist. Writing only the changed half would erase the
   * other control's work every time either one was touched. */
  const cfg: ConfigValue = [{ name: 'general', entries: [{ key: 'tlsbindaddr', value: '10.0.0.5:8089' }] }];
  const afterPort = applyControlValues('httpd', cfg, { ht_tlsport: 9443 });
  assert.equal(afterPort[0].entries[0].value, '10.0.0.5:9443');
  const afterAddr = applyControlValues('httpd', cfg, { ht_tlsaddr: '192.168.1.9' });
  assert.equal(afterAddr[0].entries[0].value, '192.168.1.9:8089');
});

test('both halves changing at once produce one correct value', () => {
  const cfg: ConfigValue = [{ name: 'general', entries: [{ key: 'tlsbindaddr', value: '10.0.0.5:8089' }] }];
  const after = applyControlValues('httpd', cfg, { ht_tlsaddr: '0.0.0.0', ht_tlsport: 443 });
  assert.equal(after[0].entries[0].value, '0.0.0.0:443');
});

test('setting a half when the key does not exist yet writes only that half', () => {
  /* No dangling separator: `0.0.0.0:` is not a value Asterisk accepts, and a half-filled
   * line is worse than a short one. */
  const after = applyControlValues('httpd', [{ name: 'general', entries: [] }], { ht_tlsaddr: '0.0.0.0' });
  assert.equal(after[0].entries[0].value, '0.0.0.0');
});

test('a malformed stored value does not stop the other half being edited', () => {
  /* Somebody hand-edits the file and leaves something odd. Refusing to write would be a
   * console that stops working because the file it edits is imperfect. */
  const cfg: ConfigValue = [{ name: 'general', entries: [{ key: 'tlsbindaddr', value: '::::' }] }];
  const after = applyControlValues('httpd', cfg, { ht_tlsport: 8443 });
  assert.match(after[0].entries[0].value, /8443$/u);
});

// ---------------------------------------------------------------- sections found by type

/** A pjsip.conf as Asterisk actually receives one: sections named after the object. */
const realisticPjsip: ConfigValue = [
  { name: 'transport-udp', entries: [{ key: 'type', value: 'transport' }, { key: 'protocol', value: 'udp' }] },
  { name: '6001', entries: [
    { key: 'type', value: 'endpoint' },
    { key: 'transport', value: 'transport-udp' },
    { key: 'context', value: 'from-internal' },
  ] },
  { name: '6001-aor', entries: [{ key: 'type', value: 'aor' }, { key: 'max_contacts', value: '3' }] },
];

test('a binding finds its section by what it is, not by what it is called', () => {
  /* This is the defect these bindings shipped with. The headings that look like section
   * names in pjsip.conf.sample -- [endpoint], [aor] -- are COMMENTED OUT: documentation, not
   * sections. A real file names each section after the object and says what it is inside. So
   * fourteen bindings looked for a section literally called "endpoint" and found nothing, on
   * every real file, and no test looked because none existed for this screen. */
  const values = readControlValues('endpoints', realisticPjsip);
  assert.equal(values.e_transport, 'transport-udp');
  assert.equal(values.e_context, 'from-internal');
  assert.equal(values.e_maxcontacts, 3, 'the aor section was not found by its type either');
});

test('the fabricated section name no longer matches, which is the point', () => {
  /* A section literally called [endpoint] is not an endpoint; it is an object somebody named
   * "endpoint". Matching it was the bug. */
  const fabricated: ConfigValue = [{ name: 'endpoint', entries: [{ key: 'transport', value: 'transport-udp' }] }];
  assert.deepEqual(readControlValues('endpoints', fabricated), {});
});

test('writing goes into the object section, leaving its name and type alone', () => {
  const after = applyControlValues('endpoints', realisticPjsip, { e_context: 'from-trunks' });
  const edited = after.find((section) => section.name === '6001');
  assert.equal(edited.entries.find((e) => e.key === 'context').value, 'from-trunks');
  assert.equal(edited.entries.find((e) => e.key === 'type').value, 'endpoint', 'the type was disturbed');
  assert.equal(after.length, realisticPjsip.length, 'a section was invented');
});

test('with no such object, nothing is written and no section is invented', () => {
  /* Creating [endpoint] because no endpoint exists yet would write an object Asterisk reads
   * as one literally called "endpoint". Making a real one is the endpoint editor's job, and
   * it names it after the extension. */
  const empty: ConfigValue = [{ name: 'general', entries: [] }];
  const after = applyControlValues('endpoints', empty, { e_context: 'from-internal' });
  assert.deepEqual(after, empty);
});

test('the first object of that type is the one used, consistently for read and write', () => {
  const two: ConfigValue = [
    { name: '6001', entries: [{ key: 'type', value: 'endpoint' }, { key: 'context', value: 'first' }] },
    { name: '6002', entries: [{ key: 'type', value: 'endpoint' }, { key: 'context', value: 'second' }] },
  ];
  assert.equal(readControlValues('endpoints', two).e_context, 'first');
  const after = applyControlValues('endpoints', two, { e_context: 'changed' });
  assert.equal(after[0].entries.find((e) => e.key === 'context').value, 'changed');
  assert.equal(after[1].entries.find((e) => e.key === 'context').value, 'second', 'it edited more than one object');
});

test('a type is matched however Asterisk spells its case and spacing', () => {
  const odd: ConfigValue = [{ name: '6001', entries: [{ key: 'type', value: ' Endpoint ' }, { key: 'context', value: 'x' }] }];
  assert.equal(readControlValues('endpoints', odd).e_context, 'x');
});

test('a fixed section like [general] still matches by name', () => {
  /* Most files genuinely do have one, and nothing about them changed. */
  const cfg: ConfigValue = [{ name: 'general', entries: [{ key: 'bindaddr', value: '127.0.0.1' }] }];
  assert.equal(readControlValues('httpd', cfg).ht_bindaddr, '127.0.0.1');
});

// ---------------------------------------------------------------- IAX peers

/** An iax.conf as Asterisk receives one: the peer is the section, its type is inside. */
const realisticIax: ConfigValue = [
  { name: 'general', entries: [{ key: 'bindport', value: '4569' }] },
  { name: 'carrier-a', entries: [
    { key: 'type', value: 'friend' },
    { key: 'host', value: '198.51.100.7' },
    { key: 'context', value: 'from-trunk' },
    { key: 'trunk', value: 'yes' },
  ] },
];

test('an IAX peer is found whether it is written peer or friend', () => {
  /* An object that also receives calls is written type=friend, and the screen editing it
   * does not care which it is. Matching only one would leave half of real files unreadable. */
  const asFriend = readControlValues('iaxpeers', realisticIax);
  assert.equal(asFriend.ix_host, '198.51.100.7');
  assert.equal(asFriend.ix_trunk, true);
  const asPeer: ConfigValue = [{ name: 'carrier-b', entries: [
    { key: 'type', value: 'peer' }, { key: 'host', value: '203.0.113.9' },
  ] }];
  assert.equal(readControlValues('iaxpeers', asPeer).ix_host, '203.0.113.9');
});

test('a user-only IAX object is not treated as a peer', () => {
  /* [guest] with type=user is the sample's own inbound-only object. Editing it from the
   * peers screen would change something the person did not open. */
  const guest: ConfigValue = [{ name: 'guest', entries: [
    { key: 'type', value: 'user' }, { key: 'context', value: 'public' },
  ] }];
  assert.deepEqual(readControlValues('iaxpeers', guest), {});
});

test('writing goes into the peer section and leaves [general] alone', () => {
  const after = applyControlValues('iaxpeers', realisticIax, { ix_context: 'from-carrier' });
  assert.equal(after[1].entries.find((e) => e.key === 'context').value, 'from-carrier');
  assert.deepEqual(after[0], realisticIax[0], 'the general section was disturbed');
});

test('the type and the secret stay out of the bindings', () => {
  /* ix_type IS the discriminator: binding it would let somebody change type through the very
   * match that found the section, after which the screen edits something it can no longer
   * see. ix_secret_set means "set a new secret" rather than carrying one, and a secret must
   * never travel through an ordinary binding into renderer state. */
  const unbound = unmappedControls('iaxpeers');
  assert.deepEqual([...unbound].sort(), ['ix_secret_set', 'ix_type']);
  const written = applyControlValues('iaxpeers', realisticIax, { ix_type: 'user', ix_secret_set: true });
  assert.deepEqual(written, realisticIax, 'the type or a secret reached the file');
});

// ---------------------------------------------------------------- settings that are a presence

test('a switch whose off state is the key not being there reads both ways', () => {
  /* Denying by default is the deny LINE existing, not a yes or a no. A missing key is the
   * off state, not an absence of information, so the switch shows false rather than nothing
   * -- a switch that shows nothing until somebody touches it hides the state it exists for. */
  const denied: ConfigValue = [{ name: 'general', entries: [{ key: 'deny', value: '0.0.0.0/0.0.0.0' }] }];
  const open: ConfigValue = [{ name: 'general', entries: [{ key: 'port', value: '5038' }] }];
  assert.equal(readControlValues('ami', denied).a_deny, true);
  assert.equal(readControlValues('ami', open).a_deny, false);
});

test('turning it off removes the line rather than writing no', () => {
  /* deny=no is not the off state. It is a line Asterisk tries to read as a network. */
  const denied: ConfigValue = [{ name: 'general', entries: [
    { key: 'deny', value: '0.0.0.0/0.0.0.0' }, { key: 'port', value: '5038' },
  ] }];
  const after = applyControlValues('ami', denied, { a_deny: false });
  assert.deepEqual(after[0].entries, [{ key: 'port', value: '5038' }]);
});

test('turning it on writes the value the setting actually needs', () => {
  const open: ConfigValue = [{ name: 'general', entries: [{ key: 'port', value: '5038' }] }];
  const after = applyControlValues('ami', open, { a_deny: true });
  assert.deepEqual(after[0].entries[1], { key: 'deny', value: '0.0.0.0/0.0.0.0' });
});

test('whatever the line carries, its presence means on', () => {
  /* The value is the network being denied, so a different network is still a deny. */
  const narrow: ConfigValue = [{ name: 'general', entries: [{ key: 'deny', value: '10.0.0.0/8' }] }];
  assert.equal(readControlValues('ami', narrow).a_deny, true);
});

test('a section that does not exist reports nothing rather than false', () => {
  /* False would claim the setting is off in a file that has no such section at all, which is
   * a different thing from knowing it is off. */
  assert.equal(readControlValues('ami', [{ name: 'other', entries: [] }]).a_deny, undefined);
});

// ---------------------------------------------------------------- keys in another file

test('a control whose key lives in another file reads from that file', () => {
  /* Logger verbosity is asterisk.conf's verbose, in [options]; the logger screen edits
   * logger.conf. It was recorded as unbindable when what was true is that it sits on a
   * screen reading a different file. */
  const logger: ConfigValue = [{ name: 'general', entries: [{ key: 'queue_log', value: 'yes' }] }];
  const asterisk: ConfigValue = [{ name: 'options', entries: [
    { key: 'verbose', value: '5' }, { key: 'transcode_via_sln', value: 'no' },
  ] }];
  const values = readControlValues('logger', logger, { 'asterisk.conf': asterisk });
  assert.equal(values.g_verbose, 5);
  assert.equal(values.g_queue, true, 'the screen’s own file stopped being read');
});

test('without that file the control is absent, never read from the wrong one', () => {
  /* Reading it from the screen's own file would report one setting's value under another
   * setting's name, which is worse than reporting nothing. */
  const logger: ConfigValue = [{ name: 'options', entries: [{ key: 'verbose', value: '9' }] }];
  assert.equal(readControlValues('logger', logger).g_verbose, undefined);
});

test('global transcoding is the same story on a different screen', () => {
  const asterisk: ConfigValue = [{ name: 'options', entries: [{ key: 'transcode_via_sln', value: 'yes' }] }];
  assert.equal(readControlValues('codecs', [], { 'asterisk.conf': asterisk }).k_transcode, true);
});

// ---------------------------------------------------------------- a section somebody picks

/** acl.conf as it really is: each ACL a named section, order deciding which rule wins. */
const acls: ConfigValue = [
  { name: 'trusted-nets', entries: [
    { key: 'deny', value: '0.0.0.0/0' },
    { key: 'permit', value: '10.0.0.0/8' },
    { key: 'permit', value: '192.168.0.0/16' },
  ] },
  { name: 'branch-offices', entries: [{ key: 'permit', value: '172.16.0.0/12' }] },
];

test('the list belongs to whichever ACL is picked', () => {
  assert.deepEqual(readControlValues('security', acls, {}, { s_acl: 'trusted-nets' }).s_permit,
    ['10.0.0.0/8', '192.168.0.0/16']);
  assert.deepEqual(readControlValues('security', acls, {}, { s_acl: 'branch-offices' }).s_permit,
    ['172.16.0.0/12']);
});

test('with nothing picked the list is absent, not read from whichever came first', () => {
  /* Editing whichever ACL happens to be written first is not what somebody picking one meant. */
  assert.equal(readControlValues('security', acls).s_permit, undefined);
});

test('a section name that could break the file is refused', () => {
  /* A bracket would close the section early and put the rest somewhere nobody intended. */
  for (const name of ['acl]evil', '[acl', 'two words', '']) {
    assert.equal(readControlValues('security', acls, {}, { s_acl: name }).s_permit, undefined, name);
  }
});

test('writing replaces the whole run rather than the first line', () => {
  /* A list means "these, in this order". Leaving the old entries behind would combine two
   * lists into one that permits more than either -- in an ACL, that is a security failure
   * rather than a formatting one. */
  const after = applyControlValues('security', acls, { s_acl: 'trusted-nets', s_permit: ['10.1.0.0/16'] });
  const edited = after.find((section) => section.name === 'trusted-nets');
  assert.deepEqual(edited.entries.filter((e) => e.key === 'permit'), [{ key: 'permit', value: '10.1.0.0/16' }]);
});

test('the run stays where it was, and its neighbours with it', () => {
  /* In a file whose order decides which rule wins, moving a block to the end is not a
   * formatting detail. */
  const after = applyControlValues('security', acls, { s_acl: 'trusted-nets', s_permit: ['10.1.0.0/16', '10.2.0.0/16'] });
  const edited = after.find((section) => section.name === 'trusted-nets');
  assert.deepEqual(edited.entries.map((e) => e.key), ['deny', 'permit', 'permit']);
});

test('the ACL nobody picked is left exactly as it was', () => {
  const after = applyControlValues('security', acls, { s_acl: 'trusted-nets', s_permit: ['10.1.0.0/16'] });
  assert.deepEqual(after.find((section) => section.name === 'branch-offices'), acls[1]);
});

test('an empty list clears the run rather than leaving the old one', () => {
  const after = applyControlValues('security', acls, { s_acl: 'branch-offices', s_permit: [] });
  const edited = after.find((section) => section.name === 'branch-offices');
  assert.deepEqual(edited.entries, []);
});
