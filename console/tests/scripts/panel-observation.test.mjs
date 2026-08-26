/**
 * Contract: the panel-observation harness exists, is one reader rather than several, and is
 * built on facts about this application's DOM that are read off the compiled shell here
 * rather than remembered.
 *
 * `observedPanelControls` is read by `scripts/operated-interaction-evidence.mjs`, which
 * refuses a `verified` inventory row without it. Twenty-five of the twenty-six committed
 * records that carry the field recorded an empty list, and until this file's companion
 * module landed, nothing in the repository produced it at all -- the selector lived in an
 * ad-hoc paste at a driving session, so it could not be reviewed, tested, or fixed once.
 *
 * Three groups of assertions, answering three different questions:
 *
 *   1. Do the pure decision functions decide correctly?
 *   2. Are the DOM facts the harness is designed around still true of the shipped shell?
 *      This is the group that matters most, because every one of them is a reason the
 *      obvious reader returns nothing SILENTLY rather than failing.
 *   3. Is there still exactly one reader, or has a driver grown a private copy again?
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  ANCHOR_MAX_GAP_PX, CLICKABLE_SELECTOR, CONTROL_READING_SOURCE, CONTROL_SELECTOR,
  OVERLAY_COUNT_SOURCE, OVERLAY_Z_FLOOR, PANEL_CANDIDATES_SOURCE,
  choosePanel, gapBetween, readControlLabel, stripLigaturePrefix, summarisePanel,
} from '../../scripts/ui-drive/observe-panel.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
/* CRLF is present in parts of this checkout; a newline-only pattern silently matches
 * nothing, which turns every assertion below into a vacuous pass with no error. */
const read = (p) => readFileSync(resolve(root, p), 'utf8').split('\r\n').join('\n');

const SHELL = 'app/renderer/src/generated/console.tsx';
const DRIVERS = 'scripts/ui-drive';
const shell = read(SHELL);

/* --- 1. the pure decisions ------------------------------------------------------- */

test('a control is named by its accessible name, then its text, then its title', () => {
  assert.deepEqual(
    readControlLabel({ ariaLabel: 'Close', textWithoutIcons: 'X', title: 'Dismiss' }),
    { label: 'Close', source: 'aria-label' },
  );
  assert.deepEqual(
    readControlLabel({ ariaLabel: null, textWithoutIcons: 'Delete last', title: 'Remove the last piece' }),
    { label: 'Delete last', source: 'text' },
  );
  /* The regex builder's header dock buttons hold nothing but an icon and set `title`. */
  assert.deepEqual(
    readControlLabel({ ariaLabel: null, textWithoutIcons: '', title: 'Dock right', icon: 'dock_to_right' }),
    { label: 'Dock right', source: 'title' },
  );
});

/**
 * The second shape of the ligature hazard, found by taking a real reading rather than by
 * reasoning about the DOM.
 *
 * `release/evidence/ui-drive/command-palette-reading.json` came back with a row named
 * `languageHardware trunks - Signalling & routing`: `textContent` concatenates adjacent
 * element children with nothing between them, and a palette row is two top-level spans, its
 * label and the context it sits in. So the browser hands the runs back separately and the
 * join happens here.
 */
test('a control whose label is split across adjacent spans is named with the runs kept apart', () => {
  assert.deepEqual(
    readControlLabel({ ariaLabel: null, segments: ['Language', 'Customise everything - Language'] }),
    { label: 'Language Customise everything - Language', source: 'text' },
  );
  /* One run is the ordinary case and must not gain a stray separator. */
  assert.deepEqual(
    readControlLabel({ ariaLabel: null, segments: ['Delete last'] }),
    { label: 'Delete last', source: 'text' },
  );
  /* An empty or absent run list falls through to the whole-text reading, so a record or a
   * driver written before the runs existed still names its controls. */
  assert.deepEqual(
    readControlLabel({ ariaLabel: null, segments: [], textWithoutIcons: 'Save pattern' }),
    { label: 'Save pattern', source: 'text' },
  );
  assert.deepEqual(
    readControlLabel({ ariaLabel: null, segments: ['   ', ''], textWithoutIcons: 'Save pattern' }),
    { label: 'Save pattern', source: 'text' },
  );
  /* An accessible name still wins over both, and the runs never overtake it. */
  assert.equal(
    readControlLabel({ ariaLabel: 'Close', segments: ['x', 'y'] }).source, 'aria-label',
  );
  /* Capped where the browser side caps its own reading, so one control cannot be named at
   * two different lengths depending on which path produced it. */
  assert.equal(readControlLabel({ segments: ['a'.repeat(60), 'b'.repeat(60)] }).label.length, 80);
});

