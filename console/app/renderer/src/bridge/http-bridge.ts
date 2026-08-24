/**
 * The same `window.dingDesktop` shape the Electron preload bridge exposes, backed by
 * `fetch` against the hosted server's `/api/*` routes instead of `ipcRenderer`.
 *
 * `App.tsx` and every other renderer module read `window.dingDesktop` and nothing
 * else — see `App.tsx`'s `bridge()` method — so installing this before the app mounts
 * is the entire integration. There is exactly one compiled renderer; this file is what
 * lets it run unmodified inside a browser tab instead of only inside Electron.
 */
import type { ControlPlaneRequest, ControlPlaneResponse, ExternalEditorLaunchTarget } from '../../../../shared/control-plane';

async function postJson(path: string, body: unknown): Promise<Response> {
  return fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function hostedEditorFailure(message: string, stage: 'launch' | 'materialization' = 'launch') {
  return { ok: false as const, code: 'NO_EDITOR' as const, message, operationId: crypto.randomUUID(), stage };
}

export function installHttpBridge(): void {
  const api = {
    platform: 'web',
    // A browser tab has no native window frame to control; these are deliberate no-ops
    // rather than missing behaviour — the compiled renderer's three window controls
    // simply do nothing hosted, which is honest given there is nothing to minimize.
    window: {
      minimize: () => {},
      toggleMaximize: () => {},
      close: () => {},
    },
    controlPlane: {
      async request(request: ControlPlaneRequest): Promise<ControlPlaneResponse | undefined> {
        const res = await postJson('/api/control-plane', request);
        if (res.status === 401) {
          window.location.assign('/login.html');
          return undefined;
        }
        return (await res.json()) as ControlPlaneResponse;
      },
    },
    externalEditor: {
      async detect() { return { editors: [], noEditorMessage: 'External editor handoff is available only in the installed desktop console.', persistenceState: 'missing' as const }; },
      async choose(_editorId: string) { return { editors: [], noEditorMessage: 'External editor handoff is available only in the installed desktop console.', persistenceState: 'missing' as const }; },
      async clearChoice() { return { editors: [], noEditorMessage: 'External editor handoff is available only in the installed desktop console.', persistenceState: 'missing' as const }; },
      async resetStorage() { return { editors: [], noEditorMessage: 'External editor handoff is available only in the installed desktop console.', persistenceState: 'missing' as const }; },
      async saveCustom(_record: { name: string; executable: string; supportsFolderWorkspace?: boolean }) { return { editors: [], noEditorMessage: 'External editor handoff is available only in the installed desktop console.', persistenceState: 'missing' as const }; },
      async removeCustom(_editorId: string) { return { editors: [], noEditorMessage: 'External editor handoff is available only in the installed desktop console.', persistenceState: 'missing' as const }; },
      async savePortable(_executable: string) { return { editors: [], noEditorMessage: 'External editor handoff is available only in the installed desktop console.', persistenceState: 'missing' as const }; },
      async pickExecutable() { return { operationId: crypto.randomUUID(), canceled: true, reason: 'user-cancelled' as const }; },
      async pickFolder() { return { operationId: crypto.randomUUID(), canceled: true, reason: 'user-cancelled' as const }; },
      async openDownload(_editorId?: string) { return { ok: false, message: 'Native editor downloads are available only in the installed desktop console.' }; },
      async openProjectFolder(_folder: string, _editorId?: string) { return hostedEditorFailure('External editor handoff is available only in the installed desktop console.'); },
      async launch(_target: ExternalEditorLaunchTarget, _editorId?: string) { return hostedEditorFailure('External editor handoff is available only in the installed desktop console.'); },
      async openExport(_input: { name: string; content: string; editorId?: string }) { return hostedEditorFailure('External editor handoff is available only in the installed desktop console.', 'materialization'); },
      async openMaterializedFile(_input: { name: string; content: string; source: string; editorId?: string }) { return hostedEditorFailure('External editor handoff is available only in the installed desktop console.', 'materialization'); },
    },
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
}

/** True when there is no Electron preload bridge — i.e. this bundle is running in an
 *  ordinary browser tab, whether or not it is actually being server-hosted. Electron
 *  always installs `window.dingDesktop` before the renderer's own scripts run. */
export function isHostedRuntime(): boolean {
  return typeof window !== 'undefined' && !(window as unknown as { dingDesktop?: unknown }).dingDesktop;
}
