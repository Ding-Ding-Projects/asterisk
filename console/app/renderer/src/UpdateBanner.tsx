import { useEffect, useRef, useState } from 'react';
import type { UpdaterStatusForRenderer } from '../../../shared/control-plane';
import { publishStartupContext, readStartupContext } from './startup-context';

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
const NULL_STATUS: UpdaterStatusForRenderer = { state: 'idle', unsavedDraftCount: 0, restartPending: false, revision: 0 };

export function UpdateBanner() {
  const [status, setStatus] = useState<UpdaterStatusForRenderer>(NULL_STATUS);
  const acceptedRevision = useRef(-1);
  const [restartError, setRestartError] = useState<string | undefined>();
  const bridge = typeof window !== 'undefined' ? window.dingDesktop : undefined;

  const acceptStatus = (next: UpdaterStatusForRenderer): void => {
    const revision = next.revision ?? 0;
    if (revision < acceptedRevision.current) return;
    const newer = revision > acceptedRevision.current;
    acceptedRevision.current = revision;
    setStatus(next);
    const current = readStartupContext();
    publishStartupContext({ ...current, updateActive: next.state === 'available' || next.state === 'downloading' || next.state === 'ready' });
    if (newer && next.state === 'ready' && !next.restartPending) setRestartError(undefined);
  };

  useEffect(() => {
    if (!bridge) return;
    let active = true;
    const apply = (next: UpdaterStatusForRenderer) => {
      if (!active) return;
      acceptStatus(next);
    };
    const unsubscribe = bridge.updater.onStatus(apply);
    void bridge.updater.getStatus().then(apply).catch(() => undefined);
    return () => { active = false; unsubscribe(); };
  }, [bridge]);

  if (!bridge) return null;
  if (status.state === 'idle' || status.state === 'checking' || status.dismissed) return null;

  const versionText = status.latestVersion ? ` (${status.latestVersion})` : '';
  const drafts = status.unsavedDraftCount ?? 0;
  const restartPending = Boolean(status.restartPending);

  const restart = async () => {
    if (restartPending || drafts > 0) return;
    setRestartError(undefined);
    const result = await bridge.updater.restartToInstall();
    if (!result.ok) setRestartError(result.reason ?? 'The installer could not be started. Try again.');
  };

  return (
    <div role="status" aria-live="polite" aria-busy={status.state === 'downloading' || restartPending} className="update-banner">
      {status.state === 'downloading' && (
        <span>Downloading update{versionText}…</span>
      )}
      {status.state === 'available' && (
        <span>An update{versionText} was found and is being prepared for download.</span>
      )}
      {status.state === 'failed' && (
        <span>Could not check for updates: {status.lastError ?? 'unknown error'}.</span>
      )}
      {status.state === 'ready' && (
        <>
          <span>
            {restartPending ? 'Starting the installer. Keep this window open until the launch is acknowledged.' : `An update${versionText} is ready to install. This build is unsigned, so Windows may show an unknown-publisher warning during install.`}
            {status.releaseUrl && (
              <>
                {' '}
                <a href={status.releaseUrl} target="_blank" rel="noreferrer">Release notes</a>
              </>
            )}
          </span>
          {drafts > 0 && <span role="alert">{drafts} PBX draft{drafts === 1 ? '' : 's'} need review, apply, or discard before restart.</span>}
          {restartError && <span role="alert">{restartError}</span>}
          <button type="button" disabled={restartPending || drafts > 0} onClick={() => void restart()}>{restartPending ? 'Starting installer…' : 'Restart to install update'}</button>
          <button type="button" onClick={() => bridge.updater.dismiss()}>Later</button>
        </>
      )}
      {status.state === 'failed' && (
        <button type="button" onClick={() => void bridge.updater.checkNow().then((next) => {
          acceptStatus(next);
        })}>Check for updates</button>
      )}
    </div>
  );
}
