#!/usr/bin/env node
/**
 * Deliberate red-then-green regression for the media cache reading.
 *
 * The defect this guards is an allowlist entry that could never produce a reading. The bare
 * `media cache show` is the *singular* CLI entry (`main/media_cache.c` line 528): it refuses
 * any argc but 4 and reads its subject from `a->argv[3]`, so allowlisted with no argument it
 * only ever answered `Usage: media cache show <uri>` -- with exit code 0, which
 * `AsteriskReadings` does not divert on, so the usage line reached a screen as data. It sat
 * there for the whole life of the allowlist and nothing noticed, because nothing read it.
 *
 * So the guards come in two halves and both matter. One half holds the command and the
 * parser; the other holds the fact that a screen actually renders the result, which is the
 * half that would have caught the original defect and the half this repository keeps
 * losing -- wired at one end, consumed at neither.
 *
 * Each break below removes exactly ONE guarded thing, runs the tests that are supposed to
 * notice, and requires them to fail; then restores it and requires them to pass. Breaking
 * several at once proves only that *something* among them is watched.
 *
 * Two traps this guards itself against, both of which have cost this repository real time:
 *
 *  - **A break that never landed.** Every replacement asserts the file's bytes actually
 *    changed. An edit that matched nothing reports success and changes nothing, and "no
 *    effect" then reads exactly like a passing guard.
 *  - **A restore that never landed.** Every restore asserts the file is byte-identical to
 *    what it was before, so a later break cannot run against a tree an earlier one damaged.
 *
 *     node console/scripts/negative-media-cache.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const WIRED = 'tests/ui/media-cache-wired.test.tsx';
const PARSER = 'tests/control-plane/media-cache.test.ts';

/** @type {Array<{name: string, file: string, find: string, replace: string, tests: string[]}>} */
const BREAKS = [
  {
    name: 'the allowlist goes back to the singular form, which can never produce a reading',
    file: 'control-plane/asterisk-readings.ts',
    find: '"core show translation", "core show file formats", "media cache show all",',
    replace: '"core show translation", "core show file formats", "media cache show",',
    tests: [PARSER],
  },
  {
    name: 'the singular form becomes an object command, widening OBJECT_ID to admit a URI',
    file: 'control-plane/asterisk-readings.ts',
    find: 'export const READ_ONLY_OBJECT_COMMANDS = ["pjsip show endpoint"] as const;',
    replace: 'export const READ_ONLY_OBJECT_COMMANDS = ["pjsip show endpoint", "media cache show"] as const;',
    tests: [PARSER],
  },
  {
    name: 'the parser stops requiring the separator, so the header becomes an item',
    file: 'control-plane/asterisk-parsers.ts',
    find: '  if (separator === -1) return { items, dropped };',
    replace: '  if (separator === -2) return { items, dropped };',
    tests: [PARSER],
  },
  {
    name: 'the parser stops taking the format’s own padding off a value',
    file: 'control-plane/asterisk-parsers.ts',
    find: '    const uri = line.trimEnd();',
    replace: '    const uri = line;',
    tests: [PARSER],
  },
  {
    name: 'the parser stops recording a URI line whose local file never arrived',
    file: 'control-plane/asterisk-parsers.ts',
    find: '    if (next === undefined || !next.startsWith("\\t")) {\n      dropped.push(line);\n      continue;\n    }',
    replace: '    if (next === undefined || !next.startsWith("\\t")) {\n      continue;\n    }',
    tests: [PARSER],
  },
  {
    name: 'the parser stops recording a continuation line it could not attribute to a URI',
    file: 'control-plane/asterisk-parsers.ts',
    find: '    if (line.startsWith("\\t")) {\n      dropped.push(line);\n      continue;\n    }',
    replace: '    if (line.startsWith("\\t")) {\n      continue;\n    }',
    tests: [PARSER],
  },
  {
    name: 'the parser goes back to the shared line helper, which erases a blank local file',
    file: 'control-plane/asterisk-parsers.ts',
    find: '  const all = stdout.replace(/\\r\\n/gu, "\\n").split("\\n");',
    replace: '  const all = lines(stdout);',
    tests: [PARSER],
  },
  {
    name: 'the dispatcher stops reading the cache, so the Music on Hold screen never receives one',
    file: 'control-plane/dispatch.ts',
    find: "        read('media cache show all', parseMediaCacheItems),",
    replace: "        read('moh show classes', parseMohClasses),",
    tests: [PARSER],
  },
  {
    name: 'the screen stops appending the sentence, so the reading is taken and dropped',
    file: 'app/renderer/src/App.tsx',
    find: '${this.droppedRowsNote(screen)}${this.mediaCacheSentence(screen)}`;',
    replace: '${this.droppedRowsNote(screen)}`;',
    tests: [WIRED],
  },
  {
    name: 'the note goes silent when the cache is empty, so empty and unread render alike',
    file: 'app/renderer/src/readings.ts',
    find: "  if (items.length === 0) {\n    return `This target's media cache is empty",
    replace: "  if (items.length === 0) {\n    return ``; return `This target's media cache is empty",
    tests: [WIRED],
  },
  {
    name: 'the note stops reporting a reading that failed',
    file: 'app/renderer/src/readings.ts',
    find: "  if (reading.result.state === 'unavailable') {\n    return `This target's media cache could not be read: ${reading.result.reason}`;\n  }",
    replace: "  if (reading.result.state === 'unavailable') {\n    return '';\n  }",
    tests: [WIRED],
  },
  {
    name: 'the note stops distinguishing cached media from the music-on-hold classes beside it',
    file: 'app/renderer/src/readings.ts',
    find: '— media Asterisk fetched from a URI itself, not the music-on-hold classes below: ',
    replace: '— cached media: ',
    tests: [WIRED],
  },
  {
    name: 'the note stops reporting lines the listing lost',
    file: 'app/renderer/src/readings.ts',
    find: '  const declined = dropped.length === 0',
    replace: '  const declined = true || dropped.length === 0',
    tests: [WIRED],
  },
  {
    name: 'the note speaks for a screen that never took the reading at all',
    file: 'app/renderer/src/readings.ts',
    find: "export function mediaCacheNote(reading: ViewReadings['mediaCacheItems']): string {\n  if (!reading) return '';",
    replace: "export function mediaCacheNote(reading: ViewReadings['mediaCacheItems']): string {\n  if (!reading) return `This target's media cache is empty`;",
    tests: [WIRED],
  },
  {
    name: 'the ledger loses the capture for the command allowlisted after the run',
    file: 'release/evidence/live-exchange/readings.json',
    find: '"commandsAllowlistedAfterThisRun"',
    replace: '"commandsAllowlistedAfterThisRunDisabled"',
    tests: ['live-readings --check'],
  },
  {
    name: 'the ledger claims a restore that its own committed bytes do not show',
    file: 'release/evidence/live-exchange/readings/added/media-cache-show-all.after-restore.txt',
    find: 'URI',
    replace: 'URI TAMPERED',
    tests: ['live-readings --check'],
  },
  {
    name: 'the separately-run section grows a row for a command the phases already cover',
    file: 'release/evidence/live-exchange/readings.json',
    find: '      "command": "media cache show all",',
    replace: '      "command": "core show version",',
    /* The coverage check would still pass with redundant rows piled into this section, and a
     * real gap could then hide behind them, so both directions are asserted. This also
     * exercises the `is not declared` branch, which is the neighbour of the stale-command
     * branch below and fails for a different reason. */
    tests: ['tests/live/live-readings.test.mjs'],
  },
  {
    name: 'a separately-run capture is left on disk while its record stops naming it',
    file: 'release/evidence/live-exchange/readings.json',
    find: '          "path": "added/media-cache-show-all.populated.txt",',
    replace: '          "path": "added/media-cache-show-all.populated-renamed.txt",',
    /* The orphan check was widened to know about `added/`, and a widened check is exactly the
     * kind that goes vacuous. This proves it still notices a capture nothing accounts for. */
    tests: ['tests/live/live-readings.test.mjs'],
  },
  {
    name: 'the harness stops refusing a populate that changed nothing',
    file: 'scripts/live-readings.mjs',
    find: '      if (captures.populated.stdoutSha256 === captures.unpopulated.stdoutSha256) {',
    replace: '      if (false && captures.populated.stdoutSha256 === captures.unpopulated.stdoutSha256) {',
    tests: ['tests/live/live-readings-added.test.mjs'],
  },
  {
    name: 'the check stops refusing a record for a command no longer in the allowlist',
    file: 'scripts/live-readings.mjs',
    find: '    if (!allowlisted.has(record.command)) {',
    replace: '    if (false && !allowlisted.has(record.command)) {',
    tests: ['tests/live/live-readings-added.test.mjs'],
  },
];

