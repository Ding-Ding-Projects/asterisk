/**
 * Versioned, secret-free settings contract shared by the desktop renderer and its
 * privileged host. This file describes values only. Storage and side effects stay at
 * their respective process boundaries.
 */

export const SETTINGS_SCHEMA_VERSION = 1 as const;
export const MAX_SCHEDULE_RULES = 128;
export const MAX_ASSIGNMENTS_PER_RULE = 32;
export const SHIPPED_DISPLAY_NAME = 'Ding PBX Console';
export const STABLE_APPLICATION_ID = 'com.dingdingprojects.ding-pbx-console';
export const DEFAULT_SCHOOL_MODE_NAME = 'School mode';

export type LanguageMode = 'english' | 'cantonese' | 'bilingual';
export type NarrationLanguage = 'en' | 'zh' | 'both';
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface LanguageSettings {
  mode: LanguageMode;
  englishFunnyLevel: number;
  cantoneseFunnyLevel: number;
  showDialogEmojis: boolean;
}

export interface SchoolModeSettings {
  enabled: boolean;
  displayName: string;
}

export interface AttentionSettings {
  focus: boolean;
  lowStimulation: boolean;
  timeAwareness: boolean;
  oneThingAtATime: boolean;
  nextAction: string;
  momentum: boolean;
  momentumSnoozedUntil?: string;
}

export interface NarrationChannelSettings {
  voiceId?: string;
  rate: number;
  pitch: number;
}

export interface NarrationSettings {
  enabled: boolean;
  language: NarrationLanguage;
  channels: {
    en: NarrationChannelSettings;
    zh: NarrationChannelSettings;
  };
}

export interface DisplayNameSettings {
  /** Presentation only. Never use this value for paths, package ids, or update feeds. */
  value: string;
}

export interface AppearanceSettings {
  theme: 'dark' | 'light' | 'system';
  density: 'compact' | 'comfortable' | 'spacious';
  accentColor: string;
  fontFamily: string;
  fontScale: number;
  fontWeight: number;
  motion: boolean;
}

export type ScheduledSettingTarget =
  | 'language.mode'
  | 'language.englishFunnyLevel'
  | 'language.cantoneseFunnyLevel'
  | 'language.showDialogEmojis'
  | 'schoolMode.enabled'
  | 'schoolMode.displayName'
  | 'attention.focus'
  | 'attention.lowStimulation'
  | 'attention.timeAwareness'
  | 'attention.oneThingAtATime'
  | 'attention.nextAction'
  | 'attention.momentum'
  | 'narration.enabled'
  | 'narration.language'
  | 'narration.channels.en.voiceId'
  | 'narration.channels.en.rate'
  | 'narration.channels.en.pitch'
  | 'narration.channels.zh.voiceId'
  | 'narration.channels.zh.rate'
  | 'narration.channels.zh.pitch'
  | 'displayName.value'
  | 'appearance.theme'
  | 'appearance.density'
  | 'appearance.accentColor'
  | 'appearance.fontFamily'
  | 'appearance.fontScale'
  | 'appearance.fontWeight'
  | 'appearance.motion';

export type ScheduledValue = string | number | boolean;

export interface ScheduleAssignment {
  target: ScheduledSettingTarget;
  value: ScheduledValue;
}

export type ScheduleSource =
  | { kind: 'local' }
  | { kind: 'https-api'; endpoint: string; refreshMinutes: number }
  | { kind: 'home-assistant-boolean'; baseUrl: string; entityId: string; vaultAccountKey: string; refreshMinutes: number };

export interface ScheduleRule {
  id: string;
  label: string;
  enabled: boolean;
  /** Larger numbers win. Equal priorities resolve by later list position. */
  priority: number;
  startDate?: string;
  endDate?: string;
  startTime: string;
  endTime: string;
  weekdays: 'every-day' | Weekday[];
  source: ScheduleSource;
  assignments: ScheduleAssignment[];
}

export interface ScheduleSettings {
  /** IANA timezone name used when evaluating calendar fields. */
  timeZone: string;
  rules: ScheduleRule[];
}

export interface DesktopSettingsV1 {
  version: typeof SETTINGS_SCHEMA_VERSION;
  language: LanguageSettings;
  schoolMode: SchoolModeSettings;
  attention: AttentionSettings;
  narration: NarrationSettings;
  displayName: DisplayNameSettings;
  appearance: AppearanceSettings;
  schedule: ScheduleSettings;
}

