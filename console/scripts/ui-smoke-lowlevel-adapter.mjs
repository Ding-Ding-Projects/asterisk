#!/usr/bin/env node
/**
 * Sanctioned runtime adapter boundary for the future UI smoke executor.
 *
 * The adapter accepts only the configured cheap Lowlevel client and Node's
 * loopback WebSocket. It does not import browser, Chrome, or computer-use
 * automation. The exported functions are inert until a later runtime lane
 * supplies an authorized Lowlevel client and exact launch state.
 */

function fail(message) { throw new Error(`cheap Lowlevel adapter refused: ${message}`); }

export function assertSingleTarget(targets, expectedUrl, expectedPort) {
  if (!Array.isArray(targets)) fail('target response is not an array');
  if (targets.length !== 1) fail(`target isolation requires the entire array to contain exactly one entry, got ${targets.length}`);
  const [target] = targets;
  if (target?.type !== 'page') fail('the sole target is not a page');
  if (target.url !== expectedUrl) fail('the sole target URL is not an exact match');
  if (typeof target.webSocketDebuggerUrl !== 'string' || !target.webSocketDebuggerUrl.startsWith(`ws://127.0.0.1:${expectedPort}/`)) fail('the sole target does not have the expected loopback WebSocket URL');
  return target;
}

export async function readExactTarget({ fetchImpl = fetch, cdpPort, expectedUrl }) {
  if (!Number.isInteger(cdpPort) || cdpPort < 1024 || cdpPort > 65535) fail('CDP port is not bounded');
  const response = await fetchImpl(`http://127.0.0.1:${cdpPort}/json/list`);
  if (!response.ok) fail(`target list returned HTTP ${response.status}`);
  const targets = await response.json();
  return assertSingleTarget(targets, expectedUrl, cdpPort);
}

export async function evaluateSynchronous({ target, expression, timeoutMs = 30000, WebSocketImpl = WebSocket }) {
  if (!target?.webSocketDebuggerUrl || typeof expression !== 'string' || !expression.trim()) fail('target and synchronous expression are required');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000) fail('evaluation timeout is outside the bounded range');
  const socket = new WebSocketImpl(target.webSocketDebuggerUrl);
  const id = 1;
  return await new Promise((resolve, reject) => {
    let timer;
    const close = () => { if (timer) clearTimeout(timer); try { socket.close(); } catch {} };
    timer = setTimeout(() => { close(); reject(new Error('synchronous CDP evaluation timeout')); }, timeoutMs);
    socket.addEventListener('open', () => socket.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, returnByValue: true, awaitPromise: false } })));
    socket.addEventListener('message', (event) => {
      const payload = JSON.parse(String(event.data));
      if (payload.id !== id) return;
      if (payload.error || payload.result?.exceptionDetails) { close(); reject(new Error('CDP evaluation returned an exception')); return; }
      close(); resolve(payload.result?.result?.value);
    });
    socket.addEventListener('error', () => { close(); reject(new Error('CDP WebSocket error')); });
  });
}

export function requireCheapLowlevelClient(client) {
  if (!client || typeof client.call !== 'function') fail('a configured cheap Lowlevel client is required');
  const capabilities = new Set(client.capabilities ?? []);
  for (const tool of ['preflight', 'launch', 'wait-window', 'screenshot', 'cleanup', 'win_send_keys', 'pointer_click', 'input_text', 'pointer_set_value', 'focus', 'drag']) if (!capabilities.has(tool)) fail(`missing ${tool} capability`);
  return client;
}

