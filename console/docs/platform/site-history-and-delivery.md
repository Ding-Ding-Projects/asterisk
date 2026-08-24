# Site history and delivery workspace

The published documentation surface now carries a local delivery workspace at `history.html`. It is a browser-mediated equivalent for controls that cannot safely run from a static page. It never presents the page as the installed desktop application or as a PBX runtime.

## Behavior

- Visitor-owned history is append-only in browser storage. Each event has a timestamp, action, factual summary, and redacted details. Search, date range, and action filters compose, and a full anchored regex builder is available beside each search field.
- Restore does not rewrite an earlier event. It appends a new `restored` event that names the source event identifier. Redacted JSON and Markdown exports state that personal vocabulary, credentials, paths, and file contents were omitted.
- The changelog viewer shows the 89 product release tags by default. Optional upstream tag history is clearly separated behind an explicit local choice. Every record has a valid full object identifier, date, category, factual summary, and full commit URL. Its filtered view can be copied or exported to Markdown.
- Provider-authored Markdown is escaped before the small supported subset is rendered. Script, image, raw HTML, and executable links are not interpreted.
- A local file can be selected for inspection and export. External-editor opening remains explicitly unavailable because a normal browser does not expose a verified local path. The page provides the official Visual Studio Code download route instead, and never requests credentials.
- The browser-extension download equivalent uses the File System Access API when available. Start opens a real destination picker, progress is measured from actual chunks written, cancellation aborts the writable stream, and completion is reported only after the stream closes. Unsupported browsers remain unavailable rather than receiving a simulated transfer.
- Forge publishing is a partial generic-provider preview. The visitor reviews source, destination, account, owner, repository, and copy or fork route before opening the provider's own page. No source or destination operation occurs on this page. The provider handles sign-in and publication. No credential is collected, stored, or sent by this page, and the registry records that publication itself is not implemented here.
- The update surface reads the bundled release-manifest equivalent and reports `unavailable`, `available`, `downloading`, `ready`, or `failed` only when the manifest carries that state and a valid full commit identifier. A static page cannot install an application or claim that an update was applied.
- The shared delivery rail exposes ordinary persisted route navigation with pinning. Static-host limitations are stated beside it: grouping and reordering are not offered by this route, and the markup does not claim incomplete navigation is a full tab implementation.
- Every select control receives its own local filter field and adjacent anchored regex builder. Date filters also provide validated ISO ranges and named presets.
- A bounded local export operation disables re-entry, exposes real cancellation, and reports preparation progress while processing the current event set. Its versioned delivery state distinguishes `preparing`, `prepared`, `handoff-started`, `handoff-unverified`, and `handoff-failed`. A browser handoff never becomes a 100 percent completion claim merely because the browser accepted a click.

## Configuration

The module is `console/site/history-delivery.js`, loaded by the shared `console/site/app.js` registration on the six primary pages and directly by generated documentation pages. State schema version 2 uses the versioned `ding-pbx-site-history-delivery-v1` browser-storage key with a maximum of 250 events. Older state is migrated explicitly, persisted immediately, and recorded as a redacted migration event. Invalid state is normalized, and future state versions are refused without applying their records. The future-version refusal audit is stored separately, disclosed in its own panel, and omitted from ordinary exports. Detail metadata is recursively restricted to a small allowlist. Free summaries refuse credential-shaped values, URLs, paths, and content-bearing input before persistence or export. `console/site/generate-changelog.mjs` produces `console/site/changelog-data.js` from every local tag, and `console/site/release-manifest.js` records the versioned verified release state. Failed manifests may omit assets when their exact commit and reason are present, while available, downloading, and ready states require validated assets. The module does not make a runtime network request. `console/site/build.mjs` validates changelog completeness, exact tag targets, dates, summaries, the product-release split, and the manifest schema, then copies the module and `history.html` into deterministic published output, adds a real delivery mount host to generated article pages, loads the full builder and command-palette stack, and wires the workspace into those pages.

## Failure modes

Browser storage may be unavailable, a clipboard request may be refused, a browser may not expose File System Access, a provider may require a new sign-in, or a static page may have no verified release manifest. Each state remains visible beside the action that encountered it and offers retry, settings, or the official editor download route where applicable. None of these conditions is converted into a fake success.

## Verification

The source inventory names the history workspace, shared module registration, generated-page wiring, redacted export boundary, safe Markdown renderer, download state machine, forge boundary, editor fallback, and update status controls. Manual verification should exercise the real published artifact from a clean browser profile, including reload persistence, filter composition, invalid regex feedback, restore-as-new-event, retention preview and prune event, export omission text, File System Access cancellation and stream-close completion, provider flow refusal recovery, and static update honesty. No browser, build, test, lint, or capture run was performed in this lane.

## Suggested articles

- [Local version history](local-version-history.md)
- [In-app changelog viewer](changelog-viewer.md)
- [External editor handoff](external-editor-handoff.md)
- [Browser-extension download capture surfaces](browser-extension-download-surfaces.md)
- [In-context failure recovery](in-context-recovery.md)
- [Provider-authored markup rendering](provider-markup-rendering.md)
- [Forge publishing](forge-publishing.md)
- [Automatic updates](automatic-updates.md)
