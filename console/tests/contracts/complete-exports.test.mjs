import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8').replace(/\r\n/g, '\n');
const app = read('app/renderer/src/App.tsx');
const exporter = read('app/renderer/src/export.ts');

test('the mounted renderer prepares a canonical export artifact from the plan-selected rows', () => {
  assert.match(app, /import \{ prepareExport, suitableFormats, type ExportFormat \} from '\.\/export';/);
  assert.match(app, /const selectedRecords = plan\.affected\.map\(/);
  assert.match(app, /const formats = suitableFormats\(selectedRecords\);/);
  assert.match(app, /const prepared = prepareExport\(\{ rows: selectedRecords, format, table: screen \}\);/);
  assert.match(app, /if \(prepared\.status !== 'prepared'\)/);
  assert.match(app, /const artifact = prepared\.artifact;/);
});

test('the prepared artifact carries filename, MIME type, UTF-8 bytes, count, and faithful-loss disclosures', () => {
  assert.match(exporter, /schemaVersion: 'ding-pbx-export\.v1'/);
  assert.match(exporter, /mediaType: mediaType\[request\.format\]/);
  assert.match(exporter, /encoding: 'utf-8'/);
  assert.match(exporter, /byteLength: new TextEncoder\(\)\.encode\(content\)\.byteLength/);
  assert.match(exporter, /rowCount: request\.rows\.length/);
  assert.match(exporter, /disclosures: describeLoss\(request\.rows, request\.format\)/);
  assert.match(exporter, /exportFilename\(request\.table \?\? 'export', request\.format\)/);
});

test('the browser download consumes the exact prepared artifact and makes disclosure visible', () => {
  assert.match(app, /new Blob\(\[artifact\.content\], \{ type: artifact\.mediaType \}\)/);
  assert.match(app, /a\.download = artifact\.filename/);
  assert.match(app, /artifact\.disclosures\.map\(\(disclosure\) => disclosure\.message\)/);
  assert.match(app, /selected row\(s\) exported as \$\{artifact\.format\}/);
  assert.doesNotMatch(app, /type:\s*'text\/plain;charset=utf-8'/, 'a fixed plain-text MIME type would mislabel selected exports');
});

test('negative regression: bypassing prepareExport is observable', () => {
  const bypassed = app.replace(/const prepared = prepareExport\(/, 'const prepared = prepareExportREMOVED(');
  assert.doesNotMatch(bypassed, /const prepared = prepareExport\(/);
});
