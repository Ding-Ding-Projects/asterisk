# In-context failure recovery

When an operation fails for a reason the person cannot diagnose from the message alone, the way out is offered at the surface where the failure was discovered, not buried in a menu somewhere else. Somebody whose upload has just been refused is looking at the upload control; a recovery they have to go and find is a recovery they will not find while they are annoyed.

## Behavior

A route has four parts, and each one exists because leaving it out is a way to ship the feature broken while it still looks right.

**Where it goes.** The region is rendered as the *immediate next sibling* of the status line that reported the failure. Not appended to the end of the card, not dropped at the top of the page — both of those look entirely correct in a screenshot and are not what the contract asks for.

**What it offers.** Every action is a capability the page really has. `recoveryFor()` is a pure function that names action ids; `RECOVERY_ACTIONS` holds the real implementations; and a route may only name an id declared there. A button that looks like it retries and does not is the decorative-control defect wearing a helpful face, and this arrangement is what makes it unshippable rather than merely discouraged.

**What it refuses to pretend.** A route with nothing to offer says so, and says why, instead of showing a retry that cannot work.

**What not to reach for.** `RECOVERY_FORBIDDEN` names the remedies that lose work, each with what it would cost, because those are exactly the fixes that look fastest to somebody who is stuck. A route may only warn about a declared remedy, and a declared remedy no route names is refused as dead.

## Configuration

Nothing here is configurable, and it is off for nobody: a failure raises its route, a fix takes it down again.

## Current status

**Desktop application:** Partial. The desktop application shows error messages for failed actions but does not consistently offer an inline recovery action at the point of failure; some errors require navigating elsewhere to retry. Nothing in this pass touched it.

**Documentation website:** Implemented, in `site/app.js` and `site/styles.css`. Seven routes, one per failure this page can produce that somebody cannot get out of by reading the message alone.

| Route | Raised when | Offers |
| --- | --- | --- |
| `vocabulary-rejected` | a personal-vocabulary file is refused | choose another file; remove the dictionary that is loaded (only when one is) |
| `logo-rejected` | an image is refused as the mark | choose another image; go back to the shipped mark (only when one is stored) |
| `update-check-failed` | the published version file cannot be read | check again now; open the downloads page |
| `page-unbuilt` | this copy of the page carries no build identity | **nothing at all**, and says why |
| `school-cannot-arm` | the browser gives this page no cryptographic digest | open this page over a secure connection (only when there is one) |
| `local-storage-refused` | a write to local storage is refused | remove the image; keep only the newest 20 history entries; open the local history |
| `regex-invalid` | Apply is pressed on a pattern the engine will not compile | empty the pattern; search that field as plain text instead |

Three of those deserve their own paragraph.

**`page-unbuilt` is the route that offers nothing, and it is the most important one in the table.** A page the site build never stamped has no commit to compare against the published one, and no control on the page can create one — so `Try again` there would be a lie somebody could press all day. It renders its reason where the buttons would have been. It also does a second job: the check button beside it is disabled in that state, and the canonical rule is that a disabled control names the unmet condition in adjacent text.

**`local-storage-refused` is the one route not anchored to a control**, and the exception is declared rather than quietly taken. A write can be refused during any setting on any page, so there is no single control it belongs beside; it goes to the top of the page being read. It also names, in characters, what each store is currently using — the history, the image, the dictionary, the settings — so the space can be seen rather than guessed at. Characters and not bytes, in those words: a string's length is not its size on disk, and calling it bytes would be a measurement nobody took.

That route is the reason `writeLocal()` exists. Every `localStorage.setItem` on this page now goes through it — there is exactly one in the file, and a test refuses a second. Before that, a refused write threw out through whichever setter had just been used: the value stayed in memory and on screen, so the setting *looked* saved, and the next load quietly had the old one back with nothing anywhere saying why.

**`regex-invalid` repairs a real defect rather than decorating one.** `applyRegex` used to `catch{return}` — the dialog stayed open, the Apply button appeared to do nothing whatsoever, and the only explanation was a preview line the person had already read and could not act on.

