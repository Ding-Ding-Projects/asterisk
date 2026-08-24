# Scheduled settings

Lets a user schedule when a setting — language, theme, density, and the like — takes effect, by date, time, and weekday.

## Behavior

The shared settings schema and renderer runtime validate bounded rules with stable IDs, optional dates, times, weekday sets, local timezone resolution, and deterministic priority plus list-order precedence. `settings-runtime.ts` evaluates rules without mutating persisted base settings. External source activity is kept separate and is applied only as a temporary effective state.

## Configuration

Rules are stored in the versioned desktop settings record. Dates use `YYYY-MM-DD`, times use `HH:MM`, `every-day` means all weekdays for the selected window, and a rule with a later effective priority wins; equal priorities resolve by later list position. Cross-midnight windows run through the next local day. A bounded HTTPS API or Home Assistant boolean source may be selected per rule by the validated source contract.

## Current status

**Desktop application:** The validated schedule model and renderer evaluation seam are present in `shared/settings-schema.ts`, `app/renderer/src/settings/schedule.ts`, and `app/renderer/src/settings-runtime.ts`. `app/renderer/src/external-settings-runtime.ts` and the privileged `external-settings.*` actions provide source refresh state. The owning UI mount remains separate follow-up work.

**Documentation website:** Implemented for site-owned local settings. Every page exposes one persisted rule with explicit weekdays, start and end times, cross-midnight and equal-time behavior, local-timezone status, and scheduled theme, language, and density values. Base values return when the window ends.

## Failure modes

Invalid timezones, dates, times, weekday sets, source contracts, duplicate rule IDs, duplicate assignment targets, and out-of-range values are rejected with a specific reason. Overlap is resolved by the documented precedence rather than silently combining assignments. An empty rule list leaves base settings active.

## Accessibility and localization

This lane did not run tests, build, or capture verification. The runtime exposes source and schedule state for the owning UI lane to localize and make keyboard accessible.

## Verification

Verification was not run in this lane. The persistence, evaluation, and source-refresh seams are implemented but remain unverified until the owning UI and focused checks land.

## Suggested articles

[External settings sources](external-settings-sources.md), [Platform feature index](README.md).
