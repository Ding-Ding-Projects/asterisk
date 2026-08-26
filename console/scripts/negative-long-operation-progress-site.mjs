#!/usr/bin/env node
/**
 * Deliberate red-then-green proof for site/tests/contracts/long-operation-progress.test.mjs.
 *
 * A progress report is unusually easy to ship broken in a way nothing complains about.
 * "There is a bar", "the button is disabled" and "a run happened" are all true of a bar
 * wired to nothing, a guard that only guards the visible control, and an operation that
 * writes five files while saying the same sentence throughout. Every one of those looks
 * completely healthy in a screenshot, and the person who finds out is the one who
 * cancelled halfway and cannot tell which files they now have.
 *
 * So the contract test runs the real extracted source against a recording page and
 * controllable timers -- and this file is what says that test would actually notice if
 * it stopped.
 *
 * One break at a time, always. Breaking three things and watching five assertions fail
 * proves only that something among them is watched; it hid a wiring line in this
 * repository once already.
 *
 * Every break edits a real file on disk, because that is the only way to exercise a test
 * that reads its subject off the filesystem. Two properties keep that safe:
 *
 *   - the original bytes are restored in a `finally`, and the restore is verified rather
 *     than assumed, so an interrupted run cannot leave a planted break behind;
 *   - a break whose replacement did not change the bytes is reported as a FAILED CASE
 *     rather than counted as a pass. An edit that never landed reads exactly like a guard
 *     that held, and an anchor that matched nothing is the commonest way to fake a green.
 *
 * Usage:  node scripts/negative-long-operation-progress-site.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..', '..');
const consoleRoot = resolve(repo, 'console');
const TEST = 'site/tests/contracts/long-operation-progress.test.mjs';

const file = (relative) => resolve(consoleRoot, relative);
const APP = file('site/app.js');
const SETTINGS = file('site/settings.html');
const CSS = file('site/styles.css');
const REGISTRY = file('site/feature-registry.json');
const LOCALES = file('site/locales/feature-registry.json');

/**
 * Replaces `from` with `to` exactly once, refusing anything that is not exactly once.
 *
 * Anchors are written with `\n` and rewritten to whatever the file on disk actually uses.
 * Parts of this checkout are CRLF, and a newline-only anchor against a CRLF file matches
 * nothing at all -- which, without the exactly-once check below, would read as a guard
 * that held rather than as a break that never happened.
 */
const swap = (path, from, to) => () => {
  const before = readFileSync(path, 'utf8');
  const eol = before.includes('\r\n') ? '\r\n' : '\n';
  from = from.split('\n').join(eol);
  to = to.split('\n').join(eol);
  const occurrences = before.split(from).length - 1;
  if (occurrences !== 1) {
    throw new Error(`the break anchor appears ${occurrences} time(s), not once: ${JSON.stringify(from.slice(0, 60))}`);
  }
  return { path, before, after: before.split(from).join(to) };
};

/**
 * Each case is one lie, and the comment beside it is the defect it stands for -- the
 * thing that would ship, silently, if the assertion it trips were deleted.
 */
