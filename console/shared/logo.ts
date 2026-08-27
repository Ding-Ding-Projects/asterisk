/**
 * Local app-logo contracts shared by the renderer and the control plane.
 *
 * This module deliberately contains no filesystem, network, or platform decoder
 * access. Bytes are inspected here, while an isolated decoder is injected at the
 * control-plane boundary for actual conversion and round-trip validation.
 */

export const LOGO_SCHEMA_VERSION = 1 as const;
export const LOGO_PACKAGE_IDENTITY = 'ding-pbx-console' as const;
export const LOGO_MAX_INPUT_BYTES = 8 * 1024 * 1024;
export const LOGO_MAX_OUTPUT_BYTES = 16 * 1024 * 1024;
export const LOGO_MAX_DECODED_PIXELS = 16_000_000;
export const LOGO_MAX_DIMENSION = 4096;
export const LOGO_MAX_FRAMES = 1;
export const LOGO_MAX_OUTPUTS = 16;
export const LOGO_MAX_CPU_MS = 2000;
export const LOGO_MAX_MEMORY_BYTES = 64 * 1024 * 1024;

export type LogoFormat = 'png' | 'jpeg' | 'webp' | 'svg';
export type LogoFit = 'contain' | 'cover' | 'fill';
export type LogoBackground =
  | { kind: 'transparent' }
  | { kind: 'solid'; color: string };

export interface LogoPreset {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly previewToken: string;
  readonly source: 'shipped';
}

export const LOGO_PRESETS: readonly LogoPreset[] = Object.freeze([
  {
    id: 'console-mark',
    label: 'Console mark',
    description: 'The shipped Ding PBX Console mark.',
    previewToken: 'mark-console',
    source: 'shipped',
  },
  {
    id: 'signal-ring',
    label: 'Signal ring',
    description: 'A compact ring with a call-signal accent.',
    previewToken: 'mark-signal',
    source: 'shipped',
  },
  {
    id: 'pbx-lines',
    label: 'PBX lines',
    description: 'A three-line PBX signal treatment.',
    previewToken: 'mark-lines',
    source: 'shipped',
  },
]);

export interface LogoPickerRegistration {
  readonly id: 'logo.custom-file';
  readonly control: 'file-input';
  readonly accept: string;
  readonly multiple: false;
  readonly localOnly: true;
  readonly accessibleName: string;
  readonly noFileState: string;
  readonly invalidState: string;
  readonly loadedState: string;
  readonly replaceState: string;
  readonly clearState: string;
}

export const LOGO_PICKER_REGISTRATION: LogoPickerRegistration = Object.freeze({
  id: 'logo.custom-file',
  control: 'file-input',
  accept: 'image/png,image/jpeg,image/webp,image/svg+xml,.png,.jpg,.jpeg,.webp,.svg',
  multiple: false,
  localOnly: true,
  accessibleName: 'Choose a local custom logo image',
  noFileState: 'No custom logo selected.',
  invalidState: 'This image cannot be used as a logo.',
  loadedState: 'Custom logo ready for conversion.',
  replaceState: 'Choose another local logo to replace the current one.',
  clearState: 'Custom logo cleared; the shipped mark is active.',
});

export interface LogoCropModel {
  readonly fit: LogoFit;
  readonly crop: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  readonly focalPoint: { readonly x: number; readonly y: number };
  readonly safeArea: { readonly top: number; readonly right: number; readonly bottom: number; readonly left: number };
  readonly background: LogoBackground;
}

export const DEFAULT_LOGO_CROP: LogoCropModel = Object.freeze({
  fit: 'contain',
  crop: { x: 0, y: 0, width: 1, height: 1 },
  focalPoint: { x: 0.5, y: 0.5 },
  safeArea: { top: 0.08, right: 0.08, bottom: 0.08, left: 0.08 },
  background: { kind: 'transparent' as const },
});

export interface LogoSourceMetadata {
  readonly filename?: string;
  readonly declaredMime?: string;
  readonly declaredExtension?: string;
}

export interface LogoSourceInput {
  readonly kind: 'local';
  readonly bytes: Uint8Array;
  readonly metadata?: LogoSourceMetadata;
}

export interface LogoInspection {
  readonly format: LogoFormat;
  readonly width: number;
  readonly height: number;
  readonly frames: number;
  readonly animated: boolean;
  readonly alpha: boolean;
  readonly decodedBytes: number;
  readonly signature: string;
  readonly declaredMime?: string;
  readonly declaredExtension?: string;
}

