# Local Ollama suite manager

The desktop console has a mount-ready React surface for inspecting and operating a local Ollama installation through a privileged backend boundary. The surface does not call Ollama directly. It accepts an `OllamaSuiteClient`, renders typed responses, and treats the backend as the authority for health, inventory, progress, capability, storage, chat, launch, snapshot, and rollback state.

## Behavior

The surface is split into four destinations:

1. **Model Store** presents every model and published variant returned by a completed catalog traversal. Catalog evidence includes source identity, revision when available, refresh time, last successful refresh, page count, completeness, staleness, and whether an offline cache is in use. Installed models are reconciled with the official catalog without hiding either set.
2. **Pull queue** schedules local model pulls with bounded backend-controlled parallelism. It reports byte progress only when Ollama supplies bytes, keeps per-item states, and distinguishes completed, skipped, cancelled, and failed items. One failed item does not turn a partial result into success or remove a valid completed model.
3. **Local chat** creates sessions only with installed variants that report chat capability. It displays streamed partial output as partial, supports stop, backend-validated generation settings, local session history, and attachment controls that remain visible but disabled when the selected model lacks the required capability.
4. **Harness profiles** lists bundled and registered allowlisted profiles. Registration uses semantic executable and folder pickers plus an existing argument profile. Preflight exposes the selected executable, redacted environment-key names, arguments, working directory, required resources, blockers, warnings, and hardware-fit evidence. Launch requests create a backend snapshot first, and failed launch state includes automatic rollback evidence.

The exported registration descriptor is `OLLAMA_SUITE_REGISTRATION`. It names the `OllamaSuite` component, stylesheet, backend contract, palette terms, and this article without mutating central navigation. A later integration change can mount the component with the backend adapter:

```tsx
import { OllamaSuite } from './ollama-suite';

<OllamaSuite client={ollamaSuiteClient} />
```

The surface starts with a pending snapshot rather than seeded content. No model names, simulated progress, fake health results, or placeholder harnesses are bundled in the renderer.

## Search and filters

The model catalog, chat-session list, and harness-profile list each have their own search state and adjacent regex builder. Plain text is the default. The builder provides guided literal, character-class, anchor, group, alternation, and quantifier controls, a raw pattern field, flags, bounded sample text, syntax feedback, live match previews, and capture groups.

Pattern evaluation runs through the backend contract with explicit maximum pattern length, maximum sample length, timeout, and match count. Every response names the actual engine, dialect, and escaping rules beside the result. The renderer never evaluates an untrusted regular expression on its own event loop. The backend returns matched stable identifiers, so a search result cannot silently substitute a different model or session with the same visible label.

Model filters include installed state, running state, hardware-fit verdict, family, and capability. Filter choices come from backend-returned variants. There is no hard-coded model family or capability catalog in the renderer.

## Hardware-fit evidence

Each variant carries one conservative verdict: **Runs well**, **Runs with limits**, **Unlikely**, or **Unknown**. The evidence table can include total and available RAM, GPU and usable VRAM, driver or backend support, free destination storage, exact blob size, parameter count, quantization, declared context, and configured overhead.

The renderer does not calculate a verdict from the model name. Missing facts stay missing, assumptions remain visible, and an incomplete result becomes **Unknown** or another conservative backend verdict. The UI states that a verdict is evidence, not a promise.

## Configuration

The central mount must provide one object satisfying `OllamaSuiteClient` from `ollama-suite-model.ts`. The client must:

- return discriminated `BackendResponse<T>` values with a request ID and observation time;
- expose a full initial snapshot and monotonically sequenced subscription events;
- traverse the complete official catalog with pagination and preserve verified offline cache evidence;
- perform bounded regex evaluation and return stable matched identifiers;
- own all local HTTP calls, pull-queue persistence, chat streaming, file picking, preflight, process launch, configuration snapshots, and rollback;
- redact secrets before any response reaches the renderer;
- return a named recovery action and retryability for every failure.

The stylesheet uses Material Design 3 color-role custom properties when the host provides them and includes accessible fallbacks. It supports narrow layouts, keyboard focus, scrollable evidence tables, adequate targets, high text density, and reduced motion.

## Failure modes

The surface renders these states explicitly:

- **Ollama missing:** health evidence says the runtime is not installed, and only backend-provided recovery actions are offered.
- **Ollama stopped:** installed state remains distinct from a running healthy service.
- **Ollama unhealthy:** the exact failed health reason and recovery action remain visible.
- **Endpoint offline:** the UI does not claim that the runtime is stopped or missing when the local endpoint simply cannot be reached.
- **Catalog offline or stale:** the last verified catalog may remain visible, marked with its age and completeness. A partial refresh is never labelled exhaustive.
- **No local models:** the catalog remains usable while chat and other installed-model actions explain the missing condition.
- **Insufficient storage:** batch pull is disabled when backend-reported additional storage exceeds backend-reported free destination storage.
- **Unsupported capability:** the control stays visible and disabled with the exact model capability gap and an in-product route back to model filtering.
- **Partial pull failure:** completed and failed counts are separate, and retry applies only to a retryable failed item.
- **Chat interruption:** the session and partial message remain visible with the reported interruption and recovery action.
- **Preflight blocked:** the launch action remains disabled and every blocker remains visible.
- **Launch failure and rollback:** snapshot identity, rollback state, rollback reason, and an explicit restore action remain visible. No local click is treated as launch or restore success.

## Security and privacy

The renderer uses no arbitrary command field. Harness registration selects an executable, optional working directory, and allowlisted argument profile through backend-owned pickers. The backend must reject command concatenation, unregistered arguments, ambient environment expansion, and unallowlisted executables.

Local Ollama traffic belongs at the privileged application boundary. The backend must allowlist loopback endpoints, bound request and response sizes and timeouts, cancel superseded work, and validate every response before returning it to the renderer. Credentials and secret environment values belong in the operating-system credential store. They must not enter arguments, configuration snapshots, logs, chat history, exports, captures, or renderer state.

Model pulls disclose their network transfer and destination storage cost. Chat prompts, attachments, and responses remain local. Export work must redact credentials, environment values, private paths, and raw backend payloads.

## Verification status

This change intentionally did not run tests, type checks, builds, packaging, runtime interaction, or screen captures. It was produced under an ultra-speed implementation lane whose evidence is limited to source and diff inspection. The component is not a shipped navigation destination until a separate integration change supplies the real backend client and mounts the registration descriptor.

Required follow-up verification includes:

- compile the renderer against the integrated backend client;
- exercise missing, stopped, healthy, unhealthy, offline, stale, partial, and complete catalog snapshots;
- prove every catalog page and published tag is represented;
- exercise plain and regex searches with bounded backend evaluation;
- prove all four fit verdicts from complete and incomplete evidence;
- exercise insufficient storage, partial pull results, pause, resume, cancel, and retry;
- exercise streaming, stop, interruption, session persistence, and capability-gated attachments;
- exercise semantic harness pickers, blocked and ready preflight, snapshot, launch failure, automatic rollback, and manual restore;
- verify keyboard operation, screen-reader names and states, narrow widths, high display scales, and the real packaged desktop surface.

## Suggested articles

[Regex builder](regex-builder.md), [Guided forms](guided-forms.md), [Long-operation progress](long-operation-progress.md), [Non-blocking notifications](non-blocking-notifications.md), [Local version history](local-version-history.md), [Platform feature contracts](README.md).
