/* Minimal static file server for driving the built site locally, no deps, no network. */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';

const root = normalize(process.argv[2]);
const port = Number(process.argv[3] || 8099);
if (!root) { console.error('usage: static-server.mjs <root> <port>'); process.exit(1); }

const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json',
  '.png':'image/png', '.svg':'image/svg+xml', '.woff2':'font/woff2', '.woff':'font/woff', '.ico':'image/x-icon' };

const server = createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath.endsWith('/')) urlPath += 'index.html';
    const full = normalize(join(root, urlPath));
    if (!full.startsWith(root)) { res.writeHead(403); res.end(); return; }
    const s = await stat(full).catch(() => null);
    if (!s || !s.isFile()) { res.writeHead(404); res.end('not found: ' + urlPath); return; }
    const body = await readFile(full);
    res.writeHead(200, { 'Content-Type': MIME[extname(full)] || 'application/octet-stream' });
    res.end(body);
  } catch (e) {
    res.writeHead(500); res.end(String(e));
  }
});
server.listen(port, '127.0.0.1', () => console.log(`serving ${root} on http://127.0.0.1:${port}`));
