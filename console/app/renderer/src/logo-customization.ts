/**
 * Choosing the mark this console shows for itself.
 *
 * A shipped preset, or a picture somebody supplies. The picture is the interesting half,
 * because an image file is untrusted input that arrives looking harmless:
 *
 *  - THE BYTES DECIDE THE FORMAT, never the extension or the MIME type the picker
 *    reports. Both are claims made by whoever produced the file. A PNG renamed .jpg is
 *    ordinary; a file claiming to be a PNG and containing something else is the case this
 *    check exists for.
 *  - PIXELS ARE BOUNDED, NOT ONLY BYTES. A decompression bomb is small on disk and
 *    enormous in memory -- a few hundred kilobytes can decode to gigabytes -- so the
 *    dimensions are checked before anything decodes, and a byte limit alone would not
 *    catch it.
 *  - NOTHING IS PARTIALLY APPLIED. A file that fails any check leaves the previous mark
 *    exactly as it was. A half-applied logo is a console that looks broken with no
 *    obvious way back.
 *
 * AND THE RULE THAT MATTERS MOST, shared with the display name: a custom mark changes
 * PRESENTATION AND NOTHING ELSE. It must never rewrite the package identity, the
 * executable name, the installer identity, the update feed or the data directory. Those
 * are constants elsewhere and there is deliberately no path from here to any of them --
 * a logo that moved the data directory would orphan every stored profile and credential.
 */

export interface LogoPreset {
  id: string;
  label: string;
  /** A bundled local asset. Never a URL: a remote mark is a request on every launch. */
  asset: string;
}

export const LOGO_PRESETS: readonly LogoPreset[] = [
  { id: 'ding', label: 'Ding', asset: 'assets/logo/ding.svg' },
  { id: 'ding-mono', label: 'Ding, single colour', asset: 'assets/logo/ding-mono.svg' },
  { id: 'handset', label: 'Handset', asset: 'assets/logo/handset.svg' },
];

export const DEFAULT_PRESET_ID = 'ding';

/** Formats a mark may be supplied in, each identified by its own leading bytes. */
export const ACCEPTED_FORMATS = ['png', 'jpeg', 'svg', 'webp'] as const;
export type LogoFormat = (typeof ACCEPTED_FORMATS)[number];

export const MAX_FILE_BYTES = 2 * 1024 * 1024;
/** Total decoded pixels. The bound a decompression bomb actually crosses. */
export const MAX_DECODED_PIXELS = 4096 * 4096;
export const MAX_DIMENSION = 4096;
/** A mark is one picture. An animation would loop behind the interface forever. */
export const MAX_FRAMES = 1;

/**
 * Identifies a format from the leading bytes.
 *
 * Returns undefined for anything unrecognised rather than guessing, and deliberately
 * ignores whatever extension or MIME type came with the file: both are claims made by
 * whoever produced it, and the whole point of looking at bytes is to not take the claim.
 */
export function sniffFormat(bytes: Uint8Array): LogoFormat | undefined {
  const at = (index: number) => bytes[index];
  if (bytes.length >= 8
    && at(0) === 0x89 && at(1) === 0x50 && at(2) === 0x4e && at(3) === 0x47
    && at(4) === 0x0d && at(5) === 0x0a && at(6) === 0x1a && at(7) === 0x0a) return 'png';
  if (bytes.length >= 3 && at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return 'jpeg';
  if (bytes.length >= 12
    && at(0) === 0x52 && at(1) === 0x49 && at(2) === 0x46 && at(3) === 0x46
    && at(8) === 0x57 && at(9) === 0x45 && at(10) === 0x42 && at(11) === 0x50) return 'webp';
  /* SVG is text, so it is recognised by its root element after any leading whitespace,
   * declaration or comment -- not by a fixed offset. */
  const head = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 1024));
  if (/<svg[\s>]/iu.test(head)) return 'svg';
  return undefined;
}

export interface ImageFacts {
  /** What the decoder reports, having been given only bytes this module accepted. */
  width: number;
  height: number;
  frames: number;
}

export interface LogoProblem {
  message: string;
}

export interface AcceptedLogo {
  format: LogoFormat;
  bytes: number;
  facts: ImageFacts;
  /** Stated before the mark becomes active, never discovered afterwards. */
  notices: string[];
}

/**
 * Decides whether a supplied file may become the mark.
 *
 * The claimed name and type are accepted as arguments purely so a mismatch can be
 * REPORTED -- somebody handed a mislabelled file deserves to know -- but nothing is
 * decided by them.
 */
