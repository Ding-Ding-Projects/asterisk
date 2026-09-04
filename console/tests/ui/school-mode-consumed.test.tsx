/**
 * School mode, consumed.
 *
 * `tests/ui/school-mode.test.tsx` already proves the module DECIDES correctly. It always
 * did -- and for as long as it did, turning School mode on changed one status line and
 * nothing else, because the four functions the mode is named for had no caller outside
 * that test file. Every assertion there passed the whole time. So this file deliberately
 * asserts nothing about the decision and everything about the consumption.
 *
 * The load-bearing half runs the REAL `App` -- the product renderer, not the bare
 * compiled shell and not an injected stub -- with School mode genuinely on in its own
 * durable storage, and reads the markup back. That is the one thing a unit test cannot
 * fake its way past: a control that is still in the output is still on screen, whatever
 * any filter claims about it.
 *
 * The other half checks the filters against the REAL compiled design rather than against
 * fixtures invented here. A filter aimed at a control id the design does not have is a
 * filter that hides nothing, and it looks identical from inside a fixture.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/* `App.bridge()` reads `window.dingDesktop`; outside a browser there is no `window` at
 * all, so the minimum this render path touches is stubbed, exactly as
 * `tests/ui/changelog-wired.test.tsx` already does. */
(globalThis as { window?: unknown }).window ??= {} as unknown;

import { SCREENS } from '../../app/renderer/src/generated/console';
import { App } from '../../app/renderer/src/App';
import { HIDDEN_CAPABILITIES, activateSchoolMode, schoolModeActive } from '../../app/renderer/src/school-mode';
import * as view from '../../app/renderer/src/school-mode-view';
import { LEVEL_SETTING_PREFIX, funnyLevel, setFunnyLevel } from '../../app/renderer/src/funny-levels';
import { languageMode, setCatalog, setLanguageMode, setVocabularyStorage, transformText } from '../../app/renderer/src/text-boundary';
import { loadVocabularyFile } from '../../app/renderer/src/personal-vocabulary';

const APP_SOURCE = readFileSync(new URL('../../app/renderer/src/App.tsx', import.meta.url), 'utf8')
  /* CRLF stripped before any multi-line or line-anchored match. Parts of this checkout are
   * CRLF, and a newline-only pattern against a CRLF file matches nothing at all -- which
   * passes, silently, in the one direction nobody notices. */
  .replaceAll('\r\n', '\n');
const DIM_SUM_SOURCE = readFileSync(new URL('../../app/renderer/src/DimSumSurprise.tsx', import.meta.url), 'utf8')
  .replaceAll('\r\n', '\n');

type Ctl = { id?: string; label?: string; options?: readonly string[] };
type Group = { title?: string; ctls?: Ctl[] };
type Screen = { label?: string; title?: string; groups?: Group[] };
const screens = SCREENS as unknown as Record<string, Screen | undefined>;

/** Every control the compiled design declares, wherever it declares it. */
function designControls(): Map<string, Ctl> {
  const out = new Map<string, Ctl>();
  for (const screen of Object.values(screens)) {
    for (const group of screen?.groups ?? []) {
      for (const ctl of group.ctls ?? []) if (ctl.id !== undefined) out.set(ctl.id, ctl);
    }
  }
  return out;
}

function memoryStorage(seed: Record<string, string> = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => { map.set(key, value); },
    removeItem: (key: string) => { map.delete(key); },
    map,
  };
}

const schoolOn = () => memoryStorage({ 'console.schoolMode.active': 'on' });
const schoolOff = () => memoryStorage();

/* ------------------------------------------------------------------ *
 * The real application, rendered with the mode genuinely on.
 * ------------------------------------------------------------------ */

/**
 * Renders the real `App` pinned on one screen, with School mode written into the very
 * storage the running console reads.
 *
 * `prepareSchoolModeScreen` assigns filtered groups onto the shared `SCREENS` object, so
 * every render is followed by an unfiltered one that puts them back. Without that, one
 * School-mode render would leave the design filtered for whatever ran next in this
 * process -- and a test that only passes when it runs first is not a test.
 */
function renderScreen(screen: string, options: { school?: boolean; railId?: string; extra?: Record<string, unknown> } = {}): string {
  const { school = false, railId = 'app', extra = {} } = options;
  class Pinned extends (App as unknown as new (props: unknown) => {
    state: Record<string, unknown>;
    durableStorage: { storage: { setItem(key: string, value: string): void } };
  }) {
    constructor(props: unknown) {
      super(props);
      if (school) activateSchoolMode(this.durableStorage.storage);
      this.state = { ...this.state, screen, railId, onboardOpen: false, ...extra };
    }
  }
  try {
    return renderToStaticMarkup(createElement(Pinned as never));
  } finally {
    if (school) {
      class Restore extends (App as unknown as new (props: unknown) => { state: Record<string, unknown> }) {
        constructor(props: unknown) {
          super(props);
          this.state = { ...this.state, screen, railId, onboardOpen: false, ...extra };
        }
      }
      renderToStaticMarkup(createElement(Restore as never));
    }
  }
}