function locatorExpression(locator) {
  const role = JSON.stringify(locator.role); const name = JSON.stringify(locator.name);
  return `(function(){const e=[...document.querySelectorAll('[role='+${role}+'],button,input,select,textarea')].filter(x => (x.getAttribute('aria-label')||x.textContent||'').trim() === ${name}); if(e.length!==1) throw new Error('locator count '+e.length); return e[0];})()`;
}
function locatorCountExpression(locator) { const role = JSON.stringify(locator.role); const name = JSON.stringify(locator.name); return `([...document.querySelectorAll('[role='+${role}+'],button,input,select,textarea')].filter(x => (x.getAttribute('aria-label')||x.textContent||'').trim() === ${name}).length === 1)`; }
function exactActionExpression(locator, row) {
  const base = locatorExpression(locator); const type = row.action.type; const expected = JSON.stringify(row.action.semantics?.expectedValue ?? null);
  if (type === 'choose-first' || type === 'choose-last' || type === 'search-option' || type === 'keyboard-choose') return `(()=>{const c=${base}; const wanted=${expected}; const options=[...document.querySelectorAll('[role="option"],button')].filter(x=>(x.textContent||'').trim()===String(wanted)); if(options.length!==1) throw new Error('option count '+options.length); options[0].click(); return true;})()`;
  if (type === 'increment' || type === 'decrement') { const index = type === 'increment' ? -1 : 0; return `(()=>{const c=${base}; const buttons=[...c.parentElement.querySelectorAll('button')]; if(!buttons.length) throw new Error('stepper buttons missing'); buttons.at(${index}).click(); return true;})()`; }
  if (type === 'set-min' || type === 'set-mid' || type === 'set-max' || type === 'keyboard-step') return `(function(){const c=${base}; const input=c.matches('input')?c:c.parentElement.querySelector('input[type="range"]'); if(!input) throw new Error('range input missing'); input.value=String(${expected}); input.dispatchEvent(new Event('input',{bubbles:true})); input.dispatchEvent(new Event('change',{bubbles:true})); return true;})()`;
  return `${base}.click(); true`;
}

export async function readObservable({ target, row, evaluate = evaluateSynchronous }) {
  if (!row?.expected?.observablePredicate) fail('row lacks an independent observable predicate');
  const expression = `Boolean(${row.expected.observablePredicate})`;
  const result = await evaluate({ target, expression });
  if (result !== true) fail(`independent observable predicate is false for ${row.id}`);
  return { rowId: row.id, predicate: row.expected.observablePredicate, observed: true, status: 'accepted' };
}

export async function runDestructiveCeremony({ client, hwnd, target, row, evaluate = evaluateSynchronous }) {
  return runDestructiveCeremonyWithClient({ client, hwnd, target, row, evaluate });
}

export async function runDestructiveCeremonyWithClient({ client, hwnd, target, row, evaluate = evaluateSynchronous }) {
  requireCheapLowlevelClient(client);
  if (row.destructiveSafety?.level !== 'destructive' || !hwnd) fail('destructive ceremony requires a destructive row and resolved HWND');
  try {
    const requiredHits = Number.isInteger(row.destructiveSafety.slider?.requiredHits) ? row.destructiveSafety.slider.requiredHits : 3;
    await client.call('pointer_click', { hwnd, target: { role: 'button', name: 'sureCells' }, repeat: 1 });
    await client.call('pointer_click', { hwnd, target: { role: 'button', name: 'sureYes' }, repeat: 1 });
    for (let hit = 0; hit < requiredHits; hit += 1) await client.call('pointer_click', { hwnd, target: { stableId: 'sureCell', index: hit }, repeat: 1 });
    const ready = await evaluate({ target, expression: "[...document.querySelectorAll('button')].some(x => x.textContent.trim()==='Yes, do it' && !x.disabled)" });
    if (ready !== true) fail('destructive ceremony did not reach its ready state');
    const result = await client.call('pointer_click', { hwnd, target: { role: 'button', name: 'Yes, do it' }, repeat: 1 });
    return { result, requiredHits, keysCompleted: ['sureCells', 'sureYes'], independentReadyPredicate: true };
  } catch (error) {
    try { await client.call('win_send_keys', { hwnd, keys: '{ESC}', repeat: 1 }); } catch {}
    throw error;
  }
}

