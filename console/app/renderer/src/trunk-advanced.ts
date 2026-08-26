/**
 * The advanced trunk settings, which are pjsip.conf endpoint keys on a trunk's endpoint.
 *
 * A PJSIP trunk is not a separate object type: it is an endpoint that happens to point at
 * a provider rather than a handset. So these are the same sections `endpoint-edit.ts`
 * writes, and this module exists beside it rather than inside it only because the trunk
 * surface is its own destination with its own control ids.
 *
 * Every key here was checked against Asterisk's own configs/samples/pjsip.conf.sample
 * before anything was built on it. Two settings the same scoreboard block asks for are
 * deliberately absent: `user=phone` and Support Path have no key in this Asterisk's
 * sample, and writing one the build may ignore produces a line that looks like a working
 * setting and does nothing. That is the same failure as writing `automon` into a
 * features.conf whose Asterisk only knows `automixmon`, and it is worse than the gap.
 *
 * The T.38 group is the one worth reading twice. `t38_udptl_ec` takes none, fec or
 * redundancy -- three values, not a switch -- and collapsing it would make two of them
 * unreachable and rewrite whichever was set on the next save.
 *
 * `sendPai`/`send100rel` load and save `send_pai`/100rel too, though those two live in
 * the design's own "Outbound identity" group rather than this file's "Advanced" one --
 * the trunks screen declared both controls before this module, or `onSaveTrunk` in
 * App.tsx, existed to give either of them anywhere to write. Reusing `t_pai`/`t_100rel`
 * here rather than minting `tk_pai`/`tk_100rel` keeps one control id per pjsip.conf key.
 */
import {
  parsePjsip, toConfigValuePjsip,
  type PjsipEndpointView, type PjsipView,
} from '../../../control-plane/subsystem-models';
import type { ConfigValue } from './configuration';

/** The trunk destination's advanced control ids, from the compiled design. */
export const TRUNK_CONTROLS = {
  sendConnectedLine: 'tk_connectedline',
  contactUser: 'tk_contactuser',
  fromDomain: 'tk_fromdomain',
  fromUser: 'tk_fromuser',
  mediaAddress: 'tk_mediaaddr',
  t38Udptl: 'tk_t38',
  t38ErrorCorrection: 'tk_t38ec',
  t38Nat: 'tk_t38nat',
  t38MaxDatagram: 'tk_t38mtu',
  faxDetect: 'tk_faxdetect',
  trustIdOutbound: 'tk_trustout',
  sendRpid: 'tk_sendrpid',
  sendDiversion: 'tk_senddiversion',
  /* Reuses the "Outbound identity" group's own ids -- t_pai and t_100rel already sat
   * on the trunks screen, unbound, before this file's editing path existed for that
   * screen at all. Giving them a second control id here would just be two switches
   * disagreeing about one line in pjsip.conf. */
  sendPai: 't_pai',
  send100rel: 't_100rel',
} as const;

/** pjsip.conf.sample: "none", "fec" or "redundancy". Three values, deliberately not a switch. */
export const T38_ERROR_CORRECTION = ['none', 'fec', 'redundancy'] as const;

/** pjsip.conf.sample line 650: "no", "required" or "yes". Three values, not a switch. */
export const REL_100 = ['no', 'required', 'yes'] as const;

const toSwitch = (value: string | undefined): boolean | undefined =>
  value === undefined ? undefined : value === 'yes';
const fromSwitch = (value: unknown): string | undefined =>
  typeof value === 'boolean' ? (value ? 'yes' : 'no') : undefined;

/** Seeds the screen from one trunk's endpoint section. */
export function controlValuesFor(endpoint: PjsipEndpointView): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  const put = (id: string, value: unknown) => { if (value !== undefined) values[id] = value; };
  const fields = endpoint.endpoint;

  put(TRUNK_CONTROLS.sendConnectedLine, toSwitch(fields.send_connected_line));
  put(TRUNK_CONTROLS.contactUser, fields.contact_user);
  put(TRUNK_CONTROLS.fromDomain, fields.from_domain);
  put(TRUNK_CONTROLS.fromUser, fields.from_user);
  put(TRUNK_CONTROLS.mediaAddress, fields.media_address);
  put(TRUNK_CONTROLS.t38Udptl, toSwitch(fields.t38_udptl));
  put(TRUNK_CONTROLS.t38ErrorCorrection, fields.t38_udptl_ec);
  put(TRUNK_CONTROLS.t38Nat, toSwitch(fields.t38_udptl_nat));
  put(TRUNK_CONTROLS.t38MaxDatagram, fields.t38_udptl_maxdatagram === undefined
    ? undefined : Number(fields.t38_udptl_maxdatagram));
  put(TRUNK_CONTROLS.faxDetect, toSwitch(fields.fax_detect));
  put(TRUNK_CONTROLS.trustIdOutbound, toSwitch(fields.trust_id_outbound));
  put(TRUNK_CONTROLS.sendRpid, toSwitch(fields.send_rpid));
  put(TRUNK_CONTROLS.sendDiversion, toSwitch(fields.send_diversion));
  put(TRUNK_CONTROLS.sendPai, toSwitch(fields.send_pai));
  put(TRUNK_CONTROLS.send100rel, fields['100rel']);
  return values;
}

