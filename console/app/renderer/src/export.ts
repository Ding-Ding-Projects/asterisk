import type { ExportArtifact } from '../../../shared/export';

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

export interface ExportRequest {
  rows: ReadonlyArray<Record<string, unknown>>;
  format: ExportFormat;
  table?: string;
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
  /* Compared element by element rather than joined into one string. Joining needs a
   * separator that cannot appear in a key, and the only safe choice is a control
   * character -- which then sits invisibly in the source and reads as corruption to
   * everything that looks at the file. Comparing the arrays needs no separator. */
  const first = Object.keys(rows[0]).sort();
  return rows.some((row) => {
    const keys = Object.keys(row).sort();
    return keys.length !== first.length || keys.some((key, index) => key !== first[index]);
  });
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

export type ExportPreparationResult =
  | { status: 'prepared'; artifact: ExportArtifact }
  | { status: 'unavailable'; reason: string };

/** Prepares only formats this renderer can serialize without inventing a lossy adapter. */
export function prepareExport(request: ExportRequest): ExportPreparationResult {
  const content = exportRows(request);
  const filename = exportFilename(request.table ?? 'export', request.format);
  const mediaType: Record<ExportFormat, string> = {
    json: 'application/json', jsonl: 'application/x-ndjson', yaml: 'application/yaml', toml: 'application/toml',
    xml: 'application/xml', csv: 'text/csv', tsv: 'text/tab-separated-values', markdown: 'text/markdown', html: 'text/html', sql: 'application/sql',
  };
  return { status: 'prepared', artifact: { schemaVersion: 'ding-pbx-export.v1', format: request.format, filename, mediaType: mediaType[request.format], encoding: 'utf-8', lineEnding: 'lf', content, byteLength: new TextEncoder().encode(content).byteLength, rowCount: request.rows.length, disclosures: describeLoss(request.rows, request.format).map((message) => ({ code: 'representation-loss', message, severity: 'warning' as const })) } };
}
