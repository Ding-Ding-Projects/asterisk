import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = mkdtempSync(join(tmpdir(), 'ding-manifest-negative-'));
const schema = join(process.cwd(), 'deployer/deployment/deployment-manifest.schema.json');
const validator = join(process.cwd(), 'deployer/deployment/validate-deployment-manifest.mjs');
const manifestPath = join(root, 'manifest.json');
const manifest = {
  schemaVersion: 1,
  image: 'registry.invalid/ding@sha256:' + 'a'.repeat(64),
  sourceCommit: 'a'.repeat(40),
  version: '1.0.0',
  projectName: 'ding-pbx-control-plane',
  adminPort: 8088,
  networkMode: 'admin-only',
  mountProfile: 'five-volumes-plus-run-tmpfs',
  mountInventory: ['ding-pbx-control-plane-data', 'ding-pbx-control-plane-asterisk-etc', 'ding-pbx-control-plane-asterisk-lib', 'ding-pbx-control-plane-asterisk-log', 'ding-pbx-control-plane-asterisk-spool', '/run/asterisk:tmpfs'],
  volumeSchemaVersion: 1,
  target: 'local-docker',
  targetHost: 'local',
  targetUser: 'local',
  targetSshPort: 0,
  inventoryPath: 'local-engine-facts',
  preflightEvidencePath: 'C:/private/preflight.json',
  preflightEvidenceSha256: 'b'.repeat(64),
  preflightExpiresAt: '2099-01-01T00:00:00.000Z',
  provenanceSha256: 'c'.repeat(64),
  sourceTreeSha256: 'd'.repeat(64),
  dockerfileSha256: 'e'.repeat(64),
  consoleLockSha256: 'f'.repeat(64),
  inputManifestSha256: '1'.repeat(64),
  aptSbomSha256: '2'.repeat(64),
  ubuntuSnapshot: '20260824T000000Z',
  runtimeBaseImage: 'ubuntu:24.04@sha256:' + '3'.repeat(64),
  nodeBuildBaseImage: 'node:22.23.2@sha256:' + '4'.repeat(64),
  snapshotKeyId: 'operator-key-2026-08',
};
try {
  writeFileSync(manifestPath, JSON.stringify(manifest));
  const valid = spawnSync(process.execPath, [validator, manifestPath, schema], { encoding: 'utf8' });
  if (valid.status !== 0) throw new Error('The validator rejected the hand-written valid manifest.');
  writeFileSync(manifestPath, JSON.stringify({ ...manifest, unexpected: true }));
  const invalid = spawnSync(process.execPath, [validator, manifestPath, schema], { encoding: 'utf8' });
  if (invalid.status === 0) throw new Error('The validator accepted an unexpected manifest field.');
  process.stdout.write('negative manifest schema Chut passed\n');
} finally {
  rmSync(root, { recursive: true, force: true });
}
