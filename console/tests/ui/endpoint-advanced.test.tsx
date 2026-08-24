/**
 * The endpoint fields the model already parsed but no control ever reached.
 *
 * These are the scoreboard's "backend ready, no UI" rows: `subsystem-models.ts` has
 * read `max_audio_streams`, `timers`, `rtp_timeout`, `outbound_proxy` and the rest
 * out of pjsip.conf since it was written, and nothing on screen could show or change
 * one. Every key asserted here exists in Asterisk's own `configs/samples/pjsip.conf`
 * sample; none was invented to make a control look complete.
 *
 * Covers CORE-PJSIP-DEV-010, -018, -020, -021, -023, -024, -027 and -028.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyControlValues, controlValuesFor, editDocument, findEndpoint, ENDPOINT_CONTROLS,
} from '../../app/renderer/src/endpoint-edit.ts';
import { buildEndpointDraft, endpointDocument, WIZARD_CONTROLS } from '../../app/renderer/src/endpoint-create.ts';
import type { ConfigValue } from '../../app/renderer/src/configuration.ts';

const withOne = (): ConfigValue => {
  const draft = buildEndpointDraft([], {
    [WIZARD_CONTROLS.name]: '1001', [WIZARD_CONTROLS.context]: 'from-internal',
  });
  assert.ok(!('error' in draft));
  return endpointDocument(draft).value;
};

const ok = <T,>(result: T | { error: string }): T => {
  assert.ok(!(result && typeof result === 'object' && 'error' in result),
    `expected success, got: ${(result as { error?: string }).error ?? ''}`);
  return result as T;
};

const applied = (values: Record<string, unknown>) =>
  ok(applyControlValues(withOne(), '1001', values)).view.endpoints[0].endpoint as unknown as Record<string, unknown>;

/** Every control, with a value to write and the pjsip.conf key it must land on. */
const FIELDS: ReadonlyArray<readonly [string, unknown, string, string]> = [
  [ENDPOINT_CONTROLS.maxAudioStreams, 3, 'max_audio_streams', '3'],
  [ENDPOINT_CONTROLS.maxVideoStreams, 0, 'max_video_streams', '0'],
  [ENDPOINT_CONTROLS.optimisticEncryption, true, 'media_encryption_optimistic', 'yes'],
  [ENDPOINT_CONTROLS.timers, 'required', 'timers', 'required'],
  [ENDPOINT_CONTROLS.timersMinSe, 120, 'timers_min_se', '120'],
  [ENDPOINT_CONTROLS.timersSessExpires, 1800, 'timers_sess_expires', '1800'],
  [ENDPOINT_CONTROLS.rtpTimeout, 30, 'rtp_timeout', '30'],
  [ENDPOINT_CONTROLS.rtpTimeoutHold, 300, 'rtp_timeout_hold', '300'],
  [ENDPOINT_CONTROLS.deviceStateBusyAt, 2, 'device_state_busy_at', '2'],
  [ENDPOINT_CONTROLS.referBlindProgress, false, 'refer_blind_progress', 'no'],
  [ENDPOINT_CONTROLS.aggregateMwi, true, 'aggregate_mwi', 'yes'],
  [ENDPOINT_CONTROLS.mwiReplacesUnsolicited, true, 'mwi_subscribe_replaces_unsolicited', 'yes'],
  [ENDPOINT_CONTROLS.outboundProxy, 'sip:proxy.example.net:5060;lr', 'outbound_proxy', 'sip:proxy.example.net:5060;lr'],
  [ENDPOINT_CONTROLS.outboundAuth, 'auth1001', 'outbound_auth', 'auth1001'],
];

test('every new control writes its own pjsip.conf key and nothing else', () => {
  for (const [control, value, key, written] of FIELDS) {
    const endpoint = applied({ [control]: value });
    assert.equal(endpoint[key], written, `${control} did not write ${key}`);
  }
});

test('each control is independent: writing one leaves the other thirteen unset', () => {
  /* The failure this catches is a shared writer that stamps every managed key on
   * every save, which would silently give an endpoint a dozen settings nobody chose. */
  for (const [control, value, key] of FIELDS) {
    const endpoint = applied({ [control]: value });
    for (const [, , otherKey] of FIELDS) {
      if (otherKey === key) continue;
      assert.equal(endpoint[otherKey], undefined,
        `writing ${key} also wrote ${otherKey}`);
    }
  }
});

test('a control nobody touched writes nothing at all', () => {
  const endpoint = applied({ [ENDPOINT_CONTROLS.context]: 'from-external' });
  for (const [, , key] of FIELDS) {
    assert.equal(endpoint[key], undefined, `${key} was written by a save that never mentioned it`);
  }
});

