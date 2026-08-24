import { readFileSync } from 'node:fs';

const files = Object.fromEntries([
  'deploy',
  'restore',
  'cleanup',
  'installer',
  'build',
].map((name) => [name, readFileSync({
  deploy: 'deployer/deployment/deploy-control-plane.ps1',
  restore: 'deployer/deployment/restore-volume-snapshots.ps1',
  cleanup: 'deployer/deployment/cleanup-volume-snapshots.ps1',
  installer: 'console/scripts/build-installer.ps1',
  build: 'deployer/deployment/build-control-plane.ps1',
}[name], 'utf8')]));

const checks = [
  ['authenticated archive header', files.deploy, 'DING-PBX-SNAPSHOT|2|HKDF-SHA256|AES-256-CBC+HMAC-SHA256'],
  ['archive key-label binding', files.deploy, 'function Get-SnapshotArchiveHeader([string]$SnapshotId, [string]$Volume, [string]$KeyId)'],
  ['restore header parser', files.restore, 'function Read-ArchiveHeader'],
  ['restore protected-file validator', files.restore, 'function Assert-ProtectedRegularFile'],
  ['cleanup exact target identity', files.cleanup, 'targetHost -ne $taskManifest.targetHost'],
  ['installer artifact digest binding', files.installer, 'function Assert-IdentityArtifact'],
  ['installer artifact digest use', files.installer, 'Assert-IdentityArtifact $identity.artifacts.setup'],
  ['build helper immutable id', files.build, 'docker create --label io.ding.pbx.inspect=true $Tag'],
];

function assertContract(name, text, needle) {
  if (!text.includes(needle)) throw new Error(`${name} is missing: ${needle}`);
}

for (const [name, text, needle] of checks) {
  assertContract(name, text, needle);
  const broken = text.replace(needle, 'REMOVED_CONTRACT');
  let rejected = false;
  try { assertContract(name, broken, needle); } catch { rejected = true; }
  if (!rejected) throw new Error(`${name} negative regression stayed green after deliberate removal`);
}

if (/docker\s+run\s+--detach[^\r\n]*--name\s+\$helperName/u.test(files.deploy + files.restore)) {
  throw new Error('deployment helper creation still depends on a caller-chosen name');
}
if (/docker\s+create[^\r\n]*--name\s+\$container/u.test(files.deploy + files.build)) {
  throw new Error('provenance inspection still depends on a caller-chosen container name');
}

process.stdout.write('deployment contract negative regressions passed\n');
