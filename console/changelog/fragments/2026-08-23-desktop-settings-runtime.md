# Desktop settings runtime core

- Added one strict versioned local settings contract for language modes, independent English and Cantonese funny levels, dialog emojis, renamed School mode, attention-support modes, per-language narration controls, display naming, appearance values, and scheduled overrides.
- Added validated hydration, snapshots, updates, resets, storage-event subscriptions, deterministic schedule precedence, cross-midnight windows, and per-setting provenance.
- Added explicit School-mode suppression, narrator mounting and queue-status APIs, and strict personal-vocabulary parsing with duplicate-key detection and cache revalidation.
- Kept package identity separate from the user-visible display name and excluded secrets from the persisted schema.
- Browser-storage refusal during runtime construction now falls back to one shared memory-only store with explicit `session-memory` provenance instead of terminating startup.
- The application shell has not mounted this core yet. No tests, type checking, builds, packaging, UI interaction, or captures ran in this ultra-speed change.
