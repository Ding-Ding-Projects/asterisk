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
export const ATTENTION_STORAGE_KEYS = {
  focus: 'console.attention.focus',
  lowStimulation: 'console.attention.lowStimulation',
  timeAwareness: 'console.attention.timeAwareness',
  oneThing: 'console.attention.oneThing',
  momentum: 'console.attention.momentum',
  nextAction: 'console.attention.nextAction',
  lastChangedAt: 'console.attention.lastChangedAt',
  snoozedUntil: 'console.attention.snoozedUntil',
  noticeHistory: 'console.attention.noticeHistory',
} as const;
export const NEXT_ACTION_SETTING_KEY = ATTENTION_STORAGE_KEYS.nextAction;
export const LAST_CHANGED_SETTING_KEY = ATTENTION_STORAGE_KEYS.lastChangedAt;
export const SNOOZED_UNTIL_SETTING_KEY = ATTENTION_STORAGE_KEYS.snoozedUntil;
export const NOTICE_HISTORY_SETTING_KEY = ATTENTION_STORAGE_KEYS.noticeHistory;
export const NOTICE_HISTORY_SCHEMA_VERSION = 1;
export const NOTICE_HISTORY_MAX_ENTRIES = 200;
export const NEXT_ACTION_MAX_LENGTH = 140;

/** Handwritten control wiring inventory. Each row names one control, its durable
 * key, the writer, and the live consumer that must remain present together. */
export const ATTENTION_WIRING = [
  { control: 'att_focus', storageKey: 'console.attention.focus', writer: 'generated setVal -> onUserMutation -> App.attentionWrite', consumer: 'App.attentionRender -> data-attention-inactive' },
  { control: 'att_low', storageKey: 'console.attention.lowStimulation', writer: 'generated setVal -> onUserMutation -> App.attentionWrite', consumer: 'App.toast/App.fire explicit severity -> attention-low-stimulation' },
  { control: 'att_time', storageKey: 'console.attention.timeAwareness', writer: 'generated setVal -> onUserMutation -> App.attentionWrite', consumer: 'App.attentionRender -> data-attention-meta' },
  { control: 'att_one', storageKey: 'console.attention.oneThing', writer: 'generated setVal -> onUserMutation -> App.attentionWrite', consumer: 'App.attentionRender -> data-attention-next' },
  { control: 'att_momentum', storageKey: 'console.attention.momentum', writer: 'generated setVal -> onUserMutation -> App.attentionWrite', consumer: 'App.attentionRender -> momentumPrompt and attentionSnooze' },
  { control: 'att_next', storageKey: 'console.attention.nextAction', writer: 'generated setVal -> onUserMutation; App.languageAwareSetVal -> setNextAction plus attentionWrite', consumer: 'App.attentionRender -> data-attention-next' },
] as const;

export const ATTENTION_MUTATION_ACTIONS = [
  { action: 'set', key: 'canvasTool', state: 'canvasTool' },
  { action: 'set', key: 'grid', state: 'grid' },
  { action: 'set', key: 'snap', state: 'snap' },
  { action: 'set', key: 'guides', state: 'guides' },
  { action: 'set', key: 'minimap', state: 'minimap' },
  { action: 'set', key: 'layer', state: 'layer' },
  { action: 'set', key: 'zoom', state: 'zoom' },
  { action: 'set', key: 'pinned', state: 'pinned' },
  { action: 'set', key: 'dock', state: 'dock' },
  { action: 'set', key: 'fullscreen', state: 'fullscreen' },
  { action: 'set', key: 'branch', state: 'branch' },
  { action: 'set', key: 'sortList', state: 'sortList' },
] as const;

export interface RedactedNotice {
  severity: 'warning' | 'error';
  title: string;
  body: string;
}

export function redactNoticeText(value: string): string {
  return value
    .replace(/(?:[A-Za-z]:\\|\\\\)[^\s)]+/g, '[path omitted]')
    .replace(/(^|[\s("'`])(?:\.{1,2}[\\/][^\s)"'`]+|\/(?:etc|var|home|tmp|opt|srv|mnt|usr)\/[^\s)"'`]+|(?:pjsip|extensions|queues|http|acl|asterisk|modules|logger|rtp|cdr|cel|features|musiconhold|voicemail)\.conf\b)/gm, '$1[path omitted]')
    .replace(/\b(?:https?|file):\/\/[^\s]+/gi, '[url omitted]')
    .replace(/\b(password|passphrase|secret|token|pin|code)\s*[:=]\s*[^\s,.;]+/gi, '$1: [redacted]')
    .slice(0, 500);
}

/** Executable wiring Chut for the handwritten inventory. A missing row, duplicate
 * control, control absent from the design, or consumer absent from the runtime fails
 * closed. Callers provide the checked-in source text, so a negative regression can
 * remove one exact assertion and observe the Chut turn red. */
export function verifyAttentionWiring(sources: { design: string; app: string; generated: string; module: string }): void {
  if (ATTENTION_WIRING.length !== ATTENTION_MODES.length + 1) throw new Error('Attention wiring inventory must contain exactly six rows.');
  const controls = new Set<string>();
  for (const row of ATTENTION_WIRING) {
    if (controls.has(row.control)) throw new Error(`Duplicate attention control: ${row.control}`);
    controls.add(row.control);
    const controlBoundary = new RegExp(`\\b${row.control}\\b`);
    if (!controlBoundary.test(sources.design)) throw new Error(`Missing design control: ${row.control}`);
    if (!sources.app.includes(`'${row.control}'`)) throw new Error(`Missing App control construction: ${row.control}`);
    if (!sources.module.includes(row.storageKey)) throw new Error(`Missing exact durable key construction: ${row.storageKey}`);
    const writerSource = `${sources.app}\n${sources.generated}`;
    if (!writerSource.includes('onUserMutation')) throw new Error(`Missing mutation writer for ${row.control}`);
    if (row.control === 'att_next' ? !sources.app.includes('setNextAction') : !sources.app.includes('setModeEnabled')) {
      throw new Error(`Missing exact mode writer for ${row.control}`);
    }
    const consumer = row.consumer.split(' -> ').at(-1) ?? row.consumer;
    const consumerTokens = consumer.split(/\s+(?:plus|and)\s+/).filter(Boolean);
    if (consumerTokens.some((token) => !sources.app.includes(token))) throw new Error(`Missing exact consumer for ${row.control}`);
  }
  if (controls.size !== 6) throw new Error('Attention wiring controls are incomplete.');
  for (const action of ATTENTION_MUTATION_ACTIONS) {
    if (!sources.generated.includes(`action:'${action.action}'`) || !sources.generated.includes(`key:'${action.key}'`)) {
      throw new Error(`Missing exact mutation action: ${action.action}:${action.key}`);
    }
  }
}

export interface ModeStorage {
  getItem(key: string): string | null | undefined;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
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

export function nextAction(storage: ModeStorage | undefined): string {
  const value = storage?.getItem(NEXT_ACTION_SETTING_KEY);
  return typeof value === 'string' ? value.slice(0, NEXT_ACTION_MAX_LENGTH) : '';
}

export function setNextAction(storage: ModeStorage, value: string): void {
  const trimmed = value.trim().slice(0, NEXT_ACTION_MAX_LENGTH);
  if (trimmed) storage.setItem(NEXT_ACTION_SETTING_KEY, trimmed);
  else if (storage.removeItem) storage.removeItem(NEXT_ACTION_SETTING_KEY);
  else storage.setItem(NEXT_ACTION_SETTING_KEY, '');
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
export const SNOOZE_MIGRATION_TOLERANCE_MS = 5 * 60 * 1000;
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
