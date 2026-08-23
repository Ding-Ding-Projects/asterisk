# Queues & agents

## Behavior

Ring strategy, penalties and service level, all lifted from queues.conf. Agents are dragged between queues on the canvas. It is backed by `queues.conf`. The rail badge on this destination currently reads `4`. It lives on the PBX rail, under the Telephony group: Endpoints, routing and everything a call touches while it is alive.

## Configuration

### Ring strategy

How a waiting call is offered to the members of this queue.

- **strategy** (`q_strategy`) — a select control, default `ringall`, choices `ringall`, `leastrecent`, `fewestcalls`, `random`, `rrmemory`, `linear`, `wrandom`. ringall rings every free agent at once. leastrecent picks whoever has gone longest without a call. Pick ringall if you are not sure.
  - *What it is:* How a waiting call is offered to the members of the queue.
  - *Why it exists:* It decides whether callers wait less or agents share work evenly. You cannot optimise both.
  - *Choosing a value:* ringall rings every free agent and answers fastest. leastrecent picks whoever has gone longest without a call. fewestcalls balances totals. rrmemory is round robin that remembers its place. linear follows the member order exactly.
  - *Gotcha:* ringall on a large queue rings a lot of phones for every call, which staff find exhausting. Above about eight agents, move to rrmemory or leastrecent.
- **Ring each agent for** (`q_timeout`) — a slider control, default `15`.
- **wrapuptime** (`q_wrapup`) — a slider control, default `15`. Breathing room after a call ends before that agent may be rung again.
  - *What it is:* How long after a call ends before this agent may be offered another.
  - *Why it exists:* Agents need to finish notes. Without it the next call lands mid-sentence.
  - *Choosing a value:* 15 to 30 seconds suits most support desks. 0 for a high-volume queue where notes are not taken.
  - *Gotcha:* It applies per member, not per queue, so an agent in three queues is unavailable in all of them during wrap-up.
- **Retry gap** (`q_retry`) — a slider control, default `5`.
- **ringinuse** (`q_ringinuse`) — a switch control, default `false`.
  - *What it is:* Whether members already on a call should still be rung.
  - *Why it exists:* Some phones can hold a second call; most staff cannot.
  - *Choosing a value:* no in almost every case.
  - *Gotcha:* Turning it on makes queue statistics misleading, because calls appear offered to people who could never have taken them.
- **autopause** (`q_autopause`) — a segmented control, default `no`, choices `no`, `yes`, `all`.

### Capacity & announcements

What callers hear and when the queue turns them away.

- **Maximum callers** (`q_maxlen`) — a stepper control, default `25`.
- **servicelevel** (`q_service`) — a slider control, default `60`.
  - *What it is:* The answer target used to calculate the service level percentage.
  - *Why it exists:* It is the number a manager reports on.
  - *Choosing a value:* 60 seconds is the industry convention.
  - *Gotcha:* Changing it rewrites the meaning of every historical report; the stored data is raw wait times, but the percentage is computed against whatever this says today.
- **joinempty** (`q_joinempty`) — a chips control, default `paused`, `invalid`, choices `paused`, `inuse`, `invalid`, `unavailable`, `ringing`.
  - *What it is:* Under which member states a caller is still allowed to enter the queue.
  - *Why it exists:* It stops callers waiting in a line nobody is standing behind.
  - *Choosing a value:* A list of states: paused, inuse, invalid, unavailable, ringing.
  - *Gotcha:* The semantics are inverted from what most people expect: these are the states that still count as "somebody is there".
- **leavewhenempty** (`q_leave`) — a chips control, default `inuse`, choices `paused`, `inuse`, `invalid`, `unavailable`, `ringing`.
- **Periodic announcement every** (`q_periodic`) — a slider control, default `60`.
- **Announce position in queue** (`q_position`) — a switch control, default `true`.

## Failure modes and security

Every row reflects a real object in queues.conf; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen. ringall on a large queue rings a lot of phones for every call, which staff find exhausting. Above about eight agents, move to rrmemory or leastrecent. It applies per member, not per queue, so an agent in three queues is unavailable in all of them during wrap-up. Turning it on makes queue statistics misleading, because calls appear offered to people who could never have taken them. Changing it rewrites the meaning of every historical report; the stored data is raw wait times, but the percentage is computed against whatever this says today.

## Verification

Exercise every control against its documented default and its full option range, confirm the write lands in queues.conf, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.

## Suggested articles

[Dialplan canvas](canvas.md), [IVR menus](ivr.md), and [Music on hold](../media/moh.md).
