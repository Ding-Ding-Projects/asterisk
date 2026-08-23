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

/**
 * The repack must not name boot files by path, and must prove the result can boot.
 *
 * Written after a real build produced an unbootable image. The recipe came from
 * Ubuntu's own autoinstall guide and named `boot_hybrid.img` for the master boot
 * record; Ubuntu 24.04.4 does not ship that file. The hybrid repack failed, the
 * fallback ran, and the output was a valid ISO 9660 image with completely correct
 * contents that no machine would boot.
 *
 * Nothing caught it. The file existed, it was the right size, its signature was right,
 * and every assertion in this file passed. The only thing that would have caught it is
 * asking whether it can boot.
 */
test('the repack derives boot options from the base image rather than naming boot files', () => {
  /* Comment lines are excluded deliberately: the block above the recipe explains why
   * the old boot file is no longer named, and that explanation is worth keeping. The
   * guard is about what the build runs, not about what it documents. */
  const content = read('iso-respin.Dockerfile')
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('#'))
    .join('\n');
  assert.doesNotMatch(
    content,
    /boot_hybrid\.img/u,
    'naming a boot file by path breaks on any release that does not ship it, and it fails silently',
  );
  assert.match(content, /-report_el_torito as_mkisofs/u, 'the base image must be asked to describe its own boot setup');
});

test('the repack asserts the image can boot, not merely that it exists', () => {
  const content = read('iso-respin.Dockerfile');
  /* Both El Torito entries: a BIOS image and an EFI one. An installer missing either
   * boots on only half the machines it claims to support. */
  assert.match(content, /report_el_torito plain[\s\S]{0,80}grep -q BIOS/u);
  assert.match(content, /report_el_torito plain[\s\S]{0,80}grep -q UEFI/u);
  /* And a real master boot record, which is what makes it bootable written to a USB
   * stick rather than only from an optical drive. */
  assert.match(content, /skip=510 count=2/u, 'the master boot record signature is never checked');
  assert.match(content, /= 55aa/u);
});

test('the repack has no silent fallback that can publish an unbootable image', () => {
  const content = read('iso-respin.Dockerfile');
  /* The original recipe ended in `|| xorriso -as mkisofs ... -o output.iso`, so a failed
   * hybrid repack still produced a file and the build reported success. A fallback that
   * degrades the one property the artifact exists for is worse than a failure. */
  assert.doesNotMatch(
    content,
    /\|\|\s*xorriso -as mkisofs/u,
    'a fallback repack silently publishes an image that cannot boot',
  );
});

// --- CI workflow builds the ISO reproducibly, and solves the >2 GiB release-asset limit ---

function readWorkflow() {
  return readFileSync(path.join(repoRoot, '.github', 'workflows', 'installer-iso.yml'), 'utf8');
}

test('the installer-iso workflow exists and runs on a Linux runner', () => {
  const content = readWorkflow();
  assert.match(content, /runs-on:\s*ubuntu-24\.04/);
});

test('the installer-iso workflow verifies boot properties, not merely that the file exists', () => {
  const content = readWorkflow();
  assert.match(content, /CD001/, 'must check the ISO 9660 primary volume descriptor');
  assert.match(content, /55aa/, 'must check the master boot record signature');
  assert.match(content, /report_el_torito plain/);
  assert.match(content, /grep -q BIOS/);
  assert.match(content, /grep -q UEFI/);
});

test('the installer-iso workflow splits the ISO into volumes under the 2 GiB release-asset limit', () => {
  const content = readWorkflow();
  assert.match(content, /split -b 1900MiB/, 'volumes must be safely under the 2 GiB (2147483648 byte) per-file cap');
  assert.match(content, /REASSEMBLE\.md/, 'a reassembly manifest must be produced');
  assert.match(content, /sha256sum ding-pbx-installer\.iso\.part\*/, 'every volume must have its own recorded SHA-256');
  // Prove this is a real check: a mutated copy using a size at or over the cap must fail it.
  const broken = content.replace('split -b 1900MiB', 'split -b 2000MiB');
  assert.doesNotMatch(broken, /split -b 1900MiB/);
});

test('the installer-iso workflow records the reassembled ISO SHA-256 so a user can prove they rebuilt the right file', () => {
  const content = readWorkflow();
  assert.match(content, /Reassembled ISO SHA-256/);
  assert.match(content, /iso_sha256/);
});

test('the installer-iso workflow never signs the ISO', () => {
  const content = readWorkflow();
  const forbidden = /(signtool|Set-AuthenticodeSignature|code[- ]sign(ing)?\s+cert|New-SelfSignedCertificate)/i;
  assert.doesNotMatch(content, forbidden);
  const injected = content + '\nsigntool.exe sign /f cert.pfx output.iso\n';
  assert.match(injected, forbidden, 'sanity: injected signing call must be caught');
});

test('the installer-iso workflow states the Secure Boot posture honestly', () => {
  const content = readWorkflow();
  assert.match(content, /Secure Boot/);
  assert.match(content, /unsigned/i);
});

test('the installer-iso workflow uploads evidence even after a failure', () => {
  const content = readWorkflow();
  const evidenceStep = content.split('Upload build evidence even after a failure')[1] || '';
  assert.match(evidenceStep.slice(0, 200), /if:\s*\$\{\{\s*always\(\)\s*\}\}/);
});
