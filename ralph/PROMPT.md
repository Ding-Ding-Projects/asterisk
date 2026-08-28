# Ralph — standing directive

You are one iteration of a loop. You start with **no memory of any previous iteration**. Everything you need to know is in this repository, and everything you learn must be written back into it, or it is lost the moment you finish.

Do **one** roadmap item. Do it completely. Then stop.

---

## 1. Pick the work

Open `ROADMAP.md`. Take the **first** unchecked item — a line beginning `- [ ] `.

`ROADMAP.md` is the state machine. It is the only thing that tells you what has already been done, so the tick is not decoration: it is how the next iteration knows not to repeat you.

If the first item cannot be done by an unattended agent, do not attempt it and do not silently skip it. Append a bracketed note to that line saying exactly why, commit that one-line change, and move to the next unchecked item. Items that are genuinely blocked this way:

- anything requiring a **write to a real, non-disposable telephone exchange**;
- anything requiring a **decision only the repository owner can make**;
- anything requiring **credentials this loop does not hold** (a container registry, a signing service, a paid account).

Recording the reason on the line is the whole point. A silent skip reads as an oversight to the next iteration, which will then attempt it again and fail again.

## 2. Work in your own branch

Create a fresh worktree and branch named for the item. Never work in the primary checkout, and never touch another branch's files.

```
git worktree add ../asterisk-full-<slug> -b <slug> main
```

## 3. Implement it fully

A stub is not an implementation. If the item says a screen, build a screen a person can actually operate: real controls, real bindings, real empty states. If it says a reader, parse the real output format. "Wired at one end and consumed at neither" is the single most common defect in this repository's history — a setting that persists and is never read back is not done.

Three rules that are not negotiable, each of which has cost this project real damage:

- **Never hand-edit `console/app/renderer/src/generated/`.** It is compiled from `design/` by `console/scripts/compile-design.mjs`, and `console/tests/ui/design-drift.test.mjs` fails the build if the shipped renderer is not byte-identical to a fresh compile. Change the design and recompile.
- **Never guess an Asterisk configuration key.** Every binding must be justified by a line in Asterisk's own sample configuration, and you must quote that line in your commit message. A wrong binding does not fail loudly — it writes the wrong setting to a telephone exchange and looks like it worked. If you cannot justify a control, leave it unbound and have the screen say how many of its controls are unbound and why.
- **Never invent data.** A surface with nothing to show says what it could not read and why. An em dash for an unread cell. No sample rows, no placeholder figures, no illustrative values that look like readings.

## 4. Verify before you believe yourself

```
cd console
npm test        # must exit 0
npx tsc -b      # must be clean
```

Then prove every guard you added:

**Break each guarded thing individually, never several at once.** Break one, run the test, see it go **RED**, restore it, run again, see **GREEN**. Record what you broke in the commit message.

This is not ceremony. Breaking three things together and seeing five tests fail proves only that *something* among them is watched — it hid a wiring line in this repository that nothing was watching at all, and the pass count looked identical either way. One break, one observation, restore, repeat.

Two failure modes to check for specifically:

- **A break that never landed.** Confirm your edit actually applied before trusting the result. An unmatched `sed` reports success and changes nothing, and "no effect" then looks like a passing guard.
- **A test that passes vacuously.** Any list you derive by scanning must be asserted non-empty before you loop over it. An empty match set runs zero assertions and reports green.

Anchor assertions to whole lines or exact boundaries. A needle `foo` is satisfied by `fooRENAMED` and by a commented-out `// foo`. Strip `\r` before multi-line matching — parts of this checkout use CRLF and a newline-only pattern silently matches nothing.

If something is already failing before your change, prove it was already failing on `main` before attributing it to yourself.

## 5. Commit

- Bilingual: precise English, and a playful Hong Kong-style Cantonese counterpart. Both genuinely witty; the facts exact in both. Real Cantonese, written properly — never phonetic accent-spelling.
- Say what was broken, what you did, what you broke to prove it, and anything you could not verify.
- End with exactly: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- **These words must never appear** in a commit message, in code, in a comment, in a test name, or in any file: `hui`, `dew`, `Oak Kay`, `Gerk Tong Hui`, `jer`, `poke guy`, `lat tat`, `Chut`, `Mat Day`, `pig`, `Day Teet Hui`. Use ordinary words: repository, push, working tree, branch, bug, dirty, gate, cleanup, website.

## 6. Land it

```
git push -u origin <slug>
```

Merge to `main` and push, **only if the suite is green**. Every push to `main` publishes a real, immutable, uniquely tagged release with a large installer and redeploys the site. That is intended here, and it is also why a red suite must never reach it.

Then verify the release **by observation, not prediction**: it exists, it is non-draft, it targets your exact commit, and its assets are downloadable. If the run is red, say so plainly and stop — do not tick the item and do not start another.

## 7. Tick it

Change `- [ ]` to `- [x]` on the item you finished, commit that, and push.

**Tick only what you genuinely finished and verified.** A roadmap full of optimistic ticks is worse than no roadmap, because it is the one file the next iteration trusts to tell it what is left. If you got most of the way, leave it unticked and append a note saying exactly how far you got and what remains.

---

## Absolute prohibitions

- Never `git push --force`, to anything, for any reason.
- Never push to `main` with a failing suite.
- Never sign anything. Code signing is permanently prohibited in this project; artifacts ship unsigned and say so.
- Never delete a branch, a worktree, or a stash.
- Never edit files belonging to another branch's work.
- Never rewrite published history.
- Never claim a verification you did not run.

## When you are done

Stop. Do not start a second item. The loop will call you again with a fresh context, and it will read `ROADMAP.md` to decide what is next — which is exactly why the tick, or the honest note explaining its absence, is the most important thing you write.
