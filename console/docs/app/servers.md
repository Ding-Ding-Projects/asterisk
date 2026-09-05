# Deploy a server

## Behavior

This screen discovers local targets, verifies the selected target through the control plane, and keeps the configured server list in the installation's local inventory. Discovery alone is not treated as a connection: the desktop calls `server.connect`, starts the managed daemon when needed, and retries the verification once. The rail badge is empty until a real server row exists. It lives on the App rail, under the Deploy & application group: stand up a new server, then appearance, updates and the console itself.

## Configuration

### Route

How this console reaches Asterisk. Everything below reshapes itself around this answer. The selected local target is read from the real discovery result rather than from the design's example names.

- **Connection type** (`sv_kind`) — a segmented control, default `Local`, choices `Local`, `Local Docker`, `SSH`, `SSH Docker`. Local is the same machine. Local Docker is a container here. SSH is another machine. SSH Docker is a container on another machine, reached over SSH and then into the container.
  - *What it is:* How this console reaches Asterisk: locally, into a container, over SSH, or over SSH and then into a container.
  - *Why it exists:* Everything else on the screen reshapes around this answer, including how configuration files are written.
  - *Choosing a value:* Local for the same machine, Local Docker for a container here, SSH for another machine, SSH Docker for a container elsewhere.
  - *Gotcha:* Over SSH the manager port is forwarded through the tunnel, so it never crosses the network unprotected — but only if tunnel forwarding stays enabled.
- **Host** (`sv_host`) — the host value supplied to the local inventory. It starts empty until the user supplies a target.
- **Container** (`sv_container`) — the container context supplied to the local inventory when a container route is selected.
- **SSH user** (`sv_user`) — the user supplied to the local inventory for an SSH route.
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

The server list is an honest local inventory. A discovered target is not labelled connected until `server.connect` confirms it. If the control plane cannot answer, the row retains the exact unavailable reason and the dashboard retries failed readings on its one-second refresh cadence. Over SSH the manager port is forwarded through the tunnel, so it never crosses the network unprotected — but only if tunnel forwarding stays enabled. The prompt asking a human to accept a new key is precisely how these attacks succeed. This console refuses instead of asking.

- The dashboard reports `asterisk: command not found` on a machine that has the managed distribution → discovery is connecting to a different distribution. The console prefers `ding-pbx-console` whenever `wsl --list` includes it; if it still connects elsewhere, the runtime status did not report the managed name.
- The wizard says the runtime cannot be created and mentions a missing base image → the packaged runtime provenance was rejected. The control plane accepts the schema version the generator writes (currently 2); a mismatch reports the whole payload as unavailable.
- Asterisk starts and immediately dies with `Illegal instruction` although `asterisk -V` answers → the runtime was compiled for the build machine's CPU. The runtime image disables menuselect's `BUILD_NATIVE`; a rootfs built without that disable only runs on CPUs with the builder's instruction set.
- Docker containers labelled `io.ding.pbx.project=ding-pbx-console` are discovered and readable through `docker exec`, but the console cannot deploy to or write into a container; only the `wsl` kind connects.

## Verification

Exercise discovery with no target, discovery with a target whose daemon is stopped, a successful `server.connect`, and a refused connection. Confirm no row is labelled connected before the control-plane response, and that a failed dashboard read retries without relaunching the app.

## Suggested articles

[Security](../system/security.md), [AMI & ARI](../data/ami.md), and [Operations](../agent/ops.md).
