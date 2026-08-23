# Bulk actions

Multi-select and batch operations across every list, table, and collection in the product, with an honest preview before anything irreversible runs.

## Behavior

Every list is meant to support multi-select (click, shift-click ranges, and a keyboard equivalent), an honestly scoped select-all, and the same actions available singly — delete, export, move, tag, and so on — offered in bulk with a reviewable count and preview.

## Configuration

A bulk action would be undoable through local version history where the underlying action normally is, and would never silently skip an item without reporting it.

## Current status

**Desktop application:** Not implemented. Every list in the desktop application (servers, recordings, and similar) is single-selection only, with no multi-select, select-all, or batch action available.

**Documentation website:** Not implemented. The documentation website has no user-owned lists to act on in bulk.

## Failure modes

If an item in a bulk batch cannot complete the action (a locked record, a permission error), the intended behavior is to report that item as skipped in the result summary rather than silently omit it; there is no bulk mechanism yet to test this against.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[Complete data export](complete-exports.md), [Destructive-action super confirmation](destructive-action-confirmation.md), [Platform feature index](README.md).
