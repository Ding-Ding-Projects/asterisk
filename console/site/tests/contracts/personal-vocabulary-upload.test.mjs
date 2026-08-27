/** Contract: the public site and desktop use the same bounded personal-vocabulary shape. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const root = resolve(siteRoot, '..');
const read = (path) => readFileSync(path, 'utf8').replaceAll('\r\n', '\n');
const app = read(resolve(siteRoot, 'app.js'));
const desktop = read(resolve(root, 'app', 'renderer', 'src', 'personal-vocabulary.ts'));
const settings = read(resolve(siteRoot, 'settings.html'));
function body(name) { const start = app.indexOf(`function ${name}(`); assert.ok(start >= 0, `${name} is absent`); const next = app.indexOf('\n  function ', start + 10); return app.slice(start, next < 0 ? app.length : next); }
const escaped = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function vocabularyRuntime(source = app) {
  const start = source.indexOf('  const VOCABULARY_CACHE_KEY=');
  const end = source.indexOf('  // ============================================================================\n  // Restricted presentation', start);
  assert.ok(start >= 0 && end > start, 'real site vocabulary block is not addressable');
  const values = new Map();
  const localStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: (key) => values.delete(key) };
  const context = { TextEncoder, localStorage, console, schoolActive: () => false };
  vm.runInNewContext(`${source.slice(start, end)}\nglobalThis.__vocab={validateVocabularyText,vocabularyReplacements,applyVocabularyText};`, context, { filename: 'site-vocabulary-runtime.js' });
  return { ...context.__vocab, values, localStorage, context };
}
const canonical = (replacements) => ({ version: 1, replacements });
const load = (runtime, payload) => { const parsed = runtime.validateVocabularyText(payload); runtime.localStorage.setItem('ding-pbx-vocabulary-cache', JSON.stringify(parsed)); return parsed; };

test('settings owns a semantic local JSON picker and clear path', () => {
  assert.match(settings, /id="vocabulary-file"[^>]*type="file"[^>]*accept="application\/json,\.json"/u); assert.match(settings, /id="vocabulary-clear"/u); assert.match(settings, /No data leaves this browser/u);
});
test('site accepts precisely the same root aliases and canonicalizes the cache', () => {
  const validator = body('validateVocabularyText'); for (const token of ['version','schemaVersion','replacements','terms','VOCABULARY_VERSION']) assert.match(validator, new RegExp(escaped(token), 'u'));
  assert.match(validator, /versionKeys\.length!==1/u); assert.match(validator, /termKeys\.length!==1/u); assert.match(validator, /return \{version:VOCABULARY_VERSION,replacements\}/u); assert.match(desktop, /declare exactly one of "version" or "schemaVersion"/u); assert.match(desktop, /declare exactly one of "replacements" or "terms"/u);
});
test('all six accepted representations execute through the real validator and canonicalize identically', () => {
  const shapes = [
    {version:1,replacements:[{from:'alpha',to:'one'}]}, {schemaVersion:1,replacements:[{from:'alpha',to:'one'}]},
    {version:1,replacements:{alpha:'one'}}, {schemaVersion:1,replacements:{alpha:'one'}},
    {version:1,terms:{alpha:'one'}}, {schemaVersion:1,terms:{alpha:'one'}},
  ];
  for (const shape of shapes) assert.equal(JSON.stringify(vocabularyRuntime().validateVocabularyText(JSON.stringify(shape))), JSON.stringify(canonical([{from:'alpha',to:'one'}])));
});
test('hand-written malformed-input table reaches the real parser and validator', () => {
  const cases = [
    ['conflicting version aliases', '{"version":1,"schemaVersion":1,"replacements":[]}'], ['conflicting source aliases', '{"version":1,"replacements":[],"terms":{}}'],
    ['duplicate root key', '{"version":1,"version":1,"replacements":[]}'], ['duplicate map key', '{"version":1,"terms":{"a":"x","a":"y"}}'],
    ['unsafe key', '{"version":1,"terms":{"__proto__":"x"}}'], ['trailing data', '{"version":1,"replacements":[]} nope'], ['control character', '{"version":1,"terms":{"a":"x\n"}}'],
    ['unknown root field', JSON.stringify({version:1,replacements:[],extra:true})], ['unknown entry field', JSON.stringify({version:1,replacements:[{from:'a',to:'b',extra:true}]})],
    ['wrong version type', JSON.stringify({version:'1',replacements:[{from:'a',to:'b'}]})], ['wrong source type', JSON.stringify({version:1,replacements:'no'})],
    ['too many entries', JSON.stringify({version:1,replacements:Array.from({length:257},(_,i)=>({from:`a${i}`,to:'x'}))})], ['long source', JSON.stringify({version:1,replacements:[{from:'a'.repeat(129),to:'x'}]})],
    ['long target', JSON.stringify({version:1,replacements:[{from:'a',to:'x'.repeat(257)}]})], ['duplicate source', JSON.stringify({version:1,replacements:[{from:'a',to:'x'},{from:'a',to:'y'}]})],
    ['deep nesting', '{"version":1,"terms":{"a":{"b":{"c":{"d":{"e":"x"}}}}}}'], ['oversize bytes', `{"version":1,"terms":{"a":"${'x'.repeat(65536)}"}}`],
  ];
  for (const [label, payload] of cases) assert.throws(() => vocabularyRuntime().validateVocabularyText(payload), label);
});
test('cache lifecycle is executable: rejection retains good state, corruption is purged, clear returns originals', () => {
  const runtime = vocabularyRuntime(); load(runtime, JSON.stringify({version:1,terms:{alpha:'one'}})); const before = runtime.localStorage.getItem('ding-pbx-vocabulary-cache');
  assert.throws(() => runtime.validateVocabularyText('{"version":2,"terms":{"alpha":"two"}}')); assert.equal(runtime.localStorage.getItem('ding-pbx-vocabulary-cache'), before);
  assert.equal(JSON.stringify(runtime.vocabularyReplacements()), JSON.stringify([{from:'alpha',to:'one'}])); runtime.localStorage.setItem('ding-pbx-vocabulary-cache', '{bad'); assert.equal(runtime.vocabularyReplacements(), null); assert.equal(runtime.localStorage.getItem('ding-pbx-vocabulary-cache'), null);
  runtime.localStorage.removeItem('ding-pbx-vocabulary-cache'); assert.equal(runtime.applyVocabularyText('alpha'), 'alpha');
});
test('clear handler executes against local storage and restores its visible state', () => {
  const values = new Map([['ding-pbx-vocabulary-cache', 'present']]); const file = { value: 'chosen.json' }; const status = { textContent: '' };
  const context = { VOCABULARY_CACHE_KEY: 'ding-pbx-vocabulary-cache', localStorage: { removeItem: (key) => values.delete(key) }, el: (id) => id === 'vocabulary-file' ? file : status, applyVocabulary: () => {}, applyState: () => {} };
  vm.runInNewContext(`${body('clearVocabulary')}\nglobalThis.run=clearVocabulary;`, context); context.run();
  assert.equal(values.has('ding-pbx-vocabulary-cache'), false); assert.equal(file.value, ''); assert.match(status.textContent, /original wording is active/u);
});
test('longest-first matching and School-mode bypass execute against the real site functions', () => {
  const runtime = vocabularyRuntime(); load(runtime, JSON.stringify({version:1,replacements:[{from:'a',to:'short'},{from:'ab',to:'long'}]})); assert.equal(runtime.applyVocabularyText('ab a'), 'long short');
  runtime.context.schoolActive = () => true; assert.equal(runtime.applyVocabularyText('ab a'), 'ab a');
});
test('real text and accessible-name walker skips technical boundaries while changing eligible copy', () => {
  const runtime = vocabularyRuntime(); load(runtime, JSON.stringify({version:1,terms:{alpha:'one'}}));
  const visible = { nodeValue:'alpha', parentElement:{ tagName:'DIV', classList:{ contains: () => false }, closest: () => null } };
  const code = { nodeValue:'alpha', parentElement:{ tagName:'CODE', classList:{ contains: () => false }, closest: () => null } };
  const labelled = { tagName:'DIV', dataset:{}, getAttribute: () => 'alpha', setAttribute: (_name, value) => { labelled.value = value; }, closest: () => null };
  const technicalLabel = { tagName:'CODE', dataset:{}, getAttribute: () => 'alpha', setAttribute: (_name, value) => { technicalLabel.value = value; }, closest: () => null };
  const nodes = [visible, code]; let index = 0;
  runtime.context.document = { createTreeWalker: () => ({ nextNode: () => { while (index < nodes.length) { const candidate = nodes[index++]; if (runtime.context.__filter.acceptNode(candidate) === 1) return candidate; } return null; } }) };
  runtime.context.NodeFilter = { SHOW_TEXT: 4, FILTER_ACCEPT: 1, FILTER_REJECT: 2 };
  vm.runInNewContext(`${body('applyVocabularyToNode').replace('document.createTreeWalker', 'document.createTreeWalker')}\nglobalThis.__apply=applyVocabularyToNode;`, runtime.context);
  const root = { querySelectorAll: () => [labelled, technicalLabel] };
  const originalCreate = runtime.context.document.createTreeWalker;
  runtime.context.document.createTreeWalker = (_root, _what, filter) => { runtime.context.__filter = filter; return originalCreate(); };
  runtime.context.__apply(root);
  assert.equal(visible.nodeValue, 'one'); assert.equal(code.nodeValue, 'alpha'); assert.equal(labelled.value, 'one'); assert.equal(technicalLabel.value, undefined);
});
test('deliberate validator mutation turns the executable case red, then restoration is green', () => {
  const mutated = app.replace('if(versionKeys.length!==1)', 'if(false&&versionKeys.length!==1)').replace('if(!allowed.has(key))', 'if(false&&!allowed.has(key))');
  const payload = '{"version":1,"schemaVersion":1,"terms":{"a":"b"}}';
  assert.equal(JSON.stringify(vocabularyRuntime(mutated).validateVocabularyText(payload)), JSON.stringify(canonical([{from:'a',to:'b'}])));
  assert.throws(() => vocabularyRuntime().validateVocabularyText(payload));
});
test('site validator fails closed for malformed JSON, duplicate keys, unknown fields, unsafe keys, and all bounds', () => {
  const source = `${body('parseVocabularyJson')}\n${body('validateVocabularyText')}`; for (const token of ['duplicate key','VOCABULARY_UNSAFE_KEYS','VOCABULARY_MAX_DEPTH','VOCABULARY_MAX_BYTES','VOCABULARY_MAX_REPLACEMENTS','VOCABULARY_MAX_FROM','VOCABULARY_MAX_TO','unexpected field','values must be strings','Duplicate keys are not accepted']) assert.match(source, new RegExp(escaped(token), 'u')); assert.match(desktop, /DuplicateJsonKeyError/u); assert.match(desktop, /MAX_NESTING_DEPTH/u);
});
test('rejected uploads retain the last valid cache, corrupt cache is purged, and clear restores originals', () => {
  const loader = body('loadVocabulary'), reader = body('vocabularyReplacements'), clear = body('clearVocabulary'); assert.match(loader, /validateVocabularyText\(await file\.text\(\)\)/u); assert.match(loader, /localStorage\.setItem\(VOCABULARY_CACHE_KEY,JSON\.stringify\(parsed\)\)/u); assert.match(loader, /catch\(error\)\{rejectVocabulary/u); assert.match(reader, /validateVocabularyText\(raw\)\.replacements/u); assert.match(reader, /localStorage\.removeItem\('ding-pbx-vocabulary-cache'\)/u); assert.match(clear, /original wording is active/u);
});
test('longest-first replacement and text-boundary leak protections remain explicit', () => {
  assert.match(body('applyVocabularyText'), /sort\(\(a,b\)=>b\.from\.length-a\.from\.length\)/u); assert.match(app, /VOCAB_SKIP_TAGS=new Set\(\['SCRIPT','STYLE','CODE','KBD','PRE','INPUT','TEXTAREA','SELECT','OPTION'\]\)/u); assert.match(app, /closest\('\[data-no-vocab\]'\)/u); assert.match(app, /aria-label/u); assert.match(app, /personalVocabulary:'omitted'/u); assert.doesNotMatch(body('loadVocabulary'), /fetch\(|XMLHttpRequest|sendBeacon/u);
});
