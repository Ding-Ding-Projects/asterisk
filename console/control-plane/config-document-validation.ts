import { analyse, parseAcl } from './acl-model.js';
import {
  parseCel,
  parseFax,
  parseFeatures,
  parseIax,
  parsePhoneprov,
  validateCel,
  validateFax,
  validateFeatures,
  validateIax,
  validatePhoneprov,
} from './subsystem-models.js';
import { parseTlsSettings, validateTlsSettings } from './tls-model.js';
import type { ConfigValue } from './wsl-config-transport.js';

export type ConfigValidationSeverity = 'error' | 'warning' | 'info';

export interface ConfigDocumentFinding {
  severity: ConfigValidationSeverity;
  source: string;
  message: string;
}

/**
 * Structured Asterisk semantic validation belongs only to actual Asterisk INI resources.
 * `StructuredConfigPlanner` is deliberately more general and has callers/tests that plan
 * arbitrary JSON-shaped documents. Scoping here preserves that reusable contract while
 * still gating every PBX Admin document (`/etc/asterisk/*.conf`) on the Asterisk model.
 */
function isAsteriskConfigResource(resource: string): boolean {
  return resource.startsWith('/etc/asterisk/') && resource.endsWith('.conf');
}

function isConfigValue(value: unknown): value is ConfigValue {
  if (!Array.isArray(value)) return false;
  return value.every((section) => {
    if (typeof section !== 'object' || section === null) return false;
    const candidate = section as { name?: unknown; entries?: unknown };
    if (typeof candidate.name !== 'string' || !Array.isArray(candidate.entries)) return false;
    return candidate.entries.every((entry) => {
      if (typeof entry !== 'object' || entry === null) return false;
      const pair = entry as { key?: unknown; value?: unknown };
      return typeof pair.key === 'string' && typeof pair.value === 'string';
    });
  });
}

function mapFindings(
  source: string,
  findings: ReadonlyArray<{ severity: 'error' | 'warning'; message: string }>,
): ConfigDocumentFinding[] {
  return findings.map((finding) => ({ source, severity: finding.severity, message: finding.message }));
}

/** Every `[section]` in `pjsip.conf` declaring `type=transport`, in file order. */
function transportSectionNames(value: ConfigValue): string[] {
  return value
    .filter((section) => section.entries.some(
      (entry) => entry.key === 'type' && entry.value.trim().toLowerCase() === 'transport',
    ))
    .map((section) => section.name);
}

function mapTlsFindings(source: string, value: ConfigValue, kind: 'http' | 'pjsip' | 'stirShaken') {
  if (kind === 'stirShaken' && !value.some((section) => section.name === 'attestation')) return [];
  if (kind === 'pjsip') {
    /* `parseTlsSettings(value, 'pjsip')` with no `sectionName` finds only the FIRST
     * `[transport-*]` section whose protocol is tls, which is fine for a file with one
     * TLS transport and silently blind to every misconfigured one after it in a file
     * with several -- the exact "assumes a certificate nothing has checked" gap this
     * module exists to close. Every declared transport is validated instead; a plain
     * UDP/TCP transport with no cert_file or priv_key_file produces no findings, same
     * as before, because `validateTlsSettings` only reports on a transport that
     * `looksTls`. A document with no `type=transport` section at all (malformed, or
     * simply not pjsip.conf-shaped) keeps the previous single best-effort scan so it is
     * not silently skipped. */
    const names = transportSectionNames(value);
    const targets = names.length > 0 ? names : [undefined];
    return targets.flatMap((name) => validateTlsSettings(
      parseTlsSettings(value, 'pjsip', name === undefined ? undefined : { sectionName: name }),
    ).map((finding) => ({
      source: name === undefined ? source : `${source} [${name}]`,
      severity: finding.severity,
      message: finding.message,
    })));
  }
  const settings = kind === 'http' ? parseTlsSettings(value, 'http') : parseTlsSettings(value, 'stirShaken');
  return validateTlsSettings(settings).map((finding) => ({ source, severity: finding.severity, message: finding.message }));
}

/**
 * Runs typed validators already present in this repository against one desired Asterisk
 * configuration document. Non-Asterisk planner documents are intentionally ignored.
 * Asterisk resources without a typed model still pass through the transaction engine's
 * structural and post-read checks; this function never invents a semantic validator.
 */
export function validateConfigDocument(resource: string, value: unknown): ConfigDocumentFinding[] {
  if (!isAsteriskConfigResource(resource)) return [];

  if (!isConfigValue(value)) {
    return [{ severity: 'error', source: resource, message: 'The desired configuration is not a structured Asterisk ConfigValue.' }];
  }

  try {
    if (resource.endsWith('/acl.conf')) {
      const model = parseAcl(value);
      return model.flatMap((acl) => analyse(acl).map((finding) => ({
        source: resource,
        severity: 'warning' as const,
        message: finding.message,
      })));
    }
    if (resource.endsWith('/http.conf')) return mapTlsFindings(resource, value, 'http');
    if (resource.endsWith('/pjsip.conf')) return mapTlsFindings(resource, value, 'pjsip');
    if (resource.endsWith('/stir_shaken.conf')) return mapTlsFindings(resource, value, 'stirShaken');
    if (resource.endsWith('/cel.conf')) return mapFindings(resource, validateCel(parseCel(value)));
    if (resource.endsWith('/features.conf')) return mapFindings(resource, validateFeatures(parseFeatures(value)));
    if (resource.endsWith('/phoneprov.conf')) return mapFindings(resource, validatePhoneprov(parsePhoneprov(value)));
    if (resource.endsWith('/iax.conf')) return mapFindings(resource, validateIax(parseIax(value)));
    if (resource.endsWith('/res_fax.conf')) return mapFindings(resource, validateFax(parseFax(value, [])));
    if (resource.endsWith('/udptl.conf')) return mapFindings(resource, validateFax(parseFax([], value)));
    return [];
  } catch (error) {
    return [{
      severity: 'error',
      source: resource,
      message: error instanceof Error ? error.message : 'The typed configuration validator failed.',
    }];
  }
}

export function blockingConfigFindings(resource: string, value: unknown): ConfigDocumentFinding[] {
  return validateConfigDocument(resource, value).filter((finding) => finding.severity === 'error');
}
