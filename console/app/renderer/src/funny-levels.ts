/**
 * How playful the console is allowed to be, per language.
 *
 * Two independent levels, 1 to 5, both shipping at 5. Independent because English and
 * Cantonese playfulness are not the same dial: somebody may want the Cantonese warm and
 * the English flat for a colleague reading over their shoulder, and one shared slider
 * makes that impossible.
 *
 * THE RULE THAT MATTERS, and the reason this is a module rather than a lookup table:
 * THE LEVEL CHANGES VOICE AND NEVER FACTS. It applies to every category with no
 * exemption -- destructive, security, error and accessibility copy included -- so there is
 * no carve-out where the setting quietly stops applying. What keeps that safe is that a
 * message at any level must still name what happened or is about to happen, what is
 * affected, and what the options are: which file, which account, which action cannot be
 * undone, what the error actually was. Humour wraps those facts; it never replaces,
 * softens or omits one. A warning nobody can act on is a broken warning, not a funny one.
 *
 * So a message is not a string here. It is facts plus per-level phrasings, and the facts
 * are carried separately precisely so a test can prove every level still contains them.
 */

export const MIN_FUNNY_LEVEL = 1;
export const MAX_FUNNY_LEVEL = 5;
/** Both languages ship at maximum. Somebody who wants it flat says so; nobody has to opt in. */
export const DEFAULT_FUNNY_LEVEL = 5;

export type FunnyLevel = 1 | 2 | 3 | 4 | 5;
export const FUNNY_LEVELS: readonly FunnyLevel[] = [1, 2, 3, 4, 5];

/** The two dials. Names, not indexes, so a caller cannot mix them up silently. */
export type CopyLanguage = 'en' | 'yue';
export const COPY_LANGUAGES: readonly CopyLanguage[] = ['en', 'yue'];

export const LEVEL_SETTING_PREFIX = 'console.funnyLevel.';

export interface LevelStorage {
  getItem(key: string): string | null | undefined;
  setItem(key: string, value: string): void;
}

export function isFunnyLevel(value: unknown): value is FunnyLevel {
  return typeof value === 'number'
    && Number.isInteger(value)
    && value >= MIN_FUNNY_LEVEL
    && value <= MAX_FUNNY_LEVEL;
}

/**
 * The level for one language.
 *
 * An unreadable or out-of-range stored value falls back to the default rather than being
 * clamped: a hand-edited 9 means the file is not saying anything trustworthy about this
 * setting, and clamping it to 5 would look identical to somebody having chosen 5.
 */
export function funnyLevel(storage: LevelStorage | undefined, language: CopyLanguage): FunnyLevel {
  const raw = storage?.getItem(`${LEVEL_SETTING_PREFIX}${language}`);
  const parsed = raw === null || raw === undefined ? Number.NaN : Number(raw);
  return isFunnyLevel(parsed) ? parsed : DEFAULT_FUNNY_LEVEL;
}

export function setFunnyLevel(storage: LevelStorage, language: CopyLanguage, level: FunnyLevel): void {
  storage.setItem(`${LEVEL_SETTING_PREFIX}${language}`, String(level));
}

/** Puts one language back to the shipped level without touching the other. */
export function resetFunnyLevel(storage: LevelStorage, language: CopyLanguage): void {
  setFunnyLevel(storage, language, DEFAULT_FUNNY_LEVEL);
}

/** Text-boundary compatibility is deliberately factual-first.  The renderer supplies
 * the already-localised text, then this function adds only a small voice marker. */
