# Accessibility, overlays, and recovery

The desktop Console's shared design source now supplies the cross-surface interaction contract used by every destination. Geometry, notification history, tabs, groups, pins, and docking are stored through `DurableStorageHandle` under one bounded versioned snapshot, with deep schema validation, a separate dialog-size schema migration, a UTF-8 byte cap, corruption recovery, and explicit reset paths. This lane's implementation is **implemented-unverified** until runtime interaction evidence exists.

## Keyboard and assistive technology

Focus-visible outlines use a high-contrast green outline with an offset so focus remains visible on dark surfaces. Title-bar controls are real named 44px buttons, and every button and field receives a minimum target height. Context menus expose `role="menu"`, searchable filter fields, aligned shortcut hints, menuitem-only arrow traversal, setsize/posinset counts, and adjacent regex builders. Select controls use the same plain-text-first search pattern and expose a full local regex builder when requested. Screen-reader status is carried through live regions for progress, recovery state, notification counts, and invalid patterns.

## Overlays

Context menus, submenus, regex builders, and recovery panels paint their own background, border, and elevation. The shared overlay rules cap width and height against the viewport, keep overflow scrollable, and switch to a bounded narrow layout below 900px. An explicit active-overlay stack owns Escape, action, cancel, scrim, and nested close paths, then restores the exact opener. Meaningful headings receive `aria-labelledby`; overlays do not expose generated serial keys as their accessible name. Reduced-motion preferences combine the platform preference with the durable user switch, without removing the state or action. Runtime interaction remains unverified in this lane.

## Long operations

One-click deployment reports the active stage, percentage, completed steps, and current status inside its start surface. The progress element exposes a semantic progressbar. Starting again while active is ignored. Cancellation uses a request id and an AbortSignal for renderer invalidation only because the shipped bridge has no cancellation IPC. Late replies are rejected, while the UI states that the underlying request remains pending. The settled progress card remains visible after completion or cancellation. Runtime interaction remains unverified in this lane.

## Recovery

Every context-menu target includes `Recover or re-authenticate…`. The anchored recovery panel identifies the failed target, keeps the failed action unchanged, and gives distinct Retry and Re-authenticate callbacks. Retry uses the bounded recorded action and its exact view or resource, rejects an unrecorded or unsafe action, and never substitutes a generic `pbx.read`. Re-authenticate refreshes the local discovery path. Its live status never reports a credential value or an unverified success. Runtime interaction remains unverified in this lane.

## Notifications and filters

Toasts and celebration messages append to durable local notification history. The notification destination restores the history on launch and its bulk actions mark selected events read, dismiss selected events behind the destructive-action confirmation, or export a versioned JSON file. Table filter rows can collapse, but an active filter remains visible as a warning while collapsed.

## Tabs and dropdowns

The tab strip exposes `tablist`, `tab`, `tabpanel`, and `group` semantics, with roving tab indexes, stable tab/panel IDs, valid grouped-tab ownership, and axis-aware arrow keys. Close controls have an accessible name and a 44px target. Tab bulk-close uses one shared predicate for preview and execution, freezes the exact planned labels in confirmation, rejects empty or invalid input and stale plans, defaults to plain text, and protects pinned, locked, or unsaved tabs. Select controls expose `listbox` and `option` semantics with a plain-text-first local filter and a full opt-in regex builder.

The command palette inventory is hand-written and includes every destination, declared setting, article id, open tab, and tab group. Setting results render the same rich control used by the owning screen, while destination and setting results teleport to their screen and return focus to the matching labelled control. The palette traps Tab focus while open and announces its result set through the live result list.

The compiled design carries exact fail-closed inventories for every declared control, documentation article, command, appearance property, tab action, and group action. Missing, extra, or duplicate entries throw during initialization rather than silently shrinking the surface. Palette results teleport by stable article, tab, group, and control ids.

Low stimulation is consumed at the root: non-essential celebration and toast presentation is suppressed while the notification record is still retained in durable history. Focus and reduced-motion classes are reapplied after durable bootstrap. Persistence refusal is surfaced in the toolbar status, while pre-bootstrap writes queue and flush after the snapshot is ready.

The regex builder keeps an independent `{query, pattern, flags, sample}` tuple per originating field, with no global flags value. It reports match counts, exposes capture groups, copies the pattern, and exports a bounded JSON result containing the exact query, pattern, flags, sample, and captures. Plain text remains the default until the user opens regex mode.

## Verification boundary

The design compiler was run in this lane with `node console/scripts/compile-design.mjs`. A TypeScript parse attempt reached the existing cold-checkout dependency boundary, with missing React and generated declaration outputs, so it did not produce a clean check verdict. No test suite, lint, broad build, package, desktop interaction, browser capture, or release action was run for this lane. Registry state is intentionally `implemented-unverified`.
