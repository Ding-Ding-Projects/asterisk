#!/usr/bin/env node
/**
 * Deliberate red-then-green proof for tests/ui/school-mode-consumed.test.tsx.
 *
 * This feature is the reason this repository keeps writing these scripts. School mode's
 * decision module has been complete and correct, with thirty-two passing tests, for as
 * long as it has existed -- and for that whole time turning School mode on changed one
 * status line and nothing else, because nothing called it. Every assertion passed. The
 * suite was green. A reviewer reading `school-mode.ts` would have found nothing wrong,
 * because there was nothing wrong with it.
 *
 * So the consumption test asserts nothing about the decision and everything about the
 * wiring, and this file is what says that test would actually notice if the wiring came
 * out again. Each case below is one line whose removal would restore the exact defect
 * this change repairs, and each has to turn the test red on its own.
 *
 * One break at a time, always. Breaking three things and watching five assertions fail
 * proves only that something among them is watched.
 *
 * Every break edits a real file on disk, because that is the only way to exercise a test
 * that reads its subject off the filesystem and imports it. Two properties keep that safe:
 *
 *   - the original bytes are restored in a `finally`, and the restore is verified rather
 *     than assumed, so an interrupted run cannot leave a planted break behind;
 *   - a break whose replacement did not change the bytes is reported as a FAILED CASE
 *     rather than counted as a pass. An edit that never landed reads exactly like a guard
 *     that held, and it is the commonest way to fake a green.
 *
 * Usage:  node scripts/negative-school-mode-consumed.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..', '..');
const consoleRoot = resolve(repo, 'console');
const TEST = 'tests/ui/school-mode-consumed.test.tsx';

const file = (relative) => resolve(consoleRoot, relative);
const APP = file('app/renderer/src/App.tsx');
const VIEW = file('app/renderer/src/school-mode-view.ts');
const DIMSUM = file('app/renderer/src/DimSumSurprise.tsx');
const REGISTRY = file('app/feature-registry.json');

/**
 * Replaces `from` with `to` exactly once, refusing anything that is not exactly once.
 *
 * Anchors are written with `\n` and rewritten to whatever the file on disk actually uses.
 * Parts of this checkout are CRLF, and a newline-only anchor against a CRLF file matches
 * nothing at all -- which, without the exactly-once check below, would read as a guard
 * that held rather than as a break that never happened.
 */
const swap = (path, from, to) => () => {
  const before = readFileSync(path, 'utf8');
  const eol = before.includes('\r\n') ? '\r\n' : '\n';
  from = from.split('\n').join(eol);
  to = to.split('\n').join(eol);
  const occurrences = before.split(from).length - 1;
  if (occurrences !== 1) {
    throw new Error(`the break anchor appears ${occurrences} time(s), not once: ${JSON.stringify(from.slice(0, 70))}`);
  }
  return { path, before, after: before.split(from).join(to) };
};

/**
 * Each case is one lie, and the comment beside it is the defect it stands for -- the
 * thing that would ship, silently, if the assertion it trips were deleted.
 */
