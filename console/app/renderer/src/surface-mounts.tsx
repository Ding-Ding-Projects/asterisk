import { useEffect, useMemo, useState } from 'react';
import { ConverterSurface, type ConverterClient } from './converter-surface';
import { OllamaSuite, type OllamaSuiteClient } from './ollama-suite';
import { DocsSurface } from './docs-surface';
import { ChangelogSurface } from './changelog-surface';
import { DOCS_BUNDLE } from './generated/docs-bundle';
import { CHANGELOG_MARKDOWN, CHANGELOG_REPOSITORY_URL } from './generated/changelog-bundle';
import type { BackendResponse, ChatSession, OllamaRuntimeEvidence, OllamaSuiteSnapshot, PullQueueEvidence } from './ollama-suite-model';
import type { ConverterBackendHandlers } from '../../../shared/converter';
import { AuthenticatorSurface } from './authenticator-surface';
import type { AuthenticatorClient, AuthenticatorHistoryClient } from './authenticator-surface-state';
import type { HistoryRestoreReceipt } from '../../../shared/history';
import { initializeMountedNotificationStore, mountedNotificationStore } from './notification-runtime';
import { NotificationDeleteGate } from './notification-delete-gate';
import type { AuthenticatorRegistration, AuthenticatorRemovalReceipt } from '../../../shared/authenticator';
import { LockManagerSurface } from './lock-manager-surface';
import type { ToyLockClient, ToyLockCredentialClient } from './lock-manager-surface';
import type { ToyLockCreateReceipt, ToyLockRecord, ToyLockRecoveryMetadata, ToyLockReconciliationReceipt, ToyLockRemovalReceipt, ToyLockRelockReceipt, ToyLockUnlockReceipt } from '../../../shared/locks';
import { SupportTicketsSurface } from './support-tickets-surface';
import type { SupportTicket, SupportTicketsClient } from './support-tickets-surface';
import { UnlockLadderSurface } from './unlock-ladder-surface';
import type { UnlockLadderClient } from './unlock-ladder-surface';

type SurfaceRoute = 'converter' | 'ollama' | 'docs' | 'changelog' | 'authenticator' | 'locks' | 'support-tickets' | 'unlock-ladder';

function unavailable<T>(surface: string, operation: string): Promise<T> {
  return Promise.reject(new Error(`${surface} ${operation} is not registered in the privileged bridge. No value was assumed and no operation was attempted.`));
}

function bridgeRequest<T>(action: string, payload?: Record<string, unknown>): Promise<T> {
  const bridge = window.dingDesktop;
  if (!bridge) return unavailable<T>('Control-plane', action);
  return bridge.controlPlane.request({ requestId: crypto.randomUUID(), action, payload } as never).then((response) => {
    if (!response.ok) throw new Error(response.message);
    return response.data as T;
  });
}

const converterClient: ConverterClient = {
  catalog: () => bridgeRequest('converter.catalog'),
  sniff: (request) => bridgeRequest('converter.sniff', request),
  createQueue: (request) => bridgeRequest('converter.queue.create', request),
  enqueueOne: (request) => bridgeRequest('converter.queue.enqueue-one', request),
  queuePage: (request) => bridgeRequest('converter.queue.page', request),
  startQueue: (request) => bridgeRequest('converter.queue.start', request),
  pauseQueue: (request) => bridgeRequest('converter.queue.pause', request),
  resumeQueue: (request) => bridgeRequest('converter.queue.resume', request),
  cancelQueue: (request) => bridgeRequest('converter.queue.cancel', request),
  pdfCapabilities: () => bridgeRequest('converter.pdf-capabilities'),
  pickLocalFile: () => window.dingDesktop?.converter.pickFile() ?? unavailable('Converter', 'local file picker'),
  pickDestinationPath: () => window.dingDesktop?.converter.pickDestination() ?? unavailable('Converter', 'destination picker'),
  requestOverwriteConfirmation: (request) => window.dingDesktop?.converter.confirmOverwrite({ destinationPath: request.destinationPath }) ?? unavailable('Converter', 'overwrite confirmation'),
  deadlineMs: 15_000,
};

