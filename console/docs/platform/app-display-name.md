# Renameable app display name

Lets a user rename what the application calls itself in its own title bar and About screen, without touching its install identity.

## Behavior

A settings field (Customise everything → Identity → Display name) lets a user set a custom display name, persisted across restarts through the durable-storage settings snapshot and resettable to the shipped name in one action (the "Restore the shipped name" switch beside it).

The chosen name reaches every surface the console uses to introduce itself to its own user:

- **The in-app title bar** — the custom drag-region title bar the frameless window renders.
- **The native OS window title** — taskbar and Alt+Tab, pushed to the main process over IPC (`window:set-title`) whenever the name changes, and once on startup after the durable-storage snapshot loads.
- **The About screen's heading** — reads "About \<name\>" instead of a bare "About".
- **Its own notifications** — a toast confirms "Renamed to \<name\>" when a rename is set, and "Name restored to \<shipped name\>" when it is reset.

## Configuration

Renaming changes display only. `display-name.ts` keeps two deliberately separate exports with no path between them: `IDENTITY` (a frozen constant: the shipped product name, the application-data directory, the packaging identifier, and the credential-vault service key) and `displayName()` (the user setting). Nothing derives an identity value from the chosen name.

Diagnostics, crash logs, issue reports, the update feed, and the installer always use `IDENTITY.productName`, never the chosen name (`nameFor()`'s `SHIPPED_NAME_SURFACES`) — the rename control's own explanatory copy states this plainly, in text that itself always names the shipped product, regardless of what the console is currently renamed to.

## Implementation notes

The compiled title bar text is a design-reference literal with no bound value (`h("span", {...}, "Ding PBX Console")`), and the renderer is compiled from the design reference and must never be hand-edited. Rather than edit the design reference for one label — which would need a matching, independently re-audited change to its pinned binding and expression counts — `title-bar-name.ts` rewrites the already-built element tree on its way out of `App.render()`, the same way `text-boundary.ts` already applies language and personal-vocabulary substitution to the compiled tree without touching a generated file. It finds the title bar by its `data-window-drag` marker (which `compile-design.mjs` guarantees is unique at compile time) and, within it, the one row carrying the leading Material Symbols icon — never by matching the shipped-name string itself, so an already vocabulary-substituted name is still found.

## Failure modes

A rename that accidentally altered the application's data-directory path rather than only its display label is the specific failure this feature is designed to prevent by deriving the two from separate constants — exercised directly by `display-name.test.tsx`'s identity tests. An invalid name (empty, over 60 characters, or containing a control character) is refused before it reaches storage, and a name a hand-edited settings file or an older version wrote that the app would no longer accept falls back to the shipped name rather than rendering.

## Accessibility and localization

Follows the product's standing accessibility contract: the rename field and reset switch are ordinary keyboard-reachable, correctly-named text and switch controls with the compiled design's own focus and contrast handling. Copy is currently fixed English; the disclosure and confirmation strings are not yet routed through the language-mode/funny-level boundary.

## Verification

`tests/ui/display-name.test.tsx` exercises the `display-name.ts` module directly: identity isolation, validation, persistence, reset, and shipped-name-only surfaces. `tests/ui/display-name-wired.test.tsx` proves the wiring itself against the real `App` — the title bar and About heading actually rendering the chosen name (and the shipped name when unrenamed), the notification toast, the native window-title IPC push, and (by source-scan, since it is Electron-only code this suite cannot import and run directly) `main.ts` and `preload.cjs`. `tests/ui/title-bar-name.test.tsx` covers the tree-rewrite's precision in isolation, including the negative case that would let it silently overwrite the connection-status pill instead.

## Suggested articles

[App logo customization](app-logo-customization.md), [About and policy](../app/about.md), [Platform feature index](README.md).
