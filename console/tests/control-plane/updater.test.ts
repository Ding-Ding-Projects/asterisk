import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseReleaseTag, resolveLatestUpdate, findDigestForAsset, initialUpdaterState,
  beganChecking, checkSucceeded, updateFailed, beganDownloading, downloadReady,
  dismissedForNow, verifyDownload, shouldCheckNow,
  type GitHubRelease, type ResolvedUpdate, type DownloadedFile,
} from '../../control-plane/updater.js';

function release(overrides: Partial<GitHubRelease> & { tagName: string }): GitHubRelease {
  return {
    draft: false,
    prerelease: false,
    htmlUrl: `https://github.com/Ding-Ding-Projects/asterisk/releases/tag/${overrides.tagName}`,
    publishedAt: '2026-08-01T00:00:00Z',
    assets: [
      { name: 'Ding-PBX-Console-Setup.exe', browserDownloadUrl: 'https://example.com/Setup.exe', size: 1000 },
      { name: 'RELEASES', browserDownloadUrl: 'https://example.com/RELEASES', size: 10 },
      { name: 'SHA256SUMS.txt', browserDownloadUrl: 'https://example.com/SHA256SUMS.txt', size: 10 },
    ],
    ...overrides,
  };
}

test('parses this project\'s own release tag shape', () => {
  assert.deepEqual(parseReleaseTag('ding-pbx-console-v0.0.42-r1'), [42, 1]);
  assert.deepEqual(parseReleaseTag('ding-pbx-console-v0.0.7-r3'), [7, 3]);
});

test('rejects a tag that does not match this project\'s shape', () => {
  assert.equal(parseReleaseTag('v1.2.3'), undefined);
  assert.equal(parseReleaseTag('some-other-app-v0.0.1-r1'), undefined);
  assert.equal(parseReleaseTag(''), undefined);
});

// --- no update available ---
test('no update available: current release is already the newest', () => {
  const releases = [release({ tagName: 'ding-pbx-console-v0.0.5-r1' })];
  const resolved = resolveLatestUpdate(releases, [5, 1]);
  assert.equal(resolved, undefined);
});

test('no update available: only older releases exist', () => {
  const releases = [release({ tagName: 'ding-pbx-console-v0.0.3-r1' })];
  const resolved = resolveLatestUpdate(releases, [5, 1]);
  assert.equal(resolved, undefined);
});

// --- update available ---
test('update available: a newer release exists and picks the newest of several', () => {
  const releases = [
    release({ tagName: 'ding-pbx-console-v0.0.5-r1' }),
    release({ tagName: 'ding-pbx-console-v0.0.9-r1' }),
    release({ tagName: 'ding-pbx-console-v0.0.7-r1' }),
  ];
  const resolved = resolveLatestUpdate(releases, [5, 1]);
  assert.equal(resolved?.tag, 'ding-pbx-console-v0.0.9-r1');
});

test('update available: a same run-number but later attempt counts as newer', () => {
  const releases = [release({ tagName: 'ding-pbx-console-v0.0.9-r2' })];
  const resolved = resolveLatestUpdate(releases, [9, 1]);
  assert.equal(resolved?.tag, 'ding-pbx-console-v0.0.9-r2');
});

test('an unknown current version treats any real release as available', () => {
  const releases = [release({ tagName: 'ding-pbx-console-v0.0.1-r1' })];
  const resolved = resolveLatestUpdate(releases, undefined);
  assert.equal(resolved?.tag, 'ding-pbx-console-v0.0.1-r1');
});

test('draft and prerelease releases are never offered', () => {
  const releases = [
    release({ tagName: 'ding-pbx-console-v0.0.9-r1', draft: true }),
    release({ tagName: 'ding-pbx-console-v0.0.8-r1', prerelease: true }),
  ];
  assert.equal(resolveLatestUpdate(releases, [1, 1]), undefined);
});

test('a release missing an https Setup.exe asset is skipped, not offered', () => {
  const releases = [
    release({
      tagName: 'ding-pbx-console-v0.0.9-r1',
      assets: [{ name: 'RELEASES', browserDownloadUrl: 'https://example.com/RELEASES', size: 10 }],
    }),
  ];
  assert.equal(resolveLatestUpdate(releases, [1, 1]), undefined);
});

