/**
 * Registers the "Local history" screen and builds its groups.
 *
 * `local-history.list` / `.record` / `.restore` are real, tested control-plane actions
 * (`control-plane/local-history.ts`) backing the console's own append-only Git-backed
 * record of what it created, changed, stopped or removed on its own behalf -- never a
 * connected server's Asterisk configuration, which already has its own separate git
 * history under the "History & git" screen (`history.list` / `history.restore`,
 * `kind: 'history'`). Before this module nothing in the renderer ever called any of the
 * three `local-history.*` actions: the class existed, the dispatcher routed to it, and
 * no screen reached it, exactly the shape the platform's own documentation records --
 * see `Not implemented. The desktop application keeps no local version history of any
 * kind` in the bundled "Local version history" article.
 *
 * Registered the same way `pbx-admin-screens.ts` registers a screen for a PBX feature
 * with nowhere else to go: data-only mutation of the generated `SCREENS`/`ORDER`
 * exports at runtime, so no generated file is edited and the existing `M3Control`
 * generic-group renderer (`kind: 'generic'`, `A(v.groups).map(...)`) draws it exactly
 * as it draws every PBX Admin screen.
 */
import { ORDER, SCREENS } from './generated/console';
import type { HistoryAction, HistoryCommit } from '../../../control-plane/local-history';

export const LOCAL_HISTORY_SCREEN_ID = 'local-history';

/** Mirrors `HISTORY_ACTIONS` in `control-plane/local-history.ts`. Kept as a literal
 *  list here (rather than importing the runtime array) because importing it as a value
 *  would pull `local-history.ts`'s `node:fs/promises` import into the renderer bundle;
 *  only its *types* are safe to import there. `local-history-screen.test.tsx` proves
 *  this list stays exactly in step with the real one. */
export const LOCAL_HISTORY_ACTIONS: readonly HistoryAction[] = [
  'created',
  'updated',
  'deleted',
  'restored',
  'undone',
  'imported',
  'settings-changed',
];

export const LOCAL_HISTORY_FILTER_ALL = 'All';

/** Adds the screen to the real `app` rail (never `PBX_ADMIN_RAIL`) exactly once, and to
 *  navigation order exactly once. Safe to call repeatedly -- module re-evaluation under
 *  a test runner must not duplicate the entry or grow `ORDER` on every import. */
export function registerLocalHistoryScreen(): void {
  const screens = SCREENS as unknown as Record<string, Record<string, unknown>>;
  const order = ORDER as unknown as string[];
  if (!screens[LOCAL_HISTORY_SCREEN_ID]) {
    screens[LOCAL_HISTORY_SCREEN_ID] = {
      rail: 'app',
      icon: 'manage_history',
      label: 'Local history',
      badge: '',
      title: 'Local history',
      file: "this installation's own local history repository (kept privately, never synced)",
      kind: 'generic',
      sub: 'A local, append-only record of what this console itself created, changed, stopped or removed on your behalf -- its own managed runtime and the app-owned records, never a connected server’s configuration. That has its own separate history under History & git.',
      groups: [],
    };
  }
  if (!order.includes(LOCAL_HISTORY_SCREEN_ID)) order.push(LOCAL_HISTORY_SCREEN_ID);
}

/** The same "index · timestamp · action · subject" shape `PbxAdminApp.historyOption`
 *  already uses for the target's own recovery points, so the two lists read the same
 *  way even though they come from two entirely different history stores. */
export function formatLocalHistoryEntry(entry: HistoryCommit, index: number): string {
  return `${index + 1} · ${entry.timestamp} · ${entry.action} · ${entry.subject}`;
}

type AdminControlLike = Record<string, unknown> & { id: string; label: string; kind: string; value: unknown };
type AdminGroupLike = { title: string; desc: string; ctls: AdminControlLike[] };

function actionControl(id: string, label: string, action: string, info?: string): AdminControlLike {
  return { id, label, kind: 'segmented', value: label, options: [label], action, ...(info ? { info } : {}) };
}

function selectControl(id: string, label: string, value: string, options: readonly string[], action?: string): AdminControlLike {
  return { id, label, kind: 'select', value, options: [...options], ...(action ? { action } : {}) };
}

export interface LocalHistoryScreenInputs {
  entries: readonly HistoryCommit[];
  counts: Readonly<Record<string, number>>;
  status: string;
  filter: string;
  selectedOption: string;
  busy: boolean;
}

/**
 * Pure builder, kept separate from `App` so it can be unit-tested without mounting the
 * shell: the "Filter & refresh" group always exists, and "Entries" only ever grows a
 * restore action when there is a real entry to restore -- the same "no control that
 * looks available and cannot work" rule `PbxAdminApp` already follows for its own
 * recovery-point and media-removal controls. While a restore is in flight the restore
 * control itself is omitted rather than merely left clickable, because `M3Control` has
 * no disabled state for a segmented control to fall back on -- see `App.stopRuntime`
 * for the same reasoning applied to the runtime-maintenance controls.
 */
export function buildLocalHistoryGroups(inputs: LocalHistoryScreenInputs): AdminGroupLike[] {
  const filterOptions = [LOCAL_HISTORY_FILTER_ALL, ...LOCAL_HISTORY_ACTIONS];
  const countsLine = LOCAL_HISTORY_ACTIONS
    .map((action) => `${action}: ${inputs.counts[action] ?? 0}`)
    .join(' · ');

  const groups: AdminGroupLike[] = [
    {
      title: 'Filter & refresh',
      desc: countsLine ? `${inputs.status} (${countsLine})` : inputs.status,
      ctls: [
        selectControl('lh_filter', 'Action', inputs.filter, filterOptions, 'local-history-filter'),
        actionControl('lh_refresh', 'Refresh local history', 'local-history-refresh'),
      ],
    },
  ];

  const options = inputs.entries.map((entry, index) => formatLocalHistoryEntry(entry, index));
  const entryCtls: AdminControlLike[] = [];
  if (options.length > 0) {
    entryCtls.push(selectControl('lh_entry', 'Entry', inputs.selectedOption || options[0]!, options, 'local-history-select'));
    if (!inputs.busy) {
      entryCtls.push(actionControl(
        'lh_restore',
        'Restore selected entry',
        'local-history-restore',
        'Writes the files this entry recorded back, and records the restore itself as a brand-new entry so it can always be undone in turn.',
      ));
    }
  }
  groups.push({
    title: 'Entries',
    desc: inputs.busy
      ? 'Restoring the selected entry…'
      : options.length === 0
        ? 'No local history entry matches this filter yet.'
        : `${options.length} entr${options.length === 1 ? 'y' : 'ies'} read, newest first.`,
    ctls: entryCtls,
  });

  return groups;
}
