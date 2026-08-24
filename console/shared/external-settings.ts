/**
 * Secret-free contracts for scheduled settings sources.
 *
 * This module is deliberately free of fetch, filesystem, Electron, and vault
 * calls. The renderer and the privileged control-plane client share the same
 * bounded value contract, while the client owns all I/O and the store keeps
 * remote values in memory only.
 */

export const EXTERNAL_SETTINGS_SCHEMA_VERSION = 1 as const;
export const MAX_EXTERNAL_RESPONSE_BYTES = 256 * 1024;
export const MAX_EXTERNAL_RESPONSE_DEPTH = 8;
export const MAX_EXTERNAL_ASSIGNMENTS = 32;
export const MAX_EXTERNAL_STRING_LENGTH = 256;
export const MIN_REFRESH_MINUTES = 1;
export const MAX_REFRESH_MINUTES = 1440;
export const EXTERNAL_REQUEST_TIMEOUT_MS = 10_000;

export const SCHEDULED_SETTING_TARGETS = [
  'language.mode',
  'language.englishFunnyLevel',
  'language.cantoneseFunnyLevel',
  'language.showDialogEmojis',
  'schoolMode.enabled',
  'schoolMode.displayName',
  'attention.focus',
  'attention.lowStimulation',
  'attention.timeAwareness',
  'attention.oneThingAtATime',
  'attention.nextAction',
  'attention.momentum',
  'narration.enabled',
  'narration.language',
  'narration.channels.en.voiceId',
  'narration.channels.en.rate',
  'narration.channels.en.pitch',
  'narration.channels.zh.voiceId',
  'narration.channels.zh.rate',
  'narration.channels.zh.pitch',
  'displayName.value',
  'appearance.theme',
  'appearance.density',
  'appearance.accentColor',
  'appearance.fontFamily',
  'appearance.fontScale',
  'appearance.fontWeight',
  'appearance.motion',
] as const;

export type ScheduledSettingTarget = typeof SCHEDULED_SETTING_TARGETS[number];
export type ScheduledValue = string | number | boolean;

export interface ScheduleAssignment {
  readonly target: ScheduledSettingTarget;
  readonly value: ScheduledValue;
}

export type ExternalSettingsSource =
  | { readonly kind: 'local' }
  | { readonly kind: 'https-api'; readonly endpoint: string; readonly refreshMinutes: number }
  | {
      readonly kind: 'home-assistant-boolean';
      readonly baseUrl: string;
      readonly entityId: string;
      /** A vault account reference, never the token itself. */
      readonly vaultAccountKey: string;
      readonly refreshMinutes: number;
    };

export type ExternalSettingsSourceKind = ExternalSettingsSource['kind'];

export type ExternalSettingsStatus =
  | 'idle'
  | 'refreshing'
  | 'active'
  | 'inactive'
  | 'stale'
  | 'offline'
  | 'auth-error'
  | 'rate-limited'
  | 'malformed'
  | 'timeout'
  | 'blocked'
  | 'cancelled'
  | 'failed';

export interface ExternalSettingsReading {
  readonly active: boolean;
  /** Local and Home Assistant sources use the rule's assignments. */
  readonly assignments?: readonly ScheduleAssignment[];
  readonly observedAt: string;
  readonly expiresAt?: string;
  readonly revision?: string;
}

export interface ExternalSettingsSnapshot extends ExternalSettingsReading {
  readonly sourceKind: ExternalSettingsSourceKind;
}

export interface ExternalSettingsState {
  readonly sourceKind: ExternalSettingsSourceKind;
  /** The schedule's local assignments. This value is never replaced by remote data. */
  readonly baseAssignments: readonly ScheduleAssignment[];
  /** The most recent accepted remote reading, kept in memory only. */
  readonly lastValid: ExternalSettingsSnapshot | undefined;
  /** The assignments selected for this evaluation, never a persisted base value. */
  readonly effectiveAssignments: readonly ScheduleAssignment[];
  readonly active: boolean;
  readonly status: ExternalSettingsStatus;
  readonly lastRefreshAt: string | undefined;
  readonly nextRefreshAt: string | undefined;
  readonly lastError: string | undefined;
  /** Fixed false marker for consumers that need to assert the persistence boundary. */
  readonly remoteValuePersistedAsBase: false;
}

export interface ExternalSettingsProjection {
  readonly sourceKind: ExternalSettingsSourceKind;
  readonly status: ExternalSettingsStatus;
  readonly active: boolean;
  readonly effectiveAssignments: readonly ScheduleAssignment[];
  readonly assignmentCount: number;
  readonly isFallback: boolean;
  readonly isStale: boolean;
  readonly lastRefreshAt: string | undefined;
  readonly nextRefreshAt: string | undefined;
  readonly lastError: string | undefined;
}

