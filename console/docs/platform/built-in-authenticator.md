# Built-in authenticator

An in-app TOTP authenticator for arbitrary accounts, so a user does not need a separate phone app.

## Behavior

A dedicated authenticator surface accepts an account by pasted `otpauth://` link, by reading a QR code, or by typing the secret and its parameters, then shows live rotating codes for every registered account, entirely offline and stored locally.

Two jobs share the word *pairing*, and they run in opposite directions. Keeping them apart is the whole reason this article is worth reading before changing anything here:

- **Pairing out.** An application that owns a one-time-code factor of its own generates a secret and draws a QR code for the user's phone to scan. The QR is the application handing its secret *outward*.
- **Pairing in.** The user brings a secret that some *other* service issued and keeps it in the authenticator. Here a QR code is something to *read*, not to draw, and the routes that matter are the ones that avoid retyping a base32 string by hand.

An authenticator surface is a pairing-in surface. Whether it also owes a QR *generator* depends entirely on whether the same product owns a one-time-code factor to hand out.

## Configuration

Each account carries its own issuer, account name, secret, hash algorithm, digit count, and period, and every one of those is stored as the account declared it rather than normalized to a default. An unsupported value is refused with the reason rather than replaced: a link naming an algorithm the surface cannot compute would otherwise be stored as SHA-1 and generate confident, permanently wrong codes with nothing on screen to say why they are refused.

Secrets are kept apart from ordinary settings, in their own storage location, so that no settings snapshot, history entry, or ordinary export can carry one by accident. The ordinary account export writes the account and its parameters with the word `omitted` where the secret would be; a separate, separately confirmed export exists for the secrets themselves, so that a user can move accounts elsewhere rather than lose them.

## Current status

**Desktop application:** Partial, and wired. There is no standalone authenticator holding arbitrary third-party accounts, so the description above is still where this is going rather than where it is. What exists is real and reachable: the per-element lock offers three methods that include a one-time code, and choosing one reaches `pairAuth` in `App.tsx`, which generates a twenty-byte secret from the Web Crypto random source, encodes it with `totp.ts`'s own base32, builds a standard `otpauth://totp/` pairing URI, and reveals both as copyable text. `lockNext` refuses to finish a one-time-code lock until pairing has actually happened, so the stored record carries the real secret rather than a placeholder, and `tryUnlock` verifies a real RFC 6238 code with one step of skew.

That is a pairing-*out* flow, which is why it wants a QR and does not have one. Two gaps are deliberate rather than pending. The box beside **Pair the built-in authenticator** is a decorative gradient in the compiled design with no bound slot for pixel data, so the secret is offered as text to copy by hand and the copy says so rather than implying something scannable. And there is no confirmation-code re-entry before the secret is treated as paired, because that method's wizard panel has no digit entry of its own and borrowing the PIN keypad would overwrite a real PIN. The secret lives in the same in-memory lock record the PIN and passphrase already did, which is not the operating-system credential vault this article's contract asks for.

**Documentation website:** Implemented, on 2026-08-26. The previous version of this line said "Not implemented. The documentation website has no accounts of its own for an authenticator to pair with", and that sentence was doing the work of an exemption while getting the direction backwards: an authenticator does not hold the *page's* accounts, it holds the reader's, and the page having no factor of its own is an argument about pairing out rather than about whether the feature belongs. It is quoted here rather than deleted, because the reasoning is the part worth not repeating.

The site carries a **Built-in authenticator** card in Settings holding the account list, its own search with an anchored regular-expression builder, the shared bulk-selection controls, and two dialogs: one to add an account and one for the secrets export. `site/app.js` implements RFC 6238 over RFC 4226 with Web Crypto, RFC 4648 base32, and `otpauth://` build and parse, ported from `app/renderer/src/totp.ts` so the two implementations cannot drift apart.

Registration accepts four routes: a pasted `otpauth://` link, a QR read from an image file, a QR read from the clipboard, and a QR read from the camera — plus manual entry of the secret and its parameters, which is not a fallback but the route somebody pairing an authenticator on the very device showing the QR has to use. The reading is done by the browser's own `BarcodeDetector`; several browsers ship none, and there each route is **removed** with the reason named rather than left as a button that cannot scan. A scan control that silently fails teaches the reader their code is unreadable rather than that their browser is.

Nothing on the site generates a QR code, and that is a decision rather than an omission. The site owns no one-time-code factor: no surface here is protected by one, so there is no secret of the site's to hand out, and a QR drawn here would pair a phone to a factor nobody can use. Writing a QR *encoder* would also mean carrying error-correction and block-structure tables from a specification this repository has no independent way to check itself against, and a QR that a phone cannot read is a pairing route that fails silently — worse than the absence it would be replacing.

## Failure modes

