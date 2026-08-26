import { randomUUID } from "node:crypto";
import type { ChangePlan } from "./contracts.js";
import type { ConfigTransport } from "./config-transaction.js";

export interface ConfigUndoHandle {
  schemaVersion: 1;
  nonce: string;
  targetId: string;
  planId: string;
  action: "config-apply";
  catalogRevision: string | null;
  issuedAt: string;
  expiresAt: string;
  consumedAt?: string;
  backupReceipt: ReadonlyArray<{ resource: string; handle: string }>;
  before: ReadonlyArray<{ resource: string; value: unknown }>;
  after: ReadonlyArray<{ resource: string; value: unknown }>;
}

export interface ConfigUndoHistory {
  record(entry: { action: "updated" | "undone"; subject: string; payload: unknown }): Promise<unknown>;
}

export type ConfigUndoResult =
  | { ok: true; handle: ConfigUndoHandle; history?: unknown }
  | { ok: false; code: string; message: string; history?: unknown };

/**
 * Durable, one-time undo registry for a verified successful configuration apply.
 * It deliberately validates the target's current post-state before any inverse write:
 * undoing over an intervening edit is data loss, not recovery.
 */
export class ConfigUndoService {
  readonly #handles = new Map<string, ConfigUndoHandle>();
  readonly #pending = new Set<string>();
  constructor(private readonly now = () => new Date(), private readonly ttlMs = 15 * 60_000) {}

  issue(plan: ChangePlan, backups: ReadonlyArray<{ resource: string; handle: string }>, catalogRevision: string | null = null): ConfigUndoHandle {
    const issuedAt = this.now();
    const handle: ConfigUndoHandle = {
      schemaVersion: 1, nonce: randomUUID(), targetId: plan.targetId, planId: plan.id, action: "config-apply", catalogRevision,
      issuedAt: issuedAt.toISOString(), expiresAt: new Date(issuedAt.getTime() + this.ttlMs).toISOString(),
      backupReceipt: backups.map((backup) => ({ ...backup })),
      before: plan.diffs.map((diff) => ({ resource: diff.resource, value: diff.before })),
      after: plan.diffs.map((diff) => ({ resource: diff.resource, value: diff.after })),
    };
    this.#handles.set(handle.nonce, handle);
    return handle;
  }

  async undo(input: ConfigUndoHandle, targetId: string, transport: Pick<ConfigTransport, "read" | "rollback">, history?: ConfigUndoHistory): Promise<ConfigUndoResult> {
    const handle = this.#handles.get(input.nonce);
    const reject = async (code: string, message: string): Promise<ConfigUndoResult> => ({ ok: false, code, message });
    if (!handle || handle !== input || input.schemaVersion !== 1 || input.action !== "config-apply") return await reject("UNDO_HANDLE_UNKNOWN", "This undo handle was not issued by this installation.");
    if (handle.targetId !== targetId) return await reject("UNDO_TARGET_MISMATCH", "This undo handle belongs to a different target.");
    if (handle.consumedAt || this.#pending.has(handle.nonce)) return await reject("UNDO_HANDLE_CONSUMED", "This undo handle has already been used.");
    if (Date.parse(handle.expiresAt) <= this.now().getTime()) return await reject("UNDO_HANDLE_EXPIRED", "This undo handle has expired before a restore was requested.");
    this.#pending.add(handle.nonce);
    try {
      for (const expected of handle.after) {
        const actual = await transport.read(expected.resource);
        if (!equal(actual, expected.value)) return await reject("UNDO_POST_STATE_DIVERGED", `The current ${expected.resource} no longer matches the applied state, so undo was refused.`);
      }
    /* Mark consumed before the first inverse write. JS's single-threaded turn makes concurrent callers
       deterministically see this state, rather than restoring the same backup twice. */
    handle.consumedAt = this.now().toISOString();
      for (const backup of [...handle.backupReceipt].reverse()) await transport.rollback(backup.handle);
      for (const expected of handle.before) {
        const actual = await transport.read(expected.resource);
        if (!equal(actual, expected.value)) throw new Error(`Undo readback mismatch for ${expected.resource}`);
      }
      const recorded = history ? await history.record({ action: "undone", subject: `Configuration apply ${handle.planId}`, payload: publicHandle(handle) }) : undefined;
      return { ok: true, handle, history: recorded };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Undo failed";
      const recorded = history ? await history.record({ action: "updated", subject: `Configuration undo failure ${handle.planId}`, payload: { handle: publicHandle(handle), failure: message } }) : undefined;
      return { ok: false, code: "UNDO_FAILED", message, history: recorded };
    } finally {
      this.#pending.delete(handle.nonce);
    }
  }
}

export function publicHandle(handle: ConfigUndoHandle): Omit<ConfigUndoHandle, "backupReceipt"> & { backupReceipt: ReadonlyArray<{ resource: string }> } {
  return { ...handle, backupReceipt: handle.backupReceipt.map(({ resource }) => ({ resource })) };
}

function equal(left: unknown, right: unknown): boolean { return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right)); }
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === "object") return Object.fromEntries(Object.keys(value as Record<string, unknown>).sort().map((key) => [key, canonical((value as Record<string, unknown>)[key])]));
  return value;
}
