# Where the mode picker's half pixel enters

The last measured divergence inside `statusCell`, traced to its cause.

## The question changed under the item that asked it

The roadmap asked where a **half-pixel box offset** came from. On every one of the 32 audited
destinations the built side appeared to draw the Beginner/Expert picker's 1px border split across
two rows, at `rgb(24,31,25)` and `rgb(40,52,45)`, where the design drew it crisp on one row at
`rgb(65,73,66)`. Both sides reported a 40px top strip and a 28px picker, `(40 − 28) / 2` is an
integer, and so the offset appeared to have nowhere to come from.

**That symptom is gone, and it never belonged to either artifact.** It was a property of comparing
two browsers: the reference used to be photographed under headless Edge while the built side ran
under Electron. When both sides were retaken under one browser it disappeared, and the picker's
border rows are now byte-for-byte identical between the two captures.

What survived is **555 differing pixels inside `statusCell`, the same count on all 32
destinations**, entirely in the text band. This article is about those.

## Where the 555 pixels are

Three column runs, and each one lands on exactly one piece of text:

| Columns | Pixels | What it is |
| --- | --- | --- |
| 1088–1098 | 31 | the active button's Material Symbols `check` glyph |
| 1106–1154 | 329 | the active button's `Beginner` label |
| 1180–1214 | 195 | the inactive button's `Expert` label |

Everything else in the cell is byte-for-byte identical: the confirmation-credits pill including its
own Roboto digit and its `confirmation_number` glyph, the command-palette `search` glyph, all three
window-control glyphs, and **every box edge**, including the picker's own 1px border and the
boundary between its two halves.

## The cause

**The built application draws the inactive mode button one weight step heavier than the design
does.**

Nothing in the markup says so. The button declares `font:inherit` and no weight of its own, on both
sides. The weight arrives from somewhere else entirely: `App.tsx`'s appearance system writes its own
default `font-weight` onto the shell root at startup,

```
weight: str('ap_weight', '500')            // currentAppearanceValues
root.style.setProperty('font-weight', weightVal)   // applyAppearanceToDom
```

so every element in the application that inherits its weight renders at 500. The design declares
the *same* 500 default for the *same* control, but feeds it only to the Appearance screen's own
preview swatch; nothing writes it to the root.

`Expert` is the only text in this cell that inherits its weight. The active button, the credits pill
and every icon set their own, which is why they are all identical.

## And the offset is a consequence of that, not a second fault

Measured on the real render, at the capture tuple's own metrics:

| | as designed | with the appearance defaults | change |
| --- | --- | --- | --- |
| `Expert` label width | 34.171875 | 34.53125 | **+0.359375** |
| picker left edge | 1072.09375 | 1071.734375 | **−0.359375** |
| picker right edge | 1228.171875 | 1228.171875 | 0 |
| `check` glyph left | 1086.09375 | 1085.734375 | **−0.359375** |
| `Beginner` label left | 1106.09375 | 1105.734375 | **−0.359375** |
| `Expert` label left | 1180 | 1179.640625 | **−0.359375** |
| credits pill left | 1236.171875 | 1236.171875 | 0 |

At weight 500 the `Expert` label measures 0.359375px wider, so the picker measures 0.359375px wider.
The status group is packed against the right edge of the strip, so the picker's **right** edge is
pinned and its **left** edge moves, taking the check glyph and both labels with it. The credits
pill, which sits outside the picker, does not move at all. That is why its Roboto digit is identical
while `Beginner`, which has the same family, the same size, the same weight and the same declared
colours, is not.

**And this is why the offset looked like it had no source.** Every one of those rectangles still
rounds to the same painted device pixel: 1072.09375 and 1071.734375 both paint at 1072, and the
internal boundary at 1167 and 1166.640625 both paint at 1167. Chromium snaps a painted box to whole
device pixels and positions text at sub-pixel precision, so a sub-pixel layout difference is
invisible in the geometry and visible only in the glyphs. Reading the boxes could never have found
this.

So the half pixel is a third of a pixel, it is a font weight rather than a box offset, and it enters
through a default nobody chose in the design.

## The demonstration, and why it needs no browser to re-check

`console/scripts/design-parity-statuscell-text.mjs --reproduce` renders the checked-in design as the
top-level document and photographs it twice: once as it stands, and once with the four declarations
`applyAppearanceToDom` writes applied to its shell root. Both frames are committed under
`console/release/captures/parity/statuscell-text/`.

`--check` reads them back off disk and re-derives the whole claim:

```
statusCell across 32 destination(s): 555 differing pixel(s)
as-designed vs committed reference: 0
appearance defaults applied vs committed built: 0
appearance defaults applied vs committed reference: 555
```

The design as it stands reproduces the committed **reference** capture exactly. The design with the
appearance system's own defaults reproduces the committed **built** capture exactly. Both to zero
differing pixels, from committed bytes, with nothing running.

## Two hypotheses this falsified

Recorded because they are the obvious ones and both are wrong, so nobody pays for them twice.

**The capture harness's wrapper.** The reference is photographed through an `<iframe>` inside a
`transform: scale(1)` wrapper and the built side is not, which is exactly the shape of thing that
moves text by fractions. Rendering the same design both ways in one session, one browser, one
sitting: **zero** differing pixels in this cell. The wrapper contributes nothing.

