# Non-blocking notifications

Toast-style status messages anchored in a screen corner, used for anything that only informs rather than something the user must decide on.

## Behavior

Informational, success, progress, and non-decision error messages are meant to appear as auto-dismissing (persistent for warnings and errors) toasts anchored to a screen corner, stacking without overlapping, reserving blocking dialogs strictly for confirmations and destructive-action gates.

## Configuration

Notifications carry an optional title, body, and action links, and remain reviewable afterward in one shared notification history rather than vanishing without a trace. The generated product Notification centre and mounted auth surface share one durable store.

## Current status

**Desktop application:** Implemented-unverified. The generated product Notification centre reads one mounted store and exposes explicit loading, ready-empty, ready, and unavailable states. Actions remain unavailable until ready. Bulk delete uses the shared two-key/full-slider destructive gate, exact preview, and Emergency exit. Built-artifact interaction remains unverified.

**Documentation website:** Implemented. Every top-level and composed article page uses the same corner notifications and persisted history, with search, an adjacent regex builder, real multi-select dismissal, and selected-record export. A filtered no-match state is distinct from a truly empty history.

## Failure modes

A notification that cannot be shown in the corner remains in local history. Loading or malformed persisted history is visible as unavailable and disables notification actions. Destructive bulk deletion requires a reviewable exact preview and the shared two-key/full-slider confirmation before records are removed.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[Dialog emoji toggle](dialog-emojis.md), [Status hub](status-hub.md), [Notifications](../app/notifications.md), [Platform feature index](README.md).
