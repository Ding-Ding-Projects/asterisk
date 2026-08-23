# Customise everything

## Behavior

The global layer. Every one of these reaches across the whole console, and every individual element can still override it from its own right-click menu. It is backed by `console profile`. The rail badge on this destination currently reads `∞`. It lives on the App rail, under the Deploy & application group: Stand up a new server, then appearance, updates and the console itself.

## Configuration

### Fun

How playful the console is allowed to be. This is a real setting, not a joke — it scales celebrations, copy and randomness together.

- **Fun level** (`fun_level`) — a slider control, default `2`. 0 is a bank. 1 is polite. 2 is the default — celebrations on meaningful wins. 3 adds jokes and bolder motion. 4 is confetti for changing a slider, rainbow fills and an app that will not stop congratulating you.
  - *What it is:* How playful the console is allowed to be, from 0 to 4.
  - *Why it exists:* One dial that scales celebrations, copy tone, motion and randomness together.
  - *Choosing a value:* 0 Bank, 1 Polite, 2 Balanced, 3 Playful, 4 Unhinged.
  - *Gotcha:* Level 4 celebrates trivial changes. It is delightful for a week and then you will want level 2.
- **Copy tone** (`fun_copy`) — a segmented control, default `Warm`, choices `Terse`, `Neutral`, `Warm`, `Comedian`.
- **Celebrate on** (`fun_celebrate`) — a chips control, default `Big wins`, `Security improvements`, choices `Every change`, `Big wins`, `Security improvements`, `Minigame wins`, `Nothing`.
- **Confetti density** (`fun_confetti`) — a slider control, default `90`.
- **Sound effects** (`fun_sound`) — a switch control, default `false`.
- **Show the mascot** (`fun_mascot`) — a switch control, default `false`.
- **Allow hidden surprises** (`fun_easter`) — a switch control, default `true`.
- **Random appearance for every element** (`fun_random`) — a switch control, default `false`. On, every rendered element is given its OWN randomly generated appearance — its own colour, radius, weight, shadow and entrance. Nothing shares a look. Turn it off and everything snaps back to the design system; your manual per-element overrides survive either way.
  - *What it is:* Gives every rendered element its own randomly generated appearance.
  - *Why it exists:* Because you asked, and because it makes a dull configuration screen memorable.
  - *Choosing a value:* A seed, a scope of properties to randomise, a wildness percentage and an optional reroll on every screen change.
  - *Gotcha:* At high wildness with rotation enabled, dense tables become genuinely hard to read. That is the intent, but it is worth knowing.
- **Randomness seed** (`fun_random_seed`) — a stepper control, default `1`.
- **Randomise** (`fun_random_scope`) — a chips control, default `Colour`, `Radius`, `Shadow`, choices `Colour`, `Radius`, `Shadow`, `Type weight`, `Size`, `Rotation`, `Entrance animation`.
- **How wild** (`fun_random_strength`) — a slider control, default `40`.
- **Reroll on every screen change** (`fun_random_reroll`) — a switch control, default `false`.

### Motion

Global timing. Individual elements can still set their own.

- **Animation speed** (`mo_speed`) — a slider control, default `100`.
- **Default easing** (`mo_curve`) — a segmented control, default `Emphasised`, choices `Linear`, `Standard`, `Emphasised`, `Springy`.
- **Screen transition** (`mo_screen`) — a select control, default `Lift and fade`, choices `Lift and fade`, `Cross fade`, `Slide`, `Zoom`, `None`.
- **Dialog entrance** (`mo_dialog`) — a select control, default `Per dialog`, choices `Per dialog`, `Uniform rise`, `Uniform zoom`.
- **Respect reduced motion** (`mo_reduce`) — a switch control, default `true`.
- **Hover lift** (`mo_hover`) — a switch control, default `true`.

### Layout

Structure of the whole window.

- **Rail position** (`ly_dock`) — a segmented control, default `Left`, choices `Left`, `Right`, `Top`, `Compact`.
- **Density** (`ly_density`) — a segmented control, default `Comfortable`, choices `Dense`, `Comfortable`, `Spacious`.
- **Corner radius** (`ly_radius`) — a slider control, default `16`.
- **Card spacing** (`ly_gap`) — a slider control, default `12`.
- **Tab strip** (`ly_tabs`) — a segmented control, default `Above content`, choices `Above content`, `Below rail`, `Hidden`.
- **Section list width** (`ly_sidebar`) — a slider control, default `268`.
- **Monospace numerics everywhere** (`ly_mono`) — a switch control, default `true`.

### Theme

Colour across the console. Every colour control in the app uses the same infinite picker.

- **Mode** (`th_mode`) — a segmented control, default `Dark`, choices `Dark`, `Light`, `Follow system`, `Per screen`.
- **Accent hue** (`th_hue`) — a slider control, default `148`.
- **Accent saturation** (`th_sat`) — a slider control, default `60`.
- **Contrast** (`th_contrast`) — a segmented control, default `Standard`, choices `Standard`, `Medium`, `High`.
- **Rainbow accent** (`th_rainbow`) — a switch control, default `false`.
- **Rainbow speed** (`th_rbspeed`) — a slider control, default `8`.
- **Tint surfaces with the accent** (`th_tint`) — a slider control, default `6`.

### Behaviour

What the console does without being asked.

- **Open on launch** (`bh_start`) — a select control, default `Dashboard`, choices `Dashboard`, `Endpoints`, `Last screen`, `Customise everything`.
- **Confirmation** (`bh_confirm`) — a segmented control, default `Four gates`, choices `Four gates`, `Credits allowed`, `Single confirm`.
- **Commit every change to git** (`bh_commit`) — a switch control, default `true`.
- **Default lock method** (`bh_lockdefault`) — a select control, default `PIN`, choices `PIN`, `Password`, `Password + PIN`, `Password + PIN + TOTP`.
- **Offer the wizard first on every screen** (`bh_wizard`) — a switch control, default `false`.
- **Show explain buttons** (`bh_explain`) — a switch control, default `true`.
- **Offer the tour on launch** (`bh_tour`) — a switch control, default `false`.

### Profiles

Save the entire look and behaviour, then move it between machines.

- **Active profile** (`pr_active`) — a select control, default `Default`, choices `Default`, `Night operations`, `Training room`, `Demo`.
- **Sync profile with agent memory** (`pr_sync`) — a switch control, default `true`.
- **Allow per-screen overrides** (`pr_perscreen`) — a switch control, default `true`.
- **Include appearance overrides in exports** (`pr_export`) — a switch control, default `true`.

## Failure modes and security

Every control here maps to a real key in console profile; an unreachable configuration store is shown as unreachable, never backfilled with placeholder values. Level 4 celebrates trivial changes. It is delightful for a week and then you will want level 2. At high wildness with rotation enabled, dense tables become genuinely hard to read. That is the intent, but it is worth knowing.

## Verification

Exercise every control against its documented default and its full option range, confirm the write lands in console profile, and confirm an invalid combination is rejected before it reaches Asterisk. Confirm every default shown here matches what a fresh install actually ships, and that changing a value here is reflected the next time this screen loads.

## Suggested articles

[Appearance](appearance.md), [Arcade](arcade.md), and [Notifications](notifications.md).
