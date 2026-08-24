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

export interface RedactedNotice {
  severity: 'warning' | 'error';
  title: string;
  body: string;
}

const REDACTION_INPUT_LIMIT = 4096;
const REDACTION_OUTPUT_LIMIT = 500;
const PATH_MARKER = '[path omitted]';
const URL_MARKER = '[url omitted]';
const CREDENTIAL_MARKER = '[redacted]';
const CREDENTIAL_KEY = /^(?:password|passphrase|secret|token|pin|code|api[_ -]?key|access[_ -]?token|refresh[_ -]?token|credential)\s*[:=]\s*/iu;
const PBX_BASENAME = /^(?:pjsip|extensions|queues|http|acl|asterisk|modules|logger|rtp|cdr|cel|features|musiconhold|voicemail)(?:\.conf)?(?:[\\/]|$)/iu;

function isQuote(value: string): boolean { return value === '"' || value === "'" || value === '`'; }
function isUrlStart(value: string, index: number): boolean { return /^(?:https?|file):\/\//iu.test(value.slice(index)); }
function isPathStart(value: string, index: number): boolean {
  const before = index === 0 ? '' : value[index - 1];
  if (before && !/[\s=(\[{<]/u.test(before)) return false;
  return /^(?:[A-Za-z]:[\\/]|\\\\|\/(?:etc|var|home|tmp|opt|srv|mnt|usr)(?:\/|$)|\.{1,2}[\\/])/u.test(value.slice(index))
    || PBX_BASENAME.test(value.slice(index));
}
function isSensitiveQuoted(value: string): boolean {
  return isUrlStart(value, 0) || /^(?:[A-Za-z]:[\\/]|\\\\|\/(?:etc|var|home|tmp|opt|srv|mnt|usr)(?:\/|$)|\.{1,2}[\\/])/u.test(value) || PBX_BASENAME.test(value);
}
function scanToDelimiter(value: string, start: number, url: boolean): number {
  let index = start;
  while (index < value.length) {
    const ch = value[index];
    if (/[,;\r\n"'`<>()[\]{}]/u.test(ch)) break;
    index += 1;
  }
  return index;
}
function scanQuoted(value: string, start: number, quote: string): number {
  let index = start;
  let escaped = false;
  while (index < value.length) {
    const ch = value[index];
    if (escaped) { escaped = false; index += 1; continue; }
    if (ch === '\\') { escaped = true; index += 1; continue; }
    if (ch === quote) return index;
    index += 1;
  }
  return value.length;
}

/**
 * Bounded deterministic scanner for notice text. It consumes whole spans rather
 * than applying a chain of regex replacements, so a path, URL, or whitespace-bearing
 * credential cannot leave an identifying suffix behind after one replacement.
 */
export function redactNoticeText(value: string): string {
  const input = String(value).slice(0, REDACTION_INPUT_LIMIT);
  let output = '';
  let index = 0;
  while (index < input.length && output.length < REDACTION_OUTPUT_LIMIT) {
    const ch = input[index];
    if (isQuote(ch)) {
      const end = scanQuoted(input, index + 1, ch);
      const inner = input.slice(index + 1, end);
      output += isSensitiveQuoted(inner) ? `${ch}${inner.startsWith('http') || inner.startsWith('file:') ? URL_MARKER : PATH_MARKER}${ch}` : input.slice(index, Math.min(end + 1, input.length));
      index = Math.min(end + 1, input.length);
      continue;
    }
    const credential = input.slice(index).match(CREDENTIAL_KEY);
    if (credential && (index === 0 || /[\s({[;,]/u.test(input[index - 1]))) {
      const prefix = credential[0];
      output += prefix;
      index += prefix.length;
      if (isQuote(input[index])) {
        const quote = input[index];
        const end = scanQuoted(input, index + 1, quote);
        output += `${quote}${CREDENTIAL_MARKER}${quote}`;
        index = Math.min(end + 1, input.length);
      } else {
        const end = scanToDelimiter(input, index, false);
        output += CREDENTIAL_MARKER;
        index = end;
      }
      continue;
    }
    if (isUrlStart(input, index)) {
      const end = scanToDelimiter(input, index, true);
      output += URL_MARKER;
      index = end;
      continue;
    }
    if (isPathStart(input, index)) {
      const end = scanToDelimiter(input, index, false);
      output += PATH_MARKER;
      index = end;
      continue;
    }
    output += ch;
    index += 1;
  }
  return output.slice(0, REDACTION_OUTPUT_LIMIT);
}

function exactMarker(source: string, marker: string, label: string): void {
  if (!source.includes(marker)) throw new Error(`Missing ${label}: ${marker}`);
}

/** Executable wiring Chut for the canonical per-row matrix. Every row checks its
 * own design control, construction, durable key, writer chain, setter, callback,
 * and every complete consumer marker. */
export function verifyAttentionWiring(sources: { design: string; app: string; generated: string; module: string }, rows: readonly AttentionWiringRow[] = ATTENTION_WIRING): void {
  if (rows.length !== ATTENTION_MODES.length + 1) throw new Error('Attention wiring inventory must contain exactly six rows.');
  const controls = new Set<string>();
  for (const row of rows) {
    if (controls.has(row.control)) throw new Error(`Duplicate attention control: ${row.control}`);
    controls.add(row.control);
    exactMarker(sources.design, row.designMarker, `${row.id} design control`);
    exactMarker(sources.app, row.controlConstruction, `${row.id} App control construction`);
    exactMarker(sources.module, row.durableKey, `${row.id} durable key`);
    for (const marker of row.writerMarkers) exactMarker(`${sources.app}\n${sources.generated}\n${sources.module}`, marker, `${row.id} writer chain`);
    for (const marker of row.setterMarkers) exactMarker(sources.app, marker, `${row.id} setter`);
    for (const marker of row.consumerMarkers) exactMarker(`${sources.app}\n${sources.module}`, marker, `${row.id} consumer`);
  }
  if (controls.size !== 6) throw new Error('Attention wiring controls are incomplete.');
  for (const action of ATTENTION_MUTATION_ACTIONS) {
    const tuple = new RegExp(`action:\\s*['"]${action.action}['"]\\s*,\\s*key:\\s*['"]${action.key}['"]\\s*,\\s*state:\\s*['"]${action.state}['"]`);
    if (!tuple.test(sources.generated)) {
      throw new Error(`Missing exact mutation action: ${action.action}:${action.key}`);
    }
  }
}

function sourceLines(source: string): string[] { return source.split(/\r?\n/u); }
function severityCalls(source: string): Array<{ line: number; column: number; helper: string }> {
  const calls: Array<{ line: number; column: number; helper: string }> = [];
  const lines = sourceLines(source);
  for (let index = 0; index < lines.length; index += 1) {
    const matches = lines[index].matchAll(/\b(notify(?:InfoEvent|WarningEvent|ErrorEvent|Message|Event|Info|Warning|Error))\s*\(/gu);
    for (const match of matches) calls.push({ line: index + 1, column: match.index ?? 0, helper: match[1] });
  }
  return calls;
}

/** Canonical severity source scan. Every producer line is listed, including
 * passive routing helpers. This catches newly added calls instead of checking only
 * the phrases an earlier inventory happened to know about. */
export function verifyAttentionSeverityProducers(sources: { app: string; generated: string }, inventory: readonly AttentionSeverityProducerSite[] = ATTENTION_SEVERITY_PRODUCERS): void {
  const sourceMap = new Map<string, string>([['App.tsx', sources.app], ['generated/console.tsx', sources.generated]]);
  const discovered = new Set<string>();
  for (const [file, source] of sourceMap) {
    const calls = severityCalls(source);
    for (const call of calls) {
      const key = `${file}:${call.line}:${call.column}`;
      const entries = inventory.filter((entry) => entry.file === file && entry.line === call.line && entry.column === call.column);
      if (entries.length !== 1) throw new Error(`Unlisted or duplicate notification producer at ${key}.`);
      const entry = entries[0];
      if (entry.helper !== call.helper) throw new Error(`Notification helper drift at ${key}: expected ${entry.helper}, found ${call.helper}.`);
      const lineText = sourceLines(source)[call.line - 1];
      const helperSeverity = call.helper.match(/notify(Warning|Error)/u)?.[1]?.toLowerCase() ?? 'info';
      if (call.helper.startsWith('notifyInfo') || call.helper === 'notifyMessage' || call.helper === 'notifyEvent') {
        const explicit = /['"](warning|error)['"]/u.exec(lineText)?.[1];
        if (explicit && explicit !== entry.severity && !entry.passive) throw new Error(`Explicit severity drift at ${key}: expected ${entry.severity}, found ${explicit}.`);
      } else if (!entry.passive && helperSeverity !== entry.severity) {
        throw new Error(`Helper severity drift at ${key}: expected ${entry.severity}, found ${helperSeverity}.`);
      }
      if (!entry.passive && entry.severity === 'info' && /(failed|failure|refused|unavailable|not available|not done|not created|not saved|not written|wrong|cannot|rejected|unreadable|could not|no target|prerequisite)/iu.test(lineText)) {
        throw new Error(`Failure-like notification at ${key} must be warning or error.`);
      }
      discovered.add(key);
    }
  }
  const activeInventory = inventory.filter((entry) => !entry.passive);
  for (const entry of inventory) {
    const key = `${entry.file}:${entry.line}:${entry.column}`;
    if (!discovered.has(key)) throw new Error(`Inventory entry is absent from source: ${key}.`);
    if (!entry.passive && !['info', 'warning', 'error'].includes(entry.severity)) throw new Error(`Invalid severity at ${key}.`);
  }
  if (activeInventory.length === 0) throw new Error('Severity inventory has no active notification producers.');
}

function mutationCalls(source: string): Array<{ line: number; argument: string }> {
  const calls: Array<{ line: number; argument: string }> = [];
  const matcher = /onUserMutation\(/gu;
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(source))) {
    let index = matcher.lastIndex;
    let depth = 1;
    let quote = '';
    let escaped = false;
    for (; index < source.length; index += 1) {
      const ch = source[index];
      if (quote) {
        if (escaped) { escaped = false; continue; }
        if (ch === '\\') { escaped = true; continue; }
        if (ch === quote) quote = '';
        continue;
      }
      if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
      if (ch === '(') depth += 1;
      else if (ch === ')' && --depth === 0) break;
    }
    const line = source.slice(0, match.index).split(/\r?\n/u).length;
    calls.push({ line, argument: source.slice(matcher.lastIndex, index).replace(/\s+/gu, ' ').trim() });
    matcher.lastIndex = index + 1;
  }
  return calls;
}

export function verifyAttentionMutationInventory(sources: { app: string; generated: string }, inventory: readonly (typeof ATTENTION_MUTATION_INVENTORY[number])[] = ATTENTION_MUTATION_INVENTORY): void {
  const sourceMap = new Map<string, string>([['App.tsx', sources.app], ['generated/console.tsx', sources.generated]]);
  const discovered = new Set<string>();
  for (const [file, source] of sourceMap) {
    const calls = mutationCalls(source);
    const seen = new Map<string, number>();
    for (const call of calls) {
      const occurrence = (seen.get(call.argument) ?? 0) + 1;
      seen.set(call.argument, occurrence);
      const entries = inventory.filter((entry) => entry.file === file && entry.argument === call.argument && entry.occurrence === occurrence);
      if (entries.length !== 1) throw new Error(`Unlisted or duplicate onUserMutation callback at ${file}:${call.line}.`);
      const entry = entries[0];
      if (!entry.state || entry.clockEffect !== 'recorded') throw new Error(`Mutation record is incomplete at ${file}:${call.line}.`);
      discovered.add(`${file}:${entry.argument}:${occurrence}`);
    }
  }
  for (const entry of inventory) {
    if (!discovered.has(`${entry.file}:${entry.argument}:${entry.occurrence}`)) throw new Error(`Mutation inventory entry is absent from source: ${entry.file}:${entry.line}.`);
  }
  if (inventory.length !== 61) throw new Error(`Mutation inventory must enumerate 61 callbacks, found ${inventory.length}.`);
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

export type AttentionSeverity = 'info' | 'warning' | 'error';
export type AttentionClockEffect = 'recorded' | 'passive';
export interface AttentionWiringRow { readonly id:string; readonly control:string; readonly mode:string|null; readonly designMarker:string; readonly controlConstruction:string; readonly durableKey:string; readonly writerMarkers:readonly string[]; readonly setterMarkers:readonly string[]; readonly consumerMarkers:readonly string[]; }
export const ATTENTION_WIRING: readonly AttentionWiringRow[] = [
  { id:'focus', control:'att_focus', mode:'focus', designMarker:"ctl('att_focus','Focus','switch',false", controlConstruction:"'att_focus': 'focus'", durableKey:"focus: 'console.attention.focus'", writerMarkers:["control?.id?.startsWith('att_')", "setModeEnabled(this.durableStorage.storage, mode, value)", "this.attentionWrite(", "MODE_SETTING_PREFIX", "value ? 'on' : 'off'", "this.onUserMutation('control:' + (c.id || 'unknown'))"], setterMarkers:["setModeEnabled(this.durableStorage.storage, mode, value)"], consumerMarkers:["dimInactive: modeEnabled(storage, 'focus')", "presentation.dimInactive", "data-attention-inactive", "element.dataset.attentionInactive = presentation.dimInactive ? 'true' : 'false'"] },
  { id:'low-stimulation', control:'att_low', mode:'lowStimulation', designMarker:"ctl('att_low','Low stimulation','switch',false", controlConstruction:"'att_low': 'lowStimulation'", durableKey:"lowStimulation: 'console.attention.lowStimulation'", writerMarkers:["control?.id?.startsWith('att_')", "setModeEnabled(this.durableStorage.storage, mode, value)", "this.attentionWrite(", "MODE_SETTING_PREFIX", "value ? 'on' : 'off'", "this.onUserMutation('control:' + (c.id || 'unknown'))"], setterMarkers:["setModeEnabled(this.durableStorage.storage, mode, value)"], consumerMarkers:["reduceMotion: low || platform.prefersReducedMotion === true", "quietNotifications: low", "attention-low-stimulation", "modeEnabled(this.durableStorage.storage, 'lowStimulation')"] },
  { id:'time-awareness', control:'att_time', mode:'timeAwareness', designMarker:"ctl('att_time','Time awareness','switch',false", controlConstruction:"'att_time': 'timeAwareness'", durableKey:"timeAwareness: 'console.attention.timeAwareness'", writerMarkers:["control?.id?.startsWith('att_')", "setModeEnabled(this.durableStorage.storage, mode, value)", "this.attentionWrite(", "MODE_SETTING_PREFIX", "value ? 'on' : 'off'", "this.onUserMutation('control:' + (c.id || 'unknown'))"], setterMarkers:["setModeEnabled(this.durableStorage.storage, mode, value)"], consumerMarkers:["showElapsedTime: modeEnabled(storage, 'timeAwareness')", "presentation.showElapsedTime", "data-attention-meta", "Session elapsed:"] },
  { id:'one-thing', control:'att_one', mode:'oneThing', designMarker:"ctl('att_one','One thing at a time','switch',false", controlConstruction:"'att_one': 'oneThing'", durableKey:"oneThing: 'console.attention.oneThing'", writerMarkers:["control?.id?.startsWith('att_')", "setModeEnabled(this.durableStorage.storage, mode, value)", "this.attentionWrite(", "MODE_SETTING_PREFIX", "value ? 'on' : 'off'", "this.onUserMutation('control:' + (c.id || 'unknown'))"], setterMarkers:["setModeEnabled(this.durableStorage.storage, mode, value)"], consumerMarkers:["showNextAction: modeEnabled(storage, 'oneThing')", "presentation.showNextAction", "data-attention-next", "Next action:"] },
  { id:'momentum', control:'att_momentum', mode:'momentum', designMarker:"ctl('att_momentum','Momentum','switch',false", controlConstruction:"'att_momentum': 'momentum'", durableKey:"momentum: 'console.attention.momentum'", writerMarkers:["control?.id?.startsWith('att_')", "setModeEnabled(this.durableStorage.storage, mode, value)", "this.attentionWrite(", "MODE_SETTING_PREFIX", "value ? 'on' : 'off'", "this.onUserMutation('control:' + (c.id || 'unknown'))"], setterMarkers:["setModeEnabled(this.durableStorage.storage, mode, value)"], consumerMarkers:["modeEnabled(storage, 'momentum')", "momentumPrompt(", "attentionSnooze", "Not now for"] },
  { id:'next-action', control:'att_next', mode:null, designMarker:"ctl('att_next','Current next action','text',''", controlConstruction:"'att_next': 'nextAction'", durableKey:"nextAction: 'console.attention.nextAction'", writerMarkers:["onUserMutation = (_source = 'unknown')", "this.onUserMutation('control:' + (c.id || 'unknown'))"], setterMarkers:["control?.id === 'att_next'", "setNextAction(this.durableStorage.storage, value)", "this.attentionWrite(NEXT_ACTION_SETTING_KEY, value.trim().slice(0, NEXT_ACTION_MAX_LENGTH) || null)"], consumerMarkers:["showNextAction: modeEnabled(storage, 'oneThing')", "presentation.showNextAction", "data-attention-next", "nextAction(this.durableStorage.storage)"] }
];
export const ATTENTION_MUTATION_ACTIONS = [
  { action:'set', key:'canvasTool', state:'canvasTool' }, { action:'set', key:'grid', state:'grid' }, { action:'set', key:'snap', state:'snap' }, { action:'set', key:'guides', state:'guides' }, { action:'set', key:'minimap', state:'minimap' }, { action:'set', key:'layer', state:'layer' }, { action:'set', key:'zoom', state:'zoom' }, { action:'set', key:'pinned', state:'pinned' }, { action:'set', key:'dock', state:'dock' }, { action:'set', key:'fullscreen', state:'fullscreen' }, { action:'set', key:'branch', state:'branch' }, { action:'set', key:'sortList', state:'sortList' },
] as const;
export interface AttentionMutationInventoryRow { readonly file:string; readonly line:number; readonly argument:string; readonly occurrence:number; readonly state:string; readonly clockEffect:AttentionClockEffect; }
export const ATTENTION_MUTATION_INVENTORY: readonly AttentionMutationInventoryRow[] = [
  { file: 'App.tsx', line: 368, argument: "'attention-history-clear'", occurrence: 1, state: 'noticeHistory', clockEffect: 'recorded' },
  { file: 'App.tsx', line: 892, argument: "'vocabulary-load'", occurrence: 1, state: 'vocabularyCache', clockEffect: 'recorded' },
  { file: 'App.tsx', line: 905, argument: "'vocabulary-clear'", occurrence: 1, state: 'vocabularyCache', clockEffect: 'recorded' },
  { file: 'App.tsx', line: 968, argument: "'support-ticket'", occurrence: 1, state: 'supportTickets', clockEffect: 'recorded' },
  { file: 'App.tsx', line: 1098, argument: "'server-add'", occurrence: 1, state: 'servers', clockEffect: 'recorded' },
  { file: 'App.tsx', line: 1111, argument: "'server-remove'", occurrence: 1, state: 'servers', clockEffect: 'recorded' },
  { file: 'App.tsx', line: 1172, argument: "'onboarding-connect'", occurrence: 1, state: 'servers', clockEffect: 'recorded' },
  { file: 'App.tsx', line: 1249, argument: "'onboarding-deploy'", occurrence: 1, state: 'runtimeConfiguration', clockEffect: 'recorded' },
  { file: 'App.tsx', line: 1421, argument: "'authenticator-pair'", occurrence: 1, state: 'authenticator', clockEffect: 'recorded' },
  { file: 'App.tsx', line: 1460, argument: "'lock-create'", occurrence: 1, state: 'locks', clockEffect: 'recorded' },
  { file: 'App.tsx', line: 1519, argument: "'lock-remove'", occurrence: 1, state: 'locks', clockEffect: 'recorded' },
  { file: 'App.tsx', line: 1600, argument: "'endpoint-write'", occurrence: 1, state: 'endpointConfiguration', clockEffect: 'recorded' },
  { file: 'App.tsx', line: 2154, argument: "'appearance-random'", occurrence: 1, state: 'appearance', clockEffect: 'recorded' },
  { file: 'App.tsx', line: 2171, argument: "'appearance-reset'", occurrence: 1, state: 'appearance', clockEffect: 'recorded' },
  { file: 'App.tsx', line: 2177, argument: "'appearance-save'", occurrence: 1, state: 'appearance', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4022, argument: "'set:' + k", occurrence: 1, state: 'generatedUserMutationKey', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4045, argument: "'control:' + (c.id || 'unknown')", occurrence: 1, state: 'controlValues', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4160, argument: "'layout:resize'", occurrence: 1, state: 'dlgSize', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4167, argument: "'layout:move'", occurrence: 1, state: 'dlgPos', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4222, argument: "'layout:dock'", occurrence: 1, state: 'dlgDock', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4355, argument: "'appearance:random'", occurrence: 1, state: 'appearanceValues', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4368, argument: "'appearance:colour'", occurrence: 1, state: 'tabColoursOrGroups', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4381, argument: "'lock:unlock'", occurrence: 1, state: 'locks', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4385, argument: "'canvas:edge'", occurrence: 1, state: 'edgeList', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4394, argument: "'canvas:move'", occurrence: 1, state: 'nodePos', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4667, argument: "'canvas:drop'", occurrence: 1, state: 'nodePos', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4671, argument: "'canvas:auto-arrange'", occurrence: 1, state: 'nodePos', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4672, argument: "'canvas:align'", occurrence: 1, state: 'nodePos', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4673, argument: "'canvas:distribute'", occurrence: 1, state: 'nodePos', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4675, argument: "'canvas:undo-layout'", occurrence: 1, state: 'nodePos', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4679, argument: "'canvas:edge-from'", occurrence: 1, state: 'edgeList', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4680, argument: "'canvas:edge-to'", occurrence: 1, state: 'edgeList', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4681, argument: "'canvas:edge-delete'", occurrence: 1, state: 'edgeList', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4683, argument: "'canvas:edge-add'", occurrence: 1, state: 'edgeList', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4861, argument: "'group:toggle'", occurrence: 1, state: 'groups', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4871, argument: "'group:rename'", occurrence: 1, state: 'groups', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4875, argument: "'tab:rename'", occurrence: 1, state: 'tabNames', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4948, argument: "'tabs:close-colour'", occurrence: 1, state: 'tabs', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4959, argument: "'tabs:close-filter'", occurrence: 1, state: 'tabs', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4984, argument: "'tabs:reorder'", occurrence: 1, state: 'tabs', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4993, argument: "'tabs:group'", occurrence: 1, state: 'groupsAndTabs', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 4998, argument: "'tabs:close'", occurrence: 1, state: 'tabs', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 5002, argument: "'tabs:new'", occurrence: 1, state: 'tabs', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 5033, argument: "'preset:max-fun'", occurrence: 1, state: 'values', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 5034, argument: "'preset:zero-fun'", occurrence: 1, state: 'values', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 5042, argument: "'appearance:reroll'", occurrence: 1, state: 'rndNonce', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 5293, argument: "'group:update'", occurrence: 1, state: 'groups', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 5320, argument: "'tabs:close-left'", occurrence: 1, state: 'tabs', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 5321, argument: "'tabs:close-right'", occurrence: 1, state: 'tabs', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 5322, argument: "'tabs:close-others'", occurrence: 1, state: 'tabs', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 5326, argument: "'tabs:close-uncoloured'", occurrence: 1, state: 'tabs', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 5327, argument: "'tabs:close-unpinned'", occurrence: 1, state: 'tabs', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 5350, argument: "'group:update'", occurrence: 2, state: 'groups', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 5358, argument: "'group:ungroup'", occurrence: 1, state: 'groups', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 5359, argument: "'group:close'", occurrence: 1, state: 'groupsAndTabs', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 5373, argument: "'tabs:duplicate'", occurrence: 1, state: 'tabs', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 5374, argument: "'tabs:close'", occurrence: 2, state: 'tabs', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 5376, argument: "'tabs:group-by-area'", occurrence: 1, state: 'groupsAndTabs', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 5419, argument: "'tabs:new-here'", occurrence: 1, state: 'tabs', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 5519, argument: "'appearance:reset'", occurrence: 1, state: 'values', clockEffect: 'recorded' },
  { file: 'generated/console.tsx', line: 5617, argument: "'preset:super-easy'", occurrence: 1, state: 'valuesAndOnboarding', clockEffect: 'recorded' }
];
export const ATTENTION_MUTATION_PASSIVE_EXCLUSIONS = [
  { id:'navigation', description:'screen and rail navigation does not change user data' }, { id:'passive-read', description:'PBX reads and refresh timers do not change user data' }, { id:'selection', description:'row, tab, and palette selection does not persist user data' }, { id:'overlay', description:'opening, closing, and moving transient overlays is not a durable mutation' }, { id:'timer', description:'elapsed-time and notification timers do not change user data' },
] as const;
export interface AttentionSeverityProducerSite { readonly id:string; readonly file:string; readonly line:number; readonly column:number; readonly source:string; readonly helper:string; readonly severity:AttentionSeverity; readonly passive:boolean; }
const APP_SEVERITY_PRODUCER_SITES = [
  [254, 35, 'notifyError', 'error', true],
  [255, 42, 'notifyWarning', 'warning', true],
  [256, 14, 'notifyInfo', 'info', true],
  [259, 35, 'notifyErrorEvent', 'error', true],
  [260, 42, 'notifyWarningEvent', 'warning', true],
  [261, 14, 'notifyInfoEvent', 'info', true],
  [856, 9, 'notifyMessage', 'info', false],
  [859, 11, 'notifyEvent', 'error', false],
  [893, 13, 'notifyMessage', 'info', false],
  [895, 16, 'notifyEvent', 'error', false],
  [897, 32, 'notifyEvent', 'error', false],
  [906, 9, 'notifyMessage', 'info', false],
  [913, 11, 'notifyEvent', 'warning', false],
  [916, 9, 'notifyMessage', 'info', false],
  [919, 11, 'notifyEvent', 'error', false],
  [927, 9, 'notifyEvent', 'info', false],
  [964, 11, 'notifyEvent', 'error', false],
  [969, 9, 'notifyEvent', 'info', false],
  [1014, 13, 'notifyEvent', 'error', false],
  [1020, 11, 'notifyMessage', 'info', false],
  [1030, 11, 'notifyMessage', 'info', false],
  [1099, 11, 'notifyEvent', 'info', false],
  [1101, 14, 'notifyEvent', 'error', false],
  [1107, 24, 'notifyEvent', 'error', false],
  [1112, 11, 'notifyEvent', 'info', false],
  [1114, 14, 'notifyEvent', 'error', false],
  [1173, 11, 'notifyEvent', 'info', false],
  [1179, 11, 'notifyEvent', 'error', false],
  [1191, 13, 'notifyEvent', 'warning', false],
  [1194, 11, 'notifyMessage', 'info', false],
  [1197, 13, 'notifyEvent', 'error', false],
  [1202, 13, 'notifyEvent', 'warning', false],
  [1221, 11, 'notifyEvent', 'warning', false],
  [1236, 17, 'notifyEvent', 'error', false],
  [1240, 15, 'notifyEvent', 'info', false],
  [1277, 23, 'notifyEvent', 'warning', false],
  [1279, 26, 'notifyEvent', 'warning', false],
  [1283, 9, 'notifyMessage', 'info', false],
  [1318, 13, 'notifyEvent', 'warning', false],
  [1340, 11, 'notifyEvent', 'info', false],
  [1347, 9, 'notifyEvent', 'info', false],
  [1432, 9, 'notifyEvent', 'info', false],
  [1451, 45, 'notifyWarning', 'warning', false],
  [1452, 57, 'notifyWarning', 'warning', false],
  [1453, 50, 'notifyWarning', 'warning', false],
  [1461, 9, 'notifyMessage', 'info', false],
  [1489, 15, 'notifyWarning', 'warning', false],
  [1493, 15, 'notifyWarning', 'warning', false],
  [1497, 13, 'notifyWarning', 'warning', false],
  [1500, 11, 'notifyWarning', 'warning', false],
  [1520, 9, 'notifyEvent', 'info', false],
  [1534, 11, 'notifyInfo', 'info', false],
  [1540, 11, 'notifyWarning', 'warning', false],
  [1546, 9, 'notifyWarning', 'warning', false],
  [1552, 48, 'notifyEvent', 'warning', false],
  [1554, 32, 'notifyEvent', 'error', false],
  [1555, 42, 'notifyMessage', 'info', false],
  [1562, 48, 'notifyEvent', 'warning', false],
  [1565, 35, 'notifyEvent', 'error', false],
  [1577, 33, 'notifyEvent', 'error', false],
  [1582, 11, 'notifyEvent', 'info', false],
  [1592, 29, 'notifyEvent', 'error', false],
  [1594, 29, 'notifyEvent', 'error', false],
  [1599, 9, 'notifyEvent', 'info', false],
  [1735, 38, 'notifyWarningEvent', 'warning', false],
  [2134, 19, 'notifyMessage', 'info', false],
  [2155, 9, 'notifyEvent', 'info', false],
  [2172, 9, 'notifyMessage', 'info', false],
  [2178, 9, 'notifyEvent', 'info', false],
  [2186, 11, 'notifyWarning', 'warning', false],
  [2197, 9, 'notifyMessage', 'info', false],
  [2240, 19, 'notifyError', 'error', false],
  [2240, 72, 'notifyWarning', 'warning', false],
  [2240, 102, 'notifyInfo', 'warning', false],
  [2242, 19, 'notifyErrorEvent', 'error', false],
  [2242, 81, 'notifyWarningEvent', 'warning', false],
  [2242, 120, 'notifyInfoEvent', 'warning', false],
  [2264, 15, 'notifyEvent', 'warning', false],
  [2267, 13, 'notifyMessage', 'info', false],
  [2270, 17, 'notifyEvent', 'error', false],
  [2282, 17, 'notifyEvent', 'error', false],
  [2285, 15, 'notifyEvent', 'info', false],
  [2636, 17, 'notifyMessage', 'info', false],
  [2637, 17, 'notifyError', 'error', false]
] as const;
const GENERATED_SEVERITY_PRODUCER_SITES = [
  [4039, 9, 'notifyInfo', 'info', false],
  [4041, 114, 'notifyInfoEvent', 'info', false],
  [4042, 113, 'notifyWarning', 'warning', false],
  [4043, 38, 'notifyInfo', 'info', false],
  [4044, 30, 'notifyInfoEvent', 'info', false],
  [4143, 13, 'notifyInfoEvent', 'info', false],
  [4147, 28, 'notifyInfoEvent', 'info', false],
  [4148, 14, 'notifyInfo', 'info', false],
  [4356, 9, 'notifyInfoEvent', 'info', false],
  [4369, 9, 'notifyInfoEvent', 'info', false],
  [4377, 103, 'notifyWarning', 'warning', false],
  [4378, 119, 'notifyWarning', 'warning', false],
  [4382, 9, 'notifyInfoEvent', 'info', false],
  [4385, 142, 'notifyInfo', 'info', false],
  [4397, 63, 'notifyInfoEvent', 'info', false],
  [4546, 102, 'notifyInfo', 'info', false],
  [4616, 149, 'notifyInfo', 'info', false],
  [4657, 25, 'notifyInfo', 'info', false],
  [4658, 153, 'notifyInfoEvent', 'info', false],
  [4671, 152, 'notifyInfo', 'info', false],
  [4674, 90, 'notifyInfo', 'info', false],
  [4675, 135, 'notifyInfo', 'info', false],
  [4688, 75, 'notifyInfo', 'info', false],
  [4692, 63, 'notifyInfo', 'info', false],
  [4720, 15, 'notifyWarning', 'warning', false],
  [4770, 174, 'notifyInfo', 'info', false],
  [4872, 22, 'notifyInfo', 'info', false],
  [4876, 13, 'notifyInfo', 'info', false],
  [4895, 242, 'notifyInfo', 'info', false],
  [4945, 46, 'notifyInfo', 'info', false],
  [4949, 22, 'notifyInfo', 'info', false],
  [4960, 13, 'notifyInfo', 'info', false],
  [4994, 15, 'notifyInfoEvent', 'info', false],
  [5008, 128, 'notifyInfo', 'info', false],
  [5032, 141, 'notifyInfoEvent', 'info', false],
  [5033, 368, 'notifyInfoEvent', 'info', false],
  [5034, 218, 'notifyInfo', 'info', false],
  [5035, 180, 'notifyInfoEvent', 'info', false],
  [5042, 124, 'notifyInfo', 'info', false],
  [5045, 145, 'notifyInfo', 'info', false],
  [5048, 64, 'notifyInfoEvent', 'info', false],
  [5049, 64, 'notifyInfo', 'info', false],
  [5050, 62, 'notifyInfoEvent', 'info', false],
  [5051, 70, 'notifyInfo', 'info', false],
  [5053, 65, 'notifyInfo', 'info', false],
  [5079, 99, 'notifyInfo', 'info', false],
  [5080, 93, 'notifyInfo', 'info', false],
  [5081, 98, 'notifyInfoEvent', 'info', false],
  [5095, 23, 'notifyInfo', 'info', false],
  [5106, 32, 'notifyInfo', 'info', false],
  [5127, 101, 'notifyWarning', 'warning', false],
  [5128, 213, 'notifyInfoEvent', 'info', false],
  [5137, 135, 'notifyInfoEvent', 'info', false],
  [5138, 18, 'notifyWarning', 'warning', false],
  [5159, 58, 'notifyInfoEvent', 'info', false],
  [5160, 100, 'notifyWarning', 'warning', false],
  [5165, 99, 'notifyInfoEvent', 'info', false],
  [5165, 263, 'notifyInfo', 'info', false],
  [5183, 17, 'notifyInfoEvent', 'info', false],
  [5188, 57, 'notifyWarning', 'warning', false],
  [5188, 158, 'notifyInfoEvent', 'info', false],
  [5213, 17, 'notifyInfoEvent', 'info', false],
  [5271, 97, 'notifyInfoEvent', 'info', false],
  [5300, 84, 'notifyInfo', 'info', false],
  [5306, 85, 'notifyInfoEvent', 'info', false],
  [5307, 78, 'notifyInfo', 'info', false],
  [5308, 88, 'notifyInfoEvent', 'info', false],
  [5309, 84, 'notifyInfo', 'info', false],
  [5312, 80, 'notifyInfo', 'info', false],
  [5313, 92, 'notifyInfoEvent', 'info', false],
  [5314, 75, 'notifyInfo', 'info', false],
  [5315, 95, 'notifyInfo', 'info', false],
  [5358, 184, 'notifyInfo', 'info', false],
  [5376, 531, 'notifyInfoEvent', 'info', false],
  [5377, 111, 'notifyWarning', 'warning', false],
  [5389, 99, 'notifyInfo', 'info', false],
  [5399, 93, 'notifyInfo', 'info', false],
  [5400, 96, 'notifyInfoEvent', 'info', false],
  [5409, 96, 'notifyInfo', 'info', false],
  [5410, 101, 'notifyInfo', 'info', false],
  [5411, 194, 'notifyInfoEvent', 'info', false],
  [5422, 101, 'notifyInfo', 'info', false],
  [5487, 54, 'notifyWarning', 'warning', false],
  [5488, 66, 'notifyWarning', 'warning', false],
  [5492, 13, 'notifyInfo', 'info', false],
  [5495, 26, 'notifyInfo', 'info', false],
  [5508, 139, 'notifyInfoEvent', 'info', false],
  [5510, 121, 'notifyInfo', 'info', false],
  [5511, 68, 'notifyInfo', 'info', false],
  [5515, 71, 'notifyInfo', 'info', false],
  [5519, 133, 'notifyInfo', 'info', false],
  [5520, 67, 'notifyInfoEvent', 'info', false],
  [5521, 58, 'notifyInfo', 'info', false],
  [5522, 56, 'notifyInfo', 'info', false],
  [5602, 193, 'notifyInfo', 'info', false],
  [5606, 148, 'notifyInfoEvent', 'info', false],
  [5609, 101, 'notifyInfo', 'info', false],
  [5617, 322, 'notifyInfoEvent', 'info', false],
  [5631, 65, 'notifyInfo', 'info', false]
] as const;
export const ATTENTION_SEVERITY_PRODUCERS: readonly AttentionSeverityProducerSite[] = [
  ...APP_SEVERITY_PRODUCER_SITES.map(([line,column,helper,severity,passive]) => ({ id:`App.tsx:${line}:${column}`, file:'App.tsx', line, column, source:`${helper}@${line}:${column}`, helper, severity, passive })),
  ...GENERATED_SEVERITY_PRODUCER_SITES.map(([line,column,helper,severity,passive]) => ({ id:`generated/console.tsx:${line}:${column}`, file:'generated/console.tsx', line, column, source:`${helper}@${line}:${column}`, helper, severity, passive })),
];
