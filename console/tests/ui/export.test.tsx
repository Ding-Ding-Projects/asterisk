import assert from 'node:assert/strict';
import test from 'node:test';

import {
  describeLoss,
  createZipArchive,
  exportFilename,
  exportRows,
  reopenZipArchive,
  suitableFormats,
  validateZipArchive,
} from '../../app/renderer/src/export.ts';
import type { ExportFormat } from '../../app/renderer/src/export.ts';

function replaceArchiveName(archive: Uint8Array, from: string, to: string): Uint8Array {
  assert.equal(Buffer.byteLength(from), Buffer.byteLength(to), 'tampered ZIP names must preserve record lengths');
  const output = archive.slice();
  const needle = Buffer.from(from, 'utf8');
  const replacement = Buffer.from(to, 'utf8');
  let replacements = 0;
  for (let offset = 0; offset <= output.length - needle.length; offset += 1) {
    if (needle.every((byte, index) => output[offset + index] === byte)) {
      output.set(replacement, offset);
      replacements += 1;
    }
  }
  assert.equal(replacements, 2, 'a store-mode ZIP must carry the name in its local and central records');
  return output;
}

// ---------------------------------------------------------------- json / jsonl

test('json exports an indented array of objects', () => {
  const out = exportRows({ rows: [{ a: 1, b: 'x' }, { a: 2, b: 'y' }], format: 'json' });
  const parsed = JSON.parse(out);
  assert.deepEqual(parsed, [{ a: 1, b: 'x' }, { a: 2, b: 'y' }]);
});

test('json renders undefined as null rather than dropping the key', () => {
  const out = exportRows({ rows: [{ a: 1, b: undefined }], format: 'json' });
  const parsed = JSON.parse(out);
  assert.equal(parsed[0].b, null);
});