test('a control with no readable name at all reports the icon AS an icon, never as a label', () => {
  /* The distinction is the whole point: a record carrying `source: "icon"` is saying the
   * control had no name a person could read, which is a finding, not a control label. */
  assert.deepEqual(
    readControlLabel({ ariaLabel: null, textWithoutIcons: '', title: '', icon: 'close' }),
    { label: 'close', source: 'icon' },
  );
  assert.deepEqual(readControlLabel({}), { label: '', source: 'none' });
  assert.deepEqual(readControlLabel(null), { label: '', source: 'none' });
});

test('the ligature-prefix pattern works on a capital label and provably fails on a lowercase one', () => {
  /* Held still on purpose. This is what `gallery.mjs` used to do, it is the obvious fix,
   * and the second assertion is the reason the browser side does not use it. */
  assert.equal(stripLigaturePrefix('backspaceDelete last'), 'Delete last');
  assert.equal(stripLigaturePrefix('auto_fix_highEscape literals'), 'Escape literals');
  assert.equal(
    stripLigaturePrefix('checki · ignore case'), 'checki · ignore case',
    'the pattern has started stripping lowercase labels, so the reason for removing the icon elements exactly has changed',
  );
  assert.equal(stripLigaturePrefix(undefined), '');
});

test('the panel is the highest overlay that actually holds something operable', () => {
  const scrim = { zIndex: 96, visible: true, rect: { x: 0, y: 0, width: 1440, height: 922 }, controls: [], inputs: 0 };
  const panel = { zIndex: 97, visible: true, rect: { x: 120, y: 150, width: 520, height: 640 }, inputs: 1, controls: [{ textWithoutIcons: 'Delete last' }] };
  const behind = { zIndex: 60, visible: true, rect: { x: 0, y: 0, width: 400, height: 400 }, inputs: 0, controls: [{ textWithoutIcons: 'Close' }] };
  assert.equal(choosePanel([scrim, behind, panel]), panel);
  assert.equal(choosePanel([panel, behind, scrim]), panel, 'the choice depends on the order the DOM happened to be walked in');
});

test('a full-viewport container that centres a card loses to the card it centres', () => {
  /* The confirmation gate and the unlock sheet are both shaped this way: one absolutely
   * positioned flex container at inset:0, with the actual card inside it at the same
   * stacking level. Choosing the container gets a panel whose rect is the whole screen and
   * whose "anchored" reading is meaningless. */
  const container = { zIndex: 83, visible: true, rect: { x: 0, y: 0, width: 1440, height: 922 }, inputs: 1, controls: [{ textWithoutIcons: 'Unlock' }] };
  const card = { zIndex: 83, visible: true, rect: { x: 470, y: 300, width: 500, height: 320 }, inputs: 1, controls: [{ textWithoutIcons: 'Unlock' }] };
  assert.equal(choosePanel([container, card]), card);
  assert.equal(choosePanel([card, container]), card);
});

test('nothing below the overlay floor, invisible, or empty of controls can be the panel', () => {
  const belowFloor = { zIndex: OVERLAY_Z_FLOOR - 1, visible: true, rect: { x: 0, y: 0, width: 10, height: 10 }, inputs: 1, controls: [{ textWithoutIcons: 'Go' }] };
  const invisible = { zIndex: 97, visible: false, rect: { x: 0, y: 0, width: 10, height: 10 }, inputs: 1, controls: [{ textWithoutIcons: 'Go' }] };
  const empty = { zIndex: 97, visible: true, rect: { x: 0, y: 0, width: 10, height: 10 }, inputs: 0, controls: [] };
  assert.equal(choosePanel([belowFloor, invisible, empty]), null);
  assert.equal(choosePanel([]), null);
  assert.equal(choosePanel(undefined), null);
});

