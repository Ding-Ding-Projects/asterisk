# Built-in authenticator

An in-app TOTP authenticator for arbitrary accounts, including QR-code pairing, so a user does not need a separate phone app.

## Behavior

A dedicated authenticator surface is meant to accept pairing by QR code, pasted `otpauth://` URI, or manual entry, then show live rotating codes for every registered account, entirely offline and locally stored.

## Configuration

A new pairing would be confirmed by entering one live code back before the entry is considered armed, so a mis-scanned secret is caught immediately rather than at the next login.

## Current status

**Desktop application:** Not implemented. The desktop application has no authenticator surface of any kind.

**Documentation website:** Partial, local equivalent implemented and runtime proof unverified. Settings provides issuer, account, and manual Base32 registration, stores entries in browser storage, emits an `otpauth://totp/` pairing URI, and shows current and next TOTP codes generated with Web Crypto. QR rendering, platform credential-vault storage, and cloud sync remain unavailable on this static surface.

## Failure modes

A malformed or short Base32 secret is rejected before storage. Secrets are never included in ordinary export. Clock-skew diagnostics, QR image rendering, and server-side pairing confirmation remain unavailable in this static equivalent.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

This delegated source-only lane did not run tests, builds, browser checks, or captures. The site registry remains partial because QR rendering and platform vault storage are unavailable. The desktop application row remains not implemented.

## Suggested articles

[Per-element toy locks](per-element-toy-locks.md), [Unlock ladder](unlock-ladder.md), [Secrets](../agent/secrets.md), [Platform feature index](README.md).
