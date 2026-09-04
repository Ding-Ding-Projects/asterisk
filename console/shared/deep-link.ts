/**
 * The `ding-pbx://` product route: the one address that opens the built application at a
 * named destination.
 *
 * WHY THIS EXISTS. `inventories/design-parity.json` maps every audited destination to three
 * things -- a reference route, a product route and a built capture. Two of the three were
 * real. The product route was a string: `ding-pbx://destination/{id}?…`, generated into
 * `design-reference/capture-manifest.generated.json` for all 32 destinations, and the
 * inventory said so plainly in `captureContract.builtRouteStatus` -- "a committed route
 * template only; no custom protocol handler is registered". Nothing anywhere would refuse
 * it, because nothing anywhere read it. This module is the reader.
 *
 * WHAT IT REFUSES, AND WHY REFUSING MATTERS MORE THAN ACCEPTING. The route carries the
 * five-part capture tuple, and this application cannot honour all five. `theme=light` has
 * nowhere to land -- the compiled design bakes literal dark-mode hex colours rather than
 * token references, which is recorded in App.tsx beside the `p_theme` control that has the
 * same problem. `scale` is the display's device scale factor and no window can be told to
 * change it. A parser that quietly accepted either would leave a link that reports success
 * and does something else, which is the exact defect this project keeps finding. So each
 * one is refused by name, with the reason the caller can show to a person.
 *
 * SHAPE HERE, MEMBERSHIP THERE. `parseDeepLink` validates the URL and nothing more: it
 * runs in the privileged main process, which has no navigation catalogue and should not
 * grow one. `resolveDeepLinkDestination` checks the id against a real catalogue and is
 * called by the renderer, which owns it. Two functions rather than one with an optional
 * strictness argument, because an optional check is a check somebody forgets to ask for.
 */

/** The scheme registered with the operating system. Lower-case; a URL's scheme is
 *  case-insensitive and both Node and Chromium hand it back lower-cased. */
export const DEEP_LINK_SCHEME = 'ding-pbx';

/** The single authority this scheme defines. `ding-pbx://destination/<id>` and nothing
 *  else, so a second authority can be added later without any older link changing meaning. */
export const DEEP_LINK_HOST = 'destination';

/** The window's own declared minimums, from `createWindow` in app/electron/main.ts. A link
 *  asking for a content box smaller than the window will accept is refused rather than
 *  silently clamped: a route that reports success and produces a different size than it
 *  named is the failure this whole module exists to stop. */
export const DEEP_LINK_MIN_WIDTH = 920;
export const DEEP_LINK_MIN_HEIGHT = 640;
/** An upper bound so a malformed or hostile link cannot ask for a window measured in
 *  hundreds of megapixels. Larger than any display this console will meet. */
export const DEEP_LINK_MAX_EDGE = 8192;

/**
 * A parsed, fully honourable route.
 *
 * `state`, `theme` and `scale` are literal types rather than open ones on purpose: the
 * parser refuses every other value, so a consumer that receives a target cannot be holding
 * a theme this build has no colours for, and cannot need a branch for one.
 */
export interface DeepLinkTarget {
  /** The destination id exactly as it was written. Never lower-cased on the caller's
   *  behalf -- catalogue ids are lower-case, so an upper-case id is a mistake worth
   *  reporting rather than a spelling worth guessing at. */
  destinationId: string;
  state: 'default';
  theme: 'dark';
  /** Content width in device-independent pixels, applied to the window by the main process. */
  width: number;
  height: number;
  scale: 1;
}

export type DeepLinkParse =
  | { ok: true; target: DeepLinkTarget }
  | { ok: false; reason: string };

const DESTINATION_ID = /^[a-z][a-z0-9]*$/u;

function refuse(reason: string): DeepLinkParse {
  return { ok: false, reason };
}

/** One positive integer query parameter, defaulted when absent and refused when it is
 *  present and not a whole number inside the bounds above. */
function edge(params: URLSearchParams, key: string, fallback: number, minimum: number): { ok: true; value: number } | { ok: false; reason: string } {
  const raw = params.get(key);
  if (raw === null) return { ok: true, value: fallback };
  const value = Number(raw);
  if (!Number.isInteger(value)) {
    return { ok: false, reason: `'${key}' must be a whole number of pixels, and this link asked for '${raw}'.` };
  }
  if (value < minimum) {
    return { ok: false, reason: `'${key}' must be at least ${minimum}, which is the smallest this window will accept, and this link asked for ${value}.` };
  }
  if (value > DEEP_LINK_MAX_EDGE) {
    return { ok: false, reason: `'${key}' must be at most ${DEEP_LINK_MAX_EDGE}, and this link asked for ${value}.` };
  }
  return { ok: true, value };
}

/**
 * Parses one `ding-pbx://` URL into a target this application can actually carry out, or
 * into the exact reason it cannot.
 *
 * Deliberately takes `unknown`: the argument comes from a command line the operating
 * system assembled, so it is not this process's own data and is not assumed to be a string.
 */