export interface LogoTarget {
  readonly format: Exclude<LogoFormat, 'svg'>;
  readonly width: number;
  readonly height: number;
  readonly alpha: boolean;
}

export interface LogoOutputReceipt {
  readonly target: LogoTarget;
  readonly bytes: number;
  readonly sha256: string;
  readonly signature: string;
  readonly width: number;
  readonly height: number;
  readonly alpha: boolean;
  readonly decoder: 'isolated';
  readonly roundTripVerified: true;
  readonly lossNotes: readonly string[];
}

export interface LogoEncodedAsset {
  readonly target: LogoTarget;
  readonly bytes: Uint8Array;
  readonly receipt: LogoOutputReceipt;
}

export interface LogoValidationFailure {
  readonly ok: false;
  readonly code:
    | 'EMPTY_INPUT'
    | 'INPUT_TOO_LARGE'
    | 'UNSUPPORTED_FORMAT'
    | 'MALFORMED_IMAGE'
    | 'ANIMATED_IMAGE'
    | 'INVALID_DIMENSIONS'
    | 'DECOMPRESSION_BOMB'
    | 'UNSAFE_SVG'
    | 'INVALID_CROP'
    | 'INVALID_TARGETS'
    | 'NETWORK_SOURCE'
    | 'DECODER_UNAVAILABLE'
    | 'DECODER_FAILED'
    | 'OUTPUT_INVALID'
    | 'OUTPUT_TOO_LARGE'
    | 'TIME_LIMIT'
    | 'MEMORY_LIMIT';
  readonly reason: string;
}

export type LogoInspectionResult = { readonly ok: true; readonly inspection: LogoInspection } | LogoValidationFailure;

export type LogoConversionResult = {
  readonly ok: true;
  readonly inspection: LogoInspection;
  readonly crop: LogoCropModel;
  readonly outputs: readonly LogoEncodedAsset[];
  readonly packageIdentity: typeof LOGO_PACKAGE_IDENTITY;
} | LogoValidationFailure;

export interface LogoHandlerDescriptor {
  readonly action: 'logo.inspect' | 'logo.convert' | 'logo.cache.read' | 'logo.cache.write' | 'logo.cache.clear';
  readonly localOnly: true;
  readonly input: string;
  readonly output: string;
}

export const LOGO_HANDLER_DESCRIPTORS: readonly LogoHandlerDescriptor[] = Object.freeze([
  { action: 'logo.inspect', localOnly: true, input: 'LogoSourceInput', output: 'LogoInspectionResult' },
  { action: 'logo.convert', localOnly: true, input: 'LogoConversionRequest', output: 'LogoConversionResult' },
  { action: 'logo.cache.read', localOnly: true, input: 'LogoCacheReadRequest', output: 'LogoCacheRecord | undefined' },
  { action: 'logo.cache.write', localOnly: true, input: 'LogoCacheWriteRequest', output: 'LogoCacheRecord' },
  { action: 'logo.cache.clear', localOnly: true, input: 'LogoCacheClearRequest', output: 'void' },
]);

const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const JPEG_SIGNATURE = new Uint8Array([255, 216, 255]);
const WEBP_SIGNATURE = new Uint8Array([82, 73, 70, 70]);

function hasBytes(bytes: Uint8Array, offset: number, values: readonly number[]): boolean {
  return offset >= 0 && offset + values.length <= bytes.length && values.every((value, index) => bytes[offset + index] === value);
}

function u32be(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] << 24) >>> 0) + (bytes[offset + 1] << 16) + (bytes[offset + 2] << 8) + bytes[offset + 3];
}

function u32le(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] ?? 0) + ((bytes[offset + 1] ?? 0) << 8) + ((bytes[offset + 2] ?? 0) << 16) + (((bytes[offset + 3] ?? 0) << 24) >>> 0);
}

function failure(code: LogoValidationFailure['code'], reason: string): LogoValidationFailure {
  return { ok: false, code, reason };
}

