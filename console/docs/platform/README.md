# Platform feature contracts

## Current evidence boundary

The current source commit is `7c6e0c6c9520c6fd421cabf73bcbb6af15a18c60` on `main`. The
platform articles below describe the intended contract and the state that was actually observed
for each surface. The latest console release and Pages deployment target this SHA, but the release
workflows do not run local tests, accessibility checks, UI interaction, or design-parity checks.
Those evidence columns remain unverified until a dedicated run records them.

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
- [Destination deep links](destination-deep-links.md)
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
- [Site history and delivery workspace](site-history-and-delivery.md)

## Exemptions

The local file converter and Ollama suite are now present as separate local surfaces. The desktop routes are `desktop://console/#surface=converter` and `desktop://console/#surface=ollama`; the Pages equivalents are `converter.html` and `ollama.html`. Their current evidence is `implemented-unverified`: the converter catalog and PDF capability read are mounted through the control plane, while picker and queue mutations remain explicitly unavailable until their handlers are registered. The Ollama desktop client reports a typed bridge-unregistered state until its privileged dispatcher is mounted. Neither surface invents models, health, conversion output, or sample data.

