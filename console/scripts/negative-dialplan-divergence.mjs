#!/usr/bin/env node
/**
 * Deliberate red-then-green regression for the sentence that tells an operator whether the
 * dialplan Asterisk is running still matches `extensions.conf`.
 *
 * The defect this guards is one nothing can see. `dialplan show` reads loaded state and
 * says nothing about a file, so a canvas drawn from a dialplan that no file describes is
 * pixel-for-pixel a canvas drawn from one the file describes exactly. There is no error, no
 * empty table, and no failing parser test — the only symptom is an operator editing a file
 * that has stopped being the thing on their screen. Measured on a real exchange:
 * `docs/evidence/live-readings.md`.
 *
 * Each break below removes exactly ONE guarded thing, runs the tests that are supposed to
 * notice, and requires them to fail; then restores it and requires them to pass. Breaking
 * several at once proves only that *something* among them is watched, which is precisely
 * how a comparison ends up computed and dropped while every unit test stays green.
 *
 * Two traps this guards itself against, both of which have cost this repository real time:
 *
 *  - **A break that never landed.** Every replacement asserts the file's bytes actually
 *    changed. An edit that matched nothing reports success and changes nothing, and "no
 *    effect" then reads exactly like a passing guard.
 *  - **A restore that never landed.** Every restore asserts the file is byte-identical to
 *    what it was before, so a later break cannot run against a tree an earlier one damaged.
 *
 *     node console/scripts/negative-dialplan-divergence.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const WIRED = 'tests/ui/dialplan-divergence-wired.test.tsx';
const MODEL = 'tests/control-plane/dialplan-divergence.test.ts';

/** @type {Array<{name: string, file: string, find: string, replace: string, tests: string[]}>} */
const BREAKS = [
  // ------------------------------------------------ the file side
  {
    name: 'the file parser stops skipping [general] and [globals], so both look like missing contexts',
    file: 'control-plane/dialplan-divergence.ts',
    find: 'const RESERVED_SECTIONS = new Set(["general", "globals"]);',
    replace: 'const RESERVED_SECTIONS = new Set<string>([]);',
    tests: [MODEL],
  },
  {
    name: 'a template counts as a context, so a [name](!) section is reported as never loaded',
    file: 'control-plane/dialplan-divergence.ts',
    find: '    if (options.some((option) => option.toLowerCase() === "!")) {',
    replace: '    if (false && options.some((option) => option.toLowerCase() === "!")) {',
    tests: [MODEL],
  },
  {
    name: 'the option list is read after a space, so "[foo] (!)" stops being a context',
    file: 'control-plane/dialplan-divergence.ts',
    find: 'const CATEGORY_HEADER = /^\\[([^\\]]*)\\](\\(([^)]*)\\))?/u;',
    replace: 'const CATEGORY_HEADER = /^\\[([^\\]]*)\\]\\s*(\\(([^)]*)\\))?/u;',
    tests: [MODEL],
  },
  {
    name: 'include directives are no longer recorded, so an included context reads as a divergence',
    file: 'control-plane/dialplan-divergence.ts',
    find: '      if (DIRECTIVE_WORDS.has(directive[1].toLowerCase())) directives.push(line);',
    replace: '      if (false) directives.push(line);',
    tests: [MODEL],
  },
  {
    name: 'an unknown "#word" is recorded as an include directive Asterisk would have ignored',
    file: 'control-plane/dialplan-divergence.ts',
    find: 'const DIRECTIVE_WORDS = new Set(["include", "tryinclude", "exec"]);',
    replace: 'const DIRECTIVE_WORDS = new Set(["include", "tryinclude", "exec", "nonsense"]);',
    tests: [MODEL],
  },
  {
    name: 'a trailing comment hides the header on its line',
    file: 'control-plane/dialplan-divergence.ts',
    find: '    if (state.depth === 0) {\n      /* A bare semicolon outside a block: everything after it is a comment. */\n      return out + line.slice(cursor, semi);\n    }',
    replace: '    if (state.depth === 0) {\n      return "";\n    }',
    tests: [MODEL],
  },
  {
    name: 'a block comment stops hiding what is inside it',
    file: 'control-plane/dialplan-divergence.ts',
    find: '      if (state.depth === 0) out += line.slice(cursor, semi);\n      state.depth += 1;',
    replace: '      if (state.depth === 0) out += line.slice(cursor, semi);',
    tests: [MODEL],
  },
  {
    name: 'an escaped semicolon is treated as a comment',
    file: 'control-plane/dialplan-divergence.ts',
    find: '    if (semi > cursor && line[semi - 1] === "\\\\") {',
    replace: '    if (false && semi > cursor && line[semi - 1] === "\\\\") {',
    tests: [MODEL],
  },

  // ------------------------------------------------ the loaded side
  {
    name: 'the context parser stops reading the registrar, so pbx_ael contexts get compared too',
    file: 'control-plane/dialplan-graph.ts',
    find: '        current = { name: header[1], registrar: header[2], files: [] };',
    replace: '        current = { name: header[1], registrar: "pbx_config", files: [] };',
    tests: [MODEL],
  },
  {
    name: 'a bare [pbx_ael] is recorded as a registrar file, so a module name becomes a filename',
    file: 'control-plane/dialplan-graph.ts',
    find: '    if (first) {\n      if (first[6]) addFile(first[5]);\n      continue;\n    }',
    replace: '    if (first) {\n      addFile(first[5]);\n      continue;\n    }',
    tests: [MODEL],
  },
  {
    name: 'the command’s own context total is no longer read, so a short reading cannot be noticed',
    file: 'control-plane/dialplan-graph.ts',
    find: '      const reportedTotal = parseDialplanContextTotal(result.stdout);',
    replace: '      const reportedTotal = undefined;',
    tests: [MODEL],
  },
  {
    name: 'a failed `dialplan show` still hands back contexts, so a file is compared against nothing',
    file: 'control-plane/dialplan-graph.ts',
    find: '      return { command: "dialplan show", result: { state: "unavailable", observedAt, reason: firstLine(result.stdout.trim()) } };',
    replace: '      return { command: "dialplan show", result: { state: "unavailable", observedAt, reason: firstLine(result.stdout.trim()) }, contexts: [] };',
    tests: [MODEL],
  },

  // ------------------------------------------------ the comparison
  {
    name: 'contexts another module created are compared, so 21 of one target’s 49 become defects',
    file: 'control-plane/dialplan-divergence.ts',
    find: '  const fromPbxConfig = loaded.filter((context) => context.registrar === PBX_CONFIG_REGISTRAR);',
    replace: '  const fromPbxConfig = loaded.filter(() => true);',
    tests: [MODEL],
  },
  {
    name: 'a context from an #include’d file is reported as a divergence',
    file: 'control-plane/dialplan-divergence.ts',
    find: '    const elsewhere = context.files.find((name) => name !== DIALPLAN_FILE_BASENAME);',
    replace: '    const elsewhere = undefined;',
    tests: [MODEL],
  },
  {
    name: '"in the file, not loaded" is filtered by registrar, so a context another module created reads as missing',
    file: 'control-plane/dialplan-divergence.ts',
    find: '  const inFileNotLoaded = file.contexts.filter((name) => !loadedNames.has(name));',
    replace: '  const inFileNotLoaded = file.contexts.filter((name) => !fromPbxConfig.some((context) => context.name === name));',
    tests: [MODEL],
  },
  {
    name: 'an unattributable empty context is called a divergence even where an include could explain it',
    file: 'control-plane/dialplan-divergence.ts',
    find: '      (file.directives.length === 0 && unattributed.length > 0),',
    replace: '      unattributed.length > 0,',
    tests: [MODEL],
  },
  {
    name: 'the comparison stops reporting a divergence at all',
    file: 'control-plane/dialplan-divergence.ts',
    find: '    diverged:\n      inFileNotLoaded.length > 0 ||',
    replace: '    diverged:\n      false &&\n      inFileNotLoaded.length > 0 ||',
    tests: [MODEL, WIRED],
  },

  // ------------------------------------------------ the wiring
  {
    name: 'the canvas view stops asking for the comparison at all',
    file: 'control-plane/dispatch.ts',
    find: '      return { dialplan, dialplanFile: await readDialplanDivergence(target, dialplan) };',
    replace: '      return { dialplan };',
    tests: [MODEL],
  },
  {
    name: 'the comparison reads the parsed configuration instead of the file’s own bytes',
    file: 'control-plane/dispatch.ts',
    find: '      const text = await transport.readText(DIALPLAN_FILE_RESOURCE);',
    replace: '      const text = JSON.stringify(await transport.read(DIALPLAN_FILE_RESOURCE));',
    tests: [MODEL],
  },
  {
    name: 'readText stops enforcing the resource allowlist',
    file: 'control-plane/wsl-config-transport.ts',
    find: '    return this.#readExact(this.#path(assertConfigurable(resource)));',
    replace: '    return this.#readExact(resource as ConfigurableResource);',
    tests: [MODEL],
  },
  {
    name: 'the divergence note never reaches the screen',
    file: 'app/renderer/src/App.tsx',
    find: '      return [canvasReason(this.canvasReadings), dialplanDivergenceNote(this.canvasReadings)]',
    replace: '      return [canvasReason(this.canvasReadings)]',
    tests: [WIRED, MODEL],
  },
  {
    name: 'the canvas falls back behind the configuration branch, where it is unreachable',
    file: 'app/renderer/src/App.tsx',
    find: "    if (screen === 'canvas') {\n      if (!this.canvasReadings) return 'Reading…';",
    replace: "    if (screen === 'canvas-disabled') {\n      if (!this.canvasReadings) return 'Reading…';",
    tests: [WIRED, MODEL],
  },
  {
    name: 'the note stays silent about a divergence it was handed',
    file: 'app/renderer/src/canvas.ts',
    find: '  if (value.diverged) {',
    replace: '  if (false) {',
    tests: [WIRED],
  },
  {
    name: 'the note claims agreement without naming the file it compared against',
    file: 'app/renderer/src/canvas.ts',
    find: "export const DIALPLAN_FILE = '/etc/asterisk/extensions.conf';",
    replace: "export const DIALPLAN_FILE = 'the configuration file';",
    tests: [WIRED],
  },
  {
    name: 'the note stops naming the contexts the file declares that are not loaded',
    file: 'app/renderer/src/canvas.ts',
    find: '    if (value.inFileNotLoaded.length > 0) {',
    replace: '    if (false) {',
    tests: [WIRED],
  },
  {
    name: 'the note stops naming the contexts loaded from a file that no longer declares them',
    file: 'app/renderer/src/canvas.ts',
    find: '    if (value.loadedNotInFile.length > 0) {',
    replace: '    if (false) {',
    tests: [WIRED],
  },
  {
    name: 'the note stops accounting for the contexts another module created',
    file: 'app/renderer/src/canvas.ts',
    find: '  if (value.loadedFromOtherRegistrarsCount > 0) {',
    replace: '  if (false) {',
    tests: [WIRED],
  },
  {
    name: 'the note reports a failed comparison as though it had been made',
    file: 'app/renderer/src/canvas.ts',
    find: '  if (reading.state !== \'available\') {',
    replace: '  if (false) {',
    tests: [WIRED],
  },
  {
    name: 'the note repeats a failed dialplan reading as a second, different failure',
    file: 'app/renderer/src/canvas.ts',
    find: "  if (readings?.dialplan && readings.dialplan.result.state !== 'available') return '';",
    replace: '',
    tests: [WIRED],
  },
  {
    name: 'the note stops saying its own comparison came up short of the command’s count',
    file: 'app/renderer/src/canvas.ts',
    find: '  if (value.loadedContextsReported !== undefined && value.loadedContextsReported !== value.loadedContextsParsed) {',
    replace: '  if (false) {',
    tests: [WIRED],
  },
  {
    name: 'the note claims a shortfall whenever the command printed a total',
    file: 'app/renderer/src/canvas.ts',
    find: '  if (value.loadedContextsReported !== undefined && value.loadedContextsReported !== value.loadedContextsParsed) {',
    replace: '  if (value.loadedContextsReported !== undefined) {',
    tests: [WIRED],
  },
];

