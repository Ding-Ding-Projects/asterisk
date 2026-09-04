/**
 * School mode, consumed.
 *
 * `school-mode.ts` has been complete and correct for some time: it decides what a
 * surface should show, in six exported functions with thirty-two tests behind them. It
 * was also reachable by nothing. `capabilityVisible`, `filterVisibleCapabilities`,
 * `effectiveLanguageMode` and `effectiveFunnyLevel` -- the four functions the mode is
 * actually named for -- had no caller outside their own tests, so turning School mode on
 * changed one status line and not one other thing on screen. Wired at one end and
 * consumed at neither, which is this repository's oldest recurring defect and the one
 * that never produces an error.
 *
 * This module is the other end. It holds no policy of its own: every decision below is
 * `school-mode.ts`'s, and everything here is the adaptation between that decision and the
 * exact seam the running console already reads. Keeping the adaptation in one file rather
 * than in six branches inside `App.tsx` is what makes the next part possible --
 * `CAPABILITY_CONSUMERS` names, for every capability in `HIDDEN_CAPABILITIES`, the
 * exported function that acts on it, and a test iterates that list rather than a
 * hand-picked example. A capability added to the canonical list with nothing consuming it
 * fails there instead of shipping as a sixth silently-inert switch.
 *
 * Two properties are worth stating because they are what make "your choices come back"
 * true rather than promised:
 *
 *  - NOTHING HERE WRITES. Every function takes the stored value as an argument or reads
 *    it, and returns what should be shown. The language you chose, the two funny levels
 *    you set and the vocabulary file you uploaded stay exactly where they were, so
 *    turning the mode off is not a restore -- there was never anything to restore.
 *  - WHEN THE MODE IS OFF, EVERY FUNCTION IS THE IDENTITY. Not "equivalent to", not
 *    "returns the same values": `schoolModeStorageView` hands back the same object,
 *    `visibleGroups` hands back the same group objects, and the language and vocabulary
 *    helpers hand back their arguments. A console with School mode off runs the code it
 *    ran before this module existed.
 *
 * And one boundary that is easy to get backwards: the mode's OWN controls are never
 * hidden. A person who cannot find the switch cannot turn it off, and the canonical
 * contract says outright that the control stays discoverable and explains itself using
 * the chosen name.
 */
import {
  HIDDEN_CAPABILITIES, SHIPPED_NAME, capabilityVisible, effectiveFunnyLevel, effectiveLanguageMode,
  filterVisibleCapabilities, schoolModeActive, schoolModeName,
  type HiddenCapability, type LanguageMode as SchoolLanguageMode, type SchoolModeStorage,
} from './school-mode';
import { LEVEL_SETTING_PREFIX, funnyLevel, type CopyLanguage } from './funny-levels';
import type { LanguageMode } from './text-boundary';

/**
 * The one storage shape everything below needs: what `LevelStorage`, `EmojiStorage`,
 * `SchoolModeStorage` and `VocabularyStorage` all already are. Declared here rather than
 * imported from one of them so this module does not privilege whichever it happened to
 * name first.
 */
export interface SettingStorage {
  getItem(key: string): string | null | undefined;
  setItem(key: string, value: string): void;
}

/* The boundary's mode names and School mode's own are different words for one thing.
 * Translating rather than re-deciding is deliberate: `effectiveLanguageMode` stays the
 * only place that knows what School mode does to a language choice. */
const TO_SCHOOL: Readonly<Record<LanguageMode, SchoolLanguageMode>> = {
  en: 'english', yue: 'cantonese', both: 'bilingual',
};
const FROM_SCHOOL: Readonly<Record<SchoolLanguageMode, LanguageMode>> = {
  english: 'en', cantonese: 'yue', bilingual: 'both',
};

/**
 * What the text boundary should actually be set to, given what the person chose.
 *
 * Forced to English while the mode is on and the caller's own value the instant it is
 * off, because that is what `effectiveLanguageMode` says; this only changes the spelling
 * of the answer.
 */
export function effectiveTextLanguageMode(
  storage: SchoolModeStorage | undefined,
  stored: LanguageMode,
): LanguageMode {
  return FROM_SCHOOL[effectiveLanguageMode(storage, TO_SCHOOL[stored])];
}

/**
 * A read-time view of the settings store in which the two funny levels answer at their
 * effective value.
 *
 * Done at the storage seam rather than at each call site on purpose. `funnyLevel()` is
 * read by `styledMessageText`, by `buildDialog`, and by anything either of those grows a
 * caller for; a filter applied at the seam reaches every one of them, including readers
 * this pass never enumerated. A filter applied at five call sites reaches five call
 * sites and silently misses the sixth.
 *
 * `setItem` passes straight through, so a real write still lands where it always did --
 * this is a lens on reading, not a write barrier. Nothing in the console writes a funny
 * level through this view; `setFunnyLevel` is handed the real storage.
 */
