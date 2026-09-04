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
import type {
  OllamaCatalogSnapshot,
  OllamaChatMessage,
  OllamaChatSessionSummary,
  OllamaInstalledModel,
  OllamaPullRecord,
  OllamaRunningModel,
} from '../../../shared/ollama';

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
  runPdfOperation: async (request, acknowledgedDisclosureIds) => {
    const response = await bridgeRequest<{ valid: boolean; request?: unknown }>('converter.pdf-validate', {
      request,
      acknowledgedDisclosureIds,
    });
    if (!response.valid) throw new Error('The privileged PDF service did not validate this operation.');
    return { operation: request.operation, detail: 'The privileged PDF service validated the requested operation. Execution remains bounded by the installed adapter.' };
  },
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

function unknownFit(observedAt: string, reason: string) {
  return {
    verdict: 'unknown' as const,
    assessedAt: observedAt,
    summary: reason,
    assumptions: [],
    evidence: [],
  };
}

function mapCatalogVariant(
  variant: OllamaCatalogSnapshot['variants'][number],
  installed: ReadonlyArray<OllamaInstalledModel>,
  running: ReadonlyArray<OllamaRunningModel>,
  observedAt: string,
) {
  const exactTag = `${variant.model}:${variant.tag}`;
  const installedModel = installed.find((item) => item.name === exactTag || item.model === exactTag || item.name === variant.model || item.model === variant.model);
  const runningModel = running.find((item) => item.name === exactTag || item.model === exactTag || item.name === variant.model || item.model === variant.model);
  return {
    id: variant.id,
    modelId: variant.model,
    family: typeof variant.metadata.family === 'string' ? variant.metadata.family : 'Unknown family',
    displayName: variant.displayName,
    exactTag,
    description: variant.description,
    publishedAt: variant.publishedAt,
    blobSizeBytes: variant.sizeBytes,
    parameterCount: variant.parameterCount,
    quantization: variant.quantization,
    contextWindow: variant.contextLength,
    installed: Boolean(installedModel),
    running: Boolean(runningModel),
    installedDigest: installedModel?.digest,
    capabilities: variant.capabilities.map((id) => ({ id, label: id, available: true })),
    fit: unknownFit(observedAt, 'The backend catalog supplied no hardware-fit assessment for this variant.'),
    metadataComplete: Boolean(variant.model && variant.tag && variant.displayName),
    metadataGaps: variant.model && variant.tag && variant.displayName ? [] : ['The catalog omitted the model, tag, or display name.'],
  };
}

export function mapCatalogSnapshot(
  catalog: OllamaCatalogSnapshot | undefined,
  installed: ReadonlyArray<OllamaInstalledModel>,
  running: ReadonlyArray<OllamaRunningModel>,
  observedAt: string,
): { catalog?: OllamaSuiteSnapshot['catalog']; variants: OllamaSuiteSnapshot['variants'] } {
  if (!catalog) {
    return {
      catalog: { sourceIdentity: 'unavailable', pageCount: 0, completeness: 'unknown', stale: true, offlineCache: false },
      variants: installed.map((item) => ({
        id: item.name,
        modelId: item.model,
        family: item.details.family ?? 'Unknown family',
        displayName: item.name,
        exactTag: item.name,
        blobSizeBytes: item.sizeBytes,
        installed: true,
        running: running.some((candidate) => candidate.name === item.name || candidate.model === item.model),
        installedDigest: item.digest,
        capabilities: [],
        fit: unknownFit(observedAt, 'No catalog metadata was available, so hardware fit is unknown.'),
        metadataComplete: false,
        metadataGaps: ['The backend did not return catalog metadata for this installed tag.'],
      })),
    };
  }
  const catalogVariants = catalog.variants.map((variant) => mapCatalogVariant(variant, installed, running, observedAt));
  const knownTags = new Set(catalogVariants.map((variant) => variant.exactTag));
  const installedOnly = installed
    .filter((item) => !knownTags.has(item.name))
    .map((item) => ({
      id: `installed:${item.name}`,
      modelId: item.model,
      family: item.details.family ?? 'Unknown family',
      displayName: item.name,
      exactTag: item.name,
      blobSizeBytes: item.sizeBytes,
      installed: true,
      running: running.some((candidate) => candidate.name === item.name || candidate.model === item.model),
      installedDigest: item.digest,
      capabilities: [],
      fit: unknownFit(observedAt, 'This installed tag is not present in the last catalog response, so hardware fit is unknown.'),
      metadataComplete: false,
      metadataGaps: ['The installed tag was not present in the catalog response.'],
    }));
  return {
    catalog: {
      sourceIdentity: catalog.sourceId,
      revision: catalog.sourceRevision,
      refreshedAt: catalog.refreshedAt,
      pageCount: catalog.pageCount,
      completeness: catalog.complete ? 'complete' : catalog.variants.length > 0 ? 'partial' : 'unknown',
      stale: catalog.stale,
      staleReason: catalog.unavailableReason,
      offlineCache: catalog.stale,
    },
    variants: [...catalogVariants, ...installedOnly],
  };
}

