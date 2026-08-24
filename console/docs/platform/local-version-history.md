# Local version history

A Git-backed, browsable, restorable history of every user-managed record — documents, settings, accounts — kept locally and privately.

## Behavior

Every user-managed setting and record change is recorded through the desktop control plane in an isolated Git repository under app data. The repository is never placed inside a user project and is never synced or pushed. The History screen reads real commits, filters by action and date, searches subjects and messages with plain text or an opted-in regular expression, shows selected metadata and redaction boundaries, and restores by adding a new commit.

## Configuration

Restoring is append-only. The selected commit remains unchanged and the restore writes a new `restored` commit. History exports are JSON and contain redacted metadata only. Credential-shaped values are removed by the control-plane service before they enter the local Git repository.

## Current status

**Desktop application:** Implemented for the mounted desktop shell. Settings changes, server additions and removals, and PBX administration applies are recorded as local history events. The History screen has real refresh, action-count filters, date fields, search, regex mode, selection, metadata diff, restore, compare selection, and JSON export controls. An empty app-data repository is shown as empty, never filled with sample rows.

**Documentation website:** Not changed in this desktop-only lane.

## Failure modes

If the local history repository is unavailable, the live setting or record operation is not rolled back solely because history could not be written. The History screen reports the read failure and keeps the visible list empty until the next refresh. Restore refuses malformed or unknown commit ids and reports the exact control-plane response.

## Accessibility and localization

The controls are keyboard reachable through the generated desktop shell, expose ordinary labels and visible states, and use the same app language boundary as the rest of the screen. A broad reduced-motion, accessibility, or narrow-layout run was not performed in this implementation lane.

## Verification

The renderer mounts `local-history.ts` and calls `local-history.list`, `local-history.record`, and `local-history.restore` through the existing control-plane bridge. The control-plane implementation is `control-plane/local-history.ts`; its append-only Git behavior and redaction boundary remain the source of truth. A broad build or runtime capture was intentionally not run in this lane.

## Suggested articles

[In-app changelog viewer](changelog-viewer.md), [Destructive-action super confirmation](destructive-action-confirmation.md), [History and git](../app/history.md), [Platform feature index](README.md).
