import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

/**
 * A hand-written inventory of controls that were found decorative in the built console
 * on 2026-09-05 and made real (or honestly withdrawn) the same day. Each row names the
 * exact source boundary that carries the fix, anchored to a line or a call so a rename,
 * a comment, or a descendant match cannot satisfy it.
 *
 * This is a list, not a rule: a rule about "every handler that only toasts" passes
 * cleanly on a control that stopped existing, which is how the canvas shipped read-only
 * for a whole release line behind a guard that never looked for it.
 */
const consoleRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const app = readFileSync(join(consoleRoot, 'app', 'renderer', 'src', 'App.tsx'), 'utf8');
const lines = app.split(/\r?\n/u);
const hasLine = (needle) => lines.some((line) => line.includes(needle) && !line.trim().startsWith('//') && !line.trim().startsWith('*'));

test('the dialplan canvas writes: no read-only stub remains and every edit path is bound', () => {
  assert.ok(!/readOnlyCanvas/u.test(app), 'the read-only canvas closure must be gone');
  assert.ok(!/Dialplan canvas is read-only/u.test(app), 'the read-only notice must be gone');
  assert.ok(hasLine("import { applyCanvasEdits, describeEdits, parseStepText, projectEdits, stepText, type CanvasEdit } from './canvas-edits';"));
  assert.ok(hasLine('private applyCanvasEdits(): void {'), 'the apply path must exist');
  assert.match(app, /this\.request\('pbx\.apply', \{\s*serverId: this\.target\.id,\s*payload: \{ documents: \[\{ resource: resourceForFile\('extensions\.conf'\), value, expectedBefore: before \}\] \},/u, 'canvas apply must send the whole extensions.conf document');
  for (const kind of ["kind: 'add-step'", "kind: 'connect'", "kind: 'delete-extension'", "kind: 'duplicate-extension'", "kind: 'delete-step'"]) {
    assert.ok(app.includes(`this.pushCanvasEdit({ ${kind}`), `a canvas control must push ${kind}`);
  }
  // The inspector keeps one set-step per step, replacing it as the text changes.
  assert.ok(app.includes("this.canvasEdits = [...others, { kind: 'set-step', context: source.context, extension: source.extension, priority: step.priority, app: parsed.app, data: parsed.data }];"), 'the inspector must record a replaceable set-step edit');
  assert.ok(hasLine("label: pending ? `Apply ${pending} change${pending === 1 ? '' : 's'} to target` : 'Nothing to apply', run: () => this.applyCanvasEdits() },"));
  assert.ok(hasLine("canvasLayers: ['Dialplan', 'IVR', 'Queues'].map((l) => ({ label: l, on: layer === l, off: layer !== l, pick: () => this.set('layer', l) })),"), 'layers must filter, and the never-filtering Annotations layer must be gone');
  assert.ok(hasLine("{ icon: 'grid_goldenratio', label: 'Snap', on: !!state.snap, off: !state.snap, pick: () => this.set('snap', !state.snap) },"), 'only the toggle with a consumer is offered');
  assert.ok(hasLine('(this as unknown as { moveNode: (id: string, dx: number, dy: number) => void }).moveNode = this.moveLiveNode;'), 'arrow-key nudges must use the live layout base');
  // A card click bubbles to the background handler; without this guard no node could stay selected.
  assert.ok(hasLine('if (e && e.target !== e.currentTarget) return;'), 'background click must ignore bubbled card clicks');
  // The gate can outlive its edits; its Yes must apply exactly what it showed or nothing.
  assert.ok(hasLine("if (this.canvasEdits !== edits) { this.fire('Pending changes moved',"), 'the gate must refuse a stale edit set');
  // Edits need an explicit selection and a node extensions.conf owns.
  assert.ok(hasLine('if (!editable(explicit)) return;'), 'palette adds must require an explicit, file-owned selection');
  assert.ok(hasLine("this.fire('Not editable here',"), 'nodes registered elsewhere must be refused with the registrar named');
});

test('the wizard closes before the deploy gate opens, so the gate is never hidden under it', () => {
  const at = lines.findIndex((line) => line.includes("this.areYouSure('Apply the deploy plan?', summaryLines.join('\\n'), 3, () => {"));
  assert.ok(at > 0, 'the deploy gate call must remain addressable');
  const before = lines.slice(Math.max(0, at - 8), at).map((line) => line.trim());
  assert.ok(before.includes("this.set('onboardOpen', false);"), 'the wizard overlay must close right before the gate opens');
});

test('the wizard offers only targets the control plane connects to', () => {
  assert.ok(hasLine("if (where?.options) where.options = where.options.filter((option) => option === 'This machine' || option === 'SSH');"));
  assert.ok(hasLine("const whereMap: Record<string, string> = { 'This machine': 'wsl', SSH: 'remoteLinux' };"));
  assert.ok(!/'Local Docker': 'local-docker'/u.test(app), 'the label-to-nowhere map must be gone');
});

test('the IVR screen can write what it previews', () => {
  assert.ok(hasLine("if (action === 'ivr-apply') { this.applyIvr(); return; }"));
  assert.ok(hasLine("if (screen === 'ivr') this.prepareIvrScreen();"));
  assert.ok(hasLine("ctls: [{ id: 'i_apply', label: 'Write this IVR to extensions.conf', kind: 'segmented', value: 'Write', options: ['Write'], action: 'ivr-apply', info:"));
});

test('the servers screen no longer stores values nothing reads', () => {
  assert.ok(hasLine("const offered = (SERVERS_BASE_GROUPS as Array<{ title?: string; ctls?: Array<{ id: string; options?: string[] }> }>).filter((group) => group.title !== 'Manager interface');"));
  assert.ok(hasLine("if (kind?.options) kind.options = kind.options.filter((option) => option === 'Local' || option === 'SSH');"));
  assert.ok(hasLine("const kindMap: Record<string, string> = { Local: 'wsl', SSH: 'remoteLinux' };"));
  for (const id of ['sv_iface', 'sv_amiport', 'sv_tls', 'sv_forward', 'sv_watch', 'sv_readonly']) {
    assert.ok(!new RegExp(`values\\.${id}\\b|values\\['${id}'\\]`, 'u').test(app), `${id} must not be read anywhere, or the group must come back`);
  }
});

test('appearance, arcade and fun shortcuts do what their labels say', () => {
  assert.ok(hasLine("{ icon: 'casino', label: 'Surprise me', run: () => this.setVal({ id: 'ap_hue', label: 'Hue' }, Math.floor(Math.random() * 360)) },"));
  assert.ok(hasLine("const dropper = (globalThis as { EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper;"), 'pick from screen must use the platform picker or say it cannot');
  assert.ok(!/hostAction\('pick-colour'/u.test(app), 'no host action nobody handles');
  assert.ok(hasLine('spendCredit: () => {'), 'the arcade spend must be honest about where a credit is spent');
  assert.ok(hasLine("this.fire('Nothing to skip right now', `You have ${credits} credit${credits === 1 ? '' : 's'}. A credit is spent from inside a four-gate ceremony, with its \"Skip with a credit\" action; nothing was deducted here.`);"));
  for (const name of ['toggleFun: () => {', 'maxFun: () => {', 'zeroFun: () => {']) assert.ok(hasLine(name), `${name} must be overridden with the real dials`);
  assert.ok(!hasLine("'chaos_level'"), 'the design-only chaos_level key must not be written by App');
});