test('no panel is reported as no panel, with the reason, never as a panel holding nothing', () => {
  /* An empty `observedPanelControls` beside `panelFound: true` is precisely the reading
   * twenty-five committed records carry, and it is the ambiguity this separates. */
  const summary = summarisePanel(null);
  assert.equal(summary.panelFound, false);
  assert.deepEqual(summary.observedPanelControls, []);
  assert.match(summary.whyNoPanel, /operable control/u);
});

test('a real panel summarises to the control names a record has to carry', () => {
  const summary = summarisePanel({
    zIndex: 97,
    visible: true,
    rect: { x: 120, y: 150, width: 520, height: 640 },
    heading: 'Regex builder',
    inputs: 1,
    controls: [
      { ariaLabel: null, textWithoutIcons: 'Delete last', title: 'Remove the last piece', icon: 'backspace' },
      { ariaLabel: null, textWithoutIcons: 'Escape literals', title: 'Treat what you typed as plain text', icon: 'auto_fix_high' },
      { ariaLabel: null, textWithoutIcons: '', title: '', icon: 'drag_indicator' },
      { ariaLabel: null, textWithoutIcons: '', title: '', icon: '' },
    ],
  }, { viewport: { width: 1440, height: 922 } });

  assert.equal(summary.panelFound, true);
  assert.equal(summary.panelHeading, 'Regex builder');
  assert.deepEqual(summary.observedPanelControls, ['Delete last', 'Escape literals'],
    'a control named only by its icon must not be passed off as a panel control, and a nameless one must not appear at all');
  assert.equal(summary.panelControlReadings.length, 3, 'the icon-named control is kept in the fuller readings');
  assert.equal(summary.coversViewport, false);
});

test('the distance to the originating control is measured, and anchoring follows the measurement', () => {
  assert.equal(gapBetween({ x: 0, y: 0, width: 100, height: 20 }, { x: 0, y: 24, width: 100, height: 20 }), 4);
  assert.equal(gapBetween({ x: 0, y: 0, width: 100, height: 100 }, { x: 50, y: 50, width: 10, height: 10 }), 0,
    'boxes that overlap are zero apart');
  assert.equal(gapBetween(null, { x: 0, y: 0, width: 1, height: 1 }), null);

  const near = summarisePanel(
    { zIndex: 97, visible: true, rect: { x: 300, y: 124, width: 400, height: 300 }, inputs: 1, controls: [{ textWithoutIcons: 'Go' }] },
    { originatorRect: { x: 300, y: 100, width: 200, height: 20 }, viewport: { width: 1440, height: 922 } },
  );
  assert.equal(near.gapToOriginatorPx, 4);
  assert.equal(near.anchoredToOriginatingField, true);

  const dragged = summarisePanel(
    { zIndex: 97, visible: true, rect: { x: 300, y: 600, width: 400, height: 300 }, inputs: 1, controls: [{ textWithoutIcons: 'Go' }] },
    { originatorRect: { x: 300, y: 100, width: 200, height: 20 }, viewport: { width: 1440, height: 922 } },
  );
  assert.ok(dragged.gapToOriginatorPx > ANCHOR_MAX_GAP_PX);
  assert.equal(dragged.anchoredToOriginatingField, false,
    'a panel half a screen away must not be able to report itself as anchored to the field');
});

test('a full-viewport panel cannot report itself anchored to anything', () => {
  const summary = summarisePanel(
    { zIndex: 90, visible: true, rect: { x: 0, y: 0, width: 1440, height: 922 }, inputs: 1, controls: [{ textWithoutIcons: 'Skip setup' }] },
    { originatorRect: { x: 10, y: 10, width: 40, height: 20 }, viewport: { width: 1440, height: 922 } },
  );
  assert.equal(summary.coversViewport, true);
  assert.equal(summary.anchoredToOriginatingField, false);
});

/* --- 2. the DOM facts the harness is designed around ----------------------------- */

test('the compiled shell parsed as real content, so nothing below passes vacuously', () => {
  assert.ok(shell.length > 100000, `${SHELL} read as ${shell.length} chars, too small to be the compiled shell`);
});

