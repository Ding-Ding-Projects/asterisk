#!/usr/bin/env node
/**
 * The static host a design-parity reference capture is taken against.
 *
 * Two things make this more than `http-server .`:
 *
 * 1. `design/support.js` fetches React from unpkg at boot. A capture run must not reach the
 *    network — every other asset in this project is local — so the design document is served
 *    through one virtual directory that injects a single inline <script> setting the design
 *    runtime's OWN `window.__resources` override map, pointing both React URLs at the
 *    vendored copies under console/design-reference/vendor/. Nothing under design/ is
 *    edited, on disk or in flight: the injected script sits in <head> before support.js and
 *    the <x-dc> template the runtime actually renders is passed through byte-for-byte.
 *
 * 2. `<script src="./support.js">` and `<dc-import name="M3 Control">` are both resolved
 *    relative to the served document, so that virtual directory has to answer for the whole
 *    of design/ — otherwise the design boots with no runtime, or renders its imported
 *    control as an empty placeholder while looking like it worked.
 *
 * Requests are confined to the repository root by comparing resolved absolute paths, so a
 * `..` in a URL cannot reach outside the checkout.
 */
import { createServer } from 'node:http';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { pinsFromSupportJs } from './vendor-design-react-host.mjs';

/** The virtual directory the injected copy of the design is served from. */
export const DESIGN_HOST_PREFIX = '/console/design-reference/design-host/';
const VENDOR_URL_PREFIX = '/console/design-reference/vendor/';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

/**
 * Builds the inline shim that hands the design runtime its own local React.
 *
 * The two keys are read from design/support.js's own `REACT_URL`/`REACT_DOM_URL`
 * declarations rather than typed here: `cdnScriptFor()` looks the requested URL up in
 * `window.__resources` by exact string, so a key that has drifted from the design's pin
 * silently falls through to the network — which is precisely the failure this exists to stop.
 */
export function reactHostShim(pins) {
  const map = Object.fromEntries(pins.map((pin) => [pin.url, `${VENDOR_URL_PREFIX}${pin.file}`]));
  return `<script>window.__resources=Object.assign(window.__resources||{},${JSON.stringify(map)});</script>`;
}

/**
 * Inserts the shim immediately before the design's own support.js tag.
 *
 * Throws rather than appending somewhere plausible when that tag is not found: a shim that
 * lands after the runtime has already booted is inert, and an inert shim looks identical to
 * a working one until the capture comes back as an unstyled empty page.
 */
export function injectReactHost(html, pins) {
  const tag = '<script src="./support.js"></script>';
  const at = html.indexOf(tag);
  if (at === -1) {
    throw new Error("design-parity-server: design document has no '<script src=\"./support.js\"></script>' tag to inject the local React host before");
  }
  return html.slice(0, at) + reactHostShim(pins) + html.slice(at);
}

/**
 * Both paths are resolved before comparison, and that resolve is load-bearing rather than
 * defensive tidying. A caller-supplied root written with forward slashes compares unequal to
 * the backslash path `resolve()` produces, so every single request 404s while the root
 * plainly exists — a confinement check that refuses everything looks exactly like a
 * confinement check that works.
 */
function withinRoot(root, candidate) {
  const normalized = resolve(root);
  const rootWithSep = normalized.endsWith(sep) ? normalized : normalized + sep;
  return candidate === normalized || candidate.startsWith(rootWithSep);
}

/**
 * Starts the capture host.
 *
 * @param {object} options
 * @param {string} options.root absolute repository root; nothing outside it is ever served
 * @param {number} [options.port] 0 (the default) asks the OS for a free port
 * @returns {Promise<{origin:string, port:number, requests:string[], close:()=>Promise<void>}>}
 */
export async function startCaptureServer({ root, port = 0 }) {
  if (!root || !existsSync(root)) throw new Error(`design-parity-server: root '${root}' does not exist`);
  const pins = pinsFromSupportJs(readFileSync(resolve(root, 'design', 'support.js'), 'utf8'));
  const requests = [];

  const server = createServer((request, response) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    } catch {
      response.writeHead(400).end('bad request path');
      return;
    }
    requests.push(pathname);

    const designHosted = pathname.startsWith(DESIGN_HOST_PREFIX);
    const relative = designHosted
      ? join('design', pathname.slice(DESIGN_HOST_PREFIX.length))
      : pathname.replace(/^\/+/, '');
    const absolute = resolve(root, relative);
    if (!withinRoot(root, absolute) || !existsSync(absolute) || !statSync(absolute).isFile()) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end(`not found: ${pathname}`);
      return;
    }

    const type = MIME[extname(absolute).toLowerCase()] ?? 'application/octet-stream';
    if (designHosted && absolute.toLowerCase().endsWith('.dc.html')) {
      let body;
      try {
        body = injectReactHost(readFileSync(absolute, 'utf8'), pins);
      } catch (error) {
        response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' }).end(error.message);
        return;
      }
      response.writeHead(200, { 'content-type': type, 'cache-control': 'no-store', 'access-control-allow-origin': '*' });
      response.end(body);
      return;
    }
    response.writeHead(200, { 'content-type': type, 'cache-control': 'no-store', 'access-control-allow-origin': '*' });
    createReadStream(absolute).pipe(response);
  });

  await new Promise((ready, fail) => {
    server.once('error', fail);
    server.listen(port, '127.0.0.1', ready);
  });
  const actualPort = server.address().port;
  return {
    origin: `http://127.0.0.1:${actualPort}`,
    port: actualPort,
    requests,
    close: () => new Promise((done) => server.close(done)),
  };
}
