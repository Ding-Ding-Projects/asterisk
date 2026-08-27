# Non-blocking notifications

Toast-style status messages anchored in a screen corner, used for anything that only informs rather than something the user must decide on.

## Behavior

Informational, success, progress, and non-decision error messages are meant to appear as auto-dismissing (persistent for warnings and errors) toasts anchored to a screen corner, stacking without overlapping, reserving blocking dialogs strictly for confirmations and destructive-action gates.

## Configuration

Notifications would carry an optional title, body, and action links, and remain reviewable afterward in a notification history rather than vanishing without a trace.

## Current status

**Desktop application:** Partial. The desktop application shows a small number of transient status messages during build and deployment actions, but they are not consistently corner-anchored, do not stack predictably, and there is no notification history panel to review a dismissed one.

**Documentation website:** Implemented. Every top-level and composed article page uses the same corner notifications and persisted history, with search, an adjacent regex builder, real multi-select dismissal, and selected-record export. A filtered no-match state is distinct from a truly empty history.

## Failure modes

A notification that cannot be shown in the corner remains in local history. History is bounded to 30 entries, and destructive bulk dismissal requires a reviewable confirmation before records are removed.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[Dialog emoji toggle](dialog-emojis.md), [Status hub](status-hub.md), [Notifications](../app/notifications.md), [Platform feature index](README.md).
