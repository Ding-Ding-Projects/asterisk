# Dim sum surprise

A small, un-opt-outable 10% chance at each startup of showing a randomly chosen dim sum dish's name and picture.

## Behavior

On roughly one in ten launches, a bundled local image of a dim sum dish is meant to appear briefly with its name in both English and Chinese, then dismiss itself automatically without blocking the interface from becoming usable.

## Configuration

There is deliberately no setting to turn this off; the only configurable aspect is that School mode, once it exists, would suppress it along with every other optional capability.

## Current status

**Desktop application:** Partial. `dim-sum-surprise.ts` implements the whole draw as specified and as tested: a one-in-ten chance per launch with an exclusive probability boundary, exactly one draw per launch, suppression during a first run, an error path, an update, a mid-task flow and quiet hours, bilingual dish names with alt text, bundled local images, and a deliberate absence of an off switch (`storedPreferenceIsIgnored()` asserts that as a checkable fact). None of it runs: nothing in the mounted application calls this module. A grep for its two exports (`surpriseFor`, `storedPreferenceIsIgnored`) across `App.tsx`, `main.tsx`, `PbxAdminApp.tsx` and `PbxAdminIntegratedApp.tsx` finds no reference outside the module and its own test. Every real launch of the built application currently has a zero, not a one-in-ten, chance of showing a dish.

**Documentation website:** Not implemented. A static documentation site has no startup event to attach this to.

## Failure modes

If the bundled image set were ever missing an entry, the intended behavior is to skip that draw rather than show a broken image; the desktop module implements this, but since nothing calls the module, the behavior has never run outside its own test.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. The module's tests cover alt text for screen-reader users, but the surface itself is never mounted, so there is nothing in the running application to check focus order or motion behavior against yet.

## Verification

`tests/ui/dim-sum-surprise.test.tsx` exercises the draw logic, suppression rules, and the no-off-switch guarantee directly, in isolation from the running application. Verifying the wiring gap means launching the built desktop application repeatedly and confirming no dish ever appears -- which is the current, correct result, and the defect this article records.

## Suggested articles

[School mode](school-mode.md), [Platform feature index](README.md).
