/**
 * Contract: offline-documentation-browser. Real and reachable: `docs-browser.ts`
 * (article lookup/search), `docs-markdown.ts` (Markdown body parsing into real
 * render blocks), and `generated/docs-bundle.ts` (a real bundled catalogue,
 * built by `scripts/bundle-docs.mjs` from every `docs/**\/*.md` article) are all
 * imported by App.tsx, and the `docs` screen genuinely exists (rail 'app',
 * `kind:'docs'`) with real values supplied by `docsVals()`.
 *
 * One figure worth pinning dynamically rather than copying: the registry note
 * cites "83 articles", which is already stale by the time this file was
 * written -- the bundle's own `articleCount` field is read here instead of a
 * hardcoded number, so this test does not go stale the next time an article is
 * added.
 *
 * The remaining honest gap, per the note: no promoted screenshot/interaction
 * evidence has been filed under this project's design-parity capture
 * pipeline, so this stays "partial" rather than "verified" -- which is exactly
 * the split this repository's evidence columns exist to track (this file is
 * the localCheck column; builtInteraction and capture are separate columns).
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
const BUNDLE = 'app/renderer/src/generated/docs-bundle.ts';

test('the registry row is internally honest: a defined state with a note explaining what is and is not wired', () => {
  const registry = json('app/feature-registry.json');
  const row = registry.features['offline-documentation-browser'];
  assert.ok(row, 'the implementation registry has no row for offline-documentation-browser');
  assert.ok(['implemented', 'partial', 'absent'].includes(row.status), `undefined state "${row.status}"`);
  assert.ok(typeof row.note === 'string' && row.note.length > 40, 'no note explaining what is and is not wired');
});

test('docs-browser.ts, docs-markdown.ts, and the bundle are all imported by App.tsx', () => {
  const app = read(APP);
  assert.match(app, /import \{ listArticles, resolveLink, search as docsSearch, searchBounded as docsSearchBounded, suggested as docsSuggestedFor \} from '\.\/docs-browser';/,
    'docs-browser.ts is no longer imported the expected way');
  assert.match(app, /import \{ DOCS_BUNDLE \} from '\.\/generated\/docs-bundle';/, 'the docs bundle is no longer imported');
  assert.match(app, /import \{ parseMarkdown, plainTextExcerpt, type DocsBlock \} from '\.\/docs-markdown';/,
    'docs-markdown.ts is no longer imported the expected way');
});

test('the bundle carries real content -- the count is read dynamically, never hardcoded', () => {
  const bundle = read(BUNDLE);
  const countMatch = bundle.match(/"articleCount":\s*(\d+),/);
  assert.ok(countMatch, 'expected to find a numeric "articleCount" field in the generated bundle');
  const declaredCount = Number(countMatch[1]);
  assert.ok(declaredCount > 10, `expected a substantial bundled article count, found ${declaredCount}`);
  // Exactly 6 spaces of indent is an article's own "id"; a heading's nested "id"
  // (DocsHeading also has one) sits deeper and must not be counted here.
  const actualIds = [...bundle.matchAll(/^ {6}"id":\s*"/gmu)].length;
  assert.equal(actualIds, declaredCount, 'the declared articleCount disagrees with the number of article records in the bundle');
});

test('the docs screen is a real destination (rail "app", kind "docs"), not a placeholder', () => {
  const generated = read(GENERATED);
  assert.match(generated, /docs:\{ rail:'app', icon:'menu_book', label:'Documentation', badge:'', title:'Documentation', file:'docs\/', kind:'docs',/u,
    'the docs screen destination no longer matches');
  assert.match(generated, /isDocs:sc\.kind === 'docs',/u, 'the isDocs template flag no longer matches');
});

test("App.tsx's docsVals() genuinely supplies the docs screen's real values", () => {
  const app = read(APP);
  assert.match(app, /\.\.\.\(screen === 'docs' \? this\.docsVals\(\) : \{\}\),/u, 'docsVals() is no longer wired into the docs screen');
  assert.match(app, /private docsVals\(\): Record<string, unknown> \{/u, 'the docsVals() method no longer exists');
});