const TARGET_SET: ReadonlySet<string> = new Set(SCHEDULED_SETTING_TARGETS);
const LANGUAGE_MODES = new Set(['english', 'cantonese', 'bilingual']);
const NARRATION_LANGUAGES = new Set(['en', 'zh', 'both']);
const THEMES = new Set(['dark', 'light', 'system']);
const DENSITIES = new Set(['compact', 'comfortable', 'spacious']);

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function exactKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = [],
): string | undefined {
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

function assignmentValueMatches(target: ScheduledSettingTarget, value: unknown): value is ScheduledValue {
  if (target === 'language.mode') return typeof value === 'string' && LANGUAGE_MODES.has(value);
  if (target === 'narration.language') return typeof value === 'string' && NARRATION_LANGUAGES.has(value);
  if (target.endsWith('.voiceId')) return boundedString(value, 0, MAX_EXTERNAL_STRING_LENGTH);
  if (target.endsWith('.rate')) return finiteNumber(value, 0.5, 2);
  if (target.endsWith('.pitch')) return finiteNumber(value, 0, 2);
  if (target.endsWith('FunnyLevel')) return Number.isInteger(value) && finiteNumber(value, 1, 5);
  if (target === 'appearance.theme') return typeof value === 'string' && THEMES.has(value);
  if (target === 'appearance.density') return typeof value === 'string' && DENSITIES.has(value);
  if (target === 'appearance.accentColor') return typeof value === 'string' && /^#[0-9A-Fa-f]{6}(?:[0-9A-Fa-f]{2})?$/u.test(value);
  if (target.endsWith('.enabled')
    || (target.startsWith('attention.') && target !== 'attention.nextAction')
    || target === 'language.showDialogEmojis'
    || target === 'appearance.motion') return typeof value === 'boolean';
  if (target === 'appearance.fontScale') return finiteNumber(value, 0.5, 3);
  if (target === 'appearance.fontWeight') return Number.isInteger(value) && finiteNumber(value, 100, 1000);
  return boundedString(value, 0, MAX_EXTERNAL_STRING_LENGTH);
}

/** Validate and clone an allowlisted set of scheduled values. */
export function validateAssignments(value: unknown):
  | { readonly ok: true; readonly assignments: readonly ScheduleAssignment[] }
  | { readonly ok: false; readonly reason: string } {
  if (!Array.isArray(value)) return { ok: false, reason: 'assignments must be an array' };
  if (value.length > MAX_EXTERNAL_ASSIGNMENTS) {
    return { ok: false, reason: `assignments must contain at most ${MAX_EXTERNAL_ASSIGNMENTS} entries` };
  }
  const seen = new Set<string>();
  const assignments: ScheduleAssignment[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const item = value[index];
    if (!isRecord(item)) return { ok: false, reason: `assignments[${index}] must be an object` };
    const issue = exactKeys(item, ['target', 'value']);
    if (issue) return { ok: false, reason: `assignments[${index}]: ${issue}` };
    if (typeof item.target !== 'string' || !TARGET_SET.has(item.target)) {
      return { ok: false, reason: `assignments[${index}].target is not allowlisted` };
    }
    const target = item.target as ScheduledSettingTarget;
    if (seen.has(target)) return { ok: false, reason: `assignments cannot set ${target} more than once` };
    seen.add(target);
    if (!assignmentValueMatches(target, item.value)) {
      return { ok: false, reason: `assignments[${index}].value is invalid for ${target}` };
    }
    assignments.push({ target, value: item.value });
  }
  return { ok: true, assignments };
}

function strippedHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[/u, '').replace(/\]$/u, '');
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split('.');
  if (parts.length !== 4 || parts.some((part) => !/^\d+$/u.test(part))) return false;
  const octets = parts.map(Number);
  if (octets.some((octet) => octet < 0 || octet > 255)) return true;
  const [first, second] = octets;
  return first === 0 || first === 10 || first === 127 || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168)
    || first >= 224;
}

function isLoopback(hostname: string): boolean {
  const host = strippedHostname(hostname);
  return host === 'localhost' || host === '::1' || /^127(?:\.\d{1,3}){3}$/u.test(host);
}

function isBlockedHostname(hostname: string): boolean {
  const host = strippedHostname(hostname);
  if (isLoopback(host)) return false;
  if (isPrivateIpv4(host)) return true;
  if (host === '::' || host === '0:0:0:0:0:0:0:0' || host.endsWith('.local')) return true;
  return false;
}

