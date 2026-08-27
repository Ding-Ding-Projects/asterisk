#!/usr/bin/env node
/**
 * Deliberate red-then-green proof for site/tests/contracts/local-file-converter.test.mjs.
 *
 * This contract exists because of a defect that had already shipped and that nothing
 * caught for what it was: `site/converter.html` carried a complete converter surface --
 * a file picker, an adapter catalogue, a target select, a queue, a pager, a cancel
 * button -- and not one of those control ids was mentioned anywhere in `site/app.js`,
 * the only script the page loads. Every control was inert, and the page looked finished.
 *
 * A converter is unusually good at hiding that. Nothing throws, nothing logs, the
 * catalogue is right there on screen, and the only symptom is that pressing a button
 * does nothing at all -- which reads as a slow page rather than as a page that was never
 * wired. So the contract runs the real extracted engine against real bytes and pins the
 * wiring by whole lines, and this file is what says it would actually notice if either
 * half stopped.
 *
 * One break at a time, always. Breaking three things and watching five assertions fail
 * proves only that something among them is watched.
 *
 * Every break edits a real file on disk, because that is the only way to exercise a test
 * that reads its subject off the filesystem. Two properties keep that safe:
 *
 *   - the original bytes are restored in a `finally`, and the restore is verified rather
 *     than assumed, so an interrupted run cannot leave a planted break behind;
 *   - a break whose replacement did not change the bytes is reported as a FAILED CASE
 *     rather than counted as a pass. An edit that never landed reads exactly like a
 *     guard that held, and an anchor written with `\n` against a CRLF file is the
 *     commonest way to fake a green.
 *
 * Usage:  node scripts/negative-local-file-converter-site.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..', '..');
const consoleRoot = resolve(repo, 'console');
const TEST = 'site/tests/contracts/local-file-converter.test.mjs';

const file = (relative) => resolve(consoleRoot, relative);
const APP = file('site/app.js');
const CSS = file('site/styles.css');
const PAGE = file('site/converter.html');
const REGISTRY = file('site/feature-registry.json');

/** Replaces `from` with `to` exactly once, refusing anything that is not exactly once. */
const swap = (path, from, to) => () => {
  const before = readFileSync(path, 'utf8');
  const eol = before.includes('\r\n') ? '\r\n' : '\n';
  const anchor = from.split('\n').join(eol);
  const replacement = to.split('\n').join(eol);
  const occurrences = before.split(anchor).length - 1;
  if (occurrences !== 1) {
    throw new Error(`the break anchor appears ${occurrences} time(s), not once: ${JSON.stringify(anchor.slice(0, 70))}`);
  }
  return { path, before, after: before.split(anchor).join(replacement) };
};

/**
 * Each case is one lie, and the comment beside it names the defect it stands for -- what
 * would ship, silently, if the assertion it trips were deleted.
 */
