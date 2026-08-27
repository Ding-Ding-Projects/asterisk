/**
 * Holds a destination route between the operating system handing it over and the renderer
 * being able to act on it.
 *
 * The gap is real and it is the whole reason this exists. A protocol activation that starts
 * the application arrives on the command line before there is a window, let alone a loaded
 * page; one that reaches an already-running instance arrives while the renderer is perfectly
 * ready. Sending in the first case is a message into nothing, and the failure is silent: the
 * link appears to do nothing at all, which is indistinguishable from a link nobody clicked.
 *
 * So delivery is attempted, and a route that could not be delivered is held until `flush()`
 * says the renderer is listening. Nothing here imports Electron: the caller supplies the one
 * function that actually sends, which is what makes the queueing rules testable rather than
 * asserted.
 */
import { parseDestinationRoute, type DestinationRoute } from '../../shared/destination-route.js';

export interface DestinationRouteRouter {
  /**
   * Offers one raw argument or URL. Reports whether it was a route at all, and if it was,
   * whether the renderer took it now or it is being held.
   */
  offer(raw: unknown): { ok: false; reason: string } | { ok: true; delivered: boolean };
  /** Delivers whatever is held, if anything. Returns whether something was actually sent. */
  flush(): boolean;
  /** What is currently held. For tests and for a caller that wants to report it. */
  pending(): DestinationRoute | undefined;
}

/**
 * @param send Delivers one route to the renderer. Returns `false` when there is nowhere to
 *   send it yet, because there is no window or the page has not finished loading. Returning
 *   `true` when nothing received it is what would put this back to being silent, so the
 *   caller's own check matters more than anything in here.
 */
export function createDestinationRouteRouter(send: (route: DestinationRoute) => boolean): DestinationRouteRouter {
  let held: DestinationRoute | undefined;

  const deliver = (route: DestinationRoute): boolean => {
    let sent = false;
    try { sent = send(route) === true; } catch { sent = false; }
    /* Held on failure rather than dropped, and REPLACED rather than queued on success:
     * two links clicked in quick succession before the window is ready are two answers to
     * "where do you want to be", and the person meant the second one. A queue would open
     * the first and then jump away from it. */
    held = sent ? undefined : route;
    return sent;
  };

  return {
    offer(raw) {
      const parsed = parseDestinationRoute(raw);
      /* A refusal must not clear what is held. An unrelated argument arriving after a real
       * route -- a Squirrel event, a stray switch -- would otherwise throw the route away
       * before the window ever opened. */
      if (!parsed.ok) return { ok: false, reason: parsed.reason };
      return { ok: true, delivered: deliver(parsed.route) };
    },
    flush() {
      if (!held) return false;
      return deliver(held);
    },
    pending() { return held; },
  };
}