test('each change names itself in the summary, with the before and the after', () => {
  for (const [control, value, key] of FIELDS) {
    const edit = ok(applyControlValues(withOne(), '1001', { [control]: value }));
    assert.ok(edit.summary.some((line) => line.includes(key)),
      `changing ${key} produced no summary line naming it`);
    assert.ok(edit.summary.some((line) => line.includes('unset')),
      `the summary for ${key} did not say the value had not been set before`);
  }
});

test('every value round-trips back into the control it came from', () => {
  /* Writing a value the screen cannot read back is a one-way door: the field is set
   * on the target and the control still shows the design default beside it. */
  const target = withOne();
  const all = Object.fromEntries(FIELDS.map(([control, value]) => [control, value]));
  const edit = ok(applyControlValues(target, '1001', all));
  const seeded = controlValuesFor(edit.view.endpoints[0]);
  for (const [control, value] of FIELDS) {
    assert.deepEqual(seeded[control], value, `${control} did not survive the round trip`);
  }
});

test('a numeric field seeds as a number, not the string the file holds', () => {
  /* A stepper handed "3" renders empty or resets to its default, which reads as the
   * value having been lost rather than mistyped. */
  const edit = ok(applyControlValues(withOne(), '1001', {
    [ENDPOINT_CONTROLS.rtpTimeout]: 30, [ENDPOINT_CONTROLS.maxAudioStreams]: 3,
  }));
  const seeded = controlValuesFor(edit.view.endpoints[0]);
  assert.equal(typeof seeded[ENDPOINT_CONTROLS.rtpTimeout], 'number');
  assert.equal(typeof seeded[ENDPOINT_CONTROLS.maxAudioStreams], 'number');
});

test('zero is written rather than treated as nothing entered', () => {
  /* `rtp_timeout=0` and `device_state_busy_at=0` are meaningful: they disable the
   * check. A falsy-value guard would drop them and leave the previous value standing. */
  const endpoint = applied({
    [ENDPOINT_CONTROLS.rtpTimeout]: 0, [ENDPOINT_CONTROLS.deviceStateBusyAt]: 0,
    [ENDPOINT_CONTROLS.maxVideoStreams]: 0,
  });
  assert.equal(endpoint.rtp_timeout, '0');
  assert.equal(endpoint.device_state_busy_at, '0');
  assert.equal(endpoint.max_video_streams, '0');
});

test('session timers keeps all four Asterisk values instead of collapsing to a switch', () => {
  /* `timers` accepts no/yes/required/always. Flattening it to a boolean would make
   * two of the four unreachable and silently rewrite them on the next save. */
  for (const value of ['no', 'yes', 'required', 'always']) {
    assert.equal(applied({ [ENDPOINT_CONTROLS.timers]: value }).timers, value);
  }
});

test('an empty outbound field writes nothing rather than clearing the target value', () => {
  /* Both are optional text, so an untouched control still reports the empty default;
   * writing it would erase a proxy the person never intended to touch. */
  const endpoint = applied({
    [ENDPOINT_CONTROLS.outboundProxy]: '', [ENDPOINT_CONTROLS.outboundAuth]: '',
  });
  assert.equal(endpoint.outbound_proxy, undefined);
  assert.equal(endpoint.outbound_auth, undefined);
});

test('saving an unchanged value produces no summary line', () => {
  const target = withOne();
  const first = ok(applyControlValues(target, '1001', { [ENDPOINT_CONTROLS.rtpTimeout]: 30 }));
  const doc = editDocument(first, '/etc/asterisk/pjsip.conf').value;
  const again = ok(applyControlValues(doc, '1001', { [ENDPOINT_CONTROLS.rtpTimeout]: 30 }));
  assert.deepEqual(again.summary, [], 'a no-op save reported a change');
});

test('the whole set survives being rendered to a file and parsed back', () => {
  /* The controls could be right and the serializer still drop a key it does not know
   * about, which would lose the setting between saving and reopening the screen. */
  const all = Object.fromEntries(FIELDS.map(([control, value]) => [control, value]));
  const edit = ok(applyControlValues(withOne(), '1001', all));
  const rendered = editDocument(edit, '/etc/asterisk/pjsip.conf').value;
  const reparsed = findEndpoint(rendered, '1001');
  assert.ok(reparsed, 'the endpoint did not survive the round trip to a file');
  for (const [, , key, written] of FIELDS) {
    assert.equal((reparsed.endpoint as unknown as Record<string, unknown>)[key], written,
      `${key} was lost between rendering and reparsing`);
  }
});
