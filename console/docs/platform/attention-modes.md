# Attention-support modes

A set of independently toggleable, off-by-default interface modes — focus, low stimulation, time awareness, one-thing-at-a-time, and momentum — aimed at attention difficulties.

## Behavior

Each mode is meant to be a separate switch: focus dims everything but the active item without hiding it, low stimulation reduces motion and non-essential notifications, time awareness shows elapsed session time, one-thing-at-a-time pins a single chosen next action, and momentum gently and dismissibly flags long-untouched work.

## Configuration

Copy in these modes would stay plain and factual, never gamified or judgmental, presented as interface accommodations rather than anything medical or diagnostic.

## Current status

**Desktop application:** Implemented. Every switch in Customise › Attention now changes real behaviour, not only a stored preference:

- **Focus** dims everything except whatever currently has focus once something is focused; nothing is hidden and the dim is pure opacity, so every element is still reachable and clickable. Nothing is dimmed while nothing is focused.
- **Low stimulation** composes with, and never overrides, both the console's own Reduced motion switch and the operating system's `prefers-reduced-motion` preference — motion is reduced when any of the three is on. It also quiets the console's ambient, lower-priority toast notifications (progress pings, confirmations); the console's other non-blocking surface — reserved for failures and the outcome of something substantial — is unaffected, so a person still sees what genuinely needs attention.
- **Time awareness** renders a small rail, present on every screen rather than only on the settings page, stating how long the session has been open and how long since anything last changed.
- **One thing at a time** adds a single free-text field to that same rail for the one next action, chosen by the person and persisted, so it survives switching screens or relaunching.
- **Momentum** shows a plain, dismissible prompt on the rail once something has sat unchanged for 20 minutes, stating only the fact ("Nothing has changed here for 40 minutes."). Its "Not now" is respected for 30 minutes, not for the length of one render.

Every switch is off by default, independent of every other, and each attention-mode switch's own on/off position is restored after a relaunch, not only the underlying behaviour.

**Documentation website:** Partial. The site's settings page includes placeholder entries naming these modes; none of the five behaviors are actually wired to change the rendered page yet.

## Failure modes

A failure here is silent by nature — a switch that persists correctly but changes nothing on screen — which is exactly the state this feature shipped in before it was wired. The wired tests in `attention-modes-wired.test.tsx` exist specifically to catch that: they assert on the actual rendered markup and DOM side effects (a real injected style element, a real snoozed timestamp) rather than only on `presentationFor()`'s return value, because a correct pure function that nothing calls passes every test on the pure function alone.

## Accessibility and localization

The rail (`attn-rail` and its children) uses `role="complementary"` with an `aria-label`, and the momentum prompt uses `role="status"`. The next-action field and the Not now button are ordinary keyboard-reachable `<input>`/`<button>` elements. Copy is plain English today; the console's language-mode and funny-level machinery has not yet been extended to this rail's own strings, which remains open work tracked alongside the rest of the feature.

## Verification

`attention-modes.test.tsx` covers the pure module (`presentationFor`, `momentumPrompt`, `elapsedPhrase`, and the storage-backed helpers for the chosen next action and the momentum snooze). `attention-modes-wired.test.tsx` covers the actual `App.tsx` wiring: real control changes producing real presentation changes, a real style element appearing and disappearing in the document, the rail rendering only what each mode's own state says it should, and the switches' own on/off position surviving a restore. Both suites run under `npm run test:renderer`.

## Suggested articles

[Accessibility](accessibility.md), [Non-blocking notifications](non-blocking-notifications.md), [Platform feature index](README.md).
