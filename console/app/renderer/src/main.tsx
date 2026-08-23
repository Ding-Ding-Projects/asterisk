import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { UpdateBanner } from './UpdateBanner';
import { installHttpBridge, isHostedRuntime } from './bridge/http-bridge';
import './styles.css';

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

  createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);

  /* Mounted as its own root, deliberately outside the generated console shell: see
   * `UpdateBanner.tsx` for why a persistent, cross-screen banner has no home there. */
  const bannerHost = document.createElement('div');
  bannerHost.id = 'update-banner-host';
  document.body.appendChild(bannerHost);
  createRoot(bannerHost).render(<React.StrictMode><UpdateBanner /></React.StrictMode>);
}

void boot();