function dimensions(width: number, height: number, format: LogoFormat, alpha: boolean, signature: string, metadata?: LogoSourceMetadata, animated = false, frames = 1): LogoInspectionResult {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > LOGO_MAX_DIMENSION || height > LOGO_MAX_DIMENSION) {
    return failure('INVALID_DIMENSIONS', `The ${format} dimensions are outside the supported 1..${LOGO_MAX_DIMENSION} range.`);
  }
  const decodedBytes = width * height * 4;
  if (!Number.isSafeInteger(decodedBytes) || decodedBytes > LOGO_MAX_MEMORY_BYTES) return failure('DECOMPRESSION_BOMB', 'The decoded pixel buffer exceeds the bounded memory budget.');
  if (animated || frames > LOGO_MAX_FRAMES) return failure('ANIMATED_IMAGE', 'Animated and multi-frame logos are not accepted.');
  return {
    ok: true,
    inspection: {
      format, width, height, frames, animated, alpha, decodedBytes, signature,
      declaredMime: metadata?.declaredMime,
      declaredExtension: metadata?.declaredExtension,
    },
  };
}

function inspectPng(bytes: Uint8Array, metadata?: LogoSourceMetadata): LogoInspectionResult {
  if (!hasBytes(bytes, 0, [...PNG_SIGNATURE])) return failure('MALFORMED_IMAGE', 'The PNG signature is incomplete.');
  let offset = 8;
  let width: number | undefined;
  let height: number | undefined;
  let alpha = false;
  let animated = false;
  while (offset + 12 <= bytes.length) {
    const length = u32be(bytes, offset);
    const typeOffset = offset + 4;
    const end = typeOffset + 4 + length + 4;
    if (length > bytes.length || end > bytes.length) return failure('MALFORMED_IMAGE', 'A PNG chunk exceeds the supplied byte boundary.');
    const type = String.fromCharCode(...bytes.slice(typeOffset, typeOffset + 4));
    if (type === 'IHDR') {
      if (length !== 13 || width !== undefined) return failure('MALFORMED_IMAGE', 'The PNG header is missing or repeated.');
      width = u32be(bytes, typeOffset + 4);
      height = u32be(bytes, typeOffset + 8);
      const colourType = bytes[typeOffset + 4 + 9];
      if (![0, 2, 3, 4, 6].includes(colourType)) return failure('UNSUPPORTED_FORMAT', 'The PNG colour type is not allowlisted.');
      alpha = colourType === 4 || colourType === 6;
    } else if (type === 'tRNS') {
      alpha = true;
    } else if (type === 'acTL') {
      animated = true;
    } else if (type === 'IEND') {
      break;
    }
    offset = end;
  }
  if (width === undefined || height === undefined) return failure('MALFORMED_IMAGE', 'The PNG has no usable IHDR chunk.');
  return dimensions(width, height, 'png', alpha, 'png-signature', metadata, animated);
}

function inspectJpeg(bytes: Uint8Array, metadata?: LogoSourceMetadata): LogoInspectionResult {
  if (!hasBytes(bytes, 0, [...JPEG_SIGNATURE])) return failure('MALFORMED_IMAGE', 'The JPEG signature is incomplete.');
  let offset = 2;
  while (offset + 3 < bytes.length) {
    if (bytes[offset] !== 0xff) return failure('MALFORMED_IMAGE', 'The JPEG marker stream is malformed.');
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset++];
    if (marker === 0xd9) break;
    if (marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) return failure('MALFORMED_IMAGE', 'A JPEG marker has no length.');
    const length = (bytes[offset] << 8) | bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) return failure('MALFORMED_IMAGE', 'A JPEG segment exceeds the supplied byte boundary.');
    const isFrame = (marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf);
    if (isFrame) {
      if (length < 8) return failure('MALFORMED_IMAGE', 'The JPEG frame header is too short.');
      const height = (bytes[offset + 3] << 8) | bytes[offset + 4];
      const width = (bytes[offset + 5] << 8) | bytes[offset + 6];
      return dimensions(width, height, 'jpeg', false, 'jpeg-signature', metadata);
    }
    offset += length;
  }
  return failure('MALFORMED_IMAGE', 'The JPEG contains no frame dimensions.');
}

