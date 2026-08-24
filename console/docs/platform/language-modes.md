# Language modes

The desktop console offers English, playful Hong Kong Cantonese, and a bilingual view of its own user-facing copy.

## Behavior

The `Language` control stores `en`, `yue`, or `both`. The localized element factory applies the selected mode to visible text and accessible names, and the personal-vocabulary boundary runs after localization. Bilingual mode keeps English first and appends Cantonese with a compact separator.

## Configuration

The choice is persisted in the durable settings store and applies to every rendered screen. Missing translations keep the English source string. Dynamic toast and dialog copy is listed in `console/app/renderer/src/event-copy-inventory.ts`, where each exact call-site key and template placeholder explicitly records a localized entry or an intentional plain-English fallback. `verify:event-copy` fails on an unlisted static call. Technical identifiers, values and paths are not translated.

## Current status

**Desktop application:** Implemented in the compiled renderer. The control is mounted in `Customise everything` and the generated design tree routes through the localization boundary.

**Documentation website:** Partial. The site has its own settings copy table and remains independent from the desktop renderer.

## Failure modes

An invalid stored mode fails closed to English. A missing Cantonese entry never produces an empty label or a dangling bilingual separator.

## Accessibility and localization

The language control is a generated Material Design control and its accessible names pass through the same boundary as visible text. All three modes preserve control values and technical data exactly.

## Verification

The implementation is covered by the renderer text-boundary and contract suites. Built-artifact interaction and capture evidence remain tracked in the per-surface inventory.

## Suggested articles

[Funny-level sliders](funny-levels.md), [School mode](school-mode.md), [Customise everything](../app/customise.md), [Platform feature index](README.md).
