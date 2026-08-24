import {
  DEFAULT_LOGO_CROP,
  LOGO_MAX_INPUT_BYTES,
  LOGO_PRESETS,
  validateLogoCrop,
  type LogoCacheRecord,
  type LogoCropModel,
  type LogoInspectionResult,
  type LogoTarget,
} from '../../../shared/logo';

export interface LogoRuntimeBridge {
  readonly logo?: { pickFile(): Promise<{ name: string; bytes: number; dataBase64: string; declaredMime?: string } | undefined> };
  readonly controlPlane: { request(request: Record<string, unknown>): Promise<{ ok: boolean; data?: unknown; message?: string }> };
}

export interface ActiveLogo {
  readonly kind: 'shipped-preset' | 'custom-local';
  readonly presetId: string;
  readonly crop: LogoCropModel;
  readonly record?: LogoCacheRecord;
  readonly assets: ReadonlyMap<string, Uint8Array>;
}

export interface LogoRuntimeState {
  readonly status: 'idle' | 'reading' | 'converting' | 'active' | 'unavailable' | 'failed';
  readonly detail: string;
  readonly active: ActiveLogo;
  readonly decoderAvailable?: boolean;
  readonly cacheStatus?: 'none' | 'validated' | 'decoder-unavailable' | 'invalid';
  readonly decoderHealth?: { workerVersion: string; workerRevision: string; sharpVersion: string; sharpIntegrity: string; nativePlatform: string; nativeArch: string; nativeBindingPath: string; nativeBindingSha256: string; nativeFiles: readonly string[]; formats: readonly string[]; peakMemoryBytes: number; baselineWorkingSetBytes: number; peakWorkingSetBytes: number };
}

function requestId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `logo-${Date.now().toString(36)}`;
}

