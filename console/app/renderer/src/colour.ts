/**
 * colour.ts — the engine behind an infinite colour picker.
 *
 * Pure functions only: parsing, formatting, translation between every format a
 * designer or developer might paste in, WCAG contrast maths, sRGB-gamut
 * honesty for wide-gamut spaces (Lab/LCH/OKLab/OKLCH), and the animated
 * "rainbow" sentinel used by a picker's colour-cycling swatch.
 *
 * No DOM. No rendering. No randomness. No clocks.
 */

// ---------------------------------------------------------------- Types

export interface Colour {
  r: number; // 0..255
  g: number; // 0..255
  b: number; // 0..255
  a: number; // 0..1
}

export type ColourFormat =
  | 'hex'
  | 'rgb'
  | 'hsl'
  | 'hsv'
  | 'hwb'
  | 'cmyk'
  | 'lab'
  | 'lch'
  | 'oklab'
  | 'oklch'
  | 'name';

export const COLOUR_FORMATS: ColourFormat[] = [
  'hex', 'rgb', 'hsl', 'hsv', 'hwb', 'cmyk', 'lab', 'lch', 'oklab', 'oklch', 'name',
];

/** Formats whose canonical output preserves alpha, including fallback output for names. */
export function formatCarriesAlpha(format: ColourFormat): boolean {
  return COLOUR_FORMATS.includes(format);
}

export interface ColourWarning {
  readonly code: 'clipped-to-srgb' | 'alpha-clipped' | 'no-exact-name' | 'invalid';
  readonly message: string;
}

export interface ColourTranslation {
  readonly source: string;
  readonly colour: Colour;
  readonly sourceFormat: ColourFormat;
  readonly representations: Readonly<Record<ColourFormat, string>>;
  readonly alpha: number;
  readonly outOfSrgbGamut: boolean;
  readonly inputClipped: boolean;
  readonly warnings: ReadonlyArray<ColourWarning>;
}

export interface ContinuousColourCoordinates {
  readonly hue: number;
  readonly saturation: number;
  readonly lightness: number;
  readonly alpha: number;
}

// ---------------------------------------------------------------- Small numeric helpers

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

function round(value: number, decimals = 0): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

// ---------------------------------------------------------------- Named colours (CSS keyword subset)

const NAMED_COLOURS: Record<string, [number, number, number]> = {
  black: [0, 0, 0],
  white: [255, 255, 255],
  red: [255, 0, 0],
  lime: [0, 255, 0],
  blue: [0, 0, 255],
  green: [0, 128, 0],
  yellow: [255, 255, 0],
  cyan: [0, 255, 255],
  aqua: [0, 255, 255],
  magenta: [255, 0, 255],
  fuchsia: [255, 0, 255],
  silver: [192, 192, 192],
  gray: [128, 128, 128],
  grey: [128, 128, 128],
  maroon: [128, 0, 0],
  purple: [128, 0, 128],
  olive: [128, 128, 0],
  navy: [0, 0, 128],
  teal: [0, 128, 128],
  orange: [255, 165, 0],
  pink: [255, 192, 203],
  brown: [165, 42, 42],
  gold: [255, 215, 0],
  indigo: [75, 0, 130],
  violet: [238, 130, 238],
  coral: [255, 127, 80],
  salmon: [250, 128, 114],
  khaki: [240, 230, 140],
  crimson: [220, 20, 60],
  chocolate: [210, 105, 30],
  transparent: [0, 0, 0],
};

const NAMED_COLOURS_REVERSE: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const [name, [r, g, b]] of Object.entries(NAMED_COLOURS)) {
    if (name === 'transparent') continue;
    const key = `${r},${g},${b}`;
    if (!map.has(key)) map.set(key, name);
  }
  return map;
})();

// ---------------------------------------------------------------- sRGB <-> linear

