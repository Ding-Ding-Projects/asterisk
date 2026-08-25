# School mode

A single, renamable, shared switch that forces plain English presentation and hides playful or optional capabilities across every installed surface at once.

## Behavior

One shared on/off state, stored outside any individual application, is meant to be read live by every surface: turning it on anywhere would turn it on everywhere without a restart, forcing English presentation and making every optional or playful capability behave as though uninstalled.

## Configuration

Turning the mode back off is meant to require a locally verified credential; the mode's own label is renamable, and every surface would respect the chosen name rather than the shipped default.

## Current status

**Desktop application:** Partial. The shared switch, credential-gated deactivation, and rename all exist and are wired: `school-mode.ts`'s `activateSchoolMode`, `deactivateSchoolMode`, `hasCredential`, `renameSchoolMode`, `schoolModeActive` and `setCredential` are all imported and called by `App.tsx`, backed by 32 tests including one that asserts no output leaks the shipped name after a rename. Turning the mode on and off, renaming it, and setting its credential are all real. What is not wired is the mode's actual point: `school-mode.ts` also exports `capabilityVisible()`, `filterVisibleCapabilities()`, `effectiveLanguageMode()` and `effectiveFunnyLevel()` -- the functions that would force English and hide optional capabilities -- and none of them are called anywhere in the mounted application. `schoolModeActive()` itself is read only to build the status control's text. Activating School mode today changes what one status line says and nothing else; it does not force English, does not hide any capability, and no other feature (language mode, funny levels, or any gated control) checks it.

**Documentation website:** Not implemented. No shared switch, rename path, or unlock credential exists anywhere in `site/app.js` or the settings page.

## Failure modes

If the shared state store were unreachable, the intended behavior is to leave the previous known mode in effect and say so, rather than silently defaulting to unlocked. The desktop implementation has not been exercised against an unreachable store, so this fallback is untested rather than absent.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. The desktop controls (switch, rename field, credential field, unlock switch, status readout) are ordinary native controls reachable by keyboard, but no dedicated accessibility audit has been performed. Copy for this feature is currently fixed English on both surfaces.

## Verification

`tests/ui/school-mode.test.tsx` and `tests/ui/credential-field.test.tsx` (32 tests total) exercise the switch, rename, and credential logic directly, not its lack of effect on the rest of the app. Verifying the capability-hiding gap means activating School mode in the built application and confirming that the language mode, funny levels, and every other optional or playful control remain exactly as visible and functional as before -- they currently do, which is the defect this article now records rather than hides.

## Suggested articles

[Language modes](language-modes.md), [Funny-level sliders](funny-levels.md), [Dim sum surprise](dim-sum-surprise.md), [Customise everything](../app/customise.md), [Platform feature index](README.md).
