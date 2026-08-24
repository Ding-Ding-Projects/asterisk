# Accessibility, overlays, and recovery

The desktop Console's shared design source now supplies the cross-surface interaction contract used by every destination.

## Keyboard and assistive technology

Focus-visible outlines use a high-contrast green outline with an offset so focus remains visible on dark surfaces. Buttons and fields have a minimum 44px target, and context menus expose `role="menu"`, searchable filter fields, aligned shortcut hints, and adjacent regex builders. Select controls use the same plain-text-first search pattern and expose a full local regex builder when requested. Screen-reader status is carried through live regions for progress, recovery state, notification counts, and invalid patterns.

## Overlays

Context menus, submenus, regex builders, and recovery panels paint their own background, border, and elevation. The shared overlay rules cap width and height against the viewport, keep overflow scrollable, and switch to a bounded narrow layout below 900px. Reduced-motion preferences disable non-essential animation and scrolling effects without removing the state or action.

## Long operations

One-click deployment reports the active stage, percentage, completed steps, and current status inside its start surface. Starting again while active is ignored. Cancellation stops the operation and preserves the completed-step count, stating that later steps were not attempted.

## Recovery

Every context-menu target includes `Recover or re-authenticate…`. The anchored recovery panel identifies the failed target, keeps the failed action unchanged, and gives distinct Retry and Re-authenticate actions. Its live status reports a request only, never a credential value or an unverified success.

## Notifications and filters

Toasts and celebration messages append to a local notification history. The notification destination renders only events raised in the current runtime, and its bulk actions mark selected events read, dismiss selected events, or prepare them for export. Table filter rows can collapse, but an active filter remains visible as a warning while collapsed.

## Verification boundary

The design compiler was run in this lane with `npm run compile:design`. No test suite, lint, broad build, package, desktop interaction, browser capture, or release action was run for this lane.
