/**
 * A PJSIP outbound registration's own retry policy, in pjsip.conf.
 *
 * `parsePjsip` (control-plane/subsystem-models.ts) deliberately does not model
 * [registration] sections -- its own comment excludes them by name, alongside
 * [transport-udp], [global], [system] and ACLs, as object types the endpoint editor
 * has no business touching. That left the trunks screen's own "Failover" group
 * (t_retry/t_forbidden/t_fatal) with nowhere real to read from or write to: the
 * generic per-screen auto-read in App.tsx seeded it from whichever [registration]
 * section happened to be FIRST in the file, the same value regardless of which row
 * in the trunks table was clicked, and nothing ever saved it anywhere. This module
 * is the fix -- a named lookup and a named write, the same shape endpoint-edit.ts,
 * iax-peers.ts and trunk-advanced.ts already give their own screens.
 *
 * configs/samples/pjsip.conf.sample lines 1519-1552 are the [registration] template.
 * Every key here is read from and written to that exact template's own keys.
 */
import type { ConfigSection, ConfigValue } from './configuration';

/** The trunks screen's own retry-policy control ids, from the compiled design --
 *  the same ids CONTROL_BINDINGS.trunks already names in control-keys.ts, whose
 *  generic first-match seed this module's named lookup supersedes once a row has
 *  actually been picked. */
export const TRUNK_REG_CONTROLS = {
  retryInterval: 't_retry',
  forbiddenRetry: 't_forbidden',
  fatalRetries: 't_fatal',
} as const;

/**
 * Finds the [name] section declaring type=registration.
 *
 * Matching by name alone is not enough: pjsip.conf.sample lines 219-234's own
 * [mytrunk] registration example shares its bracket name with a same-named auth
 * and (by the "line"/"endpoint" keys immediately below it) an endpoint too, exactly
 * the way every endpoint/auth/aor trio in this file already shares one name across
 * several typed sections. `type=registration` (sample line 1552, "Must be of type
 * registration") is what tells the three apart.
 */
export function findRegistration(value: ConfigValue, name: string): ConfigSection | undefined {
  return value.find((section) => section.name === name
    && section.entries.some((entry) => entry.key === 'type' && entry.value === 'registration'));
}

/**
 * The endpoint this registration's incoming calls are routed to, when line support
 * is configured -- pjsip.conf.sample lines 1561-1564 ("endpoint=... this configured
 * endpoint name is used for incoming calls that are related to the outbound
 * registration"). Falling back to the registration's own name mirrors the same
 * shared-bracket-name convention every endpoint/auth/aor trio in this file already
 * uses, so a registration with no explicit endpoint= is still tried against a
 * same-named endpoint before the trunks screen's outbound-identity fields give up
 * entirely -- `onPickTrunkRow` in App.tsx only uses the result if `findEndpoint`
 * actually finds something there.
 */
export function registeredEndpointName(registration: ConfigSection): string {
  return registration.entries.find((entry) => entry.key === 'endpoint')?.value || registration.name;
}

/** Seeds the trunks screen's retry-policy controls from one registration section. */
export function controlValuesForRegistration(registration: ConfigSection): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  const put = (controlId: string, key: string) => {
    const raw = registration.entries.find((entry) => entry.key === key)?.value;
    if (raw === undefined) return;
    const parsed = Number(raw);
    if (!Number.isNaN(parsed)) values[controlId] = parsed;
  };
  put(TRUNK_REG_CONTROLS.retryInterval, 'retry_interval');
  put(TRUNK_REG_CONTROLS.forbiddenRetry, 'forbidden_retry_interval');
  put(TRUNK_REG_CONTROLS.fatalRetries, 'max_retries');
  return values;
}

export interface RegistrationEdit {
  value: ConfigValue;
  summary: string[];
}

/**
 * Writes the retry-policy controls back onto the named [registration] section,
 * creating it (type=registration, appended to the file) when this target has none
 * by that name yet -- the same "Save creates it" convention sla.conf's own trunk
 * editor already uses (App.tsx `onSaveSlaTrunk`), since a row the live table is
 * currently showing from `pjsip show registrations` but pjsip.conf itself does not
 * yet declare statically is a real state a target can be in, not a mistake to
 * refuse.
 *
 * Only the three retry keys are ever touched; every other entry the section already
 * had (server_uri, outbound_auth, client_uri and the rest) is preserved exactly.
 */
export function applyRegistrationControlValues(
  existing: ConfigValue,
  name: string,
  values: Record<string, unknown>,
): RegistrationEdit {
  const summary: string[] = [];
  const existingSection = findRegistration(existing, name);
  const entries = existingSection
    ? [...existingSection.entries]
    : [{ key: 'type', value: 'registration' }];

  const setNumber = (key: string, controlId: string, label: string) => {
    const raw = values[controlId];
    if (typeof raw !== 'number' || Number.isNaN(raw)) return;
    const next = String(raw);
    const idx = entries.findIndex((entry) => entry.key === key);
    const before = idx === -1 ? undefined : entries[idx].value;
    if (before === next) return;
    if (idx === -1) entries.push({ key, value: next });
    else entries[idx] = { key, value: next };
    summary.push(`pjsip.conf: [${name}] ${label} ${before ?? 'unset'} to ${next}`);
  };

  setNumber('retry_interval', TRUNK_REG_CONTROLS.retryInterval, 'retry_interval');
  setNumber('forbidden_retry_interval', TRUNK_REG_CONTROLS.forbiddenRetry, 'forbidden_retry_interval');
  setNumber('max_retries', TRUNK_REG_CONTROLS.fatalRetries, 'max_retries');

  if (summary.length === 0) return { value: existing, summary };

  const nextSection: ConfigSection = { name, entries };
  const value = existingSection
    ? existing.map((section) => (section === existingSection ? nextSection : section))
    : [...existing, nextSection];
  if (!existingSection) summary.unshift(`pjsip.conf: [${name}] registration section created.`);
  return { value, summary };
}
