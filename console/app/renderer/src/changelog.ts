import { runBoundedSearch, type BoundedSearchErrorCode, type BoundedSearchMatch } from './bounded-regex.js';

export interface ChangelogChange {
  category: string;
  summary: string;
  commit: string;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: ReadonlyArray<ChangelogChange>;
}

export interface ParseResult {
  entries: ReadonlyArray<ChangelogEntry>;
  skipped: number;
}

const DEFAULT_CATEGORY = 'General';
const HEX40 = /^[0-9a-fA-F]{40}$/;

const VERSION_HEADING = /^##\s+(\S+)\s+[—-]\s+(\d{4}-\d{2}-\d{2})\s*$/;
const CATEGORY_HEADING = /^###\s+(.+?)\s*$/;
const CHANGE_ITEM = /^-\s+(.+?)\s+\(([0-9a-fA-F]{40})\)\s*$/;

function isIsoDate(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/**
 * Parse a conventional Markdown changelog into entries.
 * `## <version> — <ISO date>` starts an entry; `### <Category>` starts a
 * category within it; `- <summary> (<commit>)` is a change line.
 * Lines that look like they belong to the format but do not fully match are
 * counted as skipped rather than silently dropped or thrown.
 */
export function parseChangelogDetailed(markdown: string): ParseResult {
  const lines = markdown.split(/\r\n|\n|\r/);

  const entries: ChangelogEntry[] = [];
  let skipped = 0;

  let currentEntry: { version: string; date: string; changes: ChangelogChange[] } | null = null;
  let currentCategory = DEFAULT_CATEGORY;

  const flushEntry = () => {
    if (currentEntry) {
      entries.push({ version: currentEntry.version, date: currentEntry.date, changes: currentEntry.changes });
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (line.trim() === '') continue;

    const versionMatch = VERSION_HEADING.exec(line);
    if (versionMatch) {
      if (!isIsoDate(versionMatch[2])) {
        skipped += 1;
        continue;
      }
      flushEntry();
      currentEntry = { version: versionMatch[1], date: versionMatch[2], changes: [] };
      currentCategory = DEFAULT_CATEGORY;
      continue;
    }

    if (line.startsWith('## ')) {
      // Looked like a version heading but did not match the required shape.
      skipped += 1;
      continue;
    }

    const categoryMatch = CATEGORY_HEADING.exec(line);
    if (categoryMatch) {
      if (!currentEntry) {
        skipped += 1;
        continue;
      }
      currentCategory = categoryMatch[1];
      continue;
    }

    if (line.startsWith('- ')) {
      const changeMatch = CHANGE_ITEM.exec(line);
      if (!changeMatch || !currentEntry) {
        skipped += 1;
        continue;
      }
      currentEntry.changes.push({
        category: currentCategory,
        summary: changeMatch[1],
        commit: changeMatch[2],
      });
      continue;
    }

    // Any other non-blank line that is not part of the recognised grammar.
    skipped += 1;
  }

  flushEntry();

  return { entries, skipped };
}

export function parseChangelog(markdown: string): ReadonlyArray<ChangelogEntry> {
  return parseChangelogDetailed(markdown).entries;
}

export interface DateRange {
  from?: string;
  to?: string;
}

export function filterByDate(entries: ReadonlyArray<ChangelogEntry>, range: DateRange): ReadonlyArray<ChangelogEntry> {
  const { from, to } = range;
  return entries.filter((entry) => {
    if (from !== undefined && entry.date < from) return false;
    if (to !== undefined && entry.date > to) return false;
    return true;
  });
}

export interface SearchOptions {
  regex?: boolean;
  flags?: string;
}

export interface SearchResult {
  entries: ReadonlyArray<ChangelogEntry>;
  error?: string;
}

export interface ChangelogSearchMatch {
  readonly entryIndex: number;
  readonly version: string;
  readonly origin: string;
  readonly start: number;
  readonly end: number;
  readonly text: string;
  readonly captures: readonly (string | undefined)[];
}

export interface BoundedChangelogSearchResult extends SearchResult {
  readonly matches: readonly ChangelogSearchMatch[];
  readonly truncated?: boolean;
  readonly code?: BoundedSearchErrorCode;
}

function matchesQuery(entry: ChangelogEntry, test: (value: string) => boolean): boolean {
  if (test(entry.version)) return true;
  return entry.changes.some((change) => test(change.category) || test(change.summary));
}

/**
 * Search entries. Plain-text substring search (case-insensitive) is the
 * default; pass `{ regex: true }` to search with a regular expression
 * instead. An invalid pattern is reported via `error`, never thrown.
 */
export function searchDetailed(
  entries: ReadonlyArray<ChangelogEntry>,
  query: string,
  options: SearchOptions = {},
): SearchResult {
  if (query === '') {
    return { entries };
  }

  if (options.regex) {
    return { entries: [], error: 'Regular-expression search requires the asynchronous isolated worker API.' };
  }

  const needle = query.toLowerCase();
  const test = (value: string) => value.toLowerCase().includes(needle);
  return { entries: entries.filter((entry) => matchesQuery(entry, test)) };
}

function changelogFields(entries: ReadonlyArray<ChangelogEntry>) {
  return entries.flatMap((entry, entryIndex) => [
    { recordId: String(entryIndex), origin: 'version', text: entry.version },
    { recordId: String(entryIndex), origin: 'date', text: entry.date },
    ...entry.changes.flatMap((change, changeIndex) => [
      { recordId: String(entryIndex), origin: `change:${changeIndex}:category`, text: change.category },
      { recordId: String(entryIndex), origin: `change:${changeIndex}:summary`, text: change.summary },
      { recordId: String(entryIndex), origin: `change:${changeIndex}:commit`, text: change.commit },
    ]),
  ]);
}

function toChangelogMatch(hit: BoundedSearchMatch, entries: ReadonlyArray<ChangelogEntry>): ChangelogSearchMatch | undefined {
  const entryIndex = Number(hit.recordId);
  const entry = Number.isInteger(entryIndex) ? entries[entryIndex] : undefined;
  if (!entry) return undefined;
  return {
    entryIndex,
    version: entry.version,
    origin: hit.origin,
    start: hit.start,
    end: hit.end,
    text: hit.text,
    captures: hit.captures,
  };
}

/** Search the changelog in a disposable worker with a hard deadline. */
export async function searchDetailedBounded(
  entries: ReadonlyArray<ChangelogEntry>,
  query: string,
  options: SearchOptions & { readonly deadlineMs?: number; readonly signal?: AbortSignal } = {},
): Promise<BoundedChangelogSearchResult> {
  if (query === '') return { entries, matches: [], truncated: false };
  const outcome = await runBoundedSearch({
    query,
    mode: options.regex ? 'regex' : 'plain',
    flags: options.flags,
    fields: changelogFields(entries),
    deadlineMs: options.deadlineMs,
    signal: options.signal,
  });
  if (!outcome.ok) {
    return { entries: [], matches: [], error: outcome.error, code: outcome.code };
  }
  const matches = outcome.matches.flatMap((hit) => {
    const match = toChangelogMatch(hit, entries);
    return match ? [match] : [];
  });
  const matchedIndexes = new Set(matches.map((match) => match.entryIndex));
  return {
    entries: entries.filter((_, index) => matchedIndexes.has(index)),
    matches,
    truncated: outcome.truncated,
  };
}

export function search(
  entries: ReadonlyArray<ChangelogEntry>,
  query: string,
  options: SearchOptions = {},
): ReadonlyArray<ChangelogEntry> {
  return searchDetailed(entries, query, options).entries;
}

export interface FilterAndSearchOptions extends DateRange, SearchOptions {
  query?: string;
}

export interface FilterAndSearchResult {
  entries: ReadonlyArray<ChangelogEntry>;
  error?: string;
}

export function filterAndSearch(
  entries: ReadonlyArray<ChangelogEntry>,
  options: FilterAndSearchOptions,
): FilterAndSearchResult {
  const dated = filterByDate(entries, { from: options.from, to: options.to });
  if (options.query === undefined || options.query === '') {
    return { entries: dated };
  }
  return searchDetailed(dated, options.query, { regex: options.regex, flags: options.flags });
}

export async function filterAndSearchBounded(
  entries: ReadonlyArray<ChangelogEntry>,
  options: FilterAndSearchOptions & { readonly deadlineMs?: number; readonly signal?: AbortSignal },
): Promise<BoundedChangelogSearchResult> {
  const dated = filterByDate(entries, { from: options.from, to: options.to });
  if (options.query === undefined || options.query === '') {
    return { entries: dated, matches: [], truncated: false };
  }
  return await searchDetailedBounded(dated, options.query, {
    regex: options.regex,
    flags: options.flags,
    deadlineMs: options.deadlineMs,
    signal: options.signal,
  });
}

/** Returns the commit ids referenced by entries that `exists` reports as not existing. */
export function validateCommits(
  entries: ReadonlyArray<ChangelogEntry>,
  exists: (commit: string) => boolean,
): ReadonlyArray<string> {
  const missing: string[] = [];
  for (const entry of entries) {
    for (const change of entry.changes) {
      if (!exists(change.commit)) {
        missing.push(change.commit);
      }
    }
  }
  return missing;
}

function rangeHeader(entries: ReadonlyArray<ChangelogEntry>): string {
  if (entries.length === 0) return 'Range: (no entries)';
  const dates = entries.map((entry) => entry.date).sort();
  const first = dates[0];
  const last = dates[dates.length - 1];
  return first === last ? `Range: ${first}` : `Range: ${first} to ${last}`;
}

export function toMarkdown(entries: ReadonlyArray<ChangelogEntry>): string {
  const lines: string[] = [`<!-- ${rangeHeader(entries)} -->`];
  for (const entry of entries) {
    lines.push('', `## ${entry.version} — ${entry.date}`);
    if (entry.changes.length === 0) {
      lines.push('', '_No changes recorded for this version._');
      continue;
    }
    const byCategory = new Map<string, ChangelogChange[]>();
    for (const change of entry.changes) {
      const bucket = byCategory.get(change.category) ?? [];
      bucket.push(change);
      byCategory.set(change.category, bucket);
    }
    for (const [category, changes] of byCategory) {
      lines.push('', `### ${category}`);
      for (const change of changes) {
        lines.push(`- ${change.summary} (${change.commit})`);
      }
    }
  }
  return lines.join('\n');
}

export function toPlainText(entries: ReadonlyArray<ChangelogEntry>): string {
  const lines: string[] = [rangeHeader(entries)];
  for (const entry of entries) {
    lines.push('', `${entry.version} (${entry.date})`);
    if (entry.changes.length === 0) {
      lines.push('  No changes recorded for this version.');
      continue;
    }
    for (const change of entry.changes) {
      lines.push(`  [${change.category}] ${change.summary} (${change.commit})`);
    }
  }
  return lines.join('\n');
}

/** Resolve a commit id to a browsable HTTPS URL after validating both inputs. */
export function commitUrl(commit: string, repository: string): string {
  if (!HEX40.test(commit)) {
    throw new Error(`commitUrl: "${commit}" is not a 40-character hexadecimal commit id`);
  }
  let parsed: URL;
  try {
    parsed = new URL(repository);
  } catch {
    throw new Error('commitUrl: repository URL is invalid');
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error('commitUrl: repository URL must be HTTPS without credentials, query, or fragment');
  }
  const base = parsed.href.replace(/\/+$/, '');
  if (base === 'https:') throw new Error('commitUrl: repository URL has no host');
  return `${base}/commit/${commit}`;
}
