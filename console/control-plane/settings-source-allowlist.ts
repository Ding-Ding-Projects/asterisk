/**
 * The other half of `settings-source-fetcher.ts`: a persisted, user-owned list of
 * hosts an external settings source is allowed to reach.
 *
 * `SettingsSourceFetcher` refuses any host that is not on its allowlist, and it is
 * built with no default allowlist of its own -- see its own header comment for why
 * that direction is deliberate: refusing everything is safe, permitting everything
 * is not, and the empty default must never be widened to make the feature "work".
 * What was missing until this file existed was the other half: a way for a person to
 * deliberately add a host they trust, persisted across a restart, so the allowlist
 * that reaches the fetcher is theirs rather than permanently empty.
 *
 * This module is pure -- no filesystem, no Electron, no network -- so it is usable
 * from both the main process (`control-plane/dispatch.ts`, which persists the
 * allowlist through the same `SettingsRegistry` every other durable renderer setting
 * uses) and the renderer (the settings-sources screen, which reads and writes the
 * same key through its own durable storage seam). One validation rule lives here
 * rather than in two places that could quietly drift apart.
 */

/** The key this allowlist is stored under in the shared settings snapshot -- the same
 *  `console.setting.*`-style flat string store `durable-storage.ts` and
 *  `control-plane/settings-store.ts` already persist every other renderer setting
 *  through. */
export const SETTINGS_SOURCE_ALLOWLIST_KEY = 'console.settingsSourceAllowlist';

export interface AllowlistProblem {
  message: string;
}

/** A hostname compares case-insensitively -- `SettingsSourceFetcher` already lowercases
 *  on the way in, so the stored value is normalised the same way rather than trusting
 *  every caller to remember to. */
export function normalizeHost(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Validates one host before it is added to the allowlist.
 *
 * Refuses everything that would widen the allowlist beyond one exact host: a blank
 * value, whitespace inside it, a wildcard, and anything URL-shaped -- a scheme, a
 * path, a query, a fragment, credentials, or a port. A host that survives this check
 * is exactly one hostname and nothing else, which is the one thing
 * `SettingsSourceFetcher.allows()` actually compares against.
 */
export function validateAllowlistHost(raw: string): AllowlistProblem[] {
  const value = raw.trim();
  if (value === '') {
    return [{ message: 'A host cannot be empty.' }];
  }
  if (/\s/u.test(value)) {
    return [{ message: 'A host cannot contain whitespace.' }];
  }
  if (value.includes('*')) {
    return [{ message: 'A wildcard is not a host. Add each host you trust by its exact name, e.g. "settings.example.net".' }];
  }
  if (value.includes('://') || value.includes('/') || value.includes('?') || value.includes('#')
    || value.includes('@') || value.includes(':')) {
    return [{ message: `"${raw}" is not a plain hostname -- enter a host only, with no scheme, path, port, or credentials, e.g. "settings.example.net".` }];
  }
  try {
    const parsed = new URL(`https://${value}`);
    /* A round trip through the URL parser: the hostname it reports back must be
     * exactly what was typed (case aside) and it must have consumed nothing else,
     * or the value was not a bare hostname to begin with. */
    if (parsed.hostname !== value.toLowerCase() || parsed.pathname !== '/' || parsed.search !== '' || parsed.hash !== '') {
      return [{ message: `"${raw}" is not a valid hostname.` }];
    }
  } catch {
    return [{ message: `"${raw}" is not a valid hostname.` }];
  }
  return [];
}

/**
 * Parses a persisted allowlist snapshot value into a clean host list.
 *
 * Treated as untrusted input on the way back in, exactly like every other stored
 * source in this console: the file is plain JSON on disk and may have been edited by
 * hand or written by an older version, so a malformed or invalid entry is DROPPED
 * rather than loaded. Loading an invalid host here would hand it straight to
 * `SettingsSourceFetcher`, which trusts its allowlist completely -- this is the one
 * place standing between "somebody edited settings.json" and a host that was never
 * actually agreed to.
 */
export function parseAllowlist(raw: string | undefined): string[] {
  if (typeof raw !== 'string' || raw === '') return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const hosts: string[] = [];
  for (const candidate of parsed) {
    if (typeof candidate !== 'string') continue;
    const host = normalizeHost(candidate);
    if (validateAllowlistHost(host).length > 0) continue;
    if (!hosts.includes(host)) hosts.push(host);
  }
  return hosts;
}

export function serializeAllowlist(hosts: readonly string[]): string {
  return JSON.stringify(hosts);
}
