import { useEffect, useMemo, useState, type ComponentType, type CSSProperties } from 'react';
import type { CommitAvailability, SurfaceMountDescriptor } from '../../../shared/documentation.js';
import { CHANGELOG_MARKDOWN, CHANGELOG_REPOSITORY_URL } from './generated/changelog-bundle.js';
import {
  commitUrl,
  filterAndSearchBounded,
  parseChangelogDetailed,
  toMarkdown,
  toPlainText,
  type ChangelogEntry,
  type ChangelogSearchMatch,
} from './changelog.js';
import { MarkdownRenderer } from './markdown-renderer.js';

export interface ChangelogSurfaceProps {
  readonly markdown: string;
  readonly repositoryUrl: string;
  readonly commitAvailability?: Readonly<Record<string, CommitAvailability>>;
  readonly onCopy?: (text: string) => Promise<void> | void;
  readonly onExport?: (filename: string, contents: string, mediaType: string) => void;
}

const card: CSSProperties = {
  background: 'var(--md-sys-color-surface-container, #1b211c)',
  border: '1px solid var(--md-sys-color-outline-variant, #414942)',
  borderRadius: 20,
  padding: 16,
};
const input: CSSProperties = {
  minHeight: 44,
  borderRadius: 12,
  border: '1px solid var(--md-sys-color-outline, #778078)',
  background: 'var(--md-sys-color-surface, #0c110d)',
  color: 'inherit',
  padding: '8px 12px',
};
const action: CSSProperties = {
  minHeight: 44,
  minWidth: 44,
  borderRadius: 999,
  border: '1px solid var(--md-sys-color-outline, #778078)',
  background: 'var(--md-sys-color-secondary-container, #29382e)',
  color: 'inherit',
  padding: '8px 14px',
  cursor: 'pointer',
};

function validIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function originLabel(origin: string): string {
  if (origin === 'version') return 'Version';
  if (origin === 'date') return 'Release date';
  const match = /^change:(\d+):(category|summary|commit)$/.exec(origin);
  if (!match) return origin;
  return `Change ${Number(match[1]) + 1} ${match[2]}`;
}

