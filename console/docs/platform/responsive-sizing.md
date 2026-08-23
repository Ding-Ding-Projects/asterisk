# Responsive and high-scale sizing

No clipped, truncated, or overlapping text or controls at narrow window widths, high display scales, or with the longest localized strings.

## Behavior

Layouts are meant to hold correctly at supported window widths and at 100/125/150/200% display scale, including the longest strings a bilingual mode would produce.

## Configuration

This would be verified against the real built interface at each scale and width rather than assumed from a design file.

## Current status

**Desktop application:** Not implemented (unverified). The desktop application has not been verified across the full display-scale range; behavior at 150% and 200% scale, and at the narrowest supported window width, is unconfirmed.

**Documentation website:** Partial. The site is responsive down to roughly phone width using relative units and wrapping containers, but has not been verified at every display scale or against long bilingual strings, since bilingual mode does not yet exist.

## Failure modes

Clipped or overlapping text at an unverified scale is the specific failure this feature exists to prevent; until verification happens on the desktop application, that failure mode should be assumed possible rather than assumed absent.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[Accessibility](accessibility.md), [Material appearance system](material-appearance.md), [Platform feature index](README.md).