const readable = (markup: string) => markup.replace(/<[^>]*>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');

test('with School mode off, every hidden-capability control is on the real settings screens', () => {
  /* The non-vacuous half. If these were absent to begin with, their absence below would
   * prove nothing whatsoever about School mode. */
  const customise = readable(renderScreen('customise'));
  assert.ok(customise.includes('Fun level (English)'), 'expected the English fun slider to render with the mode off');
  assert.ok(customise.includes('Fun level (廣東話)'), 'expected the Cantonese fun slider to render with the mode off');
  assert.ok(customise.includes('廣東話'), 'expected the Cantonese language option to render with the mode off');
  assert.ok(customise.includes('Cantonese voice'), 'expected the Cantonese narration voice picker to render with the mode off');
  const appearance = readable(renderScreen('appearance'));
  assert.ok(appearance.includes('Personal vocabulary'), 'expected the personal-vocabulary group to render with the mode off');
  assert.ok(appearance.includes('Vocabulary file'), 'expected the vocabulary upload control to render with the mode off');
});

test("with School mode on, the narrator's Cantonese half is gone as well as the written one", () => {
  /* Found only by rendering: "language" reads as the one `lang_mode` control, and the
   * narrated-language picker and the Cantonese voice picker are two more Cantonese
   * controls sitting on the same screen. A mode that hid the written half and left the
   * spoken half would have looked complete from every list anybody had written down. */
  const customise = readable(renderScreen('customise', { school: true }));
  assert.ok(!customise.includes('Cantonese voice'), 'the Cantonese narration voice picker is still rendered while School mode is on');
});

/** Anything on a settings screen that names a capability the mode hides. Deliberately a
 *  little wide -- a false positive here is a sentence somebody has to look at, and a false
 *  negative is a promise the screen cannot keep. */
const CAPABILITY_REFERENCE = /[一-鿿]|cantonese|bilingual|funny|fun level|vocabulary|dim ?sum/iu;

test('no surviving group description promises a capability the mode has taken away', () => {
  /* The assertion that found the real gap in this change: removing the controls and
   * leaving the headings alone left the Narration group still promising that "English and
   * Cantonese voices are independent" over a group with no Cantonese voice picker in it.
   * A description naming a control the screen does not have is a reference in exactly the
   * sense the contract omits, and it is worse than the control being there because it
   * cannot be acted on. */
  for (const screen of ['customise', 'appearance']) {
    class Pinned extends (App as unknown as new (props: unknown) => {
      state: Record<string, unknown>; durableStorage: { storage: { setItem(k: string, v: string): void } };
    }) {
      constructor(props: unknown) {
        super(props);
        activateSchoolMode(this.durableStorage.storage);
        this.state = { ...this.state, screen, railId: 'app', onboardOpen: false };
      }
    }
    renderToStaticMarkup(createElement(Pinned as never));
    const groups = screens[screen]?.groups ?? [];
    assert.ok(groups.length > 0, `no groups found on ${screen} -- nothing was scanned`);
    for (const group of groups) {
      if (group.title !== undefined && view.SELF_DESCRIBING_GROUPS.has(group.title)) continue;
      const desc = (group as { desc?: string }).desc ?? '';
      assert.ok(!CAPABILITY_REFERENCE.test(desc),
        `the "${group.title}" group on ${screen} still describes a hidden capability while School mode is on: ${JSON.stringify(desc)}`);
    }
    /* Restore the shared design object for whatever runs next. */
    class Restore extends (App as unknown as new (props: unknown) => { state: Record<string, unknown> }) {
      constructor(props: unknown) { super(props); this.state = { ...this.state, screen, railId: 'app', onboardOpen: false }; }
    }
    renderToStaticMarkup(createElement(Restore as never));
  }
});

test('each replacement description belongs to a group the filter really changes, and introduces no reference of its own', () => {
  /* "The original names a hidden capability" was the obvious criterion and it is the wrong
   * one, which this test found by failing on its own first run. The Fun description reads
   * "Two independent settings ... Both start at level 5" -- stale by COUNT rather than by
   * keyword, since both of the settings it counts are gone and neither the word Cantonese
   * nor the word funny appears in it. So the criterion is the real reason a description
   * goes stale: the group loses something. That also makes a replacement for a group the
   * filter never touches fail here as the dead configuration it would be.
   *
   * This and the scan above cover two different failures, which is why both exist: the
   * scan catches a description that NAMES a capability, and this catches one that
   * describes a control that is no longer there without naming anything. */
  const byTitle = new Map<string, Group>();
  for (const screen of Object.values(screens)) {
    for (const group of screen?.groups ?? []) if (group.title !== undefined) byTitle.set(group.title, group);
  }
  for (const [title, replacement] of Object.entries(view.GROUP_DESCRIPTION_WHILE_HIDDEN)) {
    const original = byTitle.get(title);
    assert.ok(original !== undefined, `there is no "${title}" group in the compiled design to replace a description for`);
    const before = original!.ctls ?? [];
    const after = view.visibleGroups(schoolOn(), [{ ...original!, desc: 'x' }])[0]?.ctls ?? [];
    const lostControls = after.length !== before.length;
    const filteredOptions = after.some((ctl, index) => (ctl.options ?? []).length !== (before[index]?.options ?? []).length);
    assert.ok(lostControls || filteredOptions,
      `the "${title}" group loses no control and no option under the filter, so replacing its description is dead configuration`);
    assert.ok(!CAPABILITY_REFERENCE.test(replacement),
      `the replacement for "${title}" reintroduces a reference to a hidden capability`);
    assert.ok(replacement.trim().length > 20, `the replacement for "${title}" is too short to say anything`);
  }
});

test('every group the filter changes has a replacement description', () => {
  /* The other direction, and the one a rule-shaped check cannot supply: a rule about
   * replacements that exist says nothing about a group that lost a control and kept a
   * description written for the version that had it. */
  for (const screenKey of ['customise', 'appearance']) {
    for (const group of screens[screenKey]?.groups ?? []) {
      const before = group.ctls ?? [];
      if (before.length === 0) continue;
      const kept = view.visibleGroups(schoolOn(), [group]);
      /* A group the filter empties is dropped outright, heading and all, so it needs no
       * replacement description -- there is nothing left to describe. */
      if (kept.length === 0) continue;
      const after = kept[0]?.ctls ?? [];
      const changed = after.length !== before.length
        || after.some((ctl, index) => (ctl.options ?? []).length !== (before[index]?.options ?? []).length);
      if (!changed) continue;
      assert.ok(group.title !== undefined && group.title in view.GROUP_DESCRIPTION_WHILE_HIDDEN,
        `the "${group.title}" group on ${screenKey} loses a control under School mode but keeps the description written for the version that had it`);
    }
  }
});

test("a renamed mode's own group heading stops showing the shipped name", () => {
  /* The design authors that heading as the literal "School mode", so a rename that changed
   * every message and left the heading alone would put the shipped name back on screen at
   * the top of the very group that renamed it. */
  const storage = schoolOff();
  const group = { title: 'School mode', ctls: [{ id: 'school_mode' }] };
  assert.equal(view.visibleGroups(storage, [group])[0]!.title, 'School mode', 'an unrenamed console should be handed its own heading');
  storage.setItem('console.schoolMode.name', 'Quiet mode');
  assert.equal(view.visibleGroups(storage, [group])[0]!.title, 'Quiet mode');
  activateSchoolMode(storage);
  assert.equal(view.visibleGroups(storage, [group])[0]!.title, 'Quiet mode', 'the rename must survive the mode being on');
  assert.equal(group.title, 'School mode', 'the design declaration was renamed in place rather than copied');
});

test('with School mode on, the funny-level sliders are gone from the rendered settings screen', () => {
  const customise = readable(renderScreen('customise', { school: true }));
  assert.ok(!customise.includes('Fun level (English)'), 'the English fun slider is still rendered while School mode is on');
  assert.ok(!customise.includes('Fun level (廣東話)'), 'the Cantonese fun slider is still rendered while School mode is on');
});

test('with School mode on, no Cantonese script survives anywhere on the rendered settings screen', () => {
  /* The single strongest reading available without a built artifact: not "the control we
   * thought of is gone" but "the language itself does not appear". It catches the option
   * of a control nobody remembered as well as the ones listed above -- the narrated
   * language picker was found exactly this way. */
  const customise = readable(renderScreen('customise', { school: true }));
  assert.ok(!/[一-鿿]/u.test(customise),
    `Chinese characters still render on the settings screen while School mode is on: ${customise.match(/.{0,40}[一-鿿]{1,8}.{0,40}/u)?.[0]}`);
});

test("with School mode on, the mode's own switch is still on screen", () => {
  /* The boundary that is easy to get backwards. Somebody who cannot find the switch
   * cannot turn it off, and the canonical contract keeps it discoverable by name. */
  const customise = readable(renderScreen('customise', { school: true }));
  assert.ok(customise.includes('School mode'), "the mode's own control disappeared along with the capabilities it hides");
  assert.ok(customise.includes('Unlock credential'), 'the unlock route disappeared while the mode was on');
});

test('with School mode on, the personal-vocabulary group is gone from the rendered appearance screen', () => {
  const appearance = readable(renderScreen('appearance', { school: true }));
  assert.ok(!appearance.includes('Vocabulary file'), 'the vocabulary upload control is still rendered while School mode is on');
  assert.ok(!appearance.includes('Personal vocabulary'),
    'the emptied group heading is still rendered -- a heading over nothing is still a reference to the capability');
});

test('with School mode on, the vocabulary destination is gone from the rail and the palette', () => {
  const railOff = readable(renderScreen('vocab', { railId: 'agent' }));
  assert.ok(railOff.includes(screens.vocab!.label!), 'expected the vocabulary destination in the rail with the mode off');
  const railOn = readable(renderScreen('dash', { school: true, railId: 'agent' }));
  assert.ok(!railOn.includes(screens.vocab!.label!), 'the vocabulary destination is still listed in the rail while School mode is on');

  const paletteOff = readable(renderScreen('dash', { extra: { paletteOpen: true, paletteQ: '' } }));
  assert.ok(paletteOff.includes(screens.vocab!.title!), 'expected the vocabulary destination in the palette with the mode off');
  const paletteOn = readable(renderScreen('dash', { school: true, extra: { paletteOpen: true, paletteQ: '' } }));
  assert.ok(!paletteOn.includes(screens.vocab!.title!), 'the vocabulary destination is still listed in the palette while School mode is on');
});

/* ------------------------------------------------------------------ *
 * Every capability is consumed, and the filters aim at real controls.
 * ------------------------------------------------------------------ */

test('every canonical hidden capability names at least one consumer, and each one is exported', () => {
  for (const capability of HIDDEN_CAPABILITIES) {
    const consumers = view.CAPABILITY_CONSUMERS[capability];
    assert.ok(Array.isArray(consumers) && consumers.length > 0,
      `capability "${capability}" has no consumer -- it would be another switch that decides correctly and reaches nothing`);
    for (const name of consumers) {
      assert.equal(typeof (view as unknown as Record<string, unknown>)[name], 'function',
        `capability "${capability}" names consumer "${name}", which school-mode-view.ts does not export`);
    }
  }
});

test('the consumer inventory names no capability the canonical list does not have', () => {
  assert.deepEqual(
    Object.keys(view.CAPABILITY_CONSUMERS).sort(),
    [...HIDDEN_CAPABILITIES].sort(),
    'CAPABILITY_CONSUMERS and HIDDEN_CAPABILITIES have drifted apart');
});

test('every control id the filter hides really exists in the compiled design', () => {
  const controls = designControls();
  assert.ok(controls.size > 100, `only ${controls.size} controls found in the compiled design -- too few to trust a lookup against it`);
  for (const id of Object.keys(view.CONTROL_CAPABILITY)) {
    assert.ok(controls.has(id), `CONTROL_CAPABILITY hides "${id}", which the compiled design does not declare -- it hides nothing`);
  }
});

test('every option the filter hides really exists on that control, and what is left is English', () => {
  const controls = designControls();
  for (const [id, table] of Object.entries(view.CONTROL_OPTION_CAPABILITY)) {
    const control = controls.get(id);
    assert.ok(control, `CONTROL_OPTION_CAPABILITY names control "${id}", which the compiled design does not declare`);
    const options = control!.options ?? [];
    assert.ok(options.length > 0, `control "${id}" declares no options, so hiding one of them hides nothing`);
    for (const option of Object.keys(table)) {
      assert.ok(options.includes(option), `control "${id}" has no option "${option}" -- the filter aims at a label that is not there`);
    }
    const left = options.filter((option) => !(option in table));
    assert.deepEqual(left, ['English'], `hiding the Cantonese options of "${id}" should leave exactly English, not ${JSON.stringify(left)}`);
  }
});

test('every destination the filter hides really exists, and its rail and palette strings are unambiguous', () => {
  for (const key of Object.keys(view.SCREEN_CAPABILITY)) {
    const screen = screens[key];
    assert.ok(screen, `SCREEN_CAPABILITY hides destination "${key}", which the compiled design does not declare`);
    for (const field of ['label', 'title'] as const) {
      const value = screen![field];
      assert.ok(typeof value === 'string' && value !== '', `destination "${key}" has no ${field} to match on`);
      const sharers = Object.entries(screens).filter(([, other]) => other?.[field] === value).map(([k]) => k);
      assert.deepEqual(sharers, [key],
        `destination ${field} ${JSON.stringify(value)} is shared with ${sharers.join(', ')} -- filtering by it would remove the wrong row`);
    }
  }
});

test("the language control's labels agree with App's own label-to-mode table", () => {
  /* Two tables naming the same three labels, in two files. They are checked against each
   * other rather than trusted to stay in step, because a rename in the design would
   * otherwise leave the filter matching a label nobody draws any more. */
  const options = designControls().get('lang_mode')?.options ?? [];
  const appLabels = [...APP_SOURCE.matchAll(/English: 'en', '(.+?)': 'yue', '(.+?)': 'both'/gu)][0];
  assert.ok(appLabels, "App.LANGUAGE_CHOICES no longer declares its three labels in the shape this test reads");
  assert.deepEqual([...options].sort(), ['English', appLabels[1], appLabels[2]].sort());
});

test('both screens whose groups are rebuilt every render are covered by the filter', () => {
  /* `prepareServersScreen` and `prepareLocalHistoryScreen` replace their screen's groups
   * outright, so the module-load snapshot is stale for them by construction and the live
   * array has to be what gets filtered. This asserts the set naming them still names
   * exactly the screens that behave that way. */
  const named = [...APP_SOURCE.matchAll(/^const RUNTIME_GROUP_SCREENS: ReadonlySet<string> = new Set\(\[(.+?)\]\);$/gmu)][0];
  assert.ok(named, 'RUNTIME_GROUP_SCREENS is no longer declared on one line in App.tsx');
  const rebuilders = [...APP_SOURCE.matchAll(/^\s+screens\[?([A-Za-z_.']+)\]?!?\.groups = /gmu)].length;
  assert.equal(rebuilders, 2, `expected exactly two screens to rebuild their groups, found ${rebuilders} -- the covered set needs revisiting`);
  assert.ok(named[1]!.includes("'servers'"), 'the servers screen is no longer named in RUNTIME_GROUP_SCREENS');
  assert.ok(named[1]!.includes('LOCAL_HISTORY_SCREEN_ID'), 'the local-history screen is no longer named in RUNTIME_GROUP_SCREENS');
});

/* ------------------------------------------------------------------ *
 * The seams, and the promise that nothing is destroyed.
 * ------------------------------------------------------------------ */

test('the funny levels answer at level 1 through the view, and are untouched underneath', () => {
  const storage = schoolOn();
  setFunnyLevel(storage, 'en', 4);
  setFunnyLevel(storage, 'yue', 2);
  const viewed = view.schoolModeStorageView(storage);
  assert.equal(viewed.getItem(`${LEVEL_SETTING_PREFIX}en`), '1');
  assert.equal(viewed.getItem(`${LEVEL_SETTING_PREFIX}yue`), '1');
  /* The whole retention promise, measured rather than asserted about: read the real
   * storage straight, not through the view, and find exactly what was chosen. */
  assert.equal(funnyLevel(storage, 'en'), 4);
  assert.equal(funnyLevel(storage, 'yue'), 2);
});

test('the view passes every other key straight through and is the same object when the mode is off', () => {
  const on = schoolOn();
  on.setItem('console.languageMode', 'yue');
  assert.equal(view.schoolModeStorageView(on).getItem('console.languageMode'), 'yue');
  const off = schoolOff();
  assert.equal(view.schoolModeStorageView(off), off, 'with the mode off the view must be the storage itself, not a wrapper around it');
});

test('the effective language is English while the mode is on and the stored choice the instant it is off', () => {
  for (const stored of ['en', 'yue', 'both'] as const) {
    assert.equal(view.effectiveTextLanguageMode(schoolOn(), stored), 'en');
    assert.equal(view.effectiveTextLanguageMode(schoolOff(), stored), stored);
  }
});

test('the narrator is handed English while the mode is on, and its own settings object when it is off', () => {
  const settings = { language: 'zh', enabled: true };
  assert.equal(view.effectiveNarrationSettings(schoolOn(), settings).language, 'en');
  assert.equal(view.effectiveNarrationSettings(schoolOn(), settings).enabled, true, 'the narrator was silenced rather than switched to English');
  assert.equal(view.effectiveNarrationSettings(schoolOff(), settings), settings);
  assert.equal(settings.language, 'zh', 'the caller-held settings were mutated rather than copied');
});

test('the vocabulary handle is withheld while the mode is on and returned when it is off', () => {
  const dictionary = memoryStorage();
  assert.equal(view.vocabularyStorageFor(schoolOn(), dictionary), undefined);
  assert.equal(view.vocabularyStorageFor(schoolOff(), dictionary), dictionary);
});

test('the dim sum surprise is refused while the mode is on', () => {
  assert.equal(view.dimSumSurpriseAllowed(schoolOn()), false);
  assert.equal(view.dimSumSurpriseAllowed(schoolOff()), true);
});

test('a group emptied by the filter is dropped, and one that shipped empty is left alone', () => {
  const groups = [
    { title: 'Personal vocabulary', ctls: [{ id: 'va_file' }, { id: 'va_status' }, { id: 'va_clear' }] },
    { title: 'Fun', ctls: [{ id: 'fun_level' }, { id: 'fun_level_yue' }, { id: 'fun_copy' }] },
    { title: 'Always empty', ctls: [] },
    { title: 'No ctls key at all' },
  ];
  const kept = view.visibleGroups(schoolOn(), groups);
  assert.deepEqual(kept.map((g) => g.title), ['Fun', 'Always empty', 'No ctls key at all']);
  assert.deepEqual(kept[0]!.ctls!.map((c) => c.id), ['fun_copy'],
    'the two funny-level sliders should be gone and every other Fun control untouched');
  assert.deepEqual(view.visibleGroups(schoolOff(), groups).map((g) => g.title), groups.map((g) => g.title));
});

test('a filtered control keeps a selection that is actually one of its remaining options', () => {
  const control = { id: 'lang_mode', value: '廣東話', options: ['English', '廣東話', 'English + 廣東話'] };
  const [group] = view.visibleGroups(schoolOn(), [{ ctls: [control] }]);
  const filtered = group!.ctls![0]!;
  assert.deepEqual(filtered.options, ['English']);
  assert.equal(filtered.value, 'English',
    'a segmented control whose selection is not among its buttons renders with nothing highlighted, which reads as broken');
  assert.equal(control.value, '廣東話', 'the design declaration was mutated in place rather than copied');
});

test('the label put in a filtered control is the surviving one, and the stored label is untouched when it survives', () => {
  const control = { id: 'lang_mode', options: ['English', '廣東話', 'English + 廣東話'] };
  assert.equal(view.visibleControlValue(schoolOn(), control, '廣東話'), 'English');
  assert.equal(view.visibleControlValue(schoolOn(), control, 'English'), 'English');
  assert.equal(view.visibleControlValue(schoolOff(), control, '廣東話'), '廣東話');
  assert.equal(view.visibleControlValue(schoolOn(), { id: 'not_a_filtered_control' }, '廣東話'), '廣東話');
});

test('hidden destinations are named by key and matched by the strings the shell actually lists them under', () => {
  assert.deepEqual(view.hiddenScreenKeys(schoolOn()), ['vocab']);
  assert.deepEqual(view.hiddenScreenKeys(schoolOff()), []);
  const strings = view.hiddenScreenStrings(schoolOn(), screens);
  assert.ok(strings.has(screens.vocab!.label!) && strings.has(screens.vocab!.title!));
  const rows = [{ label: screens.vocab!.label! }, { label: 'Dashboard' }];
  assert.deepEqual(view.withoutHiddenEntries(strings, rows).map((r) => r.label), ['Dashboard']);
  assert.deepEqual(view.withoutHiddenEntries(new Set<string>(), rows).map((r) => r.label), [screens.vocab!.label!, 'Dashboard']);
});

/* ------------------------------------------------------------------ *
 * The wiring lines themselves.
 * ------------------------------------------------------------------ *
 *
 * Anchored to whole lines rather than to substrings, because a bare needle is satisfied
 * by a commented-out call and commenting one out is how a wiring line usually dies. Each
 * of these is a line whose deletion would leave every assertion above this block green.
 */

const wiringLines: readonly [string, string, RegExp][] = [
  ['App.tsx', 'the message pipeline reads levels through the School mode view',
    /^\s+return schoolModeStorageView\(this\.durableStorage\.storage\) as MessageStorage;$/mu],
  ['App.tsx', 'the text boundary is set from the effective language on mount',
    /^\s+setLanguageMode\(effectiveTextLanguageMode\(storage, stored\)\);$/mu],
  ['App.tsx', 'the vocabulary handle is withheld on mount',
    /^\s+setVocabularyStorage\(vocabularyStorageFor\(this\.durableStorage\.storage, this\.vocabStorage\)\);$/mu],
  ['App.tsx', 'the narrator is re-pointed when the mode moves',
    /^\s+this\.narrator\.setSettings\(effectiveNarrationSettings\(storage, this\.narration\)\);$/mu],
  ['App.tsx', 'a narration control change reaches the narrator through the mode',
    /^\s+this\.narrator\.setSettings\(effectiveNarrationSettings\(this\.durableStorage\.storage, next\)\);$/mu],
  ['App.tsx', 'a restored narration profile reaches the narrator through the mode',
    /^\s+this\.narrator\.setSettings\(effectiveNarrationSettings\(this\.durableStorage\.storage, this\.narration\)\);$/mu],
  ['App.tsx', 'turning the mode on applies it',
    /^\s+this\.applySchoolMode\(\);$/mu],
  ['App.tsx', 'an unlock attempt re-applies it either way',
    /^\s+this\.applySchoolMode\(values\);$/mu],
  ['App.tsx', 'the screen about to render is filtered',
    /^\s+this\.prepareSchoolModeScreen\(screen\);$/mu],
  ['App.tsx', 'the rail and the palette drop hidden destinations',
    /^\s+if \(Array\.isArray\(entries\)\) values\[key\] = withoutHiddenEntries\(hiddenScreens, entries as \{ label\?: string \}\[\]\);$/mu],
  ['DimSumSurprise.tsx', 'the startup surprise asks before drawing',
    /^\s+if \(!dimSumSurpriseAllowed\(storageHandle\.storage\)\) return;$/mu],
];

for (const [file, what, pattern] of wiringLines) {
  test(`${file}: ${what}`, () => {
    const source = file === 'App.tsx' ? APP_SOURCE : DIM_SUM_SOURCE;
    assert.match(source, pattern,
      `the wiring line is missing, renamed, or commented out -- the feature would decide correctly and reach nothing`);
  });
}

test('the surprise asks before it consumes the one first launch it is allowed', () => {
  /* Order matters and nothing else would notice it changing: asking after the marker is
   * consumed spends the launch behind the person's back, so the surprise would be gone
   * the first time School mode is off. */
  const ask = DIM_SUM_SOURCE.indexOf('if (!dimSumSurpriseAllowed(storageHandle.storage)) return;');
  const consume = DIM_SUM_SOURCE.indexOf('const firstLaunch = consumeFirstLaunch(');
  assert.ok(ask > 0 && consume > 0, 'both the School mode check and the first-launch consumption should be present');
  assert.ok(ask < consume, 'School mode is checked after the first launch has already been spent');
});

test('nothing in the consumption path writes School mode state', () => {
  /* The retention promise, checked at the source rather than trusted: this module reads
   * and returns, and the only writers are the switch handlers in App.tsx. */
  const source = readFileSync(new URL('../../app/renderer/src/school-mode-view.ts', import.meta.url), 'utf8');
  assert.ok(!/\bstorage\.setItem\(/u.test(source.replace(/setItem\(key: string, value: string\): void \{ storage\.setItem\(key, value\); \}/u, '')),
    'school-mode-view.ts writes to storage somewhere other than its one pass-through setter');
  assert.ok(!/activateSchoolMode|deactivateSchoolMode|setCredential|renameSchoolMode/u.test(source),
    'the read-time view reaches for a mutating School mode function');
});

/* ------------------------------------------------------------------ *
 * The switch itself, operated.
 * ------------------------------------------------------------------ */

/**
 * The real `App` with just enough of React's lifecycle stubbed to operate its controls
 * outside a mounted tree.
 *
 * Only `setState` and `forceUpdate` are replaced, and both with the plainest thing that
 * could work -- React refuses either on a component that was never mounted, and every
 * handler below reaches one of them through `toast`, `fire` or the status line. Nothing
 * else about the app is stubbed: the storage is its own, the boundary is the real module,
 * and `setVal` is the real handler the compiled shell calls.
 */
function operableApp() {
  class Operable extends (App as unknown as new (props: unknown) => {
    state: Record<string, unknown>;
    durableStorage: { storage: { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void } };
    vocabStorage: { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void };
    setVal(control: { id: string }, value: unknown): void;
  }) {
    constructor(props: unknown) {
      super(props);
      /* Assigned in the constructor rather than declared as a method, because `App`'s own
       * constructor assigns `this.setState` as an OWN property and an own property
       * shadows a prototype method. And it has to accept the functional form: the
       * compiled shell's `setVal` updates with `s => ({ values: ... })`, so a stub that
       * only understands a plain object silently drops every control value -- which is
       * how the credential below appeared not to unlock a mode it had unlocked. */
      const self = this as unknown as { state: Record<string, unknown>; setState: unknown; forceUpdate: unknown };
      self.setState = (patch: unknown) => {
        const next = typeof patch === 'function'
          ? (patch as (s: Record<string, unknown>) => Record<string, unknown>)(self.state)
          : patch as Record<string, unknown>;
        self.state = { ...self.state, ...next };
      };
      self.forceUpdate = () => { /* nothing to re-render outside a tree */ };
    }
  }
  const app = new Operable({}) as unknown as {
    state: Record<string, unknown>;
    durableStorage: { storage: { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void } };
    vocabStorage: { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void };
    setVal(control: { id: string }, value: unknown): void;
  };
  app.state = { ...app.state, values: {}, screen: 'customise', railId: 'app', onboardOpen: false };
  return app;
}

test('operating the real switch forces English and stops applying the uploaded vocabulary', () => {
  /* The three properties this file could not see until it operated the switch rather than
   * reading the source for it: three planted breaks stayed green against the source
   * patterns alone, because two of them matched a DIFFERENT occurrence of the same line
   * and the third pinned only the copy that runs at mount. */
  const app = operableApp();
  loadVocabularyFile(app.vocabStorage, JSON.stringify({
    version: 1, replacements: [{ from: 'Dashboard', to: 'Front page' }],
  }));
  setVocabularyStorage(app.vocabStorage);
  setCatalog({ Dashboard: '儀表板' });
  app.setVal({ id: 'lang_mode' }, '廣東話');
  assert.equal(languageMode(), 'yue', 'the language control should have moved the boundary before the mode is touched');
  assert.equal(transformText('Dashboard'), '儀表板', 'the vocabulary and the catalogue should both be live before the mode is touched');

  app.setVal({ id: 'school_mode' }, true);

  assert.equal(languageMode(), 'en', 'turning the switch on did not force English');
  assert.equal(transformText('Dashboard'), 'Dashboard',
    'the uploaded vocabulary is still being applied -- the boundary was not withheld from it');
  /* And the stored choice is untouched, which is what makes turning it off a return
   * rather than a reconstruction. */
  assert.equal(app.durableStorage.storage.getItem('console.languageMode'), 'yue');
});

test('a session that starts with the mode already on comes up in English', () => {
  /* The startup path, which none of the render tests reach because they never mount. It
   * is the one that matters most in practice: somebody who left the mode on and closed
   * the console would otherwise be handed their Cantonese back on the next launch, which
   * is precisely the person the mode was turned on for.
   *
   * `restoreLanguageMode` is reached directly rather than through `componentDidMount`,
   * which would also start the scheduler, the source poller and the narration restore --
   * three background loops with nothing to stop them in a test process. */
  const app = operableApp();
  app.durableStorage.storage.setItem('console.languageMode', 'yue');
  activateSchoolMode(app.durableStorage.storage);
  setLanguageMode('yue');
  (app as unknown as { restoreLanguageMode(): void }).restoreLanguageMode();
  assert.equal(languageMode(), 'en', 'a console that starts with the mode already on came up speaking Cantonese');
});

test('operating the real switch closes and leaves a hidden destination that was open', () => {
  const app = operableApp();
  app.state = { ...app.state, screen: 'vocab', tabs: ['dash', 'vocab'] };
  app.setVal({ id: 'school_mode' }, true);
  assert.deepEqual(app.state['tabs'], ['dash'], 'the hidden destination is still open in a tab');
  assert.notEqual(app.state['screen'], 'vocab', 'the console is still showing the destination the mode hides');
});

test('a wrong unlock attempt leaves everything exactly as suppressed as it was', () => {
  const app = operableApp();
  app.setVal({ id: 'school_mode' }, true);
  app.setVal({ id: 'school_method' }, 'pin');
  app.setVal({ id: 'school_credential' }, '4321');
  app.setVal({ id: 'school_set_credential' }, true);
  app.setVal({ id: 'lang_mode' }, '廣東話');

  app.setVal({ id: 'school_credential' }, '0000');
  app.setVal({ id: 'school_unlock' }, true);
  assert.equal(schoolModeActive(app.durableStorage.storage), true, 'a wrong credential turned the mode off');
  assert.equal(languageMode(), 'en', 'a rejected unlock attempt left the console speaking something other than English');

  app.setVal({ id: 'school_credential' }, '4321');
  app.setVal({ id: 'school_unlock' }, true);
  assert.equal(schoolModeActive(app.durableStorage.storage), false, 'the right credential did not turn the mode off');
  assert.equal(languageMode(), 'yue', 'the language chosen before the mode went on did not come back');
});

test('the feature registry no longer carries the claim this change disproved', () => {
  /* The registry is the file a later pass plans against, and its note said outright that
   * none of the visibility functions were imported by App.tsx. Leaving that in place would
   * send somebody to repair a defect that is fixed. */
  const registry = JSON.parse(readFileSync(new URL('../../app/feature-registry.json', import.meta.url), 'utf8')) as
    { features: Record<string, { state: string; note: string; files: string[] }> };
  const entry = registry.features['school-mode']!;
  assert.ok(!entry.note.includes('none of them are imported by App.tsx'),
    'the registry still says the visibility functions have no caller, which is no longer true');
  assert.ok(entry.files.includes('app/renderer/src/school-mode-view.ts'),
    'the registry does not list the module that consumes the mode');
  assert.equal(entry.state, 'partial',
    'the registry claims more than this change delivered -- the one shared cross-application record is still not built');
});

test('the storage the app actually hands the view really is the one the switch writes to', () => {
  /* Guards the one mismatch that would make every render test above pass while the running
   * console did nothing: two storage handles that never see each other's writes. */
  class Probe extends (App as unknown as new (props: unknown) => {
    durableStorage: { storage: { getItem(key: string): string | null; setItem(key: string, value: string): void } };
  }) {}
  const app = new Probe({});
  assert.equal(schoolModeActive(app.durableStorage.storage), false);
  activateSchoolMode(app.durableStorage.storage);
  assert.equal(schoolModeActive(app.durableStorage.storage), true);
});
