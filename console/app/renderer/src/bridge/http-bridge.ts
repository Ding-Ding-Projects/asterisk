/**
 * The same `window.dingDesktop` shape the Electron preload bridge exposes, backed by
 * `fetch` against the hosted server's `/api/*` routes instead of `ipcRenderer`.
 *
 * `App.tsx` and every other renderer module read `window.dingDesktop` and nothing
 * else — see `App.tsx`'s `bridge()` method — so installing this before the app mounts
 * is the entire integration. There is exactly one compiled renderer; this file is what
 * lets it run unmodified inside a browser tab instead of only inside Electron.
 */
import type { ControlPlaneRequest, ControlPlaneResponse } from '../../../../shared/control-plane';

async function postJson(path: string, body: unknown): Promise<Response> {
  return fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
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
