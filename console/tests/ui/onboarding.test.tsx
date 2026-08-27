import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildOnboardPlan, ONBOARD_HOURS_NOTE, type OnboardPlanInputs } from '../../app/renderer/src/onboarding.ts';
import { entryValue } from '../../app/renderer/src/configuration.ts';

const EMPTY: OnboardPlanInputs = { pjsip: [], extensions: [], http: [] };

test('super easy on an empty target creates the promised extensions and menu, and never invents TLS or hardening policy', () => {
  const plan = buildOnboardPlan({ intent: 'Deploy a new server', phones: 8, menu: true, tls: true, hardened: true }, EMPTY);

  const pjsip = plan.documents.find((d) => d.resource.endsWith('pjsip.conf'))!;
  const endpointSections = pjsip.value.filter((s) => /^\d+$/u.test(s.name));
  assert.equal(endpointSections.length, 8, 'eight endpoint sections, matching the eight extensions promised');
  assert.deepEqual(
    endpointSections.map((s) => s.name).sort((a, b) => Number(a) - Number(b)),
    ['100', '101', '102', '103', '104', '105', '106', '107'],
    'numbering is derived (starts at 100), never guessed at a different base',
  );
  assert.equal(
    new Set(pjsip.value.map((section) => section.name)).size,
    pjsip.value.length,
    'every generated PJSIP record has one distinct name, so the planner cannot create duplicate sections',
  );
  for (const endpoint of endpointSections) {
    const id = endpoint.name;
    assert.equal(entryValue(pjsip.value, id, 'aors'), `aor${id}`);
    assert.ok(
      pjsip.value.some((section) => section.name === `aor${id}` && entryValue([section], `aor${id}`, 'type') === 'aor'),
      `endpoint ${id} references exactly one separately named AoR`,
    );
  }

  // Every extension has a real, distinct, randomly generated secret - never a fixed placeholder.
  const secrets = new Set(plan.newExtensions.map((e) => e.secret));
  assert.equal(secrets.size, 8, 'every extension gets its own random secret');
  for (const secret of secrets) assert.match(secret, /^[0-9a-f]{36}$/u);

  const extensions = plan.documents.find((d) => d.resource.endsWith('extensions.conf'))!;
  assert.ok(extensions.value.some((s) => s.name === 'onboard-menu'), 'the one menu is really written to extensions.conf');
  const menu = extensions.value.find((s) => s.name === 'onboard-menu')!;
  assert.equal(menu.entries.filter((e) => e.key === 'exten' && /^\d+,1,Dial/u.test(e.value)).length, 8);

  // TLS was asked for, but no certificate exists on this empty target - the plan must
  // refuse to invent one rather than turning tlsenable=yes with nothing behind it.
  const http = plan.documents.find((d) => d.resource.endsWith('http.conf'))!;
  assert.equal(entryValue(http.value, 'general', 'tlsenable'), undefined);
  assert.ok(plan.skipped.some((s) => s.startsWith('TLS: skipped')));

  // Hardening needs target-specific policy. It must never manufacture an unknown
  // global setting, an ACL, a transport, or a dialplan record from one boolean.
  assert.equal(entryValue(pjsip.value, 'global', 'allowguest'), undefined);
  assert.ok(!pjsip.value.some((section) => /^(?:acl|transport|hardening)/u.test(section.name)));
  assert.ok(plan.skipped.some((s) => s.startsWith('Hardening: skipped') && s.includes('target-specific')));
  assert.ok(!plan.summary.some((s) => /hardening|harden/u.test(s)));

  // The wizard's copy must never claim business hours was written - this module has no
  // function that writes one, and the honest replacement string exists and says so.
  assert.match(ONBOARD_HOURS_NOTE, /does not ask for/u);
});

