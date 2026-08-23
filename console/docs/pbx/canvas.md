# Dialplan canvas

## Behavior

One infinite canvas for dialplan, IVR and queue routing. Drop a step, wire it to the next, and the console writes the priorities for you. The inspector on the right edits whichever step is selected. It is backed by `extensions.conf`. The rail badge on this destination currently reads `∞`. It lives on the PBX rail, under the Telephony group: Endpoints, routing and everything a call touches while it is alive.

## Configuration

There is no settings form here. Every node dropped on the canvas becomes a step in extensions.conf, wired to the next node with a connector; the console generates the dialplan priorities so nothing needs to be numbered by hand.

## Failure modes and security

A node that references a destination that no longer exists is flagged on the canvas rather than silently dropped from extensions.conf.

## Verification

Confirm dragging, connecting and deleting a node updates extensions.conf correctly, and that an orphaned reference is surfaced rather than silently dropped.

## Suggested articles

[IVR menus](ivr.md), [Queues & agents](queues.md), and [Endpoints](endpoints.md).
