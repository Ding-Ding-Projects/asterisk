# Accessibility

Keyboard reachability, visible focus, correct semantic roles, sufficient contrast, and screen-reader-sensible structure across the whole product.

## Behavior

Every interactive element is meant to be reachable by keyboard, carry a visible focus indicator, expose the correct accessible role, name, and state, hold sufficient contrast, and respect a reduced-motion preference.

## Configuration

This is treated as a completion blocker rather than later polish: a control that looks interactive but cannot be reached or announced correctly is considered unfinished, not merely rough.

## Current status

**Desktop application:** Not implemented. The desktop application's rendered interface currently contains no accessibility attributes at all — no ARIA roles, no accessible names distinct from visible labels, and no verified keyboard focus order. There are also no automated tests covering the desktop application's generic feature surface. This is stated directly rather than left for a reader to assume.

**Documentation website:** Partial. The documentation website has some baseline structure — heading hierarchy, a skip-to-content link, and semantic landmarks — but has not been audited for contrast, full keyboard operability, or screen-reader correctness across every page.

## Failure modes

A control that cannot currently be reached by keyboard or announced correctly to a screen reader is, today, a real and known gap rather than a hypothetical failure mode; closing it is unstarted work on the desktop application and partial work on the site.

## Accessibility and localization

The desktop application's interface currently contains no accessibility attributes at all, and there are no automated tests covering the desktop application's generic feature surface. This is stated here directly so a reader does not have to assume it. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[Responsive and high-scale sizing](responsive-sizing.md), [Material appearance system](material-appearance.md), [Security](../system/security.md), [Platform feature index](README.md).
