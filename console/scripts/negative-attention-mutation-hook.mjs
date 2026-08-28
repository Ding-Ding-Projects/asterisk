#!/usr/bin/env node
/**
 * Deliberate red-then-green regression for the compiled shell's mutation hook.
 *
 * The defect this guards is a method that was called and declared nowhere.
 * `scripts/extend-pbx-m3.mjs` injects
 * `this.onUserMutation('control:' + (c.id || 'unknown'))` into the compiled shell's value
 * writer, inside the callback React runs once the state write has committed. No class
 * declared `onUserMutation`, so every accepted control value in the packaged console
 * threw `TypeError: this.onUserMutation is not a function`.
 *
 * Four thousand tests did not see it, for two reasons that are each sufficient on their
 * own and both worth guarding:
 *
 *   - the only test covering that call assigned its own `onUserMutation` onto the shell
 *     first, so it proved the shell in isolation and nothing about the seam;
 *   - every harness driving the real `App` stubbed `enqueueSetState` and dropped its
 *     `callback` argument, which is the only place the call runs.
 *
 * The inventory that should have caught it could not. `verifyAttentionWiring` searched the
 * compiled renderer for the literal `action: 'set', key: 'canvasTool', state: 'canvasTool'`
 * -- an object shape present in no commit of that file, ever -- so it reported a gap it
 * could not close, and it sat behind `verify-inventories.mjs`, which was refusing the site
 * registry's schema long before it reached here.
 *
 * Each break below removes exactly ONE guarded thing, runs the checks that are supposed to
 * notice, and requires them to fail; then restores it and requires them to pass. Breaking
 * several at once proves only that *something* among them is watched.
 *
 * Two traps this guards itself against, both of which have cost this repository real time:
 *
 *  - **A break that never landed.** Every replacement asserts the bytes actually changed.
 *    An edit that matched nothing reports success and changes nothing, and "no effect"
 *    then reads exactly like a passing guard.
 *  - **A restore that never landed.** Every restore asserts the file is byte-identical to
 *    what it was before, so a later break cannot run against a tree an earlier one damaged.
 *
 *     node console/scripts/negative-attention-mutation-hook.mjs
 */
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const WIRED = 'tests/ui/attention-mutation-hook-wired.test.tsx';
const INVENTORY = 'attention-inventory --check';
/* The verifier's own checks cannot guard their own deletion: removing the loop that
 * requires the subclass hook leaves the verifier passing on a tree with no hook at all.
 * So the breaks that empty a check are watched by the contract file that feeds the
 * verifier damaged sources and requires it to refuse. */
const GUARD = 'tests/contracts/attention-modes.test.mjs';

