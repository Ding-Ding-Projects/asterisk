/**
 * Contract: responsive sizing on the pages-site.
 *
 * An earlier hand-written registry note claimed this was entirely "absent" -- that
 * styles.css was "not inspected... in this pass" for a responsive strategy. Re-deriving
 * it here from the real stylesheet and markup shows that note was simply wrong: the
 * site declares a viewport meta tag on all six pages, a 320px minimum body width, a
 * genuinely narrow-first hamburger navigation wired in real JS (not just markup), a
 * shared touch-target token, and thirteen @media rules across five real width
 * breakpoints plus prefers-reduced-motion. This file pins those facts so the claim
 * cannot silently regress back to "absent" or forward to an unverified "implemented"
 * without a human re-checking the specific numbers below.
 *
 * What this file does NOT claim: it does not prove the site is clipping-free at every
 * breakpoint (that needs a real rendered capture, a different evidence column), and the
 * site's text-size control tops out at 130% rather than the 200% the canon names for a
 * desktop app's display-scale contract -- a genuine, named limitation, not an oversight
 * to paper over.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');
const norm = (s) => s.replace(/\r\n/g, '\n');

/* Derived from the filesystem, not hand-copied: the six-name literal that used to sit
 * here excluded converter.html, ollama.html and history.html, so every 'anywhere in
 * the site' claim below searched two thirds of the site. See ./site-pages.mjs. */
import { PAGE_NAMES } from './site-pages.mjs';
const pages = () => Object.fromEntries(PAGE_NAMES.map((name) => [name, norm(read(`site/${name}.html`))]));

test('every one of the six pages declares a real responsive viewport meta tag', () => {
  const html = pages();
  for (const [name, text] of Object.entries(html)) {
    assert.match(text, /<meta name="viewport" content="width=device-width,initial-scale=1">/,
      `${name}.html has no (or a differently-shaped) viewport meta tag`);
  }
});

test('the page body has a real 320px minimum width and does not clip horizontally', () => {
  const css = norm(read('site/styles.css'));
  assert.match(css, /body\{margin:0;min-width:320px;overflow-x:hidden/,
    'body no longer declares min-width:320px with overflow-x:hidden');
});

test('the stylesheet fluidly scales spacing and type through clamp() rather than fixed pixel values alone', () => {
  const css = norm(read('site/styles.css'));
  const count = (css.match(/clamp\(/g) || []).length;
  assert.ok(count >= 20, `expected at least 20 clamp() uses across the stylesheet for fluid sizing; found ${count}`);
});

test('at least five distinct max-width breakpoints exist, plus a reduced-motion media query', () => {
  const css = norm(read('site/styles.css'));
  const breakpoints = new Set([...css.matchAll(/@media\(max-width:(\d+)px\)/g)].map((m) => m[1]));
  const expected = ['1100', '900', '720', '640', '520'];
  for (const bp of expected) {
    assert.ok(breakpoints.has(bp), `expected an @media(max-width:${bp}px) rule; the recorded breakpoints are [${[...breakpoints].join(', ')}]`);
  }
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)\{/, 'no prefers-reduced-motion media query found');
});

test('the primary navigation genuinely collapses behind a hamburger toggle on narrow layouts, wired in real JS', () => {
  const html = pages();
  for (const [name, text] of Object.entries(html)) {
    assert.match(text, /class="icon-button nav-toggle" id="nav-toggle" type="button" aria-label="Open navigation" aria-expanded="false"/,
      `${name}.html has no nav-toggle button`);
  }
  const css = norm(read('site/styles.css'));
  assert.match(css, /@media\(max-width:1100px\)\{\.site-nav\{position:fixed/,
    'the narrow-layout nav-toggle CSS rule for #site-nav is missing');

  const src = norm(read('site/app.js'));
  const start = src.indexOf('function initNavigation(){');
  assert.ok(start !== -1, 'initNavigation() not found -- the nav toggle markup would be inert decoration');
  let depth = 0, i = src.indexOf('{', start);
  for (; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') { depth -= 1; if (depth === 0) { i += 1; break; } }
  }
  const body = src.slice(start, i);
  assert.ok(body.includes("$('nav-toggle')") && body.includes("$('site-nav')"),
    'initNavigation() no longer references both #nav-toggle and #site-nav -- the toggle may be dead');
  assert.ok(body.includes("menu.classList.toggle('open',open)"),
    'initNavigation() no longer toggles the open class on the nav menu');
});

test('touch targets use a real, density-varying token rather than a static guess', () => {
  const css = norm(read('site/styles.css'));
  assert.match(css, /--touch:48px/, 'default --touch token is missing or changed');
  assert.match(css, /html\[data-density="compact"\]\{--gap:13px;--touch:42px/, 'compact density no longer narrows the touch token');
  assert.match(css, /html\[data-density="spacious"\]\{--gap:28px;--touch:54px/, 'spacious density no longer widens the touch token');
});

test('the shipped text-size control is a genuine, named limitation: it tops out below the desktop-app 200% contract', () => {
  const html = norm(read('site/settings.html'));
  const match = html.match(/<input id="font-scale" aria-label="Text size" type="range" min="(\d+)" max="(\d+)" value="(\d+)">/);
  assert.ok(match, 'font-scale range input not found in the shape expected');
  const [, min, max] = match;
  assert.equal(min, '90');
  assert.equal(max, '130');
  assert.ok(Number(max) < 200,
    'the font-scale range now reaches 200% or more -- the named limitation in this file\'s header comment no longer applies and should be removed');
});
