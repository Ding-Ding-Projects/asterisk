# Platform feature contracts

This category documents the canonical platform feature contracts this product is expected to implement, and states plainly, per surface, which of them are actually built today.

The two surfaces referenced throughout are the desktop application (the installed Windows console) and the documentation website (this published site).

- [Language modes](language-modes.md)
- [Funny-level sliders](funny-levels.md)
- [Dialog emoji toggle](dialog-emojis.md)
- [School mode](school-mode.md)
- [Spoken narration](narration.md)
- [Scheduled settings](scheduled-settings.md)
- [External settings sources](external-settings-sources.md)
- [Dim sum surprise](dim-sum-surprise.md)
- [Regex builder](regex-builder.md)
- [Non-blocking notifications](non-blocking-notifications.md)
- [Status hub](status-hub.md)
- [Material appearance system](material-appearance.md)
- [App logo customization](app-logo-customization.md)
- [Browser-style tabbed navigation](browser-style-tabs.md)
- [Tab groups and tab search](tab-groups-and-searches.md)
- [Command palette](command-palette.md)
- [Destructive-action super confirmation](destructive-action-confirmation.md)
- [Local version history](local-version-history.md)
- [In-app changelog viewer](changelog-viewer.md)
- [External editor handoff](external-editor-handoff.md)
- [Complete data export](complete-exports.md)
- [Bulk actions](bulk-actions.md)
- [Accessibility](accessibility.md)
- [Responsive and high-scale sizing](responsive-sizing.md)
- [Personal vocabulary upload](personal-vocabulary-upload.md)
- [Per-element toy locks](per-element-toy-locks.md)
- [Support Tickets recovery flow](support-tickets.md)
- [Unlock ladder](unlock-ladder.md)
- [Built-in authenticator](built-in-authenticator.md)
- [Attention-support modes](attention-modes.md)
- [Browser-extension download capture surfaces](browser-extension-download-surfaces.md)
- [Offline documentation browser](offline-documentation-browser.md)
- [Renameable app display name](app-display-name.md)
- [Guided forms](guided-forms.md)
- [Bounded, self-painting overlays](bounded-overlays.md)
- [Right-click menus show keyboard shortcuts](context-menu-shortcuts.md)
- [Long-operation progress reporting](long-operation-progress.md)
- [In-context failure recovery](in-context-recovery.md)
- [Provider-authored markup rendering](provider-markup-rendering.md)
- [Forge publishing](forge-publishing.md)
- [Collapsible filters and statistics](collapsible-filters.md)
- [Automatic updates](automatic-updates.md)
- [The `ding-pbx://` product route](product-route.md)

## Exemptions

Two further canonical features were considered for this product and deliberately excluded by the owner rather than left unbuilt by omission: an Ollama model-manager suite and a general local file converter. Neither shares a data path, a target, or a control surface with the rest of this console. The recorded reason for each exclusion lives in `console/inventories/exemptions.json`, not repeated here, so there is exactly one place that reason can drift out of date.

