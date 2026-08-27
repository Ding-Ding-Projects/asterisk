# Lifecycle and configuration integrity

The desktop console keeps server selection, configuration writes, and Asterisk daemon actions tied to one explicit target. It does not treat discovery, persistence, process launch, or an accepted CLI command as proof that a connection or lifecycle transition succeeded.

## Behavior

- The saved server inventory uses a versioned schema and validates every record before it can become a target.
- A missing inventory is an empty first-run state. Unreadable or malformed inventory data is a blocking error and is never overwritten by a later add, edit, remove, or selection.
- Connection kinds use the control-plane contract names: `wsl`, `localDocker`, `remoteLinux`, and `remoteDocker`.
- WSL connection success requires both a valid operating-system observation and a valid Asterisk daemon identity from the exact selected distribution.
- Docker and remote routes may be saved with their required routing fields, but daemon and configuration operations refuse them until their target-specific transports are implemented.
- Start and restart succeed only after the selected daemon returns a valid identity. Stop succeeds only after an independent process check proves that Asterisk is no longer running.
- Configuration reads return an explicit `present` or `absent` state. Read errors never become empty documents.
- Existing secret values cross the renderer boundary only as hidden, non-writable references. The privileged transport resolves those references against the current target while staging, then verifies the exact post-write file without returning raw secret bytes.
- Every staged configuration file has a unique handle and retains the live file's numeric uid, gid, and mode. When the target is absent, a new file starts with the documented restrictive `root:root` and `0600` metadata. Apply renames the staged file, reapplies the retained metadata through fixed argument lists, then independently stats the live file before reporting success.
- Backup and rollback retain and reapply backup metadata, with an independent post-rollback stat. If a metadata step fails after the rename, the transport restores the bound backup before returning the failure.
- A transaction is bound to its target id, verifies each applied file, reloads the affected Asterisk subsystem, and verifies the selected running daemon before reporting success.
- The onboarding flow creates the endpoint, authentication, and AoR sections together. Endpoint create, save, and delete require a successful live `pjsip.conf` read and invalidate the displayed reading after a verified write.

## Configuration

The server inventory accepts only fields belonging to its selected connection kind. WSL records require a discovered distribution. Local container records require a project. Remote records require an exact host, user, and valid port, while remote container records also require a project.

Configuration resources remain restricted to exact files below `/etc/asterisk`. Composite screen labels are split into individually allowlisted files and are accepted only when every component is a valid configuration filename. A partial multi-file read is reported as unavailable instead of combining old and new observations.

## Failure modes

- An unreadable inventory remains untouched and the server list reports the read reason.
- A target changed after planning causes the write to be refused and reviewed again.
- A missing configuration file is reported as absent. A failed, oversized, timed-out, malformed, or partial read is unavailable and cannot seed a write.
- A hidden value whose original field disappeared is refused rather than replaced with a marker.
- A reload or runtime verification failure triggers reverse-order file rollback and reloads the restored resources. If that recovery cannot be verified, the transaction remains failed and does not claim a safe rollback.
- A stopped-daemon probe that cannot prove process absence is reported as unresponsive or unknown, never stopped.
- Unsupported Docker and remote target transports remain visible as saved profiles with an exact refusal reason. They are not silently rerouted through WSL.

## Security considerations

Raw configuration bytes are read only inside the privileged control plane through fixed `wsl.exe` arguments, with bounded output and time. They are not logged, returned to the renderer, placed in command arguments, or persisted in the server inventory. Writable configuration documents are structurally validated before rendering, target resources are exact-allowlisted, and unique staging paths prevent two writes from sharing a predictable temporary file. Staged metadata is retained only against the generated handle and is cleared on validation or apply failure. The fixed `mv`, `chown`, `chmod`, and `stat` sequence has no shell concatenation, and metadata mismatches fail closed.

Packaged-runtime provenance and base-image metadata use explicit schemas. Base-image URLs require HTTPS and an approved Ubuntu image host, with no embedded credentials. Renderer responses omit packaged filesystem paths.

The hosted HTTP layer must still enforce its own request-origin policy before dispatch. The dispatcher validates request shape and action membership, but it does not receive the browser request origin and therefore cannot replace the host's origin check.

## Verification

This change was implemented under an ultra-speed boundary that prohibited tests, lint, type checks, builds, packaging, UI interaction, and captures. Verification in this task is limited to source and diff inspection. Runtime behavior, compilation, interaction reachability, and rollback behavior remain unverified until the owning integration task runs the applicable local checks and exercises the built desktop artifact.

## Suggested articles

- [Deploy a server](servers.md)
- [History and Git](history.md)
- [Security](../system/security.md)
