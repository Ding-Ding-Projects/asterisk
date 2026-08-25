/* Minimal CDP client on Node's built-in WebSocket. Reused by every capture run. */
export async function connect(port = 9333) {
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const pages = list.filter((t) => t.type === 'page');
  if (list.length !== 1 || pages.length !== 1) {
    throw new Error(`isolation not proven: ${list.length} target(s): ` + list.map((t) => `${t.type}:${t.url}`).join(', '));
  }
  const ws = new WebSocket(pages[0].webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); }
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const n = ++id; pending.set(n, { res, rej }); ws.send(JSON.stringify({ id: n, method, params })); setTimeout(() => { if (pending.has(n)) { pending.delete(n); rej(new Error('CDP timeout: ' + method)); } }, 30000); });
  /* awaitPromise is deliberately never passed: on this Node it hangs even for
   * synchronous expressions. Keep every evaluated expression synchronous. */
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' :: ' + (r.exceptionDetails.exception?.description || '').slice(0, 300));
    return r.result.value;
  };
  return { send, evaluate, close: () => ws.close(), target: pages[0] };
}
