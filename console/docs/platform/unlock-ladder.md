# Unlock ladder

A small set of optional games — dim sum trivia, arithmetic, whack-a-mole — a locked-out user can play to shorten a wait, never to bypass the credential itself.

## Behavior

Winning a rung is meant to clear only the current lockout wait, never the credential requirement itself, with a capped, server-graded budget of skippable waits so the ladder cannot be scripted into a bypass.

## Configuration

Every answer would be generated and graded independently of the browser, using a single-use token, so a client-side script cannot forge a win.

## Current status

**Desktop application:** Partial. A lockout timer exists after repeated wrong password attempts on the desktop application's launch gate, but there are no unlock-ladder games, no attempt-budget mechanic, and no server-side challenge grading.

**Documentation website:** Partial, local browser-storage equivalent implemented and runtime proof unverified. Settings provides a lockout-bound local waiting timer, dim-sum choices, ten arithmetic questions with a guaranteed single-digit first pair and double-digit later pairs, a timed mole round, a clock fallback, a rolling local budget, and School-mode sum entry. A correct answer clears only the local timer, never signs in, creates a cookie, or refunds attempts. Reload reissues a worker challenge for the persisted rung and round. This static page has no trusted server, no server nonce, and no server-side enforcement, so its local browser state must never be described as an authentication or abuse-control boundary.

## Failure modes

A submission before the local wait expires is disabled and rejected by the local handler. The local ladder is not an authentication factor and has no server nonce. Browser-storage state can be changed by a person controlling the browser, so the surface explicitly does not claim the trusted server-side protections that a hosted implementation would require.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

This delegated source-only lane did not run tests, builds, browser checks, or captures. The site registry remains partial because only the local equivalent is implemented. The desktop application row remains partial.

## Suggested articles

[Per-element toy locks](per-element-toy-locks.md), [Built-in authenticator](built-in-authenticator.md), [Security](../system/security.md), [Platform feature index](README.md).
