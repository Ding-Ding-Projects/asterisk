# Support Tickets recovery flow

A local, entirely fictional support desk that a person reaches when they have locked themselves out of something, takes their ticket, numbers it, answers it, escalates it as often as they like, and arrives every single time at the one resolution that actually works: clear the local data yourself.

The comedy is the delivery. The resolution is real, and it is the only thing on either surface that helps somebody who has forgotten a value they chose.

## Behavior

A ticket form takes a category, a severity and a description. Submitting it writes a numbered ticket to local storage and nowhere else, and the desk answers immediately with a canned first response. The ticket can be chased up as many times as its four statuses allow — received, triaged, escalated, resolved — and reopened afterwards. Reaching `resolved` reveals the resolution, which names exactly what to clear and where, and says plainly that the product will not clear it for you.

Severity is recorded exactly as it is set and changes nothing at all. That is said beside the control rather than left to be discovered, because a control that quietly does nothing is the decorative-UI defect this project refuses everywhere else.

## Configuration

One unmissable line states plainly that nothing leaves the device, no network request is made, no data is collected and nobody is reading the ticket. It is a fixed constant on both surfaces: not a translatable copy key, not passed through the personal-vocabulary replacement, and unreachable by any funny level or language mode. A disclosure that a slider could rewrite would be decoration rather than a disclosure, and this is the single line standing between a joke and somebody sitting waiting for a reply that was never coming.

Everything else on the surface does move with the sliders, in both languages, exactly as the rest of the product's copy does.

## Current status

**Desktop application:** Implemented, in `app/renderer/src/support-tickets.ts` and the shell that files a ticket from it. It validates and numbers a ticket, advances it through its statuses, and resolves by reaching the folder-open path so the person can delete the application-data folder themselves in their own file manager. It never deletes anything on their behalf, and its contract test asserts the call rather than the absence — an earlier pin there recorded the opposite state, where the resolution text said "This console will open it for you" and nothing in the method opened anything, which is worse than no copy because somebody waits for a thing that was never coming.

**Documentation website:** Implemented, in `site/app.js`, `site/settings.html`, `site/documentation.html` and `site/styles.css`. See the section below, which is a genuinely different mechanism rather than the desktop desk running somewhere else.

## The published website

A page has no application-data folder to open and no file manager to open it with, so the canonical flow had to be read for what it is FOR rather than copied step by step: tell somebody who is locked out exactly what to clear, make it easy to get hold of, and get out of the way.

**What the website can lock somebody out of is the restricted presentation.** That is a real self-imposed lock with a value the person chooses, and forgetting it is a normal outcome — which is what makes a recovery route worth building rather than a joke with no job. The desk is therefore reachable from three places: the settings card of its own, the restricted presentation's own `Forgotten the value?` disclosure, and a link from the documentation page that arrives as `settings.html#support-tickets` and is answered by `supportRouteFromHash()`. The lock deliberately does **not** suppress any of them. A mode that hid its own way out would be a lock rather than a speed bump, so the desk is absent from `SCHOOL_SUPPRESSED` on purpose; `copyText()` already renders it in plain English while the mode is on, so it goes quiet without going away.

**The resolution derives the list of keys rather than restating it.** `supportStorageKeys()` returns the seven constants this page actually writes — the settings record, the local history, the restricted-presentation record, the tickets themselves, the built-in authenticator's accounts, the personal-vocabulary cache and the logo cache — and the resolution renders them beside the origin the browser reported, with a control that copies both. The two cache keys were inline string literals until this landed and are named constants now for exactly this reason: a hand-copied list here would be wrong the day an eighth key is added, and nothing would say so. This is the one place a locked-out reader is told what to clear, and the contract test re-derives the same set from every storage call in the file — the direct `localStorage` ones and every key handed to the guarded `writeLocal` — and refuses a mismatch in either direction: a key the page writes that the list omits, and a key on the list that nothing has ever written.

**The seventh key is worth its own paragraph, because it is the one this list did not know about.** The ticket desk and the built-in authenticator were built on the same day on separate branches, so neither could see the other, and `supportStorageKeys()` shipped on its branch naming six keys that were genuinely all there were *on that branch*. Nothing in either branch's own suite had anything to say about it; the omission existed only in the merge, and it surfaced there because this derivation reads the whole file rather than a list somebody maintains. The reader it would have failed is exactly the one this panel is for: told what to clear, clearing all of it, and finding their authenticator accounts still sitting there afterwards with no explanation of why that key was left off the list. It is also the key with the least to fall back on — the authenticator card has no clear button of its own, and `Reset settings` deliberately leaves it alone — so this panel is the only route to it anywhere on the site.

