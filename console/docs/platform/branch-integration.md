# Why forty-eight branches are still unmerged

Forty-eight branches sit beside `master`, none of them an ancestor of it, every one holding
commits that are not on the default branch. That looks like a backlog nobody has got round to.
It is not: it was measured on 2026-08-24, and the reason each group is still separate is
recorded here so the same afternoon is not spent again.

## Behavior

Nothing is at risk. Every one of the forty-eight is byte-identical on the remote — checked
branch by branch with `git ls-remote`, not assumed — so the work exists in two places and
cleanup can never be the thing that loses it.

The branches divide cleanly:

| Group | Count | State |
| --- | --- | --- |
| Conflict on merge | 26 | `git merge-tree` reports conflicts against `master` |
| Merge cleanly, tree does not build | 20 | merged into a scratch branch; 57 type errors |
| Merge refused during the batch | 2 | conflicted against an earlier branch in the same batch |

The middle group is the interesting one, because "merges cleanly" reads as "ready to land" and
is not the same claim at all. Git merging without conflict means no two branches touched the
same lines. It says nothing about whether the result compiles, and here it does not.

## Configuration

Nothing here is configurable. Reproduce the measurement with:

```
git merge-tree --write-tree origin/main <branch>
```

for the conflict split, then merge the clean ones onto a scratch branch and run the ordinary
build.

## Failure modes

The 57 errors are not scattered noise. Twenty-six of them are TS2339 — a property that does
not exist — across thirteen files, which is the signature of two branches carrying different
versions of the same API rather than of one broken file. Two smaller instances were fixed
while measuring, and both had that same shape:

- Three changelog articles arrived without a top-level `# Title`, which the documentation
  bundler requires. Straightforward, and they only exist on those branches.
- `applyVocabularyText` was changed on one branch to take a classified boundary
  (`{ text, boundary }`) instead of a bare string, while a caller on another branch still
  passed a string. The fix is not to pick a boundary and hard-code it: `transformText` serves
  both what a person reads and what a screen reader announces, so the caller has to say which,
  and `alt` is an accessible name despite carrying no `aria-` prefix.

Fixing the remaining fifty-odd would mean reconciling two API generations across other
sessions' work, blind, in a console that configures a real telephone exchange. A tree that
compiles is not evidence that it still behaves; that is a project with its own verification,
not a step in a cleanup pass.

**So none of them were deleted, and none were force-merged.** A tidy branch list is not worth
losing work, and an integration nobody verified is worse than an unmerged branch, because it
looks finished.

## Security considerations

None specific. The usual rule applies with more force than usual here: never resolve a merge
conflict in a configuration writer by picking whichever side compiles. A wrong Asterisk key
does not fail loudly — it writes a line that looks correct and the exchange obeys it.

## Verification

`git merge-base --is-ancestor <branch> origin/main` is the proof that must pass before any
branch is removed. On 2026-08-24 it passed for none of them, which is exactly why the cleanup
half of that pass deleted nothing.

## Suggested articles

[Controls that do not write to a file](unbound-controls.md).
