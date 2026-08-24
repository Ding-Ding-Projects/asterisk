export type FreePbxExportFormat = 'json' | 'jsonl' | 'yaml' | 'toml' | 'xml' | 'csv' | 'tsv' | 'markdown' | 'html';

export interface FreePbxExportRecord {
  recordType: 'module' | 'exclusion';
  moduleId: string;
  label: string;
  catalog: unknown;
  runtime: unknown;
  history: unknown;
}

export interface FreePbxExportResult {
  format: FreePbxExportFormat;
  contentType: string;
  filename: string;
  body: string;
  omitted: string[];
}

const FIELDS = ['recordType', 'moduleId', 'label', 'catalog', 'runtime', 'history'] as const;

function safe(value: unknown): string {
  return JSON.stringify(value) ?? 'null';
}

function csvCell(value: unknown): string {
  const text = typeof value === 'string' ? value : safe(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function yaml(value: unknown, indent = 0): string {
  const pad = ' '.repeat(indent);
  if (value === null || typeof value !== 'object') return `${value === null ? 'null' : JSON.stringify(value)}\n`;
  if (Array.isArray(value)) return value.map((item) => `${pad}- ${yaml(item, indent + 2).trimStart()}`).join('') + (value.length ? '' : '\n');
  return Object.entries(value as Record<string, unknown>).map(([key, item]) => {
    if (item && typeof item === 'object') return `${pad}${key}:\n${yaml(item, indent + 2)}`;
    return `${pad}${key}: ${item === null ? 'null' : JSON.stringify(item)}\n`;
  }).join('');
}

function toml(records: FreePbxExportRecord[]): string {
  return records.map((record, index) => [
    `[[records]]`,
    `index = ${index}`,
    `recordType = ${JSON.stringify(record.recordType)}`,
    `moduleId = ${JSON.stringify(record.moduleId)}`,
    `label = ${JSON.stringify(record.label)}`,
    `catalog = ${JSON.stringify(safe(record.catalog))}`,
    `runtime = ${JSON.stringify(safe(record.runtime))}`,
    `history = ${JSON.stringify(safe(record.history))}`,
    '',
  ].join('\n')).join('');
}

function xml(records: FreePbxExportRecord[]): string {
  const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<freepbxCatalog schemaVersion="1" omitted="credentials,private paths">\n${records.map((record) => `  <record type="${escape(record.recordType)}" moduleId="${escape(record.moduleId)}"><label>${escape(record.label)}</label><catalog>${escape(safe(record.catalog))}</catalog><runtime>${escape(safe(record.runtime))}</runtime><history>${escape(safe(record.history))}</history></record>`).join('\n')}\n</freepbxCatalog>\n`;
}

function htmlEscape(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

export function exportFreePbxCatalog(records: ReadonlyArray<FreePbxExportRecord>, format: FreePbxExportFormat): FreePbxExportResult {
  const bounded = records.slice(0, 2_000).map((record) => ({ ...record }));
  const omitted = ['OS credential values, access tokens, passwords, private paths, and raw command payloads are omitted.'];
  if (records.length > bounded.length) omitted.push(`Records beyond the bounded export limit of ${bounded.length} were omitted.`);
  const plain = bounded as FreePbxExportRecord[];
  const json = JSON.stringify({ schemaVersion: 1, records: plain, omitted }, null, 2) + '\n';
  if (format === 'json') return { format, contentType: 'application/json', filename: 'freepbx-module-catalog.json', body: json, omitted };
  if (format === 'jsonl') return { format, contentType: 'application/x-ndjson', filename: 'freepbx-module-catalog.jsonl', body: plain.map(safe).join('\n') + (plain.length ? '\n' : ''), omitted };
  if (format === 'yaml') return { format, contentType: 'application/yaml', filename: 'freepbx-module-catalog.yaml', body: `schemaVersion: 1\nomitted:\n  - ${JSON.stringify(omitted[0])}\nrecords:\n${yaml(plain, 2)}`, omitted };
  if (format === 'toml') return { format, contentType: 'application/toml', filename: 'freepbx-module-catalog.toml', body: `schemaVersion = 1\nomitted = ${JSON.stringify(omitted.join(' '))}\n\n${toml(plain)}`, omitted };
  if (format === 'xml') return { format, contentType: 'application/xml', filename: 'freepbx-module-catalog.xml', body: xml(plain), omitted };
  if (format === 'csv' || format === 'tsv') {
    const delimiter = format === 'csv' ? ',' : '\t';
    return { format, contentType: format === 'csv' ? 'text/csv' : 'text/tab-separated-values', filename: `freepbx-module-catalog.${format}`, body: `${FIELDS.join(delimiter)}\n${plain.map((record) => FIELDS.map((field) => format === 'csv' ? csvCell(record[field]) : String(record[field] ?? '').replaceAll('\t', ' ')).join(delimiter)).join('\n')}\n`, omitted };
  }
  if (format === 'markdown') return { format, contentType: 'text/markdown', filename: 'freepbx-module-catalog.md', body: `# FreePBX module catalog export\n\nOmitted: ${omitted.join(' ')}\n\n| Record | Module | Label | Runtime | History |\n| --- | --- | --- | --- | --- |\n${plain.map((record) => `| ${record.recordType} | ${record.moduleId} | ${record.label.replaceAll('|', '\\|')} | ${safe(record.runtime).replaceAll('|', '\\|')} | ${safe(record.history).replaceAll('|', '\\|')} |`).join('\n')}\n`, omitted };
  return { format, contentType: 'text/html', filename: 'freepbx-module-catalog.html', body: `<!doctype html><meta charset="utf-8"><title>FreePBX module catalog export</title><p>Omitted: ${htmlEscape(omitted.join(' '))}</p><table><thead><tr>${FIELDS.map((field) => `<th>${field}</th>`).join('')}</tr></thead><tbody>${plain.map((record) => `<tr>${FIELDS.map((field) => `<td>${htmlEscape(safe(record[field]))}</td>`).join('')}</tr>`).join('')}</tbody></table>\n`, omitted };
}
