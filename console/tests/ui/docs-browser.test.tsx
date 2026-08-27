import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  brokenLinks,
  listArticles,
  listCategories,
  outline,
  resolveLink,
  search,
  searchBounded,
  suggested,
} from '../../app/renderer/src/docs-browser.ts';
import type { DocsArticle, DocsBundle } from '../../app/renderer/src/generated/docs-bundle.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const consoleRoot = resolve(here, '..', '..');

function article(overrides: Partial<DocsArticle> & { id: string; category: string; title: string }): DocsArticle {
  return {
    headings: [],
    links: [],
    body: `# ${overrides.title}\n`,
    ...overrides,
  };
}

function bundle(articles: DocsArticle[]): DocsBundle {
  return { generatedAt: '1970-01-01T00:00:00.000Z', articleCount: articles.length, articles };
}

// ---------------------------------------------------------------- listCategories / listArticles

test('listCategories counts and orders alphabetically', () => {
  const b = bundle([
    article({ id: 'zeta/one', category: 'zeta', title: 'Zeta One' }),
    article({ id: 'alpha/one', category: 'alpha', title: 'Alpha One' }),
    article({ id: 'alpha/two', category: 'alpha', title: 'Alpha Two' }),
  ]);
  assert.deepEqual(listCategories(b), [
    { category: 'alpha', count: 2 },
    { category: 'zeta', count: 1 },
  ]);
});

test('listArticles orders by id and filters by category', () => {
  const b = bundle([
    article({ id: 'app/b', category: 'app', title: 'B' }),
    article({ id: 'app/a', category: 'app', title: 'A' }),
    article({ id: 'data/a', category: 'data', title: 'Data A' }),
  ]);
  assert.deepEqual(listArticles(b).map((a) => a.id), ['app/a', 'app/b', 'data/a']);
  assert.deepEqual(listArticles(b, 'app').map((a) => a.id), ['app/a', 'app/b']);
  assert.deepEqual(listArticles(b, 'missing'), []);
});

test('listCategories and listArticles handle an empty bundle', () => {
  const b = bundle([]);
  assert.deepEqual(listCategories(b), []);
  assert.deepEqual(listArticles(b), []);
});

// ---------------------------------------------------------------- search

test('plain-text search is the default and case-insensitive', () => {
  const b = bundle([article({ id: 'a', category: 'app', title: 'Appearance Settings', body: 'no match here' })]);
  const result = search(b, 'APPEARANCE');
  assert.equal(result.ok, true);
  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0].field, 'title');
});

test('search matches a body-only term', () => {
  const b = bundle([article({ id: 'a', category: 'app', title: 'Overview', body: '# Overview\n\nThe widget uses a quiet-hours schedule.' })]);
  const result = search(b, 'quiet-hours');
  assert.equal(result.ok, true);
  assert.equal(result.matches.some((m) => m.field === 'body'), true);
});

test('the excerpt contains the match', () => {
  const b = bundle([article({ id: 'a', category: 'app', title: 'Overview', body: '# Overview\n\nSomething about the narrator voice picker lives here.' })]);
  const result = search(b, 'narrator voice');
  assert.equal(result.ok, true);
  const hit = result.matches.find((m) => m.field === 'body');
  assert.ok(hit);
  assert.equal(hit.excerpt.toLowerCase().includes('narrator voice'), true);
});

test('regex search is opt-in only and uses the bounded asynchronous evaluator', async () => {
  const b = bundle([article({ id: 'a', category: 'app', title: 'foo123bar', body: 'no match here' })]);
  const plain = search(b, 'foo\\d+bar');
  assert.equal(plain.matches.length, 0);
  const regex = await searchBounded(b, 'foo\\d+bar', { regex: true });
  // Node has no browser Worker. The worker-only API must fail closed here rather
  // than evaluating a user pattern on this test process's main thread.
  assert.equal(regex.ok, false);
  assert.match(regex.error ?? '', /isolated regular-expression search is unavailable/iu);
});

test('an invalid regex is reported by the bounded evaluator, not thrown', async () => {
  const b = bundle([article({ id: 'a', category: 'app', title: 'Anything' })]);
  const result = await searchBounded(b, '(unclosed', { regex: true });
  assert.equal(result.ok, false);
  assert.ok(result.error);
  assert.deepEqual(result.matches, []);
});

test('bounded search never throws on a hostile pattern', async () => {
  const b = bundle([article({ id: 'a', category: 'app', title: 'a'.repeat(50), body: 'a'.repeat(5000) })]);
  await assert.doesNotReject(() => searchBounded(b, '(a+)+$', { regex: true }));
});

test('App routes regex documentation searches through the bounded API and drops stale worker replies', () => {
  const app = readFileSync(join(consoleRoot, 'app', 'renderer', 'src', 'App.tsx'), 'utf8');
  assert.match(app, /docsSearchBounded\(DOCS_BUNDLE, query, \{ regex: true, flags, signal: abort\.signal \}\)/u);
  assert.match(app, /generation !== this\.docsSearchGeneration \|\| abort\.signal\.aborted/u);
  assert.match(app, /setDocsQuery: this\.updateDocsQuery/u);
  assert.match(app, /toggleDocsRegex: this\.toggleDocsRegex/u);
});

test('empty query returns no matches without error', () => {
  const b = bundle([article({ id: 'a', category: 'app', title: 'Anything' })]);
  const result = search(b, '');
  assert.equal(result.ok, true);
  assert.deepEqual(result.matches, []);
});

// ---------------------------------------------------------------- resolveLink / brokenLinks

