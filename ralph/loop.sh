#!/usr/bin/env bash
# Ralph: run one agent per roadmap item, repeatedly, until the roadmap is clear.
#
# POSIX sibling of loop.ps1, with identical semantics. Windows is this project's
# delivery target, so loop.ps1 is the primary runner; this exists so the loop is not
# hostage to one shell.
#
# Each iteration starts an agent with no memory of the last one. State lives in
# ROADMAP.md, not in context, which is why the tick matters more than anything the
# agent says about itself.
#
# Stops for exactly three reasons, and reports which:
#   * ralph/STOP exists         -- the brake, checked before every iteration
#   * no unchecked items remain -- the roadmap is clear, exit 0
#   * --max reached             -- only when a cap was asked for
#
# Usage:
#   ralph/loop.sh                 # uncapped; STOP file is the brake
#   ralph/loop.sh --max 5
#   ralph/loop.sh --dry-run
#   touch ralph/STOP              # halts before the next iteration

set -uo pipefail

MAX=0
DRY_RUN=0
# Generous rather than tight. A real roadmap item can legitimately take half an hour --
# lanes in this repository have run 20 to 35 minutes and been perfectly healthy -- so this
# is a backstop against a stall, not a performance budget. Killing a working agent to
# enforce a deadline would cost far more than the stall it prevents.
AGENT_TIMEOUT="${RALPH_AGENT_TIMEOUT:-90m}"
while [ $# -gt 0 ]; do
  case "$1" in
    --max)     MAX="${2:?--max needs a number}"; shift 2 ;;
    --timeout) AGENT_TIMEOUT="${2:?--timeout needs a duration, e.g. 45m}"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) sed -n '2,25p' "$0"; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

RALPH_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$RALPH_ROOT/.." && pwd)"
ROADMAP="$REPO_ROOT/ROADMAP.md"
STOP_FILE="$RALPH_ROOT/STOP"
PROMPT_FILE="$RALPH_ROOT/PROMPT.md"
LOG_DIR="$RALPH_ROOT/logs"

for required in "$ROADMAP" "$PROMPT_FILE"; do
  [ -f "$required" ] || { echo "Ralph cannot start: $required is missing." >&2; exit 1; }
done
mkdir -p "$LOG_DIR"

# Count only real unchecked checkboxes at the start of a line, never the characters
# "[ ]" appearing inside prose somewhere in the file.
open_count() { grep -cE '^[[:space:]]*-[[:space:]]\[[[:space:]]\][[:space:]]' "$ROADMAP" || true; }
first_open() { grep -E  '^[[:space:]]*-[[:space:]]\[[[:space:]]\][[:space:]]' "$ROADMAP" | head -1 | sed -E 's/^[[:space:]]*-[[:space:]]\[[[:space:]]\][[:space:]]//'; }

AGENT=""
if [ "$DRY_RUN" -eq 0 ]; then
  # Resolved at run time rather than hard-coded, so a rename upstream is a clear error
  # here instead of a confusing failure three layers down.
  AGENT="$(command -v claude || true)"
  [ -n "$AGENT" ] || { echo "Ralph cannot start: no 'claude' command on PATH." >&2; exit 1; }
fi

printf '\nRalph\n'
printf '  repository : %s\n' "$REPO_ROOT"
printf '  roadmap    : %s item(s) still open\n' "$(open_count)"
if [ "$MAX" -gt 0 ]; then printf '  cap        : %s iteration(s)\n' "$MAX"
else                      printf '  cap        : uncapped -- STOP file is the brake\n'; fi
printf '  agent      : %s\n' "${AGENT:-(dry run -- no agent resolved)}"
printf '  stop with  : touch %s\n\n' "$STOP_FILE"

