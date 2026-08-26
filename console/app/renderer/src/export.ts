import {
  EXPORT_SCHEMA_VERSION,
  type ExportArtifact,
  type ExportDisclosure,
  type ExportFormat,
  type ExportRow,
  type ExportValue,
} from '../../../shared/export';

export type { ExportArtifact, ExportFormat, ExportRow, ExportValue } from '../../../shared/export';

export interface ExportRequest {
  rows: ReadonlyArray<Record<string, unknown>>;
  format: ExportFormat;
  filenameBase: string;
  tableName?: string;
}

export interface ExportIssue {
  path: string;
  reason: string;
}

export type ExportFormatAssessment =
  | { status: 'available'; format: ExportFormat; disclosures: ReadonlyArray<ExportDisclosure> }
  | { status: 'unavailable'; format: ExportFormat; reason: string; issues: ReadonlyArray<ExportIssue> };

export type ExportPreparationResult =
  | { status: 'ready'; artifact: ExportArtifact }
  | { status: 'unavailable'; assessment: Extract<ExportFormatAssessment, { status: 'unavailable' }> };

interface FormatDefinition {
  extension: string;
  mediaType: string;
  lineEnding: 'lf' | 'crlf';
}

const FORMAT_DEFINITIONS: Readonly<Record<ExportFormat, FormatDefinition>> = {
  json: { extension: 'json', mediaType: 'application/json', lineEnding: 'lf' },
  jsonl: { extension: 'jsonl', mediaType: 'application/x-ndjson', lineEnding: 'lf' },
  yaml: { extension: 'yaml', mediaType: 'application/yaml', lineEnding: 'lf' },
  toml: { extension: 'toml', mediaType: 'application/toml', lineEnding: 'lf' },
  xml: { extension: 'xml', mediaType: 'application/xml', lineEnding: 'lf' },
  csv: { extension: 'csv', mediaType: 'text/csv', lineEnding: 'crlf' },
  tsv: { extension: 'tsv', mediaType: 'text/tab-separated-values', lineEnding: 'crlf' },
  markdown: { extension: 'md', mediaType: 'text/markdown', lineEnding: 'lf' },
  html: { extension: 'html', mediaType: 'text/html', lineEnding: 'lf' },
  sql: { extension: 'sql', mediaType: 'application/sql', lineEnding: 'lf' },
  typescript: { extension: 'ts', mediaType: 'text/typescript', lineEnding: 'lf' },
  javascript: { extension: 'js', mediaType: 'text/javascript', lineEnding: 'lf' },
  python: { extension: 'py', mediaType: 'text/x-python', lineEnding: 'lf' },
};

const ALL_FORMATS = Object.freeze(Object.keys(FORMAT_DEFINITIONS) as ExportFormat[]);
const MAX_DEPTH = 32;
const MAX_VALUES = 100_000;

export const ARCHIVE_EXPORT_CAPABILITY = Object.freeze({
  status: 'unavailable' as const,
  reason: 'Archive export and encryption are unavailable because no bundled, verified ZIP or 7z adapter is registered.',
});

interface NormalizedRows {
  rows: ReadonlyArray<ExportRow>;
  issues: ReadonlyArray<ExportIssue>;
}

