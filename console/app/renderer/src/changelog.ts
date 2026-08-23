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
    let pattern: RegExp;
    try {
      pattern = new RegExp(query, options.flags ?? 'i');
    } catch {
      return { entries: [], error: 'Invalid regular expression pattern' };
    }
    const test = (value: string) => {
      // Reset lastIndex in case a global flag was supplied.
      pattern.lastIndex = 0;
      return pattern.test(value);
    };
    return { entries: entries.filter((entry) => matchesQuery(entry, test)) };
  }

  const needle = query.toLowerCase();
  const test = (value: string) => value.toLowerCase().includes(needle);
  return { entries: entries.filter((entry) => matchesQuery(entry, test)) };
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

/** Resolve a commit id to a browsable URL. Refuses anything that is not exactly 40 hex characters. */
export function commitUrl(commit: string, repository: string): string {
  if (!HEX40.test(commit)) {
    throw new Error(`commitUrl: "${commit}" is not a 40-character hexadecimal commit id`);
  }
  const base = repository.endsWith('/') ? repository.slice(0, -1) : repository;
  return `${base}/commit/${commit}`;
}
