/**
 * A typed view over the transport-security settings scattered across three Asterisk
 * configuration files: the built-in HTTP server (`http.conf`), a PJSIP TLS transport
 * (`pjsip.conf`), and STIR/SHAKEN call attestation (`stir_shaken.conf`).
 *
 * Every other screen in this console assumes certificates already exist and are
 * correctly wired in. Nothing inspects them, nothing validates them, and nothing lets
 * an operator find out why a TLS transport refuses connections. This module is that
 * missing read/validate/render layer — nothing more. It does not touch a filesystem,
 * a network, or a private key's contents; it only interprets the `ConfigValue` shape
 * that `wsl-config-transport.ts` already reads and writes.
 *
 * Three kinds, three genuinely different option vocabularies. Asterisk does not use
 * one TLS settings shape across these files — `http.conf` prefixes everything with
 * `tls`, the PJSIP transport uses bare names PJSIP defines, and STIR/SHAKEN has no
 * "TLS transport" at all, only a certificate URL and a private key path used to sign
 * an Identity header. `TlsKind` exists so a caller cannot accidentally read a PJSIP
 * transport with the HTTP option names and get an object that is silently all
 * `undefined` — the discriminant forces the right vocabulary to be used.
 */
import type { ConfigSection, ConfigValue } from "./wsl-config-transport.js";

export type TlsKind = "http" | "pjsip" | "stirShaken";

export type TlsFindingSeverity = "error" | "warning" | "info";

export interface TlsFinding {
  severity: TlsFindingSeverity;
  message: string;
}

/**
 * The built-in HTTP server's TLS block, read from `[general]` in `http.conf`.
 *
 * Field names mirror the sample's own names with the `tls` prefix removed, since the
 * prefix carries no information once the type itself says `kind: "http"`.
 */
export interface HttpTlsSettings {
  kind: "http";
  enabled?: string;
  bindAddr?: string;
  certFile?: string;
  privateKeyFile?: string;
  cipher?: string;
  disableTlsV1?: string;
  disableTlsV11?: string;
  disableTlsV12?: string;
  serverCipherOrder?: string;
}

/** A PJSIP `[transport-*]` section's TLS-only options, read as Asterisk names them. */
export interface PjsipTlsSettings {
  kind: "pjsip";
  protocol?: string;
  certFile?: string;
  privateKeyFile?: string;
  caListFile?: string;
  caListPath?: string;
  cipher?: string;
  method?: string;
  verifyClient?: string;
  verifyServer?: string;
  requireClientCert?: string;
  allowWildcardCerts?: string;
}

/**
 * STIR/SHAKEN's `[attestation]` object.
 *
 * There is no "certificate file" here: the certificate is published at a URL by the
 * telephone-number issuing authority (`public_cert_url`), and only the private key is
 * a local path. That asymmetry is deliberate in Asterisk's own design and is kept
 * exactly as-is rather than forced into the `certFile` shape the other two kinds use.
 */
export interface StirShakenTlsSettings {
  kind: "stirShaken";
  globalDisable?: string;
  privateKeyFile?: string;
  publicCertUrl?: string;
  attestLevel?: string;
  unknownTnAttestLevel?: string;
}

export type TlsSettings = HttpTlsSettings | PjsipTlsSettings | StirShakenTlsSettings;

const TLS_METHODS = new Set([
  "default",
  "tlsv1",
  "tlsv1_1",
  "tlsv1_2",
  "sslv2",
  "sslv3",
  "sslv23",
]);

/** Methods the sample itself calls out as insecure defaults that should not be relied on. */
const WEAK_TLS_METHODS = new Set(["sslv2", "sslv3", "sslv23", "tlsv1"]);

function findSection(value: ConfigValue, name: string): ConfigSection | undefined {
  return value.find((section) => section.name === name);
}

/** Looks up the last entry with `key`, matching how Asterisk itself treats a repeated key. */
function lookup(section: ConfigSection | undefined, key: string): string | undefined {
  if (!section) return undefined;
  let found: string | undefined;
  for (const entry of section.entries) {
    if (entry.key === key) found = entry.value;
  }
  return found;
}

