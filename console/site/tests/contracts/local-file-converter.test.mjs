/**
 * Contract: local-file-converter on the pages-site.
 *
 * This file used to record an absence, and the absence it recorded had stopped
 * being true in a way nothing noticed: `site/converter.html` shipped a whole
 * converter surface -- a file picker, an adapter catalogue, a target select, a
 * queue, a pager and a cancel button -- and not one of those control ids was
 * mentioned anywhere in `site/app.js`, the only script the page loads. The old
 * contract read `app.js` plus index/product/documentation/downloads/status/
 * settings, and never read `converter.html` at all, so it passed cleanly over a
 * page of controls that did nothing whatsoever. That is the defect this file
 * now guards against from the other side.
 *
 * What it checks, in the site's own established shape: the DOM-free converter
 * engine is EXTRACTED from the real source and RUN against real bytes, exactly
 * as the export-engine contract runs the real export source, and the DOM half
 * is pinned by whole-line anchors so a commented-out wiring line cannot satisfy
 * it. The two halves matter separately -- a correct engine nothing calls is the
 * state this page was already in.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');
const norm = (s) => s.replace(/\r\n/g, '\n');
const bytes = (...values) => Uint8Array.from(values);
const utf8 = (text) => new TextEncoder().encode(text);

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

/**
 * The real converter engine, re-run from the real source.
 *
 * The export block travels with it because the converter deliberately writes
 * its row-shaped output through `exportRows` rather than carrying a second set
 * of format writers; running them together is what proves that borrowing works
 * rather than merely that it was written down.
 */
function loadConverterEngine() {
  const src = norm(read('site/app.js'));
  const exportBlock = braceBoundedBlock(src, 'const EXPORT_FORMATS = [', 'exportFilename');
  const converterBlock = braceBoundedBlock(src, 'const CONVERTER_MAX_BYTES = ', 'converterOutputName');
  for (const [label, block] of [['export', exportBlock], ['converter', converterBlock]]) {
    assert.doesNotMatch(block, /document\./, `the ${label} block now references document -- it is no longer DOM-free and cannot be re-run in isolation`);
    assert.doesNotMatch(block, /window\./, `the ${label} block now references window -- it is no longer DOM-free and cannot be re-run in isolation`);
  }
  const body = `${exportBlock}\n${converterBlock}\nreturn { CONVERTER_MAX_BYTES, CONVERTER_TARGETS, CONVERTER_TARGET_LABEL, CONVERTER_CATEGORIES, converterAdapters, converterAdapterFor, converterSignature, converterDecodeUtf8, converterSplitDelimited, converterLooksDelimited, converterClassifyText, converterInspect, converterRowsFor, converterBase64, converterCan, converterLoss, converterConvert, converterOutputName };`;
  return new Function(body)(); // eslint-disable-line no-new-func -- deliberately re-running the real extracted source
}

test('the extracted converter engine is non-trivial, so every finding below is not vacuous', () => {
  const engine = loadConverterEngine();
  assert.ok(engine.CONVERTER_CATEGORIES.length >= 8,
    `only ${engine.CONVERTER_CATEGORIES.length} categories were extracted -- too few to trust any result from this engine`);
  assert.ok(engine.converterAdapters().length >= 10,
    `only ${engine.converterAdapters().length} adapters were extracted -- too few to trust any result from this engine`);
});

test('the catalogue carries every canonical category, and each adapter is either bundled or carries its exact reason', () => {
  const { CONVERTER_CATEGORIES, converterAdapters } = loadConverterEngine();
  const ids = CONVERTER_CATEGORIES.map((category) => category.id).sort();
  assert.deepEqual(ids, ['archives', 'audio', 'binary-encodings', 'code-text', 'documents', 'images', 'structured-data', 'video'],
    'the eight canonical converter categories are the pin here: add a category and update this list deliberately, never widen it');
  for (const adapter of converterAdapters()) {
    if (adapter.bundled) {
      assert.ok(Array.isArray(adapter.writes) && adapter.writes.length > 0,
        `${adapter.id} claims to be bundled but writes nothing`);
      continue;
    }
    assert.ok(typeof adapter.unavailable === 'string' && adapter.unavailable.length > 20,
      `${adapter.id} is unavailable and does not say why -- an unexplained gap reads as an oversight`);
  }
});

