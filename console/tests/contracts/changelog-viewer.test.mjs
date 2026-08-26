/**
 * Contract: changelog-viewer (windows-console surface -- see site/tests/
 * contracts/changelog-viewer.test.mjs for the pages-site row, which is
 * "absent": the site has no changelog surface at all).
 *
 * The console's changelog IS wired and reachable: App rail > App > Changelog
 * renders every version parsed from a real build-time bundle of this
 * repository's own tag history (`scripts/bundle-changelog.mjs` ->
 * `generated/changelog-bundle.ts`), with a query field plus a regex toggle, a
 * typed ISO date-range filter, copy and Markdown export, and per-change commit
 * links built from real commit hashes against the real repository URL.
 *
 * The one honest remaining gap, per the registry note: the date filter is
 * typed ISO fields plus range presets, not the full month/year-jump calendar
 * grid the canonical contract describes.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const json = (p) => JSON.parse(read(p));

const APP = 'app/renderer/src/App.tsx';
const GENERATED = 'app/renderer/src/generated/console.tsx';
const BUNDLE = 'app/renderer/src/generated/changelog-bundle.ts';

test('the registry row is internally honest: a defined state with a note explaining what is and is not wired', () => {
  const registry = json('app/feature-registry.json');
  const row = registry.features['changelog-viewer'];
  assert.ok(row, 'the implementation registry has no row for changelog-viewer');
  assert.ok(['implemented', 'partial', 'absent'].includes(row.state), `undefined state "${row.state}"`);
  assert.ok(typeof row.note === 'string' && row.note.length > 40, 'no note explaining what is and is not wired');
});

test('the changelog screen is a real destination (rail "app", kind "changelog")', () => {
  const generated = read(GENERATED);
  assert.match(generated, /changelog:\{ rail:'app', icon:'history_edu', label:'Changelog', badge:'', title:'Changelog', file:'', kind:'changelog',/u,
    'the changelog screen destination no longer matches');
});

test('the bundle is real, built-time content with real commit hashes and the real repository URL', () => {
  const bundle = read(BUNDLE);
  assert.match(bundle, /export const CHANGELOG_MARKDOWN: string = "/u, 'CHANGELOG_MARKDOWN no longer exists');
  assert.match(bundle, /export const CHANGELOG_REPOSITORY_URL: string = 'https:\/\/github\.com\//u,
    'CHANGELOG_REPOSITORY_URL no longer points at a real GitHub repository');
  const shaCount = [...bundle.matchAll(/\(([0-9a-f]{40})\)/gu)].length;
  assert.ok(shaCount > 5, `expected several real 40-character commit hashes in the bundle, found ${shaCount}`);
});

test('changelogVals supplies a typed ISO date range with validation, a query field, and a regex toggle', () => {
  const app = read(APP);
  const fn = app.match(/private changelogVals\(\): Record<string, unknown> \{[\s\S]*?\n  \}/);
  assert.ok(fn, 'expected to find changelogVals');
  const body = fn[0];
  assert.match(body, /must be a valid calendar date in YYYY-MM-DD form\./u, 'the ISO date validation copy no longer matches');
  assert.match(body, /changelogQuery: rawState\.changelogQuery \?\? '',/u, 'the query field is no longer wired');
  assert.match(body, /changelogRegexOn: !!rawState\.changelogRegexOn,/u, 'the regex toggle is no longer wired');
  assert.doesNotMatch(body, /calendarGrid|monthJump|yearJump/iu,
    'a full month/year-jump calendar grid now appears -- the one remaining honest gap may have been closed');
});

test('every change entry carries a real per-commit link built from an actual commit hash', () => {
  const app = read(APP);
  assert.match(app, /commitShort: change\.commit\.slice\(0, 10\),/u, 'the short-commit display no longer matches');
  assert.match(app, /commitUrl: commitUrl\(change\.commit, CHANGELOG_REPOSITORY_URL\),/u, 'the per-commit link builder is no longer called');
});

test('copy and Markdown export are real methods, not merely described', () => {
  const app = read(APP);
  assert.match(app, /private copyChangelog\(\): void \{/u, 'copyChangelog no longer exists');
  assert.match(app, /private exportChangelog\(\): void \{/u, 'exportChangelog no longer exists');
});
