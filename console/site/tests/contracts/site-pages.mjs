/**
 * The one page list every site contract reads, derived from the filesystem rather than
 * hand-copied.
 *
 * Seventeen contract files each carried their own literal
 * `['index', 'product', 'documentation', 'downloads', 'status', 'settings']` and then
 * asserted things like "no support-ticket surface exists anywhere in the published
 * markup". The site has nine pages. `converter.html`, `ollama.html` and `history.html`
 * were in none of those lists, so every "anywhere in the site" absence claim was measured
 * over two thirds of the site and could not have seen a surface living on the other third.
 *
 * That is not hypothetical: `local-file-converter.test.mjs` asserted "there is no
 * file-picker-driven converter surface, adapter registry, or category catalogue anywhere"
 * and passed, while `site/converter.html` shipped a file picker, an adapter catalogue and
 * a bounded conversion queue. The list it searched excluded the page.
 *
 * Deriving the list is the fix, but a derived list has its own failure mode -- it can come
 * back empty, and a loop over an empty list runs zero assertions and reports green. So the
 * derivation asserts a plausible floor and asserts that the six historically-listed pages
 * are still among what it found; a rename that silently dropped one would otherwise read
 * as a passing run.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

export const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Pages that existed when every contract still hand-copied its own list. */
const HISTORICALLY_LISTED = ['index', 'product', 'documentation', 'downloads', 'status', 'settings'];

/**
 * Every top-level page of the published site, by base name, sorted. `site/dist` is a build
 * output rather than source and is not read: `readdirSync` here is deliberately not
 * recursive, so a built copy cannot double-count a page or make an absence claim pass by
 * searching a stale artifact.
 */
export const PAGE_NAMES = readdirSync(resolve(siteRoot))
  .filter((name) => name.endsWith('.html'))
  .map((name) => name.slice(0, -'.html'.length))
  .sort();

assert.ok(
  PAGE_NAMES.length >= HISTORICALLY_LISTED.length,
  `site page discovery found only ${PAGE_NAMES.length} pages; an empty or short list would make every "anywhere in the site" assertion vacuous`,
);
for (const name of HISTORICALLY_LISTED) {
  assert.ok(PAGE_NAMES.includes(name), `site page discovery no longer finds ${name}.html`);
}

export const readSiteFile = (relativePath) => readFileSync(resolve(siteRoot, relativePath), 'utf8').replaceAll('\r\n', '\n');

/** Every page's markup keyed by base name, for contracts that name one page directly. */
export const pageSourceByName = Object.fromEntries(PAGE_NAMES.map((name) => [name, readSiteFile(`${name}.html`)]));

/** Every page's markup concatenated, for "anywhere in the site" claims. */
export const everyPageMarkup = PAGE_NAMES.map((name) => pageSourceByName[name]).join('\n');
