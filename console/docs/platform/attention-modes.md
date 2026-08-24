# Attention-support modes

A set of independently toggleable, off-by-default interface modes — focus, low stimulation, time awareness, one-thing-at-a-time, and momentum — aimed at attention difficulties.

## Behavior

Each mode is meant to be a separate switch: focus dims everything but the active item without hiding it, low stimulation reduces motion and non-essential notifications, time awareness shows elapsed session time, one-thing-at-a-time pins a single chosen next action, and momentum gently and dismissibly flags long-untouched work.

## Configuration

Copy in these modes would stay plain and factual, never gamified or judgmental, presented as interface accommodations rather than anything medical or diagnostic.

## Current status

**Desktop application:** Not implemented. The desktop application has none of these modes; there is no focus dimming, no stimulation reduction toggle, no elapsed-time indicator, and no momentum prompt.

**Documentation website:** Implemented for the site-owned surface. Every page exposes independently persisted focus, low stimulation, time awareness, one-thing-at-a-time, and momentum controls, all off by default. The current action and elapsed time appear on the page, and the momentum notice uses a bounded local idle interval.

## Failure modes

If no current action is entered, one-thing-at-a-time stays visually quiet rather than inventing one. Reduced-motion and low-stimulation requests stop non-essential animation; momentum never claims that work changed.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

No automated test currently exercises this feature on either surface. Verifying it today means opening the desktop application and the documentation website and checking by hand whether the behavior described above is present; where a surface is marked not implemented above, there is nothing yet to verify there.

## Suggested articles

[Accessibility](accessibility.md), [Non-blocking notifications](non-blocking-notifications.md), [Platform feature index](README.md).
