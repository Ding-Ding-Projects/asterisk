#!/usr/bin/env node
import { existsSync, lstatSync, mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

function isNativeReparsePoint(path) {
  if (process.platform !== 'win32') return false;
  const result = spawnSync('fsutil.exe', ['reparsepoint', 'query', path], { stdio: 'ignore', windowsHide: true, shell: false });
  if (result.error) throw result.error;
  return result.status === 0;
}

function assertSafe(path) {
  let current = resolve(path);
  while (true) {
    if (existsSync(current) && (lstatSync(current).isSymbolicLink() || isNativeReparsePoint(current))) throw new Error(`reparse point accepted: ${current}`);
    const parent = dirname(current);
    if (parent === current) return;
    current = parent;
  }
}

if (process.platform !== 'win32') {
  console.log('Probe path fixture skipped outside Windows.');
  process.exit(0);
}

const root = mkdtempSync(join(tmpdir(), 'ding-pbx-probe-fixture-'));
const target = join(root, 'target');
const junction = join(root, 'junction');
try {
  mkdirSync(target);
  symlinkSync(target, junction, 'junction');
  let rejected = false;
  try { assertSafe(junction); } catch { rejected = true; }
  if (!rejected) throw new Error('Probe path fixture did not reject a Windows junction.');
  assertSafe(join(root, 'new-profile'));
  console.log('Probe path fixture verified: ordinary path accepted and junction rejected.');
} finally {
  rmSync(root, { recursive: true, force: true });
}
