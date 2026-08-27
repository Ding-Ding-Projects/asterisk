// Proves the parts of the design-parity capture harness that a browser is not needed for:
// the locally vendored React runtime and its pins, the capture host that injects it, the
// request routing that keeps a capture run off the network, the label rule both sides use to
// find a control, and the self-containedness of every navigation plan.
//
// Each of these has already failed for real during the first capture runs, so none of them is
// a hypothetical: the pins live in design/support.js rather than here, the host's confinement
// check refused every request when handed a forward-slash root, the label rule missed every
// badged row on one side and then every badged row on the other, and twenty-six of the
// thirty-two navigation plans could only work in a session nobody drives.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pinsFromSupportJs, readStringConstant, verifyVendored, VENDOR_DIR } from '../../scripts/vendor-design-react-host.mjs';
import {
  injectReactHost, reactHostShim, startCaptureServer, DESIGN_HOST_PREFIX,
  fullPageCssFromSupportJs, fullPageStyleShim, injectFullPageHeight,
} from '../../scripts/design-parity-server.mjs';
import {
  routeInterceptedRequest, clearUpdateBanner, shellOwnsTheWindow, OBSTRUCTIONS_ABOVE,
} from '../../scripts/design-parity-capture-run.mjs';
import { controlText, controlLabel, controlMatchesLabel } from '../../design-reference/route.mjs';

const root = resolve(import.meta.dirname, '..', '..', '..');
const supportJs = readFileSync(resolve(root, 'design', 'support.js'), 'utf8');

/* ------------------------------------------------------------------- the vendored React -- */

test('readStringConstant reads a whole declaration and is not satisfied by a longer name or a commented-out line', () => {
  assert.equal(readStringConstant('var REACT_URL = "https://example.test/react.js";', 'REACT_URL'), 'https://example.test/react.js');
  // A bare substring needle would match both of these, and both are the wrong value.
  assert.throws(() => readStringConstant('var REACT_URL_FALLBACK = "https://wrong.test/x.js";', 'REACT_URL'), /declares no/);
  assert.throws(() => readStringConstant('// var REACT_URL = "https://wrong.test/x.js";', 'REACT_URL'), /declares no/);
});

