import { open, stat } from "node:fs/promises";
import type { ConverterSniffResult } from "../shared/converter.js";

export const DEFAULT_SNIFF_BYTES = 64 * 1024;
export const MAX_SNIFF_BYTES = 256 * 1024;

interface MagicSignature {
  formatId: string;
  detail: string;
  matches: (bytes: Buffer) => boolean;
}

const MAGIC_SIGNATURES: ReadonlyArray<MagicSignature> = [
  signature("application/pdf", "PDF header", (b) => ascii(b, 0, 5) === "%PDF-"),
  signature("image/png", "PNG signature", (b) => b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))),
  signature("image/jpeg", "JPEG start-of-image marker", (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff),
  signature("image/webp", "RIFF WebP header", (b) => ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP"),
  signature("audio/wav", "RIFF WAVE header", (b) => ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WAVE"),
  signature("audio/ogg", "Ogg stream with a supported audio codec header", (b) => ascii(b, 0, 4) === "OggS" && (b.includes(Buffer.from("OpusHead", "ascii")) || b.includes(Buffer.from([0x01, 0x76, 0x6f, 0x72, 0x62, 0x69, 0x73])))),
  signature("audio/flac", "FLAC stream header", (b) => ascii(b, 0, 4) === "fLaC"),
  signature("video/mp4", "ISO base media file type box with an MP4-compatible brand", (b) => hasMp4Brand(b)),
  signature("video/webm", "EBML header with WebM document type", (b) => b.length >= 16 && b.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])) && b.subarray(0, Math.min(256, b.length)).includes(Buffer.from("webm", "ascii"))),
  signature("application/zip", "ZIP local-file, empty-archive, or spanning marker", (b) => b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && ((b[2] === 0x03 && b[3] === 0x04) || (b[2] === 0x05 && b[3] === 0x06) || (b[2] === 0x07 && b[3] === 0x08))),
  signature("application/x-7z-compressed", "7z signature", (b) => b.length >= 6 && b.subarray(0, 6).equals(Buffer.from([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]))),
  signature("application/gzip", "Gzip signature", (b) => b.length >= 3 && b[0] === 0x1f && b[1] === 0x8b && b[2] === 0x08),
];

export async function sniffFileType(
  filePath: string,
  requestedBytes = DEFAULT_SNIFF_BYTES,
): Promise<ConverterSniffResult> {
  const limit = integerBetween(requestedBytes, 16, MAX_SNIFF_BYTES, "requestedBytes");
  const info = await stat(filePath);
  if (!info.isFile()) throw new Error("Converter input must be a regular file.");
  if (info.size === 0) {
    return unknown(0, 0, "The file is empty, so no type can be established.");
  }
  const bytesToRead = Math.min(info.size, limit);
  const handle = await open(filePath, "r");
  try {
    const bytes = Buffer.allocUnsafe(bytesToRead);
    const { bytesRead } = await handle.read(bytes, 0, bytesToRead, 0);
    return sniffBuffer(bytes.subarray(0, bytesRead), info.size, bytesRead === info.size);
  } finally {
    await handle.close();
  }
}

