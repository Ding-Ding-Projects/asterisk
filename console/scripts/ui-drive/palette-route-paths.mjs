/**
 * Where the palette-route evidence lives, and how a record is read, in one place.
 *
 * The driver writes it and the checker reads it, and those two run under different runtimes --
 * plain `node` for the driver, `tsx` for the checker, because only the checker imports the
 * TypeScript renderer. Two copies of the same path is how one of them silently starts writing
 * or reading somewhere the other never looks, which is the "wired at one end and consumed at
 * neither" shape this whole exercise exists to stop.
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const REPO = resolve(import.meta.dirname, '..', '..', '..');
export const RECORDS_DIR = resolve(REPO, 'console/release/evidence/windows-console');
export const CAPTURES_DIR = resolve(REPO, 'console/release/captures/ui-drive/palette-routes');
export const READINGS_PATH = resolve(REPO, 'console/release/evidence/ui-drive/palette-route-readings.json');

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
export const posix = (p) => p.split('\\').join('/');

/** Every built-interaction record, keyed by its feature id, which is its filename stem. */
export function readRecords() {
  const out = {};
  for (const entry of readdirSync(RECORDS_DIR)) {
    if (!entry.endsWith('.json')) continue;
    out[entry.slice(0, -'.json'.length)] = JSON.parse(readFileSync(join(RECORDS_DIR, entry), 'utf8'));
  }
  return out;
}
