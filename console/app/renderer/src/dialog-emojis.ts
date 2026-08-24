/**
 * Emoji decoration in dialogs and message boxes.
 *
 * A persisted toggle, off by default. When it is on, a dialog or message box carries one
 * relevant emoji; when it is off, the same factual copy appears without it.
 *
 * The boundary is narrow and deliberate: emoji decorate a dialog's own heading or body,
 * and NEVER a button, an action label, a field label, or an accessible name. Three
 * reasons, all of which have bitten real software:
 *
 *  - A button reading "🗑 Delete" is harder to scan than "Delete", and the emoji adds
 *    nothing a person deciding whether to press it needs.
 *  - An accessible name carrying an emoji is read aloud as its Unicode description, so a
 *    screen-reader user hears "wastebasket Delete" on every focus.
 *  - An emoji in a field label breaks the visual alignment of a form column for the sake
 *    of decoration nobody asked for.
 *
 * So this module exposes the decoration for exactly one kind of text and refuses it for
 * the rest, rather than leaving the boundary to whoever writes the next dialog.
 */

export const DIALOG_EMOJI_SETTING = 'console.dialogEmojis';

export interface EmojiStorage {
  getItem(key: string): string | null | undefined;
  setItem(key: string, value: string): void;
}

/** The kinds of message a dialog carries. One emoji each, chosen to be unambiguous. */
export type DialogKind = 'info' | 'success' | 'warning' | 'error' | 'question' | 'destructive' | 'progress';

/**
 * Stable, and deliberately dull for the two that matter. A destructive confirmation and
 * an error are not places to be playful: the emoji marks the category so it can be
 * scanned, and the words carry every fact.
 */
export const DIALOG_EMOJI: Readonly<Record<DialogKind, string>> = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  error: '❌',
  question: '❓',
  destructive: '🛑',
  progress: '⏳',
};

/** Off by default. Decoration is opt-in, not something to be switched off after noticing. */
export function emojisEnabled(storage: EmojiStorage | undefined): boolean {
  return storage?.getItem(DIALOG_EMOJI_SETTING) === 'on';
}

export function setEmojisEnabled(storage: EmojiStorage, enabled: boolean): void {
  storage.setItem(DIALOG_EMOJI_SETTING, enabled ? 'on' : 'off');
}

/**
 * Decorates a dialog heading or body.
 *
 * Returns the text unchanged when the setting is off, when the text is empty, or when it
 * already begins with the emoji -- decorating twice on a re-render is the classic way a
 * heading ends up reading "⚠️ ⚠️ Careful".
 */
export function decorateDialogText(
  storage: EmojiStorage | undefined,
  kind: DialogKind,
  text: string,
): string {
  if (!emojisEnabled(storage)) return text;
  if (text.trim() === '') return text;
  const emoji = DIALOG_EMOJI[kind];
  if (text.startsWith(emoji)) return text;
  return `${emoji} ${text}`;
}

/**
 * The control text path. Always returns the text unchanged, whatever the setting says.
 *
 * This exists as a real function rather than a comment so a call site has somewhere
 * correct to call. A dialog builder reaching for `decorateDialogText` on a button label
 * is a mistake nobody would notice in review; reaching for `controlText` is not.
 */
export function controlText(text: string): string {
  return text;
}

export interface DialogParts {
  heading: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  /** What assistive technology announces. Never decorated. */
  accessibleName: string;
}

/**
 * Builds a whole dialog's text with the boundary applied in one place.
 *
 * Every dialog going through here gets the decoration on its heading and body and cannot
 * accidentally get it anywhere else, which is the point: the rule is enforced by the
 * shape of the function rather than by everyone remembering it.
 */
export function buildDialog(
  storage: EmojiStorage | undefined,
  kind: DialogKind,
  parts: DialogParts,
): DialogParts {
  return {
    heading: decorateDialogText(storage, kind, parts.heading),
    body: decorateDialogText(storage, kind, parts.body),
    confirmLabel: controlText(parts.confirmLabel),
    cancelLabel: controlText(parts.cancelLabel),
    accessibleName: controlText(parts.accessibleName),
  };
}

/** Every emoji this module can emit, for tests that assert none reached a control. */
export const ALL_DIALOG_EMOJI: readonly string[] = Object.values(DIALOG_EMOJI);
