import {
  STATUS_HUB_BOUNDS,
  STATUS_HUB_SCHEMA_VERSION,
  isStatusHubReceiptState,
  isStatusHubSessionState,
  type StatusHubCheck,
  type StatusHubClientState,
  type StatusHubCredentialReferences,
  type StatusHubEvidenceKind,
  type StatusHubEvidenceLink,
  type StatusHubErrorShape,
  type StatusHubQuestion,
  type StatusHubQuestionDeliveryReceipt,
  type StatusHubProjectRegistration,
  type StatusHubProjectRegistrationRequest,
  type StatusHubReplyInbox,
  type StatusHubSession,
  type StatusHubSessionSnapshot,
  type StatusHubVaultReference,
} from '../shared/status-hub.js';

const DEFAULT_DEADLINE_MS = 8_000;
const DEFAULT_POLL_INTERVAL_MS = 5_000;
const MIN_POLL_INTERVAL_MS = 1_000;
const MAX_POLL_INTERVAL_MS = 60_000;

export type StatusHubFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface StatusHubClientOptions {
  baseUrl: string;
  credentials?: StatusHubCredentialReferences;
  fetchImpl?: StatusHubFetch;
  deadlineMs?: number;
  pollIntervalMs?: number;
}

export interface StatusHubGeneration {
  readonly id: number;
  readonly signal: AbortSignal;
  readonly isCurrent: () => boolean;
  cancel(): void;
}

export interface StatusHubSuccess<T> {
  ok: true;
  value: T;
  generation: number;
}

export interface StatusHubFailure {
  ok: false;
  error: StatusHubErrorShape;
  generation: number;
}

export type StatusHubResult<T> = StatusHubSuccess<T> | StatusHubFailure;

export interface StatusHubPollingState {
  availability: StatusHubClientState['availability'];
  inbox?: StatusHubReplyInbox;
  error?: StatusHubErrorShape;
  generation: number;
}

export interface StatusHubPollingHandle {
  stop(): void;
}

export interface StatusHubHandlerFactory {
  registration: StatusHubRegistrationDescriptor;
  mount(projectId: string, generation?: StatusHubGeneration): Promise<StatusHubResult<StatusHubProjectRegistration>>;
  dispatchQuestion(
    sessionId: string,
    questionId: string,
    answer: string,
    generation?: StatusHubGeneration,
  ): Promise<StatusHubResult<StatusHubQuestionDeliveryReceipt>>;
}

export interface StatusHubRegistrationDescriptor {
  readonly kind: 'status-hub-project-registration';
  readonly method: 'POST';
  readonly path: '/api/status-hub/projects';
  readonly credential: 'enrollment-vault-reference';
  readonly response: 'server-registration-receipt';
}

export const STATUS_HUB_REGISTRATION_DESCRIPTOR: StatusHubRegistrationDescriptor = Object.freeze({
  kind: 'status-hub-project-registration',
  method: 'POST',
  path: '/api/status-hub/projects',
  credential: 'enrollment-vault-reference',
  response: 'server-registration-receipt',
});

export class StatusHubClientError extends Error {
  readonly shape: StatusHubErrorShape;

  constructor(shape: StatusHubErrorShape) {
    super(shape.message);
    this.name = 'StatusHubClientError';
    this.shape = shape;
  }
}

interface RequestOptions {
  generation?: StatusHubGeneration;
  credential?: StatusHubVaultReference;
}

export function createVaultReference(value: string): StatusHubVaultReference {
  if (!/^vault:\/\/[A-Za-z0-9._~:/-]{1,255}$/u.test(value)) {
    throw new Error('The credential must be an opaque vault reference, not a credential value.');
  }
  return value as StatusHubVaultReference;
}

export function validateStatusHubBaseUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('The Status Hub URL is not valid.');
  }
  if (url.username || url.password || url.hash || url.search) {
    throw new Error('The Status Hub URL cannot contain credentials, a query, or a fragment.');
  }
  const loopback = isLoopback(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) {
    throw new Error('The Status Hub transport must use HTTPS, or HTTP on an explicitly loopback host.');
  }
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url;
}

function isLoopback(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return lower === 'localhost' || lower === '127.0.0.1' || lower === '[::1]' || lower === '::1';
}

function boundedString(value: unknown, label: string, max: number, required = true): string | undefined {
  if (value === undefined && !required) return undefined;
  if (typeof value !== 'string' || (required && value.length === 0) || value.length > max) {
    throw new Error(`${label} is outside its bounded string contract.`);
  }
  return value;
}

