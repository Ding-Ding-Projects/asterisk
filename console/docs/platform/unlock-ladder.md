# Unlock ladder

A small set of optional games, dim sum trivia, arithmetic, and whack-a-mole, lets a toy-lock user shorten a wait without bypassing the credential itself.

## Behavior

Winning a rung clears only the authoritative wait for the exact toy lock that failed verification. It never clears the credential requirement. The service owns the capped rolling budget, elapsed-duration check, nonce consumption, and one receipt per visible mole spawn.

## Configuration

Every challenge is generated and graded in the privileged local service with a single-use nonce. The explicit bounded guarantees are the three-per-hour budget, server elapsed-duration check, and one-hit-per-spawn receipt rule. This desktop scope does not claim a separate application-login lockout.

## Current status

**Desktop application:** Implemented-unverified for toy-lock waits. A failed verification creates an authoritative wait for the exact lock, the mounted surface receives the lock ID, and a successful grade clears only that wait. Built-artifact interaction remains unverified.

**Documentation website:** Not implemented. The documentation website has no lockable credential for a ladder to apply to.

## Failure modes

An early mole submission, a replayed nonce, an unknown receipt, a repeated spawn, an unavailable state store, and an exhausted rolling budget remain explicit outcomes. School mode is read from the privileged shared settings record, so the hidden dish rung is not selected from renderer input.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

Focused checks and built-artifact interaction remain unverified in this lane. The source contract covers authoritative wait creation, exact lock identity, server timing, single-use receipts, the rolling budget, and the clock-only fallback.

## Suggested articles

[Per-element toy locks](per-element-toy-locks.md), [Built-in authenticator](built-in-authenticator.md), [Security](../system/security.md), [Platform feature index](README.md).