function inspectWebp(bytes: Uint8Array, metadata?: LogoSourceMetadata): LogoInspectionResult {
  if (!hasBytes(bytes, 0, [...WEBP_SIGNATURE]) || !hasBytes(bytes, 8, [87, 69, 66, 80])) return failure('MALFORMED_IMAGE', 'The WebP RIFF signature is incomplete.');
  let offset = 12;
  let width: number | undefined;
  let height: number | undefined;
  let alpha = false;
  let animated = false;
  while (offset + 8 <= bytes.length) {
    const type = String.fromCharCode(...bytes.slice(offset, offset + 4));
    const length = u32le(bytes, offset + 4);
    const payload = offset + 8;
    const end = payload + length + (length % 2);
    if (end > bytes.length) return failure('MALFORMED_IMAGE', 'A WebP chunk exceeds the supplied byte boundary.');
    if (type === 'VP8X' && length >= 10) {
      const flags = bytes[payload];
      alpha = (flags & 0x10) !== 0;
      animated = (flags & 0x02) !== 0;
      width = 1 + bytes[payload + 4] + (bytes[payload + 5] << 8) + (bytes[payload + 6] << 16);
      height = 1 + bytes[payload + 7] + (bytes[payload + 8] << 8) + (bytes[payload + 9] << 16);
    } else if (type === 'VP8 ' && length >= 10 && hasBytes(bytes, payload + 3, [157, 1, 42])) {
      width = bytes[payload + 6] | (bytes[payload + 7] << 8);
      height = bytes[payload + 8] | (bytes[payload + 9] << 8);
    } else if (type === 'VP8L' && length >= 5 && bytes[payload] === 0x2f) {
      const bits = (bytes[payload + 1] | (bytes[payload + 2] << 8) | (bytes[payload + 3] << 16) | (bytes[payload + 4] << 24)) >>> 0;
      width = 1 + (bits & 0x3fff);
      height = 1 + ((bits >>> 14) & 0x3fff);
      alpha = true;
    } else if (type === 'ANIM' || type === 'ANMF') {
      animated = true;
    }
    offset = end;
  }
  if (width === undefined || height === undefined) return failure('MALFORMED_IMAGE', 'The WebP contains no supported frame dimensions.');
  return dimensions(width, height, 'webp', alpha, 'webp-riff-signature', metadata, animated);
}