function forFile(source, text) {
  return source.includes('\r\n') ? text.replace(/\n/gu, '\r\n') : text;
}

function run(tests) {
  if (tests.length === 1 && tests[0] === 'live-readings --check') {
    const result = spawnSync('npx', ['tsx', 'scripts/live-readings.mjs', '--check'], {
      cwd: root, encoding: 'utf8', shell: process.platform === 'win32',
    });
    return result.status ?? 1;
  }
  /* Everything here runs under tsx, including the `.mjs` files. They import the control
   * plane through `.js` specifiers that only tsx resolves, so plain `node --test` fails on
   * them with ERR_MODULE_NOT_FOUND -- which is a non-zero exit, which this script would
   * read as the break having turned the test red. A red for the wrong reason is worse than
   * a green: it reports a guard as watched when the guard never ran at all. */
  const result = spawnSync('npx', ['tsx', '--test', ...tests], {
    cwd: root, encoding: 'utf8', shell: process.platform === 'win32',
  });
  return result.status ?? 1;
}

/* Every distinct target, proved green before a single break is planted.
 *
 * Without this a break can be reported as watched when the test was already failing, or
 * failing for a reason that has nothing to do with the break -- a missing module, a bad
 * import, a runner that cannot load the file. That is the worst outcome available here,
 * because it reads exactly like a guard doing its job. */
const targets = [...new Set(BREAKS.flatMap((breakage) => breakage.tests))].sort();
for (const target of targets) {
  if (run([target]) !== 0) {
    console.error(`FATAL: ${target} is not green before any break was planted; fix that first`);
    process.exit(2);
  }
}
console.log(`green before any break: ${targets.join(', ')}\n`);

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