function srgbChannelToLinear(c255: number): number {
  const c = clamp(c255, 0, 255) / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function linearToSrgbChannel(linear: number): number {
  const c = linear <= 0.0031308 ? linear * 12.92 : 1.055 * linear ** (1 / 2.4) - 0.055;
  return c;
}

// ---------------------------------------------------------------- RGB <-> XYZ (D65) <-> Lab

const XN = 0.95047;
const YN = 1.0;
const ZN = 1.08883;

function rgbToXyz(r255: number, g255: number, b255: number): [number, number, number] {
  const r = srgbChannelToLinear(r255);
  const g = srgbChannelToLinear(g255);
  const b = srgbChannelToLinear(b255);
  const x = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
  const y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b;
  const z = 0.0193339 * r + 0.1191920 * g + 0.9503041 * b;
  return [x, y, z];
}

/** Returns RAW (unclamped) 0..255-scaled rgb — callers decide whether to clip. */
function xyzToRgbRaw(x: number, y: number, z: number): [number, number, number] {
  const r = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z;
  const g = -0.9692660 * x + 1.8760108 * y + 0.0415560 * z;
  const b = 0.0556434 * x - 0.2040259 * y + 1.0572252 * z;
  return [linearToSrgbChannel(r) * 255, linearToSrgbChannel(g) * 255, linearToSrgbChannel(b) * 255];
}

function labF(t: number): number {
  const eps = 216 / 24389;
  const kappa = 24389 / 27;
  return t > eps ? Math.cbrt(t) : (kappa * t + 16) / 116;
}

function labFInv(t: number): number {
  const eps = 6 / 29;
  return t > eps ? t ** 3 : 3 * eps * eps * (t - 4 / 29);
}

function rgbToLab(r255: number, g255: number, b255: number): [number, number, number] {
  const [x, y, z] = rgbToXyz(r255, g255, b255);
  const fx = labF(x / XN);
  const fy = labF(y / YN);
  const fz = labF(z / ZN);
  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);
  return [L, a, b];
}

