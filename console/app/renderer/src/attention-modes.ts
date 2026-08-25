/**
 * Attention modes.
 *
 * Five accommodations, each independently toggleable and every one off by default.
 * Independence is the whole design: attention difficulties do not arrive as a single
 * setting, and bundling them behind one switch means somebody who wants a quieter
 * interface but not time nudges turns the entire thing off to escape the one part that
 * does not suit them.
 *
 * Three rules that matter more here than almost anywhere else in the app:
 *
 *  - NOTHING IS MEDICAL. These are interface accommodations. No diagnosis, no
 *    assessment, no advice, no claim of benefit, and nothing that implies anything about
 *    a person who uses or does not use them. The modes are named for what they DO, so
 *    somebody can switch one on without disclosing anything to a colleague reading over
 *    their shoulder.
 *  - NOTHING IS HIDDEN IRRECOVERABLY. Focus dims and de-emphasises; it never removes
 *    something the user cannot get back in one obvious action. An interface that
 *    disappears work is a worse problem than a busy one.
 *  - NO JUDGEMENT, NO SCORING. Copy states what is true and never what to feel about it.
 *    No streaks, no ranking, no congratulation, no productivity score. A prompt that has
 *    been declined is respected for a stated period, not for thirty seconds.
 */

export const ATTENTION_MODES = ['focus', 'lowStimulation', 'timeAwareness', 'oneThing', 'momentum'] as const;
export type AttentionMode = (typeof ATTENTION_MODES)[number];

export interface ModeDescription {
  id: AttentionMode;
  /** Named for what it does, so switching it on discloses nothing about the person. */
  label: string;
  help: string;
}

export const MODE_DESCRIPTIONS: readonly ModeDescription[] = [
  { id: 'focus', label: 'Focus', help: 'Dims everything except what you are working on. Nothing is hidden; the rest is still one click away.' },
  { id: 'lowStimulation', label: 'Low stimulation', help: 'Fewer moving things, quieter colour, and only the notifications that genuinely need a person.' },
  { id: 'timeAwareness', label: 'Time awareness', help: 'Shows how long this session has been open and how long since anything changed, where the work is.' },
  { id: 'oneThing', label: 'One thing at a time', help: 'Keeps one next action visible, chosen by you. It survives a context switch.' },
  { id: 'momentum', label: 'Momentum', help: 'A dismissible prompt when something has been untouched for a while. Saying not now is respected.' },
];

export const MODE_SETTING_PREFIX = 'console.attention.';

export interface ModeStorage {
  getItem(key: string): string | null | undefined;
  setItem(key: string, value: string): void;
}

export function isAttentionMode(value: unknown): value is AttentionMode {
  return typeof value === 'string' && (ATTENTION_MODES as readonly string[]).includes(value);
}

/** Off by default. These are accommodations, not opinions about how anyone should work. */
export function modeEnabled(storage: ModeStorage | undefined, mode: AttentionMode): boolean {
  return storage?.getItem(`${MODE_SETTING_PREFIX}${mode}`) === 'on';
}

export function setModeEnabled(storage: ModeStorage, mode: AttentionMode, enabled: boolean): void {
  storage.setItem(`${MODE_SETTING_PREFIX}${mode}`, enabled ? 'on' : 'off');
}

export function enabledModes(storage: ModeStorage | undefined): AttentionMode[] {
  return ATTENTION_MODES.filter((mode) => modeEnabled(storage, mode));
}

export interface PresentationState {
  /** Everything but the active object is de-emphasised. Never removed. */
  dimInactive: boolean;
  /** Composes with the platform preference below rather than overriding it. */
  reduceMotion: boolean;
  quietNotifications: boolean;
  showElapsedTime: boolean;
  showNextAction: boolean;
}

/**
 * What the interface should do, given the modes and the platform's own preferences.
 *
 * Low stimulation composes with `prefers-reduced-motion`: somebody who has already told
 * their operating system they want less motion has asked once, and must not have to ask
 * again here. So motion is reduced when EITHER is set, never only when the app's own
 * switch is on.
 */
export function presentationFor(
  storage: ModeStorage | undefined,
  platform: { prefersReducedMotion?: boolean } = {},
): PresentationState {
  const low = modeEnabled(storage, 'lowStimulation');
  return {
    dimInactive: modeEnabled(storage, 'focus'),
    reduceMotion: low || platform.prefersReducedMotion === true,
    quietNotifications: low,
    showElapsedTime: modeEnabled(storage, 'timeAwareness'),
    showNextAction: modeEnabled(storage, 'oneThing'),
  };
}

/**
 * Elapsed time as a plain phrase.
 *
 * States a number and stops. Time blindness is one of the most consistently reported
 * difficulties and almost no software helps with it, but the help is the statement --
 * nagging about the number is not part of it.
 */
