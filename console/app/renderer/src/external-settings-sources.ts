/**
 * Settings whose value comes from somewhere else: an HTTPS API, or a Home Assistant
 * boolean entity.
 *
 * This is the half of scheduled settings that reaches outside the machine, and it is
 * written defensively because a settings value that arrives over the network is an input
 * from a system nobody in this console controls.
 *
 * Four rules, each guarding a failure that is quiet rather than loud:
 *
 *  - A REMOTE VALUE NEVER BECOMES THE BASE. It is an override for as long as the source
 *    says so, and the person's own setting is what returns when it stops. Persisting one
 *    would mean a server changing somebody's console permanently by answering once.
 *  - AN OLDER ANSWER NEVER OVERWRITES A NEWER ONE. Every fetch carries a generation, and
 *    a response whose generation is stale is dropped. Without it a slow reply from the
 *    previous poll lands after a fast one and the setting flips back with nothing to
 *    explain it.
 *  - THE URL IS CHECKED BEFORE IT IS USED. HTTPS only, except an explicitly bounded
 *    loopback development route; no credentials in the URL, because a URL reaches logs
 *    and error messages; and no redirects followed, since a redirect is the far end
 *    choosing a destination this console never validated.
 *  - ONLY ALLOWLISTED FIELDS ARE READ. A response may say anything; what it is permitted
 *    to change is decided here, not there.
 *
 * NO TOKEN LIVES IN A SOURCE. A source names a vault key, the same asymmetry the forge
 * accounts and the IAX secret use, so a configured source can be exported or shown
 * without carrying a credential with it.
 */

export type SourceKind = 'https-api' | 'home-assistant';

export interface ExternalSource {
  id: string;
  kind: SourceKind;
  /** Absolute URL. Validated by `validateSourceUrl` before any use. */
  url: string;
  /** Names the OS credential vault entry. Never the token. */
  credentialKey?: string;
  /** For `home-assistant`: the boolean entity whose state drives the rule. */
  entityId?: string;
  /** Setting keys this source may set. A key absent here is ignored however it arrives. */
  allowedKeys: readonly string[];
}

export const MAX_RESPONSE_BYTES = 64 * 1024;
export const REQUEST_TIMEOUT_MS = 5_000;
/** Bounded so a source cannot be polled into a denial of service against itself. */
export const MIN_REFRESH_MS = 30_000;

export interface UrlProblem {
  message: string;
}

/**
 * Validates a source URL before anything is fetched from it.
 *
 * Loopback over plain HTTP is permitted as an explicitly bounded development route and
 * nothing else is: an http:// URL to anywhere else sends whatever token accompanies it
 * across the network in the clear.
 */
export function validateSourceUrl(raw: string): UrlProblem[] {
  const value = raw.trim();
  if (value === '') return [{ message: 'The source needs a URL.' }];

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return [{ message: `"${value}" is not a URL.` }];
  }

  const problems: UrlProblem[] = [];
  const loopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]';
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) {
    problems.push({
      message: 'Sources must use HTTPS. Plain HTTP is allowed only for loopback while developing, '
        + 'because anything else sends the token with it in the clear.',
    });
  }
  if (url.username !== '' || url.password !== '') {
    /* A URL reaches logs, error messages and the settings surface itself. */
    problems.push({ message: 'Credentials cannot go in the URL. Store them separately.' });
  }
  return problems;
}

export interface FetchAttempt {
  /** Increments per poll. A response carrying an older one is dropped. */
  generation: number;
  status: number;
  /** Raw body, already size-capped by the caller. */
  body: string;
  /** True when the transport followed a redirect, which is refused. */
  redirected: boolean;
  byteLength: number;
}

export type ApplyOutcome =
  | { applied: Record<string, string>; }
  | { rejected: string };

export function isRejected(outcome: ApplyOutcome): outcome is { rejected: string } {
  return 'rejected' in outcome;
}

/**
 * Turns one response into the settings it is allowed to change, or says why it cannot.
 *
 * Every rejection is a string a person can read, because a source that has quietly
 * stopped working is worse than one that never worked -- the settings simply stop
 * tracking and nothing says so.
 */
export function applyResponse(
  source: ExternalSource,
  attempt: FetchAttempt,
  currentGeneration: number,
): ApplyOutcome {
  if (attempt.generation < currentGeneration) {
    /* A slow reply from the previous poll landing after a fast one would flip the setting
     * back with nothing to explain it. */
    return { rejected: 'A stale answer arrived after a newer one and was dropped.' };
  }
  if (attempt.redirected) {
    return { rejected: 'The source redirected. A redirect is the far end choosing a destination this console never checked, so it is refused.' };
  }
  if (attempt.byteLength > MAX_RESPONSE_BYTES) {
    return { rejected: `The response was larger than ${MAX_RESPONSE_BYTES} bytes and was not read.` };
  }
  if (attempt.status < 200 || attempt.status >= 300) {
    return { rejected: `The source answered ${attempt.status}. The previous values are still in effect.` };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(attempt.body);
  } catch {
    return { rejected: 'The source did not answer with JSON. The previous values are still in effect.' };
  }

  if (source.kind === 'home-assistant') return applyHomeAssistant(source, parsed);
  return applyHttpsApi(source, parsed);
}

/** Home Assistant answers with a `state` of `on` or `off` for the named entity. */
function applyHomeAssistant(source: ExternalSource, parsed: unknown): ApplyOutcome {
  const record = parsed as { entity_id?: unknown; state?: unknown };
  if (source.entityId !== undefined && record.entity_id !== source.entityId) {
    return { rejected: `The answer described ${String(record.entity_id)} rather than ${source.entityId}.` };
  }
  if (record.state !== 'on' && record.state !== 'off') {
    return { rejected: `A boolean entity must be on or off; this answered "${String(record.state)}".` };
  }
  /* `off` is not a failure: it means this source's rule simply does not apply, and the
   * person's own values stay in effect. */
  if (record.state === 'off') return { applied: {} };
  return { applied: Object.fromEntries(source.allowedKeys.map((key) => [key, 'on'])) };
}

function applyHttpsApi(source: ExternalSource, parsed: unknown): ApplyOutcome {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { rejected: 'The source answered something other than a settings object.' };
  }
  const body = parsed as Record<string, unknown>;
  const applied: Record<string, string> = {};
  for (const key of source.allowedKeys) {
    const value = body[key];
    /* Strings only. A number or an object would have to be coerced, and a coercion here
     * is this console deciding what a remote system meant. */
    if (typeof value === 'string') applied[key] = value;
  }
  return { applied };
}

/**
 * Whether a refresh interval is usable.
 *
 * Floored rather than accepted as given: a source polled every second is a denial of
 * service this console would be committing against somebody else's server.
 */
export function validateRefresh(intervalMs: number): UrlProblem[] {
  if (!Number.isFinite(intervalMs) || intervalMs < MIN_REFRESH_MS) {
    return [{ message: `Refresh no more often than every ${MIN_REFRESH_MS / 1000} seconds.` }];
  }
  return [];
}

/**
 * What to keep when a source cannot be reached.
 *
 * Always the last known good values, never nothing: a source going offline must not
 * silently reset somebody's console to defaults, and it must never write its last answer
 * into the base either.
 */
export function onSourceUnavailable(
  lastGood: Readonly<Record<string, string>>,
  reason: string,
): { values: Record<string, string>; notice: string } {
  return {
    values: { ...lastGood },
    notice: `${reason} The values already in effect are being kept, and your own settings are unchanged underneath them.`,
  };
}
