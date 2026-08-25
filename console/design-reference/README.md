# Design-parity capture harness

This directory is the **reference side** of the design-parity evidence pipeline described in
`console/inventories/design-parity.json`. It exists to give a headless driver one deterministic
route, at one exact tuple (destination, state, theme, viewport, scale), for every one of the 32
audited destinations — the contract that `console/scripts/design-parity-diff.mjs` and
`console/scripts/design-parity-evidence-on-disk.mjs` assume is satisfiable before any row can move
from `compiled` to `verified`.

**No row in `design-parity.json` was moved to `verified` by the work that produced this directory.**
Nothing in this repository can drive a real headless browser (see the capability boundary note
below), so no reference-versus-built captures exist yet. Every file here is the plumbing that makes
capturing possible, checkable and refusable once an agent with that capability runs it — not a
substitute for having actually run it.

## Files

| File | What it is | Generated from |
|---|---|---|
| `index.html` | The capture harness page itself. `?destination=…&state=…&theme=…&width=…&height=…&scale=…` in, a settled screen ready to photograph out. | Hand-written; imports `route.mjs` |
| `route.mjs` | The browser-side driver: parses the tuple, loads the real design export in an iframe, clicks the real rendered navigation to reach the requested destination, waits for the `<h1>` heading to settle. | Hand-written; reuses `../scripts/design-parity-capture.mjs` |
| `destination-labels.generated.json` | `id -> {rail, label, title}` plus `rails: railId -> {icon, label}` — exactly what `route.mjs` needs to know which rail icon and which section button to click. | `npx tsx ../scripts/generate-design-parity-labels.mjs` from `app/renderer/src/catalog.ts` |
| `capture-manifest.generated.json` | One entry per audited destination: resolved `referenceRoute`, `builtRoute`, every evidence artifact path, and the exact click-sequence navigation plan. | `node ../scripts/generate-design-parity-capture-manifest.mjs` from `design-parity.json` + the labels file above |

Both `.generated.json` files are committed (so a driver can read them with a plain `fetch()`, no
build step) and guarded for freshness: `npm run test:inventories` runs both generators in `--check`
mode and fails if either has drifted from its source. Regenerate, never hand-edit them.

## The capture tuple

Every route in `capture-manifest.generated.json` is built from this same five-part tuple (plus the
destination id), matching `design-parity.json`'s own `evidenceTemplates`:

```
state=default&theme=dark&width=1440&height=1000&scale=1
```

