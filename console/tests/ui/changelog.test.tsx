import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  commitUrl,
  filterAndSearch,
  filterByDate,
  parseChangelog,
  parseChangelogDetailed,
  search,
  searchDetailed,
  searchDetailedBounded,
  toMarkdown,
  toPlainText,
  validateCommits,
} from '../../app/renderer/src/changelog.ts';
import type { ChangelogEntry } from '../../app/renderer/src/changelog.ts';

const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);
const SHA_C = 'c'.repeat(40);
const SHA_D = 'd'.repeat(40);
const here = fileURLToPath(new URL('.', import.meta.url));

// ---------------------------------------------------------------- parsing

test('parseChangelog parses a realistic multi-version document', () => {
  const md = `
## 2.3.0 — 2026-08-20

### Features
- Added the queue trunk badge (${SHA_A})
- Added live ring group counts (${SHA_B})

### Fixes
- Fixed dropped SIP registration events (${SHA_C})

## 2.2.0 — 2026-07-01

### Fixes
- Fixed a crash on empty endpoint list (${SHA_D})
`;
  const entries = parseChangelog(md);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].version, '2.3.0');
  assert.equal(entries[0].date, '2026-08-20');
  assert.equal(entries[0].changes.length, 3);
  assert.deepEqual(entries[0].changes[0], { category: 'Features', summary: 'Added the queue trunk badge', commit: SHA_A });
  assert.equal(entries[1].version, '2.2.0');
  assert.equal(entries[1].changes[0].category, 'Fixes');
});

test('parseChangelog accepts en dash and hyphen version separators', () => {
  const enDash = parseChangelog(`## 1.0.0 — 2026-01-01\n\n- Something happened (${SHA_A})\n`);
  const hyphen = parseChangelog(`## 1.0.0 - 2026-01-01\n\n- Something happened (${SHA_A})\n`);
  assert.equal(enDash.length, 1);
  assert.equal(hyphen.length, 1);
  assert.equal(enDash[0].date, hyphen[0].date);
});

test('parseChangelog falls back to a default category when none is stated', () => {
  const entries = parseChangelog(`## 1.0.0 — 2026-01-01\n\n- Bare change with no category (${SHA_A})\n`);
  assert.equal(entries[0].changes[0].category, 'General');
});

test('a version with no recorded changes survives as an entry with an empty change list', () => {
  const entries = parseChangelog(`## 1.0.0 — 2026-01-01\n\n## 0.9.0 — 2025-12-01\n\n### Fixes\n- One fix (${SHA_A})\n`);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].version, '1.0.0');
  assert.deepEqual(entries[0].changes, []);
  assert.equal(entries[1].changes.length, 1);
});

test('malformed lines are skipped and counted, not thrown or silently absorbed', () => {
  const md = `
## 1.0.0 — 2026-01-01

### Fixes
- Valid change (${SHA_A})
- Malformed change missing a commit id
- Also malformed (not-a-hex-commit)
`;
  const { entries, skipped } = parseChangelogDetailed(md);
  assert.equal(entries[0].changes.length, 1);
  assert.equal(skipped, 2);
});

test('a malformed version heading is skipped and counted', () => {
  const { entries, skipped } = parseChangelogDetailed(`## not a real heading\n\n## 1.0.0 — 2026-01-01\n\n- x (${SHA_A})\n`);
  assert.equal(entries.length, 1);
  assert.equal(skipped, 1);
});

test('a change line appearing before any version heading is skipped and counted', () => {
  const { entries, skipped } = parseChangelogDetailed(`- orphan change (${SHA_A})\n\n## 1.0.0 — 2026-01-01\n`);
  assert.equal(entries.length, 1);
  assert.equal(skipped, 1);
});

test('parseChangelog handles an empty document without throwing', () => {
  assert.deepEqual(parseChangelog(''), []);
  assert.deepEqual(parseChangelog('   \n\n  '), []);
});

// ---------------------------------------------------------------- filterByDate

const ENTRIES: ReadonlyArray<ChangelogEntry> = [
  { version: '3.0.0', date: '2026-08-20', changes: [{ category: 'Fixes', summary: 'Repaired queue count', commit: SHA_A }] },
  { version: '2.0.0', date: '2026-06-15', changes: [{ category: 'Features', summary: 'Added TRUNK monitor', commit: SHA_B }] },
  { version: '1.0.0', date: '2026-01-01', changes: [{ category: 'Fixes', summary: 'Initial release fix', commit: SHA_C }] },
];

test('filterByDate with from only', () => {
  const result = filterByDate(ENTRIES, { from: '2026-06-15' });
  assert.deepEqual(result.map((e) => e.version), ['3.0.0', '2.0.0']);
});

test('filterByDate with to only', () => {
  const result = filterByDate(ENTRIES, { to: '2026-06-15' });
  assert.deepEqual(result.map((e) => e.version), ['2.0.0', '1.0.0']);
});

test('filterByDate with both from and to (inclusive range)', () => {
  const result = filterByDate(ENTRIES, { from: '2026-01-01', to: '2026-06-15' });
  assert.deepEqual(result.map((e) => e.version), ['2.0.0', '1.0.0']);
});

test('filterByDate returns an empty result when the range excludes everything', () => {
  const result = filterByDate(ENTRIES, { from: '2027-01-01' });
  assert.deepEqual(result, []);
});

// ---------------------------------------------------------------- search

test('plain-text search is the default and is case-insensitive', () => {
  const result = search(ENTRIES, 'trunk');
  assert.deepEqual(result.map((e) => e.version), ['2.0.0']);
});

