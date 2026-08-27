# Responsive and high-scale sizing

No clipped, truncated, or overlapping text or controls at narrow window widths, high display scales, or with the longest localized strings.

## Behavior

Layouts are meant to hold correctly at supported window widths and at 100/125/150/200% display scale, including the longest strings a bilingual mode would produce.

The desktop shell (`app/renderer/src/App.tsx`'s compiled console) has no `className` or `data-*` hook on any layout element — every dimension the design compiler emits is a literal pixel value baked into an inline `style` string for the console's own default 1440px window (see `app/renderer/src/dc-runtime.tsx`'s `sty()`). `app/renderer/src/styles.css` is the one place that can still change how that markup renders, because it is loaded after the compiled stylesheet and can target the same inline styles through `[style*="…"]` attribute selectors — the same technique the compiled design's own (currently dead — see below) `[style*="display:grid"] > *` rule already reaches for.

Two real width breakpoints now live there:

- **1200px** — the 268px section-list column gives back some of its fixed width (220px) once the window has clearly left the 1440px default behind.
- **1000px**, close to the console's own enforced 920px minimum window width (`app/electron/main.ts`, `minWidth: 920`) — the section list narrows further (176px), the 88px icon rail narrows too (72px), and every multi-column `display:grid` layout in the compiled console (stat tiles, table headers and rows, dialog layouts, the mini-games) collapses to a single flexed column, because CSS Grid never reflows a fixed-pixel or excess-column template on its own and there is no per-screen hook to retune any one of them individually.

Alongside the breakpoints, `styles.css` also restores a fix the compiled design already tried to ship and never actually applied: `[style*="display: flex"] > *, [style*="display: grid"] > * { min-width: 0; }`, letting a flex or grid child shrink below its own content size instead of refusing to and overflowing its row. This is unconditional (not gated to a narrow window) because it only changes anything when a row is genuinely short of room.

## Configuration

This is verified against the real built interface at each width rather than assumed from source. There is no user-facing setting; the shell responds to its own window width.

## Current status

**Desktop application:** Partial, and meaningfully improved. Real `@media (max-width: …)` breakpoints exist for the first time (previously the only `@media` rule anywhere in the app responded to `prefers-reduced-motion`, a user preference, never window width — `design-styles.css`, the compiled design output, still has zero `@media` rules of its own). Verified live against the real built Electron app (see Verification below) at the console's own enforced 920px floor and down to 700px (below that floor, for defence in depth): the two structural shell columns narrow, every multi-column grid collapses to a single column, and a real, previously-clipped control (the "+ New …" button on every `isTableLike` screen's filter row, cut off the right edge of the window at 920px before this change) is now fully on-screen.

Not covered by this pass: 150%/200% Windows display-scale was reasoned about rather than measured on real hardware DPI (Chromium lays out in CSS pixels regardless of the OS scale factor, so a window-width fix in CSS pixels applies identically at every scale — but that reasoning has not been checked against an actual scaled display). Below the console's enforced 920px floor, the title bar's own menu row (a separate, JS-computed overflow mechanism in `App.tsx`, not a CSS layout problem) can still show overlapping menu labels at very narrow widths (observed at 700px); that floor keeps a real user from ever reaching it, so it is recorded here rather than chased through a boundary this fix could not cross.

**Documentation website:** Partial. The site is responsive down to roughly phone width using relative units and wrapping containers, but has not been verified at every display scale or against long bilingual strings, since bilingual mode does not yet exist. Unchanged by this work.

## Failure modes

Clipped or overlapping text below the verified range is the specific failure this feature exists to prevent. The desktop shell is now verified clipping-free and overlap-free at and above its own enforced 920px minimum window width; below that floor (unreachable in the shipped app, but a possible target for a future change to `minWidth` or for a test harness) the fix still substantially helps but the separate title-bar overflow mechanism noted above is a known remaining gap.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference — the pre-existing `prefers-reduced-motion` rule in `styles.css` is untouched by this change. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English, and the breakpoints act on layout, not on any string.

## Verification

`console/tests/ui/responsive-breakpoints.test.mjs` asserts, against the real `styles.css` text, that: at least two genuine `max-width` breakpoints exist (not merely a per-control variant); the 1200px and 1000px tiers are both present; the icon rail and section list narrow inside the 1000px tier; every grid collapses to a flexed column inside that same tier; the `min-width: 0` restoration exists unconditionally, outside every `@media` block; and the pre-existing `prefers-reduced-motion` rule is untouched. It strips CSS comments before matching (so a commented-out rule cannot satisfy it) and anchors every `@media` match to the start of a line via brace-depth counting rather than a substring or a lazy cross-block regex. Three negative-regression cases (a mutated selector, a commented-out restoration rule, and a breakpoint condition rewritten to a value that can never match) each turn the check red; a fourth confirms `design-styles.css` — the compiled design output — still ships zero `@media` rules of its own, i.e. the responsive mechanism lives only in the hand-written file.

Beyond the automated check, this was also verified by driving the real built Electron app headlessly (Chrome DevTools Protocol against the packaged renderer) across window widths from 700px to 1440px, on the Dashboard, PJSIP endpoints, Live channels, and Trunks & registrations screens, both before and after this change.

## Suggested articles

[Accessibility](accessibility.md), [Material appearance system](material-appearance.md), [Platform feature index](README.md).
