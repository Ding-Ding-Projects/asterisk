# Design-parity capture harness

This directory is the **reference side** of the design-parity evidence pipeline described in
`console/inventories/design-parity.json`. It gives a headless driver one deterministic route, at
one exact tuple (destination, state, theme, viewport, scale), for every one of the 32 audited
destinations.

**It has now been run, and its captures are committed.** All 32 reference captures, 31 built
captures and 31 visual diffs are on disk under `console/release/captures/parity/` and
`console/release/evidence/parity/`, with a run ledger per side. What this file used to say — that
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

## Two corrections to what this file used to claim

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

## Why every row is still `compiled`

`design-parity-evidence-on-disk.mjs` will only accept a `verified` row whose visual diff records a
`match`, and `compareCaptures` calls a match only when the two captures are pixel-identical.

That bar is unreachable here **by deliberate product decision**. This project removed the design's
sample rows, dashboard tiles, health bars, nav badges, history, agent-rail and trunk-authentication
content from the running application, so the reference shows invented content exactly where the
built application shows the target's real — and usually empty — readings. The 31 diffs measure that
divergence: 47% to 64% of pixels differ, none was refused as unpainted or stale, and the
side-by-side images show the same chrome beside different data.

Moving a row to `verified` therefore needs two things beyond the captures: a parity bar that
compares chrome and layout with the data-bearing regions excluded, and a real Material Design 3
conformance audit per destination. **Both now exist.** The bar is described in
[docs/evidence/design-parity-chrome-bar.md](../docs/evidence/design-parity-chrome-bar.md); the audit
in [docs/evidence/design-parity-material-audit.md](../docs/evidence/design-parity-material-audit.md).

The audit was withheld for several passes on the grounds that a generated audit nobody performed
would be an invented verdict. That objection is right, and it is what shaped the auditor rather than
what prevented it: `conforms` is computed as `defects.length === 0` from findings taken out of the
rendered markup, no argument can set it, and every check can only ever add a defect. It cannot
report a conformance it did not measure. Run over all 32 destinations it found **none of them
conforming**, so the guard still refuses every row — now for a measured reason rather than an absent
one.

One destination has no built capture at all: the built application's `<h1>` on About reads
`About Ding PBX Console` where the design's reads `About`, so the settle condition that proves the
driver arrived cannot be satisfied. That is recorded as a real divergence rather than captured on a
weaker proof.

The captures are already earning their keep as evidence in the meantime.
`logger-comparison.png`, for instance, shows the built Logger destination rendering its header and
reading its configuration file while displaying none of the control groups the design specifies.
