# Right-click menus show keyboard shortcuts

Every context-menu item that has a keyboard shortcut displays it, right-aligned, in the platform's own notation.

## Behavior

A context menu is meant to show each item's real, currently-working keyboard shortcut beside its label, derived from the same source that registers the binding, never a guessed or stale one.

## Configuration

Shortcuts are exposed to assistive technology as shortcuts, not as decorative trailing text.

## Current status

**Desktop application:** Not implemented. The desktop application's right-click menus, where they exist, do not display keyboard shortcuts beside their items.

**Documentation website:** Implemented. See the section below.

## The pages-site

The published site ships a real right-click menu on every rendered element, and the shortcut column is derived from the binding rather than written beside it.

### One table, both halves

`MENU_ACTIONS` in `site/app.js` declares every action once. Each entry carries a `chord` object, and that same object is read twice: `chordLabel()` turns it into the string printed in the menu, and `chordMatches()` compares it against a real keyboard event in the one live `keydown` handler. There is no second place where a shortcut is spelled out, so the label cannot drift from the binding: an item's `shortcut` field is computed from `action.chord` at the moment the menu is built, and the contract test asserts the item carries that same object rather than a copy of it.

An action with no shortcut prints nothing. Padding the column with a placeholder would be worse than the empty space.

### Which chords a page may actually claim

A page does not get first refusal on the keyboard. `Ctrl+Shift+N` opens a private window, `Ctrl+Shift+C` opens the element picker, `Ctrl+Shift+R` is a cache-bypassing reload; a page that binds one of those prints a shortcut its own handler will never see, which is exactly the lie this feature exists to prevent. `RESERVED_CHORDS` records that set with the claimant named against each one, and no action may sit on a reserved chord.

That is why the site's own chords are `Alt+Shift+<key>`. There is one remaining collision on that pair: **Firefox activates access keys with Alt+Shift**, so an `accesskey` declared anywhere on the site would fire on the same keystroke as one of these actions. No page declares one, and a test asserts that absence rather than a comment hoping somebody remembers.

`Ctrl+Shift+F` is a special case. The command palette's binding lives in `initNavigation()` and is covered by the command-palette contract; running it a second time would call `showModal()` on an already-open dialog and throw. So the menu **prints** that chord and the menu's own dispatcher deliberately excludes it. The two halves are held together by a test that lifts the literal condition out of `initNavigation()` and *runs* it against the chord the menu prints.

### Reaching the menu

- **Pointer:** an ordinary right-click, through one `contextmenu` listener on `document`, so every rendered element genuinely has a menu, rather than a list of selectors that is correct on the day it is written.
- **Keyboard:** `Shift+F10` or the Menu key, anchored to whatever has focus.
- **Touch and pen:** a long press, cancelled by a finger that moves more than a few pixels.
- **`Shift`+right-click passes straight through to the browser's own menu.** A page that takes the context menu away entirely takes away "copy image", "search for this", "view source", and the reader's only escape hatch when this menu is the wrong menu.

### The filter, and what filtering may not do

Each menu carries its own filter field with its own anchored regular-expression builder, keyed to `context-menu-search` so its pattern can never be another field's. Plain text remains the default; the builder is the explicit opt-in, exactly as on every other search field on this site.

Filtering narrows and does nothing else. It preserves source order, hands back the same item objects rather than copies, and never rewrites a label or re-points an action. One further rule matters more than it looks: **while the menu is open, an item the filter has hidden stops being reachable by its shortcut.** Otherwise typing three letters could leave a destructive action invisible on screen and live on the keyboard.

Escape clears the filter on the first press and closes the menu on the second, returning focus to the element the menu was opened from.

### What the menu cannot do, said out loud

Two entries are permanently unavailable, and each names the registry row that records why:

- **Lock this element…**: this site ships no per-element lock; `per-element-toy-locks` is recorded `absent` in `site/feature-registry.json`.
- **Edit this element's appearance…**: this site has no per-element appearance editor; `material-appearance` is recorded `partial`.

