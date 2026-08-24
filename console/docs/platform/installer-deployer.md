# Installer and deployment integrity

The desktop installer, update path, and server deployer use one explicit release identity and verify observable results before reporting success.

## Release identity

Release packaging receives a numeric semantic version and the exact 40-character candidate commit. The packaging script refuses a candidate that differs from the checked-out commit. It writes both values, plus the release tag when one exists, to `resources/update-manifest.json`. Local builds derive a deterministic version from the candidate commit count and keep the release tag empty, so they never claim to be published releases.

The supported desktop distribution remains unsigned Squirrel.Windows output. A complete set contains exactly one `Setup.exe`, exactly one `RELEASES`, at least one full `.nupkg`, and every delta `.nupkg` generated when a compatible prior package is available. `RELEASES` must reference every package that is published. Signing discovery and executable editing are disabled, and the icon URL is pinned to an immutable commit.

## Update integrity

The application considers only non-draft, non-prerelease releases that include an HTTPS `Setup.exe` and `SHA256SUMS.txt`. A downloaded installer is ready only when its byte count matches the release metadata and its SHA-256 matches the published entry. A missing digest is a failure, not an unchecked route to the ready state.

Manual and scheduled checks share one in-flight operation. Selecting Later does not relabel an already verified download as an available update or start another download. Restarting into an update quits the current process only after the operating system confirms the installer process started.

## Server deployment

The deployer transfers the compiled renderer, compiled server, resources, service installer, and service unit as one payload. An install script by itself is rejected as incomplete. Development lookup resolves the sibling `console` output, while packaged lookup resolves `server-payload` under the application's resource directory.

The service contract is `ding-pbx-console.service`, TCP port `8443`, and readiness path `/api/setup`. The installer checks that path locally after restarting the service and prints its success marker only after it receives valid readiness JSON. The deployer then observes the same path through the target address before returning the administration URL.

Temporary remote payload files are removed in a `finally` path. The interface also clears its running state in `finally`, including rejected IPC calls. A local managed VM is stopped before it is unregistered and its disks are deleted. An already stopped managed VM proceeds without issuing a redundant power-off command.

## Failure modes

- Missing renderer, server, resources, installer, service unit, release identity, digest, or required Squirrel artifact stops the operation with the missing item named.
- A changed SSH host key stops before any payload is copied.
- A service exit code or active state without a valid readiness response is not deployment success.
- Failure to start the downloaded installer leaves the current application running.
- Failure to stop the managed VM prevents removal.

## Security considerations

Code signing is permanently prohibited. The installer and update surfaces state that artifacts are unsigned. SSH continues to use the approved host and port inventory, persistent `known_hosts`, `StrictHostKeyChecking=accept-new`, and `UpdateHostKeys=no`; a recorded-key mismatch is never replaced automatically.

The deployed service listens on the target network so the deployer and the operator use the same address. Until first-run setup creates the administrator account, place the target only on a trusted management network or restrict port `8443` to the operator.

## Verification boundary

This change was prepared under the ultra-speed delivery mode, so no tests, builds, packaging runs, runtime deployments, or screen captures were executed in this lane. The next release build must verify the generated package version, candidate commit, unsigned executable state, Squirrel artifact set, packaged deployer resources, and live readiness observation from the installed target.

## Suggested articles

[Automatic updates](automatic-updates.md), [The Ding PBX installer ISO](../installer-iso.md), [In-context recovery](in-context-recovery.md), and [Security](../system/security.md).