function boundedId(value: unknown, label: string, max: number): string {
  const text = boundedString(value, label, max);
  if (!text || !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/u.test(text)) {
    throw new Error(`${label} is not a valid identifier.`);
  }
  return text;
}

function boundedDate(value: unknown, label: string, required = true): string | undefined {
  const text = boundedString(value, label, 64, required);
  if (text === undefined) return undefined;
  if (Number.isNaN(Date.parse(text))) throw new Error(`${label} is not a valid timestamp.`);
  return text;
}

function boundedUrl(value: unknown, label: string, required = true): string | undefined {
  const text = boundedString(value, label, STATUS_HUB_BOUNDS.evidenceUrl, required);
  if (text === undefined) return undefined;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw new Error(`${label} is not a valid URL.`);
  }
  if (url.username || url.password || url.hash || (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLoopback(url.hostname)))) {
    throw new Error(`${label} must be HTTPS or explicitly loopback without credentials.`);
  }
  return url.href;
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
}

function list(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value) || value.length > STATUS_HUB_BOUNDS.listEntries) throw new Error(`${label} is not a bounded list.`);
  return value;
}

function parseEvidence(value: unknown, label: string): StatusHubEvidenceLink[] {
  return list(value, label).map((entry, index) => {
    const source = record(entry, `${label}[${index}]`);
    const kind = boundedString(source.kind, `${label}[${index}].kind`, 32);
    if (!['commit', 'run', 'capture', 'artifact', 'document', 'other'].includes(kind ?? '')) throw new Error(`${label}[${index}].kind is invalid.`);
    return {
      kind: kind as StatusHubEvidenceKind,
      label: boundedString(source.label, `${label}[${index}].label`, STATUS_HUB_BOUNDS.message)!,
      url: boundedUrl(source.url, `${label}[${index}].url`)!,
      commit: boundedString(source.commit, `${label}[${index}].commit`, STATUS_HUB_BOUNDS.commit, false),
    };
  });
}

function parseChecks(value: unknown): StatusHubCheck[] {
  return list(value, 'checks').map((entry, index) => {
    const source = record(entry, `checks[${index}]`);
    const state = boundedString(source.state, `checks[${index}].state`, 32);
    if (!['unrun', 'running', 'failed', 'passed', 'unknown'].includes(state ?? '')) throw new Error(`checks[${index}].state is invalid.`);
    return {
      id: boundedId(source.id, `checks[${index}].id`, STATUS_HUB_BOUNDS.projectId),
      label: boundedString(source.label, `checks[${index}].label`, STATUS_HUB_BOUNDS.message)!,
      state: state as StatusHubCheck['state'],
      runUrl: boundedUrl(source.runUrl, `checks[${index}].runUrl`, false),
      commit: boundedString(source.commit, `checks[${index}].commit`, STATUS_HUB_BOUNDS.commit, false),
      detail: boundedString(source.detail, `checks[${index}].detail`, STATUS_HUB_BOUNDS.message, false),
    };
  });
}

function parseRegistration(value: unknown): StatusHubProjectRegistration {
  const source = record(value, 'project registration');
  return {
    projectId: boundedId(source.projectId, 'projectId', STATUS_HUB_BOUNDS.projectId),
    projectName: boundedString(source.projectName, 'projectName', STATUS_HUB_BOUNDS.projectName)!,
    defaultBranch: boundedString(source.defaultBranch, 'defaultBranch', STATUS_HUB_BOUNDS.branch)!,
    releaseChannel: boundedString(source.releaseChannel, 'releaseChannel', STATUS_HUB_BOUNDS.projectName)!,
    stableUrl: boundedUrl(source.stableUrl, 'stableUrl')!,
    registeredAt: boundedDate(source.registeredAt, 'registeredAt')!,
    commit: boundedString(source.commit, 'commit', STATUS_HUB_BOUNDS.commit, false),
    checks: parseChecks(source.checks),
    evidence: parseEvidence(source.evidence, 'evidence'),
  };
}

/** Strict shared validator used for durable registration receipts before hydration. */
export function validateStatusHubProjectRegistration(value: unknown): value is StatusHubProjectRegistration {
  try { parseRegistration(value); return true; } catch { return false; }
}

