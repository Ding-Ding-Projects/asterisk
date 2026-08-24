import { useEffect, useMemo, useState } from 'react';
import { ConverterSurface, type ConverterClient } from './converter-surface';
import { OllamaSuite, type OllamaSuiteClient } from './ollama-suite';
import { DocsSurface } from './docs-surface';
import { ChangelogSurface } from './changelog-surface';
import { DOCS_BUNDLE } from './generated/docs-bundle';
import { CHANGELOG_MARKDOWN, CHANGELOG_REPOSITORY_URL } from './generated/changelog-bundle';
import type { BackendResponse, OllamaSuiteSnapshot } from './ollama-suite-model';
import type { ConverterBackendHandlers } from '../../../shared/converter';

type SurfaceRoute = 'converter' | 'ollama' | 'docs' | 'changelog';

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
  pickLocalFile: () => unavailable('Converter', 'local file picker'),
  pickDestinationPath: () => unavailable('Converter', 'destination picker'),
  requestOverwriteConfirmation: () => unavailable('Converter', 'overwrite confirmation'),
  deadlineMs: 15_000,
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

const ollamaClient: OllamaSuiteClient = {
  readSnapshot: () => unavailableOllamaResponse<OllamaSuiteSnapshot>('snapshot'),
  subscribe: () => () => {},
  refreshRuntime: () => unavailableOllamaResponse('runtime refresh'),
  runRuntimeAction: () => unavailableOllamaResponse('runtime action'),
  refreshCatalog: () => unavailableOllamaResponse<OllamaSuiteSnapshot>('catalog refresh'),
  search: () => unavailableOllamaResponse('search'),
  queuePulls: () => unavailableOllamaResponse('pull queue'),
  startPulls: () => unavailableOllamaResponse('pull start'),
  pausePulls: () => unavailableOllamaResponse('pull pause'),
  resumePulls: () => unavailableOllamaResponse('pull resume'),
  cancelPull: () => unavailableOllamaResponse('pull cancellation'),
  retryPull: () => unavailableOllamaResponse('pull retry'),
  createChat: () => unavailableOllamaResponse('chat creation'),
  sendChat: () => unavailableOllamaResponse('chat send'),
  stopChat: () => unavailableOllamaResponse('chat stop'),
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
  return route === 'converter' || route === 'ollama' || route === 'docs' || route === 'changelog' ? route : undefined;
}

export function SurfaceMounts() {
  const [route, setRoute] = useState<SurfaceRoute | undefined>(() => routeFromHash());
  useEffect(() => {
    const onHash = () => setRoute(routeFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const links = useMemo(() => (['converter', 'ollama', 'docs', 'changelog'] as const), []);
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
    </aside>
  );
}
