import { useEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties } from 'react';
import type { DocumentationArticle, DocumentationBundle, SurfaceMountDescriptor } from '../../../shared/documentation.js';
import { DOCS_BUNDLE } from './generated/docs-bundle.js';
import {
  listArticles,
  outline,
  resolveLink,
  searchBounded,
  suggested,
  type SearchMatch,
} from './docs-browser.js';
import { MarkdownRenderer } from './markdown-renderer.js';

export interface DocsSurfaceProps {
  readonly bundle: DocumentationBundle;
  readonly initialArticleId?: string;
  readonly onArticleChange?: (articleId: string) => void;
}

const panel: CSSProperties = {
  background: 'var(--md-sys-color-surface-container, #1b211c)',
  border: '1px solid var(--md-sys-color-outline-variant, #414942)',
  borderRadius: 20,
  padding: 16,
  minWidth: 0,
};
const field: CSSProperties = {
  minHeight: 44,
  borderRadius: 12,
  border: '1px solid var(--md-sys-color-outline, #778078)',
  background: 'var(--md-sys-color-surface, #0c110d)',
  color: 'inherit',
  padding: '8px 12px',
};
const button: CSSProperties = {
  minHeight: 44,
  minWidth: 44,
  borderRadius: 999,
  border: '1px solid var(--md-sys-color-outline, #778078)',
  background: 'var(--md-sys-color-secondary-container, #29382e)',
  color: 'inherit',
  padding: '8px 14px',
  cursor: 'pointer',
};

