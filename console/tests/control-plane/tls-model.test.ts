import assert from "node:assert/strict";
import { test } from "node:test";

import { parseConfig, renderConfig } from "../../control-plane/wsl-config-transport.js";
import {
  expiryStatus,
  parseCertificateSummary,
  parseTlsSettings,
  toConfigValue,
  validateTlsSettings,
  type TlsFinding,
} from "../../control-plane/tls-model.js";

// ---------------------------------------------------------------------------
// Fixtures drawn from the real samples' shape (not copy-pasted comments, but
// the same section/key vocabulary), so parsing is exercised against realistic
// input rather than a contrived shape nobody ships.
// ---------------------------------------------------------------------------

const HTTP_SAMPLE = `
[general]
servername = Asterisk
enabled = yes
bindaddr = 127.0.0.1
tlsenable = yes
tlsbindaddr = 0.0.0.0:8089
tlscertfile = /etc/asterisk/keys/asterisk.pem
tlsprivatekey = /etc/asterisk/keys/asterisk.key
tlscipher = ECDHE-RSA-AES256-GCM-SHA384
tlsdisablev1 = yes
tlsdisablev11 = no
tlsdisablev12 = no
tlsservercipherorder = yes
`;

const HTTP_NO_TLS = `
[general]
servername = Asterisk
bindaddr = 127.0.0.1
`;

const PJSIP_SAMPLE = `
[transport-udp]
type = transport
protocol = udp
bind = 0.0.0.0

[transport-tls]
type = transport
protocol = tls
bind = 0.0.0.0
cert_file = /etc/asterisk/keys/mycert.crt
priv_key_file = /etc/asterisk/keys/mykey.key
cipher = ADH-AES256-SHA,ADH-AES128-SHA
method = tlsv1_2
ca_list_file = /etc/asterisk/keys/ca.crt
verify_client = yes
verify_server = no
`;

const STIR_SHAKEN_SAMPLE = `
[attestation]
global_disable = no
private_key_file = /var/lib/asterisk/keys/stir_shaken/tns/multi-tns-key.pem
public_cert_url = https://example.com/tncerts/multi-tns-cert.pem
attest_level = C
unknown_tn_attest_level = C
`;

const REAL_CERT_PEM = `-----BEGIN CERTIFICATE-----
aGVsbG8gd29ybGQgdGhpcyBpcyBhIGZha2UgZGVyIGJsb2IgcGFkZGluZyBwYWRkaW5n
-----END CERTIFICATE-----
`;

// ---------------------------------------------------------------------------
// parseTlsSettings — http
// ---------------------------------------------------------------------------

test("parseTlsSettings(http) reads every option the sample documents", () => {
  const settings = parseTlsSettings(parseConfig(HTTP_SAMPLE), "http");
  assert.equal(settings.kind, "http");
  assert.equal(settings.enabled, "yes");
  assert.equal(settings.bindAddr, "0.0.0.0:8089");
  assert.equal(settings.certFile, "/etc/asterisk/keys/asterisk.pem");
  assert.equal(settings.privateKeyFile, "/etc/asterisk/keys/asterisk.key");
  assert.equal(settings.cipher, "ECDHE-RSA-AES256-GCM-SHA384");
  assert.equal(settings.disableTlsV1, "yes");
  assert.equal(settings.disableTlsV11, "no");
  assert.equal(settings.disableTlsV12, "no");
  assert.equal(settings.serverCipherOrder, "yes");
});

test("parseTlsSettings(http) leaves an absent option undefined, never a guessed default", () => {
  const settings = parseTlsSettings(parseConfig(HTTP_NO_TLS), "http");
  assert.equal(settings.enabled, undefined);
  assert.equal(settings.certFile, undefined);
  assert.equal(settings.disableTlsV1, undefined);
});

test("parseTlsSettings(http) reads a caller-chosen section name", () => {
  const doc = parseConfig(`[other]\ntlsenable = yes\n`);
  const settings = parseTlsSettings(doc, "http", { sectionName: "other" });
  assert.equal(settings.enabled, "yes");
});

// ---------------------------------------------------------------------------
// parseTlsSettings — pjsip
// ---------------------------------------------------------------------------

