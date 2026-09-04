# Evidence

Every other documentation category explains what a surface is meant to do. This one explains how a
claim about it was actually established — what was run, against which artifact, and what the result
would look like if it were false.

The distinction matters here more than it sounds. A parser tested against a fixture built from a
format string proves the parser matches what the source says the program prints; it does not prove
the program printed it. A component test that injects its own host proves the screen; it says
nothing about the wiring it stubbed. Each article below closes one of those gaps, and each names the
harness that reproduces it and the guard that refuses a stale or borrowed result.

Every category has an index. This one was missing, and this file is it.

## Articles

- [Automatic update evidence](automatic-updates.md) — what the updater was observed doing, and
  which of its states were reached rather than reasoned about.
- [The chrome-parity bar](design-parity-chrome-bar.md) — the reference-versus-built comparison a
  destination in this project can actually meet, and why the mask is declared rather than
  discovered.
- [The Material Design 3 conformance audit](design-parity-material-audit.md) — how each audited
  destination's primitives were checked against the real component anatomy.
- [Every reading, run against a live Asterisk](live-readings.md) — the readings taken from a
  running exchange rather than from a fixture built out of this checkout's own C sources.
- [The documentation website, driven rather than described](pages-site-interaction.md) — the
  headless drive that produced the site's built-interaction records and captures, and the ten
  feature rows it closed.
- [Where the mode picker's half pixel enters](statuscell-text-pixels.md) — a measurement of the
  built artifact settling a question the stylesheet could not answer.

## Related

- [Captures](../captures/) — the pictures these articles refer to, and how they are taken.
- [Platform features](../platform/) — what each feature is meant to do, per surface.