function articleExcerpt(article: DocumentationArticle): string {
  const body = article.body.replace(/```[\s\S]*?```/g, ' ').replace(/[#*_`>\[\]()]/g, ' ').replace(/\s+/g, ' ').trim();
  return body.length > 140 ? `${body.slice(0, 137)}...` : body;
}

function originLabel(origin: string): string {
  if (origin === 'title') return 'Article title';
  if (origin === 'body') return 'Article body';
  if (origin.startsWith('heading:')) return `Heading #${origin.slice('heading:'.length)}`;
  return origin;
}

export function DocsSurface({ bundle, initialArticleId, onArticleChange }: DocsSurfaceProps) {
  const articles = useMemo(() => listArticles(bundle), [bundle]);
  const initial = initialArticleId ?? articles[0]?.id ?? '';
  const [selectedId, setSelectedId] = useState(initial);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'plain' | 'regex'>('plain');
  const [flags, setFlags] = useState('i');
  const [builderOpen, setBuilderOpen] = useState(false);
  const [matches, setMatches] = useState<readonly SearchMatch[]>([]);
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const articleRef = useRef<HTMLElement | null>(null);

  const selected = articles.find((article) => article.id === selectedId);
  const bundleMismatch = bundle.articleCount !== bundle.articles.length;

  useEffect(() => {
    const requested = initialArticleId ?? articles[0]?.id ?? '';
    setSelectedId((current) => {
      if (initialArticleId === undefined && articles.some((article) => article.id === current)) return current;
      return requested;
    });
  }, [articles, initialArticleId]);

  useEffect(() => {
    const controller = new AbortController();
    if (query.trim().length === 0) {
      setMatches([]);
      setSearchError('');
      setSearching(false);
      setTruncated(false);
      return () => controller.abort();
    }
    setSearching(true);
    void searchBounded(bundle, query, {
      regex: mode === 'regex',
      flags,
      deadlineMs: 300,
      signal: controller.signal,
    }).then((result) => {
      if (controller.signal.aborted) return;
      setSearching(false);
      if (!result.ok) {
        setMatches([]);
        setTruncated(false);
        setSearchError(result.error ?? 'Search could not be completed.');
        return;
      }
      setMatches(result.matches);
      setTruncated(result.truncated ?? false);
      setSearchError('');
    });
    return () => controller.abort();
  }, [bundle, flags, mode, query]);

  const results = useMemo(() => {
    if (query.trim().length === 0) {
      return articles.map((article) => ({ article, match: undefined as SearchMatch | undefined, matchCount: 0 }));
    }
    const grouped = new Map<string, SearchMatch[]>();
    for (const match of matches) {
      const bucket = grouped.get(match.articleId) ?? [];
      bucket.push(match);
      grouped.set(match.articleId, bucket);
    }
    return [...grouped.entries()].flatMap(([articleId, articleMatches]) => {
      const article = articles.find((candidate) => candidate.id === articleId);
      return article ? [{ article, match: articleMatches[0], matchCount: articleMatches.length }] : [];
    });
  }, [articles, matches, query]);

  const selectArticle = (articleId: string) => {
    setSelectedId(articleId);
    onArticleChange?.(articleId);
  };
  const navigateInternal = (articleId: string | undefined, fragment: string | undefined) => {
    if (articleId) selectArticle(articleId);
    requestAnimationFrame(() => {
      if (!fragment) return;
      const target = articleRef.current?.querySelector<HTMLElement>(`#${CSS.escape(fragment)}`);
      target?.scrollIntoView({ block: 'start' });
      target?.focus({ preventScroll: true });
    });
  };

  const internalResolver = selected
    ? (href: string) => {
        const targetId = resolveLink(bundle, selected, href);
        if (!targetId) return undefined;
        const fragment = href.includes('#') ? href.slice(href.indexOf('#') + 1) : undefined;
        return { articleId: targetId, fragment };
      }
    : undefined;

  const suggestedArticles = selected ? suggested(bundle, selected.id) : [];

  return (
    <section aria-label="Offline documentation browser" style={{ display: 'grid', gap: 16 }}>
      <header>
        <h1>Offline documentation</h1>
        <p>Every article below is bundled with this installation. Reading and search make no network request.</p>
      </header>

      {bundleMismatch && (
        <p role="alert" style={panel}>
          The bundle declares {bundle.articleCount} articles but contains {bundle.articles.length}. The missing source cannot be shown here.
        </p>
      )}

      <div style={{ ...panel, display: 'grid', gap: 10 }}>
        <label htmlFor="offline-docs-search">Search article titles, headings, and bodies</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            id="offline-docs-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            style={{ ...field, flex: '1 1 260px' }}
          />
          <button type="button" style={button} aria-expanded={builderOpen} aria-controls="offline-docs-regex-builder" onClick={() => setBuilderOpen((open) => !open)}>
            Regex builder
          </button>
        </div>
        {builderOpen && (
          <aside id="offline-docs-regex-builder" aria-label="Documentation search regex builder" style={{ ...panel, display: 'grid', gap: 10 }}>
            <label>
              Search mode
              <select value={mode} onChange={(event) => setMode(event.currentTarget.value as 'plain' | 'regex')} style={{ ...field, display: 'block', width: '100%' }}>
                <option value="plain">Plain text</option>
                <option value="regex">Regular expression</option>
              </select>
            </label>
            <label>
              Flags
              <input value={flags} disabled={mode === 'plain'} onChange={(event) => setFlags(event.currentTarget.value)} style={{ ...field, display: 'block', width: '100%' }} />
            </label>
            <div aria-label="Pattern pieces" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                ['Start', '^'], ['End', '$'], ['Any character', '.'], ['One or more', '+'],
                ['Optional', '?'], ['Group', '()'], ['Alternation', '|'], ['Digits', '\\d+'],
              ].map(([label, value]) => (
                <button key={label} type="button" style={button} onClick={() => { setMode('regex'); setQuery((current) => `${current}${value}`); }}>{label}</button>
              ))}
            </div>
            <p>Pattern limit: 2,048 characters. Corpus limit: 2,000,000 characters. The worker is terminated after 300 ms.</p>
          </aside>
        )}
        {searchError && <p role="alert">{searchError}</p>}
        {searching && <p role="status">Searching the bundled corpus...</p>}
        {truncated && <p role="status">The result limit was reached. Narrow the query to inspect the remaining matches.</p>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 0.8fr) minmax(0, 2fr)', gap: 16, alignItems: 'start' }}>
        <nav aria-label="Documentation articles" style={{ ...panel, maxHeight: '70vh', overflow: 'auto' }}>
          <p role="status">{results.length} article{results.length === 1 ? '' : 's'}</p>
          {results.length === 0 && !searching ? <p>No bundled article matches this search.</p> : null}
          <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 8 }}>
            {results.map(({ article, match, matchCount }) => (
              <li key={article.id}>
                <button
                  type="button"
                  onClick={() => selectArticle(article.id)}
                  aria-current={article.id === selectedId ? 'page' : undefined}
                  style={{ ...button, borderRadius: 14, width: '100%', textAlign: 'left', background: article.id === selectedId ? 'var(--md-sys-color-primary-container, #005230)' : undefined }}
                >
                  <strong>{article.title}</strong><br />
                  <small>{article.category}</small><br />
                  <span>{match?.excerpt ?? articleExcerpt(article)}</span>
                  {match && <><br /><small>{originLabel(match.origin)} · {matchCount} hit{matchCount === 1 ? '' : 's'}</small></>}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <article ref={articleRef} style={panel} tabIndex={-1}>
          {!selected ? (
            <div role="alert">
              <h2>Article unavailable</h2>
              <p>{selectedId ? `The bundle does not contain article "${selectedId}".` : 'No documentation article is bundled.'}</p>
            </div>
          ) : (
            <>
              <p>{selected.category} · {selected.id}</p>
              {outline(selected).length > 0 && (
                <nav aria-label="Article outline">
                  <h2>On this page</h2>
                  <ul>
                    {outline(selected).map((heading) => (
                      <li key={heading.id}>
                        <a href={`#${heading.id}`} onClick={(event) => { event.preventDefault(); navigateInternal(undefined, heading.id); }}>{heading.title}</a>
                      </li>
                    ))}
                  </ul>
                </nav>
              )}
              <MarkdownRenderer
                source={selected.body}
                ariaLabel={`${selected.title} article`}
                resolveInternal={internalResolver}
                onInternalNavigate={navigateInternal}
                emptyMessage="This bundled article has no body content."
              />
              <section aria-label="Suggested articles">
                <h2>Suggested articles</h2>
                {suggestedArticles.length === 0 ? <p>No related bundled articles were declared.</p> : (
                  <ul>
                    {suggestedArticles.map((suggestion) => (
                      <li key={suggestion.id}>
                        <button type="button" style={button} onClick={() => selectArticle(suggestion.id)}>{suggestion.title}</button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </article>
      </div>
    </section>
  );
}

export const DOCUMENTATION_SURFACE_MOUNT: SurfaceMountDescriptor<DocsSurfaceProps, ComponentType<DocsSurfaceProps>> = {
  id: 'offline-documentation-runtime',
  navigationId: 'docs',
  label: 'Offline documentation',
  Component: DocsSurface,
  defaultProps: { bundle: DOCS_BUNDLE },
};
