# Long-operation progress reporting

A dialog that starts a slow operation shows that operation's real progress inline, with the triggering control disabled against duplicate submission.

## Behavior

Long-running actions, such as provisioning a server, are meant to show real progress inside the originating dialog rather than a bare spinner, and to disable both the visible submit control and the underlying handler against a second, duplicate trigger.

## Configuration

Where an operation includes a slow optional phase, the user would be able to decline it and be told plainly what declining leaves undone.

## Current status

**Desktop application:** Partial. Long actions show a generic busy indicator rather than real progress, and only the visible button — not confirmed keyboard re-entry — is guarded against duplicate submission.

**Documentation website:** Implemented at `history.html` for redacted export preparation. The bounded local operation reports progress, disables re-entry, and supports cancellation before writing the export.

## Failure modes

A second, keyboard-triggered submission arriving while an operation is already in flight is meant to be refused by the handler itself, not only by the disabled button; this has not been verified as blocked on the desktop application.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[Browser-extension download capture surfaces](browser-extension-download-surfaces.md), [Platform feature index](README.md).