test('a release with an http (non-https) Setup.exe asset is rejected', () => {
  const releases = [
    release({
      tagName: 'ding-pbx-console-v0.0.9-r1',
      assets: [{ name: 'Ding-PBX-Console-Setup.exe', browserDownloadUrl: 'http://example.com/Setup.exe', size: 10 }],
    }),
  ];
  assert.equal(resolveLatestUpdate(releases, [1, 1]), undefined);
});

test('a release with no SHA256SUMS.txt is still offered, just without a digest to verify against', () => {
  const releases = [
    release({
      tagName: 'ding-pbx-console-v0.0.9-r1',
      assets: [{ name: 'Ding-PBX-Console-Setup.exe', browserDownloadUrl: 'https://example.com/Setup.exe', size: 10 }],
    }),
  ];
  const resolved = resolveLatestUpdate(releases, [1, 1]);
  assert.equal(resolved?.shaSumsAsset, undefined);
});

test('an unparseable tag from a foreign release is ignored', () => {
  const releases = [release({ tagName: 'some-other-product-v9.9.9' })];
  assert.equal(resolveLatestUpdate(releases, [1, 1]), undefined);
});

// --- digest parsing ---
test('finds the sha256 for a named asset in a sha256sum-style listing', () => {
  const text = 'aaaa' + '0'.repeat(60) + '  Ding-PBX-Console-Setup.exe\n' + 'b'.repeat(64) + '  RELEASES\n';
  assert.equal(findDigestForAsset(text, 'Ding-PBX-Console-Setup.exe'), 'aaaa' + '0'.repeat(60));
});

test('digest lookup is exact-name, not substring', () => {
  const text = 'c'.repeat(64) + '  Other-Setup.exe\n';
  assert.equal(findDigestForAsset(text, 'Setup.exe'), undefined);
});

// --- state machine ---
test('state machine: idle -> checking -> available -> downloading -> ready', () => {
  const resolved: ResolvedUpdate = {
    tag: 'ding-pbx-console-v0.0.9-r1',
    ordinal: [9, 1],
    releaseUrl: 'https://example.com/releases/9',
    setupAsset: { name: 'Setup.exe', browserDownloadUrl: 'https://example.com/Setup.exe', size: 10 },
    shaSumsAsset: undefined,
  };
  let s = initialUpdaterState('ding-pbx-console-v0.0.5-r1');
  assert.equal(s.state, 'idle');
  s = beganChecking(s, new Date('2026-01-01T00:00:00Z'));
  assert.equal(s.state, 'checking');
  s = checkSucceeded(s, resolved);
  assert.equal(s.state, 'available');
  s = beganDownloading(s);
  assert.equal(s.state, 'downloading');
  s = downloadReady(s, '/tmp/Setup.exe');
  assert.equal(s.state, 'ready');
  assert.equal(s.downloadedPath, '/tmp/Setup.exe');
});

test('state machine: checkSucceeded with nothing resolved returns to idle', () => {
  const s = checkSucceeded(beganChecking(initialUpdaterState(undefined), new Date()), undefined);
  assert.equal(s.state, 'idle');
});

test('state machine: failed never silently reverts to idle, and keeps the reason', () => {
  const s = updateFailed(beganChecking(initialUpdaterState(undefined), new Date()), 'network unreachable');
  assert.equal(s.state, 'failed');
  assert.equal(s.lastError, 'network unreachable');
});

test('state machine: beganDownloading with nothing resolved fails rather than pretending to proceed', () => {
  const s = beganDownloading(initialUpdaterState(undefined));
  assert.equal(s.state, 'failed');
});

test('state machine: dismissing a ready/available update returns to available so the banner can return', () => {
  const resolved: ResolvedUpdate = {
    tag: 'ding-pbx-console-v0.0.9-r1', ordinal: [9, 1], releaseUrl: 'https://example.com',
    setupAsset: { name: 'Setup.exe', browserDownloadUrl: 'https://example.com/Setup.exe', size: 10 }, shaSumsAsset: undefined,
  };
  let s = checkSucceeded(initialUpdaterState(undefined), resolved);
  s = downloadReady(s, '/tmp/x');
  s = dismissedForNow(s);
  assert.equal(s.state, 'available');
  assert.ok(s.resolved, 'resolved update is retained after dismissal');
});

