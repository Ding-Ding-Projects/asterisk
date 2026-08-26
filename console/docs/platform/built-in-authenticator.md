# Built-in authenticator

An in-app TOTP authenticator for arbitrary accounts, including QR-code pairing, so a user does not need a separate phone app.

## Behavior

A dedicated authenticator surface is meant to accept pairing by QR code, pasted `otpauth://` URI, or manual entry, then show live rotating codes for every registered account, entirely offline and locally stored.

## Configuration

A new pairing would be confirmed by entering one live code back before the entry is considered armed, so a mis-scanned secret is caught immediately rather than at the next login.

## Current status

**Desktop application:** Partial, and wired. There is no standalone authenticator holding arbitrary third-party accounts, so the description above is still where this is going rather than where it is. What exists is real and reachable: the per-element lock offers three methods that include a one-time code, and choosing one reaches `pairAuth` in `App.tsx`, which generates a twenty-byte secret from the Web Crypto random source, encodes it with `totp.ts`'s own base32, builds a standard `otpauth://totp/` pairing URI, and reveals both as copyable text. `lockNext` refuses to finish a one-time-code lock until pairing has actually happened, so the stored record carries the real secret rather than a placeholder, and `tryUnlock` verifies a real RFC 6238 code with one step of skew.

Two gaps are deliberate rather than pending. The box beside **Pair the built-in authenticator** is a decorative gradient in the compiled design with no bound slot for pixel data, so the secret is offered as text to copy by hand and the copy says so rather than implying something scannable. And there is no confirmation-code re-entry before the secret is treated as paired, because that method's wizard panel has no digit entry of its own and borrowing the PIN keypad would overwrite a real PIN. The secret lives in the same in-memory lock record the PIN and passphrase already did, which is not the operating-system credential vault this article's contract asks for.

**Documentation website:** Not implemented. The documentation website has no accounts of its own for an authenticator to pair with.

## Failure modes

A clock skewed far enough that generated codes would be rejected everywhere is meant to be reported to the user in plain words; nothing in this build detects that condition, so a skewed machine simply sees its codes refused with no explanation.

A code from an earlier step is refused rather than accepted late: verification allows one step of skew and no more.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. It renders inside the per-element lock wizard and the unlock dialog rather than on a surface of its own, so it inherits whatever those offer; none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

`tests/contracts/built-in-authenticator.test.mjs` holds the wiring: that `pairAuth` generates a real random secret and a real pairing URI, that both are revealed as copyable text with copy that does not imply a scannable image, that `lockNext` refuses an unpaired one-time-code lock, and that `tryUnlock` verifies through `totp.ts` rather than waving the factor through. `tests/ui/totp.test.tsx` covers the primitives themselves.

Beyond the source tree, the packaged application has been driven and photographed. `scripts/ui-drive/lock-evidence.mjs` pairs an authenticator through the real wizard and records what the running application did, in `release/evidence/windows-console/built-in-authenticator.json` and `release/captures/windows-console/built-in-authenticator.png`. Three things that run establishes rather than asserts: pairing added no resource entry of any kind, so the secret really is generated locally and no network call is made; a code computed independently by that script, with Node's own crypto, from the revealed secret is accepted by the running application; and a code from three steps back is refused first, so acceptance is time-based rather than any six digits.

The record deliberately carries the secret's length and the pairing URI's other parameters rather than the secret itself, and the capture is taken with the revealed secret dismissed, because a real credential must not travel in a committed file or a committed picture. `scripts/built-interaction-evidence.mjs` refuses any record carrying a base32 run long enough to be one, and `scripts/negative-built-interaction-evidence.mjs` plants exactly that leak to prove the refusal works.

## Suggested articles

[Per-element toy locks](per-element-toy-locks.md), [Unlock ladder](unlock-ladder.md), [Secrets](../agent/secrets.md), [Platform feature index](README.md).