export function schoolModeStorageView<S extends SettingStorage>(storage: S): S | SettingStorage {
  if (!schoolModeActive(storage)) return storage;
  const levelKeys: Readonly<Record<string, CopyLanguage>> = {
    [`${LEVEL_SETTING_PREFIX}en`]: 'en',
    [`${LEVEL_SETTING_PREFIX}yue`]: 'yue',
  };
  return {
    getItem(key: string): string | null | undefined {
      const language = levelKeys[key];
      if (language === undefined) return storage.getItem(key);
      /* The stored value still passes through `effectiveFunnyLevel`, rather than being
       * replaced by a constant, so this cannot drift from what that function decides. */
      return String(effectiveFunnyLevel(storage, funnyLevel(storage, language)));
    },
    setItem(key: string, value: string): void { storage.setItem(key, value); },
  };
}

/** The uploaded dictionary, or nothing at all while the mode is on. The cached file is
 *  never cleared -- the boundary is simply not given a handle to it, so the shipped
 *  wording renders and the file is still there afterwards. */
export function vocabularyStorageFor<S>(
  storage: SchoolModeStorage | undefined,
  vocabulary: S,
): S | undefined {
  return capabilityVisible(storage, 'personalVocabulary') ? vocabulary : undefined;
}

/** Whether the startup surprise may be drawn at all this launch. */
export function dimSumSurpriseAllowed(storage: SchoolModeStorage | undefined): boolean {
  return capabilityVisible(storage, 'dimSum');
}

/**
 * What the narrator should actually be told to speak.
 *
 * Hiding the Cantonese voice picker and the two non-English narrated-language options is
 * only half of it: a narrator already set to Cantonese would otherwise keep speaking it
 * with no visible control to say so, which is worse than the control being there. The
 * settings this returns are handed to the narrator; the settings on disk are untouched,
 * so the spoken language comes back with everything else.
 *
 * Typed structurally rather than against `NarrationSettings` so this module keeps no
 * dependency on the narrator, exactly as it keeps none on the console shell.
 */
export function effectiveNarrationSettings<S extends { language: string }>(
  storage: SchoolModeStorage | undefined,
  settings: S,
): S {
  if (capabilityVisible(storage, 'language.cantonese')) return settings;
  return settings.language === 'en' ? settings : { ...settings, language: 'en' };
}

/**
 * Controls that ARE a hidden capability, by the id the design gives them.
 *
 * Data rather than conditionals, so the exhaustiveness test below has something to
 * iterate and so a seventh control joins a list instead of growing a seventh branch.
 * The two Fun sliders and the three personal-vocabulary controls; deliberately NOT the
 * rest of the Fun group (`fun_copy`, `fun_celebrate`, `fun_confetti` and the others),
 * because those are separate playful settings and `HIDDEN_CAPABILITIES` does not name
 * them. Hiding a control the canonical list does not cover would be this module
 * inventing policy, which is the one thing it must not do.
 */
export const CONTROL_CAPABILITY: Readonly<Record<string, HiddenCapability>> = {
  fun_level: 'funnyLevel.english',
  fun_level_yue: 'funnyLevel.cantonese',
  va_file: 'personalVocabulary',
  va_status: 'personalVocabulary',
  va_clear: 'personalVocabulary',
  /* The narrator's Cantonese voice picker. Easy to miss, because "language" reads as the
   * `lang_mode` control alone -- but a narrator that can be pointed at a Cantonese voice
   * is a Cantonese capability with a control of its own, and leaving it on screen would
   * be the mode hiding the written half of a language and not the spoken half. */
  nar_yue_voice: 'language.cantonese',
};

/**
 * Options that ARE a hidden capability, by control id and then by the exact label the
 * design draws.
 *
 * The language control is one control offering three languages, so hiding the control
 * would hide English too and leave nobody able to read the setting they are stuck in.
 * Two of its three options are omitted instead, which is the same rule applied one level
 * down: what is left is a real segmented control with a real selection.
 */
export const CONTROL_OPTION_CAPABILITY: Readonly<Record<string, Readonly<Record<string, HiddenCapability>>>> = {
  lang_mode: {
    '廣東話': 'language.cantonese',
    'English + 廣東話': 'language.bilingual',
  },
  /* The narrated language, by the same rule and for the same reason: what is left is
   * English, which is exactly what the narrator can say while the mode is on. */
  nar_language: {
    '廣東話': 'language.cantonese',
    Both: 'language.bilingual',
  },
};