const cases = [
  /* ---- the seams. Each of these is a line that, removed, returns the feature to
   * deciding correctly and reaching nothing. ---- */

  ['the message pipeline reads funny levels straight from storage again',
    swap(APP, 'return schoolModeStorageView(this.durableStorage.storage) as MessageStorage;',
      'return this.durableStorage.storage as MessageStorage;')],

  ['the vocabulary handle is given to the boundary on mount regardless of the mode',
    swap(APP, 'setVocabularyStorage(vocabularyStorageFor(this.durableStorage.storage, this.vocabStorage));',
      'setVocabularyStorage(this.vocabStorage);')],

  // Commented out rather than deleted, because that is how a wiring line usually dies --
  // and because a bare substring needle is satisfied by the comment.
  ['turning the mode on no longer applies it, only announces it',
    swap(APP, '     * exactly the state this console shipped in. */\n      this.applySchoolMode();',
      '     * exactly the state this console shipped in. */\n      // this.applySchoolMode();')],

  ['a rejected unlock attempt stops re-applying the mode',
    swap(APP, '    this.applySchoolMode(values);', '    this.setState({ values } as never);')],

  ['a restored session no longer applies the mode at startup',
    swap(APP, '     * it to English without disturbing the stored value that was read a line above. */\n    this.applySchoolMode();',
      '     * it to English without disturbing the stored value that was read a line above. */')],

  ['the text boundary is set from the stored language rather than the effective one',
    swap(APP, 'setLanguageMode(effectiveTextLanguageMode(storage, stored));', 'setLanguageMode(stored);')],

  ['the vocabulary handle survives the mode being turned on',
    swap(APP, 'setVocabularyStorage(vocabularyStorageFor(storage, this.vocabStorage));',
      'setVocabularyStorage(this.vocabStorage);')],

  ['a narrator already speaking Cantonese keeps speaking it when the mode goes on',
    swap(APP, '    this.narrator.setSettings(effectiveNarrationSettings(storage, this.narration));\n', '')],

  ['a narration control change reaches the narrator unfiltered',
    swap(APP, 'this.narrator.setSettings(effectiveNarrationSettings(this.durableStorage.storage, next));',
      'this.narrator.setSettings(next);')],

  ['a restored narration profile reaches the narrator unfiltered',
    swap(APP, 'this.narrator.setSettings(effectiveNarrationSettings(this.durableStorage.storage, this.narration));',
      'this.narrator.setSettings(this.narration);')],

  ['the screen about to render is no longer filtered',
    swap(APP, '    this.prepareSchoolModeScreen(screen);', '    // this.prepareSchoolModeScreen(screen);')],

  ['the rail and the palette keep listing a hidden destination',
    swap(APP, 'if (Array.isArray(entries)) values[key] = withoutHiddenEntries(hiddenScreens, entries as { label?: string }[]);',
      'if (Array.isArray(entries)) values[key] = entries;')],

  ['a screen whose groups are rebuilt every render drops out of the covered set',
    swap(APP, "new Set(['servers', LOCAL_HISTORY_SCREEN_ID]);", 'new Set([LOCAL_HISTORY_SCREEN_ID]);')],

  /* ---- the startup surprise ---- */

  ['the startup surprise stops asking whether it may fire',
    swap(DIMSUM, '      if (!dimSumSurpriseAllowed(storageHandle.storage)) return;\n', '')],

  // Still asked, but after the one first launch this feature is allowed has been spent --
  // so the surprise is gone the first time the mode is off, and nothing says why.
  ['the startup surprise asks only after it has already spent the launch',
    swap(DIMSUM, '      if (!dimSumSurpriseAllowed(storageHandle.storage)) return;\n      /* Consumed only once',
      '      /* Consumed only once')],

  /* ---- the filters themselves ---- */

  ['the English fun slider is no longer a hidden capability',
    swap(VIEW, "  fun_level: 'funnyLevel.english',\n", '')],

  ['the Cantonese narration voice picker is no longer a hidden capability',
    swap(VIEW, "  nar_yue_voice: 'language.cantonese',\n", '')],

  ['the narrated-language picker keeps offering Cantonese',
    swap(VIEW, "  nar_language: {\n    '廣東話': 'language.cantonese',\n    Both: 'language.bilingual',\n  },\n", '')],

  ['the vocabulary destination is no longer a hidden destination',
    swap(VIEW, "  vocab: 'personalVocabulary',\n", '')],

  ['an emptied group keeps its heading, so the capability is still named on screen',
    swap(VIEW, '    if (ctls.length > 0 && kept.length === 0) continue;\n', '')],

  // The shape a lazy implementation fakes: everything is still returned, so nothing is
  // actually omitted, and only a test that checks the item is GONE would notice.
  ['controls are returned unfiltered instead of omitted',
    swap(VIEW, '    const kept = filterVisibleCapabilities(storage, ctls, (ctl) => {\n'
      + '      const id = ctl.id;\n'
      + '      return id === undefined ? null : CONTROL_CAPABILITY[id] ?? null;\n'
      + '    }).map((ctl) => visibleControl(storage, ctl));',
      '    const kept = ctls.map((ctl) => visibleControl(storage, ctl));')],

  ['a group that lost a control keeps the description written for the version that had it',
    swap(VIEW, '      ? GROUP_DESCRIPTION_WHILE_HIDDEN[group.title]\n      : renamed.desc;', '      ? renamed.desc\n      : renamed.desc;')],

  ['a renamed mode still shows the shipped name at the top of its own group',
    swap(VIEW, '  if (group.title !== SHIPPED_NAME) return group;', '  return group;\n  if (group.title !== SHIPPED_NAME) return group;')],

  ['the storage view wraps the store even when the mode is off',
    swap(VIEW, '  if (!schoolModeActive(storage)) return storage;\n', '')],

  ['the narrator settings handed in are mutated rather than copied',
    swap(VIEW, "  return settings.language === 'en' ? settings : { ...settings, language: 'en' };",
      "  if (settings.language !== 'en') settings.language = 'en';\n  return settings;")],

  ['a filtered control keeps a selection that is no longer one of its buttons',
    swap(VIEW, '  const value = typeof control.value === \'string\' && !options.includes(control.value)\n'
      + '    ? options[0] ?? control.value\n'
      + '    : control.value;', '  const value = control.value;')],

  ['the palette keeps listing a hidden destination by its title',
    swap(VIEW, '    if (screen?.title !== undefined) out.add(screen.title);\n', '')],

  ['nothing is actually removed from a list of rail or palette rows',
    swap(VIEW, '  if (hidden.size === 0) return entries.slice();', '  return entries.slice();')],

  ['a capability drops out of the consumer inventory entirely',
    swap(VIEW, "  dimSum: ['dimSumSurpriseAllowed'],\n", '')],

  /* ---- the record a later pass plans against ---- */

  ['the registry claims more than this change delivered',
    swap(REGISTRY, '"school-mode": {\n      "state": "partial",', '"school-mode": {\n      "state": "implemented",')],

  ['the registry still says the visibility functions have no caller',
    swap(REGISTRY, 'CORRECTED 2026-08-26: the gap',
      'CORRECTED 2026-08-26: none of them are imported by App.tsx. The gap')],
];

