/**
 * The product's own destination route: `ding-pbx://destination/<id>?<capture tuple>`.
 *
 * The design-parity evidence has always mapped each of the thirty-two audited destinations
 * to three things: a reference route into the design harness, a product route into this
 * application, and a built capture. Two of those three were real. The product route was a
 * committed string that nothing in `app/` resolved: no protocol was registered, no argument
 * was read, and no navigation would have happened if one had arrived. A route nobody can
 * follow is not a mapping, it is a plan for one, and it read as the former in every file
 * that carried it.
 *
 * This module is the one place the route is spelled, parsed and refused, so the string the
 * evidence records and the string the application accepts cannot drift apart. It is
 * deliberately free of Electron, of the DOM and of the destination catalogue: the main
 * process needs to decide "is this argument even a route" long before the renderer's
 * compiled catalogue is loaded, and the renderer needs to decide "is that a destination I
 * have" against the catalogue itself. Those are two questions, so they are two functions.
 *
 * What the application does with a route it accepts is narrower than what the route can
 * say, and that is a decision rather than an oversight; see `DESTINATION_ROUTE_APPLIES`.
 */

/** The scheme, including its colon, exactly as `URL.protocol` reports it. */
export const DESTINATION_ROUTE_SCHEME = 'ding-pbx:';

/** The authority component. One word, so a future `ding-pbx://server/...` cannot collide. */
export const DESTINATION_ROUTE_HOST = 'destination';

/**
 * Which parts of an accepted route the running application acts on.
 *
 * The route carries the full capture tuple because the evidence it was written for compares
 * two renders at one screen, state, theme, viewport and scale. The application honours the
 * destination and nothing else: a link that silently resized somebody's window or flipped
 * their theme would be a link that edited their settings, and the person who clicked it
 * asked to go to a screen. The other four are still parsed and still validated, so a
 * malformed route is refused whole rather than half-applied: a route that navigated and then
 * quietly ignored `width=nonsense` would be reporting success for a string it did not
 * understand.
 */
export const DESTINATION_ROUTE_APPLIES = Object.freeze(['destinationId'] as const);

/** The five-part capture tuple a route carries, plus the destination it names. */
export interface DestinationRoute {
  destinationId: string;
  state: string;
  theme: 'dark' | 'light';
  width: number;
  height: number;
  scale: number;
}

export type DestinationRouteParse =
  | { ok: true; route: DestinationRoute }
  | { ok: false; reason: string };

export type DestinationRouteResolution =
  | { ok: true; destinationId: string }
  | { ok: false; reason: string };

/** The tuple the parity evidence captures at, and the defaults an omitted field takes. */
export const DESTINATION_ROUTE_DEFAULTS = Object.freeze({
  state: 'default', theme: 'dark' as const, width: 1440, height: 1000, scale: 1,
});

/**
 * Destination ids are lowercase in the compiled catalogue, and this refuses anything else
 * rather than lowercasing it. Two spellings of one route are two routes as far as a log, a
 * bookmark or a piece of evidence is concerned, and only one of them would ever be the one
 * written down.
 */
const DESTINATION_ID = /^[a-z][a-z0-9-]{0,31}$/;

/** Bounds on the viewport fields. Wide enough for any real capture, closed against nonsense. */
const MAX_VIEWPORT = 16384;
const MAX_SCALE = 8;

function readNumber(params: URLSearchParams, key: string, fallback: number, maximum: number): number | string {
  const raw = params.get(key);
  if (raw === null) return fallback;
  if (raw.trim() === '') return `'${key}' is empty`;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return `'${key}' must be a positive number, got '${raw}'`;
  if (value > maximum) return `'${key}' must be at most ${maximum}, got '${raw}'`;
  return value;
}

/**
 * Parses one route string. Knows nothing about which destinations exist; see
 * `resolveDestinationRoute` for that half.
 *
 * Every refusal says what was wrong. A deep link that lands on the dashboard because its id
 * was misspelt is indistinguishable from one that worked, which is why nothing here falls
 * back to a default destination.
 */