const authenticatorClient: AuthenticatorClient = {
  list: () => bridgeRequest<Awaited<ReturnType<AuthenticatorClient['list']>>>('authenticator.list'),
  register: (input: AuthenticatorRegistration) => bridgeRequest<Awaited<ReturnType<AuthenticatorClient['register']>>>('authenticator.register', input),
  confirmAndArm: (id, code) => bridgeRequest<Awaited<ReturnType<AuthenticatorClient['confirmAndArm']>>>('authenticator.confirm', { id, code }),
  remove: (id) => bridgeRequest<AuthenticatorRemovalReceipt>('authenticator.remove', { id }),
  codeSnapshot: (id) => bridgeRequest<Awaited<ReturnType<AuthenticatorClient['codeSnapshot']>>>('authenticator.snapshot', { id }),
  reconciliation: () => bridgeRequest('authenticator.reconciliation'),
};
const historyClient: AuthenticatorHistoryClient = {
  record: async (entry) => { const result = await bridgeRequest<{ ok: boolean; message?: string }>('local-history.record', { ...entry, snapshot: entry.snapshot ?? { kind: 'authenticator-redacted', stableRecordId: entry.stableRecordId, action: entry.action, subject: entry.subject } }); return result.ok ? { ok: true } : { ok: false, warning: result.message ?? 'The local history receipt was unavailable.' }; },
  list: async () => { const result = await bridgeRequest<{ entries?: { ok?: boolean; value?: ReadonlyArray<{ commitId: string; timestamp: string; action: string; subject: string }>; code?: string; message?: string } }>('local-history.list', { limit: 200 }); if (result.entries?.ok) { const entries = result.entries.value ?? []; return { status: entries.length === 0 ? 'verified-empty' as const : 'verified' as const, entries }; } return { status: result.entries?.code === 'invalid-request' ? 'malformed' as const : 'unavailable' as const, entries: [], warning: result.entries?.message ?? 'The local history list was unavailable.' }; },
  restore: (commitId) => bridgeRequest<HistoryRestoreReceipt>('authenticator.restore', { commitId }),
};

let lockRecords: ReadonlyArray<ToyLockRecord> = [];
let lockRecovery = { applicationDataPath: '', supportTicketRoute: '#surface=support-tickets', deletesAutomatically: false as const, disclosure: 'The recovery folder is opened for you, never deleted for you.' };
const lockClient: ToyLockClient = {
  initialize: async () => { const [ready, listed, recovery] = await Promise.all([bridgeRequest<{ ok: true; value: { count: number } } | { ok: false; message: string }>('toy-lock.initialize'), bridgeRequest<{ ok: true; value: ReadonlyArray<ToyLockRecord> } | { ok: false; message: string }>('toy-lock.list'), bridgeRequest<ToyLockRecoveryMetadata>('toy-lock.recovery')]); if (!listed.ok) return listed; lockRecords = listed.value; lockRecovery = recovery; return ready; },
  reconciliation: () => bridgeRequest<ToyLockReconciliationReceipt>('toy-lock.reconciliation'),
  list: () => ({ ok: true as const, value: lockRecords }),
  create: async (input) => { const result = await bridgeRequest<ToyLockCreateReceipt>('toy-lock.create', input); if (result.ok) lockRecords = [...lockRecords, result.value]; return result; },
  unlock: async (id, candidate, surfaceId) => { const result = await bridgeRequest<ToyLockUnlockReceipt<ToyLockRecord>>('toy-lock.unlock', { id, candidateBase64: btoa(String.fromCharCode(...candidate)), surfaceId }); if (result.ok) lockRecords = lockRecords.map((record) => record.id === id ? result.value : record); return result; },
  relock: async (id) => { const result = await bridgeRequest<ToyLockRelockReceipt>('toy-lock.relock', { id }); if (result.ok) lockRecords = lockRecords.map((record) => record.id === id ? result.value : record); return result; },
  remove: async (id) => { try { const result = await bridgeRequest<ToyLockRemovalReceipt>('toy-lock.remove', { id }); if (result.status === 'removed') lockRecords = lockRecords.filter((record) => record.id !== id); return result; } catch (error) { return { status: 'recoverable', message: error instanceof Error ? error.message : 'The lock removal bridge was unavailable.', recoverable: true }; } },
  get recovery() { return lockRecovery; },
};
const lockCredentials: ToyLockCredentialClient = { create: (targetId, method, value) => bridgeRequest('toy-lock-credential.create', { targetId, method, value }) };
const supportTicketsClient: SupportTicketsClient = {
  list: () => bridgeRequest<ReadonlyArray<SupportTicket>>('support-ticket.list'),
  create: (input) => bridgeRequest<SupportTicket>('support-ticket.create', input),
  advance: (id) => bridgeRequest<SupportTicket>('support-ticket.advance', { id }),
};
const unlockLadderClient: UnlockLadderClient = {
  issue: (request) => bridgeRequest<Awaited<ReturnType<UnlockLadderClient['issue']>>>('unlock-ladder.issue', request),
  hit: (nonce, spawnId, cell) => bridgeRequest<Awaited<ReturnType<UnlockLadderClient['hit']>>>('unlock-ladder.hit', { nonce, spawnId, cell }),
  grade: (nonce, answer) => bridgeRequest<Awaited<ReturnType<UnlockLadderClient['grade']>>>('unlock-ladder.grade', { nonce, answer }),
};

