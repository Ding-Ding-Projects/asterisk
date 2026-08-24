/**
 * The built-in HTTP server (http.conf), which is what FreePBX's HTTP* advanced settings
 * actually configure.
 *
 * Three divergences between Core's setting names and Asterisk's keys are recorded here
 * rather than smoothed over, because each one produces a line the build ignores if you
 * follow the Core name:
 *
 *  - HTTPENABLESTATIC is `enable_static`, with an underscore.
 *  - HTTPENABLESTATUS is `enable_status`, likewise.
 *  - HTTPSESSIONLIMIT is `sessionlimit`, with NO underscore -- the opposite of the two
 *    session keys beside it, which do have one. That inconsistency is Asterisk's, and
 *    guessing consistently in either direction gets one of the three wrong.
 *
 * And one shape difference: Core splits the TLS listener into HTTPTLSBINDADDRESS and
 * HTTPTLSBINDPORT, while Asterisk has a single `tlsbindaddr=0.0.0.0:8089`. Same problem
 * as the caller-ID field in extensions.ts -- two controls, one key -- so it is composed
 * and decomposed here, and a mistake in either direction rewrites the other half.
 *
 * Covers CORE-ADV-024 through -040.
 */
import {
  parseHttp, toConfigValueHttp,
  type HttpGeneralView, type HttpView,
} from '../../../control-plane/subsystem-models';
import type { ConfigValue } from './configuration';

/** The HTTP server destination's control ids, from the compiled design. */
export const HTTP_CONTROLS = {
  enabled: 'ht_enabled',
  enableStatic: 'ht_static',
  enableStatus: 'ht_status',
  bindAddress: 'ht_bindaddr',
  bindPort: 'ht_bindport',
  prefix: 'ht_prefix',
  tlsEnable: 'ht_tlsenable',
  tlsBindAddress: 'ht_tlsaddr',
  tlsBindPort: 'ht_tlsport',
  tlsCertFile: 'ht_tlscert',
  tlsPrivateKey: 'ht_tlskey',
  tlsDisableV1: 'ht_notls1',
  tlsDisableV11: 'ht_notls11',
  tlsDisableV12: 'ht_notls12',
  sessionLimit: 'ht_sesslimit',
  sessionInactivity: 'ht_sessinact',
  sessionKeepAlive: 'ht_sesskeep',
} as const;

/** Asterisk's own default, from the sample's own commented value. */
export const DEFAULT_TLS_BIND_PORT = '8089';

const toSwitch = (value: string | undefined): boolean | undefined =>
  value === undefined ? undefined : value === 'yes';
const fromSwitch = (value: unknown): string | undefined =>
  typeof value === 'boolean' ? (value ? 'yes' : 'no') : undefined;

export interface TlsListener {
  address?: string;
  port?: string;
}

/**
 * Splits `tlsbindaddr` into the two halves Core exposes separately.
 *
 * Not "the part after the last colon", which was the first attempt and is wrong: `::1`
 * splits that way into address ":" and port "1", both plausible-looking and both wrong.
 * Only a bracketed IPv6 address can carry a port, so brackets are handled first, more
 * than one bare colon means the whole value is an address, and a value with no colon at
 * all is an address rather than a port -- the other guess turns a bind address into a
 * port number with nothing on screen to say it happened.
 */
export function parseTlsBindAddr(value: string | undefined): TlsListener {
  if (value === undefined || value.trim() === '') return { address: undefined, port: undefined };
  const trimmed = value.trim();

  /* Bracketed IPv6 is the only form that can carry a port, which is exactly why the
   * brackets exist. Anything after the closing bracket is the port. */
  if (trimmed.startsWith('[')) {
    const close = trimmed.indexOf(']');
    if (close === -1) return { address: trimmed, port: undefined };
    const tail = trimmed.slice(close + 1);
    const port = tail.startsWith(':') ? tail.slice(1) : '';
    return /^[0-9]+$/u.test(port)
      ? { address: trimmed.slice(0, close + 1), port }
      : { address: trimmed, port: undefined };
  }

  /* Split at the FIRST colon, not the last. That one choice is what makes a bare IPv6
   * address safe: any second colon lands in the tail, the tail then fails the numeric
   * test below, and the whole value is correctly read as an address. Splitting at the
   * last colon instead turns `::1` into address ":" and port "1" -- both plausible, both
   * wrong, and the listener binds somewhere nobody chose.
   *
   * An explicit "more than one colon means IPv6" guard stood here and was removed after
   * a probe showed it could never change an answer: every case it caught, the numeric
   * test already caught. A line that cannot fail is a line that misleads the next
   * reader into thinking it is load-bearing. */
  const first = trimmed.indexOf(':');
  if (first === -1) return { address: trimmed, port: undefined };

  const port = trimmed.slice(first + 1);
  if (!/^[0-9]+$/u.test(port)) return { address: trimmed, port: undefined };
  return { address: trimmed.slice(0, first) || undefined, port };
}

/** Composes the two halves back into the one key Asterisk reads. */
export function formatTlsBindAddr(listener: TlsListener): string | undefined {
  const address = listener.address?.trim();
  const port = listener.port?.trim();
  if (!address && !port) return undefined;
  if (address && port) return `${address}:${port}`;
  if (port) return `:${port}`;
  return address;
}