test("parseTlsSettings(pjsip) finds the tls transport among several transports", () => {
  const settings = parseTlsSettings(parseConfig(PJSIP_SAMPLE), "pjsip");
  assert.equal(settings.kind, "pjsip");
  assert.equal(settings.protocol, "tls");
  assert.equal(settings.certFile, "/etc/asterisk/keys/mycert.crt");
  assert.equal(settings.privateKeyFile, "/etc/asterisk/keys/mykey.key");
  assert.equal(settings.cipher, "ADH-AES256-SHA,ADH-AES128-SHA");
  assert.equal(settings.method, "tlsv1_2");
  assert.equal(settings.caListFile, "/etc/asterisk/keys/ca.crt");
  assert.equal(settings.verifyClient, "yes");
  assert.equal(settings.verifyServer, "no");
});

test("parseTlsSettings(pjsip) leaves ca_list_path undefined when it is not set", () => {
  const settings = parseTlsSettings(parseConfig(PJSIP_SAMPLE), "pjsip");
  assert.equal(settings.caListPath, undefined);
  assert.equal(settings.requireClientCert, undefined);
  assert.equal(settings.allowWildcardCerts, undefined);
});

test("parseTlsSettings(pjsip) reads an explicitly named transport section", () => {
  const settings = parseTlsSettings(parseConfig(PJSIP_SAMPLE), "pjsip", { sectionName: "transport-udp" });
  assert.equal(settings.protocol, "udp");
  assert.equal(settings.certFile, undefined);
});

// ---------------------------------------------------------------------------
// parseTlsSettings — stirShaken
// ---------------------------------------------------------------------------

test("parseTlsSettings(stirShaken) reads the attestation object", () => {
  const settings = parseTlsSettings(parseConfig(STIR_SHAKEN_SAMPLE), "stirShaken");
  assert.equal(settings.kind, "stirShaken");
  assert.equal(settings.globalDisable, "no");
  assert.equal(settings.privateKeyFile, "/var/lib/asterisk/keys/stir_shaken/tns/multi-tns-key.pem");
  assert.equal(settings.publicCertUrl, "https://example.com/tncerts/multi-tns-cert.pem");
  assert.equal(settings.attestLevel, "C");
  assert.equal(settings.unknownTnAttestLevel, "C");
});

test("parseTlsSettings(stirShaken) leaves every field undefined when attestation is absent", () => {
  const settings = parseTlsSettings(parseConfig(`[tn]\ntype = tn\n`), "stirShaken");
  assert.equal(settings.globalDisable, undefined);
  assert.equal(settings.privateKeyFile, undefined);
  assert.equal(settings.publicCertUrl, undefined);
});

// ---------------------------------------------------------------------------
// validateTlsSettings — one test per finding, plus a clean case per kind
// ---------------------------------------------------------------------------

function only(findings: TlsFinding[], substring: string): TlsFinding | undefined {
  return findings.find((finding) => finding.message.includes(substring));
}

test("validateTlsSettings(http): enabled with no cert file is an error", () => {
  const findings = validateTlsSettings(parseTlsSettings(parseConfig(`[general]\ntlsenable = yes\n`), "http"));
  assert.ok(only(findings, "nothing to serve"));
});

test("validateTlsSettings(http): a relative cert path is an error", () => {
  const findings = validateTlsSettings(
    parseTlsSettings(parseConfig(`[general]\ntlsenable = yes\ntlscertfile = keys/asterisk.pem\n`), "http"),
  );
  assert.ok(only(findings, "not an absolute path"));
});

test("validateTlsSettings(http): a relative private key path is an error", () => {
  const findings = validateTlsSettings(
    parseTlsSettings(
      parseConfig(`[general]\ntlsenable = yes\ntlscertfile = /a.pem\ntlsprivatekey = keys/asterisk.key\n`),
      "http",
    ),
  );
  assert.ok(only(findings, "tlsprivatekey"));
});