function parseSession(value: unknown): StatusHubSession {
  const source = record(value, 'session');
  const state = boundedString(source.state, 'session.state', 32);
  if (!isStatusHubSessionState(state)) throw new Error('session.state is invalid.');
  return {
    id: boundedId(source.id, 'session.id', STATUS_HUB_BOUNDS.sessionId),
    projectId: boundedId(source.projectId, 'session.projectId', STATUS_HUB_BOUNDS.projectId),
    name: boundedString(source.name, 'session.name', STATUS_HUB_BOUNDS.sessionName)!,
    state,
    commit: boundedString(source.commit, 'session.commit', STATUS_HUB_BOUNDS.commit, false),
    runId: boundedString(source.runId, 'session.runId', STATUS_HUB_BOUNDS.runId, false),
    runUrl: boundedUrl(source.runUrl, 'session.runUrl', false),
    evidence: parseEvidence(source.evidence, 'session.evidence'),
    startedAt: boundedDate(source.startedAt, 'session.startedAt', false),
    updatedAt: boundedDate(source.updatedAt, 'session.updatedAt')!,
    detail: boundedString(source.detail, 'session.detail', STATUS_HUB_BOUNDS.message, false),
  };
}

function parseReceipt(value: unknown): StatusHubQuestionDeliveryReceipt {
  const source = record(value, 'question delivery receipt');
  const state = boundedString(source.state, 'receipt.state', 32);
  if (!isStatusHubReceiptState(state)) throw new Error('receipt.state is invalid.');
  return {
    questionId: boundedId(source.questionId, 'receipt.questionId', STATUS_HUB_BOUNDS.questionId),
    sessionId: boundedId(source.sessionId, 'receipt.sessionId', STATUS_HUB_BOUNDS.sessionId),
    receiptId: boundedId(source.receiptId, 'receipt.receiptId', STATUS_HUB_BOUNDS.sessionId),
    state,
    acceptedAt: boundedDate(source.acceptedAt, 'receipt.acceptedAt', false),
    detail: boundedString(source.detail, 'receipt.detail', STATUS_HUB_BOUNDS.message, false),
  };
}

function parseInbox(value: unknown): StatusHubReplyInbox {
  const source = record(value, 'reply inbox');
  const replies = list(source.replies, 'reply inbox.replies').map((entry, index) => {
    const item = record(entry, `reply inbox.replies[${index}]`);
    const sourceName = boundedString(item.source, `reply inbox.replies[${index}].source`, 32);
    if (!['hub', 'discord', 'owner', 'unknown'].includes(sourceName ?? '')) throw new Error('reply source is invalid.');
    return {
      id: boundedId(item.id, `reply inbox.replies[${index}].id`, STATUS_HUB_BOUNDS.sessionId),
      sessionId: boundedId(item.sessionId, `reply inbox.replies[${index}].sessionId`, STATUS_HUB_BOUNDS.sessionId),
      body: boundedString(item.body, `reply inbox.replies[${index}].body`, STATUS_HUB_BOUNDS.message)!,
      createdAt: boundedDate(item.createdAt, `reply inbox.replies[${index}].createdAt`)!,
      source: sourceName as 'hub' | 'discord' | 'owner' | 'unknown',
    };
  });
  return {
    sessionId: boundedId(source.sessionId, 'reply inbox.sessionId', STATUS_HUB_BOUNDS.sessionId),
    replies,
    nextCursor: boundedString(source.nextCursor, 'reply inbox.nextCursor', STATUS_HUB_BOUNDS.cursor, false),
    observedAt: boundedDate(source.observedAt, 'reply inbox.observedAt')!,
  };
}

function parseQuestion(value: unknown): StatusHubQuestion {
  const source = record(value, 'question');
  const options = list(source.options, 'question.options').map((entry, index) => boundedString(entry, `question.options[${index}]`, STATUS_HUB_BOUNDS.message)!);
  return {
    id: boundedId(source.id, 'question.id', STATUS_HUB_BOUNDS.questionId),
    sessionId: boundedId(source.sessionId, 'question.sessionId', STATUS_HUB_BOUNDS.sessionId),
    prompt: boundedString(source.prompt, 'question.prompt', STATUS_HUB_BOUNDS.message)!,
    options,
    freeTextAllowed: source.freeTextAllowed === true,
    answered: source.answered === true,
    receipt: source.receipt === undefined ? undefined : parseReceipt(source.receipt),
  };
}

