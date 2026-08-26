/**
 * Contract: provider-markup-rendering. Real for one source, absent for the
 * canonical target. `docs-markdown.ts`'s `parseMarkdown()` is imported by
 * App.tsx and genuinely called to turn each bundled documentation article's
 * body into real render blocks (headings/paragraphs/code/list items/inline
 * links) shown as real UI on the `docs` screen -- confirmed by grep: it is the
 * only Markdown parser anywhere in the renderer, and its only caller builds
 * `docsBlocks` for the bundled-docs body.
 *
 * The canonical contract this feature names is about REMOTE/provider-authored
 * text -- release notes, issue bodies, commit messages -- rendered rather than
 * printed as raw source. That does not exist here: this console has no
 * changelog-entry-body renderer, no release-note viewer, and no remote-text
 * surface of any kind (see changelog-viewer.md for the changelog's own scope).
 * The one Markdown renderer that exists covers this repository's own bundled,
 * locally-shipped documentation, never anything fetched from a provider.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const json = (p) => JSON.parse(read(p));

const APP = 'app/renderer/src/App.tsx';
const MODULE = 'app/renderer/src/docs-markdown.ts';

test('the registry row is internally honest: a defined state with a note explaining what is and is not wired', () => {
  const registry = json('app/feature-registry.json');
  const row = registry.features['provider-markup-rendering'];
  assert.ok(row, 'the implementation registry has no row for provider-markup-rendering');
  assert.ok(['implemented', 'partial', 'absent'].includes(row.state), `undefined state "${row.state}"`);
  assert.ok(typeof row.note === 'string' && row.note.length > 40, 'no note explaining what is and is not wired');
});

test('parseMarkdown() IS imported and genuinely called to build the docs screen\'s render blocks', () => {
  const app = read(APP);
  assert.match(app, /import \{ parseMarkdown, plainTextExcerpt, type DocsBlock \} from '\.\/docs-markdown';/,
    'docs-markdown.ts is no longer imported the expected way');
  assert.match(app, /docsBlocks: article \? parseMarkdown\(article\.body\)\.map\(blockToVals\)/u,
    'parseMarkdown(...) is no longer called to build docsBlocks');
});

test('docs-markdown.ts is the only Markdown parser anywhere in the renderer', () => {
  const rendererSrcDir = resolve(root, 'app/renderer/src');
  const rendererFiles = readdirSync(rendererSrcDir).filter((f) => (f.endsWith('.ts') || f.endsWith('.tsx')) && f !== 'docs-markdown.ts');
  const rendererSource = rendererFiles.map((f) => read(`app/renderer/src/${f}`)).join('\n');
  assert.doesNotMatch(rendererSource, /\bmarked\(|\bremark\(|markdown-it/u,
    'a second Markdown parser now exists outside docs-markdown.ts -- re-check whether it covers provider-authored text');
});

test('there is no changelog-entry body renderer or other remote/provider-text surface', () => {
  const app = read(APP);
  assert.doesNotMatch(app, /releaseNoteBody|issueBody|providerMarkdown|remoteMarkdown/iu,
    'a release-note, issue-body, or other remote-text rendering surface now exists -- update this row');
});

test('parseMarkdown() genuinely produces structured blocks, not just a pass-through of the raw string', () => {
  const src = read(MODULE);
  const fn = src.match(/export function parseMarkdown\(body: string\): DocsBlock\[\] \{[\s\S]*?\n\}/);
  assert.ok(fn, 'expected to find the parseMarkdown function body');
  assert.match(fn[0], /heading|paragraph|code|list/iu, 'parseMarkdown no longer appears to build distinct block kinds');
});
