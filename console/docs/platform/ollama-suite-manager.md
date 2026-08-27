# Local Ollama suite manager

The desktop console has a mount-ready React surface for a local Ollama installation, and the documentation site has a browser-local equivalent at `ollama.html`. Neither is a cloud model store or an Ollama replacement. The desktop surface accepts an `OllamaSuiteClient`; the site requires an explicitly approved loopback endpoint. Both treat observed backend data as authoritative and never seed sample models, simulated progress, or fake health results.

## Behavior

Two surfaces, one rule they both keep: whatever the local Ollama actually reported is what is shown, and everything else says so. Neither seeds a sample model, invents a progress figure, or reports a health result it did not receive. Where a surface cannot know something — most visibly the site's view of catalogue completeness — the answer is **Unknown** rather than a number inferred from what happens to be installed.

### Desktop behavior

The desktop surface has four destinations. Model Store presents every model and variant returned by a completed catalog traversal with source identity, revision, refresh time, last successful refresh, page count, completeness, staleness, and offline-cache evidence. Installed tags are reconciled with the catalog without hiding either set.

Pull queue schedules local pulls with bounded backend-controlled parallelism, byte progress only when Ollama supplies bytes, durable per-item state, cancellation, retry, and honest completed, skipped, cancelled, and failed outcomes. One failed item does not remove a valid installed model or turn a partial result into success.

Local chat uses installed variants that report chat capability, streams partial output as partial, supports stop, validated generation settings, local session history, and attachment controls that remain visible but disabled when capability is missing. Harness profiles are bundled or registered through semantic executable and folder pickers and allowlisted argument profiles. Preflight shows the executable, arguments, working directory, redacted environment-key names, required resources, blockers, warnings, and hardware-fit evidence. Launch snapshots the profile and configuration first, and failed launch state includes rollback evidence.

The central mount must provide `OllamaSuiteClient` from `ollama-suite-model.ts`. It owns local HTTP, catalog pagination, offline cache evidence, bounded regex evaluation, pull persistence, chat streaming, file picking, preflight, process launch, snapshots, rollback, and secret redaction. Search state is separate for the catalog, chat sessions, and harness profiles. Plain text is the default and each search has its own adjacent regex builder with bounded evaluation.

Hardware fit is one of **Runs well**, **Runs with limits**, **Unlikely**, or **Unknown**, backed by observed RAM, GPU and VRAM, driver or backend support, free storage, exact blob size, parameter count, quantization, context, and overhead. Missing facts remain missing and produce a conservative verdict.

### Documentation site behavior

**`ollama.html` is committed but is not published.** `console/site/build.mjs` copies a fixed list of pages into `dist/` and this one is not on it, so no build of the site has emitted it and no reader has reached it. That is why the site's feature registry records `ollama-suite-manager` as `absent`. What follows describes the page as it behaves when opened directly from the source directory, which is currently the only way to open it.

The page asks the user to approve one endpoint before a request can start. It accepts only localhost, `127.0.0.1`, or `[::1]`, rejects credentials, query strings, fragments, and unsupported schemes, and reports mixed-content and browser CORS boundaries distinctly. It offers no shell command, guessed download, cloud fallback, or web hunt.

After approval, it reads version, installed tags, and running tags through the documented local API with bounded response sizes and timeouts. The official catalog is not fetched by this browser surface, so catalog completeness remains **Unknown** and is never inferred from installed tags. Pull and chat remain disabled until a real model tag is returned, use bounded newline-delimited streams, and support cancellation and partial output. Capability metadata comes from the selected model and is never guessed.

## Configuration

Nothing here reads a configuration file, and the one thing a reader must supply is supplied deliberately rather than defaulted.

On the site, that is **the endpoint, approved explicitly before any request is made**. It is accepted only if it is `localhost`, `127.0.0.1` or `[::1]`, and it is rejected outright if it carries credentials, a query string, a fragment, or an unsupported scheme. There is no remembered default and no discovery step, because a page that quietly probed loopback ports would be scanning the reader's own machine.

On the desktop, the host supplies an `OllamaSuiteClient` and the reader chooses within it: which model and variant to pull, the bounded generation settings a chat session uses, and which harness profile to launch. A harness profile is chosen through semantic executable and folder pickers against allowlisted argument profiles — there is no free-text command field anywhere in this surface, so "configure a harness" never means "type a shell line".

Pull parallelism is bounded and backend-controlled rather than a setting, so no configuration can ask the local Ollama for more concurrent work than it has said it will take.

## Failure modes and recovery

Missing, stopped, unhealthy, offline, timed-out, and malformed runtime states remain visible with backend-provided recovery actions. Stale or partial catalogs are never labeled exhaustive. No local models, insufficient storage, unsupported capability, partial pull failure, chat interruption, blocked preflight, launch failure, and rollback states each keep their exact evidence and next action visible. No local click is treated as launch or restore success without a receipt.

## Security and privacy

The renderer accepts no arbitrary command field. Harness registration uses backend-owned pickers and allowlisted executable and argument profiles. The backend allowlists loopback endpoints, bounds requests and responses, cancels superseded work, validates every response, and keeps secrets in the operating-system credential store. Credentials and secret environment values never enter arguments, snapshots, logs, history, exports, captures, or renderer state. Pulls disclose network transfer and storage cost; chat data remains local.

## Verification boundary

This lane did not run tests, lint, type checks, builds, packaging, runtime interaction, browser sessions, network requests, or screen captures. The desktop and site surfaces remain implemented but unverified until the required built-artifact and focused verification passes run.

## Suggested articles

[Regex builder](regex-builder.md), [Guided forms](guided-forms.md), [Long-operation progress](long-operation-progress.md), [Non-blocking notifications](non-blocking-notifications.md), [Local version history](local-version-history.md), [External settings sources](external-settings-sources.md), [Platform feature contracts](README.md).
