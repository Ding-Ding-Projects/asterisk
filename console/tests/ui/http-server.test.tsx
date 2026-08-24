/**
 * The built-in HTTP server (CORE-ADV-024 through -040).
 *
 * Two things carry the weight. The three keys whose Asterisk spelling differs from the
 * FreePBX setting name that maps to them -- getting one wrong emits a line the build
 * silently ignores, which reads exactly like a working setting doing nothing. And the
 * TLS listener, where Core's two fields are one Asterisk key, so a mistake in either
 * direction rewrites the other half.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyControlValues, controlValuesFor, formatTlsBindAddr, httpDocument, parseTlsBindAddr,
  HTTP_CONTROLS,
} from '../../app/renderer/src/http-server.ts';
import { parseHttp } from '../../control-plane/subsystem-models.ts';
import type { ConfigValue } from '../../app/renderer/src/configuration.ts';

const empty = () => [] as unknown as ConfigValue;

const withGeneral = (entries: Record<string, string>): ConfigValue => [
  { name: 'general', entries: Object.entries(entries).map(([key, value]) => ({ key, value })) },
] as unknown as ConfigValue;

const roundTrip = (value: ConfigValue, values: Record<string, unknown>) =>
  parseHttp(httpDocument(applyControlValues(value, values), '/etc/asterisk/http.conf').value).general;

/* --- the spellings that diverge from the Core setting names ------------------ */

test('the underscored and non-underscored keys are each written as Asterisk spells them', () => {
  /* HTTPENABLESTATIC is enable_static, HTTPENABLESTATUS is enable_status, and
   * HTTPSESSIONLIMIT is sessionlimit with NO underscore. Guessing consistently in
   * either direction gets one of the three wrong. */
  const general = roundTrip(empty(), {
    [HTTP_CONTROLS.enableStatic]: true,
    [HTTP_CONTROLS.enableStatus]: true,
    [HTTP_CONTROLS.sessionLimit]: 250,
  });
  assert.equal(general.enable_static, 'yes');
  assert.equal(general.enable_status, 'yes');
  assert.equal(general.sessionlimit, '250');
});

test('no key Asterisk would ignore is emitted', () => {
  const written = httpDocument(applyControlValues(empty(), {
    [HTTP_CONTROLS.enableStatic]: true, [HTTP_CONTROLS.sessionLimit]: 250,
  }), 'x').value as unknown as { name: string; entries: { key: string }[] }[];
  const keys = written.flatMap((s) => s.entries.map((e) => e.key));
  for (const wrong of ['enablestatic', 'enablestatus', 'session_limit']) {
    assert.ok(!keys.includes(wrong), `wrote "${wrong}", which Asterisk does not read`);
  }
});

/* --- the TLS listener: two controls, one key --------------------------------- */

test('a listener splits into an address and a port', () => {
  assert.deepEqual(parseTlsBindAddr('0.0.0.0:8089'), { address: '0.0.0.0', port: '8089' });
});

test('an IPv6 literal keeps its own colons', () => {
  /* Splitting on the first colon would leave the address as "" and the port as ":1:8089",
   * and neither half would be usable. */
  assert.deepEqual(parseTlsBindAddr('[::1]:8089'), { address: '[::1]', port: '8089' });
});

test('a bare address with no port is an address, not a port', () => {
  assert.deepEqual(parseTlsBindAddr('0.0.0.0'), { address: '0.0.0.0', port: undefined });
});

test('a value whose tail after the last colon is not numeric has no port', () => {
  assert.deepEqual(parseTlsBindAddr('::1'), { address: '::1', port: undefined });
});

test('an absent listener yields neither half rather than empty strings', () => {
  const neither = { address: undefined, port: undefined };
  for (const input of [undefined, '', '   ']) assert.deepEqual(parseTlsBindAddr(input), neither);
});

test('both halves survive a round trip', () => {
  for (const value of ['0.0.0.0:8089', '[::1]:8089', '0.0.0.0']) {
    assert.equal(formatTlsBindAddr(parseTlsBindAddr(value)), value);
  }
});

test('two empty halves write nothing rather than an empty key', () => {
  assert.equal(formatTlsBindAddr({}), undefined);
});

test('editing the address alone keeps the port the file already had', () => {
  /* The failure this catches is the one that matters: changing one control silently
   * dropping the other half of the same key. */
  const general = roundTrip(withGeneral({ tlsbindaddr: '0.0.0.0:8089' }),
    { [HTTP_CONTROLS.tlsBindAddress]: '10.0.0.5' });
  assert.equal(general.tlsbindaddr, '10.0.0.5:8089');
});

test('editing the port alone keeps the address', () => {
  const general = roundTrip(withGeneral({ tlsbindaddr: '0.0.0.0:8089' }),
    { [HTTP_CONTROLS.tlsBindPort]: 9443 });
  assert.equal(general.tlsbindaddr, '0.0.0.0:9443');
});

test('the listener seeds back into the two separate controls', () => {
  const values = controlValuesFor(withGeneral({ tlsbindaddr: '10.0.0.5:9443' }));
  assert.equal(values[HTTP_CONTROLS.tlsBindAddress], '10.0.0.5');
  assert.equal(values[HTTP_CONTROLS.tlsBindPort], 9443);
});

