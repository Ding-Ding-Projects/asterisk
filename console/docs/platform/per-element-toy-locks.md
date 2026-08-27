# Per-element toy locks

A self-imposed, for-fun password or one-time-code lock a user can put on any individual control or setting, purely as a personal speed bump.

## Behavior

Any rendered element is meant to be lockable behind a password or a TOTP code entered independently for that one element, with its own credential, unlock duration, and recovery path.

## Configuration

This is explicitly a user-experience convenience, not a security boundary: it would never claim to protect data from anyone else with access to the device, and recovery is by deleting the application's local data folder.

## Current status

**Desktop application:** Partial, and corrected 2026-08-25. Right-clicking any element offers a real, wired "Lock this element..." context-menu command (shortcut hint shown as ^L) that opens a per-element lock-creation wizard with its own credential, independent of every other lock. The wizard genuinely offers six methods, including three one-time-code combinations (PIN + one-time code, Password + one-time code, Password + PIN + one-time code), and a locked element's own unlock dialog verifies a real RFC 6238 code alongside PIN and password. The gap that remains: the PIN, password, and TOTP secret are all stored in plain React component state rather than the operating system's credential vault, so a credential set here lives in memory no more carefully than an ordinary setting does.

**Documentation website:** Implemented 2026-08-26, and the sentence this replaces is worth quoting because it had the direction backwards rather than being merely out of date: it read "Not implemented. The documentation website has no user-editable elements to lock." The website is almost nothing but user-editable elements — a theme picker, two funny-level sliders, an accent colour, a text-size range, a display name, a personal-vocabulary upload, a reset gate. The reason nothing was locked was that no lock existed, not that there was nothing to lock.

Right-clicking any control on any page offers a real "Lock this element…" command (Alt+Shift+K), which opens an anchored, non-modal wizard beside that element. The wizard offers all six canonical methods, including the three one-time-code combinations, and one unlock lasts either for a single use, for a chosen number of minutes, or until the page is closed. All three are held in memory only, so reloading the page relocks everything: locked-on-launch is a property of the code here rather than a fourth option to remember.

A locked element is refused rather than disabled. `disabled` would stop the element receiving the very click that opens its own unlock prompt, so the refusal is a capture-phase interception across `pointerdown`, `mousedown`, `click`, `keydown`, `input`, `change`, `dragstart` and `paste`, plus a second refusal inside the right-click menu so an action cannot be reached from the element's own menu instead. `contextmenu` is deliberately not refused, because that menu is how a lock is managed.

PINs and passwords are kept as salted SHA-256 digests, each lock with its own salt, so the same value under two locks produces two different stored digests and one value never opens another lock. A one-time-code factor is different in kind and the difference is stated rather than hidden: a shared secret cannot be hashed, because the page has to compute codes from it, so that one is kept in this browser as the reader supplied it — in its own storage key, outside the settings object every export and history entry serializes. The settings card lists every lock with its own search and anchored regular-expression builder, bulk selection, an export whose every row carries the word `omitted` where a credential would be, and a removal that refuses a lock which has not been opened and reports the skipped ones by reason. Recovery is clearing this site's storage in the browser, named in full on the wizard, on the unlock prompt and on the card.

**Not verified in a browser.** Nothing here has been opened in a real browser: no real `crypto.subtle` has produced a digest on a page served over HTTP, no real keypad has been tapped, and no screen reader has announced a locked control. It is proved against its own extracted source running on a recording DOM, with Node's own cryptography, and no further.

## Failure modes

A forgotten per-element credential is recoverable only by deleting the local application-data folder, never by a support process (see [Support Tickets recovery flow](support-tickets.md), which points there on purpose).

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. Copy for this feature is available in every supported language mode.

## Verification

`console/tests/contracts/per-element-toy-locks.test.mjs` pins the wizard's TOTP-including methods, the context-menu command, and the plain-component-state credential gap against the source directly. Verifying it by hand means opening the desktop application, right-clicking any element, and walking the wizard.

## Suggested articles

[Support Tickets recovery flow](support-tickets.md), [Unlock ladder](unlock-ladder.md), [Built-in authenticator](built-in-authenticator.md), [Security](../system/security.md), [Platform feature index](README.md).
