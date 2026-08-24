# Local version history

A Git-backed, browsable, restorable history of every user-managed record — documents, settings, accounts — kept locally and privately.

## Behavior

Every creation, edit, and deletion of a user-owned record is meant to be recorded as a commit in a local, isolated repository, with a browsing panel offering filtering, diffing, labeling, and non-destructive restore.

## Configuration

Restoring would itself be recorded as a new revision rather than rewriting history, so a restore could itself be undone.

## Current status

**Desktop application:** Not implemented. The desktop application keeps no local version history of any kind; settings and records are overwritten in place with no way to browse or restore a prior state.

**Documentation website:** Partial, runtime proof unverified. Settings mounts a bounded browser timeline with stable revision IDs, text, action and date filters, action counts, date presets, filtered selection, diff output, redacted export, retention controls, append-only restore receipts, and a restore-record route. The date surface also provides month and year jumps, local or ISO typed dates, named presets, range selection, and day buttons with accessible weekday names. Source wiring records settings, tabs, appearance, locks, authenticator persistence, tickets, ladder, and status metadata. Authenticator restore is explicitly unsupported because secrets are omitted, and complete coverage proof remains incomplete. It stores browser metadata rather than a Git repository and omits secrets and credential digests.

## Failure modes

If browser history storage is unreadable, live settings remain usable and the history surface reports an empty or unavailable state. Retention is explicitly bounded to 500 records rather than described as unlimited.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

This source-only lane did not run tests, builds, browser checks, or captures. The site registry remains `implemented-unverified`. The desktop application row remains not implemented.

## Suggested articles

[In-app changelog viewer](changelog-viewer.md), [Destructive-action super confirmation](destructive-action-confirmation.md), [History and git](../app/history.md), [Platform feature index](README.md).
