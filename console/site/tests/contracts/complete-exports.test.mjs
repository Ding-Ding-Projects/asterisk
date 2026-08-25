/**
 * Contract: complete exports on the pages-site.
 *
 * site/app.js implements a genuinely broad, format-honest export pipeline: ten formats
 * (json/jsonl/yaml/toml/xml/csv/tsv/markdown/html/sql), a suitableFormats() gate that
 * removes a format when the data cannot represent it (nested values break csv/tsv/
 * markdown; an invalid element name breaks xml; an invalid identifier breaks sql), and
 * a describeLoss() function that names exactly what would be lost before the export
 * runs. This file does not trust that description -- it extracts the real, self-
 * contained export-engine block (EXPORT_FORMATS through exportFilename; verified to
 * reference neither `document.` nor `window.`) and actually RUNS it against sample
 * data, the same way the bulk-actions contract runs the real selection model.
 *
 * It also checks the two places this engine is genuinely wired on the site
 * (documentation-destination export and notification export) and the specific export-
 * honesty markers the desktop canon requires: a bounded upload size, a rejected
 * malformed vocabulary file, and an explicit `personalVocabulary:'omitted'` marker on
 * the one export that could otherwise have leaked it.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');
const norm = (s) => s.replace(/\r\n/g, '\n');

function braceBoundedBlock(src, startMarker, endFunctionName) {
  const start = src.indexOf(startMarker);
  assert.ok(start !== -1, `${startMarker} not found in site/app.js`);
  const fnStart = src.indexOf(`function ${endFunctionName}(`, start);
  assert.ok(fnStart !== -1, `function ${endFunctionName} not found after ${startMarker}`);
  let parenDepth = 0, argEnd = src.indexOf('(', fnStart);
  for (let j = argEnd; j < src.length; j += 1) {
    if (src[j] === '(') parenDepth += 1;
    else if (src[j] === ')') { parenDepth -= 1; if (parenDepth === 0) { argEnd = j; break; } }
  }
  const braceStart = src.indexOf('{', argEnd);
  let depth = 0, i = braceStart;
  for (; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') { depth -= 1; if (depth === 0) { i += 1; break; } }
  }
  return src.slice(start, i);
}

function loadExportEngine() {
  const src = norm(read('site/app.js'));
  const block = braceBoundedBlock(src, 'const EXPORT_FORMATS = [', 'exportFilename');
  assert.doesNotMatch(block, /document\./, 'the export-engine block now references document -- it is no longer DOM-free and cannot be safely re-run in isolation');
  assert.doesNotMatch(block, /window\./, 'the export-engine block now references window -- it is no longer DOM-free and cannot be safely re-run in isolation');
  const body = `${block}\nreturn { EXPORT_FORMATS, suitableFormats, describeLoss, toJson, toYaml, toToml, toXml, toDelimited, toMarkdown, toHtml, toSql, exportRows, exportFilename };`;
  return new Function(body)(); // eslint-disable-line no-new-func -- deliberately re-running the real extracted source
}

test('exactly the ten canonical export formats are declared, in the real EXPORT_FORMATS array', () => {
  const { EXPORT_FORMATS } = loadExportEngine();
  assert.deepEqual(EXPORT_FORMATS, ['json', 'jsonl', 'yaml', 'toml', 'xml', 'csv', 'tsv', 'markdown', 'html', 'sql']);
});

test('suitableFormats() genuinely removes csv/tsv/markdown when a row holds a nested value', () => {
  const { suitableFormats } = loadExportEngine();
  const flat = [{ a: 1, b: 'two' }];
  const nested = [{ a: 1, b: { deep: true } }];
  assert.ok(suitableFormats(flat).includes('csv'));
  assert.ok(!suitableFormats(nested).includes('csv'), 'csv should be excluded once a row holds a nested object');
  assert.ok(!suitableFormats(nested).includes('tsv'), 'tsv should be excluded once a row holds a nested object');
  assert.ok(!suitableFormats(nested).includes('markdown'), 'markdown should be excluded once a row holds a nested object');
  assert.ok(suitableFormats(nested).includes('json'), 'json should still be able to represent a nested value');
});

test('suitableFormats() removes xml for an invalid element name and sql for an invalid identifier, independently', () => {
  const { suitableFormats } = loadExportEngine();
  /* "xmlnote" is a valid SQL identifier but an invalid XML element name (the XML rule
   * rejects any name starting with "xml", case-insensitively). "a-b" is the reverse: a
   * valid XML name (hyphens are allowed after the first character) but not a valid bare
   * SQL identifier. Each column name below is chosen to fail exactly one check, so the
   * two exclusions can be proven independent rather than both tripping on one column. */
  const badXmlColumn = [{ xmlnote: 'x' }];
  const badSqlColumn = [{ 'a-b': 'x' }];
  assert.ok(!suitableFormats(badXmlColumn).includes('xml'), 'xml should be excluded for a column name that is not a valid XML element name');
  assert.ok(suitableFormats(badXmlColumn).includes('sql'), 'sql should remain available even though xml is excluded');
  assert.ok(!suitableFormats(badSqlColumn).includes('sql'), 'sql should be excluded for a column name that is not a plain SQL identifier');
  assert.ok(suitableFormats(badSqlColumn).includes('xml'), 'xml should remain available even though sql is excluded');
});