**Every ticket is written through the one guarded writer.** `saveSupport()` goes through `writeLocal`, the same writer every other store on this page uses, so a browser refusing the write is reported to the reader instead of thrown past. It matters more here than anywhere else on the site: this desk is the recorded route back out of a lock, and the thing a full browser would be told to do about it is to clear this site's storage — which is also the thing that takes the tickets with it. A ticket that silently failed to save is a route that is not there at the one moment somebody needs it, and they would not find out until the next visit, by which point the page cannot even say what went wrong because nothing was kept.

**Nothing is deleted, and that is why no gate is needed.** The page names the origin, names the keys, and says in as many words that it does not clear anything for you and that no button here will. Clearing site storage removes every key it just listed, including the tickets themselves, which is either a design flaw or the funniest part of the desk depending on where the funny level is set.

**Nothing is sent anywhere.** There is no request at all, not a same-origin one: the whole block contains no `fetch`, no `XMLHttpRequest`, no `sendBeacon`, no `WebSocket` and no dynamic import, and the contract test runs the real source with all three network primitives wired to throw. A desk that quietly posted the description somewhere would look identical from outside and would be the worst defect this surface could ship, because the copy promises the opposite in so many words.

**A ticket is append-only.** Chasing one appends an update; reopening one appends another and drops nothing; closing a batch appends to each. Nothing is ever removed from a ticket's history, which is what makes closing reversible, which in turn is why the bulk close is declared non-destructive and needs no two-key confirmation. The canned first response is **stored on the ticket** rather than re-rendered, so moving a funny slider later does not go back and rewrite an answer somebody has already read.

Tickets live under their own storage key, so `Reset settings` does not touch them — the reset gate says so out loud among the things it deliberately leaves alone, for the same reason it already names the restricted-presentation switch. The list has its own search wired to the anchored regular-expression builder, its own selection and bulk close, and its own export through the same format machinery every other list on the site uses, carrying the readable columns and not the internal id.

**What this does not claim.** Nothing here has been opened in a browser: no dialog has been shown by a real `showModal`, no `localStorage` has been written by a real browser, no page has been served over HTTP, and the markup checks are string assertions over the committed HTML rather than a rendered DOM. The whole feature is proved against its own extracted source, a recording page and a fake storage, and no further. The pages-site inventory row therefore stays `unverified`: the implementation, its documentation, its localized copy and its local check all exist, and the two artifacts that need a running program — a built-artifact interaction record and a capture — do not.

## Failure modes

A corrupt, foreign or unparseable stored value falls back to an empty desk rather than throwing, and a stored ticket in a status this code has never heard of is dropped rather than rendered as a state that does not exist. A refused form writes nothing and consumes no ticket number, and says which field to fix in plain words rather than colouring a border. A description longer than the bound is refused with its real length and the real limit. A refused clipboard is survivable, because the key list is on screen either way and the confirmation says so. On a page with no desk — every page but the settings page loads the same script — every entry point returns without doing anything.

## Accessibility and localization

The desk is an `overlay-card` dialog, so it inherits the bounded height and internal scrolling every other dialog on the site has. It is named with `aria-labelledby`, its close control has an accessible name, all three form controls carry real labels, a refusal is announced through a `role="status"` line and a new ticket through an `aria-live` list. The disclosure is given a border and a weight of its own rather than the muted note colour every other aside uses, and cannot be hidden. Long unbroken words in a description wrap rather than pushing the row wider than the dialog.

`supportDesc` and `supportFirstResponse` each ship four English and four Cantonese variants. The disclosure and the severity note are fixed constants in both languages and at every level, as above.

## Verification

`site/tests/contracts/support-tickets.test.mjs` runs the real extracted source against a recording page with the network wired to throw. `scripts/negative-support-tickets-site.mjs` plants each break in turn — one at a time, each watched red and then green again on restore — covering the three routes, the network boundary, the deletion boundary, the derived key list, the disclosure, the restricted presentation's refusal to hide its own way out, the whole ticket lifecycle, the rendered list and the registry rows.

One note worth keeping, because it cost half an hour and is a property of every script of this shape: a `finally` restores a planted break when the script throws and does nothing at all when the script is **killed**. A run cut short by an outer timeout left one planted `setInterval` in `site/app.js`, where it read as an ordinary line of the feature; it was found because the contract assertion it exists to trip went red. The script now traps `SIGINT`, `SIGTERM` and `SIGHUP` and restores before dying, and an already-red baseline names a previous kill as the likeliest cause and lists the files to check.

## Suggested articles

[Per-element toy locks](per-element-toy-locks.md), [School mode](school-mode.md), [Unlock ladder](unlock-ladder.md), [Local version history](local-version-history.md), [Complete exports](complete-exports.md), [Platform feature index](README.md).
