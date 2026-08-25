/**
 * Turns a real `local-history.list`/`.diff`/`.compare` reading into the History
 * screen's own row shapes.
 *
 * `LocalHistory` (`control-plane/local-history.ts`) is the console's own append-only
 * git repository -- not an Asterisk reading, because nothing about the History screen
 * (commits, blame, a restore) is something `asterisk -rx` has ever heard of. It is a
 * real source all the same: every field below comes from an actual commit this
 * application wrote, or is honestly empty because nothing has been recorded yet.
 *
 * Nothing here invents a branch, a file, or a diff line. The one thing this module
 * does choose on its own is which colour a commit's timeline dot gets, and that
 * choice is a deterministic function of the commit's own real `action` field, never
 * of anything guessed.
 */

/** Mirrors `control-plane/local-history.ts`'s `HistoryCommit` without importing the
 *  control-plane module into the renderer bundle -- the same boundary `readings.ts`
 *  already keeps for every other reading shape. */
export interface HistoryCommit {
  id: string;
  timestamp: string;
  action: string;
  subject: string;
  message: string;
}

export interface HistoryDiffLine {
  text: string;
  sign: '+' | '-' | ' ';
}

export interface HistoryDiff {
  files: ReadonlyArray<string>;
  lines: ReadonlyArray<HistoryDiffLine>;
}

/** One real reading of the whole store, as `local-history.list` returns it. */
export interface LocalHistoryReading {
  entries: ReadonlyArray<HistoryCommit>;
  counts: Readonly<Record<string, number>>;
  branch: string;
}

/**
 * The commit dot's colour, keyed to the real `action` LocalHistory recorded --
 * see `HISTORY_ACTIONS` in `control-plane/local-history.ts`. Colours are drawn from
 * the palette already used elsewhere on this screen's own rail (`#82D9A5` endpoint
 * green, `#7FD1F0` contact blue, `#FFCC80` registration amber, `#FFB4AB` stranded
 * red -- see `App.tsx`'s `endpointGraphVals`), so a destructive action reads red and
 * a creative one reads green without a new colour being invented for this screen.
 */
export const HISTORY_ACTION_DOT: Readonly<Record<string, string>> = {
  created: '#82D9A5',
  restored: '#82D9A5',
  imported: '#7FD1F0',
  updated: '#FFCC80',
  'settings-changed': '#FFCC80',
  deleted: '#FFB4AB',
  undone: '#FFB4AB',
};

const DEFAULT_DOT = '#9AA39B';

export function commitCountLabel(entries: ReadonlyArray<HistoryCommit>): string {
  return `${entries.length} commit${entries.length === 1 ? '' : 's'}`;
}

/**
 * `commitMessage` in `control-plane/local-history.ts` always writes a commit whose
 * first line is `"<Verb> <subject>"` (e.g. "Deleted the endpoint 1001") followed by a
 * blank line and its `History-*` trailers. Reading that first line back out means
 * this module shows the exact same human-facing summary the commit itself carries,
 * without duplicating `local-history.ts`'s own verb table.
 */
export function commitHeadline(commit: HistoryCommit): string {
  return commit.message.split(/\r?\n/u)[0]?.trim() || commit.subject;
}

export interface HistoryCommitRow {
  id: string;
  sha: string;
  msg: string;
  meta: string;
  hasTag: boolean;
  tag: string;
  dot: string;
  selected: boolean;
  comparing: boolean;
}

/** Newest-first is already how `LocalHistory.list` returns `entries` -- this never
 *  re-sorts, only maps. */
export function commitRows(
  entries: ReadonlyArray<HistoryCommit>,
  selectedId: string,
  compareIds: ReadonlyArray<string>,
): HistoryCommitRow[] {
  return entries.map((commit) => ({
    id: commit.id,
    sha: commit.id.slice(0, 7),
    msg: commitHeadline(commit),
    meta: `${commit.action} · ${new Date(commit.timestamp).toLocaleString()}`,
    hasTag: false,
    tag: '',
    dot: HISTORY_ACTION_DOT[commit.action] ?? DEFAULT_DOT,
    selected: commit.id === selectedId,
    comparing: compareIds.includes(commit.id),
  }));
}

export interface HistoryFilterChip {
  action: string;
  label: string;
  on: boolean;
}

/**
 * One chip per action that has actually happened at least once, plus an always-present
 * "All" chip. A chip for an action nobody has ever recorded (which, until something
 * outside this task starts calling `local-history.record`, is every action) would be
 * a filter over rows that can never exist -- decoration, not a real control -- so it
 * stays off the strip until its count is real.
 */