export function parseDestinationRoute(raw: unknown): DestinationRouteParse {
  if (typeof raw !== 'string' || raw.trim() === '') return { ok: false, reason: 'no route was supplied' };
  const text = raw.trim();
  let url: URL;
  try { url = new URL(text); } catch { return { ok: false, reason: `'${text}' is not a URL` }; }
  if (url.protocol.toLowerCase() !== DESTINATION_ROUTE_SCHEME) {
    return { ok: false, reason: `scheme is '${url.protocol}', not '${DESTINATION_ROUTE_SCHEME}'` };
  }
  /* The opaque spelling `ding-pbx:destination/dash` parses, carries no authority, and would
   * have to be un-picked from the path. Refused rather than accommodated: one canonical
   * spelling is what lets the evidence file and the handler compare as strings. */
  if (url.hostname === '') return { ok: false, reason: `'${text}' has no '//${DESTINATION_ROUTE_HOST}/' authority` };
  if (url.hostname.toLowerCase() !== DESTINATION_ROUTE_HOST) {
    return { ok: false, reason: `authority is '${url.hostname}', not '${DESTINATION_ROUTE_HOST}'` };
  }
  const segments = url.pathname.split('/').filter((segment) => segment !== '');
  if (segments.length !== 1) {
    return { ok: false, reason: `expected exactly one path segment naming a destination, got '${url.pathname}'` };
  }
  const destinationId = decodeURIComponent(segments[0]);
  if (!DESTINATION_ID.test(destinationId)) {
    return { ok: false, reason: `'${destinationId}' is not a destination id` };
  }
  const params = url.searchParams;
  const state = params.get('state') ?? DESTINATION_ROUTE_DEFAULTS.state;
  /* Wider than a destination id on purpose: the parity inventory's seventeen transient-state
   * families are camelCase (`paletteOpen`, `tabColourOpen`…), so a route that captured one of
   * them would be refused by a lowercase-only rule. Still anchored at a lowercase letter, so
   * `Default` and `default` cannot both be spellings of the same state. */
  if (!/^[a-z][A-Za-z0-9-]{0,31}$/.test(state)) return { ok: false, reason: `'state' is '${state}', which is not a state name` };
  const theme = params.get('theme') ?? DESTINATION_ROUTE_DEFAULTS.theme;
  if (theme !== 'dark' && theme !== 'light') return { ok: false, reason: `'theme' is '${theme}', not 'dark' or 'light'` };
  const width = readNumber(params, 'width', DESTINATION_ROUTE_DEFAULTS.width, MAX_VIEWPORT);
  if (typeof width === 'string') return { ok: false, reason: width };
  const height = readNumber(params, 'height', DESTINATION_ROUTE_DEFAULTS.height, MAX_VIEWPORT);
  if (typeof height === 'string') return { ok: false, reason: height };
  const scale = readNumber(params, 'scale', DESTINATION_ROUTE_DEFAULTS.scale, MAX_SCALE);
  if (typeof scale === 'string') return { ok: false, reason: scale };
  return { ok: true, route: { destinationId, state, theme, width, height, scale } };
}

/**
 * The second half: does this application actually have that destination?
 *
 * Separate from parsing because the two callers know different things. The main process has
 * no catalogue (it holds the window and the command line, not the compiled design), so it
 * can only ask the first question, and asking it is what keeps an arbitrary `http://` or
 * `file://` argument from ever being treated as a navigation instruction. The renderer owns
 * the catalogue and asks both.
 */
export function resolveDestinationRoute(route: DestinationRoute, knownIds: readonly string[]): DestinationRouteResolution {
  if (!Array.isArray(knownIds) || knownIds.length === 0) {
    return { ok: false, reason: 'no destination catalogue was supplied, so nothing can be resolved' };
  }
  if (!knownIds.includes(route.destinationId)) {
    return { ok: false, reason: `this console has no destination called '${route.destinationId}'` };
  }
  return { ok: true, destinationId: route.destinationId };
}

/**
 * Spells one route, in the exact shape `parseDestinationRoute` accepts.
 *
 * This is the string the parity evidence records per destination, so it is generated from
 * the same constants the parser checks against rather than typed twice. A round trip through
 * both is what makes the recorded mapping a fact about the product instead of a hopeful
 * string in a JSON file.
 */
export function formatDestinationRoute(destinationId: string, tuple: Partial<Omit<DestinationRoute, 'destinationId'>> = {}): string {
  if (!DESTINATION_ID.test(destinationId)) throw new Error(`formatDestinationRoute: '${destinationId}' is not a destination id`);
  const params = new URLSearchParams({
    state: tuple.state ?? DESTINATION_ROUTE_DEFAULTS.state,
    theme: tuple.theme ?? DESTINATION_ROUTE_DEFAULTS.theme,
    width: String(tuple.width ?? DESTINATION_ROUTE_DEFAULTS.width),
    height: String(tuple.height ?? DESTINATION_ROUTE_DEFAULTS.height),
    scale: String(tuple.scale ?? DESTINATION_ROUTE_DEFAULTS.scale),
  });
  return `${DESTINATION_ROUTE_SCHEME}//${DESTINATION_ROUTE_HOST}/${destinationId}?${params.toString()}`;
}

/**
 * Picks the first destination route out of a command line, or nothing.
 *
 * Windows hands a registered protocol client the whole URL as one argument, appended to
 * whatever else the process was launched with: a Squirrel event, an Electron switch, the
 * script path in development. Scanning for the first argument that PARSES rather than the
 * last argument on the line is deliberate: `--foo=ding-pbx://…` is a switch, not a route,
 * and `String.includes` would have taken it.
 */
export function firstDestinationRouteArgument(argv: readonly string[]): string | undefined {
  if (!Array.isArray(argv)) return undefined;
  for (const argument of argv) {
    if (typeof argument !== 'string') continue;
    if (parseDestinationRoute(argument).ok) return argument;
  }
  return undefined;
}