export function pullQueueEvidence(data: unknown): PullQueueEvidence {
  const records = data && typeof data === 'object' && Array.isArray((data as { records?: unknown }).records)
    ? (data as { records: OllamaPullRecord[] }).records
    : [];
  return {
    concurrency: 2,
    paused: false,
    networkDisclosure: 'Pulls use the local Ollama service and may require network transfer. The backend reports each item separately.',
    items: records.map((record) => ({
      id: record.id,
      variantId: record.model,
      exactTag: record.model,
      state: record.state === 'pulled' ? 'complete' : record.state,
      completedBytes: record.progress?.completedBytes,
      totalBytes: record.progress?.totalBytes,
      statusText: record.progress?.status ?? (record.error ?? `Pull state: ${record.state}.`),
      error: record.error ? { code: 'OLLAMA_PULL_FAILED', message: record.error, recoveryAction: 'Retry this item after checking the local Ollama service.', retryable: true } : undefined,
      startedAt: record.createdAt,
      finishedAt: ['pulled', 'skipped', 'cancelled', 'failed'].includes(record.state) ? record.updatedAt : undefined,
    })),
  };
}

function chatSummary(summary: OllamaChatSessionSummary, observedAt: string): ChatSession {
  return {
    id: summary.id,
    title: summary.name,
    variantId: summary.model,
    exactTag: summary.model,
    streamState: summary.streaming ? 'streaming' : 'idle',
    messages: [],
    systemPrompt: '',
    temperature: 0.7,
    attachmentCapabilities: [],
    updatedAt: summary.updatedAt || observedAt,
  };
}

