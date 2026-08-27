import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const manifest = JSON.parse(readFileSync(resolve(import.meta.dirname, '..', '..', 'dependency-manifest.json'), 'utf8'));
manifest.dependencies.find((entry) => entry.id === 'github-cli-win-x64').archiveSha256 = `0${manifest.dependencies.find((entry) => entry.id === 'github-cli-win-x64').archiveSha256.slice(1)}`;
const tempRoot = mkdtempSync(join(tmpdir(), 'forge-digest-mismatch-'));
const manifestPath = join(tempRoot, 'dependency-manifest.json');
writeFileSync(manifestPath, JSON.stringify(manifest), 'utf8');
try {
  execFileSync(process.execPath, [resolve(import.meta.dirname, 'generate-forge-digests.mjs')], { env: { ...process.env, FORGE_DIGEST_MANIFEST_PATH: manifestPath }, stdio: 'pipe' });
  throw new Error('The deliberate archive digest mismatch did not turn the generator red.');
} catch (error) {
  if (error instanceof Error && /deliberate archive digest mismatch did not/u.test(error.message)) throw error;
  const detail = error instanceof Error ? `${error.message} ${String(error.stderr ?? '')}` : String(error);
  if (!/archive digest provenance|archiveSha256|SHA-256/u.test(detail)) throw error;
}
console.log('forge digest mismatch: PASS');
rmSync(tempRoot, { recursive: true, force: true });