iteration=0
while :; do

  if [ -e "$STOP_FILE" ]; then
    echo "STOP file present. Halting before iteration $((iteration + 1))."
    exit 0
  fi

  open="$(open_count)"
  if [ "$open" -eq 0 ]; then
    echo "ROADMAP.md has no unchecked items left. Ralph is done."
    exit 0
  fi

  if [ "$MAX" -gt 0 ] && [ "$iteration" -ge "$MAX" ]; then
    echo "Reached the --max cap of $MAX with $open item(s) still open."
    exit 0
  fi

  iteration=$((iteration + 1))
  stamp="$(date -u +%Y%m%d-%H%M%S)"
  log="$LOG_DIR/iteration-$(printf '%04d' "$iteration")-$stamp.log"

  printf -- '--- iteration %s | %s open | %s\n' "$iteration" "$open" "$stamp"
  printf '    next: %.96s\n' "$(first_open)"

  if [ "$DRY_RUN" -eq 1 ]; then
    printf '    (dry run -- not invoking the agent)\n\n'
    # A dry run that looped forever on an unchanging roadmap would be a trap of its
    # own, so it walks one iteration and stops.
    exit 0
  fi

  # Reconcile before handing over, so the agent never starts from a stale base and
  # never has to guess whether it is behind. Non-destructive by construction: a
  # fast-forward or nothing.
  ( cd "$REPO_ROOT" && git fetch origin --quiet && git merge --ff-only origin/master >/dev/null 2>&1 ) || true

  before="$(open_count)"

  # The agent runs headless, so it gets no interactive permission prompt: without an
  # explicit tool allowlist every iteration reads the roadmap, explains what it would do,
  # and stops having changed nothing. That is exactly what the first run of this loop did,
  # and the only reason it was noticed is the ticked-nothing line below.
  #
  # An allowlist rather than --dangerously-skip-permissions: the loop is uncapped, so the
  # tool surface stays bounded even though PROMPT.md's prohibitions are what actually
  # govern behaviour. Verified before shipping -- with the allowlist a probe agent wrote a
  # file; without it, nothing.
  # Bounded, and NOT through a pipe. Both halves of that matter, and the second is the
  # one that actually bit.
  #
  # Observed 2026-08-25: iteration 7 sat for 48 minutes having written zero bytes, while
  # the loop looked perfectly healthy from outside -- a live shell, a live `tee`, a log
  # file with a plausible name. The agent process itself was already gone. What was still
  # alive was `tee`, holding the read end of a pipe whose write end an orphaned descendant
  # of the agent had inherited and never closed, so EOF never arrived and the pipeline
  # never completed. Killing `tee` did not release it either; the loop had to be killed.
  #
  # So the redirect goes straight to the file. There is no `tee` left to wait on an EOF
  # that is never coming, and an orphan holding the descriptor keeps a file open rather
  # than stalling the loop. The live-output convenience is not worth a silent stall: the
  # loop prints its own per-iteration progress, and the log is on disk either way.
  #
  # `timeout` bounds the agent itself, with a follow-up signal for one that ignores the
  # first. An uncapped loop calling an uncapped command can hang all night and the only
  # visible symptom is a count that stops moving, which is exactly what happened.
  ( cd "$REPO_ROOT" && timeout --kill-after=60s "$AGENT_TIMEOUT" \
      "$AGENT" -p --allowedTools "Bash,Read,Write,Edit,Glob,Grep,NotebookEdit" < "$PROMPT_FILE" ) > "$log" 2>&1
  agent_exit=$?
  echo "EXIT=$agent_exit" >> "$log"
  # 124 is timeout's own "it did not finish in time". Say so plainly rather than letting
  # it read as an ordinary agent failure, because the two need different responses.
  if [ "$agent_exit" -eq 124 ] || [ "$agent_exit" -eq 137 ]; then
    printf '    the agent hit the %s timeout and was stopped; see %s\n' "$AGENT_TIMEOUT" "$log"
  fi

  after="$(open_count)"
  if [ "$after" -ge "$before" ]; then
    # Not fatal -- an iteration may legitimately record a blocker rather than tick
    # anything. But say it out loud, because a loop that never reduces the count is a
    # loop burning money on a task it cannot finish, and silence is how that runs all
    # night.
    printf '    no item was ticked this iteration (%s still open). See %s\n\n' "$before" "$log"
  else
    printf '    ticked %s item(s); %s remaining\n\n' "$((before - after))" "$after"
  fi
done
