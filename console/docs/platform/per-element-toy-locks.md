# Per-element toy locks

A self-imposed, for-fun password or one-time-code lock a user can put on any individual control or setting, purely as a personal speed bump.

## Behavior

The site provides a local browser equivalent for rendered route links, controls, panels, and other context-menu targets. Each selected target gets its own toy-lock record. Lock and appearance actions are available from the context menu and from the keyboard context-menu path (`Shift+F10` or the Context Menu key), including for inputs, selects, textareas, and editable content. Normal editing is not intercepted until an appearance or lock action is chosen.

## Configuration

This is explicitly a user-experience convenience, not a security boundary. The site stores only a SHA-256 digest for each local toy-lock value, never the value itself. Appearance edits, appearance resets, and lock removal require the current value when that target is locked. Clearing this site's browser storage is the documented recovery route and is not presented as data protection.

## Current status

**Desktop application:** Partial. A single application-wide password lock exists on launch, which is a coarser mechanism than a per-element lock; there is no per-control locking, no independent per-element credentials, and no lock context-menu entry anywhere.

**Documentation website:** Local equivalent implemented, runtime proof unverified. Context-menu actions identify the exact target, use stable `data-element-id` values rather than DOM position selectors, persist appearance and lock state in bounded browser storage, and reapply it after dynamic rendering. The site does not implement TOTP, unlock durations, or server-backed credential recovery.

## Failure modes

A forgotten site toy-lock value is recoverable by clearing this site's browser storage. A wrong value leaves the target locked, and removing a lock without the current value is refused. Credential digests are omitted from exports.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

This delegated source-only lane did not run tests, builds, browser checks, or captures. The site registry remains `implemented-unverified` for this local equivalent. The desktop application row remains partial.

## Suggested articles

[Support Tickets recovery flow](support-tickets.md), [Unlock ladder](unlock-ladder.md), [Built-in authenticator](built-in-authenticator.md), [Security](../system/security.md), [Platform feature index](README.md).
