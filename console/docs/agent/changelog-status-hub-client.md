# Changelog fragment: Status Hub client

## Unreleased

- Added a typed Status Hub client and external store for project registration, observed sessions, reply inbox polling, and question delivery receipts.
- Added HTTPS or explicit loopback transport validation, redirect refusal, bounded response parsing, request deadlines, generation cancellation, and honest unavailable/offline/authentication/refused/stale/partial states.
- Added a standalone renderer surface that displays only server-observed project and session evidence. It does not invent rows or report delivery until a server receipt exists.

Verification for this fragment: no tests, builds, lint, network requests, runtime interaction, or capture workflows were run in this implementation lane.
