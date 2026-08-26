/**
 * Editing and removing an existing PJSIP endpoint.
 *
 * Creation had a path; changing or deleting one did not, which is what kept the endpoints
 * screen a viewer. The screen has always carried a full set of bound controls, but they
 * bind to a section literally named `endpoint`, and no such section exists in a real
 * `pjsip.conf` — every endpoint is its own section, named after itself. So the controls
 * were bound to something that is never there, which is why selecting a row loaded
 * nothing into them.
 *
 * This maps between one endpoint's three sections and the screen's control values, in
 * both directions, so a row can be selected, changed and written back.
 */
import {
  parsePjsip, toConfigValuePjsip,
  type PjsipEndpointView, type PjsipView,
} from '../../../control-plane/subsystem-models';
import type { ConfigValue } from './configuration';
import { callerIdFor, parseCallerId } from './extensions';

/** The screen's own control identifiers, from the compiled design's `pjsipCtls()`. */
export const ENDPOINT_CONTROLS = {
  transport: 'e_transport',
  context: 'e_context',
  dtmf: 'e_dtmf',
  direct: 'e_direct',
  symmetric: 'e_symmetric',
  forcerport: 'e_forcerport',
  rewrite: 'e_rewrite',
  encryption: 'e_encryption',
  codecs: 'e_codecs',
  maxContacts: 'e_maxcontacts',
  removeExisting: 'e_removeexisting',
  qualify: 'e_qualify',
  mailboxes: 'e_mailboxes',
  voicemailExtension: 'e_voicemail_ext',
  /* CORE-PJSIP-DEV-010/018/020/021/023/024/027/028. The model already parsed every
   * one of these keys; only the controls were missing, which is what "backend ready,
   * no UI" meant on the scoreboard. */
  maxAudioStreams: 'e_maxaudio',
  maxVideoStreams: 'e_maxvideo',
  optimisticEncryption: 'e_optimistic',
  timers: 'e_timers',
  timersMinSe: 'e_timers_min_se',
  timersSessExpires: 'e_timers_sess',
  rtpTimeout: 'e_rtp_timeout',
  rtpTimeoutHold: 'e_rtp_hold',
  deviceStateBusyAt: 'e_busy_at',
  referBlindProgress: 'e_refer_blind',
  aggregateMwi: 'e_aggregate_mwi',
  mwiReplacesUnsolicited: 'e_mwi_replaces',
  outboundProxy: 'e_outbound_proxy',
  outboundAuth: 'e_outbound_auth',
  /* The two halves of `callerid=` (extensions.ts's own concern -- pjsip.conf has no
   * separate display-name/number keys, only one composite string). Composed and parsed
   * through extensions.ts's parseCallerId/callerIdFor rather than by hand here, so this
   * screen and the endpoint create wizard cannot silently disagree about the format. */
  displayName: 'e_displayname',
  callerIdNumber: 'e_calleridnum',
} as const;

/** Asterisk writes `yes` and `no`; the interface uses a switch. */
const toSwitch = (value: string | undefined): boolean | undefined =>
  value === undefined ? undefined : value === 'yes';
const fromSwitch = (value: unknown): string | undefined =>
  typeof value === 'boolean' ? (value ? 'yes' : 'no') : undefined;

export function endpointNames(existing: ConfigValue): string[] {
  return parsePjsip(existing).endpoints.map((endpoint) => endpoint.name);
}

export function findEndpoint(existing: ConfigValue, name: string): PjsipEndpointView | undefined {
  return parsePjsip(existing).endpoints.find((endpoint) => endpoint.name === name);
}

/**
 * The control values for one endpoint, for seeding the screen when a row is selected.
 *
 * A field the endpoint does not set is left out rather than given a value: the control
 * then keeps the design's own default, and the screen does not imply the target has a
 * setting it has never been given.
 */