function decodeBase64(value: unknown): Uint8Array | undefined {
  if (typeof value !== 'string' || value.length === 0 || !/^[A-Za-z0-9+/]*={0,2}$/u.test(value)) return undefined;
  let binary: string | undefined;
  try { binary = typeof atob === 'function' ? atob(value) : undefined; } catch { return undefined; }
  if (binary === undefined) return undefined;
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return bytes.byteLength > 0 && bytes.byteLength <= 16 * 1024 * 1024 ? bytes : undefined;
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function initialActive(): ActiveLogo {
  return { kind: 'shipped-preset', presetId: LOGO_PRESETS[0].id, crop: DEFAULT_LOGO_CROP, assets: new Map() };
}

function responseError(response: { ok: boolean; message?: string }): string | undefined {
  return response.ok ? undefined : response.message ?? 'The privileged logo bridge refused the operation.';
}

/**
 * Renderer-side lifecycle for the local logo contract. It owns no raw source
 * persistence: only the privileged cache record and validated converted bytes
 * can become active. Conversion failure leaves the previous active mark intact.
 */
export class LogoRuntime {
  private state: LogoRuntimeState = { status: 'idle', detail: 'The shipped logo preset is active.', active: initialActive(), decoderAvailable: undefined, cacheStatus: 'none' };
  private readonly listeners = new Set<(state: LogoRuntimeState) => void>();
  private loadGeneration = 0;
  private loadPromise?: Promise<LogoRuntimeState>;
  private loadPromiseGeneration?: number;

  constructor(private readonly bridge: LogoRuntimeBridge) {}

  mountDocument(root: Document): () => void {
    const apply = () => {
      root.documentElement.dataset.logoPreset = this.state.active.presetId;
      root.documentElement.dataset.logoSource = this.state.active.kind;
      const asset = this.state.active.assets.values().next().value as Uint8Array | undefined;
      const titleMark = root.querySelector<HTMLElement>('[data-window-drag] > div:first-child > span:first-child');
      if (!asset) {
        if (titleMark) {
          titleMark.style.backgroundImage = '';
          titleMark.style.backgroundRepeat = '';
          titleMark.style.backgroundPosition = '';
          titleMark.style.backgroundSize = '';
          titleMark.style.color = '';
          titleMark.removeAttribute('aria-label');
          titleMark.removeAttribute('data-logo-consumer');
          titleMark.dataset.logoPreset = this.state.active.presetId;
          titleMark.style.borderRadius = this.state.active.presetId === 'signal-ring' ? '50%' : '0.35rem';
          titleMark.style.boxShadow = this.state.active.presetId === 'signal-ring' ? '0 0 0 0.18rem #7fd1c8, 0 0 0 0.36rem #f5bd68' : '';
          titleMark.style.transform = this.state.active.presetId === 'console-mark' ? 'rotate(45deg)' : '';
        }
        root.documentElement.style.removeProperty('--app-logo-data-url');
        return;
      }
      const metadata = this.state.active.record?.assets[0];
      if (!metadata) return;
      const dataUrl = `data:image/${metadata.receipt.target.format === 'jpeg' ? 'jpeg' : metadata.receipt.target.format};base64,${encodeBase64(asset)}`;
      root.documentElement.style.setProperty('--app-logo-data-url', `url("${dataUrl}")`);
      if (titleMark) {
        titleMark.dataset.logoConsumer = 'titlebar';
        titleMark.style.backgroundImage = `url("${dataUrl}")`;
        titleMark.style.backgroundRepeat = 'no-repeat';
        titleMark.style.backgroundPosition = 'center';
        titleMark.style.backgroundSize = 'contain';
        titleMark.style.color = 'transparent';
        titleMark.style.borderRadius = '0.35rem';
        titleMark.style.boxShadow = 'none';
        titleMark.style.transform = 'none';
        titleMark.setAttribute('aria-label', 'Application logo');
      }
      root.querySelectorAll<HTMLElement>('[data-logo-consumer]').forEach((element) => { element.style.backgroundImage = `url("${dataUrl}")`; });
    };
    apply();
    return this.subscribe(apply);
  }

  getState(): LogoRuntimeState { return this.state; }

  restoreActiveLogo(active: ActiveLogo): LogoRuntimeState {
    this.loadGeneration += 1;
    this.publish({ ...this.state, status: 'active', detail: 'The previous logo selection was restored.', active });
    return this.state;
  }

  selectPreset(presetId: string): LogoRuntimeState {
    if (!LOGO_PRESETS.some((preset) => preset.id === presetId)) return this.state;
    this.loadGeneration += 1;
    this.publish({ status: 'active', detail: 'The selected shipped logo preset is active.', active: { kind: 'shipped-preset', presetId, crop: DEFAULT_LOGO_CROP, assets: new Map() } });
    return this.state;
  }

  async persistUiState(value: { readonly selectedPresetId: string; readonly crop: LogoCropModel }): Promise<{ ok: boolean; reason?: string }> {
    if (!LOGO_PRESETS.some((preset) => preset.id === value.selectedPresetId) || !validateLogoCrop(value.crop).ok) return { ok: false, reason: 'The selected logo state is invalid.' };
    const response = await this.bridge.controlPlane.request({ requestId: requestId(), action: 'settings.write', payload: { key: 'logo.ui-v1', value: JSON.stringify(value) } });
    return response.ok ? { ok: true } : { ok: false, reason: response.message ?? 'Logo settings were not persisted.' };
  }

  subscribe(listener: (state: LogoRuntimeState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private publish(next: LogoRuntimeState): void {
    this.state = next;
    for (const listener of this.listeners) listener(next);
  }

  async load(): Promise<LogoRuntimeState> {
    if (this.loadPromise && this.loadPromiseGeneration === this.loadGeneration) return this.loadPromise;
    const generation = ++this.loadGeneration;
    const promise = this.loadInternal(generation);
    this.loadPromise = promise;
    this.loadPromiseGeneration = generation;
    try { return await promise; } finally { if (this.loadPromiseGeneration === generation) { this.loadPromise = undefined; this.loadPromiseGeneration = undefined; } }
  }

  private async loadInternal(generation: number): Promise<LogoRuntimeState> {
    const current = () => generation === this.loadGeneration;
    if (!current()) return this.state;
    this.publish({ ...this.state, status: 'reading', detail: 'Reading the validated local logo cache.' });
    const decoderResponse = await this.bridge.controlPlane.request({ requestId: requestId(), action: 'logo.decoder.status' });
    if (!current()) return this.state;
    const decoderData = decoderResponse.data as { available?: unknown; workerVersion?: unknown; workerRevision?: unknown; sharpVersion?: unknown; sharpIntegrity?: unknown; nativePlatform?: unknown; nativeArch?: unknown; nativeBindingPath?: unknown; nativeBindingSha256?: unknown; nativeFiles?: unknown; formats?: unknown; peakMemoryBytes?: unknown; baselineWorkingSetBytes?: unknown; peakWorkingSetBytes?: unknown } | undefined;
    this.state = { ...this.state, decoderAvailable: decoderResponse.ok && decoderData?.available === true, ...(typeof decoderData?.workerVersion === 'string' && typeof decoderData.workerRevision === 'string' && typeof decoderData.sharpVersion === 'string' && typeof decoderData.sharpIntegrity === 'string' && typeof decoderData.nativePlatform === 'string' && typeof decoderData.nativeArch === 'string' && typeof decoderData.nativeBindingPath === 'string' && typeof decoderData.nativeBindingSha256 === 'string' && Array.isArray(decoderData.nativeFiles) && Array.isArray(decoderData.formats) && typeof decoderData.peakMemoryBytes === 'number' && typeof decoderData.baselineWorkingSetBytes === 'number' && typeof decoderData.peakWorkingSetBytes === 'number' ? { decoderHealth: { workerVersion: decoderData.workerVersion, workerRevision: decoderData.workerRevision, sharpVersion: decoderData.sharpVersion, sharpIntegrity: decoderData.sharpIntegrity, nativePlatform: decoderData.nativePlatform, nativeArch: decoderData.nativeArch, nativeBindingPath: decoderData.nativeBindingPath, nativeBindingSha256: decoderData.nativeBindingSha256, nativeFiles: decoderData.nativeFiles.map(String), formats: decoderData.formats.map(String), peakMemoryBytes: decoderData.peakMemoryBytes, baselineWorkingSetBytes: decoderData.baselineWorkingSetBytes, peakWorkingSetBytes: decoderData.peakWorkingSetBytes } } : {}) };
    const peekResponse = await this.bridge.controlPlane.request({ requestId: requestId(), action: 'logo.cache.peek-stored' });
    if (!current()) return this.state;
    const peekRecord = peekResponse.ok ? peekResponse.data as LogoCacheRecord | undefined : undefined;
    const hasValidatedCache = Boolean(peekRecord?.customLogoActive === true);
    const settingsResponse = await this.bridge.controlPlane.request({ requestId: requestId(), action: 'settings.snapshot' });
    if (!current()) return this.state;
    const settingsValues = settingsResponse.ok ? (settingsResponse.data as { values?: Record<string, string> } | undefined)?.values : undefined;
    if (this.state.decoderAvailable !== true) {
      this.publish({ ...this.state, status: 'unavailable', cacheStatus: hasValidatedCache ? 'decoder-unavailable' : 'none', detail: typeof (decoderData as { reason?: unknown } | undefined)?.reason === 'string' ? String((decoderData as { reason: string }).reason) : hasValidatedCache ? 'The validated custom-logo cache is retained until the decoder can retry.' : 'The isolated logo decoder is unavailable; the shipped mark remains active.' });
      return this.state;
    }
    const stored = settingsValues?.['logo.ui-v1'];
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { selectedPresetId?: unknown; crop?: unknown };
        if (typeof parsed.selectedPresetId === 'string' && LOGO_PRESETS.some((preset) => preset.id === parsed.selectedPresetId) && parsed.crop && validateLogoCrop(parsed.crop as LogoCropModel).ok) {
          this.state = { ...this.state, active: { kind: 'shipped-preset', presetId: parsed.selectedPresetId, crop: parsed.crop as LogoCropModel, assets: new Map() } };
        }
      } catch { /* Defaults remain active. */ }
    }
    const response = await this.bridge.controlPlane.request({ requestId: requestId(), action: 'logo.cache.read' });
    if (!current()) return this.state;
    const error = responseError(response);
    if (error) {
      this.publish({ ...this.state, status: 'unavailable', cacheStatus: hasValidatedCache ? 'invalid' : 'none', detail: hasValidatedCache ? 'The saved custom-logo cache could not be reopened; it remains retained for retry.' : error });
      return this.state;
    }
    const record = response.data as LogoCacheRecord | undefined;
    if (!record) {
      this.publish({ ...this.state, status: 'active', cacheStatus: hasValidatedCache ? 'invalid' : 'none', detail: hasValidatedCache ? 'The saved custom-logo cache could not be reopened; the shipped preset remains active for retry.' : 'No custom cache is present; the shipped preset remains active.' });
      return this.state;
    }
    const assets = new Map<string, Uint8Array>();
    for (const metadata of record.assets) {
      const assetResponse = await this.bridge.controlPlane.request({ requestId: requestId(), action: 'logo.cache.asset.read', payload: { filename: metadata.filename } });
      if (!current()) return this.state;
      if (!assetResponse.ok) {
        this.publish({ ...this.state, status: 'failed', cacheStatus: 'invalid', detail: 'A saved custom-logo asset could not be reopened; it remains retained for retry.' });
        return this.state;
      }
      const asset = assetResponse.data as { filename?: unknown; bytesBase64?: unknown } | undefined;
      const bytes = decodeBase64(asset?.bytesBase64);
      if (!bytes || asset?.filename !== metadata.filename) {
        this.publish({ ...this.state, status: 'failed', cacheStatus: 'invalid', detail: 'A saved custom-logo asset failed reopen validation; it remains retained for retry.' });
        return this.state;
      }
      assets.set(metadata.filename, bytes);
    }
    this.publish({ ...this.state, status: 'active', cacheStatus: 'validated', detail: 'The validated local logo cache is active.', active: { kind: 'custom-local', presetId: record.selectedPresetId ?? LOGO_PRESETS[0].id, crop: record.crop, record, assets } });
    return this.state;
  }

  async pickFile(): Promise<{ name: string; bytes: Uint8Array; declaredMime?: string } | undefined> {
    const selected = await this.bridge.logo?.pickFile();
    if (!selected || selected.bytes > LOGO_MAX_INPUT_BYTES) return undefined;
    const bytes = decodeBase64(selected.dataBase64);
    return bytes && bytes.byteLength === selected.bytes ? { name: selected.name, bytes, declaredMime: selected.declaredMime } : undefined;
  }

  async inspect(bytes: Uint8Array, name?: string, declaredMime?: string): Promise<LogoInspectionResult> {
    const response = await this.bridge.controlPlane.request({ requestId: requestId(), action: 'logo.inspect', payload: { source: { kind: 'local', bytesBase64: encodeBase64(bytes), metadata: { filename: name, declaredMime } } } });
    if (!response.ok) return { ok: false, code: 'MALFORMED_IMAGE', reason: response.message ?? 'The privileged logo bridge refused inspection.' };
    return response.data as LogoInspectionResult;
  }

  async convertAndCache(bytes: Uint8Array, crop: LogoCropModel, targets: readonly LogoTarget[], selectedPresetId?: string, name?: string, declaredMime?: string): Promise<LogoRuntimeState> {
    const generation = ++this.loadGeneration;
    const previous = this.state;
    this.publish({ ...previous, status: 'converting', detail: 'Converting the local logo within bounded limits.' });
    const response = await this.bridge.controlPlane.request({ requestId: requestId(), action: 'logo.convert', payload: { source: { kind: 'local', bytesBase64: encodeBase64(bytes), metadata: { filename: name, declaredMime } }, crop, targets, selectedPresetId } });
    if (generation !== this.loadGeneration) return this.state;
    if (!response.ok || !response.data || (response.data as { cached?: boolean }).cached !== true) {
      this.publish({ ...previous, status: 'failed', detail: response.message ?? 'Conversion failed; the previous logo remains active.' });
      return this.state;
    }
    return this.load();
  }

  async clear(): Promise<LogoRuntimeState> {
    const generation = ++this.loadGeneration;
    const response = await this.bridge.controlPlane.request({ requestId: requestId(), action: 'logo.cache.clear', payload: { kind: 'clear' } });
    if (!response.ok) {
      this.publish({ ...this.state, status: 'failed', detail: response.message ?? 'The local logo cache could not be cleared.' });
      return this.state;
    }
    const active = initialActive();
    await this.bridge.controlPlane.request({ requestId: requestId(), action: 'settings.remove', payload: { key: 'logo.ui-v1' } });
    if (generation !== this.loadGeneration) return this.state;
    this.publish({ status: 'active', detail: 'Custom logo cleared; the shipped preset is active.', active });
    return this.state;
  }

  async reset(): Promise<LogoRuntimeState> { return this.clear(); }
}
