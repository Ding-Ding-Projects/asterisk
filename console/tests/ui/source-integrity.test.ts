import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const testDirectory = dirname(fileURLToPath(import.meta.url));
const oakKayRoot = resolve(testDirectory, '..', '..', '..');
const changedSourceFiles = [
  join(oakKayRoot, 'console', 'app', 'renderer', 'src', 'export.ts'),
  join(oakKayRoot, 'console', 'tests', 'ui', 'source-integrity.test.ts'),
];
const changedCommitFiles = [
  'console/app/renderer/src/export.ts',
  'console/tests/ui/source-integrity.test.ts',
];

test('changed source files are NUL-free and the committed diff is textual', () => {
  for (const file of changedSourceFiles) {
    const bytes = readFileSync(file);
    assert.equal(bytes.includes(0), false, `source file contains a NUL byte: ${file}`);
  }

  const numstat = execFileSync(
    'git',
    ['diff', '--numstat', 'HEAD^', 'HEAD', '--', ...changedCommitFiles],
    { cwd: oakKayRoot, encoding: 'utf8' },
  );
  const rows = numstat.trim().split(/\r?\n/).filter(Boolean);
  assert.equal(rows.length, changedCommitFiles.length, 'the committed source diff must list every changed source file');
  for (const row of rows) {
    assert.match(row, /^\d+\t\d+\t(?:console\/app\/renderer\/src\/export\.ts|console\/tests\/ui\/source-integrity\.test\.ts)$/u);
  }
});
