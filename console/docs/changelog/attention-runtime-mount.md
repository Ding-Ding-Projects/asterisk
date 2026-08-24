# Attention runtime mount

- Mounted the five attention controls from durable settings on desktop application start, with every mode still off by default and independently persisted.
- Added live Focus dimming without hiding inactive work, low-stimulation color and motion consumers, platform reduced-motion composition, session and since-last-change values, a persisted next-action field, and factual Momentum snooze handling.
- Added Cantonese labels for the new next-action control.
- Repaired the runtime to use stable semantic design markers, acknowledged durable writes with pending, session-only, and retry states, severity-aware notification suppression, bounded snooze restoration, and centralized last-change tracking across real server, endpoint, onboarding, file, ticket, lock, and appearance mutations.
- Repaired the second pass with explicit notification severity, per-key durable write serialization and newest-generation retry handling, plus one generated `onUserMutation` callback covering controls, steppers, appearance, canvas, layout, tabs, groups, presets, and application-owned mutations.
- Group tabs by area now creates real groups, while moving a tab to a new window is labelled unavailable rather than claiming an unimplemented operation.
- Status: implemented-unverified in this lane. The design compiler ran, but no UI, accessibility, browser, capture, or built-artifact verification ran here.
