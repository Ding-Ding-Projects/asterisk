# School mode

A single, renamable, shared switch that forces plain English presentation and removes playful or optional controls while active.

## Behavior

The state lives in the shared durable settings snapshot. A one-second snapshot refresh observes changes made by another running surface and applies them live without a restart. While active, the renderer forces English, hides the Cantonese, funny-level, vocabulary, dialog-emoji and narration controls, and leaves earlier choices stored for restoration.

## Configuration

`School mode name` is validated and shared. `Set unlock credential` prompts locally and sends the value only to Electron's encrypted desktop credential store. `Unlock School mode` verifies it before restoring the previous language and funny-level values. The credential never enters settings, exports, history, logs or captures.

## Current status

**Desktop application:** Implemented in the Windows desktop shell, including live shared-state polling, renaming, hidden capabilities and credential-backed unlock.

**Documentation website:** Not implemented. The static site has no shared desktop credential store.

## Failure modes

If a refresh cannot read the shared snapshot, the last known state remains active and the status control reports `refresh-failed`. This is a presentation lock, not a security boundary.

## Accessibility and localization

The switch, name field, status line and unlock route are generated accessible controls. School mode's chosen name remains the visible name after activation, while its forced English presentation keeps the hidden capabilities out of the rendered control list.

## Verification

The pure state module is covered by focused renderer checks. Cross-process refresh and credential-store behavior require the packaged desktop evidence route and remain recorded as built-artifact verification work.

## Suggested articles

[Language modes](language-modes.md), [Funny-level sliders](funny-levels.md), [Dim sum surprise](dim-sum-surprise.md), [Customise everything](../app/customise.md), [Platform feature index](README.md).
