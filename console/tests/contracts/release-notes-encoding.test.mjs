/**
 * Contract: the release workflow never lets a Windows PowerShell default decide an encoding.
 *
 * The release notes carry Cantonese, and the publishing step runs under `shell: powershell`,
 * which is Windows PowerShell 5.1 rather than PowerShell 7. Two of its defaults disagree
 * with the rest of the toolchain:
 *
 *   Set-Content -Encoding utf8  writes a byte-order mark
 *   Get-Content -Raw            reads as the ANSI code page unless a mark is present
 *
 * Which produced a state worth recording, because it is the reason this file exists rather
 * than a one-line cleanup. Measured on 5.1.26100.8521:
 *
 *   file with a mark, Get-Content -Raw      2 of 2 Chinese characters survive
 *   file with no mark, Get-Content -Raw     0 of 2
 *
 * So the mark the workflow was accidentally writing was the *only* reason the published
 * notes were not mojibake. Removing it on its own -- the obvious tidy-up, and the one a
 * reader who has only noticed the mark will reach for -- would have silently reintroduced
 * the corruption. The two ends only work together, and that is what is pinned here.
 *
 * The mark itself is not harmless either: it lands inside the first heading, so the notes'
 * top-level heading renders without the anchor every other heading gets.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const workflowPath = resolve(repoRoot, '.github', 'workflows', 'delivery.yml');

/* Normalised, because this is a CRLF checkout and a pattern that assumes one newline
 * form matches nothing here -- which for a negative assertion means it passes forever. */
const lines = readFileSync(workflowPath, 'utf8').replace(/\r\n/gu, '\n').split('\n');
const code = lines.map((line) => line.trim()).filter((line) => !line.startsWith('#'));

test('the workflow file is real and large enough for these checks to mean anything', () => {
  assert.ok(lines.length > 200, `only ${lines.length} lines; the path is probably wrong`);
});

test('nothing writes a text file with the cmdlet that adds a byte-order mark', () => {
  /* Anchored to the start of a statement, not a bare substring: a substring needle is
   * satisfied by a commented-out line, which is how several guards here were toothless. */
  const offenders = code.filter((line) => /Set-Content\s+-Encoding\s+utf8\b/u.test(line));
  assert.deepEqual(
    offenders.filter((line) => !line.includes('.json')),
    [],
    'a non-JSON file is being written with Set-Content -Encoding utf8, which adds a byte-order mark under Windows PowerShell 5.1',
  );
});

test('the release notes are never read back through the ANSI default', () => {
  const offenders = code.filter((line) => /Get-Content\s+-Raw/u.test(line) && /notesPath|release-notes/u.test(line));
  assert.deepEqual(offenders, [], 'the notes are read with Get-Content -Raw, which decodes as the ANSI code page when no byte-order mark is present');
});

test('the notes are written and read as explicit UTF-8 without a mark', () => {
  const writes = code.filter((line) => /WriteAllText\(\$notesPath/u.test(line));
  assert.ok(writes.length >= 2, `expected the create and the timestamp-substitution writes, found ${writes.length}`);
  for (const line of writes) {
    assert.match(line, /UTF8Encoding \$false/u, `a notes write does not suppress the byte-order mark: ${line}`);
  }

  const reads = code.filter((line) => /ReadAllText\(\$notesPath/u.test(line));
  assert.ok(reads.length >= 1, 'nothing reads the notes back with an explicit encoding');
  for (const line of reads) {
    assert.match(line, /System\.Text\.Encoding\]::UTF8/u, `a notes read does not name its encoding: ${line}`);
  }
});

test('the line-count fragment folded into the notes is read the same way', () => {
  /* It is appended straight into the notes, so an ANSI read here corrupts the notes
   * the moment that fragment ever carries a non-ASCII character. */
  const line = code.find((candidate) => candidate.includes("line-count.md'"));
  assert.ok(line, 'the line-count fragment is no longer read into the notes; this guard needs updating');
  assert.match(line, /ReadAllText/u, 'the line-count fragment is read through an encoding default');
});