test('resolveLink resolves a relative link within one category', () => {
  const b = bundle([
    article({ id: 'app/about', category: 'app', title: 'About', links: ['appearance.md'] }),
    article({ id: 'app/appearance', category: 'app', title: 'Appearance' }),
  ]);
  assert.equal(resolveLink(b, 'app/about', 'appearance.md'), 'app/appearance');
});

test('resolveLink resolves a relative link crossing categories', () => {
  const b = bundle([
    article({ id: 'app/servers', category: 'app', title: 'Servers', links: ['../data/ami.md'] }),
    article({ id: 'data/ami', category: 'data', title: 'AMI' }),
  ]);
  assert.equal(resolveLink(b, 'app/servers', '../data/ami.md'), 'data/ami');
});

test('resolveLink strips a fragment before resolving', () => {
  const b = bundle([
    article({ id: 'app/about', category: 'app', title: 'About' }),
    article({ id: 'app/other', category: 'app', title: 'Other' }),
  ]);
  assert.equal(resolveLink(b, 'app/other', 'about.md#some-section'), 'app/about');
});

test('resolveLink returns undefined for a non-.md link and for a missing target', () => {
  const b = bundle([article({ id: 'app/about', category: 'app', title: 'About', links: ['https://example.com', 'ghost.md'] })]);
  assert.equal(resolveLink(b, 'app/about', 'https://example.com'), undefined);
  assert.equal(resolveLink(b, 'app/about', 'ghost.md'), undefined);
});

test('brokenLinks reports a link that resolves to nothing', () => {
  const b = bundle([article({ id: 'app/about', category: 'app', title: 'About', links: ['ghost.md'] })]);
  const broken = brokenLinks(b);
  assert.equal(broken.length, 1);
  assert.deepEqual(broken[0], { fromArticleId: 'app/about', href: 'ghost.md' });
});

test('brokenLinks is empty when every link resolves', () => {
  const b = bundle([
    article({ id: 'app/about', category: 'app', title: 'About', links: ['appearance.md'] }),
    article({ id: 'app/appearance', category: 'app', title: 'Appearance' }),
  ]);
  assert.deepEqual(brokenLinks(b), []);
});

// ---------------------------------------------------------------- outline

test('outline returns headings in order', () => {
  const a = article({
    id: 'a',
    category: 'app',
    title: 'A',
    headings: [{ title: 'First', id: 'first' }, { title: 'Second', id: 'second' }],
  });
  assert.deepEqual(outline(a), [{ title: 'First', id: 'first' }, { title: 'Second', id: 'second' }]);
});

test('outline handles an article with no headings', () => {
  const a = article({ id: 'a', category: 'app', title: 'A' });
  assert.deepEqual(outline(a), []);
});

// ---------------------------------------------------------------- suggested

test('suggested returns both outgoing and incoming links', () => {
  const b = bundle([
    article({ id: 'app/about', category: 'app', title: 'About', links: ['appearance.md'] }),
    article({ id: 'app/appearance', category: 'app', title: 'Appearance' }),
    article({ id: 'app/history', category: 'app', title: 'History', links: ['about.md'] }),
  ]);
  const result = suggested(b, 'app/about');
  assert.equal(result.some((r) => r.id === 'app/appearance' && r.relation === 'outgoing'), true);
  assert.equal(result.some((r) => r.id === 'app/history' && r.relation === 'incoming'), true);
  assert.equal(result.some((r) => r.id === 'app/about'), false);
});

test('suggested returns nothing for an unknown article id', () => {
  const b = bundle([article({ id: 'app/about', category: 'app', title: 'About' })]);
  assert.deepEqual(suggested(b, 'nope'), []);
});

// ---------------------------------------------------------------- edge cases

test('a single-article bundle does not throw across the module', () => {
  const b = bundle([article({ id: 'solo', category: 'solo', title: 'Solo' })]);
  assert.doesNotThrow(() => {
    listCategories(b);
    listArticles(b);
    search(b, 'solo');
    brokenLinks(b);
    suggested(b, 'solo');
  });
});

// ---------------------------------------------------------------- real generator, real tree

test('the real generator bundles exactly as many articles as .md files exist on disk', () => {
  const generatorPath = join(consoleRoot, 'scripts', 'bundle-docs.mjs');

  /* Into a scratch file, never over the shipped bundle. Regenerating in place made this test
   * unable to fail -- it overwrote the file and then read its own output back -- and left the
   * working tree dirty for whoever ran the suite next. Whether the *committed* bundle matches the
   * tree is a separate question, and tests/ui/docs-drift.test.mjs is what asks it. */
  const scratchDir = mkdtempSync(join(tmpdir(), 'ding-docs-count-'));
  const scratchFile = join(scratchDir, 'docs-bundle.ts');
  try {
    execFileSync(process.execPath, [generatorPath], {
      cwd: consoleRoot,
      stdio: 'pipe',
      env: { ...process.env, DING_DOCS_OUT_FILE: scratchFile },
    });

    const contents = readFileSync(scratchFile, 'utf8');
    const match = contents.match(/"articleCount":\s*(\d+)/);
    assert.ok(match, 'generated bundle must record its articleCount');
    const bundledCount = Number(match[1]);

    const realCount = countMarkdown(join(consoleRoot, 'docs'));

    assert.equal(bundledCount, realCount);
    assert.ok(realCount > 0);
  } finally {
    rmSync(scratchDir, { recursive: true, force: true });
  }

  function countMarkdown(dir: string): number {
    let count = 0;
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const stats = statSync(full);
      if (stats.isDirectory()) count += countMarkdown(full);
      else if (entry.endsWith('.md')) count += 1;
    }
    return count;
  }
});
