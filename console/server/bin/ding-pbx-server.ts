#!/usr/bin/env node
/**
 * Entry point for server mode: `node dist-electron/server/bin/ding-pbx-server.js`.
 *
 * Reads configuration from CLI flags first, then environment variables, then a
 * documented default — always loopback-only until a bind address is chosen on purpose.
 */
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServerMode } from '../http-server.js';

function flag(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

const here = fileURLToPath(new URL('.', import.meta.url));

const host = flag('host') ?? process.env.DING_HOST ?? '127.0.0.1';
const port = Number(flag('port') ?? process.env.DING_PORT ?? '8443');
const dataDir = flag('data-dir') ?? process.env.DING_DATA_DIR ?? join(process.env.HOME ?? process.env.USERPROFILE ?? '.', '.ding-pbx-console');
const staticRoot = flag('static-root') ?? process.env.DING_STATIC_ROOT ?? join(here, '../../../dist');
const resourcesDir = flag('resources-dir') ?? process.env.DING_RESOURCES_DIR ?? join(here, '../../../resources');
const certPath = flag('cert') ?? process.env.DING_TLS_CERT;
const keyPath = flag('key') ?? process.env.DING_TLS_KEY;

if (Number.isNaN(port) || port <= 0 || port > 65535) {
  console.error(`Invalid port: ${flag('port') ?? process.env.DING_PORT}`);
  process.exit(1);
}
if ((certPath && !keyPath) || (!certPath && keyPath)) {
  console.error('Both --cert and --key (or DING_TLS_CERT and DING_TLS_KEY) must be supplied together.');
  process.exit(1);
}

const server = startServerMode({
  staticRoot,
  dataDir,
  resourcesDir,
  host,
  port,
  tls: certPath && keyPath ? { certPath, keyPath } : undefined,
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