export interface ParseTlsOptions {
  /**
   * Which section to read. Defaults to `[general]` for `http`, `[attestation]` for
   * `stirShaken`, and the first `[transport-*]` section whose `protocol` is `tls` for
   * `pjsip`. A caller inspecting a specific named transport passes it explicitly.
   */
  sectionName?: string;
}

/**
 * Reads a typed TLS view out of a parsed configuration file.
 *
 * An option that is absent from the section comes back `undefined`, never a value this
 * module invented. Asterisk documents its own compiled-in defaults (`tlsdisablev1`
 * defaults to "yes", `method` defaults to letting PJSIP choose, and so on) — but a
 * default is a claim about what Asterisk will do, and this module has no way to know
 * whether the running Asterisk actually behaves that way. Reporting "not set" and
 * leaving the reader to know Asterisk's own default is honest; guessing a value and
 * presenting it as configured is not.
 */
export function parseTlsSettings(value: ConfigValue, kind: "http", options?: ParseTlsOptions): HttpTlsSettings;
export function parseTlsSettings(value: ConfigValue, kind: "pjsip", options?: ParseTlsOptions): PjsipTlsSettings;
export function parseTlsSettings(
  value: ConfigValue,
  kind: "stirShaken",
  options?: ParseTlsOptions,
): StirShakenTlsSettings;
export function parseTlsSettings(value: ConfigValue, kind: TlsKind, options: ParseTlsOptions = {}): TlsSettings {
  if (kind === "http") {
    const section = findSection(value, options.sectionName ?? "general");
    return {
      kind: "http",
      enabled: lookup(section, "tlsenable"),
      bindAddr: lookup(section, "tlsbindaddr"),
      certFile: lookup(section, "tlscertfile"),
      privateKeyFile: lookup(section, "tlsprivatekey"),
      cipher: lookup(section, "tlscipher"),
      disableTlsV1: lookup(section, "tlsdisablev1"),
      disableTlsV11: lookup(section, "tlsdisablev11"),
      disableTlsV12: lookup(section, "tlsdisablev12"),
      serverCipherOrder: lookup(section, "tlsservercipherorder"),
    };
  }

  if (kind === "pjsip") {
    const section = options.sectionName
      ? findSection(value, options.sectionName)
      : value.find((candidate) => lookup(candidate, "protocol") === "tls");
    return {
      kind: "pjsip",
      protocol: lookup(section, "protocol"),
      certFile: lookup(section, "cert_file"),
      privateKeyFile: lookup(section, "priv_key_file"),
      caListFile: lookup(section, "ca_list_file"),
      caListPath: lookup(section, "ca_list_path"),
      cipher: lookup(section, "cipher"),
      method: lookup(section, "method"),
      verifyClient: lookup(section, "verify_client"),
      verifyServer: lookup(section, "verify_server"),
      requireClientCert: lookup(section, "require_client_cert"),
      allowWildcardCerts: lookup(section, "allow_wildcard_certs"),
    };
  }

  const section = findSection(value, options.sectionName ?? "attestation");
  return {
    kind: "stirShaken",
    globalDisable: lookup(section, "global_disable"),
    privateKeyFile: lookup(section, "private_key_file"),
    publicCertUrl: lookup(section, "public_cert_url"),
    attestLevel: lookup(section, "attest_level"),
    unknownTnAttestLevel: lookup(section, "unknown_tn_attest_level"),
  };
}

function isAbsolutePath(candidate: string): boolean {
  // POSIX absolute (Asterisk itself always runs on a POSIX target through WSL) or a
  // Windows drive-letter path, in case an operator pastes one in by habit.
  return candidate.startsWith("/") || /^[A-Za-z]:[\\/]/u.test(candidate);
}

function isTruthy(value: string | undefined): boolean {
  if (!value) return false;
  return /^(yes|true|1)$/iu.test(value.trim());
}

/**
 * Checks a parsed TLS view for the mistakes that leave a transport silently unusable:
 * TLS turned on with nothing to serve, a relative certificate path Asterisk cannot
 * resolve, a weak or deprecated method the sample itself warns against, and client
 * verification asked for with no certificate authority list to verify against.
 *
 * Findings are advisory sentences, not a pass/fail verdict — the caller decides what
 * severities block an apply.
 */