**The DOM shape.** The design's runtime wraps every interpolated value in a
`<span class="sc-interp">`; the compiled renderer emits a bare text node in the same flex container.
Replacing the spans with text nodes changes no rectangle and no pixel.

## What this does not claim

- **Nothing is repaired.** The default is still 500 and the built application still renders every
  inheriting weight one step heavier than the design draws it. Changing it would move type across
  every screen and invalidate all 64 committed captures, which is a product decision rather than
  a measurement, and it is not made here.
- **This measures `statusCell`.** The same root declaration reaches every inheriting weight in the
  frame, and `applyAppearanceToDom` writes three more declarations beside it: a colour, a family
  and a size. How much of the divergence in the other seven areas they account for is not measured
  here, and the guess that it is "most of it" is a guess.
- **No destination moved to `verified`.** All 32 still report a real chrome divergence and the
  Material Design 3 audit still reports all 32 nonconforming.

## Capture records

| State | Record | Run from commit | Coverage | Result |
| --- | --- | --- | --- | --- |
| The design as it stands, top-level document | `release/captures/parity/statuscell-text/dash-design-as-designed.png` | `971c352d69fbd0230dc9b44774a6860d0d470d71` | one frame, 1440x1000 | identical to the committed reference capture inside `statusCell`, 0 differing pixels |
| The design with the appearance system's defaults on its shell root | `release/captures/parity/statuscell-text/dash-design-with-appearance-defaults.png` | `971c352d69fbd0230dc9b44774a6860d0d470d71` | one frame, 1440x1000 | identical to the committed built capture inside `statusCell`, 0 differing pixels |
| Sub-pixel rectangles for both states | `release/evidence/parity/statuscell-text.json` at `measurements` | `971c352d69fbd0230dc9b44774a6860d0d470d71` | 7 rectangles per state, plus computed weights | everything inside the picker moves left by 0.359375px; the credits pill does not move |
| Localisation across the audited set | `release/evidence/parity/statuscell-text.json` at `columnRuns` | `971c352d69fbd0230dc9b44774a6860d0d470d71` | 32 of 32 audited destinations | 555 differing pixels each, in the same three column runs |
| The destination captures this was measured against | `release/captures/parity/{id}-reference.png` and `{id}-built.png` | `a2dd99c0fd28341fbdbd8f38e56a3fdada64fcfc` | 32 per side | not retaken here; they are the frames the axis-pin run took |

## Capture method

Both reproduction frames come from one Electron window on an off-screen Windows desktop, driven
over its own loopback debugging port, in one sitting, with the second frame taken from the same
page as the first after four inline declarations were applied to its shell root. The design is
served by `console/scripts/design-parity-server.mjs` and loaded as the **top-level document**
rather than through the capture harness's `index.html`, because rendering it both ways is what
proved the harness's wrapper contributes nothing here.

Every outbound request is intercepted. The design's own helmet asks Google Fonts for the exact
stylesheet `console/assets/fonts` was downloaded from; that request is answered from the local
copy with its URLs rewritten to the local faces, the capture server's own origin is allowed
through, and everything else is refused and counted. The recorded run refused nothing, because
nothing else was asked for: `{"server":17,"font-stylesheet":2,"font-face":0,"blocked":0}`.

The 32-destination localisation is not a capture at all. It is arithmetic over the reference and
built PNGs already committed, and it runs with no browser.

## Verification boundary

- **The frames are of the design, not of the application.** The claim is that the design plus one
  root declaration reproduces the built capture, not that the built application was re-photographed.
  It was not; the destination captures are the ones the axis-pin run took, at the commit named
  above.
- **Zero differing pixels is claimed for `statusCell` only.** Outside that rectangle the
  appearance-defaults frame is the design with a colour, a family and a size changed on its root,
  and it is not compared to anything.
- **The cause is identified by reproduction and by reading the source, not by inspecting the
  running application's computed styles.** `App.tsx`'s two lines are named and anchored so that a
  repair makes this record fail rather than go quietly stale, but no measurement here was taken
  from inside the built renderer.
- **Nothing was repaired**, so this record describes a divergence that is still present.

## Suggested articles

- [The chrome-parity bar](design-parity-chrome-bar.md), which declares the `statusCell` rectangle
  these 555 pixels are counted inside, and why the bar's tolerance is exactly zero.
- [The Material Design 3 conformance audit](design-parity-material-audit.md), the second
  prerequisite a design-parity row has to meet, which this finding does not move.

## Guards

`node scripts/design-parity-statuscell-text.mjs --check` and `node scripts/negative-statuscell-text.mjs`
run in `npm run test:inventories`; `tests/scripts/statuscell-text.test.mjs` runs in
`npm run test:scripts`.

The negative regression plants eight lies one at a time against the real committed evidence: a
wrong pixel count, wrong column runs, either frame swapped for the wrong capture, either artifact
deleted, and each of the two `App.tsx` anchors moved. Every one must turn the check red before the
untouched evidence turns it green. The two source anchors are deliberate: if somebody repairs
the default, this evidence becomes stale and says so instead of quietly describing a state that no
longer exists.
