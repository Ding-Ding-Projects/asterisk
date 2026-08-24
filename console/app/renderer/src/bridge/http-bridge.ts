/** Fetch-backed hosted bridge. Authentication failures remain server decisions. */
import type { ControlPlaneRequest, ControlPlaneResponse, NativeHostStatus } from '../../../../shared/control-plane';
import type { DownloadCommand, DownloadTransferReceipt, DownloadTransferSnapshot, ExtensionDownloadHandoff } from '../../../../shared/download-transfer';
import type {
  HostedAuthBridge,
  HostedAuthMutationResult,
  HostedSessionStatus,
} from '../../../../shared/hosted-auth';

const REQUEST_TIMEOUT_MS = 10_000;

interface ApiProblem {
  error?: string;
  message?: string;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<{ response: Response; body: T | ApiProblem }> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(path, {
      ...init,
      credentials: 'same-origin',
      signal: controller.signal,
      headers: init?.body ? { 'Content-Type': 'application/json', ...init.headers } : init?.headers,
    });
    let body: T | ApiProblem = {};
    try { body = await response.json() as T | ApiProblem; } catch { /* Preserve status when a proxy returns no JSON. */ }
    return { response, body };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`The hosted server did not answer within ${REQUEST_TIMEOUT_MS / 1000} seconds.`);
    }
    throw new Error('The hosted server is unavailable.');
  } finally {
    window.clearTimeout(timer);
  }
}

function problemMessage(body: unknown, fallback: string): string {
  return body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
    ? body.message
    : fallback;
}

async function postMutation(path: string): Promise<HostedAuthMutationResult> {
  const { response, body } = await requestJson<HostedAuthMutationResult>(path, { method: 'POST' });
  if (!response.ok) throw new Error(problemMessage(body, `The server refused ${path}.`));
  return body as HostedAuthMutationResult;
}

export function installHttpBridge(): void {
  const unavailableTransfer = (command: DownloadCommand, handoffId = ''): Promise<DownloadTransferReceipt> => Promise.resolve({
    command, handoffId, accepted: false, observedAt: new Date().toISOString(), status: 'rejected', detail: 'Browser-extension transfer handoff is unavailable in hosted mode.',
  });
  const auth: HostedAuthBridge = {
    async getSession(): Promise<HostedSessionStatus> {
      const { response, body } = await requestJson<HostedSessionStatus>('/api/session');
      if (!response.ok) throw new Error(problemMessage(body, 'The server refused the session status request.'));
      return body as HostedSessionStatus;
    },
    async signOut(): Promise<HostedAuthMutationResult> {
      const result = await postMutation('/api/logout');
      window.location.assign('/login.html');
      return result;
    },
    async revokeAllSessions(): Promise<HostedAuthMutationResult> {
      const result = await postMutation('/api/sessions/revoke');
      window.location.assign('/login.html');
      return result;
    },
  };

  const api = {
    platform: 'web',
    window: {
      minimize: () => {},
      toggleMaximize: () => {},
      close: () => {},
    },
    dialog: { pickFolder: async () => undefined },
    controlPlane: {
      async request(request: ControlPlaneRequest): Promise<ControlPlaneResponse> {
        try {
          const { response, body } = await requestJson<ControlPlaneResponse>('/api/control-plane', {
            method: 'POST',
            body: JSON.stringify(request),
          });
          if (response.status === 401) {
            window.location.assign('/login.html');
            return { ok: false, requestId: request.requestId, code: 'UNAUTHENTICATED', message: problemMessage(body, 'Sign in first.') };
          }
          if (response.status === 503) {
            window.location.assign('/login.html');
            return { ok: false, requestId: request.requestId, code: 'ACCOUNT_STORE_CORRUPT', message: problemMessage(body, 'Account storage needs recovery.') };
          }
          if (!response.ok) {
            return { ok: false, requestId: request.requestId, code: 'HOSTED_REQUEST_REFUSED', message: problemMessage(body, 'The hosted server refused the request.') };
          }
          return body as ControlPlaneResponse;
        } catch (error) {
          return {
            ok: false,
            requestId: request.requestId,
            code: 'SERVER_UNAVAILABLE',
            message: error instanceof Error ? error.message : 'The hosted server is unavailable.',
          };
        }
      },
    },
    statusHub: { baseUrl: undefined },
    nativeHost: {
      getStatus: async (): Promise<NativeHostStatus> => ({ state: 'unavailable', message: 'Native extension ingress is unavailable in hosted mode.', retryable: false }),
      register: async (): Promise<NativeHostStatus> => ({ state: 'unavailable', message: 'Native extension ingress is unavailable in hosted mode.', retryable: false }),
      onStatus: (_listener: (status: NativeHostStatus) => void) => () => {},
    },
    downloads: {
      listPendingHandoffs: async (): Promise<ExtensionDownloadHandoff[]> => [],
      start: (handoff: ExtensionDownloadHandoff) => unavailableTransfer('start', handoff.handoffId),
      cancelHandoff: (handoffId: string) => unavailableTransfer('cancel', handoffId),
      command: (_transferId: string, command: Exclude<DownloadCommand, 'start'>) => unavailableTransfer(command),
      getSnapshot: async (_transferId: string): Promise<DownloadTransferSnapshot | undefined> => undefined,
      subscribe: (_transferId: string, _listener: (snapshot: DownloadTransferSnapshot) => void) => () => {},
      onHandoff: (_listener: (handoff: ExtensionDownloadHandoff) => void) => () => {},
      onHandoffCancelled: (_listener: (handoffId: string) => void) => () => {},
      closeWindow: async (_kind: 'start' | 'progress' | 'complete') => {},
      openWindow: async (_kind: 'start' | 'progress' | 'complete') => {},
    },
    converter: {
      pickFile: async () => { throw new Error('The hosted server cannot open a desktop file picker. Choose a local file through the site surface.'); },
      pickDestination: async () => { throw new Error('The hosted server cannot open a desktop destination picker.'); },
      confirmOverwrite: async () => ({ approved: false, detail: 'The hosted server does not overwrite local desktop paths.' }),
    },
    auth,
    updater: {
      // Server mode does not self-update the way the desktop installer does — the
      // operator updates the VM's package the way they update any other server
      // software. Reporting a fixed "idle" state is honest: there is never anything to
      // check for from inside the running process.
      async getStatus() {
        return { state: 'idle' as const, unsavedDraftCount: 0, restartPending: false, revision: 0 };
      },
      async checkNow() {
        return { state: 'idle' as const, unsavedDraftCount: 0, restartPending: false, revision: 0 };
      },
      restartToInstall: async () => ({ ok: false, reason: 'Hosted server mode does not install desktop updates.' }),
      setUnsavedDraftCount: (_count: number) => {},
      dismiss: () => {},
      onStatus: () => () => {},
    },
  };

  (window as unknown as { dingDesktop: typeof api }).dingDesktop = api;
  window.dingHostedAuth = auth;
}

/** Electron installs its own bridge before renderer scripts execute. */
export function isHostedRuntime(): boolean {
  return typeof window !== 'undefined' && !window.dingDesktop;
}