function inspectSvg(bytes: Uint8Array, metadata?: LogoSourceMetadata): LogoInspectionResult {
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return failure('MALFORMED_IMAGE', 'The SVG is not valid UTF-8.');
  }
  const trimmed = text.trim();
  if (!/^<svg(?:\s|>)/iu.test(trimmed)) return failure('UNSUPPORTED_FORMAT', 'The SVG root element is not allowlisted.');
  if (/(?:<\s*script|on[a-z]+\s*=|javascript\s*:|(?:https?:|file:|data:)\s*|<\s*(?:foreignObject|iframe|object|embed|animate|set)\b|url\s*\()/iu.test(text)) {
    return failure('UNSAFE_SVG', 'The SVG contains script, animation, external-resource, or embedded-object content.');
  }
  const root = trimmed.slice(0, Math.min(trimmed.length, 16_384));
  const widthValue = /\bwidth\s*=\s*["']([0-9]+(?:\.[0-9]+)?)\s*(?:px)?["']/iu.exec(root)?.[1];
  const heightValue = /\bheight\s*=\s*["']([0-9]+(?:\.[0-9]+)?)\s*(?:px)?["']/iu.exec(root)?.[1];
  const viewBox = /\bviewBox\s*=\s*["']\s*0\s+0\s+([0-9]+(?:\.[0-9]+)?)\s+([0-9]+(?:\.[0-9]+)?)/iu.exec(root);
  const width = Number(widthValue ?? viewBox?.[1]);
  const height = Number(heightValue ?? viewBox?.[2]);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return failure('INVALID_DIMENSIONS', 'The SVG must declare width and height or a viewBox.');
  return dimensions(Math.floor(width), Math.floor(height), 'svg', true, 'svg-root-signature', metadata);
}

export function inspectLogoBytes(bytes: Uint8Array, metadata?: LogoSourceMetadata): LogoInspectionResult {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0) return failure('EMPTY_INPUT', 'Choose a non-empty local image.');
  if (bytes.byteLength > LOGO_MAX_INPUT_BYTES) return failure('INPUT_TOO_LARGE', `The image exceeds the ${LOGO_MAX_INPUT_BYTES}-byte input limit.`);
  if (hasBytes(bytes, 0, [...PNG_SIGNATURE])) return inspectPng(bytes, metadata);
  if (hasBytes(bytes, 0, [...JPEG_SIGNATURE])) return inspectJpeg(bytes, metadata);
  if (hasBytes(bytes, 0, [...WEBP_SIGNATURE])) return inspectWebp(bytes, metadata);
  const firstText = new TextDecoder('utf-8').decode(bytes.slice(0, 512)).trimStart();
  if (/^<svg(?:\s|>)/iu.test(firstText)) return inspectSvg(bytes, metadata);
  return failure('UNSUPPORTED_FORMAT', 'Only PNG, JPEG, WebP, and safe static SVG images are accepted.');
}

function finiteInRange(value: number, min: number, max: number): boolean {
  return Number.isFinite(value) && value >= min && value <= max;
}

export function validateLogoCrop(model: LogoCropModel): LogoValidationFailure | { readonly ok: true } {
  if (!['contain', 'cover', 'fill'].includes(model.fit)) return failure('INVALID_CROP', 'Choose contain, cover, or fill.');
  const values = [model.crop.x, model.crop.y, model.crop.width, model.crop.height, model.focalPoint.x, model.focalPoint.y, model.safeArea.top, model.safeArea.right, model.safeArea.bottom, model.safeArea.left];
  if (!values.every((value) => Number.isFinite(value))) return failure('INVALID_CROP', 'Crop values must be finite numbers.');
  if (!finiteInRange(model.crop.x, 0, 1) || !finiteInRange(model.crop.y, 0, 1) || !finiteInRange(model.crop.width, 0.0001, 1) || !finiteInRange(model.crop.height, 0.0001, 1) || model.crop.x + model.crop.width > 1 || model.crop.y + model.crop.height > 1) return failure('INVALID_CROP', 'The crop rectangle must stay inside the source image.');
  if (!finiteInRange(model.focalPoint.x, 0, 1) || !finiteInRange(model.focalPoint.y, 0, 1)) return failure('INVALID_CROP', 'The focal point must be between 0 and 1.');
  if (!values.slice(6).every((value) => finiteInRange(value, 0, 0.5)) || model.safeArea.left + model.safeArea.right >= 1 || model.safeArea.top + model.safeArea.bottom >= 1) return failure('INVALID_CROP', 'The safe area must leave visible room around the mark.');
  if (model.background.kind === 'solid' && !/^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/iu.test(model.background.color)) return failure('INVALID_CROP', 'A solid background must be an opaque or alpha hexadecimal colour.');
  return { ok: true };
}

export function validateLogoTargets(targets: readonly LogoTarget[]): LogoValidationFailure | { readonly ok: true } {
  if (targets.length === 0 || targets.length > LOGO_MAX_OUTPUTS) return failure('INVALID_TARGETS', `Choose between 1 and ${LOGO_MAX_OUTPUTS} output sizes.`);
  const seen = new Set<string>();
  for (const target of targets) {
    if (!['png', 'jpeg', 'webp'].includes(target.format) || !Number.isInteger(target.width) || !Number.isInteger(target.height) || target.width < 1 || target.height < 1 || target.width > LOGO_MAX_DIMENSION || target.height > LOGO_MAX_DIMENSION) return failure('INVALID_TARGETS', 'Each output needs an allowlisted format and bounded dimensions.');
    if (target.format === 'jpeg' && target.alpha) return failure('INVALID_TARGETS', 'JPEG outputs cannot preserve transparency.');
    const key = `${target.format}:${target.width}x${target.height}:${target.alpha ? 'a' : 'o'}`;
    if (seen.has(key)) return failure('INVALID_TARGETS', 'Output targets must be unique.');
    seen.add(key);
  }
  return { ok: true };
}

export interface LogoCacheAssetMetadata {
  readonly filename: string;
  readonly receipt: LogoOutputReceipt;
}

export interface LogoCacheRecord {
  readonly schemaVersion: typeof LOGO_SCHEMA_VERSION;
  readonly packageIdentity: typeof LOGO_PACKAGE_IDENTITY;
  readonly selectedPresetId?: string;
  readonly customLogoActive: boolean;
  readonly crop: LogoCropModel;
  readonly assets: readonly LogoCacheAssetMetadata[];
  readonly updatedAt: string;
}

export interface LogoCacheReadRequest { readonly kind: 'read' }
export interface LogoCacheWriteRequest { readonly kind: 'write'; readonly result: LogoConversionResult; readonly selectedPresetId?: string }
export interface LogoCacheClearRequest { readonly kind: 'clear' | 'reset' }
