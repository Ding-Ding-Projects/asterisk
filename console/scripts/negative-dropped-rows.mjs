#!/usr/bin/env node
/**
 * Deliberate red-then-green regression for the sentence a screen says when its table is
 * short of rows the target really has.
 *
 * The defect this guards is the quietest kind there is. `parseVoicemailUsers` drops a row
 * it cannot assign to columns -- which is right, because filing a real mailbox under the
 * wrong context is worse than omitting it -- and hands the target's own trailer count back
 * beside the shortened list. Both screens rendered the list and threw the count away, so a
 * Voicemail screen showing three of four mailboxes looked exactly like one showing all
 * four. Nothing failed, nothing logged, and the only way to notice was to run the command
 * by hand and count.
 *
 * Each break below removes exactly ONE guarded thing, runs the tests that are supposed to
 * notice, and requires them to fail; then restores it and requires them to pass. Breaking
 * several at once proves only that *something* among them is watched, which is how the
 * count ended up unread in the first place while every parser test stayed green.
 *
 * Two traps this guards itself against, both of which have cost this repository real time:
 *
 *  - **A break that never landed.** Every replacement asserts the file's bytes actually
 *    changed. An edit that matched nothing reports success and changes nothing, and "no
 *    effect" then reads exactly like a passing guard.
 *  - **A restore that never landed.** Every restore asserts the file is byte-identical to
 *    what it was before, so a later break cannot run against a tree an earlier one damaged.
 *
 *     node console/scripts/negative-dropped-rows.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const WIRED = 'tests/ui/dropped-rows-wired.test.tsx';
const NOTE = 'tests/ui/readings.test.tsx';
const PARSERS = 'tests/control-plane/asterisk-parsers.test.ts';
const LEDGER = 'tests/live/live-readings.test.mjs';

/** @type {Array<{name: string, file: string, find: string, replace: string, tests: string[]}>} */
const BREAKS = [
  {
    name: 'the parser stops recording a row whose columns it could not assign',
    file: 'control-plane/asterisk-parsers.ts',
    find: '    if (line.length < 54 || line[10] !== " " || line[16] !== " " || line[42] !== " " || line[53] !== " ") {\n      dropped.push(line);\n      continue;\n    }',
    replace: '    if (line.length < 54 || line[10] !== " " || line[16] !== " " || line[42] !== " " || line[53] !== " ") {\n      continue;\n    }',
    tests: [PARSERS, LEDGER],
  },
  {
    name: 'the parser stops recording a row it dropped for having no context or mailbox',
    file: 'control-plane/asterisk-parsers.ts',
    find: '    if (!context || !mailbox) {\n      dropped.push(line);\n      continue;\n    }',
    replace: '    if (!context || !mailbox) {\n      continue;\n    }',
    tests: [PARSERS],
  },
  {
    name: 'the note builder goes silent, so no screen can say a row is missing',
    file: 'app/renderer/src/readings.ts',
    find: 'export function droppedRowNote(shortfall: RowShortfall): string {\n  const dropped = shortfall.dropped ?? [];',
    replace: 'export function droppedRowNote(shortfall: RowShortfall): string {\n  if (shortfall) return \'\';\n  const dropped = shortfall.dropped ?? [];',
    tests: [WIRED, NOTE],
  },
  {
    name: 'the note counts the lines the parser refused instead of trusting the target’s trailer',
    file: 'app/renderer/src/readings.ts',
    find: '  const missing = shortfall.total === undefined ? dropped.length : shortfall.total - shortfall.parsed;',
    replace: '  const missing = dropped.length;',
    tests: [NOTE],
  },
  {
    name: 'the note stops being silent when the table is showing everything',
    file: 'app/renderer/src/readings.ts',
    find: '  if (missing <= 0) return \'\';',
    replace: '  if (missing < -1) return \'\';',
    tests: [WIRED, NOTE],
  },
  {
    name: 'the note stops naming the command a reader would have to run to check it',
    file: 'app/renderer/src/readings.ts',
    find: '  return ` ${head}: \\`${shortfall.command}\\` ${shortfall.reason}.${quotedDroppedLines(dropped)}`;',
    replace: '  return ` ${head}: ${shortfall.reason}.${quotedDroppedLines(dropped)}`;',
    tests: [NOTE],
  },
  {
    name: 'the note stops bounding how many unreadable lines it quotes',
    file: 'app/renderer/src/readings.ts',
    find: '    .slice(0, QUOTED_DROPPED_LINES)',
    replace: '    .slice(0)',
    tests: [NOTE],
  },
  {
    name: 'the Voicemail screen stops appending the shortfall to its file summary',
    file: 'app/renderer/src/App.tsx',
    find: '${this.endpointDetailNote(screen)}${this.droppedRowsNote(screen)}`;',
    replace: '${this.endpointDetailNote(screen)}`;',
    tests: [WIRED],
  },
  {
    name: 'a screen that is both short of rows and missing a reading reports only one of them',
    file: 'app/renderer/src/App.tsx',
    find: '    const sentences = this.readingShortfalls(screen);\n    return sentences.length === 0 ? \'\' : ` ${sentences.join(\' \')}`;',
    replace: '    const sentences = this.readingShortfalls(screen);\n    return sentences.length === 0 ? \'\' : ` ${sentences[0]}`;',
    tests: [WIRED],
  },
  {
    name: 'a shortfall claim buries the failed reading it sits beside',
    file: 'app/renderer/src/App.tsx',
    find: '    const sentences = this.readingShortfalls(screen);\n    return sentences.length === 0 ? \'\' : ` ${sentences.join(\' \')}`;',
    replace: '    const sentences = this.readingShortfalls(screen).slice().reverse();\n    return sentences.length === 0 ? \'\' : ` ${sentences[0]}`;',
    tests: [WIRED],
  },
  {
    name: 'the Voicemail screen stops naming a failed `voicemail show users`',
    file: 'app/renderer/src/App.tsx',
    find: '      const failed = reasonFor(readings, [\'voicemailUsers\']);\n      if (failed) return [`No mailboxes are listed because',
    replace: '      const failed = \'\';\n      if (failed) return [`No mailboxes are listed because',
    tests: [WIRED],
  },
  {
    name: 'the AMI screen stops naming a reading that never answered',
    file: 'app/renderer/src/App.tsx',
    find: '      const failed = reasonFor(readings, [\'managerUsers\', \'ariApps\']);',
    replace: '      const failed = \'\';',
    tests: [WIRED],
  },
  {
    name: 'the AMI screen stops noticing that `ari show apps` failed',
    file: 'app/renderer/src/App.tsx',
    find: '      const failed = reasonFor(readings, [\'managerUsers\', \'ariApps\']);',
    replace: '      const failed = reasonFor(readings, [\'managerUsers\']);',
    tests: [WIRED],
  },
  {
    name: 'the Voicemail screen stops passing the target’s trailer count to the note',
    file: 'app/renderer/src/App.tsx',
    find: '        parsed: value.users.length,\n        total: value.total,\n        dropped: value.dropped,',
    replace: '        parsed: value.users.length,\n        dropped: [],',
    tests: [WIRED],
  },
  {
    name: 'the AMI screen stops passing the target’s trailer count to the note',
    file: 'app/renderer/src/App.tsx',
    find: '          command: \'manager show users\',\n          unit: \'manager user\',\n          parsed: value.users.length,\n          total: value.total,',
    replace: '          command: \'manager show users\',\n          unit: \'manager user\',\n          parsed: value.users.length,',
    tests: [WIRED],
  },
  {
    name: 'the AMI screen invents a shortfall for a reading that never answered',
    file: 'app/renderer/src/App.tsx',
    find: '      const value = valueOf(readings.managerUsers);\n      if (value) {',
    replace: '      const value = valueOf(readings.managerUsers) ?? { users: [], total: 2 };\n      if (value) {',
    tests: [WIRED],
  },
  {
    name: '--reparse rewrites a live-half field it does not measure',
    file: 'scripts/live-readings.mjs',
    find: '      note(\'parser\', record.parser, parserNameOf(reading));',
    replace: '      delete phase.productionReaders;\n      note(\'parser\', record.parser, parserNameOf(reading));',
    tests: [LEDGER],
  },
  {
    name: '--reparse accepts a capture whose bytes no longer match the recorded hash',
    file: 'scripts/live-readings.mjs',
    find: '      if (record.capture && sha256(text) !== record.stdoutSha256) {',
    replace: '      if (false && record.capture && sha256(text) !== record.stdoutSha256) {',
    tests: [LEDGER],
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
