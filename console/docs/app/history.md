# History

## Behavior

Every control you touch commits to a local git repository the moment you touch it. This screen is the full history: the commit graph, the exact diff, blame per option, branches for trying things out, and a restore that runs the four gates. It is backed by `/etc/asterisk/.git`. It lives on the App rail, under the Deploy & application group: Stand up a new server, then appearance, updates and the console itself.

## Configuration

### Commit behaviour

What happens on every single change.

- **Commit on every change** (`hi_commit`) — a switch control, default `true`. On means each toggle, slider and picker writes a real git commit against the configuration directory. Off batches changes until you commit by hand — which is how people lose track of what they changed.
  - *What it is:* Whether every individual control change writes a git commit immediately.
  - *Why it exists:* It gives you an exact, attributable history and a one-click revert of any single change.
  - *Choosing a value:* On is strongly recommended.
  - *Gotcha:* Off batches changes until you commit manually, which in practice means nobody remembers what changed between two working states.
- **Commit message style** (`hi_msg`) — a segmented control, default `Descriptive`, choices `Terse`, `Descriptive`, `Conventional`.
- **Attribute commits to** (`hi_author`) — a segmented control, default `Signed-in user`, choices `Signed-in user`, `Console`, `Both`.
- **Sign commits** (`hi_sign`) — a switch control, default `false`.
- **Mirror to a remote** (`hi_push`) — a switch control, default `false`.
- **Run asterisk config validation as a pre-commit hook** (`hi_hook`) — a switch control, default `true`.

### Retention & safety

How much history is kept and what a restore does.

- **Keep commits** (`hi_keep`) — a stepper control, default `500`.
- **Garbage collect monthly** (`hi_gc`) — a switch control, default `true`.
- **Show a diff before restoring** (`hi_diff`) — a switch control, default `true`.
- **Restore onto a new branch instead of main** (`hi_branch`) — a switch control, default `true`.
- **Reload Asterisk after a restore** (`hi_reload`) — a switch control, default `true`.

## Failure modes and security

Every control here maps to a real key in /etc/asterisk/.git; an unreachable configuration store is shown as unreachable, never backfilled with placeholder values. Off batches changes until you commit manually, which in practice means nobody remembers what changed between two working states.

## Verification

Exercise every control against its documented default and its full option range, confirm the write lands in /etc/asterisk/.git, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm every default shown here matches what a fresh install actually ships, and that changing a value here is reflected the next time this screen loads.

## Suggested articles

[Deploy & servers](servers.md), [Security](../system/security.md), and [Arcade](arcade.md).
