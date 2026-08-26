# What a panel actually offered, read rather than remembered

`observedPanelControls` is a field in the built-interaction records under
`release/evidence/windows-console/`. Twenty-six of the thirty-nine committed records carry it.
Twenty-five of those recorded an empty list.

The field is not decorative. [`scripts/operated-interaction-evidence.mjs`](../../scripts/operated-interaction-evidence.mjs)
reads it and refuses a `verified` inventory row whose record does not carry a non-empty one, on
the grounds that a row claiming proof must show the feature behaving rather than merely being
photographed. So the field is consumed.

Nothing in this repository ever produced it. A search of the whole tree finds
`observedPanelControls` in the two guard scripts, in the records themselves, and in one contract
test, and in no script that writes one. The selector lived in an ad-hoc paste at a driving session
and was never committed, so it could not be reviewed, could not be tested, and could not be fixed
once. Twenty-five empty readings are what that looks like from the outside — a field wired at one
end and consumed at neither, arriving from the producer side for once.

Harness: [`scripts/ui-drive/observe-panel.mjs`](../../scripts/ui-drive/observe-panel.mjs).
Contract: [`tests/scripts/panel-observation.test.mjs`](../../tests/scripts/panel-observation.test.mjs).

## Two properties of this application that defeat the obvious reader

Both are measured off the compiled shell by the contract test rather than remembered here, so a
change to either fails the suite rather than quietly changing what the harness means.

**This application declares almost no roles, and no dialog role at all.** The compiled shell —
6,277 lines, effectively the whole console interface — contains zero `role` attributes and zero
accessible-name attributes. Across the entire renderer there are exactly four roles, two `alert`
and two `status`, and no element anywhere carries the dialog role. A selector for it therefore
matches nothing under any state.

That was not a hypothetical. `drive.mjs` counted elements carrying the dialog role as its
`dialogs` reading, recorded it either side of every click, and used it in the flag that decides
whether a click changed anything. The number was zero on every screen whether a panel was open or
not, so the reading contributed nothing and the "did this click open something" test was blind to
the one outcome it most needed to see. `gallery.mjs` printed `(a dialog was still open)` beside a
screenshot on the same reading; that warning had never fired.

**Icon ligatures put their own name in the DOM, before the label.** The shell renders 175
`<span class="msym">` Material Symbols spans, and an icon-bearing control emits its icon span
first. So `textContent` on the regex builder's first tool button reads `backspaceDelete last`, not
`Delete last`. Every control name `drive.mjs` recorded carried its glyph name glued to the front,
and any comparison against a name a person had written could never match.

## The dead end, kept where it can be seen

`gallery.mjs` stripped the ligature with the prefix pattern `/^[a-z_]+(?=[A-Z])/`. It is the
obvious fix, it handles `backspaceDelete last` correctly, and it is wrong: it needs a capital
immediately after the glyph name, so it silently strips nothing from any label that begins
lowercase. The regex builder's own flag chips render as `checki · ignore case` when the flag is
on — and the default state has one flag on, so this is the ordinary case rather than a corner.

`stripLigaturePrefix` in the harness keeps that behaviour, exported and tested, with an assertion
pinning the lowercase failure, so nobody reaches for it again. The browser side does not use it.
It removes the icon elements from a clone and reads what is left, which is exact and cannot
mis-fire on a lowercase label — and reading a clone leaves the live application untouched, which
matters when the thing being measured is its state.

## How a panel is identified without a role

By stacking order, which this application is unusually disciplined about. Every literal `z-index`
in the shell is either at most 6 — rails, sticky headers, ordinary page chrome — or at least 55:
the setup wizard, the info sheet, the command palette, context menus and their submenus, the
appearance drawer, the lock and unlock sheets, the confirmation gate, the tab filter, the colour
picker, and the regex builder at 96 and 97. There is nothing in between.

So `OVERLAY_Z_FLOOR` is 55, and an overlay is a positioned element at or above it. Among those,
the panel is the highest one that actually holds something operable — a scrim is the sibling one
level below with nothing inside it — and where two share a level the smaller wins, because a
full-viewport flex container that centres a card reports the same level as the card and the card
is the panel.

The one interpolated `z-index` in the shell is the dialplan canvas, which is `94` when fullscreen
and the keyword `auto` otherwise. The keyword parses to `NaN` and is rejected; the number is a
genuine overlay and is correctly treated as one.

## What the harness reports

`observedPanelControls` is a list of strings, because that is the shape the guard checks. The
fuller readings travel beside it in `panelControlReadings`, each naming how the label was arrived
at: an accessible name where one exists, then the text with the icons removed, then the `title`
this application sets on its icon-only controls.

A control that has none of those is reported with `source: "icon"` and is deliberately kept **out**
of `observedPanelControls`. A glyph name is a finding — this control has no name a person can read
— not a control label, and letting it into the list would let a panel of unlabelled icons satisfy
a guard that exists to show a panel was operable.

A screen with no panel open records `panelFound: false` and the reason, never an empty control
list. Those two are the readings that look identical in a record and mean opposite things, and
telling them apart is most of the point: an empty list beside `panelFound: true` is exactly the
shape of the twenty-five records this work exists to stop being written again.

Where a caller supplies the control the panel was opened from, the record carries both rectangles
and the measured gap between them beside `anchoredToOriginatingField`, so the flag can be argued
with rather than merely believed. It is a geometric reading: a panel the application positions by
percentage, or one the user has dragged, will legitimately read false, and a panel covering the
viewport can never read true.