test('the shell now declares roles and accessible names, so the readers below are a choice not a necessity', () => {
  /* This asserted ZERO of both, and said so in its own failure message: a role appearing
   * meant "a role-based panel selector may have become viable and this design should be
   * revisited". Accessibility work landed and it fired exactly as intended.
   *
   * Inverted rather than deleted, because what it protects is still real: the observation
   * harness below falls through to textContent, and that was FORCED when nothing carried a
   * role. It is now a CHOICE, and one nobody has revisited. Pinning the counts keeps that
   * visible instead of letting the harness quietly go on assuming a shell that no longer
   * exists. Revisiting it is on the roadmap; pretending the assumption still holds is not. */
  const ROLE = 'role' + ':';
  const ARIA = 'aria' + '-';
  assert.equal(shell.split(ROLE).length - 1, 32,
    'the number of declared roles moved; say which way and why rather than editing this number to match');
  assert.equal(shell.split(ARIA).length - 1, 26,
    'the number of accessible-name attributes moved; say which way and why');
});

/**
 * Every way this codebase can write one HTML attribute, because it writes them two ways.
 *
 * The shell and `App.tsx` are hyperscript: attributes are object properties, so a role is
 * `role: 'dialog'`. Four small components are JSX, so a role there is `role="dialog"`. The
 * built bundle is a third form again -- the minifier emits backticks, `role:` + backtick.
 * A needle in one form is blind to the other two, and blind in the silent direction: it
 * finds nothing and reports absence.
 */
const attributeForms = (name, value) => [
  `${name}="${value}"`,
  `${name}: '${value}'`,
  `${name}: "${value}"`,
  `${name}: \`${value}\``,
  `${name}:\`${value}\``,
  `${name}:'${value}'`,
  `${name}:"${value}"`,
];

/**
 * Two renderer files hold serialised PROSE rather than markup, and must be walked past.
 *
 * `docs-bundle.ts` is every documentation article as string data, and `changelog-bundle.ts` is
 * the release history the same way. A sentence in an article that *mentions* an attribute is
 * not an element carrying it — and this bit immediately: writing the correction below into
 * `docs/evidence/panel-observation.md` put the words `role: 'dialog'` into the docs bundle, and
 * the scan reported a second carrier that is a paragraph about the first one.
 *
 * Named by exact path rather than skipped by a `generated/` rule, because `console.tsx` and
 * `m3-control.tsx` live there too and are the markup this scan exists to read.
 */
const PROSE_BUNDLES = [
  'app/renderer/src/generated/docs-bundle.ts',
  'app/renderer/src/generated/changelog-bundle.ts',
];

const rendererSources = () => {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(resolve(root, dir), { withFileTypes: true })) {
      if (entry.isDirectory()) { walk(`${dir}/${entry.name}`); continue; }
      if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) files.push(`${dir}/${entry.name}`);
    }
  };
  walk('app/renderer/src');
  /* An excuse for a file that is not there any more is an excuse nobody can check, and a
   * renamed bundle would silently rejoin the scan as a false carrier. Both are asserted. */
  for (const bundle of PROSE_BUNDLES) {
    assert.ok(files.includes(bundle), `${bundle} is excluded from the markup scan but no longer exists`);
    assert.match(read(bundle).split('\n')[0], /^\/\/ GENERATED/u,
      `${bundle} is excluded from the markup scan as generated prose, but its first line no longer says it is generated`);
  }
  return files.filter((file) => !PROSE_BUNDLES.includes(file));
};

/**
 * The dialog role, where it really is.
 *
 * This test replaces one that asserted the renderer carried the dialog role NOWHERE, and
 * that assertion was false the whole time it was green. Its needle was the JSX form
 * `role="dialog"`; the command palette's card is hyperscript and writes `role: 'dialog'`,
 * so the needle could not see the one element that has it. The claim it was protecting --
 * repeated in the harness header and in the evidence document -- was therefore wrong, and
 * wrong specifically about the palette, which is the surface twenty-five of the empty
 * records were driven through.
 *
 * What is asserted now is the true position and the reason the z-index scan survives it:
 * exactly one renderer element carries the role, it is the palette card, and the card is
 * neither positioned nor z-indexed, so it can never be an overlay candidate. A role-based
 * selector would find one element in one state and nothing on any other screen, which is
 * not a reader; the scan finds the card's own scrim, which contains it.
 */
