import React from 'react';
import { createRoot } from 'react-dom/client';
import { PbxAdminIntegratedApp } from './PbxAdminIntegratedApp';
import { UpdateBanner } from './UpdateBanner';
import { SurfaceMounts } from './surface-mounts';
import { installHttpBridge, isHostedRuntime } from './bridge/http-bridge';
import './styles.css';
import { mountApplicationRuntime } from './application-runtime';

/**
 * In Electron, `window.dingDesktop` is already installed by the preload script before
 * this module runs. In a browser tab there is no preload, so this installs the
 * fetch-backed equivalent first — see `bridge/http-bridge.ts`. Session enforcement
 * happens server-side (`/api/control-plane` refuses an unauthenticated request), and
 * the bridge itself redirects to `/login.html` on a 401 rather than duplicating that
 * check here.
 */
async function boot() {
  if (isHostedRuntime()) {
    installHttpBridge();
    const res = await fetch('/api/session', { credentials: 'same-origin' }).catch(() => undefined);
    const session = res && res.ok ? await res.json() as { authenticated: boolean; needsSetup: boolean } : undefined;
    if (!session || session.needsSetup) {
      window.location.assign('/setup.html');
      return;
    }
    if (!session.authenticated) {
      window.location.assign('/login.html');
      return;
    }
  }

  await mountApplicationRuntime();

  /* The root is the PBX-admin-integrated shell rather than the plain console one. Both
   * sides of this file changed at once and the merge could have kept either: the hosted
   * bootstrap above arrived on the default branch, and this component arrived here.
   * Dropping the component would have served the console without its FreePBX
   * destinations; dropping the bootstrap would have served it in a browser with no
   * transport and no session check. Both are required, so both are kept. */
  createRoot(document.getElementById('root')!).render(<React.StrictMode><PbxAdminIntegratedApp /></React.StrictMode>);

  const surfaceHost = document.createElement('div');
  surfaceHost.id = 'mounted-surface-host';
  document.body.appendChild(surfaceHost);
  createRoot(surfaceHost).render(<React.StrictMode><SurfaceMounts /></React.StrictMode>);

  /* Mounted as its own root, deliberately outside the generated console shell: see
   * `UpdateBanner.tsx` for why a persistent, cross-screen banner has no home there. */
  const bannerHost = document.createElement('div');
  bannerHost.id = 'update-banner-host';
  document.body.appendChild(bannerHost);
  createRoot(bannerHost).render(<React.StrictMode><UpdateBanner /></React.StrictMode>);
}

void boot();
