/** Pure release identity and update state decisions for the desktop updater. */

export type UpdateState =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'failed';

export interface ReleaseAsset {
  name: string;
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

export interface ReleaseIdentityArtifact { name: string; size: number; sha256: string }

export interface ReleaseIdentity {
  schemaVersion: 1;
  product: 'ding-pbx-console';
  version: string;
  candidateCommit: string;
  tag: string;
  published: true;
  artifacts: {
    setup: ReleaseIdentityArtifact;
    releases: ReleaseIdentityArtifact;
    fullPackages: ReleaseIdentityArtifact[];
    deltaPackages: ReleaseIdentityArtifact[];
    sha256sums: string;
    identity: string;
  };
}

export type Version = readonly [number, number, number];
export type ReleaseOrdinal = readonly [number, number, number, number];

export interface ResolvedUpdate {
  tag: string;
  version: string;
  ordinal: ReleaseOrdinal;
  releaseUrl: string;
  setupAsset: ReleaseAsset;
  releasesAsset: ReleaseAsset;
  fullPackageAssets: ReleaseAsset[];
  deltaPackageAssets: ReleaseAsset[];
  shaSumsAsset: ReleaseAsset;
  identityAsset: ReleaseAsset;
}

const LEGACY_TAG_PATTERN = /^ding-pbx-console-v0\.0\.(\d+)-r(\d+)$/u;
const MODERN_TAG_PATTERN = /^ding-pbx-console-v(\d+)\.(\d+)\.(\d+)-r(\d+)$/u;
const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/u;
const SHA_PATTERN = /^[0-9a-f]{64}$/iu;
const COMMIT_PATTERN = /^[0-9a-f]{40}$/u;

export function parseReleaseTag(tag: string): ReleaseOrdinal | undefined {
  const value = tag.trim();
  const legacy = LEGACY_TAG_PATTERN.exec(value);
  if (legacy) return [0, 1, Number(legacy[1]), Number(legacy[2])];
  const modern = MODERN_TAG_PATTERN.exec(value);
  return modern ? [Number(modern[1]), Number(modern[2]), Number(modern[3]), Number(modern[4])] : undefined;
}

export function parseVersion(version: string): Version | undefined {
  const match = VERSION_PATTERN.exec(version.trim());
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : undefined;
}

export function compareVersion(a: Version, b: Version): number {
  for (const index of [0, 1, 2] as const) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
}

function compareOrdinal(a: ReleaseOrdinal, b: ReleaseOrdinal): number {
  for (const index of [0, 1, 2, 3] as const) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
}

function httpsAsset(asset: ReleaseAsset | undefined): asset is ReleaseAsset {
  return Boolean(asset && asset.browserDownloadUrl.startsWith('https://') && Number.isSafeInteger(asset.size) && asset.size > 0);
}

function exactlyOne(assets: readonly ReleaseAsset[], name: string): ReleaseAsset | undefined {
  const matches = assets.filter((asset) => asset.name === name);
  return matches.length === 1 ? matches[0] : undefined;
}

/** Only a published release with the complete immutable identity can be offered. */
export function resolveLatestUpdate(releases: readonly GitHubRelease[], currentVersion: Version | undefined): ResolvedUpdate | undefined {
  let best: ResolvedUpdate | undefined;
  for (const release of releases) {
    if (release.draft || release.prerelease) continue;
    const ordinal = parseReleaseTag(release.tagName);
    if (!ordinal) continue;
    const version: Version = [ordinal[0], ordinal[1], ordinal[2]];
    if (currentVersion && compareVersion(version, currentVersion) <= 0) continue;
    if (best && compareOrdinal(ordinal, best.ordinal) <= 0) continue;
    if (!release.htmlUrl.startsWith('https://')) continue;
    const setups = release.assets.filter((asset) => /Setup\.exe$/iu.test(asset.name));
    const fullPackages = release.assets.filter((asset) => /-full\.nupkg$/iu.test(asset.name));
    const releasesAsset = exactlyOne(release.assets, 'RELEASES');
    const shaSumsAsset = exactlyOne(release.assets, 'SHA256SUMS.txt');
    const identityAsset = exactlyOne(release.assets, 'release-identity.json');
    if (setups.length !== 1 || !httpsAsset(setups[0]) || !httpsAsset(releasesAsset) || !httpsAsset(shaSumsAsset) ||
      !httpsAsset(identityAsset) || fullPackages.length < 1 || !fullPackages.every(httpsAsset)) continue;
    best = {
      tag: release.tagName,
      version: `${version[0]}.${version[1]}.${version[2]}`,
      ordinal,
      releaseUrl: release.htmlUrl,
      setupAsset: setups[0],
      releasesAsset,
      fullPackageAssets: fullPackages,
      deltaPackageAssets: release.assets.filter((asset) => /-delta\.nupkg$/iu.test(asset.name) && httpsAsset(asset)),
      shaSumsAsset,
      identityAsset,
    };
  }
  return best;
}

export function validateReleaseIdentity(identity: unknown, resolved: ResolvedUpdate): { ok: true; value: ReleaseIdentity } | { ok: false; reason: string } {
  if (!identity || typeof identity !== 'object') return { ok: false, reason: 'The published release identity is not an object.' };
  const value = identity as Partial<ReleaseIdentity>;
  if (value.schemaVersion !== 1 || value.product !== 'ding-pbx-console' || value.published !== true) {
    return { ok: false, reason: 'The published release identity is malformed or unpublished.' };
  }
  if (value.version !== resolved.version || value.tag !== resolved.tag || typeof value.candidateCommit !== 'string' || !COMMIT_PATTERN.test(value.candidateCommit)) {
    return { ok: false, reason: 'The published release identity does not match its release tag or candidate commit.' };
  }
  const artifacts = value.artifacts;
  if (!artifacts || typeof artifacts !== 'object' || typeof artifacts.sha256sums !== 'string' || typeof artifacts.identity !== 'string' ||
    !artifacts.setup || !artifacts.releases || !Array.isArray(artifacts.fullPackages) || !Array.isArray(artifacts.deltaPackages)) {
    return { ok: false, reason: 'The published release identity has incomplete artifact records.' };
  }
  if (artifacts.sha256sums !== 'SHA256SUMS.txt' || artifacts.identity !== 'release-identity.json') {
    return { ok: false, reason: 'The published release identity names the wrong checksum or identity asset.' };
  }
  const records = [artifacts.setup, artifacts.releases, ...artifacts.fullPackages, ...artifacts.deltaPackages];
  if (!records.every((record) => Boolean(record && typeof record.name === 'string' && Number.isSafeInteger(record.size) && record.size > 0 && typeof record.sha256 === 'string' && SHA_PATTERN.test(record.sha256)))) {
    return { ok: false, reason: 'The published release identity contains an invalid artifact digest record.' };
  }
  const recordNames = records.map((record) => record.name);
  if (new Set(recordNames).size !== recordNames.length) {
    return { ok: false, reason: 'The published release identity contains duplicate artifact records.' };
  }
  const escapedVersion = resolved.version.replace(/[.]/gu, '\\.');
  const versionPattern = new RegExp(`-${escapedVersion}-(?:full|delta)\\.nupkg$`, 'iu');
  if (!artifacts.fullPackages.every((record) => versionPattern.test(record.name)) || !artifacts.deltaPackages.every((record) => versionPattern.test(record.name)) || artifacts.setup.name !== 'Ding-PBX-Console-Setup.exe') {
    return { ok: false, reason: 'The published artifact filenames do not carry the release version.' };
  }
  const resolvedAssets = [...resolved.fullPackageAssets, ...resolved.deltaPackageAssets, resolved.setupAsset, resolved.releasesAsset];
  for (const record of records) {
    const asset = resolvedAssets.find((candidate) => candidate.name === record.name);
    if (!asset) return { ok: false, reason: `The published release identity names an unknown artifact ${record.name}.` };
    if (asset && asset.size !== record.size) return { ok: false, reason: `The published release identity does not match asset ${record.name}.` };
  }
  const resolvedNames = resolvedAssets.map((asset) => asset.name);
  if (new Set(resolvedNames).size !== resolvedNames.length || recordNames.length !== resolvedNames.length || recordNames.some((name) => !resolvedNames.includes(name)) ||
    artifacts.setup.name !== resolved.setupAsset.name || artifacts.releases.name !== resolved.releasesAsset.name ||
    artifacts.fullPackages.length !== resolved.fullPackageAssets.length || artifacts.fullPackages.some((record) => !resolved.fullPackageAssets.some((asset) => asset.name === record.name && asset.size === record.size)) ||
    artifacts.deltaPackages.length !== resolved.deltaPackageAssets.length || artifacts.deltaPackages.some((record) => !resolved.deltaPackageAssets.some((asset) => asset.name === record.name && asset.size === record.size))) {
    return { ok: false, reason: 'The published release identity does not enumerate the complete Squirrel artifact set.' };
  }
  return { ok: true, value: value as ReleaseIdentity };
}

export function findDigestForAsset(shaSumsText: string, fileName: string): string | undefined {
  for (const line of shaSumsText.split(/\r?\n/u)) {
    const match = /^([0-9a-f]{64})\s+\*?(.+)$/iu.exec(line.trim());
    if (match && match[2] === fileName) return match[1].toLowerCase();
  }
  return undefined;
}

export interface UpdaterState {
  state: UpdateState;
  currentVersion: Version | undefined;
  currentTag: string | undefined;
  resolved: ResolvedUpdate | undefined;
  downloadedPath: string | undefined;
  lastCheckedAt: string | undefined;
  lastError: string | undefined;
  revision: number;
  dismissedTag: string | undefined;
  restartPending: boolean;
  unsavedDraftCount: number;
}

export function initialUpdaterState(currentVersion: Version | undefined, currentTag?: string): UpdaterState {
  return { state: 'idle', currentVersion, currentTag, resolved: undefined, downloadedPath: undefined, lastCheckedAt: undefined, lastError: undefined, revision: 0, dismissedTag: undefined, restartPending: false, unsavedDraftCount: 0 };
}

export function shouldCheckNow(lastCheckedAt: string | undefined, now: Date, intervalMs: number): boolean {
  if (!lastCheckedAt) return true;
  const last = new Date(lastCheckedAt).getTime();
  return Number.isNaN(last) || now.getTime() - last >= intervalMs;
}

export const DEFAULT_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;

export function beganChecking(s: UpdaterState, now: Date): UpdaterState {
  return { ...s, state: 'checking', lastCheckedAt: now.toISOString(), lastError: undefined, revision: s.revision + 1, restartPending: false };
}

export function checkSucceeded(s: UpdaterState, resolved: ResolvedUpdate | undefined): UpdaterState {
  if (!resolved) return { ...s, state: 'idle', resolved: undefined, downloadedPath: undefined, dismissedTag: undefined, revision: s.revision + 1 };
  return { ...s, state: 'available', resolved, lastError: undefined, revision: s.revision + 1 };
}

export function updateFailed(s: UpdaterState, reason: string): UpdaterState {
  return { ...s, state: 'failed', lastError: reason, dismissedTag: undefined, restartPending: false, revision: s.revision + 1 };
}

export function beganDownloading(s: UpdaterState): UpdaterState {
  if (!s.resolved) return updateFailed(s, 'No complete release identity is available to download.');
  return { ...s, state: 'downloading', revision: s.revision + 1 };
}

export function downloadReady(s: UpdaterState, downloadedPath: string): UpdaterState {
  return { ...s, state: 'ready', downloadedPath, lastError: undefined, revision: s.revision + 1 };
}

/** A failed Setup.exe launch is not a failed update check. The verified download stays
 * privileged and retryable, while the renderer receives the concrete launch reason. */
export function installerLaunchFailed(s: UpdaterState, reason: string): UpdaterState {
  if (s.state !== 'ready' || !s.downloadedPath) return updateFailed(s, reason);
  return { ...s, state: 'ready', lastError: reason, restartPending: false, revision: s.revision + 1 };
}

export function dismissedForNow(s: UpdaterState): UpdaterState {
  if (!s.resolved) return s;
  return { ...s, dismissedTag: s.resolved.tag, revision: s.revision + 1 };
}

export interface DownloadedFile { path: string; sha256: string; size: number }

export function verifyDownload(resolved: ResolvedUpdate, file: DownloadedFile, expectedDigest: string | undefined): { ok: true } | { ok: false; reason: string } {
  if (file.size !== resolved.setupAsset.size) return { ok: false, reason: `Downloaded ${file.size} bytes but the release declared ${resolved.setupAsset.size}.` };
  if (!expectedDigest) return { ok: false, reason: 'The release did not publish a SHA-256 digest for Setup.exe.' };
  if (file.sha256.toLowerCase() !== expectedDigest.toLowerCase()) return { ok: false, reason: 'Downloaded Setup.exe does not match the published SHA-256 digest.' };
  return { ok: true };
}
