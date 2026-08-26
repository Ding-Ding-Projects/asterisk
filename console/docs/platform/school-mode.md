# School mode

A single, renamable, shared switch that forces plain English presentation and hides playful or optional capabilities across every installed surface at once.

## Behavior

One shared on/off state, stored outside any individual application, is meant to be read live by every surface: turning it on anywhere would turn it on everywhere without a restart, forcing English presentation and making every optional or playful capability behave as though uninstalled.

## Configuration

Turning the mode back off is meant to require a locally verified credential; the mode's own label is renamable, and every surface would respect the chosen name rather than the shipped default.

## Current status

**Desktop application:** Partial. The shared switch, credential-gated deactivation, and rename all exist and are wired: `school-mode.ts`'s `activateSchoolMode`, `deactivateSchoolMode`, `hasCredential`, `renameSchoolMode`, `schoolModeActive` and `setCredential` are all imported and called by `App.tsx`, backed by 32 tests including one that asserts no output leaks the shipped name after a rename. Turning the mode on and off, renaming it, and setting its credential are all real. What is not wired is the mode's actual point: `school-mode.ts` also exports `capabilityVisible()`, `filterVisibleCapabilities()`, `effectiveLanguageMode()` and `effectiveFunnyLevel()` -- the functions that would force English and hide optional capabilities -- and none of them are called anywhere in the mounted application. `schoolModeActive()` itself is read only to build the status control's text. Activating School mode today changes what one status line says and nothing else; it does not force English, does not hide any capability, and no other feature (language mode, funny levels, or any gated control) checks it.

**Documentation website:** Implemented, and implemented as the whole feature rather than as a switch: turning it on really does force plain English and really does take the covered capabilities off the page. The section below describes it in full, including the two places its behaviour deliberately differs from the desktop application's and the reasons for both.

## The pages-site

The card lives on `settings.html` and is built in `site/app.js` between `const SCHOOL_KEY=` and `const DEFAULT_FAVICON=`; its styles are in `site/styles.css`.

**What it removes, and how.** While it is on, four containers leave the document: the language card (which carries the language mode and both funny selects), the personal-vocabulary card, the narrated-language choice and the Cantonese voice picker. They are *removed*, not disabled and not hidden -- a disabled control is still a control somebody can see and ask about, and the canon asks for the capability to be absent rather than refused. Each removed node is held in `schoolRetained` with an empty comment standing in its place, so turning the mode off puts back the same node, in the same position, with the handlers bound to it at load still attached. Nothing behind those controls is written while the mode is on, so a chosen language, a chosen funny level and an uploaded personal-vocabulary file all survive and return.

Two further effects are not containers and so are handled in the code paths themselves. `copyText()` renders the plainest English variant, which is the wording this page shipped with, so the funny levels behave as though they were not installed rather than merely being unreachable. And `applyVocabularyText()` returns its input untouched, which matters because the uploaded file is deliberately *kept*: a mode that removed only the upload control would go on substituting from the cached file behind it.

**The value that turns it off is not stored.** What is written to `ding-pbx-pages-school-v1` is a random 16-byte salt and the SHA-256 digest of salt-and-value. A browser that gives the page no cryptographic digest -- an insecure context such as a `file://` load -- refuses to arm at all and says why, rather than falling back to keeping the value under a friendlier name.

**Where the record lives is what makes the lock a lock.** It is in a storage key of its own, beside the local history's, so `performSettingsReset()` and `restoreHistoryEntry()` -- both of which write `state` -- cannot reach it. A "Reset settings" button that opened the mode would be a one-click way around it rather than a reset, and the reset dialog says outright that it does not.

**The name.** It ships as `School mode` and is the reader's to change. Live copy always renders the chosen name: the heading, the status line, the removal sentence, the recovery text and the card's own search keywords are all written at run time, so a renamed card is still findable by the name it shows. Persisted text deliberately names the mode nowhere at all -- not in a local-history entry, not in a stored notification -- because history here is append-only and a rename cannot rewrite it, so an entry written before a rename would sit in the record naming the name that was just replaced, which for the first rename is exactly the shipped name the rename existed to remove.

**One switch, across every tab.** The record is watched through the browser's `storage` event, which fires in every other tab of this origin, so turning the mode on in one tab applies it in the rest live rather than at their next load. A `storage` event with a null key is the whole store being cleared, which is the documented recovery happening somewhere else, and it is handled the same way.

**Two deliberate differences from the canon, recorded rather than left as gaps.**

- *No attempt lockout and no waiting period.* A wrong value is counted on screen and recorded in the local history, and nothing else happens. The canon asks for rate-limited feedback, and a timed lockout here would make this a surface that can lock somebody out on a clock -- which would in turn require the unlock ladder, a feature this site has not got. Rather than ship a wait with no ladder behind it, this surface ships no wait: the count is the feedback, and the card says plainly that nothing can lock you out on a clock.
- *The per-launch startup surprise cannot be suppressed here because this site has not got one.* It is recorded in `SCHOOL_ABSENT_HERE` rather than silently skipped, and the contract test re-derives that absence from the real source every run, so the day somebody builds one the pin stops being true and says so instead of the mode quietly failing to hide it.

**One limitation worth knowing.** The card's heading and search keywords are shipped in `settings.html` carrying the default name and are overwritten by the first render. A renamed card can therefore show the shipped name for the moment between the markup parsing and the script running. The alternative -- shipping the heading empty -- would leave a blank heading for anybody whose script never runs, which is worse.

**Recovery.** The value cannot be recovered, by anybody, because it was never stored. Clearing this site's storage in the browser removes `ding-pbx-pages-school-v1` along with every other local setting the page keeps, and the switch goes with it. This is a self-imposed speed bump rather than a security boundary, it protects nothing from anyone else with the computer, and the card says so in those words.

## Failure modes

If the shared state store were unreachable, the intended behavior is to leave the previous known mode in effect and say so, rather than silently defaulting to unlocked. The desktop implementation has not been exercised against an unreachable store, so this fallback is untested rather than absent.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. The desktop controls (switch, rename field, credential field, unlock switch, status readout) are ordinary native controls reachable by keyboard, but no dedicated accessibility audit has been performed. Copy for this feature is currently fixed English on both surfaces.

## Verification

On the website, `site/tests/contracts/school-mode.test.mjs` runs the real extracted source over a recording DOM, a fake storage and Node's own Web Crypto: it arms and unlocks the mode, searches the stored bytes for the value to prove it is not there, checks that every covered container leaves the document and comes back as the same node in the same position, that copy renders plain English while the stored Cantonese choice survives, that no persisted string names the mode after a rename, and that neither the reset nor a history restore can reach the record. `scripts/negative-school-mode-site.mjs` plants one break at a time and requires each to turn that file red and green again on restore. Nothing there has been driven in a real browser: no `crypto.subtle` in a page, no real `storage` event between two real tabs, and no capture of the card.

On the desktop, `tests/ui/school-mode.test.tsx` and `tests/ui/credential-field.test.tsx` (32 tests total) exercise the switch, rename, and credential logic directly, not its lack of effect on the rest of the app. Verifying the capability-hiding gap means activating School mode in the built application and confirming that the language mode, funny levels, and every other optional or playful control remain exactly as visible and functional as before -- they currently do, which is the defect this article now records rather than hides.

## Suggested articles

[Language modes](language-modes.md), [Funny-level sliders](funny-levels.md), [Dim sum surprise](dim-sum-surprise.md), [Customise everything](../app/customise.md), [Platform feature index](README.md).
