/**
 * Ship-readiness smoke probe against the real built artifact.
 *
 * Answers one question the test suite structurally cannot: does the packaged
 * application actually render its own interface, or does it render something that
 * merely looks like it did?
 *
 * Every check here reads the live DOM of the running build over the debugging
 * protocol. It deliberately does not import a single module from the source tree,
 * because a probe that imports the code it is checking proves the code and nothing
 * about the artifact -- which is exactly how three wiring defects survived a 3,000
 * test suite in this repository and were found in the first minute of opening the
 * built application.
 *
 * Two traps this is written against, both paid for already:
 *
 *   A fresh profile opens on an onboarding wizard whose panel covers nearly the
 *   whole viewport. Navigation underneath genuinely works, so a probe that only
 *   asks "did anything render" passes perfectly while every answer describes the
 *   wizard. The wizard is therefore detected by its own Skip button and reported,
 *   never silently accepted.
 *
 *   Every expression stays synchronous. `awaitPromise: true` has been observed to
 *   hang this protocol indefinitely on some Node builds, and a hang reads exactly
 *   like a broken application.
 */
import { connect } from './cdp.mjs';
import { statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const PORT = Number(process.argv[2] || 9556);
const ARTIFACT = process.argv[3] || 'dist/squirrel-windows/win-unpacked/resources/app.asar';

/**
 * Is the artifact older than the sources it was built from?
 *
 * This exists because the first run of this probe reported "the stylesheet carries no
 * width breakpoint" as a defect, when the truth was that the packaged build predated
 * the breakpoints by nearly six hours. A probe that cannot tell those two apart is
 * worse than none: it reports a real absence, with a real measurement, about a build
 * nobody is shipping -- and the natural next move is to go looking for a bug that was
 * fixed hours ago.
 *
 * Test files are excluded or this cries wolf on every unit-test edit.
 */
const stalenessAgainstSources = () => {
  let artifactTime;
  try {
    artifactTime = statSync(ARTIFACT).mtimeMs;
  } catch {
    return { unknown: true, reason: `no artifact at ${ARTIFACT}` };
  }
  const roots = ['app/renderer/src', 'app/electron', 'control-plane'];
  let newest = { time: 0, path: null };
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (/\.test\.[cm]?[jt]sx?$/u.test(entry.name)) continue;
      const time = statSync(full).mtimeMs;
      if (time > newest.time) newest = { time, path: full };
    }
  };
  for (const root of roots) walk(root);
  if (newest.time > artifactTime) {
    const hours = ((newest.time - artifactTime) / 3_600_000).toFixed(1);
    return { stale: true, hours, source: newest.path };
  }
  return { stale: false };
};

const probes = [
  ['document title', 'document.title'],
  ['body has real size', 'document.body.getBoundingClientRect().width + "x" + document.body.getBoundingClientRect().height'],
  ['rendered elements', 'document.querySelectorAll("*").length'],
  ['onboarding wizard showing', '!!Array.from(document.querySelectorAll("button")).find((b) => /skip setup/i.test(b.textContent || ""))'],
  ['clickable controls', 'Array.from(document.querySelectorAll("button,[role=button],input,select")).length'],
  ['navigation destinations', 'Array.from(document.querySelectorAll("[role=tab],nav button,aside button")).length'],
  ['visible text characters', '(document.body.innerText || "").trim().length'],
  ['computed body background', 'getComputedStyle(document.body).backgroundColor'],
  /* Both spellings, deliberately. The bundler rewrites `(max-width: 1000px)` into the
   * modern range form `(width<=1000px)` -- semantically identical, textually nothing
   * alike. A probe that only knows the source spelling reports the built artifact as
   * having no breakpoints at all, which reads as a defect in the application rather
   * than a gap in the probe, and sends the next person to the wrong file entirely. */
  ['width breakpoints reachable', 'Array.from(document.styleSheets).some((s) => { try { return Array.from(s.cssRules).some((r) => r.conditionText && /max-width|width\\s*<=/.test(r.conditionText)); } catch { return false; } })'],
];

const main = async () => {
  const freshness = stalenessAgainstSources();
  if (freshness.stale) {
    console.log(`  NOTE: the artifact is ${freshness.hours}h older than ${freshness.source}.`);
    console.log('        Anything absent below may simply not have been built yet.');
    console.log('');
  }

  const cdp = await connect(PORT);
  const results = [];
  for (const [label, expression] of probes) {
    let value;
    try {
      value = await cdp.evaluate(expression);
    } catch (error) {
      value = `EVALUATION FAILED: ${error.message}`;
    }
    results.push([label, value]);
    console.log(`  ${label.padEnd(30)} ${String(value).slice(0, 60)}`);
  }
  cdp.close();

  /* A verdict, not a wall of numbers. Each of these is a way the artifact could be
   * running and still be useless, and each has actually happened to this project. */
  const get = (label) => results.find(([name]) => name === label)?.[1];
  const problems = [];
  if (get('onboarding wizard showing') === true) problems.push('the onboarding wizard is covering the interface; nothing below it was observed');
  if (Number(get('rendered elements')) < 200) problems.push(`only ${get('rendered elements')} elements rendered, which is too few to be the real interface`);
  if (Number(get('clickable controls')) < 10) problems.push(`only ${get('clickable controls')} operable controls found`);
  if (Number(get('visible text characters')) < 200) problems.push('almost no visible text, so the interface probably did not paint');
  if (get('width breakpoints reachable') !== true) {
    problems.push(freshness.stale
      ? `the stylesheet carries no width breakpoint -- but the artifact is ${freshness.hours}h stale, so rebuild before believing this`
      : 'the stylesheet carries no width breakpoint the document can see');
  }

  console.log('');
  if (problems.length === 0) {
    console.log('VERDICT: the built artifact renders its real interface.');
    process.exit(0);
  }
  for (const problem of problems) console.log(`VERDICT PROBLEM: ${problem}`);
  process.exit(1);
};

main().catch((error) => {
  console.error(`probe failed: ${error.message}`);
  process.exit(1);
});