const unavailableOllamaResponse = <T,>(operation: string): Promise<BackendResponse<T>> => Promise.resolve({
  ok: false,
  error: {
    code: 'bridge-not-registered',
    message: `Ollama ${operation} is not registered in the privileged bridge. The surface stays empty until a real local response is available.`,
    recoveryAction: 'Use the application update that registers the local Ollama dispatcher, then reload this surface.',
    retryable: false,
  },
});

function runtimeEvidence(value: { state: string; endpoint: string; version?: string; reason?: string; observedAt: string }): OllamaRuntimeEvidence {
  const state = value.state === 'ready' ? 'healthy' : value.state === 'missing' ? 'missing' : value.state === 'stopped' ? 'stopped' : value.state === 'unhealthy' ? 'unhealthy' : 'offline';
  return {
    state,
    endpoint: value.endpoint,
    version: value.version,
    reason: value.reason,
    observedAt: value.observedAt,
    nextActions: [],
  };
}

async function readOllamaSnapshot(): Promise<BackendResponse<OllamaSuiteSnapshot>> {
  const bridge = window.dingDesktop;
  if (!bridge) return unavailableOllamaResponse('snapshot');
  try {
    const response = await bridge.controlPlane.request({ requestId: crypto.randomUUID(), action: 'ollama.snapshot' });
    if (!response.ok) {
      return { ok: false, requestId: response.requestId, observedAt: new Date().toISOString(), error: { code: response.code, message: response.message, recoveryAction: 'Start the local Ollama service, then retry this surface.', retryable: true } };
    }
    const data = response.data as { observedAt: string; endpoint: string; health: { state: string; version?: string; reason?: string; observedAt: string }; installed: ReadonlyArray<{ name: string; model: string; sizeBytes: number; details: { family?: string; parameterSize?: string; quantizationLevel?: string } }>; running: ReadonlyArray<{ name: string; model: string }> };
    const running = new Set(data.running.flatMap((item) => [item.name, item.model]));
    const variants = data.installed.map((item) => ({
      id: item.name,
      modelId: item.model,
      family: item.details.family ?? 'Unknown family',
      displayName: item.name,
      exactTag: item.name,
      blobSizeBytes: item.sizeBytes,
      installed: true,
      running: running.has(item.name) || running.has(item.model),
      mode: 'plain' as const,
      pattern: '',
      flags: 'i',
      sample: '',
      limits: { maxPatternCharacters: 512, maxSampleCharacters: 4096, timeoutMs: 75, maxMatches: 200 },
    }));
    return {
      ok: true,
      requestId: response.requestId,
      observedAt: data.observedAt,
      value: {
        sequence: 1,
        receivedAt: data.observedAt,
        runtime: runtimeEvidence({ ...data.health, endpoint: data.endpoint }),
        catalog: { sourceIdentity: 'unavailable', pageCount: 0, completeness: 'unknown', stale: true, offlineCache: false },
        variants,
        chatSessions: [],
        harnessProfiles: [],
      },
    };
  } catch (error) {
    return { ok: false, requestId: crypto.randomUUID(), observedAt: new Date().toISOString(), error: { code: 'ollama-bridge-failed', message: error instanceof Error ? error.message : 'The local Ollama bridge did not return a response.', recoveryAction: 'Retry after checking the local service.', retryable: true } };
  }
}

