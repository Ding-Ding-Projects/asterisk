/** Bounded main-process network, file, cleanup, and installer-launch plumbing. */
import { app } from 'electron';
import { createHash } from 'node:crypto';
import { createWriteStream, existsSync, readFileSync } from 'node:fs';
import { mkdtemp, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { spawn } from 'node:child_process';
import type { DownloadedFile, GitHubRelease, ReleaseAsset, ReleaseIdentity, ResolvedUpdate } from '../../control-plane/updater.js';

const RELEASES_API = 'https://api.github.com/repos/Ding-Ding-Projects/material-asterisk/releases?per_page=20';
const TEMP_PREFIX = 'ding-pbx-console-update-';
const REQUEST_TIMEOUT_MS = 30_000;
const STREAM_READ_TIMEOUT_MS = 30_000;
const MAX_METADATA_BYTES = 2 * 1024 * 1024;
const MAX_CHECKSUM_BYTES = 4 * 1024 * 1024;
const MAX_IDENTITY_BYTES = 128 * 1024;
const MAX_INSTALLER_BYTES = 512 * 1024 * 1024;

interface GitHubReleaseApiAsset { name: string; browser_download_url: string; size: number }
interface GitHubReleaseApiEntry { tag_name: string; draft: boolean; prerelease: boolean; html_url: string; published_at: string; assets: GitHubReleaseApiAsset[] }

function withDeadline<T>(operation: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    operation,
    new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error(message)), timeoutMs); }),
  ]).finally(() => { if (timer) clearTimeout(timer); });
}

async function readResponseText(response: Response, maxBytes: number, label: string): Promise<string> {
  if (!response.body) throw new Error(`${label} response had no body.`);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const part = await withDeadline(reader.read(), STREAM_READ_TIMEOUT_MS, `${label} stream read timed out.`);
      if (part.done) break;
      total += part.value.byteLength;
      if (total > maxBytes) throw new Error(`${label} exceeded the ${maxBytes}-byte limit.`);
      chunks.push(part.value);
    }
  } finally { await reader.cancel().catch(() => undefined); }
  return new TextDecoder().decode(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))));
}

async function fetchBounded(fetchImpl: typeof fetch, url: string, init: RequestInit, maxBytes: number, label: string): Promise<Response> {
  const controller = new AbortController();
  const response = await withDeadline(fetchImpl(url, { ...init, signal: controller.signal }), REQUEST_TIMEOUT_MS, `${label} response headers timed out.`)
    .catch((error) => { controller.abort(); throw error; });
  if (!response.ok) throw new Error(`${label} failed with status ${response.status}.`);
  if (response.headers.get('content-length')) {
    const length = Number(response.headers.get('content-length'));
    if (!Number.isSafeInteger(length) || length > maxBytes) throw new Error(`${label} exceeded the ${maxBytes}-byte limit.`);
  }
  return response;
}

export interface CurrentIdentity { version: string; candidateCommit: string; tag: string | undefined }

/** Malformed packaged identity is returned as a visible failure, not as a local release. */
export function readCurrentIdentity(): CurrentIdentity | undefined {
  const path = app.isPackaged ? join(process.resourcesPath, 'update-manifest.json') : join(app.getAppPath(), 'resources', 'update-manifest.json');
  if (!existsSync(path)) return undefined;
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as { schemaVersion?: number; product?: unknown; version?: unknown; candidateCommit?: unknown; tag?: unknown; published?: unknown };
    if (parsed.schemaVersion !== 1 || parsed.product !== 'ding-pbx-console' || typeof parsed.version !== 'string' || !/^\d+\.\d+\.\d+$/u.test(parsed.version) || typeof parsed.candidateCommit !== 'string' || !/^[0-9a-f]{40}$/u.test(parsed.candidateCommit) || typeof parsed.published !== 'boolean' || (parsed.tag !== null && (typeof parsed.tag !== 'string' || !/^ding-pbx-console-v(?:0\.0\.\d+|\d+\.\d+\.\d+)-r\d+$/u.test(parsed.tag)))) return undefined;
    return { version: parsed.version, candidateCommit: parsed.candidateCommit, tag: parsed.tag === null ? undefined : parsed.tag };
  } catch { return undefined; }
}

