#!/usr/bin/env node
/**
 * The Chrome DevTools Protocol client a design-parity capture run drives both sides with.
 *
 * scripts/ui-drive/cdp.mjs already does the request/response half of this and is left alone;
 * what a parity run needs on top of it is CDP *events*, because the reference side blocks
 * every outbound request through `Fetch.requestPaused` to prove a capture reached no network.
 * A client that only resolves command replies can never see that event, so this is a
 * superset rather than a second opinion — the isolation preflight below is deliberately the
 * same shape as the one ui-drive already refuses on.
 *
 * Two behaviours are copied deliberately rather than reinvented, both recorded in this
 * project's own working notes:
 *   - Isolation is proven by requiring the target list to hold exactly one entry, of `page`
 *     type. Finding one acceptable target among several proves nothing.
 *   - `awaitPromise` is never passed. On this Node it hangs even for synchronous
 *     expressions, so every evaluated expression here is synchronous and anything
 *     asynchronous is polled instead.
 */

const COMMAND_TIMEOUT_MS = 60_000;

export async function connectCdp(port, { expectedUrlPrefix } = {}) {
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const pages = list.filter((target) => target.type === 'page');
  if (list.length !== 1 || pages.length !== 1) {
    throw new Error(`design-parity-cdp: isolation not proven on port ${port} — ${list.length} target(s): ${list.map((t) => `${t.type}:${t.url}`).join(', ')}`);
  }
  if (expectedUrlPrefix && !pages[0].url.startsWith(expectedUrlPrefix)) {
    throw new Error(`design-parity-cdp: the single page target is '${pages[0].url}', which does not start with the expected '${expectedUrlPrefix}'`);
  }

  const socket = new WebSocket(pages[0].webSocketDebuggerUrl);
  await new Promise((ready, fail) => { socket.onopen = ready; socket.onerror = fail; });

  let nextId = 0;
  const pending = new Map();
  const listeners = new Map();
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolveCommand, rejectCommand } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) rejectCommand(new Error(`${message.error.message} (${JSON.stringify(message.error)})`));
      else resolveCommand(message.result);
      return;
    }
    if (message.method) {
      for (const handler of listeners.get(message.method) ?? []) handler(message.params);
    }
  };

  const send = (method, params = {}) => new Promise((resolveCommand, rejectCommand) => {
    const id = ++nextId;
    pending.set(id, { resolveCommand, rejectCommand });
    socket.send(JSON.stringify({ id, method, params }));
    setTimeout(() => {
      if (pending.has(id)) { pending.delete(id); rejectCommand(new Error(`design-parity-cdp: timeout waiting for ${method}`)); }
    }, COMMAND_TIMEOUT_MS);
  });

  const on = (method, handler) => {
    if (!listeners.has(method)) listeners.set(method, []);
    listeners.get(method).push(handler);
  };

  /** Evaluates a SYNCHRONOUS expression and returns its value; a thrown page error becomes a thrown Node error. */
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true });
    if (result.exceptionDetails) {
      throw new Error(`${result.exceptionDetails.text} :: ${(result.exceptionDetails.exception?.description ?? '').slice(0, 400)}`);
    }
    return result.result.value;
  };

  return { send, on, evaluate, target: pages[0], close: () => socket.close() };
}

export const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

/**
 * Polls a synchronous page expression until it returns a truthy value.
 *
 * `describe` is required and used in the timeout message, because "poll timed out" without
 * naming what never happened is the least useful failure a capture run can produce.
 */
export async function pollUntil(evaluate, expression, { timeoutMs = 30_000, intervalMs = 120, describe }) {
  if (!describe) throw new Error('pollUntil: describe is required');
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    last = await evaluate(expression);
    if (last) return last;
    await sleep(intervalMs);
  }
  throw new Error(`design-parity-cdp: ${describe} did not become true within ${timeoutMs}ms (last value ${JSON.stringify(last)})`);
}
