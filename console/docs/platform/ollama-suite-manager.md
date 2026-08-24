# Local Ollama suite manager

The documentation site exposes an Ollama manager at `ollama.html`. It is a browser-local equivalent, not a cloud model store and not an Ollama replacement. It makes no request when the page opens.

## Explicit loopback bridge

The user enters and approves one endpoint before a request can start. The source accepts only `localhost`, `127.0.0.1`, or `[::1]`, rejects credentials, query strings, fragments, and non-HTTP(S) URLs, and reports HTTPS mixed-content and browser CORS refusal as distinct boundaries. Missing, stopped, unhealthy, offline, timed-out, and malformed responses remain visible with an installed-app recovery action. The page does not offer a shell command, guessed download, cloud fallback, or web hunt.

## Runtime and model state

After approval, the page asks the documented local API for version, installed tags, and running tags with bounded response sizes and timeouts. It renders only returned model records. The official catalogue is not fetched by this browser surface, so catalogue completeness stays **Unknown** and is never inferred from installed tags. Search uses plain text by default and its own adjacent regular-expression builder.

## Pull, metadata, and chat

Pull and chat controls stay disabled until a real model tag is returned. Pull and chat use bounded newline-delimited streams with cancellation and visible progress or partial output. Capability metadata is requested from the selected model through the local API and is never guessed when fields are missing. No sample model is seeded.

## Verification boundary

This feature was implemented in the source lane without running a build, lint, test suite, browser session, network request, or screen capture. The next verification pass must build the site and exercise approval, loopback validation, mixed-content, CORS, stopped service, stale catalogue, installed/running model data, pull cancellation, chat cancellation, malformed response, and capability metadata states from the built artifact.

## Suggested articles

- [External settings sources](external-settings-sources.md)
- [In-context recovery](in-context-recovery.md)
- [Regex builder](regex-builder.md)
