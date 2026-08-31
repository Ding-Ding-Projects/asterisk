/* Minimal CDP client on Node's built-in WebSocket. Reused by every capture run. */
import { boundedEvaluation, normalizeExpectedUrl, proveSingleCDPTarget, assertLaunchReceipt } from './evidence-contract.mjs';

export async function connect(portOrOptions = 9333, options = {}) {
  const optionsFromFirst = typeof portOrOptions === 'object' ? portOrOptions : {};
  const port = Number(typeof portOrOptions === 'object' ? optionsFromFirst.port : portOrOptions);
  const config = typeof portOrOptions === 'object' ? optionsFromFirst : options;
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('CDP port is invalid');
  const timeoutMs = Number.isInteger(config.timeoutMs) ? config.timeoutMs : 30000;
  if (timeoutMs < 100 || timeoutMs > 120000) throw new Error('CDP timeout is invalid');
  const expectedUrl = config.expectedUrl ?? config.receipt?.cdp?.expectedUrl;
  if (expectedUrl !== undefined) normalizeExpectedUrl(expectedUrl);
  if (config.receipt) assertLaunchReceipt(config.receipt, { port, expectedUrl });

  const controller = new AbortController();
  const abortTimer = setTimeout(() => controller.abort(), timeoutMs);
  let list;
  try {
    const response = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: controller.signal });
    if (!response.ok) throw new Error(`CDP target list returned HTTP ${response.status}`);
    list = await response.json();
  } catch (error) {
    throw new Error(`CDP target list unavailable: ${error.name === 'AbortError' ? 'timeout' : error.message}`);
  } finally { clearTimeout(abortTimer); }

  let targetProof;
  try { targetProof = proveSingleCDPTarget(list, { port, expectedUrl }); }
  catch (error) { throw new Error(error.message); }
  const target = list[0];
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    const timer = setTimeout(() => rej(new Error('CDP socket open timeout')), timeoutMs);
    ws.onopen = () => { clearTimeout(timer); res(); };
    ws.onerror = (event) => { clearTimeout(timer); rej(new Error(`CDP socket error: ${event?.message ?? 'unknown'}`)); };
  });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (e) => {
    let m;
    try { m = JSON.parse(e.data); } catch { return; }
    if (m.id && pending.has(m.id)) {
      const entry = pending.get(m.id);
      pending.delete(m.id);
      clearTimeout(entry.timer);
      m.error ? entry.rej(new Error(JSON.stringify(m.error))) : entry.res(m.result);
    }
  };
  const send = (method, params = {}) => new Promise((res, rej) => {
    const n = ++id;
    const timer = setTimeout(() => {
      if (pending.has(n)) { pending.delete(n); rej(new Error(`CDP timeout: ${method}`)); }
    }, timeoutMs);
    pending.set(n, { res, rej, timer });
    try { ws.send(JSON.stringify({ id: n, method, params })); }
    catch (error) { clearTimeout(timer); pending.delete(n); rej(error); }
  });
  /* awaitPromise is deliberately never passed: on this Node it hangs even for
   * synchronous expressions. Keep every evaluated expression synchronous. */
  const evaluate = async (expression, { maxResultBytes = 262144 } = {}) => {
    if (typeof expression !== 'string' || expression.length === 0) throw new Error('CDP expression is empty');
    const r = await send('Runtime.evaluate', { expression, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' :: ' + (r.exceptionDetails.exception?.description || '').slice(0, 300));
    return boundedEvaluation(r.result?.value, maxResultBytes).value;
  };
  return { send, evaluate, close: () => ws.close(), target, targetProof };
}
