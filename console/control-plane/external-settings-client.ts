/**
 * Privileged, injectable readers for scheduled settings sources.
 *
 * No caller-supplied URL reaches a request until the shared source validator
 * accepts it. Requests reject redirects, have a hard deadline, cap response
 * bytes before parsing, and never log bodies or vault material.
 */
import {
  EXTERNAL_REQUEST_TIMEOUT_MS,
  MAX_EXTERNAL_RESPONSE_BYTES,
  parseHomeAssistantBooleanResponse,
  parseHttpsApiResponse,
  validateExternalSource,
} from "../shared/external-settings.js";
import type {
  ExternalSettingsReading,
  ExternalSettingsSource,
  ExternalSettingsSourceKind,
} from "../shared/external-settings.js";

export type ExternalSettingsFailure =
  | 'offline'
  | 'auth-error'
  | 'rate-limited'
  | 'malformed'
  | 'timeout'
  | 'blocked'
  | 'stale'
  | 'cancelled'
  | 'failed';

export interface ExternalSettingsReadSuccess {
  readonly ok: true;
  readonly sourceKind: ExternalSettingsSourceKind;
  readonly reading: ExternalSettingsReading;
}

export interface ExternalSettingsReadFailure {
  readonly ok: false;
  readonly sourceKind: ExternalSettingsSourceKind;
  readonly status: ExternalSettingsFailure;
  /** Safe diagnostic only. It never includes a body, URL query, or token. */
  readonly reason: string;
}

export type ExternalSettingsReadResult = ExternalSettingsReadSuccess | ExternalSettingsReadFailure;

export interface VaultReferenceReader {
  /** Reads a token by reference. Implementations must keep the token in memory only. */
  read(reference: string, signal?: AbortSignal): Promise<string | undefined>;
}

export interface ExternalSettingsFetchResponse {
  readonly status: number;
  readonly redirected: boolean;
  readonly url: string;
  readonly headers: { get(name: string): string | null };
  readonly body: ReadableStream<Uint8Array> | null;
  text(): Promise<string>;
}

export type ExternalSettingsFetch = (
  input: string,
  init: { readonly method: 'GET'; readonly headers: Readonly<Record<string, string>>; readonly redirect: 'error'; readonly signal: AbortSignal },
) => Promise<ExternalSettingsFetchResponse>;

export interface ExternalSettingsHandler {
  read(source: ExternalSettingsSource, signal?: AbortSignal): Promise<ExternalSettingsReadResult>;
  cancel(): void;
}

export interface ExternalSettingsHandlerOptions {
  readonly fetch?: ExternalSettingsFetch;
  readonly vault?: VaultReferenceReader;
  readonly now?: () => Date;
  readonly timeoutMs?: number;
}

class ExpectedReadFailure extends Error {
  constructor(readonly status: ExternalSettingsFailure, message: string) {
    super(message);
    this.name = 'ExpectedReadFailure';
  }
}

class DeadlineExceeded extends Error {
  constructor() {
    super('External settings request exceeded its bounded deadline');
    this.name = 'DeadlineExceeded';
  }
}

function abortError(): DOMException {
  return new DOMException('External settings request cancelled', 'AbortError');
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw abortError();
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function sourceFailure(source: ExternalSettingsSource, status: ExternalSettingsFailure, reason: string): ExternalSettingsReadFailure {
  return { ok: false, sourceKind: source.kind, status, reason };
}

function responseStatus(status: number): ExternalSettingsFailure | undefined {
  if (status === 401 || status === 403) return 'auth-error';
  if (status === 408 || status === 504 || status >= 500) return 'offline';
  if (status === 429) return 'rate-limited';
  return undefined;
}

async function readBoundedBody(response: ExternalSettingsFetchResponse, signal: AbortSignal): Promise<string> {
  const contentLength = response.headers.get('content-length');
  if (contentLength !== null && (!/^\d+$/u.test(contentLength) || Number(contentLength) > MAX_EXTERNAL_RESPONSE_BYTES)) {
    throw new ExpectedReadFailure('malformed', 'External settings response is larger than the bounded response limit');
  }
  if (!response.body) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > MAX_EXTERNAL_RESPONSE_BYTES) {
      throw new ExpectedReadFailure('malformed', 'External settings response is larger than the bounded response limit');
    }
    return text;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      throwIfAborted(signal);
      const next = await reader.read();
      if (next.done) break;
      total += next.value.byteLength;
      if (total > MAX_EXTERNAL_RESPONSE_BYTES) {
        await reader.cancel('response limit exceeded');
        throw new ExpectedReadFailure('malformed', 'External settings response is larger than the bounded response limit');
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new ExpectedReadFailure('malformed', 'External settings response is not valid UTF-8');
  }
}

function withDeadline(signal: AbortSignal | undefined, timeoutMs: number): {
  readonly signal: AbortSignal;
  readonly finish: () => void;
} {
  const controller = new AbortController();
  const onAbort = () => controller.abort(signal?.reason ?? abortError());
  if (signal?.aborted) onAbort();
  else signal?.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(new DeadlineExceeded()), timeoutMs);
  return {
    signal: controller.signal,
    finish: () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    },
  };
}

function safeReason(error: unknown): string {
  if (error instanceof ExpectedReadFailure || error instanceof DeadlineExceeded) return error.message;
  // Fetch and vault implementations may include URLs, response fragments, or
  // credential-adjacent text in their exceptions. Do not reflect those details
  // into state that can cross into the renderer.
  if (error instanceof Error) return 'External settings request failed';
  return 'External settings request failed';
}