test('every modal surface now carries the dialog role, not just the palette card', () => {
  /* Was exactly one. Fourteen surfaces now declare it, each paired with aria-modal, which is
   * the accessibility work doing what it was for rather than anything drifting. The count is
   * pinned so losing one is loud: a dialog that stops announcing itself as a dialog is",
   * to a screen reader, just an anonymous box of text. */
  const dialogs = shell.split('role: `dialog`').length - 1;
  const modal = shell.split('"aria-modal"').length - 1;
  assert.equal(dialogs, 14, `${dialogs} elements carry the dialog role, not 14`);
  assert.equal(modal, dialogs,
    `${modal} elements declare aria-modal against ${dialogs} dialogs -- a modal dialog that does not say it is modal traps focus without telling anyone`);
});

/**
 * The property that keeps the scan honest about the palette, read off the stylesheet.
 *
 * `PANEL_CANDIDATES_SOURCE` collects only `position: absolute|fixed` elements with a
 * numeric z-index. `.palette-scrim` is both; `.palette-card` is neither, so the card is
 * never a candidate and the scrim -- which wraps it rather than sitting beside it -- is
 * what gets chosen. That makes the palette reading honest but coarse: the controls found
 * are the card's, while the rectangle reported is the whole viewport, so a palette can
 * never read as anchored to anything. Both are true and the record says so.
 */
test('the palette scrim is a candidate and the card it wraps is not, so the scan reads the palette through its scrim', () => {
  const styles = read('app/renderer/src/styles.css');
  const rule = (selector) => {
    const at = styles.indexOf(`${selector} {`);
    assert.ok(at > 0, `${selector} is no longer a rule in styles.css`);
    const end = styles.indexOf('\n}', at);
    assert.ok(end > at, `${selector} has no closing brace`);
    return styles.slice(at, end);
  };
  /* Declarations only: these rule bodies carry prose comments that mention both words. */
  const declared = (body, property) => body
    .split('\n')
    .filter((line) => !line.trim().startsWith('*') && !line.trim().startsWith('/*'))
    .some((line) => line.trim().startsWith(`${property}:`));

  const scrim = rule('.palette-scrim');
  assert.ok(declared(scrim, 'position'), 'the palette scrim is no longer positioned, so it is no longer a candidate');
  const z = /\n\s*z-index:\s*(\d+)/u.exec(scrim);
  assert.ok(z, 'the palette scrim no longer declares a numeric z-index, so the scan cannot see it at all');
  assert.ok(Number(z[1]) >= OVERLAY_Z_FLOOR,
    `the palette scrim sits at z-index ${z[1]}, below the ${OVERLAY_Z_FLOOR} floor, so the palette is now invisible to the scan`);

  const card = rule('.palette-card');
  assert.equal(declared(card, 'position'), false,
    'the palette card is now positioned, so it may have become a candidate in its own right and the reading changes shape');
  assert.equal(declared(card, 'z-index'), false,
    'the palette card now declares a z-index, so it may have become a candidate in its own right');
});

test('the shell renders its icon ligatures as elements, before the label, exactly as the reader assumes', () => {
  const spans = shell.split('className: "msym"').length - 1;
  assert.ok(spans >= 100, `only ${spans} icon spans found; the reader removes elements carrying that class, so a change of class name breaks it silently`);

  /* The precise shape the naive reader trips on: the icon span is emitted first and the
   * label after it, so `textContent` on that button reads "backspaceDelete last". */
  const toolButton = shell.indexOf('S($t.icon)');
  assert.ok(toolButton > 0, 'the regex builder tool buttons no longer render an icon, so this example needs replacing');
  const afterIcon = shell.slice(toolButton, toolButton + 400);
  assert.match(afterIcon, /S\(\$t\.label\)/u,
    'the tool button no longer puts its label after its icon; the ligature-in-the-DOM hazard may have changed shape');
});

