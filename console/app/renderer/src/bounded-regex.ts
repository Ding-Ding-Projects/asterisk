/**
 * Bounded, disposable-worker text search for user supplied patterns.
 *
 * A JavaScript regular expression can monopolize the thread that evaluates it. The
 * main renderer therefore never evaluates a user pattern. It gives a strictly bounded
 * corpus to a fresh worker and terminates that worker when the deadline expires.
 */

export type SearchMode = 'plain' | 'regex';

export interface SearchField {
  readonly recordId: string;
  readonly origin: string;
  readonly text: string;
}

export interface BoundedSearchRequest {
  readonly query: string;
  readonly mode: SearchMode;
  readonly flags?: string;
  readonly fields: readonly SearchField[];
  readonly deadlineMs?: number;
  readonly maxMatches?: number;
  readonly signal?: AbortSignal;
}

export interface BoundedSearchMatch {
  readonly recordId: string;
  readonly origin: string;
  readonly start: number;
  readonly end: number;
  readonly text: string;
  readonly captures: readonly (string | undefined)[];
}

export type BoundedSearchErrorCode = 'invalid' | 'timeout' | 'aborted' | 'unavailable' | 'bounds';

export type BoundedSearchResult =
  | { readonly ok: true; readonly matches: readonly BoundedSearchMatch[]; readonly truncated: boolean }
  | { readonly ok: false; readonly code: BoundedSearchErrorCode; readonly error: string; readonly matches: readonly [] };

export const MAX_PATTERN_LENGTH = 2_048;
export const MAX_FIELDS = 4_096;
export const MAX_FIELD_LENGTH = 200_000;
export const MAX_TOTAL_LENGTH = 2_000_000;
export const DEFAULT_DEADLINE_MS = 250;
export const DEFAULT_MAX_MATCHES = 2_000;

interface WorkerRequest {
  query: string;
  mode: SearchMode;
  flags: string;
  fields: SearchField[];
  maxMatches: number;
}

interface WorkerReply {
  ok: boolean;
  error?: string;
  matches?: BoundedSearchMatch[];
  truncated?: boolean;
}

function boundsError(message: string): BoundedSearchResult {
  return { ok: false, code: 'bounds', error: message, matches: [] };
}

function normalizeRequest(request: BoundedSearchRequest): WorkerRequest | BoundedSearchResult {
  if (request.mode !== 'plain' && request.mode !== 'regex') {
    return boundsError('Search mode is not supported.');
  }
  if (request.query.length > MAX_PATTERN_LENGTH) {
    return boundsError(`Search pattern exceeds the ${MAX_PATTERN_LENGTH} character limit.`);
  }
  if (request.fields.length > MAX_FIELDS) {
    return boundsError(`Search corpus exceeds the ${MAX_FIELDS} field limit.`);
  }

  let total = 0;
  const fields: SearchField[] = [];
  for (const field of request.fields) {
    if (field.text.length > MAX_FIELD_LENGTH) {
      return boundsError(`Search field ${field.recordId}:${field.origin} exceeds the ${MAX_FIELD_LENGTH} character limit.`);
    }
    total += field.text.length;
    if (total > MAX_TOTAL_LENGTH) {
      return boundsError(`Search corpus exceeds the ${MAX_TOTAL_LENGTH} character limit.`);
    }
    fields.push({ recordId: field.recordId, origin: field.origin, text: field.text });
  }

  const requestedMaxMatches = request.maxMatches ?? DEFAULT_MAX_MATCHES;
  const finiteMaxMatches = Number.isFinite(requestedMaxMatches) ? Math.floor(requestedMaxMatches) : DEFAULT_MAX_MATCHES;
  const maxMatches = Math.max(1, Math.min(finiteMaxMatches, DEFAULT_MAX_MATCHES));
  return {
    query: request.query,
    mode: request.mode,
    flags: request.flags ?? 'i',
    fields,
    maxMatches,
  };
}

