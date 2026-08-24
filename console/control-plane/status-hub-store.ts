import type {
  StatusHubClientState,
  StatusHubErrorShape,
  StatusHubProjectRegistration,
  StatusHubProjectRegistrationRequest,
  StatusHubQuestionDeliveryReceipt,
} from '../shared/status-hub.js';
import {
  StatusHubClient,
  type StatusHubPollingHandle,
  type StatusHubPollingState,
  type StatusHubResult,
} from './status-hub-client.js';

export interface StatusHubStoreOptions {
  client: StatusHubClient;
  projectId: string;
  registration?: StatusHubProjectRegistrationRequest;
  pollReplies?: boolean;
}

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
  private readonly pollReplies: boolean;
  private readonly listeners = new Set<StatusHubStoreListener>();
  private readonly polling = new Map<string, StatusHubPollingHandle>();
  private state: StatusHubClientState = EMPTY_STATE;
  private generation = 0;
  private disposed = false;

  constructor(options: StatusHubStoreOptions) {
    this.client = options.client;
    this.projectId = options.projectId;
    this.registration = options.registration;
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
    this.update({ availability: 'loading', error: undefined, generation: generation.id });
    const projectResult = this.state.project || !this.registration
      ? await this.client.getProject(this.projectId, generation)
      : await this.client.registerProject(this.registration, generation);
    if (projectResult.ok) this.projectId = projectResult.value.projectId;
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
    if (result.ok && generation.isCurrent() && !this.disposed) this.update({ project: result.value, availability: 'ready', error: undefined, generation: generation.id });
    else if (!result.ok && generation.isCurrent() && !this.disposed) this.update({ availability: result.error.state, error: result.error, generation: generation.id });
    return result;
  }

  async refresh(): Promise<void> {
    await this.mount();
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

export function createStatusHubStore(options: StatusHubStoreOptions): StatusHubStore {
  return new StatusHubStore(options);
}
