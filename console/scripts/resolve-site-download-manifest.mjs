#!/usr/bin/env node
/**
 * Resolve the newest verified, already-published Material Asterisk release and write a
 * download manifest that console/site/build.mjs bakes into the published site.
 *
 * Why this exists: the Pages workflow deploys on every push to main, but the release
 * for that exact commit is published by a separate workflow that may not have finished
 * yet (or may never finish, if packaging failed). So this never resolves "the release
 * for this commit" -- it resolves the newest release that is ALREADY published, non-
 * draft, non-prerelease, and carries a verifiably matching Windows installer. The site
 * says plainly which version it is offering; it never blocks the Pages deploy waiting
 * for a release that does not exist yet.
 *
 * Three independent signals must agree before a release is trusted:
 *   1. the GitHub API's own `digest` field on the Setup.exe asset,
 *   2. the release's own release-identity.json artifact record,
 *   3. the release's own SHA256SUMS.txt line for Setup.exe.
 * A release where any of those disagree, or where the asset cannot actually be
 * downloaded at the size it claims, is skipped rather than trusted -- never averaged,
 * never "close enough".
 *
 * Never blocks: every failure path (no eligible release found, gh unavailable, a
 * malformed identity manifest, a network error) writes `{resolved:false, reason}` and
 * exits 0. The manifest's absence or invalidity is what makes build.mjs fall back to
 * the honest "not published" state -- that fallback is a feature, not a bug to route
 * around, so this script must never fail closed by throwing.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OWNER = 'Ding-Ding-Projects';
const REPO = 'material-asterisk';
const REPO_SLUG = `${OWNER}/${REPO}`;
const API_ROOT = 'repos/Ding-Ding-Projects/material-asterisk';
/* Both names, newest first. The product was renamed, so releases published before that
 * carry the old installer filename and releases after it carry the new one. A resolver
 * that knew only one of them would either refuse every release older than the rename or
 * every release newer than it -- and because it fails by reporting no verified installer,
 * the site would quietly go back to saying there is nothing to download rather than
 * erroring. Silent, plausible, and wrong in the one place the site exists to be right. */
const SETUP_ASSET_NAMES = ['Material-Asterisk-Setup.exe', 'Ding-PBX-Console-Setup.exe'];
const RELEASES_ASSET_NAME = 'RELEASES';
const SUMS_ASSET_NAME = 'SHA256SUMS.txt';
const IDENTITY_ASSET_NAME = 'release-identity.json';
const NUPKG_PATTERN = /^ding-pbx-console-\d+\.\d+\.\d+-full\.nupkg$/;
const SEMVER = /^\d+\.\d+\.\d+$/;
const SHA256_HEX = /^[0-9a-f]{64}$/;
/* Scan at most this many of the newest releases before giving up. Comfortably above
 * the current release cadence, and bounded so a very old, very large release history
 * can never make this run unboundedly long. */
const MAX_SCANNED = 300;
const PAGE_SIZE = 100;

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
};
const outPath = arg('out') ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'site', 'release-manifest.local.json');

function write(manifest) {
  writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(manifest.resolved
    ? `Resolved ${manifest.tag} (v${manifest.version}) -> ${outPath}`
    : `Did not resolve a download manifest: ${manifest.reason} -> ${outPath}`);
}

function ghApi(pathAndQuery) {
  const out = execFileSync('gh', ['api', pathAndQuery], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return JSON.parse(out);
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`GET ${url} responded ${response.status}`);
  return response.text();
}

async function headBytes(url) {
  const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
  if (!response.ok) throw new Error(`HEAD ${url} responded ${response.status}`);
  const length = Number(response.headers.get('content-length') || 0);
  if (!Number.isFinite(length) || length <= 0) throw new Error(`HEAD ${url} carried no usable content-length`);
  return length;
}

function findAsset(assets, name) {
  return assets.find((asset) => asset.name === name);
}

function parseSha256Sums(text, assetName) {
  for (const rawLine of text.replaceAll('\r\n', '\n').split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = line.match(/^([0-9a-fA-F]{64})\s+\*?(.+)$/);
    if (match && match[2].trim() === assetName) return match[1].toLowerCase();
  }
  return undefined;
}

/** Reject a candidate release with a clear, loggable reason rather than throwing. */
class Ineligible extends Error {}