export type DesktopSettings = DesktopSettingsV1;

export interface SettingsValidationSuccess {
  ok: true;
  value: DesktopSettings;
}

export interface SettingsValidationFailure {
  ok: false;
  reason: string;
}

export type SettingsValidationResult = SettingsValidationSuccess | SettingsValidationFailure;

export function defaultDesktopSettings(): DesktopSettings {
  return {
    version: SETTINGS_SCHEMA_VERSION,
    language: {
      mode: 'english',
      englishFunnyLevel: 5,
      cantoneseFunnyLevel: 5,
      showDialogEmojis: true,
    },
    schoolMode: { enabled: false, displayName: DEFAULT_SCHOOL_MODE_NAME },
    attention: {
      focus: false,
      lowStimulation: false,
      timeAwareness: false,
      oneThingAtATime: false,
      nextAction: '',
      momentum: false,
    },
    narration: {
      enabled: false,
      language: 'en',
      channels: {
        en: { rate: 1, pitch: 1 },
        zh: { rate: 1, pitch: 1 },
      },
    },
    displayName: { value: SHIPPED_DISPLAY_NAME },
    appearance: {
      theme: 'dark',
      density: 'comfortable',
      accentColor: '#6750A4',
      fontFamily: 'Roboto',
      fontScale: 1,
      fontWeight: 400,
      motion: true,
    },
    schedule: { timeZone: resolvedTimeZone(), rules: [] },
  };
}

function resolvedTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function exactKeys(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): string | undefined {
  const allowed = new Set([...required, ...optional]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) return `unexpected field ${JSON.stringify(key)}`;
  }
  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) return `missing field ${JSON.stringify(key)}`;
  }
  return undefined;
}

function finiteNumber(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

function boundedString(value: unknown, min: number, max: number): value is string {
  return typeof value === 'string' && value.length >= min && value.length <= max;
}

function isoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function isoInstant(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 40 && !Number.isNaN(Date.parse(value));
}

function clockTime(value: unknown): value is string {
  return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function validUrl(value: unknown, allowLoopbackHttp = false): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const parsed = new URL(value);
    if (parsed.username || parsed.password) return false;
    if (parsed.protocol === 'https:') return true;
    return allowLoopbackHttp && parsed.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname);
  } catch {
    return false;
  }
}

const languageModes = new Set<unknown>(['english', 'cantonese', 'bilingual']);
const narrationLanguages = new Set<unknown>(['en', 'zh', 'both']);
const scheduleTargets = new Set<ScheduledSettingTarget>([
  'language.mode', 'language.englishFunnyLevel', 'language.cantoneseFunnyLevel', 'language.showDialogEmojis',
  'schoolMode.enabled', 'schoolMode.displayName', 'attention.focus', 'attention.lowStimulation',
  'attention.timeAwareness', 'attention.oneThingAtATime', 'attention.nextAction', 'attention.momentum',
  'narration.enabled', 'narration.language', 'narration.channels.en.voiceId', 'narration.channels.en.rate',
  'narration.channels.en.pitch', 'narration.channels.zh.voiceId', 'narration.channels.zh.rate',
  'narration.channels.zh.pitch', 'displayName.value', 'appearance.theme', 'appearance.density',
  'appearance.accentColor', 'appearance.fontFamily', 'appearance.fontScale', 'appearance.fontWeight', 'appearance.motion',
]);

function assignmentValueMatches(target: ScheduledSettingTarget, value: unknown): value is ScheduledValue {
  if (target === 'language.mode') return languageModes.has(value);
  if (target === 'narration.language') return narrationLanguages.has(value);
  if (target.endsWith('.voiceId')) return boundedString(value, 0, 256);
  if (target.endsWith('.rate')) return finiteNumber(value, 0.5, 2);
  if (target.endsWith('.pitch')) return finiteNumber(value, 0, 2);
  if (target.endsWith('FunnyLevel')) return Number.isInteger(value) && finiteNumber(value, 1, 5);
  if (target === 'appearance.theme') return ['dark', 'light', 'system'].includes(value as string);
  if (target === 'appearance.density') return ['compact', 'comfortable', 'spacious'].includes(value as string);
  if (target === 'appearance.accentColor') return typeof value === 'string' && /^#[0-9A-Fa-f]{6}(?:[0-9A-Fa-f]{2})?$/.test(value);
  if (target.endsWith('.enabled')
    || (target.startsWith('attention.') && target !== 'attention.nextAction')
    || target === 'language.showDialogEmojis'
    || target === 'appearance.motion') return typeof value === 'boolean';
  if (target === 'appearance.fontScale') return finiteNumber(value, 0.5, 3);
  if (target === 'appearance.fontWeight') return Number.isInteger(value) && finiteNumber(value, 100, 1000);
  return boundedString(value, 0, 256);
}