/**
 * Every `find`/`replace` above is written with `\n`, and parts of this checkout are stored
 * with CRLF. A multi-line needle written with `\n` matches nothing in a CRLF file, so the
 * break silently never lands -- which reads exactly like a guard that passed.
 */
function forFile(source, text) {
  return source.includes('\r\n') ? text.replace(/\n/gu, '\r\n') : text;
}

function run(tests) {
  const result = spawnSync('npx', ['tsx', '--test', ...tests], {
    cwd: root, encoding: 'utf8', shell: process.platform === 'win32',
  });
  return result.status ?? 1;
}

let failures = 0;
for (const breakage of BREAKS) {
  const path = resolve(root, breakage.file);
  const original = readFileSync(path, 'utf8');
  const find = forFile(original, breakage.find);
  if (!original.includes(find)) {
    console.error(`SKIPPED-AS-FAILURE: ${breakage.name}\n  the text this break edits is not in ${breakage.file} any more, so the break would never land`);
    failures += 1;
    continue;
  }
  const broken = original.replace(find, forFile(original, breakage.replace));
  if (broken === original) {
    console.error(`SKIPPED-AS-FAILURE: ${breakage.name}\n  the replacement changed nothing in ${breakage.file}`);
    failures += 1;
    continue;
  }
  writeFileSync(path, broken);
  const redStatus = run(breakage.tests);
  writeFileSync(path, original);
  if (readFileSync(path, 'utf8') !== original) {
    console.error(`FATAL: ${breakage.file} was not restored byte-for-byte; stop and check the tree`);
    process.exit(2);
  }
  if (redStatus === 0) {
    console.error(`FAILED (stayed green): ${breakage.name}`);
    failures += 1;
    continue;
  }
  console.log(`red then restored: ${breakage.name}`);
}

if (failures > 0) {
  console.error(`\n${failures} of ${BREAKS.length} break(s) did not turn the tests red.`);
  process.exit(1);
}
console.log(`\nall ${BREAKS.length} breaks turned their tests red and restored green.`);