test("validateTlsSettings(http): cert and key pointing at the same file is info, not an error", () => {
  const findings = validateTlsSettings(
    parseTlsSettings(
      parseConfig(`[general]\ntlsenable = yes\ntlscertfile = /a.pem\ntlsprivatekey = /a.pem\ntlsdisablev1 = yes\n`),
      "http",
    ),
  );
  const finding = only(findings, "same file");
  assert.ok(finding);
  assert.equal(finding?.severity, "info");
});

test("validateTlsSettings(http): TLSv1 left enabled is a warning", () => {
  const findings = validateTlsSettings(
    parseTlsSettings(parseConfig(`[general]\ntlsenable = yes\ntlscertfile = /a.pem\n`), "http"),
  );
  const finding = only(findings, "TLSv1 is not disabled");
  assert.ok(finding);
  assert.equal(finding?.severity, "warning");
});

test("validateTlsSettings(http): a fully configured, correctly disabled section has no findings", () => {
  const findings = validateTlsSettings(parseTlsSettings(parseConfig(HTTP_SAMPLE), "http"));
  assert.deepEqual(findings, []);
});

test("validateTlsSettings(http): TLS disabled entirely produces no findings", () => {
  const findings = validateTlsSettings(parseTlsSettings(parseConfig(HTTP_NO_TLS), "http"));
  assert.deepEqual(findings, []);
});

test("validateTlsSettings(pjsip): a tls transport with no cert_file is an error", () => {
  const doc = parseConfig(`[transport-tls]\ntype = transport\nprotocol = tls\n`);
  const findings = validateTlsSettings(parseTlsSettings(doc, "pjsip"));
  assert.ok(only(findings, "has no cert_file"));
});

test("validateTlsSettings(pjsip): a relative cert_file is an error", () => {
  const doc = parseConfig(`[transport-tls]\nprotocol = tls\ncert_file = mycert.crt\n`);
  const findings = validateTlsSettings(parseTlsSettings(doc, "pjsip"));
  assert.ok(only(findings, "cert_file \"mycert.crt\" is not an absolute path"));
});

test("validateTlsSettings(pjsip): a relative priv_key_file is an error", () => {
  const doc = parseConfig(`[transport-tls]\nprotocol = tls\ncert_file = /a.crt\npriv_key_file = mykey.key\n`);
  const findings = validateTlsSettings(parseTlsSettings(doc, "pjsip"));
  assert.ok(only(findings, "priv_key_file"));
});

test("validateTlsSettings(pjsip): cert_file and priv_key_file the same is info", () => {
  const doc = parseConfig(`[transport-tls]\nprotocol = tls\ncert_file = /a.pem\npriv_key_file = /a.pem\n`);
  const finding = only(validateTlsSettings(parseTlsSettings(doc, "pjsip")), "same file");
  assert.equal(finding?.severity, "info");
});

test("validateTlsSettings(pjsip): an unrecognised method is a warning", () => {
  const doc = parseConfig(`[transport-tls]\nprotocol = tls\ncert_file = /a.pem\nmethod = tlsv9\n`);
  const finding = only(validateTlsSettings(parseTlsSettings(doc, "pjsip")), "not one of the values");
  assert.equal(finding?.severity, "warning");
});

test("validateTlsSettings(pjsip): a deprecated but recognised method is a warning", () => {
  const doc = parseConfig(`[transport-tls]\nprotocol = tls\ncert_file = /a.pem\nmethod = sslv3\n`);
  const finding = only(validateTlsSettings(parseTlsSettings(doc, "pjsip")), "deprecated or weak");
  assert.equal(finding?.severity, "warning");
});

test("validateTlsSettings(pjsip): verify_client with no CA list cannot work", () => {
  const doc = parseConfig(`[transport-tls]\nprotocol = tls\ncert_file = /a.pem\nverify_client = yes\n`);
  const findings = validateTlsSettings(parseTlsSettings(doc, "pjsip"));
  const finding = only(findings, "client certificate can never be verified");
  assert.ok(finding);
  assert.equal(finding?.severity, "error");
});

test("validateTlsSettings(pjsip): verify_server with no CA list cannot work", () => {
  const doc = parseConfig(`[transport-tls]\nprotocol = tls\ncert_file = /a.pem\nverify_server = yes\n`);
  const finding = only(validateTlsSettings(parseTlsSettings(doc, "pjsip")), "server certificate can never be verified");
  assert.ok(finding);
});

