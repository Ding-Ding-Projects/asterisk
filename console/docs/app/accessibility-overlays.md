# Accessibility, overlays, and recovery

The desktop Console's shared design source now supplies the cross-surface interaction contract used by every destination. Geometry and notification history are kept in local browser storage for the renderer profile, with explicit reset paths.

## Keyboard and assistive technology

Focus-visible outlines use a high-contrast green outline with an offset so focus remains visible on dark surfaces. Buttons and fields have a minimum 44px target, and context menus expose `role="menu"`, searchable filter fields, aligned shortcut hints, and adjacent regex builders. Select controls use the same plain-text-first search pattern and expose a full local regex builder when requested. Screen-reader status is carried through live regions for progress, recovery state, notification counts, and invalid patterns.

## Overlays

Context menus, submenus, regex builders, and recovery panels paint their own background, border, and elevation. The shared overlay rules cap width and height against the viewport, keep overflow scrollable, and switch to a bounded narrow layout below 900px. Escape closes an active overlay, arrow keys move menu focus, Shift plus arrows move a panel, Ctrl plus arrows resize it, and Ctrl plus Home resets its saved geometry. Reduced-motion preferences disable non-essential animation and scrolling effects without removing the state or action.

## Long operations

One-click deployment reports the active stage, percentage, completed steps, and current status inside its start surface. The progress element exposes a semantic progressbar. Starting again while active is ignored. Cancellation increments a generation, aborts the current signal, invalidates stale replies after every asynchronous boundary, and preserves the completed observation count, stating that later steps were not attempted. The settled progress card remains visible after completion or cancellation.

## Recovery

Every context-menu target includes `Recover or re-authenticate…`. The anchored recovery panel identifies the failed target, keeps the failed action unchanged, and gives distinct Retry and Re-authenticate callbacks. Retry starts a fresh reading, while Re-authenticate refreshes the local discovery path. Its live status never reports a credential value or an unverified success.

## Notifications and filters

Toasts and celebration messages append to durable local notification history. The notification destination restores the history on launch and its bulk actions mark selected events read, dismiss selected events behind the destructive-action confirmation, or export a versioned JSON file. Table filter rows can collapse, but an active filter remains visible as a warning while collapsed.

## Tabs and dropdowns

The tab strip exposes `tablist`, `tab`, `tabpanel`, and `group` semantics, with roving tab indexes and axis-aware arrow keys. Close controls have an accessible name and a 44px target. Tab bulk-close uses one shared predicate for preview and execution, rejects empty or invalid input, defaults to plain text, and protects pinned, locked, or unsaved tabs. Select controls expose `listbox` and `option` semantics with a plain-text-first local filter and a full opt-in regex builder.

## Verification boundary

The design compiler was run in this lane with `npm run compile:design`. No test suite, lint, broad build, package, desktop interaction, browser capture, or release action was run for this lane.
