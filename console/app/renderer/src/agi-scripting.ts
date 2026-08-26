/**
 * Turns the Dialplan scripting (AGI) screen's two independent readings -- every
 * AGI()/EAGI()/DeadAGI() call `dialplan show` reports, and every file the target's own
 * AGI directory actually holds -- into the one cross-checked table the screen renders.
 * Read-only, like `rest-browser.ts` next to it: nothing here writes anything, and there
 * is nothing to resolve a row back to, because this screen offers no per-row action.
 */
import type { AgiReference } from '../../../control-plane/dialplan-graph';
import type { AgiScriptFile } from '../../../control-plane/agi-library';

/** A human-scale size, the same arithmetic as `formatBackupSize` in
 *  `history-backups.ts` and `formatPromptSize` in `prompt-library.ts` -- duplicated for
 *  the same reason those two already duplicate it rather than share: each lives beside
 *  the one screen it formats a size for. */
function formatScriptSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb >= 100 ? Math.round(kb) : kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb >= 100 ? Math.round(mb) : mb.toFixed(1)} MB`;
}

function fileDetail(file: AgiScriptFile): string {
  return `${formatScriptSize(file.bytes)}${file.executable ? '' : ' · not executable'}`;
}

/**
 * One row per AGI-family dialplan call, in the order `dialplan show` printed them,
 * followed by one row for every file in the AGI directory that no local reference
 * named at all -- an unreferenced script is just as worth seeing as a missing one,
 * because both are the same kind of drift between what the dialplan says and what the
 * filesystem actually has. Never throws: either input missing (nothing read yet, or
 * the last read failed) still produces whichever half of the table the other input
 * can support, rather than an all-or-nothing blank screen.
 */
export function agiScriptRows(
  references: ReadonlyArray<AgiReference> | undefined,
  files: ReadonlyArray<AgiScriptFile> | undefined,
): string[][] {
  const refs = references ?? [];
  const diskFiles = files ?? [];
  const byName = new Map(diskFiles.map((file) => [file.name, file]));
  const referencedLocalNames = new Set(refs.filter((ref) => ref.kind === 'local').map((ref) => ref.script));

  const rows: string[][] = [];
  for (const ref of refs) {
    const calledFrom = `${ref.context}/${ref.extension}:${ref.priority} (${ref.app})`;
    if (ref.kind === 'network') {
      rows.push([ref.script, calledFrom, 'n/a — served over the network, not this filesystem', 'FastAGI URL']);
    } else if (ref.kind === 'async') {
      rows.push([ref.script, calledFrom, 'n/a — handed to Async AGI over AMI, not a file', 'Async AGI']);
    } else {
      const onDisk = byName.get(ref.script);
      rows.push([ref.script, calledFrom, onDisk ? fileDetail(onDisk) : 'Missing from the AGI directory', 'Local script']);
    }
  }
  for (const file of diskFiles) {
    if (referencedLocalNames.has(file.name)) continue;
    rows.push([file.name, 'not called from the dialplan', fileDetail(file), 'Unreferenced file']);
  }
  return rows;
}