function defaultExport(filename: string, contents: string, mediaType: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type: mediaType }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ChangelogSurface({
  markdown,
  repositoryUrl,
  commitAvailability = {},
  onCopy,
  onExport,
}: ChangelogSurfaceProps) {
  const parsed = useMemo(() => parseChangelogDetailed(markdown), [markdown]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'plain' | 'regex'>('plain');
  const [flags, setFlags] = useState('i');
  const [builderOpen, setBuilderOpen] = useState(false);
  const [entries, setEntries] = useState<readonly ChangelogEntry[]>(parsed.entries);
  const [matches, setMatches] = useState<readonly ChangelogSearchMatch[]>([]);
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const [operationStatus, setOperationStatus] = useState('');

  useEffect(() => {
    setEntries(parsed.entries);
    setMatches([]);
    setSearchError('');
    setTruncated(false);
  }, [parsed.entries]);

  const fromError = from !== '' && !validIsoDate(from) ? 'From date must be a real date in YYYY-MM-DD form.' : '';
  const toError = to !== '' && !validIsoDate(to) ? 'To date must be a real date in YYYY-MM-DD form.' : '';
  const rangeError = !fromError && !toError && from && to && from > to ? 'From date must not be later than the to date.' : '';

  useEffect(() => {
    const controller = new AbortController();
    if (fromError || toError || rangeError) {
      setEntries([]);
      setMatches([]);
      setSearching(false);
      return () => controller.abort();
    }
    setSearching(true);
    void filterAndSearchBounded(parsed.entries, {
      from: from || undefined,
      to: to || undefined,
      query,
      regex: mode === 'regex',
      flags,
      deadlineMs: 300,
      signal: controller.signal,
    }).then((result) => {
      if (controller.signal.aborted) return;
      setSearching(false);
      if (result.error) {
        setEntries([]);
        setMatches([]);
        setTruncated(false);
        setSearchError(result.error);
        return;
      }
      setEntries(result.entries);
      setMatches(result.matches);
      setTruncated(result.truncated ?? false);
      setSearchError('');
    });
    return () => controller.abort();
  }, [flags, from, fromError, mode, parsed.entries, query, rangeError, to, toError]);

  const applyRecentDays = (days: number) => {
    const end = new Date();
    const start = new Date(end.getTime() - days * 86_400_000);
    setFrom(start.toISOString().slice(0, 10));
    setTo(end.toISOString().slice(0, 10));
  };
  const copy = async () => {
    const text = toPlainText(entries);
    try {
      if (onCopy) await onCopy(text);
      else await navigator.clipboard.writeText(text);
      setOperationStatus('The filtered changelog was copied.');
    } catch {
      setOperationStatus('The clipboard was unavailable. Nothing was copied.');
    }
  };
  const exportMarkdown = () => {
    const contents = toMarkdown(entries);
    (onExport ?? defaultExport)('changelog-export.md', contents, 'text/markdown;charset=utf-8');
    setOperationStatus(`Exported ${entries.length} version${entries.length === 1 ? '' : 's'} to changelog-export.md.`);
  };

  return (
    <section aria-label="Changelog viewer" style={{ display: 'grid', gap: 16 }}>
      <header>
        <h1>Changelog</h1>
        <p>Released versions from the bundled repository history. Filters and exports apply to exactly the entries shown.</p>
      </header>

      {markdown.trim().length === 0 && <p role="alert" style={card}>No changelog content was bundled.</p>}
      {parsed.skipped > 0 && <p role="alert" style={card}>{parsed.skipped} non-blank changelog line{parsed.skipped === 1 ? ' was' : 's were'} malformed and could not be represented as a release entry.</p>}

      <div style={{ ...card, display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <label>From date<input type="date" value={from} onChange={(event) => setFrom(event.currentTarget.value)} style={{ ...input, display: 'block' }} /></label>
          <label>To date<input type="date" value={to} onChange={(event) => setTo(event.currentTarget.value)} style={{ ...input, display: 'block' }} /></label>
          <button type="button" style={action} onClick={() => { setFrom(''); setTo(''); }}>All time</button>
          <button type="button" style={action} onClick={() => applyRecentDays(30)}>Last 30 days</button>
          <button type="button" style={action} onClick={() => {
            const year = new Date().getUTCFullYear();
            setFrom(`${year}-01-01`);
            setTo(`${year}-12-31`);
          }}>This year</button>
        </div>
        {(fromError || toError || rangeError) && <p role="alert">{fromError || toError || rangeError}</p>}

        <label htmlFor="changelog-search">Search versions, dates, categories, summaries, and commit ids</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input id="changelog-search" type="search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} style={{ ...input, flex: '1 1 280px' }} />
          <button type="button" style={action} aria-expanded={builderOpen} aria-controls="changelog-regex-builder" onClick={() => setBuilderOpen((open) => !open)}>Regex builder</button>
        </div>
        {builderOpen && (
          <aside id="changelog-regex-builder" aria-label="Changelog search regex builder" style={{ ...card, display: 'grid', gap: 10 }}>
            <label>Search mode<select value={mode} onChange={(event) => setMode(event.currentTarget.value as 'plain' | 'regex')} style={{ ...input, display: 'block', width: '100%' }}><option value="plain">Plain text</option><option value="regex">Regular expression</option></select></label>
            <label>Flags<input value={flags} disabled={mode === 'plain'} onChange={(event) => setFlags(event.currentTarget.value)} style={{ ...input, display: 'block', width: '100%' }} /></label>
            <div aria-label="Pattern pieces" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                ['Version start', '^'], ['Version end', '$'], ['Digits', '\\d+'], ['Date', '\\d{4}-\\d{2}-\\d{2}'],
                ['Group', '()'], ['Alternation', '|'], ['One or more', '+'], ['Optional', '?'],
              ].map(([label, value]) => <button key={label} type="button" style={action} onClick={() => { setMode('regex'); setQuery((current) => `${current}${value}`); }}>{label}</button>)}
            </div>
            <p>Pattern limit: 2,048 characters. The isolated worker is terminated after 300 ms.</p>
          </aside>
        )}
        {searchError && <p role="alert">{searchError}</p>}
        {searching && <p role="status">Searching the bundled changelog...</p>}
        {truncated && <p role="status">The result limit was reached. Narrow the query to inspect remaining matches.</p>}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" style={action} onClick={() => void copy()}>Copy filtered view</button>
          <button type="button" style={action} onClick={exportMarkdown}>Export filtered Markdown</button>
        </div>
        {operationStatus && <p role="status">{operationStatus}</p>}
      </div>

      <p role="status">{entries.length} released version{entries.length === 1 ? '' : 's'}</p>
      {entries.length === 0 && !searching ? <p style={card}>No released version matches the active date and search filters.</p> : null}

      <div style={{ display: 'grid', gap: 12 }}>
        {entries.map((entry) => {
          const entryMatches = matches.filter((match) => match.version === entry.version);
          return (
            <article key={`${entry.version}:${entry.date}`} style={card}>
              <header>
                <h2>{entry.version}</h2>
                <p><time dateTime={entry.date}>{entry.date}</time></p>
                {entryMatches.length > 0 && <p>Matched in {entryMatches.map((match) => originLabel(match.origin)).join(', ')}.</p>}
              </header>
              {entry.changes.length === 0 ? <p>No changes were recorded for this version.</p> : (
                <ul style={{ display: 'grid', gap: 12 }}>
                  {entry.changes.map((change, index) => {
                    const availability = commitAvailability[change.commit] ?? 'unverified';
                    let href = '';
                    try {
                      href = commitUrl(change.commit, repositoryUrl);
                    } catch {
                      // The invalid id is reported as missing below and never becomes a link.
                    }
                    const missing = availability === 'missing' || href === '';
                    return (
                      <li key={`${change.commit}:${index}`}>
                        <strong>{change.category}</strong>
                        <MarkdownRenderer source={change.summary} compact ariaLabel={`${entry.version} change ${index + 1}`} emptyMessage="This change has no recorded summary." />
                        {missing ? (
                          <span role="status">Commit {change.commit || '(empty id)'} is missing from the verified repository history.</span>
                        ) : (
                          <span>
                            <a href={href} target="_blank" rel="noopener noreferrer">{change.commit.slice(0, 10)}</a>
                            {availability === 'verified' ? ' · commit verified in the supplied history' : ' · commit availability was not verified in this bundle'}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export const CHANGELOG_SURFACE_MOUNT: SurfaceMountDescriptor<ChangelogSurfaceProps, ComponentType<ChangelogSurfaceProps>> = {
  id: 'changelog-runtime',
  navigationId: 'changelog',
  label: 'Changelog',
  Component: ChangelogSurface,
  defaultProps: {
    markdown: CHANGELOG_MARKDOWN,
    repositoryUrl: CHANGELOG_REPOSITORY_URL,
  },
};
