# Privileged service boundaries

The desktop renderer reaches local capabilities through one typed control-plane request seam. The privileged side validates inputs again, keeps filesystem and process access out of renderer code, and returns an explicit success or refusal result.

## Personal vocabulary

`vocabulary.status`, `vocabulary.replace`, and `vocabulary.clear` operate on the private per-install cache. Replacement input is validated as bounded UTF-8 JSON with duplicate-key detection, a supported schema version, strict object keys, bounded nesting, and bounded entry and string sizes. A rejected replacement leaves the previous valid cache active. Status reports only empty, loaded, or invalid state and the replacement count. The cache path and replacement values are never returned by the service.

## Logo processing

`logo.inspect` accepts local bytes encoded by the bridge as canonical Base64 and performs signature, dimension, frame, alpha, and safe-SVG checks. `logo.cache.read`, `logo.cache.write`, and `logo.cache.clear` keep only validated derivative bytes and redacted receipts in the private application-data directory. A failed conversion cannot replace a valid cache. The conversion action remains honestly unavailable until a packaged isolated decoder is registered, so a source-tree helper or a machine-wide converter cannot silently become a runtime dependency.

## File conversion and PDF

The native file picker refuses symbolic links and non-regular files before returning a source. The converter registry enables an adapter only when its offline packaged proof matches the bytes on disk. Queue insertion rechecks source type, size, destination approval, storage capacity, disclosures, and adapter limits. `converter.pdf-validate` validates a typed operation request before any output is created. PDF writes use an atomic temporary destination and independent reopen validation when a verified PDF adapter is available.

## Local Ollama

Runtime calls are restricted to the documented HTTP loopback endpoint, with bounded responses, deadlines, redirect refusal, and typed parsing. Runtime, catalog, fit, pull, and chat handlers are composed in the dispatcher. Catalog refresh requires an injected verified official page source with stable source identity and complete pagination. Without that source, the service reports an unavailable catalog and never fabricates one. Hardware fit consumes measured evidence and returns an explicit conservative verdict. Harness registration and launch are available only when explicit allowlisted policies, configuration, process launch, and health-check adapters are provided. Otherwise the action remains unavailable rather than accepting arbitrary shell text.

All these routes are local-only. No service action places credentials, source paths, private vocabulary values, or raw user data in logs, exports, or public records.
