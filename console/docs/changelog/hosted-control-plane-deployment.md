# Hosted control-plane deployment record

## Current change

Added a reproducible hosted control-plane image and Compose contract under `deployer/deployment/`. The image records the exact source commit and version, runs as a bounded non-root user, exposes port `8088`, uses a persistent data volume, and provides a healthcheck. TLS files are external Docker secrets. A read-only WSL, Docker, and approved-host inventory command reports capacity, architecture, and existing workloads without mutating them. A plan-only rollback script preserves the data volume.

The desktop control plane now rejects a bundled WSL runtime when its provenance schema, source commit shape, runtime identifier, base-image digest, or recorded byte count does not match the packaged rootfs. The hosted health route is `/api/v1/health`.

## Verification

Implementation records are present. Docker build, WSL import, hosted deployment, private-host inventory, installer execution, runtime interaction, and captures were not run in this change.

## Suggested articles

[Hosted control-plane deployment](../platform/hosted-control-plane-deployment.md), [In-context recovery](../platform/in-context-recovery.md), and [Installer ISO](../installer-iso.md).
