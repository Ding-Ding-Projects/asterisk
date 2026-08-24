# Spoken narration

An optional, off-by-default text-to-speech narrator that reads app events aloud in a user-chosen language and voice.

## Behavior

The `Narration` group uses the platform speech engine adapter and queues application events through the serialized `Narrator` class. English and Cantonese voice choices are independent. `Both` speaks English first and Cantonese second, one utterance at a time, with per-category cooldown and supersession of queued lines.

## Configuration

The picker begins with `Choose automatically`, then refreshes from voices currently installed on the machine. Stable voice URI identities include the normalized language and engine identity and are persisted, not display names. A platform voice without a stable identity is reported unavailable for selection rather than persisted under a guessed name. Duplicate display names are disambiguated with the engine or URI. English accepts English voices, while Cantonese accepts only `zh-HK` or `yue-HK`. Rate and pitch are bounded controls from 0.5 to 2 and 0 to 2 respectively.

## Current status

**Desktop application:** Implemented but unverified in the packaged artifact. The narrator is off by default and reports effective, missing, network-backed and unavailable voice states.

**Documentation website:** Not implemented. A static documentation site has no application event stream of its own.

## Failure modes

If a voice is missing or does not match its selected language, the saved choice is retained and the first compatible voice is used when available. A machine with no compatible voice reports that state, and a machine with no speech engine renders that state explicitly and keeps the enabled control off. Speech errors are reported per utterance and the next queued line continues. Platform screen-reader state is read separately from the persisted `Screen reader active` override. Quiet hours and either screen-reader state suppress the queue through the narrator API.

## Accessibility and localization

Voice names and language tags remain exact platform data, while surrounding labels use the localization boundary. Narration remains optional and off by default, and School mode suppresses it while active.

## Verification

The queue, voice status, late enumeration, bounds, cooldown, serialization and suppression paths are covered by `console/tests/ui/narration.test.tsx`. Built-artifact voice enumeration remains part of the desktop evidence inventory.

## Suggested articles

[Language modes](language-modes.md), [Funny-level sliders](funny-levels.md), [Non-blocking notifications](non-blocking-notifications.md), [Platform feature index](README.md).
