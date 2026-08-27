# Accessibility runtime core

- Added deterministic focus capture and restoration, a composed confirmation-overlay contract, Escape dismissal intent, and orientation-aware roving focus.
- Added semantic descriptors for dialogs, popovers, menus, collections, tables, disabled controls, and unread-value provenance.
- Added distinct non-color loading, verified-empty, unavailable, partial, stale, ready, and error status contracts with live announcements.
- Added reduced-motion, minimum-target, viewport-bounded overlay, keyboard panel movement, and resize primitives.
- Added a long-operation state machine with pending, progress, cancellation, deadline, timeout, failure, completion, and duplicate-start refusal.
- Central renderer mounting remains required. This fragment does not claim end-to-end accessibility coverage.
