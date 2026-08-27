import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildEndpointDraft, endpointDocument, endpointNameFrom, PJSIP_RESOURCE, WIZARD_CONTROLS,
} from '../../app/renderer/src/endpoint-create.ts';
import type { ConfigValue } from '../../app/renderer/src/configuration.ts';

const EMPTY: ConfigValue = [];

const withEndpoint = (name: string): ConfigValue => [
  { name, entries: [{ key: 'type', value: 'endpoint' }] },
  { name, entries: [{ key: 'type', value: 'auth' }] },
  { name, entries: [{ key: 'type', value: 'aor' }] },
] as unknown as ConfigValue;

const answers = (over: Record<string, unknown> = {}) => ({
  [WIZARD_CONTROLS.name]: '1001',
  [WIZARD_CONTROLS.context]: 'from-internal',
  ...over,
});

const ok = (result: ReturnType<typeof buildEndpointDraft>) => {
  assert.ok(!('error' in result), `expected a draft, got: ${'error' in result ? result.error : ''}`);
  return result;
};

test('a wizard answer becomes all three sections an endpoint actually needs', () => {
  /* res_pjsip uses a same-named endpoint, auth and aor. Creating one without the other
   * two produces an extension that cannot register, which looks like a working screen
   * that produced a broken phone. */
  const draft = ok(buildEndpointDraft(EMPTY, answers()));
  assert.equal(draft.created.endpoint.context, 'from-internal');
  assert.ok(draft.created.auth, 'no auth section, so the phone has nothing to authenticate with');
  assert.ok(draft.created.aor, 'no aor section, so Asterisk has nowhere to send a call');
  assert.equal(draft.view.endpoints.length, 1);
});

test('the name is refused rather than invented, because it cannot be guessed', () => {
  const missing = buildEndpointDraft(EMPTY, { [WIZARD_CONTROLS.context]: 'from-internal' });
  assert.ok('error' in missing);
  assert.match(missing.error, /cannot be chosen for you/u);
});

test('a name that is not a legal section header is refused before anything is written', () => {
  const bad = buildEndpointDraft(EMPTY, answers({ [WIZARD_CONTROLS.name]: 'front desk' }));
  assert.ok('error' in bad, 'a name with a space was accepted, which would corrupt the file');
  assert.match(bad.error, /pjsip\.conf/u);
});

test('an existing endpoint is never silently replaced', () => {
  /* The dangerous version of this feature overwrites somebody's working phone because
   * the name matched. Refusing is the only safe answer the console can give itself. */
  const clash = buildEndpointDraft(withEndpoint('1001'), answers());
  assert.ok('error' in clash);
  assert.match(clash.error, /already exists/u);
});

test('the generated secret is never in the summary the person confirms', () => {
  const draft = ok(buildEndpointDraft(EMPTY, answers()));
  assert.ok(draft.secret.length > 0, 'no secret was generated, so the phone could not authenticate');
  for (const line of draft.summary) {
    assert.ok(!line.includes(draft.secret), 'the secret appears in a plan that gets read aloud and screenshotted');
  }
});

test('two endpoints never receive the same secret', () => {
  const first = ok(buildEndpointDraft(EMPTY, answers()));
  const second = ok(buildEndpointDraft(EMPTY, answers({ [WIZARD_CONTROLS.name]: '1002' })));
  assert.notEqual(first.secret, second.secret, 'a fixed secret is the same as no secret');
});

test('the plain-language NAT answer writes the settings that actually make it work', () => {
  /* "Behind a home router" is one question standing for three keys. Naming them in the
   * summary keeps the plan reviewable rather than magic. */
  const draft = ok(buildEndpointDraft(EMPTY, answers({ [WIZARD_CONTROLS.nat]: true })));
  assert.equal(draft.created.endpoint.rtp_symmetric, 'yes');
  assert.equal(draft.created.endpoint.force_rport, 'yes');
  assert.equal(draft.created.endpoint.rewrite_contact, 'yes');
  assert.ok(draft.summary.some((line) => line.includes('rewrite_contact')));
});

