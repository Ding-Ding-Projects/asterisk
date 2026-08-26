#!/usr/bin/env node
/**
 * Durable, runtime-agnostic ledger for bounded UI smoke plans.
 *
 * The ledger owns state and evidence decisions only. A later adapter supplies
 * the sanctioned cheap Lowlevel lifecycle. This file never launches a process,
 * opens a browser, connects to CDP, captures pixels, or performs input.
 */
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { LEDGER_ALLOWED_KEYS, validatePrivacyValue } from './ui-smoke-privacy.mjs';
import { dirname, resolve, sep } from 'node:path';

const MAX_EVENT_BYTES = 1024 * 1024;
const REQUIRED_COMPLETE_EVENTS = new Set(['capture-before', 'outcome-receipt-v1', 'capture-after', 'privacy-receipt-v1', 'evidence-receipt-v1', 'atomic-promotion']);
const MAX_OPERATION_MS = 30_000;
const LEGAL_TRANSITIONS = { planned: new Set(['running', 'cancelled', 'stale']), running: new Set(['running', 'paused', 'completed', 'failed', 'cancelled', 'stale']), paused: new Set(['running', 'cancelled', 'stale']), failed: new Set(['running', 'cancelled', 'stale']), cancelled: new Set(['running', 'stale']), stale: new Set(['planned']), completed: new Set(['completed']) };
const REQUIRED_EVENT_FIELDS = ['planId', 'rowId', 'sourceCommit', 'integratedCommit', 'inventoryDigest', 'actionType', 'phase', 'beforeSha256', 'afterSha256', 'status', 'redactionStatus'];

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function fail(message) { throw new Error(`UI smoke ledger refused: ${message}`); }
function read(path) { return JSON.parse(readFileSync(path, 'utf8')); }
function atomicWrite(path, value) {
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  let lastError;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try { renameSync(temporary, path); return; } catch (error) { lastError = error; if (!['EPERM', 'EACCES', 'EBUSY'].includes(error.code)) throw error; }
  }
  throw lastError;
}

export function createLedger({ plan, ledgerPath, rawRunRoot, sourceCommit, integratedCommit, inventoryDigest }) {
  if (!plan || plan.schemaVersion !== 2) fail('schemaVersion 2 plan required');
  const ledgerResolved = ledgerPath ? resolve(ledgerPath) : null; const repositoryRoot = resolve(process.cwd(), 'console'); const rawResolved = rawRunRoot ? resolve(rawRunRoot) : null;
  if (!ledgerResolved || !rawResolved || ledgerResolved === repositoryRoot || ledgerResolved.startsWith(`${repositoryRoot}${sep}`) || (rawResolved !== ledgerResolved && !ledgerResolved.startsWith(`${rawResolved}${sep}`))) fail('ledger must live beneath the task-owned raw run root outside the repository');
  if (!sourceCommit || !integratedCommit || !inventoryDigest) fail('source commit, integrated commit, and inventory digest are required');
  const ledger = {
    schemaVersion: 1,
    planId: plan.planId,
    sourceCommit,
    integratedCommit,
    inventoryDigest,
    rawRunRoot: rawResolved,
    status: 'planned',
    createdAt: new Date().toISOString(),
    batchNumber: plan.batchNumber,
    rowIds: plan.rowIds,
    rowActions: Object.fromEntries((plan.rows ?? []).map((row) => [row.id, row.action?.type ?? null])),
    runtimeIdentity: null,
    events: [],
    rows: Object.fromEntries(plan.rowIds.map((rowId) => [rowId, { status: 'planned', events: [] }])),
  };
  validatePrivacyValue(ledger, { allowedKeys: LEDGER_ALLOWED_KEYS, repositoryRoot, rawRunRoot: rawResolved });
  atomicWrite(ledgerPath, ledger);
  return ledger;
}

export function loadLedger(ledgerPath) {
  if (!existsSync(ledgerPath)) fail('ledger file is missing');
  const ledger = read(ledgerPath);
  if (ledger.schemaVersion !== 1 || !Array.isArray(ledger.events) || !ledger.rows) fail('ledger schema is invalid');
  validatePrivacyValue(ledger, { allowedKeys: LEDGER_ALLOWED_KEYS, repositoryRoot: resolve(process.cwd()), rawRunRoot: ledger.rawRunRoot });
  return ledger;
}

export function resumeLedger({ ledgerPath, plan, sourceCommit, integratedCommit, inventoryDigest }) {
  const ledger = loadLedger(ledgerPath);
  if (ledger.planId !== plan.planId || ledger.sourceCommit !== sourceCommit || ledger.integratedCommit !== integratedCommit || ledger.inventoryDigest !== inventoryDigest) {
    ledger.status = 'stale';
    atomicWrite(ledgerPath, ledger);
    fail('ledger is stale for the requested plan, commit, or inventory digest');
  }
  if (ledger.status === 'completed') return ledger;
  ledger.status = 'running';
  ledger.runtimeIdentity = null;
  for (const row of Object.values(ledger.rows)) if (row.status === 'running') row.status = 'paused';
  atomicWrite(ledgerPath, ledger);
  return ledger;
}