test('the z-index floor sits inside a wide empty band between page chrome and overlays', () => {
  /* Written this way after the first version of it stayed green while the floor was moved
   * from 55 to 6 -- because it asserted `min(overlays) === OVERLAY_Z_FLOOR`, which is true
   * of ANY floor that happens to land on a real value. A guard that moves with the constant
   * it guards is a guard that cannot catch the constant being wrong. So the band is measured
   * from the shell alone, and the floor is then required to sit inside it. */
  const literals = [...shell.matchAll(/z-index:(\d+)/gu)].map((m) => Number(m[1]));
  assert.ok(literals.length > 20, `only ${literals.length} literal z-index values found, so this check would prove little`);

  const chrome = literals.filter((z) => z < OVERLAY_Z_FLOOR);
  const overlays = literals.filter((z) => z >= OVERLAY_Z_FLOOR);
  assert.ok(chrome.length > 0 && overlays.length > 0,
    'one side of the floor is empty, so the floor is not separating anything and this reading proves nothing');

  const bandBottom = Math.max(...chrome);
  const bandTop = Math.min(...overlays);
  assert.ok(bandTop - bandBottom >= 20,
    `the highest page-chrome z-index is ${bandBottom} and the lowest overlay is ${bandTop}, only ${bandTop - bandBottom} apart. `
    + `A floor of ${OVERLAY_Z_FLOOR} is no longer separating two well-separated bands, so the overlay scan will start `
    + 'picking up ordinary page chrome or missing real overlays.');
  assert.ok(bandBottom <= 6 && bandTop >= 55,
    `the shell's own bands moved: chrome now tops out at ${bandBottom} and overlays start at ${bandTop}`);

  /* The one interpolated value in the shell. It is either an overlay-height number or the
   * keyword, and the keyword is rejected by the collector because it is not a finite int. */
  assert.match(shell, /canvasZ:s\.fullscreen \? 94 : 'auto'/u,
    'the interpolated z-index changed; check it is still either above the floor or a keyword the collector rejects');
});

/* --- 3. one reader, not several -------------------------------------------------- */

/**
 * Drop whole-line comments, so a scan for code cannot be satisfied by prose about that code.
 *
 * Both scans below describe the mistakes they forbid, which means the file explaining a
 * forbidden shape must not itself be read as containing it.
 */
const stripWholeLineComments = (text) => text.split('\n').filter((line) => {
  const t = line.trim();
  return t.length > 0 && !t.startsWith('*') && !t.startsWith('/*') && !t.startsWith('//');
}).join('\n');

test('the comment stripper actually removes comments, so the two scans below are not reading prose', () => {
  /* Checked against a sample rather than against the drivers, because "the file got
   * shorter" is satisfied by dropping blank lines alone -- which is exactly how a defeated
   * stripper passed on the first attempt at this. */
  const marker = 'FORBIDDEN' + '_SHAPE';
  const sample = [
    '/**', ` * prose mentioning ${marker}`, ' */', 'const kept = 1;',
    `// a line comment mentioning ${marker}`, '', `  /* indented block with ${marker} */`, 'const alsoKept = 2;',
  ].join('\n');
  const stripped = stripWholeLineComments(sample);
  assert.ok(!stripped.includes(marker), 'the stripper let a comment through, so a code scan could be satisfied by prose');
  assert.ok(stripped.includes('const kept = 1;') && stripped.includes('const alsoKept = 2;'),
    'the stripper removed real code, so a code scan would miss the shape it is looking for');
});

const codeOf = (relative) => {
  const raw = read(relative);
  const code = stripWholeLineComments(raw);
  assert.ok(code.length > 0, `${relative} has no code lines left after stripping comments`);
  assert.ok(code.length < raw.length, `${relative} lost nothing to comment stripping, so the stripper matched nothing`);
  return code;
};

const driverFiles = () => readdirSync(resolve(root, DRIVERS))
  .filter((entry) => entry.endsWith('.mjs') && entry !== 'observe-panel.mjs' && entry !== 'cdp.mjs')
  .map((entry) => `${DRIVERS}/${entry}`);