test('an unavailable adapter is still listed, so a short catalogue is never mistaken for full support', () => {
  const { converterAdapters } = loadConverterEngine();
  const unavailable = converterAdapters().filter((adapter) => !adapter.bundled).map((adapter) => adapter.id);
  for (const expected of ['pdf', 'image', 'audio', 'video', 'archive', 'xlsx']) {
    assert.ok(unavailable.includes(expected), `${expected} is missing from the catalogue entirely rather than listed as unavailable`);
  }
});

test('a file is identified by its bytes, and a PDF is refused rather than read as text', () => {
  const { converterSignature, converterInspect, converterCan } = loadConverterEngine();
  assert.equal(converterSignature(utf8('%PDF-1.7\nstuff')).kind, 'pdf');
  assert.equal(converterSignature(bytes(0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)).kind, 'png');
  assert.equal(converterSignature(bytes(0x50, 0x4B, 0x03, 0x04, 0x14)).kind, 'zip');
  assert.equal(converterSignature(utf8('hello')), undefined, 'plain text must not match any binary signature');

  const pdf = converterInspect('notes.pdf', utf8('%PDF-1.7\nstuff'));
  assert.equal(pdf.kind, 'pdf');
  assert.equal(converterCan(pdf, 'txt').ok, false, 'a PDF must not be offered as text -- no PDF parser is bundled');
  assert.match(converterCan(pdf, 'txt').reason, /pdf/, 'the refusal must name what the file actually is');
  assert.equal(converterCan(pdf, 'base64').ok, true, 'Base64 keeps the bytes without claiming to have decoded them');
});

test('a name that disagrees with the bytes loses: the signature decides', () => {
  const { converterInspect } = loadConverterEngine();
  /* A PNG called .csv is the exact case an extension-trusting detector gets wrong,
   * and getting it wrong here would mean handing image bytes to a CSV splitter. */
  const mislabelled = converterInspect('table.csv', bytes(0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x02, 0x01));
  assert.equal(mislabelled.kind, 'png');
  assert.match(mislabelled.why, /first bytes/);
});

test('text is classified by parsing it, not by its name', () => {
  const { converterInspect } = loadConverterEngine();
  assert.equal(converterInspect('anything.txt', utf8('[{"a":1},{"a":2}]')).kind, 'json');
  assert.equal(converterInspect('anything.txt', utf8('{"a":1}\n{"a":2}\n')).kind, 'jsonl');
  assert.equal(converterInspect('anything.bin', utf8('a,b\n1,2\n3,4\n')).kind, 'csv');
  assert.equal(converterInspect('anything.bin', utf8('a\tb\n1\t2\n3\t4\n')).kind, 'tsv');
  assert.equal(converterInspect('plain.txt', utf8('just some prose, one line only')).kind, 'text');
});

test('Markdown is the one kind decided by the name, and it says so in its own reason', () => {
  const { converterInspect } = loadConverterEngine();
  const md = converterInspect('readme.md', utf8('# Heading\n\nSome prose here.'));
  assert.equal(md.kind, 'markdown');
  assert.match(md.why, /hint from the name/,
    'a name-derived classification must admit it came from the name rather than the bytes');
});

test('bytes that are not valid UTF-8 are refused as text instead of being decoded into replacement characters', () => {
  const { converterDecodeUtf8, converterInspect, converterCan } = loadConverterEngine();
  const invalid = bytes(0xC3, 0x28, 0xA0, 0xA1);
  assert.equal(converterDecodeUtf8(invalid).ok, false);
  const inspected = converterInspect('mystery.dat', invalid);
  assert.equal(inspected.kind, 'binary');
  assert.equal(converterCan(inspected, 'txt').ok, false);
  assert.equal(converterCan(inspected, 'base64').ok, true);
});

test('a quoted CSV field survives the split, commas, doubled quotes and all', () => {
  const { converterSplitDelimited } = loadConverterEngine();
  assert.deepEqual(converterSplitDelimited('a,"b,c",d', ','), ['a', 'b,c', 'd']);
  assert.deepEqual(converterSplitDelimited('a,"say ""hi""",c', ','), ['a', 'say "hi"', 'c']);
  assert.deepEqual(converterSplitDelimited('lone', ','), ['lone']);
});

