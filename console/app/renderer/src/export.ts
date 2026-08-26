/**
 * Export engine: pure functions that turn arbitrary row data into export text.
 *
 * No filesystem access, no clock, no randomness. Everything here is
 * deterministic given its inputs, so it is trivially testable and safe to
 * call from any surface that wants to hand the user their data back.
 */

export type ExportFormat =
  | 'json'
  | 'jsonl'
  | 'yaml'
  | 'toml'
  | 'xml'
  | 'csv'
  | 'tsv'
  | 'markdown'
  | 'html'
  | 'sql';

export type ArchiveFormat = 'zip' | '7z';

export interface ArchiveOptions {
  format: ArchiveFormat;
  compression: 'store' | 'deflate' | 'lzma' | 'lzma2' | 'ppmd' | 'bzip2';
  level: 'store' | 'fast' | 'normal' | 'maximum' | 'ultra';
  solid: boolean;
  encryptedHeaders: boolean;
  encryptedContent: boolean;
}

export interface ArchiveAdapterChoice {
  format: ArchiveFormat;
  label: string;
  enabled: boolean;
  reason?: string;
  options: ReadonlyArray<string>;
}

export const ARCHIVE_CHOICES: ReadonlyArray<ArchiveAdapterChoice> = [
  { format: 'zip', label: 'ZIP', enabled: true, options: ['store'] },
  { format: '7z', label: '7z', enabled: false, reason: 'Missing bundled 7z adapter and its required native toolchain. PATH and network fallbacks are prohibited, so 7z output is unavailable.', options: ['LZMA2', 'LZMA', 'PPMd', 'BZip2', 'Deflate', 'store', 'fast', 'normal', 'maximum', 'ultra', 'solid', 'non-solid', 'AES-256 content', 'encrypted headers'] },
];

export function validateArchiveOptions(options: ArchiveOptions): { ok: true } | { ok: false; reason: string } {
  if (options.format === '7z') return { ok: false, reason: 'Missing bundled 7z adapter and its required native toolchain. PATH and network fallbacks are prohibited.' };
  if (options.compression !== 'store') return { ok: false, reason: 'The bundled ZIP adapter supports store mode only.' };
  if (options.solid || options.encryptedHeaders || options.encryptedContent) return { ok: false, reason: 'Solid archives and encryption require the unavailable 7z adapter.' };
  return { ok: true };
}

export interface ExportRequest {
  rows: ReadonlyArray<Record<string, unknown>>;
  format: ExportFormat;
  table?: string;
}

export interface ExportOmissionMetadata {
  schemaVersion: 1;
  format: ExportFormat;
  omissions: ReadonlyArray<string>;
  note: string;
}

const ALL_FORMATS: ReadonlyArray<ExportFormat> = [
  'json',
  'jsonl',
  'yaml',
  'toml',
  'xml',
  'csv',
  'tsv',
  'markdown',
  'html',
  'sql',
];

// ---------------------------------------------------------------- shared helpers

function unionColumns(rows: ReadonlyArray<Record<string, unknown>>): string[] {
  const seen = new Set<string>();
  const columns: string[] = [];
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        columns.push(key);
      }
    }
  }
  return columns;
}

function hasRaggedKeys(rows: ReadonlyArray<Record<string, unknown>>): boolean {
  if (rows.length === 0) return false;
  const first = Object.keys(rows[0]).sort().join('\u0000');
  return rows.some((row) => Object.keys(row).sort().join('\u0000') !== first);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date);
}

function hasNestedValue(rows: ReadonlyArray<Record<string, unknown>>): boolean {
  return rows.some((row) => Object.values(row).some((value) => isPlainObject(value) || Array.isArray(value)));
}

function hasNullVsUndefinedAmbiguity(rows: ReadonlyArray<Record<string, unknown>>): boolean {
  return rows.some((row) => Object.values(row).some((value) => value === null || value === undefined));
}

