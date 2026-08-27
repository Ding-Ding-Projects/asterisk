/**
 * School mode.
 *
 * One shared switch that forces English and makes every Cantonese, bilingual,
 * funny-level, personal-vocabulary and dim-sum capability behave as if NOT INSTALLED --
 * their controls, copy, labels, search results and references are omitted from every
 * surface while it is on, not merely disabled or greyed out. A discoverable control that
 * does nothing is worse than an absent one: it invites a tap, and then explains itself in
 * front of whoever the mode was switched on for.
 *
 * Three properties carry the whole design:
 *
 *  - NOTHING IS DESTROYED. The language, funny-level and vocabulary a person had chosen
 *    stay exactly where they were in their own storage; this module never writes to it.
 *    Hiding is a read-time filter, so turning the mode off is not a restore of anything
 *    -- there was never anything to restore, because nothing was ever taken away. The
 *    `effective*` functions below exist to prove that in one place: they compute what a
 *    surface should show from the real stored value plus the switch, and they leave the
 *    stored value itself untouched either way.
 *  - IT IS A UX LOCK, NOT A SECURITY BOUNDARY. Deleting the shared local application-data
 *    record resets it -- credential, chosen name and all -- and the app says so rather
 *    than claiming protection it cannot back up. `HONESTY_NOTICE` exists precisely so a
 *    test can hold the app to actually saying it, rather than trusting a comment.
 *  - THE SHIPPED NAME NEVER LEAKS AFTER A RENAME. Every function here that produces
 *    user-facing text reads the chosen name from storage; none of them may fall back to
 *    printing the literal "School mode" once a different name has been set, in any
 *    label, description, search result or accessible name.
 *
 * Turning the mode ON needs nothing but the switch. Turning it OFF needs a locally
 * verified credential -- a PIN, a password, or a passkey assertion the caller already
 * confirmed through the platform's own ceremony and is handing in as an opaque value.
 * That asymmetry is deliberate: a mode meant to make a shared machine boring for a while
 * should be easy to start and require a real answer to stop.
 */

export interface SchoolModeStorage {
  getItem(key: string): string | null | undefined;
  setItem(key: string, value: string): void;
}

const KEY_ACTIVE = 'console.schoolMode.active';
const KEY_NAME = 'console.schoolMode.name';
const KEY_CRED_METHOD = 'console.schoolMode.credentialMethod';
const KEY_CRED_HASH = 'console.schoolMode.credentialHash';

/** The name shown until somebody renames it. Never printed once they have. */
export const SHIPPED_NAME = 'School mode';

export const MIN_NAME_LENGTH = 1;
export const MAX_NAME_LENGTH = 60;

/**
 * Every capability that must vanish, not just grey out, while the mode is on.
 *
 * Kept as data rather than scattered conditionals so a newly added Cantonese-adjacent
 * capability has one list to join -- and so the "omitted, not disabled" test below has
 * something exhaustive to iterate rather than a hand-picked example.
 */
export const HIDDEN_CAPABILITIES = [
  'language.cantonese',
  'language.bilingual',
  'funnyLevel.english',
  'funnyLevel.cantonese',
  'personalVocabulary',
  'dimSum',
] as const;
export type HiddenCapability = (typeof HIDDEN_CAPABILITIES)[number];

export function isHiddenCapability(value: unknown): value is HiddenCapability {
  return typeof value === 'string' && (HIDDEN_CAPABILITIES as readonly string[]).includes(value);
}

/**
 * This is a UX lock, never a security boundary. Kept as an exported constant, not a
 * comment, so a test can require the app to actually say it rather than trusting that
 * whoever wrote the settings screen remembered to.
 */
export const HONESTY_NOTICE =
  'This is a convenience lock, not a security boundary. Deleting the shared local ' +
  'application-data record turns it off and forgets the chosen name and credential.';

/** Off by default. A mode that switches itself on has decided something about the user it has no standing to decide. */
export function schoolModeActive(storage: SchoolModeStorage | undefined): boolean {
  return storage?.getItem(KEY_ACTIVE) === 'on';
}

/** Turning it on needs nothing but the switch -- no credential required to start it. */
export function activateSchoolMode(storage: SchoolModeStorage): void {
  storage.setItem(KEY_ACTIVE, 'on');
}

export interface UnlockResult {
  ok: boolean;
  reason?: string;
}

/**
 * Turning it off needs a locally verified credential.
 *
 * Fails closed when no credential was ever set -- there being nothing to check against
 * is not an excuse to let the switch through, the same as any other lock in this app.
 * Already-off is treated as a no-op success rather than demanding a credential for
 * nothing to undo.
 */
export function deactivateSchoolMode(storage: SchoolModeStorage, providedSecret: string): UnlockResult {
  if (!schoolModeActive(storage)) return { ok: true };
  if (!hasCredential(storage)) return { ok: false, reason: 'no credential has been set for it yet' };
  if (!verifyCredential(storage, providedSecret)) return { ok: false, reason: 'credential did not match' };
  storage.setItem(KEY_ACTIVE, 'off');
  return { ok: true };
}

/** An unset or blank stored name reads as the shipped default, exactly as an unset switch reads as off. */
export function schoolModeName(storage: SchoolModeStorage | undefined): string {
  const stored = storage?.getItem(KEY_NAME)?.trim();
  return stored ? stored : SHIPPED_NAME;
}

export interface RenameResult {
  ok: boolean;
  name?: string;
  reason?: string;
}

export function validateName(name: string): RenameResult {
  const trimmed = name.trim();
  if (trimmed.length < MIN_NAME_LENGTH) return { ok: false, reason: 'the name is empty' };
  if (trimmed.length > MAX_NAME_LENGTH) return { ok: false, reason: `the name is longer than ${MAX_NAME_LENGTH} characters` };
  return { ok: true, name: trimmed };
}

