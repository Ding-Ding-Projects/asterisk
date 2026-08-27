# Unlock ladder

A small set of optional games — dim sum trivia, arithmetic, whack-a-mole — a locked-out user can play to shorten a wait, never to bypass the credential itself.

## Behavior

Winning a rung is meant to clear only the current lockout wait, never the credential requirement itself, with a capped, server-graded budget of skippable waits so the ladder cannot be scripted into a bypass.

## Configuration

Every answer would be generated and graded independently of the browser, using a single-use token, so a client-side script cannot forge a win.

## Current status

**Desktop application:** Partial, and wired. `app/renderer/src/unlock-ladder.ts` is imported by `App.tsx` and reached from the per-element lock: three consecutive wrong PIN, passphrase or code attempts on one lock call `ladder.issue()`, and a dish or sums challenge is collected and graded through `ladder.grade()` using the unlock dialog's own keypad. Two rungs of the four are therefore real. The moles rung is declined rather than faked, because the compiled design draws no board for it, and the ladder falls back to waiting it out. The one remaining honesty about the desktop application is worth stating plainly: this per-element lock has no timed lockout of its own, so clearing a challenge here dismisses the ladder and bypasses no wait, because there is no wait to bypass.

**Documentation website:** Not implemented. The documentation website has no lockable credential for a ladder to apply to.

## Failure modes

A ladder submission that replays an already-consumed challenge token is rejected: `unlock-ladder.ts` marks each nonce single-use before grading it, so a wrong answer cannot be retried against the same question and a right one cannot be replayed. The minimum-duration check belongs to the timed moles round, which this build does not draw, so nothing here enforces it yet.

The rule the whole feature rests on is enforced in `finishLadderGrade`: a cleared challenge closes the ladder and says so, and never touches `state.locks` or the unlock dialog's own PIN, passphrase and code buffers. The credential is still required afterwards.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. It renders inside the unlock dialog and reuses that dialog's existing keypad and method line rather than introducing a surface of its own, so it inherits whatever that dialog offers; none of it is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

`tests/contracts/unlock-ladder.test.mjs` holds the wiring: that `unlock-ladder.ts` is imported and `issue()` is called after the third wrong attempt, that the moles rung falls back to waiting rather than faking a graded round, and that a cleared challenge never touches the lock record. `tests/ui/unlock-ladder.test.tsx` covers the module's own rules.

Beyond the source tree, the packaged application has been driven and photographed. `scripts/ui-drive/lock-evidence.mjs` locks a screen with a PIN, enters three wrong ones at the real keypad, and records what the running application did:
`release/evidence/windows-console/unlock-ladder.json` and `release/captures/windows-console/unlock-ladder.png`. That run observed the first two attempts drawing an ordinary refusal, the third offering a real dish challenge with its four choices, and the element still locked after the challenge was graded. `scripts/built-interaction-evidence.mjs` ties the record to the picture by digest, and `scripts/negative-built-interaction-evidence.mjs` proves that guard refuses a record whose capture has been replaced or whose observations have gone missing.

The three-per-hour skip budget, its refill and challenge expiry are module-level rules with no rendered surface, and are not exercised by that run.

## Suggested articles

[Per-element toy locks](per-element-toy-locks.md), [Built-in authenticator](built-in-authenticator.md), [Security](../system/security.md), [Platform feature index](README.md).