function validateChannel(value: unknown, path: string): string | undefined {
  const item = record(value);
  if (!item) return `${path} must be an object`;
  const keyIssue = exactKeys(item, ['rate', 'pitch'], ['voiceId']);
  if (keyIssue) return `${path}: ${keyIssue}`;
  if (item.voiceId !== undefined && !boundedString(item.voiceId, 1, 256)) return `${path}.voiceId must be 1 to 256 characters`;
  if (!finiteNumber(item.rate, 0.5, 2)) return `${path}.rate must be between 0.5 and 2`;
  if (!finiteNumber(item.pitch, 0, 2)) return `${path}.pitch must be between 0 and 2`;
  return undefined;
}

function validateSource(value: unknown, path: string): string | undefined {
  const source = record(value);
  if (!source) return `${path} must be an object`;
  if (source.kind === 'local') {
    const issue = exactKeys(source, ['kind']);
    return issue ? `${path}: ${issue}` : undefined;
  }
  if (source.kind === 'https-api') {
    const issue = exactKeys(source, ['kind', 'endpoint', 'refreshMinutes']);
    if (issue) return `${path}: ${issue}`;
    if (!validUrl(source.endpoint, true)) return `${path}.endpoint must be HTTPS, or loopback HTTP for development`;
    if (!finiteNumber(source.refreshMinutes, 1, 1440)) return `${path}.refreshMinutes must be between 1 and 1440`;
    return undefined;
  }
  if (source.kind === 'home-assistant-boolean') {
    const issue = exactKeys(source, ['kind', 'baseUrl', 'entityId', 'vaultAccountKey', 'refreshMinutes']);
    if (issue) return `${path}: ${issue}`;
    if (!validUrl(source.baseUrl, true)) return `${path}.baseUrl must be HTTPS, or loopback HTTP for development`;
    if (!boundedString(source.entityId, 3, 255) || !/^(?:binary_sensor|input_boolean)\.[a-z0-9_]+$/.test(source.entityId)) {
      return `${path}.entityId must name a binary_sensor or input_boolean`;
    }
    if (!boundedString(source.vaultAccountKey, 1, 256)) return `${path}.vaultAccountKey must be a bounded credential-store reference`;
    if (!finiteNumber(source.refreshMinutes, 1, 1440)) return `${path}.refreshMinutes must be between 1 and 1440`;
    return undefined;
  }
  return `${path}.kind is unsupported`;
}