const cases = [
  /* ---- The wiring. This is the half that had actually shipped broken. ---- */

  // Commented out rather than deleted, because that is how a wiring line usually dies,
  // and because a bare substring needle for the call is satisfied by the comment.
  ['the initConverter() call is commented out rather than removed',
    swap(APP, 'initAuthenticator();initConverter();', 'initAuthenticator();/*initConverter();*/')],

  ['nothing starts the converter at all',
    swap(APP, 'initAuthenticator();initConverter();', 'initAuthenticator();')],

  // The exact original defect, reproduced: the picker exists and nothing listens to it.
  ['the file picker has no change handler, so choosing a file does nothing',
    swap(APP, "$('converter-files').addEventListener('change'", "$('converter-files-unwired').addEventListener('change'")],

  ['the queue click delegate is gone, so Convert and Download are inert',
    swap(APP, "$('converter-queue')?.addEventListener('click'", "$('converter-queue-unwired')?.addEventListener('click'")],

  ['the batch button is wired to nothing',
    swap(APP, "$('converter-convert-listed')?.addEventListener('click',converterConvertListed)",
      "$('converter-convert-listed-unwired')?.addEventListener('click',converterConvertListed)")],

  ['changing the target format stops doing anything',
    swap(APP, "$('converter-target-format')?.addEventListener('change'", "$('converter-target-format-unwired')?.addEventListener('change'")],

  // The picker keeps its value, so choosing the same file twice fires the change event
  // once. Nothing errors; the second attempt simply does not happen.
  ['the picker is not emptied after a read, so the same file cannot be chosen twice',
    swap(APP, "const chosen=event.target.files;event.target.value='';converterAddFiles(chosen)", 'converterAddFiles(event.target.files)')],

  // Converted output kept from a previous target: the row says Converted and the bytes
  // belong to a format nobody asked for.
  ['a converted row keeps its stale output when the target changes',
    swap(APP, "for(const item of converterItems){if(item.state!=='queued'){item.state='queued'",
      "for(const item of []){if(item.state!=='queued'){item.state='queued'")],

  ['cancel is never checked, so a running batch cannot be stopped',
    swap(APP, "if(converterCancelRequested){item.state='cancelled'", "if(false){item.state='cancelled'")],

  ['the cancel button stops setting the flag',
    swap(APP, "$('converter-cancel')?.addEventListener('click',()=>{if(converterRunning)converterCancelRequested=true})",
      "$('converter-cancel')?.addEventListener('click',()=>{})")],

  // A batch that reports only its successes is the "one failed item never turns the
  // batch green" rule broken in the cheapest possible way.
  ['the batch reports only what converted, hiding what it skipped and cancelled',
    swap(APP, 'const summary=`${converted} converted, ${skipped} skipped, ${cancelled} cancelled.`',
      'const summary=`${converted} converted.`')],

  ['a disabled pager button stops naming the condition that is unmet',
    swap(APP, ' Previous is switched off because this is the first page.', ' ')],

  ['the cancel button is disabled with nothing beside it saying why',
    swap(APP, 'Cancel is switched off because no conversion is running.', 'Cancel unavailable.')],

  // The one claim on this page a reader cannot check for themselves. This break is the
  // reason the status line has a single writer at all: when the sentence lived in both
  // call sites, deleting it from one left the contract green on the other, and the
  // script reported that as a FAILED CASE rather than counting it as a pass.
  ['the page stops saying that nothing was uploaded',
    swap(APP, 'Every byte was read in this browser and nothing was uploaded.${extra?',
      'Files read.${extra?')],

  ['a second writer appears and rewrites the status line without the claim',
    swap(APP, "      converterInputStatus('');", "      const n=$('converter-input-status');if(n)n.textContent='Removed.';")],

  ['a network call appears inside the converter block',
    swap(APP, '  function converterTarget(){return', "  function converterTarget(){fetch('/x');return")],

  /* ---- The engine. Each of these would produce a wrong answer, not an error. ---- */

  // The single most valuable property in the detector: bytes beat the name. Trusting the
  // extension hands PNG bytes to a CSV splitter and produces a table of rubbish.
  ['type detection trusts the file name instead of the bytes',
    swap(APP, '    const signature=converterSignature(bytes);\n    if(signature)', '    const signature=undefined;\n    if(signature)')],

  ['a PDF is offered as text, as though a parser were bundled',
    swap(APP, "    if(inspected.binary)return{ok:false,reason:`this file is ${inspected.kind}", "    if(false)return{ok:false,reason:`this file is ${inspected.kind}")],

  // Replacement characters instead of a refusal: the output looks like text and is not
  // the file's content.
  ['invalid UTF-8 is decoded leniently rather than refused',
    swap(APP, "new TextDecoder('utf-8',{fatal:true})", "new TextDecoder('utf-8',{fatal:false})")],

  ['a quoted CSV field is split on the comma inside its quotes',
    swap(APP, `      if(char==='"'){quoted=true;continue}`, `      if(false){quoted=true;continue}`)],

  // A repeated header column silently drops one of them, and the row that comes back
  // looks perfectly ordinary.
  ['a CSV header that repeats a column is accepted, losing one of them',
    swap(APP, '      if(duplicate!==undefined)return{ok:false,reason:', '      if(false)return{ok:false,reason:')],

  ['an array of scalars is given an invented column name instead of being refused',
    swap(APP, "        return{ok:false,reason:'this JSON is an array whose entries are not all objects",
      "        return{ok:true,rows:parsed.map(value=>({value}))};//{ok:false,reason:'this JSON is an array whose entries are not all objects")],

  // The suitability gate is what stops a nested value being flattened into a CSV cell
  // as "[object Object]".
  ['CSV suitability stops being checked, so a nested value is flattened silently',
    swap(APP, "    if((target==='csv'||target==='tsv')&&!suitableFormats(inspected.rows).includes(target))",
      "    if(false&&(target==='csv'||target==='tsv')&&!suitableFormats(inspected.rows).includes(target))")],

  ['the per-file bound stops being enforced',
    swap(APP, '    if(size>CONVERTER_MAX_BYTES)', '    if(false)')],

  ['the bound is quietly widened past what the page tells the reader',
    swap(APP, 'const CONVERTER_MAX_BYTES = 32*1024*1024;', 'const CONVERTER_MAX_BYTES = 64*1024*1024;')],

  ['a plain-text passthrough starts normalising line endings',
    swap(APP, "    if(target==='txt')return{ok:true,text:inspected.text};", "    if(target==='txt')return{ok:true,text:inspected.text.replace(/\\r\\n/g,'\\n')};")],

  ['Base64 stops being byte-exact',
    swap(APP, 'for(let i=0;i<bytes.length;i+=0x8000)', 'for(let i=1;i<bytes.length;i+=0x8000)')],

  ['an output name is allowed to carry a path separator',
    swap(APP, ".replace(/\\.[^./\\\\]*$/,'').replace(/[/\\\\]/g,'-')", ".replace(/\\.[^./\\\\]*$/,'')")],

  ['loss is no longer disclosed per target -- every target gets the same sentence',
    swap(APP, "    if(target==='base64')return['Base64 keeps every byte exactly", "    if(true)return['Base64 keeps every byte exactly")],

  /* ---- The catalogue. An unexplained gap reads as an oversight. ---- */

  ['a whole canonical category disappears from the catalogue',
    swap(APP, "    {id:'archives',label:'Archives',adapters:[", "    {id:'archives-renamed',label:'Archives',adapters:[")],

  ['an unavailable adapter stops saying why it is unavailable',
    swap(APP, "        unavailable:'no PDF parser is bundled", "        unavailable:'x';const unused='no PDF parser is bundled")],

  ['an unavailable adapter is removed rather than listed with its reason',
    swap(APP, "      {id:'pdf',label:'PDF',bundled:false,", "      {id:'pdf-removed',label:'PDF',bundled:false,")],

  /* ---- The record. The registry and the page's own markup. ---- */

  ['the registry row goes back to claiming the surface is absent',
    swap(REGISTRY, '"state": "implemented",\n      "note": "site/converter.html is wired', '"state": "absent",\n      "note": "site/converter.html is wired')],

  ['the registry row stops naming the page it lives in',
    swap(REGISTRY, '        "site/converter.html",\n', '')],

  // The state the page shipped in for its whole life so far: never published at all,
  // so however well it worked it could not be opened on the site.
  ['the page stops being published by the site build',
    swap(file('site/build.mjs'), "'documentation.html', 'converter.html', 'downloads.html'", "'documentation.html', 'downloads.html'")],

  ['the home page stops linking the converter',
    swap(file('site/index.html'), '<a href="documentation.html">Documentation</a><a href="converter.html">Converter</a>',
      '<a href="documentation.html">Documentation</a>')],

  ['the command palette stops listing the converter',
    swap(APP, "['Converter','converter.html'],", '')],

  ['the batch button is removed from the page while the wiring stays',
    swap(PAGE, '<button id="converter-convert-listed" class="secondary-button" type="button" disabled>Convert the files listed here</button>', '')],

  // The state this page shipped in for its whole life so far: markup using classes with
  // no rules behind them, so every card rendered as an unstyled block.
  ['the converter classes lose their rules again, so the page renders unstyled',
    swap(CSS, '.adapter-catalog{', '.adapter-catalog-removed{')],
];

