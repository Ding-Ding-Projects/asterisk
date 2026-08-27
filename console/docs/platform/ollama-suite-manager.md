# Local Ollama suite manager

The desktop console has a mount-ready React surface for a local Ollama installation, and the documentation site has a browser-local equivalent at `ollama.html`. Neither is a cloud model store or an Ollama replacement. The desktop surface accepts an `OllamaSuiteClient`; the site requires an explicitly approved loopback endpoint. Both treat observed backend data as authoritative and never seed sample models, simulated progress, or fake health results.

## Behavior

Two independent implementations, and the difference is not cosmetic. The desktop surface is a
mount-ready React surface that delegates every privileged act to an `OllamaSuiteClient` a host
registers. The site surface is a browser page that can reach a loopback Ollama directly, but only
after a person has explicitly approved one endpoint — and a browser cannot page the official catalog,
so it says its catalog completeness is **Unknown** rather than inferring one from what happens to be
installed.

What both refuse to do is the part worth stating first: neither seeds a sample model, a simulated
progress bar, or a fabricated health result. An empty screen here means the backend returned nothing,
and it says so.

### Desktop behavior

The desktop surface has four destinations. Model Store presents every model and variant returned by a completed catalog traversal with source identity, revision, refresh time, last successful refresh, page count, completeness, staleness, and offline-cache evidence. Installed tags are reconciled with the catalog without hiding either set.

Pull queue schedules local pulls with bounded backend-controlled parallelism, byte progress only when Ollama supplies bytes, durable per-item state, cancellation, retry, and honest completed, skipped, cancelled, and failed outcomes. One failed item does not remove a valid installed model or turn a partial result into success.

Local chat uses installed variants that report chat capability, streams partial output as partial, supports stop, validated generation settings, local session history, and attachment controls that remain visible but disabled when capability is missing. Harness profiles are bundled or registered through semantic executable and folder pickers and allowlisted argument profiles. Preflight shows the executable, arguments, working directory, redacted environment-key names, required resources, blockers, warnings, and hardware-fit evidence. Launch snapshots the profile and configuration first, and failed launch state includes rollback evidence.

The central mount must provide `OllamaSuiteClient` from `ollama-suite-model.ts`. It owns local HTTP, catalog pagination, offline cache evidence, bounded regex evaluation, pull persistence, chat streaming, file picking, preflight, process launch, snapshots, rollback, and secret redaction. Search state is separate for the catalog, chat sessions, and harness profiles. Plain text is the default and each search has its own adjacent regex builder with bounded evaluation.

Hardware fit is one of **Runs well**, **Runs with limits**, **Unlikely**, or **Unknown**, backed by observed RAM, GPU and VRAM, driver or backend support, free storage, exact blob size, parameter count, quantization, context, and overhead. Missing facts remain missing and produce a conservative verdict.

### Documentation site behavior

The site asks the user to approve one endpoint before a request can start. It accepts only localhost, `127.0.0.1`, or `[::1]`, rejects credentials, query strings, fragments, and unsupported schemes, and reports mixed-content and browser CORS boundaries distinctly. It offers no shell command, guessed download, cloud fallback, or web hunt.

After approval, it reads version, installed tags, and running tags through the documented local API with bounded response sizes and timeouts. The official catalog is not fetched by this browser surface, so catalog completeness remains **Unknown** and is never inferred from installed tags. Pull and chat remain disabled until a real model tag is returned, use bounded newline-delimited streams, and support cancellation and partial output. Capability metadata comes from the selected model and is never guessed.

## Configuration

There is no settings file on either side, and exactly one thing a person configures at all: the site's
endpoint.

**On the site.** One endpoint, approved explicitly before any request can start. It is accepted only
when the host is `localhost`, `127.0.0.1` or `[::1]`. Credentials in the URL, a query string, a
fragment and an unsupported scheme are each rejected by name, and mixed-content and browser CORS
refusals are reported as themselves rather than folded into a generic failure — a page served over
HTTPS being unable to reach `http://localhost` is a browser rule, not a broken Ollama, and telling
the reader which one they are looking at is the whole job. There is no shell command to copy, no
guessed download, no cloud fallback, and no instruction to go and search the web.

**On the desktop.** Nothing is configured; a host registers an `OllamaSuiteClient` from
`ollama-suite-model.ts` and that client owns local HTTP, catalog pagination, offline-cache evidence,
bounded pattern evaluation, pull persistence, chat streaming, file picking, preflight, process launch,
snapshots, rollback and secret redaction. Pull parallelism is backend-controlled rather than a
renderer setting.

**Harness profiles** are the one place a person supplies executables, and they are deliberately not
free text: profiles are bundled, or registered through semantic executable and folder pickers with
allowlisted argument profiles. The renderer accepts no arbitrary command field, so there is no
configuration route that ends in an arbitrary process launch. Secrets stay in the operating-system
credential store and never enter arguments, snapshots, logs, history, exports, captures or renderer
state.

Search state is separate for the catalog, chat sessions and harness profiles. Each defaults to plain
text and carries its own adjacent regular-expression builder with bounded evaluation; that per-field
isolation is a contract, not a default, because one shared pattern silently filtering three lists is
the failure it exists to prevent.

## Failure modes and recovery

Missing, stopped, unhealthy, offline, timed-out, and malformed runtime states remain visible with backend-provided recovery actions. Stale or partial catalogs are never labeled exhaustive. No local models, insufficient storage, unsupported capability, partial pull failure, chat interruption, blocked preflight, launch failure, and rollback states each keep their exact evidence and next action visible. No local click is treated as launch or restore success without a receipt.

## Security and privacy

The renderer accepts no arbitrary command field. Harness registration uses backend-owned pickers and allowlisted executable and argument profiles. The backend allowlists loopback endpoints, bounds requests and responses, cancels superseded work, validates every response, and keeps secrets in the operating-system credential store. Credentials and secret environment values never enter arguments, snapshots, logs, history, exports, captures, or renderer state. Pulls disclose network transfer and storage cost; chat data remains local.

## Verification boundary

This lane did not run tests, lint, type checks, builds, packaging, runtime interaction, browser sessions, network requests, or screen captures. The desktop and site surfaces remain implemented but unverified until the required built-artifact and focused verification passes run.

## Suggested articles

[Regex builder](regex-builder.md), [Guided forms](guided-forms.md), [Long-operation progress](long-operation-progress.md), [Non-blocking notifications](non-blocking-notifications.md), [Local version history](local-version-history.md), [External settings sources](external-settings-sources.md), [Platform feature contracts](README.md).
