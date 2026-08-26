# Dialog emoji toggle

A persisted on/off switch controlling whether dialogs and message boxes show a decorative emoji alongside their factual text.

## Behavior

When enabled, each dialog and each message box carries one relevant, non-semantic emoji beside its heading. When disabled, the same copy appears with no emoji at all — not a blank space where one used to be, and not a reworded sentence. The wording is identical in both states, which is the property the whole feature rests on: an emoji that carried a fact would be a fact only some people can see, and it would disappear the moment somebody turned the switch off.

The switch never adds an emoji to a button, an action label, a field label, an accessible name, an option, or any other control text. A control is read aloud by its own text, so a decorative glyph sitting inside one is noise the listener cannot switch off from where they are.

## Configuration

One checkbox in settings, labelled **Show emojis in dialogs and message boxes**, controlling every dialog at once. It is off by default, so nobody who never touches it sees a change. The choice persists locally and is applied on load, so it survives a reload.

## Current status

**Desktop application:** Not implemented. No toggle exists and no dialog in the product currently carries an emoji.

**Documentation website:** Implemented, in `site/settings.html`, `site/app.js` and `site/styles.css`. The card is an APPEARANCE card holding the labelled checkbox (`#dialog-emojis`), a funny-level description and a live status line that says what the switch is currently doing and, when it is off, how many dialogs turning it on would decorate.

`DIALOG_EMOJI_DECORATIONS` in `site/app.js` names the decorated surfaces — the command palette, the regular-expression builder, the notification centre, the local history dialog, the reset-settings gate, and the inline dismissal alertdialog inside the notification centre — each with its own glyph. Message boxes (the toasts raised by `notify()`) get a single glyph, because a message box carries arbitrary text and choosing a glyph from that text would be inventing a meaning for it. Toasts already on screen change with the switch as well as the next one to arrive; a setting whose effect you have to wait for reads as broken.

`setDialogDecoration()` is the only function that writes a glyph, and it writes only into an element it created itself. That is what makes the boundary above checkable rather than merely promised: there is no second place where the "never in control text" rule would be enforced by nobody.

## Failure modes

- **A glyph entering an accessible name.** Every decorated dialog is `aria-labelledby` its own heading, so a decoration nested inside that heading would be read aloud on open. The decoration is inserted *beside* the heading, inside the heading bar rather than inside the `<h2>`, and carries `aria-hidden="true"` as well.
- **A glyph treated as copy.** The personal-vocabulary walker rewrites text from a per-node cache of the first text it saw. The decoration carries `data-no-vocab`, which excludes it outright — rather than relying on it being applied in a particular order that a later edit could quietly reverse.
- **A decoration left behind when the switch goes off.** Turning it off removes the element rather than emptying it. An emptied span still occupies the heading row and still reads as an element to anything walking the document, so "off" would not be off.
- **Decorations stacking.** Applying the setting repeatedly reuses the existing element rather than prepending another, so a page that re-applies its settings several times does not accumulate glyphs.
- **A page that does not carry a given dialog.** Only the settings page carries the reset gate and the history dialog; every page carries the palette. Absent surfaces are skipped rather than assumed, because one thrown error inside `applyState()` takes every other setting down with it.

## Accessibility and localization

The checkbox is a real `<input type="checkbox">` inside its own `<label>`, so it is keyboard-reachable and has a visible, clickable label rather than an `aria-label` nobody can see. The decoration itself is hidden from assistive technology. Nothing about the switch changes layout: the heading holds its own width whether or not a decoration is present, so turning it on adds a glyph and moves nothing else. The glyph is sized in `em`, so it tracks the text-size slider instead of standing still while everything around it grows.

The card description is localized through the site's own COPY table under `dialogEmojisDesc`: four English and four Cantonese variants at the four funny levels, and every one of the eight states both facts — that the wording is unchanged, and that no button, label or screen-reader name carries a glyph. A boundary stated at some settings and not others is a boundary nobody can rely on. The checkbox label, the card heading and the live status line are still fixed English.

## Verification

`console/site/tests/contracts/dialog-emojis.test.mjs` runs the real extracted source from `site/app.js` against a small recording DOM, rather than asserting patterns over it. That distinction matters here: "the value is stored", "the checkbox reflects it" and "the setting persists" are all true of a switch that never reaches a single pixel. The test covers both states, the removal, repeated application, an absent dialog, the accessible-name boundary, the `aria-hidden`/`data-no-vocab` attributes, and a full walk of the resulting tree asserting that no attribute and no control text anywhere contains an emoji. It also compares every string in the tree with the switch on against the same tree with it off, so any change in wording fails.

`console/scripts/negative-dialog-emojis-site.mjs` proves that test would notice if the feature stopped: it plants one break at a time, requires each to turn the contract test red, and requires the restored file to turn it green again. A break whose replacement changed no bytes is reported as a failed case rather than counted as a pass, because an edit that never landed reads exactly like a guard that held.

**Desktop application:** unverified — the feature does not exist there.

## Suggested articles

[Non-blocking notifications](non-blocking-notifications.md), [Funny levels](funny-levels.md), [Language modes](language-modes.md), [Accessibility](accessibility.md), [Platform feature index](README.md).