function unwrap(value: unknown): unknown {
  const source = record(value, 'Status Hub response');
  return 'data' in source ? source.data : source;
}

function errorShape(state: StatusHubErrorShape['state'], code: string, message: string, retryable: boolean, status?: number): StatusHubClientError {
  return new StatusHubClientError({ state, code, message, retryable, status });
}

async function readBoundedBody(response: Response): Promise<Uint8Array> {
  const reader = response.body?.getReader();
  if (!reader) throw errorShape('refused', 'RESPONSE_BODY_UNAVAILABLE', 'The Status Hub response body could not be bounded.', false, response.status);
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      const chunk = part.value;
      total += chunk.byteLength;
      if (total > STATUS_HUB_BOUNDS.responseBytes) {
        await reader.cancel();
        throw errorShape('refused', 'RESPONSE_TOO_LARGE', 'The Status Hub response exceeds the bounded response limit.', false, response.status);
      }
      chunks.push(chunk);
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
  return bytes;
}

export class StatusHubClient {
  readonly baseUrl: URL;
  readonly registration = STATUS_HUB_REGISTRATION_DESCRIPTOR;
  private readonly fetchImpl: StatusHubFetch;
  private readonly credentials: StatusHubCredentialReferences;
  private readonly deadlineMs: number;
  private readonly pollIntervalMs: number;
  private generationCounter = 0;
  private activeGeneration: { id: number; controller: AbortController } | undefined;

  constructor(options: StatusHubClientOptions) {
    this.baseUrl = validateStatusHubBaseUrl(options.baseUrl);
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.credentials = options.credentials ?? {};
    this.deadlineMs = Math.max(250, Math.min(options.deadlineMs ?? DEFAULT_DEADLINE_MS, 120_000));
    this.pollIntervalMs = Math.max(MIN_POLL_INTERVAL_MS, Math.min(options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS, MAX_POLL_INTERVAL_MS));
  }

  beginGeneration(): StatusHubGeneration {
    this.activeGeneration?.controller.abort();
    const controller = new AbortController();
    const id = ++this.generationCounter;
    this.activeGeneration = { id, controller };
    return {
      id,
      signal: controller.signal,
      isCurrent: () => this.activeGeneration?.id === id && !controller.signal.aborted,
      cancel: () => controller.abort(),
    };
  }

  async registerProject(input: StatusHubProjectRegistrationRequest, generation?: StatusHubGeneration): Promise<StatusHubResult<StatusHubProjectRegistration>> {
    try {
      const validated = {
        schemaVersion: STATUS_HUB_SCHEMA_VERSION,
        projectId: boundedId(input.projectId, 'projectId', STATUS_HUB_BOUNDS.projectId),
        projectName: boundedString(input.projectName, 'projectName', STATUS_HUB_BOUNDS.projectName)!,
        defaultBranch: boundedString(input.defaultBranch, 'defaultBranch', STATUS_HUB_BOUNDS.branch)!,
        releaseChannel: boundedString(input.releaseChannel, 'releaseChannel', STATUS_HUB_BOUNDS.projectName)!,
        stableUrl: boundedUrl(input.stableUrl, 'stableUrl')!,
        commit: boundedString(input.commit, 'commit', STATUS_HUB_BOUNDS.commit, false),
      };
      const value = parseRegistration(unwrap(await this.request('/api/status-hub/projects', { method: 'POST', body: validated }, { generation, credential: this.credentials.enrollment })));
      return { ok: true, value, generation: generation?.id ?? this.generationCounter };
    } catch (error) {
      return this.failure(error, generation);
    }
  }

  async getProject(projectId: string, generation?: StatusHubGeneration): Promise<StatusHubResult<StatusHubProjectRegistration>> {
    try {
      return await this.read(`/api/status-hub/projects/${encodeURIComponent(boundedId(projectId, 'projectId', STATUS_HUB_BOUNDS.projectId))}`, parseRegistration, generation);
    } catch (error) {
      return this.failure(error, generation);
    }
  }

  async listSessions(projectId: string, generation?: StatusHubGeneration): Promise<StatusHubResult<StatusHubSession[]>> {
    try {
      return await this.readList(`/api/status-hub/projects/${encodeURIComponent(boundedId(projectId, 'projectId', STATUS_HUB_BOUNDS.projectId))}/sessions`, 'sessions', parseSession, generation);
    } catch (error) {
      return this.failure(error, generation);
    }
  }