function normalizeRows(input: ReadonlyArray<Record<string, unknown>>): NormalizedRows {
  const issues: ExportIssue[] = [];
  const seen = new WeakSet<object>();
  let valueCount = 0;

  function visit(value: unknown, path: string, depth: number): ExportValue | undefined {
    valueCount += 1;
    if (valueCount > MAX_VALUES) {
      issues.push({ path, reason: `The export exceeds the ${MAX_VALUES.toLocaleString()} value limit.` });
      return undefined;
    }
    if (depth > MAX_DEPTH) {
      issues.push({ path, reason: `The export exceeds the maximum nesting depth of ${MAX_DEPTH}.` });
      return undefined;
    }
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        issues.push({ path, reason: 'Non-finite numbers cannot be exported faithfully.' });
        return undefined;
      }
      if (Object.is(value, -0)) {
        issues.push({ path, reason: 'Negative zero cannot be preserved by every advertised format.' });
        return undefined;
      }
      return value;
    }
    if (typeof value !== 'object') {
      issues.push({ path, reason: `${typeof value} values are outside the versioned export schema.` });
      return undefined;
    }
    if (seen.has(value)) {
      issues.push({ path, reason: 'Repeated object references and cycles are outside the tree-shaped export schema.' });
      return undefined;
    }
    seen.add(value);

    if (Array.isArray(value)) {
      const output: ExportValue[] = [];
      for (let index = 0; index < value.length; index += 1) {
        if (!(index in value)) {
          issues.push({ path: `${path}[${index}]`, reason: 'Sparse array slots cannot be exported faithfully.' });
          continue;
        }
        const nested = visit(value[index], `${path}[${index}]`, depth + 1);
        if (nested !== undefined) output.push(nested);
      }
      return output;
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      issues.push({ path, reason: 'Class instances, dates, maps, sets, and other non-plain objects need an explicit adapter.' });
      return undefined;
    }
    const output: Record<string, ExportValue> = Object.create(null) as Record<string, ExportValue>;
    for (const key of Object.keys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !('value' in descriptor)) {
        issues.push({ path: `${path}.${key}`, reason: 'Accessor properties are not evaluated during export.' });
        continue;
      }
      const nested = visit(descriptor.value, `${path}.${key}`, depth + 1);
      if (nested !== undefined) output[key] = nested;
    }
    return output;
  }

  const rows: ExportRow[] = [];
  input.forEach((row, index) => {
    const normalized = visit(row, `$[${index}]`, 0);
    if (normalized && !Array.isArray(normalized) && typeof normalized === 'object') {
      rows.push(normalized as ExportRow);
    } else if (normalized !== undefined) {
      issues.push({ path: `$[${index}]`, reason: 'Every exported row must be a plain object.' });
    }
  });
  return { rows, issues };
}

function walkValues(rows: ReadonlyArray<ExportRow>, callback: (value: ExportValue, path: string) => void): void {
  function walk(value: ExportValue, path: string): void {
    callback(value, path);
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, `${path}[${index}]`));
    } else if (value !== null && typeof value === 'object') {
      Object.entries(value).forEach(([key, item]) => walk(item, `${path}.${key}`));
    }
  }
  rows.forEach((row, index) => walk(row, `$[${index}]`));
}

function tomlIssues(rows: ReadonlyArray<ExportRow>): ExportIssue[] {
  const issues: ExportIssue[] = [];
  const kind = (value: ExportValue): string => value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value === 'object' ? 'object' : typeof value;
  walkValues(rows, (value, path) => {
    if (value === null) issues.push({ path, reason: 'TOML has no null value.' });
    if (Array.isArray(value) && value.length > 1 && value.some((item) => kind(item) !== kind(value[0]))) {
      issues.push({ path, reason: 'TOML arrays must contain one value type.' });
    }
  });
  return issues;
}

function sqlIssues(rows: ReadonlyArray<ExportRow>): ExportIssue[] {
  const issues: ExportIssue[] = [];
  rows.forEach((row, index) => {
    if (Object.keys(row).length === 0) {
      issues.push({ path: `$[${index}]`, reason: 'An empty row has no portable SQL INSERT representation.' });
    }
  });
  walkValues(rows, (value, path) => {
    if (Array.isArray(value) || (value !== null && typeof value === 'object')) {
      issues.push({ path, reason: 'Nested values need a target database schema and cannot be emitted as portable SQL.' });
    }
  });
  return issues;
}

const INVALID_XML_CHARACTER = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/;

function xmlIssues(rows: ReadonlyArray<ExportRow>): ExportIssue[] {
  const issues: ExportIssue[] = [];
  rows.forEach((row, rowIndex) => Object.keys(row).forEach((key) => {
    if (INVALID_XML_CHARACTER.test(key)) {
      issues.push({ path: `$[${rowIndex}].${key}`, reason: 'The field name contains a character XML 1.0 cannot represent.' });
    }
  }));
  walkValues(rows, (value, path) => {
    if (typeof value === 'string' && INVALID_XML_CHARACTER.test(value)) {
      issues.push({ path, reason: 'The string contains a character XML 1.0 cannot represent.' });
    }
  });
  return issues;
}

