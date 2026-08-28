/**
 * The compiled shell calls methods it does not define, and nothing checked that anything did.
 *
 * `console/scripts/extend-pbx-m3.mjs` rewrites the compiled shell after `compile-design.mjs`
 * has produced it, and one of its rewrites inserts a call to a method the SUBCLASS is expected
 * to supply. That is a seam with a producer in a generated file and a consumer in a hand-written
 * one, which is this repository's oldest recurring defect: the feature-integration merge took an
 * `App.tsx` that never had the method, the injected call survived, and every accepted control
 * change in the built application reached "this.onUserMutation is not a function" from inside a
 * React state callback. Nothing failed at build time, nothing failed at type-check time -- the
 * call lives in a generated file the type-checker treats as its own class -- and no test looked.
 *
 * So this looks. The list is hand-written rather than parsed out of the injector, because a list
 * derived from the injector would agree with the injector by construction: a rewrite that stopped
 * injecting a call would also stop being checked, which is the one case worth catching.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const consoleRoot = resolve(import.meta.dirname, '..', '..');
const read = (relative) => readFileSync(resolve(consoleRoot, relative), 'utf8').replace(/\r\n|\r/gu, '\n');

const shell = read('app/renderer/src/generated/console.tsx');
const app = read('app/renderer/src/App.tsx');
const injector = read('scripts/extend-pbx-m3.mjs');

/**
 * Every method the compiler extension makes the shell call and the subclass must define.
 *
 * `calls` is how many times the shell is expected to call it, so a rewrite that starts
 * injecting a second copy is as loud as one that stops injecting the first.
 */
const INJECTED_SUBCLASS_CALLBACKS = [
  { name: 'onUserMutation', calls: 1, why: 'records the moment a control value was accepted, for the attention rail\'s idle clock' },
];

test('the hand-written callback list is not empty, so nothing below can pass by having nothing to check', () => {
  assert.ok(INJECTED_SUBCLASS_CALLBACKS.length > 0);
  for (const entry of INJECTED_SUBCLASS_CALLBACKS) {
    assert.ok(entry.why.length > 20, `${entry.name} has no recorded reason for existing`);
  }
});

test('the compiled shell parsed as real content, so nothing below passes vacuously', () => {
  assert.ok(shell.length > 100000, `the shell read as ${shell.length} chars, too small to be the compiled shell`);
  assert.ok(app.length > 100000, `App.tsx read as ${app.length} chars, too small to be the real renderer`);
});

for (const entry of INJECTED_SUBCLASS_CALLBACKS) {
  test(`the compiler extension still injects a call to ${entry.name}`, () => {
    assert.ok(injector.includes(`this.${entry.name}(`),
      `extend-pbx-m3.mjs no longer injects ${entry.name}; if that was deliberate, remove its row from the list above rather than leaving a check nobody can satisfy`);
  });

  test(`the compiled shell calls ${entry.name} exactly ${entry.calls} time(s)`, () => {
    const calls = shell.split(`this.${entry.name}(`).length - 1;
    assert.equal(calls, entry.calls,
      `the shell calls ${entry.name} ${calls} times, not ${entry.calls} -- recompile the design, or say which way the injection moved and why`);
  });

  test(`App.tsx declares ${entry.name}, so the shell's call has a receiver`, () => {
    /* Anchored to the start of a line and to the declaration's own punctuation. A bare
     * substring needle is satisfied by a commented-out declaration, by a longer name that
     * contains this one, and by the sentence in a comment describing the method -- all three
     * of which are present in this file at the time of writing. */
    const declaration = new RegExp(`^\\s*(?:(?:public|private|protected|static|readonly|async)\\s+)*${entry.name}\\s*(?:=|\\(|:)`, 'mu');
    assert.match(app, declaration,
      `App.tsx has no declaration of ${entry.name}; the shell calls it on every accepted control change, so the built application throws where nothing in the source says it will`);
    const declarations = [...app.matchAll(new RegExp(`^\\s*(?:(?:public|private|protected|static|readonly|async)\\s+)*${entry.name}\\s*(?:=|\\(|:)`, 'gmu'))];
    assert.equal(declarations.length, 1,
      `App.tsx declares ${entry.name} ${declarations.length} times; two declarations mean one of them is dead and nobody can tell which`);
  });
}