/** Seeds the screen from the target's own http.conf. */
export function controlValuesFor(existing: ConfigValue): Record<string, unknown> {
  const { general } = parseHttp(existing);
  const values: Record<string, unknown> = {};
  const put = (id: string, value: unknown) => { if (value !== undefined) values[id] = value; };
  const num = (raw: string | undefined) => (raw === undefined ? undefined : Number(raw));

  put(HTTP_CONTROLS.enabled, toSwitch(general.enabled));
  put(HTTP_CONTROLS.enableStatic, toSwitch(general.enable_static));
  put(HTTP_CONTROLS.enableStatus, toSwitch(general.enable_status));
  put(HTTP_CONTROLS.bindAddress, general.bindaddr);
  put(HTTP_CONTROLS.bindPort, num(general.bindport));
  put(HTTP_CONTROLS.prefix, general.prefix);
  put(HTTP_CONTROLS.tlsEnable, toSwitch(general.tlsenable));
  const listener = parseTlsBindAddr(general.tlsbindaddr);
  put(HTTP_CONTROLS.tlsBindAddress, listener.address);
  put(HTTP_CONTROLS.tlsBindPort, listener.port === undefined ? undefined : Number(listener.port));
  put(HTTP_CONTROLS.tlsCertFile, general.tlscertfile);
  put(HTTP_CONTROLS.tlsPrivateKey, general.tlsprivatekey);
  put(HTTP_CONTROLS.tlsDisableV1, toSwitch(general.tlsdisablev1));
  put(HTTP_CONTROLS.tlsDisableV11, toSwitch(general.tlsdisablev11));
  put(HTTP_CONTROLS.tlsDisableV12, toSwitch(general.tlsdisablev12));
  put(HTTP_CONTROLS.sessionLimit, num(general.sessionlimit));
  put(HTTP_CONTROLS.sessionInactivity, num(general.session_inactivity));
  put(HTTP_CONTROLS.sessionKeepAlive, num(general.session_keep_alive));
  return values;
}

export interface HttpEdit {
  view: HttpView;
  summary: string[];
  /** Stated before Submit: turning TLS on without a certificate produces a server that
   *  will not start, and Asterisk reports that at load time rather than here. */
  warnings: string[];
}

export function applyControlValues(existing: ConfigValue, values: Record<string, unknown>): HttpEdit {
  const view = parseHttp(existing);
  const general: HttpGeneralView = { ...view.general };
  const summary: string[] = [];

  const set = (key: keyof HttpGeneralView, next: string | undefined) => {
    if (next === undefined) return;
    const before = general[key];
    if (before === next) return;
    general[key] = next;
    summary.push(`http.conf: ${key} ${before ?? 'unset'} to ${next}`);
  };
  const text = (id: string) => {
    const raw = values[id];
    return typeof raw === 'string' && raw !== '' ? raw : undefined;
  };
  const number = (id: string) => (typeof values[id] === 'number' ? String(values[id] as number) : undefined);

  set('enabled', fromSwitch(values[HTTP_CONTROLS.enabled]));
  set('enable_static', fromSwitch(values[HTTP_CONTROLS.enableStatic]));
  set('enable_status', fromSwitch(values[HTTP_CONTROLS.enableStatus]));
  set('bindaddr', text(HTTP_CONTROLS.bindAddress));
  set('bindport', number(HTTP_CONTROLS.bindPort));
  set('prefix', text(HTTP_CONTROLS.prefix));
  set('tlsenable', fromSwitch(values[HTTP_CONTROLS.tlsEnable]));
  set('tlscertfile', text(HTTP_CONTROLS.tlsCertFile));
  set('tlsprivatekey', text(HTTP_CONTROLS.tlsPrivateKey));
  set('tlsdisablev1', fromSwitch(values[HTTP_CONTROLS.tlsDisableV1]));
  set('tlsdisablev11', fromSwitch(values[HTTP_CONTROLS.tlsDisableV11]));
  set('tlsdisablev12', fromSwitch(values[HTTP_CONTROLS.tlsDisableV12]));
  set('sessionlimit', number(HTTP_CONTROLS.sessionLimit));
  set('session_inactivity', number(HTTP_CONTROLS.sessionInactivity));
  set('session_keep_alive', number(HTTP_CONTROLS.sessionKeepAlive));

  /* The two halves are recomposed from whichever the screen supplied, falling back to
   * what the file already holds, so editing one never discards the other. */
  const current = parseTlsBindAddr(general.tlsbindaddr);
  const address = text(HTTP_CONTROLS.tlsBindAddress) ?? current.address;
  const port = number(HTTP_CONTROLS.tlsBindPort) ?? current.port;
  set('tlsbindaddr', formatTlsBindAddr({ address, port }));

  const warnings: string[] = [];
  if (general.tlsenable === 'yes') {
    if (!general.tlscertfile) {
      warnings.push('TLS is on with no certificate file. Asterisk will refuse to start the TLS listener.');
    }
    if (!general.tlsbindaddr) {
      warnings.push(`TLS is on with no bind address. Asterisk's own sample uses 0.0.0.0:${DEFAULT_TLS_BIND_PORT}.`);
    }
  }
  if (general.tlsdisablev1 === 'no' || general.tlsdisablev11 === 'no') {
    warnings.push('TLS 1.0 or 1.1 has been re-enabled. Both are deprecated and should stay disabled unless a device genuinely requires one.');
  }
  return { view: { ...view, general }, summary, warnings };
}

/** The document to send to the plan and apply actions. */
export function httpDocument(edit: HttpEdit, resource: string): { resource: string; value: ConfigValue } {
  return { resource, value: toConfigValueHttp(edit.view) as ConfigValue };
}
