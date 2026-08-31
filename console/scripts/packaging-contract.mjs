import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// These are the inputs declared by console/electron-builder.yml. Keep the list
// hand-written so deleting a source cannot make the check disappear with it.
export const REQUIRED_PACKAGING_INPUTS = Object.freeze([
  'resources/asterisk-wsl-rootfs.tar',
  'resources/asterisk-wsl-rootfs.json',
  'resources/update-manifest.json',
  'resources/school-mode-provenance.json',
  'resources/forge/gh.exe',
  'native-messaging',
  'scripts/forge-device-signin.ps1',
]);

const COMMIT_SHA = /^[0-9a-f]{40}$/u;

export function findMissingPackagingInputs(consoleRoot) {
  return REQUIRED_PACKAGING_INPUTS.filter((entry) => {
    const path = join(consoleRoot, entry);
    if (!existsSync(path)) return true;
    return entry === 'native-messaging' ? !statSync(path).isDirectory() : !statSync(path).isFile();
  });
}

export function sha256File(path, createHash) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

export function validateReleaseIdentity(identity, { version, candidateCommit, tag }) {
  const errors = [];
  if (!identity || typeof identity !== 'object' || Array.isArray(identity)) return ['release identity must be a JSON object'];
  if (identity.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (identity.product !== 'ding-pbx-console') errors.push('product must be ding-pbx-console');
  if (identity.productName !== 'Ding PBX Console') errors.push('productName must be Ding PBX Console');
  if (identity.appId !== 'org.dingdingprojects.dingpbxconsole') errors.push('appId is not the packaged app id');
  if (identity.version !== version) errors.push(`version must match ${version}`);
  if (identity.candidateCommit !== candidateCommit || !COMMIT_SHA.test(identity.candidateCommit ?? '')) errors.push('candidateCommit must match the full checkout SHA');
  if (identity.tag !== tag) errors.push('tag must match the requested release tag');
  if (identity.published !== Boolean(tag)) errors.push('published must match whether a tag was supplied');
  return errors;
}

export function releasePackageNames(releasesText) {
  return releasesText.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean).map((line) => {
    const fields = line.split(/\s+/u);
    return fields.at(-1);
  });
}

export function validateReleasesIndex(releasesText, packageNames) {
  const listed = releasePackageNames(releasesText);
  const expected = [...packageNames].sort();
  const actual = [...listed].sort();
  const errors = [];
  if (listed.length !== new Set(listed).size) errors.push('RELEASES contains duplicate package rows');
  if (actual.length !== expected.length || actual.some((name, index) => name !== expected[index])) {
    errors.push(`RELEASES package rows do not exactly match generated packages: expected ${expected.join(', ') || '(none)'}, got ${actual.join(', ') || '(none)'}`);
  }
  return errors;
}

export function isUnsignedPortableExecutable(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 0x40 || bytes.readUInt16LE(0) !== 0x5a4d) return false;
  const peOffset = bytes.readUInt32LE(0x3c);
  if (peOffset < 0 || peOffset + 24 > bytes.length || bytes.readUInt32LE(peOffset) !== 0x00004550) return false;
  const optionalHeader = peOffset + 24;
  if (optionalHeader + 2 > bytes.length) return false;
  const magic = bytes.readUInt16LE(optionalHeader);
  const dataDirectory = magic === 0x10b ? optionalHeader + 96 : magic === 0x20b ? optionalHeader + 112 : -1;
  const certificateEntry = dataDirectory + (4 * 8);
  if (dataDirectory < 0 || certificateEntry + 8 > bytes.length) return false;
  return bytes.readUInt32LE(certificateEntry) === 0 && bytes.readUInt32LE(certificateEntry + 4) === 0;
}
