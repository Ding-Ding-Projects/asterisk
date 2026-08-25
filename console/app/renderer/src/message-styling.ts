/**
 * Where funny-levels and dialog-emojis actually reach the screen.
 *
 * Both modules were correct and fully tested in isolation, and neither was ever called.
 * `renderMessage` had no caller outside its own test file, and the same was true of
 * `buildDialog` -- so a console at level 5 with emoji switched on read exactly like a
 * console at level 1 with emoji switched off, because nothing sat between the two
 * settings and the three real dialog surfaces the shell exposes: `fire` (a celebratory
 * title/body popup), `toast` (a single-line message box) and `areYouSure` (a
 * confirmation gate). This module is that missing seam.
 *
 * DESIGN, in order:
 *
 * 1. `styledMessageText` builds a `Message` on the fly from whatever raw copy a call
 *    site already produces -- "Connection added", "That name will not work", a git
 *    command's own confirmation body -- and renders it through the real
 *    `renderMessage`. The raw text is the message's own single fact, so it is always a
 *    literal substring of every phrasing this module writes; even if that guarantee
 *    were ever violated, `renderMessage` appends whatever went missing rather than
 *    silently dropping it. Nothing here re-implements the survives-every-level rule --
 *    it is inherited from the module that already owns it.
 *
 * 2. Two independent framing tables, one per `CopyLanguage`, escalate from unchanged
 *    (levels 1-2) to increasingly playful asides (levels 3-5). The asides are appended,
 *    never inserted into or over the original text, so a person cannot lose the file
 *    name, the account, or the reason by turning the dial up.
 *
 * 3. `styledDialog` layers `buildDialog`'s emoji decoration on top of the funny-level
 *    text, so both settings genuinely compose: turning the level up changes the words,
 *    turning emoji on adds one mark at the front, and neither one can silently cancel
 *    the other out.
 *
 * WHICH LANGUAGE APPLIES, and why: dialog copy in this console is always written in
 * English at the call site -- there is no Cantonese catalog entry for dynamic dialog
 * text, so the language-mode boundary (`text-boundary.ts`) never translates it. Rather
 * than leaving the Cantonese dial permanently inert for the one surface it is meant to
 * govern, the dial that applies is chosen from the console's current language mode: the
 * Cantonese slider frames the message once the console is in Cantonese or bilingual
 * mode, in real Hong Kong Cantonese, appended after the English fact it is commenting
 * on -- exactly the code-switching a bilingual reader actually produces, and never a
 * substitute for it.
 */
import {
  FUNNY_LEVELS, funnyLevel, renderMessage,
  type CopyLanguage, type FunnyLevel, type LevelStorage, type Message,
} from './funny-levels';
import { buildDialog, decorateDialogText, type DialogKind, type EmojiStorage } from './dialog-emojis';

export type MessageStorage = LevelStorage & EmojiStorage;

type Frame = (text: string) => string;

/**
 * English framing, keyed by level. 1 and 2 are the text itself -- "fully professional"
 * and "polite" both mean nobody wrote a joke on top of the message -- and 3 through 5
 * append a progressively louder aside about the SYSTEM's own reaction, never about the
 * user or what they did. That boundary is what keeps a level-5 error respectful: the
 * console may be delighted or dramatic about an outcome, but it never mocks the person
 * reading it.
 */
const FRAME_EN: Readonly<Record<FunnyLevel, Frame>> = {
  1: (t) => t,
  2: (t) => t,
  3: (t) => `${t} Noted, and nothing dramatic.`,
  4: (t) => `${t} Consider it handled, with a small flourish.`,
  5: (t) => `${t} Handled -- and yes, a tiny party happened in here about it.`,
};

/**
 * Cantonese framing. Written as real, colloquial Hong Kong Cantonese rather than a
 * transliteration of the English column, because the whole point of an independent
 * Cantonese dial is that the two languages are allowed to sound different, not just be
 * different strings. Respectful at every level: the aside is always about the console's
 * own reaction, never about the reader.
 */
const FRAME_YUE: Readonly<Record<FunnyLevel, Frame>> = {
  1: (t) => t,
  2: (t) => t,
  3: (t) => `${t} 已經記低咗，冇咩大件事。`,
  4: (t) => `${t} 搞掂喇，仲順手加咗個靚彎。`,
  5: (t) => `${t} 搞掂！入面偷偷開咗個小型慶功會，你淨係未收到請帖啫。`,
};