test('the React pins come from design/support.js itself, never from this repository', () => {
  const pins = pinsFromSupportJs(supportJs);
  assert.equal(pins.length, 2);
  for (const pin of pins) {
    assert.match(pin.url, /^https:\/\/unpkg\.com\/react(-dom)?@\d+\.\d+\.\d+\/umd\//, `unexpected pinned URL ${pin.url}`);
    assert.match(pin.integrity, /^sha384-[A-Za-z0-9+/]+=*$/, `unexpected integrity ${pin.integrity}`);
  }
  assert.deepEqual(pins.map((pin) => pin.global), ['React', 'ReactDOM']);
});

test('the vendored files match the sha384 the design declares, and a single changed byte is refused', () => {
  const pins = pinsFromSupportJs(supportJs);
  assert.deepEqual(verifyVendored(pins), [], 'the committed vendor/ copies do not match design/support.js pins');

  const tampered = verifyVendored(pins, {
    exists: () => true,
    read: (path) => Buffer.concat([readFileSync(path), Buffer.from('\n')]),
  });
  assert.equal(tampered.length, pins.length);
  assert.match(tampered[0], /has sha384 .* but design\/support\.js pins/);

  const absent = verifyVendored(pins, { exists: () => false });
  assert.equal(absent.length, pins.length);
  assert.match(absent[0], /is absent/);
});

/* ------------------------------------------------------------------------ the shim host -- */

test('the shim keys the design runtime looks up are exactly the URLs it pins', () => {
  const pins = pinsFromSupportJs(supportJs);
  const shim = reactHostShim(pins);
  assert.ok(shim.startsWith('<script>window.__resources=Object.assign(window.__resources||{},') && shim.endsWith(');</script>'));

  // Parsed and compared as a whole map, not searched for as substrings. `cdnScriptFor()` looks
  // the URL up in window.__resources by EXACT string, so a key that has drifted by one
  // character does not error — it falls through to the network, which is the one outcome this
  // whole arrangement exists to prevent. A substring assertion cannot see that drift: this test
  // was written that way first, and a deliberately drifted key sailed straight past it.
  const opener = 'window.__resources||{},';
  const map = JSON.parse(shim.slice(shim.indexOf(opener) + opener.length, shim.lastIndexOf('}') + 1));
  assert.deepEqual(Object.keys(map).sort(), pins.map((pin) => pin.url).sort());
  for (const pin of pins) {
    assert.equal(map[pin.url], `/console/design-reference/vendor/${pin.file}`);
  }
});

test('injectReactHost puts the shim before support.js and leaves the design template untouched', () => {
  const pins = pinsFromSupportJs(supportJs);
  const original = readFileSync(resolve(root, 'design', 'Asterisk Console M3.dc.html'), 'utf8');
  const injected = injectReactHost(original, pins);

  const shimAt = injected.indexOf('window.__resources');
  const supportAt = injected.indexOf('<script src="./support.js"></script>');
  assert.ok(shimAt !== -1 && supportAt !== -1);
  assert.ok(shimAt < supportAt, 'the shim must run before support.js boots or it is inert');

  // The bytes the runtime actually renders are passed through unchanged.
  const templateOf = (html) => html.slice(html.indexOf('<x-dc>'), html.indexOf('</x-dc>'));
  assert.equal(templateOf(injected), templateOf(original));
  assert.equal(injected.length, original.length + reactHostShim(pins).length);
});

test('injectReactHost refuses a document with no support.js tag rather than appending somewhere plausible', () => {
  assert.throws(() => injectReactHost('<html><head></head><body></body></html>', pinsFromSupportJs(supportJs)), /no '<script src="\.\/support\.js">/);
});

/* -------------------------------------------------------- the viewport the design declares -- */

test("the design declares a preview viewport, which is why its runtime withholds the full-page height", () => {
  // Both halves of the reason this harness has to supply that height itself. If either moves,
  // the injection below becomes either unnecessary or wrong, and this says which.
  assert.match(
    readFileSync(resolve(root, 'design', 'Asterisk Console M3.dc.html'), 'utf8'),
    /data-props="\{&quot;\$preview&quot;:\{&quot;width&quot;:1440,&quot;height&quot;:900\}\}"/,
    'the design export declares $preview; support.js skips FULL_PAGE_CSS when it does',
  );
  assert.match(
    supportJs.replace(/\r\n/g, '\n'),
    /^\s*if \(!parsed\.preview\) \{$/m,
    'support.js still gates its full-page stylesheet on the absence of a declared preview',
  );
});

test('the full-page height style is read out of support.js, never typed here', () => {
  const css = fullPageCssFromSupportJs(supportJs);
  // What the design's root style actually needs: a definite height on every ancestor.
  assert.match(css, /html,\s*body\{height:100%/);
  assert.match(css, /#dc-root[^}]*height:100%/);
  // Anchored to the whole declaration, so neither a longer name nor a commented-out copy
  // can supply it — the same rule the React pins are read by, for the same reason.
  assert.throws(() => fullPageCssFromSupportJs('var FULL_PAGE_CSS_V2 = "html{height:100%}";'), /declares no/);
  assert.throws(() => fullPageCssFromSupportJs('// var FULL_PAGE_CSS = "html{height:100%}";'), /declares no/);
});

test('injectFullPageHeight puts the style before support.js and leaves the design template untouched', () => {
  const css = fullPageCssFromSupportJs(supportJs);
  const original = readFileSync(resolve(root, 'design', 'Asterisk Console M3.dc.html'), 'utf8');
  const injected = injectFullPageHeight(original, css);

  const styleAt = injected.indexOf('data-design-parity-host="full-page-height"');
  const supportAt = injected.indexOf('<script src="./support.js"></script>');
  assert.ok(styleAt !== -1 && supportAt !== -1);
  assert.ok(styleAt < supportAt, 'a height applied after boot is a frame late, and the first paint is the wrong size');

  const templateOf = (html) => html.slice(html.indexOf('<x-dc>'), html.indexOf('</x-dc>'));
  assert.equal(templateOf(injected), templateOf(original));
  assert.equal(injected.length, original.length + fullPageStyleShim(css).length);
});

test('injectFullPageHeight refuses a document with no support.js tag', () => {
  assert.throws(() => injectFullPageHeight('<html><head></head><body></body></html>', 'html{height:100%}'), /no '<script src="\.\/support\.js">/);
});

/* ------------------------------------------------- nothing may sit on top of the built shell -- */

// Recorded because it happened, on a whole 32-destination run, and nothing failed: the
// updater raised its banner after the driver's one dismissal, so every capture in that run
// showed the application 43px — later 52px, as the banner's text rewrapped — down the frame.

const fakeCdp = (script) => {
  const calls = [];
  return {
    calls,
    evaluate: async (expression) => {
      calls.push(expression);
      return script(expression, calls);
    },
  };
};

test('clearUpdateBanner does nothing when the banner is not up', async () => {
  const cdp = fakeCdp((expression) => (expression.includes("getElementById('update-banner-host')") ? false : 0));
  assert.equal(await clearUpdateBanner(cdp, 'in a test', { pauseMs: 0 }), 0);
  assert.equal(cdp.calls.length, 1, 'a banner that is not there must not be clicked at');
});

test('clearUpdateBanner clicks Later and returns once the banner is gone', async () => {
  let dismissed = false;
  const cdp = fakeCdp((expression) => {
    if (expression.includes('later.click()')) { dismissed = true; return 1; }
    return !dismissed;
  });
  assert.equal(await clearUpdateBanner(cdp, 'in a test', { pauseMs: 0 }), 1);
  assert.ok(cdp.calls.some((c) => c.includes('later.click()')));
});

test('clearUpdateBanner refuses the run rather than capturing behind a banner it cannot clear', async () => {
  const cdp = fakeCdp((expression) => (expression.includes('later.click()') ? 0 : true));
  await assert.rejects(
    () => clearUpdateBanner(cdp, "before driving to 'about'", { attempts: 2, pauseMs: 0 }),
    /update banner is still up before driving to 'about'; refusing to capture/,
  );
});

test('clearUpdateBanner judges its last click instead of giving up on it', async () => {
  // Measured on the real application: `Later` removes the banner about a second later. A loop
  // that clicks and then falls straight out refuses a dismissal that worked, which is exactly
  // how the first run of this guard failed.
  let clicks = 0;
  const cdp = fakeCdp((expression) => {
    if (expression.includes('later.click()')) { clicks += 1; return 1; }
    return clicks < 2;
  });
  assert.equal(await clearUpdateBanner(cdp, 'in a test', { attempts: 2, pauseMs: 0 }), 2);
});

test('a built measurement whose shell is not at the window origin is refused', () => {
  assert.equal(shellOwnsTheWindow({ shell: { x: 0, y: 0, width: 1440, height: 1000 } }), true);
  // The exact shape the contaminated run produced.
  assert.equal(shellOwnsTheWindow({ shell: { x: 0, y: 52, width: 1440, height: 948 } }), false);
  assert.equal(shellOwnsTheWindow({ shell: { x: 12, y: 0, width: 1428, height: 1000 } }), false);
  // A probe that already said why it failed keeps its own, more specific reason.
  assert.equal(shellOwnsTheWindow({ error: 'the top strip has 3 cells, not 4' }), true);
});

test('the obstruction probe reports what sits above the shell rather than only that something does', () => {
  const expression = OBSTRUCTIONS_ABOVE({ x: 0, y: 52, width: 1440, height: 948 });
  assert.match(expression, /document\.body\.children/);
  assert.match(expression, /c\.r\.top < shell\.y \|\| c\.r\.left < shell\.x/);
  // The rectangle is passed in rather than the shell being located a second time, because a
  // second locator in this harness is a locator that can drift from the first.
  assert.match(expression, /"y":\s*52/);
  assert.doesNotMatch(expression, /querySelectorAll\('div'\)/);
});

/* --------------------------------------------------------------------- the capture host -- */

test('the capture host serves the repository, injects into the hosted design, and confines to the root', async () => {
  const server = await startCaptureServer({ root, port: 0 });
  try {
    const harness = await fetch(`${server.origin}/console/design-reference/index.html`);
    assert.equal(harness.status, 200);
    assert.match(await harness.text(), /design-parity capture harness/);

    const design = await fetch(`${server.origin}${DESIGN_HOST_PREFIX}Asterisk Console M3.dc.html`);
    assert.equal(design.status, 200);
    const body = await design.text();
    // Presence first, THEN order. `indexOf` answers -1 for something that is not there at
    // all, and -1 is less than every real index, so an order-only assertion is satisfied by
    // a shim the server stopped injecting entirely — which is exactly what a deliberate
    // break of this test proved before these two `ok(includes)` lines were added.
    const supportAt = body.indexOf('<script src="./support.js"></script>');
    assert.ok(body.includes('window.__resources'), 'the hosted design must carry the local React host');
    assert.ok(body.indexOf('window.__resources') < supportAt);
    assert.ok(
      body.includes('data-design-parity-host="full-page-height"'),
      'the hosted design must carry the full-page height style, or the reference shell grows to its content',
    );
    assert.ok(body.indexOf('data-design-parity-host="full-page-height"') < supportAt);

    // './support.js' and <dc-import name="M3 Control"> both resolve inside that same virtual
    // directory, so the host has to answer for the whole of design/ there.
    assert.equal((await fetch(`${server.origin}${DESIGN_HOST_PREFIX}support.js`)).status, 200);
    assert.equal((await fetch(`${server.origin}${DESIGN_HOST_PREFIX}M3 Control.dc.html`)).status, 200);

    const font = await fetch(`${server.origin}/console/assets/fonts/fonts.css`);
    assert.equal(font.status, 200);
    // The font stylesheet is fulfilled as though it came from Google's origin, so the faces it
    // points at are cross-origin and need this header or the browser silently drops them.
    assert.equal(font.headers.get('access-control-allow-origin'), '*');

    const escaped = await fetch(`${server.origin}/../../../Windows/win.ini`);
    assert.equal(escaped.status, 404);
    assert.equal((await fetch(`${server.origin}/console/does-not-exist.txt`)).status, 404);
  } finally {
    await server.close();
  }
});

test('a root written with forward slashes still serves — the confinement check normalises both sides', async () => {
  // Recorded because it happened: comparing an unnormalised root against resolve()'s
  // backslash output made every single request 404 while the root plainly existed, and a
  // confinement check that refuses everything looks exactly like one that works.
  const server = await startCaptureServer({ root: root.replaceAll('\\', '/'), port: 0 });
  try {
    assert.equal((await fetch(`${server.origin}/console/design-reference/index.html`)).status, 200);
  } finally {
    await server.close();
  }
});

/* ------------------------------------------------------------------- request classification -- */

test('a capture run lets its own host through, answers the font stylesheet locally, and blocks the rest', () => {
  const context = {
    origin: 'http://127.0.0.1:9999',
    fontStylesheetUrl: 'https://fonts.googleapis.com/css2?family=Roboto',
    fontFiles: new Map([['https://fonts.gstatic.com/s/roboto/v1/a.woff2', 'roboto-300-1.woff2']]),
  };
  assert.equal(routeInterceptedRequest('http://127.0.0.1:9999/console/x.js', context).kind, 'server');
  assert.equal(routeInterceptedRequest(context.fontStylesheetUrl, context).kind, 'font-stylesheet');
  assert.equal(routeInterceptedRequest('https://fonts.gstatic.com/s/roboto/v1/a.woff2', context).kind, 'font-face');
  assert.equal(routeInterceptedRequest('https://unpkg.com/react@18.3.1/umd/react.production.min.js', context).kind, 'blocked');
  assert.equal(routeInterceptedRequest('https://example.test/anything', context).kind, 'blocked');
  // A different loopback port is somebody else's server, not this run's.
  assert.equal(routeInterceptedRequest('http://127.0.0.1:9998/console/x.js', context).kind, 'blocked');
});

/* ------------------------------------------------------------------------- the label rule -- */

const textNode = (text) => ({ nodeType: 3, textContent: text });
const element = (children, className = '') => ({
  nodeType: 1,
  classList: { contains: (name) => className.split(' ').includes(name) },
  childNodes: children,
  children: children.filter((child) => child.nodeType === 1),
  get textContent() { return children.map((child) => child.textContent).join(''); },
});

test('controlText drops the icon ligature, which is a glyph NAME sitting in the DOM as text', () => {
  const button = element([element([textNode('graphic_eq')], 'msym'), textNode('Live channels')]);
  assert.equal(button.textContent, 'graphic_eqLive channels');
  assert.equal(controlText(button), 'Live channels');
});

test('controlMatchesLabel handles both shapes: the design\'s newline-separated badge and the built renderer\'s sibling span', () => {
  const designShape = element([element([textNode('extension')], 'msym'), textNode('Modules\n              255')]);
  const builtShape = element([
    element([textNode('extension')], 'msym'),
    element([textNode('Modules')]),
    element([textNode('255')]),
  ]);
  assert.equal(controlLabel(designShape), 'Modules');
  assert.equal(controlLabel(builtShape), 'Modules255', 'the built shape genuinely has no line to split on');
  assert.ok(controlMatchesLabel(designShape, 'Modules'));
  assert.ok(controlMatchesLabel(builtShape, 'Modules'));

  // Never a prefix match: these are two different destinations in this application.
  assert.ok(!controlMatchesLabel(element([textNode('Feature Codes')]), 'Feature codes'));
  assert.ok(!controlMatchesLabel(builtShape, 'Module'));
});

/* --------------------------------------------------------------- self-contained plans -- */

test('every navigation plan reaches its destination from a freshly loaded harness', () => {
  const manifest = JSON.parse(readFileSync(resolve(root, 'console/design-reference/capture-manifest.generated.json'), 'utf8'));
  assert.equal(manifest.destinations.length, 32);
  for (const entry of manifest.destinations) {
    const kinds = entry.navigationPlan.steps.map((step) => step.kind);
    // The manifest used to model one continuous session, so only the first destination of each
    // rail carried a rail click. The harness loads one destination per page load, so the other
    // twenty-six plans looked for a section that was not on screen — and failed, every time.
    assert.deepEqual(kinds, ['click-rail', 'click-section'], `${entry.id} does not start from its own rail`);
    assert.equal(entry.navigationPlan.steps[0].target, entry.rail === 'sys' ? 'system' : entry.rail);
  }
});

test('the vendored runtime lives outside design/, which is never edited', () => {
  assert.match(VENDOR_DIR.replaceAll('\\', '/'), /console\/design-reference\/vendor$/);
});
