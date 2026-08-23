# Dialplan canvas

## Behavior

One infinite canvas for the live dialplan, IVR and queue routing graph. Nodes and edges are parsed from the target's `dialplan show` output, and the layout can be moved locally for inspection. The inspector is read-only because this surface has no dialplan write path. The rail badge on this destination is empty until a live graph is read. It lives on the PBX rail, under the Telephony group: Endpoints, routing and everything a call touches while it is alive.

## Configuration

There is no settings form here. Adding, deleting, duplicating, or rewiring a node reports that the canvas is read-only rather than claiming a write occurred. An unread or unavailable target produces an empty canvas with the control-plane reason.

## Failure modes and security

A node that references a destination that no longer exists is omitted by the parser and the source reading reports the exact parse or target failure. Local layout changes never alter the target.

## Verification

Confirm the graph contains only nodes and edges from a successful live reading, that local dragging changes layout only, and that every attempted write action reports the read-only boundary without changing the target.

## Suggested articles

[IVR menus](ivr.md), [Queues & agents](queues.md), and [Endpoints](endpoints.md).
