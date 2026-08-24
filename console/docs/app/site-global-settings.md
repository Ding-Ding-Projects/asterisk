# Site global settings

The documentation and download surface owns a local settings panel on every published page. The panel is loaded by `console/site/app.js` from the local `global-settings.js` asset, so Home, Product, Documentation, Downloads, Status, and Settings each expose the same controls without delegating a page's state to another page.

## Local state and privacy

The panel stores one bounded JSON record under `ding-pbx-site-global-settings-v1` in the visitor's browser storage. It never sends settings, vocabulary data, narrator choices, display names, schedule rules, or surprise history to a server. The static page has no third-party asset dependency. Resetting the visitor state removes this record and reloads the current page.

## Language, tone, and School mode

Language mode has English, playful Hong Kong-style Cantonese, and bilingual choices. English and Cantonese funny levels are independent sliders from 1 through 5, both defaulting to 5. They style the surrounding copy while dates, names, status values, and other facts remain exact. The dialog emoji switch decorates toast headings only, never a control label or accessible name.

School mode is a local interface preference. The visitor can rename it, set a local unlock-code digest, turn it on live, and reset the mode and digest. While active, the page forces English and suppresses optional language, funny, narration, schedule, visitor, and update controls rather than merely disabling them. Clearing this site's storage is the self-service recovery route. This is not a security boundary.

## Narration

Narration is off by default. The browser's installed voices are enumerated through `speechSynthesis`, including the late `voiceschanged` event. English and Cantonese have separate stable voice-identity selections, with Choose automatically as the default. The visitor can choose English, Cantonese, or serialized Both narration, plus rate and pitch. The queue keeps one active utterance and replaces superseded queued text. A browser without speech synthesis reports that fact instead of inventing a voice.

## Scheduled and external settings

The schedule editor persists an enabled rule with local timezone date and time values, selected weekdays, and deterministic source choice. Local state needs no network. A validated HTTPS endpoint, or a loopback development endpoint, can be checked only after an explicit action with bounded timeout, `redirect: error`, JSON shape validation, and no credentials. Home Assistant uses the same browser-mediated boundary. A browser page cannot provide an operating-system credential vault, so credentials are never persisted by this page and a failed external check leaves the last local state active.

## Visitor surprise, display name, and updates

After the first visit is recorded, later page loads have a fresh ten-percent chance to show one of five locally defined bilingual dish names with a local plate illustration. School mode, a hidden page, and the first visit suppress it. There is no opt-out control. The display-name control changes only the page label, brand, and title, never package identity, storage location, installer identity, or update feed. The update panel reports that no verified installer is published for the static page and never fabricates a download or performs an automatic request.

## Search and accessibility

The panel is independently searchable on every page. Plain text is the default. Its adjacent `.*` control opens the anchored JavaScript regex builder with bounded pattern input, case and Unicode flags, sample feedback, and a return path to the same search. The panel uses keyboard-operable tabs, visible focus, labelled controls, responsive sizing, and reduced-motion handling for its local surprise.

Suggested articles: [About and policy](about.md), [Appearance](appearance.md), [Notifications](notifications.md), and [History and git](history.md).
