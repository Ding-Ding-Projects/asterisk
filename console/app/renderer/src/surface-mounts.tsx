import { useEffect, useMemo, useState } from 'react';
import { ConverterSurface, type ConverterClient } from './converter-surface';
import { OllamaSuite, type OllamaSuiteClient } from './ollama-suite';
import { DocsSurface } from './docs-surface';
import { ChangelogSurface } from './changelog-surface';
import { DOCS_BUNDLE } from './generated/docs-bundle';
import { CHANGELOG_MARKDOWN, CHANGELOG_REPOSITORY_URL } from './generated/changelog-bundle';
import { StatusHubSurface } from './status-hub-surface';
import { createStatusHubClient, type StatusHubFetch } from '../../../control-plane/status-hub-client';
import { createStatusHubStore, type StatusHubPersistenceResult, type StatusHubRegistrationPersistence, type StatusHubPersistedRegistration } from '../../../control-plane/status-hub-store';
import { DownloadWindowMount, dedicatedDownloadWindowKind } from './download-window-mount';
import type { BackendResponse, ChatSession, OllamaRuntimeEvidence, OllamaSuiteSnapshot, PullQueueEvidence } from './ollama-suite-model';
import type { ConverterBackendHandlers } from '../../../shared/converter';

type SurfaceRoute = 'converter' | 'ollama' | 'docs' | 'changelog' | 'status';

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

