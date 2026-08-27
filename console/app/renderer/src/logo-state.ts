import {
  DEFAULT_LOGO_CROP,
  LOGO_PRESETS,
  LOGO_SCHEMA_VERSION,
  validateLogoCrop,
  type LogoCropModel,
} from '../../../shared/logo';

export type CustomLogoState = 'empty' | 'reading' | 'ready' | 'invalid' | 'conversion-failed';

export interface LogoUiState {
  readonly schemaVersion: typeof LOGO_SCHEMA_VERSION;
  readonly selectedPresetId: string;
  readonly customLogoState: CustomLogoState;
  readonly customLogoLabel: string;
  readonly crop: LogoCropModel;
}

export interface LogoStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const LOGO_UI_STORAGE_KEY = 'ding-pbx-console-logo-ui-v1';

export function createInitialLogoUiState(): LogoUiState {
  return {
    schemaVersion: LOGO_SCHEMA_VERSION,
    selectedPresetId: LOGO_PRESETS[0].id,
    customLogoState: 'empty',
    customLogoLabel: '',
    crop: DEFAULT_LOGO_CROP,
  };
}

function validPreset(id: unknown): id is string {
  return typeof id === 'string' && LOGO_PRESETS.some((preset) => preset.id === id);
}

function isCustomState(value: unknown): value is CustomLogoState {
  return value === 'empty' || value === 'reading' || value === 'ready' || value === 'invalid' || value === 'conversion-failed';
}

export function parseLogoUiState(raw: string | null): LogoUiState {
  if (!raw) return createInitialLogoUiState();
  try {
    const candidate = JSON.parse(raw) as Partial<LogoUiState>;
    const cropCheck = candidate.crop ? validateLogoCrop(candidate.crop) : { ok: false };
    if (candidate.schemaVersion !== LOGO_SCHEMA_VERSION || !validPreset(candidate.selectedPresetId) || !isCustomState(candidate.customLogoState) || typeof candidate.customLogoLabel !== 'string' || candidate.customLogoLabel.length > 256 || !candidate.crop || !cropCheck.ok) return createInitialLogoUiState();
    return {
      schemaVersion: LOGO_SCHEMA_VERSION,
      selectedPresetId: candidate.selectedPresetId,
      customLogoState: candidate.customLogoState,
      customLogoLabel: candidate.customLogoLabel,
      crop: candidate.crop,
    };
  } catch {
    return createInitialLogoUiState();
  }
}

export class LogoStateStore {
  private state: LogoUiState;
  private readonly listeners = new Set<(state: LogoUiState) => void>();

  constructor(private readonly storage: LogoStorage, private readonly key = LOGO_UI_STORAGE_KEY) {
    this.state = parseLogoUiState(storage.getItem(key));
  }

  get(): LogoUiState {
    return this.state;
  }

  set(next: LogoUiState): LogoUiState {
    const parsed = parseLogoUiState(JSON.stringify(next));
    this.state = parsed;
    this.storage.setItem(this.key, JSON.stringify(parsed));
    this.listeners.forEach((listener) => listener(parsed));
    return parsed;
  }

  update(patch: Partial<LogoUiState>): LogoUiState {
    return this.set({ ...this.state, ...patch });
  }

  reset(): LogoUiState {
    this.storage.removeItem(this.key);
    return this.set(createInitialLogoUiState());
  }

  subscribe(listener: (state: LogoUiState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