test('CSV really becomes JSON, with the first line read as the header', () => {
  const { converterInspect, converterConvert } = loadConverterEngine();
  const source = utf8('name,extension\nreception,6001\n"kitchen, back",6002\n');
  const inspected = converterInspect('phones.csv', source);
  assert.deepEqual(inspected.rows, [
    { name: 'reception', extension: '6001' },
    { name: 'kitchen, back', extension: '6002' },
  ]);
  const converted = converterConvert(inspected, 'json', source);
  assert.equal(converted.ok, true);
  assert.deepEqual(JSON.parse(converted.text), [
    { name: 'reception', extension: '6001' },
    { name: 'kitchen, back', extension: '6002' },
  ]);
});

test('a CSV whose header repeats a column is refused, because a row read from it would lose one', () => {
  const { converterInspect, converterCan } = loadConverterEngine();
  const inspected = converterInspect('dupe.csv', utf8('a,a\n1,2\n3,4\n'));
  assert.equal(inspected.rows, undefined);
  assert.match(inspected.rowsRefused, /repeats the column name "a"/);
  assert.equal(converterCan(inspected, 'json').ok, false);
});

test('a JSON array of scalars is refused for a table rather than given an invented column name', () => {
  const { converterInspect, converterCan } = loadConverterEngine();
  const inspected = converterInspect('list.json', utf8('[1,2,3]'));
  assert.equal(inspected.rows, undefined);
  assert.match(inspected.rowsRefused, /no named columns/);
  assert.equal(converterCan(inspected, 'csv').ok, false);
  assert.equal(converterCan(inspected, 'txt').ok, true, 'it is still text, so plain text is still honest');
});

test('a nested JSON value blocks CSV through the very same suitability rule an export uses', () => {
  const { converterInspect, converterCan, converterLoss } = loadConverterEngine();
  const inspected = converterInspect('nested.json', utf8('[{"a":1,"b":{"deep":true}}]'));
  assert.deepEqual(inspected.rows, [{ a: 1, b: { deep: true } }]);
  assert.equal(converterCan(inspected, 'csv').ok, false, 'CSV cannot represent a nested value and must say so before running');
  assert.equal(converterCan(inspected, 'json').ok, true);
  assert.ok(converterLoss(inspected, 'csv').join(' ').length > 0);
});

test('Base64 is byte-exact, checked against an implementation this file did not write', () => {
  const { converterBase64 } = loadConverterEngine();
  const sample = bytes(0x00, 0x01, 0xFE, 0xFF, 0x41, 0x42, 0x43);
  assert.equal(converterBase64(sample), Buffer.from(sample).toString('base64'));
  assert.equal(converterBase64(utf8('hello world')), Buffer.from('hello world', 'utf8').toString('base64'));
});

test('plain text converted to plain text comes back unchanged, line endings included', () => {
  const { converterInspect, converterConvert } = loadConverterEngine();
  const original = 'first\r\nsecond\nthird';
  const source = utf8(original);
  const converted = converterConvert(converterInspect('notes.txt', source), 'txt', source);
  assert.equal(converted.ok, true);
  assert.equal(converted.text, original, 'a passthrough that quietly normalises line endings is not a passthrough');
});

test('a file over the per-file bound is refused before anything reads it, and names the bound', () => {
  const { CONVERTER_MAX_BYTES, converterInspect, converterCan } = loadConverterEngine();
  assert.equal(CONVERTER_MAX_BYTES, 32 * 1024 * 1024, 'the page tells the reader 32 MiB, so the code must mean 32 MiB');
  const oversized = { length: CONVERTER_MAX_BYTES + 1 };
  const inspected = converterInspect('huge.bin', oversized);
  assert.equal(inspected.readable, false);
  assert.match(inspected.why, /per-file bound/);
  for (const target of ['json', 'txt', 'base64']) {
    assert.equal(converterCan(inspected, target).ok, false, `${target} must be refused for a file over the bound`);
  }
});

test('loss is disclosed per target, and the disclosures genuinely differ', () => {
  const { converterInspect, converterLoss } = loadConverterEngine();
  const source = utf8('a,b\n1,2\n');
  const inspected = converterInspect('t.csv', source);
  const base64 = converterLoss(inspected, 'base64').join(' ');
  const text = converterLoss(inspected, 'txt').join(' ');
  const csv = converterLoss(inspected, 'csv').join(' ');
  assert.match(base64, /about a third larger/);
  assert.match(text, /unchanged/);
  assert.match(csv, /written as text/);
  assert.notEqual(base64, text);
  assert.notEqual(text, csv);
});

