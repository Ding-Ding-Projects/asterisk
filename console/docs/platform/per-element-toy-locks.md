# Per-element toy locks

A self-imposed, for-fun password or one-time-code lock a user can put on any individual control or setting, purely as a personal speed bump.

## Behavior

Any rendered element is meant to be lockable behind a password or a TOTP code entered independently for that one element, with its own credential, unlock duration, and recovery path.

## Configuration

This is explicitly a user-experience convenience, not a security boundary: it would never claim to protect data from anyone else with access to the device, and recovery is by deleting the application's local data folder.

## Current status

**Desktop application:** Partial. A single application-wide password lock exists on launch, which is a coarser mechanism than a per-element lock; there is no per-control locking, no independent per-element credentials, and no lock context-menu entry anywhere.

**Documentation website:** Not implemented. The documentation website has no user-editable elements to lock.

## Failure modes

A forgotten per-element credential is meant to be recoverable only by deleting the local application-data folder, never by a support process; the existing whole-application launch lock does not yet document or implement that specific recovery path either.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[Support Tickets recovery flow](support-tickets.md), [Unlock ladder](unlock-ladder.md), [Built-in authenticator](built-in-authenticator.md), [Security](../system/security.md), [Platform feature index](README.md).
