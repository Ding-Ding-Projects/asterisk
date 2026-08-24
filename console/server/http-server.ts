/**
 * Hosted server boundary. It serves static assets, classifies administrator account
 * storage, enforces sessions before the application shell is delivered, and keeps all
 * control-plane authorization on the server.
 */
import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import type { Server } from 'node:http';
import {
  FileAccountStore,
  LoginRateLimiter,
  SessionManager,
  createAdminAccount,
  loadOrCreateSigningKey,
  verifyPassword,
  type AccountReadResult,
  type AccountStore,
} from './auth.js';
import { createControlPlaneDispatcher } from '../control-plane/dispatch.js';
import type { ControlPlaneRequest } from '../shared/control-plane.js';
import {
  HOSTED_AUTH_API_VERSION,
  type HostedHealthStatus,
  type HostedSessionStatus,
  type HostedSetupStatus,
} from '../shared/hosted-auth.js';

export interface ServerModeOptions {
  staticRoot: string;
  dataDir: string;
  resourcesDir: string;
  host?: string;
  port?: number;
  tls?: { certPath: string; keyPath: string };
  /**
   * Development escape hatch for an intentionally exposed plain-HTTP process. It is
   * honored only when NODE_ENV is exactly `development` and should never be set by a
   * service definition or production launcher.
   */
  allowInsecureDevelopmentAuth?: boolean;
}

const MIME: Readonly<Record<string, string>> = {
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

export const PLAIN_HTTP_WARNING =
  'This server is running over plain HTTP. Session cookies and requests travel unencrypted. ' +
  'Use TLS for access from another computer. Password setup and sign-in are refused on exposed ' +
  'plain HTTP unless an explicit development-only override is active.';

const ACCOUNT_RECOVERY_MESSAGE =
  'Administrator account storage is corrupt. Restore admin-account.json from a trusted backup, ' +
  'or move the corrupt file aside manually and restart the server. Setup remains disabled while ' +
  'the corrupt file exists.';
const SESSION_COOKIE = 'ding_session';
const AUTH_BODY_LIMIT = 16 * 1024;
const CONTROL_PLANE_BODY_LIMIT = 5 * 1024 * 1024;

class RequestError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
  }
}

