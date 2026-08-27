/**
 * Settings that come from somewhere else.
 *
 * A settings value arriving over the network is an input from a system nobody here
 * controls, so most of these tests are about what is refused. The failures they guard
 * are the quiet ones: a stale reply flipping a setting back, a redirect to somewhere
 * nobody checked, a source going offline and resetting a console to defaults.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MAX_RESPONSE_BYTES, MIN_REFRESH_MS, applyResponse, isRejected, onSourceUnavailable,
  validateRefresh, validateSourceUrl,
  type ExternalSource, type FetchAttempt,
} from '../../app/renderer/src/external-settings-sources.ts';

const source = (over: Partial<ExternalSource> = {}): ExternalSource => ({
  id: 's1', kind: 'https-api', url: 'https://settings.example.net/console',
  credentialKey: 'ding-pbx-console/source/s1',
  allowedKeys: ['lang_mode', 'fun_level'],
  ...over,
});

const attempt = (over: Partial<FetchAttempt> = {}): FetchAttempt => ({
  generation: 5, status: 200, body: '{}', redirected: false, byteLength: 2, ...over,
});

/* --- the URL, checked before it is used --------------------------------------------- */

test('an HTTPS URL is accepted', () => {
  assert.deepEqual(validateSourceUrl('https://settings.example.net/console'), []);
});

test('plain HTTP is refused except on loopback', () => {
  /* An http:// URL anywhere else sends whatever token accompanies it in the clear. */
  assert.equal(validateSourceUrl('http://settings.example.net/console').length, 1);
  assert.deepEqual(validateSourceUrl('http://localhost:8123/api'), []);
  assert.deepEqual(validateSourceUrl('http://127.0.0.1:8123/api'), []);
});

test('credentials in the URL are refused', () => {
  /* A URL reaches logs, error messages and the settings surface itself. */
  const problems = validateSourceUrl('https://user:secret@settings.example.net/');
  assert.ok(problems.some((problem) => /Credentials cannot go in the URL/u.test(problem.message)));
});

test('an empty or unparseable URL is refused', () => {
  assert.equal(validateSourceUrl('   ').length, 1);
  assert.equal(validateSourceUrl('not a url').length, 1);
});

test('the refusal explains why rather than only that', () => {
  const problems = validateSourceUrl('http://settings.example.net/');
  assert.match(problems[0].message, /in the clear/u);
});

/* --- a stale answer never wins -------------------------------------------------------- */

test('an answer from an older poll is dropped', () => {
  /* A slow reply from the previous poll landing after a fast one flips the setting back
   * with nothing to explain it. */
  const outcome = applyResponse(source(), attempt({ generation: 4 }), 5);
  assert.ok(isRejected(outcome));
  assert.match(outcome.rejected, /stale answer/u);
});

test('an answer from the current poll is applied', () => {
  const outcome = applyResponse(source(), attempt({ generation: 5, body: '{"lang_mode":"English"}' }), 5);
  assert.ok(!isRejected(outcome));
  assert.deepEqual(outcome.applied, { lang_mode: 'English' });
});

/* --- what is refused outright ---------------------------------------------------------- */

test('a redirect is refused rather than followed', () => {
  /* A redirect is the far end choosing a destination this console never validated. */
  const outcome = applyResponse(source(), attempt({ redirected: true }), 5);
  assert.ok(isRejected(outcome));
  assert.match(outcome.rejected, /redirect/u);
});

test('an oversized response is not read', () => {
  const outcome = applyResponse(source(), attempt({ byteLength: MAX_RESPONSE_BYTES + 1 }), 5);
  assert.ok(isRejected(outcome));
});

test('a non-2xx answer keeps the previous values and says so', () => {
  for (const status of [301, 400, 401, 500]) {
    const outcome = applyResponse(source(), attempt({ status }), 5);
    assert.ok(isRejected(outcome), `${status} was treated as success`);
    assert.match(outcome.rejected, /still in effect/u);
  }
});

test('a body that is not JSON is refused without throwing', () => {
  const outcome = applyResponse(source(), attempt({ body: '<html>nope</html>' }), 5);
  assert.ok(isRejected(outcome));
  assert.match(outcome.rejected, /did not answer with JSON/u);
});

