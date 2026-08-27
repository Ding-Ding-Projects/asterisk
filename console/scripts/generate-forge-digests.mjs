import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', '..');
const manifestPath = process.env.FORGE_DIGEST_MANIFEST_PATH ? resolve(process.env.FORGE_DIGEST_MANIFEST_PATH) : resolve(root, 'dependency-manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const dependencies = manifest.dependencies ?? [];
const gh = dependencies.filter((entry) => entry.id === 'github-cli-win-x64');
const helper = dependencies.filter((entry) => entry.id === 'forge-conpty-helper');
if (gh.length !== 1 || helper.length !== 1) throw new Error('Forge digest generation requires exactly one GitHub CLI and one ConPTY helper record.');
if (!/^[0-9a-f]{64}$/iu.test(gh[0].sha256) || !/^[0-9a-f]{64}$/iu.test(gh[0].archiveSha256)) throw new Error('Forge digest generation requires valid executable and archive SHA-256 values.');
if (!/^[0-9a-f]{64}$/iu.test(helper[0].sha256)) throw new Error('Forge digest generation requires a valid helper SHA-256 value.');
const provenance = gh[0].archiveDigestProvenance;
if (!provenance || provenance.algorithm !== 'SHA-256' || provenance.scope !== 'bootstrap-only' || typeof provenance.releaseAsset !== 'string' || !provenance.releaseAsset.startsWith('github-release:') || !Array.isArray(provenance.sources) || provenance.sources.length < 2 || provenance.sources.some((source) => source.value !== gh[0].archiveSha256 || source.identity !== provenance.releaseAsset)) {
  throw new Error('Forge archive digest provenance is missing, incomplete, or disagrees with archiveSha256.');
}
const output = `/* GENERATED FILE. Run console/scripts/generate-forge-digests.mjs from dependency-manifest.json. */\nexport const FORGE_GH_SHA256 = ${JSON.stringify(gh[0].sha256)};\nexport const FORGE_GH_ARCHIVE_SHA256 = ${JSON.stringify(gh[0].archiveSha256)};\nexport const FORGE_CONPTY_HELPER_SHA256 = ${JSON.stringify(helper[0].sha256)};\n`;
writeFileSync(resolve(root, 'console', 'control-plane', 'generated-forge-digests.ts'), output, 'utf8');
console.log('forge digests: generated from dependency-manifest.json');
