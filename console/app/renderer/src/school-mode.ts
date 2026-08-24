/** Shared School mode state and fail-closed naming rules. */
export { SCHOOL_CREDENTIAL_ACCOUNT } from '../../../shared/school-contract';

export const SCHOOL_MODE_SETTING = 'console.schoolMode';
export const SCHOOL_NAME_SETTING = 'console.schoolModeName';
export const SCHOOL_PREVIOUS_SETTINGS = 'console.schoolModePrevious';
export const DEFAULT_SCHOOL_NAME = 'School mode';
export const MAX_SCHOOL_NAME_LENGTH = 60;
export const SCHOOL_RECOVERY_LINE = 'The exact application-data recovery path is unavailable until the desktop data boundary answers.';

export interface SchoolStorage {
  getItem(key: string): string | null | undefined;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export interface SchoolSnapshot {
  enabled: boolean;
  name: string;
}

export function schoolModeEnabled(storage: SchoolStorage | undefined): boolean {
  return storage?.getItem(SCHOOL_MODE_SETTING) === 'on';
}

export function schoolModeName(storage: SchoolStorage | undefined): string {
  const candidate = storage?.getItem(SCHOOL_NAME_SETTING)?.trim();
  return candidate && validateSchoolModeName(candidate).length === 0 ? candidate : DEFAULT_SCHOOL_NAME;
}

export function validateSchoolModeName(value: string): string[] {
  const candidate = value.trim();
  if (!candidate) return ['A School mode name cannot be empty.'];
  if (candidate.length > MAX_SCHOOL_NAME_LENGTH) return [`A School mode name must be ${MAX_SCHOOL_NAME_LENGTH} characters or fewer.`];
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/u.test(candidate)) return ['A School mode name cannot contain control characters.'];
  return [];
}

export function readSchoolSnapshot(storage: SchoolStorage | undefined): SchoolSnapshot {
  return { enabled: schoolModeEnabled(storage), name: schoolModeName(storage) };
}

export function writeSchoolMode(storage: SchoolStorage, enabled: boolean): void {
  storage.setItem(SCHOOL_MODE_SETTING, enabled ? 'on' : 'off');
}

export function renameSchoolMode(storage: SchoolStorage, value: string): string[] {
  const problems = validateSchoolModeName(value);
  if (problems.length > 0) return problems;
  storage.setItem(SCHOOL_NAME_SETTING, value.trim());
  return [];
}

export function savePreviousSettings(storage: SchoolStorage, language: string, funny: { en: number; yue: number }, narration?: Record<string, unknown>): void {
  storage.setItem(SCHOOL_PREVIOUS_SETTINGS, JSON.stringify({ language, funny, narration }));
}

export function readPreviousSettings(storage: SchoolStorage): { language?: string; funny?: { en?: number; yue?: number }; narration?: Record<string, unknown> } | undefined {
  const raw = storage.getItem(SCHOOL_PREVIOUS_SETTINGS);
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as { language?: unknown; funny?: { en?: unknown; yue?: unknown }; narration?: Record<string, unknown> };
    return {
      language: typeof parsed.language === 'string' ? parsed.language : undefined,
      funny: parsed.funny && typeof parsed.funny === 'object'
        ? { en: Number(parsed.funny.en), yue: Number(parsed.funny.yue) }
        : undefined,
      narration: parsed.narration && typeof parsed.narration === 'object' ? parsed.narration : undefined,
    };
  } catch {
    return undefined;
  }
}