/** @type {Array<{name: string, file: string, find: string, replace: string, tests: string[]}>} */
const BREAKS = [
  /* --- the crash itself ---------------------------------------------------------- */
  {
    name: 'the subclass stops declaring the method the compiled shell calls -- the original defect',
    file: 'app/renderer/src/App.tsx',
    find: "  onUserMutation = (_source: string = 'unknown'): void => {",
    replace: "  private unusedMutationHook = (_source: string = 'unknown'): void => {",
    tests: [WIRED, INVENTORY],
  },
  {
    name: 'the method exists but stops moving the clock, so "Last change" freezes',
    file: 'app/renderer/src/App.tsx',
    find: "  onUserMutation = (_source: string = 'unknown'): void => {\n    this.lastChangeAt = Date.now();\n  };",
    replace: "  onUserMutation = (_source: string = 'unknown'): void => {\n  };",
    tests: [WIRED],
  },
  {
    name: 'the compiled shell stops reporting an accepted control value',
    file: 'app/renderer/src/generated/console.tsx',
    find: "      this.onUserMutation('control:' + (c.id || 'unknown'));",
    replace: '',
    tests: [WIRED, INVENTORY],
  },

  /* --- the twelve keys written through set() -------------------------------------- */
  {
    name: 'the set() interceptor stops reporting a real change',
    file: 'app/renderer/src/App.tsx',
    find: "    if (changed) this.onUserMutation('set:' + key);",
    replace: '',
    tests: [WIRED, INVENTORY],
  },
  {
    name: 'the reported source stops naming the key, so every mutation looks like the same one',
    file: 'app/renderer/src/App.tsx',
    find: "    if (changed) this.onUserMutation('set:' + key);",
    replace: "    if (changed) this.onUserMutation('set');",
    tests: [WIRED, INVENTORY],
  },
  {
    name: 'the set() interceptor is commented out rather than deleted, which a substring needle would wave through',
    file: 'app/renderer/src/App.tsx',
    find: "    if (changed) this.onUserMutation('set:' + key);",
    replace: "    // if (changed) this.onUserMutation('set:' + key);",
    tests: [WIRED, INVENTORY, GUARD],
  },
  {
    name: 'the key list stops being consulted, so navigation starts counting as a mutation',
    file: 'app/renderer/src/App.tsx',
    find: '    const changed = App.SET_MUTATION_KEYS.has(key)\n      && !Object.is((this.state as unknown as Record<string, unknown>)[key], value);',
    replace: '    const changed = !Object.is((this.state as unknown as Record<string, unknown>)[key], value);',
    tests: [WIRED, INVENTORY],
  },
  {
    name: 'the unchanged-value comparison goes, so pressing the same button resets the idle clock',
    file: 'app/renderer/src/App.tsx',
    find: '    const changed = App.SET_MUTATION_KEYS.has(key)\n      && !Object.is((this.state as unknown as Record<string, unknown>)[key], value);',
    replace: '    const changed = App.SET_MUTATION_KEYS.has(key);',
    tests: [WIRED],
  },
  {
    name: 'the key list is hand-restated instead of built from the inventory, so the two can drift',
    file: 'app/renderer/src/App.tsx',
    find: "    ATTENTION_MUTATION_ACTIONS.filter((action) => action.action === 'set').map((action) => action.key),",
    replace: "    ['canvasTool', 'grid', 'snap', 'guides', 'minimap', 'layer', 'zoom', 'pinned', 'dock', 'fullscreen', 'branch', 'sortList'],",
    tests: [INVENTORY],
  },
  {
    name: 'a key is dropped from the inventory, so one canvas toggle silently stops counting',
    file: 'app/renderer/src/attention-inventory.ts',
    find: "  { action:'set', key:'minimap', state:'minimap', generatedMutation:\"label:'Minimap', k:'minimap'\" },\n",
    replace: '',
    tests: [WIRED],
  },
  {
    name: 'a key is renamed to one the shell never writes, so the inventory names a control nobody has',
    file: 'app/renderer/src/attention-inventory.ts',
    find: "  { action:'set', key:'branch', state:'branch', generatedMutation:\"this.set('branch'\" },",
    replace: "  { action:'set', key:'branchX', state:'branchX', generatedMutation:\"this.set('branchX'\" },",
    tests: [INVENTORY],
  },
  {
    name: 'the shell stops writing a key the inventory still claims it writes',
    file: 'app/renderer/src/generated/console.tsx',
    find: "this.set('fullscreen'",
    replace: "this.setFullscreenRemoved(",
    tests: [INVENTORY],
  },
  {
    name: 'the computed-key toggle dispatch goes, taking grid, snap, guides and minimap with it',
    file: 'app/renderer/src/generated/console.tsx',
    find: 'pick:() => this.set(t.k, !s[t.k])',
    replace: 'pick:() => undefined',
    tests: [INVENTORY],
  },

  /* --- the guard's own honesty ----------------------------------------------------- */
  {
    name: 'the wiring check stops requiring the subclass half of the contract at all',
    file: 'app/renderer/src/attention-modes.ts',
    find: "  for (const hook of ATTENTION_MUTATION_HOOK_MARKERS) exactOwnedLineMarker(sources, hook, 'attention mutation hook');",
    replace: '',
    tests: [GUARD],
  },
  {
    name: 'the per-key reachability check stops running, so a key can vanish from the shell unnoticed',
    file: 'app/renderer/src/attention-modes.ts',
    find: '    if (sources.generated.split(action.generatedMutation).length - 1 < 1) {',
    replace: '    if (false && sources.generated.split(action.generatedMutation).length - 1 < 1) {',
    tests: [GUARD],
  },
  {
    name: 'the duplicate-key check goes, so one key could stand in for another',
    file: 'app/renderer/src/attention-modes.ts',
    find: "  if (new Set(setKeys).size !== setKeys.length) throw new Error('Duplicate attention mutation key.');",
    replace: '',
    tests: [GUARD],
  },

  /* --- the harness blind spot that hid all of it ------------------------------------ */
  {
    name: "the test harness drops React's commit callback again, which is what hid the crash",
    file: WIRED,
    find: '      callback?.();',
    replace: '',
    tests: [WIRED],
  },
];