export function filterChips(counts: Readonly<Record<string, number>>, activeAction: string): HistoryFilterChip[] {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const chips: HistoryFilterChip[] = [{ action: '', label: `All (${total})`, on: activeAction === '' }];
  for (const [action, count] of Object.entries(counts)) {
    if (count === 0) continue;
    chips.push({ action, label: `${action} (${count})`, on: activeAction === action });
  }
  return chips;
}

export function filteredEntries(entries: ReadonlyArray<HistoryCommit>, activeAction: string): HistoryCommit[] {
  return activeAction === '' ? [...entries] : entries.filter((commit) => commit.action === activeAction);
}

export interface HistoryDiffLineView {
  text: string;
  color: string;
  bg: string;
}

export function diffLineViews(diff: HistoryDiff | undefined): HistoryDiffLineView[] {
  if (!diff) return [];
  return diff.lines.map((line) => {
    if (line.sign === '+') return { text: `+ ${line.text}`, color: '#82D9A5', bg: 'rgba(130,217,165,0.12)' };
    if (line.sign === '-') return { text: `- ${line.text}`, color: '#FFB4AB', bg: 'rgba(255,180,171,0.1)' };
    return { text: `  ${line.text}`, color: '#9AA39B', bg: 'transparent' };
  });
}

export function diffFileLabel(selectedId: string, diff: HistoryDiff | undefined, diffPending: boolean): string {
  if (!selectedId) return 'no commit selected';
  if (diffPending || !diff) return 'reading…';
  if (diff.files.length === 0) return 'no file recorded for this commit';
  return diff.files.join(', ');
}

export interface HistoryBlameRow {
  sha: string;
  what: string;
  who: string;
}

/**
 * "Who last touched what" for the selected commit. Every commit this class writes
 * carries one fixed author -- `initialize()` in `control-plane/local-history.ts` sets
 * `user.name`/`user.email` to "Asterisk Local History" once, for every commit, because
 * this console has no per-user account system of its own. Naming that one real
 * identity for every file is the honest answer, not a placeholder: there genuinely is
 * only one author of everything in this repository.
 */
export function blameRows(
  entries: ReadonlyArray<HistoryCommit>,
  selectedId: string,
  diff: HistoryDiff | undefined,
): HistoryBlameRow[] {
  const commit = entries.find((entry) => entry.id === selectedId);
  if (!commit) return [];
  const sha = commit.id.slice(0, 7);
  const who = 'Asterisk Local History';
  if (!diff || diff.files.length === 0) return [{ sha, what: commitHeadline(commit), who }];
  return diff.files.map((file) => ({ sha, what: file, who }));
}

/** The Comparison panel's single text block -- real shas, a real pending state while
 *  `local-history.compare` is in flight, and a real file list once it answers. */
export function compareLabel(
  entries: ReadonlyArray<HistoryCommit>,
  compareIds: ReadonlyArray<string>,
  compareFiles: ReadonlyArray<string> | undefined,
  comparePending: boolean,
): string {
  if (compareIds.length === 0) {
    return 'Pick a commit’s compare icon to start a comparison.';
  }
  const shaOf = (id: string): string => entries.find((entry) => entry.id === id)?.id.slice(0, 7) ?? id.slice(0, 7);
  if (compareIds.length === 1) {
    return `${shaOf(compareIds[0])} selected. Pick a second commit to compare it against.`;
  }
  const [shaA, shaB] = [shaOf(compareIds[0]), shaOf(compareIds[1])];
  if (comparePending || !compareFiles) return `Comparing ${shaA} → ${shaB}…`;
  if (compareFiles.length === 0) return `${shaA} → ${shaB}: no files differ.`;
  return `${shaA} → ${shaB}: ${compareFiles.length} file${compareFiles.length === 1 ? '' : 's'} differ (${compareFiles.join(', ')}).`;
}

/** Adds `id` to a two-slot compare selection, dropping the oldest pick once a third
 *  commit is chosen -- there is nothing to compare against a third value, so a chip
 *  clicked while two are already held replaces rather than grows the set. Clicking an
 *  already-selected commit again removes it. */
export function toggleCompare(current: ReadonlyArray<string>, id: string): string[] {
  if (current.includes(id)) return current.filter((existing) => existing !== id);
  if (current.length < 2) return [...current, id];
  return [current[1], id];
}