test('an array or a bare value is not a settings object', () => {
  for (const body of ['[]', '"text"', '42', 'null']) {
    assert.ok(isRejected(applyResponse(source(), attempt({ body }), 5)), `${body} was accepted`);
  }
});

/* --- only what is allowed gets through --------------------------------------------------- */

test('a key the source is not allowed to set is ignored however it arrives', () => {
  /* A response may say anything; what it may change is decided here, not there. */
  const outcome = applyResponse(source(), attempt({
    body: '{"lang_mode":"English","school_mode":"on","anything":"else"}',
  }), 5);
  assert.ok(!isRejected(outcome));
  assert.deepEqual(outcome.applied, { lang_mode: 'English' });
});

test('a non-string value is ignored rather than coerced', () => {
  /* Coercing here would be this console deciding what a remote system meant. */
  const outcome = applyResponse(source(), attempt({
    body: '{"lang_mode":5,"fun_level":{"deep":true}}',
  }), 5);
  assert.ok(!isRejected(outcome));
  assert.deepEqual(outcome.applied, {});
});

/* --- Home Assistant ----------------------------------------------------------------------- */

const haSource = (over: Partial<ExternalSource> = {}) => source({
  kind: 'home-assistant', entityId: 'input_boolean.quiet_hours', allowedKeys: ['school_mode'], ...over,
});

test('an on state applies the source keys', () => {
  const outcome = applyResponse(haSource(), attempt({
    body: '{"entity_id":"input_boolean.quiet_hours","state":"on"}',
  }), 5);
  assert.ok(!isRejected(outcome));
  assert.deepEqual(outcome.applied, { school_mode: 'on' });
});

test('an off state applies nothing and is not a failure', () => {
  /* Off means this source's rule does not apply, and the person's own values stay in
   * effect -- reporting it as an error would put a red notice on an ordinary state. */
  const outcome = applyResponse(haSource(), attempt({
    body: '{"entity_id":"input_boolean.quiet_hours","state":"off"}',
  }), 5);
  assert.ok(!isRejected(outcome));
  assert.deepEqual(outcome.applied, {});
});

test('an answer about a different entity is refused', () => {
  const outcome = applyResponse(haSource(), attempt({
    body: '{"entity_id":"input_boolean.something_else","state":"on"}',
  }), 5);
  assert.ok(isRejected(outcome));
  assert.match(outcome.rejected, /rather than input_boolean\.quiet_hours/u);
});

test('a state that is neither on nor off is refused', () => {
  for (const state of ['unavailable', 'unknown', 'true', ''] ) {
    const outcome = applyResponse(haSource(), attempt({
      body: `{"entity_id":"input_boolean.quiet_hours","state":"${state}"}`,
    }), 5);
    assert.ok(isRejected(outcome), `"${state}" was treated as a boolean`);
  }
});

/* --- no token, and no runaway polling ------------------------------------------------------ */

test('a source names a vault key and never carries a token', () => {
  const fields = Object.keys(source());
  for (const suspect of ['token', 'secret', 'password', 'bearer']) {
    assert.ok(!fields.includes(suspect), `a source exposes "${suspect}"`);
  }
});

test('polling faster than the floor is refused', () => {
  /* A source polled every second is a denial of service this console would be committing
   * against somebody else's server. */
  assert.equal(validateRefresh(1000).length, 1);
  assert.deepEqual(validateRefresh(MIN_REFRESH_MS), []);
  assert.equal(validateRefresh(Number.NaN).length, 1);
});

/* --- going offline ------------------------------------------------------------------------- */

test('an unreachable source keeps the last good values rather than resetting anything', () => {
  /* A source going offline must not silently reset a console to defaults. */
  const result = onSourceUnavailable({ lang_mode: 'English' }, 'The source did not answer.');
  assert.deepEqual(result.values, { lang_mode: 'English' });
  assert.match(result.notice, /being kept/u);
});

test('the offline notice says the person’s own settings are untouched underneath', () => {
  /* Because the one thing a remote source must never do is become the base. */
  const result = onSourceUnavailable({}, 'The source did not answer.');
  assert.match(result.notice, /your own settings are unchanged/u);
});

test('the returned values are a copy, so a caller cannot edit the last known good set', () => {
  const lastGood = { lang_mode: 'English' };
  const result = onSourceUnavailable(lastGood, 'x');
  result.values.lang_mode = 'tampered';
  assert.equal(lastGood.lang_mode, 'English');
});