const unavailableOllamaResponse = <T,>(operation: string): Promise<BackendResponse<T>> => Promise.resolve({
  ok: false,
  requestId: crypto.randomUUID(),
  observedAt: new Date().toISOString(),
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
      capabilities: [],
      fit: { verdict: 'unknown' as const, assessedAt: data.observedAt, summary: 'The dispatcher did not supply enough hardware metadata for a fit verdict.', assumptions: [], evidence: [] },
      metadataComplete: false,
      metadataGaps: ['The dispatcher did not supply catalog metadata for this installed tag.'],
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
  const route = value.slice('surface='.length);
  return route === 'converter' || route === 'ollama' || route === 'docs' || route === 'changelog' || route === 'status' ? route : undefined;
}

const statusHubBridgeFetch: StatusHubFetch = async (input, init) => {
  const url = new URL(input.toString());
  const path = url.pathname.replace(/\/$/u, '');
  const body = typeof init?.body === 'string' ? JSON.parse(init.body) as Record<string, unknown> : {};
  let action: string;
  let payload: Record<string, unknown> = body;
  if (path === '/api/status-hub/projects' && init?.method === 'POST') action = 'status-hub.register';
  else if (/^\/api\/status-hub\/projects\/[^/]+$/u.test(path)) { action = 'status-hub.project'; payload = { projectId: decodeURIComponent(path.split('/').at(-1) ?? '') }; }
  else if (/^\/api\/status-hub\/projects\/[^/]+\/sessions$/u.test(path)) { action = 'status-hub.sessions'; payload = { projectId: decodeURIComponent(path.split('/').at(-2) ?? '') }; }
  else if (/^\/api\/status-hub\/sessions\/[^/]+$/u.test(path)) { action = 'status-hub.session'; payload = { sessionId: decodeURIComponent(path.split('/').at(-1) ?? '') }; }
  else if (/^\/api\/status-hub\/sessions\/[^/]+\/replies$/u.test(path)) { action = 'status-hub.replies'; payload = { sessionId: decodeURIComponent(path.split('/').at(-2) ?? ''), cursor: url.searchParams.get('cursor') ?? undefined }; }
  else if (/^\/api\/status-hub\/sessions\/[^/]+\/questions\/[^/]+\/answers$/u.test(path)) { action = 'status-hub.answer'; const parts = path.split('/'); payload = { sessionId: decodeURIComponent(parts[4] ?? ''), questionId: decodeURIComponent(parts[6] ?? ''), answer: body.answer }; }
  else return new Response(JSON.stringify({ message: 'The Status Hub route is unavailable.' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  const bridge = window.dingDesktop;
  if (!bridge) return new Response(JSON.stringify({ message: 'The desktop control-plane bridge is unavailable.' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  const response = await bridge.controlPlane.request({ requestId: crypto.randomUUID(), action: action as never, payload });
  const status = response.ok ? 200 : response.code === 'STATUS_HUB_UNAVAILABLE' ? 503 : response.code === 'AUTH_REQUIRED' ? 401 : 502;
  return new Response(JSON.stringify(response.ok ? { data: response.data } : { message: response.message }), { status, headers: { 'Content-Type': 'application/json' } });
};

export function SurfaceMounts() {
  const downloadWindow = dedicatedDownloadWindowKind();
  return downloadWindow ? <DownloadWindowMount kind={downloadWindow} /> : <PrimarySurfaceMounts />;
}

function PrimarySurfaceMounts() {
  const [route, setRoute] = useState<SurfaceRoute | undefined>(() => routeFromHash());
  const [nativeHostStatus, setNativeHostStatus] = useState(() => ({ state: 'unavailable', message: 'Native extension ingress status is loading.', retryable: true }));
  const statusPersistence = useMemo<StatusHubRegistrationPersistence>(() => ({
    async load(): Promise<StatusHubPersistenceResult<StatusHubPersistedRegistration | undefined>> {
      const response = await window.dingDesktop?.controlPlane.request({ requestId: crypto.randomUUID(), action: 'settings.snapshot' });
      if (!response) return { ok: false, error: { state: 'offline', code: 'SETTINGS_BRIDGE_UNAVAILABLE', message: 'The durable settings bridge is unavailable.', retryable: true } };
      if (!response.ok) return { ok: false, error: { state: 'error', code: response.code, message: response.message, retryable: true } };
      const raw = (response.data as { values?: Record<string, string> } | undefined)?.values?.['status-hub.registration'];
      if (!raw) return { ok: true, value: undefined };
      try { return { ok: true, value: JSON.parse(raw) as StatusHubPersistedRegistration }; } catch { return { ok: false, error: { state: 'error', code: 'PERSISTED_RECEIPT_JSON_INVALID', message: 'The durable Status Hub receipt is not valid JSON.', retryable: false } }; }
    },
    async save(value: StatusHubPersistedRegistration): Promise<StatusHubPersistenceResult<void>> {
      const response = await window.dingDesktop?.controlPlane.request({ requestId: crypto.randomUUID(), action: 'settings.write', payload: { key: 'status-hub.registration', value: JSON.stringify(value) } });
      if (!response) return { ok: false, error: { state: 'offline', code: 'SETTINGS_BRIDGE_UNAVAILABLE', message: 'The durable settings bridge is unavailable.', retryable: true } };
      return response.ok ? { ok: true, value: undefined } : { ok: false, error: { state: 'error', code: response.code, message: response.message, retryable: true } };
    },
    async clear(): Promise<StatusHubPersistenceResult<void>> {
      const response = await window.dingDesktop?.controlPlane.request({ requestId: crypto.randomUUID(), action: 'settings.remove', payload: { key: 'status-hub.registration' } });
      if (!response) return { ok: false, error: { state: 'offline', code: 'SETTINGS_BRIDGE_UNAVAILABLE', message: 'The durable settings bridge is unavailable.', retryable: true } };
      return response.ok ? { ok: true, value: undefined } : { ok: false, error: { state: 'error', code: response.code, message: response.message, retryable: true } };
    },
  }), []);
  const statusStore = useMemo(() => createStatusHubStore({
    client: createStatusHubClient({ baseUrl: 'http://127.0.0.1:8099/', fetchImpl: statusHubBridgeFetch }),
    projectId: 'asterisk',
    registration: { projectId: 'asterisk', projectName: 'Ding PBX Console', defaultBranch: 'main', releaseChannel: 'desktop', stableUrl: 'https://ding-ding-projects.github.io/asterisk/' },
    persistence: statusPersistence,
    pollReplies: true,
  }), [statusPersistence]);
  useEffect(() => {
    const onHash = () => setRoute(routeFromHash());
    window.addEventListener('hashchange', onHash);
    return () => { window.removeEventListener('hashchange', onHash); };
  }, []);
  useEffect(() => {
    const host = window.dingDesktop?.nativeHost;
    if (!host) return;
    void host.getStatus().then(setNativeHostStatus);
    return host.onStatus(setNativeHostStatus);
  }, []);

  const links = useMemo(() => ['converter', 'ollama', 'docs', 'changelog', 'status'] as const, []);
  return (
    <aside className="surface-mount-host" aria-label="Mounted feature surfaces">
      <nav aria-label="Mounted feature surfaces">
        {links.map((item) => <a key={item} href={`#surface=${item}`} aria-current={route === item ? 'page' : undefined}>{item}</a>)}
        {route ? <a href="#" aria-label="Close mounted feature surface">Close</a> : null}
        <button type="button" onClick={() => void window.dingDesktop?.downloads.openWindow('start')}>Open download window</button>
        <span role="status" aria-live="polite">Extension ingress: {nativeHostStatus.state}</span>
        {nativeHostStatus.state !== 'ready' ? <button type="button" onClick={() => void window.dingDesktop?.nativeHost.register()}>Register extension ingress</button> : null}
      </nav>
      {route === 'converter' ? <ConverterSurface client={converterClient} /> : null}
      {route === 'ollama' ? <OllamaSuite client={ollamaClient} /> : null}
      {route === 'docs' ? <DocsSurface bundle={DOCS_BUNDLE} /> : null}
      {route === 'changelog' ? <ChangelogSurface markdown={CHANGELOG_MARKDOWN} repositoryUrl={CHANGELOG_REPOSITORY_URL} /> : null}
      {route === 'status' ? <StatusHubSurface store={statusStore} /> : null}
    </aside>
  );
}
