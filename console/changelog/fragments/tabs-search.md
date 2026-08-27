# Tabs, search, and command palette core

- Added a versioned persistent navigation state for docked tab strips, pinned tabs, groups, ordering, collapsed state, and overflow planning.
- Added independent plain-text and regular-expression state for strip, group, group-name, master, menu, dropdown, palette, and bulk-close searches.
- Added bounded pattern validation and evaluation with explicit workload limits and zero-width match handling.
- Added protected bulk-close previews that block empty or invalid patterns, preserve pinned tabs by default, and refuse stale previews.
- Added capability-aware menu and dropdown filtering that keeps unavailable actions visible with a reason and refuses action rows without handlers.
- Added a handler-backed command registry and palette index with rich control descriptors, persisted sizing, and exact teleport targets.

## Integration boundary

This fragment covers reducer and adapter APIs only. The generated renderer, central application component, keyboard wiring, and rendered controls are integrated by their owning changes.

## Verification

The ultra-speed implementation pass intentionally did not run tests, lint, type checks, builds, packaging, runtime interaction, or screen captures.
