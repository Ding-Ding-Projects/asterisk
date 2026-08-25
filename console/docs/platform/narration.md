# Spoken narration

An optional, off-by-default text-to-speech narrator that reads app events aloud in a user-chosen language and voice.

## Behavior

The narrator speaks application events using the platform's speech synthesis voices, in English, Cantonese, or both in sequence (English first, then Cantonese, strictly serialized -- never overlapping), with independently selectable voice, rate, and pitch per language. It stays off until the user turns it on with the **Narration** switch, and everything else it reads is a real, already-happening console event -- the non-blocking notifications the console shows (`fire`, the title-and-body kind) and the toast messages (the lighter one-line kind), including the ones the compiled console already raises on its own for a settings change ("… set to true", "Nice … switched on."). Nothing was invented specifically to be narrated; the narrator reads what the console already says on screen.

Narration is infrequent by design: ordinary (non-error) lines are rate-limited per category (see Configuration), and a line still queued when a newer one in the same category arrives is replaced rather than stacked, so the console never reads a backlog of superseded status lines aloud. A genuine failure -- currently the two boolean-checked daemon failures ("The phone system did not start" and daemon start/stop/restart's "Not done") -- is passed through as an error and is never dropped by that rate limit, however soon after another notice it arrives.

The narrator also yields to two things outside its own settings: an active screen reader (detected through Electron's own accessibility-support signal, forwarded from the main process) and the **Low stimulation** attention mode, which doubles as this feature's quiet-hours setting. Either one silences the narrator immediately, live, without needing to turn narration itself off.

## Configuration

Seven controls on the Customise screen (`nar_*`), each persisted independently:

- **Narration** (`nar_enabled`) -- the master off/on switch. Off by default.
- **Narrated language** (`nar_language`) -- English, Cantonese, or Both.
- **English voice** / **Cantonese voice** (`nar_en_voice` / `nar_yue_voice`) -- populated from the voices this computer actually reports, defaulting to "Choose automatically" rather than a named voice nobody may have installed. The saved value is the voice's stable platform identity, not its display name, because names are not unique and are localized.
- **Narration rate** / **Narration pitch** (`nar_rate` / `nar_pitch`) -- 0.5-2.0 and 0-2 respectively, matching the platform's own ranges.
- **Narration status** (`nar_status`, read-only) -- states plainly which voice will actually speak right now, or exactly why nothing can: no voice chosen (using the system default), a chosen voice that isn't installed here (falling back, choice kept), a chosen voice that is network-backed and will go quiet offline, or no voice on this machine that can read the chosen language at all -- including the case where this computer has no speech synthesis whatsoever.

Every one of the seven applies live: the switch, the language, either voice, and both sliders reach the running narrator the instant they are chosen, not only on the next restart.

## Current status

**Desktop application: implemented.** `app/renderer/src/narration.ts` holds the pure, injectable `Narrator` (queue, per-category cooldown, "both" serialization, error bypass, voice-status resolution -- fully covered by `tests/ui/narration.test.tsx`). `app/renderer/src/narration-engine.ts` is the one real `SpeechEngine` adapter over the platform's Web Speech API, falling back to a null engine that never speaks but still resolves and reports honestly when no `speechSynthesis` exists at all (`tests/ui/narration-engine.test.tsx`). `App.tsx` constructs one `Narrator` for the life of the component, wires the seven controls to it, and narrates through the console's own existing notification paths (`fire`/`toast`) rather than a second, parallel event system -- proven reached from the real mount chain, not merely imported, by `tests/ui/narration-wired.test.tsx`.

Screen-reader ducking is wired through `app/electron/main.ts` (`app.isAccessibilitySupportEnabled()` and its change event) and `app/electron/preload.ts`/`preload.cjs`, exposed to the renderer as `window.dingDesktop.accessibility`. It is optional on the bridge, exactly like `provisioning`: the hosted HTTP surface has no Electron main process behind it and degrades to doing nothing rather than guessing.

**Documentation website: not implemented.** A static documentation site has no application events of the kind this feature narrates -- nothing changed here.

## Failure modes

Speech synthesis being unavailable is a reported state, not a silent no-op: the **Narration status** control says so plainly (either "no speech synthesis on this computer" from the initial enumeration, or "no voice on this machine can read \<language\>" once a control is touched and the status is recomputed from the same honest voice-resolution logic). Enabling narration and firing an event on a machine with no synthesis does not throw or hang -- there is simply nothing to speak through, and the status line says exactly that. A synthesis error mid-utterance (the adapter's `onerror`) resolves that one utterance and lets the queue continue, rather than blocking every line behind it.

## Accessibility and localization

The narrator ducks under a real, currently-active screen reader (not a guess -- Electron's own accessibility-support signal) and under the **Low stimulation** attention mode, both live. Its own seven controls follow the console's standing accessibility contract (keyboard reachability, visible focus, correct roles and names) as ordinary compiled console controls. Narrated copy is currently the console's own English notification text; it is not yet independently translated per narrated-language selection beyond the voice/engine actually speaking Cantonese when chosen.

## Verification

`tests/ui/narration.test.tsx` -- the pure `Narrator` logic (queue, cooldown, "both" serialization, supersession, voice-status resolution, dispose) against a fake `SpeechEngine`.

`tests/ui/narration-engine.test.tsx` -- the real `SpeechEngine` adapter against a fake `speechSynthesis`/`SpeechSynthesisUtterance` platform, including the no-synthesis-at-all fallback.

`tests/ui/narration-wired.test.tsx` -- the real `App`, mounted (`componentDidMount` actually called, not skipped), driven through its real controls (`setVal`, `fire`, `toast`) exactly as a user or the compiled console would: off by default, enabling causes real speech, disabling silences it again, "Both" serialization, the cooldown-vs-error distinction at the real daemon-failure call sites, the honest no-synthesis status, late voice enumeration, screen-reader ducking, Low-stimulation quiet-hours ducking, and a source-anchored guard that the wiring itself (the `Narrator` import and the live `.enqueue(` calls) is actually present rather than merely available. Supersession specifically is proven in the pure suite above rather than re-derived at the mount level -- see the comment above the (deliberately absent) mount-level "burst" test in that file for why: the real, non-zero default cooldown structurally prevents observing "replace, don't stack" through a synchronous burst of same-category events, which is exactly why the pure test isolates that property with a near-zero cooldown.

## Suggested articles

[Language modes](language-modes.md), [Platform feature index](README.md).