function forFile(source, text) {
  return source.includes('\r\n') ? text.replace(/\n/gu, '\r\n') : text;
}

/* The inventory check runs the real verifier against the real files on disk, the same way
 * verify-inventories.mjs does, rather than re-implementing what it checks. It is written to
 * a scratch module because the verifier is TypeScript and takes its sources as arguments. */
const CHECK_SOURCE = `
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { verifyAttentionWiring } from ${JSON.stringify(pathToFileURL(resolve(root, 'app/renderer/src/attention-modes.ts')).href)};
const repo = resolve(${JSON.stringify(root)}, '..');
const read = (path) => readFileSync(resolve(repo, path), 'utf8').replace(/\\r\\n|\\r/g, '\\n');
verifyAttentionWiring({
  design: read('design/Asterisk Console M3.dc.html'),
  app: read('console/app/renderer/src/App.tsx'),
  generated: read('console/app/renderer/src/generated/console.tsx'),
  module: read('console/app/renderer/src/attention-modes.ts'),
});
console.log('PASS: attention wiring');
`;

function run(tests) {
  if (tests.length === 1 && tests[0] === INVENTORY) {
    const scratch = resolve(root, '.attention-mutation-check.mjs');
    writeFileSync(scratch, CHECK_SOURCE);
    try {
      const result = spawnSync('npx', ['tsx', scratch], {
        cwd: root, encoding: 'utf8', shell: process.platform === 'win32',
      });
      return result.status ?? 1;
    } finally {
      rmSync(scratch, { force: true });
    }
  }
  /* Everything here runs under tsx: these are .tsx files importing TypeScript sources that
   * plain `node --test` cannot resolve, and a module-resolution failure is a non-zero exit,
   * which this script would read as the break having turned the test red. A red for the
   * wrong reason is worse than a green, because it reports a guard as watched when the
   * guard never ran at all. */
  const result = spawnSync('npx', ['tsx', '--test', ...tests], {
    cwd: root, encoding: 'utf8', shell: process.platform === 'win32',
  });
  return result.status ?? 1;
}

/* Every distinct target, proved green before a single break is planted. Without this a
 * break can be reported as watched when the check was already failing, or failing for a
 * reason that has nothing to do with the break. That is the worst outcome available here,
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
  /* Each listed check is run on its own and each must go red. A break that reddens one
   * check while another stays green is a break only one of them is watching, and the
   * report has to say which -- so they are never run as one batch. */
  let redEverywhere = true;
  const stayedGreen = [];
  for (const target of breakage.tests) {
    if (run([target]) === 0) { redEverywhere = false; stayedGreen.push(target); }
  }
  writeFileSync(path, original);
  if (readFileSync(path, 'utf8') !== original) {
    console.error(`FATAL: ${breakage.file} was not restored byte-for-byte; stop and check the tree`);
    process.exit(2);
  }
  if (!redEverywhere) {
    console.error(`FAILED (stayed green in ${stayedGreen.join(', ')}): ${breakage.name}`);
    failures += 1;
    continue;
  }
  console.log(`red then restored: ${breakage.name}`);
}

if (failures > 0) {
  console.error(`\n${failures} of ${BREAKS.length} break(s) did not turn their checks red.`);
  process.exit(1);
}
console.log(`\nall ${BREAKS.length} breaks turned their checks red and restored green.`);