/** Whole destinations that ARE a hidden capability, by the key the design gives them. */
export const SCREEN_CAPABILITY: Readonly<Record<string, HiddenCapability>> = {
  vocab: 'personalVocabulary',
};

/**
 * Group descriptions that describe a capability the filter removes, and what they say
 * once it is gone.
 *
 * This exists because removing the controls alone leaves the settings screen lying about
 * itself: the Narration heading still promised that "English and Cantonese voices are
 * independent" over a group with no Cantonese voice picker in it, and the Fun heading
 * still described "two independent settings" that were no longer there. A description
 * that names a control the screen does not have is a reference in exactly the sense the
 * contract omits, and it is worse than the control being present, because it cannot be
 * acted on.
 *
 * Each replacement is the original with the hidden half deleted -- the same facts, fewer
 * of them -- rather than new copy written for the occasion. `school-mode-consumed`
 * asserts that every original really does reference a hidden capability and that no
 * replacement does, so a replacement that quietly reintroduced one would fail.
 */
export const GROUP_DESCRIPTION_WHILE_HIDDEN: Readonly<Record<string, string>> = {
  Language: 'Which language the console speaks. Technical identifiers -- codecs, config keys, '
    + 'section names, SIP URIs -- stay literal, because they have to survive being read back and typed.',
  Fun: 'Settings that style how the console words things, without changing what it says.',
  Narration: 'An off-by-default spoken narrator for app events. Quiet and screen-reader states suppress speech.',
};

/**
 * The one group whose description may name the hidden capabilities: the mode's own.
 *
 * A switch that hides things has to be able to say what it hides, or nobody can decide
 * whether to turn it on -- and the contract keeps the control discoverable and explaining
 * itself by name for exactly that reason. Named here rather than left as an unexplained
 * gap in the scan, so it reads as a decision rather than as something missed.
 */
export const SELF_DESCRIBING_GROUPS: ReadonlySet<string> = new Set(['School mode']);

export interface CapabilityControl {
  id?: string;
  value?: unknown;
  options?: readonly string[];
}

export interface CapabilityGroup {
  title?: string;
  desc?: string;
  ctls?: readonly CapabilityControl[];
}

/**
 * A settings screen's groups with every hidden capability omitted.
 *
 * Omitted, never disabled: the returned array is shorter, and a control that is gone
 * cannot be tabbed to, searched for, read aloud, or tapped and then explained away in
 * front of whoever the mode was turned on for.
 *
 * A group left holding nothing is dropped too. A heading reading "Personal vocabulary"
 * over an empty box is a reference to the capability, and the contract omits references
 * as well as controls. A group that shipped empty in the first place is left alone --
 * this drops groups this filter emptied, not groups that were always that way.
 */
export function visibleGroups<G extends CapabilityGroup>(
  storage: SchoolModeStorage | undefined,
  groups: readonly G[],
): G[] {
  const active = schoolModeActive(storage);
  const out: G[] = [];
  for (const group of groups) {
    /* The rename applies whether or not the mode is on, so this runs before the early
     * exit below rather than inside the suppression branch: a person who renamed the mode
     * and then turned it off must still not be shown the shipped name. */
    const renamed = renamedGroup(storage, group);
    if (!active) { out.push(renamed); continue; }
    const ctls = renamed.ctls;
    if (ctls === undefined) { out.push(renamed); continue; }
    const kept = filterVisibleCapabilities(storage, ctls, (ctl) => {
      const id = ctl.id;
      return id === undefined ? null : CONTROL_CAPABILITY[id] ?? null;
    }).map((ctl) => visibleControl(storage, ctl));
    if (ctls.length > 0 && kept.length === 0) continue;
    const changed = kept.length !== ctls.length || kept.some((ctl, index) => ctl !== ctls[index]);
    const desc = changed && group.title !== undefined && GROUP_DESCRIPTION_WHILE_HIDDEN[group.title] !== undefined
      ? GROUP_DESCRIPTION_WHILE_HIDDEN[group.title]
      : renamed.desc;
    out.push({ ...renamed, ctls: kept, desc });
  }
  return out;
}

/**
 * One group with the shipped mode name replaced by the chosen one.
 *
 * The design authors the group heading as the literal `School mode`, so a rename that
 * changed every message and left that heading alone would put the shipped name back on
 * screen at the top of the very group that renamed it. Keyed off the shipped name so a
 * console nobody has renamed is handed back its own object unchanged.
 */
function renamedGroup<G extends CapabilityGroup>(storage: SchoolModeStorage | undefined, group: G): G {
  if (group.title !== SHIPPED_NAME) return group;
  const chosen = schoolModeName(storage);
  return chosen === SHIPPED_NAME ? group : { ...group, title: chosen };
}

