import type {
  StatusHubClientState,
  StatusHubErrorShape,
  StatusHubProjectRegistration,
  StatusHubProjectRegistrationRequest,
  StatusHubQuestionDeliveryReceipt,
} from '../shared/status-hub.js';
import {
  StatusHubClient,
  validateStatusHubProjectRegistration,
  type StatusHubPollingHandle,
  type StatusHubPollingState,
  type StatusHubResult,
} from './status-hub-client.js';

export interface StatusHubStoreOptions {
  client: StatusHubClient;
  projectId: string;
  registration?: StatusHubProjectRegistrationRequest;
  persistence?: StatusHubRegistrationPersistence;
  pollReplies?: boolean;
}

export interface StatusHubPersistedRegistration {
  schemaVersion: 1;
  projectId: string;
  registration: StatusHubProjectRegistration;
}

export interface StatusHubRegistrationPersistence {
  load(): Promise<StatusHubPersistenceResult<StatusHubPersistedRegistration | undefined>>;
  save(value: StatusHubPersistedRegistration): Promise<StatusHubPersistenceResult<void>>;
  clear(): Promise<StatusHubPersistenceResult<void>>;
}

export type StatusHubPersistenceResult<T> = { ok: true; value: T } | { ok: false; error: StatusHubErrorShape };

export type StatusHubStoreListener = () => void;

const EMPTY_STATE: StatusHubClientState = Object.freeze({
  availability: 'loading',
  sessions: [],
  snapshots: {},
  receipts: {},
  generation: 0,
});

/**
 * Renderer-safe external store for the Status Hub surface.
 *
 * It is intentionally receipt-led: dispatching an answer only changes the
 * question state after the Hub returns a typed receipt. A click or an optimistic
 * local flag never becomes a delivery claim.
 */
export class StatusHubStore {
  private readonly client: StatusHubClient;
  private projectId: string;
  private readonly registration?: StatusHubProjectRegistrationRequest;
  private readonly persistence?: StatusHubRegistrationPersistence;
  private readonly pollReplies: boolean;
  private readonly listeners = new Set<StatusHubStoreListener>();
  private readonly polling = new Map<string, StatusHubPollingHandle>();
  private state: StatusHubClientState = EMPTY_STATE;
  private generation = 0;
  private disposed = false;
  private hydrated = false;
  private hydrationPromise: Promise<void> | undefined;

  constructor(options: StatusHubStoreOptions) {
    this.client = options.client;
    this.projectId = options.projectId;
    this.registration = options.registration;
    this.persistence = options.persistence;
    this.pollReplies = options.pollReplies ?? true;
  }

  getSnapshot(): StatusHubClientState {
    return this.state;
  }

