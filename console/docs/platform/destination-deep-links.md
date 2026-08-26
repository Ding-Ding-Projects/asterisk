# Destination deep links

A link of the form `ding-pbx://destination/<id>` opens that screen in the console.

```
ding-pbx://destination/queues
ding-pbx://destination/endpoints?state=default&theme=dark&width=1440&height=1000&scale=1
```

## Behavior

The design-parity evidence maps each of the thirty-two audited destinations to three things: a
reference route into the design harness, a **product route** into this application, and a built
capture. Two of those three were real. The product route was a string committed in
`inventories/design-parity.json` and in `design-reference/capture-manifest.generated.json` that
nothing in `app/` resolved: no scheme was registered, no command-line argument was read, and a
link would have opened a second copy of the console on the dashboard, if it opened anything at
all. The inventory said so, in a sentence nobody had to read in order to use the file. That is
the shape of defect this project keeps meeting: wired at one end and consumed at neither. It
ships silently, because every file involved looks correct on its own.

It resolves now. A route arriving from the operating system (on the command line that started
the console, or as an activation delivered to the console already running) opens the
destination it names.

| Part | Where |
| --- | --- |
| The route is spelled, parsed and refused | `console/shared/destination-route.ts` |
| A route is held until the renderer can take it | `console/app/electron/deep-link.ts` |
| The scheme is registered; the command line and second-instance activations are read | `console/app/electron/main.ts` |
| The bridge the renderer subscribes to | `console/app/electron/preload.cjs` |
| The id is resolved against the compiled catalogue and the screen is opened | `console/app/renderer/src/App.tsx` |

Parsing and resolving are deliberately two functions. The main process must decide whether an
argument is a route at all, long before there is a renderer, and so that an arbitrary
`http://` or `file://` argument on the command line can never be treated as a navigation
instruction. Only the renderer can decide whether the id names a destination, because the
catalogue is compiled into the renderer bundle and the main process holds no copy of it.

## Configuration

There is nothing to configure, and that is deliberate. The scheme is fixed, the association is
registered for the current user on first run (`HKCU\Software\Classes` on Windows, through
Electron's `setAsDefaultProtocolClient`), and a route carries no option that changes the
console's settings.

**The application acts on the destination, and nothing else.** `state`, `theme`, `width`,
`height` and `scale` are parsed and validated, so a malformed route is refused whole rather than
half-applied, because a route that navigated and then quietly ignored `width=nonsense` would be
reporting success for a string it did not understand. They are then not applied. A link that
resized somebody's window or flipped their theme would be a link that edited their settings, and
the person who followed it asked to go to a screen.

Those fields exist in the route because the parity evidence it was written for compares two
renders at one screen, state, theme, viewport and scale. `DESTINATION_ROUTE_APPLIES` records
which of them the product acts on, and a test asserts its exact contents, so widening it is a
decision somebody has to make on purpose rather than a line that slides in.

## Failure modes

- **An unknown destination.** The console says which id it does not have and navigates nowhere.
  Nothing falls back to the dashboard: a link that quietly lands somewhere else is
  indistinguishable from one that worked, and the person who followed it has no reason to doubt
  the screen in front of them.
- **A differently-cased id.** Refused rather than folded to lowercase. Two spellings of one
  route are two routes as far as a log, a bookmark or a piece of evidence is concerned, and only
  one of them would ever be the one written down.
- **A scheme that merely starts the same way.** `ding-pbx-evil://destination/dash` is refused;
  the scheme is compared exactly rather than by prefix.
- **The opaque spelling `ding-pbx:destination/dash`.** Refused. It parses as a URL, carries no
  authority component, and would have to be un-picked from the path; one canonical spelling is
  what lets a recorded route and an accepted route be compared as strings.
- **A route arriving before the window exists.** Held, and delivered when the page reports
  `did-finish-load`. Two routes arriving in that window leave the newest, because the person
  asked twice and meant the second answer. A later argument that is *not* a route does not
  discard the one being held.
- **A route arriving at an already-running console.** The single-instance lock is what makes
  this possible at all: without it the operating system launches a second console, which cannot
  see the first one's window and so cannot navigate it. The lock is taken after the Squirrel
  install/update/uninstall branch, which runs as its own short-lived process and must never be
  refused for a running console holding the lock.
- **No deep-link bridge at all.** The hosted HTTP surface has no registered protocol client, so
  the renderer subscribes to nothing there rather than pretending to listen.

Nothing crossing this boundary reaches a shell, a file path or the control plane: the widest
thing a route can say is which of the console's own destinations to open, and an id that is not
in the compiled catalogue opens nothing.

## Verification

- `console/tests/control-plane/destination-route.test.ts` covers the parser, the holding router,
  and the committed mapping: every route recorded in the inventory is handed to the parser the
  application uses and must resolve to that row's own destination.
- `console/tests/ui/destination-route-wired.test.tsx`: the real `App`, driven: a delivered
  route opens the screen *and* its rail, an unknown one says so and moves nothing, and the
  listener is dropped on unmount.
- `console/scripts/destination-route-wiring.mjs`: twelve whole-line anchors across the
  renderer, the main process and both preloads. Whole-line, because a needle for
  `listenForDestinationRoutes()` is satisfied by `// this.listenForDestinationRoutes();`, which
  is how a wiring line usually dies.
- `console/scripts/negative-destination-route.mjs`: fifteen inventory lies and twelve
  commented-out wiring lines, each planted alone, each required to go red and then green again.

**What is not claimed.** The committed built captures were not retaken through this route: they
are the same captures the recorded parity run produced, driven to each destination through the
same rail-then-section clicks the reference side performs, and nothing here re-photographs a
screen. Nor has a link been followed on a real desktop: the parser, the holding router, the
renderer's navigation and the presence of every wiring line are proved, while the main process's
own registration is proved only to be present in the source, because driving it needs a real
Electron `app`, a real registered scheme, and a real operating system to hand it a link.

## Suggested articles

[Command palette](command-palette.md), [Browser-style tabbed navigation](browser-style-tabs.md),
[App display name](app-display-name.md), [Platform feature index](README.md).
