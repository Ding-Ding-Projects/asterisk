# Accessibility runtime primitives

Shared renderer contracts now describe focus, semantic structure, asynchronous status, responsive geometry, motion preferences, and long-running operations without tying those decisions to one React component.

## Behavior

The runtime primitives provide:

- deterministic focus capture, initial focus selection, Escape dismissal intent, focus return, and a composed confirmation-overlay contract;
- orientation-aware roving focus for horizontal, vertical, and right-to-left tab strips;
- semantic descriptors for dialogs, popovers, menus, lists, tables, disabled controls, and individual data values;
- distinct loading, verified-empty, unavailable, partial, stale, ready, and error states with non-color status text and live-region announcements;
- per-cell provenance that renders unread and unavailable values as `—` while announcing why the value is absent;
- progress and countdown text that remains meaningful without color or animation;
- reduced-motion resolution where the operating-system preference takes priority;
- minimum target sizing, viewport-bounded overlay placement, recoverable panel geometry, and keyboard move or resize deltas;
- a pure operation state machine for pending work, progress, cancellation, deadlines, completion, failure, timeout, and re-entry refusal.

## Configuration

The modules expose TypeScript data and transition functions. A central renderer chooses the actual elements, live-region hosts, focus scopes, viewport values, and operation timers, then applies the returned descriptors to those surfaces.

Status severity is explicit. Failures use `error`, partial and stale data use `warning`, loading uses `progress`, verified empty data uses `neutral`, and completed data uses `success`. A renderer should map those names to both visible text and visual treatment. Color must remain supplementary.

## Current status

**Desktop application:** Primitives implemented, central mounting not implemented in this change. The modules are integration-ready, but generated screens and the root application do not yet consume them. This work therefore does not claim complete keyboard, focus, screen-reader, responsive-layout, or long-operation coverage.

**Documentation website:** Unchanged. These renderer primitives do not mount into the website.

## Failure modes and security

Returning an attribute descriptor without applying it to the corresponding element has no user-visible effect. Focus return also requires the opening component to capture a snapshot before mounting its overlay and to call restore after dismissal. The operation state machine refuses duplicate starts, but callers must route every submission path through it, including keyboard submission.

Unread values never acquire a placeholder that resembles measured data. An unavailable or stale value keeps its reason and observation metadata in the accessible description. Error text can include a recovery action, but it must not expose credentials, configuration secrets, call content, or private paths.

## Accessibility and localization

The primitives accept user-facing labels and details from their caller instead of embedding a localization system. Integration must supply localized text for the active language mode. Exact values, counts, timestamps, and operation states remain factual at every copy tone.

## Verification

No test, build, type check, UI interaction, or screen capture ran in this ultra-speed implementation lane. Central integration must add focused tests and built-application verification before any accessibility compliance claim is made.

## Suggested articles

[Accessibility](accessibility.md), [Responsive and high-scale sizing](responsive-sizing.md), [Bounded overlays](bounded-overlays.md), [Long-operation progress](long-operation-progress.md), and [Platform feature index](README.md).