export function controlValuesFor(endpoint: PjsipEndpointView): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  const put = (id: string, value: unknown) => { if (value !== undefined) values[id] = value; };

  put(ENDPOINT_CONTROLS.transport, endpoint.endpoint.transport);
  put(ENDPOINT_CONTROLS.context, endpoint.endpoint.context);
  put(ENDPOINT_CONTROLS.dtmf, endpoint.endpoint.dtmf_mode);
  put(ENDPOINT_CONTROLS.encryption, endpoint.endpoint.media_encryption);
  put(ENDPOINT_CONTROLS.direct, toSwitch(endpoint.endpoint.direct_media));
  put(ENDPOINT_CONTROLS.symmetric, toSwitch(endpoint.endpoint.rtp_symmetric));
  put(ENDPOINT_CONTROLS.forcerport, toSwitch(endpoint.endpoint.force_rport));
  put(ENDPOINT_CONTROLS.rewrite, toSwitch(endpoint.endpoint.rewrite_contact));
  put(ENDPOINT_CONTROLS.codecs, endpoint.endpoint.allow.length > 0 ? endpoint.endpoint.allow : undefined);
  put(ENDPOINT_CONTROLS.maxContacts, endpoint.aor.max_contacts !== undefined ? Number(endpoint.aor.max_contacts) : undefined);
  put(ENDPOINT_CONTROLS.removeExisting, toSwitch(endpoint.aor.remove_existing));
  put(ENDPOINT_CONTROLS.qualify, endpoint.aor.qualify_frequency !== undefined ? Number(endpoint.aor.qualify_frequency) : undefined);
  put(ENDPOINT_CONTROLS.mailboxes, endpoint.endpoint.mailboxes);
  put(ENDPOINT_CONTROLS.voicemailExtension, endpoint.endpoint.voicemail_extension);

  /* callerid='My Name <8005551212>' split into its two halves for the two text fields;
   * see extensions.ts's own CALLERID_PATTERN for why a bare value with no angle brackets
   * reads as the name rather than the number. */
  const callerIdParts = parseCallerId(endpoint.endpoint.callerid);
  put(ENDPOINT_CONTROLS.displayName, callerIdParts.displayName);
  put(ENDPOINT_CONTROLS.callerIdNumber, callerIdParts.number);

  /* Numeric keys reach steppers and sliders as numbers; a key the endpoint never set
   * stays out entirely, so the control keeps the design's default and the screen does
   * not imply a setting the target has never been given. */
  const num = (raw: string | undefined) => (raw === undefined ? undefined : Number(raw));
  put(ENDPOINT_CONTROLS.maxAudioStreams, num(endpoint.endpoint.max_audio_streams));
  put(ENDPOINT_CONTROLS.maxVideoStreams, num(endpoint.endpoint.max_video_streams));
  put(ENDPOINT_CONTROLS.optimisticEncryption, toSwitch(endpoint.endpoint.media_encryption_optimistic));
  /* `timers` is not a yes/no: Asterisk accepts no/yes/required/always, so it reaches a
   * segmented control as its literal value rather than being flattened to a switch. */
  put(ENDPOINT_CONTROLS.timers, endpoint.endpoint.timers);
  put(ENDPOINT_CONTROLS.timersMinSe, num(endpoint.endpoint.timers_min_se));
  put(ENDPOINT_CONTROLS.timersSessExpires, num(endpoint.endpoint.timers_sess_expires));
  put(ENDPOINT_CONTROLS.rtpTimeout, num(endpoint.endpoint.rtp_timeout));
  put(ENDPOINT_CONTROLS.rtpTimeoutHold, num(endpoint.endpoint.rtp_timeout_hold));
  put(ENDPOINT_CONTROLS.deviceStateBusyAt, num(endpoint.endpoint.device_state_busy_at));
  put(ENDPOINT_CONTROLS.referBlindProgress, toSwitch(endpoint.endpoint.refer_blind_progress));
  put(ENDPOINT_CONTROLS.aggregateMwi, toSwitch(endpoint.endpoint.aggregate_mwi));
  put(ENDPOINT_CONTROLS.mwiReplacesUnsolicited, toSwitch(endpoint.endpoint.mwi_subscribe_replaces_unsolicited));
  put(ENDPOINT_CONTROLS.outboundProxy, endpoint.endpoint.outbound_proxy);
  put(ENDPOINT_CONTROLS.outboundAuth, endpoint.endpoint.outbound_auth);
  return values;
}