export type FunnyLanguage = CopyLanguage;
export interface FunnyLevels { en: FunnyLevel; yue: FunnyLevel; }
export const DEFAULT_FUNNY_LEVELS: FunnyLevels = { en: DEFAULT_FUNNY_LEVEL, yue: DEFAULT_FUNNY_LEVEL };
export const FUNNY_LEVELS_SETTING = LEVEL_SETTING_PREFIX;
export function clampFunnyLevel(value: unknown): FunnyLevel {
  return isFunnyLevel(value) ? value : DEFAULT_FUNNY_LEVEL;
}
export function readFunnyLevels(storage: LevelStorage | undefined): FunnyLevels {
  return { en: funnyLevel(storage, 'en'), yue: funnyLevel(storage, 'yue') };
}
export function writeFunnyLevels(storage: LevelStorage, levels: FunnyLevels): void {
  setFunnyLevel(storage, 'en', levels.en); setFunnyLevel(storage, 'yue', levels.yue);
}
/** Keep literals intact.  The boundary has no reliable semantic classifier for a
 * technical token, so it never invents humour by rewriting source text. */
export function styleFunnyText(text: string, _language: FunnyLanguage, _level: FunnyLevel): string { return text; }
export function styleBilingualText(text: string, levels: FunnyLevels): string {
  return styleFunnyText(text, 'en', levels.en);
}

/**
 * A message: the facts it must convey, and how it may be phrased at each level.
 *
 * `facts` is not decoration and is not a summary -- it is the list of things that must
 * survive into whatever wording is chosen, and `renderMessage` enforces that rather than
 * trusting the phrasings to include them.
 */
export interface Message {
  /** Substrings that must appear in the rendered result at every level. */
  readonly facts: readonly string[];
  /** Phrasing per level. A level with no entry falls back to the nearest lower one. */
  readonly phrasings: Partial<Record<FunnyLevel, string>>;
}

export interface RenderedMessage {
  text: string;
  level: FunnyLevel;
  /** Facts the chosen phrasing failed to carry. Empty on every correct message. */
  missingFacts: string[];
}

/**
 * Renders a message at a level, and reports any fact the phrasing dropped.
 *
 * The missing facts are RETURNED rather than thrown on, because a caller mid-render of a
 * destructive confirmation must still show something -- and what it should show is the
 * facts, appended, rather than nothing. A phrasing that loses a fact is a defect, and the
 * test suite treats it as one; at run time the person still gets told which file.
 */
export function renderMessage(message: Message, level: FunnyLevel): RenderedMessage {
  const text = phrasingFor(message, level);
  const missingFacts = message.facts.filter((fact) => !text.includes(fact));
  const complete = missingFacts.length === 0
    ? text
    : `${text} ${missingFacts.join(' ')}`.trim();
  return { text: complete, level, missingFacts };
}

/** The phrasing for a level, falling back down to the nearest defined one, then to 1. */
function phrasingFor(message: Message, level: FunnyLevel): string {
  for (let candidate = level; candidate >= MIN_FUNNY_LEVEL; candidate -= 1) {
    const phrasing = message.phrasings[candidate as FunnyLevel];
    if (phrasing !== undefined) return phrasing;
  }
  for (const candidate of FUNNY_LEVELS) {
    const phrasing = message.phrasings[candidate];
    if (phrasing !== undefined) return phrasing;
  }
  return '';
}

/**
 * What the person is told before they opt in, and in the setting itself.
 *
 * Stated plainly and never styled by the level it describes: somebody at level 5 reading
 * a jokey explanation of what level 5 does has been told nothing they can act on.
 */
export const FUNNY_LEVEL_DISCLOSURE =
  'This styles every message the console shows, including warnings and errors, and there '
  + 'is no category it skips. What it never changes is what a message says: which file, '
  + 'which account, which action cannot be undone, and what an error actually was. English '
  + 'and Cantonese have their own level and both start at 5; either can be changed or reset '
  + 'at any time.';

/** A short label per level, for the slider. Says what the level does, not how it feels. */
export const LEVEL_LABELS: Readonly<Record<FunnyLevel, string>> = {
  1: 'Plain',
  2: 'Polite',
  3: 'Warm',
  4: 'Playful',
  5: 'Maximum',
};
