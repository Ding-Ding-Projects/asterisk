# Ralph

A loop that runs one agent per roadmap item until `ROADMAP.md` has no unchecked items left.

Each iteration starts with **no memory of the previous one**. That is the design, not a limitation: state lives in the repository rather than in a conversation, so progress survives a crash, a restart, or a context that ran out. `ROADMAP.md` is the state machine, and ticking an item is how the next iteration learns not to repeat the last one.

## Running it

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File ralph/loop.ps1            # uncapped
pwsh -NoProfile -ExecutionPolicy Bypass -File ralph/loop.ps1 -Max 5     # bounded
pwsh -NoProfile -ExecutionPolicy Bypass -File ralph/loop.ps1 -DryRun    # show the next item, do nothing
```

```bash
ralph/loop.sh                # uncapped
ralph/loop.sh --max 5
ralph/loop.sh --dry-run
```

Windows is this project's delivery target, so `loop.ps1` is the primary runner. `loop.sh` is an exact sibling so the loop is not hostage to one shell.

## Stopping it

```
New-Item ralph/STOP     # PowerShell
touch ralph/STOP        # bash
```

Checked before every iteration. It never interrupts an iteration mid-flight — an agent killed halfway through would leave exactly the half-finished state this design exists to avoid.

Delete the file to resume.

## What it does per iteration

1. Halt if `ralph/STOP` exists.
2. Exit 0 if no unchecked items remain.
3. Fetch and fast-forward `master` — non-destructive by construction, so the agent never starts from a stale base.
4. Run the agent against `ralph/PROMPT.md`.
5. Log to `ralph/logs/iteration-NNNN-<stamp>.log`.
6. Report whether the open-item count actually went down.

That last step matters. An iteration may legitimately tick nothing — recording a blocker is real work. But a loop whose count never falls is a loop spending money on something it cannot finish, and silence is how that runs all night. It is printed, every time.

## What it refuses to do

The prohibitions live in `PROMPT.md`, which the agent reads, and are repeated here so a person deciding whether to start this can see them without opening it:

- never `git push --force`, to anything;
- never push to `master` with a failing suite;
- never sign anything (code signing is permanently prohibited in this project);
- never delete a branch, worktree or stash;
- never hand-edit `console/app/renderer/src/generated/` — it is compiled from `design/`;
- never guess an Asterisk configuration key — every binding must quote the sample line that justifies it;
- never tick an item it did not verify.

## What it costs

**Every push to `master` publishes a real, immutable release** with a large installer and redeploys the site. That is intended in this repository. It also means an uncapped run publishes a release per completed item, and immutable means they cannot be tidied away afterwards. Use `-Max` if that is not what you want.

Uncapped also means no spending ceiling. `ralph/STOP` is the brake.

## What it cannot do

Some roadmap items are not mechanizable, and the loop is instructed to annotate them and move on rather than fail repeatedly against them:

- a write to a real, non-disposable telephone exchange;
- a decision only the repository owner can make;
- anything needing credentials the loop does not hold — a container registry, a signing service, a paid account.

When you see such an item annotated rather than ticked, that is the loop working correctly.

## Design notes

The failure modes this is built against were all observed in this repository rather than imagined:

- **Re-picking the same item.** The roadmap is the only state, and the agent takes the *first* unchecked line, so a tick is what advances the machine.
- **Claiming done without verifying.** The verification gate is in the prompt, and it requires breaking each new guard *individually* — breaking several together proves only that something among them is watched, which once hid a wiring line nothing was watching at all.
- **A break that never landed.** An unmatched edit reports success and changes nothing, so "no effect" looks identical to a passing guard. The prompt tells the agent to confirm the edit applied before trusting the result.
- **Work lost on a crash.** Every iteration commits and pushes its own branch, so an interrupted loop loses at most one iteration.

The logs directory is ignored. The logs are for a person reading back what happened, not a record the repository needs to carry.