test('the drivers that name controls import the shared reader instead of carrying their own', () => {
  const drivers = driverFiles();
  assert.ok(drivers.length >= 2, `only ${drivers.length} driver(s) discovered, so this check would prove little`);

  for (const relative of ['scripts/ui-drive/drive.mjs', 'scripts/ui-drive/gallery.mjs']) {
    assert.ok(drivers.includes(relative), `${relative} is no longer among the discovered drivers`);
    assert.match(
      codeOf(relative),
      /^import \{[\s\S]{0,200}?\} from '\.\/observe-panel\.mjs';$/mu,
      `${relative} no longer imports the shared control reader`,
    );
  }
});

/**
 * The one driver allowed to select on the dialog role, and why it is not the rest of them.
 *
 * The ban was written on the premise that the selector could only ever return zero. It
 * cannot: the command palette's card carries the role, so the selector returns one while the
 * palette is open. `palette-reading.mjs` uses it deliberately, as the reading whose value
 * settles that -- it records the count either side of the chord, which is what turns the old
 * claim from a sentence into a measurement.
 *
 * Named here rather than pattern-matched, so adding a second one is an argument somebody has
 * to make. The ban stands for every driver that CHOOSES a panel: one element in one state is
 * not a reader, and a driver that reaches for it goes blind on every other screen.
 */
const DIALOG_ROLE_SELECTOR_ALLOWED = 'scripts/ui-drive/palette-reading.mjs';

test('no driver has grown a private copy of the ligature pattern, and only the reading script names the dialog role', () => {
  /* Built from pieces so the needles are not present in this file as literals either. */
  const LIGATURE = '[a-z_]+(?=' + '[A-Z])';
  const DIALOG = '[role=' + 'dialog]';
  const drivers = driverFiles();
  assert.ok(drivers.includes(DIALOG_ROLE_SELECTOR_ALLOWED),
    `${DIALOG_ROLE_SELECTOR_ALLOWED} is allowed the dialog-role selector but is no longer a driver, `
    + 'so this allowance now excuses nothing and should be removed');

  for (const relative of drivers) {
    const code = codeOf(relative);
    assert.ok(!code.includes(LIGATURE),
      `${relative} carries its own ligature-prefix pattern again; it cannot see a lowercase label`);
    if (relative === DIALOG_ROLE_SELECTOR_ALLOWED) {
      assert.ok(code.includes(DIALOG),
        `${relative} no longer counts the dialog role, so nothing measures the claim it exists to settle`);
      continue;
    }
    assert.ok(!code.includes(DIALOG),
      `${relative} selects on the dialog role; only the palette card carries it, so a panel chosen `
      + 'that way is one element in one state and nothing on any other screen');
  }
});

test('the browser-side sources are complete expressions and name what they must name', () => {
  /* These strings are evaluated in a page, so a truncation or a stray brace fails at run
   * time in a driving session rather than here. Parsing them is cheap insurance. */
  for (const [name, source] of [
    ['CONTROL_READING_SOURCE', CONTROL_READING_SOURCE],
    ['PANEL_CANDIDATES_SOURCE', PANEL_CANDIDATES_SOURCE],
    ['OVERLAY_COUNT_SOURCE', OVERLAY_COUNT_SOURCE],
  ]) {
    assert.doesNotThrow(() => new Function(`return ${source};`), `${name} is not a parseable expression`);
  }
  assert.ok(CONTROL_READING_SOURCE.includes(".querySelectorAll('.msym')"),
    'the reader no longer removes the icon elements, so every label would carry its glyph name again');
  assert.ok(CONTROL_READING_SOURCE.includes('childNodes'),
    'the reader no longer hands back the top-level runs, so a control split across two spans '
    + 'would be named with its label and its context glued into one word again');
  assert.ok(PANEL_CANDIDATES_SOURCE.includes(String(OVERLAY_Z_FLOOR)),
    'the candidate collector no longer applies the overlay floor it is documented to apply');
  assert.ok(PANEL_CANDIDATES_SOURCE.includes(CONTROL_SELECTOR),
    'the candidate collector no longer enumerates controls with the shared selector');
  assert.notEqual(CONTROL_SELECTOR, CLICKABLE_SELECTOR,
    'the enumerating and clicking selectors have been collapsed into one, so a drive would start clicking every text field it finds');
});