export async function dispatchAction({ client, target, hwnd, row, evaluate = evaluateSynchronous, adapterActions = {} }) {
  requireCheapLowlevelClient(client);
  if (!row?.id || !row.action?.type || !row.target?.selector) fail('row lacks an action and exact locator');
  const locator = row.target.selector;
  const type = row.action.type;
  const clickTypes = new Set(['inspect', 'toggle-on', 'toggle-off', 'open', 'search-option', 'choose-first', 'choose-last', 'keyboard-choose', 'increment', 'decrement', 'set-min', 'set-mid', 'set-max', 'clear', 'open-picker', 'select-bounded-file', 'move-first', 'move-last', 'add-option', 'remove-option', 'reset']);
  let commandReceipt;
  if (clickTypes.has(type) && type !== 'reset') {
    if (!hwnd) fail('pointer action requires the resolved HWND');
    commandReceipt = await client.call('pointer_click', { hwnd, target: locator, actionType: type, expectedValue: row.action.semantics?.expectedValue ?? null, repeat: 1 });
  } else if (type === 'keyboard-toggle' || type === 'keyboard-step' || type === 'keyboard-reorder' || type === 'escape') {
    if (!hwnd) fail('keyboard action requires the resolved HWND');
    const keys = type === 'escape' ? '{ESC}' : type === 'keyboard-toggle' ? '{SPACE}' : type === 'keyboard-step' ? '{ARROWDOWN}' : '{ENTER}';
    commandReceipt = await client.call('win_send_keys', { hwnd, keys, repeat: 1, target: locator });
  } else if (type === 'focus') {
    if (!hwnd) fail('focus action requires the resolved HWND');
    commandReceipt = await client.call('focus', { hwnd, target: locator });
  } else if (type === 'set-bounded-valid' || type === 'invalid-boundary') {
    const value = row.action.boundedFixture?.value ?? row.action.semantics?.expectedValue ?? '';
    const encoded = JSON.stringify(String(value));
    if (!hwnd) fail('text input requires the resolved HWND');
    commandReceipt = await client.call('input_text', { hwnd, target: locator, value: String(value), bounded: true, repeat: 1 });
  } else if (type === 'drag') {
    if (!hwnd) fail('drag action requires the resolved HWND');
    commandReceipt = await client.call('drag', { hwnd, target: locator, bounded: true, repeat: 1 });
  } else if (type === 'reset') {
    if (typeof adapterActions.reset !== 'function') fail('reset action requires the configured runtime reset adapter');
    commandReceipt = await adapterActions.reset({ target, row, evaluate });
  } else if (type === 'destructive-confirm') {
    commandReceipt = await runDestructiveCeremonyWithClient({ client, hwnd, target, row, evaluate });
  } else if (typeof adapterActions[type] === 'function') {
    commandReceipt = await adapterActions[type]({ target, hwnd, row, evaluate, client });
  } else fail(`unsupported exact action type ${type}`);
  const countProof = await evaluate({ target, expression: locatorCountExpression(locator) });
  if (countProof !== true) fail(`locator count changed after ${row.id}`);
  if (row.destructiveSafety?.level === 'destructive' && type !== 'destructive-confirm') { commandReceipt = typeof commandReceipt === 'object' ? commandReceipt : { result: commandReceipt }; commandReceipt.ceremony = await runDestructiveCeremonyWithClient({ client, hwnd, target, row, evaluate }); }
  const outcome = await readObservable({ target, row, evaluate });
  return { rowId: row.id, actionType: type, commandReceipt: { accepted: true, transport: 'cheap-lowlevel-adapter' }, outcome, status: 'accepted' };
}
export function assertAdapterIdentity(identity) {
  if (identity?.adapter !== 'ui-smoke-lowlevel-adapter' || !identity.processId || !identity.hwnd || !identity.cdpPort || !identity.targetId || !identity.desktopName || !identity.profileId) fail('runtime identity was not emitted by the configured adapter');
  return identity;
}

export async function launchOwned(client, launchRequest) {
  requireCheapLowlevelClient(client);
  if (!launchRequest?.executable || !Array.isArray(launchRequest.arguments) || !launchRequest.desktopName || !launchRequest.profilePath) fail('launch request lacks executable, structured arguments, desktop, or profile');
  return assertAdapterIdentity(await client.call('launch', launchRequest));
}

export async function captureOwned(client, captureRequest) {
  requireCheapLowlevelClient(client);
  if (!captureRequest?.hwnd || !captureRequest.path || !captureRequest.phase) fail('capture request lacks resolved HWND, owned path, or phase');
  return assertAdapterIdentity(await client.call('screenshot', captureRequest));
}

export async function cleanupOwned(client, cleanupRequest) {
  requireCheapLowlevelClient(client);
  if (!cleanupRequest?.processId || !cleanupRequest.desktopName || !cleanupRequest.profilePath) fail('cleanup request lacks recorded process, desktop, or profile');
  const receipt = assertAdapterIdentity(await client.call('cleanup', cleanupRequest));
  if (receipt.stopConfirmed !== true) fail('cleanup response lacks independent stop confirmation');
  return receipt;
}