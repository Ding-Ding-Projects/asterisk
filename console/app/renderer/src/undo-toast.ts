/**
 * What the shared toast's global "Undo" button should do.
 *
 * The compiled shell's own `undoToast` closed the toast and announced "Change reverted"
 * no matter what had actually happened -- the same "executed and attested" shape this
 * codebase has fixed everywhere else a confirmation claimed an effect it never had.
 *
 * Every control on the console that changes a value goes through one route, `setVal()`
 * (generated/console.tsx): it both records the change onto `state.commits` (newest
 * first) and raises the toast this button lives on, with the exact text
 * `${label} set to ${value}`. The console's History screen already has a real, working
 * undo for exactly this: "Revert just this option" takes the most recent commit's `from`
 * value and writes it back through that same `setVal()`. This reuses that route rather
 * than inventing a second one -- see App.tsx's `undoToast` override.
 *
 * The toast is also raised by plenty of things that never touch `commits` -- a bulk
 * action's summary, a reroll, "Running <command>...". Reverting the most recent commit
 * while one of those is on screen would silently revert an unrelated earlier change, so
 * this only decides to revert when the toast currently on screen is *exactly* the one
 * the most recent commit produced. Anything else -- including no commit ever having been
 * recorded this session -- is an honest refusal naming what is missing, never a fake
 * "reverted".
 */

export interface CommitEntry {
  key: string;
  label: string;
  from: unknown;
  to: unknown;
}

/** The exact text `setVal()` composes for its toast -- see generated/console.tsx. */
export function toastTextForCommit(commit: CommitEntry): string {
  const shown = Array.isArray(commit.to) ? (commit.to.length > 0 ? commit.to.join(', ') : 'nothing') : String(commit.to);
  return `${commit.label} set to ${shown}`;
}

export interface UndoRevert {
  kind: 'revert';
  commit: CommitEntry;
}

export interface UndoRefusal {
  kind: 'refuse';
  reason: string;
}

export type UndoDecision = UndoRevert | UndoRefusal;

export const NO_COMMIT_YET =
  'No control on this console has changed anything yet this session, so there is nothing recorded to undo.';

export const NOT_A_VALUE_CHANGE =
  'This notification is not a value change, so there is nothing recorded here for Undo to reverse.';

/**
 * Decides what the global Undo button should do for the toast text currently on
 * screen, given the commit log `setVal()` maintains (newest entry first).
 */
export function decideUndo(toastText: string, commits: ReadonlyArray<CommitEntry>): UndoDecision {
  const latest = commits[0];
  if (!latest) {
    return { kind: 'refuse', reason: NO_COMMIT_YET };
  }
  if (toastText !== toastTextForCommit(latest)) {
    return { kind: 'refuse', reason: NOT_A_VALUE_CHANGE };
  }
  return { kind: 'revert', commit: latest };
}
