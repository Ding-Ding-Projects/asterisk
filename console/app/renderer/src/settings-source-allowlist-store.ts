/**
 * The renderer's side of the settings-source host allowlist: add a host, remove a
 * host, and say what is currently allowed -- backed by the same durable storage
 * (`durable-storage.ts`) every other renderer setting persists through.
 *
 * The validation itself lives in `control-plane/settings-source-allowlist.ts`, pure and
 * shared with the main process rather than restated here, so a host this screen accepts
 * is guaranteed to be exactly the shape `SettingsSourceFetcher` will actually compare
 * against -- the two sides cannot quietly drift apart because there is only one rule.
 *
 * The list this module reads and writes takes effect on the NEXT restart, not live: the
 * fetcher in the privileged process builds its allowlist once, at construction, from
 * whatever this key holds at that moment. `sourceAllowlistStatusLine` below says that
 * plainly, so the screen never implies a change reaches a source that is already
 * mid-poll.
 */
import {
  SETTINGS_SOURCE_ALLOWLIST_KEY, normalizeHost, parseAllowlist, serializeAllowlist,
  validateAllowlistHost, type AllowlistProblem,
} from '../../../control-plane/settings-source-allowlist';

export interface AllowlistStorage {
  getItem(key: string): string | null | undefined;
  setItem(key: string, value: string): void;
}

export function loadAllowlist(storage: AllowlistStorage | undefined): string[] {
  return parseAllowlist(storage?.getItem(SETTINGS_SOURCE_ALLOWLIST_KEY) ?? undefined);
}

function saveAllowlist(storage: AllowlistStorage, hosts: readonly string[]): void {
  storage.setItem(SETTINGS_SOURCE_ALLOWLIST_KEY, serializeAllowlist(hosts));
}

export type AllowlistAddResult =
  | { ok: true; host: string }
  | { ok: false; problems: AllowlistProblem[] };

/**
 * Adds a host, or says every reason it cannot be added.
 *
 * An exact duplicate is refused too (a distinct message, not silently treated as
 * success), because "add" that changes nothing while reporting success would be exactly
 * the kind of decorative control this project refuses to ship elsewhere.
 */
export function addAllowlistHost(storage: AllowlistStorage, raw: string): AllowlistAddResult {
  const problems = validateAllowlistHost(raw);
  if (problems.length > 0) return { ok: false, problems };
  const host = normalizeHost(raw);
  const existing = loadAllowlist(storage);
  if (existing.includes(host)) {
    return { ok: false, problems: [{ message: `${host} is already allowed.` }] };
  }
  saveAllowlist(storage, [...existing, host]);
  return { ok: true, host };
}

export type AllowlistRemoveResult =
  | { ok: true; host: string }
  | { ok: false; problems: AllowlistProblem[] };

/** Removes a host, or says why it cannot be removed -- distinct from silently doing
 *  nothing when the typed value was never on the list in the first place. */
export function removeAllowlistHost(storage: AllowlistStorage, raw: string): AllowlistRemoveResult {
  const problems = validateAllowlistHost(raw);
  if (problems.length > 0) return { ok: false, problems };
  const host = normalizeHost(raw);
  const existing = loadAllowlist(storage);
  if (!existing.includes(host)) {
    return { ok: false, problems: [{ message: `${host} was not on the allowed list.` }] };
  }
  saveAllowlist(storage, existing.filter((entry) => entry !== host));
  return { ok: true, host };
}

/**
 * What the allowlist screen shows underneath the two actions above.
 *
 * An empty list reads as a deliberate state -- "every external settings source is
 * refused until you allow one" -- rather than as a blank field that looks like the
 * feature forgot to load anything.
 */
export function sourceAllowlistStatusLine(hosts: readonly string[]): string {
  if (hosts.length === 0) {
    return 'No hosts are allowed yet -- every external settings source is refused until you add one. Changes take effect after a restart.';
  }
  return `Allowed after the next restart: ${hosts.join(', ')}.`;
}
