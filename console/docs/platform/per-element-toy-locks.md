# Per-element toy locks

A self-imposed, for-fun password or one-time-code lock a user can put on any individual control or setting, purely as a personal speed bump.

## Behavior

Any rendered element is meant to be lockable behind a password or a TOTP code entered independently for that one element, with its own credential, unlock duration, and recovery path.

## Configuration

This is explicitly a user-experience convenience, not a security boundary: it would never claim to protect data from anyone else with access to the device, and recovery is by deleting the application's local data folder.

## Current status

**Desktop application:** Partial, and corrected 2026-08-25. Right-clicking any element offers a real, wired "Lock this element..." context-menu command (shortcut hint shown as ^L) that opens a per-element lock-creation wizard with its own credential, independent of every other lock. The wizard genuinely offers six methods, including three one-time-code combinations (PIN + one-time code, Password + one-time code, Password + PIN + one-time code), and a locked element's own unlock dialog verifies a real RFC 6238 code alongside PIN and password. The gap that remains: the PIN, password, and TOTP secret are all stored in plain React component state rather than the operating system's credential vault, so a credential set here lives in memory no more carefully than an ordinary setting does.

**Documentation website:** Not implemented. The documentation website has no user-editable elements to lock.

## Failure modes

A forgotten per-element credential is recoverable only by deleting the local application-data folder, never by a support process (see [Support Tickets recovery flow](support-tickets.md), which points there on purpose).

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. Copy for this feature is available in every supported language mode.

## Verification

`console/tests/contracts/per-element-toy-locks.test.mjs` pins the wizard's TOTP-including methods, the context-menu command, and the plain-component-state credential gap against the source directly. Verifying it by hand means opening the desktop application, right-clicking any element, and walking the wizard.

## Suggested articles

[Support Tickets recovery flow](support-tickets.md), [Unlock ladder](unlock-ladder.md), [Built-in authenticator](built-in-authenticator.md), [Security](../system/security.md), [Platform feature index](README.md).