function formatDisclosures(format: ExportFormat): ExportDisclosure[] {
  const disclosures: ExportDisclosure[] = [{
    code: 'encoding',
    severity: 'information',
    message: `Content is UTF-8 and follows schema ${EXPORT_SCHEMA_VERSION}.`,
  }];
  if (format === 'csv' || format === 'tsv' || format === 'markdown' || format === 'html') {
    disclosures.push({
      code: 'canonical-json-cells',
      severity: 'information',
      message: 'Headers and populated table cells contain canonical JSON. An empty cell means that field was absent.',
    });
  }
  if (format === 'sql') {
    disclosures.push({
      code: 'sql-portability',
      severity: 'warning',
      message: 'The file contains portable INSERT statements only. Review target column types and constraints before running it.',
    });
  }
  if (format === 'typescript' || format === 'javascript' || format === 'python') {
    disclosures.push({
      code: 'source-data-only',
      severity: 'information',
      message: 'The source file contains data literals only and does not execute application behavior.',
    });
  }
  return disclosures;
}

export function assessExportFormat(rows: ReadonlyArray<Record<string, unknown>>, format: ExportFormat): ExportFormatAssessment {
  const normalized = normalizeRows(rows);
  if (normalized.issues.length > 0) {
    return {
      status: 'unavailable',
      format,
      reason: 'The dataset contains values outside the versioned export schema.',
      issues: normalized.issues,
    };
  }
  let issues: ExportIssue[] = [];
  if (format === 'toml') issues = tomlIssues(normalized.rows);
  if (format === 'sql') issues = sqlIssues(normalized.rows);
  if (format === 'xml') issues = xmlIssues(normalized.rows);
  return issues.length > 0
    ? { status: 'unavailable', format, reason: `${format.toUpperCase()} cannot preserve this dataset without loss.`, issues }
    : { status: 'available', format, disclosures: formatDisclosures(format) };
}

export function listExportFormats(rows: ReadonlyArray<Record<string, unknown>>): ReadonlyArray<ExportFormatAssessment> {
  return ALL_FORMATS.map((format) => assessExportFormat(rows, format));
}

function unionColumns(rows: ReadonlyArray<ExportRow>): string[] {
  const seen = new Set<string>();
  const columns: string[] = [];
  rows.forEach((row) => Object.keys(row).forEach((key) => {
    if (!seen.has(key)) {
      seen.add(key);
      columns.push(key);
    }
  }));
  return columns;
}

function canonicalJson(value: ExportValue | ReadonlyArray<ExportRow>, indent?: number): string {
  const encoded = JSON.stringify(value, null, indent);
  if (encoded === undefined) throw new Error('A value outside the export schema reached the JSON encoder.');
  return encoded;
}

function yamlScalar(value: null | boolean | number | string): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  return JSON.stringify(value);
}

function yamlValue(value: ExportValue, indent: number): string {
  const padding = ' '.repeat(indent);
  if (Array.isArray(value)) {
    if (value.length === 0) return `${padding}[]`;
    return value.map((item) => item !== null && typeof item === 'object'
      ? `${padding}-\n${yamlValue(item, indent + 2)}`
      : `${padding}- ${yamlScalar(item as null | boolean | number | string)}`).join('\n');
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) return `${padding}{}`;
    return entries.map(([key, item]) => item !== null && typeof item === 'object'
      ? `${padding}${JSON.stringify(key)}:\n${yamlValue(item, indent + 2)}`
      : `${padding}${JSON.stringify(key)}: ${yamlScalar(item)}`).join('\n');
  }
  return `${padding}${yamlScalar(value)}`;
}

function toYaml(rows: ReadonlyArray<ExportRow>): string {
  if (rows.length === 0) return '[]\n';
  return rows.map((row) => `-\n${yamlValue(row, 2)}`).join('\n') + '\n';
}

function tomlString(value: string): string {
  return JSON.stringify(value).replace(/\u007F/g, '\\u007F');
}

function tomlValue(value: ExportValue): string {
  if (value === null) throw new Error('TOML null reached the encoder after capability assessment.');
  if (typeof value === 'string') return tomlString(value);
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return `[${value.map(tomlValue).join(', ')}]`;
  return `{ ${Object.entries(value).map(([key, item]) => `${tomlString(key)} = ${tomlValue(item)}`).join(', ')} }`;
}

function toToml(rows: ReadonlyArray<ExportRow>): string {
  return `schema = ${tomlString(EXPORT_SCHEMA_VERSION)}\nrows = ${tomlValue(rows as ReadonlyArray<ExportValue>)}\n`;
}

function xmlEscape(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;').replace(/\r/g, '&#xD;');
}

function xmlAttributeEscape(value: string): string {
  return xmlEscape(value).replace(/\t/g, '&#x9;').replace(/\n/g, '&#xA;');
}