test('an output name keeps the stem, gains the target extension, and can never carry a path separator', () => {
  const { converterOutputName } = loadConverterEngine();
  assert.equal(converterOutputName('phones.csv', 'json'), 'phones.json');
  assert.equal(converterOutputName('archive.tar.gz', 'base64'), 'archive.tar.base64.txt');
  for (const hostile of ['../../etc/passwd', 'a\\b\\c.csv', 'x/y.json']) {
    const produced = converterOutputName(hostile, 'json');
    assert.ok(!produced.includes('/') && !produced.includes('\\'),
      `converterOutputName produced ${produced}, which carries a path separator`);
  }
});

// ---------------------------------------------------------------------------
// The wiring half. An engine nothing calls is exactly the state this page was
// in, so each anchor below is a whole line or a distinctive call: a commented-out
// call cannot satisfy it, and a renamed symbol cannot carry the old name inside
// a new one.
// ---------------------------------------------------------------------------

test('initConverter is genuinely called from the boot sequence', () => {
  const src = norm(read('site/app.js'));
  assert.match(src, /^ {2}function initConverter\(\)\{$/m, 'initConverter is not declared as its own line');
  assert.match(src, /initAuthenticator\(\);initConverter\(\);/,
    'initConverter is not called from init() -- the converter would be dead code exactly as the old shell was');
  assert.doesNotMatch(src, /^\s*\/\/\s*initConverter\(\);/m, 'the boot call is commented out');
});

test('every control the converter page ships is reached by name from app.js', () => {
  const src = norm(read('site/app.js'));
  const page = norm(read('site/converter.html'));
  const ids = [...page.matchAll(/<(?:input|button|select|textarea)\b[^>]*\bid="(converter-[a-z-]+)"/g)].map((match) => match[1]);
  assert.ok(ids.length >= 7, `only ${ids.length} converter control ids were found in the page -- this scan proves nothing`);
  /* A heading pointed at by aria-labelledby is a name, not a control, and app.js has
   * no business mentioning one. They are excluded by that relationship rather than by
   * a hand-written skip list, so a control cannot escape this scan by being renamed to
   * look like a heading. */
  const labelledBy = new Set([...page.matchAll(/aria-labelledby="([^"]+)"/g)].flatMap((match) => match[1].split(/\s+/)));
  const controls = [...new Set(ids)].filter((id) => !labelledBy.has(id));
  assert.ok(controls.length >= 7, `only ${controls.length} of ${new Set(ids).size} converter ids are controls -- this scan proves nothing`);
  for (const id of controls) {
    assert.ok(src.includes(`'${id}'`),
      `converter.html ships #${id} and site/app.js never mentions it -- that control does nothing, which is the defect this contract exists for`);
  }
});

test('the picker, the target select and the queue are each wired to a real handler', () => {
  const src = norm(read('site/app.js'));
  assert.match(src, /\$\('converter-files'\)\.addEventListener\('change'/,
    'the file picker has no change handler');
  assert.match(src, /\$\('converter-target-format'\)\?\.addEventListener\('change'/,
    'changing the target format does nothing');
  assert.match(src, /\$\('converter-queue'\)\?\.addEventListener\('click'/,
    'the queue has no click delegate, so Convert and Download would be inert');
  assert.match(src, /\$\('converter-convert-listed'\)\?\.addEventListener\('click',converterConvertListed\)/,
    'the batch button is not wired to the batch');
});

test('the picker is emptied after a read, so choosing the same file twice fires again', () => {
  const src = norm(read('site/app.js'));
  assert.match(src, /const chosen=event\.target\.files;event\.target\.value='';converterAddFiles\(chosen\)/,
    'the files must be taken before the picker is cleared, and the picker must be cleared');
});

test('changing the target format puts converted rows back to queued rather than leaving a stale output', () => {
  const src = norm(read('site/app.js'));
  assert.match(src, /for\(const item of converterItems\)\{if\(item\.state!=='queued'\)\{item\.state='queued'/,
    'a converted item must not keep an output produced for a different target');
});

test('cancel is honoured between files, and a cancelled file says so instead of staying queued', () => {
  const src = norm(read('site/app.js'));
  assert.match(src, /if\(converterCancelRequested\)\{item\.state='cancelled'/,
    'the batch does not check for a cancel between files');
  assert.match(src, /\$\('converter-cancel'\)\?\.addEventListener\('click',\(\)=>\{if\(converterRunning\)converterCancelRequested=true\}\)/,
    'the cancel button does not set the cancel flag');
});

test('the batch reports converted, skipped and cancelled separately rather than calling itself a success', () => {
  const src = norm(read('site/app.js'));
  assert.match(src, /const summary=`\$\{converted\} converted, \$\{skipped\} skipped, \$\{cancelled\} cancelled\.`/,
    'the batch summary must distinguish all three outcomes');
});

test('the page tells the reader nothing was uploaded, and the source contains no network call for it', () => {
  const src = norm(read('site/app.js'));
  const start = src.indexOf('  let converterItems=[];');
  const end = src.indexOf('  function initHeroCanvas(');
  assert.ok(start !== -1 && end > start, 'the converter DOM block could not be located');
  const block = src.slice(start, end);
  assert.ok(block.length > 2000, 'the converter DOM block extracted as almost nothing, so this scan proves nothing');
  assert.doesNotMatch(block, /\bfetch\(/, 'the converter must not make a network request');
  assert.doesNotMatch(block, /XMLHttpRequest/, 'the converter must not make a network request');

  /* The claim travels with the line because the line has exactly one writer. Two writers
   * is not a style problem here: it is what let the claim be deleted from one of them
   * while a contract matching it anywhere in the block stayed green -- which is exactly
   * what happened, and was caught by planting that break rather than by reading this. */
  const writers = (src.match(/'converter-input-status'/g) || []).length;
  assert.equal(writers, 1,
    `the picker status line has ${writers} writers -- the "nothing was uploaded" claim can be dropped from one of them without this contract noticing`);
  assert.match(block, /function converterInputStatus\(extra\)\{[\s\S]{0,400}nothing was uploaded/,
    'converterInputStatus no longer carries the claim that nothing left the browser');
  assert.equal((block.match(/converterInputStatus\(/g) || []).length, 3,
    'expected the one declaration and its two call sites -- a new caller must go through the helper, not around it');
});

test('every disabled converter control has adjacent text naming the condition that is unmet', () => {
  const src = norm(read('site/app.js'));
  assert.match(src, /Cancel is switched off because no conversion is running/);
  assert.match(src, /Previous is switched off because this is the first page/);
  assert.match(src, /Next is switched off because this is the last page/);
});

test('the converter page ships the batch button the wiring expects', () => {
  const page = norm(read('site/converter.html'));
  assert.match(page, /id="converter-convert-listed"/, 'the batch button is missing from the page');
});

test('the classes the converter markup uses now have real rules behind them', () => {
  const css = norm(read('site/styles.css'));
  for (const className of ['adapter-catalog', 'adapter-entry', 'converter-queue', 'converter-item', 'converter-pager', 'file-picker', 'suite-panel']) {
    assert.match(css, new RegExp(`\\.${className}[{ ,:]`),
      `.${className} is used by the converter markup and has no rule in site/styles.css`);
  }
});

test('the page is actually published, and reachable from every page that ships', () => {
  /* Wiring a page nobody can open is the same defect one level up. `site/build.mjs`
   * published six pages and converter.html was not among them, and none of those six
   * linked to it, so the whole surface was unreachable on the site however well it
   * worked. Both halves are pinned: it is published, and it is linked. */
  const build = norm(read('site/build.mjs'));
  assert.match(build, /const assets = \[[^\]]*'converter\.html'/,
    'site/build.mjs does not publish converter.html, so nothing about this feature reaches the site');
  for (const name of ['index', 'product', 'documentation', 'downloads', 'status', 'settings']) {
    const nav = norm(read(`site/${name}.html`)).match(/<nav class="site-nav"[^>]*>([\s\S]*?)<\/nav>/u);
    assert.ok(nav, `${name}.html has no primary site-nav element`);
    assert.match(nav[1], /href="converter\.html"/,
      `${name}.html does not link the converter from its primary navigation`);
  }
  assert.match(norm(read('site/app.js')), /\['Converter','converter\.html'\]/,
    'the command palette does not list the converter, so it cannot be reached by name');
});

test('the registry row now records the wired surface rather than the absence it used to', () => {
  const registry = JSON.parse(read('site/feature-registry.json'));
  const row = registry.features['local-file-converter'];
  assert.ok(row, 'local-file-converter is missing from the site feature registry');
  assert.equal(row.status, 'implemented-unverified');
  for (const file of ['site/app.js', 'site/converter.html']) {
    assert.ok(row.implementation.paths.includes(file), `the registry row does not name ${file}`);
  }
  assert.ok(row.implementation.paths.includes('site/styles.css'));
  assert.deepEqual(row.registration.paths, ['site/app.js']);
});
