import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createIsolatedLogoDecoder } from '../../control-plane/logo-decoder.js';

const commit = 'a'.repeat(40);
const cropDigest = 'b'.repeat(64);
const outputPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL9wgAAAABJRU5ErkJggg==';

function digest(bytes: string | Buffer): string { return createHash('sha256').update(bytes).digest('hex'); }

async function fixture(identityChange: Record<string, unknown> = {}) {
  const root = await mkdtemp(join(tmpdir(), 'ding-logo-identity-'));
  const marker = join(root, 'worker-started');
  const workerPath = join(root, 'worker.mjs');
  const manifestPath = join(root, 'logo-decoder-manifest.json');
  const identityManifestPath = join(root, 'update-manifest.json');
  const packageLockPath = join(root, 'package-lock.json');
  const worker = `import { writeFileSync } from 'node:fs';\nimport { argv, stdin, stdout } from 'node:process';\nwriteFileSync(${JSON.stringify(marker)}, 'started');\nstdin.on('data', (data) => { const request = JSON.parse(String(data)); stdout.write(JSON.stringify({ id: request.id, bytesBase64: ${JSON.stringify(outputPng)}, roundTripVerified: true, cropDigest: ${JSON.stringify(cropDigest)}, lossNotes: [] }) + '\\n'); });\n`;
  const manifest = { schemaVersion: 1, sourceCommit: commit, recoverySha256: 'c'.repeat(64) };
  await writeFile(workerPath, worker, 'utf8');
  await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`, 'utf8');
  await writeFile(packageLockPath, '{}\n', 'utf8');
  const manifestSha256 = digest(await readFile(manifestPath));
  await writeFile(identityManifestPath, `${JSON.stringify({ schemaVersion: 1, product: 'ding-pbx-console', candidateCommit: commit, logoDecoderManifestSha256: manifestSha256, ...identityChange })}\n`, 'utf8');
  return { root, marker, workerPath, manifestPath, identityManifestPath, packageLockPath };
}

async function convert(paths: Awaited<ReturnType<typeof fixture>>) {
  return await createIsolatedLogoDecoder({ workerPath: paths.workerPath, manifestPath: paths.manifestPath, identityManifestPath: paths.identityManifestPath, packageLockPath: paths.packageLockPath, timeoutMs: 1_000 }).convert({ source: new Uint8Array([1]), sourceFormat: 'png', target: { format: 'png', width: 1, height: 1, alpha: true }, crop: { fit: 'contain', focalPoint: { x: 0.5, y: 0.5 }, safeArea: { top: 0, right: 0, bottom: 0, left: 0 }, background: { kind: 'transparent' } } });
}

for (const [name, change] of [
  ['stale', { candidateCommit: 'd'.repeat(40) }],
  ['replaced', { logoDecoderManifestSha256: 'e'.repeat(64) }],
  ['mismatched', { product: 'another-product' }],
] as const) {
  test(`direct convert rejects ${name} packaged identity before worker launch or cache handoff`, async () => {
    const paths = await fixture(change);
    try {
      await assert.rejects(convert(paths), /packaged product identity/u);
      await assert.rejects(readFile(paths.marker));
    } finally { await rm(paths.root, { recursive: true, force: true }); }
  });
}

test('direct convert rejects a missing packaged identity before worker launch or cache handoff', async () => {
  const paths = await fixture();
  try {
    const decoder = createIsolatedLogoDecoder({ workerPath: paths.workerPath, manifestPath: paths.manifestPath, packageLockPath: paths.packageLockPath, timeoutMs: 1_000 });
    await assert.rejects(decoder.convert({ source: new Uint8Array([1]), sourceFormat: 'png', target: { format: 'png', width: 1, height: 1, alpha: true }, crop: { fit: 'contain', focalPoint: { x: 0.5, y: 0.5 }, safeArea: { top: 0, right: 0, bottom: 0, left: 0 }, background: { kind: 'transparent' } } }), /identity path is missing/u);
    await assert.rejects(readFile(paths.marker));
  } finally { await rm(paths.root, { recursive: true, force: true }); }
});

test('direct convert accepts a complete packaged identity and starts the isolated worker', async () => {
  const paths = await fixture();
  try {
    const result = await convert(paths);
    assert.equal(result.roundTripVerified, true);
    assert.equal(result.cropDigest, cropDigest);
    assert.equal((await readFile(paths.marker, 'utf8')), 'started');
  } finally { await rm(paths.root, { recursive: true, force: true }); }
});