function xmlValue(value: ExportValue, indent: number): string {
  const padding = ' '.repeat(indent);
  if (value === null) return `${padding}<null/>`;
  if (typeof value === 'string') return `${padding}<string>${xmlEscape(value)}</string>`;
  if (typeof value === 'boolean') return `${padding}<boolean>${String(value)}</boolean>`;
  if (typeof value === 'number') return `${padding}<number>${String(value)}</number>`;
  if (Array.isArray(value)) {
    const items = value.map((item) => `${padding}  <item>\n${xmlValue(item, indent + 4)}\n${padding}  </item>`).join('\n');
    return `${padding}<array>\n${items}\n${padding}</array>`;
  }
  const fields = Object.entries(value).map(([key, item]) =>
    `${padding}  <field name="${xmlAttributeEscape(key)}">\n${xmlValue(item, indent + 4)}\n${padding}  </field>`).join('\n');
  return `${padding}<object>\n${fields}\n${padding}</object>`;
}

function toXml(rows: ReadonlyArray<ExportRow>): string {
  const items = rows.map((row) => `    <row>\n${xmlValue(row, 6)}\n    </row>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<export schema="${EXPORT_SCHEMA_VERSION}">\n  <rows>\n${items}\n  </rows>\n</export>\n`;
}

function delimitedEscape(value: string, delimiter: string): string {
  return !value.includes(delimiter) && !/["\r\n]/.test(value) ? value : `"${value.replace(/"/g, '""')}"`;
}

function canonicalCell(row: ExportRow, column: string): string {
  return Object.prototype.hasOwnProperty.call(row, column) ? canonicalJson(row[column]) : '';
}

function toDelimited(rows: ReadonlyArray<ExportRow>, delimiter: string): string {
  const columns = unionColumns(rows);
  if (columns.length === 0) return '';
  const header = columns.map((column) => delimitedEscape(canonicalJson(column), delimiter)).join(delimiter);
  const lines = rows.map((row) => columns.map((column) => delimitedEscape(canonicalCell(row, column), delimiter)).join(delimiter));
  return [header, ...lines].join('\r\n') + '\r\n';
}

function markdownEscape(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

function toMarkdown(rows: ReadonlyArray<ExportRow>): string {
  const columns = unionColumns(rows);
  if (columns.length === 0) return '';
  const header = `| ${columns.map((column) => markdownEscape(canonicalJson(column))).join(' | ')} |`;
  const divider = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${columns.map((column) => markdownEscape(canonicalCell(row, column))).join(' | ')} |`);
  return [header, divider, ...body].join('\n') + '\n';
}

function htmlEscape(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toHtml(rows: ReadonlyArray<ExportRow>): string {
  const columns = unionColumns(rows);
  const header = columns.map((column) => `<th scope="col">${htmlEscape(canonicalJson(column))}</th>`).join('');
  const body = rows.map((row) => `<tr>${columns.map((column) => `<td>${htmlEscape(canonicalCell(row, column))}</td>`).join('')}</tr>`).join('\n      ');
  return `<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <meta name="ding-export-schema" content="${EXPORT_SCHEMA_VERSION}">\n  <title>Exported data</title>\n</head>\n<body>\n  <table>\n    <thead><tr>${header}</tr></thead>\n    <tbody>\n      ${body}\n    </tbody>\n  </table>\n</body>\n</html>\n`;
}

function quoteSqlIdentifier(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function sqlValue(value: ExportValue): string {
  if (value === null) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
  throw new Error('Nested SQL value reached the encoder after capability assessment.');
}

function toSql(rows: ReadonlyArray<ExportRow>, tableName: string): string {
  const table = quoteSqlIdentifier(tableName);
  const statements = rows.map((row) => {
    const entries = Object.entries(row);
    return `INSERT INTO ${table} (${entries.map(([key]) => quoteSqlIdentifier(key)).join(', ')}) VALUES (${entries.map(([, value]) => sqlValue(value)).join(', ')});`;
  });
  return `-- UTF-8; schema ${EXPORT_SCHEMA_VERSION}\n-- Review target column types and constraints before running.\n${statements.join('\n')}\n`;
}

function pythonValue(value: ExportValue, indent: number): string {
  if (value === null) return 'None';
  if (typeof value === 'boolean') return value ? 'True' : 'False';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const padding = ' '.repeat(indent + 2);
    return `[\n${value.map((item) => `${padding}${pythonValue(item, indent + 2)},`).join('\n')}\n${' '.repeat(indent)}]`;
  }
  const entries = Object.entries(value);
  if (entries.length === 0) return '{}';
  const padding = ' '.repeat(indent + 2);
  return `{\n${entries.map(([key, item]) => `${padding}${JSON.stringify(key)}: ${pythonValue(item, indent + 2)},`).join('\n')}\n${' '.repeat(indent)}}`;
}

function encodeRows(rows: ReadonlyArray<ExportRow>, format: ExportFormat, tableName: string): string {
  switch (format) {
    case 'json': return `${canonicalJson(rows, 2)}\n`;
    case 'jsonl': return rows.map((row) => canonicalJson(row)).join('\n') + (rows.length > 0 ? '\n' : '');
    case 'yaml': return toYaml(rows);
    case 'toml': return toToml(rows);
    case 'xml': return toXml(rows);
    case 'csv': return toDelimited(rows, ',');
    case 'tsv': return toDelimited(rows, '\t');
    case 'markdown': return toMarkdown(rows);
    case 'html': return toHtml(rows);
    case 'sql': return toSql(rows, tableName);
    case 'typescript': return `// UTF-8; schema ${EXPORT_SCHEMA_VERSION}\nconst data = ${canonicalJson(rows, 2)} as const;\n\nexport default data;\n`;
    case 'javascript': return `// UTF-8; schema ${EXPORT_SCHEMA_VERSION}\nconst data = ${canonicalJson(rows, 2)};\n\nexport default data;\n`;
    case 'python': return `# UTF-8; schema ${EXPORT_SCHEMA_VERSION}\ndata = ${pythonValue(rows as ReadonlyArray<ExportValue>, 0)}\n`;
  }
}

function safeFilename(base: string, extension: string): string {
  const trimmed = base.trim();
  if (trimmed.length === 0) throw new Error('The export filename cannot be empty.');
  if (/[<>:"/\\|?*\u0000-\u001F]/.test(trimmed)) throw new Error('The export filename contains a reserved path character.');
  if (trimmed === '.' || trimmed === '..' || /[. ]$/.test(trimmed)) throw new Error('The export filename cannot end with a dot or space.');
  const stem = trimmed.replace(/\.[A-Za-z0-9]+$/, '');
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(stem)) throw new Error('The export filename is reserved by Windows.');
  return `${stem}.${extension}`;
}

export function prepareExport(request: ExportRequest): ExportPreparationResult {
  const assessment = assessExportFormat(request.rows, request.format);
  if (assessment.status === 'unavailable') return { status: 'unavailable', assessment };
  const normalized = normalizeRows(request.rows);
  const definition = FORMAT_DEFINITIONS[request.format];
  const tableName = request.tableName?.trim() || 'exported_rows';
  if (request.format === 'sql' && tableName.includes('\u0000')) {
    return {
      status: 'unavailable',
      assessment: {
        status: 'unavailable',
        format: 'sql',
        reason: 'SQL cannot preserve the requested table identifier.',
        issues: [{ path: '$.tableName', reason: 'SQL identifiers cannot contain a null character.' }],
      },
    };
  }
  let content: string;
  let filename: string;
  try {
    content = encodeRows(normalized.rows, request.format, tableName);
    filename = safeFilename(request.filenameBase, definition.extension);
  } catch (error) {
    return {
      status: 'unavailable',
      assessment: {
        status: 'unavailable',
        format: request.format,
        reason: 'The export request could not be prepared.',
        issues: [{ path: '$.request', reason: error instanceof Error ? error.message : String(error) }],
      },
    };
  }
  return {
    status: 'ready',
    artifact: {
      schemaVersion: EXPORT_SCHEMA_VERSION,
      format: request.format,
      filename,
      mediaType: `${definition.mediaType}; charset=utf-8`,
      encoding: 'utf-8',
      lineEnding: definition.lineEnding,
      content,
      byteLength: new TextEncoder().encode(content).byteLength,
      rowCount: normalized.rows.length,
      disclosures: assessment.disclosures,
    },
  };
}

/**
 * Canonical inventory compatibility entry point. The inventory records this
 * named export as the concrete row-export implementation, while callers that
 * need the richer result may use prepareExport directly.
 */
export function exportRows(request: ExportRequest): ExportPreparationResult {
  return prepareExport(request);
}