export interface EndpointEdit {
  view: PjsipView;
  summary: string[];
}

/**
 * Applies the screen's current control values back onto one endpoint.
 *
 * Only controls the screen actually carries a value for are written, so a field the
 * person never touched keeps whatever the target already had rather than being reset to
 * a default the interface happened to be showing.
 */
export function applyControlValues(
  existing: ConfigValue,
  name: string,
  values: Record<string, unknown>,
): EndpointEdit | { error: string } {
  const view = parsePjsip(existing);
  const target = view.endpoints.find((endpoint) => endpoint.name === name);
  if (!target) return { error: `${name} is not on this target any more. Read the endpoints again before saving.` };

  const summary: string[] = [];
  const set = (key: keyof PjsipEndpointView['endpoint'], next: string | undefined, label: string) => {
    if (next === undefined) return;
    const before = target.endpoint[key] as string | undefined;
    if (before === next) return;
    (target.endpoint as unknown as Record<string, unknown>)[key] = next;
    summary.push(`pjsip.conf: ${name} ${label} ${before ?? 'unset'} to ${next}`);
  };
  const setAor = (key: keyof PjsipEndpointView['aor'], next: string | undefined, label: string) => {
    if (next === undefined) return;
    const before = target.aor[key] as string | undefined;
    if (before === next) return;
    (target.aor as unknown as Record<string, unknown>)[key] = next;
    summary.push(`pjsip.conf: ${name} AoR ${label} ${before ?? 'unset'} to ${next}`);
  };

  const text = (id: string) => (typeof values[id] === 'string' ? (values[id] as string) : undefined);
  /* An untouched optional text control still reports the design's empty-string default,
   * so an empty value here is read as "nothing entered" rather than "clear the field" —
   * otherwise every save would write mailboxes='' the first time the screen is opened. */
  const optionalText = (id: string) => {
    const value = text(id);
    return value === undefined || value === '' ? undefined : value;
  };
  const number = (id: string) => (typeof values[id] === 'number' ? String(values[id] as number) : undefined);

  set('transport', text(ENDPOINT_CONTROLS.transport), 'transport');
  set('context', text(ENDPOINT_CONTROLS.context), 'context');
  set('dtmf_mode', text(ENDPOINT_CONTROLS.dtmf), 'DTMF mode');
  set('media_encryption', text(ENDPOINT_CONTROLS.encryption), 'media encryption');
  set('direct_media', fromSwitch(values[ENDPOINT_CONTROLS.direct]), 'direct media');
  set('rtp_symmetric', fromSwitch(values[ENDPOINT_CONTROLS.symmetric]), 'symmetric RTP');
  set('force_rport', fromSwitch(values[ENDPOINT_CONTROLS.forcerport]), 'force rport');
  set('rewrite_contact', fromSwitch(values[ENDPOINT_CONTROLS.rewrite]), 'contact rewriting');
  set('mailboxes', optionalText(ENDPOINT_CONTROLS.mailboxes), 'mailboxes');
  set('voicemail_extension', optionalText(ENDPOINT_CONTROLS.voicemailExtension), 'voicemail extension');

  /* The order control is the allow list itself; disallow=all is what makes an allow list
   * mean anything in pjsip.conf, so the two are always written together. */
  const codecs = values[ENDPOINT_CONTROLS.codecs];
  if (Array.isArray(codecs) && codecs.every((c) => typeof c === 'string')) {
    const nextAllow = codecs as string[];
    const beforeAllow = target.endpoint.allow;
    const sameOrder = beforeAllow.length === nextAllow.length && beforeAllow.every((c, i) => c === nextAllow[i]);
    if (!sameOrder) {
      target.endpoint.allow = nextAllow;
      if (target.endpoint.disallow.length === 0 || !target.endpoint.disallow.includes('all')) {
        target.endpoint.disallow = ['all'];
      }
      summary.push(`pjsip.conf: ${name} codecs ${beforeAllow.join(',') || 'unset'} to ${nextAllow.join(',')}`);
    }
  }

  set('max_audio_streams', number(ENDPOINT_CONTROLS.maxAudioStreams), 'max_audio_streams');
  set('max_video_streams', number(ENDPOINT_CONTROLS.maxVideoStreams), 'max_video_streams');
  set('media_encryption_optimistic', fromSwitch(values[ENDPOINT_CONTROLS.optimisticEncryption]), 'media_encryption_optimistic (opportunistic SRTP)');
  set('timers', text(ENDPOINT_CONTROLS.timers), 'timers (session timers)');
  set('timers_min_se', number(ENDPOINT_CONTROLS.timersMinSe), 'timers_min_se');
  set('timers_sess_expires', number(ENDPOINT_CONTROLS.timersSessExpires), 'timers_sess_expires');
  set('rtp_timeout', number(ENDPOINT_CONTROLS.rtpTimeout), 'rtp_timeout');
  set('rtp_timeout_hold', number(ENDPOINT_CONTROLS.rtpTimeoutHold), 'rtp_timeout_hold');
  set('device_state_busy_at', number(ENDPOINT_CONTROLS.deviceStateBusyAt), 'device_state_busy_at');
  set('refer_blind_progress', fromSwitch(values[ENDPOINT_CONTROLS.referBlindProgress]), 'refer_blind_progress');
  set('aggregate_mwi', fromSwitch(values[ENDPOINT_CONTROLS.aggregateMwi]), 'aggregate_mwi');
  set('mwi_subscribe_replaces_unsolicited', fromSwitch(values[ENDPOINT_CONTROLS.mwiReplacesUnsolicited]), 'mwi_subscribe_replaces_unsolicited');
  set('outbound_proxy', optionalText(ENDPOINT_CONTROLS.outboundProxy), 'outbound_proxy');
  set('outbound_auth', optionalText(ENDPOINT_CONTROLS.outboundAuth), 'outbound_auth');

  /* Only recomposed when at least one half carries a real value -- an untouched pair of
   * blank text controls must never overwrite an existing callerid= with nothing, exactly
   * as every other optional text field on this screen leaves an untouched blank alone. */
  const displayName = optionalText(ENDPOINT_CONTROLS.displayName);
  const callerIdNumberIn = optionalText(ENDPOINT_CONTROLS.callerIdNumber);
  if (displayName !== undefined || callerIdNumberIn !== undefined) {
    set('callerid', callerIdFor({ extension: name, displayName, callerIdNumber: callerIdNumberIn }), 'caller ID');
  }

  setAor('max_contacts', number(ENDPOINT_CONTROLS.maxContacts), 'max_contacts');
  setAor('remove_existing', fromSwitch(values[ENDPOINT_CONTROLS.removeExisting]), 'remove_existing');
  setAor('qualify_frequency', number(ENDPOINT_CONTROLS.qualify), 'qualify_frequency');

  return { view, summary };
}

/**
 * Removes an endpoint, meaning all three of its sections.
 *
 * Removing only the `type=endpoint` section would leave the auth and aor behind as
 * orphans that no endpoint references. Asterisk tolerates that quietly, so the file grows
 * a little more wrong on every delete and nothing ever says so.
 */
export function removeEndpoint(existing: ConfigValue, name: string): EndpointEdit | { error: string } {
  const view = parsePjsip(existing);
  const target = view.endpoints.find((endpoint) => endpoint.name === name);
  if (!target) return { error: `${name} is not on this target.` };

  const removed: string[] = [];
  if (target.hasEndpoint) removed.push('endpoint');
  if (target.hasAuth) removed.push('auth');
  if (target.hasAor) removed.push('aor');

  return {
    view: { ...view, endpoints: view.endpoints.filter((endpoint) => endpoint.name !== name) },
    summary: [`pjsip.conf: remove ${name} — its ${removed.join(', ')} section${removed.length === 1 ? '' : 's'}`],
  };
}

/** The document to send to the plan and apply actions. */
export function editDocument(edit: EndpointEdit, resource: string): { resource: string; value: ConfigValue } {
  return { resource, value: toConfigValuePjsip(edit.view) as ConfigValue };
}