export function parseDeepLink(raw: unknown): DeepLinkParse {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return refuse('A link has to be a non-empty string, and this one was not.');
  }
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return refuse(`'${raw.trim()}' is not a URL this console can read.`);
  }
  if (url.protocol !== `${DEEP_LINK_SCHEME}:`) {
    return refuse(`This console only opens ${DEEP_LINK_SCHEME}:// links, and this one is a '${url.protocol.replace(/:$/u, '')}' link.`);
  }
  /* A URL's host is case-insensitive, so the comparison is, but the id below is not: see
   * DeepLinkTarget.destinationId. `ding-pbx:destination/dash` -- the schemeless-authority
   * form -- parses with an empty host, and is named rather than reported as an unknown
   * authority, because the two mistakes have different fixes. */
  if (url.hostname === '') {
    return refuse(`A ${DEEP_LINK_SCHEME} link needs two slashes after the scheme: ${DEEP_LINK_SCHEME}://${DEEP_LINK_HOST}/<destination>.`);
  }
  if (url.hostname.toLowerCase() !== DEEP_LINK_HOST) {
    return refuse(`'${url.hostname}' is not something this console can open. The only address it knows is ${DEEP_LINK_SCHEME}://${DEEP_LINK_HOST}/<destination>.`);
  }
  const rest = decodeURIComponent(url.pathname).replace(/^\//u, '');
  if (rest === '') {
    return refuse(`This link names no destination. It should read ${DEEP_LINK_SCHEME}://${DEEP_LINK_HOST}/<destination>.`);
  }
  if (rest.includes('/')) {
    return refuse(`'${rest}' is not a destination name. A ${DEEP_LINK_SCHEME} link names exactly one, with nothing after it.`);
  }
  if (!DESTINATION_ID.test(rest)) {
    return refuse(`'${rest}' is not a destination name this console recognises; a destination is lower-case letters and digits, starting with a letter.`);
  }

  const params = url.searchParams;
  const state = params.get('state') ?? 'default';
  if (state !== 'default') {
    return refuse(`This console opens a destination in its default state only, and this link asked for '${state}'.`);
  }
  const theme = params.get('theme') ?? 'dark';
  if (theme === 'light') {
    /* Not a placeholder for work to come, and worth saying in the message rather than only
     * in a comment: this build has no light theme to switch to. The compiled design carries
     * literal dark-mode hex colours rather than token references, so there is nothing for a
     * light palette to replace. Accepting the parameter and rendering dark anyway would be
     * a link that reports success and does something else. */
    return refuse('This console has only a dark theme, so a link asking for the light one cannot be opened as written.');
  }
  if (theme !== 'dark') {
    return refuse(`'${theme}' is not a theme this console has; the only one it renders is 'dark'.`);
  }
  const scaleRaw = params.get('scale');
  if (scaleRaw !== null && scaleRaw !== '1') {
    /* The capture tuple's scale is the display's device scale factor. A window cannot be
     * told to change the scale factor of the screen it is on, so any value but 1 names
     * something no link can deliver. */
    return refuse(`'scale' is the display's own device scale factor and cannot be set by a link; this one asked for '${scaleRaw}'.`);
  }
  const width = edge(params, 'width', 1440, DEEP_LINK_MIN_WIDTH);
  if (!width.ok) return refuse(width.reason);
  const height = edge(params, 'height', 1000, DEEP_LINK_MIN_HEIGHT);
  if (!height.ok) return refuse(height.reason);

  return { ok: true, target: { destinationId: rest, state: 'default', theme: 'dark', width: width.value, height: height.value, scale: 1 } };
}

/**
 * Checks a parsed target's destination against a real navigation catalogue.
 *
 * Separate from `parseDeepLink` because it needs the catalogue and the main process does
 * not have one. The renderer calls it; the reason it returns is meant to be shown.
 */
export function resolveDeepLinkDestination(
  target: DeepLinkTarget,
  knownDestinationIds: readonly string[],
): { ok: true; destinationId: string } | { ok: false; reason: string } {
  if (knownDestinationIds.includes(target.destinationId)) {
    return { ok: true, destinationId: target.destinationId };
  }
  return {
    ok: false,
    reason: `This console has no screen called '${target.destinationId}', so the link could not be opened.`,
  };
}

/**
 * Builds the canonical route for one destination at the default capture tuple.
 *
 * The capture manifest generates its `builtRoute` column from the inventory's own template
 * rather than from this function, and a contract test feeds every one of those generated
 * routes back through `parseDeepLink` -- so the template and this reader are held together
 * by a check rather than by both being edited at the same time.
 */
export function deepLinkFor(
  destinationId: string,
  tuple: { width?: number; height?: number } = {},
): string {
  const params = new URLSearchParams({
    state: 'default',
    theme: 'dark',
    width: String(tuple.width ?? 1440),
    height: String(tuple.height ?? 1000),
    scale: '1',
  });
  return `${DEEP_LINK_SCHEME}://${DEEP_LINK_HOST}/${destinationId}?${params.toString()}`;
}

/**
 * Picks the deep link out of a process command line.
 *
 * Windows delivers a `ding-pbx://` link as one more argument on a fresh command line, mixed
 * in with the executable path and whatever switches the launch already carried, so the link
 * has to be found rather than read from a fixed position. The FIRST match wins and the
 * choice is deliberate: a command line carrying two links is a malformed invocation, and
 * taking the first makes the behaviour deterministic instead of dependent on argument order.
 */
export function firstDeepLinkInArgv(argv: readonly unknown[]): string | undefined {
  const prefix = `${DEEP_LINK_SCHEME}:`;
  for (const entry of argv) {
    if (typeof entry !== 'string') continue;
    const trimmed = entry.trim();
    if (trimmed.toLowerCase().startsWith(prefix)) return trimmed;
  }
  return undefined;
}

/** What the main process hands the renderer: an accepted target, or the refusal and the
 *  link that earned it, so the renderer can say which link it was. A refusal is delivered
 *  rather than dropped -- a link that silently does nothing is indistinguishable from one
 *  the operating system never routed. */
export type DeepLinkDelivery =
  | { ok: true; target: DeepLinkTarget }
  | { ok: false; reason: string; url: string };
