# Bulk actions

Multi-select and batch operations across every list, table, and collection in the product, with an honest preview before anything irreversible runs.

## Behavior

Every generated table uses the shared selection model. Plain click, Ctrl-click, Shift-click ranges, select-all for the current page, clear, and inverse selection all preserve the real row ids. The bulk bar reports selected counts, export acts on the selected rows, and skipped rows are named rather than dropped. The current desktop tables have no server-side paging, so select-all is explicitly page-scoped and does not claim access to unseen matches.

## Configuration

Export is reversible because it does not mutate the source rows. Mutating bulk operations remain unavailable on read-only PBX tables and are reported as not applied rather than claimed as successful writes. History uses the compare selection as a real multi-select and offers serialized batch restore, with per-entry success counts and failure messages. Every completed mutation records one local-history event and exposes an append-only restore path.

## Current status

**Desktop application:** Partial and mounted. All table-like screens receive the shared selection and bulk bar, with real selected-row export and honest page scope. The History screen has batch restore across compare-selected entries. The PBX read surfaces remain read-only, so delete, move, duplicate, and enable or disable actions are visibly unavailable or reported as not applied.

**Documentation website:** Not changed in this desktop-only lane.

## Failure modes

If a selected row is no longer in the current table, `planBulk` reports it as skipped with the reason `no longer in this table`. If the chosen export format has a shape limitation, the export reports that loss before download. Mutating actions that lack a target-specific write path are not reported as applied. History batch restore continues through the selected entries and reports partial outcomes rather than turning one failure into a false all-green result.

## Accessibility and localization

The generated bulk controls retain keyboard-reachable buttons and visible selected states. A broad accessibility or narrow-layout run was not performed in this implementation lane.

## Verification

The mounted path is `App.tsx` using `bulk.ts` and `export.ts`. This lane intentionally did not run broad build, packaging, or UI capture commands.

## Suggested articles

[Complete data export](complete-exports.md), [Destructive-action super confirmation](destructive-action-confirmation.md), [Platform feature index](README.md).
