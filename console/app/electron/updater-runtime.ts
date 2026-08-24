/**
 * Main-process I/O for the update checker. `control-plane/updater.ts` holds every
 * decision as a pure function; everything here is the network, filesystem and process
 * plumbing those decisions are made from and acted on with. Kept separate so the
 * decisions stay unit-testable with no network, per the shared house rule that a module
 * spawning a process or opening a socket needs at least one test that actually does
 * that — those tests live in `tests/control-plane/updater.test.ts` against the pure
 * module, and this file is exercised by running the packaged app.
 */
import { app } from 'electron';
import { createHash } from 'node:crypto';
import { createWriteStream, existsSync, readFileSync, unlinkSync } from 'node:fs';
import { mkdtemp, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import type {
  DownloadedFile, GitHubRelease, ReleaseAsset, ResolvedUpdate,
} from '../../control-plane/updater.js';

const RELEASES_API = 'https://api.github.com/repos/Ding-Ding-Projects/asterisk/releases?per_page=20';

interface GitHubReleaseApiAsset { name: string; browser_download_url: string; size: number }
interface GitHubReleaseApiEntry {
  tag_name: string; draft: boolean; prerelease: boolean; html_url: string; published_at: string;
  assets: GitHubReleaseApiAsset[];
}

/** Reads the current build's own release tag, written at package time (see `scripts/write-update-manifest.mjs`). */
export function readCurrentTag(): string | undefined {
  const path = app.isPackaged
    ? join(process.resourcesPath, 'update-manifest.json')
    : join(app.getAppPath(), 'resources', 'update-manifest.json');
  if (!existsSync(path)) return undefined;
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as {
      schemaVersion?: number;
      tag?: string | null;
      version?: string;
      candidateCommit?: string;
    };
    if (parsed.schemaVersion !== 1) return undefined;
    if (typeof parsed.version !== 'string' || !/^\d+\.\d+\.\d+$/u.test(parsed.version)) return undefined;
    if (typeof parsed.candidateCommit !== 'string' || !/^[0-9a-f]{40}$/u.test(parsed.candidateCommit)) return undefined;
    if (parsed.tag !== null && typeof parsed.tag !== 'string') return undefined;
    return parsed.tag ?? undefined;
  } catch {
    return undefined;
  }
}

/** Fetches and normalizes the Releases API response. Throws with a plain-language reason on any failure. */
export async function fetchReleases(fetchImpl: typeof fetch = fetch): Promise<GitHubRelease[]> {
  let response: Response;
  try {
    response = await fetchImpl(RELEASES_API, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'ding-pbx-console-updater' } });
  } catch (error) {
    throw new Error(`Could not reach GitHub to check for updates: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!response.ok) throw new Error(`GitHub returned ${response.status} while checking for updates.`);
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error('GitHub returned a response that was not valid update feed metadata.');
  }
  if (!Array.isArray(body)) throw new Error('GitHub returned update feed metadata in an unexpected shape.');
  return body.map((entry: GitHubReleaseApiEntry): GitHubRelease => ({
    tagName: String(entry.tag_name ?? ''),
    draft: Boolean(entry.draft),
    prerelease: Boolean(entry.prerelease),
    htmlUrl: String(entry.html_url ?? ''),
    publishedAt: String(entry.published_at ?? ''),
    assets: Array.isArray(entry.assets)
      ? entry.assets.map((asset): ReleaseAsset => ({
          name: String(asset.name ?? ''),
          browserDownloadUrl: String(asset.browser_download_url ?? ''),
          size: Number(asset.size ?? 0),
        }))
      : [],
  }));
}

/** Downloads one asset to a fresh temp directory, streaming it to disk and hashing it as it lands. */
export async function downloadAsset(asset: ReleaseAsset, fetchImpl: typeof fetch = fetch): Promise<DownloadedFile> {
  if (!asset.browserDownloadUrl.startsWith('https://')) throw new Error('Refusing a non-HTTPS download URL.');
  const dir = await mkdtemp(join(tmpdir(), 'ding-pbx-console-update-'));
  const path = join(dir, asset.name);
  const response = await fetchImpl(asset.browserDownloadUrl);
  if (!response.ok || !response.body) throw new Error(`Download failed with status ${response.status}.`);
  const hash = createHash('sha256');
  const write = createWriteStream(path);
  const reader = response.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      hash.update(value);
      if (!write.write(value)) await new Promise((resolve) => write.once('drain', resolve));
    }
  } finally {
    await new Promise<void>((resolve, reject) => write.end((error: Error | null | undefined) => (error ? reject(error) : resolve())));
  }
  const { size } = await stat(path);
  return { path, sha256: hash.digest('hex'), size };
}

/** Fetches the required plain-text SHA256SUMS.txt asset. */
export async function fetchShaSumsText(resolved: ResolvedUpdate, fetchImpl: typeof fetch = fetch): Promise<string> {
  if (!resolved.shaSumsAsset) throw new Error('The release does not include SHA256SUMS.txt.');
  const response = await fetchImpl(resolved.shaSumsAsset.browserDownloadUrl);
  if (!response.ok) throw new Error(`SHA256SUMS.txt download failed with status ${response.status}.`);
  return response.text();
}

/** Deletes a downloaded installer that failed verification, best-effort. */
export function discardDownload(path: string): void {
  try { unlinkSync(path); } catch { /* already gone, or never fully written; nothing more to do. */ }
}

/**
 * Launches the downloaded Squirrel Setup.exe and quits the current app. Squirrel's
 * Setup.exe, run again, installs the newer version into its own `app-<version>` folder
 * and repoints the shortcuts at it — the same mechanism it uses on first install — so
 * this genuinely upgrades the app rather than merely reinstalling a copy beside it.
 */
export function launchInstallerAndQuit(installerPath: string): void {
  const child = spawn(installerPath, ['--silent'], { detached: true, stdio: 'ignore' });
  child.once('spawn', () => {
    child.unref();
    app.quit();
  });
  child.once('error', () => {
    // Keep the current application open. A failed process start is not an update launch.
  });
}
