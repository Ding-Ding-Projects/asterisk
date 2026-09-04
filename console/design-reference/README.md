# Design-parity capture harness

This directory is the **reference side** of the design-parity evidence pipeline described in
`console/inventories/design-parity.json`. It gives a headless driver one deterministic route, at
one exact tuple (destination, state, theme, viewport, scale), for every one of the 32 audited
destinations.

**It has now been run, and its captures are committed.** All 32 reference captures, all 32 built
captures and all 32 visual diffs are on disk under `console/release/captures/parity/` and
`console/release/evidence/parity/`, with a run ledger per side. They came from one full run per
side against one build of this tree, so each destination's region rectangles and its pixels are the
same moment of the same render. What this file used to say — that
nothing here could drive a real headless browser, and that the React runtime the design needs
could not be supplied without editing `design/` — was true of the harness as it stood and wrong
about the design. Both corrections are recorded below rather than quietly edited away.

**No row moved from `compiled` to `verified`, and that is a product finding rather than a harness
failure.** See "Why every row is still compiled" at the foot of this file.

## Files

| File | What it is | Generated from |
|---|---|---|
| `index.html` | The capture harness page itself. `?destination=…&state=…&theme=…&width=…&height=…&scale=…` in, a settled screen ready to photograph out. | Hand-written; imports `route.mjs` |
| `route.mjs` | The browser-side driver: parses the tuple, loads the real design export in an iframe, dismisses the design's own first-run wizard, clicks the real rendered navigation to reach the requested destination, waits for the `<h1>` heading to settle. | Hand-written; reuses `../scripts/design-parity-capture.mjs` |
| `destination-labels.generated.json` | `id -> {rail, label, title}` plus `rails: railId -> {icon, label}` — exactly what `route.mjs` needs to know which rail icon and which section button to click. | `npx tsx ../scripts/generate-design-parity-labels.mjs` from `app/renderer/src/catalog.ts` |
| `capture-manifest.generated.json` | One entry per audited destination: resolved `referenceRoute`, `builtRoute`, every evidence artifact path, and the exact click-sequence navigation plan. | `node ../scripts/generate-design-parity-capture-manifest.mjs` from `design-parity.json` + the labels file above |
| `vendor/` | `react` and `react-dom` 18.3.1, the exact builds `design/support.js` pins, downloaded once and verified against the design's own integrity hashes. Never edited, never fetched at capture time. | `node ../scripts/vendor-design-react-host.mjs` |

Both `.generated.json` files are committed (so a driver can read them with a plain `fetch()`, no
build step) and guarded for freshness: `npm run test:inventories` runs both generators in `--check`
mode, re-verifies `vendor/` against the design's pins, and checks every committed capture against
its run ledger. Regenerate, never hand-edit.

## The capture tuple

Every route in `capture-manifest.generated.json` is built from this same five-part tuple (plus the
destination id), matching `design-parity.json`'s own `evidenceTemplates`:

```
state=default&theme=dark&width=1440&height=1000&scale=1
```