test('regex search only applies when explicitly requested and awaits bounded evaluation', async () => {
  const literalAsPlainText = search(ENTRIES, '^Repaired');
  assert.deepEqual(literalAsPlainText, []); // no literal caret in any text

  const asRegex = await searchDetailedBounded(ENTRIES, '^Repaired', { regex: true });
  // Node has no browser Worker. Regex mode is deliberately unavailable rather
  // than falling back to same-thread evaluation.
  assert.deepEqual(asRegex.entries, []);
  assert.match(asRegex.error ?? '', /isolated regular-expression search is unavailable/iu);
});

test('an invalid regex is reported by the bounded evaluator, never thrown', async () => {
  await assert.doesNotReject(() => searchDetailedBounded(ENTRIES, '(unterminated', { regex: true }));
  const result = await searchDetailedBounded(ENTRIES, '(unterminated', { regex: true });
  assert.equal(result.entries.length, 0);
  assert.ok(result.error && result.error.length > 0);
});

test('App routes changelog regex queries through bounded evaluation and rejects stale replies', () => {
  const app = readFileSync(resolve(here, '../../app/renderer/src/App.tsx'), 'utf8');
  assert.match(app, /searchDetailedBounded\(entries, query, \{ regex: true, flags, signal: abort\.signal \}\)/u);
  assert.match(app, /generation !== this\.changelogSearchGeneration \|\| abort\.signal\.aborted/u);
  assert.match(app, /setChangelogQuery: this\.updateChangelogQuery/u);
  assert.match(app, /toggleChangelogRegex: this\.toggleChangelogRegex/u);
});

// ---------------------------------------------------------------- filterAndSearch composition

test('filterAndSearch composes a date range and a query together', () => {
  const result = filterAndSearch(ENTRIES, { from: '2026-01-01', to: '2026-06-15', query: 'trunk' });
  assert.deepEqual(result.entries.map((e) => e.version), ['2.0.0']);
});

test('filterAndSearch with only a date range applies just the range', () => {
  const result = filterAndSearch(ENTRIES, { from: '2026-06-15' });
  assert.deepEqual(result.entries.map((e) => e.version), ['3.0.0', '2.0.0']);
});

test('filterAndSearch with a range that excludes the only query match returns empty', () => {
  const result = filterAndSearch(ENTRIES, { to: '2026-01-01', query: 'trunk' });
  assert.deepEqual(result.entries, []);
});

// ---------------------------------------------------------------- validateCommits

test('validateCommits finds a bad commit id', () => {
  const exists = (commit: string) => commit !== SHA_B;
  const missing = validateCommits(ENTRIES, exists);
  assert.deepEqual(missing, [SHA_B]);
});

test('validateCommits returns empty when every commit exists', () => {
  assert.deepEqual(validateCommits(ENTRIES, () => true), []);
});

// ---------------------------------------------------------------- commitUrl

test('commitUrl resolves a valid 40-hex commit id', () => {
  assert.equal(commitUrl(SHA_A, 'https://github.com/example/repo'), `https://github.com/example/repo/commit/${SHA_A}`);
  assert.equal(commitUrl(SHA_A, 'https://github.com/example/repo/'), `https://github.com/example/repo/commit/${SHA_A}`);
});

test('commitUrl refuses a short commit id', () => {
  assert.throws(() => commitUrl('abc123', 'https://github.com/example/repo'));
});

test('commitUrl refuses a non-hex commit id', () => {
  assert.throws(() => commitUrl('g'.repeat(40), 'https://github.com/example/repo'));
});

test('commitUrl refuses an empty commit id', () => {
  assert.throws(() => commitUrl('', 'https://github.com/example/repo'));
});

// ---------------------------------------------------------------- export

test('toMarkdown and toPlainText round-trip the entries given and name the range', () => {
  const subset = filterByDate(ENTRIES, { from: '2026-06-15' });
  const md = toMarkdown(subset);
  const text = toPlainText(subset);
  for (const entry of subset) {
    assert.ok(md.includes(entry.version));
    assert.ok(text.includes(entry.version));
    for (const change of entry.changes) {
      assert.ok(md.includes(change.commit));
      assert.ok(text.includes(change.commit));
    }
  }
  assert.match(md, /Range:.*2026-06-15.*2026-08-20/s);
  assert.match(text, /Range:.*2026-06-15.*2026-08-20/s);
});

test('export of an empty entry list is handled without throwing', () => {
  assert.doesNotThrow(() => toMarkdown([]));
  assert.doesNotThrow(() => toPlainText([]));
  assert.match(toMarkdown([]), /no entries/);
  assert.match(toPlainText([]), /no entries/);
});

test('toMarkdown reports a version with no changes explicitly rather than omitting it', () => {
  const entries: ReadonlyArray<ChangelogEntry> = [{ version: '1.0.0', date: '2026-01-01', changes: [] }];
  const md = toMarkdown(entries);
  assert.match(md, /No changes recorded/);
});

// ---------------------------------------------------------------- empty-list safety everywhere

test('filterByDate, search, filterAndSearch, and validateCommits all handle an empty entry list', () => {
  assert.deepEqual(filterByDate([], { from: '2026-01-01' }), []);
  assert.deepEqual(search([], 'anything'), []);
  assert.deepEqual(filterAndSearch([], { query: 'anything' }).entries, []);
  assert.deepEqual(validateCommits([], () => true), []);
});
