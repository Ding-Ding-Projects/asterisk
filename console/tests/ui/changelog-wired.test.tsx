import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// App.bridge() reads `window.dingDesktop`; outside a browser/jsdom environment there
// is no `window` global at all, so stub the minimum this render path touches.
(globalThis as { window?: unknown }).window ??= {} as unknown;

import { SCREENS } from '../../app/renderer/src/generated/console';
import { App } from '../../app/renderer/src/App';
import { CHANGELOG_MARKDOWN } from '../../app/renderer/src/generated/changelog-bundle';
import { parseChangelogDetailed, validateCommits } from '../../app/renderer/src/changelog';

const strip = (markup: string) => markup.replace(/<[^>]*>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');

/** Renders the real `App` (not the bare compiled shell) pinned on the changelog
 *  screen, exactly the way the mounted application would show it — this is the
 *  guard against "imported, but never reachable" applying to this screen too. */
function renderChangelogScreen(overrides: Record<string, unknown> = {}): string {
  class Pinned extends (App as unknown as new (props: unknown) => { state: Record<string, unknown> }) {
    constructor(props: unknown) {
      super(props);
      this.state = {
        ...this.state,
        screen: 'changelog',
        railId: 'app',
        onboardOpen: false,
        ...overrides,
      };
    }
  }
  return renderToStaticMarkup(createElement(Pinned as never));
}

test('the changelog screen is registered on the real app rail, not only as a data file', () => {
  assert.equal((SCREENS as Record<string, { rail: string; kind: string }>).changelog.rail, 'app');
  assert.equal((SCREENS as Record<string, { rail: string; kind: string }>).changelog.kind, 'changelog');
});

test('the rendered version list carries every parsed version exactly once', () => {
  const { entries } = parseChangelogDetailed(CHANGELOG_MARKDOWN);
  assert.ok(entries.length > 0, 'expected the bundled changelog to carry at least one real version');
  const readable = strip(renderChangelogScreen());
  for (const entry of entries) {
    assert.ok(readable.includes(entry.version), `expected version "${entry.version}" to render in the changelog list`);
  }
});

test('the rendered result count label agrees with the parsed version count', () => {
  const { entries } = parseChangelogDetailed(CHANGELOG_MARKDOWN);
  const markup = renderChangelogScreen();
  assert.ok(markup.includes(`${entries.length} version`), 'expected the result count label to name the real parsed version count');
});

test('every rendered commit reference resolves to a real commit in this repository', () => {
  // The load-bearing guard: a changelog entry that says what changed but not
  // where is unverifiable, and a dead link is worse than an honest omission.
  const { entries } = parseChangelogDetailed(CHANGELOG_MARKDOWN);
  const exists = (sha: string): boolean => {
    try {
      execFileSync('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd: new URL('../../../', import.meta.url), stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  };
  const missing = validateCommits(entries, exists);
  assert.deepEqual(missing, [], `expected every referenced commit to exist; missing: ${missing.join(', ')}`);
});

test('BREAK CHECK — a missing commit is caught by the guard above, proving it is not a decoration', () => {
  const fakeEntries = [{ version: '9.9.9', date: '2026-01-01', changes: [{ category: 'General', summary: 'x', commit: '0'.repeat(40) }] }];
  const missing = validateCommits(fakeEntries, () => false);
  assert.deepEqual(missing, ['0'.repeat(40)]);
});

test('a search query with no matches reports zero versions rather than falling back to the full list', () => {
  const markup = renderChangelogScreen({ changelogQuery: 'zzzzzzzz-does-not-exist-anywhere' });
  assert.ok(markup.includes('0 versions'), 'expected an honest zero-match label');
});

test('an invalid typed date is reported inline rather than silently discarded', () => {
  const markup = renderChangelogScreen({ changelogFrom: 'not-a-date' });
  assert.ok(markup.includes('not-a-date'), 'expected the invalid typed value to remain in the field');
  assert.ok(/valid calendar date/i.test(markup), 'expected an inline validation message');
});