/**
 * One control with its unavailable options omitted.
 *
 * If the value the control was declared with is one of the omitted options, it becomes
 * the first surviving option. A segmented control whose selection is not among its
 * buttons renders with nothing highlighted, which reads as a rendering fault rather than
 * as a setting -- and the console really is showing English at that moment, so English
 * is also the honest answer.
 */
function visibleControl<C extends CapabilityControl>(
  storage: SchoolModeStorage | undefined,
  control: C,
): C {
  const id = control.id;
  const table = id === undefined ? undefined : CONTROL_OPTION_CAPABILITY[id];
  if (table === undefined || control.options === undefined) return control;
  const options = filterVisibleCapabilities(storage, control.options, (option) => table[option] ?? null);
  if (options.length === control.options.length) return control;
  const value = typeof control.value === 'string' && !options.includes(control.value)
    ? options[0] ?? control.value
    : control.value;
  return { ...control, options, value };
}

/**
 * The label a control should show for a value that is currently being overridden.
 *
 * The live value of a bound control lives in component state rather than in the control
 * declaration, so filtering the options alone would leave a stale `廣東話` selected
 * against a set of buttons that no longer contains it. This gives the caller the label
 * to put in its place -- in component state only. What is persisted is untouched, which
 * is the whole reason the choice comes back.
 */
export function visibleControlValue<C extends CapabilityControl>(
  storage: SchoolModeStorage | undefined,
  control: C,
  stored: string,
): string {
  const id = control.id;
  const table = id === undefined ? undefined : CONTROL_OPTION_CAPABILITY[id];
  if (table === undefined || control.options === undefined) return stored;
  const capability = table[stored];
  /* The stored option is not a hidden capability at all, or it is one that is still
   * visible: either way the person's own choice is what shows. */
  if (capability === undefined || capabilityVisible(storage, capability)) return stored;
  const options = filterVisibleCapabilities(storage, control.options, (option) => table[option] ?? null);
  return options[0] ?? stored;
}

/** The destination keys that must not appear in the rail, the palette or a tab strip. */
export function hiddenScreenKeys(storage: SchoolModeStorage | undefined): string[] {
  return Object.keys(SCREEN_CAPABILITY)
    .filter((key) => !capabilityVisible(storage, SCREEN_CAPABILITY[key]!));
}

/**
 * The exact user-facing strings by which those destinations are listed.
 *
 * The compiled shell builds its rail from each screen's `label` and its palette from
 * each screen's `title`, and neither entry carries the key it came from -- so the strings
 * are read back out of the same table the shell reads them from rather than typed here,
 * where a design rename would strand them silently.
 */
export function hiddenScreenStrings(
  storage: SchoolModeStorage | undefined,
  screens: Readonly<Record<string, { label?: string; title?: string } | undefined>>,
): Set<string> {
  const out = new Set<string>();
  for (const key of hiddenScreenKeys(storage)) {
    const screen = screens[key];
    if (screen?.label !== undefined) out.add(screen.label);
    if (screen?.title !== undefined) out.add(screen.title);
  }
  return out;
}

/** Drops rail sections, palette rows or tab entries that name a hidden destination. */
export function withoutHiddenEntries<T extends { label?: string }>(
  hidden: ReadonlySet<string>,
  entries: readonly T[],
): T[] {
  if (hidden.size === 0) return entries.slice();
  return entries.filter((entry) => entry.label === undefined || !hidden.has(entry.label));
}

/**
 * Every capability in the canonical list, and the exported function here that acts on it.
 *
 * This is the inventory the exhaustiveness test iterates. It exists because the defect
 * this whole module repairs was not a wrong decision anywhere -- `school-mode.ts` decided
 * correctly the entire time -- it was a decision nobody read. A capability whose row
 * names a function that is not exported, or a capability with no row at all, fails the
 * test rather than shipping as another inert switch.
 */
export const CAPABILITY_CONSUMERS: Readonly<Record<HiddenCapability, readonly string[]>> = {
  'language.cantonese': ['effectiveTextLanguageMode', 'effectiveNarrationSettings', 'visibleGroups'],
  'language.bilingual': ['effectiveTextLanguageMode', 'effectiveNarrationSettings', 'visibleGroups'],
  'funnyLevel.english': ['schoolModeStorageView', 'visibleGroups'],
  'funnyLevel.cantonese': ['schoolModeStorageView', 'visibleGroups'],
  personalVocabulary: ['vocabularyStorageFor', 'visibleGroups', 'hiddenScreenKeys'],
  dimSum: ['dimSumSurpriseAllowed'],
};

/** Every capability the canonical list names, so a caller can iterate without importing
 *  two modules to do it. Re-exported rather than copied: a copy drifts. */
export const CONSUMED_CAPABILITIES: readonly HiddenCapability[] = HIDDEN_CAPABILITIES;