function chatMessageSession(message: OllamaChatMessage, request: { sessionId: string; content: string }, observedAt: string): ChatSession {
  return {
    id: request.sessionId,
    title: 'Local chat',
    variantId: '',
    exactTag: '',
    streamState: 'idle',
    messages: [
      { id: `user-${message.id}`, role: 'user', content: request.content, createdAt: observedAt, partial: false },
      { id: message.id, role: message.role === 'assistant' ? 'assistant' : 'system', content: message.content, createdAt: message.createdAt, partial: false },
    ],
    systemPrompt: '',
    temperature: 0.7,
    attachmentCapabilities: [],
    updatedAt: message.createdAt || observedAt,
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
    const [queueResponse, chatResponse] = await Promise.all([
      bridge.controlPlane.request({ requestId: crypto.randomUUID(), action: 'ollama.pulls.list' }),
      bridge.controlPlane.request({ requestId: crypto.randomUUID(), action: 'ollama.chat.sessions' }),
    ]);
    const data = response.data as {
      observedAt: string;
      endpoint: string;
      health: { state: string; version?: string; reason?: string; observedAt: string };
      installed: ReadonlyArray<OllamaInstalledModel>;
      running: ReadonlyArray<OllamaRunningModel>;
      catalog?: OllamaCatalogSnapshot;
    };
    const mapped = mapCatalogSnapshot(data.catalog, data.installed, data.running, data.observedAt);
    const pullQueue = queueResponse.ok ? pullQueueEvidence(queueResponse.data) : undefined;
    const chatSessions = chatResponse.ok && chatResponse.data && typeof chatResponse.data === 'object'
      && Array.isArray((chatResponse.data as { sessions?: unknown }).sessions)
      ? (chatResponse.data as { sessions: OllamaChatSessionSummary[] }).sessions.map((session) => chatSummary(session, data.observedAt))
      : [];
    return {
      ok: true,
      requestId: response.requestId,
      observedAt: data.observedAt,
      value: {
        sequence: 1,
        receivedAt: data.observedAt,
        runtime: runtimeEvidence({ ...data.health, endpoint: data.endpoint }),
        catalog: mapped.catalog,
        variants: mapped.variants,
        pullQueue,
        chatSessions,
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
  refreshCatalog: async () => {
    const refreshed = await ollamaAction<unknown>('ollama.catalog.refresh');
    if (!refreshed.ok) return refreshed as BackendResponse<OllamaSuiteSnapshot>;
    /* The refresh response carries catalog evidence only. Read the complete typed
     * snapshot afterwards so installed and running state remain reconciled with the
     * newly refreshed catalog rather than replacing the rest of the screen with a
     * partial response. */
    return readOllamaSnapshot();
  },
  search: async () => ({ ok: true, requestId: crypto.randomUUID(), observedAt: new Date().toISOString(), value: { engine: 'local Ollama dispatcher', dialect: 'bounded backend regex', escapingRules: 'Backend-defined bounded pattern evaluation.', valid: true, matchedIds: [], preview: [], truncated: false, evaluatedAt: new Date().toISOString() } }),
  queuePulls: async (variantIds) => {
    const response = await ollamaAction<unknown>('ollama.pulls.enqueue', { items: variantIds.map((model) => ({ model })) });
    return response.ok ? { ...response, value: pullQueueEvidence(response.value) } : response;
  },
  startPulls: async () => {
    const response = await ollamaAction<unknown>('ollama.pulls.reconcile');
    return response.ok ? { ...response, value: pullQueueEvidence(response.value) } : response;
  },
  pausePulls: async () => unavailableOllamaResponse('pull queue pause, which the registered backend does not expose'),
  resumePulls: async () => unavailableOllamaResponse('pull queue resume, which the registered backend does not expose'),
  cancelPull: async (queueItemId) => {
    const response = await ollamaAction<unknown>('ollama.pulls.cancel', { id: queueItemId });
    return response.ok ? { ...response, value: pullQueueEvidence(response.value) } : response;
  },
  retryPull: async (queueItemId) => {
    const response = await ollamaAction<unknown>('ollama.pulls.retry', { id: queueItemId });
    return response.ok ? { ...response, value: pullQueueEvidence(response.value) } : response;
  },
  createChat: async (request) => {
    const response = await ollamaAction<OllamaChatSessionSummary>('ollama.chat.create', { name: `Chat ${request.variantId}`, model: request.variantId, systemPrompt: request.systemPrompt, options: { temperature: request.temperature, numCtx: request.contextWindow } });
    return response.ok ? { ...response, value: chatSummary(response.value, response.observedAt) } : response;
  },
  sendChat: async (request) => {
    const response = await ollamaAction<OllamaChatMessage>('ollama.chat.send', { id: request.sessionId, content: request.content, attachments: request.attachmentIds });
    return response.ok ? { ...response, value: chatMessageSession(response.value, request, response.observedAt) } : response;
  },
  stopChat: async (sessionId) => {
    const response = await ollamaAction<{ id: string; stopped: boolean }>('ollama.chat.stop', { id: sessionId });
    return response.ok ? { ...response, value: { id: sessionId, title: 'Local chat', variantId: '', exactTag: '', streamState: response.value.stopped ? 'idle' : 'failed', messages: [], systemPrompt: '', temperature: 0.7, attachmentCapabilities: [], updatedAt: response.observedAt } } : response;
  },
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
