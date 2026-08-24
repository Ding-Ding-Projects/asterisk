/**
 * Editing an IAX2 peer in iax.conf.
 *
 * `parseIax` was the third parser sitting in the control plane with nothing on screen
 * able to call it. This is the mapping half, shaped like the endpoint and feature-code
 * editors beside it, so the three read the same way.
 *
 * Every key here appears in Asterisk's own configs/samples/iax.conf.sample, including
 * the two enums whose values are easy to guess wrongly: `transfer` is no/yes/mediaonly
 * (sample line 533-534) and `requirecalltoken` is no/yes/auto (line 418-423).
 *
 * THE SECRET IS WRITE-ONLY, and that is a deliberate asymmetry rather than an omission.
 * The parser reads `secret` so that saving a peer cannot silently drop a line already in
 * the file, and nothing here ever puts it into a control value. A screen that displays a
 * stored credential is a screen that leaks it to anyone glancing at the monitor, into
 * every screenshot, and into any export that walks the control values -- so the value
 * never enters that path at all. Setting one is an explicit act with its own switch.
 */
import {
  parseIax, toConfigValueIax,
  type IaxPeerView, type IaxView,
} from '../../../control-plane/subsystem-models';
import type { ConfigValue } from './configuration';

/** The IAX peers destination's control ids, from the compiled design. */
export const IAX_CONTROLS = {
  type: 'ix_type',
  host: 'ix_host',
  username: 'ix_username',
  port: 'ix_port',
  transfer: 'ix_transfer',
  qualify: 'ix_qualify',
  trunk: 'ix_trunk',
  requireCallToken: 'ix_calltoken',
  codecs: 'ix_codecs',
  context: 'ix_context',
  accountcode: 'ix_accountcode',
  mailbox: 'ix_mailbox',
  setNewSecret: 'ix_secret_set',
} as const;

/** iax.conf.sample line 533-534. `yes` is the Asterisk default and is not in the sample
 *  as a commented line, but is the documented behaviour when the key is absent. */
export const IAX_TRANSFER_MODES = ['no', 'yes', 'mediaonly'] as const;
/** iax.conf.sample line 418-423. */
export const IAX_CALL_TOKEN_MODES = ['no', 'yes', 'auto'] as const;
export const IAX_PEER_TYPES = ['user', 'peer', 'friend'] as const;

const toSwitch = (value: string | undefined): boolean | undefined =>
  value === undefined ? undefined : value === 'yes';
const fromSwitch = (value: unknown): string | undefined =>
  typeof value === 'boolean' ? (value ? 'yes' : 'no') : undefined;

export function peerNames(existing: ConfigValue): string[] {
  return parseIax(existing).peers.map((peer) => peer.name);
}

export function findPeer(existing: ConfigValue, name: string): IaxPeerView | undefined {
  return parseIax(existing).peers.find((peer) => peer.name === name);
}

/**
 * The control values for one peer, for seeding the screen when a row is selected.
 *
 * A key the peer does not set is left out rather than given a value, and the secret is
 * never included under any circumstances.
 */
export function controlValuesFor(peer: IaxPeerView): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  const put = (id: string, value: unknown) => { if (value !== undefined) values[id] = value; };

  put(IAX_CONTROLS.type, peer.type);
  put(IAX_CONTROLS.host, peer.host);
  put(IAX_CONTROLS.username, peer.username);
  put(IAX_CONTROLS.port, peer.port === undefined ? undefined : Number(peer.port));
  put(IAX_CONTROLS.transfer, peer.transfer);
  put(IAX_CONTROLS.qualify, peer.qualify);
  put(IAX_CONTROLS.trunk, toSwitch(peer.trunk));
  put(IAX_CONTROLS.requireCallToken, peer.requirecalltoken);
  put(IAX_CONTROLS.codecs, peer.allow.length > 0 ? peer.allow : undefined);
  /* iax.conf permits several contexts and says the first is the default, so the control
   * shows that one rather than a joined string nobody could save back correctly. */
  put(IAX_CONTROLS.context, peer.context[0]);
  put(IAX_CONTROLS.accountcode, peer.accountcode);
  put(IAX_CONTROLS.mailbox, peer.mailbox);
  /* IAX_CONTROLS.setNewSecret is intentionally absent: it is an action, not a value, and
   * it must never come back on pre-checked from a peer that happens to have a secret. */
  return values;
}