function scalarToString(value: unknown): string {
  if (value === undefined) return '';
  if (value === null) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function isValidXmlName(name: string): boolean {
  // Simplified but sound: must start with a letter or underscore, and
  // contain only letters, digits, hyphens, underscores, and periods.
  // Refuses names starting with "xml" (case-insensitive), which XML reserves.
  if (!/^[A-Za-z_][A-Za-z0-9_.-]*$/.test(name)) return false;
  if (/^xml/i.test(name)) return false;
  return true;
}

function isPlainSqlIdentifier(name: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

function isBareTomlKey(name: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(name) && name.length > 0;
}

// ---------------------------------------------------------------- suitableFormats / describeLoss

export function suitableFormats(rows: ReadonlyArray<Record<string, unknown>>): ReadonlyArray<ExportFormat> {
  const nested = hasNestedValue(rows);
  const columns = unionColumns(rows);
  const invalidXmlColumns = columns.some((c) => !isValidXmlName(c));
  const invalidSqlColumns = columns.some((c) => !isPlainSqlIdentifier(c));

  return ALL_FORMATS.filter((format) => {
    switch (format) {
      case 'csv':
      case 'tsv':
      case 'markdown':
        // Tabular formats cannot faithfully represent nested structure --
        // it would have to be flattened/stringified, losing shape.
        return !nested;
      case 'xml':
        return !invalidXmlColumns;
      case 'sql':
        return !invalidSqlColumns;
      case 'toml':
      case 'yaml':
      case 'json':
      case 'jsonl':
      case 'html':
        return true;
      default:
        return true;
    }
  });
}

export function describeLoss(rows: ReadonlyArray<Record<string, unknown>>, format: ExportFormat): ReadonlyArray<string> {
  const notes: string[] = [];
  const nested = hasNestedValue(rows);
  const ragged = hasRaggedKeys(rows);
  const nullish = hasNullVsUndefinedAmbiguity(rows);
  const columns = unionColumns(rows);

  if (ragged && (format === 'csv' || format === 'tsv' || format === 'markdown' || format === 'sql')) {
    notes.push('Rows have differing keys; missing fields are emitted as empty cells with no way to distinguish missing from empty.');
  }

  switch (format) {
    case 'csv':
    case 'tsv':
      if (nested) {
        notes.push('Nested objects and arrays are flattened to their JSON string form; the original structure cannot be recovered by re-importing.');
      }
      if (nullish) {
        notes.push('null and an empty string are indistinguishable once written as an empty cell.');
      }
      break;
    case 'markdown':
      if (nested) {
        notes.push('Nested objects and arrays are rendered as their JSON string form inside the cell.');
      }
      break;
    case 'xml': {
      const invalid = columns.filter((c) => !isValidXmlName(c));
      if (invalid.length > 0) {
        notes.push(`Column name(s) ${invalid.join(', ')} are not valid XML element names and cannot be represented.`);
      }
      if (nullish) {
        notes.push('null and undefined are both rendered as an empty element with no distinguishing marker.');
      }
      break;
    }
    case 'sql': {
      const invalid = columns.filter((c) => !isPlainSqlIdentifier(c));
      if (invalid.length > 0) {
        notes.push(`Column name(s) ${invalid.join(', ')} are not plain SQL identifiers and cannot be used as column names.`);
      }
      if (nested) {
        notes.push('Nested objects and arrays are stored as their JSON string literal; the database will not treat them as structured data.');
      }
      break;
    }
    case 'toml': {
      const invalid = columns.filter((c) => !isBareTomlKey(c));
      if (invalid.length > 0) {
        notes.push(`Column name(s) ${invalid.join(', ')} are not bare TOML keys and are quoted, which some parsers handle inconsistently.`);
      }
      break;
    }
    case 'yaml':
      // yaml can represent everything faithfully with correct quoting.
      break;
    case 'json':
    case 'jsonl':
    case 'html':
      break;
    default:
      break;
  }

  return notes;
}

// ---------------------------------------------------------------- exportRows dispatch

export function exportRows(request: ExportRequest): string {
  const { rows, format } = request;
  switch (format) {
    case 'json':
      return toJson(rows);
    case 'jsonl':
      return toJsonl(rows);
    case 'yaml':
      return toYaml(rows);
    case 'toml':
      return toToml(rows, request.table ?? 'row');
    case 'xml':
      return toXml(rows, request.table ?? 'row');
    case 'csv':
      return toDelimited(rows, ',');
    case 'tsv':
      return toDelimited(rows, '\t');
    case 'markdown':
      return toMarkdown(rows);
    case 'html':
      return toHtml(rows);
    case 'sql':
      return toSql(rows, request.table ?? 'export_table');
    default: {
      const exhaustive: never = format;
      throw new Error(`Unsupported export format: ${String(exhaustive)}`);
    }
  }
}

/** A sidecar-safe omission marker for formats that cannot carry metadata comments. */
export function exportOmissionMetadata(request: ExportRequest): ExportOmissionMetadata {
  return {
    schemaVersion: 1,
    format: request.format,
    omissions: describeLoss(request.rows, request.format),
    note: 'This sidecar describes fields or distinctions the selected format could not carry. The source rows were not changed.',
  };
}

// ---------------------------------------------------------------- json / jsonl

function jsonSafe(value: unknown): unknown {
  if (value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function normalizeRowForJson(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = jsonSafe(v);
  }
  return out;
}

function toJson(rows: ReadonlyArray<Record<string, unknown>>): string {
  return JSON.stringify(rows.map(normalizeRowForJson), null, 2);
}

function toJsonl(rows: ReadonlyArray<Record<string, unknown>>): string {
  // One object per line, no wrapping array, no trailing newline.
  return rows.map((row) => JSON.stringify(normalizeRowForJson(row))).join('\n');
}

// ---------------------------------------------------------------- yaml

const YAML_AMBIGUOUS = new Set([
  'yes', 'no', 'on', 'off', 'true', 'false', 'null', '~', 'y', 'n',
]);

function yamlNeedsQuoting(raw: string): boolean {
  if (raw === '') return true;
  const lower = raw.toLowerCase();
  if (YAML_AMBIGUOUS.has(lower)) return true;
  // Numeric-looking (int or float)
  if (/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(raw)) return true;
  // Date-looking (YYYY-MM-DD or full ISO)
  if (/^\d{4}-\d{2}-\d{2}([Tt].*)?$/.test(raw)) return true;
  // Leading/trailing whitespace, or special leading characters
  if (/^\s|\s$/.test(raw)) return true;
  if (/^[-?:,[\]{}#&*!|>'"%@`]/.test(raw)) return true;
  if (raw.includes(': ') || raw.includes(' #') || raw.includes('\n')) return true;
  return false;
}

function yamlQuote(raw: string): string {
  const escaped = raw.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
  return `"${escaped}"`;
}

function yamlScalar(value: unknown): string {
  if (value === undefined || value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (value instanceof Date) return yamlQuote(value.toISOString());
  const raw = String(value);
  return yamlNeedsQuoting(raw) ? yamlQuote(raw) : raw;
}

function yamlValue(value: unknown, indent: string): string {
  if (isPlainObject(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) return `${indent}{}`;
    return entries
      .map(([k, v]) => {
        const key = yamlNeedsQuoting(k) ? yamlQuote(k) : k;
        if (isPlainObject(v) || Array.isArray(v)) {
          return `${indent}${key}:\n${yamlValue(v, indent + '  ')}`;
        }
        return `${indent}${key}: ${yamlScalar(v)}`;
      })
      .join('\n');
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return `${indent}[]`;
    return value
      .map((item) => {
        if (isPlainObject(item) || Array.isArray(item)) {
          const nested = yamlValue(item, indent + '  ');
          return `${indent}-\n${nested}`;
        }
        return `${indent}- ${yamlScalar(item)}`;
      })
      .join('\n');
  }
  return `${indent}${yamlScalar(value)}`;
}

function toYaml(rows: ReadonlyArray<Record<string, unknown>>): string {
  if (rows.length === 0) return '[]\n';
  const lines = rows.map((row) => {
    const entries = Object.entries(row);
    if (entries.length === 0) return '- {}';
    return entries
      .map(([k, v], i) => {
        const key = yamlNeedsQuoting(k) ? yamlQuote(k) : k;
        const prefix = i === 0 ? '- ' : '  ';
        if (isPlainObject(v) || Array.isArray(v)) {
          return `${prefix}${key}:\n${yamlValue(v, '    ')}`;
        }
        return `${prefix}${key}: ${yamlScalar(v)}`;
      })
      .join('\n');
  });
  return lines.join('\n') + '\n';
}

// ---------------------------------------------------------------- toml

function tomlKey(key: string): string {
  return isBareTomlKey(key) ? key : `"${key.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function tomlScalar(value: unknown): string {
  if (value === undefined || value === null) return '""';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (value instanceof Date) return `"${value.toISOString()}"`;
  if (Array.isArray(value)) {
    return `[${value.map((v) => (isPlainObject(v) ? tomlInlineTable(v) : tomlScalar(v))).join(', ')}]`;
  }
  if (isPlainObject(value)) return tomlInlineTable(value);
  const raw = String(value);
  const escaped = raw.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
  return `"${escaped}"`;
}

function tomlInlineTable(obj: Record<string, unknown>): string {
  const entries = Object.entries(obj).map(([k, v]) => `${tomlKey(k)} = ${tomlScalar(v)}`);
  return `{ ${entries.join(', ')} }`;
}

function toToml(rows: ReadonlyArray<Record<string, unknown>>, table: string): string {
  if (rows.length === 0) return '';
  const blocks = rows.map((row) => {
    const lines = [`[[${table}]]`];
    for (const [k, v] of Object.entries(row)) {
      lines.push(`${tomlKey(k)} = ${tomlScalar(v)}`);
    }
    return lines.join('\n');
  });
  return blocks.join('\n\n') + '\n';
}

// ---------------------------------------------------------------- xml

function xmlEscape(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function xmlValue(value: unknown, elementName: string, indent: string): string {
  if (value === undefined || value === null) {
    return `${indent}<${elementName}/>`;
  }
  if (isPlainObject(value)) {
    const inner = Object.entries(value)
      .map(([k, v]) => {
        if (!isValidXmlName(k)) throw new Error(`Invalid XML element name: ${k}`);
        return xmlValue(v, k, indent + '  ');
      })
      .join('\n');
    return `${indent}<${elementName}>\n${inner}\n${indent}</${elementName}>`;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return `${indent}<${elementName}/>`;
    return value.map((item) => xmlValue(item, elementName, indent)).join('\n');
  }
  return `${indent}<${elementName}>${xmlEscape(scalarToString(value))}</${elementName}>`;
}

function toXml(rows: ReadonlyArray<Record<string, unknown>>, table: string): string {
  if (!isValidXmlName(table)) throw new Error(`Invalid XML root element name: ${table}`);
  const columns = unionColumns(rows);
  for (const c of columns) {
    if (!isValidXmlName(c)) throw new Error(`Invalid XML element name for column: ${c}`);
  }
  const rootName = isValidXmlName(`${table}s`) ? `${table}s` : `${table}_list`;
  const itemName = table;
  const items = rows
    .map((row) => {
      const fields = Object.entries(row)
        .map(([k, v]) => xmlValue(v, k, '    '))
        .join('\n');
      return `  <${itemName}>\n${fields}\n  </${itemName}>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<${rootName}>\n${items}\n</${rootName}>\n`;
}

// ---------------------------------------------------------------- csv / tsv

function delimitedEscape(raw: string, delimiter: string): string {
  const needsQuoting = raw.includes(delimiter) || raw.includes('"') || raw.includes('\n') || raw.includes('\r');
  if (!needsQuoting) return raw;
  return `"${raw.replace(/"/g, '""')}"`;
}

function toDelimited(rows: ReadonlyArray<Record<string, unknown>>, delimiter: string): string {
  const columns = unionColumns(rows);
  const header = columns.map((c) => delimitedEscape(c, delimiter)).join(delimiter);
  const lines = rows.map((row) =>
    columns.map((c) => delimitedEscape(scalarToString(row[c]), delimiter)).join(delimiter),
  );
  return [header, ...lines].join('\r\n') + (rows.length > 0 ? '\r\n' : '');
}

// ---------------------------------------------------------------- markdown

function markdownEscapeCell(raw: string): string {
  return raw.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

function toMarkdown(rows: ReadonlyArray<Record<string, unknown>>): string {
  const columns = unionColumns(rows);
  if (columns.length === 0) return '';
  const header = `| ${columns.map((c) => markdownEscapeCell(c)).join(' | ')} |`;
  const divider = `| ${columns.map(() => '---').join(' | ')} |`;
  const lines = rows.map(
    (row) => `| ${columns.map((c) => markdownEscapeCell(scalarToString(row[c]))).join(' | ')} |`,
  );
  return [header, divider, ...lines].join('\n') + '\n';
}

// ---------------------------------------------------------------- html

function htmlEscape(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toHtml(rows: ReadonlyArray<Record<string, unknown>>): string {
  const columns = unionColumns(rows);
  const head = `    <tr>${columns.map((c) => `<th>${htmlEscape(c)}</th>`).join('')}</tr>`;
  const body = rows
    .map(
      (row) =>
        `    <tr>${columns.map((c) => `<td>${htmlEscape(scalarToString(row[c]))}</td>`).join('')}</tr>`,
    )
    .join('\n');
  return `<table>\n  <thead>\n${head}\n  </thead>\n  <tbody>\n${body}\n  </tbody>\n</table>\n`;
}

// ---------------------------------------------------------------- sql

function sqlEscapeLiteral(raw: string): string {
  return raw.replace(/'/g, "''");
}

function sqlLiteral(value: unknown): string {
  if (value === undefined || value === null) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : 'NULL';
  }
  if (value instanceof Date) return `'${sqlEscapeLiteral(value.toISOString())}'`;
  const raw = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return `'${sqlEscapeLiteral(raw)}'`;
}

function toSql(rows: ReadonlyArray<Record<string, unknown>>, table: string): string {
  if (!isPlainSqlIdentifier(table)) {
    throw new Error(`Invalid SQL table identifier: ${table}`);
  }
  const columns = unionColumns(rows);
  for (const c of columns) {
    if (!isPlainSqlIdentifier(c)) {
      throw new Error(`Invalid SQL column identifier: ${c}`);
    }
  }
  const comment =
    '-- Generated export for human review. These are literal INSERT statements,\n' +
    '-- not a substitute for a parameterised query in application code.';
  if (columns.length === 0 || rows.length === 0) {
    return `${comment}\n`;
  }
  const columnList = columns.join(', ');
  const statements = rows.map((row) => {
    const values = columns.map((c) => sqlLiteral(row[c])).join(', ');
    return `INSERT INTO ${table} (${columnList}) VALUES (${values});`;
  });
  return [comment, ...statements].join('\n') + '\n';
}

// ---------------------------------------------------------------- filename

const EXTENSION_BY_FORMAT: Record<ExportFormat, string> = {
  json: 'json',
  jsonl: 'jsonl',
  yaml: 'yaml',
  toml: 'toml',
  xml: 'xml',
  csv: 'csv',
  tsv: 'tsv',
  markdown: 'md',
  html: 'html',
  sql: 'sql',
};

export function exportFilename(base: string, format: ExportFormat, range?: string): string {
  if (base.includes('/') || base.includes('\\')) {
    throw new Error(`Export base name must not contain a path separator: ${base}`);
  }
  const trimmed = base.trim();
  if (trimmed === '') {
    throw new Error('Export base name must not be empty.');
  }
  const suffix = range ? `-${range}` : '';
  return `${trimmed}${suffix}.${EXTENSION_BY_FORMAT[format]}`;
}

// ---------------------------------------------------------------- ZIP adapter

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value: number): number[] { return [value & 0xff, (value >>> 8) & 0xff]; }
function u32(value: number): number[] { return [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff]; }

/**
 * Keeps archive paths relative, portable, and collision-free at both write and read
 * boundaries. ZIP readers disagree about path separators, so a backslash is never
 * accepted as a path separator from an untrusted archive.
 */
function archiveEntryName(name: string, names: ReadonlySet<string>): string {
  const normalizedName = name.normalize("NFC");
  const parts = normalizedName.split("/");
  if (
    normalizedName.length === 0
    || normalizedName.includes("\\")
    || !/^[a-zA-Z0-9._/-]+$/u.test(normalizedName)
    || normalizedName.startsWith("/")
    || parts.some((part) => part === "" || part === "." || part === "..")
    || names.has(normalizedName.toLowerCase())
  ) {
    throw new Error(`Unsafe or duplicate archive entry name: ${name}`);
  }
  return normalizedName;
}

/** Creates a validated, store-mode ZIP. The source bytes remain unchanged. */
export function createZipArchive(entries: ReadonlyArray<{ name: string; text: string }>): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: number[][] = [];
  const central: number[][] = [];
  const names = new Set<string>();
  let offset = 0;
  for (const entry of entries) {
    const normalizedName = archiveEntryName(entry.name, names);
    names.add(normalizedName.toLowerCase());
    const name = encoder.encode(normalizedName);
    const data = encoder.encode(entry.text);
    const crc = crc32(data);
    const local = [0x50, 0x4b, 0x03, 0x04, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), 0, 0, ...name, ...data];
    chunks.push(local);
    central.push([
      0x50, 0x4b, 0x01, 0x02,
      ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
      ...u32(crc), ...u32(data.length), ...u32(data.length),
      ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset), ...name,
    ]);
    offset += local.length;
  }
  const body = chunks.flat();
  const centralStart = body.length;
  const centralBytes = central.flat();
  const end = [0x50, 0x4b, 0x05, 0x06, 0, 0, 0, 0, ...u16(entries.length), ...u16(entries.length), ...u32(centralBytes.length), ...u32(centralStart), 0, 0];
  const output = new Uint8Array(body.length + centralBytes.length + end.length);
  output.set(body, 0); output.set(centralBytes, body.length); output.set(end, body.length + centralBytes.length);
  return output;
}

export function validateZipArchive(bytes: Uint8Array): { ok: true; entries: number } | { ok: false; reason: string } {
  if (bytes.length < 22) return { ok: false, reason: 'ZIP is shorter than its end record.' };
  const read16 = (offset: number) => bytes[offset] | (bytes[offset + 1] << 8);
  const read32 = (offset: number) => (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
  let end = -1;
  for (let offset = bytes.length - 22; offset >= 0; offset -= 1) {
    if (read32(offset) === 0x06054b50) { end = offset; break; }
  }
  if (end < 0) return { ok: false, reason: 'ZIP end record is missing.' };
  const count = read16(end + 10);
  const centralSize = read32(end + 12);
  const centralOffset = read32(end + 16);
  if (centralOffset + centralSize !== end) return { ok: false, reason: 'ZIP central-directory bounds do not meet the end record.' };
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const names = new Set<string>();
  let cursor = centralOffset;
  for (let index = 0; index < count; index += 1) {
    if (read32(cursor) !== 0x02014b50) return { ok: false, reason: 'ZIP central-directory signature is invalid.' };
    const method = read16(cursor + 10);
    const crc = read32(cursor + 16);
    const compressedSize = read32(cursor + 20);
    const uncompressedSize = read32(cursor + 24);
    const nameLength = read16(cursor + 28);
    const extraLength = read16(cursor + 30);
    const commentLength = read16(cursor + 32);
    const localOffset = read32(cursor + 42);
    const nameStart = cursor + 46;
    const localNameLength = read16(localOffset + 26);
    const localExtraLength = read16(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const centralNameBytes = bytes.slice(nameStart, nameStart + nameLength);
    const localNameBytes = bytes.slice(localOffset + 30, localOffset + 30 + localNameLength);
    const centralName = decoder.decode(centralNameBytes);
    const localName = decoder.decode(localNameBytes);
    const namesEqual = centralNameBytes.length === localNameBytes.length && centralNameBytes.every((value, byteIndex) => value === localNameBytes[byteIndex]);
    if (method !== 0 || compressedSize !== uncompressedSize || read32(localOffset) !== 0x04034b50 || dataStart + compressedSize > centralOffset || nameLength !== localNameLength || !namesEqual || centralName !== localName || crc32(bytes.slice(dataStart, dataStart + compressedSize)) !== crc) {
      return { ok: false, reason: 'ZIP entry structure, offset, size, or CRC validation failed.' };
    }
    try {
      archiveEntryName(centralName, names);
      names.add(centralName.toLowerCase());
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : 'ZIP entry name is unsafe.' };
    }
    if (nameStart + nameLength + extraLength + commentLength > centralOffset + centralSize) return { ok: false, reason: 'ZIP central-directory entry exceeds its declared bounds.' };
    cursor = nameStart + nameLength + extraLength + commentLength;
  }
  if (cursor !== centralOffset + centralSize) return { ok: false, reason: 'ZIP central-directory size does not match its entries.' };
  return { ok: true, entries: count };
}

/** Reads every validated store-mode ZIP entry back through a separate reader pass. */
export function reopenZipArchive(bytes: Uint8Array): Array<{ name: string; text: string }> {
  const validation = validateZipArchive(bytes);
  if (!validation.ok) throw new Error(validation.reason);
  const read16 = (offset: number) => bytes[offset] | (bytes[offset + 1] << 8);
  const read32 = (offset: number) => (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
  let end = -1;
  for (let offset = bytes.length - 22; offset >= 0; offset -= 1) {
    if (read32(offset) === 0x06054b50) { end = offset; break; }
  }
  if (end < 0) throw new Error('ZIP end record is missing during reopen.');
  const count = read16(end + 10);
  const centralOffset = read32(end + 16);
  let cursor = centralOffset;
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const entries: Array<{ name: string; text: string }> = [];
  for (let index = 0; index < count; index += 1) {
    const nameLength = read16(cursor + 28);
    const extraLength = read16(cursor + 30);
    const localOffset = read32(cursor + 42);
    const name = decoder.decode(bytes.slice(cursor + 46, cursor + 46 + nameLength));
    const localNameLength = read16(localOffset + 26);
    const localExtraLength = read16(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const size = read32(cursor + 20);
    entries.push({ name, text: decoder.decode(bytes.slice(dataStart, dataStart + size)) });
    cursor += 46 + nameLength + extraLength + read16(cursor + 32);
  }
  return entries;
}
