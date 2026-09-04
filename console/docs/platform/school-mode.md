# School mode

A renamable, credential-gated switch that forces plain English presentation and makes every Cantonese, bilingual, funny-level, personal-vocabulary and dim-sum capability behave as though it were not installed.

## Behavior

Turning the mode on needs nothing but the switch. Turning it off needs a locally verified credential. That asymmetry is deliberate: a mode meant to make a shared machine boring for a while should be easy to start and require a real answer to stop.

While it is on, the desktop console:

- renders English, whatever language was chosen;
- renders every message at funny level 1, whatever the two sliders were set to;
- applies no personal-vocabulary replacement, so the shipped wording shows;
- speaks English if the narrator is on, whatever narrated language was chosen;
- draws no dim sum startup surprise;
- **omits** -- does not disable, does not grey out -- the two funny-level sliders, the three personal-vocabulary controls, the Cantonese narration voice picker, the non-English options of both the written and the narrated language pickers, the group heading left over any of those once they are gone, and the Vocabulary destination from the navigation rail, the command palette and any open tab. If that destination is the one on screen, the console moves off it.

A control that is present and does nothing is worse than one that was never rendered: it invites a tap, and then explains itself in front of whoever the mode was switched on for. So the returned lists are shorter rather than flagged, and `tests/ui/school-mode-consumed.test.tsx` asserts the controls are genuinely gone from the rendered markup rather than trusting a filter's word for it.

**Nothing is destroyed and nothing is written.** Every stored choice is read and returned unchanged, so turning the mode off is not a restore -- there was never anything to restore. The language you chose, both funny levels, the narrated language and the vocabulary file you uploaded are all exactly where they were, and come back the moment the mode is off.

**The mode's own controls are never hidden.** Somebody who cannot find the switch cannot turn it off, so the switch, its rename field, its credential field, its unlock route and its status line all stay on screen and explain themselves using the chosen name.

## Configuration

The mode's label is renamable, and after a rename no surface shows the shipped `School mode` -- including the settings group heading the design authors with that literal text, which is rewritten from the chosen name.

The unlock credential is a PIN or a password. It is typed into a bound field, taken and blanked in the same step, and only a digest of it is stored, so it never sits in component state where an export, a settings surface or a screenshot could reach it. Nothing reports its length or composition; a rejected attempt does not reveal whether a credential is set at all.

## Current status

**Desktop application:** Partial, and the part that is missing is named exactly below rather than left as a general caveat.

What is real and wired: the switch, the rename, the credential gate, forced English, forced funny level 1, the withheld vocabulary, the English-only narrator, the refused dim sum surprise, every control and destination omission listed above, and the retention of every stored choice. `app/renderer/src/school-mode.ts` makes each decision and `app/renderer/src/school-mode-view.ts` consumes it at the exact seam the running console already reads. 47 tests in `tests/ui/school-mode-consumed.test.tsx` beside the 32 in `tests/ui/school-mode.test.tsx`.

**What is still missing: the one shared record.** The canonical contract calls for a single state shared across every installed application, read live, so that turning the mode on anywhere turns it on everywhere without a restart. This console stores it in its own durable-storage file under its own userData path. It is therefore per-application, and there is no cross-process watch: a second application would not see it, and a change made elsewhere would not reach a console that is already running.

**Documentation website:** Not implemented. No switch, rename path or unlock credential exists in `site/app.js` or on the settings page. The site's own registry says `absent` and this article does not describe the console's switch as though the site had one.

## Failure modes

The credential store is the same durable-storage file as the rest of the console's settings, so an unreadable or absent one reads as "no credential set" -- and `deactivateSchoolMode` fails closed on that rather than letting the switch through, exactly as any other lock in this console does. There being nothing to check against is not an excuse to allow the change.

This is a convenience lock, not a security boundary, and the console says so in the credential control's own text rather than in a comment. Deleting the shared local application-data record turns the mode off and forgets both the chosen name and the credential. That is the documented reset route, not a defect.

A capability added to `HIDDEN_CAPABILITIES` with nothing consuming it fails `school-mode-consumed` rather than shipping as another switch that decides correctly and reaches nothing -- which is the exact state this feature was in until 2026-08-26.

## Accessibility and localization

The controls are ordinary native controls, keyboard-reachable with visible focus. Omission rather than disabling is the accessible behaviour as well as the contractual one: a removed control is absent from the tab order and from the accessibility tree, where a disabled one is still announced.

Copy for this feature is fixed English on both surfaces. That is a real gap on the console, recorded rather than glossed: the mode forces English while it is on, so its own copy is only ever read in English by somebody who has it on -- but the switch, its description and its status line are also read by somebody deciding whether to turn it on, and those should be available in all three language modes.

## Verification

`tests/ui/school-mode.test.tsx` (32 tests) exercises the decisions. `tests/ui/school-mode-consumed.test.tsx` (47 tests) exercises the consumption, and deliberately asserts nothing about the decisions: it renders the real `App` with the mode genuinely on in its own storage and reads the markup back, operates the real `school_mode`, `school_credential` and `school_unlock` controls through the shell's own `setVal`, and checks every filter against the compiled design rather than against fixtures -- because a filter aimed at a control id the design does not have hides nothing and looks identical from inside a fixture.

`scripts/negative-school-mode-consumed.mjs` plants 31 breaks one at a time, each of which turns that test red and green again on restore. Three of them stayed green on the first run and each exposed a real gap rather than a bad break: two source-pattern assertions were satisfied by a *different* occurrence of the same line, and a third pinned only the copy of a call that runs at mount. All three are now behavioural tests that operate the switch instead.

## Suggested articles

[Language modes](language-modes.md), [Funny-level sliders](funny-levels.md), [Personal vocabulary upload](personal-vocabulary-upload.md), [Narration](narration.md), [Dim sum surprise](dim-sum-surprise.md), [Platform feature index](README.md).
