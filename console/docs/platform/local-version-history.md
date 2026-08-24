# Local version history

A Git-backed, browsable, restorable history of every user-managed record — documents, settings, accounts — kept locally and privately.

## Behavior

Every creation, edit, and deletion of a user-owned record is meant to be recorded as a commit in a local, isolated repository, with a browsing panel offering filtering, diffing, labeling, and non-destructive restore.

## Configuration

Restoring would itself be recorded as a new revision rather than rewriting history, so a restore could itself be undone.

## Current status

**Desktop application:** Not implemented. The desktop application keeps no local version history of any kind; settings and records are overwritten in place with no way to browse or restore a prior state.

**Documentation website:** Implemented as a browser-local equivalent at `history.html`. Visitor event metadata is append-only, searchable by text or regex, filterable by date and action, restorable only as a new event, and exportable with credentials and private vocabulary explicitly omitted.

## Failure modes

If the local history repository became unreadable, the intended behavior is to keep the live data intact and report the history failure separately rather than blocking the operation that triggered it; nothing implements the repository today.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[In-app changelog viewer](changelog-viewer.md), [Destructive-action super confirmation](destructive-action-confirmation.md), [History and git](../app/history.md), [Platform feature index](README.md).
