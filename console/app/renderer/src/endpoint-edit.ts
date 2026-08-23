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