### What the canon asks for that this surface has no equivalent of

Two clauses, named here rather than left as silent gaps.

**Re-authentication.** The canonical rule says that where a failure is a refused credential or a missing permission scope, the surface offers re-authentication directly. This site has no account, no session and no credential to refuse: everything it stores is local to the browser reading it. The nearest real thing is `school-cannot-arm`, where a credential cannot be *created* because the browser gives an insecure page no digest, and the route there offers the one honest fix — the same page over https — and explicitly refuses the tempting one, which would be to keep the value somewhere this page could read back.

**Handing the failure to a local coding agent.** A published website cannot launch anything on the reader's computer. There is no equivalent and none is faked.

### Failures deliberately left without a route

`FAILURES_WITHOUT_A_ROUTE` names these, each with its reason, so an absence is a decision somebody made rather than a gap nobody noticed: an export run that found nothing to export, a wrong value offered to the restricted presentation, and a page built with no release history. Each of those already says the whole answer on its own line, and a second copy of it would be this page nagging.

## Failure modes

A route whose surface is not on the current page renders nothing at all, rather than putting the region somewhere it does not belong. A failure with no declared route is refused by name (`no-route-declared`) and renders nothing. Raising the same route twice replaces the region rather than stacking a second one under it. Clearing takes a route id, because two routes share the update card's status line and a successful check must not remove the unbuilt-page route, which it has not solved.

The engine raises no notification and speaks no line of its own. Both are deliberate: a message box is somewhere else by definition, `notify` writes to storage — which is the very thing that has failed in one of these routes — and every failure routed here already speaks its own line, so a second one would be the narrator reporting one event twice.

## Accessibility and localization

The region carries `role="group"`, its own heading, and `aria-labelledby` pointing at it, so it names itself. It also carries `aria-live="polite"`, because the failure line above it is a `role="status"` and without that a listener would hear that something failed and never hear that there is a way out. Actions are real `<button type="button">` elements and real `<a>` links; a link whose address resolves to nothing is not rendered as a dead one. Every part is built with `textContent` and never a markup string, which matters here because several of these values are somebody's own file quoted back.

Copy: the region opens with `COPY.recoveryLead`, four English and four Cantonese variants selected by the two funny sliders, wired through `data-copy="recoveryLead"` so it stays in step when a slider moves. The split is the point and it is tested — the lead line carries voice and nothing else, while every fact sits in a sibling of it, so no level can move one. Those facts are English at every level today, which is the honest state rather than a finished one.

## Verification

`console/site/tests/contracts/in-context-recovery.test.mjs` holds 56 tests that run the real extracted block from `site/app.js` over a recording DOM and a fake storage — the route table, the pure decision, the rendering, the guarded writer, and every wiring line anchored to a whole line and separately checked not to be sitting behind a comment. `console/scripts/negative-in-context-recovery-site.mjs` plants 75 breaks, one at a time, and requires each one to turn that file red and green again on restore; it is wired into `npm run test:inventories`.

Three of those 75 stayed green on their first run and are worth recording, because two of them were faults in the checking rather than in the code. One break was inert: `after:null` swapped for `after:undefined`, both of which are falsy at the branch that reads them, so nothing was broken and the pass meant nothing. One assertion was vacuous: a file input starts empty, so "the picker was emptied" passed whether or not anything emptied it, and the test seeds a value first now. And one branch was genuinely unreachable — `renderRecovery` used to look a route's facts up in a side map keyed by route id, so a resolved route rendered directly lost every link's address and no route could reach the empty-address guard at all. That map is gone; the facts ride on the resolved route.

Nothing here has been driven in a real browser: no file has been refused by a real file picker, no real storage quota has been exhausted, and no screen reader has read one of these regions aloud. It is proved against its own extracted source, a recording page and a fake storage, and no further.

## Suggested articles

[Long-operation progress reporting](long-operation-progress.md), [Personal vocabulary upload](personal-vocabulary-upload.md), [Automatic updates](automatic-updates.md), [School mode](school-mode.md), [Platform feature index](README.md).
