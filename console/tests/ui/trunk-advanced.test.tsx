/**
 * Advanced trunk settings (CORE-PJSIP-TRUNK-ADV-003, -011, -012, -014, -018 through -024).
 *
 * Every key asserted here appears in Asterisk's own configs/samples/pjsip.conf.sample.
 * Two settings from the same block are deliberately untested and unclaimed, and that
 * absence has its own test below: writing a key this Asterisk does not read produces a
 * line that looks like a working setting and does nothing.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  REL_100, T38_ERROR_CORRECTION, TRUNK_CONTROLS, applyControlValues, controlValuesFor, trunkDocument,
} from '../../app/renderer/src/trunk-advanced.ts';
import { buildEndpointDraft, endpointDocument, WIZARD_CONTROLS } from '../../app/renderer/src/endpoint-create.ts';
import { parsePjsip } from '../../control-plane/subsystem-models.ts';
import type { ConfigValue } from '../../app/renderer/src/configuration.ts';

/** Built through the real create path so the fixture cannot drift from what is written. */
const trunk = (name = 'provider-a'): ConfigValue => {
  const draft = buildEndpointDraft([] as unknown as ConfigValue, {
    [WIZARD_CONTROLS.name]: name, [WIZARD_CONTROLS.context]: 'from-trunk',
  });
  assert.ok(!('error' in draft));
  return endpointDocument(draft).value;
};

const ok = <T,>(result: T | { error: string }): T => {
  assert.ok(!(result && typeof result === 'object' && 'error' in result),
    `expected success, got: ${(result as { error?: string }).error ?? ''}`);
  return result as T;
};

const edit = (values: Record<string, unknown>, existing = trunk()) =>
  ok(applyControlValues(existing, 'provider-a', values));

const applied = (values: Record<string, unknown>) =>
  edit(values).view.endpoints[0].endpoint as unknown as Record<string, unknown>;

/** Every control, a value to write, and the pjsip.conf key it must land on. */
const FIELDS: ReadonlyArray<readonly [string, unknown, string, string]> = [
  [TRUNK_CONTROLS.sendConnectedLine, true, 'send_connected_line', 'yes'],
  [TRUNK_CONTROLS.contactUser, '441234567', 'contact_user', '441234567'],
  [TRUNK_CONTROLS.fromDomain, 'sip.example.net', 'from_domain', 'sip.example.net'],
  [TRUNK_CONTROLS.fromUser, 'account-42', 'from_user', 'account-42'],
  [TRUNK_CONTROLS.mediaAddress, '203.0.113.9', 'media_address', '203.0.113.9'],
  [TRUNK_CONTROLS.t38Udptl, true, 't38_udptl', 'yes'],
  [TRUNK_CONTROLS.t38ErrorCorrection, 'redundancy', 't38_udptl_ec', 'redundancy'],
  [TRUNK_CONTROLS.t38Nat, true, 't38_udptl_nat', 'yes'],
  [TRUNK_CONTROLS.t38MaxDatagram, 400, 't38_udptl_maxdatagram', '400'],
  [TRUNK_CONTROLS.faxDetect, true, 'fax_detect', 'yes'],
  [TRUNK_CONTROLS.trustIdOutbound, true, 'trust_id_outbound', 'yes'],
  [TRUNK_CONTROLS.sendRpid, true, 'send_rpid', 'yes'],
  [TRUNK_CONTROLS.sendDiversion, true, 'send_diversion', 'yes'],
  [TRUNK_CONTROLS.sendPai, true, 'send_pai', 'yes'],
  [TRUNK_CONTROLS.send100rel, 'required', '100rel', 'required'],
];

test('every control writes its own pjsip.conf key', () => {
  for (const [control, value, key, written] of FIELDS) {
    assert.equal(applied({ [control]: value })[key], written, `${control} did not write ${key}`);
  }
});

test('each control is independent: writing one leaves the other twelve unset', () => {
  /* A shared writer stamping every managed key on every save would silently give a trunk
   * a dozen settings nobody chose, on the object where that is most expensive. */
  for (const [control, value, key] of FIELDS) {
    const endpoint = applied({ [control]: value });
    for (const [, , other] of FIELDS) {
      if (other === key) continue;
      assert.equal(endpoint[other], undefined, `writing ${key} also wrote ${other}`);
    }
  }
});

test('a control nobody touched writes nothing at all', () => {
  const endpoint = applied({ [TRUNK_CONTROLS.contactUser]: '441234567' });
  for (const [, , key] of FIELDS) {
    if (key === 'contact_user') continue;
    assert.equal(endpoint[key], undefined, `${key} was written by a save that never mentioned it`);
  }
});

test('every value round-trips back into the control it came from', () => {
  const all = Object.fromEntries(FIELDS.map(([control, value]) => [control, value]));
  const seeded = controlValuesFor(edit(all).view.endpoints[0]);
  for (const [control, value] of FIELDS) {
    assert.deepEqual(seeded[control], value, `${control} did not survive the round trip`);
  }
});

