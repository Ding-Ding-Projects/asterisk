# Attention-support modes

Five independent, off-by-default interface accommodations are available in the desktop console: Focus, Low stimulation, Time awareness, One thing at a time, and Momentum. They describe what the interface does and make no medical or personal claim.

## Behavior

The five switches are mounted from the durable settings snapshot when the desktop application starts, and every control writes through the same `DurableStorage` handle. Attention writes wait for an acknowledgement from the main process, rather than treating a local cache write as proof of durability.

- **Focus** dims the top chrome, rail, and section list while leaving the current work region present and usable. It never removes inactive work.
- **Low stimulation** reduces saturation, shortens non-essential animation and transition durations, and quietens ordinary informational toasts. Urgent `fire` notices remain available. The runtime also watches `prefers-reduced-motion`, and either source can reduce motion without overriding the other.
- **Time awareness** shows session elapsed time and time since the last recorded console change in the current work region.
- **One thing at a time** shows one user-selected next action in the same work-region status card. The action is bounded and persisted, and an empty value is an honest `none chosen yet` state.
- **Momentum** shows a factual prompt after 20 minutes without a recorded change. `Not now for 30 minutes` stores a snooze deadline, and the prompt stays away for that stated period.

The status card is non-modal, keyboard reachable, screen-reader announced as a polite status, and recreated from live durable state rather than placeholder data. The notification API carries an explicit `info`, `warning`, or `error` severity at its boundary, with information as the ordinary producer default. Low stimulation suppresses only information, while warnings and errors remain visible and are retained in the reviewable history. No mode uses scores, streaks, guilt, medical language, or hidden work.

## Configuration

The five switches use the keys `console.attention.focus`, `console.attention.lowStimulation`, `console.attention.timeAwareness`, `console.attention.oneThing`, and `console.attention.momentum`. The selected action uses `console.attention.nextAction`. Runtime timestamps use `console.attention.lastChangedAt` and `console.attention.snoozedUntil`.

The executable handwritten inventory is `ATTENTION_WIRING` in `app/renderer/src/attention-inventory.ts`; `app/renderer/src/attention-modes.ts` owns the runtime and re-exports the validator and records. It contains exactly six rows, one for each attention control, with the storage key, writer chain, and live consumer. The application registry mirrors those rows for review.

The canonical notification producer inventory is `ATTENTION_SEVERITY_PRODUCERS` in `app/renderer/src/attention-inventory.ts`. It enumerates 183 exact source call sites, helper names, columns, expected severity, and passive routing entries. Ceremony toast and fire ternary branches are passive routing entries in `ATTENTION_SEVERITY_ROUTES`; the verifier checks their actual error, warning, and default input-to-helper mapping from the implementation span rather than trusting a nearby literal. `verifyAttentionSeverityProducers` source-scans both App and generated renderer files, rejects every unlisted producer, and requires warning or error for invalid input, unmet prerequisites, unavailable bridges, refused actions, and failed operations. Known path and credential producers carry exact field-tagged spans through the three-entry `ATTENTION_STRUCTURED_NOTICE_PRODUCERS` inventory into the notice formatter, which validates bounds, rejects overlap, redacts every repeated occurrence, and preserves surrounding facts. Unstructured context remains explicitly privacy-first fallback coverage. Warning and error history uses `console.attention.noticeHistory`, schema version 1, a 200-entry bound, redacted text, durable restore, search, clear, and export. Redaction uses bounded structured spans for quoted and unquoted whitespace-containing Windows, UNC, POSIX, and bare relative PBX paths with whitespace-bearing directory components such as `PBX configs/pjsip.conf` and `office PBX/retry because/pjsip.conf`, case-insensitive file and HTTP URLs, and explicit clause boundaries that preserve trailing recovery text. Complete quoted assignments for password, token, secret, PIN, API key, and access token are redacted before generic quote preservation. A missing history key means no history; an explicitly stored empty string is corrupt, remains untouched, and exposes the bounded `Reset unreadable history` recovery action.