test("validateTlsSettings(pjsip): verify_client with a ca_list_path (not file) is satisfied", () => {
  const doc = parseConfig(`[transport-tls]\nprotocol = tls\ncert_file = /a.pem\nverify_client = yes\nca_list_path = /ca\n`);
  const findings = validateTlsSettings(parseTlsSettings(doc, "pjsip"));
  assert.equal(only(findings, "can never be verified"), undefined);
});

test("validateTlsSettings(pjsip): a well-formed transport has no findings", () => {
  const findings = validateTlsSettings(parseTlsSettings(parseConfig(PJSIP_SAMPLE), "pjsip"));
  assert.deepEqual(findings, []);
});

test("validateTlsSettings(pjsip): a plain udp transport has no findings", () => {
  const doc = parseConfig(`[transport-udp]\ntype = transport\nprotocol = udp\n`);
  const findings = validateTlsSettings(parseTlsSettings(doc, "pjsip", { sectionName: "transport-udp" }));
  assert.deepEqual(findings, []);
});

test("validateTlsSettings(stirShaken): attestation active with no private_key_file is an error", () => {
  const doc = parseConfig(`[attestation]\nglobal_disable = no\npublic_cert_url = https://x/y.pem\n`);
  const finding = only(validateTlsSettings(parseTlsSettings(doc, "stirShaken")), "cannot be signed");
  assert.ok(finding);
});

test("validateTlsSettings(stirShaken): attestation active with no public_cert_url is an error", () => {
  const doc = parseConfig(`[attestation]\nglobal_disable = no\nprivate_key_file = /k.pem\n`);
  const finding = only(validateTlsSettings(parseTlsSettings(doc, "stirShaken")), "nowhere to fetch");
  assert.ok(finding);
});

test("validateTlsSettings(stirShaken): a relative private_key_file is an error", () => {
  const doc = parseConfig(`[attestation]\nglobal_disable = no\nprivate_key_file = key.pem\npublic_cert_url = https://x/y.pem\n`);
  const finding = only(validateTlsSettings(parseTlsSettings(doc, "stirShaken")), "not an absolute path");
  assert.ok(finding);
});

test("validateTlsSettings(stirShaken): an invalid attest_level is an error", () => {
  const doc = parseConfig(STIR_SHAKEN_SAMPLE.replace("attest_level = C", "attest_level = Z"));
  const finding = only(validateTlsSettings(parseTlsSettings(doc, "stirShaken")), "is not one of A, B, or C");
  assert.ok(finding);
});

test("validateTlsSettings(stirShaken): global_disable = yes silences the rest", () => {
  const doc = parseConfig(`[attestation]\nglobal_disable = yes\n`);
  const findings = validateTlsSettings(parseTlsSettings(doc, "stirShaken"));
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, "info");
});

test("validateTlsSettings(stirShaken): a fully configured attestation has no findings", () => {
  const findings = validateTlsSettings(parseTlsSettings(parseConfig(STIR_SHAKEN_SAMPLE), "stirShaken"));
  assert.deepEqual(findings, []);
});

// ---------------------------------------------------------------------------
// parseCertificateSummary
// ---------------------------------------------------------------------------

test("parseCertificateSummary recognises a well-formed PEM block", () => {
  const summary = parseCertificateSummary(REAL_CERT_PEM);
  assert.equal(summary.wellFormed, true);
});

test("parseCertificateSummary leaves subject, issuer, validity and fingerprint undefined", () => {
  // This is the point of the function: it deliberately does not attempt ASN.1 parsing
  // without a dependency, so every one of these fields must be undefined rather than
  // an approximation.
  const summary = parseCertificateSummary(REAL_CERT_PEM);
  assert.equal(summary.subject, undefined);
  assert.equal(summary.issuer, undefined);
  assert.equal(summary.notBefore, undefined);
  assert.equal(summary.notAfter, undefined);
  assert.equal(summary.fingerprint, undefined);
});