export function recordEvent({ ledgerPath, rowId, event, runtimeIdentity }) {
  const ledger = loadLedger(ledgerPath);
  if (!ledger.rows[rowId]) fail(`unknown row ${rowId}`);
  for (const field of REQUIRED_EVENT_FIELDS) if (!(field in event)) fail(`event is missing ${field}`);
  if (event.planId !== ledger.planId || event.rowId !== rowId || event.sourceCommit !== ledger.sourceCommit || event.integratedCommit !== ledger.integratedCommit || event.inventoryDigest !== ledger.inventoryDigest) fail('event commit, plan, row, or inventory binding does not match the ledger');
  if (ledger.rowActions?.[rowId] && event.actionType !== ledger.rowActions[rowId]) fail('event action does not match the manifest row');
  if (!['capture-before', 'action', 'outcome-receipt-v1', 'capture-after', 'privacy-receipt-v1', 'evidence-receipt-v1', 'atomic-promotion', 'cleanup', 'cancel'].includes(event.phase)) fail('event phase is not in the execution schema');
  if (!['clean'].includes(event.redactionStatus)) fail('event redaction status is not clean');
  if (!LEGAL_TRANSITIONS[ledger.status]?.has(event.status)) fail(`illegal ledger transition ${ledger.status} to ${event.status}`);
  if (event.beforeSha256 !== null && !/^[0-9a-f]{64}$/iu.test(event.beforeSha256)) fail('before hash must be a SHA-256 or null before capture');
  if (event.afterSha256 !== null && !/^[0-9a-f]{64}$/iu.test(event.afterSha256)) fail('after hash must be a SHA-256 or null before capture');
  if (runtimeIdentity?.adapter !== 'ui-smoke-lowlevel-adapter' || !runtimeIdentity?.processId || !runtimeIdentity?.hwnd || !runtimeIdentity?.cdpPort || !runtimeIdentity?.targetId) fail('live runtime identities must come from the configured cheap Lowlevel adapter and be re-resolved before each event');
  const serialized = JSON.stringify(event);
  if (Buffer.byteLength(serialized, 'utf8') > MAX_EVENT_BYTES) fail('event exceeds the bounded byte limit');
  validatePrivacyValue(event, { allowedKeys: LEDGER_ALLOWED_KEYS, repositoryRoot: resolve(process.cwd()), rawRunRoot: ledger.rawRunRoot });
  const next = { ...clone(event), timestamp: event.timestamp ?? new Date().toISOString(), runtimeIdentity: clone(runtimeIdentity) };
  ledger.events.push(next);
  ledger.rows[rowId].events.push(next);
  ledger.rows[rowId].status = next.status === 'failed' ? 'failed' : next.status === 'cancelled' ? 'cancelled' : next.status === 'completed' ? 'completed' : 'running';
  ledger.runtimeIdentity = clone(runtimeIdentity);
  atomicWrite(ledgerPath, ledger);
  return ledger;
}

export async function cancelLedger({ ledgerPath, reason, cleanupOwned, cleanupRequest }) {
  const ledger = loadLedger(ledgerPath);
  if (!reason || reason.length > 512) fail('cancellation reason must be bounded and present');
  if (typeof cleanupOwned !== 'function') fail('cancellation requires cleanupOwned from the Lowlevel adapter');
  const stopReceipt = await cleanupOwned(cleanupRequest);
  if (!stopReceipt || stopReceipt.stopConfirmed !== true) fail('cancellation requires an independent stop receipt');
  ledger.status = 'cancelled';
  ledger.events.push({ timestamp: new Date().toISOString(), type: 'cancel', status: 'cancelled', reason, stopReceipt });
  validatePrivacyValue(ledger, { allowedKeys: LEDGER_ALLOWED_KEYS, repositoryRoot: resolve(process.cwd()), rawRunRoot: ledger.rawRunRoot });
  atomicWrite(ledgerPath, ledger);
  return ledger;
}

export async function boundedOperation(operation, timeoutMs = MAX_OPERATION_MS) {
  if (typeof operation !== 'function') fail('bounded operation must be a function');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > MAX_OPERATION_MS) fail(`timeout must be an integer from 1 to ${MAX_OPERATION_MS} milliseconds`);
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(operation),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('bounded operation timeout')), timeoutMs); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function runCancellableOwnedOperation(operation, { timeoutMs = MAX_OPERATION_MS, signal, confirmStopped } = {}) {
  if (typeof operation !== 'function') fail('owned operation must be a function');
  if (typeof confirmStopped !== 'function') fail('owned operation requires an independent stop confirmation callback');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > MAX_OPERATION_MS) fail(`timeout must be an integer from 1 to ${MAX_OPERATION_MS} milliseconds`);
  const controller = new AbortController();
  let timer;
  const abort = () => controller.abort();
  if (signal) signal.addEventListener('abort', abort, { once: true });
  try {
    const result = await Promise.race([
      Promise.resolve().then(() => operation({ signal: controller.signal })),
      new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('owned operation timeout')); }, timeoutMs); }),
    ]);
    return result;
  } finally {
    if (timer) clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', abort);
    if (controller.signal.aborted && !(await confirmStopped())) fail('owned operation did not independently confirm that it stopped');
  }
}

export function markRowComplete(ledgerPath, rowId) {
  const ledger = loadLedger(ledgerPath);
  const row = ledger.rows[rowId];
  if (!row) fail(`unknown row ${rowId}`);
  const eventTypes = new Set(row.events.map((event) => event.type));
  for (const required of REQUIRED_COMPLETE_EVENTS) if (!eventTypes.has(required)) fail(`${rowId} lacks ${required}`);
  if (row.events.some((event) => !['accepted', 'completed'].includes(event.status) || event.redactionStatus !== 'clean')) fail(`${rowId} contains a non-accepted or non-clean event`);
  row.status = 'completed';
  if (Object.values(ledger.rows).every((candidate) => candidate.status === 'completed')) ledger.status = 'completed';
  atomicWrite(ledgerPath, ledger);
  return ledger;
}

if (process.argv.includes('--help')) console.log('Use the exported ledger functions from a bounded runtime adapter. No runtime action is performed by this module.');