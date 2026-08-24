## Offline documentation and changelog runtime

- Added mount-ready offline documentation and changelog surfaces backed by the existing generated bundles.
- Added one isolated Markdown renderer for bundled articles and provider-authored release text, with internal navigation, safe external links, and explicit empty or malformed states.
- Moved regular-expression evaluation for these surfaces into a disposable worker with corpus, result, and deadline bounds.
- Added honest missing article, bundle mismatch, date validation, export, search-origin, capture-group, and commit-availability states.
- Verification was not run in this ultra-speed implementation lane.