export function validateTlsSettings(settings: TlsSettings): TlsFinding[] {
  const findings: TlsFinding[] = [];

  if (settings.kind === "http") {
    const enabled = isTruthy(settings.enabled);
    if (enabled && !settings.certFile) {
      findings.push({
        severity: "error",
        message: "TLS is enabled but no tlscertfile is set, so the HTTPS listener has nothing to serve.",
      });
    }
    if (settings.certFile && !isAbsolutePath(settings.certFile)) {
      findings.push({
        severity: "error",
        message: `tlscertfile "${settings.certFile}" is not an absolute path; Asterisk resolves it against its current working directory, which is rarely what is intended.`,
      });
    }
    if (settings.privateKeyFile && !isAbsolutePath(settings.privateKeyFile)) {
      findings.push({
        severity: "error",
        message: `tlsprivatekey "${settings.privateKeyFile}" is not an absolute path.`,
      });
    }
    if (
      settings.certFile &&
      settings.privateKeyFile &&
      settings.certFile === settings.privateKeyFile
    ) {
      findings.push({
        severity: "info",
        message:
          "tlscertfile and tlsprivatekey are the same file. That is legal when the certificate and key are combined in one PEM — worth confirming that is intended.",
      });
    }
    if (enabled && !isTruthy(settings.disableTlsV1)) {
      findings.push({
        severity: "warning",
        message: "TLSv1 is not disabled (tlsdisablev1). The sample recommends leaving it disabled unless a legacy client requires it.",
      });
    }
  } else if (settings.kind === "pjsip") {
    const looksTls = settings.protocol === "tls" || settings.certFile !== undefined || settings.privateKeyFile !== undefined;
    if (looksTls && !settings.certFile) {
      findings.push({
        severity: "error",
        message: "This transport has no cert_file set, so a TLS connection has no certificate to present.",
      });
    }
    if (settings.certFile && !isAbsolutePath(settings.certFile)) {
      findings.push({
        severity: "error",
        message: `cert_file "${settings.certFile}" is not an absolute path.`,
      });
    }
    if (settings.privateKeyFile && !isAbsolutePath(settings.privateKeyFile)) {
      findings.push({
        severity: "error",
        message: `priv_key_file "${settings.privateKeyFile}" is not an absolute path.`,
      });
    }
    if (
      settings.certFile &&
      settings.privateKeyFile &&
      settings.certFile === settings.privateKeyFile
    ) {
      findings.push({
        severity: "info",
        message:
          "cert_file and priv_key_file point at the same file. Legal for a combined PEM — worth checking it is deliberate.",
      });
    }
    if (settings.method && !TLS_METHODS.has(settings.method.toLowerCase())) {
      findings.push({
        severity: "warning",
        message: `method "${settings.method}" is not one of the values the sample documents (default, tlsv1, tlsv1_1, tlsv1_2, sslv2, sslv3, sslv23); Asterisk may reject it outright.`,
      });
    } else if (settings.method && WEAK_TLS_METHODS.has(settings.method.toLowerCase())) {
      findings.push({
        severity: "warning",
        message: `method "${settings.method}" is a deprecated or weak protocol version. Prefer tlsv1_2 unless an old peer requires otherwise.`,
      });
    }
    if (isTruthy(settings.verifyClient) && !settings.caListFile && !settings.caListPath) {
      findings.push({
        severity: "error",
        message: "verify_client is enabled but neither ca_list_file nor ca_list_path is set, so a client certificate can never be verified.",
      });
    }
    if (isTruthy(settings.verifyServer) && !settings.caListFile && !settings.caListPath) {
      findings.push({
        severity: "error",
        message: "verify_server is enabled but neither ca_list_file nor ca_list_path is set, so a server certificate can never be verified.",
      });
    }
  } else {
    if (isTruthy(settings.globalDisable)) {
      findings.push({
        severity: "info",
        message: "global_disable is set, so no Identity headers will be attached to outgoing calls regardless of the rest of this configuration.",
      });
    } else {
      if (!settings.privateKeyFile) {
        findings.push({
          severity: "error",
          message: "Attestation is not globally disabled but no private_key_file is set, so outgoing calls cannot be signed.",
        });
      } else if (!isAbsolutePath(settings.privateKeyFile)) {
        findings.push({
          severity: "error",
          message: `private_key_file "${settings.privateKeyFile}" is not an absolute path.`,
        });
      }
      if (!settings.publicCertUrl) {
        findings.push({
          severity: "error",
          message: "Attestation is not globally disabled but no public_cert_url is set, so recipients have nowhere to fetch the signing certificate from.",
        });
      }
    }
    if (settings.attestLevel && !["A", "B", "C"].includes(settings.attestLevel)) {
      findings.push({
        severity: "error",
        message: `attest_level "${settings.attestLevel}" is not one of A, B, or C.`,
      });
    }
  }

  return findings;
}

