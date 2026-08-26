/**
 * Taking a secret out of a control and leaving nothing behind.
 *
 * The console has no credential dialog, so a PIN or password has to be typed into an
 * ordinary bound control -- and a bound control's value lives in the component's `values`
 * map, which is walked by exports, by the appearance and settings surfaces, by any debug
 * dump, and by anything that screenshots the state. A secret that merely sits there has
 * already left through several doors.
 *
 * So a credential control is never read like other controls. It is CONSUMED: the value is
 * taken and the field is blanked in the same step, so the window in which the secret
 * exists in component state is one call long. That is the difference between this module
 * and `values[id]`, and it is the entire reason it exists as a function rather than a
 * convention somebody has to remember.
 *
 * The alternative attempted first was `window.prompt`, which Electron does not implement
 * -- it would have thrown at runtime, and no unit test would have caught it because the
 * tests do not run in Electron.
 */

export interface Consumed {
  /** The secret, or undefined when the field was empty. Never stored anywhere by this module. */
  secret?: string;
  /** The values map with the credential field blanked, to be set back onto the component. */
  values: Record<string, unknown>;
}

/**
 * Takes the secret out and blanks the field.
 *
 * The field is set to an empty string rather than deleted, because the control is bound
 * and a missing key makes it fall back to the design's own default -- which for a text
 * control is an empty string anyway, but by a route that briefly renders as uncontrolled.
 */
export function consumeCredential(
  values: Readonly<Record<string, unknown>>,
  fieldId: string,
): Consumed {
  const raw = values[fieldId];
  const secret = typeof raw === 'string' && raw !== '' ? raw : undefined;
  return { secret, values: { ...values, [fieldId]: '' } };
}

/**
 * Whether any value in a map still holds the secret.
 *
 * Exists so a test can assert the absence directly rather than inferring it from the one
 * field it expects to have been cleared. A secret copied into a second key by some later
 * change would satisfy the narrow check and fail this one.
 */
export function retainsSecret(values: Readonly<Record<string, unknown>>, secret: string): boolean {
  if (secret === '') return false;
  return Object.values(values).some(
    (value) => typeof value === 'string' && value.includes(secret),
  );
}

/**
 * What to show after an attempt. Never says anything about the stored credential.
 *
 * A message that distinguishes "no credential is set" from "that was the wrong one" tells
 * an attacker which of the two they are facing, and a message quoting what was typed puts
 * the attempt into whatever log or toast history the message reaches.
 */
export function attemptMessage(outcome: 'accepted' | 'rejected' | 'missing', modeName: string): string {
  switch (outcome) {
    case 'accepted':
      return `${modeName} is off. Your own settings are back.`;
    case 'missing':
      return `No unlock credential has been set for ${modeName}. Delete the shared local application-data record to reset it.`;
    default:
      return `That did not unlock ${modeName}. Nothing has changed.`;
  }
}
