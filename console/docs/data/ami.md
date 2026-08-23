# Manager & REST interfaces

## Behavior

Machine access to the PBX. Permissions are checkbox matrices, never a comma string you have to remember. It is backed by `manager.conf · ari.conf · http.conf`. The rail badge on this destination currently reads `2`. It lives on the Data rail, under the Records & APIs group: Call records, event logging and the machine interfaces.

## Configuration

### HTTP server

ARI and the built-in web sockets ride on this.

- **HTTP enabled** (`a_http`) — a switch control, default `true`.
- **Bind port** (`a_port`) — a stepper control, default `8088`.
- **TLS enabled** (`a_tls`) — a switch control, default `true`.
- **TLS port** (`a_tlsport`) — a stepper control, default `8089`.
- **Allowed origins** (`a_origin`) — a chips control, default `https://console.local`, choices `https://console.local`, `https://ops.example`, `*`.

### Manager permissions

Tick the classes this user may read or write.

- **Read classes** (`a_read`) — a chips control, default `system`, `call`, `log`, choices `system`, `call`, `log`, `verbose`, `command`, `agent`, `user`, `config`, `dtmf`, `reporting`, `cdr`, `dialplan`, `originate`, `message`.
  - *What it is:* Which classes of AMI events and commands this user may read.
  - *Why it exists:* AMI is full administrative access. Class-based permissions are the only granularity available.
  - *Choosing a value:* system, call, log, verbose, command, agent, user, config, dtmf, reporting, cdr, dialplan, originate, message.
  - *Gotcha:* The command class allows arbitrary CLI execution. Granting it is equivalent to granting a shell.
- **Write classes** (`a_write`) — a chips control, default `call`, choices `system`, `call`, `log`, `verbose`, `command`, `agent`, `user`, `config`, `originate`, `message`.
- **Deny by default** (`a_deny`) — a switch control, default `true`.
- **Idle timeout** (`a_timeout`) — a slider control, default `300`.

## Failure modes and security

Every row reflects a real object in manager.conf · ari.conf · http.conf; nothing is invented to fill the table. Rows can fail to load, fail to save, or drift from the running configuration, and each of those is a distinct state rather than a blank screen. The command class allows arbitrary CLI execution. Granting it is equivalent to granting a shell.

## Verification

Exercise every control against its documented default and its full option range, confirm the write lands in manager.conf · ari.conf · http.conf, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm rows reflect the current running configuration, that a destructive action on a row runs the full confirmation ceremony, and that a stale row is distinguishable from a missing one.

## Suggested articles

[CDR & CEL](cdr.md), [Security](../system/security.md), and [Secret intake](../agent/secrets.md).