export interface IaxEdit {
  view: IaxView;
  summary: string[];
  /** Present only when a new secret was generated on this save. The caller shows it once
   *  and must not persist it; it is never readable from the config again through here. */
  generatedSecret?: string;
}

/** Generates a secret from the platform CSPRNG. Never `Math.random`, which is predictable
 *  and would make every generated credential guessable from any other. */
function generateSecret(random: (bytes: number) => Uint8Array): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = random(24);
  let out = '';
  for (const byte of bytes) out += alphabet[byte % alphabet.length];
  return out;
}

const defaultRandom = (bytes: number): Uint8Array => {
  const buffer = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(buffer);
  return buffer;
};

/**
 * Applies the screen's control values back onto one peer.
 *
 * Only controls carrying a value are written, so a field nobody touched keeps whatever
 * the file already had. The summary names every change, and deliberately never names the
 * secret's value -- only that one was set.
 */
export function applyControlValues(
  existing: ConfigValue,
  name: string,
  values: Record<string, unknown>,
  random: (bytes: number) => Uint8Array = defaultRandom,
): IaxEdit | { error: string } {
  const view = parseIax(existing);
  const target = view.peers.find((peer) => peer.name === name);
  if (!target) return { error: `${name} is not in iax.conf any more. Read the peers again before saving.` };

  const summary: string[] = [];
  const set = (key: keyof IaxPeerView, next: string | undefined, label: string) => {
    if (next === undefined) return;
    const before = target[key] as string | undefined;
    if (before === next) return;
    (target as unknown as Record<string, unknown>)[key] = next;
    summary.push(`iax.conf: ${name} ${label} ${before ?? 'unset'} to ${next}`);
  };

  const text = (id: string) => {
    const raw = values[id];
    return typeof raw === 'string' && raw !== '' ? raw : undefined;
  };
  const number = (id: string) => (typeof values[id] === 'number' ? String(values[id] as number) : undefined);

  set('type', text(IAX_CONTROLS.type), 'type');
  set('host', text(IAX_CONTROLS.host), 'host');
  set('username', text(IAX_CONTROLS.username), 'username');
  set('port', number(IAX_CONTROLS.port), 'port');
  set('transfer', text(IAX_CONTROLS.transfer), 'transfer');
  set('qualify', text(IAX_CONTROLS.qualify), 'qualify');
  set('trunk', fromSwitch(values[IAX_CONTROLS.trunk]), 'trunk');
  set('requirecalltoken', text(IAX_CONTROLS.requireCallToken), 'requirecalltoken');
  set('accountcode', text(IAX_CONTROLS.accountcode), 'accountcode');
  set('mailbox', text(IAX_CONTROLS.mailbox), 'mailbox');

  /* Context is a list in the file. The control edits the first entry, which the sample
   * calls the default, and leaves any others exactly where they are. */
  const context = text(IAX_CONTROLS.context);
  if (context !== undefined && target.context[0] !== context) {
    const before = target.context[0];
    target.context = [context, ...target.context.slice(1)];
    summary.push(`iax.conf: ${name} context ${before ?? 'unset'} to ${context}`);
  }

  /* disallow=all before the allow list, for the same reason as pjsip.conf: an allow list
   * with nothing disallowed first adds to the defaults rather than replacing them. */
  const codecs = values[IAX_CONTROLS.codecs];
  if (Array.isArray(codecs) && codecs.every((codec) => typeof codec === 'string')) {
    const next = codecs as string[];
    const before = target.allow;
    const same = before.length === next.length && before.every((codec, i) => codec === next[i]);
    if (!same) {
      target.allow = next;
      if (!target.disallow.includes('all')) target.disallow = ['all'];
      summary.push(`iax.conf: ${name} codecs ${before.join(',') || 'unset'} to ${next.join(',')}`);
    }
  }

  let generatedSecret: string | undefined;
  if (values[IAX_CONTROLS.setNewSecret] === true) {
    generatedSecret = generateSecret(random);
    target.secret = generatedSecret;
    /* Says that it changed, never to what. The summary is shown, logged and exported. */
    summary.push(`iax.conf: ${name} secret replaced with a newly generated one`);
  }

  return { view, summary, generatedSecret };
}

/** The document to send to the plan and apply actions. */
export function iaxDocument(edit: IaxEdit, resource: string): { resource: string; value: ConfigValue } {
  return { resource, value: toConfigValueIax(edit.view) as ConfigValue };
}
