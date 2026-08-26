/**
 * Independent voice controls for English and Hong Kong Cantonese copy.
 *
 * The levels change the wrapper around a message, never the facts inside it.
 * Keeping this as a pure module makes the same policy usable by notifications,
 * dialogs and narration without teaching each caller its own joke rules.
 */

export type FunnyLanguage = 'en' | 'yue';

export interface FunnyLevels {
  en: number;
  yue: number;
}

export const MIN_FUNNY_LEVEL = 1;
export const MAX_FUNNY_LEVEL = 5;
export const DEFAULT_FUNNY_LEVELS: Readonly<FunnyLevels> = Object.freeze({ en: 5, yue: 5 });
export const FUNNY_LEVELS_SETTING = 'console.funnyLevels';

export interface FunnyStorage {
  getItem(key: string): string | null | undefined;
  setItem(key: string, value: string): void;
}

export function clampFunnyLevel(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return MAX_FUNNY_LEVEL;
  return Math.min(MAX_FUNNY_LEVEL, Math.max(MIN_FUNNY_LEVEL, Math.round(numeric)));
}

export function readFunnyLevels(storage: FunnyStorage | undefined): FunnyLevels {
  const raw = storage?.getItem(FUNNY_LEVELS_SETTING);
  if (!raw) return { ...DEFAULT_FUNNY_LEVELS };
  try {
    const parsed = JSON.parse(raw) as { en?: unknown; yue?: unknown };
    return { en: clampFunnyLevel(parsed.en), yue: clampFunnyLevel(parsed.yue) };
  } catch {
    return { ...DEFAULT_FUNNY_LEVELS };
  }
}

export function writeFunnyLevels(storage: FunnyStorage, levels: Partial<FunnyLevels>): FunnyLevels {
  const next = {
    en: clampFunnyLevel(levels.en ?? readFunnyLevels(storage).en),
    yue: clampFunnyLevel(levels.yue ?? readFunnyLevels(storage).yue),
  };
  storage.setItem(FUNNY_LEVELS_SETTING, JSON.stringify(next));
  return next;
}

/**
 * Style a message while preserving the supplied factual sentence byte-for-byte.
 * Level 1 is plain. Higher levels add a bounded, local wrapper only.
 */
export function styleFunnyText(text: string, language: FunnyLanguage, level: unknown): string {
  const value = clampFunnyLevel(level);
  if (value <= 1 || text.trim() === '') return text;
  if (language === 'yue') {
    const suffix = value >= 5 ? '，順手搞掂喇。' : '，搞掂喇。';
    return text.endsWith('。') || text.endsWith('.') ? `${text.slice(0, -1)}${suffix}` : `${text}${suffix}`;
  }
  const suffix = value >= 5 ? ' Nicely sorted.' : ' Done and dusted.';
  return text.endsWith('.') ? `${text.slice(0, -1)}${suffix}` : `${text}${suffix}`;
}

export function styleBilingualText(text: string, levels: FunnyLevels): string {
  const separator = ' · ';
  const [english, cantonese] = text.split(separator, 2);
  if (cantonese === undefined) return styleFunnyText(text, 'en', levels.en);
  return `${styleFunnyText(english!, 'en', levels.en)}${separator}${styleFunnyText(cantonese, 'yue', levels.yue)}`;
}
