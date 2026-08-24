# Status Hub client

## Behavior

The client provides a typed, renderer-safe connection to the project's live status service. It can:

- register a project and retain the server's registration receipt;
- read the project record and its observed checks;
- read sessions with exact ids, states, commit references, run references and evidence links;
- read each session's question list and reply inbox; and
- submit a question answer and expose the server's delivery receipt.

The client and store are mount-ready but are not mounted by this lane. The later application wiring can use `createStatusHubClient`, `createStatusHubStore`, and `createStatusHubHandlerFactory` without changing the generated design renderer.

The renderer surface derives rows only from server observations. It has no sample project, sample session, or optimistic delivery state. A question remains without a receipt until the server returns one. Polling is non-blocking, bounded, single-flight, and cancellable.

## Configuration

`StatusHubClient` accepts:

- `baseUrl`, which must be HTTPS or HTTP on `localhost`, `127.0.0.1`, or `::1`;
- optional `enrollment` and `reply` credential references; and
- optional request and polling deadlines.

Credential references use the bounded `vault://...` form. The client never accepts a bearer value, password, API key, or other credential value. A privileged host is responsible for resolving the references from its operating-system vault.

The registration descriptor is exported as `STATUS_HUB_REGISTRATION_DESCRIPTOR` for a later dispatch integration. The current route shape is:

```text
POST /api/status-hub/projects
GET  /api/status-hub/projects/:projectId
GET  /api/status-hub/projects/:projectId/sessions
GET  /api/status-hub/sessions/:sessionId
GET  /api/status-hub/sessions/:sessionId/replies
POST /api/status-hub/sessions/:sessionId/questions/:questionId/answers
```

All responses are bounded before JSON parsing. Redirects are refused, cross-origin responses are refused, and requests have deadlines. A new mount generation aborts older work and marks its late results stale.

## Failure modes

The store reports the observed availability state instead of converting a failure into an empty success:

- `unavailable`: the route or service is not reachable;
- `offline`: a network or deadline failure occurred;
- `authRequired`: the service requires authentication;
- `refused`: the service rejected the request, URL, redirect, or response bounds;
- `stale`: a newer generation superseded the request;
- `partial`: some project, session, or inbox data arrived while another read did not; and
- `error`: the response shape or JSON was invalid.

An answer submission that receives a transport error does not create a receipt. A refusal returned by the server is shown only when it is part of the typed server receipt.

## Security and privacy

The client does not log request bodies, response bodies, credential references, or credential values. It sends only a vault reference header to the configured origin. URL parsing rejects embedded credentials, fragments, unexpected origins, and non-HTTPS non-loopback transport. Response bodies are limited to 512 KiB, lists are bounded, and all strings are length-checked before entering renderer state.

The renderer receives project and session evidence links, states and ids, but no enrollment or reply credential material. The client does not follow redirects. A host integration must keep vault resolution in the privileged boundary and must never pass the resolved value through renderer code.

## Verification boundary

This lane was implemented without launching tests, builds, lint, network requests, runtime interaction, or capture workflows. The decisive verification remains the later integration's typed build and server-contract checks against the exact endpoints recorded above.

Suggested articles: [Status Hub](../platform/status-hub.md), [local security](../system/security.md), and [hosted authentication](../platform/in-context-recovery.md).