export function renameSchoolMode(storage: SchoolModeStorage, name: string): RenameResult {
  const result = validateName(name);
  if (result.ok && result.name !== undefined) storage.setItem(KEY_NAME, result.name);
  return result;
}

/** Whether a capability's controls, copy and search entries may appear at all right now. */
export function capabilityVisible(storage: SchoolModeStorage | undefined, _capability: HiddenCapability): boolean {
  return !schoolModeActive(storage);
}

/**
 * The general shape every surface uses: filter a list of results, labels or menu
 * entries down to what may actually appear. `capabilityOf` returns `null` for an item
 * that names no hidden capability, which always stays. This OMITS matches, it does not
 * mark them disabled -- the returned array is simply shorter, because a control that is
 * present and does nothing is worse than one that was never rendered.
 */
export function filterVisibleCapabilities<T>(
  storage: SchoolModeStorage | undefined,
  items: readonly T[],
  capabilityOf: (item: T) => HiddenCapability | null,
): T[] {
  return items.filter((item) => {
    const capability = capabilityOf(item);
    return capability === null || capabilityVisible(storage, capability);
  });
}

export type LanguageMode = 'english' | 'cantonese' | 'bilingual';

/**
 * What a surface should actually render for the language setting.
 *
 * Takes the real stored value as a plain argument and never touches storage itself --
 * the caller's language preference is never written to, read for mutation, or cleared
 * here. While the mode is on this always answers "english" regardless of what was
 * stored; the moment it is off, the caller's own value passes straight through
 * unchanged, which is what "retained" means in practice rather than in a comment.
 */
export function effectiveLanguageMode(storage: SchoolModeStorage | undefined, stored: LanguageMode): LanguageMode {
  return schoolModeActive(storage) ? 'english' : stored;
}

export type FunnyLevel = 1 | 2 | 3 | 4 | 5;

/** Same contract as {@link effectiveLanguageMode}, for the funny-level sliders. */
export function effectiveFunnyLevel(storage: SchoolModeStorage | undefined, stored: FunnyLevel): FunnyLevel {
  return schoolModeActive(storage) ? 1 : stored;
}

export type CredentialMethod = 'pin' | 'password' | 'passkey';

/**
 * A small deterministic digest, deliberately not a real cryptographic hash.
 *
 * `HONESTY_NOTICE` says plainly that this is a UX lock and not a security boundary, and
 * the credential storage matches that claim rather than contradicting it with a strong
 * hash nobody should trust to guard anything real. What it still buys: the plaintext
 * secret is never the thing sitting in storage, and two different secrets essentially
 * never collide by accident.
 */
function pureDigest(input: string): string {
  let forward = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    forward ^= input.charCodeAt(i);
    forward = Math.imul(forward, 0x01000193);
  }
  let backward = 0x9e3779b9;
  for (let i = input.length - 1; i >= 0; i -= 1) {
    backward ^= input.charCodeAt(i);
    backward = Math.imul(backward, 0x85ebca6b);
  }
  return (forward >>> 0).toString(16).padStart(8, '0') + (backward >>> 0).toString(16).padStart(8, '0');
}

function credentialDigest(method: CredentialMethod, secret: string): string {
  return pureDigest(`${method}:${secret}`);
}

function readCredentialMethod(storage: SchoolModeStorage | undefined): CredentialMethod | undefined {
  const raw = storage?.getItem(KEY_CRED_METHOD);
  return raw === 'pin' || raw === 'password' || raw === 'passkey' ? raw : undefined;
}

export function setCredential(storage: SchoolModeStorage, method: CredentialMethod, secret: string): void {
  storage.setItem(KEY_CRED_METHOD, method);
  storage.setItem(KEY_CRED_HASH, credentialDigest(method, secret));
}

export function hasCredential(storage: SchoolModeStorage | undefined): boolean {
  return !!storage?.getItem(KEY_CRED_HASH) && readCredentialMethod(storage) !== undefined;
}

export function credentialMethod(storage: SchoolModeStorage | undefined): CredentialMethod | undefined {
  return readCredentialMethod(storage);
}

/**
 * Never reports a credential's length or composition -- the return is a plain boolean
 * and nothing else, exactly as the contract requires. A caller that wants to know why a
 * check failed gets that from {@link deactivateSchoolMode}'s `reason`, which never
 * mentions the secret either.
 */
export function verifyCredential(storage: SchoolModeStorage | undefined, secret: string): boolean {
  const method = readCredentialMethod(storage);
  if (!method) return false;
  return storage?.getItem(KEY_CRED_HASH) === credentialDigest(method, secret);
}

/** The mode's own entry for a settings search or command palette -- it must stay discoverable even while it is active. */
export function schoolModeDescriptor(storage: SchoolModeStorage | undefined): { label: string; help: string } {
  const name = schoolModeName(storage);
  return {
    label: name,
    help: `Forces English and hides Cantonese, bilingual, funny-level, personal-vocabulary and dim-sum features while ${name} is on.`,
  };
}

const METHOD_PHRASE: Record<CredentialMethod, string> = {
  pin: 'the PIN set for it',
  password: 'the password set for it',
  passkey: 'the passkey set for it',
};

/**
 * Why the switch will not turn off right now, in words that name the chosen mode name
 * and the unlock route -- never the shipped name, and never a bare "access denied".
 */
export function lockedOffExplanation(storage: SchoolModeStorage | undefined): string {
  const name = schoolModeName(storage);
  const method = readCredentialMethod(storage);
  const route = method ? METHOD_PHRASE[method] : 'a credential that has not been set yet';
  return `${name} is on. Turning it off needs ${route}.`;
}
