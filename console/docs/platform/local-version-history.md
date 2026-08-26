# Local version history

A Git-backed, browsable, restorable history of every user-managed record — documents, settings, accounts — kept locally and privately.

## Behavior

Every user-managed setting and record change is recorded through the desktop control plane in an isolated Git repository under app data. The repository is never placed inside a user project and is never synced or pushed. A process-wide serialized history instance owns all mutations, so overlapping writes cannot stage each other's files. Each mutation supplies a stable target, resource, kind, and object identity. If a write cannot complete, its redacted payload enters a durable retry queue and the desktop shows a retry route. The History screen reads cursor-paginated real commits, filters by action and inclusive local date range, searches subjects and messages, shows real redacted commit-tree diffs and comparisons, and restores the complete selected tree including removals before appending a new restore commit.

## Configuration

Restoring is append-only. The selected commit remains unchanged and the restore writes a new `restored` commit. Restore accepts only a full commit id present in the parsed local-history listing, so another reachable Git object cannot be used as a restore source. The history manager has a separate credential stored in the operating-system vault. Recording can continue while the manager is locked, while browsing, diffing, comparing, restoring, exporting, and retention actions require the separate credential. History exports are JSON or validated ZIP and contain redacted metadata only. Credential-shaped values are removed by the control-plane service before they enter the local Git repository.

## Current status

**Desktop application:** Implemented for the mounted desktop shell. Settings, endpoint, onboarding, runtime, server, media, and PBX administration mutations are listed in `inventories/history-mutations.json` and record local history events. The History screen has real refresh, cursor pagination, all-count labels, action filters, inclusive date fields, search, regex mode, redacted tree diff, tree comparison, selection, append-only complete-tree restore, batch restore, JSON export, validated ZIP export, and external-editor handoff. An empty app-data repository is shown as empty, never filled with sample rows. 7z remains visibly unavailable until its bundled adapter exists.

**Documentation website:** Not changed in this desktop-only lane.

## Failure modes

If the local history repository is unavailable, the live setting or record operation is not rolled back solely because history could not be written. A visible warning names the failure and offers retry. The History screen remains locked until its separate vault credential is accepted. Restore refuses malformed or unknown commit ids, validates the selected tree, and reports the exact control-plane response. Retention uses an explicit immutable append-only policy and reports zero removals instead of pretending to prune history.

## Accessibility and localization

The controls are keyboard reachable through the generated desktop shell, expose ordinary labels and visible states, and use the same app language boundary as the rest of the screen. A broad reduced-motion, accessibility, or narrow-layout run was not performed in this implementation lane.

## Verification

The renderer mounts `local-history.ts` and calls `local-history.list`, `local-history.record`, and `local-history.restore` through the existing control-plane bridge. The control-plane implementation is `control-plane/local-history.ts`; its append-only Git behavior and redaction boundary remain the source of truth. A broad build or runtime capture was intentionally not run in this lane.

## Suggested articles

[In-app changelog viewer](changelog-viewer.md), [Destructive-action super confirmation](destructive-action-confirmation.md), [History and git](../app/history.md), [Platform feature index](README.md).
