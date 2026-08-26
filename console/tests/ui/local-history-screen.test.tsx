import assert from 'node:assert/strict';
import test from 'node:test';

import { ORDER, SCREENS } from '../../app/renderer/src/generated/console';
import { HISTORY_ACTIONS } from '../../control-plane/local-history.ts';
import type { HistoryCommit } from '../../control-plane/local-history.ts';
import {
  buildLocalHistoryGroups,
  formatLocalHistoryEntry,
  LOCAL_HISTORY_ACTIONS,
  LOCAL_HISTORY_FILTER_ALL,
  LOCAL_HISTORY_SCREEN_ID,
  registerLocalHistoryScreen,
} from '../../app/renderer/src/local-history-screen.ts';

const entry = (overrides: Partial<HistoryCommit> = {}): HistoryCommit => ({
  id: 'a'.repeat(40),
  timestamp: '2026-08-25T00:00:00.000Z',
  action: 'created',
  subject: 'thing one',
  message: 'Created thing one',
  ...overrides,
});

test('LOCAL_HISTORY_ACTIONS mirrors the real HISTORY_ACTIONS exactly', () => {
  /* This module cannot import `HISTORY_ACTIONS` as a value -- doing so would pull
   * `control-plane/local-history.ts`'s `node:fs/promises` import into the renderer
   * bundle -- so it keeps its own literal copy. This is the guard that keeps the copy
   * from silently drifting: it fails the moment a real action is added, renamed, or
   * removed and this list is not updated to match. */
  assert.deepEqual([...LOCAL_HISTORY_ACTIONS], [...HISTORY_ACTIONS]);
});

test('registering the screen twice does not duplicate it in the screen map or the nav order', () => {
  registerLocalHistoryScreen();
  const firstCount = (ORDER as string[]).filter((id) => id === LOCAL_HISTORY_SCREEN_ID).length;
  registerLocalHistoryScreen();
  const secondCount = (ORDER as string[]).filter((id) => id === LOCAL_HISTORY_SCREEN_ID).length;
  assert.equal(firstCount, 1, 'the first registration did not add exactly one nav entry');
  assert.equal(secondCount, 1, 'a second registration duplicated the nav entry');
});

test('the screen lands on the real app rail through the generic M3Control renderer, never a fallback rail', () => {
  registerLocalHistoryScreen();
  const screens = SCREENS as unknown as Record<string, { rail?: string; kind?: string; title?: string }>;
  const screen = screens[LOCAL_HISTORY_SCREEN_ID];
  assert.ok(screen, 'the local-history screen was never registered onto SCREENS');
  assert.equal(screen!.rail, 'app');
  assert.equal(screen!.kind, 'generic');
  assert.equal(screen!.title, 'Local history');
});

test('formatLocalHistoryEntry keeps the index, timestamp, action and subject in one readable line', () => {
  const line = formatLocalHistoryEntry(entry({ action: 'deleted', subject: 'Console runtime removed', timestamp: '2026-08-25T00:00:00.000Z' }), 2);
  assert.equal(line, '3 · 2026-08-25T00:00:00.000Z · deleted · Console runtime removed');
});

test('an empty entry list never offers a restore control that cannot work', () => {
  const groups = buildLocalHistoryGroups({
    entries: [], counts: {}, status: 'x', filter: LOCAL_HISTORY_FILTER_ALL, selectedOption: '', busy: false,
  });
  const entries = groups.find((g) => g.title === 'Entries');
  assert.ok(entries, 'no Entries group was built');
  assert.equal(
    entries!.ctls.some((c) => c.action === 'local-history-restore'),
    false,
    'a restore control was offered with nothing read to restore',
  );
});

test('a non-empty entry list offers exactly one restore control, bound to a real entry-select control', () => {
  const groups = buildLocalHistoryGroups({
    entries: [entry()], counts: {}, status: 'x', filter: LOCAL_HISTORY_FILTER_ALL, selectedOption: '', busy: false,
  });
  const entries = groups.find((g) => g.title === 'Entries')!;
  assert.equal(entries.ctls.filter((c) => c.action === 'local-history-restore').length, 1);
  assert.ok(entries.ctls.some((c) => c.id === 'lh_entry' && c.kind === 'select'), 'no select control lists the readable entries');
});

test('a restore in flight removes the restore control rather than leaving it clickable', () => {
  const idle = buildLocalHistoryGroups({
    entries: [entry()], counts: {}, status: 'x', filter: LOCAL_HISTORY_FILTER_ALL, selectedOption: '', busy: false,
  });
  const busy = buildLocalHistoryGroups({
    entries: [entry()], counts: {}, status: 'x', filter: LOCAL_HISTORY_FILTER_ALL, selectedOption: '', busy: true,
  });
  assert.ok(idle.find((g) => g.title === 'Entries')!.ctls.some((c) => c.action === 'local-history-restore'));
  assert.equal(
    busy.find((g) => g.title === 'Entries')!.ctls.some((c) => c.action === 'local-history-restore'),
    false,
    'the restore control stayed present while a restore was already in flight',
  );
});

test('the filter select always offers every real history action plus "All", and only those', () => {
  const groups = buildLocalHistoryGroups({
    entries: [], counts: {}, status: 'x', filter: LOCAL_HISTORY_FILTER_ALL, selectedOption: '', busy: false,
  });
  const filterCtl = groups[0]!.ctls.find((c) => c.id === 'lh_filter') as { options?: string[] } | undefined;
  assert.ok(filterCtl, 'no lh_filter control was built');
  assert.deepEqual(filterCtl!.options, [LOCAL_HISTORY_FILTER_ALL, ...HISTORY_ACTIONS]);
});
