/**
 * Turns `ConfigHistory#list`'s real recovery points into the row shapes the
 * Configuration backups screen's table renders, and turns a clicked row back into the
 * exact {@link HistoryEntry} it was built from -- the same shape `acl-editor.ts` uses
 * for the Security screen's rules, chosen for the same reason: a backup's `handle` is
 * already a real, globally unique path on the target, so the row's own label can embed
 * it directly rather than inventing a synthetic index that could drift from what is on
 * screen a moment later.
 */
import type { HistoryEntry } from '../../../control-plane/config-history';

/** Appended to a row's first cell, matching the " · " + marker shape `acl-editor.ts`'s
 *  `ruleLabel` already uses to make one string both a legible label and a resolvable key. */
const MARKER = ' · #';

/** The bare filename of a configuration resource -- `/etc/asterisk/pjsip.conf` reads
 *  as `pjsip.conf` in the table, which is what an operator actually recognises. */
function baseName(resource: string): string {
  return resource.slice(resource.lastIndexOf('/') + 1);
}

/** A human-scale size, matching `formatPromptSize` in `prompt-library.ts`. Duplicated
 *  rather than imported: that function lives beside the Sound prompts screen it was
 *  written for, and importing across two unrelated screens for four lines of shared
 *  arithmetic is a worse coupling than the duplication itself. */
export function formatBackupSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb >= 100 ? Math.round(kb) : kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb >= 100 ? Math.round(mb) : mb.toFixed(1)} MB`;
}

/** `2026-08-23T01:19:03.627Z` reads as `2026-08-23 01:19:03 UTC` -- every timestamp
 *  `parseBackupStamp` in `config-history.ts` produces is already UTC (the `Z` suffix),
 *  so this only reformats it for reading, never reinterprets the zone. `undefined`
 *  (an unparseable stamp) reads as the honest "unknown time" rather than a blank cell. */
export function formatTakenAt(takenAt: string | undefined): string {
  if (!takenAt) return 'unknown time';
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})/u.exec(takenAt);
  return match ? `${match[1]} ${match[2]} UTC` : takenAt;
}

function label(entry: HistoryEntry): string {
  const kind = entry.handle.endsWith('-absent') ? 'removal recorded' : 'file backup';
  return `${baseName(entry.resource)} · ${formatTakenAt(entry.takenAt)}${MARKER}${entry.handle}`;
}

/** One row per recovery point, newest first (the order `ConfigHistory#list` already
 *  returns them in). Never throws: `entries === undefined` (nothing read yet, or the
 *  last read failed) is zero rows, the same "nothing to show" convention
 *  `promptRows`/`aclRuleRows` already use rather than crashing the render. */
export function historyRows(entries: ReadonlyArray<HistoryEntry> | undefined): string[][] {
  if (!entries) return [];
  return entries.map((entry) => [
    label(entry),
    formatTakenAt(entry.takenAt),
    entry.handle.endsWith('-absent') ? '—' : formatBackupSize(entry.bytes),
    entry.handle.endsWith('-absent') ? 'Removal recorded' : 'File backup',
  ]);
}

/** Resolves a row key {@link historyRows} built back to the exact {@link HistoryEntry}
 *  it names, by reading the handle embedded after {@link MARKER} and matching it
 *  against the SAME list the table was built from -- so a key from a stale render (the
 *  list moved underneath a still-open selection) resolves to `undefined` rather than to
 *  whatever now happens to be at the same position. */
export function resolveHistoryRow(
  entries: ReadonlyArray<HistoryEntry> | undefined,
  rowKey: string,
): HistoryEntry | undefined {
  const marker = rowKey.lastIndexOf(MARKER);
  if (marker < 0 || !entries) return undefined;
  const handle = rowKey.slice(marker + MARKER.length);
  return entries.find((entry) => entry.handle === handle);
}
