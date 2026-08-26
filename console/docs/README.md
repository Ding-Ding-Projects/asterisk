# Material Asterisk documentation

Material Asterisk is a Windows desktop administration experience for Asterisk. The renderer is compiled directly from the design's navigation model, so this documentation follows the same structure: six rails and 32 destinations, one article per destination, grouped and ordered exactly as the app presents them.

The documentation map contains 32 destinations in six rails. Every article covers behavior, configuration, failure modes and security, verification, and suggested reading.

## Rails

- [PBX](pbx/README.md) — Telephony: endpoints, routing and everything a call touches while it is alive.
- [Media](media/README.md) — Media & voice: codecs, RTP, recordings, prompts and conferencing.
- [Data](data/README.md) — Records & APIs: call records, event logging and the machine interfaces.
- [System](system/README.md) — Runtime & security: modules, logging, certificates and the CLI.
- [Agent](agent/README.md) — Agent global memory: memory, sync, skills, hub sessions and the emission guard.
- [App](app/README.md) — Deploy & application: stand up a new server, then appearance, updates and the console itself.

## Delivery

- [The Ding PBX installer ISO](installer-iso.md) — a bootable, unattended-install ISO that turns a bare machine into a working server.

## Shared behavior

Configuration controls are pickers, switches, sliders and steppers wired to real keys in the owning Asterisk configuration file — never free-text fields that could drift from what Asterisk actually does. Where an article shows a default value or an option list, it is the same default the design and the renderer ship with; nothing here is a simulated call, a sample statistic, or an invented extension. Destructive actions run the full confirmation ceremony described in [History & git](app/history.md) and [Arcade](app/arcade.md).
