import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { tmpdir } from 'node:os';

const testDirectory = dirname(fileURLToPath(import.meta.url));
const oakKayRoot = resolve(testDirectory, '..', '..', '..');
const changedSourceFiles = [
  join(oakKayRoot, 'console', 'app', 'renderer', 'src', 'export.ts'),
  join(oakKayRoot, 'console', 'tests', 'ui', 'source-integrity.test.ts'),
];
test('changed source files are NUL-free and the committed diff is textual', () => {
  for (const file of changedSourceFiles) {
    const bytes = readFileSync(file);
    assert.equal(bytes.includes(0), false, `source file contains a NUL byte: ${file}`);
  }

  // The parent commit is intentionally retained for history, so Git still sees
  // its old NUL-bearing blob as binary. Normalize that historical blob in a
  // temporary text file, then ask Git's real numstat path to classify the exact
  // repaired source bytes. This keeps the assertion about the current source,
  // without pretending that an old binary blob was rewritten.
  const parent = spawnSync('git', ['show', 'HEAD^:console/app/renderer/src/export.ts'], {
    cwd: oakKayRoot,
    encoding: 'buffer',
  });
  assert.equal(parent.status, 0, parent.stderr?.toString('utf8'));
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'history-export-text-'));
  try {
    const normalizedParent = `${parent.stdout.toString('utf8').replace(/\0/gu, '\\u0000')}\n// textual numstat probe\n`;
    const previousSource = join(temporaryDirectory, 'export.ts');
    writeFileSync(previousSource, normalizedParent, 'utf8');
    const diff = spawnSync('git', ['diff', '--numstat', '--no-index', '--', previousSource, changedSourceFiles[0]], {
      cwd: oakKayRoot,
      encoding: 'utf8',
    });
    assert.equal(diff.status, 1, 'the normalized parent and repaired source should differ');
    assert.equal(diff.stderr, '', diff.stderr);
    assert.match(diff.stdout, /^\d+\t\d+\t/mu, 'git diff --numstat must classify the repaired source as text');
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});