/** RAW (unclamped) rgb from Lab. */
function labToRgbRaw(L: number, a: number, b: number): [number, number, number] {
  const fy = (L + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  const x = XN * labFInv(fx);
  const y = YN * labFInv(fy);
  const z = ZN * labFInv(fz);
  return xyzToRgbRaw(x, y, z);
}

// ---------------------------------------------------------------- OKLab / OKLCH

function rgbToOklab(r255: number, g255: number, b255: number): [number, number, number] {
  const r = srgbChannelToLinear(r255);
  const g = srgbChannelToLinear(g255);
  const b = srgbChannelToLinear(b255);

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return [
    0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  ];
}

/** RAW (unclamped) rgb from OKLab. */
function oklabToRgbRaw(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  return [linearToSrgbChannel(r) * 255, linearToSrgbChannel(g) * 255, linearToSrgbChannel(bb) * 255];
}

// ---------------------------------------------------------------- polar helpers (Lab<->LCH, OKLab<->OKLCH)

function toPolar(a: number, b: number): [number, number] {
  const C = Math.sqrt(a * a + b * b);
  let H = (Math.atan2(b, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return [C, H];
}

function fromPolar(C: number, H: number): [number, number] {
  const rad = (H * Math.PI) / 180;
  return [C * Math.cos(rad), C * Math.sin(rad)];
}

// ---------------------------------------------------------------- RGB <-> HSL / HSV / HWB / CMYK

function rgbToHsl(r255: number, g255: number, b255: number): [number, number, number] {
  const r = r255 / 255;
  const g = g255 / 255;
  const b = b255 / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
    case g: h = (b - r) / d + 2; break;
    default: h = (r - g) / d + 4; break;
  }
  h *= 60;
  return [h, s * 100, l * 100];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const H = ((h % 360) + 360) % 360;
  const S = clamp(s, 0, 100) / 100;
  const L = clamp(l, 0, 100) / 100;
  if (S === 0) {
    const v = L * 255;
    return [v, v, v];
  }
  const q = L < 0.5 ? L * (1 + S) : L + S - L * S;
  const p = 2 * L - q;
  const hueToRgb = (t0: number): number => {
    let t = t0;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const hk = H / 360;
  return [
    hueToRgb(hk + 1 / 3) * 255,
    hueToRgb(hk) * 255,
    hueToRgb(hk - 1 / 3) * 255,
  ];
}

function rgbToHsv(r255: number, g255: number, b255: number): [number, number, number] {
  const r = r255 / 255;
  const g = g255 / 255;
  const b = b255 / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return [h, s * 100, v * 100];
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const H = ((h % 360) + 360) % 360;
  const S = clamp(s, 0, 100) / 100;
  const V = clamp(v, 0, 100) / 100;
  const c = V * S;
  const x = c * (1 - Math.abs(((H / 60) % 2) - 1));
  const m = V - c;
  let r1 = 0, g1 = 0, b1 = 0;
  if (H < 60) [r1, g1, b1] = [c, x, 0];
  else if (H < 120) [r1, g1, b1] = [x, c, 0];
  else if (H < 180) [r1, g1, b1] = [0, c, x];
  else if (H < 240) [r1, g1, b1] = [0, x, c];
  else if (H < 300) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  return [(r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255];
}

function rgbToHwb(r255: number, g255: number, b255: number): [number, number, number] {
  const [h] = rgbToHsv(r255, g255, b255);
  const w = Math.min(r255, g255, b255) / 255;
  const bl = 1 - Math.max(r255, g255, b255) / 255;
  return [h, w * 100, bl * 100];
}

function hwbToRgb(h: number, w: number, bl: number): [number, number, number] {
  let W = clamp(w, 0, 100) / 100;
  let BL = clamp(bl, 0, 100) / 100;
  if (W + BL >= 1) {
    const sum = W + BL;
    W /= sum;
    BL /= sum;
    const grey = W * 255;
    return [grey, grey, grey];
  }
  const [r, g, b] = hsvToRgb(h, 100, 100);
  const scale = 1 - W - BL;
  return [
    r * scale + W * 255,
    g * scale + W * 255,
    b * scale + W * 255,
  ];
}

function rgbToCmyk(r255: number, g255: number, b255: number): [number, number, number, number] {
  const r = r255 / 255;
  const g = g255 / 255;
  const b = b255 / 255;
  const k = 1 - Math.max(r, g, b);
  if (k >= 1) return [0, 0, 0, 100];
  const c = (1 - r - k) / (1 - k);
  const m = (1 - g - k) / (1 - k);
  const y = (1 - b - k) / (1 - k);
  return [c * 100, m * 100, y * 100, k * 100];
}

function cmykToRgb(c: number, m: number, y: number, k: number): [number, number, number] {
  const C = clamp(c, 0, 100) / 100;
  const M = clamp(m, 0, 100) / 100;
  const Y = clamp(y, 0, 100) / 100;
  const K = clamp(k, 0, 100) / 100;
  return [
    255 * (1 - C) * (1 - K),
    255 * (1 - M) * (1 - K),
    255 * (1 - Y) * (1 - K),
  ];
}

// ---------------------------------------------------------------- hex

function hexPairToByte(hex: string): number {
  return parseInt(hex, 16);
}

function byteToHexPair(value: number): string {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0');
}

function expandShortHexDigit(d: string): string {
  return d + d;
}

// ---------------------------------------------------------------- parsing helpers

function splitComponents(inner: string): string[] {
  // Accepts both comma-separated and whitespace-separated component lists,
  // with an optional "/ alpha" suffix (modern CSS colour-function syntax).
  const normalized = inner.replace(/\//g, ' ').trim();
  if (normalized.includes(',')) {
    return normalized.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
  }
  return normalized.split(/\s+/).filter((s) => s.length > 0);
}

function parsePercentOrNumber(token: string, max = 100): number {
  const t = token.trim();
  if (t.endsWith('%')) return (parseFloat(t) / 100) * max;
  return parseFloat(t);
}

function parseAlphaToken(token: string | undefined): number {
  if (token === undefined) return 1;
  const t = token.trim();
  if (t.endsWith('%')) return clamp(parseFloat(t) / 100, 0, 1);
  return clamp(parseFloat(t), 0, 1);
}

function parseAngle(token: string): number {
  return parseFloat(token.replace(/deg$/i, ''));
}

// ---------------------------------------------------------------- parseColour

export function parseColour(value: string): Colour | undefined {
  if (typeof value !== 'string') return undefined;
  const raw = value.trim();
  if (raw.length === 0) return undefined;
  if (raw === RAINBOW) return undefined; // the sentinel is never a real colour

  const lower = raw.toLowerCase();

  // hex: #rgb, #rgba, #rrggbb, #rrggbbaa (also tolerate a missing leading '#')
  const hexBody = lower.startsWith('#') ? lower.slice(1) : (/^[0-9a-f]{3,8}$/.test(lower) ? lower : undefined);
  if (hexBody !== undefined && /^[0-9a-f]+$/.test(hexBody)) {
    if (hexBody.length === 3 || hexBody.length === 4) {
      const r = hexPairToByte(expandShortHexDigit(hexBody[0]));
      const g = hexPairToByte(expandShortHexDigit(hexBody[1]));
      const b = hexPairToByte(expandShortHexDigit(hexBody[2]));
      const a = hexBody.length === 4 ? hexPairToByte(expandShortHexDigit(hexBody[3])) / 255 : 1;
      return { r, g, b, a };
    }
    if (hexBody.length === 6 || hexBody.length === 8) {
      const r = hexPairToByte(hexBody.slice(0, 2));
      const g = hexPairToByte(hexBody.slice(2, 4));
      const b = hexPairToByte(hexBody.slice(4, 6));
      const a = hexBody.length === 8 ? hexPairToByte(hexBody.slice(6, 8)) / 255 : 1;
      return { r, g, b, a };
    }
  }

  const fn = lower.match(/^([a-z]+)\s*\(([^)]*)\)$/);
  if (fn) {
    const kind = fn[1];
    const parts = splitComponents(fn[2]);

    if (kind === 'rgb' || kind === 'rgba') {
      if (parts.length < 3) return undefined;
      const r = parsePercentOrNumber(parts[0], 255);
      const g = parsePercentOrNumber(parts[1], 255);
      const b = parsePercentOrNumber(parts[2], 255);
      const a = parseAlphaToken(parts[3]);
      if (![r, g, b].every(isFiniteNumber)) return undefined;
      return { r: clamp(r, 0, 255), g: clamp(g, 0, 255), b: clamp(b, 0, 255), a };
    }

    if (kind === 'hsl' || kind === 'hsla') {
      if (parts.length < 3) return undefined;
      const h = parseAngle(parts[0]);
      const s = parsePercentOrNumber(parts[1], 100);
      const l = parsePercentOrNumber(parts[2], 100);
      const a = parseAlphaToken(parts[3]);
      if (![h, s, l].every(isFiniteNumber)) return undefined;
      const [r, g, b] = hslToRgb(h, s, l);
      return { r: clamp(r, 0, 255), g: clamp(g, 0, 255), b: clamp(b, 0, 255), a };
    }

    if (kind === 'hsv' || kind === 'hsb') {
      if (parts.length < 3) return undefined;
      const h = parseAngle(parts[0]);
      const s = parsePercentOrNumber(parts[1], 100);
      const v = parsePercentOrNumber(parts[2], 100);
      const a = parseAlphaToken(parts[3]);
      if (![h, s, v].every(isFiniteNumber)) return undefined;
      const [r, g, b] = hsvToRgb(h, s, v);
      return { r: clamp(r, 0, 255), g: clamp(g, 0, 255), b: clamp(b, 0, 255), a };
    }

    if (kind === 'hwb') {
      if (parts.length < 3) return undefined;
      const h = parseAngle(parts[0]);
      const w = parsePercentOrNumber(parts[1], 100);
      const bl = parsePercentOrNumber(parts[2], 100);
      const a = parseAlphaToken(parts[3]);
      if (![h, w, bl].every(isFiniteNumber)) return undefined;
      const [r, g, b] = hwbToRgb(h, w, bl);
      return { r: clamp(r, 0, 255), g: clamp(g, 0, 255), b: clamp(b, 0, 255), a };
    }

    if (kind === 'cmyk') {
      if (parts.length < 4) return undefined;
      const c = parsePercentOrNumber(parts[0], 100);
      const m = parsePercentOrNumber(parts[1], 100);
      const y = parsePercentOrNumber(parts[2], 100);
      const k = parsePercentOrNumber(parts[3], 100);
      const a = parseAlphaToken(parts[4]);
      if (![c, m, y, k].every(isFiniteNumber)) return undefined;
      const [r, g, b] = cmykToRgb(c, m, y, k);
      return { r: clamp(r, 0, 255), g: clamp(g, 0, 255), b: clamp(b, 0, 255), a };
    }

    if (kind === 'lab') {
      if (parts.length < 3) return undefined;
      const L = parseFloat(parts[0]);
      const a1 = parseFloat(parts[1]);
      const b1 = parseFloat(parts[2]);
      const a = parseAlphaToken(parts[3]);
      if (![L, a1, b1].every(isFiniteNumber)) return undefined;
      const [r, g, b] = labToRgbRaw(L, a1, b1);
      return { r: clamp(r, 0, 255), g: clamp(g, 0, 255), b: clamp(b, 0, 255), a };
    }

    if (kind === 'lch') {
      if (parts.length < 3) return undefined;
      const L = parseFloat(parts[0]);
      const C = parseFloat(parts[1]);
      const H = parseAngle(parts[2]);
      const a = parseAlphaToken(parts[3]);
      if (![L, C, H].every(isFiniteNumber)) return undefined;
      const [la, lb] = fromPolar(C, H);
      const [r, g, b] = labToRgbRaw(L, la, lb);
      return { r: clamp(r, 0, 255), g: clamp(g, 0, 255), b: clamp(b, 0, 255), a };
    }

    if (kind === 'oklab') {
      if (parts.length < 3) return undefined;
      const L = parseFloat(parts[0]);
      const a1 = parseFloat(parts[1]);
      const b1 = parseFloat(parts[2]);
      const a = parseAlphaToken(parts[3]);
      if (![L, a1, b1].every(isFiniteNumber)) return undefined;
      const [r, g, b] = oklabToRgbRaw(L, a1, b1);
      return { r: clamp(r, 0, 255), g: clamp(g, 0, 255), b: clamp(b, 0, 255), a };
    }

    if (kind === 'oklch') {
      if (parts.length < 3) return undefined;
      const L = parseFloat(parts[0]);
      const C = parseFloat(parts[1]);
      const H = parseAngle(parts[2]);
      const a = parseAlphaToken(parts[3]);
      if (![L, C, H].every(isFiniteNumber)) return undefined;
      const [la, lb] = fromPolar(C, H);
      const [r, g, b] = oklabToRgbRaw(L, la, lb);
      return { r: clamp(r, 0, 255), g: clamp(g, 0, 255), b: clamp(b, 0, 255), a };
    }

    return undefined;
  }

  // named colours (case-insensitive, whitespace-tolerant)
  const nameKey = lower.replace(/\s+/g, '');
  if (Object.prototype.hasOwnProperty.call(NAMED_COLOURS, nameKey)) {
    const [r, g, b] = NAMED_COLOURS[nameKey];
    const a = nameKey === 'transparent' ? 0 : 1;
    return { r, g, b, a };
  }

  return undefined;
}

// ---------------------------------------------------------------- formatColour

export function formatColour(colour: Colour, format: ColourFormat): string {
  const r = clamp(round(colour.r), 0, 255);
  const g = clamp(round(colour.g), 0, 255);
  const b = clamp(round(colour.b), 0, 255);
  const a = clamp(colour.a, 0, 1);
  const hasAlpha = a < 1;

  switch (format) {
    case 'hex': {
      const hex = `#${byteToHexPair(r)}${byteToHexPair(g)}${byteToHexPair(b)}`;
      return hasAlpha ? `${hex}${byteToHexPair(Math.round(a * 255))}` : hex;
    }
    case 'rgb': {
      return hasAlpha ? `rgba(${r}, ${g}, ${b}, ${round(a, 3)})` : `rgb(${r}, ${g}, ${b})`;
    }
    case 'hsl': {
      const [h, s, l] = rgbToHsl(r, g, b);
      const body = `${round(h, 1)}, ${round(s, 1)}%, ${round(l, 1)}%`;
      return hasAlpha ? `hsla(${body}, ${round(a, 3)})` : `hsl(${body})`;
    }
    case 'hsv': {
      const [h, s, v] = rgbToHsv(r, g, b);
      const body = `${round(h, 1)}, ${round(s, 1)}%, ${round(v, 1)}%`;
      return hasAlpha ? `hsva(${body}, ${round(a, 3)})` : `hsv(${body})`;
    }
    case 'hwb': {
      const [h, w, bl] = rgbToHwb(r, g, b);
      const body = `${round(h, 1)} ${round(w, 1)}% ${round(bl, 1)}%`;
      return hasAlpha ? `hwb(${body} / ${round(a, 3)})` : `hwb(${body})`;
    }
    case 'cmyk': {
      const [c, m, y, k] = rgbToCmyk(r, g, b);
      const body = `${round(c, 1)}%, ${round(m, 1)}%, ${round(y, 1)}%, ${round(k, 1)}%`;
      return hasAlpha ? `cmyk(${body}, ${round(a, 3)})` : `cmyk(${body})`;
    }
    case 'lab': {
      const [L, la, lb] = rgbToLab(r, g, b);
      const body = `${round(L, 3)}, ${round(la, 3)}, ${round(lb, 3)}`;
      return hasAlpha ? `lab(${body}, ${round(a, 3)})` : `lab(${body})`;
    }
    case 'lch': {
      const [L, la, lb] = rgbToLab(r, g, b);
      const [C, H] = toPolar(la, lb);
      const body = `${round(L, 3)}, ${round(C, 3)}, ${round(H, 2)}`;
      return hasAlpha ? `lch(${body}, ${round(a, 3)})` : `lch(${body})`;
    }
    case 'oklab': {
      const [L, oa, ob] = rgbToOklab(r, g, b);
      const body = `${round(L, 5)}, ${round(oa, 5)}, ${round(ob, 5)}`;
      return hasAlpha ? `oklab(${body}, ${round(a, 3)})` : `oklab(${body})`;
    }
    case 'oklch': {
      const [L, oa, ob] = rgbToOklab(r, g, b);
      const [C, H] = toPolar(oa, ob);
      const body = `${round(L, 5)}, ${round(C, 5)}, ${round(H, 2)}`;
      return hasAlpha ? `oklch(${body}, ${round(a, 3)})` : `oklch(${body})`;
    }
    case 'name': {
      const key = `${r},${g},${b}`;
      const named = NAMED_COLOURS_REVERSE.get(key);
      if (named && a === 1) return named;
      // No exact named match: fall back to hex rather than inventing a name.
      return formatColour(colour, 'hex');
    }
    default:
      return formatColour(colour, 'hex');
  }
}

// ---------------------------------------------------------------- translate

export function translate(value: string): Record<ColourFormat, string> | undefined {
  const colour = parseColour(value);
  if (!colour) return undefined;
  const out = {} as Record<ColourFormat, string>;
  for (const format of COLOUR_FORMATS) {
    out[format] = formatColour(colour, format);
  }
  return out;
}

function detectColourFormat(value: string): ColourFormat | undefined {
  const raw = value.trim().toLowerCase();
  if (/^#?[0-9a-f]{3,8}$/.test(raw)) return 'hex';
  const match = raw.match(/^([a-z]+)\s*\(/);
  if (match) {
    const aliases: Record<string, ColourFormat> = {
      rgba: 'rgb', hsla: 'hsl', hsva: 'hsv', hsb: 'hsv', hsba: 'hsv',
      rgb: 'rgb', hsl: 'hsl', hsv: 'hsv', hwb: 'hwb', cmyk: 'cmyk',
      lab: 'lab', lch: 'lch', oklab: 'oklab', oklch: 'oklch',
    };
    return aliases[match[1]];
  }
  const nameKey = raw.replace(/\s+/g, '');
  return Object.prototype.hasOwnProperty.call(NAMED_COLOURS, nameKey) ? 'name' : undefined;
}

/**
 * Translate through one parsed colour while retaining alpha in every output
 * and reporting when a wide-gamut source had to be clipped to sRGB.
 */
export function translateColour(value: string): ColourTranslation | undefined {
  const sourceFormat = detectColourFormat(value);
  const colour = parseColour(value);
  if (!sourceFormat || !colour) return undefined;

  const representations = translate(value);
  if (!representations) return undefined;
  const outOfSrgbGamut = isOutOfGamut(sourceFormat, value);
  const inputClipped = inputRequiresClipping(sourceFormat, value);
  const warnings: ColourWarning[] = [];
  if (inputClipped) {
    warnings.push({
      code: 'clipped-to-srgb',
      message: `${sourceFormat} source contains values outside its display range and was clipped for sRGB display; the source representation remains available to the caller.`,
    });
  }
  if (alphaRequiresClipping(value)) warnings.push({
    code: 'alpha-clipped',
    message: 'Source alpha is outside [0, 1] and was clipped for display.',
  });
  if (sourceFormat !== 'name' && representations.name.startsWith('#')) {
    warnings.push({
      code: 'no-exact-name',
      message: 'No exact named colour exists; the name representation uses the alpha-preserving hexadecimal value.',
    });
  }
  return { source: value, colour, sourceFormat, representations, alpha: colour.a, outOfSrgbGamut, inputClipped, warnings };
}

/** Continuous HSL coordinates for a two-dimensional field plus hue and alpha controls. */
export function colourFromContinuousCoordinates(coordinates: ContinuousColourCoordinates): Colour {
  const [r, g, b] = hslToRgb(coordinates.hue, coordinates.saturation, coordinates.lightness);
  return {
    r: clamp(r, 0, 255),
    g: clamp(g, 0, 255),
    b: clamp(b, 0, 255),
    a: clamp(coordinates.alpha, 0, 1),
  };
}

export function continuousCoordinatesFor(colour: Colour): ContinuousColourCoordinates {
  const [hue, saturation, lightness] = rgbToHsl(colour.r, colour.g, colour.b);
  return { hue, saturation, lightness, alpha: clamp(colour.a, 0, 1) };
}

// ---------------------------------------------------------------- WCAG accessibility

function linearizeForLuminance(c255: number): number {
  const c = clamp(c255, 0, 255) / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(colour: Colour): number {
  const r = linearizeForLuminance(colour.r);
  const g = linearizeForLuminance(colour.g);
  const b = linearizeForLuminance(colour.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: Colour, b: Colour): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function contrastVerdict(ratio: number, largeText = false): 'fail' | 'AA' | 'AAA' {
  const aaThreshold = largeText ? 3 : 4.5;
  const aaaThreshold = largeText ? 4.5 : 7;
  if (ratio >= aaaThreshold) return 'AAA';
  if (ratio >= aaThreshold) return 'AA';
  return 'fail';
}

// ---------------------------------------------------------------- Gamut honesty

const GAMUT_EPSILON = 0.5; // sub-half-unit slop absorbs floating point round-trip noise

function rawOutOfGamut(r: number, g: number, b: number): boolean {
  return r < -GAMUT_EPSILON || r > 255 + GAMUT_EPSILON
    || g < -GAMUT_EPSILON || g > 255 + GAMUT_EPSILON
    || b < -GAMUT_EPSILON || b > 255 + GAMUT_EPSILON;
}

export function isOutOfGamut(format: ColourFormat, value: string): boolean {
  const lower = value.trim().toLowerCase();
  const fn = lower.match(/^([a-z]+)\s*\(([^)]*)\)$/);
  if (!fn) return false;
  const parts = splitComponents(fn[2]);

  if (format === 'lab' && parts.length >= 3) {
    const [L, a, b] = [parseFloat(parts[0]), parseFloat(parts[1]), parseFloat(parts[2])];
    if (![L, a, b].every(isFiniteNumber)) return false;
    return rawOutOfGamut(...labToRgbRaw(L, a, b));
  }
  if (format === 'lch' && parts.length >= 3) {
    const [L, C, H] = [parseFloat(parts[0]), parseFloat(parts[1]), parseAngle(parts[2])];
    if (![L, C, H].every(isFiniteNumber)) return false;
    const [a, b] = fromPolar(C, H);
    return rawOutOfGamut(...labToRgbRaw(L, a, b));
  }
  if (format === 'oklab' && parts.length >= 3) {
    const [L, a, b] = [parseFloat(parts[0]), parseFloat(parts[1]), parseFloat(parts[2])];
    if (![L, a, b].every(isFiniteNumber)) return false;
    return rawOutOfGamut(...oklabToRgbRaw(L, a, b));
  }
  if (format === 'oklch' && parts.length >= 3) {
    const [L, C, H] = [parseFloat(parts[0]), parseFloat(parts[1]), parseAngle(parts[2])];
    if (![L, C, H].every(isFiniteNumber)) return false;
    const [a, b] = fromPolar(C, H);
    return rawOutOfGamut(...oklabToRgbRaw(L, a, b));
  }
  return false;
}

export function clipToGamut(colour: Colour): { colour: Colour; clipped: boolean } {
  const r = clamp(colour.r, 0, 255);
  const g = clamp(colour.g, 0, 255);
  const b = clamp(colour.b, 0, 255);
  const clipped = r !== colour.r || g !== colour.g || b !== colour.b;
  return { colour: { r: round(r), g: round(g), b: round(b), a: clamp(colour.a, 0, 1) }, clipped };
}

// ---------------------------------------------------------------- Animated rainbow sentinel

/**
 * A colour that cycles hue over time cannot be a colour STRING — no colour
 * string changes value on its own. This sentinel is what a renderer
 * recognises to mean "animate the hue", never a real colour to blend, tint,
 * or feed through a translator. It must never enter a palette of real
 * colours: appending alpha or otherwise treating it as a colour string
 * produces a silently-ignored declaration, not an error.
 * Legacy string callers retain this exact marker. Versioned appearance models
 * store RainbowValue objects and never place this string in a colour palette.
 */
export const RAINBOW = '__rainbow__';

export type RainbowSpeedLevel = 1 | 2 | 3 | 4 | 5;

export interface RainbowValue {
  readonly kind: 'rainbow';
  readonly reducedMotionHue: number;
}

function outside(value: number, minimum: number, maximum: number): boolean {
  return !Number.isFinite(value) || value < minimum || value > maximum;
}

/** Reports source components that parsing would clamp or normalize. */
export function inputRequiresClipping(format: ColourFormat, value: string): boolean {
  if (isOutOfGamut(format, value)) return true;
  const match = value.trim().toLowerCase().match(/^([a-z]+)\s*\(([^)]*)\)$/);
  if (!match) return false;
  const parts = splitComponents(match[2]);
  if (format === 'rgb' && parts.length >= 3) {
    return parts.slice(0, 3).some((part) => outside(parsePercentOrNumber(part, 255), 0, 255));
  }
  if (format === 'hsl' && parts.length >= 3) {
    return outside(parsePercentOrNumber(parts[1]), 0, 100) || outside(parsePercentOrNumber(parts[2]), 0, 100);
  }
  if (format === 'hsv' && parts.length >= 3) {
    return outside(parsePercentOrNumber(parts[1]), 0, 100) || outside(parsePercentOrNumber(parts[2]), 0, 100);
  }
  if (format === 'hwb' && parts.length >= 3) {
    const white = parsePercentOrNumber(parts[1]);
    const black = parsePercentOrNumber(parts[2]);
    return outside(white, 0, 100) || outside(black, 0, 100) || white + black > 100;
  }
  if (format === 'cmyk' && parts.length >= 4) {
    return parts.slice(0, 4).some((part) => outside(parsePercentOrNumber(part), 0, 100));
  }
  return false;
}

function alphaRequiresClipping(value: string): boolean {
  const match = value.trim().toLowerCase().match(/^([a-z]+)\s*\(([^)]*)\)$/);
  if (!match) return false;
  const kind = match[1];
  const parts = splitComponents(match[2]);
  const componentCount: Record<string, number> = {
    rgb: 3, rgba: 3, hsl: 3, hsla: 3, hsv: 3, hsva: 3, hsb: 3, hsba: 3,
    hwb: 3, cmyk: 4, lab: 3, lch: 3, oklab: 3, oklch: 3,
  };
  const count = componentCount[kind];
  if (count === undefined || parts.length <= count) return false;
  const raw = parts[count].endsWith('%') ? parseFloat(parts[count]) / 100 : parseFloat(parts[count]);
  return outside(raw, 0, 1);
}

export function rainbowValue(reducedMotionHue = 148): RainbowValue {
  if (!Number.isFinite(reducedMotionHue)) {
    throw new Error(`rainbowValue: reducedMotionHue must be finite, got ${reducedMotionHue}`);
  }
  return { kind: 'rainbow', reducedMotionHue: ((reducedMotionHue % 360) + 360) % 360 };
}

export function isRainbow(value: unknown): value is RainbowValue | typeof RAINBOW {
  return value === RAINBOW || (
    value !== null
    && typeof value === 'object'
    && (value as { kind?: unknown }).kind === 'rainbow'
  );
}

const RAINBOW_DURATIONS_MS: Record<number, number> = {
  1: 8000,
  2: 6000,
  3: 4000,
  4: 2500,
  5: 1500,
};

/** Level 1 (slowest) through 5 (fastest). Any other level is refused by name. */
export function rainbowDurationMs(level: RainbowSpeedLevel | number): number {
  const duration = RAINBOW_DURATIONS_MS[level];
  if (duration === undefined) {
    throw new Error(`rainbowDurationMs: level must be an integer 1..5, got ${level}`);
  }
  return duration;
}

/** Reduced motion always settles the rainbow marker onto one deterministic hue. */
export function resolveRainbow(value: RainbowValue, reducedMotion: boolean, level: RainbowSpeedLevel): {
  readonly cssColour: string;
  readonly animated: boolean;
  readonly durationMs?: number;
} {
  const hue = ((value.reducedMotionHue % 360) + 360) % 360;
  if (reducedMotion) {
    return { cssColour: `hsl(${round(hue, 2)} 70% 50%)`, animated: false };
  }
  return {
    cssColour: 'hsl(var(--appearance-rainbow-hue) 70% 50%)',
    animated: true,
    durationMs: rainbowDurationMs(level),
  };
}
