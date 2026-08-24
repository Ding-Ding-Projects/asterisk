/**
 * The console's own update decision logic.
 *
 * Ding PBX Console ships as Squirrel.Windows installers built and published by
 * `.github/workflows/delivery.yml`. Every push to `master` builds a fresh unsigned
 * Setup.exe/RELEASES/*.nupkg set and publishes it under a brand-new, immutable GitHub
 * Release tag shaped `ding-pbx-console-v<version>-r<run attempt>` (see the release
 * job's `$tag` assignment). Each release stands alone: its RELEASES file only
 * ever references the nupkg built in that same run, so there is no single running feed
 * directory that accumulates nupkgs release over release the way Squirrel's original
 * update protocol (and Electron's built-in `autoUpdater`, which speaks that protocol on
 * Windows) expects. Pointing Electron's `autoUpdater` at this project's GitHub Releases
 * would therefore never find anything to reconstruct a delta chain from.
 *
 * What GitHub Releases *does* give reliably is: an ordered list of releases, each
 * carrying its own complete Setup.exe, RELEASES and full .nupkg, plus (per the release
 * job) a `SHA256SUMS.txt` asset recording every asset's digest. That is exactly enough
 * to build a simpler, honest update path: check the Releases API for a release newer
 * than the one this build shipped from, download its Setup.exe, verify it against the
 * published SHA-256, and hand it to the user to run. Running a Squirrel Setup.exe again
 * is itself how Squirrel performs an update — it installs the new version into a fresh
 * `app-<version>` folder beside the current one and repoints the shortcuts — so this is
 * a real update, not a reinstall pretending to be one. It is just driven by a full
 * installer download rather than a binary delta.
 *
 * Everything below is pure and injectable: no network, no filesystem, no Electron. The
 * caller (`app/electron/main.ts`) supplies the HTTP fetch and the running version.
 */

export type UpdateState =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'failed';

export interface ReleaseAsset {
  name: string;
  /** Must be an `https://` URL; anything else is rejected before it is ever used. */
  browserDownloadUrl: string;
  size: number;
}

export interface GitHubRelease {
  tagName: string;
  draft: boolean;
  prerelease: boolean;
  htmlUrl: string;
  publishedAt: string;
  assets: ReleaseAsset[];
}

export interface ResolvedUpdate {
  tag: string;
  /** Semantic version plus run attempt, used only to order releases. */
  ordinal: readonly [number, number, number, number];
  releaseUrl: string;
  setupAsset: ReleaseAsset;
  shaSumsAsset: ReleaseAsset;
}

const TAG_PATTERN = /^ding-pbx-console-v(\d+)\.(\d+)\.(\d+)-r(\d+)$/;

/** Parses this project's own tag shape. Returns undefined for anything else, including a tag from a different product. */
export function parseReleaseTag(tag: string): readonly [number, number, number, number] | undefined {
  const match = TAG_PATTERN.exec(tag.trim());
  if (!match) return undefined;
  return [Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4])];
}

function compareOrdinal(
  a: readonly [number, number, number, number],
  b: readonly [number, number, number, number],
): number {
  for (const index of [0, 1, 2, 3] as const) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
}

/**
 * Picks the newest usable release strictly ahead of `currentOrdinal`, or undefined when
 * there is none. A release is usable only when it is not a draft or prerelease and
 * carries exactly the assets this project's delivery workflow always publishes together.
 */
export function resolveLatestUpdate(
  releases: readonly GitHubRelease[],
  currentOrdinal: readonly [number, number, number, number] | undefined,
): ResolvedUpdate | undefined {
  let best: ResolvedUpdate | undefined;
  for (const release of releases) {
    if (release.draft || release.prerelease) continue;
    const ordinal = parseReleaseTag(release.tagName);
    if (!ordinal) continue;
    if (currentOrdinal && compareOrdinal(ordinal, currentOrdinal) <= 0) continue;
    if (best && compareOrdinal(ordinal, best.ordinal) <= 0) continue;
    const setupAsset = release.assets.find((asset) => asset.name.toLowerCase().endsWith('setup.exe'));
    if (!setupAsset || !setupAsset.browserDownloadUrl.startsWith('https://')) continue;
    const shaSumsAsset = release.assets.find((asset) => asset.name === 'SHA256SUMS.txt');
    if (!shaSumsAsset || !shaSumsAsset.browserDownloadUrl.startsWith('https://')) continue;
    best = { tag: release.tagName, ordinal, releaseUrl: release.htmlUrl, setupAsset, shaSumsAsset };
  }
  return best;
}

