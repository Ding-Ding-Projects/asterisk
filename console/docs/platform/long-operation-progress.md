# Long-operation progress reporting

An operation started from a dialog reports its own progress inside that dialog, rather than spinning. A spinner and a hang look identical from the outside, so a spinner tells nobody anything at the moment it matters.

## Behavior

Three properties carry this contract, and the second is the one usually shipped half-built.

1. **Real progress inside the originating dialog.** A determinate bar counting real units, and the same counts in words beside it. Not a percentage disconnected from the work, and not an animation that runs whatever is or is not happening.
2. **Both halves of the duplicate-submission guard.** The submitting control is disabled for the whole run **and** the handler itself refuses a second entry. A disabled button is the visible guard, never the real one: a keyboard submit, a second press landing in the same frame, or anything holding a reference walks straight past `disabled`.
3. **Expensive optional work is a choice.** Offered where it is relevant, hidden where it is not, and saying plainly what declining leaves undone.

## Documentation website

Implemented, in `site/app.js`, `site/settings.html` and `site/styles.css`. **Settings → Search & actions → Export everything…** opens a dialog that writes one file for every record set the page owns, in the single format chosen.

The five record sets are **local settings** (the redacted snapshot, flattened to one `setting`/`value` row per leaf), the **destination catalogue**, **notification history**, **local settings history**, and the **changelog**.

`planExportEverything` decides the whole run before it starts, so the plan a person reads and the work that then happens cannot disagree. It is a pure function; the sentence above the bar, the bar's own maximum, and the list of formats offered all come out of it.

**Size, said plainly rather than implied away.** On a browser holding a handful of notifications this finishes in milliseconds. Two things make a real report worth having anyway: the unit count has no upper bound, because the changelog gains a version every time this site is published; and a run stopped halfway has to be able to say which files already exist. A spinner can say neither.

### What the report actually shows

A unit is one record set. The bar's `max` is the number of units this run will write and its `value` is the number written, so a completed run fills the bar exactly. Beside it, in words:

- announcing a record set: `Writing 3 of 5: Notification history (12 rows). 9 of 41 rows done.`
- between record sets: `3 of 5 written, 21 of 41 rows done.`
- cancelled: `Cancelled after 1 of 5. Already written: ding-pbx-page-settings.json.`
- failed: `Stopped after 2 of 5: Notification history could not be written (…). Already written: …`
- finished: `Finished. 5 of 5 written, 41 rows. Already written: …`

**The index and the name always agree.** A single line carrying both while a record set has just finished says *Writing 3 of 5* beside the name of the one that finished second, which does not read as an off-by-one — it reads as the report naming the wrong thing. Between units there is no unit to name, so it does not name one.

### Why the run pauses twice per record set

The run announces a record set, yields, then does its work. The other order writes the sentence and overwrites it inside one synchronous block with no paint between, so the name is never seen and the page appears to freeze on whatever the previous line said. That is the same failure as a spinner, with a sentence instead of one.

It pauses again after the record set lands. Without that second pause the completion render is superseded by the next announcement inside one block, so the count between units never paints and the cancel check at the top of the loop has no window to fire in. Both would read in the source exactly like things somebody sees.

### Cancelling

Cancelling lands **between units and never inside one**, because a record set's conversion is a single synchronous call into the shared export engine. That is exactly why a cancelled run can name the files it already wrote rather than claiming nothing happened. There are two windows: while a record set is announced but not yet written, in which case nothing is written for it; and after one lands, in which case it is kept and named. After a cancel the page never announces a further record set.

### The expensive optional phase

The changelog is the only record set here with no upper bound. Its checkbox is shown **only when it actually has rows** — a choice offered to leave out something that does not exist is a question with one answer — and the sentence beside it names what declining costs: every released version, its date, its categories and its commit ids.

### One format for the whole run

One format is chosen for all five record sets, so the list offered is the **intersection** of what the shared export engine judges suitable for each. A format that suits four and damages the fifth would damage the fifth silently, since each file is written on its own and nothing afterwards compares them.

Worth being exact about what that buys today: `exportEverythingRows` maps four of the five record sets onto fixed column names of its own, so on ordinary data the intersection narrows nothing. It is a guard against the next record set somebody adds rather than a live difference.