let failures = 0;
console.log(`Planting ${cases.length} break(s) against ${TEST}, one at a time.\n`);

for (const [label, plant] of cases) {
  let planted;
  try {
    planted = plant();
  } catch (error) {
    console.log(`FAILED CASE: ${label}\n  the break could not be planted: ${error.message}`);
    failures += 1;
    continue;
  }
  if (planted.after === planted.before) {
    console.log(`FAILED CASE: ${label}\n  the replacement changed no bytes, so this case proves nothing`);
    failures += 1;
    continue;
  }
  try {
    writeFileSync(planted.path, planted.after);
    let wentRed = false;
    try {
      execFileSync(process.execPath, ['--test', TEST], { cwd: consoleRoot, stdio: 'pipe' });
    } catch {
      wentRed = true;
    }
    if (wentRed) console.log(`red on break:   ${label}`);
    else {
      console.log(`FAILED CASE: ${label}\n  the suite stayed green with this break planted -- nothing is watching it`);
      failures += 1;
    }
  } finally {
    writeFileSync(planted.path, planted.before);
    if (readFileSync(planted.path, 'utf8') !== planted.before) {
      console.log(`FAILED CASE: ${label}\n  the restore did not take -- ${planted.path} is still broken`);
      failures += 1;
    }
  }
}

try {
  execFileSync(process.execPath, ['--test', TEST], { cwd: consoleRoot, stdio: 'pipe' });
  console.log('\ngreen on restore: every break was undone and the contract passes again.');
} catch (error) {
  console.log(`\nFAILED: the contract does not pass with every break restored.\n${error.stdout}`);
  failures += 1;
}

if (failures > 0) {
  console.error(`\n${failures} case(s) did not behave as a red-then-green proof requires.`);
  process.exit(1);
}
console.log(`\nAll ${cases.length} break(s) went red and green again.`);