async function evaluateRelease(release) {
  if (release.draft) throw new Ineligible('draft');
  if (release.prerelease) throw new Ineligible('prerelease');
  const assets = release.assets ?? [];
  const setupAsset = SETUP_ASSET_NAMES.map((name) => findAsset(assets, name)).find(Boolean);
  const releasesAsset = findAsset(assets, RELEASES_ASSET_NAME);
  const sumsAsset = findAsset(assets, SUMS_ASSET_NAME);
  const identityAsset = findAsset(assets, IDENTITY_ASSET_NAME);
  const nupkgAsset = assets.find((asset) => NUPKG_PATTERN.test(asset.name));
  if (!setupAsset) throw new Ineligible(`no installer asset under any known name: ${SETUP_ASSET_NAMES.join(', ')}`);
  if (!releasesAsset) throw new Ineligible(`missing ${RELEASES_ASSET_NAME}`);
  if (!sumsAsset) throw new Ineligible(`missing ${SUMS_ASSET_NAME}`);
  if (!identityAsset) throw new Ineligible(`missing ${IDENTITY_ASSET_NAME}`);
  if (!nupkgAsset) throw new Ineligible('missing a *-full.nupkg asset');
  if (setupAsset.state !== 'uploaded') throw new Ineligible(`${setupAsset.name} state is ${setupAsset.state}`);
  if (!Number.isInteger(setupAsset.size) || setupAsset.size <= 0) throw new Ineligible(`${setupAsset.name} reports a non-positive size`);

  const apiDigest = typeof setupAsset.digest === 'string' ? setupAsset.digest.replace(/^sha256:/, '').toLowerCase() : undefined;
  if (!apiDigest || !SHA256_HEX.test(apiDigest)) throw new Ineligible(`${setupAsset.name} carries no valid sha256 digest from the GitHub API`);

  const identity = JSON.parse(await fetchText(identityAsset.browser_download_url));
  if (identity.schemaVersion !== 1) throw new Ineligible(`release-identity.json schemaVersion is ${identity.schemaVersion}`);
  if (identity.product !== 'ding-pbx-console') throw new Ineligible(`release-identity.json product is ${identity.product}`);
  if (identity.published !== true) throw new Ineligible('release-identity.json published is not true');
  if (identity.tag !== release.tag_name) throw new Ineligible('release-identity.json tag does not match the release tag');
  if (!SEMVER.test(identity.version)) throw new Ineligible(`release-identity.json version "${identity.version}" is not a semantic version`);
  if (!/^[0-9a-f]{40}$/.test(identity.candidateCommit ?? '')) throw new Ineligible('release-identity.json candidateCommit is not a full commit SHA');
  const identitySetup = identity.artifacts?.setup;
  if (!identitySetup || identitySetup.name !== setupAsset.name) throw new Ineligible('release-identity.json artifacts.setup does not name the installer');
  const identityDigest = typeof identitySetup.sha256 === 'string' ? identitySetup.sha256.toLowerCase() : undefined;
  if (!identityDigest || !SHA256_HEX.test(identityDigest)) throw new Ineligible('release-identity.json artifacts.setup.sha256 is not a valid digest');
  if (identitySetup.size !== setupAsset.size) throw new Ineligible('release-identity.json artifacts.setup.size disagrees with the GitHub asset size');
  if (identityDigest !== apiDigest) throw new Ineligible('release-identity.json digest disagrees with the GitHub API asset digest');

  const sumsText = await fetchText(sumsAsset.browser_download_url);
  const sumsDigest = parseSha256Sums(sumsText, setupAsset.name);
  if (!sumsDigest || !SHA256_HEX.test(sumsDigest)) throw new Ineligible(`SHA256SUMS.txt carries no line for ${setupAsset.name}`);
  if (sumsDigest !== apiDigest) throw new Ineligible('SHA256SUMS.txt digest disagrees with the GitHub API asset digest');

  /* Prove the asset is actually reachable at the size every other signal claims, rather
   * than trusting three documents that could all describe an asset nobody can fetch. */
  const remoteBytes = await headBytes(setupAsset.browser_download_url);
  if (remoteBytes !== setupAsset.size) throw new Ineligible(`remote Content-Length ${remoteBytes} disagrees with the reported size ${setupAsset.size}`);

  return {
    schemaVersion: 1,
    resolved: true,
    resolvedAt: new Date().toISOString(),
    product: identity.product,
    version: identity.version,
    tag: release.tag_name,
    sourceCommit: identity.candidateCommit,
    publishedAt: release.published_at,
    releaseUrl: release.html_url,
    releaseNotesMarkdown: release.body ?? '',
    asset: {
      name: setupAsset.name,
      url: setupAsset.browser_download_url,
      sizeBytes: setupAsset.size,
      sha256: apiDigest,
    },
    verification: {
      identityManifestChecked: true,
      sha256sumsChecked: true,
      assetDigestHeaderChecked: true,
      remoteHeadBytesConfirmed: true,
    },
  };
}

async function main() {
  let releases;
  try {
    releases = ghApi(`${API_ROOT}/releases?per_page=${PAGE_SIZE}&page=1`);
    if (releases.length === PAGE_SIZE) {
      releases = releases.concat(ghApi(`${API_ROOT}/releases?per_page=${PAGE_SIZE}&page=2`));
    }
    releases = releases.slice(0, MAX_SCANNED);
  } catch (error) {
    write({ schemaVersion: 1, resolved: false, resolvedAt: new Date().toISOString(), reason: `could not list releases via gh: ${error.message ?? error}`, scannedReleases: 0 });
    return;
  }

  const reasons = [];
  for (const release of releases) {
    try {
      const manifest = await evaluateRelease(release);
      manifest.scannedReleases = reasons.length + 1;
      write(manifest);
      return;
    } catch (error) {
      if (error instanceof Ineligible) {
        reasons.push(`${release.tag_name}: ${error.message}`);
        continue;
      }
      reasons.push(`${release.tag_name}: ${error.message ?? error}`);
    }
  }

  write({
    schemaVersion: 1,
    resolved: false,
    resolvedAt: new Date().toISOString(),
    reason: releases.length === 0 ? `no releases exist yet on ${REPO_SLUG}` : `none of ${releases.length} scanned releases were eligible`,
    scannedReleases: releases.length,
    scanNotes: reasons.slice(0, 20),
  });
}

await main();