export function readCurrentTag(): string | undefined { return readCurrentIdentity()?.tag; }

export async function fetchReleases(fetchImpl: typeof fetch = fetch): Promise<GitHubRelease[]> {
  let response: Response;
  try {
    response = await fetchBounded(fetchImpl, RELEASES_API, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'ding-pbx-console-updater' } }, MAX_METADATA_BYTES, 'GitHub release metadata');
  } catch (error) { throw new Error(`Could not reach GitHub to check for updates: ${error instanceof Error ? error.message : String(error)}`); }
  let body: unknown;
  try { body = JSON.parse(await readResponseText(response, MAX_METADATA_BYTES, 'GitHub release metadata')); } catch (error) { throw new Error(`GitHub returned invalid update feed metadata: ${error instanceof Error ? error.message : String(error)}`); }
  if (!Array.isArray(body)) throw new Error('GitHub returned update feed metadata in an unexpected shape.');
  return body.map((entry: GitHubReleaseApiEntry): GitHubRelease => ({
    tagName: String(entry.tag_name ?? ''), draft: Boolean(entry.draft), prerelease: Boolean(entry.prerelease), htmlUrl: String(entry.html_url ?? ''), publishedAt: String(entry.published_at ?? ''),
    assets: Array.isArray(entry.assets) ? entry.assets.map((asset) => ({ name: String(asset.name ?? ''), browserDownloadUrl: String(asset.browser_download_url ?? ''), size: Number(asset.size ?? 0) })) : [],
  }));
}

export async function fetchReleaseIdentity(resolved: ResolvedUpdate, fetchImpl: typeof fetch = fetch): Promise<unknown> {
  const response = await fetchBounded(fetchImpl, resolved.identityAsset.browserDownloadUrl, {}, MAX_IDENTITY_BYTES, 'Release identity');
  try { return JSON.parse(await readResponseText(response, MAX_IDENTITY_BYTES, 'Release identity')); } catch (error) { throw new Error(`Release identity is malformed: ${error instanceof Error ? error.message : String(error)}`); }
}

export async function fetchShaSumsText(resolved: ResolvedUpdate, fetchImpl: typeof fetch = fetch): Promise<string> {
  const response = await fetchBounded(fetchImpl, resolved.shaSumsAsset.browserDownloadUrl, {}, MAX_CHECKSUM_BYTES, 'SHA256SUMS.txt');
  return readResponseText(response, MAX_CHECKSUM_BYTES, 'SHA256SUMS.txt');
}