/** Fields that could be pulled out of a well-formed certificate without a parsing dependency. */
export interface CertificateSummary {
  /** Whether the base64 body between the PEM markers decoded as valid base64 at all. */
  wellFormed: boolean;
  /**
   * DER length in bytes, once the base64 body decodes cleanly. Reading a certificate's
   * subject, issuer, validity dates, and fingerprint requires walking ASN.1 DER — a real
   * parser, not a few lines of string matching. Building one badly is worse than not
   * having one: an approximated expiry date that is wrong by a day is a thing an
   * operator will trust and be misled by. So those fields are deliberately left
   * `undefined` here rather than guessed at; see the comment below for exactly why.
   */
  subject: undefined;
  issuer: undefined;
  notBefore: undefined;
  notAfter: undefined;
  fingerprint: undefined;
}

const PEM_BLOCK = /-----BEGIN CERTIFICATE-----\r?\n([\s\S]*?)-----END CERTIFICATE-----/u;
const BASE64 = /^[A-Za-z0-9+/=\s]+$/u;

/**
 * Confirms a string is a syntactically well-formed PEM certificate block and reports
 * its decoded DER length. Nothing more.
 *
 * Subject, issuer, validity dates and fingerprint are NOT extracted here. Getting them
 * right needs a real ASN.1/DER walk — tag/length/value parsing, OID tables for the
 * relative-distinguished-name types, UTCTime/GeneralizedTime parsing with their century
 * rollover rule, and a SHA hash for the fingerprint. A hand-rolled shortcut over the
 * base64 bytes (for example scanning for something that looks like a date string) would
 * silently produce a wrong answer on plenty of real certificates rather than failing —
 * and an operator deciding whether to rotate a certificate needs "unknown" far more than
 * they need a confident-looking wrong expiry date. So this function draws the line at
 * what it can extract with total confidence and returns `undefined` for the rest,
 * exactly as the module-level rule for absent settings does.
 */
export function parseCertificateSummary(pem: string): CertificateSummary {
  const match = PEM_BLOCK.exec(pem);
  if (!match) {
    return {
      wellFormed: false,
      subject: undefined,
      issuer: undefined,
      notBefore: undefined,
      notAfter: undefined,
      fingerprint: undefined,
    };
  }
  const body = match[1].replaceAll(/\s+/gu, "");
  const wellFormed = body.length > 0 && body.length % 4 === 0 && BASE64.test(body) && isValidBase64(body);
  return {
    wellFormed,
    subject: undefined,
    issuer: undefined,
    notBefore: undefined,
    notAfter: undefined,
    fingerprint: undefined,
  };
}

function isValidBase64(body: string): boolean {
  try {
    // atob is available in the browser/Electron renderer and in modern Node globals;
    // a throw means the body was not valid base64 despite matching the character class
    // (e.g. stray padding in the middle).
    const decoded = typeof atob === "function" ? atob(body) : Buffer.from(body, "base64").toString("binary");
    return decoded.length > 0;
  } catch {
    return false;
  }
}

export type ExpiryStatus = "valid" | "expiringSoon" | "expired";

export interface ExpiryReport {
  status: ExpiryStatus;
  /** Whole days until `notAfter`. Negative once expired. */
  daysRemaining: number;
}

