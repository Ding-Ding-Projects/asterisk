# Dashboard

## Behavior

Everything the PBX is doing right now. Numbers come from AMI, not from a config file, so nothing here is editable — it is the truth of the running system. It is backed by `live`. The rail badge on this destination currently reads `live`. It lives on the PBX rail, under the Telephony group: Endpoints, routing and everything a call touches while it is alive.

## Configuration

This screen has no editable controls. It is read-only telemetry, refreshed from the live AMI connection to Asterisk, and nothing on it is written back to a configuration file.

## Failure modes and security

Because the numbers come from AMI rather than a file, an unreachable manager connection means the dashboard shows its disconnected state honestly instead of the last good numbers.

## Verification

Confirm the screen goes to its disconnected state when AMI is unreachable and recovers without a manual refresh once it returns.

## Suggested articles

[Live channels](live.md), [Endpoints](endpoints.md), and [CDR & CEL](../data/cdr.md).