  subscribe(listener: StatusHubStoreListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async mount(): Promise<void> {
    if (this.disposed) return;
    this.stopPolling();
    const generation = this.client.beginGeneration();
    this.generation = generation.id;
    await this.hydrateRegistration();
    if (this.disposed || !generation.isCurrent()) return;
    this.update({ availability: 'loading', error: undefined, generation: generation.id });
    let projectResult = this.state.project || !this.registration
      ? await this.client.getProject(this.projectId, generation)
      : await this.client.registerProject(this.registration, generation);
    if (!projectResult.ok && this.registration && this.persistence && ['NOT_FOUND', 'STALE_RECEIPT', 'RECEIPT_STALE'].includes(projectResult.error.code) && generation.isCurrent()) {
      const cleared = await this.persistence.clear();
      if (cleared.ok) {
        this.update({ project: undefined, persistenceWarning: undefined, generation: generation.id });
        projectResult = await this.client.registerProject(this.registration, generation);
      } else {
        this.update({ persistenceWarning: cleared.error, generation: generation.id });
      }
    }
    if (projectResult.ok) {
      this.projectId = projectResult.value.projectId;
      await this.persistRegistration(projectResult.value);
    }
    const sessionsResult = await this.client.listSessions(this.projectId, generation);
    if (this.disposed || !generation.isCurrent()) return;

    const project = projectResult.ok ? projectResult.value : this.state.project;
    const sessions = sessionsResult.ok ? sessionsResult.value : this.state.sessions;
    const error = projectResult.ok && sessionsResult.ok
      ? undefined
      : firstError(projectResult, sessionsResult);
    const availability = projectResult.ok && sessionsResult.ok
      ? 'ready'
      : projectResult.ok || sessionsResult.ok
        ? 'partial'
        : error?.state ?? 'error';
    this.update({ project, sessions, availability, error, observedAt: new Date().toISOString(), generation: generation.id });

    if (sessionsResult.ok) {
      await Promise.all(sessionsResult.value.map(session => this.refreshSession(session.id, generation)));
    }
  }

  async registerProject(input: StatusHubProjectRegistrationRequest): Promise<StatusHubResult<StatusHubProjectRegistration>> {
    if (this.disposed) return { ok: false, error: { state: 'stale', code: 'STORE_DISPOSED', message: 'The Status Hub surface is no longer mounted.', retryable: false }, generation: this.generation };
    const generation = this.client.beginGeneration();
    this.generation = generation.id;
    const result = await this.client.registerProject(input, generation);
    if (result.ok && generation.isCurrent() && !this.disposed) {
      this.projectId = result.value.projectId;
      await this.persistRegistration(result.value);
      this.update({ project: result.value, availability: 'ready', error: undefined, generation: generation.id });
    }
    else if (!result.ok && generation.isCurrent() && !this.disposed) this.update({ availability: result.error.state, error: result.error, generation: generation.id });
    return result;
  }

  async refresh(): Promise<void> {
    await this.mount();
  }

  async reregister(): Promise<StatusHubResult<StatusHubProjectRegistration>> {
    if (!this.registration) return { ok: false, error: { state: 'refused', code: 'REGISTRATION_NOT_CONFIGURED', message: 'No Status Hub registration descriptor is configured.', retryable: false }, generation: this.generation };
    if (this.persistence) {
      const cleared = await this.persistence.clear();
      if (!cleared.ok) this.update({ persistenceWarning: cleared.error, generation: this.generation });
    }
    return this.registerProject(this.registration);
  }

  async retryPersistRegistration(): Promise<void> {
    if (this.state.project) await this.persistRegistration(this.state.project);
  }

  async dispatchQuestion(sessionId: string, questionId: string, answer: string): Promise<StatusHubResult<StatusHubQuestionDeliveryReceipt>> {
    if (this.disposed) return { ok: false, error: { state: 'stale', code: 'STORE_DISPOSED', message: 'The Status Hub surface is no longer mounted.', retryable: false }, generation: this.generation };
    const generation = this.client.beginGeneration();
    this.generation = generation.id;
    const result = await this.client.deliverQuestion(sessionId, questionId, answer, generation);
    if (this.disposed || !generation.isCurrent()) return result;
    if (result.ok) {
      this.update({ receipts: { ...this.state.receipts, [questionId]: result.value }, availability: 'ready', error: undefined, generation: generation.id });
      const snapshot = this.state.snapshots[sessionId];
      if (snapshot) {
        const questions = snapshot.questions.map(question => question.id === questionId ? { ...question, answered: result.value.state === 'accepted', receipt: result.value } : question);
        this.update({ snapshots: { ...this.state.snapshots, [sessionId]: { ...snapshot, questions } }, generation: generation.id });
      }
    } else {
      this.update({ availability: result.error.state, error: result.error, generation: generation.id });
    }
    return result;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stopPolling();
    this.client.beginGeneration().cancel();
    this.listeners.clear();
  }

  /** Stop polling when the route leaves, while keeping the reusable store mountable. */
  stop(): void {
    if (this.disposed) return;
    this.stopPolling();
    this.client.beginGeneration().cancel();
  }

  private async refreshSession(sessionId: string, generation: ReturnType<StatusHubClient['beginGeneration']>): Promise<void> {
    const result = await this.client.getSession(sessionId, generation);
    if (this.disposed || !generation.isCurrent()) return;
    if (result.ok) {
      this.update({ snapshots: { ...this.state.snapshots, [sessionId]: result.value }, availability: this.state.error ? 'partial' : 'ready', generation: generation.id });
      if (this.pollReplies) this.startPolling(sessionId, generation);
    } else {
      this.update({ availability: result.error.state, error: result.error, generation: generation.id });
    }
  }

  private async hydrateRegistration(): Promise<void> {
    if (this.hydrated) return;
    if (this.hydrationPromise) return this.hydrationPromise;
    this.hydrationPromise = (async () => {
      if (!this.persistence) return;
      try {
        const result = await this.persistence.load();
        if (!result.ok) { this.update({ persistenceWarning: result.error, generation: this.generation }); return; }
        if (result.value === undefined) return;
        if (!isPersistedRegistration(result.value)) { this.update({ persistenceWarning: { state: 'error', code: 'PERSISTED_RECEIPT_INVALID', message: 'The saved Status Hub registration receipt was invalid and was ignored.', retryable: false }, generation: this.generation }); return; }
        this.projectId = result.value.projectId;
        this.update({ project: result.value.registration, persistenceWarning: undefined, generation: this.generation });
      } catch {
        this.update({ persistenceWarning: { state: 'error', code: 'PERSISTED_RECEIPT_UNAVAILABLE', message: 'The saved Status Hub registration receipt could not be read.', retryable: true }, generation: this.generation });
      } finally {
        this.hydrated = true;
      }
    })();
    return this.hydrationPromise;
  }

  private async persistRegistration(registration: StatusHubProjectRegistration): Promise<void> {
    if (!this.persistence) return;
    try {
      const result = await this.persistence.save({ schemaVersion: 1, projectId: registration.projectId, registration });
      if (result.ok) this.update({ persistenceWarning: undefined, generation: this.generation });
      else this.update({ persistenceWarning: result.error, generation: this.generation });
    } catch { this.update({ persistenceWarning: { state: 'error', code: 'PERSISTED_RECEIPT_WRITE_FAILED', message: 'The live Status Hub receipt is current, but it could not be saved locally.', retryable: true }, generation: this.generation }); }
  }

  private startPolling(sessionId: string, generation: ReturnType<StatusHubClient['beginGeneration']>): void {
    this.polling.get(sessionId)?.stop();
    const handle = this.client.startReplyPolling(sessionId, (state) => this.applyPolling(sessionId, state), { generation });
    this.polling.set(sessionId, handle);
  }

  private applyPolling(sessionId: string, state: StatusHubPollingState): void {
    if (this.disposed || state.generation !== this.generation) return;
    const snapshot = this.state.snapshots[sessionId];
    if (state.inbox && snapshot) {
      this.update({ snapshots: { ...this.state.snapshots, [sessionId]: { ...snapshot, inbox: state.inbox } }, availability: this.state.error ? 'partial' : 'ready', observedAt: state.inbox.observedAt, generation: state.generation });
    } else if (state.error) {
      this.update({ availability: state.error.state, error: state.error, generation: state.generation });
    }
  }

  private stopPolling(): void {
    for (const handle of this.polling.values()) handle.stop();
    this.polling.clear();
  }

  private update(patch: Partial<StatusHubClientState>): void {
    if (this.disposed) return;
    this.state = Object.freeze({ ...this.state, ...patch, sessions: patch.sessions ?? this.state.sessions, snapshots: patch.snapshots ?? this.state.snapshots, receipts: patch.receipts ?? this.state.receipts });
    for (const listener of this.listeners) listener();
  }
}

function firstError(...results: Array<StatusHubResult<unknown>>): StatusHubErrorShape | undefined {
  return results.find((result): result is { ok: false; error: StatusHubErrorShape; generation: number } => !result.ok)?.error;
}

function isPersistedRegistration(value: unknown): value is StatusHubPersistedRegistration {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<StatusHubPersistedRegistration>;
  const registration = candidate.registration;
  if (candidate.schemaVersion !== 1 || typeof candidate.projectId !== 'string' || !registration || typeof registration !== 'object') return false;
  const record = registration as Partial<StatusHubProjectRegistration>;
  return typeof candidate.projectId === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(candidate.projectId)
    && record.projectId === candidate.projectId
    && validateStatusHubProjectRegistration(registration)
    && typeof record.projectName === 'string' && record.projectName.length > 0 && record.projectName.length <= 160
    && typeof record.defaultBranch === 'string' && record.defaultBranch.length > 0 && record.defaultBranch.length <= 128
    && typeof record.releaseChannel === 'string' && record.releaseChannel.length > 0 && record.releaseChannel.length <= 160
    && typeof record.stableUrl === 'string' && record.stableUrl.startsWith('https://')
    && typeof record.registeredAt === 'string' && !Number.isNaN(Date.parse(record.registeredAt))
    && Array.isArray(record.checks) && record.checks.length <= 500 && record.checks.every((check) => {
      if (!check || typeof check !== 'object') return false;
      const item = check as Partial<StatusHubProjectRegistration['checks'][number]>;
      return typeof item.id === 'string' && item.id.length > 0 && item.id.length <= 128
        && typeof item.label === 'string' && item.label.length > 0 && item.label.length <= 1000
        && typeof item.state === 'string' && ['unrun', 'running', 'failed', 'passed', 'unknown'].includes(item.state)
        && (item.runUrl === undefined || (typeof item.runUrl === 'string' && item.runUrl.startsWith('https://')))
        && (item.commit === undefined || (typeof item.commit === 'string' && item.commit.length <= 64));
    })
    && Array.isArray(record.evidence) && record.evidence.length <= 500 && record.evidence.every((evidence) => {
      if (!evidence || typeof evidence !== 'object') return false;
      const item = evidence as Partial<StatusHubProjectRegistration['evidence'][number]>;
      return typeof item.kind === 'string' && item.kind.length <= 32
        && typeof item.label === 'string' && item.label.length > 0 && item.label.length <= 1000
        && typeof item.url === 'string' && item.url.startsWith('https://')
        && (item.commit === undefined || (typeof item.commit === 'string' && item.commit.length <= 64));
    });
}

export function createStatusHubStore(options: StatusHubStoreOptions): StatusHubStore {
  return new StatusHubStore(options);
}
