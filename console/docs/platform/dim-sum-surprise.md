# Dim sum surprise

A small, un-opt-outable 10% chance at each startup of showing a randomly chosen dim sum dish's name and picture.

## Behavior

On roughly one in ten launches, a bundled local image of a dim sum dish is meant to appear briefly with its name in both English and Chinese, then dismiss itself automatically without blocking the interface from becoming usable.

## Configuration

There is deliberately no setting to turn this off; the only configurable aspect is that School mode, once it exists, would suppress it along with every other optional capability.

## Current status

**Desktop application:** Not implemented. No such surprise, no bundled dish imagery, and no random-draw logic exist in the product.

**Documentation website:** Not implemented. A static documentation site has no startup event to attach this to.

## Failure modes

If the bundled image set were ever missing an entry, the intended behavior is to skip that draw rather than show a broken image; nothing implements the draw today.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[School mode](school-mode.md), [Platform feature index](README.md).