function frameFor(language: CopyLanguage, level: FunnyLevel): Frame {
  return (language === 'yue' ? FRAME_YUE : FRAME_EN)[level];
}

/**
 * Builds a `Message` out of raw call-site text: the text is the sole fact, and every
 * level's phrasing is that same text with the language- and level-appropriate frame
 * appended. Exported so a test can assert this exact construction rather than only the
 * string it produces.
 */
export function buildLevelMessage(language: CopyLanguage, text: string): Message {
  const phrasings: Partial<Record<FunnyLevel, string>> = {};
  for (const level of FUNNY_LEVELS) phrasings[level] = frameFor(language, level)(text);
  return { facts: [text], phrasings };
}

/** The dial that governs dialog copy in the console's current display language.
 *  Dialog text itself is always written in English at the call site (there is no
 *  Cantonese catalog entry for it), so this chooses which independently-stored level to
 *  apply to it -- not which language the base text is written in. */
export function copyLanguageFor(mode: 'en' | 'yue' | 'both'): CopyLanguage {
  return mode === 'en' ? 'en' : 'yue';
}

/** Renders one piece of dialog copy through the real funny-level pipeline. Empty text
 *  (an absent `plain` explainer, an omitted body) is returned unchanged rather than
 *  gaining a frame with nothing to frame. */
export function styledMessageText(
  storage: MessageStorage | undefined,
  language: CopyLanguage,
  text: string,
): string {
  if (text.trim() === '') return text;
  const level = funnyLevel(storage, language);
  return renderMessage(buildLevelMessage(language, text), level).text;
}

/**
 * A best-effort classification of a dialog's heading, used only where the calling code
 * genuinely has no better source of truth (`fire`, `toast`, `showInfo` all receive a
 * bare title/body pair with no category attached). `areYouSure` does not use this --
 * every one of its call sites is a confirmation gate, so it is always 'question'.
 *
 * This mirrors a pattern the compiled shell's own generated `setVal` already uses (a
 * regex over the control id and label to decide whether a change reads as a security
 * improvement or a regression) rather than inventing a new one: matching on the words a
 * title already tends to contain is how this codebase classifies free-form copy
 * elsewhere too.
 */
export function classifyDialogKind(title: string): DialogKind {
  const t = title.trim();
  if (t.endsWith('?')) return 'question';
  if (/^(not\b|no\b|nothing\b)/i.test(t)
    || /will not work|refused|rejected|did not|could not|not (added|removed|connected|created|installed|found|loaded|done|exported|applied)/i.test(t)) {
    return 'error';
  }
  if (/warn|reduction in security/i.test(t)) return 'warning';
  if (/^(starting|creating|deploying|installing)/i.test(t) || t.endsWith('…')) return 'progress';
  if (t === '') return 'info';
  return 'success';
}

export interface StyledHeadingBody {
  heading: string;
  body: string;
}

/**
 * The full pipeline for a heading/body dialog (`fire`, `areYouSure`, `showInfo`):
 * funny-level styling first, so the fact-preserving text is what gets decorated, then
 * `buildDialog` for the emoji boundary -- which is also where the "never in a control"
 * rule lives, since this function only ever passes heading/body through it and leaves
 * every label field as an empty placeholder nobody reads back out.
 */
export function styledDialog(
  storage: MessageStorage | undefined,
  language: CopyLanguage,
  kind: DialogKind,
  heading: string,
  body: string,
): StyledHeadingBody {
  const styled = buildDialog(storage, kind, {
    heading: styledMessageText(storage, language, heading),
    body: styledMessageText(storage, language, body),
    confirmLabel: '',
    cancelLabel: '',
    accessibleName: '',
  });
  return { heading: styled.heading, body: styled.body };
}

/** The pipeline for a one-line message box (`toast`): funny-level styling, then the
 *  same emoji decoration a heading/body dialog gets, applied to the single line. */
export function styledToastText(
  storage: MessageStorage | undefined,
  language: CopyLanguage,
  kind: DialogKind,
  text: string,
): string {
  return decorateDialogText(storage, kind, styledMessageText(storage, language, text));
}
