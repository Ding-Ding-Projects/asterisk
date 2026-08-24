# Attention-support modes

Five independent, off-by-default interface accommodations are available in the desktop console: Focus, Low stimulation, Time awareness, One thing at a time, and Momentum. They describe what the interface does and make no medical or personal claim.

## Behavior

The five switches are mounted from the durable settings snapshot when the desktop application starts, and every control writes through the same `DurableStorage` handle. Attention writes wait for an acknowledgement from the main process, rather than treating a local cache write as proof of durability.

- **Focus** dims the top chrome, rail, and section list while leaving the current work region present and usable. It never removes inactive work.
- **Low stimulation** reduces saturation, shortens non-essential animation and transition durations, and quietens ordinary informational toasts. Urgent `fire` notices remain available. The runtime also watches `prefers-reduced-motion`, and either source can reduce motion without overriding the other.
- **Time awareness** shows session elapsed time and time since the last recorded console change in the current work region.
- **One thing at a time** shows one user-selected next action in the same work-region status card. The action is bounded and persisted, and an empty value is an honest `none chosen yet` state.
- **Momentum** shows a factual prompt after 20 minutes without a recorded change. `Not now for 30 minutes` stores a snooze deadline, and the prompt stays away for that stated period.

The status card is non-modal, keyboard reachable, screen-reader announced as a polite status, and recreated from live durable state rather than placeholder data. No mode uses scores, streaks, guilt, medical language, or hidden work.

## Configuration

The five switches use the keys `console.attention.focus`, `console.attention.lowStimulation`, `console.attention.timeAwareness`, `console.attention.oneThing`, and `console.attention.momentum`. The selected action uses `console.attention.nextAction`. Runtime timestamps use `console.attention.lastChangedAt` and `console.attention.snoozedUntil`.

`SNOOZE_MS` is 30 minutes and `IDLE_THRESHOLD_MS` is 20 minutes in `app/renderer/src/attention-modes.ts`. Invalid stored values fall back to the off or empty state. A session timer starts at application mount, while the last-change timestamp can survive a relaunch so an untouched work area does not silently reset its factual duration. A restored snooze is accepted only within the declared 30-minute interval, with a small migration tolerance for older stored timestamps.

## Current status

**Desktop application:** Implemented, unverified. `app/renderer/src/App.tsx` restores all five switches and the selected action after durable storage bootstrap, applies the runtime classes and status card for the application lifetime, tracks every listed user mutation path while excluding passive reads and navigation, and composes app and operating-system motion preferences. The checked-in design now includes the `att_next` text control and stable semantic attention markers, and generated output was refreshed with the design compiler.

**Documentation website:** Partial and unchanged in this lane. Its settings page has its own attention controls, but this desktop runtime change does not claim to implement or verify the website behavior.

## Failure modes

If durable storage cannot be read, the desktop controls stay off and the action stays empty. If an attention write is pending, refused, or has only session scope because the bridge is unavailable, the work-region card says so and exposes a retry for refused writes. The runtime still behaves for the current process, but a session-only setting cannot be restored on the next launch. A missing or invalid last-change timestamp starts the factual duration at mount. Reduced-motion preference changes are applied live when the platform exposes a media-query change event. Under Low stimulation, informational notifications are suppressed, while warnings and errors remain visible and are retained in the reviewable attention history.

## Accessibility and localization

The status card uses a polite live region, visible keyboard focus on its snooze button, text values instead of color or motion alone, and no hidden content. Existing attention labels and help copy remain routed through the app's text boundary. This lane did not run UI or accessibility suites, so those claims are implemented but unverified.

## Verification

The design compiler was run with `npm run compile:design`, and the generated output is present. No tests, lint, broad build, packaging, browser run, capture, or Lowlevel verification was run in this lane. The desktop behavior therefore remains implemented-unverified until the owning integration lane runs its focused checks against the built artifact.

## Suggested articles

[Accessibility](accessibility.md), [Non-blocking notifications](non-blocking-notifications.md), [Scheduled settings](scheduled-settings.md), [Platform feature index](README.md).