  async getSession(sessionId: string, generation?: StatusHubGeneration): Promise<StatusHubResult<StatusHubSessionSnapshot>> {
    try {
      const data = record(unwrap(await this.request(`/api/status-hub/sessions/${encodeURIComponent(boundedId(sessionId, 'sessionId', STATUS_HUB_BOUNDS.sessionId))}`, { method: 'GET' }, { generation })), 'session snapshot');
      const session = parseSession(data.session);
      const questions = list(data.questions, 'session questions').map(parseQuestion);
      const inbox = parseInbox(data.inbox);
      return this.success({ session, questions, inbox }, generation);
    } catch (error) {
      return this.failure(error, generation);
    }
  }

  async getReplies(sessionId: string, cursor?: string, generation?: StatusHubGeneration): Promise<StatusHubResult<StatusHubReplyInbox>> {
    try {
      const id = encodeURIComponent(boundedId(sessionId, 'sessionId', STATUS_HUB_BOUNDS.sessionId));
      const nextCursor = cursor === undefined ? undefined : boundedString(cursor, 'cursor', STATUS_HUB_BOUNDS.cursor);
      const suffix = nextCursor ? `?cursor=${encodeURIComponent(nextCursor)}` : '';
      const value = parseInbox(unwrap(await this.request(`/api/status-hub/sessions/${id}/replies${suffix}`, { method: 'GET' }, { generation })));
      return this.success(value, generation);
    } catch (error) {
      return this.failure(error, generation);
    }
  }

  async deliverQuestion(sessionId: string, questionId: string, answer: string, generation?: StatusHubGeneration): Promise<StatusHubResult<StatusHubQuestionDeliveryReceipt>> {
    try {
      const id = boundedId(sessionId, 'sessionId', STATUS_HUB_BOUNDS.sessionId);
      const question = boundedId(questionId, 'questionId', STATUS_HUB_BOUNDS.questionId);
      const body = boundedString(answer, 'answer', STATUS_HUB_BOUNDS.questionAnswer)!;
      const value = parseReceipt(unwrap(await this.request(`/api/status-hub/sessions/${encodeURIComponent(id)}/questions/${encodeURIComponent(question)}/answers`, { method: 'POST', body: { schemaVersion: STATUS_HUB_SCHEMA_VERSION, answer: body } }, { generation, credential: this.credentials.reply })));
      return this.success(value, generation);
    } catch (error) {
      return this.failure(error, generation);
    }
  }

  startReplyPolling(sessionId: string, onState: (state: StatusHubPollingState) => void, options: { cursor?: string; generation?: StatusHubGeneration } = {}): StatusHubPollingHandle {
    const controller = new AbortController();
    let stopped = false;
    let cursor = options.cursor;
    const generation = options.generation ?? this.beginGeneration();
    const loop = async (): Promise<void> => {
      if (stopped || controller.signal.aborted || !generation.isCurrent()) return;
      onState({ availability: 'loading', generation: generation.id });
      const result = await this.getReplies(sessionId, cursor, generation);
      if (stopped || controller.signal.aborted || !generation.isCurrent()) return;
      if (result.ok) {
        cursor = result.value.nextCursor;
        onState({ availability: 'ready', inbox: result.value, generation: generation.id });
      } else {
        onState({ availability: result.error.state, error: result.error, generation: generation.id });
      }
      if (!stopped && !controller.signal.aborted) setTimeout(() => { void loop(); }, this.pollIntervalMs);
    };
    void loop();
    return {
      stop: () => {
        stopped = true;
        controller.abort();
        if (generation.isCurrent()) generation.cancel();
      },
    };
  }

  private async read<T>(path: string, parse: (value: unknown) => T, generation?: StatusHubGeneration): Promise<StatusHubResult<T>> {
    try {
      const value = parse(unwrap(await this.request(path, { method: 'GET' }, { generation })));
      return this.success(value, generation);
    } catch (error) {
      return this.failure(error, generation);
    }
  }

  private async readList<T>(path: string, key: string, parse: (value: unknown) => T, generation?: StatusHubGeneration): Promise<StatusHubResult<T[]>> {
    try {
      const data = unwrap(await this.request(path, { method: 'GET' }, { generation }));
      const source = record(data, key);
      const values = list(source[key], key).map(parse);
      return this.success(values, generation);
    } catch (error) {
      return this.failure(error, generation);
    }
  }

  private success<T>(value: T, generation?: StatusHubGeneration): StatusHubSuccess<T> {
    return { ok: true, value, generation: generation?.id ?? this.generationCounter };
  }

