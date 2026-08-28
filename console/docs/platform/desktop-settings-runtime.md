# Desktop settings runtime

The desktop settings runtime provides one validated local state contract for language, tone, dialog decoration, renamed School mode, attention-support modes, narration, display naming, and scheduled overrides.

## Behavior

Settings use schema version 1 from `console/shared/settings-schema.ts`. A fresh profile starts with English, both funny levels at 5, dialog emojis enabled, School mode off, every attention-support mode off, narration off, the shipped display name, dark theme, comfortable density, the shipped accent and font, normal scale and weight, and motion enabled. The package identity remains the constant `com.dingdingprojects.ding-pbx-console` regardless of the chosen display name.

`SettingsStore` validates every stored record during hydration and every proposed record before writing. Missing data uses documented defaults. Invalid or stale data is removed and reported through `recoveryReason`; it is never partially applied. Subscribers receive immutable snapshots after hydration, a successful update, a reset, or a storage event from another renderer.

`RendererSettingsRuntime` adds schedule evaluation, School-mode projection, personal-vocabulary application, and narrator mounting. Schedule rules use an IANA timezone, optional date bounds, a local time window, weekdays, deterministic priority, and stable list ordering. Equal start and end times mean a full day. Cross-midnight windows belong to the day on which they begin. External rules remain inactive until the privileged source reader supplies an explicit active state.

When School mode is enabled, the effective projection forces English and English narration, reports Cantonese, funny-level controls, personal vocabulary, and dim-sum behavior as unavailable, and leaves the user's stored choices untouched for restoration when the mode is disabled.

## Configuration

There is no configuration file. A fresh profile is whatever `defaultDesktopSettings()` returns
(`console/shared/settings-schema.ts:155`), and everything after that is a validated write through
`SettingsStore`. The shipped values are:

| Group | Value on a fresh profile |
| --- | --- |
| `language` | `mode: 'english'`, `englishFunnyLevel: 5`, `cantoneseFunnyLevel: 5`, `showDialogEmojis: true` |
| `schoolMode` | `enabled: false`, `displayName: 'School mode'` |
| `attention` | all five modes `false`, `nextAction: ''` — accommodations, off until asked for |
| `narration` | `enabled: false`, `language: 'en'`, rate and pitch `1` on both the `en` and `zh` channels |
| `displayName` | `'Ding PBX Console'` |
| `appearance` | `theme: 'dark'`, `density: 'comfortable'`, `accentColor: '#6750A4'`, `fontFamily: 'Roboto'`, `fontScale: 1`, `fontWeight: 400`, `motion: true` |
| `schedule` | this machine's own IANA zone from `Intl.DateTimeFormat().resolvedOptions().timeZone`, falling back to `UTC`, and no rules |

Two bounds are compiled in rather than settable: `MAX_SCHEDULE_RULES = 128` and
`MAX_ASSIGNMENTS_PER_RULE = 32` (`settings-schema.ts:8-9`). A record declaring any `version` other
than `SETTINGS_SCHEMA_VERSION` (`1`) is refused whole with `unsupported settings version …` rather
than partly read.

`STABLE_APPLICATION_ID` is `com.dingdingprojects.ding-pbx-console` and is **not** derived from
`displayName`. That separation is the whole reason renaming the application is safe: the display name
is a setting, the identity is a constant, and a rename therefore cannot move the profile directory
the settings themselves live in.

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

## Current integration state

The settings core and public integration functions exist, but the desktop shell does not yet construct the store, subscribe to runtime snapshots, route rendered text through the vocabulary boundary, mount a platform speech engine, or apply appearance overrides. Those seams belong to the application wiring change. Until that wiring lands, these settings do not change the visible desktop interface.

## Verification

The lane that wrote this runtime ran nothing: no tests, no type checking, no build, no packaging, no
interface interaction, no captures. That is stated here rather than implied, because the section
above describes an API in the present tense and a reader is entitled to know how much of it has been
watched working.

What has since been run against it, and what has not:

- The schema, its defaults and its validation are exercised by the repository's renderer suite
  (`npm run test:renderer`) and its type check (`npx tsc -b`). Both are source-level checks.
- The desktop shell wiring described under **Current integration state** is still absent, so no test
  can prove the visible interface follows these settings, because nothing yet reads them.
- No built-artifact interaction record and no capture exist for this article. The inventory row is
  `implemented-unverified` and stays that way until a run of the packaged application produces one.

## Suggested articles

[Language modes](language-modes.md), [Funny-level sliders](funny-levels.md), [School mode](school-mode.md), [Spoken narration](narration.md), [Scheduled settings](scheduled-settings.md), and [Personal vocabulary upload](personal-vocabulary-upload.md).
