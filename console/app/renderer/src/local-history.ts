/**
 * Renderer-side shape and filtering helpers for the app-data history service.
 *
 * The Git repository itself lives in the desktop control plane. This module keeps
 * the mounted screen independent from that implementation, bounds what the UI can
 * display, and makes search and action/date filters compose without inventing rows.
 */

export const HISTORY_ACTIONS = [
  'created',
  'updated',
  'deleted',
  'restored',
  'undone',
  'imported',
  'settings-changed',
] as const;

export type HistoryAction = (typeof HISTORY_ACTIONS)[number];

export interface HistoryCommit {
  id: string;
  timestamp: string;
  action: HistoryAction;
  subject: string;
  message: string;
}

export interface HistoryFilter {
  action?: HistoryAction;
  since?: string;
  until?: string;
  query?: string;
  regex?: boolean;
}

export interface HistorySearchResult {
  entries: readonly HistoryCommit[];
  error?: string;
}

const MAX_QUERY_LENGTH = 256;

function actionLabel(action: HistoryAction): string {
  return action === 'settings-changed'
    ? 'Settings changed'
    : `${action[0].toUpperCase()}${action.slice(1)}`;
}

export function historyActionLabel(action: HistoryAction): string {
  return actionLabel(action);
}

export function isHistoryAction(value: unknown): value is HistoryAction {
  return typeof value === 'string' && (HISTORY_ACTIONS as readonly string[]).includes(value);
}

export function filterHistory(entries: readonly HistoryCommit[], filter: HistoryFilter): HistorySearchResult {
  const query = (filter.query ?? '').trim();
  let matcher: ((value: string) => boolean) | undefined;
  if (query.length > 0) {
    if (query.length > MAX_QUERY_LENGTH) {
      return { entries: [], error: `History search is limited to ${MAX_QUERY_LENGTH} characters.` };
    }
    if (filter.regex) {
      let pattern: RegExp;
      try {
        pattern = new RegExp(query, 'iu');
      } catch {
        return { entries: [], error: 'History search has an invalid regular expression.' };
      }
      matcher = (value) => pattern.test(value);
    } else {
      const needle = query.toLocaleLowerCase();
      matcher = (value) => value.toLocaleLowerCase().includes(needle);
    }
  }

  const since = filter.since ? Date.parse(filter.since) : undefined;
  const until = filter.until ? Date.parse(filter.until) : undefined;
  const filtered = entries.filter((entry) => {
    if (filter.action && entry.action !== filter.action) return false;
    const timestamp = Date.parse(entry.timestamp);
    if (since !== undefined && Number.isFinite(since) && timestamp < since) return false;
    if (until !== undefined && Number.isFinite(until) && timestamp > until) return false;
    if (matcher && !matcher(`${entry.subject} ${entry.action} ${entry.message}`)) return false;
    return true;
  });
  return { entries: filtered };
}

export function historyCounts(entries: readonly HistoryCommit[]): Record<HistoryAction, number> {
  const counts = Object.fromEntries(HISTORY_ACTIONS.map((action) => [action, 0])) as Record<HistoryAction, number>;
  for (const entry of entries) counts[entry.action] += 1;
  return counts;
}

export function formatHistoryTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? timestamp : date.toLocaleString();
}

export function historyExportRows(entries: readonly HistoryCommit[]): Array<Record<string, unknown>> {
  return entries.map((entry) => ({
    id: entry.id,
    timestamp: entry.timestamp,
    action: actionLabel(entry.action),
    subject: entry.subject,
    message: entry.message,
  }));
}