test('numbering continues from what already exists on the target, never overwrites it', () => {
  const inputs: OnboardPlanInputs = {
    pjsip: [
      { name: '100', entries: [{ key: 'type', value: 'endpoint' }] },
      { name: '105', entries: [{ key: 'type', value: 'endpoint' }] },
      { name: 'global', entries: [{ key: 'endpoint_identifier_order', value: 'username,ip' }] },
    ],
    extensions: [],
    http: [],
  };
  const plan = buildOnboardPlan({ intent: 'Deploy a new server', phones: 2, menu: false, tls: false, hardened: false }, inputs);
  const pjsip = plan.documents.find((d) => d.resource.endsWith('pjsip.conf'))!;
  const ids = pjsip.value.filter((s) => /^\d+$/u.test(s.name)).map((s) => s.name).sort();
  assert.deepEqual(ids, ['100', '105', '106', '107'], 'new ids start after the highest existing one, and the existing ones survive');
  assert.equal(new Set(pjsip.value.map((section) => section.name)).size, pjsip.value.length);
  // The complete document preserves existing global settings without introducing a
  // made-up hardening option.
  assert.equal(entryValue(pjsip.value, 'global', 'endpoint_identifier_order'), 'username,ip');
  assert.equal(entryValue(pjsip.value, 'global', 'allowguest'), undefined);
});

test('hardened mode preserves target state and reports target-specific policy as unavailable', () => {
  const inputs: OnboardPlanInputs = {
    pjsip: [{ name: 'global', entries: [{ key: 'endpoint_identifier_order', value: 'username,ip' }] }],
    extensions: [{ name: 'existing-route', entries: [{ key: 'exten', value: '100,1,Hangup()' }] }],
    http: [{ name: 'general', entries: [{ key: 'bindaddr', value: '127.0.0.1' }] }],
  };
  const plan = buildOnboardPlan({ intent: 'Deploy a new server', phones: 0, menu: false, tls: false, hardened: true }, inputs);
  const pjsip = plan.documents.find((d) => d.resource.endsWith('pjsip.conf'))!;
  const extensions = plan.documents.find((d) => d.resource.endsWith('extensions.conf'))!;
  const http = plan.documents.find((d) => d.resource.endsWith('http.conf'))!;
  assert.deepEqual(pjsip.value, inputs.pjsip);
  assert.deepEqual(extensions.value, inputs.extensions);
  assert.deepEqual(http.value, inputs.http);
  assert.equal(entryValue(pjsip.value, 'global', 'allowguest'), undefined);
  assert.equal(entryValue(http.value, 'general', 'tlsenable'), undefined);
  assert.ok(plan.skipped.some((item) => item.startsWith('Hardening: skipped') && item.includes('ACL, transport, and dialplan')));
});

test('TLS is enabled, without inventing a certificate path, when one is already on the target', () => {
  const inputs: OnboardPlanInputs = {
    pjsip: [],
    extensions: [],
    http: [{ name: 'general', entries: [{ key: 'tlscertfile', value: '/etc/asterisk/keys/asterisk.pem' }] }],
  };
  const plan = buildOnboardPlan({ intent: 'Deploy a new server', phones: 0, menu: false, tls: true, hardened: false }, inputs);
  const http = plan.documents.find((d) => d.resource.endsWith('http.conf'))!;
  assert.equal(entryValue(http.value, 'general', 'tlsenable'), 'yes');
  assert.equal(entryValue(http.value, 'general', 'tlscertfile'), '/etc/asterisk/keys/asterisk.pem');
  assert.equal(plan.skipped.length, 0);
});

test('a menu with no extensions is refused rather than shipping an empty auto-attendant', () => {
  const plan = buildOnboardPlan({ intent: 'Deploy a new server', phones: 0, menu: true, tls: false, hardened: false }, EMPTY);
  const extensions = plan.documents.find((d) => d.resource.endsWith('extensions.conf'))!;
  assert.ok(!extensions.value.some((s) => s.name === 'onboard-menu'));
  assert.ok(plan.skipped.some((s) => s.startsWith('One menu: skipped')));
});
