/**
 * The isolation proof for a headless browser, which is not the same proof an Electron app needs.
 *
 * `../ui-drive/cdp.mjs` requires the debugging port to expose exactly one target of any kind.
 * That is exactly right for Electron, where the application owns the whole browser process and
 * a second target really does mean somebody else's window. A headless Chromium exposes its own
 * interface surfaces as targets too: measured on this host, a clean throwaway profile with
 * extensions and sync refused still lists `browser_ui :: chrome://omnibox-popup.top-chrome/`
 * alongside the page. Those are the browser's own chrome, carry no user content, and cannot be
 * a restored tab or an extension -- but they are targets, so the one-target rule refuses a
 * session that is in fact perfectly clean.
 *
 * Loosening the count without replacing what it bought would be the "found one acceptable
 * target among several" mistake, so this asks for MORE than the count did:
 *
 *   - exactly one `page` target, and
 *   - that page's URL is the exact URL the caller asked for, rather than merely a page, and
 *   - every other target carries no content of its own: either `browser_ui` on a `chrome://`
 *     URL, or an internal target sitting on `about:blank` or on no URL at all. Both kinds are
 *     produced by a clean start on this host and neither can hold a document.
 *
 * What that refuses is what actually goes wrong: a restored tab arrives as a second `page`; an
 * extension arrives as a `background_page`, a `service_worker`, or an `other` on a
 * `chrome-extension://` URL; a stray http(s) target of any type is refused outright. So the
 * rule is not "one target" and it is not "at least one acceptable target" either -- it is that
 * every target on the port is accounted for.
 *
 * The complete target list is returned so the run can write it into every evidence record,
 * which makes the isolation claim auditable after the fact rather than merely asserted at the
 * time. A record that names a target nobody expected is a record you can argue with.
 */
const CONTENTLESS = new Set(['', 'about:blank']);

export function assessTargets(targets, expectedUrl) {
  const pages = targets.filter((target) => target.type === 'page');
  const others = targets.filter((target) => target.type !== 'page');
  const problems = [];
  if (pages.length !== 1) {
    problems.push(`${pages.length} page target(s) on the debugging port; exactly one is required`);
  } else if (pages[0].url !== expectedUrl) {
    problems.push(`the single page target is at ${JSON.stringify(pages[0].url)}, not the expected ${JSON.stringify(expectedUrl)}`);
  }
  for (const target of others) {
    const url = target.url ?? '';
    const browserChrome = target.type === 'browser_ui' && url.startsWith('chrome://');
    const contentless = CONTENTLESS.has(url.trim());
    if (!browserChrome && !contentless) {
      problems.push(`unexpected ${target.type} target at ${url.slice(0, 90)} -- beside the page, only the `
        + "browser's own chrome:// interface and its contentless internal targets are allowed");
    }
  }
  return {
    ok: problems.length === 0,
    problems,
    page: pages[0] ?? null,
    inventory: targets.map((target) => ({ type: target.type, url: target.url.slice(0, 120) })),
  };
}

/**
 * Reads the target list, with a deadline.
 *
 * Node's `fetch` has no default timeout, so a browser that accepts the connection and then
 * says nothing hangs the caller permanently -- which is indistinguishable from a slow page and
 * leaves nothing in any log. Every read of the list gets a bound.
 */
export const listTargets = async (port) => (await fetch(`http://127.0.0.1:${port}/json/list`, {
  signal: AbortSignal.timeout(5000),
})).json();

export async function connectToPage(port, expectedUrl) {
  const targets = await listTargets(port);
  const assessment = assessTargets(targets, expectedUrl);
  if (!assessment.ok) {
    throw new Error(`isolation not proven:\n  - ${assessment.problems.join('\n  - ')}`);
  }
  /*
   * The handshake gets its own deadline, because a stale debugger URL neither opens nor errors.
   *
   * After a reload the previous socket is dead and the target list can still be handing out the
   * URL that belonged to the document before it. Opening that one produces a WebSocket that
   * simply never settles -- no `open`, no `error`, no close -- so a caller awaiting it waits
   * forever with a perfectly healthy browser on the other end and nothing at all in any log.
   * Failing fast lets the caller re-read the list and try the URL that is current.
   */
  const ws = new WebSocket(assessment.page.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    const deadline = setTimeout(() => {
      try { ws.close(); } catch { /* nothing to close */ }
      rej(new Error(`the debugger handshake at ${assessment.page.webSocketDebuggerUrl} never completed`));
    }, 5000);
    ws.onopen = () => { clearTimeout(deadline); res(); };
    ws.onerror = (event) => { clearTimeout(deadline); rej(new Error(`the debugger handshake was refused: ${event?.message ?? 'no reason given'}`)); };
  });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { res, rej } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) rej(new Error(JSON.stringify(message.error))); else res(message.result);
  };
  const send = (method, params = {}) => new Promise((res, rej) => {
    const n = ++id;
    pending.set(n, { res, rej });
    ws.send(JSON.stringify({ id: n, method, params }));
    setTimeout(() => { if (pending.has(n)) { pending.delete(n); rej(new Error(`CDP timeout: ${method}`)); } }, 8000);
  });
  /* awaitPromise is deliberately never passed: on this Node it hangs even for synchronous
   * expressions. Keep every evaluated expression synchronous. */
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true });
    if (result.exceptionDetails) {
      throw new Error(`${result.exceptionDetails.text} :: ${(result.exceptionDetails.exception?.description || '').slice(0, 300)}`);
    }
    return result.result.value;
  };
  return { send, evaluate, close: () => ws.close(), targetInventory: assessment.inventory };
}
