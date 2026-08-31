/*
 * Fail-closed contract for built interaction evidence.
 *
 * A capture is useful only when its launch receipt, candidate, packaged output, semantic
 * reading, and picture are one bound claim. This module keeps that decision in one small,
 * DOM-free place so drivers and promotion checks cannot quietly grow different rules.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const LOOPBACK = new Set(['127.0.0.1', 'localhost', '::1']);
const SECRET_KEY = /(?:secret|password|token|credential|privateKey|private_key|accessKey|access_key)/iu;
const SAFE_SECRET_METADATA = /(?:length|bytes|sha256|hash|present|recorded|redacted|omitted|count|available|source|status|policy|verdict)/iu;
const BASE32_SECRET = /[A-Z2-7]{26,}/u;

const problemList = (items) => items.filter((entry) => typeof entry === 'string' && entry.length > 0);

export function normalizeExpectedUrl(value) {
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error('expected URL is required');
  let parsed;
  try { parsed = new URL(value); } catch { throw new Error('expected URL is not valid'); }
  if (parsed.username || parsed.password) throw new Error('expected URL must not carry credentials');
  if (!['file:', 'http:', 'https:'].includes(parsed.protocol)) throw new Error('expected URL uses an unsupported protocol');
  parsed.hash = '';
  return parsed.href;
}

function isAbsolutePath(value) {
  return /^[A-Za-z]:[\\/]/u.test(value) || /^\\\\/u.test(value) || value.startsWith('/');
}

function isRelativeEvidencePath(value, prefix) {
  return typeof value === 'string'
    && value.startsWith(prefix)
    && !isAbsolutePath(value)
    && !value.split('/').includes('..')
    && !value.split('\\').includes('..');
}

function walkPrivateValues(value, path = '$', problems = []) {
  if (typeof value === 'string') {
    if (BASE32_SECRET.test(value)) problems.push(`${path} contains a base32 payload`);
    if (/(?:[?&](?:secret|password|token|credential)=)[^&\s]+/iu.test(value)) {
      problems.push(`${path} contains a credential query value`);
    }
    return problems;
  }
  if (!value || typeof value !== 'object') return problems;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => walkPrivateValues(entry, `${path}[${index}]`, problems));
    return problems;
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (SECRET_KEY.test(key) && !SAFE_SECRET_METADATA.test(key)) {
      if (typeof child === 'string' && child.length > 0) problems.push(`${childPath} carries a private value`);
      else if (child && typeof child === 'object') problems.push(`${childPath} carries a private object`);
      continue;
    }
    walkPrivateValues(child, childPath, problems);
  }
  return problems;
}

export function validateLaunchReceipt(receipt, { port, expectedUrl } = {}) {
  const problems = [];
  if (!receipt || typeof receipt !== 'object') return ['launch receipt is missing'];
  if (receipt.version !== 1) problems.push('launch receipt version is not 1');
  if (typeof receipt.desktop !== 'string' || receipt.desktop.trim().length === 0) problems.push('launch receipt has no desktop name');
  if (!Number.isInteger(receipt.pid) || receipt.pid <= 0) problems.push('launch receipt has no positive process id');
  const process = receipt.process;
  if (!process || typeof process !== 'object') problems.push('launch receipt has no process identity');
  else {
    if (process.pid !== receipt.pid) problems.push('launch receipt process identity does not match pid');
    if (typeof process.creationDate !== 'string' || process.creationDate.length === 0) problems.push('launch receipt has no process creation date');
    if (typeof process.executablePath !== 'string' || !isAbsolutePath(process.executablePath)) problems.push('launch receipt executable path is not absolute');
  }
  if (typeof receipt.runRoot !== 'string' || !isAbsolutePath(receipt.runRoot)) problems.push('launch receipt runRoot is not absolute');
  if (typeof receipt.outputRoot !== 'string' || !isAbsolutePath(receipt.outputRoot)) problems.push('launch receipt outputRoot is not absolute');
  if (receipt.cleaned === true) problems.push('launch receipt is already cleaned');
  const cdp = receipt.cdp;
  if (!cdp || typeof cdp !== 'object') problems.push('launch receipt has no CDP binding');
  else {
    if (!Number.isInteger(cdp.port) || cdp.port < 1 || cdp.port > 65535) problems.push('launch receipt CDP port is invalid');
    if (typeof cdp.expectedUrl !== 'string') problems.push('launch receipt has no expected URL');
    else {
      try { normalizeExpectedUrl(cdp.expectedUrl); } catch (error) { problems.push(`launch receipt expected URL is invalid: ${error.message}`); }
    }
    if (port !== undefined && cdp.port !== port) problems.push('launch receipt CDP port does not match the requested port');
    if (expectedUrl !== undefined) {
      try {
        if (normalizeExpectedUrl(cdp.expectedUrl) !== normalizeExpectedUrl(expectedUrl)) problems.push('launch receipt expected URL does not match the requested URL');
      } catch { problems.push('requested expected URL is invalid'); }
    }
  }
  return problemList(problems);
}

export function assertLaunchReceipt(receipt, options = {}) {
  const problems = validateLaunchReceipt(receipt, options);
  if (problems.length > 0) throw new Error(`launch receipt refused: ${problems.join('; ')}`);
  return receipt;
}

export function proveSingleCDPTarget(targets, { port, expectedUrl } = {}) {
  if (!Array.isArray(targets)) throw new Error('CDP target list is not an array');
  if (targets.length !== 1) throw new Error('CDP target isolation refused: expected exactly one target');
  const [target] = targets;
  if (!target || target.type !== 'page') throw new Error('CDP target isolation refused: the sole target is not a page');
  let actualUrl;
  try { actualUrl = normalizeExpectedUrl(target.url); } catch { throw new Error('CDP target isolation refused: the sole page URL is invalid'); }
  if (expectedUrl !== undefined && actualUrl !== normalizeExpectedUrl(expectedUrl)) {
    throw new Error('CDP target isolation refused: the page URL does not equal the expected URL');
  }
  if (typeof target.webSocketDebuggerUrl !== 'string' || target.webSocketDebuggerUrl.length === 0) {
    throw new Error('CDP target isolation refused: the page has no debugger socket');
  }
  let socket;
  try { socket = new URL(target.webSocketDebuggerUrl); } catch { throw new Error('CDP target isolation refused: debugger socket is invalid'); }
  if (!['ws:', 'wss:'].includes(socket.protocol) || !LOOPBACK.has(socket.hostname)) {
    throw new Error('CDP target isolation refused: debugger socket is not loopback');
  }
  if (port !== undefined && Number(socket.port) !== Number(port)) {
    throw new Error('CDP target isolation refused: debugger socket port does not match');
  }
  return { targetCount: 1, type: 'page', exactUrl: true, loopbackSocket: true };
}

export function boundedEvaluation(value, maxBytes = 262144) {
  if (!Number.isInteger(maxBytes) || maxBytes < 1024 || maxBytes > 1048576) throw new Error('evaluation byte bound is invalid');
  let encoded;
  try { encoded = JSON.stringify(value); } catch { throw new Error('evaluation result is not serializable'); }
  if (typeof encoded !== 'string') throw new Error('evaluation result is undefined');
  const bytes = Buffer.byteLength(encoded, 'utf8');
  if (bytes > maxBytes) throw new Error(`evaluation result exceeds ${maxBytes} bytes`);
  return { value, bytes };
}

export function verifyCaptureLedger(ledger, {
  root, captureRoot = 'console/release/captures/ui-drive', exists = existsSync,
  read = readFileSync, list = readdirSync, requireNoOrphans = false,
} = {}) {
  if (typeof root !== 'string' || root.length === 0) throw new Error('capture ledger root is required');
  const problems = [];
  const references = new Set();
  const entries = Array.isArray(ledger?.ledger) ? ledger.ledger : [];
  if (entries.length === 0) problems.push('capture ledger has no click entries');
  for (const [index, entry] of entries.entries()) {
    const capture = entry?.capture;
    if (!capture || typeof capture !== 'object') {
      if (entry?.skipped) continue;
      problems.push(`ledger entry ${index} has no capture`);
      continue;
    }
    const path = capture.path;
    if (!isRelativeEvidencePath(path, `${captureRoot}/`)) {
      problems.push(`ledger entry ${index} has a non-relative capture path`);
      continue;
    }
    if (references.has(path)) problems.push(`ledger entry ${index} repeats capture path ${path}`);
    references.add(path);
    const absolute = resolve(root, path);
    if (!exists(absolute)) { problems.push(`ledger entry ${index} names a missing capture`); continue; }
    const bytes = read(absolute);
    if (bytes.length !== capture.bytes) problems.push(`ledger entry ${index} has a capture byte-count mismatch`);
    if (createHash('sha256').update(bytes).digest('hex') !== capture.sha256) problems.push(`ledger entry ${index} has a capture digest mismatch`);
  }
  if (requireNoOrphans) {
    const absoluteRoot = resolve(root, captureRoot);
    for (const name of list(absoluteRoot)) {
      if (name.endsWith('.png') && !references.has(`${captureRoot}/${name}`)) problems.push(`capture directory contains an unreferenced PNG: ${name}`);
    }
  }
  return problemList(problems);
}

export function validateClickEvidence(record, {
  candidateSha, artifactSha256, receipt, receiptSha256, targetProof, captureBytes, captureSha256,
} = {}) {
  const problems = [];
  if (!record || typeof record !== 'object') return ['evidence record is missing'];
  if (record.schemaVersion !== 1) problems.push('schemaVersion is not 1');
  if (typeof record.featureId !== 'string' || record.featureId.trim().length === 0) problems.push('featureId is missing');
  const current = candidateSha ?? record.candidateSha;
  if (typeof current !== 'string' || !SHA1.test(current)) problems.push('candidateSha is not a 40-character lowercase SHA');
  else if (record.candidateSha !== current) problems.push('candidateSha is not bound to the current candidate');
  if (!isRelativeEvidencePath(record.artifact, 'console/')) problems.push('artifact is not a repository-relative console path');
  const artifactDigest = artifactSha256 ?? record.artifactSha256;
  if (typeof artifactDigest !== 'string' || !SHA256.test(artifactDigest)) problems.push('artifactSha256 is invalid');
  else if (record.artifactSha256 !== artifactDigest) problems.push('artifactSha256 is not bound to the packaged output');
  if (!isRelativeEvidencePath(record.launchReceiptPath, 'console/release/evidence/')) problems.push('launchReceiptPath is not a repository-relative evidence path');
  if (typeof record.launchReceiptSha256 !== 'string' || !SHA256.test(record.launchReceiptSha256)) problems.push('launchReceiptSha256 is invalid');
  if (receiptSha256 !== undefined && record.launchReceiptSha256 !== receiptSha256) problems.push('launchReceiptSha256 is not bound to the launch receipt');
  if (receipt) problems.push(...validateLaunchReceipt(receipt));
  if (!targetProof || targetProof.targetCount !== 1 || targetProof.type !== 'page' || targetProof.exactUrl !== true || targetProof.loopbackSocket !== true) {
    problems.push('single-target CDP proof is missing or incomplete');
  }
  if (!record.targetProof) problems.push('record target proof is missing');
  else if (JSON.stringify(record.targetProof) !== JSON.stringify(targetProof)) problems.push('record target proof differs from the verified target proof');
  const interaction = record.interaction;
  if (!interaction || typeof interaction !== 'object') problems.push('interaction is missing');
  else {
    if (typeof interaction.action !== 'string' || interaction.action.trim().length === 0) problems.push('interaction action is missing');
    if (typeof interaction.accessibleName !== 'string' || interaction.accessibleName.trim().length === 0) problems.push('accessible name is missing');
    if (!['aria-label', 'text', 'title', 'icon'].includes(interaction.accessibleNameSource)) problems.push('accessible name source is invalid');
    if (!interaction.preState || typeof interaction.preState !== 'object') problems.push('semantic preState is missing');
    if (!interaction.postState || typeof interaction.postState !== 'object') problems.push('semantic postState is missing');
    if (typeof interaction.changed !== 'boolean') problems.push('interaction changed flag is missing');
  }
  const capture = record.capture;
  if (!capture || typeof capture !== 'object') problems.push('capture is missing');
  else {
    if (!isRelativeEvidencePath(capture.path, 'console/release/captures/')) problems.push('capture path is not repository-relative');
    const bytes = captureBytes ?? capture.bytes;
    const digest = captureSha256 ?? capture.sha256;
    if (!Number.isInteger(bytes) || bytes <= 0) problems.push('capture byte count is invalid');
    else if (capture.bytes !== bytes) problems.push('capture byte count is not bound to the inspected picture');
    if (typeof digest !== 'string' || !SHA256.test(digest)) problems.push('capture SHA-256 is invalid');
    else if (capture.sha256 !== digest) problems.push('capture SHA-256 is not bound to the inspected picture');
  }
  const viewport = record.viewport;
  if (!viewport || !Number.isInteger(viewport.width) || viewport.width <= 0 || !Number.isInteger(viewport.height) || viewport.height <= 0) problems.push('viewport is invalid');
  if (!Number.isFinite(record.scale) || record.scale <= 0 || record.scale > 4) problems.push('scale is invalid');
  if (typeof record.theme !== 'string' || record.theme.trim().length === 0) problems.push('theme is missing');
  if (!record.staleness || record.staleness.checked !== true || record.staleness.stale !== false) problems.push('staleness check is missing or failed');
  if (!record.currentness || record.currentness.checked !== true
    || record.currentness.candidateSha !== current
    || record.currentness.artifactSha256 !== artifactDigest) {
    problems.push('currentness proof is missing or does not match the candidate and packaged output');
  }
  const privacy = record.privacy;
  if (!privacy || privacy.secretPayloadRecorded !== false || privacy.privatePayloadValuesRecorded !== false || privacy.verdict !== 'pass') {
    problems.push('privacy verdict is not an explicit pass with payload values excluded');
  }
  if (!privacy || !Number.isInteger(privacy.networkCalls) || privacy.networkCalls < 0) problems.push('privacy network-call count is invalid');
  problems.push(...walkPrivateValues(record));
  return problemList([...new Set(problems)]);
}

export function assertPromotableEvidence(record, options = {}) {
  const problems = validateClickEvidence(record, options);
  if (record?.status !== 'verified') problems.push('record status is not verified');
  if (problems.length > 0) throw new Error(`evidence promotion refused: ${problemList(problems).join('; ')}`);
  return record;
}
