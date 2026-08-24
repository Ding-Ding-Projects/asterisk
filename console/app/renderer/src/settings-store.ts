import {
  defaultDesktopSettings,
  validateDesktopSettings,
  type DesktopSettings,
} from '../../../shared/settings-schema';

export const DESKTOP_SETTINGS_STORAGE_KEY = 'ding-pbx-desktop-settings-v1';

export interface SettingsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface StorageEventLike {
  key: string | null;
  newValue: string | null;
}

export interface SettingsStorageEvents {
  addEventListener(type: 'storage', listener: EventListener): void;
  removeEventListener(type: 'storage', listener: EventListener): void;
}

export type StoredProvenance = 'default' | 'persisted';

export interface SettingsStoreSnapshot {
  settings: DesktopSettings;
  hydrated: boolean;
  provenance: StoredProvenance;
  recoveryReason?: string;
}

export type SettingsStoreListener = (snapshot: SettingsStoreSnapshot) => void;

export interface SettingsUpdateResult {
  ok: boolean;
  snapshot: SettingsStoreSnapshot;
  reason?: string;
}

function clone(settings: DesktopSettings): DesktopSettings {
  return structuredClone(settings);
}

/**
 * Versioned local store with validation on every read and before every write. A bad
 * persisted record fails closed to defaults and is removed, never partially applied.
 */
export class SettingsStore {
  private settings = defaultDesktopSettings();
  private hydrated = false;
  private provenance: StoredProvenance = 'default';
  private recoveryReason: string | undefined;
  private readonly listeners = new Set<SettingsStoreListener>();
  private readonly onStorage: EventListener = (event): void => {
    const storageEvent = event as unknown as StorageEventLike;
    if (storageEvent.key !== DESKTOP_SETTINGS_STORAGE_KEY) return;
    this.readRaw(storageEvent.newValue, false);
  };

  constructor(
    private readonly storage: SettingsStorage,
    private readonly events?: SettingsStorageEvents,
  ) {
    events?.addEventListener('storage', this.onStorage);
  }

  hydrate(): SettingsStoreSnapshot {
    this.readRaw(this.storage.getItem(DESKTOP_SETTINGS_STORAGE_KEY), true);
    return this.snapshot();
  }

  snapshot(): SettingsStoreSnapshot {
    return {
      settings: clone(this.settings),
      hydrated: this.hydrated,
      provenance: this.provenance,
      ...(this.recoveryReason ? { recoveryReason: this.recoveryReason } : {}),
    };
  }

  subscribe(listener: SettingsStoreListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  update(recipe: (draft: DesktopSettings) => void): SettingsUpdateResult {
    const next = clone(this.settings);
    try {
      recipe(next);
    } catch (error) {
      return {
        ok: false,
        reason: `Settings update did not complete: ${error instanceof Error ? error.message : String(error)}`,
        snapshot: this.snapshot(),
      };
    }
    const validation = validateDesktopSettings(next);
    if (!validation.ok) {
      return { ok: false, reason: validation.reason, snapshot: this.snapshot() };
    }
    try {
      this.storage.setItem(DESKTOP_SETTINGS_STORAGE_KEY, JSON.stringify(validation.value));
    } catch (error) {
      return {
        ok: false,
        reason: `Settings were not persisted: ${error instanceof Error ? error.message : String(error)}`,
        snapshot: this.snapshot(),
      };
    }
    this.settings = validation.value;
    this.hydrated = true;
    this.provenance = 'persisted';
    this.recoveryReason = undefined;
    this.emit();
    return { ok: true, snapshot: this.snapshot() };
  }

  reset(): SettingsUpdateResult {
    try {
      this.storage.removeItem(DESKTOP_SETTINGS_STORAGE_KEY);
    } catch (error) {
      return {
        ok: false,
        reason: `Settings were not reset: ${error instanceof Error ? error.message : String(error)}`,
        snapshot: this.snapshot(),
      };
    }
    this.settings = defaultDesktopSettings();
    this.hydrated = true;
    this.provenance = 'default';
    this.recoveryReason = undefined;
    this.emit();
    return { ok: true, snapshot: this.snapshot() };
  }

  dispose(): void {
    this.events?.removeEventListener('storage', this.onStorage);
    this.listeners.clear();
  }

  private readRaw(raw: string | null, purgeInvalid: boolean): void {
    this.hydrated = true;
    if (raw === null) {
      this.settings = defaultDesktopSettings();
      this.provenance = 'default';
      this.recoveryReason = undefined;
      this.emit();
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      this.recover(`Stored settings are not valid JSON: ${error instanceof Error ? error.message : String(error)}`, purgeInvalid);
      return;
    }
    const validation = validateDesktopSettings(parsed);
    if (!validation.ok) {
      this.recover(`Stored settings were rejected: ${validation.reason}`, purgeInvalid);
      return;
    }
    this.settings = validation.value;
    this.provenance = 'persisted';
    this.recoveryReason = undefined;
    this.emit();
  }

  private recover(reason: string, purgeInvalid: boolean): void {
    this.settings = defaultDesktopSettings();
    this.provenance = 'default';
    this.recoveryReason = reason;
    if (purgeInvalid) {
      try { this.storage.removeItem(DESKTOP_SETTINGS_STORAGE_KEY); } catch { /* Defaults remain active. */ }
    }
    this.emit();
  }

  private emit(): void {
    const snapshot = this.snapshot();
    for (const listener of this.listeners) listener(snapshot);
  }
}

export function createMemorySettingsStorage(): SettingsStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
  };
}

export function createBrowserSettingsStore(): SettingsStore {
  if (typeof window === 'undefined' || !window.localStorage) {
    return new SettingsStore(createMemorySettingsStorage());
  }
  const events: SettingsStorageEvents = {
    addEventListener: (type, listener) => window.addEventListener(type, listener),
    removeEventListener: (type, listener) => window.removeEventListener(type, listener),
  };
  return new SettingsStore(window.localStorage, events);
}