async function ollamaAction<T>(action: string, payload?: Record<string, unknown>): Promise<BackendResponse<T>> {
  const bridge = window.dingDesktop;
  if (!bridge) return unavailableOllamaResponse(action);
  try {
    const response = await bridge.controlPlane.request({ requestId: crypto.randomUUID(), action, payload } as never);
    if (!response.ok) return { ok: false, requestId: response.requestId, observedAt: new Date().toISOString(), error: { code: response.code, message: response.message, recoveryAction: 'Check the local Ollama service and retry.', retryable: true } };
    return { ok: true, requestId: response.requestId, observedAt: new Date().toISOString(), value: response.data as T };
  } catch (error) {
    return { ok: false, requestId: crypto.randomUUID(), observedAt: new Date().toISOString(), error: { code: 'ollama-bridge-failed', message: error instanceof Error ? error.message : 'The local Ollama bridge did not return a response.', recoveryAction: 'Retry after checking the local service.', retryable: true } };
  }
}

const ollamaClient: OllamaSuiteClient = {
  readSnapshot: readOllamaSnapshot,
  subscribe: () => () => {},
  refreshRuntime: async () => { const snapshot = await readOllamaSnapshot(); return snapshot.ok ? { ok: true, requestId: snapshot.requestId, observedAt: snapshot.observedAt, value: snapshot.value.runtime } : snapshot; },
  runRuntimeAction: async (actionId) => ollamaAction<OllamaRuntimeEvidence>(actionId),
  refreshCatalog: readOllamaSnapshot,
  search: async () => ({ ok: true, requestId: crypto.randomUUID(), observedAt: new Date().toISOString(), value: { engine: 'local Ollama dispatcher', dialect: 'bounded backend regex', escapingRules: 'Backend-defined bounded pattern evaluation.', valid: true, matchedIds: [], preview: [], truncated: false, evaluatedAt: new Date().toISOString() } }),
  queuePulls: async (variantIds) => ollamaAction<PullQueueEvidence>('ollama.pulls.enqueue', { items: variantIds }),
  startPulls: async () => ollamaAction<PullQueueEvidence>('ollama.pulls.reconcile'),
  pausePulls: async () => ollamaAction<PullQueueEvidence>('ollama.pulls.list'),
  resumePulls: async () => ollamaAction<PullQueueEvidence>('ollama.pulls.reconcile'),
  cancelPull: async (queueItemId) => ollamaAction<PullQueueEvidence>('ollama.pulls.cancel', { id: queueItemId }),
  retryPull: async (queueItemId) => ollamaAction<PullQueueEvidence>('ollama.pulls.retry', { id: queueItemId }),
  createChat: async (request) => ollamaAction<ChatSession>('ollama.chat.create', { name: `Chat ${request.variantId}`, model: request.variantId, systemPrompt: request.systemPrompt, options: { temperature: request.temperature, contextWindow: request.contextWindow } }),
  sendChat: async (request) => ollamaAction<ChatSession>('ollama.chat.send', { id: request.sessionId, content: request.content, attachments: request.attachmentIds }),
  stopChat: async (sessionId) => ollamaAction<ChatSession>('ollama.chat.stop', { id: sessionId }),
  chooseAttachments: () => unavailableOllamaResponse('attachment picker'),
  pickHarnessExecutable: () => unavailableOllamaResponse('harness executable picker'),
  pickHarnessWorkingDirectory: () => unavailableOllamaResponse('harness directory picker'),
  registerHarness: () => unavailableOllamaResponse('harness registration'),
  preflightHarness: () => unavailableOllamaResponse('harness preflight'),
  launchHarness: () => unavailableOllamaResponse('harness launch'),
  restoreHarnessSnapshot: () => unavailableOllamaResponse('harness restore'),
};