### Local only

Every record set here is local, `exportRows` produces text, and `download` writes it. No request is made, and the contract test refuses the operation's source if it grows one.

## Desktop application

Partial, and unchanged by this work. Long actions show a generic busy indicator rather than real progress, and only the visible button — not confirmed keyboard re-entry — is guarded against duplicate submission. Nothing in this pass touched the desktop console.

## Correction to an earlier version of this article

This article previously said, under *Current status*: "**Documentation website:** Not implemented. The documentation website triggers no long-running operations of its own."

The second sentence was the reasoning behind the first, and it was doing the work of an exemption. It is better read as a description of what had not been built than as a fact about the surface: the site owns five record sets, an export engine with ten formats, and a `download` path, so an operation over all of them was always available to build. Recorded rather than quietly replaced, because a sentence that reads as a reason not to build something is worth knowing was wrong.

## Configuration

Nothing here is persisted. The chosen format and the changelog choice belong to one run and are re-derived each time the dialog opens. A freshly opened dialog also reports nothing rather than the tail of a run that ended ten minutes ago, since a leftover *Finished* line reads as this attempt having already succeeded; a run still in flight is left exactly alone.

## Failure modes

- **A record set that cannot be written** stops the run there, names which one and why, and names the files already produced. A report saying only "the export failed" would leave somebody deleting good files.
- **Nothing to write** — every record set empty, or the only non-empty one declined — disables Start with that exact reason, in the page as well as in the tooltip, and refuses the run rather than reporting an empty success.
- **A second start request** while a run is in flight is refused by the handler, counted, and shown: *1 further start request was refused while an export was already running.*
- **A page without the dialog** (every page but Settings) is skipped rather than crashed on.

## Accessibility and localization

The bar carries its own label and the count is a sentence as well as a bar, announced through `role="status"` and `aria-live="polite"` — a bar alone gives a screen reader a percentage and no words. Start and Cancel are `type="button"`; inside `<form method="dialog">` a button with no type is a submit button, and a submit closes the dialog, which would destroy the whole progress report at the instant it began. Every disabled control names the condition that is unmet in the page itself, not only in a tooltip, since a tooltip is pointer-only. The bar has no animation, so a reduced-motion preference costs nothing here.

`COPY.exportEverythingDesc` ships four English and four Cantonese variants wired to the funny sliders through the dialog's `data-copy` hook, and three facts survive every level. The plan sentence, the progress sentence, the decline sentence and the disabled reason are rendered from the run's own numbers rather than from `COPY`, so they are English at every level — they are a factual report of counts and filenames rather than product prose — and every one of them still passes through `applyVocabularyText`.

## Verification

`site/tests/contracts/long-operation-progress.test.mjs` — 41 tests, running the real extracted source against a recording page and controllable timers. The export engine is not faked: the real slice of `site/app.js` is extracted and run, because the format intersection is only meaningful against that engine's real suitability rules.

`scripts/negative-long-operation-progress-site.mjs` plants **63 breaks, one at a time**, each turning that file red and green again on restore. It is wired into `test:inventories`.

Three of those breaks stayed green on their first run, and all three were defects in this implementation rather than gaps in the test:

- the finished record set was left named while the count advanced past it, producing the off-by-one described above — invisible, because the render was superseded before any paint;
- the count between units never painted, for the same reason, making that branch unreachable;
- the cancel check at the top of the loop had no window to fire in, making it dead code that looked live.

The second pause per record set is what makes all three real, and the assertions that now catch them sample the sentence **from the element** across the whole run rather than reading a return value. A run that computed a perfect progress line and never wrote it to the page is exactly the failure a return-value assertion cannot see.

## Not verified here

Nothing on this page has been opened in a browser by this work. It is proved against its own extracted source, a recording page, controllable timers and the real export engine, and no further: no real `<progress>` element has been painted, no real download has been written to a disk, and no browser's own multiple-download prompt has been met. The built-artifact interaction record and the capture that the per-surface inventory asks for do not exist for this row.

## Suggested articles

[Complete exports](complete-exports.md), [Destructive-action confirmation](destructive-action-confirmation.md), [Non-blocking notifications](non-blocking-notifications.md), [Guided forms](guided-forms.md), [Platform feature index](README.md).