`verifyAttentionWiring` is the executable Chut. It consumes the checked-in design source, App source, and generated renderer source, then rejects duplicate or missing controls, missing design bindings, missing durable keys, missing mutation writers, and missing exact consumers. Its negative cases are intended to remove one exact row or source token, observe a red result, then restore it.

The canonical direct mutation inventory is `ATTENTION_MUTATION_INVENTORY` in `app/renderer/src/attention-inventory.ts`. It records all 61 literal and generated `onUserMutation` call sites with exact source line and argument, occurrence, affected state, and clock effect. `verifyAttentionMutationInventory` runs two independent negative paths: removing one implementation callback with the full 61-row inventory, and removing one inventory row with source intact. Navigation, passive reads, selection, overlay state, and timers are explicit exclusions in `ATTENTION_MUTATION_PASSIVE_EXCLUSIONS`. The generated action/state tuples remain one record in `ATTENTION_MUTATION_ACTIONS` and are checked as complete tuples.

`SNOOZE_MS` is 30 minutes and `IDLE_THRESHOLD_MS` is 20 minutes in `app/renderer/src/attention-modes.ts`. Invalid stored values fall back to the off or empty state. A session timer starts at application mount, while the last-change timestamp can survive a relaunch so an untouched work area does not silently reset its factual duration. A restored snooze is accepted only within the declared 30-minute interval, with a small migration tolerance for older stored timestamps.

## Current status

**Desktop application:** Implemented, unverified. `app/renderer/src/App.tsx` restores all five switches and the selected action after durable storage bootstrap, applies the runtime classes and status card for the application lifetime, and receives one generated `onUserMutation` callback for controls, steppers, appearance, canvas, layout, tabs, groups, presets, and direct application-owned mutations. Passive reads and navigation do not reset the clock. The checked-in design now includes the `att_next` text control and stable semantic attention markers, and generated output was refreshed with the design compiler.

**Documentation website:** Implemented for the site-owned surface. Every page exposes independently persisted focus, low stimulation, time awareness, one-thing-at-a-time, and momentum controls, all off by default. The current action and elapsed time appear on the page, and the momentum notice uses a bounded local idle interval.

## Failure modes

If no current action is entered, one-thing-at-a-time stays visually quiet rather than inventing one. Reduced-motion and low-stimulation requests stop non-essential animation; momentum never claims that work changed.
`DurableStorageHandle.bootstrap()` returns exactly one of `loaded`, `unavailable`, `malformed`, or `retryable`, retains that result, and never silently turns an unacknowledged restore into default-off state. The attention status card names the restore state and exposes a bounded retry button where retry is still available. The host settings writer returns a typed failure after its bounded Windows-safe atomic rename retry, so a refused write is not reported as durable. Mode-key persistence and notice-history persistence have separate pending, session-only, retry, and saved states, each naming its affected key or history channel. If either write is pending, refused, or has only session scope because the bridge is unavailable, the work-region card says so and exposes a retry for refused writes. The runtime still behaves for the current process, but a session-only setting cannot be restored on the next launch. A missing or invalid last-change timestamp starts the factual duration at mount. Reduced-motion preference changes are applied live when the platform exposes a media-query change event. Under Low stimulation, informational notifications are suppressed, while warnings and errors remain visible and are retained in the searchable, clearable, exportable attention history.

## Accessibility and localization

The status card uses a polite live region, visible keyboard focus on its snooze button, text values instead of color or motion alone, and no hidden content. Existing attention labels and help copy remain routed through the app's text boundary. This lane did not run UI or accessibility suites, so those claims are implemented but unverified.

## Verification

The narrow inventory/static Chut was run with `node scripts/verify-inventories.mjs --allow-unverified`, and it reported green after every exact matrix fixture turned red and was restored. No broad tests, lint, build, packaging, browser run, capture, or Lowlevel verification was run in this lane. The desktop behavior therefore remains implemented-unverified until the owning integration lane runs its focused checks against the built artifact.

## Suggested articles

[Accessibility](accessibility.md), [Non-blocking notifications](non-blocking-notifications.md), [Scheduled settings](scheduled-settings.md), [Platform feature index](README.md).
