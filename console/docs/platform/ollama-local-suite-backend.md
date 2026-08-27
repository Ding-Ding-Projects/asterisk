# Local Ollama suite backend

Provides the bounded, local service layer for inspecting and operating an Ollama installation through its documented loopback HTTP API. This article covers the backend contract only. The desktop application does not expose these actions until its dispatcher and user interface integrate the handler maps described below.

## Behavior

The backend provides independent typed handler maps for these areas:

- Runtime health and version, installed models, running models, model details, copy, and deletion.
- Verified catalogue refresh through an injected paginated source, with source identity, revision, refresh timestamp, page count, completeness, and staleness recorded together.
- Exact reconciliation between catalogue variants and the models Ollama reports as installed or running. Installed models missing from the catalogue remain visible as installed-only records.
- Conservative hardware-fit assessment with four results: Runs well, Runs with limits, Unlikely, and Unknown. Every result carries measured evidence, explicit assumptions, and blockers.
- A durable pull queue with bounded parallelism, per-item byte progress when Ollama supplies it, cancellation, retry, restart recovery, and reconciliation against current installed state.
- Multi-session streamed chat with model capability checks, validated generation parameters, bounded content and attachments, event delivery, cancellation, retry, and regeneration.
- Application-owned harness profile preflight, launch, configuration snapshots, one-click restore, and automatic rollback after a failed launch or health check.

Each module exports a typed handler factory. A later integration step may compose those maps into the shared dispatcher without duplicating behavior.

## Configuration

The Ollama client accepts only an HTTP loopback endpoint. The default is `http://127.0.0.1:11434/`. Credentials, non-loopback hosts, redirects, unrecognized API paths, oversized responses, invalid UTF-8, and malformed JSON are refused.

Catalogue refresh uses an injected `OllamaCatalogPageSource`. This is intentional because Ollama's documented loopback API exposes local tags, not an exhaustive official online catalogue. The source must supply every page and variant, keep one stable source identity and revision throughout a refresh, end with an explicit terminal page, and never substitute a curated subset.

Durable state is written beneath application data through `OllamaStore`. The file has a versioned schema, bounded record counts, a 32 MiB size ceiling, serialized writes, a unique temporary file per mutation, bounded rename retries, and restrictive file permissions where the platform supports them.

Harness execution requires an application-supplied registry of executable policies, fixed argument rules, environment rules, working-directory roots, mutable configuration keys, health checks, a structured process launcher, and a configuration adapter. Profiles identify a registered executable policy. They never contain a command line or shell script.

## Failure modes

- A refused or timed-out loopback endpoint reports a stopped state. A reachable endpoint with an invalid response reports unhealthy. The backend does not claim that Ollama is missing when the loopback observation cannot distinguish missing from stopped.
- If an official catalogue refresh fails and a verified cache exists, the previous complete snapshot remains available and is marked stale with the exact refresh reason. With no cache, the catalogue is explicitly unavailable and incomplete.
- Fit becomes Unknown when exact blob size, available RAM, or free destination storage was not measured. Missing measurements never become zero.
- Pull records retain failed, cancelled, skipped, and completed outcomes independently. One failed item never turns the batch into a complete success or removes another installed model.
- Chat refuses image attachments unless the selected model reports vision capability. Streams that exceed response limits are cancelled and reported as failed rather than truncated into a success.
- Harness preflight refuses missing models, unknown policies, shell or script launchers, unrecognized arguments, credential-bearing fields, paths outside allowlisted roots, unknown environment keys, unavailable health checks, and invalid ports.
- Harness configuration is restored automatically when launch or health verification fails. A successful launch retains its snapshot so the user can restore it explicitly later.

## Security and privacy

The Ollama transport never calls a cloud model service and never accepts a non-loopback endpoint. It uses explicit API paths, separate structured request fields, bounded response decoding, request deadlines, and cancellation signals.

The persistent store rejects fields whose names indicate passwords, tokens, credentials, API keys, or private keys. Chat message content stays in memory in this backend contract rather than being written into the plain state file. Product integration must keep operating-system credential storage and redacted export behavior at the application boundary.

Harness launch is application orchestration. Ollama does not launch arbitrary programs. The executable path comes from a reviewed policy, arguments are compiled from typed allowlist rules, and only declared environment keys reach the launcher. Shells, script hosts, script files, free-form commands, and ambient secret-bearing environment fields are refused.

## Dispatch integration

The handler factories are:

- `createOllamaRuntimeHandlers`
- `createOllamaCatalogHandlers`
- `createOllamaFitHandlers`
- `createOllamaPullHandlers`
- `createOllamaChatHandlers`
- `createOllamaHarnessHandlers`

They use the action names declared in `console/shared/ollama.ts`. This backend lane does not edit `console/control-plane/dispatch.ts`, the Electron bridge, or renderer code. Until those seams are integrated, the installed application cannot call the new actions.

## Verification

No tests, type checks, lint, build, packaging command, runtime request, or screen capture ran for this ultra-speed implementation lane. The evidence available from this lane is source inspection and its committed diff. Integration must run the repository's local checks, deliberately exercise absent, unhealthy, stale, cancelled, failed, and rollback states, and verify the built application before describing the feature as shipped.

## Suggested articles

[Guided forms](guided-forms.md), [Long-operation progress](long-operation-progress.md), [Local version history](local-version-history.md), [Platform feature contracts](README.md).
