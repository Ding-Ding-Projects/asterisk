import React from 'react';
import { createRoot } from 'react-dom/client';
import { PbxAdminIntegratedApp } from './PbxAdminIntegratedApp';
import { UpdateBanner } from './UpdateBanner';
import { DimSumSurprise } from './DimSumSurprise';
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

  /* The root is the PBX-admin-integrated shell rather than the plain console one. Both
   * sides of this file changed at once and the merge could have kept either: the hosted
   * bootstrap above arrived on the default branch, and this component arrived here.
   * Dropping the component would have served the console without its FreePBX
   * destinations; dropping the bootstrap would have served it in a browser with no
   * transport and no session check. Both are required, so both are kept. */
  createRoot(document.getElementById('root')!).render(<React.StrictMode><PbxAdminIntegratedApp /></React.StrictMode>);

  /* Mounted as its own root, deliberately outside the generated console shell: see
   * `UpdateBanner.tsx` for why a persistent, cross-screen banner has no home there. */
  const bannerHost = document.createElement('div');
  bannerHost.id = 'update-banner-host';
  /* Above the console, in normal flow, rather than floating over its bottom-right corner.
   * Measured on the built app: at 1456x928 the banner occupied 1004-1424 x 787-904 and the
   * wizard's Next button 1011-1100 x 798-839, so the notification completely covered the
   * screen's primary action. Clearing it from that corner was not possible -- the banner
   * would have had to start below the window's own bottom edge. So it takes a strip at the
   * top and the console shrinks by exactly that much, which is what "a banner like GitHub
   * Desktop" describes in the first place. */
  document.body.insertBefore(bannerHost, document.getElementById('root'));
  createRoot(bannerHost).render(<React.StrictMode><UpdateBanner /></React.StrictMode>);

  /* Mounted as its own root for the same reason the banner above is: see
   * DimSumSurprise.tsx for why a small, cross-screen, non-blocking surface has no home
   * inside the generated console shell. Reaching this line already means the hosted
   * setup/login redirects above did not fire, so the surprise can never appear on
   * either of those screens; DimSumSurprise.tsx's own first-launch marker covers the
   * desktop build, which has no such redirect to rely on. */
  const surpriseHost = document.createElement('div');
  surpriseHost.id = 'dim-sum-surprise-host';
  document.body.appendChild(surpriseHost);
  createRoot(surpriseHost).render(<React.StrictMode><DimSumSurprise /></React.StrictMode>);
}

void boot();