## Capture records

There are no screen captures in this record, and saying so is the point of it. This pass built
the reader; it has not yet been run against a packaged application. What follows are the readings
the design rests on, each taken from the tree at one commit, and the deliberate-break runs that
prove the assertions guarding them can fail.

| State | Record | Read at commit | Coverage | Result |
| --- | --- | --- | --- | --- |
| Producers of `observedPanelControls` anywhere in the tree | tree-wide search for the field name | `56ca283dccfae7b9226d17950193266482605f00` | whole repository | two guard scripts, 26 evidence records, one contract test, and **no script that writes one** |
| Committed records carrying the field | `release/evidence/windows-console/*.json` | `56ca283dccfae7b9226d17950193266482605f00` | 39 records | 26 carry it; 25 of those recorded an empty list |
| Role attributes in the compiled shell | `app/renderer/src/generated/console.tsx` | `56ca283dccfae7b9226d17950193266482605f00` | 6,277 lines | zero roles, zero accessible-name attributes |
| Roles anywhere in the renderer | `app/renderer/src/**/*.{ts,tsx}` | `56ca283dccfae7b9226d17950193266482605f00` | 8 sources declaring any | exactly four: two `alert`, two `status`; **no dialog role at all** |
| Accessible names outside the shell | `app/renderer/src/**/*.tsx` | `56ca283dccfae7b9226d17950193266482605f00` | whole renderer | six, which is why the reader still prefers one where it exists |
| Icon ligature spans in the shell | `className: "msym"` occurrences | `56ca283dccfae7b9226d17950193266482605f00` | 6,277 lines | 175, emitted before the label on every icon-bearing control |
| Literal stacking levels in the shell | `z-index:` occurrences | `56ca283dccfae7b9226d17950193266482605f00` | 22 distinct values | page chrome tops out at 6, overlays start at 55, nothing between |
| The one interpolated stacking level | `canvasZ:s.fullscreen ? 94 : 'auto'` | `56ca283dccfae7b9226d17950193266482605f00` | 1 site | `94` is a real overlay; `auto` parses to `NaN` and is rejected |
| Deliberate breaks, applied one at a time | `tests/scripts/panel-observation.test.mjs` | `56ca283dccfae7b9226d17950193266482605f00` | 21 breaks | 19 red on the first attempt; **2 stayed green** and are described below |
| The same 21 breaks after both guards were repaired | `tests/scripts/panel-observation.test.mjs` | `56ca283dccfae7b9226d17950193266482605f00` | 21 breaks | all 21 red one at a time, all 21 green on restore |
| The whole suite with the harness wired in | `npm test` | `56ca283dccfae7b9226d17950193266482605f00` | 3,713 assertions | 3,713 passed, 0 failed |

## Capture method

None of the readings above came from a running program, and none of them needed to: every one is
a property of the committed tree, read from the tree, and re-read by the contract test on every
run so it cannot go stale silently. The counts in the table were taken by search; the assertions
in `tests/scripts/panel-observation.test.mjs` re-derive each of them from the same files and fail
if they move.

The deliberate breaks were applied one at a time by a scratch script that refused to proceed when
its edit did not actually land — an unmatched replacement reports success and changes nothing,
and "no effect" then reads exactly like a passing guard. Each break was applied, the suite run,
the file restored byte for byte, and the suite run again to confirm green before the next break
was applied. Nineteen assertions in this file, run inside `npm test` through `test:scripts`.

## Verification boundary

**This record proves that the reader exists, that its decisions are correct on the readings it is
given, and that the DOM facts it is built on are true of the committed tree. It proves nothing
about any running application, because no application was run.** The harness has never observed a
real panel. `observedPanelControls` in the 39 committed records is unchanged by this pass, and no
inventory row moved to `verified` because of it.

What remains is to drive the packaged application with it and let the records carry real readings.
That needs a built artifact, and it is the next step rather than a claim this document makes.

Two of the twenty-one breaks were applied to guards written earlier in the same pass and **stayed
green**, which is the part worth recording:

- The z-index check asserted that the lowest overlay equalled `OVERLAY_Z_FLOOR`. That is true of
  any floor landing on a real value, so moving the floor from 55 down to 6 — into the middle of
  the page chrome — passed. A guard that moves with the constant it guards cannot catch the
  constant being wrong. It now measures the empty band from the shell alone and requires the floor
  to sit inside it.
- The comment stripper that keeps a scan for forbidden code from being satisfied by prose
  describing that code checked only that stripping made the file shorter — which dropping blank
  lines alone achieves. Defeating the stripper entirely passed. It is now checked against a sample
  containing a marker in three comment shapes and two lines of real code.

The generated shell must not be hand-edited, so the assertions about its own DOM were exercised by
pointing the scan at a renderer source that does declare roles, and the dialog-role scan by
temporarily giving a hand-written component that role. Both went red.

## Suggested articles

- [Every reading, run against a live Asterisk](live-readings.md) — the same discipline applied to
  command output rather than to a rendered panel, and the two guards there that could not go red.
- [What `statusCell`'s remaining pixels are](statuscell-text-pixels.md) — measuring a rendered
  frame rather than reasoning about the stylesheet that produced it.
- [The per-destination Material Design 3 audit](design-parity-material-audit.md) — the other place
  a machine writes a verdict about the interface, and what constrains it.