const WORKER_SOURCE = String.raw`
self.onmessage = function (event) {
  const request = event.data;
  const matches = [];
  let truncated = false;

  function finish() {
    self.postMessage({ ok: true, matches: matches, truncated: truncated });
  }

  function add(field, start, end, text, captures) {
    if (matches.length >= request.maxMatches) {
      truncated = true;
      return false;
    }
    matches.push({
      recordId: field.recordId,
      origin: field.origin,
      start: start,
      end: end,
      text: text,
      captures: captures
    });
    return true;
  }

  if (request.query.length === 0) {
    finish();
    return;
  }

  if (request.mode === 'plain') {
    const needle = request.query.toLocaleLowerCase();
    for (const field of request.fields) {
      const haystack = field.text.toLocaleLowerCase();
      let offset = 0;
      while (offset <= haystack.length) {
        const start = haystack.indexOf(needle, offset);
        if (start < 0) break;
        if (!add(field, start, start + request.query.length, field.text.slice(start, start + request.query.length), [])) {
          finish();
          return;
        }
        offset = start + Math.max(request.query.length, 1);
      }
    }
    finish();
    return;
  }

  let expression;
  try {
    const uniqueFlags = Array.from(new Set(request.flags.split(''))).join('');
    if (uniqueFlags.length !== request.flags.length || /[^dgimsuvy]/.test(uniqueFlags)) {
      throw new Error('Flags may use d, g, i, m, s, u, v, or y once each.');
    }
    const flags = uniqueFlags.includes('g') ? uniqueFlags : uniqueFlags + 'g';
    expression = new RegExp(request.query, flags);
  } catch (error) {
    self.postMessage({ ok: false, error: error instanceof Error ? error.message : 'Invalid regular expression.' });
    return;
  }

  function advance(text, index, unicode) {
    if (!unicode || index + 1 >= text.length) return index + 1;
    const first = text.charCodeAt(index);
    if (first < 0xD800 || first > 0xDBFF) return index + 1;
    const second = text.charCodeAt(index + 1);
    return second >= 0xDC00 && second <= 0xDFFF ? index + 2 : index + 1;
  }

  for (const field of request.fields) {
    expression.lastIndex = 0;
    let match;
    while ((match = expression.exec(field.text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      if (!add(field, start, end, match[0], Array.prototype.slice.call(match, 1))) {
        finish();
        return;
      }
      if (match[0].length === 0) {
        expression.lastIndex = advance(field.text, expression.lastIndex, expression.unicode || expression.unicodeSets);
      }
    }
  }
  finish();
};
`;

/**
 * Search inside a disposable worker. Regex mode fails closed when Worker support is
 * absent because evaluating a hostile pattern on the renderer thread is not safe.
 */
export async function runBoundedSearch(request: BoundedSearchRequest): Promise<BoundedSearchResult> {
  const normalized = normalizeRequest(request);
  if ('ok' in normalized) return normalized;
  if (request.signal?.aborted) {
    return { ok: false, code: 'aborted', error: 'Search was cancelled.', matches: [] };
  }

  if (typeof Worker === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined') {
    if (normalized.mode === 'regex') {
      return { ok: false, code: 'unavailable', error: 'Isolated regular-expression search is unavailable in this runtime.', matches: [] };
    }
    return runPlainFallback(normalized);
  }

  const requestedDeadline = request.deadlineMs ?? DEFAULT_DEADLINE_MS;
  const finiteDeadline = Number.isFinite(requestedDeadline) ? requestedDeadline : DEFAULT_DEADLINE_MS;
  const deadlineMs = Math.max(25, Math.min(finiteDeadline, 5_000));
  let blobUrl: string | undefined;
  let worker: Worker;
  try {
    blobUrl = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' }));
    worker = new Worker(blobUrl);
  } catch {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    if (normalized.mode === 'plain') return runPlainFallback(normalized);
    return { ok: false, code: 'unavailable', error: 'The isolated search worker could not be started in this runtime.', matches: [] };
  }

  return await new Promise<BoundedSearchResult>((resolve) => {
    let settled = false;
    const settle = (result: BoundedSearchResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      request.signal?.removeEventListener('abort', abort);
      worker.terminate();
      URL.revokeObjectURL(blobUrl!);
      resolve(result);
    };
    const abort = () => settle({ ok: false, code: 'aborted', error: 'Search was cancelled.', matches: [] });
    const timer = setTimeout(() => {
      settle({ ok: false, code: 'timeout', error: `Search exceeded its ${deadlineMs} ms deadline.`, matches: [] });
    }, deadlineMs);

    request.signal?.addEventListener('abort', abort, { once: true });
    if (request.signal?.aborted) {
      abort();
      return;
    }
    worker.onerror = () => settle({ ok: false, code: 'invalid', error: 'The isolated search worker could not evaluate this pattern.', matches: [] });
    worker.onmessage = (event: MessageEvent<WorkerReply>) => {
      const reply = event.data;
      if (!reply.ok) {
        settle({ ok: false, code: 'invalid', error: reply.error ?? 'Invalid regular expression.', matches: [] });
        return;
      }
      settle({ ok: true, matches: reply.matches ?? [], truncated: reply.truncated ?? false });
    };
    try {
      worker.postMessage(normalized);
    } catch {
      settle({ ok: false, code: 'bounds', error: 'The bounded search corpus could not be transferred to the worker.', matches: [] });
    }
  });
}

function runPlainFallback(request: WorkerRequest): BoundedSearchResult {
  const matches: BoundedSearchMatch[] = [];
  const needle = request.query.toLocaleLowerCase();
  if (needle.length === 0) return { ok: true, matches, truncated: false };
  for (const field of request.fields) {
    const haystack = field.text.toLocaleLowerCase();
    let offset = 0;
    while (offset <= haystack.length) {
      const start = haystack.indexOf(needle, offset);
      if (start < 0) break;
      if (matches.length >= request.maxMatches) return { ok: true, matches, truncated: true };
      matches.push({
        recordId: field.recordId,
        origin: field.origin,
        start,
        end: start + request.query.length,
        text: field.text.slice(start, start + request.query.length),
        captures: [],
      });
      offset = start + Math.max(request.query.length, 1);
    }
  }
  return { ok: true, matches, truncated: false };
}