const EXPIRING_SOON_WINDOW_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Classifies a certificate's remaining lifetime against a caller-supplied "now".
 *
 * `nowMs` is a parameter rather than `Date.now()` so this stays deterministic and
 * testable — there is no other way to exercise the exact-boundary cases otherwise.
 */
export function expiryStatus(notAfter: Date, nowMs: number): ExpiryReport {
  const diffMs = notAfter.getTime() - nowMs;
  const daysRemaining = Math.ceil(diffMs / MS_PER_DAY);
  if (diffMs < 0) return { status: "expired", daysRemaining };
  if (daysRemaining <= EXPIRING_SOON_WINDOW_DAYS) return { status: "expiringSoon", daysRemaining };
  return { status: "valid", daysRemaining };
}

function setEntry(entries: Array<{ key: string; value: string }>, key: string, value: string | undefined): void {
  const index = entries.findIndex((entry) => entry.key === key);
  if (value === undefined) {
    if (index >= 0) entries.splice(index, 1);
    return;
  }
  if (index >= 0) {
    entries[index] = { key, value };
  } else {
    entries.push({ key, value });
  }
}

/**
 * Writes a `TlsSettings` view back into the section it came from, leaving every other
 * section — and every other key within the same section — exactly as it was. A caller
 * that never changed a field gets a config whose `renderConfig()` output is byte-for-byte
 * what it started as, modulo the entry-spacing `renderConfig` already normalizes.
 */
export function toConfigValue(value: ConfigValue, settings: TlsSettings, options: ParseTlsOptions = {}): ConfigValue {
  const sectionName =
    options.sectionName ??
    (settings.kind === "http" ? "general" : settings.kind === "stirShaken" ? "attestation" : undefined);

  const targetIndex =
    sectionName !== undefined
      ? value.findIndex((section) => section.name === sectionName)
      : value.findIndex((section) => lookup(section, "protocol") === "tls");

  if (targetIndex < 0) {
    throw new Error(
      `Cannot write TLS settings: no ${sectionName ? `[${sectionName}]` : "TLS transport"} section exists to write into.`,
    );
  }

  const target = value[targetIndex];
  const entries = target.entries.map((entry) => ({ ...entry }));

  if (settings.kind === "http") {
    setEntry(entries, "tlsenable", settings.enabled);
    setEntry(entries, "tlsbindaddr", settings.bindAddr);
    setEntry(entries, "tlscertfile", settings.certFile);
    setEntry(entries, "tlsprivatekey", settings.privateKeyFile);
    setEntry(entries, "tlscipher", settings.cipher);
    setEntry(entries, "tlsdisablev1", settings.disableTlsV1);
    setEntry(entries, "tlsdisablev11", settings.disableTlsV11);
    setEntry(entries, "tlsdisablev12", settings.disableTlsV12);
    setEntry(entries, "tlsservercipherorder", settings.serverCipherOrder);
  } else if (settings.kind === "pjsip") {
    setEntry(entries, "protocol", settings.protocol);
    setEntry(entries, "cert_file", settings.certFile);
    setEntry(entries, "priv_key_file", settings.privateKeyFile);
    setEntry(entries, "ca_list_file", settings.caListFile);
    setEntry(entries, "ca_list_path", settings.caListPath);
    setEntry(entries, "cipher", settings.cipher);
    setEntry(entries, "method", settings.method);
    setEntry(entries, "verify_client", settings.verifyClient);
    setEntry(entries, "verify_server", settings.verifyServer);
    setEntry(entries, "require_client_cert", settings.requireClientCert);
    setEntry(entries, "allow_wildcard_certs", settings.allowWildcardCerts);
  } else {
    setEntry(entries, "global_disable", settings.globalDisable);
    setEntry(entries, "private_key_file", settings.privateKeyFile);
    setEntry(entries, "public_cert_url", settings.publicCertUrl);
    setEntry(entries, "attest_level", settings.attestLevel);
    setEntry(entries, "unknown_tn_attest_level", settings.unknownTnAttestLevel);
  }

  const next = value.map((section, index) => (index === targetIndex ? { name: target.name, entries } : section));
  return next;
}