const cases = [
  // ---- The feature is never reached ----

  // Commented out rather than deleted, because that is how a wiring line usually dies --
  // and because a bare substring needle is satisfied by the comment. The whole dialog
  // becomes unreachable and every unit assertion about it keeps passing.
  ['the init call is commented out rather than removed',
    swap(APP, 'initUpdates();initExportEverything();', 'initUpdates();/*initExportEverything();*/')],

  ['nothing calls initExportEverything at all',
    swap(APP, 'initUpdates();initExportEverything();', 'initUpdates();')],

  ['the open button is no longer wired, so the dialog can never be opened',
    swap(APP, "    open.addEventListener('click',()=>{\n      const dialog=$('export-everything-dialog');if(!dialog)return;",
      "    const unusedOpen=()=>{\n      const dialog=$('export-everything-dialog');if(!dialog)return;")],

  ['the Start control is no longer wired, so the dialog looks complete and does nothing',
    swap(APP, "    $('export-everything-start')?.addEventListener('click',()=>{", "    const unusedStart=(()=>{")],

  ['the Cancel control is no longer wired, so a run cannot be stopped from the page',
    swap(APP, "    $('export-everything-cancel')?.addEventListener('click',cancelExportEverything);", '')],

  ['the format picker is no longer wired, so choosing a format changes nothing on screen',
    swap(APP, "    $('export-everything-format')?.addEventListener('change',renderExportEverything);", '')],

  ['the optional choice is no longer wired, so declining the changelog changes no sentence',
    swap(APP, "    $('export-everything-changelog')?.addEventListener('change',()=>{updateExportEverythingFormats();renderExportEverything()});", '')],

  ['the open button no longer exists in the settings toolbar',
    swap(SETTINGS, '<button id="export-everything-open" type="button" class="text-button">Export everything&hellip;</button>', '')],

  // ---- The bar is a spinner wearing a maximum ----

  // A percentage disconnected from the work. It fills convincingly and reports nothing.
  ['the bar counts against a fixed 100 rather than the units this run will write',
    swap(APP, '      bar.max=exportRun.total||plan.totalUnits||1;', '      bar.max=100;')],

  ['the bar never advances, so it sits at zero through the whole run',
    swap(APP, '      bar.value=exportRun.done;', '      bar.value=0;')],

  ['the bar is written but the sentence beside it never is, leaving only a percentage',
    swap(APP, "    if(text)text.textContent=applyVocabularyText(exportEverythingProgressLine(exportRun));",
      "    if(text&&false)text.textContent=applyVocabularyText(exportEverythingProgressLine(exportRun));")],

  // No record set is ever announced before it is written, so the only lines the page
  // ever shows are counts -- nothing on screen names what is happening right now.
  ['the page is not repainted when a unit starts, only when it finishes',
    swap(APP, '      exportRun={...exportRun,current:unit.label,currentRows:unit.rows};\n      renderExportEverything();',
      '      exportRun={...exportRun,current:unit.label,currentRows:unit.rows};')],

  // The whole run becomes one synchronous block: nothing paints, the cancel control
  // can never be reached, and the page is frozen for exactly as long as the work takes.
  ['the run never yields, so nothing paints and Cancel can never be pressed',
    swap(APP, '      await operationYield();\n      /* And a cancel pressed while that line was up', '      /* And a cancel pressed while that line was up')],

  // Announce, work, THEN yield. The sentence naming the record set is written and
  // overwritten inside one synchronous block with no paint between, so it is never seen
  // and the page appears to hang on the previous line.
  ['the yield moves after the work, so the name of the record set is never painted',
    swap(APP,
      '      await operationYield();\n'
      + '      /* And a cancel pressed while that line was up is honoured before the work rather\n'
      + '       * than after it, since that window is precisely when somebody reads the name and\n'
      + '       * decides they did not want it. */\n'
      + '      if(exportRun.cancelRequested){',
      '      /* And a cancel pressed while that line was up is honoured before the work rather\n'
      + '       * than after it, since that window is precisely when somebody reads the name and\n'
      + '       * decides they did not want it. */\n'
      + '      if(exportRun.cancelRequested){')],

  // The count between units is rendered and then superseded by the next announcement
  // inside one synchronous block, so it never paints, the cancel check at the top of the
  // loop has no window to fire in, and both read in the source like things somebody sees.
  ['the run stops pausing after a record set lands, so the count between units never paints',
    swap(APP, '       * for all of them. */\n      await operationYield();\n    }', '       * for all of them. */\n    }')],

  // The finished record set stays named while the count moves on, so the report says
  // "Writing 3 of 5" beside the name of the one that finished second. It does not read
  // as an off-by-one; it reads as the report naming the wrong thing.
  ['the finished record set is left named while the count advances past it',
    swap(APP, '        current:\'\',currentRows:0,written:[...exportRun.written,name]};', '        written:[...exportRun.written,name]};')],

  ['the between-units line names a record set nobody is writing',
    swap(APP, "      case 'running':return run.current\n        ?", "      case 'running':return true\n        ?")],

  ['the in-progress sentence stops naming the record set being written',
    swap(APP, '        ?`Writing ${run.done+1} of ${run.total}: ${run.current} (${run.currentRows} rows). ${run.rowsDone} of ${run.rowsTotal} rows done.`',
      '        ?`Writing ${run.done+1} of ${run.total} (${run.currentRows} rows). ${run.rowsDone} of ${run.rowsTotal} rows done.`')],

  ['the in-progress sentence stops carrying the counts, leaving only a name',
    swap(APP, '        ?`Writing ${run.done+1} of ${run.total}: ${run.current} (${run.currentRows} rows). ${run.rowsDone} of ${run.rowsTotal} rows done.`',
      '        ?`Writing ${run.current}.`')],

  ['a finished run stops naming the files it wrote',
    swap(APP, "      case 'done':return `Finished. ${run.done} of ${run.total} written, ${run.rowsDone} rows.${written}`;",
      "      case 'done':return `Finished. ${run.done} of ${run.total} written, ${run.rowsDone} rows.`;")],

  // ---- Both halves of the duplicate-submission guard ----

  // The visible guard alone. Every screenshot looks right, and a keyboard submit runs
  // the whole operation a second time, writing every file twice.
  ['the handler stops refusing a second entry, leaving only the disabled button',
    swap(APP, "    if(exportRun.state==='running'){\n      /* The disabled button is the visible guard and never the real one. A keyboard",
      "    if(false){\n      /* The disabled button is the visible guard and never the real one. A keyboard")],

  ['the refusals are swallowed rather than counted',
    swap(APP, '      exportRun={...exportRun,refusedReentry:exportRun.refusedReentry+1};', '      exportRun={...exportRun};')],

  ['the refusal count is never shown, so nothing on the page says a press did nothing',
    swap(APP, "    if(refused)refused.textContent=exportRun.refusedReentry", "    if(refused&&false)refused.textContent=exportRun.refusedReentry")],

  ['the Start control is never disabled during the run',
    swap(APP, '    start.disabled=Boolean(why);', '    start.disabled=false;')],

  // A tooltip is a pointer-only affordance. Somebody on a keyboard or a touch screen is
  // simply shown a dead button with no explanation at all.
  ['the disabled reason reaches only the tooltip, never the page',
    swap(APP, '    if(reason)reason.textContent=why;', "    if(reason)reason.textContent='';")],

  ['the disabled reason stops mentioning the run in flight',
    swap(APP, "    if(run.state==='running')return 'An export is already running. Wait for it to finish, or cancel it.';", '')],

  ['a stale disabled reason is left on the control after the run ends',
    swap(APP, "    if(why)start.setAttribute('title',why);else start.removeAttribute('title');", "    if(why)start.setAttribute('title',why);")],

  // ---- Stopping early, and being honest about it ----

  ['the run stops checking between units, so Cancel is honoured a whole record set late',
    swap(APP, '    for(const unit of plan.included){\n      if(exportRun.cancelRequested){',
      '    for(const unit of plan.included){\n      if(false){')],

  ['the run stops checking after announcing a record set, so cancelling still writes it',
    swap(APP, '       * decides they did not want it. */\n      if(exportRun.cancelRequested){',
      '       * decides they did not want it. */\n      if(false){')],

  ['cancel is accepted when nothing is running, so the next run starts pre-cancelled',
    swap(APP, "    if(exportRun.state!=='running')return false;", '')],

  ['the Cancel control is disabled during the run it exists to cancel',
    swap(APP, '      cancel.disabled=!running;', '      cancel.disabled=true;')],

  ['a cancelled run stops naming the files it already wrote',
    swap(APP, "      case 'cancelled':return `Cancelled after ${run.done} of ${run.total}.${written}`;",
      "      case 'cancelled':return `Cancelled after ${run.done} of ${run.total}.`;")],

  // ---- Failure ----

  ['a failed unit is swallowed and the run carries on as though nothing happened',
    swap(APP, "        exportRun={...exportRun,state:'failed',current:'',currentRows:0,reason:`${unit.label} could not be written (${error.message})`};\n        renderExportEverything();\n        return {started:true,failed:true,written:exportRun.written.slice(),plan};",
      '        continue;')],

  ['a failed run stops naming which record set failed',
    swap(APP, 'reason:`${unit.label} could not be written (${error.message})`};', "reason:'the export failed'};")],

  ['a run with nothing to write reports a finished export instead of refusing',
    swap(APP, "    if(plan.totalUnits===0){", '    if(false){')],

  ['a completed run announces itself even when it failed part-way',
    swap(APP, "      const rows=exportEverythingRows(unit.id);\n        name=exportFilename(unit.base,format,'');",
      "      const rows=exportEverythingRows(unit.id);\n        name=exportFilename(unit.base,format,'');\n        notify('Export finished','done',{category:'export',en:'x',zh:'x'});")],

  // ---- The expensive optional phase ----

  ['the choice is offered on a build with no changelog to decline',
    swap(APP, '    if(optionalRow)optionalRow.hidden=counts.changelog===0;', '    if(optionalRow)optionalRow.hidden=false;')],

  ['the decline sentence never says what leaving the changelog out costs',
    swap(APP, "    if(declineLine)declineLine.textContent=counts.changelog===0\n      ?''\n      :applyVocabularyText(EXPORT_EVERYTHING_UNITS.find(unit=>unit.id==='changelog').decline);",
      "    if(declineLine)declineLine.textContent='';")],

  ['declining the changelog is ignored, so the expensive phase runs anyway',
    swap(APP, "      if(unit.optional&&!includeChangelog){", '      if(false){')],

  ['the decline reason stops saying how many rows are left out',
    swap(APP, 'reason:`${unit.label} was declined. Its ${rows} rows are left out of this export.`', "reason:'It was declined.'"), ],

  // ---- The plan ----

  ['an empty record set is dropped without a word, so nobody learns which one was empty',
    swap(APP, "      if(rows===0){skipped.push({...unit,rows:0,reason:`${unit.label} has no rows in this browser yet, so no file is written for it.`});continue}",
      '      if(rows===0){continue}')],

  ['the plan totals count every record set rather than the ones this run will write',
    swap(APP, 'return {included,skipped,totalUnits:included.length,totalRows:included.reduce((sum,unit)=>sum+unit.rows,0)};',
      'return {included,skipped,totalUnits:EXPORT_EVERYTHING_UNITS.length,totalRows:included.reduce((sum,unit)=>sum+unit.rows,0)};')],

  ['the plan summary stops naming the record sets and their counts',
    swap(APP, ': ${plan.included.map(unit=>`${unit.label} (${unit.rows})`).join(\', \')}.`;', '.`;')],

  // ---- One format for the whole run ----

  ['the format list is taken from the first record set alone, so another can be damaged',
    swap(APP, '      allowed=allowed===null?formats:allowed.filter(format=>formats.includes(format));',
      '      allowed=allowed===null?formats:allowed;')],

  ['an empty plan offers an empty format list rather than the full one',
    swap(APP, '    if(!plan||!plan.included.length)return EXPORT_FORMATS.slice();', '    if(!plan||!plan.included.length)return [];')],

  ['a format already chosen is thrown away on every refresh',
    swap(APP, '    select.value=formats.includes(previous)?previous:(formats[0]||\'\');', "    select.value=formats[0]||'';")],

  // ---- What goes into the files ----

  ['the settings file is written from the live state, so the notification array is exported twice',
    swap(APP, "      case 'settings':return flattenSettingRows(snapshotState(),'');", "      case 'settings':return flattenSettingRows(state,'');")],

  ['the settings rows stop recursing, so every nested group becomes [object Object]',
    swap(APP, "      if(inner&&typeof inner==='object'&&!Array.isArray(inner)){rows.push(...flattenSettingRows(inner,path));continue}", '')],

  ['the destination rail glyph becomes a column of the exported catalogue',
    swap(APP, 'return DESTINATIONS.map(item=>({id:item.id,name:item.name,group:item.group,article:item.article,description:item.description}));',
      'return DESTINATIONS.map(item=>({id:item.id,name:item.name,group:item.group,article:item.article,description:item.description,icon:item.icon}));')],

  ['an unknown record set exports nothing instead of being refused',
    swap(APP, '      default:throw new Error(`Unknown export unit: ${id}`);', '      default:return [];')],

  // ---- Reopening ----

  ['reopening the dialog keeps the last run\'s Finished line, which reads as this one having succeeded',
    swap(APP, "      if(exportRun.state!=='running')exportRun={...exportRun,state:'idle',", "      if(false)exportRun={...exportRun,state:'idle',")],

  // ---- Markup ----

  // Inside <form method="dialog"> a button with no type is a submit button, and a submit
  // closes the dialog -- so the progress report is destroyed at the instant it begins.
  ['Start loses its type="button" and submits the dialog closed the moment it is pressed',
    swap(SETTINGS, '<button type="button" id="export-everything-start" class="primary-button">', '<button id="export-everything-start" class="primary-button">')],

  ['Cancel loses its type="button"',
    swap(SETTINGS, '<button type="button" id="export-everything-cancel" class="text-button" disabled>', '<button id="export-everything-cancel" class="text-button" disabled>')],

  ['the bar ships without a maximum, which is an indeterminate sweep',
    swap(SETTINGS, '<progress id="export-everything-progress" max="1" value="0"></progress>', '<progress id="export-everything-progress"></progress>')],

  ['the progress sentence is no longer announced to assistive technology',
    swap(SETTINGS, '<p id="export-everything-progress-text" class="mono" role="status" aria-live="polite">', '<p id="export-everything-progress-text" class="mono">')],

  ['the description loses its funny-level hook',
    swap(SETTINGS, '<p id="export-everything-desc" data-copy="exportEverythingDesc">', '<p id="export-everything-desc">')],

  ['the dialog stops being labelled by its own heading',
    swap(SETTINGS, '<dialog id="export-everything-dialog" class="overlay-card" aria-labelledby="export-everything-title" aria-describedby="export-everything-desc">',
      '<dialog id="export-everything-dialog" class="overlay-card">')],

  ['a hidden optional row still occupies the dialog',
    swap(CSS, '.operation-optional[hidden]{display:none}', '')],

  ['the bar gains an animation, so it moves whatever is or is not happening',
    swap(CSS, '.operation-progress progress{width:100%;height:10px;border-radius:999px;overflow:hidden}',
      '.operation-progress progress{width:100%;height:10px;border-radius:999px;overflow:hidden;animation:pulse 1s infinite}')],

  // ---- The records that speak for the code ----

  ['the site registry still calls the feature absent',
    swap(REGISTRY, '      "state": "implemented",\n      "note": "The Export everything dialog runs a real multi-unit operation',
      '      "state": "absent",\n      "note": "The Export everything dialog runs a real multi-unit operation')],

  ['the site registry stops naming the stylesheet the dialog depends on',
    swap(REGISTRY, '        "site/settings.html",\n        "site/styles.css"\n      ]\n    },\n    "in-context-recovery"',
      '        "site/settings.html"\n      ]\n    },\n    "in-context-recovery"')],

  ['the localization registry still calls the copy untranslated',
    swap(LOCALES, '    "long-operation-progress": {\n      "state": "localized",', '    "long-operation-progress": {\n      "state": "not-localized",')],

  ['the new COPY key is missing from the known list',
    swap(LOCALES, '    "exportEverythingDesc",\n', '')],
];

