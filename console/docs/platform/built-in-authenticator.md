# Built-in authenticator

An in-app TOTP authenticator for arbitrary accounts, including QR-code pairing, so a user does not need a separate phone app.

## Behavior

A dedicated authenticator surface is meant to accept pairing by QR code, pasted `otpauth://` URI, or manual entry, then show live rotating codes for every registered account, entirely offline and locally stored.

## Configuration

A new pairing would be confirmed by entering one live code back before the entry is considered armed, so a mis-scanned secret is caught immediately rather than at the next login.

## Current status

**Desktop application:** Not implemented. The desktop application has no authenticator surface of any kind.

**Documentation website:** Not implemented. The documentation website has no accounts of its own for an authenticator to pair with.

## Failure modes

A clock skewed far enough that generated codes would be rejected everywhere is meant to be reported to the user in plain words; there is no authenticator yet to encounter that condition.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[Per-element toy locks](per-element-toy-locks.md), [Unlock ladder](unlock-ladder.md), [Secrets](../agent/secrets.md), [Platform feature index](README.md).
