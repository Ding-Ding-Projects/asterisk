# The Material Design 3 conformance audit

A design-parity destination cannot move from `compiled` to `verified` on captures alone. Three
records stand behind a verified row, and this article is about the third of them: a per-destination
Material Design 3 conformance audit. The first two — the whole-frame visual diff and the
[chrome-parity bar](design-parity-chrome-bar.md) — answer *does the built artifact look like the
design*. This one answers a different question the first two cannot: *is what both of them draw
actually Material Design 3*, or is it a set of custom lookalikes that happen to agree with each
other.

Those really are different questions, and the reason is worth stating plainly. Two artifacts can
match each other pixel for pixel while neither uses a single Material Design 3 primitive. A parity
bar would call that a pass, and it would be right to, because parity is all it measures.

## Why a machine is allowed to write this one

For several passes this repository recorded, deliberately, that no `{id}-material.json` had been
generated, on the grounds that **a generated audit nobody performed would be an invented verdict**.
That objection is correct, and it is what shaped the auditor rather than what prevented it.

The objection is aimed at exactly one construction: a script that writes `conforms: true` without
looking at anything. `auditMaterial` is the opposite construction, and three properties make that
checkable rather than merely claimed.

- **`conforms` is computed, never supplied.** It is exactly `defects.length === 0`, and the defect
  list is derived from findings taken out of the rendered markup. There is no argument, option or
  code path that can set it. The red-then-green proof plants a caller passing `conforms: true`, an
  empty defect list and a clean check table all at once, and requires every one of them to be
  ignored.
- **Every check can only ever add a defect.** A check that fails to fire understates the divergence,
  which is the ordinary cost of an incomplete audit. None of them can manufacture a conformance.
  The direction of error is the whole design.
- **An audit over nothing is refused rather than answered.** Markup that renders no element, or a
  record with no destination, throws. A verdict about zero elements is the vacuous pass that every
  other check in this repository is written against.

## What is audited

The **built product renderer** — `app/renderer/src/App.tsx`, the class the application actually
mounts — rendered at each destination, together with the effective stylesheet that renderer loads:
`app/renderer/src/styles.css` and the generated `design-styles.css` it imports.

Not the bare compiled shell `App` subclasses, and not the design export. The conformance question a
verified row asks is about the chrome a person operates, so it is the product that has to answer
it. Auditing only the generated stylesheet would miss every application-owned rule, which is the
"wired at one end, consumed at neither" shape this project keeps meeting.

## The seven checks

Each measures a real declaration against a published specification value, not against a number
chosen here.

- **`typeScale`** — every explicit font size is one of the 15 Material Design 3 type-scale sizes.
- **`iconSize`** — every icon glyph is drawn at 20, 24, 40 or 48dp.
- **`shapeScale`** — every corner radius is 0, 4, 8, 12, 16 or 28dp, or fully rounded.
- **`elevation`** — a shadow is a two-layer elevation, a key shadow plus an ambient shadow, rather
  than one custom layer.
- **`stateLayer`** — hover and pressed lay a translucent state layer over the existing surface
  rather than swapping it to another opaque colour, and a focus state exists.
- **`touchTarget`** — an interactive element reaches the 48dp minimum in both axes.
- **`motion`** — durations and easing curves are Material Design 3 motion tokens.

## Capture records

| State | Record | Run from commit | Coverage | Result |
| --- | --- | --- | --- | --- |
| Per-destination conformance audit | `release/evidence/parity/{id}-material.json` | `6195f276aa8e9b715bbe33e68525727fdfcb8e07` | 32 of 32 audited destinations | 0 conforming, 32 not; 155–970 divergences each |
| Run ledger for the audit | `release/evidence/parity/run-material.json` | `6195f276aa8e9b715bbe33e68525727fdfcb8e07` | 32 audited, 57 interaction rules | 8279 divergences across seven checks |
| Type-scale check across the run | `release/evidence/parity/{id}-material.json` → `findings.typeScale` | `6195f276aa8e9b715bbe33e68525727fdfcb8e07` | 32 destinations | 1955 sizes off the 15-size scale |
| Icon-size check across the run | `release/evidence/parity/{id}-material.json` → `findings.iconSize` | `6195f276aa8e9b715bbe33e68525727fdfcb8e07` | 32 destinations | 2364 glyphs off 20/24/40/48dp |
| Touch-target check across the run | `release/evidence/parity/{id}-material.json` → `findings.touchTarget` | `6195f276aa8e9b715bbe33e68525727fdfcb8e07` | 32 destinations | 1274 interactive elements below 48dp |
| State-layer check across the run | `release/evidence/parity/{id}-material.json` → `findings.stateLayer` | `6195f276aa8e9b715bbe33e68525727fdfcb8e07` | 57 interaction rules | 1120 opaque colour swaps where a state layer belongs |
| Motion check across the run | `release/evidence/parity/{id}-material.json` → `findings.motion` | `6195f276aa8e9b715bbe33e68525727fdfcb8e07` | 32 destinations | 955 off-token durations and easings |
| Shape-scale check across the run | `release/evidence/parity/{id}-material.json` → `findings.shapeScale` | `6195f276aa8e9b715bbe33e68525727fdfcb8e07` | 32 destinations | 578 radii off 0/4/8/12/16/28dp |
| Elevation check across the run | `release/evidence/parity/{id}-material.json` → `findings.elevation` | `6195f276aa8e9b715bbe33e68525727fdfcb8e07` | 32 destinations | 33 single-layer shadows where an elevation is two |

