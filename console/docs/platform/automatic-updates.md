# Automatic updates

The desktop updater checks the published release feed over HTTPS, validates one complete release identity, downloads the matching unsigned `Setup.exe`, checks its declared size and SHA-256 digest, and stages it for a user-directed restart.

## Behavior

Published releases use a monotonic semantic version, beginning above `0.1.0`, and one immutable identity record. A usable release carries exactly one `Setup.exe`, one `RELEASES`, at least one full `.nupkg`, `SHA256SUMS.txt`, and `release-identity.json`. The identity records the package version, candidate commit, release tag, artifact names, sizes, and SHA-256 values. A release is ignored when any record is missing, malformed, unpublished, or inconsistent.

The installed version comes from the packaged `update-manifest.json`. A release is offered only when its package version is strictly newer. Local unpublished builds remain identifiable by their candidate commit and are never treated as published releases.

The desktop checks once at startup and on a bounded schedule. Only one check or download may be in flight. Metadata, identity, checksum text, and installer streams have finite response and per-read deadlines and bounded sizes. Temporary installer directories are owned by the updater, removed after every failed or superseded operation, and swept when the desktop starts.

## Restart and drafts

The ready banner is non-blocking and offers `Restart to install update` and `Later`. `Later` hides the banner without deleting the staged installer. A manual check or the next scheduled check may reveal the preserved ready state again. Restart uses an invoke-based acknowledgement. The main process has one installing latch, launches `Setup.exe` at most once, and quits only after the operating system acknowledges process spawn. A spawn failure stays visible and retryable.

PBX drafts disable restart. The banner states the exact recovery route: review the draft, apply it, or discard it, then retry the restart. The updater never drops a draft to make installation convenient.

## Configuration and safety

Code signing is permanently prohibited. The package and update feed are intentionally unsigned, so the operating system may show an unknown-publisher or SmartScreen warning. Digest checking proves byte integrity only and never claims authenticity or signing.

## Failure modes

Malformed packaged identity, an older or equal package version, incomplete release assets, missing checksum lines, inconsistent artifact sizes or digests, response-header timeout, stream-read timeout, bounded-size overflow, temporary-file failure, and installer-spawn failure remain visible as retryable updater states. A failed or superseded download is removed from its updater-owned temporary directory.

## Accessibility and localization

The banner is a keyboard-operable, screen-reader-named non-blocking status surface with visible focus, a pending state, a disabled restart control while drafts exist, and explicit retry copy after spawn failure. It avoids claiming that a download is running while a staged installer is merely ready. The product's language and localization surfaces own the final copy.

## Verification boundary

This lane intentionally did not run tests, lint, type checks, builds, packaging, desktop launch, UI interaction, or screen captures. The final handoff records the exact packaged regression seam that still needs the cheap Lowlevel headless route: a packaged Windows build with a valid unpublished manifest, a complete newer release identity, a mismatched digest, a malformed manifest, a preserved `Later` state, a duplicate restart activation, a spawn failure, and a PBX draft count above zero.

## Suggested articles

[In-context recovery](in-context-recovery.md), [Non-blocking notifications](non-blocking-notifications.md), [App display name](app-display-name.md), [Platform feature index](README.md).
