# External settings sources

Lets a scheduled setting take its value from a local rule, a versioned HTTPS API, or a Home Assistant boolean entity. This article documents the privileged source contract. The renderer integration and user-facing editor remain separate work.

## Behavior

The control-plane handler accepts the same setting targets as `ScheduleAssignment` in `console/shared/settings-schema.ts`: language, School mode, attention modes, narration, display name, and appearance values. The response is versioned, carries an `active` boolean, and carries only an allowlisted assignment array. Unknown fields, unknown targets, duplicate targets, invalid value ranges, malformed JSON, unsafe object keys, oversized bodies, and deeply nested bodies are rejected before an assignment can be selected.

The local source performs no network request and uses the rule's own assignments. The HTTPS source performs a bounded `GET` with `redirect: error`. HTTPS is required, while HTTP is accepted only for loopback development addresses. URL credentials, file paths, UNC-style paths, private and link-local IP literals, multicast addresses, local hostnames, and non-HTTP protocols are rejected. The Home Assistant source calls only `/api/states/<entity>` for a validated `binary_sensor.*` or `input_boolean.*` entity and interprets exactly `on` as active and `off` as inactive.

Each non-local source has a refresh interval from 1 to 1440 minutes. A store skips a refresh that arrives before the next permitted time unless the caller explicitly requests a manual refresh. Every refresh has a hard deadline and a generation number. A newer refresh cancels the older one, and a stale result cannot overwrite the newer state.

## Configuration

Home Assistant stores only a bounded credential-vault account reference. The token is read at request time, used in memory for that request, and never placed in settings, history, exports, logs, or renderer state. The handler factory receives the vault reader and fetch implementation as injected seams, so the application can bind them in the privileged process without making the shared contract perform I/O.

Remote assignments are held in memory as the last accepted reading. They are never written into the local settings base. When a source is inactive, the local base assignments remain effective. When a refresh fails, the store uses a still-valid last accepted active reading when one exists; otherwise it uses the local base assignments. The state projection exposes the status, assignment count, timestamps, fallback flag, and safe diagnostic only. It never exposes the endpoint, vault reference, token, response body, or remote payload.

## Failure modes

The state model distinguishes `offline`, `auth-error`, `rate-limited`, `malformed`, `timeout`, `blocked`, `cancelled`, and `failed`, plus the normal `active`, `inactive`, `refreshing`, `stale`, and `idle` states. HTTP 401 and 403 are authentication failures, HTTP 429 is rate limiting, bounded 408, 504, and 5xx responses are offline, and redirect or URL-policy violations are blocked. Expired API responses are stale and cannot become the effective value. A response body or credential is never included in a diagnostic.

## Security and privacy

The client is designed for the privileged boundary. It does not read arbitrary files, follow redirects, accept a caller-supplied header, discover tokens from environment variables, or send a token to any host other than the validated Home Assistant base URL. The Home Assistant path is constructed from a validated base URL and entity identifier, with query and fragment removed. Response bytes are capped before parsing, JSON depth and object keys are bounded, and the assignment target list is explicit.

## Current status

**Desktop application:** The shared contract, privileged handler factory, in-memory fallback store, and renderer-safe state projection are implemented. Dispatch and UI wiring are intentionally separate so the source can be reviewed before it is connected to the application lifecycle.

**Documentation website:** The site does not execute privileged source reads. This article records the contract and the browser boundary without claiming that a static page can access an operating-system credential vault.

## Verification boundary

This lane adds no network requests, runtime interaction, tests, builds, or captures. The next integration lane should bind the handler through the privileged dispatch path, exercise injected fetch and vault seams, and verify the built application states. The source contract is intentionally dispatch-ready but not a claim that the application already exposes the feature.

## Suggested articles

[Scheduled settings](scheduled-settings.md), [Platform feature index](README.md), and [Local version history](local-version-history.md).