Both are offered rather than omitted, because the canonical contract asks every menu for them and a menu that quietly left them out would look complete while being two items short. Neither can be activated: `unavailable` takes no argument at all, so there is no page, element or state that could turn either one on, and both the click route and the chord route refuse a disabled item.

Every other unavailable item names its own unmet condition too ("this page does not carry the notification centre; it is on the home and settings pages"), because a disabled control with no explanation reads as broken rather than as blocked.

The destructive **Reset this site's settings…** carries no shortcut at all, and routes through the existing two-key confirmation gate by clicking the control that opens it, rather than calling the reset directly.

### Naming an element

The menu titles itself after the element it was opened on, and an element named only by an icon gets no name rather than being called by its glyph. A leading run of symbols is stripped, so a card reading `▣ Dashboard` is called "Dashboard". This is not fussiness: an icon font puts its glyph name into `textContent`, and a driver in this repository once recorded a control called `backspaceDelete last` for exactly that reason.

## Failure modes

A displayed shortcut that no longer matches the actual binding is the specific failure this feature exists to prevent, and on this surface it cannot happen through drift, because both halves read one object. It can still happen two other ways, and both are guarded: an action bound to a chord the browser claims first (checked against `RESERVED_CHORDS`), and an `accesskey` appearing on a page and stealing the Alt+Shift pair (checked across all six pages).

A menu placed outside the viewport, or one whose `max-height` is not paired with `overflow:auto`, silently deletes whatever falls past the edge with no scrollbar to say anything is missing. `clampMenuPosition()` is pure and returns the box plus whether it flipped and whether it scrolls, so both properties can be asked rather than eyeballed.

## Accessibility and localization

The list is a `listbox` of `option`s; unavailable items carry `aria-disabled` and a visible reason. A shortcut is exposed through `aria-keyshortcuts` in that attribute's own grammar (`Control+Alt+Shift+L`, never the platform glyph), and the visible `<kbd>`-style chip beside it is `aria-hidden` so it is not read out twice. Arrow keys move an active option through `aria-activedescendant`; Enter runs it. The result count and the keyboard hint are both polite live regions. Rows and the builder trigger meet the site's own `--touch` target size, and the menu carries no motion beyond a short fade, which the site's low-stimulation setting and `prefers-reduced-motion` both remove.

Two copy keys are localized: `contextMenuHint` (the keyboard-route footer) and `contextMenuNoMatch` (the empty-filter state), each with four English and four Cantonese variants across the funny-level range. Item labels, unavailability reasons, the result count and every printed chord render from the action table and the platform instead, so they are English at every level. That is deliberate: a shortcut is a key to press, and translating `Alt+Shift+L` would be translating a fact.

## Verification

`site/tests/contracts/context-menu-shortcuts.test.mjs` extracts the whole feature block from `site/app.js` and runs it against a recording page, a fake clipboard and a fake timer. It checks the derivation directly (every item's printed shortcut is `chordLabel(action.chord)`, and every printed chord dispatches exactly its own item), the reserved-chord refusal, the absence of `accesskey`, the evaluated agreement with `initNavigation()`'s literal palette condition, the filter's order-and-identity preservation, the hidden-item shortcut suppression, the position clamping, and the keyboard and assistive-technology behavior. `scripts/negative-context-menu-site.mjs` plants deliberate breaks one at a time and requires each one to turn that suite red and green again on restore.

**Nothing here has been driven in a real browser.** No chord has been pressed, no right-click has been made, no long press has been held, and no screen reader has read one of these options aloud. The behavior is proved against the real extracted source over a recording DOM, and no further.

**Desktop application:** no automated test currently exercises this feature there.

## Suggested articles

[Command palette](command-palette.md), [Regex builder](regex-builder.md), [Bounded overlays](bounded-overlays.md), [Per-element toy locks](per-element-toy-locks.md), [Platform feature index](README.md).
