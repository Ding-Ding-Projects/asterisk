/**
 * Persists the SSH targets a user has approved for this deployer, so approval
 * survives a restart of the application.
 *
 * This is deliberately separate from host-key trust: `ssh.ts`'s `accept-new` policy
 * against a persistent `known_hosts` file is what pins the actual key and stops a
 * later mismatch, and that file already lives at a fixed path across restarts (see
 * `main.ts`). This store answers a narrower question — "is this exact host:port on
 * the list of targets this user has ever said yes to at all" — which is the
 * `approvedSshIdentities` allowlist `SshPolicyAdapter` requires before it will build
 * any command for a target. Without persisting *this* list, every restart of the
 * deployer would silently re-open that allowlist to the first host:port anyone
 * types, defeating the point of having one.
 *
 * Plain JSON file I/O in the privileged main process. Not a target-machine command,
 * so the "no shell, ever" executor rule does not apply here — nothing here spawns a
 * process.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

export interface ApprovedSshTargetRecord {
  host: string;
  port: number;
  user: string;
  label?: string;
  addedAt: string;
}

const HOST_PATTERN = /^([a-zA-Z0-9](?:[a-zA-Z0-9.-]{0,251}[a-zA-Z0-9])?|\[[0-9a-fA-F:]+\])$/u;
const USER_PATTERN = /^[a-z_][a-z0-9_-]{0,31}$/u;

export function validateSshIdentityShape(host: string, port: number, user: string): string | undefined {
  if (!HOST_PATTERN.test(host)) return "Host must be an exact DNS name, IPv4 address, or bracketed IPv6 address.";
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) return "Port must be an integer between 1 and 65535.";
  if (!USER_PATTERN.test(user)) return "User must be a valid POSIX username.";
  return undefined;
}

export class SshIdentityStore {
  readonly #path: string;
  #records: ApprovedSshTargetRecord[] = [];
  #loaded = false;

  constructor(path: string) {
    this.#path = path;
  }

  async load(): Promise<ReadonlyArray<ApprovedSshTargetRecord>> {
    try {
      const text = await readFile(this.#path, "utf8");
      const parsed = JSON.parse(text) as unknown;
      this.#records = Array.isArray(parsed) ? parsed.filter(isRecord) : [];
    } catch {
      // No store yet, or it is unreadable/corrupt: start empty rather than failing
      // the whole application over a missing preference file.
      this.#records = [];
    }
    this.#loaded = true;
    return this.list();
  }

  list(): ReadonlyArray<ApprovedSshTargetRecord> {
    return this.#records.slice();
  }

  /** Approved identities in the shape `SshPolicyAdapter`/`SshServerDeployer` expect. */
  identities(): ReadonlyArray<{ host: string; port: number }> {
    return this.#records.map((record) => ({ host: record.host, port: record.port }));
  }

  async add(host: string, port: number, user: string, label?: string): Promise<{ ok: true } | { ok: false; reason: string }> {
    const shapeError = validateSshIdentityShape(host, port, user);
    if (shapeError) return { ok: false, reason: shapeError };
    if (!this.#loaded) await this.load();
    const key = identityKey(host, port);
    if (this.#records.some((record) => identityKey(record.host, record.port) === key)) {
      return { ok: true }; // Already approved: idempotent, not an error.
    }
    this.#records.push({ host, port, user, label, addedAt: new Date().toISOString() });
    await this.#persist();
    return { ok: true };
  }

  async remove(host: string, port: number): Promise<void> {
    if (!this.#loaded) await this.load();
    const key = identityKey(host, port);
    this.#records = this.#records.filter((record) => identityKey(record.host, record.port) !== key);
    await this.#persist();
  }

  async #persist(): Promise<void> {
    await mkdir(dirname(this.#path), { recursive: true });
    await writeFile(this.#path, JSON.stringify(this.#records, null, 2), "utf8");
  }
}

function identityKey(host: string, port: number): string {
  return `${host.toLowerCase()}:${port}`;
}

function isRecord(value: unknown): value is ApprovedSshTargetRecord {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.host === "string" && typeof record.port === "number" && typeof record.user === "string" && typeof record.addedAt === "string";
}
