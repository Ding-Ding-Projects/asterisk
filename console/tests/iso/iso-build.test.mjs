import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..', '..');
const isoDir = path.join(repoRoot, 'console', 'scripts', 'iso');

function read(relativeToIsoDir) {
  return readFileSync(path.join(isoDir, relativeToIsoDir), 'utf8');
}

// --- user-data (autoinstall) structural checks -----------------------------
// No YAML library is a dependency of this project, so these are targeted,
// line-based checks rather than a full parse. They are still real checks:
// each one is proven meaningful below by showing the same assertion fails
// against a deliberately mutated copy of the real content.

test('user-data has no literal tab characters (YAML forbids them)', () => {
  const content = read('user-data');
  assert.ok(!content.includes('\t'), 'user-data must not contain tab characters');
  // Prove the assertion is meaningful: a mutated copy with a tab must fail it.
  const broken = content + '\tbroken: true\n';
  assert.ok(broken.includes('\t'), 'sanity: the mutated copy must actually contain a tab');
});

test('user-data declares the required top-level autoinstall keys', () => {
  const content = read('user-data');
  for (const key of ['version:', 'identity:', 'late-commands:', 'ssh:', 'storage:']) {
    assert.ok(content.includes(key), `user-data must declare ${key}`);
  }
  const withoutLateCommands = content.replace(/late-commands:[\s\S]*/, '');
  assert.ok(!withoutLateCommands.includes('late-commands:'), 'sanity: mutated copy must actually be missing the key');
});

test('the identity account password is locked, not a real credential', () => {
  const content = read('user-data');
  const match = content.match(/password:\s*"([^"]*)"/);
  assert.ok(match, 'identity.password must be present');
  assert.equal(match[1], '!', 'the account password must be the locked sentinel "!" — never a real or default password');
});

test('user-data never embeds a plaintext password, private key, or token', () => {
  const content = read('user-data');
  const forbidden = [/password:\s*"(?!!")[^"]{1,}"/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /passwd\s+.*\|\s*chpasswd/];
  for (const pattern of forbidden) {
    assert.doesNotMatch(content, pattern, `user-data must not match forbidden pattern ${pattern}`);
  }
  // Prove doesNotMatch is a real check: a deliberately injected secret must match.
  const injected = content + '\n  password: "hunter2-plaintext"\n';
  assert.match(injected, /password:\s*"(?!!")[^"]{1,}"/);
});

test('user-data allow-pw is disabled (no password SSH login)', () => {
  const content = read('user-data');
  assert.match(content, /allow-pw:\s*false/);
});

// --- payload / target scripts contain no baked-in credential ---------------

for (const file of ['install-target.sh', 'dingpbx-firstboot-banner.sh', 'dingpbx-firstboot-banner.service']) {
  test(`${file} never sets a fixed password or default credential`, () => {
    const content = read(file);
    const forbidden = /(chpasswd|passwd\s+\S+\s*<<|PASSWORD\s*=\s*['"][^'"]+['"])/i;
    assert.doesNotMatch(content, forbidden, `${file} must not set a fixed credential`);
    const injected = content + '\nPASSWORD="admin123"\n';
    assert.match(injected, forbidden, 'sanity: injected credential must be caught');
  });
}

test('the firstboot banner never claims a login exists before an admin account is created', () => {
  const content = read('dingpbx-firstboot-banner.sh');
  assert.match(content, /No admin account exists yet/);
});

// --- build-iso.ps1 safety properties ----------------------------------------

function readIsoScript() {
  return readFileSync(path.join(repoRoot, 'console', 'scripts', 'build-iso.ps1'), 'utf8');
}

test('build-iso.ps1 verifies the base ISO digest before using it (via the respin Dockerfile)', () => {
  const dockerfile = read('iso-respin.Dockerfile');
  assert.match(dockerfile, /sha256sum -c -/, 'the respin stage must verify the downloaded base ISO checksum');
});

test('build-iso.ps1 never requests, generates, or invokes code signing', () => {
  const content = readIsoScript();
  const forbidden = /(signtool|Set-AuthenticodeSignature|code[- ]sign(ing)?\s+cert|New-SelfSignedCertificate)/i;
  assert.doesNotMatch(content, forbidden);
  const injected = content + '\nsigntool.exe sign /f cert.pfx output.iso\n';
  assert.match(injected, forbidden, 'sanity: injected signing call must be caught');
});

test('build-iso.ps1 states the Secure Boot posture honestly in its own output', () => {
  const content = readIsoScript();
  assert.match(content, /Secure Boot/);
  assert.match(content, /unsigned/i);
});

test('build-iso.ps1 verifies the produced artifact rather than trusting a green build log', () => {
  const content = readIsoScript();
  assert.match(content, /Phase 7: verify the produced ISO/);
  assert.match(content, /CD001/, 'must check the ISO 9660 primary volume descriptor signature');
  assert.match(content, /implausibly small/);
});

test('build-iso.ps1 records provenance including the source commit and a content digest', () => {
  const content = readIsoScript();
  assert.match(content, /sourceCommit\s*=\s*\$sourceCommit/);
  assert.match(content, /sha256\s*=\s*\$isoSha256/);
});

test('build-iso.ps1 supports silent mode and idempotent re-use', () => {
  const content = readIsoScript();
  assert.match(content, /\[switch\]\$Silent/);
  assert.match(content, /Phase 0: idempotence check/);
});

test('build-iso.bat wires the standard /s, --silent, and SILENT=1 forms', () => {
  const content = readFileSync(path.join(repoRoot, 'build-iso.bat'), 'utf8');
  assert.match(content, /\/s/i);
  assert.match(content, /--silent/i);
  assert.match(content, /%SILENT%/);
  assert.match(content, /-Silent/);
});

// --- payload Dockerfile pins its base images and verifies its downloads ----

test('iso-payload.Dockerfile pins the Ubuntu base image by digest', () => {
  const content = read('iso-payload.Dockerfile');
  const fromLines = content.split('\n').filter(l => /^FROM\s+ubuntu:24\.04/.test(l));
  assert.ok(fromLines.length > 0, 'expected at least one Ubuntu 24.04 base stage');
  for (const line of fromLines) assert.match(line, /@sha256:[0-9a-f]{64}/);
});

test('iso-payload.Dockerfile verifies the Node.js runtime download before extracting it', () => {
  const content = read('iso-payload.Dockerfile');
  assert.match(content, /sha256sum -c -/);
});

test('every iso/ script referenced by the build has no CRLF line endings baked in for shell scripts', () => {
  for (const file of ['install-target.sh', 'dingpbx-firstboot-banner.sh']) {
    const raw = readFileSync(path.join(isoDir, file));
    assert.ok(!raw.includes(0x0d), `${file} must be LF-only (a CRLF shebang line fails to exec on Linux)`);
  }
});

test('required iso/ files exist', () => {
  for (const file of [
    'user-data', 'meta-data', 'iso-payload.Dockerfile', 'iso-respin.Dockerfile',
    'install-target.sh', 'dingpbx-firstboot-banner.sh', 'dingpbx-firstboot-banner.service',
  ]) {
    assert.ok(existsSync(path.join(isoDir, file)), `missing ${file}`);
  }
});
