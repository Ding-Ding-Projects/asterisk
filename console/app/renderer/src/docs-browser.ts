/**
 * Pure functions over a generated documentation bundle (see
 * `scripts/bundle-docs.mjs` / `src/generated/docs-bundle.ts`).
 *
 * No rendering, no I/O — every function here takes a bundle and returns data.
 */

import type { DocsArticle, DocsBundle, DocsHeading } from './generated/docs-bundle.js';

export interface CategorySummary {
  readonly category: string;
  readonly count: number;
}

export function listCategories(bundle: DocsBundle): CategorySummary[] {
  const counts = new Map<string, number>();
  for (const article of bundle.articles) {
    counts.set(article.category, (counts.get(article.category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([category, count]) => ({ category, count }));
}

export function listArticles(bundle: DocsBundle, category?: string): DocsArticle[] {
  const filtered = category === undefined ? bundle.articles : bundle.articles.filter((a) => a.category === category);
  return [...filtered].sort((a, b) => a.id.localeCompare(b.id));
}

// ---------------------------------------------------------------- search

export interface SearchOptions {
  readonly regex?: boolean;
  readonly flags?: string;
}

export interface SearchMatch {
  readonly articleId: string;
  readonly category: string;
  readonly title: string;
  readonly field: 'title' | 'heading' | 'body';
  readonly excerpt: string;
  readonly matchStart: number;
  readonly matchEnd: number;
}

export interface SearchResult {
  readonly ok: boolean;
  readonly error?: string;
  readonly matches: readonly SearchMatch[];
}

const EXCERPT_RADIUS = 40;
const MAX_MATCHES_PER_FIELD = 3;
/** Bound the work a hostile pattern can do against one field. */
const MAX_FIELD_LENGTH = 200_000;

function buildMatcher(query: string, options: SearchOptions | undefined): { ok: true; test: (text: string) => RegExpMatchArray[] } | { ok: false; error: string } {
  if (options?.regex) {
    let re: RegExp;
    try {
      const flags = options.flags ?? 'gi';
      re = new RegExp(query, flags.includes('g') ? flags : `${flags}g`);
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Invalid regular expression.' };
    }
    return {
      ok: true,
      test: (text: string) => {
        const bounded = text.slice(0, MAX_FIELD_LENGTH);
        const results: RegExpMatchArray[] = [];
        re.lastIndex = 0;
        let match: RegExpMatchArray | null;
        let guard = 0;
        while ((match = re.exec(bounded)) !== null && guard < 500) {
          results.push(match);
          guard += 1;
          if (match[0].length === 0) re.lastIndex += 1;
        }
        return results;
      },
    };
  }

  const needle = query.toLowerCase();
  if (needle.length === 0) return { ok: true, test: () => [] };
  return {
    ok: true,
    test: (text: string) => {
      const bounded = text.slice(0, MAX_FIELD_LENGTH);
      const hay = bounded.toLowerCase();
      const results: RegExpMatchArray[] = [];
      let from = 0;
      let guard = 0;
      while (guard < 500) {
        const idx = hay.indexOf(needle, from);
        if (idx === -1) break;
        const fake = [bounded.slice(idx, idx + needle.length)] as unknown as RegExpMatchArray;
        (fake as unknown as { index: number }).index = idx;
        results.push(fake);
        from = idx + Math.max(needle.length, 1);
        guard += 1;
      }
      return results;
    },
  };
}

function excerptFor(text: string, index: number, length: number): { excerpt: string; matchStart: number; matchEnd: number } {
  const start = Math.max(0, index - EXCERPT_RADIUS);
  const end = Math.min(text.length, index + length + EXCERPT_RADIUS);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  return {
    excerpt: `${prefix}${text.slice(start, end)}${suffix}`,
    matchStart: index - start + prefix.length,
    matchEnd: index - start + prefix.length + length,
  };
}

export function search(bundle: DocsBundle, query: string, options?: SearchOptions): SearchResult {
  if (query.length === 0) return { ok: true, matches: [] };

  const matcher = buildMatcher(query, options);
  if (!matcher.ok) return { ok: false, error: matcher.error, matches: [] };

  const matches: SearchMatch[] = [];

  for (const article of listArticles(bundle)) {
    const titleHits = matcher.test(article.title).slice(0, MAX_MATCHES_PER_FIELD);
    for (const hit of titleHits) {
      const idx = hit.index ?? 0;
      const { excerpt, matchStart, matchEnd } = excerptFor(article.title, idx, hit[0].length);
      matches.push({ articleId: article.id, category: article.category, title: article.title, field: 'title', excerpt, matchStart, matchEnd });
    }

    for (const heading of article.headings) {
      const headingHits = matcher.test(heading.title).slice(0, MAX_MATCHES_PER_FIELD);
      for (const hit of headingHits) {
        const idx = hit.index ?? 0;
        const { excerpt, matchStart, matchEnd } = excerptFor(heading.title, idx, hit[0].length);
        matches.push({ articleId: article.id, category: article.category, title: article.title, field: 'heading', excerpt, matchStart, matchEnd });
      }
    }

    const bodyHits = matcher.test(article.body).slice(0, MAX_MATCHES_PER_FIELD);
    for (const hit of bodyHits) {
      const idx = hit.index ?? 0;
      const { excerpt, matchStart, matchEnd } = excerptFor(article.body, idx, hit[0].length);
      matches.push({ articleId: article.id, category: article.category, title: article.title, field: 'body', excerpt, matchStart, matchEnd });
    }
  }

  return { ok: true, matches };
}

// ---------------------------------------------------------------- links

function articleById(bundle: DocsBundle, id: string): DocsArticle | undefined {
  return bundle.articles.find((a) => a.id === id);
}

/**
 * Resolve a relative `.md` link (possibly with a `#fragment`) found inside
 * `fromArticle`'s body to the target article's id. Returns undefined when the
 * link does not resolve to a real article in the bundle.
 */
export function resolveLink(bundle: DocsBundle, fromArticle: DocsArticle | string, href: string): string | undefined {
  const from = typeof fromArticle === 'string' ? articleById(bundle, fromArticle) : fromArticle;
  if (!from) return undefined;

  const [withoutFragment, fragment] = href.split('#', 2);
  if (!withoutFragment || !withoutFragment.endsWith('.md')) return undefined;

  const fromDir = from.id.includes('/') ? from.id.slice(0, from.id.lastIndexOf('/')) : '';
  const segments = [...fromDir.split('/').filter(Boolean), ...withoutFragment.split('/')];

  const resolved: string[] = [];
  for (const segment of segments) {
    if (segment === '.' || segment === '') continue;
    if (segment === '..') {
      resolved.pop();
      continue;
    }
    resolved.push(segment);
  }

  const targetId = resolved.join('/').replace(/\.md$/, '');
  const target = articleById(bundle, targetId);
  if (!target) return undefined;
  if (!fragment) return target.id;
  let decodedFragment = fragment;
  try { decodedFragment = decodeURIComponent(fragment); } catch { return undefined; }
  const normalizedFragment = decodedFragment.toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/gu, '');
  return target.headings.some((heading) => heading.id === normalizedFragment) ? target.id : undefined;
}

export interface BrokenLink {
  readonly fromArticleId: string;
  readonly href: string;
}

export function brokenLinks(bundle: DocsBundle): BrokenLink[] {
  const broken: BrokenLink[] = [];
  for (const article of listArticles(bundle)) {
    for (const href of article.links) {
      if (resolveLink(bundle, article, href) === undefined) {
        broken.push({ fromArticleId: article.id, href });
      }
    }
  }
  return broken;
}

// ---------------------------------------------------------------- outline / suggested

export function outline(article: DocsArticle): readonly DocsHeading[] {
  return article.headings;
}

export interface SuggestedArticle {
  readonly id: string;
  readonly title: string;
  readonly category: string;
  readonly relation: 'outgoing' | 'incoming';
}

export function suggested(bundle: DocsBundle, articleId: string): SuggestedArticle[] {
  const article = articleById(bundle, articleId);
  if (!article) return [];

  const seen = new Set<string>([articleId]);
  const results: SuggestedArticle[] = [];

  for (const href of article.links) {
    const targetId = resolveLink(bundle, article, href);
    if (targetId === undefined || seen.has(targetId)) continue;
    seen.add(targetId);
    const target = articleById(bundle, targetId);
    if (target) results.push({ id: target.id, title: target.title, category: target.category, relation: 'outgoing' });
  }

  for (const other of listArticles(bundle)) {
    if (other.id === articleId || seen.has(other.id)) continue;
    const linksBack = other.links.some((href) => resolveLink(bundle, other, href) === articleId);
    if (linksBack) {
      seen.add(other.id);
      results.push({ id: other.id, title: other.title, category: other.category, relation: 'incoming' });
    }
  }

  return results;
}
