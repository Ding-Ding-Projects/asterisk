# Unlock ladder

A small set of optional games — dim sum trivia, arithmetic, whack-a-mole — a locked-out user can play to shorten a wait, never to bypass the credential itself.

## Behavior

Winning a rung is meant to clear only the current lockout wait, never the credential requirement itself, with a capped, server-graded budget of skippable waits so the ladder cannot be scripted into a bypass.

## Configuration

Every answer would be generated and graded independently of the browser, using a single-use token, so a client-side script cannot forge a win.

## Current status

**Desktop application:** Partial. A lockout timer exists after repeated wrong password attempts on the desktop application's launch gate, but there are no unlock-ladder games, no attempt-budget mechanic, and no server-side challenge grading.

**Documentation website:** Not implemented. The documentation website has no lockable credential for a ladder to apply to.

## Failure modes

A ladder submission that arrives before its round's own minimum duration has elapsed, or that replays an already-consumed challenge token, is meant to be rejected outright; there is no ladder implementation yet to enforce either check.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[Per-element toy locks](per-element-toy-locks.md), [Built-in authenticator](built-in-authenticator.md), [Security](../system/security.md), [Platform feature index](README.md).