function validateRule(value: unknown, index: number): string | undefined {
  const path = `schedule.rules[${index}]`;
  const rule = record(value);
  if (!rule) return `${path} must be an object`;
  const issue = exactKeys(
    rule,
    ['id', 'label', 'enabled', 'priority', 'startTime', 'endTime', 'weekdays', 'source', 'assignments'],
    ['startDate', 'endDate'],
  );
  if (issue) return `${path}: ${issue}`;
  if (!boundedString(rule.id, 1, 128) || !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(rule.id)) return `${path}.id is invalid`;
  if (!boundedString(rule.label, 1, 160)) return `${path}.label must be 1 to 160 characters`;
  if (typeof rule.enabled !== 'boolean') return `${path}.enabled must be boolean`;
  if (!Number.isInteger(rule.priority) || !finiteNumber(rule.priority, -1000, 1000)) return `${path}.priority must be an integer from -1000 to 1000`;
  if (rule.startDate !== undefined && !isoDate(rule.startDate)) return `${path}.startDate must be YYYY-MM-DD`;
  if (rule.endDate !== undefined && !isoDate(rule.endDate)) return `${path}.endDate must be YYYY-MM-DD`;
  if (typeof rule.startDate === 'string' && typeof rule.endDate === 'string' && rule.startDate > rule.endDate) return `${path}.startDate must not follow endDate`;
  if (!clockTime(rule.startTime) || !clockTime(rule.endTime)) return `${path} times must use HH:MM`;
  if (rule.weekdays !== 'every-day') {
    if (!Array.isArray(rule.weekdays) || rule.weekdays.length === 0 || rule.weekdays.length > 7) return `${path}.weekdays must be every-day or a non-empty weekday list`;
    const days = new Set(rule.weekdays);
    if (days.size !== rule.weekdays.length || rule.weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) return `${path}.weekdays contains an invalid or duplicate day`;
  }
  const sourceIssue = validateSource(rule.source, `${path}.source`);
  if (sourceIssue) return sourceIssue;
  if (!Array.isArray(rule.assignments) || rule.assignments.length === 0 || rule.assignments.length > MAX_ASSIGNMENTS_PER_RULE) {
    return `${path}.assignments must contain 1 to ${MAX_ASSIGNMENTS_PER_RULE} entries`;
  }
  const seenTargets = new Set<string>();
  for (let assignmentIndex = 0; assignmentIndex < rule.assignments.length; assignmentIndex += 1) {
    const assignmentPath = `${path}.assignments[${assignmentIndex}]`;
    const assignment = record(rule.assignments[assignmentIndex]);
    if (!assignment) return `${assignmentPath} must be an object`;
    const assignmentIssue = exactKeys(assignment, ['target', 'value']);
    if (assignmentIssue) return `${assignmentPath}: ${assignmentIssue}`;
    if (!scheduleTargets.has(assignment.target as ScheduledSettingTarget)) return `${assignmentPath}.target is unsupported`;
    const target = assignment.target as ScheduledSettingTarget;
    if (seenTargets.has(target)) return `${path} assigns ${target} more than once`;
    seenTargets.add(target);
    if (!assignmentValueMatches(target, assignment.value)) return `${assignmentPath}.value is invalid for ${target}`;
  }
  return undefined;
}

