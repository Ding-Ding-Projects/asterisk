#!/usr/bin/env node
/** One recursive privacy validator shared by ledger and promotion paths. */

const SECRET_KEY = /(?:password|pin|secret|token|cookie|authorization|privatekey|clipboard|credential)/iu;
const SECRET_VALUE = /(?:bearer\s+[A-Za-z0-9._~-]+|-----BEGIN[^\n]+-----|(?:password|token|secret|cookie|authorization)\s*[:=])/iu;
export const RECEIPT_ALLOWED_KEYS = new Set(['schemaVersion', 'planId', 'rowId', 'sourceCommit', 'integratedCommit', 'inventoryDigest', 'runtimeIdentity', 'routeTuple', 'target', 'action', 'before', 'after', 'outcome', 'observablePredicate', 'status', 'redactionStatus', 'actionType', 'predicate', 'observed', 'observedAt', 'beforeSha256', 'afterSha256', 'rawRunRootNotCommitted', 'networkRequests', 'targetIsolation', 'redactedKeys', 'state', 'targetName', 'beforeWidth', 'beforeHeight', 'beforePixelSha256', 'afterWidth', 'afterHeight', 'afterPixelSha256', 'beforeMetadataTypes', 'afterMetadataTypes', 'pixelReviewStatus', 'reviewedAt', 'canonicalRoot', 'sourceSha256', 'destinationSha256', 'bytePreserving', 'comparisonPath', 'visualDiffPath', 'surfaceId', 'coverage', 'comparedRowIds', 'referenceSha256', 'builtSha256', 'diffSha256']);
export const LEDGER_ALLOWED_KEYS = new Set(['schemaVersion', 'planId', 'sourceCommit', 'integratedCommit', 'inventoryDigest', 'rawRunRoot', 'status', 'createdAt', 'batchNumber', 'rowIds', 'rowActions', 'runtimeIdentity', 'events', 'rows', 'rowId', 'type', 'actionType', 'phase', 'beforeSha256', 'afterSha256', 'redactionStatus', 'timestamp', 'result', 'reason', 'state', 'adapter', 'artifactPath', 'artifactSha256', 'profileId', 'profilePath', 'desktopName', 'processId', 'hwnd', 'cdpPort', 'targetId', 'cleanupState', 'stopReceipt', 'stopConfirmed']);
function insideRoot(value, root) {
  const normalizedValue = value.replaceAll('\\', '/').toLowerCase();
  const normalizedRoot = root.replaceAll('\\', '/').replace(/\/+$/u, '').toLowerCase();
  return normalizedValue === normalizedRoot || normalizedValue.startsWith(`${normalizedRoot}/`);
}

export function validatePrivacyValue(value, { path = '$', repositoryRoot = null, rawRunRoot = null, allowedKeys = null } = {}) {
  if (Array.isArray(value)) { value.forEach((child, index) => validatePrivacyValue(child, { path: `${path}[${index}]`, repositoryRoot, rawRunRoot, allowedKeys })); return; }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (SECRET_KEY.test(key)) throw new Error(`privacy rejected credential-like key ${path}.${key}`);
      if (allowedKeys && !allowedKeys.has(key)) throw new Error(`privacy rejected unknown key ${path}.${key}`);
      validatePrivacyValue(child, { path: `${path}.${key}`, repositoryRoot, rawRunRoot, allowedKeys });
    }
    return;
  }
  if (typeof value !== 'string') return;
  if (SECRET_VALUE.test(value)) throw new Error(`privacy rejected credential-like value at ${path}`);
  if (rawRunRoot && value.includes(rawRunRoot)) throw new Error(`privacy rejected raw run root at ${path}`);
  if (repositoryRoot && /^[A-Za-z]:[\\/]|^\\\\/u.test(value) && !insideRoot(value, repositoryRoot)) throw new Error(`privacy rejected path outside repository at ${path}`);
}