/**
 * A loopback static file server for the built site, and nothing else.
 *
 * The site cannot be driven from a `file://` URL. Chromium gives a file document an opaque
 * origin, so `localStorage` throws on access -- and this site keeps every setting, the
 * notification list, the append-only local history and the vocabulary cache there. A drive
 * over `file://` would therefore photograph a site whose entire persistence layer had thrown
 * on the first line, which looks like a working page with nothing saved rather than like an
 * error, and is exactly the sort of evidence this project keeps having to throw away.
 *
 * Deliberately narrow: it binds 127.0.0.1 only, serves the one directory it was handed, and
 * refuses any path that escapes it. There is no directory listing, no upload route and no
 * write path of any kind, because the only thing that ever talks to it is the capture run.
 */
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, relative, resolve, sep } from 'node:path';

const TYPES = new Map(Object.entries({
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon',
}));

/**
 * Resolves one request path inside the served root, or returns null.
 *
 * Resolution happens before the containment test rather than after, so `..` segments are
 * already collapsed when containment is decided -- a check on the raw request string would
 * be satisfied by any encoding the URL parser normalises later.
 */
export function resolveWithin(root, requestPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(requestPath.split('?')[0].split('#')[0]);
  } catch {
    return null;
  }
  if (decoded.endsWith('/')) decoded += 'index.html';
  const absolute = resolve(root, `.${decoded}`);
  const inside = relative(root, absolute);
  if (inside.startsWith('..') || inside.startsWith(`..${sep}`)) return null;
  return absolute;
}

export async function startSiteServer(root, { requests = [] } = {}) {
  const server = createServer((request, response) => {
    const absolute = resolveWithin(root, request.url || '/');
    requests.push(request.url || '/');
    if (!absolute) {
      response.writeHead(403, { 'content-type': 'text/plain' });
      response.end('refused: path escapes the served root');
      return;
    }
    let stats;
    try {
      stats = statSync(absolute);
    } catch {
      response.writeHead(404, { 'content-type': 'text/plain' });
      response.end('not found');
      return;
    }
    if (stats.isDirectory()) {
      response.writeHead(302, { location: `${request.url.replace(/\/$/, '')}/index.html` });
      response.end();
      return;
    }
    response.writeHead(200, {
      'content-type': TYPES.get(extname(absolute).toLowerCase()) ?? 'application/octet-stream',
      'content-length': stats.size,
      'cache-control': 'no-store',
    });
    createReadStream(absolute).pipe(response);
  });

  await new Promise((res, rej) => {
    server.once('error', rej);
    server.listen(0, '127.0.0.1', res);
  });
  const { port } = server.address();
  return {
    port,
    origin: `http://127.0.0.1:${port}`,
    requests,
    close: () => new Promise((res) => server.close(res)),
  };
}

export const servedIndexOf = (root) => join(root, 'index.html');