`state=default` is the only state currently wired. The 17 transient-state families
(`design-parity.json`'s `transientStateFamilies`) are a real, documented extension point — each
would need its own trigger step appended to a destination's navigation plan and its own capture
path — but wiring all 17 states × 32 destinations was out of scope for this pass; the templates and
manifest generator already support adding a `state=<family>` variant per destination without any
structural change, whenever that work is picked up.

## How an orchestrator runs a capture, end to end

1. Serve the **repository root** (not just `console/`) over a local static HTTP server. `route.mjs`
   loads the real, unmodified `design/Asterisk Console M3.dc.html` via a relative path
   (`../../design/…` from this directory), and `design/support.js` itself does a `fetch(location.href)`
   on boot — both need real HTTP, not `file://`.
2. Navigate the headless browser to
   `http://<host>/console/design-reference/index.html?destination=<id>&state=default&theme=dark&width=1440&height=1000&scale=1`
   — or read the already-resolved URL straight out of `capture-manifest.generated.json`, which is
   the recommended route since it also carries the navigation plan and settle condition for that
   exact destination.
3. Wait for `window.__captureReady === true` (poll, or `await window.__runCapture()` directly via
   CDP `Runtime.evaluate` with `awaitPromise: true`). On failure, `window.__captureError` names
   exactly what went wrong — an unresolved destination, a click target that could not be found, a
   heading that never settled, or the React-host gap below.
4. Screenshot the `#frame-wrap` element (or the full viewport at `width×height`, since the page
   contributes no chrome outside it) and save it to the `referenceCapture` path
   `capture-manifest.generated.json` already names for that destination.
5. Separately capture the **built** side at `builtRoute` (see "The built side" below), then run
   `console/scripts/design-parity-diff.mjs`'s `compareCaptures()` against both PNGs, writing the
   result to the `visualDiff` path and the rendered comparison to the `sideBySide` path — both also
   already named in the manifest.
6. Only once `compareCaptures()` reports `verdict: 'match'` (and a materialAudit JSON records
   `conforms: true` with no defects) may `design-parity.json`'s row for that destination move to
   `verified` — `console/scripts/design-parity-evidence-on-disk.mjs` refuses the claim otherwise,
   proven by `console/scripts/negative-design-parity-evidence.mjs`.

## The built side is a route template, not a wired deep link — yet

`builtRoute` in `capture-manifest.generated.json` (`ding-pbx://destination/{id}?state=…&theme=…&width=…&height=…&scale=…`)
is `design-parity.json`'s own committed template, filled in with the real tuple and id. Searching
this repository confirms `ding-pbx://` is not registered as a custom protocol anywhere in
`console/app/` today — the built side of the tuple is a documented target, not yet a route the real
Electron app answers. Wiring that deep link (registering the protocol, routing it to the same
`screen`/`theme`/viewport state `App.tsx` already exposes internally) is real follow-up work, and it
was deliberately left undone here rather than adding an untested protocol handler to the main
process of a shared, actively-worked-on app during a five-lane integration wave. Until it exists,
capture the built side the same way any other Windows UI screenshot in this project is taken: launch
the real built app on a cheap Lowlevel headless desktop, navigate to the destination through the
real UI (the same rail-then-section clicks `route.mjs` performs against the reference side), resize
to the tuple's viewport/scale, and capture — then save the result to the `builtCapture` path the
manifest already names.

## The one capability boundary this lane could not close: the React/ReactDOM host

`design/Asterisk Console M3.dc.html` is a Day Teet Hui Designer export. Its own
`<script src="./support.js">` expects `window.React` and `window.ReactDOM` to already exist in its
document before it boots — normally supplied by whatever design-tool host renders a `.dc.html` file.
The checked-in file itself has no `<script>` tag loading React from anywhere, local or remote (this
was verified by reading it, not assumed).

**This lane's scope explicitly excludes editing anything under `design/`**, so `route.mjs` cannot
solve this by injecting a `<script>` tag into the design document — that would mean writing into the
served copy of the file, and the safest way to do that without violating "never copies, transcribes,
reimplements" the design content is exactly what would need review beyond this lane's remit.

`route.mjs`'s `waitForReactHost()` therefore polls for `window.React`/`window.ReactDOM` on the iframe
for up to 8 seconds and **throws a specific, named error** if they never appear — it does not hang,
and it does not report a false `__captureReady`. Supplying that host is real, scoped follow-up work:
either a small privileged loader (outside `design/`) that injects the two script tags into the
fetched document before it is written into the iframe, or routing captures through whatever
Day Teet Hui Designer preview surface already knows how to render `.dc.html` files with React
present. Until one of those exists, **treat this harness as unexecuted and smoke-test it with the
real headless route before relying on it** — this file says so plainly rather than claiming a
working capture route that was never actually run.

## What was verified without a browser

Everything that does not require a DOM was proven with real `node:test` runs, not asserted:

- `../scripts/png-codec.mjs` — PNG decode/encode round-trips (including a hand-built filtered
  scanline cross-check independent of the encoder), and refuses 16-bit-depth, interlaced and
  truncated PNGs rather than mis-decoding them.
- `../scripts/design-parity-diff.mjs` — match/diff/dimension-mismatch/unpainted(black)/stale
  verdicts, and the side-by-side composite's dimensions.
- `../scripts/design-parity-capture.mjs` — tuple parsing and its validation, route template
  substitution against the real committed `evidenceTemplates`, and the rail-then-section navigation
  plan (including the same-rail-skips-the-rail-click case).
- `../scripts/design-parity-labels.mjs` — rail-vocabulary translation (`sys` → `system`), and rail
  and destination drift detection (both proven red-then-green by mutating a fixture, not just
  imagined).
- `../scripts/design-parity-evidence-on-disk.mjs` — the fail-closed `verified` guard, including
  every planted-lie case in `../scripts/negative-design-parity-evidence.mjs` (missing artifact,
  wrong destination id inside the diff file, a `diff` verdict, an unpainted or stale built capture,
  unresolved materialAudit defects, invalid JSON) turning red, and the one fully-honest case turning
  green.
- `route.mjs`'s pure pieces (`tupleFromLocation`, `designFrameSrc`) — including asserting the
  relative path it computes actually resolves to the real checked-in design file on disk.

What was **not** run: an actual headless browser loading this page. That is the one piece still
missing, named here rather than left silent.