export interface TrunkEdit {
  view: PjsipView;
  summary: string[];
  /** Stated before the write, since Asterisk reports these only at call time. */
  warnings: string[];
}

/**
 * Applies the screen's control values back onto one trunk's endpoint.
 *
 * Only controls carrying a value are written, so a field nobody touched keeps whatever
 * the file already had rather than being reset to whatever the interface was showing.
 */
export function applyControlValues(
  existing: ConfigValue,
  name: string,
  values: Record<string, unknown>,
): TrunkEdit | { error: string } {
  const view = parsePjsip(existing);
  const target = view.endpoints.find((endpoint) => endpoint.name === name);
  if (!target) return { error: `${name} is not on this target any more. Read the trunks again before saving.` };

  const summary: string[] = [];
  const set = (key: keyof PjsipEndpointView['endpoint'], next: string | undefined, label: string) => {
    if (next === undefined) return;
    const before = target.endpoint[key] as string | undefined;
    if (before === next) return;
    (target.endpoint as unknown as Record<string, unknown>)[key] = next;
    summary.push(`pjsip.conf: ${name} ${label} ${before ?? 'unset'} to ${next}`);
  };
  /* An untouched optional text control still reports the design's empty-string default,
   * so an empty value is read as "nothing entered" rather than "clear this field".
   * Clearing a provider's From domain nobody meant to touch is the worse guess. */
  const text = (id: string) => {
    const raw = values[id];
    return typeof raw === 'string' && raw !== '' ? raw : undefined;
  };
  const number = (id: string) => (typeof values[id] === 'number' ? String(values[id] as number) : undefined);

  set('send_connected_line', fromSwitch(values[TRUNK_CONTROLS.sendConnectedLine]), 'send_connected_line');
  set('contact_user', text(TRUNK_CONTROLS.contactUser), 'contact_user');
  set('from_domain', text(TRUNK_CONTROLS.fromDomain), 'from_domain');
  set('from_user', text(TRUNK_CONTROLS.fromUser), 'from_user');
  set('media_address', text(TRUNK_CONTROLS.mediaAddress), 'media_address');
  set('t38_udptl', fromSwitch(values[TRUNK_CONTROLS.t38Udptl]), 't38_udptl');
  set('t38_udptl_ec', text(TRUNK_CONTROLS.t38ErrorCorrection), 't38_udptl_ec');
  set('t38_udptl_nat', fromSwitch(values[TRUNK_CONTROLS.t38Nat]), 't38_udptl_nat');
  set('t38_udptl_maxdatagram', number(TRUNK_CONTROLS.t38MaxDatagram), 't38_udptl_maxdatagram');
  set('fax_detect', fromSwitch(values[TRUNK_CONTROLS.faxDetect]), 'fax_detect');
  set('trust_id_outbound', fromSwitch(values[TRUNK_CONTROLS.trustIdOutbound]), 'trust_id_outbound');
  set('send_rpid', fromSwitch(values[TRUNK_CONTROLS.sendRpid]), 'send_rpid');
  set('send_diversion', fromSwitch(values[TRUNK_CONTROLS.sendDiversion]), 'send_diversion');
  set('send_pai', fromSwitch(values[TRUNK_CONTROLS.sendPai]), 'send_pai');
  set('100rel', text(TRUNK_CONTROLS.send100rel), '100rel');

  const warnings: string[] = [];
  const fields = target.endpoint;
  /* T.38 error correction and NAT are read only when T.38 itself is on, so setting them
   * against a trunk with t38_udptl unset writes lines Asterisk never consults. */
  if (fields.t38_udptl !== 'yes'
      && (fields.t38_udptl_ec !== undefined || fields.t38_udptl_nat !== undefined
        || fields.t38_udptl_maxdatagram !== undefined)) {
    warnings.push('T.38 settings are configured but T.38 itself is off, so Asterisk will not read them.');
  }
  /* Sending caller identity outbound while refusing to trust it inbound is a coherent
   * choice; sending it with no privacy header is where somebody leaks a withheld number. */
  if (fields.send_rpid === 'yes' && fields.trust_id_outbound !== 'yes') {
    warnings.push('Remote-Party-ID is being sent while outbound identity is not trusted. A caller who withheld their number may still have it forwarded.');
  }
  return { view, summary, warnings };
}

/** The document to send to the plan and apply actions. */
export function trunkDocument(edit: TrunkEdit, resource: string): { resource: string; value: ConfigValue } {
  return { resource, value: toConfigValuePjsip(edit.view) as ConfigValue };
}
