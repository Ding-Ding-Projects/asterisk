/**
 * The one place a user-facing string is transformed before it reaches the screen.
 *
 * Two features need this boundary and neither had one. Language modes (English,
 * playful Hong Kong Cantonese, bilingual) did not exist in the app at all. The
 * personal-vocabulary loader did exist, was validated, cached and covered by a
 * dozen assertions -- and was consumed by nothing: `applyVocabularyText` had no
 * caller outside its own tests, so an uploaded file changed the validation status
 * line and not one rendered word. Wired at one end and consumed at neither.
 *
 * Rather than add a second boundary beside a dead one, both run here, in order:
 * the language mode chooses the wording, then the personal vocabulary rewrites
 * terms inside whatever that produced. That order is deliberate -- a personal
 * replacement is the last word on what a term is called, so it must not be
 * undone by a translation applied afterwards.
 *
 * The renderer is compiled from the design and must never be hand-edited, so
 * nothing here reaches into generated code. Instead `h` (the element factory the
 * whole generated tree is built from) is wrapped, and every string child and
 * every human-readable attribute passes through on its way out.
 *
 * WHAT IS DELIBERATELY NOT TRANSLATED: the catalog is keyed by the exact English
 * string, so a string nobody has translated renders unchanged. That is the safe
 * direction and it is the whole reason for keying this way -- an endpoint name, a
 * codec, a file path, a SHA, an Asterisk section name, an IP address or a command
 * cannot accidentally match a catalog entry, because none of them were put in it.
 * A missing translation is visible as English, never as a placeholder or a guess.
 */
import { createElement, type ReactNode } from 'react';

import { applyVocabularyText, type VocabularyStorage } from './personal-vocabulary';
import { funnyLevel, styleFunnyText, type CopyLanguage } from './funny-levels';
export {
  clampFunnyLevel,
  DEFAULT_FUNNY_LEVELS,
  FUNNY_LEVELS_SETTING,
  MAX_FUNNY_LEVEL,
  MIN_FUNNY_LEVEL,
  readFunnyLevels,
  styleBilingualText,
  styleFunnyText,
  writeFunnyLevels,
  type FunnyLanguage,
  type FunnyLevels,
} from './funny-levels';

export const LANGUAGE_MODES = ['en', 'yue', 'both'] as const;
export type LanguageMode = (typeof LANGUAGE_MODES)[number];

export const LANGUAGE_MODE_LABELS: Record<LanguageMode, string> = {
  en: 'English',
  yue: '廣東話',
  both: 'English + 廣東話',
};

export function isLanguageMode(value: unknown): value is LanguageMode {
  return typeof value === 'string' && (LANGUAGE_MODES as readonly string[]).includes(value);
}

/**
 * English source string to its Cantonese counterpart.
 *
 * Keyed by the exact string the design renders, so adding a translation never
 * requires touching generated code. Technical identifiers stay literal inside a
 * translated sentence for the same reason they stay literal everywhere else: the
 * reader has to be able to type them.
 */
export type Catalog = Readonly<Record<string, string>>;

let catalog: Catalog = {};
let mode: LanguageMode = 'en';
let vocabulary: VocabularyStorage | undefined;
let schoolModeNameProvider: ((text: string) => string) | undefined;

export function setCatalog(next: Catalog): void {
  catalog = next;
}

export function setLanguageMode(next: LanguageMode): void {
  mode = next;
}

export function languageMode(): LanguageMode {
  return mode;
}

/** Wires the vocabulary cache in. Until this is called, vocabulary is simply not applied. */
export function setVocabularyStorage(storage: VocabularyStorage | undefined): void {
  vocabulary = storage;
}

/** Lets a shared renamed School mode label reach visible copy and accessible names. */
export function setSchoolModeNameProvider(provider: ((text: string) => string) | undefined): void {
  schoolModeNameProvider = provider;
}

/** The separator between the two halves of a bilingual string. */
export const BILINGUAL_SEPARATOR = ' · ';

/**
 * Chooses the wording for one string under the active mode.
 *
 * Bilingual keeps the English primary and appends the Cantonese, which is what
 * stops a bilingual label from reading as a different control. A string with no
 * translation is returned unchanged in every mode -- including bilingual, where
 * appending a separator and nothing after it would look like a rendering fault.
 */
export function localizeText(text: string): string {
  if (mode === 'en') return text;
  const translated = catalog[text];
  if (translated === undefined) return text;
  return mode === 'yue' ? translated : `${text}${BILINGUAL_SEPARATOR}${translated}`;
}

/** The full boundary: language mode, then personal vocabulary over the result. */
export function transformText(text: string): string {
  const localized = localizeText(text);
  const language: CopyLanguage = mode === 'yue' ? 'yue' : 'en';
  /* Voice styling happens before vocabulary.  Vocabulary is the user's final local
   * naming choice, while unknown/technical literals remain untouched by the no-op
   * factual styler above. */
  const styled = styleFunnyText(localized, language, funnyLevel(vocabulary, language));
  const renamed = schoolModeNameProvider ? schoolModeNameProvider(styled) : styled;
  return vocabulary ? applyVocabularyText(vocabulary, { text: renamed, boundary: 'user-interface-copy' }) : renamed;
}

export interface LocalizedEventText {
  enText: string;
  yueText: string;
  bilingualText: string;
  translated: boolean;
}

/** Split an event into independent language tracks before funny styling or speech. */
export function localizeEventText(text: string, rename: (value: string) => string = (value) => value): LocalizedEventText {
  const separator = BILINGUAL_SEPARATOR;
  const source = text.includes(separator) ? text.slice(0, text.indexOf(separator)) : text;
  const yueText = catalog[source] ?? source;
  return { enText: rename(source), yueText: rename(yueText), bilingualText: `${rename(source)}${separator}${rename(yueText)}`, translated: catalog[source] !== undefined };
}

/**
 * Attributes carrying text a person reads or hears.
 *
 * `aria-label` and `title` are here because an accessible name is user-facing
 * text: a screen-reader user who has chosen Cantonese has chosen it for the whole
 * interface, not for the parts that happen to be visible. `value` is absent on
 * purpose -- it is the control's data, and translating it would rewrite what the
 * person typed or what the target reported.
 */
export const TEXT_ATTRIBUTES = ['aria-label', 'title', 'placeholder', 'alt', 'aria-placeholder'] as const;

const isPlainText = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '';

/**
 * `h`, with every string child and human-readable attribute passed through the
 * boundary. Drop-in for `createElement`: same signature, same return.
 */
export function localizedCreateElement(
  type: Parameters<typeof createElement>[0],
  props?: Record<string, unknown> | null,
  ...children: ReactNode[]
): ReactNode {
  const nextProps = localizeProps(props);
  if (children.length === 0) return createElement(type as never, nextProps as never);
  return createElement(type as never, nextProps as never, ...children.map(localizeChild));
}

function localizeProps(props: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!props) return props ?? null;
  let copy: Record<string, unknown> | undefined;
  for (const attribute of TEXT_ATTRIBUTES) {
    const value = props[attribute];
    if (!isPlainText(value)) continue;
    const next = transformText(value);
    if (next === value) continue;
    copy ??= { ...props };
    copy[attribute] = vocabulary
      ? applyVocabularyText(vocabulary, { text: next, boundary: 'accessible-name' })
      : next;
  }
  return copy ?? props;
}

function localizeChild(child: ReactNode): ReactNode {
  if (typeof child === 'string') return child.trim() === '' ? child : transformText(child);
  if (Array.isArray(child)) return child.map(localizeChild);
  return child;
}
