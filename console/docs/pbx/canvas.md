# Dialplan canvas

## Behavior

One infinite canvas for the live dialplan, IVR and queue routing graph. Nodes and edges are parsed from the target's `dialplan show` output, and the layout can be moved locally for inspection. The inspector is read-only because this surface has no dialplan write path. The rail badge on this destination is empty until a live graph is read. It lives on the PBX rail, under the Telephony group: Endpoints, routing and everything a call touches while it is alive.

## What the graph is, and what it is not

`dialplan show` reads what `pbx_config` has **loaded**. It never reads a file. The two agree
only until somebody edits `extensions.conf` without reloading, and nothing in the command's
own output marks the difference — so this canvas can draw a dialplan that no file on the
target describes, and look exactly like one the file describes to the letter.

The screen therefore says which it is, in the sentence under its heading, on every read:

- **Diverged.** It names the contexts `extensions.conf` declares that Asterisk has not
  loaded, and the contexts loaded from that file that the file no longer holds, and says
  that a dialplan reload on the target is what closes the gap.
- **In agreement.** It says so plainly, and how many contexts that covers.
- **Not comparable.** It reports the target's own reason the file could not be read, rather
  than staying silent and letting the drawing be read as the file.

Three things are deliberately excluded from the comparison, each because including them
would report a defect that is not one:

- **Contexts another module created.** `dialplan show` prints the registrar that created
  each context, and only `pbx_config` loads `extensions.conf`. On one real target 21 of 49
  loaded contexts belonged to `pbx_ael`, `res_parking` or `func_periodic_hook`. Those are
  counted and named as somebody else's, never compared.
- **Contexts an `#include`d file declares.** Each extension carries the basename of the file
  that declared it, so a context whose extensions name another file is reported as an
  include rather than as a divergence. The included file itself is not read.
- **`[general]`, `[globals]` and templates.** `pbx_config` skips the first two, and a
  `[name](!)` category is a template that Asterisk's own config browser never returns.

One limit is stated on the screen rather than hidden: a context that this file does not
declare, that carries no extension at all, and that sits beside an `#include` directive
cannot be attributed to any file from this output. It is named as unattributed, and it is
not counted as a divergence, because an included file this console did not read could
account for it.

## Configuration

There is no settings form here. Adding, deleting, duplicating, or rewiring a node reports that the canvas is read-only rather than claiming a write occurred. An unread or unavailable target produces an empty canvas with the control-plane reason.

## Failure modes and security

A node that references a destination that no longer exists is omitted by the parser and the source reading reports the exact parse or target failure. Local layout changes never alter the target.

`extensions.conf` is read as exact bytes inside the privileged process, because the parsing
this comparison needs — directives, templates, a header with a trailing comment — is beyond
what the console's ordinary configuration reader keeps. That text never leaves the control
plane: only the derived facts (context names, directive lines and counts) reach the screen.

The comparison also reports its own shortfall. `dialplan show` prints a context total for
itself, and when that total and the number of context headers this reading could make out
disagree, the screen says so before it says anything else — a comparison drawn from a short
reading is short in exactly the lists it prints, and an empty list must not be read as
agreement.

## Verification

Confirm the graph contains only nodes and edges from a successful live reading, that local dragging changes layout only, and that every attempted write action reports the read-only boundary without changing the target.

Confirm the divergence sentence as well: edit a context out of `extensions.conf` without
reloading and the screen must name it as declared-but-not-loaded; reload and it must report
agreement; make the file unreadable and it must report the target's own reason rather than
either verdict.

## Suggested articles

[IVR menus](ivr.md), [Queues & agents](queues.md), and [Endpoints](endpoints.md).