const runTest = () => {
  try {
    execFileSync(process.execPath, ['--test', TEST], { cwd: consoleRoot, stdio: 'pipe' });
    return 'green';
  } catch {
    return 'red';
  }
};

const baseline = runTest();
if (baseline !== 'green') {
  console.error('FAIL: the untouched contract test is already red, so nothing below would mean anything.');
  process.exit(1);
}

let failures = 0;
for (const [name, plant] of cases) {
  let planted;
  try {
    planted = plant();
  } catch (error) {
    console.error(`FAILED CASE  ${name}: ${error.message}`);
    failures += 1;
    continue;
  }
  if (planted.after === planted.before) {
    /* The break that never landed. It reads exactly like a guard that held, so it is a
     * failure of this script rather than a pass for the test. */
    console.error(`FAILED CASE  ${name}: the replacement changed no bytes, so nothing was broken`);
    failures += 1;
    continue;
  }

  let broken;
  try {
    writeFileSync(planted.path, planted.after);
    broken = runTest();
  } finally {
    writeFileSync(planted.path, planted.before);
    if (readFileSync(planted.path, 'utf8') !== planted.before) {
      console.error(`FAILED CASE  ${name}: the original bytes were NOT restored -- repair this file by hand`);
      process.exit(1);
    }
  }

  const restored = runTest();
  const ok = broken === 'red' && restored === 'green';
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  broke=${broken.padEnd(5)} restored=${restored.padEnd(5)}  ${name}`);
}

if (failures > 0) {
  console.error(`FAIL: ${failures} of ${cases.length} planted break(s) did not turn the contract test red and green again.`);
  process.exit(1);
}
console.log(`PASS: ${cases.length} planted break(s), each alone, each turning `
  + `${TEST} red and then green again on restore.`);