test('jsonl has one object per line with no wrapping array', () => {
  const out = exportRows({ rows: [{ a: 1 }, { a: 2 }, { a: 3 }], format: 'jsonl' });
  const lines = out.split('\n');
  assert.equal(lines.length, 3);
  for (const line of lines) {
    assert.doesNotMatch(line.trim(), /^\[/);
    const parsed = JSON.parse(line);
    assert.equal(typeof parsed.a, 'number');
  }
  // no wrapping array anywhere
  assert.doesNotMatch(out.trim(), /^\[/);
  assert.doesNotMatch(out.trim(), /\]$/);
});

test('jsonl on an empty row set is an empty string', () => {
  const out = exportRows({ rows: [], format: 'jsonl' });
  assert.equal(out, '');
});

// ---------------------------------------------------------------- csv / tsv quoting traps

test('csv quotes a field containing the delimiter', () => {
  const out = exportRows({ rows: [{ name: 'Doe, Jane', age: 30 }], format: 'csv' });
  assert.match(out, /"Doe, Jane"/);
});

test('csv doubles an embedded quote', () => {
  const out = exportRows({ rows: [{ note: 'She said "hi"' }], format: 'csv' });
  assert.match(out, /"She said ""hi"""/);
});

test('csv quotes a field containing a newline', () => {
  const out = exportRows({ rows: [{ note: 'line one\nline two' }], format: 'csv' });
  assert.match(out, /"line one\nline two"/);
});

test('csv row with a comma value round-trips as exactly one field, not two', () => {
  const out = exportRows({ rows: [{ a: 'x,y', b: 'z' }], format: 'csv' });
  const dataLine = out.split('\r\n')[1];
  // A naive split on comma would produce 3 fields; the correct quoted field is 2.
  assert.equal(dataLine, '"x,y",z');
});

test('tsv quotes a field containing a tab', () => {
  const out = exportRows({ rows: [{ a: 'x\ty' }], format: 'tsv' });
  assert.match(out, /"x\ty"/);
});

test('csv/tsv use CRLF line endings and a header row', () => {
  const out = exportRows({ rows: [{ a: 1 }], format: 'csv' });
  assert.match(out, /^a\r\n1\r\n$/);
});

// ---------------------------------------------------------------- yaml ambiguity traps

test('yaml quotes the string "yes" so it is not read as boolean true', () => {
  const out = exportRows({ rows: [{ flag: 'yes' }], format: 'yaml' });
  assert.match(out, /flag: "yes"/);
});

test('yaml quotes the string "no", "on", and "off"', () => {
  for (const word of ['no', 'on', 'off']) {
    const out = exportRows({ rows: [{ flag: word }], format: 'yaml' });
    assert.match(out, new RegExp(`flag: "${word}"`));
  }
});

test('yaml quotes a numeric-looking string so it stays a string', () => {
  const out = exportRows({ rows: [{ version: '1.0' }], format: 'yaml' });
  assert.match(out, /version: "1\.0"/);
});

test('yaml quotes a date-looking string so it does not parse as a date', () => {
  const out = exportRows({ rows: [{ note: '2026-01-01' }], format: 'yaml' });
  assert.match(out, /note: "2026-01-01"/);
});

test('yaml leaves an ordinary string unquoted', () => {
  const out = exportRows({ rows: [{ name: 'hello' }], format: 'yaml' });
  assert.match(out, /name: hello\b/);
});

test('yaml renders a plain number unquoted', () => {
  const out = exportRows({ rows: [{ count: 5 }], format: 'yaml' });
  assert.match(out, /count: 5/);
});

// ---------------------------------------------------------------- xml

test('xml escapes ampersand, angle brackets, and quotes', () => {
  const out = exportRows({ rows: [{ note: 'A & B <tag> "q" \'s\'' }], format: 'xml' });
  assert.match(out, /A &amp; B &lt;tag&gt; &quot;q&quot; &apos;s&apos;/);
});

test('xml refuses an invalid element name rather than emitting unparseable output', () => {
  assert.throws(() => exportRows({ rows: [{ 'bad name!': 1 }], format: 'xml' }));
});

test('xml refuses a column name starting with "xml"', () => {
  assert.throws(() => exportRows({ rows: [{ xmlThing: 1 }], format: 'xml' }));
});

test('xml is well-formed for a valid row set', () => {
  const out = exportRows({ rows: [{ id: 1, name: 'a' }, { id: 2, name: 'b' }], format: 'xml', table: 'item' });
  assert.match(out, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(out, /<items>/);
  assert.match(out, /<item>/);
  assert.match(out, /<\/items>\n$/);
});

// ---------------------------------------------------------------- sql

test('sql escapes a single quote in a literal by doubling it', () => {
  const out = exportRows({ rows: [{ name: "O'Brien" }], format: 'sql', table: 'people' });
  assert.match(out, /'O''Brien'/);
});

test('sql refuses an invalid table identifier', () => {
  assert.throws(() => exportRows({ rows: [{ a: 1 }], format: 'sql', table: 'bad table!' }));
});

test('sql refuses an invalid column identifier', () => {
  assert.throws(() => exportRows({ rows: [{ 'bad col': 1 }], format: 'sql', table: 'ok_table' }));
});

test('sql never string-concatenates a value into the statement unescaped', () => {
  const out = exportRows({ rows: [{ name: "x'; DROP TABLE t; --" }], format: 'sql', table: 'people' });
  // the raw injection payload with an unescaped quote must not appear verbatim
  assert.doesNotMatch(out, /VALUES \('x'; DROP TABLE/);
  assert.match(out, /'x''; DROP TABLE t; --'/);
});

test('sql output carries a human-review comment, not a claim of parameterisation', () => {
  const out = exportRows({ rows: [{ a: 1 }], format: 'sql', table: 't' });
  assert.match(out, /--.*human review/i);
});

// ---------------------------------------------------------------- markdown

test('markdown escapes a pipe character in a cell', () => {
  const out = exportRows({ rows: [{ note: 'a | b' }], format: 'markdown' });
  assert.match(out, /a \\\| b/);
});

test('markdown emits a header and divider row', () => {
  const out = exportRows({ rows: [{ a: 1, b: 2 }], format: 'markdown' });
  const lines = out.trim().split('\n');
  assert.equal(lines[0], '| a | b |');
  assert.equal(lines[1], '| --- | --- |');
});

// ---------------------------------------------------------------- html

test('html escapes a tag so it cannot break out of its cell', () => {
  const out = exportRows({ rows: [{ note: '<script>alert(1)</script>' }], format: 'html' });
  assert.doesNotMatch(out, /<script>alert/);
  assert.match(out, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test('html emits a table with thead and tbody', () => {
  const out = exportRows({ rows: [{ a: 1 }], format: 'html' });
  assert.match(out, /<table>/);
  assert.match(out, /<thead>/);
  assert.match(out, /<tbody>/);
});

// ---------------------------------------------------------------- toml

test('toml refuses or quotes a key that is not a bare key', () => {
  const out = exportRows({ rows: [{ 'weird key': 1 }], format: 'toml', table: 'row' });
  assert.match(out, /"weird key" = 1/);
});

test('toml handles a nested object as an inline table', () => {
  const out = exportRows({ rows: [{ meta: { a: 1, b: 'x' } }], format: 'toml', table: 'row' });
  assert.match(out, /meta = \{ a = 1, b = "x" \}/);
});

test('toml emits an array-of-tables block per row', () => {
  const out = exportRows({ rows: [{ a: 1 }, { a: 2 }], format: 'toml', table: 'thing' });
  assert.match(out, /\[\[thing\]\]/);
  const count = (out.match(/\[\[thing\]\]/g) ?? []).length;
  assert.equal(count, 2);
});

// ---------------------------------------------------------------- suitableFormats

test('suitableFormats excludes csv, tsv, and markdown for nested rows', () => {
  const formats = suitableFormats([{ a: 1, nested: { x: 1 } }]);
  assert.equal(formats.includes('csv'), false);
  assert.equal(formats.includes('tsv'), false);
  assert.equal(formats.includes('markdown'), false);
  assert.equal(formats.includes('json'), true);
  assert.equal(formats.includes('yaml'), true);
});

test('suitableFormats includes csv for flat rows', () => {
  const formats = suitableFormats([{ a: 1, b: 'x' }]);
  assert.equal(formats.includes('csv'), true);
  assert.equal(formats.includes('tsv'), true);
  assert.equal(formats.includes('markdown'), true);
});

test('suitableFormats excludes xml when a column name is not a valid element name', () => {
  const formats = suitableFormats([{ 'bad name!': 1 }]);
  assert.equal(formats.includes('xml'), false);
});

test('suitableFormats excludes sql when a column name is not a plain identifier', () => {
  const formats = suitableFormats([{ 'bad col': 1 }]);
  assert.equal(formats.includes('sql'), false);
});

test('ZIP validation and independent reopen preserve exact names and text', () => {
  const archive = createZipArchive([
    { name: 'history.json', text: '{"ok":true}' },
    { name: 'omissions.json', text: '{"omitted":true}' },
  ]);
  assert.deepEqual(validateZipArchive(archive), { ok: true, entries: 2 });
  assert.deepEqual(reopenZipArchive(archive), [
    { name: 'history.json', text: '{"ok":true}' },
    { name: 'omissions.json', text: '{"omitted":true}' },
  ]);
});

test('ZIP reopen refuses structurally valid names that violate the archive path policy', () => {
  const cases: Array<[string, string]> = [
    ['safe.txt', '../x.txt'],
    ['one.txt', '/ok.txt'],
    ['one.txt', './a.txt'],
    ['one.txt', 'a\\b.txt'],
  ];
  for (const [from, to] of cases) {
    const archive = replaceArchiveName(createZipArchive([{ name: from, text: 'safe' }]), from, to);
    assert.equal(validateZipArchive(archive).ok, false, `tampered name ${to} was accepted`);
    assert.throws(() => reopenZipArchive(archive), /Unsafe or duplicate archive entry name/u);
  }
});

test('ZIP reopen refuses duplicate names after normalization while accepting normal archives', () => {
  const normal = createZipArchive([{ name: 'one.txt', text: 'one' }, { name: 'two.txt', text: 'two' }]);
  assert.deepEqual(validateZipArchive(normal), { ok: true, entries: 2 });
  const duplicate = replaceArchiveName(normal, 'two.txt', 'one.txt');
  assert.equal(validateZipArchive(duplicate).ok, false);
  assert.throws(() => reopenZipArchive(duplicate), /Unsafe or duplicate archive entry name/u);
});

// ---------------------------------------------------------------- describeLoss

test('describeLoss names a flattened nested field for csv', () => {
  const notes = describeLoss([{ a: 1, nested: { x: 1 } }], 'csv');
  assert.ok(notes.some((n) => /flattened/i.test(n) || /json string/i.test(n)));
});

test('describeLoss names the null/empty-string ambiguity for csv', () => {
  const notes = describeLoss([{ a: null }], 'csv');
  assert.ok(notes.some((n) => /null/i.test(n) && /empty/i.test(n)));
});

test('describeLoss is empty for json on ordinary rows', () => {
  const notes = describeLoss([{ a: 1, b: 'x' }], 'json');
  assert.deepEqual(notes, []);
});

test('describeLoss names an invalid xml element name', () => {
  const notes = describeLoss([{ 'bad name!': 1 }], 'xml');
  assert.ok(notes.some((n) => /bad name!/.test(n)));
});

test('describeLoss names an invalid sql identifier', () => {
  const notes = describeLoss([{ 'bad col': 1 }], 'sql');
  assert.ok(notes.some((n) => /bad col/.test(n)));
});

// ---------------------------------------------------------------- exportFilename

test('exportFilename refuses a base containing a forward slash', () => {
  assert.throws(() => exportFilename('a/b', 'json'));
});

test('exportFilename refuses a base containing a backslash', () => {
  assert.throws(() => exportFilename('a\\b', 'json'));
});

test('exportFilename appends the correct extension per format', () => {
  const cases: Array<[ExportFormat, string]> = [
    ['json', 'json'],
    ['jsonl', 'jsonl'],
    ['yaml', 'yaml'],
    ['toml', 'toml'],
    ['xml', 'xml'],
    ['csv', 'csv'],
    ['tsv', 'tsv'],
    ['markdown', 'md'],
    ['html', 'html'],
    ['sql', 'sql'],
  ];
  for (const [format, ext] of cases) {
    assert.equal(exportFilename('report', format), `report.${ext}`);
  }
});

test('exportFilename includes the range when provided', () => {
  assert.equal(exportFilename('report', 'csv', '2026-01-01_2026-01-31'), 'report-2026-01-01_2026-01-31.csv');
});

// ---------------------------------------------------------------- empty / single / ragged rows

test('exportRows handles an empty row set for every format without throwing', () => {
  const formats: ExportFormat[] = ['json', 'jsonl', 'yaml', 'toml', 'xml', 'csv', 'tsv', 'markdown', 'html', 'sql'];
  for (const format of formats) {
    assert.doesNotThrow(() => exportRows({ rows: [], format, table: 'thing' }));
  }
});

test('exportRows handles a single row', () => {
  const out = exportRows({ rows: [{ a: 1 }], format: 'json' });
  assert.deepEqual(JSON.parse(out), [{ a: 1 }]);
});

test('exportRows unions columns for rows with differing keys and does not throw', () => {
  const out = exportRows({ rows: [{ a: 1 }, { b: 2 }], format: 'csv' });
  const header = out.split('\r\n')[0];
  assert.equal(header, 'a,b');
});

test('describeLoss flags ragged keys for csv', () => {
  const notes = describeLoss([{ a: 1 }, { b: 2 }], 'csv');
  assert.ok(notes.some((n) => /differing keys/i.test(n)));
});

test('exportRows distinguishes undefined from null in json output', () => {
  const out = exportRows({ rows: [{ a: null, b: undefined }], format: 'json' });
  const parsed = JSON.parse(out);
  // both serialize to JSON null (JSON has no undefined), but the row must
  // still contain both keys rather than dropping the undefined one.
  assert.equal('a' in parsed[0], true);
  assert.equal('b' in parsed[0], true);
  assert.equal(parsed[0].a, null);
  assert.equal(parsed[0].b, null);
});

test('exportRows never throws on hostile csv input, refusing by name only where structurally required', () => {
  assert.doesNotThrow(() => exportRows({ rows: [{ a: '",,,\n\r"' }], format: 'csv' }));
});