function routeFromHash(): SurfaceRoute | undefined {
  const value = window.location.hash.slice(1);
  if (!value.startsWith('surface=')) return undefined;
  const route = value.slice('surface='.length).split('&', 1)[0];
  if (window.dingDesktop?.platform === 'web' && (route === 'authenticator' || route === 'locks' || route === 'support-tickets' || route === 'unlock-ladder')) return undefined;
  return route === 'converter' || route === 'ollama' || route === 'docs' || route === 'changelog' || route === 'authenticator' || route === 'locks' || route === 'support-tickets' || route === 'unlock-ladder' ? route : undefined;
}

export function SurfaceMounts() {
  const [route, setRoute] = useState<SurfaceRoute | undefined>(() => routeFromHash());
  const [, setRecoveryRevision] = useState(0);
  const lockoutId = new URLSearchParams(window.location.hash.slice(1)).get('lockout') ?? 'console-surface-lockout';
  useEffect(() => {
    const onHash = () => setRoute(routeFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => { void bridgeRequest('toy-lock.recovery').then((recovery) => { lockRecovery = recovery; setRecoveryRevision((value) => value + 1); }).catch(() => undefined); }, []);
  useEffect(() => { void initializeMountedNotificationStore().catch(() => undefined); }, []);

  const links = useMemo(() => window.dingDesktop?.platform === 'web'
    ? (['converter', 'ollama', 'docs', 'changelog'] as const)
    : (['converter', 'ollama', 'docs', 'changelog', 'authenticator', 'locks', 'support-tickets', 'unlock-ladder'] as const), []);
  return (
    <aside className="surface-mount-host" aria-label="Mounted feature surfaces">
      <nav aria-label="Mounted feature surfaces">
        {links.map((item) => <a key={item} href={`#surface=${item}`} aria-current={route === item ? 'page' : undefined}>{item}</a>)}
        {route ? <a href="#" aria-label="Close mounted feature surface">Close</a> : null}
      </nav>
      {route === 'converter' ? <ConverterSurface client={converterClient} /> : null}
      {route === 'ollama' ? <OllamaSuite client={ollamaClient} /> : null}
      {route === 'docs' ? <DocsSurface bundle={DOCS_BUNDLE} /> : null}
      {route === 'changelog' ? <ChangelogSurface markdown={CHANGELOG_MARKDOWN} repositoryUrl={CHANGELOG_REPOSITORY_URL} /> : null}
      {route === 'authenticator' ? <AuthenticatorSurface client={authenticatorClient} history={historyClient} notificationStore={mountedNotificationStore} /> : null}
      {route === 'locks' ? <LockManagerSurface client={lockClient} credentials={lockCredentials} surfaceId="locks" onOpenSupportTickets={() => { window.location.hash = 'surface=support-tickets'; }} onOpenUnlockLadder={(id) => { window.location.hash = `surface=unlock-ladder&lockout=${encodeURIComponent(id)}`; }} /> : null}
      {route === 'support-tickets' ? <SupportTicketsSurface client={supportTicketsClient} applicationDataPath={lockRecovery.applicationDataPath} openApplicationDataFolder={(path) => window.dingDesktop?.localAuth?.openApplicationDataFolder(path) ?? Promise.resolve({ ok: false, message: 'The privileged application bridge is unavailable.' })} /> : null}
      {route === 'unlock-ladder' ? <UnlockLadderSurface client={unlockLadderClient} lockoutId={lockoutId} budgetScopeId="console-surface" /> : null}
      <NotificationDeleteGate />
    </aside>
  );
}