export function elapsedPhrase(milliseconds: number): string {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return 'just now';
  const minutes = Math.floor(milliseconds / 60000);
  if (minutes < 1) return 'less than a minute';
  if (minutes === 1) return '1 minute';
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hoursPart = hours === 1 ? '1 hour' : `${hours} hours`;
  if (rest === 0) return hoursPart;
  return `${hoursPart} ${rest === 1 ? '1 minute' : `${rest} minutes`}`;
}

export interface MomentumPrompt {
  show: boolean;
  message: string;
}

/** How long "not now" is respected. Long enough to mean it. */
export const SNOOZE_MS = 30 * 60 * 1000;
export const IDLE_THRESHOLD_MS = 20 * 60 * 1000;

/**
 * The momentum prompt, if one is due.
 *
 * The message states the fact and nothing else -- no "you have been idle", no
 * encouragement, no implication that the person should have been doing something. The
 * difference between "nothing has changed here for 40 minutes" and any version with a
 * second clause is the whole difference between an accommodation and a nag.
 */
export function momentumPrompt(
  storage: ModeStorage | undefined,
  sinceChangeMs: number,
  sinceSnoozeMs: number | undefined,
): MomentumPrompt {
  const quiet = { show: false, message: '' };
  if (!modeEnabled(storage, 'momentum')) return quiet;
  if (sinceSnoozeMs !== undefined && sinceSnoozeMs < SNOOZE_MS) return quiet;
  if (sinceChangeMs < IDLE_THRESHOLD_MS) return quiet;
  return { show: true, message: `Nothing has changed here for ${elapsedPhrase(sinceChangeMs)}.` };
}

/**
 * Words that must never appear in this feature's copy.
 *
 * Kept as data so a test can check every string rather than a reviewer having to. The
 * medical terms would make a claim the feature is not entitled to make; the rest are the
 * judgement and gamification this feature exists without.
 */
export const FORBIDDEN_COPY_TERMS: readonly string[] = [
  'adhd', 'disorder', 'diagnos', 'symptom', 'condition', 'treatment', 'therapy', 'deficit',
  'streak', 'score', 'productiv', 'well done', 'congratulat', 'you should', 'lazy', 'distracted',
];

// ---------------------------------------------------------------- one thing at a time

const NEXT_ACTION_KEY = `${MODE_SETTING_PREFIX}nextAction`;

/** The single next action, chosen by the person rather than inferred. Persisted, so it
 *  survives a context switch to another screen -- or a relaunch -- exactly as the
 *  contract requires. Blank when nothing has been chosen yet. */
export function nextAction(storage: ModeStorage | undefined): string {
  const raw = storage?.getItem(NEXT_ACTION_KEY);
  return typeof raw === 'string' ? raw : '';
}

export function setNextAction(storage: ModeStorage, value: string): void {
  storage.setItem(NEXT_ACTION_KEY, value);
}

// ---------------------------------------------------------------- momentum: the snooze stamp

const SNOOZE_STAMP_KEY = `${MODE_SETTING_PREFIX}snoozedAt`;

/** Records the moment "not now" was said, so the answer can be respected for
 *  {@link SNOOZE_MS} rather than for as long as this render happens to live. */
export function snoozeMomentum(storage: ModeStorage, now: number = Date.now()): void {
  storage.setItem(SNOOZE_STAMP_KEY, String(now));
}

/** How long ago "not now" was last said, or `undefined` when it never was. Feeds
 *  directly into {@link momentumPrompt}'s `sinceSnoozeMs` parameter. */
export function msSinceSnooze(storage: ModeStorage | undefined, now: number = Date.now()): number | undefined {
  const raw = storage?.getItem(SNOOZE_STAMP_KEY);
  if (typeof raw !== 'string' || raw === '') return undefined;
  const at = Number(raw);
  return Number.isFinite(at) ? Math.max(0, now - at) : undefined;
}

// ---------------------------------------------------------------- focus: dim, never hide

/**
 * The stylesheet Focus mode injects while it is on.
 *
 * Nothing is dimmed until something in the console actually has focus -- the selector
 * only matches once `:focus-within` is true somewhere inside `.attn-content`, so an idle
 * screen with nothing focused stays at full brightness. The moment something is focused,
 * everything else recedes to partial opacity; the focused element and every ancestor
 * between it and `.attn-content` are excluded from the dim, which is what keeps "the
 * active thing" -- and the click path back to anything else -- fully visible.
 *
 * Deliberately opacity only: nothing here sets `display`, `visibility` or
 * `pointer-events`, so nothing dimmed is unreachable or unclickable. A test asserts that
 * property directly rather than trusting this comment.
 */
export const FOCUS_DIM_CSS =
  '.attn-content:focus-within * { opacity: .55; transition: opacity 150ms ease; } '
  + '.attn-content:focus-within *:focus, .attn-content:focus-within *:focus-within { opacity: 1; }';
