import { useEffect, useState } from 'react';
import type { UpdaterStatusForRenderer } from '../../../shared/control-plane';

/**
 * The Chrome/GitHub-Desktop-style "an update is ready" banner.
 *
 * Mounted as its own root (see `main.tsx`) rather than folded into the generated
 * `ConsoleShell` — the shell is compiled from the design reference and is never
 * hand-edited, and a persistent cross-screen banner has no natural home inside a
 * per-screen design anyway. It renders nothing until the main process has something to
 * say (see `app/electron/main.ts` and `control-plane/updater.ts`), and it never blocks
 * the rest of the interface: no modal, no focus trap, dismissible, anchored to a
 * screen corner exactly as the house rule for informational surfaces requires.
 */
const NULL_STATUS: UpdaterStatusForRenderer = { state: 'idle' };

export function UpdateBanner() {
  const [status, setStatus] = useState<UpdaterStatusForRenderer>(NULL_STATUS);
  const bridge = typeof window !== 'undefined' ? window.dingDesktop : undefined;

  useEffect(() => {
    if (!bridge) return;
    void bridge.updater.getStatus().then(setStatus);
    return bridge.updater.onStatus(setStatus);
  }, [bridge]);

  if (!bridge) return null;
  if (status.state === 'idle' || status.state === 'checking') return null;

  const versionText = status.latestVersion ? ` (${status.latestVersion})` : '';

  return (
    <div role="status" aria-live="polite" className="update-banner">
      {status.state === 'downloading' && (
        <span>Downloading update{versionText}…</span>
      )}
      {status.state === 'available' && (
        <span>An update{versionText} was found and is downloading.</span>
      )}
      {status.state === 'failed' && (
        <span>Could not check for updates: {status.lastError ?? 'unknown error'}.</span>
      )}
      {status.state === 'ready' && (
        <>
          <span>
            An update{versionText} is ready to install. This build is unsigned — Windows may show an
            unknown-publisher warning during install, exactly as it did for this app.
            {status.releaseUrl && (
              <>
                {' '}
                <a href={status.releaseUrl} target="_blank" rel="noreferrer">Release notes</a>
              </>
            )}
          </span>
          <button type="button" onClick={() => bridge.updater.restartToInstall()}>Restart to install update</button>
          <button type="button" onClick={() => bridge.updater.dismiss()}>Later</button>
        </>
      )}
      {status.state === 'failed' && (
        <button type="button" onClick={() => void bridge.updater.checkNow().then(setStatus)}>Check for updates</button>
      )}
    </div>
  );
}