## Capture method

The audit is a static measurement of the rendered markup and the effective stylesheet, not a
photograph. Each destination is rendered through `renderToStaticMarkup` from the real `App` class,
pinned on that destination's screen and rail with the first-run wizard closed — the same way every
"is this actually reachable" test in this repository renders it. The markup is then scanned element
by element, the stylesheet's interaction rules are parsed, and each declaration is compared against
the specification constants exported from `console/scripts/design-parity-material.mjs`.

```
npx tsx console/scripts/audit-design-parity-material.mjs             # write every record
npx tsx console/scripts/audit-design-parity-material.mjs --only=dash # one destination
npx tsx console/scripts/audit-design-parity-material.mjs --check     # freshness only, writes nothing
node console/scripts/negative-design-parity-material.mjs             # the red-then-green proof
```

`--check` re-derives all 32 records from the current renderer and fails if a committed one would
differ or is missing. It runs inside `npm run test:inventories`, so a renderer change that moves a
screen without re-auditing it turns the suite red — a conformance verdict left behind by a renderer
that has since changed is a statement about a screen nobody can reach, which is the same staleness
the capture harness refuses everywhere else.

**The comparison strips carriage returns from both sides, and that is load-bearing rather than
tidy.** This checkout runs with `core.autocrlf=true`, so a record written with LF is materialised
with CRLF in every other checkout of the same commit — a fresh clone, a linked working tree, a
build runner. The first version compared the bytes as read, and it was found the only way a defect
like that ever is: the whole suite passed in the tree that generated the records, and the identical
commit reported all 32 of them stale in the primary checkout beside it. Green where it was written
and red everywhere it matters is the worst direction for a freshness check to be wrong in. What the
check is actually about is whether a record still says what the renderer produces, and a line
ending is not part of that — so both directions are now planted in the red-then-green proof: a CRLF
record must not be called stale, and stripping carriage returns must not blind the check to a real
edit.

## Verification boundary

This audit reads declarations, not pixels. Five limits travel inside every record's own
`notMeasured` field rather than living only here.

- **Component anatomy.** Whether a control whose measurements are correct is a real Material Design
  3 component or a custom lookalike sharing its numbers.
- **Post-layout geometry.** A flex child that declares no size has no measurable touch target, so it
  is not held to the 48dp minimum.
- **Runtime-injected style.** Anything a script sets on an element after render.
- **Observed motion.** That a declared transition runs, and runs for the duration it declares.
- **Colour roles.** No colour tokens are measured at all, so nothing here says whether a hard-coded
  colour is the colour role its position calls for.

Closing those needs the same driven-build route the captures use.

The other boundary worth naming is what a clean run would and would not mean. `conforms: true` on
every destination would satisfy one of the three requirements a `verified` row carries. It would
not make a row verified on its own, and it would not be evidence about the reference side, which
this audit never renders.

## What the first run found

All 32 audited destinations, between 180 and 1433 elements each, and 57 interaction rules.
**Conforming: 0. Non-conforming: 32.**

The shape of it is consistent, and it is the signature of a design-tool export whose measurements
were chosen by eye rather than taken from the scale. Type sizes land on 11.5, 12.5, 13, 13.5, 14.5,
15, 15.5, 18, 20 and 54px, none of which the type scale contains. Icon glyphs land on 14 through
22, and on 30, 32 and 34. Radii land on 5, 7, 9, 10, 14, 18, 20, 24 and 26. Every interaction state
is an opaque colour swap. Every shadow is a single custom layer. Durations sit at 120, 160, 180,
220, 240, 280, 320, 340 and 360ms against a token set holding 100, 150, 200, 250, 300 and 350.

**What it found conforming matters as much.** An auditor reporting everything as wrong would be
exactly as useless as one reporting everything as right, and — because every audited destination
here is non-conforming — the committed evidence alone cannot tell those two apart. So the passes are
worth naming. `cubic-bezier(.2,0,0,1)`, the curve most of this interface transitions on, **is** the
Material Design 3 standard easing token and is not reported; the two curves that are reported are
overshoot springs. Icon glyphs at 20 and 24px pass. Radii at 8, 12, 16 and 999px pass, and so does a
unitless `0`, which is the shape scale's own "none" step. The application's own stylesheet declares
focus states, so the focus half of the state-layer check does not fire.

Beyond that, the auditor is held against a **fully conformant synthetic screen** and required to
return a clean verdict, and each of the seven checks is then broken one at a time on that screen and
required to be the only one that fires. That is the discriminator the real evidence cannot provide.

`verifyDesignParityEvidence` reads these records: a row claiming `verified` needs its record
present, naming that destination, recording `conforms: true`, and carrying no unresolved defects.
All 32 currently record `conforms: false`, so this is now a second **measured** reason no
destination is verified rather than an absent prerequisite, which is what it was before.

## Suggested articles

- [The chrome-parity bar](design-parity-chrome-bar.md) — the reference-versus-built half of the
  same `verified` requirement.
- [Design-reference harness](../../design-reference/README.md) — how each side is driven and
  captured.
- `console/scripts/design-parity-material.mjs` — the auditor and its specification constants.
- `console/scripts/audit-design-parity-material.mjs` — the runner and its freshness check.
- `console/tests/scripts/design-parity-material.test.mjs` — its tests, including the conformant
  fixture.
- `console/scripts/negative-design-parity-material.mjs` — the red-then-green proof.
- `console/scripts/design-parity-evidence-on-disk.mjs` — the guard that reads these records.
