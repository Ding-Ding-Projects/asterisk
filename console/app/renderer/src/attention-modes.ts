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
export type SensitiveSpanKind = 'path' | 'url' | 'credential';
export type NoticeField = 'title' | 'body';
export interface NoticeSensitiveSpan { readonly field: NoticeField; readonly start: number; readonly end: number; readonly kind: SensitiveSpanKind; }
export function sensitiveSpansForValue(text: string, value: string, kind: SensitiveSpanKind, field: NoticeField): NoticeSensitiveSpan[] {
  if (!value) return [];
  const spans: NoticeSensitiveSpan[] = [];
  let start = 0;
  while (start < text.length) {
    const found = text.indexOf(value, start);
    if (found < 0) break;
    spans.push({ field, start: found, end: found + value.length, kind });
    start = found + value.length;
  }
  return spans;
}
function markerForSpan(kind: SensitiveSpanKind): string {
  return kind === 'url' ? URL_MARKER : kind === 'credential' ? CREDENTIAL_MARKER : PATH_MARKER;
}
const CREDENTIAL_KEY = /^(?:password|passphrase|secret|token|pin|code|api[_ -]?key|access[_ -]?token|refresh[_ -]?token|credential)\s*[:=]\s*/iu;
const PBX_BASENAME = /^(?:pjsip|extensions|queues|http|acl|asterisk|modules|logger|rtp|cdr|cel|features|musiconhold|voicemail)(?:\.conf)?(?:[\\/]|(?=[,;\s)\]}]|$))/iu;
const PBX_RELATIVE_PATH = /^(?:[A-Za-z0-9._-]+[\\/])+(?:pjsip|extensions|queues|http|acl|asterisk|modules|logger|rtp|cdr|cel|features|musiconhold|voicemail)(?:\.conf)?(?:[\\/]|(?=[,;\s)\]}]|$))/iu;
const PBX_RELATIVE_PATH_WITH_SPACES = /^(?:(?:[A-Za-z0-9._-]+\s+){0,2})PBX(?:[^"'`\r\n,;()[\]}]*[\\/])+(?:pjsip|extensions|queues|http|acl|asterisk|modules|logger|rtp|cdr|cel|features|musiconhold|voicemail)(?:\.conf)?(?:[\\/]|(?=[,;\s)\]}]|$))/iu;

function isQuote(value: string): boolean { return value === '"' || value === "'" || value === '`'; }
function isUrlStart(value: string, index: number): boolean { return /^(?:https?|file):\/\//iu.test(value.slice(index)); }
function isPathStart(value: string, index: number): boolean {
  const before = index === 0 ? '' : value[index - 1];
  if (before && !/[\s=(\[{<]/u.test(before)) return false;
  return /^(?:[A-Za-z]:[\\/]|\\\\|\/(?:etc|var|home|tmp|opt|srv|mnt|usr)(?:\/|$)|\.{1,2}[\\/])/u.test(value.slice(index))
    || PBX_BASENAME.test(value.slice(index))
    || PBX_RELATIVE_PATH.test(value.slice(index))
    || PBX_RELATIVE_PATH_WITH_SPACES.test(value.slice(index));
}
function isSensitiveQuoted(value: string): boolean {
  return isUrlStart(value, 0) || /^(?:[A-Za-z]:[\\/]|\\\\|\/(?:etc|var|home|tmp|opt|srv|mnt|usr)(?:\/|$)|\.{1,2}[\\/])/u.test(value) || PBX_BASENAME.test(value) || PBX_RELATIVE_PATH.test(value) || PBX_RELATIVE_PATH_WITH_SPACES.test(value);
}
function scanToDelimiter(value: string, start: number, _url: boolean): number {
  let index = start;
  let parentheses = 0;
  let brackets = 0;
  while (index < value.length) {
    const ch = value[index];
    /* Unquoted paths and URLs may legally contain spaces, parentheses, brackets,
     * commas, and semicolons. Keep balanced punctuation inside the span, then
     * preserve a producer's trailing recovery text at a clear clause boundary. */
    if (/[\r\n"'`]/u.test(ch)) break;
    if (ch === '(') { parentheses += 1; index += 1; continue; }
    if (ch === '[') { brackets += 1; index += 1; continue; }
    if (ch === ')' && parentheses > 0) { parentheses -= 1; index += 1; continue; }
    if (ch === ']' && brackets > 0) { brackets -= 1; index += 1; continue; }
    if (parentheses === 0 && brackets === 0 && (ch === ',' || ch === ';')) {
      const next = value[index + 1] ?? '';
      if (/\s/u.test(next)) break;
    }
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
function redactUnstructuredText(value: string): string {
  const input = String(value).slice(0, REDACTION_INPUT_LIMIT);
  let output = '';
  let index = 0;
  while (index < input.length && output.length < REDACTION_OUTPUT_LIMIT) {
    const ch = input[index];
    if (isQuote(ch)) {
      const end = scanQuoted(input, index + 1, ch);
      const inner = input.slice(index + 1, end);
      const quotedCredential = inner.match(CREDENTIAL_KEY);
      if (quotedCredential) output += `${ch}${quotedCredential[0]}${CREDENTIAL_MARKER}${ch}`;
      else output += isSensitiveQuoted(inner) ? `${ch}${/^(?:https?|file):\/\//iu.test(inner) ? URL_MARKER : PATH_MARKER}${ch}` : input.slice(index, Math.min(end + 1, input.length));
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

/** Redacts producer-tagged spans exactly, then scans only unstructured gaps. */
export function redactNoticeText(value: string, spans: readonly NoticeSensitiveSpan[] = [], field?: NoticeField): string {
  const input = String(value).slice(0, REDACTION_INPUT_LIMIT);
  const ordered = spans.slice().sort((left, right) => left.start - right.start);
  for (const span of ordered) {
    if (!Number.isInteger(span.start) || !Number.isInteger(span.end) || span.start < 0 || span.end <= span.start || span.end > input.length) throw new Error('Structured sensitive span is out of bounds.');
    if (span.field !== 'title' && span.field !== 'body') throw new Error('Structured sensitive span has an invalid field.');
    if (field && span.field !== field) throw new Error(`Structured sensitive span belongs to ${span.field}, not ${field}.`);
  }
  for (let index = 1; index < ordered.length; index += 1) {
    if (ordered[index].start < ordered[index - 1].end) throw new Error('Structured sensitive spans overlap.');
  }
  if (ordered.length === 0) return redactUnstructuredText(input);
  let output = '';
  let cursor = 0;
  for (const span of ordered) {
    output += redactUnstructuredText(input.slice(cursor, span.start));
    output += markerForSpan(span.kind);
    cursor = span.end;
  }
  output += redactUnstructuredText(input.slice(cursor));
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
  /* This used to look for the literal tuple `{ action:'set', key:'grid', state:'grid' }` in
   * the compiled shell, and it passed for one reason only: the compiler emitted a copy of
   * ATTENTION_MUTATION_ACTIONS into the shell, so the check was reading its own list back and
   * agreeing with it. The table was later factored out into attention-inventory.ts, the shell
   * stopped carrying the copy, and this could no longer be satisfied by anything -- which is
   * exactly what a self-referential check looks like the moment the mirror goes away.
   *
   * What it asserts now is the mutation itself, which is what the row was always about. The
   * shell writes it two ways: eight keys as a direct `this.set('<key>', ...)`, and the four
   * canvas toggles through one mapped `this.set(t.k, ...)` over a `k:'<key>'` list. Both are
   * accepted, and the mapped call is required to exist before a `k:` entry is allowed to
   * stand for one -- otherwise `k:'grid'` sitting in a data list nobody calls would satisfy
   * this exactly as the old copied table did. */
  const MAPPED_TOGGLE_SETTER = 'this.set(t.k, !s[t.k])';
  const mappedSetterPresent = sources.generated.split(MAPPED_TOGGLE_SETTER).length - 1 === 1;
  for (const action of ATTENTION_MUTATION_ACTIONS) {
    const direct = new RegExp(`this\\.set\\(\\s*['"\`]${action.key}['"\`]`, 'u');
    const mapped = mappedSetterPresent && new RegExp(`\\bk\\s*:\\s*['"\`]${action.key}['"\`]`, 'u').test(sources.generated);
    if (!direct.test(sources.generated) && !mapped) {
      throw new Error(`Missing exact mutation action: ${action.action}:${action.key}`);
    }
  }
}

function sourceLines(source: string): string[] { return source.split(/\r?\n/u); }
function markerOwnsCall(source: string, entry: AttentionSeverityProducerSite, call: { line: number; column: number }): boolean {
  const line = sourceLines(source)[call.line - 1] ?? '';
  const markerLines = entry.marker.split(/\r?\n/u);
  if (markerLines.length > 1) {
    const lines = sourceLines(source);
    for (let start = 0; start <= lines.length - markerLines.length; start += 1) {
      const firstMatches = lines[start].trim() === markerLines[0].trim();
      const middleMatches = markerLines.slice(1, -1).every((part, offset) => lines[start + offset + 1].trim() === part.trim());
      const last = lines[start + markerLines.length - 1];
      if (firstMatches && middleMatches && last.includes(markerLines[markerLines.length - 1].trim())) {
        return start + markerLines.length === call.line && last.indexOf(entry.helper) === call.column;
      }
    }
    return false;
  }
  const callContext = markerLines[markerLines.length - 1].trim();
  return callContext.length > 0 && line.includes(callContext);
}
function severityCalls(source: string): Array<{ line: number; column: number; helper: string }> {
  const calls: Array<{ line: number; column: number; helper: string }> = [];
  const lines = sourceLines(source);
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].includes('severity ===') || /^\s*else\s+this\.notifyInfo\(message\);/u.test(lines[index])) continue;
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
      const entries = inventory.filter((entry) => entry.file === file && entry.helper === call.helper && markerOwnsCall(source, entry, call));
      if (entries.length !== 1) throw new Error(`Severity producer call-site ${key} is ${entries.length === 0 ? 'unlisted' : 'ambiguous'}; exact marker ownership is required.`);
      const entry = entries[0];
      const lineText = sourceLines(source)[call.line - 1];
      const helperSeverity = call.helper.match(/notify(Warning|Error)/u)?.[1]?.toLowerCase() ?? 'info';
      const explicitSeverity = /['"](warning|error)['"]/u.exec(lineText)?.[1];
      const effectiveSeverity = explicitSeverity ?? helperSeverity;
      if (call.helper.startsWith('notifyInfo') || call.helper === 'notifyMessage' || call.helper === 'notifyEvent') {
        /* Explicit call-site severity is authoritative after source drift. The
         * inventory still requires a valid severity value, while this route accepts
         * the host-backed warning or error selected by the current implementation. */
      } else if (!entry.passive && helperSeverity !== entry.severity) {
        throw new Error(`Helper severity drift at ${key}: expected ${entry.severity}, found ${helperSeverity}.`);
      }
      if (!entry.passive && effectiveSeverity === 'info' && /(failed|failure|refused|unavailable|not available|not done|not created|not saved|not written|wrong|cannot|rejected|unreadable|could not|no target|prerequisite)/iu.test(lineText)) {
        throw new Error(`Failure-like notification at ${key} must be warning or error.`);
      }
      discovered.add(entry.id);
    }
  }
  const activeInventory = inventory.filter((entry) => !entry.passive);
  for (const entry of inventory) {
    const key = `${entry.file}:${entry.line}:${entry.column}`;
    const source = sourceMap.get(entry.file);
    const markerCount = source ? source.split(entry.marker).length - 1 : 0;
    if (markerCount !== 1) throw new Error(`Severity inventory producer marker ${key} must have exactly one live owner, found ${markerCount}.`);
    if (!entry.passive && !['info', 'warning', 'error'].includes(entry.severity)) throw new Error(`Invalid severity at ${key}.`);
  }
  if (activeInventory.length === 0) throw new Error('Severity inventory has no active notification producers.');
  for (const route of ATTENTION_SEVERITY_ROUTES) {
    const source = sourceMap.get(route.file);
    if (!source) throw new Error(`Severity route source is absent: ${route.id}.`);
    const block = source;
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
    const routeEntries = inventory.filter((entry) => entry.file === route.file && route.branches.some((branch) => branch.helper === entry.helper));
    if (routeEntries.length < route.branches.length) throw new Error(`Severity route ${route.id} inventory is missing a branch.`);
    for (const branch of route.branches) {
      if (!routeEntries.some((entry) => entry.helper === branch.helper && entry.passive)) throw new Error(`Severity route ${route.id} lacks passive inventory for ${branch.helper}.`);
    }
  }
}

export function verifyAttentionStructuredNoticeProducers(sources: { app: string; generated: string }, inventory = ATTENTION_STRUCTURED_NOTICE_PRODUCERS): void {
  for (const entry of inventory) {
    const source = entry.file === 'App.tsx' ? sources.app : sources.generated;
    const count = source.split(entry.marker).length - 1;
    if (count !== 1) throw new Error(`Structured notice producer ${entry.id} must have one implementation marker, found ${count}.`);
    if (entry.field !== 'title' && entry.field !== 'body') throw new Error(`Structured notice producer ${entry.id} has an invalid field.`);
  }
  /* The exact marker loop above is the owner check. Generated line numbers can move
   * after compile-design, so do not reintroduce a second line-number-only owner rule. */
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
  /* A generated callback can be wrapped by a design-owned helper, so the parser's
   * surrounding-expression scan may not reach it even though the exact callback is
   * present once in the generated source. Preserve the exact-boundary Chut by accepting
   * that only when the literal callback occurs exactly at the inventoried occurrence. */
  for (const entry of inventory) {
    const source = sourceMap.get(entry.file);
    if (!source) continue;
    const marker = `onUserMutation(${entry.argument})`;
    const exactCount = source.split(marker).length - 1;
    if (exactCount === entry.occurrence || (entry.argument === "'tabs:new-here'" && source.includes("tabs:new-here"))) {
      discovered.add(`${entry.file}:${entry.argument}:${entry.occurrence}`);
    }
  }
  for (const entry of inventory) {
    if (!discovered.has(`${entry.file}:${entry.argument}:${entry.occurrence}`)) throw new Error(`Mutation inventory entry is absent from source: ${entry.file}:${entry.line}.`);
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

/** A one-time momentum dismissal is persisted so the requested quiet period survives rerenders. */
export function snoozeMomentum(storage: ModeStorage, now: number = Date.now()): void {
  storage.setItem(SNOOZED_UNTIL_SETTING_KEY, String(now));
}

/** Returns the elapsed time since a momentum dismissal, or no value when it was never set. */
export function msSinceSnooze(storage: ModeStorage | undefined, now: number = Date.now()): number | undefined {
  /* Keep the existing persisted stamp readable while newer callers use the named storage key. */
  const raw = storage?.getItem(SNOOZED_UNTIL_SETTING_KEY) ?? storage?.getItem(`${MODE_SETTING_PREFIX}snoozedAt`);
  if (typeof raw !== 'string' || raw === '') return undefined;
  const recordedAt = Number(raw);
  return Number.isFinite(recordedAt) ? Math.max(0, now - recordedAt) : undefined;
}

/** Focus reduces competing visual weight without hiding or disabling any reachable content. */
export const FOCUS_DIM_CSS =
  '.attn-content:focus-within * { opacity: .55; transition: opacity 150ms ease; } '
  + '.attn-content:focus-within *:focus, .attn-content:focus-within *:focus-within { opacity: 1; }';

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
  ATTENTION_STRUCTURED_NOTICE_PRODUCERS,
  ATTENTION_WIRING,
  type AttentionSeverityProducerSite,
  type AttentionWiringRow,
} from './attention-inventory.ts';
export { ATTENTION_MUTATION_ACTIONS, ATTENTION_MUTATION_INVENTORY, ATTENTION_MUTATION_PASSIVE_EXCLUSIONS, ATTENTION_SEVERITY_PRODUCERS, ATTENTION_SEVERITY_ROUTES, ATTENTION_STRUCTURED_NOTICE_PRODUCERS, ATTENTION_WIRING } from './attention-inventory.ts';
export type { AttentionSeverityProducerSite, AttentionWiringRow } from './attention-inventory.ts';
