# Deploy a server

## Behavior

This is the main road: press the big button and a working PBX exists in about seven seconds. Connecting to a PBX somebody else built is underneath, and it is the side road. It is backed by `provisioning`. The rail badge on this destination currently reads `3`. It lives on the App rail, under the Deploy & application group: Stand up a new server, then appearance, updates and the console itself.

## Configuration

### Route

How this console reaches Asterisk. Everything below reshapes itself around this answer.

- **Connection type** (`sv_kind`) — a segmented control, default `Local`, choices `Local`, `Local Docker`, `SSH`, `SSH Docker`. Local is the same machine. Local Docker is a container here. SSH is another machine. SSH Docker is a container on another machine, reached over SSH and then into the container.
  - *What it is:* How this console reaches Asterisk: locally, into a container, over SSH, or over SSH and then into a container.
  - *Why it exists:* Everything else on the screen reshapes around this answer, including how configuration files are written.
  - *Choosing a value:* Local for the same machine, Local Docker for a container here, SSH for another machine, SSH Docker for a container elsewhere.
  - *Gotcha:* Over SSH the manager port is forwarded through the tunnel, so it never crosses the network unprotected — but only if tunnel forwarding stays enabled.
- **Host** (`sv_host`) — a select control, default `pbx-hq.internal`, choices `localhost`, `pbx-hq.internal`, `pbx-branch.internal`, `10.20.4.10`.
- **Container** (`sv_container`) — a select control, default `asterisk-prod`, choices `asterisk-prod`, `asterisk-lab`, `asterisk-edge`.
- **SSH user** (`sv_user`) — a select control, default `asterisk-ops`, choices `asterisk-ops`, `root`, `deploy`.
- **SSH port** (`sv_sshport`) — a stepper control, default `22`.
- **Strict host key checking** (`sv_hostkey`) — a switch control, default `true`. On means a changed host key aborts the connection instead of asking you to accept it. That prompt is how people get compromised.
  - *What it is:* Whether a changed SSH host key aborts the connection.
  - *Why it exists:* A changed host key means either a rebuild or an interception. Only one of those is benign.
  - *Choosing a value:* On, always.
  - *Gotcha:* The prompt asking a human to accept a new key is precisely how these attacks succeed. This console refuses instead of asking.

### Manager interface

AMI for live events and CLI, ARI for Stasis applications.

- **Interface** (`sv_iface`) — a segmented control, default `AMI`, choices `AMI`, `ARI`, `Both`.
- **Manager port** (`sv_amiport`) — a stepper control, default `5038`.
- **TLS** (`sv_tls`) — a switch control, default `true`.
- **Forward through the SSH tunnel** (`sv_forward`) — a switch control, default `true`.
- **Reconnect automatically** (`sv_watch`) — a switch control, default `true`.
- **Open read-only** (`sv_readonly`) — a switch control, default `false`.

## Failure modes and security

Every control here maps to a real key in provisioning; an unreachable configuration store is shown as unreachable, never backfilled with placeholder values. Over SSH the manager port is forwarded through the tunnel, so it never crosses the network unprotected — but only if tunnel forwarding stays enabled. The prompt asking a human to accept a new key is precisely how these attacks succeed. This console refuses instead of asking.

## Verification

Exercise every control against its documented default and its full option range, confirm the write lands in provisioning, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm every default shown here matches what a fresh install actually ships, and that changing a value here is reflected the next time this screen loads.

## Suggested articles

[Security](../system/security.md), [AMI & ARI](../data/ami.md), and [Operations](../agent/ops.md).
