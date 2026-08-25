/**
 * How many controls change nothing but their own remembered value.
 *
 * Every control the design declares is stored in the shell's state, so every one of them
 * "works" in the sense that it remembers what you set. The question that matters is whether
 * anything READS it afterwards: a switch that is remembered and never consulted is a switch
 * you can operate all day to no effect.
 *
 * A control counts as reaching something when it is bound to a real Asterisk setting, read
 * by the hand-written app, delivered through a named action, or consumed by the compiled
 * shell somewhere other than its own definition. Everything else reaches nothing.
 *
 * THIS IS A RATCHET, NOT A PASS. The number is large and is not a target being met; it is a
 * backlog being held still. It may fall freely and may not rise, so wiring a control is
 * always welcome and adding another orphan is a decision somebody has to make on purpose.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const design = read('../../../design/Asterisk Console M3.dc.html');
const generated = read('../../app/renderer/src/generated/console.tsx');
const keys = read('../../app/renderer/src/control-keys.ts');
const app = read('../../app/renderer/src/App.tsx') + read('../../app/renderer/src/PbxAdminApp.tsx');

/**
 * The count on 2026-08-24, measured rather than chosen.
 *
 * Lowered to 343 by the http.conf and features.conf bindings, then to 318 by the IAX peers
 * screen and the six partner-request settings, then to 279 by seven appearance controls
 * reaching the live preview and by the readout that names them, then to 252 by the
 * twenty-seven agent/ops controls on sync, secrets, hub, vocab, ops and skills joining the
 * console's own persisted-settings registry (CONSOLE_SETTINGS in App.tsx) -- the same
 * honest floor already used for the partner-request and security-ban groups: a stated
 * intention that survives a relaunch and is shown back in the control, since none of those
 * six screens describes Asterisk configuration in the first place. Each time this check is
 * what forced it.
 *
 * Originally 364, and lowered by the twenty-one http.conf and features.conf bindings that
 * brought two whole screens into the table for the first time. The check below is what forced
 * that: it fails when the real figure falls well under the ceiling, so the ratchet tightens
 * instead of drifting into permitting a hundred new orphans in silence.
 *
 * It only ever goes down. If a change makes it rise, that change is adding a control nobody
 * reads, and the honest options are to wire it or to leave it out.
 */
const ORPHAN_CEILING = 252;
const TOTAL_CONTROLS = 599;

function classify() {
  const ids = [...new Set([...design.matchAll(/ctl\('([a-z0-9_]+)'/g)].map((m) => m[1]))].sort();
  const bindings = keys.slice(keys.indexOf('CONTROL_BINDINGS'), keys.indexOf('SCREEN_CONTROL_IDS'));
  const bound = new Set([...bindings.matchAll(/[a-z]\('([a-z0-9_]+)',/g)].map((m) => m[1]));
  /* A readout is delivered by its action name, not by its id, so looking for the id would
   * report it as an orphan while it is on screen doing its job. */
  const acted = new Set([...design.matchAll(/ctl\('([a-z0-9_]+)'[^\n]*?action:'[a-z-]+'/g)].map((m) => m[1]));

  const orphans = [];
  for (const id of ids) {
    const quoted = `'${id}'`;
    if (bound.has(id) || acted.has(id)) continue;
    if (app.includes(quoted)) continue;
    if (generated.split(quoted).length - 1 > 1 || generated.includes(`v.${id}`)) continue;
    orphans.push(id);
  }
  return { ids, orphans };
}

test('the count of controls that reach nothing does not rise', () => {
  const { ids, orphans } = classify();
  assert.equal(ids.length >= TOTAL_CONTROLS - 40, true,
    `only ${ids.length} controls were found; the classifier is probably no longer matching the design`);
  assert.ok(orphans.length <= ORPHAN_CEILING,
    `${orphans.length} controls reach nothing, up from ${ORPHAN_CEILING}. `
    + `The new ones are: ${orphans.slice(-8).join(', ')}. Wire it or leave it out.`);
});

test('the ceiling is lowered when the backlog falls, so it cannot go stale', () => {
  /* A ratchet nobody tightens stops being a ratchet: the number drifts down, the ceiling
   * stays where it was, and years later it permits a hundred new orphans silently. */
  const { orphans } = classify();
  assert.ok(orphans.length >= ORPHAN_CEILING - 20,
    `${orphans.length} controls reach nothing, well under the ${ORPHAN_CEILING} ceiling. `
    + 'Lower ORPHAN_CEILING to the new figure in the same change that earned it.');
});

test('the classifier still recognises each way a control can reach something', () => {
  /* Every one of these four routes is real and in use. If one stopped being detected, the
   * orphan count would jump and the ratchet would fail for a reason that is not a defect --
   * which is how a guard gets widened until it guards nothing. */
  const bindings = keys.slice(keys.indexOf('CONTROL_BINDINGS'), keys.indexOf('SCREEN_CONTROL_IDS'));
  assert.ok([...bindings.matchAll(/[a-z]\('([a-z0-9_]+)',/g)].length > 50, 'no config bindings detected');
  assert.ok(/ctl\('[a-z0-9_]+'[^\n]*?action:'[a-z-]+'/.test(design), 'no action-delivered controls detected');
  assert.ok(app.includes("'nar_enabled'") || app.includes("'logo_preset'"), 'no app-read controls detected');
  assert.ok(generated.includes('v.appearPreviewStyle'), 'no shell-read controls detected');
});
