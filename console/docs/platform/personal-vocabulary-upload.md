# Personal vocabulary upload

The desktop console and documentation website each provide a local JSON upload control that lets a person replace chosen interface wording without shipping a built-in personal dictionary.

## Configuration

The only accepted top-level shapes declare exactly one version field and exactly one source field:

```json
{"version":1,"replacements":[{"from":"source text","to":"preferred text"}]}
```

`schemaVersion` is accepted instead of `version`. `replacements` can be the array above or an object map. `terms` is accepted only as an object map. Every accepted form is normalized before caching to `{ "version": 1, "replacements": [{ "from": "…", "to": "…" }] }`.

The loader accepts at most 64 KiB, four nesting levels, 256 entries, 128 characters in each source term, and 256 characters in each replacement. Root objects and replacement entries reject unknown fields. Duplicate raw JSON keys, duplicate source terms, unsafe object keys, malformed JSON, incorrect version, wrong types, oversized input, and ambiguous aliases are all rejected.

## Behavior

Validation completes before the cache changes. A rejected upload leaves the last valid local cache active. Every cache read is revalidated, and a corrupt or stale cache is removed before original wording is used. Clear removes the cache and restores original wording immediately.

Replacements apply longest source first to user-interface copy and accessible names. They are not applied to commands, URLs, identifiers, code, paths, logs, exports, history, diagnostics, provider-authored records, or elements marked as technical boundaries. The site keeps the same boundary by excluding script, style, code, keyboard, preformatted, form, and `data-no-vocab` content.

## Privacy and security

The selected file is processed only in local browser or application storage. Neither loader performs a network request. File names, paths, mappings, cache contents, and replacement values are omitted from exports, local history, telemetry, diagnostics, captures, and public records. The ordinary settings export explicitly says that personal vocabulary was omitted.

## Failure states

The control states are no file loaded, loaded, invalid or rejected, replaced by a new valid file, clear/reset, and cache-corrupt fallback. Rejection text stays beside the upload control because it can quote private input. The narration path announces only that a rejection happened, not the private reason.

## Verification

`console/app/renderer/src/personal-vocabulary.ts` validates the desktop contract with strict duplicate-key detection and canonical normalization. `console/site/tests/contracts/personal-vocabulary-upload.test.mjs` checks the site control, aliases, canonical cache, bounds, duplicate and unsafe-key refusal, retained-good-cache behavior, corrupt-cache purge, longest-first application, technical-boundary exclusion, export omission, and no-network boundary. `npm run bundle:docs` regenerates the desktop documentation bundle from this article, and the documentation drift check verifies the generated bundle stays current.

The contract has source and focused test evidence. Real built-artifact interaction and capture evidence remain part of the final headless verification pass.

## Suggested articles

[Language modes](language-modes.md), [Funny-level sliders](funny-levels.md), [School mode](school-mode.md), [Platform feature index](README.md).
