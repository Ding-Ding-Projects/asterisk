# In-context failure recovery

When an operation fails for a reason the user cannot diagnose alone, the recovery action is offered right at the control that failed, not buried in a menu.

## Behavior

A failed operation is meant to surface its recovery route — retry, re-authenticate, or an equivalent next step — directly beside the control that failed, naming the real cause rather than a generic error.

## Configuration

Where the underlying cause is a refused credential or missing permission, the recovery route would offer re-authentication directly rather than sending the user hunting for a sign-in screen.

## Current status

**Desktop application:** Partial. The desktop application shows error messages for failed actions but does not consistently offer an inline recovery action at the point of failure; some errors require navigating elsewhere to retry.

**Documentation website:** Not implemented. The documentation website performs no operations that can fail in this sense.

## Failure modes

An error shown without a concrete next step is exactly the gap this feature exists to close; it is the current state for at least some failures on the desktop application today.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[Long-operation progress reporting](long-operation-progress.md), [Platform feature index](README.md).
