# Rich control registration

The desktop renderer exposes one registry for destination navigation, component settings, and appearance-editor properties. It is built from the checked-in design screen catalogue and the shared appearance property list, so a palette result can identify the exact destination and control without matching display text.

## Behavior

Every design control with a writable kind becomes a command-registry entry with a stable id, a live value reader, one handler, and an exact teleport target. Select, segmented, and chip controls keep their real option lists. Order, file, and action-backed controls retain their actual control kind and handler. A target-specific control is registered only when its id exists in the canonical navigation state, otherwise it remains an explicit unavailable alternate rather than receiving a fabricated target. Appearance properties use the same registry with a global appearance target and the persisted appearance store as their handler.

The central renderer exposes the registry to the compiled palette as `paletteItems` and exposes `richPaletteRows` with live readers, option providers, exact targets, and `executeRichControl` handlers. The checked-in design now renders those rich rows through the real M3 control component. A shared live navigation adapter is the source for current workspace, strip, tab order, active tab, groups, pins, rail identity, docking, overflow metadata, and derived axis. Generated navigation state is synchronised into that adapter, and palette activation adds an unopened destination and updates tabs, screen, and rail atomically before resolving the target. A bounded render resolver keeps the inverse navigation snapshot and restores it if the target never mounts. Nested palette controls receive separate `palette-control-*` presentation IDs, while their command targets remain the underlying screen control IDs. The design compiler also assigns stable `direct-*` appearance IDs to every generated interactive element. Header activation selects the exact tab, scrolls and focuses the exact element, highlights it briefly, and reports a named stale-target result when the target is no longer present. Changing a registered value routes through the same generated control setter used by the visible editor, so persistence, validation, localization, and local history remain owned by the existing setting path. Action and history results share one operation id but emit separate actual-action and history-outcome notifications. History is advisory: action rows report that the action started, then report local-history acknowledgement or a history-unavailable state after the nested result is inspected, without converting an already-started operation into a false success. Rows without a canonical target are surfaced as explicit defects and are not silently rendered as destinations.

## Appearance mount

After the durable settings snapshot hydrates, the renderer creates the versioned `AppearanceStore`, installs the shared rainbow stylesheet, marks rendered controls with stable `data-appearance-id` values, and binds `AppearanceRuntime`. Store updates remount the real document. Values are persisted through the existing durable settings bridge, and a failed draft or apply operation leaves the previous value active with an honest notification.

## Failure modes and recovery

An unavailable control handler, value reader, option provider, duplicate id, invalid target, inverted numeric range, or missing select option provider fails registry creation. A control with no real option set is not presented as a select. A stale or missing appearance target remains stored as an unmatched warning and is never applied to a similarly named element. If the durable storage bridge is unavailable, the appearance runtime stays session-local and the generated editor continues to report its existing state rather than claiming a persisted write.

## Verification boundary

This lane did not run tests, lint, type checking, builds, packaging, runtime interaction, or captures. The registry and mount are source-level integration only. Built-artifact verification must exercise palette search, exact destination activation, every registered setting control, appearance-property edits, persistence across relaunch, unavailable-cache diagnostics, and suppression during each startup-context state.

## Suggested articles

[Tabs, searches, anchored regex builders, and the command palette](tabs-search-palette-core.md), [Material appearance system](../../platform/material-appearance.md), [Appearance runtime core](../../platform/appearance-runtime-core.md), and [Local version history](../../platform/local-version-history.md).