export async function downloadAsset(asset: ReleaseAsset, fetchImpl: typeof fetch = fetch): Promise<DownloadedFile & { directory: string }> {
  if (!asset.browserDownloadUrl.startsWith('https://')) throw new Error('Refusing a non-HTTPS download URL.');
  if (!Number.isSafeInteger(asset.size) || asset.size <= 0 || asset.size > MAX_INSTALLER_BYTES) throw new Error('The release installer size is outside the safe limit.');
  if (basename(asset.name) !== asset.name || asset.name.length > 160) throw new Error('The release installer name is unsafe.');
  const directory = await mkdtemp(join(tmpdir(), TEMP_PREFIX));
  const path = join(directory, asset.name);
  try {
    const response = await fetchBounded(fetchImpl, asset.browserDownloadUrl, {}, MAX_INSTALLER_BYTES, 'Setup.exe download');
    if (!response.body) throw new Error('Setup.exe download had no body.');
    const reader = response.body.getReader();
    const stream = createWriteStream(path, { flags: 'wx' });
    let streamFailure: Error | undefined;
    stream.on('error', (error) => { streamFailure = error; });
    const hash = createHash('sha256');
    let total = 0;
    try {
      for (;;) {
        const part = await withDeadline(reader.read(), STREAM_READ_TIMEOUT_MS, 'Setup.exe stream read timed out.');
        if (part.done) break;
        if (streamFailure) throw streamFailure;
        total += part.value.byteLength;
        if (total > MAX_INSTALLER_BYTES || total > asset.size) throw new Error('Setup.exe exceeded its declared size.');
        hash.update(part.value);
        if (!stream.write(part.value)) {
          await withDeadline(new Promise<void>((resolve, reject) => {
            const onDrain = () => { cleanup(); resolve(); };
            const onError = (error: Error) => { cleanup(); reject(error); };
            const cleanup = () => { stream.removeListener('drain', onDrain); stream.removeListener('error', onError); };
            stream.once('drain', onDrain);
            stream.once('error', onError);
          }), STREAM_READ_TIMEOUT_MS, 'Setup.exe disk write stalled.');
        }
      }
    } finally {
      await reader.cancel().catch(() => undefined);
      await withDeadline(new Promise<void>((resolve, reject) => {
        const onError = (error: Error) => { cleanup(); reject(error); };
        const onFinish = (error?: Error | null) => { cleanup(); error ? reject(error) : resolve(); };
        const cleanup = () => stream.removeListener('error', onError);
        stream.once('error', onError);
        stream.end(onFinish);
      }), STREAM_READ_TIMEOUT_MS, 'Setup.exe disk close stalled.');
    }
    if (streamFailure) throw streamFailure;
    const result = await stat(path);
    return { path, directory, sha256: hash.digest('hex'), size: result.size };
  } catch (error) {
    await removeOwnedDownloadDirectory(directory);
    throw error;
  }
}

export async function removeOwnedDownloadDirectory(directory: string): Promise<void> {
  if (basename(directory).startsWith(TEMP_PREFIX)) await rm(directory, { recursive: true, force: true });
}

export async function discardDownload(path: string | undefined): Promise<void> {
  if (!path) return;
  await removeOwnedDownloadDirectory(dirname(path));
}

export async function sweepStaleDownloads(maxAgeMs = 24 * 60 * 60 * 1000): Promise<void> {
  const now = Date.now();
  for (const name of await readdir(tmpdir(), { withFileTypes: true })) {
    if (!name.isDirectory() || !name.name.startsWith(TEMP_PREFIX)) continue;
    const directory = join(tmpdir(), name.name);
    const metadata = await stat(directory).catch(() => undefined);
    if (metadata && now - metadata.mtimeMs > maxAgeMs) await removeOwnedDownloadDirectory(directory);
  }
}

export async function launchInstaller(installerPath: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  return new Promise((resolve) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (result: { ok: true } | { ok: false; reason: string }) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(result);
    };
    let child: ReturnType<typeof spawn>;
    try {
      /* Setup.exe is the actual unsigned Squirrel.Windows handoff.  Do not pass
       * --silent here: the renderer has already received the user's explicit choice,
       * but silent mode hides the only installer/UAC surface and makes a successful
       * handoff indistinguishable from a button that did nothing.  The normal setup
       * surface also carries the unknown-publisher warning we disclose before launch. */
      child = spawn(installerPath, [], { detached: true, stdio: 'ignore', windowsHide: false });
    } catch (error) {
      finish({ ok: false, reason: `Could not start the installer: ${error instanceof Error ? error.message : String(error)}` });
      return;
    }
    child.once('spawn', () => { child.unref(); finish({ ok: true }); });
    child.once('error', (error) => finish({ ok: false, reason: `Could not start the installer: ${error.message}` }));
    timer = setTimeout(() => finish({ ok: false, reason: 'Installer start timed out.' }), REQUEST_TIMEOUT_MS);
    timer.unref();
  });
}

export function releaseIdentityDigest(identity: ReleaseIdentity, assetName: string): string | undefined {
  const records = [identity.artifacts.setup, identity.artifacts.releases, ...identity.artifacts.fullPackages, ...identity.artifacts.deltaPackages];
  return records.find((record) => record.name === assetName)?.sha256;
}
