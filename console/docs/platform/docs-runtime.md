# Offline documentation and changelog runtime

The desktop renderer includes mount-ready documentation and changelog surfaces backed by the generated bundles already produced during the normal build.

## Behavior

The documentation surface lists every bundled article, searches titles, headings, and article bodies, renders the selected article as formatted content, resolves article-to-article links inside the application, exposes an article outline, and suggests related articles from real bundle links.

The changelog surface parses the generated release history, rejects malformed release dates, composes date and text filters, shows categorized changes, exports the filtered view, and links a recorded commit only when both its identifier and the supplied repository URL are valid. A caller may supply verified commit availability; absent that evidence, the surface labels availability as unverified rather than claiming the link was checked.

Both surfaces use the same isolated Markdown renderer. It creates React elements directly, treats embedded HTML as text, allows only HTTP, HTTPS, and mail links outside the bundle, and reports empty, truncated, or malformed input instead of executing provider-authored markup.

## Configuration

`DOCUMENTATION_SURFACE_MOUNT` targets the `docs` destination and carries the generated documentation bundle as its default input. `CHANGELOG_SURFACE_MOUNT` targets the `changelog` destination and carries the generated changelog text and repository URL. The central application integration imports these descriptors and decides where they mount; the surfaces do not alter the generated design shell themselves.

Plain-text search is the default. Selecting regular-expression mode uses a disposable worker, a bounded corpus, a bounded result count, and a hard deadline. Search results retain the exact source field and capture groups returned by that single isolated evaluation.

## Failure modes and security

If the bundle's declared article count differs from its contents, the documentation surface reports the mismatch. A missing selected article, empty bundle, malformed Markdown, an invalid release date, invalid date range, invalid pattern, unavailable worker, deadline expiry, missing commit, and unverified commit each have distinct visible states.

Regular expressions never run on the renderer thread. When worker isolation is unavailable, regular-expression search fails closed. Plain-text search retains a bounded fallback. Links using file, script, data, or unknown schemes do not become active controls.

## Accessibility and localization

The surfaces use semantic headings, regions, lists, labels, status messages, alerts, native date fields, keyboard-operable controls, and minimum 44-pixel action targets. The directly authored copy is currently English. A later language integration must provide the project's English, Cantonese, and bilingual resources without changing dates, versions, commit identifiers, search origins, or failure facts.

## Verification

This implementation was prepared in the ultra-speed lane, where tests, type checks, builds, generated-bundle refreshes, runtime interaction, and screen captures were explicitly excluded. The central mounting integration and its normal verification remain separate work. The generated bundles were read as existing inputs and were not edited in this change.

## Suggested articles

[Offline documentation browser](offline-documentation-browser.md), [Provider-authored markup rendering](provider-markup-rendering.md), [In-app changelog viewer](changelog-viewer.md), [Regex builder](regex-builder.md), [Platform feature index](README.md).
