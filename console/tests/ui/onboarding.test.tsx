import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildOnboardPlan, ONBOARD_HOURS_NOTE, type OnboardPlanInputs } from '../../app/renderer/src/onboarding.ts';
import { entryValue } from '../../app/renderer/src/configuration.ts';

const EMPTY: OnboardPlanInputs = { pjsip: [], extensions: [], http: [] };

test('super easy on an empty target creates the promised extensions and menu, and never invents TLS', () => {
  const plan = buildOnboardPlan({ intent: 'Deploy a new server', phones: 8, menu: true, tls: true, hardened: true }, EMPTY);

  const pjsip = plan.documents.find((d) => d.resource.endsWith('pjsip.conf'))!;
  const endpointSections = pjsip.value.filter((s) => /^\d+$/u.test(s.name));
  assert.equal(endpointSections.length, 8, 'eight endpoint sections, matching the eight extensions promised');
  assert.deepEqual(
    endpointSections.map((s) => s.name).sort((a, b) => Number(a) - Number(b)),
    ['100', '101', '102', '103', '104', '105', '106', '107'],
    'numbering is derived (starts at 100), never guessed at a different base',
  );

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

  // Hardened is a fixed, site-neutral boolean and IS written.
  const global = pjsip.value.find((s) => s.name === 'global')!;
  assert.equal(entryValue(pjsip.value, 'global', 'allowguest'), 'no');
  assert.ok(global);
  assert.ok(plan.summary.some((s) => s.includes('harden')));

  // The wizard's copy must never claim business hours was written - this module has no
  // function that writes one, and the honest replacement string exists and says so.
  assert.match(ONBOARD_HOURS_NOTE, /does not ask for/u);
});

test('numbering continues from what already exists on the target, never overwrites it', () => {
  const inputs: OnboardPlanInputs = {
    pjsip: [
      { name: '100', entries: [{ key: 'type', value: 'endpoint' }] },
      { name: '105', entries: [{ key: 'type', value: 'endpoint' }] },
      { name: 'global', entries: [{ key: 'allowguest', value: 'yes' }] },
    ],
    extensions: [],
    http: [],
  };
  const plan = buildOnboardPlan({ intent: 'Deploy a new server', phones: 2, menu: false, tls: false, hardened: false }, inputs);
  const pjsip = plan.documents.find((d) => d.resource.endsWith('pjsip.conf'))!;
  const ids = pjsip.value.filter((s) => /^\d+$/u.test(s.name)).map((s) => s.name).sort();
  assert.deepEqual(ids, ['100', '105', '106', '107'], 'new ids start after the highest existing one, and the existing ones survive');
  // hardened was not requested, so the pre-existing (permissive) global setting is left alone.
  assert.equal(entryValue(pjsip.value, 'global', 'allowguest'), 'yes');
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
