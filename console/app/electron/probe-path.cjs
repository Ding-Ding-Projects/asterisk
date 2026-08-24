const { existsSync, lstatSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const { dirname, resolve } = require('node:path');

function isNativeReparsePoint(path) {
  if (process.platform !== 'win32') return false;
  const result = spawnSync('fsutil.exe', ['reparsepoint', 'query', path], { stdio: 'ignore', windowsHide: true, shell: false });
  if (result.error) throw result.error;
  return result.status === 0;
}

function assertNoReparseAncestors(target) {
  let current = resolve(target);
  while (true) {
    if (existsSync(current) && (lstatSync(current).isSymbolicLink() || isNativeReparsePoint(current))) throw new Error('Probe path contains a symlink or reparse point.');
    const parent = dirname(current);
    if (parent === current) return;
    current = parent;
  }
}

module.exports = { assertNoReparseAncestors, isNativeReparsePoint };
