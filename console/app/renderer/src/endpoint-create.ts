/**
 * Creating a PJSIP endpoint from the answers the guided wizard already collects.
 *
 * The wizard asked five screens' worth of questions and then ran `pjsip reload` — a
 * command that reloads a file it had never written to. It reported success, because the
 * reload genuinely succeeded, so the interface said the configuration had been applied
 * and nothing had been. That is worse than a wizard that does nothing openly.
 *
 * Everything needed to make it real already existed: a typed PJSIP model that treats the
 * endpoint, auth and aor trio as one identity, and a transaction path that backs up,
 * stages, validates, applies and reads back. This is the join between them.
 */
import {
  newPjsipEndpoint, parsePjsip, toConfigValuePjsip,
  type PjsipEndpointView, type PjsipView,
} from '../../../control-plane/subsystem-models';
import type { ConfigValue } from './configuration';

/** The resource the trio lives in. Already on the writable allowlist. */
export const PJSIP_RESOURCE = '/etc/asterisk/pjsip.conf';

/** What the wizard's own controls are called, so a rename cannot silently stop feeding
 *  this and leave the endpoint being created from defaults. */
export const WIZARD_CONTROLS = {
  name: 'w_name',
  extension: 'w_ext',
  transport: 'w_transport',
  /* The global codec order from the codecs screen. It is not a question the wizard asks;
   * it is the default a new endpoint starts from, which is the only thing a "global order"
   * can honestly mean when pjsip keeps codec lists per endpoint. */
  codecOrder: 'k_order',
  context: 'w_context',
  nat: 'w_nat',
  qualify: 'w_qualify',
} as const;

export interface WizardAnswers {
  [controlId: string]: unknown;
}

export interface EndpointDraft {
  view: PjsipView;
  created: PjsipEndpointView;
  secret: string;
  /** Human-readable, and deliberately free of the secret. */
  summary: string[];
}

const text = (answers: WizardAnswers, id: string): string => {
  const value = answers[id];
  return typeof value === 'string' ? value.trim() : '';
};

/**
 * The name is the one thing a wizard cannot guess, and the design says so on the screen
 * itself. Refusing here rather than inventing one keeps that promise: an endpoint named
 * something the person never chose is worse than being asked again.
 */
export function endpointNameFrom(answers: WizardAnswers): string {
  return text(answers, WIZARD_CONTROLS.name) || text(answers, WIZARD_CONTROLS.extension);
}

/**
 * Builds the trio from the wizard's answers, on top of whatever is already on the target.
 *
 * `existing` is the target's real `pjsip.conf`, so this can refuse a name that is already
 * taken instead of silently replacing somebody's phone.
 */
export function buildEndpointDraft(existing: ConfigValue, answers: WizardAnswers): EndpointDraft | { error: string } {
  const name = endpointNameFrom(answers);
  if (!name) return { error: 'The endpoint needs a name. It is the one value that cannot be chosen for you.' };
  if (!/^[A-Za-z0-9_-]+$/u.test(name)) {
    return { error: `"${name}" cannot be a section name in pjsip.conf. Use letters, digits, hyphens or underscores.` };
  }

  const view = parsePjsip(existing);
  if (view.endpoints.some((endpoint) => endpoint.name === name)) {
    return { error: `${name} already exists on this target. Edit it instead, or choose another name.` };
  }

  const context = text(answers, WIZARD_CONTROLS.context) || 'from-internal';
  const { view: created, secret } = newPjsipEndpoint(name, context);

  /* Only answers the wizard actually asked are applied. A question it never put to the
   * person is left at the model's own default rather than being filled in from a guess
   * about what they probably wanted. */
  const transport = text(answers, WIZARD_CONTROLS.transport);
  if (transport) created.endpoint.transport = transport;

  /* Only when it was actually set. An empty or absent order leaves the model's own default,
   * rather than writing an empty allow list, which in pjsip means an endpoint that can
   * negotiate nothing at all. */
  const order = answers[WIZARD_CONTROLS.codecOrder];
  if (Array.isArray(order) && order.length > 0 && order.every((codec) => typeof codec === 'string')) {
    created.endpoint.allow = order as string[];
    /* An allow list means nothing in pjsip without this, so the two are always written
     * together -- the same pairing the endpoint editor already makes. */
    if (!created.endpoint.disallow.includes('all')) created.endpoint.disallow = ['all'];
  }

  /* "Behind a home router" is the plain-language form of the three settings that make a
   * phone behind NAT work. The answer is applied in both directions on purpose.
   *
   * Applying it only when true would have made the question decorative, because the model
   * already switches all three on when it creates an endpoint — so answering no would
   * have changed nothing and the control would have looked live while doing nothing. That
   * was the state this was written in, and the test that caught it is kept.
   *
   * The keys are named in the summary rather than hidden behind the friendly wording, so
   * the plan stays reviewable: somebody reading it sees what will actually be written. */
  const asked = WIZARD_CONTROLS.nat in answers;
  const behindNat = answers[WIZARD_CONTROLS.nat] === true;
  if (asked) {
    const setting = behindNat ? 'yes' : 'no';
    created.endpoint.rtp_symmetric = setting;
    created.endpoint.force_rport = setting;
    created.endpoint.rewrite_contact = setting;
  }

  const qualify = Number(answers[WIZARD_CONTROLS.qualify]);
  if (Number.isFinite(qualify) && qualify > 0) created.aor.qualify_frequency = String(qualify);

  const merged: PjsipView = { ...view, endpoints: [...view.endpoints, created] };

  /* The summary is read aloud, screenshotted and pasted into tickets. The secret is not
   * in it — it is shown once, separately, after the write. */
  const summary = [
    `pjsip.conf: add endpoint ${name} in context ${context}`,
    `pjsip.conf: add auth ${name} with a generated password`,
    `pjsip.conf: add aor ${name}`,
  ];
  if (transport) summary.push(`pjsip.conf: ${name} uses transport ${transport}`);
  if (asked) {
    summary.push(behindNat
      ? `pjsip.conf: ${name} gets the NAT traversal settings (rtp_symmetric, force_rport, rewrite_contact)`
      : `pjsip.conf: ${name} has the NAT traversal settings turned off (rtp_symmetric, force_rport, rewrite_contact)`);
  }
  if (Number.isFinite(qualify) && qualify > 0) summary.push(`pjsip.conf: qualify ${name} every ${qualify} seconds`);

  return { view: merged, created, secret, summary };
}

/** The document to send to the plan and apply actions. */
export function endpointDocument(draft: EndpointDraft): { resource: string; value: ConfigValue } {
  return { resource: PJSIP_RESOURCE, value: toConfigValuePjsip(draft.view) as ConfigValue };
}