/** Finds the line in a `sha256sum`-style listing (`<hex>  <name>`) that names `fileName`, case-sensitively on the name. */
export function findDigestForAsset(shaSumsText: string, fileName: string): string | undefined {
  for (const line of shaSumsText.split(/\r?\n/)) {
    const match = /^([0-9a-f]{64})\s+\*?(.+)$/i.exec(line.trim());
    if (match && match[2] === fileName) return match[1].toLowerCase();
  }
  return undefined;
}

export interface UpdaterState {
  state: UpdateState;
  currentTag: string | undefined;
  resolved: ResolvedUpdate | undefined;
  downloadedPath: string | undefined;
  lastCheckedAt: string | undefined;
  lastError: string | undefined;
}

export function initialUpdaterState(currentTag: string | undefined): UpdaterState {
  return { state: 'idle', currentTag, resolved: undefined, downloadedPath: undefined, lastCheckedAt: undefined, lastError: undefined };
}

/**
 * Whether a background check should run now, given when the last one finished. Startup
 * always checks immediately (pass `lastCheckedAt: undefined`); afterwards checks are
 * spaced out so a machine left running does not hammer the GitHub API.
 */
export function shouldCheckNow(lastCheckedAt: string | undefined, now: Date, intervalMs: number): boolean {
  if (!lastCheckedAt) return true;
  const last = new Date(lastCheckedAt).getTime();
  if (Number.isNaN(last)) return true;
  return now.getTime() - last >= intervalMs;
}

export const DEFAULT_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // four hours

/** Transition: a check started. */
export function beganChecking(s: UpdaterState, now: Date): UpdaterState {
  return { ...s, state: 'checking', lastCheckedAt: now.toISOString(), lastError: undefined };
}

/** Transition: the check finished, successfully, with or without an update. */
export function checkSucceeded(s: UpdaterState, resolved: ResolvedUpdate | undefined): UpdaterState {
  if (!resolved) return { ...s, state: 'idle', resolved: undefined };
  return { ...s, state: 'available', resolved };
}

/** Transition: the check, download, or verification failed. Never silently reverts to idle — the reason is kept. */
export function updateFailed(s: UpdaterState, reason: string): UpdaterState {
  return { ...s, state: 'failed', lastError: reason };
}

/** Transition: a download of the currently-resolved update started. */
export function beganDownloading(s: UpdaterState): UpdaterState {
  if (!s.resolved) return updateFailed(s, 'No resolved update to download.');
  return { ...s, state: 'downloading' };
}

/** Transition: the download landed and its required published hash matched. */
export function downloadReady(s: UpdaterState, downloadedPath: string): UpdaterState {
  return { ...s, state: 'ready', downloadedPath };
}

/** Transition: the user dismissed the ready banner for now. The update stays resolved so the banner can return. */
export function dismissedForNow(s: UpdaterState): UpdaterState {
  if (s.state === 'ready') return s;
  return { ...s, state: s.resolved ? 'available' : 'idle' };
}

export interface DownloadedFile {
  path: string;
  sha256: string;
  size: number;
}

/**
 * Verifies a downloaded Setup.exe against the resolved update's declared size and, when
 * a SHA256SUMS.txt digest was found for it, its published hash. Integrity only — this
 * proves the bytes are the ones GitHub actually served for that asset, never that they
 * were produced by any particular signer. The artifacts are permanently unsigned.
 */
export function verifyDownload(
  resolved: ResolvedUpdate,
  file: DownloadedFile,
  expectedDigest: string | undefined,
): { ok: true } | { ok: false; reason: string } {
  if (file.size !== resolved.setupAsset.size) {
    return { ok: false, reason: `Downloaded ${file.size} bytes but the release declared ${resolved.setupAsset.size}.` };
  }
  if (!expectedDigest) {
    return { ok: false, reason: 'The release did not publish a SHA-256 digest for Setup.exe.' };
  }
  if (file.sha256.toLowerCase() !== expectedDigest.toLowerCase()) {
    return { ok: false, reason: 'Downloaded file does not match the published SHA-256 digest.' };
  }
  return { ok: true };
}