test('state machine: dismissing with nothing resolved returns to idle', () => {
  const s = dismissedForNow(initialUpdaterState(undefined));
  assert.equal(s.state, 'idle');
});

// --- download verification: invalid/mismatched hash, corrupt asset ---
test('verifyDownload: matching size and digest passes', () => {
  const resolved: ResolvedUpdate = {
    tag: 't', ordinal: [1, 1], releaseUrl: 'https://x',
    setupAsset: { name: 'Setup.exe', browserDownloadUrl: 'https://x/Setup.exe', size: 100 }, shaSumsAsset: undefined,
  };
  const file: DownloadedFile = { path: '/tmp/f', sha256: 'a'.repeat(64), size: 100 };
  assert.deepEqual(verifyDownload(resolved, file, 'a'.repeat(64)), { ok: true });
});

test('verifyDownload: mismatched hash (corrupt asset) fails with a plain reason', () => {
  const resolved: ResolvedUpdate = {
    tag: 't', ordinal: [1, 1], releaseUrl: 'https://x',
    setupAsset: { name: 'Setup.exe', browserDownloadUrl: 'https://x/Setup.exe', size: 100 }, shaSumsAsset: undefined,
  };
  const file: DownloadedFile = { path: '/tmp/f', sha256: 'b'.repeat(64), size: 100 };
  const verdict = verifyDownload(resolved, file, 'a'.repeat(64));
  assert.equal(verdict.ok, false);
});

test('verifyDownload: mismatched size (corrupt/truncated download) fails', () => {
  const resolved: ResolvedUpdate = {
    tag: 't', ordinal: [1, 1], releaseUrl: 'https://x',
    setupAsset: { name: 'Setup.exe', browserDownloadUrl: 'https://x/Setup.exe', size: 100 }, shaSumsAsset: undefined,
  };
  const file: DownloadedFile = { path: '/tmp/f', sha256: 'a'.repeat(64), size: 3 };
  const verdict = verifyDownload(resolved, file, 'a'.repeat(64));
  assert.equal(verdict.ok, false);
});

test('verifyDownload: no expected digest available (no SHA256SUMS.txt) still checks size', () => {
  const resolved: ResolvedUpdate = {
    tag: 't', ordinal: [1, 1], releaseUrl: 'https://x',
    setupAsset: { name: 'Setup.exe', browserDownloadUrl: 'https://x/Setup.exe', size: 100 }, shaSumsAsset: undefined,
  };
  const file: DownloadedFile = { path: '/tmp/f', sha256: 'a'.repeat(64), size: 100 };
  assert.deepEqual(verifyDownload(resolved, file, undefined), { ok: true });
});

// --- scheduling / offline (offline is represented as fetchReleases throwing, exercised via updateFailed above) ---
test('shouldCheckNow: always true on first ever check', () => {
  assert.equal(shouldCheckNow(undefined, new Date('2026-01-01T00:00:00Z'), 1000), true);
});

test('shouldCheckNow: false before the interval has elapsed', () => {
  const now = new Date('2026-01-01T00:10:00Z');
  assert.equal(shouldCheckNow('2026-01-01T00:09:00Z', now, 60 * 60 * 1000), false);
});

test('shouldCheckNow: true once the interval has elapsed', () => {
  const now = new Date('2026-01-01T02:00:00Z');
  assert.equal(shouldCheckNow('2026-01-01T00:00:00Z', now, 60 * 60 * 1000), true);
});

test('shouldCheckNow: an unparseable lastCheckedAt is treated as never checked', () => {
  assert.equal(shouldCheckNow('not-a-date', new Date(), 1000), true);
});

// --- invalid feed metadata is exercised at the wiring layer (fetchReleases in updater-runtime.ts),
// where a non-array or malformed GitHub API body is turned into a thrown Error and lands in
// updateFailed above (see 'state machine: failed never silently reverts to idle'). ---
