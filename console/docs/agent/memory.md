# Memory console

## Behavior

Search the memory corpus with a visual regex builder, and watch the sync, attestation and emission guard state alongside it. It is backed by `agent global memory`. The rail badge on this destination currently reads `2.4k`. It lives on the Agent rail, under the Agent global memory group: Memory, sync, skills, hub sessions and the emission guard.

## What this screen reads

Nothing, and that is a fact about this console rather than about any phone system. It keeps no agent-memory corpus, so there is no store behind this screen to search, sync or attest, and the records list and the three panels beside it stay empty rather than showing invented entries.

This screen used to say "No target is connected" when nothing had been discovered. That was true, irrelevant, and read as a promise: find a phone system and this will fill in. It will not — nothing on this rail reads a target at all — so it now names the store it has not got instead.

## Configuration

There is no settings form here. A visual regex builder searches the memory corpus directly, and the sync, attestation and emission-guard state are shown alongside it for context.

## Failure modes and security

A failed attestation on the most recent sync blocks further writes until it is acknowledged on the Sync & attestation screen.

## Verification

Confirm every default shown here matches what a fresh install actually ships, and that changing a value here is reflected the next time this screen loads.

## Suggested articles

[Sync & attestation](sync.md), [Vocabulary & guard](vocab.md), and [Status hub](hub.md).
