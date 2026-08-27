/**
 * The privileged half of external settings sources: the fetch itself.
 *
 * The renderer decides what a response is allowed to change; it must never make the
 * request, because the request needs a token and a renderer holding a token is what
 * every credential rule in this project exists to prevent. So the call lives here, in
 * the process that already owns the credential vault.
 *
 * Every bound is enforced at the transport rather than checked afterwards, which is the
 * difference between refusing something and merely noticing it:
 *
 *  - REDIRECTS ARE REFUSED BY THE TRANSPORT, not detected after following one. By the
 *    time a redirect has been followed, a request carrying a token has already been sent
 *    to a host this console never validated -- noticing it then is too late.
 *  - THE BODY IS CAPPED WHILE IT IS READ, not measured after. A source answering with a
 *    gigabyte would otherwise be a memory exhaustion the size check reports on the way
 *    out of.
 *  - THE HOST IS ALLOWLISTED. A configured source may only reach a host somebody has
 *    already agreed to, so a compromised settings file cannot repoint the fetch at an
 *    internal address and make this process the thing that reaches it.
 *
 * The token is read through an injected reader and used only as a header. It is never
 * placed in the URL, never returned, and never included in an error -- an error message
 * reaches logs and the settings surface.
 */

export interface SourceFetchRequest {
  url: string;
  /** Names the vault entry. The value is fetched through `readToken`, never passed in. */
  credentialKey?: string;
  timeoutMs?: number;
  maxBytes?: number;
}

export interface SourceFetchResult {
  ok: boolean;
  status: number;
  body: string;
  byteLength: number;
  redirected: boolean;
  /** Present only when the fetch could not be made. Never contains the token. */
  reason?: string;
}

export interface SettingsSourceFetcherOptions {
  /** Hosts a source may reach. Empty means none: a fetcher configured with no allowlist
   *  refuses everything rather than permitting everything, which is the safe direction. */
  allowedHosts: readonly string[];
  /** Reads a token from the vault. Returns undefined when there is none. */
  readToken?: (credentialKey: string) => Promise<string | undefined>;
  defaultTimeoutMs?: number;
  defaultMaxBytes?: number;
  /** Injected so the transport can be exercised without a network. */
  fetchImpl?: typeof fetch;
}

const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_MAX_BYTES = 64 * 1024;

export class SettingsSourceFetcher {
  readonly #allowedHosts: ReadonlySet<string>;
  readonly #readToken?: (credentialKey: string) => Promise<string | undefined>;
  readonly #timeoutMs: number;
  readonly #maxBytes: number;
  readonly #fetch: typeof fetch;

  constructor(options: SettingsSourceFetcherOptions) {
    this.#allowedHosts = new Set(options.allowedHosts.map((host) => host.toLowerCase()));
    this.#readToken = options.readToken;
    this.#timeoutMs = options.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.#maxBytes = options.defaultMaxBytes ?? DEFAULT_MAX_BYTES;
    this.#fetch = options.fetchImpl ?? fetch;
  }

  /** True when this host has been agreed to. Compared case-insensitively, host only --
   *  a port or a path must not be able to smuggle a different host past the check. */
  allows(rawUrl: string): boolean {
    try {
      return this.#allowedHosts.has(new URL(rawUrl).hostname.toLowerCase());
    } catch {
      return false;
    }
  }

  async fetchSource(request: SourceFetchRequest): Promise<SourceFetchResult> {
    const refuse = (reason: string): SourceFetchResult =>
      ({ ok: false, status: 0, body: '', byteLength: 0, redirected: false, reason });

    let url: URL;
    try {
      url = new URL(request.url);
    } catch {
      return refuse('The source URL could not be read.');
    }

    const loopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]';
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) {
      return refuse('Only HTTPS is allowed, except on loopback.');
    }
    if (url.username !== '' || url.password !== '') {
      /* Refused rather than stripped: a URL carrying credentials is a configuration
       * mistake somebody should be told about, not one to quietly paper over. */
      return refuse('The source URL carries credentials. Store them separately.');
    }
    if (!this.allows(request.url)) {
      return refuse(`${url.hostname} is not an allowed source host.`);
    }

    const headers: Record<string, string> = { accept: 'application/json' };
    if (request.credentialKey && this.#readToken) {
      const token = await this.#readToken(request.credentialKey);
      /* Used as a header and nowhere else. Never in the URL, never in a returned value,
       * never in a reason string. */
      if (token) headers.authorization = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), request.timeoutMs ?? this.#timeoutMs);
    try {
      const response = await this.#fetch(url, {
        /* Refused by the transport. Following one and noticing afterwards would mean a
         * request carrying the token had already reached an unvalidated host. */
        redirect: 'error',
        headers,
        signal: controller.signal,
      });
      const cap = request.maxBytes ?? this.#maxBytes;
      const body = await readCapped(response, cap);
      if (body === undefined) {
        return { ok: false, status: response.status, body: '', byteLength: cap + 1, redirected: false,
          reason: `The response was larger than ${cap} bytes and was not read.` };
      }
      return {
        ok: response.ok,
        status: response.status,
        body,
        byteLength: Buffer.byteLength(body, 'utf8'),
        redirected: response.redirected === true,
      };
    } catch (error) {
      /* The reason is derived from the error's own name rather than its message: a
       * message can carry a URL, and a URL can carry whatever somebody put in it. */
      const name = error instanceof Error ? error.name : 'Error';
      if (name === 'AbortError') return refuse('The source did not answer in time.');
      return refuse('The source could not be reached.');
    } finally {
      clearTimeout(timeout);
    }
  }
}

/**
 * Reads a body, stopping once the cap is passed.
 *
 * Returns undefined rather than a truncated body, because a truncated JSON document
 * parses as a failure at best and as something different at worst. Streamed rather than
 * read whole and measured, so a source answering with a gigabyte cannot exhaust memory
 * before the size check runs.
 */
async function readCapped(response: Response, maxBytes: number): Promise<string | undefined> {
  const body = response.body;
  if (!body) return '';
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) return undefined;
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString('utf8');
}
