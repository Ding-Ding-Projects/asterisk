# Compiled shell truth contract

- Replaced hard-coded connection identities, dashboard metrics, live calls, table rows, history records, and operational counts with host-supplied state.
- Added fail-closed capability descriptors and host callbacks. An action remains unavailable until the host registers a handler and explains why it is enabled.
- Added typed notification severities and operation receipts. Local intent can report a request, but only a verified host receipt can report completion.
- Added loading, verified-empty, unavailable, partial, stale, and verified table states. Fields the host did not read render as a neutral em dash.
- Removed the simulated call playground. Reference documentation no longer invents runtime results.
- Added a semantic destructive-action confirmation shell with two independent keys, a full-range slider, an emergency exit, and a visible host-receipt state.
- Added semantic tab, group, menu, dialog, keyboard, focus-cancellation, reduced-motion, responsive, and touch-target contracts.
- Added real left, right, top, and bottom tab-strip docking, four independent tab-search slots, pinned-tab close protection, and safe bulk-close previews.
- Removed title-bar menus and disabled context, export, history, workspace, clipboard, authenticator, and appearance actions when no real handler exists.
- Removed the stale onboarding explainer card and the retired confirmation-credit playground, including its fake balances, sample identities, demo profiles, and invented documentation counts.
- Rewired save, export, clipboard, rename-detail, duplicate, insert, delete, and new-window actions to explicit host capabilities with receipt verification; unavailable actions now expose the host-provided reason.
- Removed success notifications for local intent that has no durable host result, so the shell no longer claims an operation happened merely because a button was pressed.

The generated renderer is intentionally not refreshed by this change. A later integration step will compile the authoritative design after the related design-control work has landed.