export function sniffBuffer(
  bytes: Buffer,
  fileBytes = bytes.byteLength,
  complete = bytes.byteLength === fileBytes,
): ConverterSniffResult {
  for (const candidate of MAGIC_SIGNATURES) {
    if (candidate.matches(bytes)) {
      return {
        formatId: candidate.formatId,
        candidateFormatIds: [candidate.formatId],
        confidence: "exact",
        method: "magic",
        bytesInspected: bytes.byteLength,
        fileBytes,
        detail: `Matched ${candidate.detail}; the filename extension was not used.`,
      };
    }
  }

  const text = decodeUtf8(bytes);
  if (text === undefined || text.includes("\0")) {
    return {
      formatId: "application/octet-stream",
      candidateFormatIds: ["application/octet-stream"],
      confidence: "exact",
      method: "magic",
      bytesInspected: bytes.byteLength,
      fileBytes,
      detail: "No known signature matched and the bytes are not strict UTF-8, so the only truthful type is arbitrary binary data.",
    };
  }

  if (complete) {
    const trimmed = text.trim();
    if (looksLikeJson(trimmed)) {
      return textResult("application/json", "exact", bytes, fileBytes, "The complete file parsed as JSON.");
    }
    const compact = trimmed.replace(/\s+/gu, "");
    if (compact.length >= 2 && compact.length % 2 === 0 && /^[0-9a-f]+$/iu.test(compact)) {
      return textResult("encoding/hex", "exact", bytes, fileBytes, "The complete file is valid even-length hexadecimal text.");
    }
    if (compact.length >= 16 && validCanonicalBase64(compact)) {
      return textResult("encoding/base64", "exact", bytes, fileBytes, "The complete file is canonical Base64 text.");
    }
    if (looksLikeCsv(text)) {
      return textResult("text/csv", "probable", bytes, fileBytes, "The complete UTF-8 file has a consistent comma-separated record shape. CSV dialect details remain unproven.");
    }
  }

  return textResult(
    "text/utf8",
    "exact",
    bytes,
    fileBytes,
    complete
      ? "The complete file is strict UTF-8 text and did not validate as a more specific supported text format."
      : "The inspected prefix is strict UTF-8 text. The file is larger than the sniffing bound, so no more specific text type is claimed.",
  );
}

function signature(formatId: string, detail: string, matches: (bytes: Buffer) => boolean): MagicSignature {
  return { formatId, detail, matches };
}

function ascii(bytes: Buffer, start: number, end: number): string {
  return bytes.length >= end ? bytes.toString("ascii", start, end) : "";
}

function decodeUtf8(bytes: Buffer): string | undefined {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return undefined;
  }
}

function looksLikeJson(text: string): boolean {
  if (!(text.startsWith("{") && text.endsWith("}")) && !(text.startsWith("[") && text.endsWith("]"))) {
    return false;
  }
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

function validCanonicalBase64(value: string): boolean {
  if (value.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(value)) {
    return false;
  }
  try {
    return Buffer.from(value, "base64").toString("base64") === value;
  } catch {
    return false;
  }
}

function looksLikeCsv(value: string): boolean {
  const lines = value.split(/\r\n|\n|\r/u).filter((line) => line.length > 0);
  if (lines.length < 2) return false;
  const counts = lines.slice(0, 20).map(countCsvColumns);
  return counts[0] >= 2 && counts.every((count) => count === counts[0]);
}

function countCsvColumns(line: string): number {
  let columns = 1;
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') index += 1;
      else quoted = !quoted;
    } else if (char === "," && !quoted) {
      columns += 1;
    }
  }
  return quoted ? 0 : columns;
}

function textResult(
  formatId: string,
  confidence: "exact" | "probable",
  bytes: Buffer,
  fileBytes: number,
  detail: string,
): ConverterSniffResult {
  return {
    formatId,
    candidateFormatIds: formatId === "text/utf8" ? [formatId] : [formatId, "text/utf8"],
    confidence,
    method: "validated-text",
    bytesInspected: bytes.byteLength,
    fileBytes,
    detail,
  };
}

function unknown(bytesInspected: number, fileBytes: number, detail: string): ConverterSniffResult {
  return { candidateFormatIds: [], confidence: "unknown", method: "unknown", bytesInspected, fileBytes, detail };
}

function hasMp4Brand(bytes: Buffer): boolean {
  if (bytes.length < 12 || ascii(bytes, 4, 8) !== "ftyp") return false;
  const brands = new Set(["isom", "iso2", "mp41", "mp42", "avc1", "M4V ", "M4A "]);
  const end = Math.min(bytes.length, 64);
  for (let offset = 8; offset + 4 <= end; offset += 4) {
    if (brands.has(ascii(bytes, offset, offset + 4))) return true;
  }
  return false;
}

function integerBetween(value: number, minimum: number, maximum: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} through ${maximum}.`);
  }
  return value;
}
