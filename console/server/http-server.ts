/**
 * Server mode: serves the already-compiled renderer (`dist/`) and the control plane
 * over plain HTTP(S), so Material Asterisk can be installed on a VM next to Asterisk and
 * administered from a browser on the network — the way FreePBX is administered.
 *
 * No web framework. `node:http`/`node:https` plus a small router is everything a JSON
 * API and a handful of static files need, and it keeps the dependency list exactly
 * where the shared instructions ask it to stay: nothing new unless unavoidable.
 */
import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { readFileSync, existsSync, statSync, createReadStream } from 'node:fs';
import { join, extname, normalize, sep } from 'node:path';
import type { Server } from 'node:http';
import {
  FileAccountStore, SessionManager, LoginRateLimiter, hasAdminAccount, createAdminAccount,
  verifyPassword, passwordPolicyViolation, loadOrCreateSigningKey, type AccountStore,
} from './auth.js';
import { createControlPlaneDispatcher } from '../control-plane/dispatch.js';
import type { ControlPlaneRequest } from '../shared/control-plane.js';

export interface ServerModeOptions {
  /** Directory containing the compiled renderer (`index.html`, `assets/…`). */
  staticRoot: string;
  /** Where per-installation state lives: the admin account, session key, server
   *  inventory, local history. Analogous to Electron's `userData` directory. */
  dataDir: string;
  /** Packaged read-only assets. A hosted install has no bundled WSL payload, so this
   *  may point anywhere — every action that would need it is refused by name instead. */
  resourcesDir: string;
  /** Bind address. Defaults to loopback so installing this on a VM never silently
   *  exposes a PBX admin surface to the whole network without an explicit choice. */
  host?: string;
  port?: number;
  /** Supply both to serve over TLS. Omit to serve plain HTTP — see `httpSecurityNote`. */
  tls?: { certPath: string; keyPath: string };
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ico': 'image/x-icon',
};

/** The exact, honest sentence shown (and returned from `GET /api/session`) when the
 *  server is not behind TLS — read before deciding this is fine on your network. */
export const PLAIN_HTTP_WARNING =
  'This server is running over plain HTTP. The session cookie and every request travel unencrypted; ' +
  'anyone who can observe traffic on this network segment can read them. Supply --cert and --key (or ' +
  'the DING_TLS_CERT / DING_TLS_KEY environment variables) to serve over TLS instead. Plain HTTP is ' +
  'acceptable only on a network you trust completely, such as a private management VLAN with no other tenants.';

const SESSION_COOKIE = 'ding_session';