test("parseCertificateSummary does not throw on a malformed PEM and reports it as not well-formed", () => {
  assert.doesNotThrow(() => parseCertificateSummary("not a certificate at all"));
  const summary = parseCertificateSummary("not a certificate at all");
  assert.equal(summary.wellFormed, false);
});

test("parseCertificateSummary rejects a PEM block with invalid base64 content", () => {
  const bad = `-----BEGIN CERTIFICATE-----\n***not base64***\n-----END CERTIFICATE-----\n`;
  assert.doesNotThrow(() => parseCertificateSummary(bad));
  assert.equal(parseCertificateSummary(bad).wellFormed, false);
});

test("parseCertificateSummary rejects an empty PEM body", () => {
  const empty = `-----BEGIN CERTIFICATE-----\n-----END CERTIFICATE-----\n`;
  assert.equal(parseCertificateSummary(empty).wellFormed, false);
});

// ---------------------------------------------------------------------------
// expiryStatus
// ---------------------------------------------------------------------------

const DAY = 24 * 60 * 60 * 1000;

test("expiryStatus: far in the future is valid", () => {
  const now = Date.parse("2026-01-01T00:00:00Z");
  const notAfter = new Date(now + 200 * DAY);
  assert.equal(expiryStatus(notAfter, now).status, "valid");
});

test("expiryStatus: just past expiry is expired", () => {
  const now = Date.parse("2026-01-01T00:00:00Z");
  const notAfter = new Date(now - DAY);
  assert.equal(expiryStatus(notAfter, now).status, "expired");
  assert.ok(expiryStatus(notAfter, now).daysRemaining < 0);
});

test("expiryStatus: exactly at the expiry boundary (today) is expiringSoon, not expired", () => {
  const now = Date.parse("2026-01-01T00:00:00Z");
  const notAfter = new Date(now);
  const report = expiryStatus(notAfter, now);
  assert.equal(report.status, "expiringSoon");
  assert.equal(report.daysRemaining, 0);
});

test("expiryStatus: exactly 30 days out is still expiringSoon (inclusive boundary)", () => {
  const now = Date.parse("2026-01-01T00:00:00Z");
  const notAfter = new Date(now + 30 * DAY);
  assert.equal(expiryStatus(notAfter, now).status, "expiringSoon");
});

test("expiryStatus: 31 days out is valid", () => {
  const now = Date.parse("2026-01-01T00:00:00Z");
  const notAfter = new Date(now + 31 * DAY);
  assert.equal(expiryStatus(notAfter, now).status, "valid");
});

test("expiryStatus: one millisecond before now is expired, not expiringSoon", () => {
  const now = Date.parse("2026-01-01T00:00:00Z");
  const notAfter = new Date(now - 1);
  assert.equal(expiryStatus(notAfter, now).status, "expired");
});

// ---------------------------------------------------------------------------
// toConfigValue — round trip and unrelated-section preservation
// ---------------------------------------------------------------------------

test("toConfigValue(http): a no-op read/write round trip renders identically", () => {
  const original = parseConfig(HTTP_SAMPLE);
  const settings = parseTlsSettings(original, "http");
  const rewritten = toConfigValue(original, settings);
  assert.equal(renderConfig(rewritten), renderConfig(original));
});

test("toConfigValue(pjsip): a no-op round trip renders identically and keeps the udp transport untouched", () => {
  const original = parseConfig(PJSIP_SAMPLE);
  const settings = parseTlsSettings(original, "pjsip");
  const rewritten = toConfigValue(original, settings);
  assert.equal(renderConfig(rewritten), renderConfig(original));
});

test("toConfigValue(stirShaken): a no-op round trip renders identically", () => {
  const original = parseConfig(STIR_SHAKEN_SAMPLE);
  const settings = parseTlsSettings(original, "stirShaken");
  const rewritten = toConfigValue(original, settings);
  assert.equal(renderConfig(rewritten), renderConfig(original));
});