function combineUrl(baseUrl: string, path: string): string {
  const base = new URL(baseUrl);
  base.pathname = `${base.pathname.replace(/\/$/u, '')}/${path.replace(/^\//u, '')}`;
  base.search = '';
  base.hash = '';
  return base.toString();
}

async function fetchJson(
  source: ExternalSettingsSource,
  url: string,
  headers: Readonly<Record<string, string>>,
  fetcher: ExternalSettingsFetch,
  signal: AbortSignal | undefined,
  timeoutMs: number,
): Promise<{ readonly response: ExternalSettingsFetchResponse; readonly body: string }> {
  const bounded = withDeadline(signal, timeoutMs);
  try {
    throwIfAborted(bounded.signal);
    const response = await fetcher(url, { method: 'GET', headers, redirect: 'error', signal: bounded.signal });
    const responseUrl = response.url ? new URL(response.url).toString() : '';
    const requestedUrl = new URL(url).toString();
    if (response.redirected || (responseUrl !== '' && responseUrl !== requestedUrl)) {
      throw new ExpectedReadFailure('blocked', 'Redirects are not accepted for external settings');
    }
    const failure = responseStatus(response.status);
    if (failure) throw new ExpectedReadFailure(failure, `External settings source returned HTTP ${response.status}`);
    if (response.status < 200 || response.status >= 300) {
      throw new ExpectedReadFailure('failed', `External settings source returned HTTP ${response.status}`);
    }
    const body = await readBoundedBody(response, bounded.signal);
    return { response, body };
  } catch (error) {
    if (isAbortError(error) || signal?.aborted) throw abortError();
    if (bounded.signal.aborted && bounded.signal.reason instanceof DeadlineExceeded) throw bounded.signal.reason;
    throw error;
  } finally {
    bounded.finish();
  }
}

/** Creates the privileged reader. It performs no request until `read` is called. */
export function createExternalSettingsHandler(options: ExternalSettingsHandlerOptions = {}): ExternalSettingsHandler {
  const fetcher = options.fetch ?? (globalThis.fetch.bind(globalThis) as unknown as ExternalSettingsFetch);
  const now = options.now ?? (() => new Date());
  const timeoutMs = options.timeoutMs ?? EXTERNAL_REQUEST_TIMEOUT_MS;
  let activeController: AbortController | undefined;

  async function read(source: ExternalSettingsSource, signal?: AbortSignal): Promise<ExternalSettingsReadResult> {
    const validated = validateExternalSource(source);
    if (!validated.ok) return sourceFailure(source, 'blocked', validated.reason);
    const accepted = validated.source;
    const controller = new AbortController();
    activeController?.abort(abortError());
    activeController = controller;
    const forwardAbort = () => controller.abort(signal?.reason ?? abortError());
    if (signal?.aborted) forwardAbort();
    else signal?.addEventListener('abort', forwardAbort, { once: true });
    try {
      throwIfAborted(controller.signal);
      if (accepted.kind === 'local') {
        return {
          ok: true,
          sourceKind: accepted.kind,
          reading: { active: true, assignments: undefined, observedAt: now().toISOString() },
        };
      }
      if (accepted.kind === 'https-api') {
        const result = await fetchJson(accepted, accepted.endpoint, { Accept: 'application/json' }, fetcher, controller.signal, timeoutMs);
        const parsed = parseHttpsApiResponse(result.body);
        if (!parsed.ok) return sourceFailure(accepted, 'malformed', parsed.reason);
        const reading = { ...parsed.reading, observedAt: now().toISOString() };
        if (reading.expiresAt && Date.parse(reading.expiresAt) <= now().getTime()) {
          return sourceFailure(accepted, 'stale', 'External settings response is already expired');
        }
        return { ok: true, sourceKind: accepted.kind, reading };
      }
      if (!options.vault) return sourceFailure(accepted, 'blocked', 'Home Assistant requires a credential-vault reader');
      const token = await options.vault.read(accepted.vaultAccountKey, controller.signal);
      if (!token || token.length > 4096) return sourceFailure(accepted, 'auth-error', 'Home Assistant credential is unavailable');
      const endpoint = combineUrl(accepted.baseUrl, `api/states/${accepted.entityId}`);
      const result = await fetchJson(
        accepted,
        endpoint,
        { Accept: 'application/json', Authorization: `Bearer ${token}` },
        fetcher,
        controller.signal,
        timeoutMs,
      );
      const parsed = parseHomeAssistantBooleanResponse(result.body);
      if (!parsed.ok) return sourceFailure(accepted, 'malformed', parsed.reason);
      return {
        ok: true,
        sourceKind: accepted.kind,
        reading: { active: parsed.active, assignments: undefined, observedAt: now().toISOString() },
      };
    } catch (error) {
      if (error instanceof ExpectedReadFailure) return sourceFailure(accepted, error.status, error.message);
      if (error instanceof DeadlineExceeded) return sourceFailure(accepted, 'timeout', error.message);
      if (isAbortError(error) || controller.signal.aborted) return sourceFailure(accepted, 'cancelled', 'External settings refresh was cancelled');
      return sourceFailure(accepted, 'offline', safeReason(error));
    } finally {
      signal?.removeEventListener('abort', forwardAbort);
      if (activeController === controller) activeController = undefined;
    }
  }

  return {
    read,
    cancel: () => activeController?.abort(abortError()),
  };
}
