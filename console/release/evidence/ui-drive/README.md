# Built-artifact interaction drive

A walk of the real built application, clicking every reachable control and keeping a
capture after **every** click rather than a gallery of final states.

## How it was produced

The packaged renderer was run under Electron on an off-screen Windows desktop, so the
machine's visible desktop, cursor and foreground window were never touched. The driver
spoke the Chrome DevTools Protocol over loopback and refused to evaluate anything until
the target list held exactly one page — that check is the isolation proof, not a
formality. The profile was a task-scoped user-data directory created for the run alone.

## What the numbers mean

| Figure | Value |
| --- | --- |
| Destinations walked | 132 |
| Steps recorded | 1000 |
| Captures taken | 873 |
| Clicks that changed the interface | 306 |
| Clicks skipped, each with a recorded reason | 127 |

`ledger.json` records all 873. Per click it carries the accessible name of the target,
the element, input and dialog counts before and after, whether anything actually changed,
and the capture's SHA-256 and byte count.

## What is committed here, and what is not

`../../captures/ui-drive/` holds the **109 destination-entry captures** — one per screen
the walk reached, about 30 MB. The complete set is 411 MB, which would more than triple
this repository, so the remaining captures are retained outside it and every one of them
is hashed in `ledger.json`. A capture that were ever substituted would not match its
recorded digest.

Each committed image was decoded and sampled before being added: 109 of 109 painted real
content, none was uniform, and none contained a single pure-black pixel. That last check
is the meaningful one — this palette has no true black, so a black region means the
window rendered nothing, and it is the failure that looks most like a success.

## Two traps this driver was written around

Both were measured on this exact setup rather than anticipated.

**A backslash does not survive into an evaluated expression.** A pattern written as one
thing arrived as another and silently deleted every letter `s` from the results. No error,
no warning, just quietly wrong data. Every expression the driver evaluates is written
without a single backslash.

**Reading the page in the same tick as a click returns the state before it.** An earlier
attempt concluded a panel had not opened when it had; the DOM simply had not re-rendered
yet. The driver settles, then reads, and records both counts so the claim is checkable.
