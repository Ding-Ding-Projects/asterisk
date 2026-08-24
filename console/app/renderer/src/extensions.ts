/**
 * The extension record: numbering, identity and the validation around both.
 *
 * FreePBX presents an extension as one thing with a number, a display name and an
 * outbound caller ID. Asterisk has no such record. The number is a pjsip.conf section
 * name, and the display name and outbound caller ID are two halves of ONE `callerid`
 * key -- `callerid=My Name <8005551212>` (pjsip.conf.sample line 597). Editing either
 * half separately means composing and decomposing that string, and getting it wrong in
 * either direction silently rewrites the other half.
 *
 * So this module owns three things the endpoint editor beside it deliberately does not:
 * composing and parsing `callerid`, choosing the next free extension number, and the
 * numbering rules a site sets. Everything here is pure -- no I/O, no Electron -- so the
 * validation can be exercised directly rather than through a screen.
 *
 * Covers CORE-EXT-011, CORE-EXT-015, CORE-EXT-QC-002, -004 and -005.
 */
import { parsePjsip } from '../../../control-plane/subsystem-models';
import type { ConfigValue } from './configuration';

/**
 * Core's own documented ceiling, mirrored from the control plane rather than guessed.
 * The model already refuses a saved value above this; the create path has to refuse it
 * too, or the wizard writes a config the validator will then reject.
 */
export const MAX_CONTACTS_CEILING = 100;

/** A site's numbering plan. FreePBX lets an administrator set this; the defaults here
 *  are a conventional three-digit internal range rather than anything Asterisk imposes. */
export interface ExtensionRange {
  from: number;
  to: number;
}

export const DEFAULT_EXTENSION_RANGE: ExtensionRange = { from: 1000, to: 1999 };

/** A caller ID split into the two halves the interface edits separately. */
export interface CallerIdParts {
  displayName?: string;
  number?: string;
}

/* `callerid=My Name <8005551212>`. The angle brackets are what separates the halves;
 * a bare value with no brackets is the display name, because that is how Asterisk reads
 * it and guessing otherwise would silently turn somebody's name into a phone number. */
const CALLERID_PATTERN = /^\s*"?(?<name>[^"<]*?)"?\s*(?:<(?<number>[^>]*)>)?\s*$/u;

export function parseCallerId(value: string | undefined): CallerIdParts {
  /* Always both keys, never a bare {}. An early return of {} and a regex miss returning
   * two undefineds are the same thing to a reader and different things to a deep
   * comparison, which is exactly the inconsistency a caller would trip over once. */
  if (value === undefined) return { displayName: undefined, number: undefined };
  const match = CALLERID_PATTERN.exec(value);
  if (!match?.groups) return { displayName: value.trim() || undefined, number: undefined };
  const displayName = match.groups.name?.trim() || undefined;
  const number = match.groups.number?.trim() || undefined;
  return { displayName, number };
}

/**
 * Composes the two halves back into one key.
 *
 * Returns undefined when both halves are empty, so an untouched pair writes nothing
 * rather than an empty `callerid=` line that overrides an inherited value with nothing.
 * A display name is quoted only when it needs to be, matching how the sample writes it.
 */
