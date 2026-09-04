# The `ding-pbx://` product route

One address opens this console at one screen:

```
ding-pbx://destination/cdr
ding-pbx://destination/appearance?state=default&theme=dark&width=1440&height=1000&scale=1
```

Click it, paste it into the Run box, put it in a shortcut or on a wiki page: an installed copy
opens, or the copy already running moves to that screen.

## Behavior

The route carries the design-parity capture tuple. Three of its five parts this application can
carry out, and two it cannot -- so the two it cannot are **refused by name** rather than accepted
and ignored.

| Part | What happens |
| --- | --- |
| destination | Opened. The rail moves with the screen, through the same `openScreen` the rail buttons use, so the destination never arrives beside the previous rail's section list. |
| `width`, `height` | Applied to the window before it is shown, so the size the route names is the size it produces. Refused below the window's own minimum of 920×640, and above 8192. |
| `state` | Only `default` exists. Anything else is refused. |
| `theme` | Only `dark`. `theme=light` is refused, and the message says why: the compiled design carries literal dark-mode hex colours rather than token references, so there is no light palette to switch to. It is the same reason the `p_theme` appearance control has no consumer. |
| `scale` | Only `1`. `scale` is the display's own device scale factor, and no window can be told to change the scale factor of the screen it is on. |

Reaching the application is three separate mechanisms:

- **Registration.** `app.setAsDefaultProtocolClient('ding-pbx')` runs in `app/electron/main.ts`,
  **from a packaged build only**. A development checkout registering the scheme would point the
  machine's handler at whichever `electron.exe` ran last, taking it away from every installed
  copy on the same account. Handling is unconditional either way -- a URL passed on the command
  line is read whether or not this build is the registered handler -- so a development run can
  still be driven to a destination; it just is not what the shell launches.
- **One console, not one per click.** Windows starts a fresh process for every link. A
  single-instance lock hands the second process's command line to the one already running and
  quits. The lock is scoped to the user-data directory, which is why the capture harness -- which
  always launches with its own task-scoped `--user-data-dir` -- still gets its own instance even
  while an ordinary copy is open.
- **Delivery is a queue, not a broadcast.** A link handed in on the command line is known before
  the window exists, so pushing it at the renderer would push it at a listener not yet
  registered: the send succeeds, nothing receives it, and the link does nothing. The renderer
  pulls on mount instead, and only once it has pulled -- which is proof its listener exists -- is a
  later link pushed to it.

## Configuration

There is nothing to configure and no setting to turn on. The scheme is registered when an
installed copy first runs, and a link works from then on.

Every rule the route follows lives in one file, `console/shared/deep-link.ts`, and nothing
re-decides any of it elsewhere. The main process validates the URL's shape; it deliberately has
no navigation catalogue and does not grow one. The renderer checks the destination against the
catalogue it already owns -- the whole catalogue, not the 32 audited destinations, because the
design-parity inventory is pinned to one audit and this build has more screens than that audit
covered. Two functions rather than one with an optional strictness argument, because an optional
check is a check somebody forgets to ask for.

The generated routes for the audited destinations are the `builtRoute` column of
`console/design-reference/capture-manifest.generated.json`, produced from
`evidenceTemplates.builtRoute` in `console/inventories/design-parity.json`. Regenerate rather
than hand-edit.

## Failure modes

- **A part of the tuple this build cannot honour.** `theme=light`, any `scale` but `1`, any
  `state` but `default`, a size outside the window's own bounds. Each is refused with the reason,
  and the reason is shown.
- **A destination this build does not have.** Named back -- `This console has no screen called
  'nosuchscreen'` -- rather than ignored.
- **A malformed link.** The wrong scheme, an authority this scheme never defined, the
  schemeless-authority form `ding-pbx:destination/dash`, no destination at all, or more than one
  path segment. Each gets its own message, because the fix for each is different.

Every one of those is **reported on screen**, never dropped. A link that silently does nothing
cannot be told apart from one the operating system never routed here at all, so somebody who
clicked it would have no way to tell a typo from a broken installation.

**The single-instance lock has one cost worth knowing before meeting it.** It is scoped to the
user-data directory, and a development run (`npm start`) uses the same one an installed copy
does -- so starting a development instance while an installed copy is running will quit
immediately and focus the installed one instead. Pass `--user-data-dir` to get an instance of
your own, which is what the capture harness already does for its own reasons.

**On macOS, `open-url` is registered and unexercised.** It is wired because leaving it out would
make the route silently dead there rather than obviously absent; this project's delivery scope is
Windows and nothing here has been run on macOS.

**What this used to be, because it is the failure worth naming.** The design-parity inventory
maps every audited destination to a reference route, a product route and a built capture. Two of
the three were real. The product route was a string: generated for all 32 destinations, read by
nothing, refused by nothing. The inventory said so in as many words, in
`captureContract.builtRouteStatus` -- *"a committed route template only; no custom protocol
handler is registered in console/app/ yet."* Nothing failed, because nothing looked. A column
that names an address nobody answers is wired at one end and consumed at neither, which is
invisible from either end on its own.

## Verification

- `console/tests/control-plane/deep-link.test.ts` -- the rules, and the round trip that holds the
  inventory's route template and this reader together: every generated `builtRoute` is fed
  through the real parser, and every one has to name the destination of the row it sits in. The
  template is generated from the inventory rather than from `deepLinkFor`, so this is a real
  comparison and not a function agreeing with itself.
- `console/tests/ui/deep-link-wired.test.tsx` -- the renderer navigating, refusing, reporting and
  unsubscribing, read out of the update the compiled shell's own `openScreen` produced rather
  than out of a stub standing in for it.
- `console/scripts/negative-deep-link.mjs` -- 35 deliberate breaks, each planted alone, each
  watched turn its tests red, and each restored byte-for-byte.
- `console/scripts/inventory-validation.mjs` -- refuses a `builtRoute` template that is not a
  `ding-pbx://destination/` route, with both directions broken on purpose in
  `console/scripts/negative-design-parity.mjs`.

**Not claimed.** No capture was retaken and no design-parity destination moved to `verified`
because of this. The committed built captures are still the ones the axis-pin run took, driven
the way they always were: the real built renderer under Electron on an off-screen Windows
desktop, reached through the same rail-then-section clicks the reference side performs. The route
has not been exercised by clicking a link in a shell on an installed copy; it is proved by the
tests above and no further.

## Suggested articles

- [Command palette](command-palette.md) -- the other way to reach any screen by name, from inside
  the application rather than from outside it.
- [Browser-style tabbed navigation](browser-style-tabs.md) -- what a destination arrives into.
- [Automatic updates](automatic-updates.md) -- the other main-process channel that pushes to this
  renderer, and the one whose delivery ordering this route's queue was modelled on.
