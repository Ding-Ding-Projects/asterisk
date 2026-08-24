# Site history and delivery workspace

The published documentation surface now carries a local delivery workspace at `history.html`. It is a browser-mediated equivalent for controls that cannot safely run from a static page. It never presents the page as the installed desktop application or as a PBX runtime.

## Behavior

- Visitor-owned history is append-only in browser storage. Each event has a timestamp, action, factual summary, and redacted details. Search, date range, and action filters compose, and a full anchored regex builder is available beside each search field.
- Restore does not rewrite an earlier event. It appends a new `restored` event that names the source event identifier. Redacted JSON and Markdown exports state that personal vocabulary, credentials, paths, and file contents were omitted.
- The changelog viewer carries a date, category, factual summary, and full commit URL for each recorded change. Its filtered view can be copied or exported to Markdown.
- Provider-authored Markdown is escaped before the small supported subset is rendered. Script, image, raw HTML, and executable links are not interpreted.
- A local file can be selected for an external-editor handoff. The page requests the `vscode://` protocol for a previously prepared export and provides the official Visual Studio Code download route when a browser blocks that protocol. The browser remains the owner of local paths and credentials are never requested.
- The browser-extension download equivalent performs a real local file handoff to the browser download manager. Start, browser-owned progress, cancellation, and user-confirmed completion are distinct states. The page never invents byte progress, rate, ETA, pause, or completion.
- Forge publishing is a browser handoff. The visitor chooses an account mode, owner, repository, and copy or fork route; the provider's own page handles sign-in and publication. No credential is collected, stored, or sent by this page.
- The update surface can record a local check and reload the published page. A static page cannot install an application or claim that an update was applied.
- A bounded local export operation disables re-entry, exposes real cancellation, and reports progress while processing the current event set.

## Configuration

The module is `console/site/history-delivery.js`, loaded by the shared `console/site/app.js` registration on the six primary pages and directly by generated documentation pages. State uses the versioned `ding-pbx-site-history-delivery-v1` browser-storage key with a maximum of 250 events. The module does not make a runtime network request. `console/site/build.mjs` copies the module and `history.html` into the deterministic published output and wires the module into generated article pages.

## Failure modes

Browser storage may be unavailable, a clipboard request may be refused, a `vscode://` protocol may not be registered, a browser download may be cancelled, a provider may require a new sign-in, or a static page may be unable to observe a transfer. Each state remains visible beside the action that encountered it and offers retry, settings, or the official editor download route where applicable. None of these conditions is converted into a fake success.

## Verification

The source inventory names the history workspace, shared module registration, generated-page wiring, redacted export boundary, safe Markdown renderer, download state machine, forge boundary, editor fallback, and update status controls. Manual verification should exercise the real published artifact from a clean browser profile, including reload persistence, filter composition, invalid regex feedback, restore-as-new-event, export omission text, browser handoff cancellation and user-confirmed completion, provider flow refusal recovery, and static update honesty. No browser, build, test, lint, or capture run was performed in this lane.

## Suggested articles

- [Local version history](local-version-history.md)
- [In-app changelog viewer](changelog-viewer.md)
- [External editor handoff](external-editor-handoff.md)
- [Browser-extension download capture surfaces](browser-extension-download-surfaces.md)
- [In-context failure recovery](in-context-recovery.md)
- [Provider-authored markup rendering](provider-markup-rendering.md)
- [Forge publishing](forge-publishing.md)
- [Automatic updates](automatic-updates.md)