export function formatCallerId(parts: CallerIdParts): string | undefined {
  const name = parts.displayName?.trim();
  const number = parts.number?.trim();
  if (!name && !number) return undefined;
  const quoted = name && /[<>",]/u.test(name) ? `"${name.replace(/"/gu, '')}"` : name;
  if (quoted && number) return `${quoted} <${number}>`;
  if (number) return `<${number}>`;
  return quoted;
}

export interface ValidationProblem {
  field: 'extension' | 'displayName' | 'callerIdNumber' | 'maxContacts';
  message: string;
}

/** Extension numbers Asterisk can actually use as a section name and a dialled string. */
const EXTENSION_PATTERN = /^[0-9]+$/u;

/**
 * Validates a proposed extension number against the file and the site's range.
 *
 * Every problem is returned rather than only the first, so somebody fixing a form is
 * not sent round the loop once per mistake.
 */
export function validateExtension(
  existing: ConfigValue,
  candidate: string,
  range: ExtensionRange = DEFAULT_EXTENSION_RANGE,
): ValidationProblem[] {
  const problems: ValidationProblem[] = [];
  const value = candidate.trim();
  if (!value) {
    problems.push({ field: 'extension', message: 'An extension needs a number.' });
    return problems;
  }
  if (!EXTENSION_PATTERN.test(value)) {
    problems.push({
      field: 'extension',
      message: `"${value}" is not a number. An extension has to be dialable, so digits only.`,
    });
    return problems;
  }
  const numeric = Number(value);
  if (numeric < range.from || numeric > range.to) {
    problems.push({
      field: 'extension',
      message: `${value} is outside this site's range of ${range.from} to ${range.to}.`,
    });
  }
  if (takenExtensions(existing).includes(value)) {
    problems.push({
      field: 'extension',
      message: `${value} is already on this target. Edit that extension instead, or choose another number.`,
    });
  }
  return problems;
}

/** Validates max_contacts against Core's ceiling, at create time as well as save time. */
export function validateMaxContacts(value: number): ValidationProblem[] {
  if (!Number.isInteger(value) || value < 0) {
    return [{ field: 'maxContacts', message: 'Maximum contacts has to be a whole number, zero or more.' }];
  }
  if (value > MAX_CONTACTS_CEILING) {
    return [{
      field: 'maxContacts',
      message: `Maximum contacts cannot exceed ${MAX_CONTACTS_CEILING}, which is the documented ceiling.`,
    }];
  }
  return [];
}

/** Validates the caller-ID number half. The display name is free text by design -- people
 *  have apostrophes and commas in their names -- but the number has to be dialable. */
export function validateCallerId(parts: CallerIdParts): ValidationProblem[] {
  const number = parts.number?.trim();
  if (number && !/^[0-9+*#]+$/u.test(number)) {
    return [{
      field: 'callerIdNumber',
      message: `"${number}" is not a dialable caller ID. Digits, and + * # where your provider allows them.`,
    }];
  }
  return [];
}

/** Every extension number already on the target, in file order. */
export function takenExtensions(existing: ConfigValue): string[] {
  return parsePjsip(existing).endpoints.map((endpoint) => endpoint.name);
}

/**
 * The next free number in the range, for pre-filling the create form.
 *
 * Returns undefined when the range is full rather than offering a number that cannot be
 * used -- a form pre-filled with a colliding value is worse than an empty one, because
 * it looks checked. Non-numeric section names are ignored rather than treated as zero.
 */
export function suggestNextExtension(
  existing: ConfigValue,
  range: ExtensionRange = DEFAULT_EXTENSION_RANGE,
): string | undefined {
  const taken = new Set(takenExtensions(existing));
  for (let candidate = range.from; candidate <= range.to; candidate += 1) {
    if (!taken.has(String(candidate))) return String(candidate);
  }
  return undefined;
}

export interface ExtensionIdentity {
  extension: string;
  displayName?: string;
  callerIdNumber?: string;
}

/** Reads one extension's identity back out of the target, for seeding an edit form. */
export function identityFor(existing: ConfigValue, extension: string): ExtensionIdentity | undefined {
  const endpoint = parsePjsip(existing).endpoints.find((candidate) => candidate.name === extension);
  if (!endpoint) return undefined;
  const parts = parseCallerId(endpoint.endpoint.callerid);
  return { extension, displayName: parts.displayName, callerIdNumber: parts.number };
}

/**
 * The `callerid` value for an identity, or undefined when neither half is set.
 *
 * The outbound caller ID defaults to the extension number when a display name is given
 * without one, which is what a caller would otherwise see as a missing number. It is a
 * default rather than a silent rewrite: passing a number keeps that number.
 */
export function callerIdFor(identity: ExtensionIdentity): string | undefined {
  const number = identity.callerIdNumber?.trim() || (identity.displayName?.trim() ? identity.extension : undefined);
  return formatCallerId({ displayName: identity.displayName, number });
}