/* --- ordinary fields --------------------------------------------------------- */

test('every remaining control writes its own key', () => {
  const general = roundTrip(empty(), {
    [HTTP_CONTROLS.enabled]: true, [HTTP_CONTROLS.bindAddress]: '127.0.0.1',
    [HTTP_CONTROLS.bindPort]: 8088, [HTTP_CONTROLS.prefix]: 'asterisk',
    [HTTP_CONTROLS.tlsEnable]: true, [HTTP_CONTROLS.tlsCertFile]: '/etc/asterisk/keys/a.pem',
    [HTTP_CONTROLS.tlsPrivateKey]: '/etc/asterisk/keys/a.key',
    [HTTP_CONTROLS.tlsDisableV1]: true, [HTTP_CONTROLS.tlsDisableV11]: true,
    [HTTP_CONTROLS.tlsDisableV12]: false,
    [HTTP_CONTROLS.sessionInactivity]: 30000, [HTTP_CONTROLS.sessionKeepAlive]: 15000,
  });
  assert.equal(general.enabled, 'yes');
  assert.equal(general.bindaddr, '127.0.0.1');
  assert.equal(general.bindport, '8088');
  assert.equal(general.prefix, 'asterisk');
  assert.equal(general.tlsenable, 'yes');
  assert.equal(general.tlscertfile, '/etc/asterisk/keys/a.pem');
  assert.equal(general.tlsprivatekey, '/etc/asterisk/keys/a.key');
  assert.equal(general.tlsdisablev1, 'yes');
  assert.equal(general.tlsdisablev11, 'yes');
  assert.equal(general.tlsdisablev12, 'no');
  assert.equal(general.session_inactivity, '30000');
  assert.equal(general.session_keep_alive, '15000');
});

test('every value seeds back into its own control with the right type', () => {
  const values = controlValuesFor(withGeneral({
    enabled: 'yes', bindport: '8088', sessionlimit: '100', session_inactivity: '30000',
  }));
  assert.equal(values[HTTP_CONTROLS.enabled], true);
  assert.equal(values[HTTP_CONTROLS.bindPort], 8088);
  assert.equal(typeof values[HTTP_CONTROLS.sessionLimit], 'number');
  assert.equal(typeof values[HTTP_CONTROLS.sessionInactivity], 'number');
});

test('a key the file never set is left out rather than defaulted onto the screen', () => {
  const values = controlValuesFor(empty());
  for (const id of Object.values(HTTP_CONTROLS)) {
    assert.ok(!(id in values), `${id} was given a value the file does not hold`);
  }
});

test('a control nobody touched writes nothing', () => {
  const edit = applyControlValues(withGeneral({ enabled: 'yes' }), {});
  assert.deepEqual(edit.summary, []);
  assert.equal(edit.view.general.enabled, 'yes');
});

test('an empty text control writes nothing rather than clearing the key', () => {
  assert.equal(roundTrip(withGeneral({ prefix: 'asterisk' }), { [HTTP_CONTROLS.prefix]: '' }).prefix, 'asterisk');
});

test('each change names the key, the before and the after', () => {
  const edit = applyControlValues(withGeneral({ bindport: '8088' }), { [HTTP_CONTROLS.bindPort]: 9000 });
  assert.equal(edit.summary.length, 1);
  assert.match(edit.summary[0], /bindport 8088 to 9000/u);
});

test('an unmanaged section survives a save', () => {
  const value = [
    { name: 'general', entries: [{ key: 'enabled', value: 'yes' }] },
    { name: 'post_mappings', entries: [{ key: 'uploads', value: '/tmp' }] },
  ] as unknown as ConfigValue;
  const written = httpDocument(applyControlValues(value, { [HTTP_CONTROLS.bindPort]: 8088 }), 'x').value;
  const kept = (written as unknown as { name: string }[]).find((s) => s.name === 'post_mappings');
  assert.ok(kept, 'an unmanaged section was dropped on save');
});

/* --- warnings shown before Submit --------------------------------------------- */

test('turning TLS on with no certificate warns before the write, not after', () => {
  /* Asterisk reports this at load time, by which point the console has already said it
   * succeeded. */
  const edit = applyControlValues(empty(), { [HTTP_CONTROLS.tlsEnable]: true });
  assert.ok(edit.warnings.some((w) => /certificate/u.test(w)));
});

test('TLS on with a certificate and a listener warns about neither', () => {
  const edit = applyControlValues(withGeneral({ tlsbindaddr: '0.0.0.0:8089', tlscertfile: '/x.pem' }),
    { [HTTP_CONTROLS.tlsEnable]: true });
  assert.deepEqual(edit.warnings, []);
});

test('re-enabling a deprecated TLS version is called out as the downgrade it is', () => {
  const edit = applyControlValues(empty(), { [HTTP_CONTROLS.tlsDisableV1]: false });
  assert.ok(edit.warnings.some((w) => /deprecated/u.test(w)));
});

test('leaving the deprecated versions disabled warns about nothing', () => {
  const edit = applyControlValues(empty(), {
    [HTTP_CONTROLS.tlsDisableV1]: true, [HTTP_CONTROLS.tlsDisableV11]: true,
  });
  assert.deepEqual(edit.warnings, []);
});
