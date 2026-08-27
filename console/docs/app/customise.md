# Customise everything

## Behavior

The global layer reaches across the console, while each rendered element can still override it from its own context menu. It is backed by the local console profile.

## Configuration

### Fun

English and Cantonese have independent funny levels from 1 (fully serious) to 5 (maximum playfulness), both defaulting to 5. `fun_english` and `fun_cantonese` persist separately, and each has its own reset control. Notification and dialog wrappers preserve facts while styling the selected language.

Other fun controls cover copy tone, celebrations, confetti, sound, hidden surprises and per-element appearance randomness. The global summary derives from the two language levels.

### School mode and narration

- `school_mode` forces English and removes Cantonese, bilingual, funny-level, vocabulary, dim-sum, narration, search and palette surfaces while active.
- `school_name` is a validated shared display name. The chosen name replaces the shipped name in labels, descriptions, prompts, notices and accessible names.
- `school_set_credential` and `school_unlock` open an app-owned accessible dialog. The credential is stored through the operating-system credential vault under `ding-pbx-console:school-mode-shared-unlock`, never in settings or application data. The exact `app.getPath('userData')` recovery path is fetched before the dialog can open.
- `nar_enabled` is off by default. The narrator persists language, compatible voice identities, rate, pitch, quiet state and the explicit screen-reader override. Platform accessibility state is also read when available.

### Motion

Global timing. Individual elements can still set their own.

- `mo_speed` controls animation speed.
- `mo_curve` selects easing.
- `mo_screen` and `mo_dialog` select screen and dialog transitions.
- `mo_reduce` respects reduced motion.

### Layout, theme, behavior and profiles

The remaining groups control rail position, density, dimensions, theme, accent, contrast, launch behavior, confirmation behavior, history, profile selection and export behavior. Each value is persisted by the owning control and has a generated explanation.

## Failure modes and security

An unavailable settings store leaves the last known state in place and reports the refresh failure. Invalid names restore the previous valid name. The credential value never enters settings, exports, history, logs, captures or renderer state after submission.

## Verification

The design source is compiled into the renderer. The dynamic event inventory records localized events and intentional plain-English fallbacks. The focused narration and language modules cover the pure behavior; built-artifact interaction evidence remains in the per-surface inventory.

## Suggested articles

[Appearance](appearance.md), [Language modes](../platform/language-modes.md), [School mode](../platform/school-mode.md), [Spoken narration](../platform/narration.md), [Notifications](notifications.md).
