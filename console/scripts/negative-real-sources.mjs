#!/usr/bin/env node
/**
 * Deliberate red-then-green regression for the three surfaces wired to real sources:
 * History, the agent rail, and Trunk authentication.
 *
 * Each break below removes exactly ONE guarded thing, runs the tests that are supposed to
 * notice, and requires them to fail; then restores it and requires them to pass. Breaking
 * several at once proves only that *something* among them is watched, which is how a
 * wiring line ends up with nothing watching it at all while the pass count looks identical
 * either way.
 *
 * Two traps this deliberately guards itself against:
 *
 *  - **A break that never landed.** Every replacement asserts the file's bytes actually
 *    changed. An edit that matched nothing reports success and changes nothing, and "no
 *    effect" then looks exactly like a passing guard.
 *  - **A restore that never landed.** Every restore asserts the file is byte-identical to
 *    what it was before, so a later break cannot run against a tree the previous one left
 *    damaged.
 *
 * Several breaks below comment the guarded line out rather than deleting it, because a
 * commented-out call is the way a wiring line usually dies and a substring needle is
 * perfectly happy with one.
 *
 *     node console/scripts/negative-real-sources.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const WIRED = 'tests/ui/real-sources-wired.test.tsx';
const AUTHS = 'tests/control-plane/pjsip-auths.test.ts';

/** @type {Array<{name: string, file: string, find: string, replace: string, tests: string[]}>} */
const BREAKS = [
  {
    name: 'the agent rail loses one of its seven source records',
    file: 'app/renderer/src/agent-rail.ts',
    find: "  secrets: {\n    kind: 'no-store',",
    replace: "  removedOnPurpose: {\n    kind: 'no-store',",
    tests: [WIRED],
  },
  {
    name: 'an agent-rail screen falls back to the PBX "no target is connected" branch',
    file: 'app/renderer/src/App.tsx',
    find: '    if (isAgentRailScreen(screen)) return this.agentRailNote(screen);',
    replace: '    // if (isAgentRailScreen(screen)) return this.agentRailNote(screen);',
    tests: [WIRED],
  },
  {
    name: 'an agent-rail screen stops carrying its own recorded reason',
    file: 'app/renderer/src/App.tsx',
    find: "    return AGENT_RAIL_SOURCES[screen].reason;",
    replace: "    return '';",
    tests: [WIRED],
  },
  {
    name: 'the Operations table stops reading the bundled release history',
    file: 'app/renderer/src/App.tsx',
    find: "            : id === 'ops'\n              ? this.releaseRows()",
    replace: "            : id === 'ops'\n              ? []",
    tests: [WIRED],
  },
  {
    name: 'the Operations table claims every tag was published',
    file: 'app/renderer/src/agent-rail.ts',
    find: '    entry.date,\n    NOT_READ,\n    NOT_READ,\n    NOT_READ,\n  ]);',
    replace: "    entry.date,\n    NOT_READ,\n    NOT_READ,\n    'Published',\n  ]);",
    tests: [WIRED],
  },
  {
    name: 'the release limit the Operations screen quotes drifts from the bundler’s own',
    file: 'app/renderer/src/agent-rail.ts',
    find: 'export const BUNDLED_RELEASE_LIMIT = 20;',
    replace: 'export const BUNDLED_RELEASE_LIMIT = 25;',
    tests: [WIRED],
  },
  {
    name: 'the trunk-authentication sentence stops bounding how many objects it lists',
    file: 'app/renderer/src/trunk-auth.ts',
    find: 'export const MAX_LISTED_AUTHS = 8;',
    replace: 'export const MAX_LISTED_AUTHS = 1000;',
    tests: [WIRED],
  },
  {
    name: 'the vocabulary screen stops saying why its terms are not tabulated',
    file: 'app/renderer/src/agent-rail.ts',
    find: "      + 'private vocabulary must never reach an export or the clipboard — so the loaded state is reported here '",
    replace: "      + 'they are simply not shown — so the loaded state is reported here '",
    tests: [WIRED],
  },
  {
    name: 'the trunk-authentication reading is dropped on the way to the screen',
    file: 'app/renderer/src/App.tsx',
    find: "    if (screen === 'trunkauth') return trunkAuthNote(this.readings.trunkauth, this.target.connected, this.target.detail);",
    replace: "    // if (screen === 'trunkauth') return trunkAuthNote(this.readings.trunkauth, this.target.connected, this.target.detail);",
    tests: [WIRED],
  },
  {
    name: 'a target with no authentication object is reported as nothing at all',
    file: 'app/renderer/src/trunk-auth.ts',
    find: '    return `${authReading.command} reported no PJSIP authentication object on this target, so no trunk here authenticates with one.`;',
    replace: "    return '';",
    tests: [WIRED],
  },
  {
    name: 'a failed authentication read stops carrying the target’s own reason',
    file: 'app/renderer/src/trunk-auth.ts',
    find: '    return `The target\'s PJSIP authentication objects could not be read (${authReading.command}): ${authReading.result.reason}`;',
    replace: "    return 'The target\\'s PJSIP authentication objects could not be read.';",
    tests: [WIRED],
  },
  {
    name: 'the disconnected trunk-authentication screen blames the missing target alone',
    file: 'app/renderer/src/trunk-auth.ts',
    find: '    return `${NO_PARTNER_CHANNEL} No target is connected either — ${targetDetail} — so this target\'s own trunk authentication has not been read.`;',
    replace: '    return `No target is connected — ${targetDetail}.`;',
    tests: [WIRED],
  },
  {
    name: 'auth objects are rendered into the design’s answer-history grid',
    file: 'app/renderer/src/App.tsx',
    find: "      ...(screen === 'trunkauth' ? { authRequests: [], authHistory: [] } : {}),",
    replace: "      ...(screen === 'trunkauth' ? { authRequests: [], authHistory: (valueOf(this.readings.trunkauth?.auths) ?? []).map((a) => ({ partner: a.id })) } : {}),",
    tests: [WIRED],
  },
  {
    name: 'the History screen stops reading the console’s own local history store',
    file: 'app/renderer/src/App.tsx',
    find: "      const response = await this.request('local-history.list', {});",
    replace: "      const response = undefined; // await this.request('local-history.list', {});",
    tests: [WIRED],
  },
  {
    name: 'the History screen conflates "not read yet" with "read and empty"',
    file: 'app/renderer/src/App.tsx',
    find: '      if (this.historyReading === undefined) return NO_HISTORY;',
    replace: '      if (this.historyReading === undefined) return HISTORY_EMPTY;',
    tests: [WIRED],
  },
  {
    name: 'the dispatcher stops routing the trunkauth view to the auth reading',
    file: 'control-plane/dispatch.ts',
    find: "    if (view === 'trunkauth') {",
    replace: "    if (false && view === 'trunkauth') {",
    tests: [AUTHS],
  },
  {
    name: 'trunkauth stops being a readable view, so the renderer never asks for it',
    file: 'app/renderer/src/readings.ts',
    find: "  'trunkauth', 'restbrowser', 'agiscripts',\n];",
    replace: "  'restbrowser', 'agiscripts',\n];",
    tests: [AUTHS],
  },
  {
    name: 'the command that prints an auth password is added to the object allowlist',
    file: 'control-plane/asterisk-readings.ts',
    find: 'export const READ_ONLY_OBJECT_COMMANDS = ["pjsip show endpoint"] as const;',
    replace: 'export const READ_ONLY_OBJECT_COMMANDS = ["pjsip show endpoint", "pjsip show auth"] as const;',
    tests: [AUTHS],
  },
  {
    name: 'the auth parser reads the header line as an auth object',
    file: 'control-plane/asterisk-readings.ts',
    find: '    if (/[<>]/u.test(line)) continue;\n    const match = /^\\s*Auth:\\s{2,}([^/\\s]+)\\/(\\S*)\\s*$/u.exec(line);',
    replace: '    const match = /^\\s*(?:I\\/O)?Auth:\\s{2,}(\\S*?)\\/(\\S*)\\s*$/u.exec(line);',
    tests: [AUTHS],
  },
];

/**
 * Every `find`/`replace` above is written with `\n`, and parts of this checkout are stored
 * with CRLF. A multi-line needle written with `\n` matches nothing in a CRLF file, so the
 * break silently never lands — which reads exactly like a guard that passed. Three of the
 * seventeen breaks below did precisely that on the first run; the "did the edit change the
 * bytes" assertion is what caught it, and this is the repair.
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
  console.error(`\n${failures} of ${BREAKS.length} planted break(s) were not noticed.`);
  process.exit(1);
}

const greenStatus = run([WIRED, AUTHS]);
if (greenStatus !== 0) {
  console.error('\nThe restored tree does not pass; the restores above did not put it back.');
  process.exit(1);
}
console.log(`\nAll ${BREAKS.length} planted breaks turned red, and the restored tree is green.`);
