# School mode

A single, renamable, shared switch that forces plain English presentation and removes playful or optional controls while active.

## Behavior

The state lives in the shared durable settings snapshot. A one-second snapshot refresh observes changes made by another running surface and applies them live without a restart. While active, the renderer forces English, hides the Cantonese, funny-level, vocabulary, dialog-emoji and narration controls, and leaves earlier choices stored for restoration.

## Configuration

`School mode name` is validated and shared. `Set unlock credential` and `Unlock School mode` use an app-owned accessible credential dialog and send the value only to the operating-system credential vault under the stable shared account key. `Unlock School mode` verifies it before restoring the previous language, funny levels, narrator settings and quiet state. The recovery path is returned from Electron's exact `app.getPath('userData')` value before the dialog can open. The credential never enters settings, exports, history, logs or captures.

## Current status

**Desktop application:** Implemented but unverified in the packaged artifact. The Windows desktop shell includes live shared-state polling, renaming, hidden capabilities and credential-backed unlock.

**Documentation website:** Not implemented. The static site has no shared operating-system credential vault.

## Failure modes

If a refresh cannot read the shared snapshot, the last known state remains active and the status control reports `refresh-failed`. Search fields, regex controls, the command palette, vocabulary destination, fun destination and dim-sum destination are also suppressed by the same School predicate. This is a presentation lock, not a security boundary.

## Accessibility and localization

The switch, name field, status line and unlock dialog are generated accessible controls. School mode's chosen name replaces the shipped name in labels, descriptions, prompts, notices and accessible names. The forced English presentation keeps hidden capabilities out of the rendered control list.

## Verification

The pure state module is covered by focused renderer checks. The supported packaging path runs `electron-builder install-app-deps`, clears stale `win-unpacked`, stages candidate provenance before electron-builder, packages it through `extraResources`, unpacks `keytar` from the asar, and runs `verify:keytar:packaged` against the final artifact. The packaged main process reads and compares provenance through the renderer IPC bridge, completes an operating-system credential-vault round-trip, deletes the probe, and confirms post-delete absence before release evidence can claim the path. Cross-process refresh and dialog behavior remain packaged built-artifact verification work.

## Suggested articles

[Language modes](language-modes.md), [Funny-level sliders](funny-levels.md), [Dim sum surprise](dim-sum-surprise.md), [Customise everything](../app/customise.md), [Platform feature index](README.md).