function isLoopbackHost(host: string): boolean {
  const normalized = host.trim().toLowerCase().replace(/^\[|\]$/gu, '');
  return normalized === 'localhost' || normalized === '::1' || /^127(?:\.[0-9]{1,3}){3}$/u.test(normalized);
}

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
  const configuredHost = options.host ?? '127.0.0.1';
  const developmentOverride = options.allowInsecureDevelopmentAuth === true && process.env.NODE_ENV === 'development';
  const authTransportAllowed = tlsEnabled || isLoopbackHost(configuredHost) || developmentOverride;

  function readCookie(req: IncomingMessage): string | undefined {
    const header = req.headers.cookie;
    if (!header || header.length > 4_096) return undefined;
    for (const part of header.split(';')) {
      const [name, ...rest] = part.trim().split('=');
      if (name === SESSION_COOKIE) return rest.join('=').slice(0, 256);
    }
    return undefined;
  }

  function setSessionCookie(res: ServerResponse, value: string, expires: Date): void {
    const attributes = [
      `${SESSION_COOKIE}=${value}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Strict',
      `Expires=${expires.toUTCString()}`,
    ];
    if (tlsEnabled) attributes.push('Secure');
    res.setHeader('Set-Cookie', attributes.join('; '));
  }

  function clearSessionCookie(res: ServerResponse): void {
    const attributes = [`${SESSION_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Strict', 'Max-Age=0'];
    if (tlsEnabled) attributes.push('Secure');
    res.setHeader('Set-Cookie', attributes.join('; '));
  }

  function sourceKey(req: IncomingMessage): string {
    return (req.socket.remoteAddress ?? 'unknown').slice(0, 128);
  }

  async function readJsonBody(req: IncomingMessage, limit: number): Promise<unknown> {
    const contentType = req.headers['content-type']?.split(';', 1)[0]?.trim().toLowerCase();
    if (contentType !== 'application/json') throw new RequestError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Use application/json for this request.');
    const chunks: Buffer[] = [];
    let total = 0;
    for await (const rawChunk of req) {
      const chunk = Buffer.isBuffer(rawChunk) ? rawChunk : Buffer.from(rawChunk);
      total += chunk.length;
      if (total > limit) throw new RequestError(413, 'REQUEST_TOO_LARGE', 'The request body is too large.');
      chunks.push(chunk);
    }
    if (chunks.length === 0) return {};
    try {
      return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      throw new RequestError(400, 'INVALID_JSON', 'The request body is not valid JSON.');
    }
  }

  function sendJson(res: ServerResponse, status: number, body: unknown, extraHeaders?: Readonly<Record<string, string>>): void {
    const text = JSON.stringify(body);
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(text),
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      ...extraHeaders,
    });
    res.end(text);
  }

  function redirect(res: ServerResponse, location: '/login.html' | '/setup.html'): void {
    res.writeHead(303, { Location: location, 'Cache-Control': 'no-store', 'Content-Length': '0' });
    res.end();
  }

  function accountState(): AccountReadResult {
    return accountStore.readState();
  }

  function authenticatedSession(req: IncomingMessage, account = accountState()): { username: string } | undefined {
    if (!authTransportAllowed || account.state !== 'valid') return undefined;
    const session = sessions.verify(readCookie(req));
    return session?.username === account.record.username ? session : undefined;
  }

  function setupStatus(account = accountState()): HostedSetupStatus {
    return {
      apiVersion: HOSTED_AUTH_API_VERSION,
      accountState: account.state,
      needsSetup: account.state === 'missing',
      tlsEnabled,
      authTransportAllowed,
      plainHttpWarning: tlsEnabled ? undefined : PLAIN_HTTP_WARNING,
      recoveryMessage: account.state === 'corrupt' ? ACCOUNT_RECOVERY_MESSAGE : undefined,
    };
  }

  function sessionStatus(req: IncomingMessage, account = accountState()): HostedSessionStatus {
    const session = authenticatedSession(req, account);
    return {
      ...setupStatus(account),
      authenticated: Boolean(session),
      username: session?.username,
    };
  }

  function serveStatic(res: ServerResponse, urlPath: string): void {
    const relative = urlPath === '/' ? '/index.html' : urlPath;
    const normalized = normalize(relative).replace(/^([.]{2}[/\\])+/u, '');
    const filePath = join(options.staticRoot, normalized);
    if (!filePath.startsWith(options.staticRoot + sep) && filePath !== join(options.staticRoot, 'index.html')) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Forbidden');
      return;
    }
    const requestedFileExists = existsSync(filePath) && statSync(filePath).isFile();
    const finalPath = requestedFileExists ? filePath : join(options.staticRoot, 'index.html');
    if (!existsSync(finalPath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
      return;
    }
    const type = MIME[extname(finalPath).toLowerCase()] ?? 'application/octet-stream';
    const headers: Record<string, string> = {
      'Content-Type': type,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'same-origin',
    };
    if (type.startsWith('text/html')) headers['Cache-Control'] = 'no-store';
    res.writeHead(200, headers);
    createReadStream(finalPath).pipe(res);
  }

  async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://internal');
    const path = url.pathname;

    try {
      if (path === '/api/health' && req.method === 'GET') {
        const degraded = accountState().state === 'corrupt';
        const body: HostedHealthStatus = {
          apiVersion: HOSTED_AUTH_API_VERSION,
          service: 'ding-pbx-console',
          status: degraded ? 'degraded' : 'ok',
        };
        sendJson(res, degraded ? 503 : 200, body);
        return;
      }

      if (path === '/api/setup' && req.method === 'GET') {
        sendJson(res, 200, setupStatus());
        return;
      }

      if (path === '/api/setup' && req.method === 'POST') {
        const account = accountState();
        if (account.state === 'valid') {
          sendJson(res, 409, { error: 'ALREADY_SET_UP', message: 'An administrator account already exists.' });
          return;
        }
        if (account.state === 'corrupt') {
          sendJson(res, 503, { error: 'ACCOUNT_STORE_CORRUPT', message: ACCOUNT_RECOVERY_MESSAGE });
          return;
        }
        if (!authTransportAllowed) {
          sendJson(res, 403, { error: 'INSECURE_AUTH_TRANSPORT', message: PLAIN_HTTP_WARNING });
          return;
        }
        const body = await readJsonBody(req, AUTH_BODY_LIMIT) as { username?: unknown; password?: unknown };
        try {
          createAdminAccount(accountStore, typeof body.username === 'string' ? body.username : '', typeof body.password === 'string' ? body.password : '');
        } catch (error) {
          const current = accountState();
          if (current.state === 'valid') {
            sendJson(res, 409, { error: 'ALREADY_SET_UP', message: 'An administrator account already exists.' });
            return;
          }
          if (current.state === 'corrupt') {
            sendJson(res, 503, { error: 'ACCOUNT_STORE_CORRUPT', message: ACCOUNT_RECOVERY_MESSAGE });
            return;
          }
          sendJson(res, 400, { error: 'INVALID_ACCOUNT', message: error instanceof Error ? error.message : 'Could not create the account.' });
          return;
        }
        sendJson(res, 201, { ok: true });
        return;
      }

      if (path === '/api/session' && req.method === 'GET') {
        sendJson(res, 200, sessionStatus(req));
        return;
      }

      if (path === '/api/login' && req.method === 'POST') {
        if (!authTransportAllowed) {
          sendJson(res, 403, { error: 'INSECURE_AUTH_TRANSPORT', message: PLAIN_HTTP_WARNING });
          return;
        }
        const account = accountState();
        if (account.state === 'missing') {
          sendJson(res, 409, { error: 'SETUP_REQUIRED', message: 'Create the administrator account before signing in.' });
          return;
        }
        if (account.state === 'corrupt') {
          sendJson(res, 503, { error: 'ACCOUNT_STORE_CORRUPT', message: ACCOUNT_RECOVERY_MESSAGE });
          return;
        }
        const key = sourceKey(req);
        const limited = limiter.check(key);
        if (limited) {
          sendJson(
            res,
            429,
            { error: 'RATE_LIMITED', message: limited.message, retryAfterSeconds: limited.retryAfterSeconds },
            { 'Retry-After': String(limited.retryAfterSeconds) },
          );
          return;
        }
        const body = await readJsonBody(req, AUTH_BODY_LIMIT) as { username?: unknown; password?: unknown };
        const username = typeof body.username === 'string' ? body.username : '';
        const password = typeof body.password === 'string' ? body.password : '';
        const candidateHash = account.record.username === username ? account.record.passwordHash : HASH_FOR_TIMING_PARITY;
        const passwordAccepted = verifyPassword(password, candidateHash);
        if (account.record.username !== username || !passwordAccepted) {
          limiter.recordFailure(key);
          sendJson(res, 401, { error: 'INVALID_CREDENTIALS', message: 'That username or password was not accepted.' });
          return;
        }
        limiter.recordSuccess(key);
        const { cookieValue, expiresAt } = sessions.create(username);
        setSessionCookie(res, cookieValue, expiresAt);
        sendJson(res, 200, { ok: true, username });
        return;
      }

      if (path === '/api/logout' && req.method === 'POST') {
        sessions.revoke(readCookie(req));
        clearSessionCookie(res);
        sendJson(res, 200, { ok: true });
        return;
      }

      if (path === '/api/sessions/revoke' && req.method === 'POST') {
        const session = authenticatedSession(req);
        if (!session) {
          clearSessionCookie(res);
          sendJson(res, 401, { error: 'UNAUTHENTICATED', message: 'Sign in first.' });
          return;
        }
        const revokedSessions = sessions.revokeAll(session.username);
        clearSessionCookie(res);
        sendJson(res, 200, { ok: true, revokedSessions });
        return;
      }

      if (path === '/api/control-plane' && req.method === 'POST') {
        const account = accountState();
        if (account.state === 'corrupt') {
          sendJson(res, 503, { error: 'ACCOUNT_STORE_CORRUPT', message: ACCOUNT_RECOVERY_MESSAGE });
          return;
        }
        const session = authenticatedSession(req, account);
        if (!session) {
          sendJson(res, 401, { error: 'UNAUTHENTICATED', message: 'Sign in first.' });
          return;
        }
        const request = await readJsonBody(req, CONTROL_PLANE_BODY_LIMIT) as ControlPlaneRequest;
        if (!request || typeof request.requestId !== 'string' || request.requestId.length > 128 || typeof request.action !== 'string') {
          sendJson(res, 400, { error: 'INVALID_REQUEST', message: 'Malformed control-plane request.' });
          return;
        }
        const response = await dispatcher.controlPlaneRequest(request);
        sendJson(res, 200, response);
        return;
      }

      if (path.startsWith('/api/')) {
        sendJson(res, 404, { error: 'NOT_FOUND', message: 'No API route matches this request.' });
        return;
      }

      const account = accountState();
      if (path === '/setup.html') {
        if (account.state !== 'missing') redirect(res, '/login.html');
        else serveStatic(res, path);
        return;
      }
      if (path === '/login.html') {
        if (account.state === 'missing') redirect(res, '/setup.html');
        else serveStatic(res, path);
        return;
      }

      const isApplicationShell = path === '/' || path === '/index.html' || extname(path) === '';
      if (isApplicationShell) {
        if (account.state === 'missing') {
          redirect(res, '/setup.html');
          return;
        }
        if (account.state === 'corrupt' || !authenticatedSession(req, account)) {
          redirect(res, '/login.html');
          return;
        }
      }
      serveStatic(res, path);
    } catch (error) {
      if (error instanceof RequestError) {
        sendJson(res, error.status, { error: error.code, message: error.message });
        return;
      }
      sendJson(res, 500, { error: 'INTERNAL_ERROR', message: 'The server could not complete the request.' });
    }
  }

  return { handleRequest, sessions, accountStore, limiter };
}

const HASH_FOR_TIMING_PARITY = 'scrypt$16384$8$1$00000000000000000000000000000000$' + '0'.repeat(128);

export function startServerMode(options: ServerModeOptions): Server {
  const { handleRequest } = createServerModeHandler(options);
  const host = options.host ?? '127.0.0.1';
  const port = options.port ?? 8443;
  const server: Server = options.tls
    ? createHttpsServer({ cert: readFileSync(options.tls.certPath), key: readFileSync(options.tls.keyPath) }, handleRequest)
    : createHttpServer(handleRequest);
  server.listen(port, host, () => {
    console.log(`Ding PBX Console server mode listening on ${options.tls ? 'https' : 'http'}://${host}:${port}`);
    if (!options.tls) console.log(PLAIN_HTTP_WARNING);
  });
  return server;
}