A clock skewed far enough that generated codes would be rejected everywhere is meant to be reported to the user in plain words. The desktop build detects nothing of the kind, so a skewed machine simply sees its codes refused with no explanation. The site cannot detect it either, and says so instead of leaving a silence: knowing the true time needs an outside source and this feature makes no request at all, so the card states plainly that a drifted clock is the first thing to check when every code from every account is refused.

A code from an earlier step is refused rather than accepted late: verification allows one step of skew and no more, on both surfaces.

A secret that cannot produce a code is refused at the moment it is entered rather than at the next sign-in. On the site an account is not stored until the page has actually computed a code from its secret, which catches a truncated or mistyped base32 string immediately. An optional cross-check goes further where the reader already holds the account elsewhere: type its current code and a mismatch refuses the save. Leaving that field empty saves the account and says, in the notification, exactly what was not checked.

A stored record that no longer produces a code — a corrupt secret, an algorithm a later build stopped supporting — is dropped on load and **counted**, and the count is shown. An account whose codes can never work is worse on screen than absent, because it looks like the service's fault.

Removing an account deletes its secret, and the confirmation says so. There is no recovery: the secret was never sent anywhere and nothing here can give it back.

## Accessibility and localization

On the site the code region announces on *change* rather than every second: the countdown is plain text updated silently, and a separate off-screen polite live region carries only "new code for …". A live region wrapped around the countdown would speak once a second forever, which is the fastest way to make a page unusable with a screen reader. The code is monospaced so grouped digits do not shift width as they change, the countdown is stated in seconds rather than as colour or a shrinking shape, every row control carries its own accessible name, and the row wraps rather than pushing its actions off the edge on a narrow screen. The card description ships all three language modes and both funny levels through `COPY.authenticatorDesc`; the voice moves with the slider while three facts never do — the secrets stay in the browser and nothing is sent anywhere, every code is computed on the page from the registered secret, and clearing the site's storage deletes them with no way back.

On the desktop it renders inside the per-element lock wizard and the unlock dialog rather than on a surface of its own, so it inherits whatever those offer; none of that is independently verified for this feature yet, and all its copy is fixed English.

## Verification

`tests/contracts/built-in-authenticator.test.mjs` holds the desktop wiring: that `pairAuth` generates a real random secret and a real pairing URI, that both are revealed as copyable text with copy that does not imply a scannable image, that `lockNext` refuses an unpaired one-time-code lock, and that `tryUnlock` verifies through `totp.ts` rather than waving the factor through. `tests/ui/totp.test.tsx` covers the primitives themselves.

`site/tests/contracts/built-in-authenticator.test.mjs` runs the site's real extracted source against a recording page and a clock the test holds still. The arithmetic is checked against an outside authority rather than against itself: the published RFC 6238 vectors run for SHA-1, SHA-256 and SHA-512, at eight digits, across six widely separated instants — the same table the desktop renderer's own test holds, so the two implementations are measured against one external standard rather than against each other. Beyond that it covers the skew window in both directions, base32 strictness, every refusal an `otpauth://` link can earn, the capability sentence with and without a detector, the row's countdown and its next-code peek (the code the row promises as next really is the one that arrives), that a code change is announced exactly once and a moving countdown never is, that no history entry, notification or ordinary export carries a secret, and that the secrets export writes nothing until two independent keys and a full-travel slider all agree.

`scripts/negative-built-in-authenticator-site.mjs` is what says that test would notice if it stopped: it plants one lie at a time, each of which must turn the contract red and then green again on restore.

Beyond the source tree, the packaged desktop application has been driven and photographed. `scripts/ui-drive/lock-evidence.mjs` pairs an authenticator through the real wizard and records what the running application did, in `release/evidence/windows-console/built-in-authenticator.json` and `release/captures/windows-console/built-in-authenticator.png`. Three things that run establishes rather than asserts: pairing added no resource entry of any kind, so the secret really is generated locally and no network call is made; a code computed independently by that script, with Node's own crypto, from the revealed secret is accepted by the running application; and a code from three steps back is refused first, so acceptance is time-based rather than any six digits.

The record deliberately carries the secret's length and the pairing URI's other parameters rather than the secret itself, and the capture is taken with the revealed secret dismissed, because a real credential must not travel in a committed file or a committed picture. `scripts/built-interaction-evidence.mjs` refuses any record carrying a base32 run long enough to be one, and `scripts/negative-built-interaction-evidence.mjs` plants exactly that leak to prove the refusal works.

Nothing on the site has been opened in a browser for this feature. No real `BarcodeDetector` has decoded a real photograph here, no camera stream has been started, and no clipboard image has been read: those three routes are proved against a detector the test supplies and against the honest absence path, and no further. The pages-site row therefore stays `unverified` in `inventories/surface-completeness.json` — implementation, documentation, localized copy and a local check all exist, and the two artifacts that need a running program do not.

## Suggested articles

[Per-element toy locks](per-element-toy-locks.md), [Unlock ladder](unlock-ladder.md), [Secrets](../agent/secrets.md), [Complete exports](complete-exports.md), [Platform feature index](README.md).
