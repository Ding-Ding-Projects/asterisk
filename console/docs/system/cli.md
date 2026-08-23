# CLI builder

## Behavior

Build a real Asterisk CLI command by choosing its parts. The raw console beside it is read-only output, shown only in expert mode. It is backed by `asterisk -rx`. It lives on the System rail, under the Runtime & security group: Modules, logging, certificates and the CLI.

## Configuration

There is no settings form here. Commands are assembled from pickers that mirror the real `asterisk -rx` command grammar, so what you build is exactly what will run, never free text.

## Failure modes and security

A command built from invalid picker combinations is rejected before it reaches Asterisk, rather than sent and left to fail on the far side.

## Verification

Confirm every picker combination produces the exact command that would be typed by hand, and that the raw console only appears in expert mode.

## Suggested articles

[Modules](modules.md), [Logger](logger.md), and [Security](security.md).