export function validateExternalUrl(value: unknown):
  | { readonly ok: true; readonly url: string; readonly loopbackDevelopment: boolean }
  | { readonly ok: false; readonly reason: string } {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2048) {
    return { ok: false, reason: 'URL must be a non-empty string of at most 2048 characters' };
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, reason: 'URL is not valid' };
  }
  if (parsed.username || parsed.password) return { ok: false, reason: 'URL credentials are not accepted' };
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && isLoopback(parsed.hostname))) {
    return { ok: false, reason: 'URL must use HTTPS, or HTTP only for loopback development' };
  }
  if (parsed.protocol === 'https:' && isBlockedHostname(parsed.hostname)) {
    return { ok: false, reason: 'Private, link-local, multicast, and local host targets are blocked' };
  }
  if (parsed.protocol === 'http:' && !isLoopback(parsed.hostname)) {
    return { ok: false, reason: 'HTTP is accepted only for loopback development' };
  }
  if (parsed.pathname.includes('\\') || parsed.pathname.startsWith('//')) {
    return { ok: false, reason: 'URL path is not accepted for file or UNC access' };
  }
  return { ok: true, url: parsed.toString(), loopbackDevelopment: parsed.protocol === 'http:' };
}

export function validateExternalSource(value: unknown):
  | { readonly ok: true; readonly source: ExternalSettingsSource }
  | { readonly ok: false; readonly reason: string } {
  if (!isRecord(value) || typeof value.kind !== 'string') return { ok: false, reason: 'source must name a kind' };
  if (value.kind === 'local') {
    const issue = exactKeys(value, ['kind']);
    return issue ? { ok: false, reason: `source: ${issue}` } : { ok: true, source: { kind: 'local' } };
  }
  if (value.kind === 'https-api') {
    const issue = exactKeys(value, ['kind', 'endpoint', 'refreshMinutes']);
    if (issue) return { ok: false, reason: `source: ${issue}` };
    const endpoint = validateExternalUrl(value.endpoint);
    if (!endpoint.ok) return { ok: false, reason: `source.endpoint: ${endpoint.reason}` };
    if (!finiteNumber(value.refreshMinutes, MIN_REFRESH_MINUTES, MAX_REFRESH_MINUTES)) {
      return { ok: false, reason: `source.refreshMinutes must be between ${MIN_REFRESH_MINUTES} and ${MAX_REFRESH_MINUTES}` };
    }
    return { ok: true, source: { kind: 'https-api', endpoint: endpoint.url, refreshMinutes: value.refreshMinutes } };
  }
  if (value.kind === 'home-assistant-boolean') {
    const issue = exactKeys(value, ['kind', 'baseUrl', 'entityId', 'vaultAccountKey', 'refreshMinutes']);
    if (issue) return { ok: false, reason: `source: ${issue}` };
    const baseUrl = validateExternalUrl(value.baseUrl);
    if (!baseUrl.ok) return { ok: false, reason: `source.baseUrl: ${baseUrl.reason}` };
    if (typeof value.entityId !== 'string' || !/^(?:binary_sensor|input_boolean)\.[a-z0-9_]+$/u.test(value.entityId)) {
      return { ok: false, reason: 'source.entityId must name a binary_sensor or input_boolean' };
    }
    if (typeof value.vaultAccountKey !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u.test(value.vaultAccountKey)) {
      return { ok: false, reason: 'source.vaultAccountKey must be a bounded vault reference, not a token' };
    }
    if (!finiteNumber(value.refreshMinutes, MIN_REFRESH_MINUTES, MAX_REFRESH_MINUTES)) {
      return { ok: false, reason: `source.refreshMinutes must be between ${MIN_REFRESH_MINUTES} and ${MAX_REFRESH_MINUTES}` };
    }
    return {
      ok: true,
      source: {
        kind: 'home-assistant-boolean',
        baseUrl: baseUrl.url,
        entityId: value.entityId,
        vaultAccountKey: value.vaultAccountKey,
        refreshMinutes: value.refreshMinutes,
      },
    };
  }
  return { ok: false, reason: 'source.kind is unsupported' };
}

