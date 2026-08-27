import { useEffect, useRef, useState } from 'react';
import type { DingDesktopApi, UpdaterRestartResult, UpdaterStatusForRenderer } from '../../../shared/control-plane';

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

/**
 * The action behind the rendered restart button. Keeping it narrow makes the user
 * choice, the production preload bridge, and the refusal/error result testable as
 * one seam rather than three unrelated source-text claims.
 */
export async function requestReadyUpdateInstall(
  updater: DingDesktopApi['updater'],
  status: Pick<UpdaterStatusForRenderer, 'restartPending' | 'unsavedDraftCount'>,
): Promise<UpdaterRestartResult> {
  if (status.restartPending) return { ok: false, reason: 'The installer is already starting.' };
  if ((status.unsavedDraftCount ?? 0) > 0) return { ok: false, reason: 'Review, apply, or discard PBX drafts before restarting to install the update.' };
  try {
    return await updater.restartToInstall();
  } catch (error) {
    return { ok: false, reason: `Could not ask the desktop updater to start the installer: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/** Put keyboard focus back on the action that refused, so retry is immediate and
 * the visible error never strands keyboard users elsewhere in the banner. */
export function restoreUpdateRestartFocus(button: Pick<HTMLButtonElement, 'focus'> | null): void {
  queueMicrotask(() => button?.focus());
}

export function UpdateBanner() {
  const [status, setStatus] = useState<UpdaterStatusForRenderer>(NULL_STATUS);
  const acceptedRevision = useRef(-1);
  const bannerRef = useRef<HTMLDivElement | null>(null);
  const restartButtonRef = useRef<HTMLButtonElement | null>(null);
  const [restartError, setRestartError] = useState<string | undefined>();
  const bridge = typeof window !== 'undefined' ? window.dingDesktop : undefined;

  const acceptStatus = (next: UpdaterStatusForRenderer): void => {
    const revision = next.revision ?? 0;
    if (revision < acceptedRevision.current) return;
    const newer = revision > acceptedRevision.current;
    acceptedRevision.current = revision;
    setStatus(next);
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

  /* The banner is fixed to the bottom-right corner, which is exactly where every screen in
   * this console puts its primary action -- Next on the wizard, Apply on a settings page. It
   * was sitting on top of them: a real control, rendered, clickable-looking, and unreachable
   * because a notification was covering it. Driving the built app is what found it; no test
   * had an opinion about two elements overlapping.
   *
   * So it now reserves the height it occupies. Nothing is repositioned and the corner anchor
   * is kept -- the page simply gains that much room underneath, and the action row that used
   * to be behind the banner is pushed clear of it. Cleared again the moment it goes away. */
  useEffect(() => {
    const node = bannerRef.current;
    if (!node || typeof document === 'undefined') return undefined;
    const root = document.documentElement;
    const apply = () => {
      const height = Math.ceil(node.getBoundingClientRect().height);
      /* Exactly what it occupies. The bar is flush -- no margin -- precisely so that this
       * number and the space it really takes cannot drift apart. */
      root.style.setProperty('--update-banner-space', `${height}px`);
    };
    apply();
    /* Its height changes with its own state -- downloading, ready, an error line appearing --
     * so a single measurement at mount would under-reserve the moment it grew. */
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(apply);
    observer?.observe(node);
    return () => {
      observer?.disconnect();
      root.style.removeProperty('--update-banner-space');
    };
  });

  if (!bridge) return null;
  if (status.state === 'idle' || status.state === 'checking' || status.dismissed) return null;


  const versionText = status.latestVersion ? ` (${status.latestVersion})` : '';
  const drafts = status.unsavedDraftCount ?? 0;
  const restartPending = Boolean(status.restartPending);

  const restart = async () => {
    /* Keep the renderer-side refusal explicit too: a disabled control alone is not
     * a safety boundary, and this makes a synthetic click a no-op before it reaches
     * the privileged bridge. The helper repeats the check for direct callers. */
    if (restartPending || drafts > 0) return;
    setRestartError(undefined);
    const result = await requestReadyUpdateInstall(bridge.updater, status);
    if (!result.ok) {
      setRestartError(result.reason ?? 'The installer could not be started. Try again.');
      restoreUpdateRestartFocus(restartButtonRef.current);
    }
  };

  return (
    <div role="status" aria-live="polite" aria-busy={status.state === 'downloading' || restartPending} className="update-banner" ref={bannerRef}>
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
          {status.lastError && <span role="alert">Installer launch failed: {status.lastError}. The verified update is still ready; choose Restart to install update to try again.</span>}
          {restartError && <span role="alert">{restartError}</span>}
          <button type="button" ref={restartButtonRef} disabled={restartPending || drafts > 0} onClick={() => void restart()}>{restartPending ? 'Starting installer…' : 'Restart to install update'}</button>
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
