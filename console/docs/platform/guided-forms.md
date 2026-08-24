# Guided forms

Fields populated from real data wherever possible, sensible defaults, plain-language inline validation, and named reasons on every disabled control.

## Behavior

Wherever a value can be enumerated or defaulted, the form is meant to do so — pickers over blank text boxes, a suggested default instead of an empty field, and inline validation that says what to type rather than only showing a red border.

## Configuration

Every disabled control would state, in its own tooltip or adjacent text, exactly which condition is unmet and how to satisfy it.

## Current status

**Desktop application:** Partial. The desktop application's server and deployment forms mix real pickers for some fields with free-text entry for others; validation messages exist for some fields but not consistently, and not every disabled control names its exact blocking condition.

**Documentation website:** Local equivalent implemented, runtime proof unverified. The converter uses a real target-format picker, bounded local source file picker, output-name field, and a genuine writable folder picker through `showDirectoryPicker` when the browser supports it. If the capability is unavailable or permission is refused, the surface explicitly falls back to browser downloads. It never labels a source upload picker as a destination.

## Failure modes

A field left blank or filled incorrectly is meant to be caught inline, in plain words, before submission is attempted. The converter keeps its adapter catalog honest, limits output names, reports folder-picker capability and permission failures, and leaves source files untouched.

## Accessibility and localization

This feature is expected to follow the product's standing accessibility contract: keyboard reachability, visible focus, correct roles and names, and respect for a reduced-motion preference. There are no automated tests covering the desktop application's generic feature surface at this time, so none of that is independently verified for this feature yet. Copy for this feature is expected to be available in every supported language mode once language modes exist; today all copy is fixed English.

## Verification

This delegated source-only lane did not run tests, builds, browser checks, or captures. The site registry remains `implemented-unverified` for this local equivalent. The desktop application row remains partial.

## Suggested articles

[Destructive-action super confirmation](destructive-action-confirmation.md), [Platform feature index](README.md).
