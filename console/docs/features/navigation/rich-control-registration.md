# Rich control registration

The desktop renderer exposes one registry for destination navigation, component settings, and appearance-editor properties. It is built from the checked-in design screen catalogue and the shared appearance property list, so a palette result can identify the exact destination and control without matching display text.

## Behavior

Every design control with a writable kind becomes a command-registry entry with a stable id, a live value reader, one handler, and an exact teleport target. Select, segmented, and chip controls keep their real option lists. Action-only text controls are excluded from writable registration because their value is a status report, not an editable setting. Appearance properties use the same registry with a global appearance target and the persisted appearance store as their handler.

The central renderer exposes the registry to the compiled palette as `paletteItems`, while the full registry and descriptors remain available to richer palette hosts. Activating a row opens the exact destination. Changing a registered value routes through the same generated control setter used by the visible editor, so persistence, validation, localization, and local history remain owned by the existing setting path.

## Appearance mount

After the durable settings snapshot hydrates, the renderer creates the versioned `AppearanceStore`, installs the shared rainbow stylesheet, marks rendered controls with stable `data-appearance-id` values, and binds `AppearanceRuntime`. Store updates remount the real document. Values are persisted through the existing durable settings bridge, and a failed draft or apply operation leaves the previous value active with an honest notification.

## Failure modes and recovery

An unavailable control handler, value reader, option provider, duplicate id, invalid target, inverted numeric range, or missing select option provider fails registry creation. A control with no real option set is not presented as a select. A stale or missing appearance target remains stored as an unmatched warning and is never applied to a similarly named element. If the durable storage bridge is unavailable, the appearance runtime stays session-local and the generated editor continues to report its existing state rather than claiming a persisted write.

## Verification boundary

This lane did not run tests, lint, type checking, builds, packaging, runtime interaction, or captures. The registry and mount are source-level integration only. Built-artifact verification must exercise palette search, exact destination activation, every registered setting control, appearance-property edits, persistence across relaunch, unavailable-cache diagnostics, and suppression during each startup-context state.

## Suggested articles

[Tabs, searches, anchored regex builders, and the command palette](tabs-search-palette-core.md), [Material appearance system](../../platform/material-appearance.md), [Appearance runtime core](../../platform/appearance-runtime-core.md), and [Local version history](../../platform/local-version-history.md).
