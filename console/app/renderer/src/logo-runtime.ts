import {
  DEFAULT_LOGO_CROP,
  LOGO_MAX_INPUT_BYTES,
  LOGO_PRESETS,
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
  private state: LogoRuntimeState = { status: 'idle', detail: 'The shipped logo preset is active.', active: initialActive() };
  private readonly listeners = new Set<(state: LogoRuntimeState) => void>();

  constructor(private readonly bridge: LogoRuntimeBridge) {}

  getState(): LogoRuntimeState { return this.state; }

  selectPreset(presetId: string): LogoRuntimeState {
    if (!LOGO_PRESETS.some((preset) => preset.id === presetId)) return this.state;
    this.publish({ status: 'active', detail: 'The selected shipped logo preset is active.', active: { kind: 'shipped-preset', presetId, crop: DEFAULT_LOGO_CROP, assets: new Map() } });
    return this.state;
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
    this.publish({ ...this.state, status: 'reading', detail: 'Reading the validated local logo cache.' });
    const response = await this.bridge.controlPlane.request({ requestId: requestId(), action: 'logo.cache.read' });
    const error = responseError(response);
    if (error) {
      this.publish({ ...this.state, status: 'unavailable', detail: error });
      return this.state;
    }
    const record = response.data as LogoCacheRecord | undefined;
    if (!record) {
      this.publish({ ...this.state, status: 'active', detail: 'No custom cache is present; the shipped preset remains active.' });
      return this.state;
    }
    const assets = new Map<string, Uint8Array>();
    for (const metadata of record.assets) {
      const assetResponse = await this.bridge.controlPlane.request({ requestId: requestId(), action: 'logo.cache.asset.read', payload: { filename: metadata.filename } });
      if (!assetResponse.ok) {
        this.publish({ ...this.state, status: 'failed', detail: 'A cached logo asset could not be read; the shipped preset remains active.' });
        return this.state;
      }
      const asset = assetResponse.data as { filename?: unknown; bytesBase64?: unknown } | undefined;
      const bytes = decodeBase64(asset?.bytesBase64);
      if (!bytes || asset?.filename !== metadata.filename) {
        this.publish({ ...this.state, status: 'failed', detail: 'A cached logo asset failed byte validation; the shipped preset remains active.' });
        return this.state;
      }
      assets.set(metadata.filename, bytes);
    }
    this.publish({ status: 'active', detail: 'The validated local logo cache is active.', active: { kind: 'custom-local', presetId: record.selectedPresetId ?? LOGO_PRESETS[0].id, crop: record.crop, record, assets } });
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
    const previous = this.state;
    this.publish({ ...previous, status: 'converting', detail: 'Converting the local logo within bounded limits.' });
    const response = await this.bridge.controlPlane.request({ requestId: requestId(), action: 'logo.convert', payload: { source: { kind: 'local', bytesBase64: encodeBase64(bytes), metadata: { filename: name, declaredMime } }, crop, targets } });
    if (!response.ok || !response.data || (response.data as { ok?: boolean }).ok !== true) {
      this.publish({ ...previous, status: 'failed', detail: response.message ?? 'Conversion failed; the previous logo remains active.' });
      return this.state;
    }
    const write = await this.bridge.controlPlane.request({ requestId: requestId(), action: 'logo.cache.write', payload: { selectedPresetId, result: response.data } });
    if (!write.ok) {
      this.publish({ ...previous, status: 'failed', detail: write.message ?? 'The converted logo was not cached; the previous logo remains active.' });
      return this.state;
    }
    return this.load();
  }

  async clear(): Promise<LogoRuntimeState> {
    const response = await this.bridge.controlPlane.request({ requestId: requestId(), action: 'logo.cache.clear', payload: { kind: 'clear' } });
    if (!response.ok) {
      this.publish({ ...this.state, status: 'failed', detail: response.message ?? 'The local logo cache could not be cleared.' });
      return this.state;
    }
    const active = initialActive();
    this.publish({ status: 'active', detail: 'Custom logo cleared; the shipped preset is active.', active });
    return this.state;
  }

  async reset(): Promise<LogoRuntimeState> { return this.clear(); }
}