export function createServerModeHandler(options: ServerModeOptions) {
  const accountStore: AccountStore = new FileAccountStore(join(options.dataDir, 'admin-account.json'));
  const signingKey = loadOrCreateSigningKey(join(options.dataDir, 'session-signing-key'));
  const sessions = new SessionManager({ signingKey });
  const limiter = new LoginRateLimiter();
  const dispatcher = createControlPlaneDispatcher({
    userDataPath: options.dataDir,
    resourcesPath: options.resourcesDir,
    hosted: true,
  });
  const tlsEnabled = Boolean(options.tls);

  function readCookie(req: IncomingMessage): string | undefined {
    const header = req.headers.cookie;
    if (!header) return undefined;
    for (const part of header.split(';')) {
      const [name, ...rest] = part.trim().split('=');
      if (name === SESSION_COOKIE) return rest.join('=');
    }
    return undefined;
  }

  function setSessionCookie(res: ServerResponse, value: string, expires: Date) {
    const attrs = [
      `${SESSION_COOKIE}=${value}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Strict',
      `Expires=${expires.toUTCString()}`,
    ];
    if (tlsEnabled) attrs.push('Secure');
    res.setHeader('Set-Cookie', attrs.join('; '));
  }

  function clearSessionCookie(res: ServerResponse) {
    const attrs = [`${SESSION_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Strict', 'Max-Age=0'];
    if (tlsEnabled) attrs.push('Secure');
    res.setHeader('Set-Cookie', attrs.join('; '));
  }

  function sourceKey(req: IncomingMessage): string {
    // The socket's own remote address, never an X-Forwarded-For header — a client
    // cannot claim a different rate-limit identity than the connection it actually made.
    return req.socket.remoteAddress ?? 'unknown';
  }

  async function readJsonBody(req: IncomingMessage): Promise<unknown> {
    const chunks: Buffer[] = [];
    let total = 0;
    for await (const chunk of req) {
      total += (chunk as Buffer).length;
      if (total > 5 * 1024 * 1024) throw new Error('Request body too large.');
      chunks.push(chunk as Buffer);
    }
    if (chunks.length === 0) return {};
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }

  function sendJson(res: ServerResponse, status: number, body: unknown) {
    const text = JSON.stringify(body);
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(text),
      // A JSON API response is never itself a page; refuse framing/sniffing regardless.
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(text);
  }

  function serveStatic(req: IncomingMessage, res: ServerResponse, urlPath: string) {
    const relative = urlPath === '/' ? '/index.html' : urlPath;
    // Reject any traversal before touching the filesystem, and resolve within the
    // static root only — a request naming another user's session id in the path
    // component must never be allowed to reach outside `staticRoot`.
    const normalized = normalize(relative).replace(/^([.]{2}[/\\])+/, '');
    const filePath = join(options.staticRoot, normalized);
    if (!filePath.startsWith(options.staticRoot + sep) && filePath !== join(options.staticRoot, 'index.html')) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    const finalPath = existsSync(filePath) && statSync(filePath).isFile() ? filePath : join(options.staticRoot, 'index.html');
    if (!existsSync(finalPath)) {
      res.writeHead(404).end('Not found');
      return;
    }
    const type = MIME[extname(finalPath).toLowerCase()] ?? 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    createReadStream(finalPath).pipe(res);
  }

  async function handleRequest(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? '/', 'http://internal');
    const path = url.pathname;

    try {
      if (path === '/api/setup' && req.method === 'GET') {
        return sendJson(res, 200, { needsSetup: !hasAdminAccount(accountStore), tlsEnabled });
      }
      if (path === '/api/setup' && req.method === 'POST') {
        if (hasAdminAccount(accountStore)) return sendJson(res, 409, { error: 'ALREADY_SET_UP', message: 'An administrator account already exists.' });
        const body = await readJsonBody(req) as { username?: string; password?: string };
        try {
          createAdminAccount(accountStore, String(body.username ?? ''), String(body.password ?? ''));
        } catch (error) {
          return sendJson(res, 400, { error: 'INVALID_ACCOUNT', message: error instanceof Error ? error.message : 'Could not create the account.' });
        }
        return sendJson(res, 201, { ok: true });
      }

      if (path === '/api/session' && req.method === 'GET') {
        const session = sessions.verify(readCookie(req));
        return sendJson(res, 200, {
          authenticated: Boolean(session),
          username: session?.username,
          needsSetup: !hasAdminAccount(accountStore),
          tlsEnabled,
          plainHttpWarning: tlsEnabled ? undefined : PLAIN_HTTP_WARNING,
        });
      }

      if (path === '/api/login' && req.method === 'POST') {
        const key = sourceKey(req);
        const limited = limiter.check(key);
        if (limited) return sendJson(res, 429, { error: 'RATE_LIMITED', message: limited });

        const state = accountStore.readState();
        const account = state.state === 'valid' ? state.record : undefined;
        const body = await readJsonBody(req) as { username?: string; password?: string };
        const username = String(body.username ?? '');
        const password = String(body.password ?? '');

        // Always run a verification, even with no account or a wrong username, so the
        // response timing does not distinguish "no such account" from "wrong password".
        const candidateHash = account && account.username === username ? account.passwordHash : hashForTimingParity;
        const passwordOk = verifyPassword(password, candidateHash);
        const ok = Boolean(account) && account!.username === username && passwordOk;

        if (!ok) {
          limiter.recordFailure(key);
          return sendJson(res, 401, { error: 'INVALID_CREDENTIALS', message: 'That username or password was not accepted.' });
        }
        limiter.recordSuccess(key);
        const { cookieValue, expiresAt } = sessions.create(username);
        setSessionCookie(res, cookieValue, expiresAt);
        return sendJson(res, 200, { ok: true, username });
      }

      if (path === '/api/logout' && req.method === 'POST') {
        sessions.revoke(readCookie(req));
        clearSessionCookie(res);
        return sendJson(res, 200, { ok: true });
      }

      if (path === '/api/control-plane' && req.method === 'POST') {
        const session = sessions.verify(readCookie(req));
        if (!session) return sendJson(res, 401, { error: 'UNAUTHENTICATED', message: 'Sign in first.' });
        const request = await readJsonBody(req) as ControlPlaneRequest;
        if (!request || typeof request.requestId !== 'string' || typeof request.action !== 'string') {
          return sendJson(res, 400, { error: 'INVALID_REQUEST', message: 'Malformed control-plane request.' });
        }
        const response = await dispatcher.controlPlaneRequest(request);
        return sendJson(res, 200, response);
      }

      if (path.startsWith('/api/')) return sendJson(res, 404, { error: 'NOT_FOUND' });

      return serveStatic(req, res, path);
    } catch (error) {
      sendJson(res, 500, { error: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unexpected server error.' });
    }
  }

  return { handleRequest, sessions, accountStore, limiter };
}

/** A verification is run against this even when no matching account exists, purely so
 *  the scrypt cost is paid on every login attempt regardless of outcome. It can never
 *  match a real password because it is not a hash of anything a user typed. */
const hashForTimingParity = 'scrypt$16384$8$1$00000000000000000000000000000000$' +
  '0'.repeat(128);

export function startServerMode(options: ServerModeOptions): Server {
  const { handleRequest } = createServerModeHandler(options);
  const host = options.host ?? '127.0.0.1';
  const port = options.port ?? 8443;

  let server: Server;
  if (options.tls) {
    server = createHttpsServer(
      { cert: readFileSync(options.tls.certPath), key: readFileSync(options.tls.keyPath) },
      handleRequest,
    );
  } else {
    server = createHttpServer(handleRequest);
  }
  server.listen(port, host, () => {
    // eslint-disable-next-line no-console
    console.log(`Material Asterisk server mode listening on ${options.tls ? 'https' : 'http'}://${host}:${port}`);
    if (!options.tls) console.log(PLAIN_HTTP_WARNING);
  });
  return server;
}