/** Strict complete validation. Unknown, missing, or out-of-range fields are rejected. */
export function validateDesktopSettings(value: unknown): SettingsValidationResult {
  const root = record(value);
  if (!root) return { ok: false, reason: 'settings must be an object' };
  const rootIssue = exactKeys(root, ['version', 'language', 'schoolMode', 'attention', 'narration', 'displayName', 'appearance', 'schedule']);
  if (rootIssue) return { ok: false, reason: rootIssue };
  if (root.version !== SETTINGS_SCHEMA_VERSION) return { ok: false, reason: `unsupported settings version ${JSON.stringify(root.version)}` };

  const language = record(root.language);
  if (!language) return { ok: false, reason: 'language must be an object' };
  let issue = exactKeys(language, ['mode', 'englishFunnyLevel', 'cantoneseFunnyLevel', 'showDialogEmojis']);
  if (issue) return { ok: false, reason: `language: ${issue}` };
  if (!languageModes.has(language.mode)) return { ok: false, reason: 'language.mode is unsupported' };
  if (!Number.isInteger(language.englishFunnyLevel) || !finiteNumber(language.englishFunnyLevel, 1, 5)) return { ok: false, reason: 'language.englishFunnyLevel must be an integer from 1 to 5' };
  if (!Number.isInteger(language.cantoneseFunnyLevel) || !finiteNumber(language.cantoneseFunnyLevel, 1, 5)) return { ok: false, reason: 'language.cantoneseFunnyLevel must be an integer from 1 to 5' };
  if (typeof language.showDialogEmojis !== 'boolean') return { ok: false, reason: 'language.showDialogEmojis must be boolean' };

  const schoolMode = record(root.schoolMode);
  if (!schoolMode) return { ok: false, reason: 'schoolMode must be an object' };
  issue = exactKeys(schoolMode, ['enabled', 'displayName']);
  if (issue) return { ok: false, reason: `schoolMode: ${issue}` };
  if (typeof schoolMode.enabled !== 'boolean' || !boundedString(schoolMode.displayName, 1, 80)) return { ok: false, reason: 'schoolMode has invalid values' };

  const attention = record(root.attention);
  if (!attention) return { ok: false, reason: 'attention must be an object' };
  issue = exactKeys(attention, ['focus', 'lowStimulation', 'timeAwareness', 'oneThingAtATime', 'nextAction', 'momentum'], ['momentumSnoozedUntil']);
  if (issue) return { ok: false, reason: `attention: ${issue}` };
  for (const key of ['focus', 'lowStimulation', 'timeAwareness', 'oneThingAtATime', 'momentum'] as const) {
    if (typeof attention[key] !== 'boolean') return { ok: false, reason: `attention.${key} must be boolean` };
  }
  if (!boundedString(attention.nextAction, 0, 512)) return { ok: false, reason: 'attention.nextAction is too long' };
  if (attention.momentumSnoozedUntil !== undefined && !isoInstant(attention.momentumSnoozedUntil)) return { ok: false, reason: 'attention.momentumSnoozedUntil must be an ISO timestamp' };

  const narration = record(root.narration);
  if (!narration) return { ok: false, reason: 'narration must be an object' };
  issue = exactKeys(narration, ['enabled', 'language', 'channels']);
  if (issue) return { ok: false, reason: `narration: ${issue}` };
  if (typeof narration.enabled !== 'boolean' || !narrationLanguages.has(narration.language)) return { ok: false, reason: 'narration has invalid values' };
  const channels = record(narration.channels);
  if (!channels) return { ok: false, reason: 'narration.channels must be an object' };
  issue = exactKeys(channels, ['en', 'zh']);
  if (issue) return { ok: false, reason: `narration.channels: ${issue}` };
  issue = validateChannel(channels.en, 'narration.channels.en') ?? validateChannel(channels.zh, 'narration.channels.zh');
  if (issue) return { ok: false, reason: issue };

  const displayName = record(root.displayName);
  if (!displayName) return { ok: false, reason: 'displayName must be an object' };
  issue = exactKeys(displayName, ['value']);
  if (issue) return { ok: false, reason: `displayName: ${issue}` };
  if (!boundedString(displayName.value, 1, 80)) return { ok: false, reason: 'displayName.value must be 1 to 80 characters' };

  const appearance = record(root.appearance);
  if (!appearance) return { ok: false, reason: 'appearance must be an object' };
  issue = exactKeys(appearance, ['theme', 'density', 'accentColor', 'fontFamily', 'fontScale', 'fontWeight', 'motion']);
  if (issue) return { ok: false, reason: `appearance: ${issue}` };
  if (!['dark', 'light', 'system'].includes(appearance.theme as string)) return { ok: false, reason: 'appearance.theme is unsupported' };
  if (!['compact', 'comfortable', 'spacious'].includes(appearance.density as string)) return { ok: false, reason: 'appearance.density is unsupported' };
  if (typeof appearance.accentColor !== 'string' || !/^#[0-9A-Fa-f]{6}(?:[0-9A-Fa-f]{2})?$/.test(appearance.accentColor)) return { ok: false, reason: 'appearance.accentColor must be HEX or HEX8' };
  if (!boundedString(appearance.fontFamily, 1, 160)) return { ok: false, reason: 'appearance.fontFamily is invalid' };
  if (!finiteNumber(appearance.fontScale, 0.5, 3)) return { ok: false, reason: 'appearance.fontScale must be between 0.5 and 3' };
  if (!Number.isInteger(appearance.fontWeight) || !finiteNumber(appearance.fontWeight, 100, 1000)) return { ok: false, reason: 'appearance.fontWeight must be an integer from 100 to 1000' };
  if (typeof appearance.motion !== 'boolean') return { ok: false, reason: 'appearance.motion must be boolean' };

  const schedule = record(root.schedule);
  if (!schedule) return { ok: false, reason: 'schedule must be an object' };
  issue = exactKeys(schedule, ['timeZone', 'rules']);
  if (issue) return { ok: false, reason: `schedule: ${issue}` };
  if (!boundedString(schedule.timeZone, 1, 128)) return { ok: false, reason: 'schedule.timeZone is invalid' };
  try { new Intl.DateTimeFormat('en-CA', { timeZone: schedule.timeZone }).format(); } catch { return { ok: false, reason: 'schedule.timeZone is not recognized' }; }
  if (!Array.isArray(schedule.rules) || schedule.rules.length > MAX_SCHEDULE_RULES) return { ok: false, reason: `schedule.rules must contain at most ${MAX_SCHEDULE_RULES} entries` };
  const ruleIds = new Set<string>();
  for (let index = 0; index < schedule.rules.length; index += 1) {
    issue = validateRule(schedule.rules[index], index);
    if (issue) return { ok: false, reason: issue };
    const id = (schedule.rules[index] as ScheduleRule).id;
    if (ruleIds.has(id)) return { ok: false, reason: `schedule rule id ${JSON.stringify(id)} is duplicated` };
    ruleIds.add(id);
  }

  return { ok: true, value: structuredClone(root) as unknown as DesktopSettings };
}