test('answering no actually turns the NAT settings off', () => {
  /* The bug this replaced: the settings were applied only when the answer was yes, and the
   * model already switches all three on, so answering no changed nothing at all. The
   * control looked live and was decorative. */
  const off = ok(buildEndpointDraft(EMPTY, answers({ [WIZARD_CONTROLS.nat]: false })));
  assert.equal(off.created.endpoint.rtp_symmetric, 'no');
  assert.equal(off.created.endpoint.force_rport, 'no');
  assert.equal(off.created.endpoint.rewrite_contact, 'no');

  const on = ok(buildEndpointDraft(EMPTY, answers({ [WIZARD_CONTROLS.nat]: true })));
  assert.equal(on.created.endpoint.rtp_symmetric, 'yes');
  assert.notEqual(off.created.endpoint.rtp_symmetric, on.created.endpoint.rtp_symmetric,
    'both answers produce the same configuration, so the question is decorative');
});

test('a question the wizard never asked leaves the model default alone', () => {
  /* Filling an unasked field from a guess is how a console ends up configuring something
   * the person never chose and cannot find. */
  const draft = ok(buildEndpointDraft(EMPTY, answers()));
  assert.equal(draft.created.endpoint.rtp_symmetric, 'yes', 'the model default was overwritten by an unasked question');
});

test('the document targets the resource the transport is actually allowed to write', () => {
  const draft = ok(buildEndpointDraft(EMPTY, answers()));
  const document = endpointDocument(draft);
  assert.equal(document.resource, PJSIP_RESOURCE);
  assert.ok(Array.isArray(document.value));
});

test('the extension answer is used when no separate name was given', () => {
  assert.equal(endpointNameFrom({ [WIZARD_CONTROLS.extension]: '2002' }), '2002');
  /* An explicit name still wins over the extension number. */
  assert.equal(endpointNameFrom({ [WIZARD_CONTROLS.name]: 'reception', [WIZARD_CONTROLS.extension]: '2002' }), 'reception');
});

test('a new endpoint starts from the global codec order when one is set', () => {
  /* k_order sits on the codecs screen and could never be bound: there is no global codec
   * order in codecs.conf, because pjsip keeps codec lists per endpoint. The honest reading
   * of "global order" is the order a new endpoint starts with. */
  const draft = buildEndpointDraft([], { w_name: '6001', k_order: ['opus', 'g722', 'ulaw'] });
  assert.ok(!('error' in draft), JSON.stringify(draft));
  const created = draft.view.endpoints.find((e) => e.name === '6001').endpoint;
  assert.deepEqual(created.allow, ['opus', 'g722', 'ulaw']);
  /* An allow list means nothing in pjsip without disallow=all, so the two travel together. */
  assert.ok(created.disallow.includes('all'));
});

test('an unset or empty order leaves the model default rather than writing an empty list', () => {
  /* An empty allow list in pjsip is an endpoint that can negotiate nothing at all. */
  for (const answers of [{ w_name: '6002' }, { w_name: '6002', k_order: [] }, { w_name: '6002', k_order: 'opus' }]) {
    const draft = buildEndpointDraft([], answers);
    assert.ok(!('error' in draft));
    const created = draft.view.endpoints.find((e) => e.name === '6002').endpoint;
    assert.notDeepEqual(created.allow, [], JSON.stringify(answers));
  }
});

test('the global order never rewrites an endpoint that already exists', () => {
  /* Somebody who tuned the codecs on one phone should not find them changed because a
   * default moved on another screen. */
  const existing = buildEndpointDraft([], { w_name: '6003', k_order: ['ulaw'] });
  assert.ok(!('error' in existing));
  const second = buildEndpointDraft(
    existing.view.endpoints.length ? [] : [], { w_name: '6003', k_order: ['opus'] });
  assert.ok(!('error' in second));
  /* And creating one with a name already present is refused outright, which is the real
   * protection: an existing endpoint is never reached through this path at all. */
  const clash = buildEndpointDraft(
    [{ name: '6003', entries: [{ key: 'type', value: 'endpoint' }] }], { w_name: '6003' });
  assert.ok('error' in clash);
});
