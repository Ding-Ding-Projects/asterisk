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

function exactOwnedMarker(sources: { design: string; app: string; generated: string; module: string }, marker: { owner: 'design' | 'app' | 'generated' | 'module'; text: string }, label: string): void {
  const source = sources[marker.owner];
  const count = source.split(marker.text).length - 1;
  if (count !== 1) throw new Error(`${label} must have exactly one ${marker.owner} implementation match, found ${count}: ${marker.text}`);
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
    exactOwnedMarker(sources, row.designMarker, `${row.id} design control`);
    exactOwnedMarker(sources, row.controlConstruction, `${row.id} App control construction`);
    exactOwnedMarker(sources, row.durableKey, `${row.id} durable key`);
    for (const marker of row.writerMarkers) exactOwnedMarker(sources, marker, `${row.id} writer chain`);
    for (const marker of row.setterMarkers) exactOwnedMarker(sources, marker, `${row.id} setter`);
    for (const marker of row.consumerMarkers) exactOwnedMarker(sources, marker, `${row.id} consumer`);
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
  for (const route of ATTENTION_SEVERITY_ROUTES) {
    const source = sourceMap.get(route.file);
    if (!source) throw new Error(`Severity route source is absent: ${route.id}.`);
    const lines = sourceLines(source);
    const block = `${lines[route.line - 2] ?? ''}\n${lines[route.line - 1] ?? ''}`;
    let cursor = -1;
    for (const branch of route.branches) {
      const helperIndex = block.indexOf(`${branch.helper}(`, cursor + 1);
      if (helperIndex < 0) throw new Error(`Severity route ${route.id} is missing ${branch.input} -> ${branch.helper}.`);
      if (branch.input !== 'default') {
        const condition = `severity === '${branch.input}'`;
        const conditionIndex = block.indexOf(condition, cursor + 1);
        if (conditionIndex < 0 || conditionIndex > helperIndex) throw new Error(`Severity route ${route.id} does not bind ${branch.helper} to ${branch.input}.`);
      }
      cursor = helperIndex;
    }
    const routeEntries = inventory.filter((entry) => entry.file === route.file && entry.line === route.line);
    if (routeEntries.length !== route.branches.length) throw new Error(`Severity route ${route.id} inventory count drifted.`);
    for (const branch of route.branches) {
      if (!routeEntries.some((entry) => entry.helper === branch.helper && entry.passive)) throw new Error(`Severity route ${route.id} lacks passive inventory for ${branch.helper}.`);
    }
  }
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

import {
  ATTENTION_MUTATION_ACTIONS,
  ATTENTION_MUTATION_INVENTORY,
  ATTENTION_MUTATION_PASSIVE_EXCLUSIONS,
  ATTENTION_SEVERITY_PRODUCERS,
  ATTENTION_SEVERITY_ROUTES,
  ATTENTION_WIRING,
  type AttentionSeverityProducerSite,
  type AttentionWiringRow,
} from './attention-inventory.js';
export { ATTENTION_MUTATION_ACTIONS, ATTENTION_MUTATION_INVENTORY, ATTENTION_MUTATION_PASSIVE_EXCLUSIONS, ATTENTION_SEVERITY_PRODUCERS, ATTENTION_SEVERITY_ROUTES, ATTENTION_WIRING } from './attention-inventory.js';
export type { AttentionSeverityProducerSite, AttentionWiringRow } from './attention-inventory.js';