export function parseBoundedJson(rawText: string):
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly reason: string } {
  const bytes = new TextEncoder().encode(rawText).byteLength;
  if (bytes > MAX_EXTERNAL_RESPONSE_BYTES) {
    return { ok: false, reason: `response exceeds the ${MAX_EXTERNAL_RESPONSE_BYTES}-byte limit` };
  }
  try {
    const value: unknown = JSON.parse(rawText);
    if (hasUnsafeKeys(value)) return { ok: false, reason: 'response contains unsafe object keys' };
    const depth = jsonDepth(value);
    if (depth > MAX_EXTERNAL_RESPONSE_DEPTH) return { ok: false, reason: `response exceeds the depth ${MAX_EXTERNAL_RESPONSE_DEPTH} limit` };
    return { ok: true, value };
  } catch {
    return { ok: false, reason: 'response is not valid JSON' };
  }
}

function jsonDepth(value: unknown, parentDepth = 0): number {
  if (value === null || typeof value !== 'object') return parentDepth;
  if (parentDepth > MAX_EXTERNAL_RESPONSE_DEPTH + 1) return parentDepth;
  const values = Array.isArray(value) ? value : Object.values(value);
  return values.reduce((depth, item) => Math.max(depth, jsonDepth(item, parentDepth + 1)), parentDepth + 1);
}

function hasUnsafeKeys(value: unknown): boolean {
  if (value === null || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(hasUnsafeKeys);
  return Object.entries(value).some(([key, child]) =>
    key === '__proto__' || key === 'constructor' || key === 'prototype' || hasUnsafeKeys(child));
}

export function parseHttpsApiResponse(rawText: string):
  | { readonly ok: true; readonly reading: ExternalSettingsReading }
  | { readonly ok: false; readonly reason: string } {
  const parsed = parseBoundedJson(rawText);
  if (!parsed.ok) return parsed;
  if (!isRecord(parsed.value)) return { ok: false, reason: 'response must be an object' };
  const issue = exactKeys(parsed.value, ['version', 'active', 'assignments'], ['expiresAt', 'revision']);
  if (issue) return { ok: false, reason: `response: ${issue}` };
  if (parsed.value.version !== EXTERNAL_SETTINGS_SCHEMA_VERSION || typeof parsed.value.active !== 'boolean') {
    return { ok: false, reason: 'response version or active flag is invalid' };
  }
  const assignments = validateAssignments(parsed.value.assignments);
  if (!assignments.ok) return { ok: false, reason: assignments.reason };
  if (parsed.value.expiresAt !== undefined && (typeof parsed.value.expiresAt !== 'string' || Number.isNaN(Date.parse(parsed.value.expiresAt)))) {
    return { ok: false, reason: 'response.expiresAt must be an ISO timestamp' };
  }
  if (parsed.value.revision !== undefined && !boundedString(parsed.value.revision, 1, MAX_EXTERNAL_STRING_LENGTH)) {
    return { ok: false, reason: 'response.revision is invalid' };
  }
  return {
    ok: true,
    reading: {
      active: parsed.value.active,
      assignments: assignments.assignments,
      observedAt: new Date().toISOString(),
      expiresAt: parsed.value.expiresAt as string | undefined,
      revision: parsed.value.revision as string | undefined,
    },
  };
}

export function parseHomeAssistantBooleanResponse(rawText: string):
  | { readonly ok: true; readonly active: boolean }
  | { readonly ok: false; readonly reason: string } {
  const parsed = parseBoundedJson(rawText);
  if (!parsed.ok) return parsed;
  if (!isRecord(parsed.value) || (parsed.value.state !== 'on' && parsed.value.state !== 'off')) {
    return { ok: false, reason: 'Home Assistant response.state must be "on" or "off"' };
  }
  return { ok: true, active: parsed.value.state === 'on' };
}

export function createInitialExternalSettingsState(
  sourceKind: ExternalSettingsSourceKind,
  baseAssignments: readonly ScheduleAssignment[] = [],
): ExternalSettingsState {
  return {
    sourceKind,
    baseAssignments: structuredClone(baseAssignments),
    lastValid: undefined,
    effectiveAssignments: structuredClone(baseAssignments),
    active: false,
    status: 'idle',
    lastRefreshAt: undefined,
    nextRefreshAt: undefined,
    lastError: undefined,
    remoteValuePersistedAsBase: false,
  };
}

export function projectExternalSettingsState(state: ExternalSettingsState): ExternalSettingsProjection {
  return {
    sourceKind: state.sourceKind,
    status: state.status,
    active: state.active,
    effectiveAssignments: structuredClone(state.effectiveAssignments),
    assignmentCount: state.effectiveAssignments.length,
    isFallback: state.status !== 'active' && state.status !== 'inactive' && state.status !== 'idle' && state.status !== 'refreshing',
    isStale: state.status === 'stale',
    lastRefreshAt: state.lastRefreshAt,
    nextRefreshAt: state.nextRefreshAt,
    lastError: state.lastError,
  };
}
