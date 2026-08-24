export interface AsteriskReadiness {
  ok: boolean;
  version?: string;
  reason?: string;
}

/**
 * Asterisk CLI commands can return exit code zero while printing a connection
 * failure. Readiness therefore requires a real version line and rejects known
 * error text before any caller reports a target as ready.
 */
export function parseAsteriskReadiness(output: string, errorOutput = ''): AsteriskReadiness {
  const text = output.replaceAll('\0', '').trim();
  const errors = `${text}\n${errorOutput}`;
  if (!text || /unable to connect to remote asterisk|asterisk is not running|no such file|error:/iu.test(errors)) {
    return { ok: false, reason: (errorOutput.trim() || text || 'Asterisk did not report readiness.').split(/\r?\n/u)[0] };
  }
  const match = text.match(/\bAsterisk\s+(?<version>\d+\.\d+(?:\.\d+)?(?:[-+][0-9A-Za-z.-]+)?)/iu);
  if (!match?.groups?.version) return { ok: false, reason: 'Asterisk did not report a real version.' };
  return { ok: true, version: match.groups.version };
}
