# Dim sum surprise

A small, un-opt-outable 10% chance at each startup of showing a randomly chosen dim sum dish's name and picture.

## Behavior

On roughly one in ten launches, a bundled local image of a dim sum dish is meant to appear briefly with its name in both English and Chinese, then dismiss itself automatically without blocking the interface from becoming usable.

## Configuration

There is deliberately no setting to turn this off; the only configurable aspect is that School mode, once it exists, would suppress it along with every other optional capability.

## Current status

**Desktop application:** Mounted but unverified. `SurfaceMounts` mounts the real `DimSumSurprise` component through a typed `dimSum.readCache()` bridge and a startup-context event seam. The component performs one secure ten-percent draw per launch, validates local cache bytes and digests, suppresses during first run, School mode, active errors, updates, and work, and never offers an opt-out.

**Documentation website:** Not implemented. A static documentation site has no startup event to attach this to.

## Failure modes

If the private cache is missing, refused, malformed, or fails digest validation, the renderer shows an honest unavailable diagnostic and no image. The renderer never fetches the public catalogue or invents a dish. A cache entry is selected only after the complete envelope and every local image digest are validated.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test, build, runtime interaction, or capture was run in this lane. The next verification must drive the built desktop through each suppression state, a missing cache, an invalid cache, a winning draw with a real private cache, reduced motion, auto-dismissal, and the no-opt-out surface.

## Suggested articles

[Dim-sum startup runtime cache](dim-sum-startup-runtime.md), [School mode](school-mode.md), [Non-blocking notifications](non-blocking-notifications.md), and [Platform feature index](README.md).