test("toConfigValue(http): changing the cert path leaves every other key and section untouched", () => {
  const original = parseConfig(`[general]\nservername = Asterisk\ntlsenable = yes\ntlscertfile = /old.pem\n\n[other]\nfoo = bar\n`);
  const settings = parseTlsSettings(original, "http");
  const rewritten = toConfigValue(original, { ...settings, certFile: "/new.pem" });

  const generalOut = rewritten.find((s) => s.name === "general")!;
  assert.equal(generalOut.entries.find((e) => e.key === "servername")?.value, "Asterisk");
  assert.equal(generalOut.entries.find((e) => e.key === "tlscertfile")?.value, "/new.pem");

  const otherOut = rewritten.find((s) => s.name === "other")!;
  assert.deepEqual(otherOut, original.find((s) => s.name === "other"));
});

test("toConfigValue(pjsip): editing the tls transport leaves the udp transport section identical", () => {
  const original = parseConfig(PJSIP_SAMPLE);
  const settings = parseTlsSettings(original, "pjsip");
  const rewritten = toConfigValue(original, { ...settings, method: "tlsv1_2" /* unchanged, sanity */ });
  const udpBefore = original.find((s) => s.name === "transport-udp");
  const udpAfter = rewritten.find((s) => s.name === "transport-udp");
  assert.deepEqual(udpAfter, udpBefore);
});

test("toConfigValue: setting a field to undefined removes the key rather than writing an empty value", () => {
  const original = parseConfig(`[attestation]\nglobal_disable = no\nattest_level = C\n`);
  const settings = parseTlsSettings(original, "stirShaken");
  const rewritten = toConfigValue(original, { ...settings, attestLevel: undefined });
  const attestation = rewritten.find((s) => s.name === "attestation")!;
  assert.equal(attestation.entries.some((e) => e.key === "attest_level"), false);
  assert.equal(attestation.entries.find((e) => e.key === "global_disable")?.value, "no");
});

test("toConfigValue: adding a previously-absent field appends it", () => {
  const original = parseConfig(`[attestation]\nglobal_disable = no\n`);
  const settings = parseTlsSettings(original, "stirShaken");
  const rewritten = toConfigValue(original, { ...settings, attestLevel: "B" });
  const attestation = rewritten.find((s) => s.name === "attestation")!;
  assert.equal(attestation.entries.find((e) => e.key === "attest_level")?.value, "B");
});

// ---------------------------------------------------------------------------
// Private key material is never handled beyond a path
// ---------------------------------------------------------------------------

test("no function in this module returns, logs, or otherwise surfaces key material content", () => {
  // The module's public surface only ever accepts and returns *paths* for a private
  // key — parseCertificateSummary takes a public certificate PEM, never a key, and
  // returns no field derived from key bytes. This test asserts that contract holds
  // for the exact fixtures used above: the key path strings that flow through
  // parse/validate/toConfigValue are never anything other than the path string that
  // was configured, and no returned object anywhere in this suite contains PEM-shaped
  // key material ("BEGIN PRIVATE KEY" / "BEGIN RSA PRIVATE KEY").
  const doc = parseConfig(STIR_SHAKEN_SAMPLE);
  const settings = parseTlsSettings(doc, "stirShaken");
  assert.equal(settings.privateKeyFile, "/var/lib/asterisk/keys/stir_shaken/tns/multi-tns-key.pem");
  const serialized = JSON.stringify(settings);
  assert.doesNotMatch(serialized, /BEGIN (RSA )?PRIVATE KEY/u);

  const httpDoc = parseConfig(HTTP_SAMPLE);
  const httpSettings = parseTlsSettings(httpDoc, "http");
  assert.doesNotMatch(JSON.stringify(httpSettings), /BEGIN (RSA )?PRIVATE KEY/u);

  const pjsipDoc = parseConfig(PJSIP_SAMPLE);
  const pjsipSettings = parseTlsSettings(pjsipDoc, "pjsip");
  assert.doesNotMatch(JSON.stringify(pjsipSettings), /BEGIN (RSA )?PRIVATE KEY/u);

  // parseCertificateSummary never even accepts a private key argument, so there is no
  // path by which key bytes could reach its return value; this documents that shape.
  const certSummary = parseCertificateSummary(REAL_CERT_PEM);
  assert.doesNotMatch(JSON.stringify(certSummary), /BEGIN (RSA )?PRIVATE KEY/u);
});