export function acceptLogo(
  bytes: Uint8Array,
  facts: ImageFacts,
  claimed: { fileName?: string; mimeType?: string } = {},
): AcceptedLogo | { problems: LogoProblem[] } {
  const problems: LogoProblem[] = [];

  if (bytes.length === 0) return { problems: [{ message: 'That file is empty.' }] };
  if (bytes.length > MAX_FILE_BYTES) {
    problems.push({ message: `A mark has to be ${MAX_FILE_BYTES / 1024 / 1024} MB or smaller; that one is ${Math.ceil(bytes.length / 1024)} KB.` });
  }

  const format = sniffFormat(bytes);
  if (!format) {
    /* Named by what it is not rather than by what it claimed to be, since the claim is
     * exactly the thing that turned out to be untrue. */
    return { problems: [{ message: 'That file is not a PNG, JPEG, WebP or SVG, whatever its name says.' }] };
  }

  if (!Number.isFinite(facts.width) || !Number.isFinite(facts.height)
    || facts.width <= 0 || facts.height <= 0) {
    return { problems: [{ message: 'That image reports no usable size and was not read further.' }] };
  }
  if (facts.width > MAX_DIMENSION || facts.height > MAX_DIMENSION) {
    problems.push({ message: `A mark can be at most ${MAX_DIMENSION} pixels on a side; that one is ${facts.width} by ${facts.height}.` });
  }
  if (facts.width * facts.height > MAX_DECODED_PIXELS) {
    /* The bound a decompression bomb crosses. A few hundred kilobytes on disk can decode
     * to gigabytes, so the byte limit above would never have caught it. */
    problems.push({ message: 'That image decodes to more pixels than this console will hold in memory.' });
  }
  if (facts.frames > MAX_FRAMES) {
    problems.push({ message: 'A mark is one picture. An animated image would loop behind the interface forever.' });
  }

  if (problems.length > 0) return { problems };

  const notices: string[] = [];
  const claimedFormat = formatFromClaim(claimed);
  if (claimedFormat !== undefined && claimedFormat !== format) {
    /* Reported rather than refused: a mislabelled file is usually somebody's export
     * settings rather than an attack, and the bytes are what was used either way. */
    notices.push(`That file is named as ${claimedFormat} and is actually ${format}. The contents were used.`);
  }
  if (format !== 'svg') {
    notices.push('A picture mark is fixed at the size supplied, so it will be resampled at other sizes. An SVG stays sharp everywhere.');
  }
  return { format, bytes: bytes.length, facts, notices };
}

function formatFromClaim(claimed: { fileName?: string; mimeType?: string }): LogoFormat | undefined {
  const extension = claimed.fileName?.split('.').pop()?.toLowerCase();
  const byExtension: Record<string, LogoFormat> = {
    png: 'png', jpg: 'jpeg', jpeg: 'jpeg', webp: 'webp', svg: 'svg',
  };
  if (extension && byExtension[extension]) return byExtension[extension];
  const subtype = claimed.mimeType?.split('/').pop()?.toLowerCase();
  return subtype && byExtension[subtype] ? byExtension[subtype] : undefined;
}

/**
 * Everything a mark must never change.
 *
 * Stated here as data so a test can assert it, and mirrored from `display-name.ts` rather
 * than redefined -- two lists of things that must not move would eventually disagree, and
 * the one that disagreed would be the one nobody checked.
 */
export const NEVER_CHANGED_BY_A_MARK: readonly string[] = [
  'dataDirectory',
  'applicationId',
  'credentialService',
  'updateFeed',
  'installerIdentity',
  'executableName',
];

export interface LogoChoice {
  kind: 'preset' | 'custom';
  presetId?: string;
  /** Present only for a custom mark. Local, never a URL. */
  storedAt?: string;
}

export const LOGO_SETTING = 'console.logo';

export interface LogoStorage {
  getItem(key: string): string | null | undefined;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** The chosen mark, falling back to the shipped preset whenever the stored value is unusable. */
export function currentChoice(storage: LogoStorage | undefined): LogoChoice {
  const raw = storage?.getItem(LOGO_SETTING);
  if (typeof raw !== 'string' || raw === '') return { kind: 'preset', presetId: DEFAULT_PRESET_ID };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { kind: 'preset', presetId: DEFAULT_PRESET_ID };
  }
  const choice = parsed as LogoChoice;
  if (choice?.kind === 'custom' && typeof choice.storedAt === 'string' && choice.storedAt !== '') {
    /* A remote address would make the mark a network request on every launch, and a
     * failed one an app with no logo. */
    if (/^https?:/iu.test(choice.storedAt)) return { kind: 'preset', presetId: DEFAULT_PRESET_ID };
    return { kind: 'custom', storedAt: choice.storedAt };
  }
  const preset = LOGO_PRESETS.find((candidate) => candidate.id === choice?.presetId);
  return { kind: 'preset', presetId: preset ? preset.id : DEFAULT_PRESET_ID };
}

export function choosePreset(storage: LogoStorage, presetId: string): boolean {
  if (!LOGO_PRESETS.some((preset) => preset.id === presetId)) return false;
  storage.setItem(LOGO_SETTING, JSON.stringify({ kind: 'preset', presetId }));
  return true;
}

export function chooseCustom(storage: LogoStorage, storedAt: string): boolean {
  if (storedAt === '' || /^https?:/iu.test(storedAt)) return false;
  storage.setItem(LOGO_SETTING, JSON.stringify({ kind: 'custom', storedAt }));
  return true;
}

/** Back to the shipped mark in one action. */
export function resetLogo(storage: LogoStorage): void {
  storage.removeItem(LOGO_SETTING);
}