test('the whole set survives being rendered to a file and parsed back', () => {
  /* The controls could be right and the serializer still drop a key it does not manage,
   * losing the setting between saving and reopening the screen. */
  const all = Object.fromEntries(FIELDS.map(([control, value]) => [control, value]));
  const written = trunkDocument(edit(all), '/etc/asterisk/pjsip.conf').value;
  const back = parsePjsip(written).endpoints[0].endpoint as unknown as Record<string, unknown>;
  for (const [, , key, expected] of FIELDS) {
    assert.equal(back[key], expected, `${key} was lost between rendering and reparsing`);
  }
});

test('T.38 error correction keeps all three documented values', () => {
  /* none, fec and redundancy. A switch would make two unreachable and rewrite whichever
   * was set on the next save. */
  assert.equal(T38_ERROR_CORRECTION.length, 3);
  for (const value of T38_ERROR_CORRECTION) {
    assert.equal(applied({ [TRUNK_CONTROLS.t38ErrorCorrection]: value }).t38_udptl_ec, value);
  }
});

test('100rel keeps all three documented values', () => {
  /* no, required and yes -- a switch would make one unreachable, same reasoning as
   * T.38 error correction above. */
  assert.equal(REL_100.length, 3);
  for (const value of REL_100) {
    assert.equal(applied({ [TRUNK_CONTROLS.send100rel]: value })['100rel'], value);
  }
});

test('an empty text control writes nothing rather than clearing the field', () => {
  /* Clearing a provider's From domain nobody meant to touch breaks outbound calls with
   * nothing on screen to say what changed. */
  const existing = trunkDocument(edit({ [TRUNK_CONTROLS.fromDomain]: 'sip.example.net' }), 'x').value;
  const after = ok(applyControlValues(existing, 'provider-a', { [TRUNK_CONTROLS.fromDomain]: '' }));
  assert.equal(after.view.endpoints[0].endpoint.from_domain, 'sip.example.net');
  assert.deepEqual(after.summary, []);
});

test('saving an unchanged value produces no summary line', () => {
  const existing = trunkDocument(edit({ [TRUNK_CONTROLS.faxDetect]: true }), 'x').value;
  assert.deepEqual(ok(applyControlValues(existing, 'provider-a', { [TRUNK_CONTROLS.faxDetect]: true })).summary, []);
});

test('each change names the key, the before and the after', () => {
  const result = edit({ [TRUNK_CONTROLS.fromUser]: 'account-42' });
  assert.equal(result.summary.length, 1);
  assert.match(result.summary[0], /from_user unset to account-42/u);
});

test('saving a trunk that is no longer there is refused rather than recreating it', () => {
  const gone = applyControlValues(trunk(), 'someone-else', { [TRUNK_CONTROLS.faxDetect]: true });
  assert.ok('error' in gone);
  assert.match(gone.error, /not on this target/u);
});

/* --- warnings, stated before the write --------------------------------------------- */

test('T.38 settings without T.38 itself are called out, since Asterisk will not read them', () => {
  const result = edit({
    [TRUNK_CONTROLS.t38ErrorCorrection]: 'fec', [TRUNK_CONTROLS.t38Nat]: true,
  });
  assert.ok(result.warnings.some((w) => /will not read them/u.test(w)));
});

test('T.38 settings with T.38 on warn about nothing', () => {
  const result = edit({
    [TRUNK_CONTROLS.t38Udptl]: true, [TRUNK_CONTROLS.t38ErrorCorrection]: 'fec',
  });
  assert.deepEqual(result.warnings, []);
});

test('sending Remote-Party-ID without trusting outbound identity is called out', () => {
  /* This is where a caller who withheld their number has it forwarded anyway. */
  const result = edit({ [TRUNK_CONTROLS.sendRpid]: true });
  assert.ok(result.warnings.some((w) => /withheld their number/u.test(w)));
});

test('sending Remote-Party-ID with outbound identity trusted warns about nothing', () => {
  const result = edit({ [TRUNK_CONTROLS.sendRpid]: true, [TRUNK_CONTROLS.trustIdOutbound]: true });
  assert.deepEqual(result.warnings, []);
});

/* --- what is deliberately not here -------------------------------------------------- */

test('no control writes a key this Asterisk does not document', () => {
  /* user=phone and Support Path are asked for by the same scoreboard block and have no
   * key in this Asterisk's pjsip.conf.sample. Writing one produces a line that looks like
   * a working setting and does nothing, which is worse than the gap -- the same failure
   * as writing automon into a features.conf whose Asterisk only knows automixmon. */
  const ids = Object.values(TRUNK_CONTROLS).join(' ');
  for (const absent of ['user_eq_phone', 'userphone', 'support_path', 'supportpath']) {
    assert.ok(!ids.includes(absent), `a control exists for ${absent}, which is not in the sample`);
  }
  const all = Object.fromEntries(FIELDS.map(([control, value]) => [control, value]));
  const endpoint = applied(all) as Record<string, unknown>;
  for (const absent of ['user_eq_phone', 'support_path']) {
    assert.equal(endpoint[absent], undefined, `${absent} was written despite not being documented`);
  }
});
