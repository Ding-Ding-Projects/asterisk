# Desktop settings runtime

The desktop settings runtime provides one validated local state contract for language, tone, dialog decoration, renamed School mode, attention-support modes, narration, display naming, and scheduled overrides.

## Behavior

Settings use schema version 1 from `console/shared/settings-schema.ts`. A fresh profile starts with English, both funny levels at 5, dialog emojis enabled, School mode off, every attention-support mode off, narration off, the shipped display name, dark theme, comfortable density, the shipped accent and font, normal scale and weight, and motion enabled. The package identity remains the constant `com.dingdingprojects.ding-pbx-console` regardless of the chosen display name.

`SettingsStore` validates every stored record during hydration and every proposed record before writing. Missing data uses documented defaults. Invalid or stale data is removed and reported through `recoveryReason`; it is never partially applied. Subscribers receive immutable snapshots after hydration, a successful update, a reset, or a storage event from another renderer.

`RendererSettingsRuntime` adds schedule evaluation, School-mode projection, personal-vocabulary application, and narrator mounting. Schedule rules use an IANA timezone, optional date bounds, a local time window, weekdays, deterministic priority, and stable list ordering. Equal start and end times mean a full day. Cross-midnight windows belong to the day on which they begin. External rules remain inactive until the privileged source reader supplies an explicit active state.

When School mode is enabled, the effective projection forces English and English narration, reports Cantonese, funny-level controls, personal vocabulary, and dim-sum behavior as unavailable, and leaves the user's stored choices untouched for restoration when the mode is disabled.

## Integration API

The application integration point is `console/app/renderer/src/settings/index.ts`.

```ts
const settings = browserSettingsRuntime()

settings.hydrate()
const unsubscribe = settings.subscribe((snapshot) => render(snapshot))
settings.update((draft) => { draft.language.mode = 'bilingual' })
settings.applyVocabularyText({ text: label, boundary: 'user-interface-copy' })
settings.mountNarration(speechEngine)
settings.queueNarration('connection', { en: englishText, zh: cantoneseText })
```

The runtime also exposes `snapshot()`, `reset()`, `provenance(target)`, `setScheduleSourceState()`, `tick()`, `narrationVoices()`, `narrationStatus()`, `narrationQueueStatus()`, `setScreenReaderActive()`, `setQuiet()`, `unmountNarration()`, and `dispose()`.

Each scheduled target reports whether its current value came from compiled defaults, validated local storage, a schedule rule, or School-mode suppression. Effective appearance values are part of the snapshot and also remain exposed through `scheduledOverrides` for the separately owned appearance subsystem to consume.

## Personal vocabulary

The accepted file has one canonical shape: a version of 1 and a `replacements` array containing only `from` and `to` strings. Validation rejects oversized input, excessive nesting, too many entries, unknown fields, unsafe keys, duplicate JSON object keys, duplicate source terms, invalid versions, and bounded-string violations. The cache is revalidated before every application. Invalid uploads never replace the last valid cache, and clearing the cache immediately restores original wording.

Replacement is available only through an explicitly classified private user-interface-copy or accessible-name boundary. Commands, URLs, identifiers, code, paths, logs, exports, history, diagnostics, provider-authored text, and public records must not pass through that API. No mapping, payload, source filename, or source path ships in this repository.

## Failure modes and security

- A storage read or validation failure activates defaults and reports the exact recovery reason.
- A privacy context that refuses access to browser storage uses one guarded probe, then gives settings and personal vocabulary the same memory-only store. Snapshots report `session-memory` provenance and the reason values will not survive restart.
- A storage write failure leaves the previous settings active and returns a failed update result.
- An external schedule source has no effect until its privileged reader reports a current true state.
- Missing speech support leaves narration unmounted. Voice enumeration then returns an empty list and queue attempts return `false`.
- A removed selected voice remains selected in stored settings while runtime status reports the actual fallback or lack of a usable voice.
- Speech failures are retained in queue status and do not block the application or later queued lines.
- Secrets are not part of the settings schema. Home Assistant rules store only a credential-vault account key, never credential material.

## Configuration

Every value here is the reader's own, and the fresh-profile defaults in **Behavior** above
are what a new install starts from rather than a table anybody has to set. What can be
changed, and what deliberately cannot:

- **Language mode, both funny levels, dialog emojis, School mode, each attention-support
  mode, narration, the display name, theme, density, accent, font, scale, weight and
  motion** are all part of the schema-version-1 record and are written through
  `update()`, which validates the whole proposed record before it replaces the stored one.
- **Schedule rules** carry an IANA timezone, optional date bounds, a local time window,
  weekdays and a deterministic priority. Equal start and end times mean a full day, and a
  window crossing midnight belongs to the day it begins on -- both stated so neither has to
  be guessed from behaviour.
- **An external rule's active state** is not a setting at all: it stays inactive until the
  privileged source reader supplies an explicit true, so an unreachable source leaves the
  local value in place rather than flipping it.
- **The personal-vocabulary file**, supplied by the reader and revalidated before every
  application. No mapping, payload, filename or path ships in this repository.

Two things are constants rather than settings, and the distinction is load-bearing. The
package identity stays `com.dingdingprojects.ding-pbx-console` whatever display name is
chosen, so renaming the console cannot orphan its stored profile. And no secret is part of
the schema: a Home Assistant rule stores a credential-vault account key, never credential
material.

## Verification

The settings core and public integration functions exist, but the desktop shell does not yet construct the store, subscribe to runtime snapshots, route rendered text through the vocabulary boundary, mount a platform speech engine, or apply appearance overrides. Those seams belong to the application wiring change. Until that wiring lands, these settings do not change the visible desktop interface.

This ultra-speed implementation did not run tests, type checking, builds, packaging, UI interaction, or captures. Its behavior remains unverified until the owning integration work runs the repository's local validation and built-artifact evidence paths.

## Suggested articles

[Language modes](language-modes.md), [Funny-level sliders](funny-levels.md), [School mode](school-mode.md), [Spoken narration](narration.md), [Scheduled settings](scheduled-settings.md), and [Personal vocabulary upload](personal-vocabulary-upload.md).
