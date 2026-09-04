import { useEffect, useState } from 'react';
import type { ControlPlaneRequest, DingDesktopApi, UpdaterStatusForRenderer } from '../../../shared/control-plane';
import { createDurableStorage, type DurableStorage, type DurableStorageBridge } from './durable-storage';
import { modeEnabled } from './attention-modes';
import { DISH_CATALOG } from './dim-sum-catalog';
import {
  createLaunchGate, decideDimSumSurprise, type LaunchGate, type RuntimeSignals,
} from './dim-sum-surprise-context';
import type { Dish, Surprise } from './dim-sum-surprise';
import { dimSumSurpriseAllowed } from './school-mode-view';

/**
 * One gate for the whole running process, exactly like the update banner's own status
 * subscription is one subscription for the whole process (see UpdateBanner.tsx).
 * Module-scope rather than a ref inside the component: React's StrictMode
 * double-invokes an effect body in development (main.tsx renders everything inside
 * `<React.StrictMode>`), and a ref resets itself on every fresh mount rather than
 * surviving across that replay -- this has to survive it, because a StrictMode replay
 * and a genuine second mount are exactly the two ways this component's decision effect
 * could otherwise run twice in one real launch, and "a launch gets exactly one draw" is
 * dim-sum-surprise.ts's own rule, not a suggestion.
 */
const processLaunchGate: LaunchGate = createLaunchGate();

/** Scoped to this feature rather than shared with any other screen's idea of "first
 *  run" -- this console has no onboarding wizard that opens by default, so there is no
 *  existing flag to borrow (see dim-sum-surprise-context.ts). */
const FIRST_LAUNCH_KEY = 'console.dimSum.hasLaunchedBefore';

/** Marks itself seen as a side effect, so asking a second time in the same or a later
 *  launch reports false. Uses the durable-storage seam rather than `localStorage`
 *  directly: the renderer's own `localStorage` never survives a relaunch on the `file://`
 *  origin Electron loads from (see durable-storage.ts's own header), and a first-launch
 *  marker that resets itself every real launch would suppress this feature forever,
 *  which is exactly the kind of quiet dead-again state this lane exists to fix. */
function consumeFirstLaunch(storage: DurableStorage): boolean {
  if (storage.getItem(FIRST_LAUNCH_KEY) === 'yes') return false;
  storage.setItem(FIRST_LAUNCH_KEY, 'yes');
  return true;
}

/**
 * `durable-storage.ts` deliberately types its bridge seam against a plain
 * `Record<string, unknown>` request so that module has no dependency on the shared
 * control-plane types (see its own header comment) -- exactly the same narrowing
 * `App.tsx`'s local `DesktopBridge` interface does for the same reason. The real
 * bridge's `controlPlane.request` is typed against the specific `ControlPlaneRequest`
 * shape, so bridging the two here is a type-level adaptation only: every call
 * `durable-storage.ts` actually makes supplies a real `requestId` and `action`, so the
 * request handed through this adapter is always a genuine `ControlPlaneRequest` at
 * runtime, whatever the parameter's static type says.
 */
function asDurableStorageBridge(bridge: DingDesktopApi | undefined): DurableStorageBridge | undefined {
  if (!bridge) return undefined;
  return { controlPlane: { request: (request) => bridge.controlPlane.request(request as unknown as ControlPlaneRequest) } };
}

export interface DimSumSurpriseProps {
  /** Overridable for testing; defaults to the real (currently empty) bundled catalogue. */
  dishes?: readonly Dish[];
  /** Overridable for testing; defaults to the one process-lifetime gate above. */
  gate?: LaunchGate;
  /** Overridable for testing; defaults to `window.dingDesktop`. Absent in a browser tab
   *  with no privileged process behind it -- every signal below degrades honestly. */
  bridge?: DingDesktopApi | undefined;
  /** Overridable for testing; defaults to `Math.random`. */
  random?: () => number;
}

