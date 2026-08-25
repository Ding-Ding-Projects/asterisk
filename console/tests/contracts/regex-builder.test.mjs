/**
 * Contract: the regex builder is a real, anchored, operable panel, and the recorded
 * built-artifact evidence describes the code that actually exists.
 *
 * This file carries a warning as much as a contract. An earlier pass reported this
 * control as a decorative search bar with no writer behind it. Both halves were wrong,
 * and both were measurement mistakes rather than defects:
 *
 *   - the writer is `p[s.regexTarget] = v ? [v] : []` inside `onRxText`, an indexed
 *     assignment that a grep for `patterns.nav =` cannot see;
 *   - the follow-up click check read the DOM in the same evaluation tick as the click,
 *     so it observed the pre-render input count and concluded nothing had opened.
 *
 * So the assertions below pin the writer by its real indexed form, and the evidence
 * record carries the before/after element counts that make the render step explicit.
 *
 * Plain `.mjs` on purpose: this is the `localCheck` evidence column, which must run
 * without the renderer's TypeScript pipeline and without `node_modules`.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
/* CRLF is present in parts of this checkout; a newline-only pattern silently matches
 * nothing, which turns every assertion below into a vacuous pass with no error. */
const read = (p) => readFileSync(resolve(root, p), 'utf8').split('\r\n').join('\n');
const json = (p) => JSON.parse(read(p));

const SHELL = 'app/renderer/src/generated/console.tsx';
const EVIDENCE = 'release/evidence/windows-console/regex-builder.json';
const shell = read(SHELL);

test('the compiled shell parsed as real content, so nothing below passes vacuously', () => {
  assert.ok(shell.length > 100000, `${SHELL} read as ${shell.length} chars, too small to be the compiled shell`);
});

test('the pattern target really is written, by the indexed assignment a naive grep misses', () => {
  /* The exact shape that was missed. Anchored to the assignment, so a rename of
   * regexTarget or a change to the stored shape fails here rather than silently. */
  assert.match(
    shell,
    /p\[s\.regexTarget\] = v \? \[v\] : \[\];/u,
    'the regex builder no longer writes the pattern for its selected target',
  );
  assert.match(
    shell,
    /this\.setState\(\{ rxText:v, patterns:p \}\)/u,
    'the builder no longer commits both the raw text and the derived patterns together',
  );
});

test('all three pattern targets exist and the navigation one is among them', () => {
  assert.match(shell, /patterns:\{ nav:\[\], table:\[\], memory:\[/u, 'the pattern target set changed shape');
  assert.match(
    shell,
    /s\.regexTarget === 'nav' \? 'section list'/u,
    "the navigation target no longer presents itself as the section list, so the panel would not say what it is attached to",
  );
});

test('the panel carries a real input rather than a styled label', () => {
  /* The whole substance of the earlier false finding. An input element must exist in the
   * compiled output; a span that looks like a field is exactly what was wrongly alleged. */
  assert.match(
    shell,
    /h\("input", \{ type: `text`, value: v\.rxText, onChange: fn\(v\.onRxText\)/u,
    'the regex builder no longer renders a real text input bound to the pattern text',
  );
});

test('the pattern is validated rather than trusted, and an invalid one is reported not thrown', () => {
  assert.match(shell, /try \{ new RegExp\(v\); return 'valid'; \} catch/u,
    'the builder no longer compiles the pattern to decide validity');
  assert.match(shell, /if \(!v\) return 'empty';/u, 'the empty state is no longer distinguished from an invalid one');
});

/* --- the evidence record and the code must agree ---------------------------- */

test('the recorded built-artifact evidence exists and is well formed', () => {
  assert.ok(existsSync(resolve(root, EVIDENCE)), `${EVIDENCE} is missing`);
  const e = json(EVIDENCE);
  for (const key of ['commit', 'artifact', 'capture', 'captureSha256', 'captureBytes', 'interaction', 'verification']) {
    assert.ok(e[key] !== undefined, `the evidence record has no ${key}`);
  }
  assert.match(e.commit, /^[0-9a-f]{40}$/u, 'the evidence commit is not a full object name');
  assert.match(e.captureSha256, /^[0-9a-f]{64}$/u, 'the capture digest is not a SHA-256');
  assert.ok(e.captureBytes > 50000, 'the capture is too small to be a rendered window');
});

test('the capture named by the evidence is present and matches its recorded digest and size', async () => {
  const e = json(EVIDENCE);
  const capturePath = resolve(root, '..', e.capture);
  assert.ok(existsSync(capturePath), `the evidence names ${e.capture}, which is not on disk`);
  const bytes = readFileSync(capturePath);
  assert.equal(bytes.length, e.captureBytes, 'the capture on disk is not the size the evidence records');
  const { createHash } = await import('node:crypto');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), e.captureSha256,
    'the capture on disk is not the image the evidence recorded; it has been replaced or edited');
});

test('the evidence records the render step that the earlier mistake skipped', () => {
  /* Not decoration: these two counts are the difference between "clicking did nothing"
   * and "the panel had not rendered yet when it was measured". Recording them keeps the
   * correction checkable instead of anecdotal. */
  const e = json(EVIDENCE);
  const before = e.interaction.domBeforeClick;
  const after = e.interaction.domAfterClick;
  assert.ok(before && after, 'the evidence no longer records the DOM before and after the click');
  assert.equal(before.inputs, 0, 'the recorded pre-click input count changed');
  assert.ok(after.inputs >= 1, 'the evidence no longer shows a real input appearing once the panel rendered');
  assert.ok(after.elements > before.elements, 'the evidence no longer shows the panel adding elements');
});

test('every panel control the evidence claims to have observed is one the shell renders', () => {
  const e = json(EVIDENCE);
  const controls = e.interaction.observedPanelControls;
  assert.ok(Array.isArray(controls) && controls.length >= 4,
    'the evidence observed too few panel controls, so the loop below would prove little');
  for (const label of controls) {
    assert.ok(shell.includes(label), `the evidence claims it saw "${label}", which the shell does not render`);
  }
});

test('every telephony preset the evidence claims is really offered', () => {
  const e = json(EVIDENCE);
  const presets = e.interaction.observedTelephonyPresets;
  assert.ok(Array.isArray(presets) && presets.length > 0, 'no telephony presets recorded, so this would pass vacuously');
  for (const preset of presets) {
    /* The evidence records what the user sees, e.g. ^1\d{3}$ with one backslash. The
     * shell stores it as a JavaScript string literal, so the same preset appears there
     * source-escaped as ^1\\d{3}$. Comparing the two forms naively fails on exactly the
     * presets that contain a backslash, which is most of the interesting ones -- so both
     * spellings are accepted, and neither is loosened into a substring match. */
    const sourceEscaped = preset.split('\\').join('\\\\');
    assert.ok(
      shell.includes(preset) || shell.includes(sourceEscaped),
      `the evidence claims the preset "${preset}", which the shell does not offer in either literal or source-escaped form`,
    );
  }
});

test('the evidence carries its correction and is honest about what it did not exercise', () => {
  /* A capture of an opened panel is not proof that the pattern filters anything. The
   * record has to say so, or one screenshot reads as coverage of the whole feature. */
  const e = json(EVIDENCE);
  assert.ok(e.correctionRecorded && e.correctionRecorded.detail.length > 80,
    'the recorded correction was dropped, so the earlier false finding loses its rebuttal');
  assert.ok(Array.isArray(e.notInterrogatedHere) && e.notInterrogatedHere.length >= 3,
    'the evidence does not say what it left unexercised, so it overstates itself');
  assert.equal(e.interaction.anchoredToOriginatingField, true);
});
