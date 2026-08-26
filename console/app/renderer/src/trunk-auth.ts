import type { PjsipAuth, Registration, ViewReadings } from './readings';

/**
 * What the Trunk authentication screen says, built from what the target really has.
 *
 * The screen shipped in the design as a partner-request inbox: a partner asks to widen the
 * shared link, the request lands as a card, and the operator sends YES or NO. There is no
 * such channel here, and there is no honest way to invent one -- which protocol, over which
 * transport, proving which partner identity, are product decisions rather than wiring. So
 * the inbox stays empty and says why, exactly as it did before.
 *
 * What *is* real, and what this module supplies, is the other half of the screen's own
 * name. Trunk authentication in Asterisk is a set of `type=auth` objects that an endpoint's
 * `auth=`/`outbound_auth=` names, and `pjsip show auths` reports them. That reading now
 * reaches this screen, so a screen that previously had nothing at all to say about the
 * target now reports the target's real authentication objects and its real outbound
 * registrations.
 *
 * Nothing here can print a credential. The reading it consumes carries an id and a
 * username and no third field -- see `parsePjsipAuths`, which also records why the command
 * that *would* print the password is not one this console will run.
 */

/** Names listed inline before the sentence stops enumerating and gives a count instead. */
export const MAX_LISTED_AUTHS = 8;

/** The sentence that never changes: the inbox above is empty for a structural reason. */
export const NO_PARTNER_CHANNEL =
  'No partner-request channel is wired into this console — no trunk partner can reach it to ask for a change — ' +
  'so the request list and the answer history below are empty rather than showing invented requests.';

/** One auth object, as this screen names it. An object with no `username=` says so rather
 *  than rendering an empty pair of brackets that reads like a rendering fault. */
export function describeAuth(auth: PjsipAuth): string {
  return auth.username ? `${auth.id} (username ${auth.username})` : `${auth.id} (no username set)`;
}

/**
 * The real half of the screen's note: what `pjsip show auths` and `pjsip show
 * registrations` actually reported for this target.
 *
 * Returns an empty string when there is nothing yet to report at all — no reading has been
 * filed — so the caller can keep its own "reading…" or "no target" wording rather than
 * having this module guess at either.
 */
export function trunkAuthSummary(readings: ViewReadings | undefined): string {
  if (!readings) return '';
  const authReading = readings.auths;
  if (!authReading) return '';
  if (authReading.result.state === 'unavailable') {
    return `The target's PJSIP authentication objects could not be read (${authReading.command}): ${authReading.result.reason}`;
  }
  const auths = authReading.result.value ?? [];
  if (auths.length === 0) {
    return `${authReading.command} reported no PJSIP authentication object on this target, so no trunk here authenticates with one.`;
  }
  const listed = auths.slice(0, MAX_LISTED_AUTHS).map(describeAuth).join(', ');
  const rest = auths.length > MAX_LISTED_AUTHS ? `, and ${auths.length - MAX_LISTED_AUTHS} more` : '';
  const plural = auths.length === 1 ? '' : 's';
  return `${authReading.command} reported ${auths.length} PJSIP authentication object${plural} on this target: ${listed}${rest}.`;
}

/**
 * The outbound registrations read alongside the auth objects, summarised.
 *
 * Kept separate from `trunkAuthSummary` so a target whose auth read succeeded and whose
 * registration read failed reports both facts instead of one swallowing the other.
 */
export function trunkRegistrationSummary(readings: ViewReadings | undefined): string {
  const reading = readings?.registrations;
  if (!reading) return '';
  if (reading.result.state === 'unavailable') {
    return `Outbound registrations could not be read (${reading.command}): ${reading.result.reason}`;
  }
  const registrations: Registration[] = reading.result.value ?? [];
  if (registrations.length === 0) return `${reading.command} reported no outbound registration on this target.`;
  const plural = registrations.length === 1 ? '' : 's';
  return `${reading.command} reported ${registrations.length} outbound registration${plural}.`;
}

/**
 * The whole note for the Trunk authentication screen.
 *
 * `connected` decides whether there is any target to have read from. A disconnected
 * console still gets the structural sentence, because the missing partner channel is a
 * fact about this console rather than about any target — connecting one would not add a
 * single request to the inbox, and saying "no target is connected" alone would imply
 * otherwise.
 */
export function trunkAuthNote(readings: ViewReadings | undefined, connected: boolean, targetDetail: string): string {
  if (!connected) {
    return `${NO_PARTNER_CHANNEL} No target is connected either — ${targetDetail} — so this target's own trunk authentication has not been read.`;
  }
  const parts = [trunkAuthSummary(readings), trunkRegistrationSummary(readings)].filter((part) => part.length > 0);
  if (parts.length === 0) return `${NO_PARTNER_CHANNEL} Reading this target's trunk authentication…`;
  return `${parts.join(' ')} ${NO_PARTNER_CHANNEL}`;
}

/*
 * Deliberately not written here: a function feeding the design's "Answer history" grid
 * from the auth objects. That grid's four bound fields are `partner`, `what`, `answer` and
 * `when`, sitting under a heading that reads "Answer history" — so a row in it claims a
 * partner asked something and this console answered. An auth object is neither a partner
 * nor an answer, and putting one there would be the same defect the sample rows this
 * project removed already were: real-looking content under a label it does not belong to.
 * The auth reading reaches this screen through `trunkAuthNote` instead, where the sentence
 * can say exactly what it is.
 */