`state=default` is the only state currently wired. The 17 transient-state families
(`design-parity.json`'s `transientStateFamilies`) remain a documented extension point: each would
need its own trigger step appended to a destination's navigation plan and its own capture path.

## Running a capture, end to end

Both browser stages attach to an **already-running** target on a loopback debugging port, exactly
like `../scripts/ui-drive/drive.mjs`. The caller starts that target on an off-screen Windows
desktop with `../scripts/launch-on-hidden-desktop.ps1`, so the visible desktop, cursor and
foreground application are never touched. Neither stage will drive anything unless the debugging
port exposes exactly one page target.

```
# 1. reference side — the design export, rendered by its own runtime
pwsh -NoProfile -ExecutionPolicy Bypass -File console/scripts/launch-on-hidden-desktop.ps1 \
  -Desktop DingParity -FilePath '<msedge.exe>' -ArgumentsFile <flags>
node console/scripts/design-parity-capture-run.mjs --side=reference --port=9611 --server-port=9750

# 2. built side — the real built renderer under Electron
pwsh ... -FilePath 'console/node_modules/electron/dist/electron.exe' \
  -WorkingDirectory console -ArgumentsFile <flags>
node console/scripts/design-parity-capture-run.mjs --side=built --port=9614

# 3. diff — no browser at all
node console/scripts/design-parity-capture-run.mjs --side=diff
```

`--only=id,id` narrows any stage to named destinations. Each stage writes
`console/release/evidence/parity/run-<side>.json`, and `design-parity-captures-on-disk.mjs`
refuses any capture that has drifted from what its ledger recorded.

### Flags that turned out to matter

- **`--disable-gpu` on BOTH sides.** Electron launched on an off-screen desktop wedges without it:
  `Browser.getVersion` answers normally while `Runtime.enable`, `Page.enable` and every other
  renderer-facing domain time out forever, which reads as an application hang rather than a
  compositor one. `--disable-gpu` alone fixes it; the Chromium sandbox is *not* the cause and stays
  on. The reference side then takes the same flag so software rasterisation is not itself a
  difference in the evidence.
- **No `--guest` for Edge.** Combined with `--user-data-dir` it makes the browser exit immediately.
- A fresh `--user-data-dir` per run, plus the usual first-run, sync and extension suppressions.

### Two things about the built side that cost a whole run each

- **The update banner is not a startup surface, so dismissing it at startup is a bet.** The updater
  raises it whenever its background check finishes, and this repository publishes a release on every
  push, so it genuinely arrives mid-run and its text rewraps as the version number grows. A full
  32-destination run was taken behind it: the shell sat 43px down the frame on the first twenty-two
  destinations and 52px down on the last ten. Nothing failed, and every capture looked normal.
  `clearUpdateBanner` now dismisses and *proves dismissed* before every destination, and a built
  measurement whose shell is not at the window origin is refused outright, naming what is above it.
- **`Later` takes about a second to leave the DOM, and a dismissal loop has to judge its last
  click.** The first version of that guard clicked four times at 300ms apart and then threw without
  re-checking, so it refused a dismissal that was working — on a banner the very next probe found
  already gone.

## Three corrections to what this file used to claim

### 1. The React host was never a capability boundary

`design/Asterisk Console M3.dc.html` has no `<script>` tag loading React, which is what the previous
version of this file checked and reported. But the runtime beside it does: `loadReactUmd()` at the
foot of `design/support.js` appends two `<script>` tags for `react@18.3.1` and `react-dom@18.3.1`
from unpkg, each pinned with a subresource-integrity hash — and one function above it,
`cdnScriptFor()` reads `window.__resources[url]` and prefers that value as the script source. The
design ships the hook a host is meant to use; the only thing missing was the two files to point it
at.

So `../scripts/vendor-design-react-host.mjs` downloads them once into `vendor/`, refusing any byte
sequence whose sha384 is not the one `design/support.js` declares — the pins are parsed out of the
design, never typed into this repository, so a moved pin turns `--check` red instead of silently
serving a stale runtime. `../scripts/design-parity-server.mjs` then serves the design through one
virtual directory that inserts a single inline `<script>` setting that map, before `support.js`.
Nothing under `design/` is edited on disk or in flight; the `<x-dc>` template the runtime renders is
passed through byte-for-byte, and a capture run reaches no network at all — every request is
intercepted, the font stylesheet is answered from `console/assets/fonts`, and the run ledger counts
what was blocked.

### 2. Four things about the design's real behaviour that the plumbing had guessed wrong

Each cost a failed run before it was found, and each is now handled in `route.mjs`:

- **A Material Symbols icon is a glyph NAME sitting in the DOM as text.** A section button reads
  `graphic_eqLive channels`, so matching the catalogue's `Live channels` against `textContent` finds
  nothing — on every destination whose row carries an icon, which is all of them.
- **A row's badge is part of that text too, and the two sides separate it differently.** The design
  puts label and badge in separate text nodes (`Modules\n              255`); the built renderer
  puts each in its own `<span>` and separates them with nothing (`Modules255`). A first-line rule
  works for one and silently matches none of the other's badged rows.
- **A glyph is not unique to the rail strip.** `graphic_eq` is both the Media rail's icon and the
  Live channels row's icon, so taking the first match walks into the section list instead of
  switching rails.
- **The design derives the open rail from the ACTIVE destination.** A rail click that is not
  followed promptly by a section click snaps back to whichever rail the current screen belongs to.
  Every destination that is the *first* entry of its rail therefore worked and every other one
  failed — which looked like a broken selector and was a timing pair.

The last of those also invalidated the generated navigation plans. They used to model one continuous
session, so only the first destination of each rail carried a rail click; the harness loads one
destination per page load, so twenty-six of the thirty-two plans could only ever look for a section
that was not on screen. Every plan is now self-contained, and a contract test asserts it.

### 3. The design declares its own viewport, and the harness was not supplying it

The design's root element is `height:100%; overflow:hidden` — the same shape the built application's
shell has. Rendered here it was neither: the shell grew to its content, 622px to 7668px tall across
the 32 destinations, and the document scrolled, taking 12px off the width on 20 of them. That was
read for a whole pass as a genuine difference between the design and the application, and written up
as one.

It is not. `design/support.js` injects exactly the missing stylesheet — `html,body{height:100%}` plus
`#dc-root` — from its own `FULL_PAGE_CSS` constant, but only `if (!parsed.preview)`. This export
declares `$preview` of 1440x900 in its `data-props`, so the runtime withholds it and leaves the
sizing to the frame the design tool would have provided. Served bare in an iframe, nothing provided
it.

`design-parity-server.mjs` now serves that stylesheet with the hosted design, read out of
`support.js`'s own declaration rather than typed here — the same rule the React pins follow, so a
renamed or moved constant throws by name instead of silently serving nothing. Nothing under
`design/` is edited, on disk or in flight. Every reference shell is now exactly 1440x1000 at the
window origin, matching the built side.

## Why every row is still `compiled`

`design-parity-evidence-on-disk.mjs` accepts a `verified` row only when the whole-frame visual diff
is a real comparison and the separate chrome-parity record is a zero-difference match outside the
declared data regions. `compareCaptures` calls a whole-frame match only when the two captures are
pixel-identical.

That bar is unreachable here **by deliberate product decision**. This project removed the design's
sample rows, dashboard tiles, health bars, nav badges, history, agent-rail and trunk-authentication
content from the running application, so the reference shows invented content exactly where the
built application shows the target's real — and usually empty — readings. The 32 diffs measure that
divergence: 23% to 61% of pixels differ, none was refused as unpainted or stale, and the
side-by-side images show the same chrome beside different data.

Moving a row to `verified` therefore needs two things beyond the captures: a parity bar that
compares chrome and layout with the data-bearing regions excluded, and a real Material Design 3
conformance audit per destination. **Both now exist and are required by the verifier.** The bar is described in
[docs/evidence/design-parity-chrome-bar.md](../docs/evidence/design-parity-chrome-bar.md); the audit
in [docs/evidence/design-parity-material-audit.md](../docs/evidence/design-parity-material-audit.md).

The audit was withheld for several passes on the grounds that a generated audit nobody performed
would be an invented verdict. That objection is right, and it is what shaped the auditor rather than
what prevented it: `conforms` is computed as `defects.length === 0` from findings taken out of the
rendered markup, no argument can set it, and every check can only ever add a defect. It cannot
report a conformance it did not measure. Run over all 32 destinations it found **none of them
conforming**, so the guard still refuses every row — now for a measured reason rather than an absent
one.

**Every destination now has a built capture, About included.** It used to be the one that did not:
the built `<h1>` on About read `About Material Asterisk` where the design's reads `About`, so the
settle condition that proves the driver arrived could not be satisfied, and that was recorded as a
real divergence rather than captured on a weaker proof. The heading was repaired in the application,
and a run against a build carrying that repair settled on About like the other thirty-one.

Two defects in this harness were found and repaired in the same pass, both of which had been
reported as divergences between the design and the application when they belonged to neither: the
reference document was never given the height its own root style needs, and every built capture was
taken behind the update banner. Both are recorded in full in
[docs/evidence/design-parity-chrome-bar.md](../docs/evidence/design-parity-chrome-bar.md).

The captures are already earning their keep as evidence in the meantime.
`logger-comparison.png`, for instance, shows the built Logger destination rendering its header and
reading its configuration file while displaying none of the control groups the design specifies.