  private failure(error: unknown, generation?: StatusHubGeneration): StatusHubFailure {
    const shape = error instanceof StatusHubClientError
      ? error.shape
      : { state: 'error' as const, code: 'CLIENT_VALIDATION', message: error instanceof Error ? error.message : 'The Status Hub response was invalid.', retryable: false };
    return { ok: false, error: shape, generation: generation?.id ?? this.generationCounter };
  }

  private async request(path: string, init: { method: 'GET' | 'POST'; body?: unknown }, options: RequestOptions): Promise<unknown> {
    const url = new URL(path.replace(/^\//u, ''), this.baseUrl);
    if (url.origin !== this.baseUrl.origin) throw errorShape('refused', 'URL_ORIGIN', 'The Status Hub request left the configured origin.', false);
    if (options.generation && !options.generation.isCurrent()) throw errorShape('stale', 'STALE_GENERATION', 'A newer Status Hub request superseded this one.', true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.deadlineMs);
    const abortFromGeneration = () => controller.abort();
    options.generation?.signal.addEventListener('abort', abortFromGeneration, { once: true });
    try {
      const headers: Record<string, string> = { Accept: 'application/json' };
      const request: RequestInit = { method: init.method, redirect: 'error', signal: controller.signal, headers };
      if (init.body !== undefined) {
        headers['Content-Type'] = 'application/json';
        request.body = JSON.stringify(init.body);
      }
      if (options.credential) headers['X-Status-Hub-Credential-Ref'] = options.credential;
      let response: Response;
      try {
        response = await this.fetchImpl(url, request);
      } catch (error) {
        if (options.generation && !options.generation.isCurrent()) throw errorShape('stale', 'STALE_GENERATION', 'A newer Status Hub request superseded this one.', true);
        if (controller.signal.aborted) throw errorShape('offline', 'REQUEST_DEADLINE', 'The Status Hub did not answer before the bounded deadline.', true);
        throw errorShape('offline', 'NETWORK_UNAVAILABLE', 'The Status Hub could not be reached.', true);
      }
      if (response.url) {
        const responseUrl = new URL(response.url);
        if (responseUrl.origin !== this.baseUrl.origin || responseUrl.href !== url.href) throw errorShape('refused', 'REDIRECT_REFUSED', 'The Status Hub refused a redirected response.', false);
      }
      if (!response.ok) {
        if (response.status === 401) throw errorShape('authRequired', 'AUTH_REQUIRED', 'The Status Hub requires authentication.', true, response.status);
        if (response.status === 403 || response.status === 409) throw errorShape('refused', 'REQUEST_REFUSED', 'The Status Hub refused this request.', false, response.status);
        if (response.status === 404) throw errorShape('unavailable', 'NOT_FOUND', 'The Status Hub route is unavailable.', true, response.status);
        if (response.status === 408 || response.status === 429 || response.status >= 500) throw errorShape('unavailable', 'HUB_UNAVAILABLE', 'The Status Hub is temporarily unavailable.', true, response.status);
        throw errorShape('error', 'HTTP_ERROR', 'The Status Hub returned an unexpected response.', false, response.status);
      }
      const length = Number(response.headers.get('content-length') ?? 0);
      if (Number.isFinite(length) && length > STATUS_HUB_BOUNDS.responseBytes) throw errorShape('refused', 'RESPONSE_TOO_LARGE', 'The Status Hub response exceeds the bounded response limit.', false, response.status);
      const bytes = await readBoundedBody(response);
      const text = new TextDecoder().decode(bytes);
      try {
        return JSON.parse(text) as unknown;
      } catch {
        throw errorShape('error', 'INVALID_JSON', 'The Status Hub response was not valid JSON.', false, response.status);
      }
    } finally {
      clearTimeout(timer);
      options.generation?.signal.removeEventListener('abort', abortFromGeneration);
    }
  }
}

export function createStatusHubClient(options: StatusHubClientOptions): StatusHubClient {
  return new StatusHubClient(options);
}

export function createStatusHubHandlerFactory(client: StatusHubClient): StatusHubHandlerFactory {
  return {
    registration: client.registration,
    mount: (projectId, generation) => client.getProject(projectId, generation),
    dispatchQuestion: (sessionId, questionId, answer, generation) => client.deliverQuestion(sessionId, questionId, answer, generation),
  };
}