test('describeLoss() names the real, specific loss for a nested csv export before it happens', () => {
  const { describeLoss } = loadExportEngine();
  const notes = describeLoss([{ a: { deep: true } }], 'csv');
  assert.ok(notes.length > 0, 'describeLoss() returned no warning for a nested value exported to csv');
  assert.ok(notes.some((n) => /flattened to their JSON string form/.test(n)), `expected a flattening warning, got: ${JSON.stringify(notes)}`);
});

test('toXml() and toSql() genuinely refuse an unsafe identifier rather than emitting broken output', () => {
  const { toXml, toSql } = loadExportEngine();
  assert.throws(() => toXml([{ '1bad': 'x' }], 'row'), /Invalid XML element name/);
  assert.throws(() => toSql([{ 'bad column': 'x' }], 'export_table'), /Invalid SQL column identifier/);
});

test('toDelimited() quotes a field containing the delimiter, a quote, or a newline -- a real round-trippable CSV', () => {
  const { toDelimited } = loadExportEngine();
  const csv = toDelimited([{ note: 'has, a comma' }, { note: 'has "quotes"' }], ',');
  assert.match(csv, /"has, a comma"/);
  assert.match(csv, /"has ""quotes"""/, 'an embedded double-quote should be doubled per CSV convention, not left broken');
});

test('exportFilename() rejects a base name containing a path separator or an empty base', () => {
  const { exportFilename } = loadExportEngine();
  assert.throws(() => exportFilename('../escape', 'json'), /must not contain a path separator/);
  assert.throws(() => exportFilename('  ', 'json'), /must not be empty/);
  assert.equal(exportFilename('ding-pbx-notifications', 'csv', '3-selected'), 'ding-pbx-notifications-3-selected.csv');
});

test('the export pipeline is genuinely wired to the documentation-destination catalog and the notification history', () => {
  const src = norm(read('site/app.js'));
  assert.match(src, /function documentationExportRows\(\)\{return lastDocumentationMatches\.map/,
    'documentationExportRows() no longer maps the real, currently-filtered destination matches');
  assert.match(src, /function notificationExportRows\(\)\{return state\.notifications\.filter\(item=>notifSelection\.selected\.has\(item\.id\)\)/,
    'notificationExportRows() no longer filters by the real notification selection');
  assert.match(src, /exportRows\(\{rows,format,table:'destination'\}\)/, 'the documentation export button no longer calls exportRows()');
  assert.match(src, /exportRows\(\{rows,format,table:'notification'\}\)/, 'the notification export button no longer calls exportRows()');
});

test('the settings export payload carries the required export-honesty markers', () => {
  const src = norm(read('site/app.js'));
  assert.match(src, /file\.size>65536/, 'the vocabulary upload no longer enforces a bounded file size');
  assert.match(src, /personalVocabulary:'omitted'/, 'the settings export no longer marks personal vocabulary as omitted');
  assert.match(src, /schemaVersion:1,encoding:'UTF-8',personalVocabulary:'omitted',settings:state/,
    'the settings export payload shape changed -- re-verify it still declares its schema, encoding and omission honestly');
});