/**
 * The startup surprise, mounted as its own root in main.tsx for the same reason the
 * update banner is: a small, cross-screen, non-blocking surface has no natural home
 * inside the generated per-screen console shell, which is compiled from the design
 * reference and never hand-edited.
 *
 * The whole decision happens once, from a single snapshot of "what is the app doing
 * right now" taken shortly after mount -- this is a STARTUP surprise, not something
 * that keeps re-checking as the app's state changes later in the session. See
 * dim-sum-surprise-context.ts for the actual decision and dim-sum-surprise.ts for why
 * it can only ever fire once and must never gate anything on the way there.
 */
export function DimSumSurprise(props: DimSumSurpriseProps = {}) {
  const [surprise, setSurprise] = useState<Surprise | undefined>(undefined);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const gate = props.gate ?? processLaunchGate;
    const bridge = props.bridge ?? (typeof window === 'undefined' ? undefined : window.dingDesktop);
    const random = props.random ?? Math.random;
    /* Drawn immediately, before anything asynchronous, so the randomness this launch
     * spends is not itself skewed by how long a bridge round trip happens to take. */
    const draw = random();
    const pick = random();
    const storageHandle = createDurableStorage(asDurableStorageBridge(bridge));

    async function decide(): Promise<void> {
      const [, status] = await Promise.all([
        storageHandle.bootstrap(),
        bridge ? bridge.updater.getStatus().catch((): UpdaterStatusForRenderer | undefined => undefined) : Promise.resolve(undefined),
      ]);
      if (cancelled) return;
      /* School mode's contract is that dim sum behaves as if it were NOT INSTALLED, so
       * this returns before the launch marker below is consumed as well as before
       * anything is drawn. A feature that is not installed does not quietly spend the
       * one first launch it is allowed, and the surprise is therefore still waiting the
       * first time the mode is off rather than having been used up behind the person's
       * back. `dimSumSurpriseAllowed` is `capabilityVisible(storage, 'dimSum')` and
       * nothing else -- the decision stays in school-mode.ts. */
      if (!dimSumSurpriseAllowed(storageHandle.storage)) return;
      /* Consumed only once the async signals above have actually resolved, so a
       * cancelled (unmounted-before-settled) attempt never marks the launch seen
       * without ever having decided anything. */
      const firstLaunch = consumeFirstLaunch(storageHandle.storage);
      const signals: RuntimeSignals = {
        isFirstLaunch: firstLaunch,
        updaterState: status?.state,
        unsavedDraftCount: status?.unsavedDraftCount ?? 0,
        restartPending: status?.restartPending ?? false,
        lowStimulationEnabled: modeEnabled(storageHandle.storage, 'lowStimulation'),
      };
      const result = decideDimSumSurprise({
        dishes: props.dishes ?? DISH_CATALOG, signals, draw, pick, gate,
      });
      if (!result || cancelled) return;
      setSurprise(result);
      setVisible(true);
    }

    void decide();
    return () => { cancelled = true; };
    /* Deliberately empty: this decides once per mount, from props captured at that
     * mount, exactly as a startup surprise should. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Auto-dismiss, per the module's own contract -- nothing waits for this, and nothing
   * else in the console is affected by it going away. */
  useEffect(() => {
    if (!surprise || !visible) return undefined;
    const timer = setTimeout(() => setVisible(false), surprise.dismissAfterMs);
    return () => clearTimeout(timer);
  }, [surprise, visible]);

  if (!surprise || !visible) return null;
  return <DimSumSurpriseCard surprise={surprise} />;
}

/**
 * The card itself, split out from the orchestrating component above so it can be
 * rendered and inspected -- the role, the alt text, the absence of anything blocking --
 * with nothing but a plain `Surprise` value. No bridge, no storage, no timers, no
 * effects: `react-dom/server`'s `renderToStaticMarkup` can exercise this directly,
 * exactly the way `tests/ui/changelog-wired.test.tsx` already exercises other pieces of
 * this console.
 */
export function DimSumSurpriseCard({ surprise }: { surprise: Surprise }) {
  return (
    <div className="dim-sum-surprise" role="status" aria-live="polite">
      <img className="dim-sum-surprise__image" src={surprise.dish.asset} alt={surprise.altText} />
      <span className="dim-sum-surprise__title">{surprise.title}</span>
    </div>
  );
}