const runTest = () => {
  try {
    execFileSync('npx', ['tsx', '--test', TEST], { cwd: consoleRoot, stdio: 'pipe', shell: true });
    return 'green';
  } catch {
    return 'red';
  }
};

const baseline = runTest();
if (baseline !== 'green') {
  console.error('FAIL: the untouched contract test is already red, so nothing below would mean anything.');
  process.exit(1);
}

let failures = 0;
for (const [name, plant] of cases) {
  let planted;
  try {
    planted = plant();
  } catch (error) {
    console.error(`FAILED CASE  ${name}: ${error.message}`);
    failures += 1;
    continue;
  }
  if (planted.after === planted.before) {
    /* The break that never landed. It reads exactly like a guard that held, so it is a
     * failure of this script rather than a pass for the test. */
    console.error(`FAILED CASE  ${name}: the replacement changed no bytes, so nothing was broken`);
    failures += 1;
    continue;
  }

  let broken;
  try {
    writeFileSync(planted.path, planted.after);
    broken = runTest();
  } finally {
    writeFileSync(planted.path, planted.before);
    if (readFileSync(planted.path, 'utf8') !== planted.before) {
      console.error(`FAILED CASE  ${name}: the original bytes were NOT restored -- repair this file by hand`);
      process.exit(1);
    }
  }

  const restored = runTest();
  const ok = broken === 'red' && restored === 'green';
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  broke=${broken.padEnd(5)} restored=${restored.padEnd(5)}  ${name}`);
}

if (failures > 0) {
  console.error(`FAIL: ${failures} of ${cases.length} planted break(s) did not turn the contract test red and green again.`);
  process.exit(1);
}
console.log(`PASS: ${cases.length} planted break(s), each alone, each turning `
  + `${TEST} red and then green again on restore.`);
