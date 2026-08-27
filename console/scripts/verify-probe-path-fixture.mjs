#!/usr/bin/env node
import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const { assertNoReparseAncestors } = await import('../app/electron/probe-path.cjs');

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
  try { assertNoReparseAncestors(junction); } catch { rejected = true; }
  if (!rejected) throw new Error('Probe path fixture did not reject a Windows junction.');
  assertNoReparseAncestors(join(root, 'new-profile'));
  console.log('Probe path fixture verified: ordinary path accepted and junction rejected.');
} finally {
  rmSync(root, { recursive: true, force: true });
}
