import type { ApplyResult, ChangePlan, PlanAction, StructuredDiff } from "./contracts.js";
import { blockingConfigFindings } from "./config-document-validation.js";

export interface ConfigDocument {
  resource: string;
  value: unknown;
  /** Optional optimistic-concurrency baseline from the read that produced `value`. */
  expectedBefore?: unknown;
}

export interface ConfigTransport {
  /** Stable identity of the target this transport mutates. */
  readonly targetId?: string;
  readonly requiresRuntimeVerification?: boolean;
  read(resource: string, signal?: AbortSignal): Promise<unknown>;
  backup(resource: string, signal?: AbortSignal): Promise<string>;
  stage(resource: string, value: unknown, signal?: AbortSignal): Promise<string>;
  validate(stagedHandle: string, signal?: AbortSignal): Promise<void>;
  apply(stagedHandle: string, signal?: AbortSignal): Promise<void>;
  rollback(backupHandle: string, signal?: AbortSignal): Promise<void>;
  /** Privileged exact verification for transports whose renderer-facing read hides secrets. */
  verifyApplied?(resource: string, expected: unknown, signal?: AbortSignal): Promise<void>;
  /** Projects a desired value to the same redacted shape returned by renderer-facing reads. */
  projectForRead?(resource: string, value: unknown): unknown;
}

export type RuntimeVerifier = (plan: ChangePlan, signal?: AbortSignal) => Promise<void>;

export class StructuredConfigPlanner {
  readonly now: () => Date;

  constructor(now = () => new Date()) {
    this.now = now;
  }

  async createPlan(
    id: string,
    targetId: string,
    desired: ReadonlyArray<ConfigDocument>,
    transport: Pick<ConfigTransport, "read">,
    signal?: AbortSignal,
  ): Promise<ChangePlan> {
    ensureUniqueResources(desired);
    const diffs: StructuredDiff[] = [];
    for (const document of desired) {
      throwIfAborted(signal);
      const blocking = blockingConfigFindings(document.resource, document.value);
      if (blocking.length > 0) {
        throw new Error(
          `Configuration validation failed for ${document.resource}: ${blocking.map((finding) => finding.message).join(" ")}`,
        );
      }
      const before = await transport.read(document.resource, signal);
      if (document.expectedBefore !== undefined && !equal(before, document.expectedBefore)) {
        throw new Error(`The target changed after ${document.resource} was read. Read it again before writing.`);
      }
      const changedPaths = diffPaths(before, document.value);
      if (changedPaths.length > 0) diffs.push({ resource: document.resource, before, after: document.value, changedPaths });
    }
    const actions: PlanAction[] = diffs.flatMap((diff) => [
      { id: `backup:${diff.resource}`, kind: "backup" as const, description: `Back up ${diff.resource}`, resource: diff.resource },
      { id: `stage:${diff.resource}`, kind: "stage" as const, description: `Stage ${diff.resource}`, resource: diff.resource },
      { id: `validate:${diff.resource}`, kind: "validate" as const, description: `Validate ${diff.resource}`, resource: diff.resource },
      { id: `apply:${diff.resource}`, kind: "apply" as const, description: `Apply ${diff.resource}`, resource: diff.resource },
      { id: `post-read:${diff.resource}`, kind: "postRead" as const, description: `Verify ${diff.resource}`, resource: diff.resource },
    ]);
    if (diffs.length > 0) {
      actions.push({
        id: "runtime:reload-and-verify",
        kind: "runtimeVerify",
        description: "Reload the changed Asterisk resources and verify the running target",
      });
    }
    return {
      id,
      targetId,
      createdAt: this.now().toISOString(),
      summary: diffs.length === 0 ? "No configuration changes" : `Change ${diffs.length} configuration resource(s)`,
      actions,
      diffs,
      requiredStorageBytes: Buffer.byteLength(JSON.stringify(diffs), "utf8") * 3,
      destructive: false,
    };
  }
}

export class ConfigTransaction {
  readonly transport: ConfigTransport;
  readonly now: () => Date;
  readonly runtimeVerify?: RuntimeVerifier;

  constructor(transport: ConfigTransport, now = () => new Date(), runtimeVerify?: RuntimeVerifier) {
    this.transport = transport;
    this.now = now;
    this.runtimeVerify = runtimeVerify;
  }

  async apply(plan: ChangePlan, signal?: AbortSignal): Promise<ApplyResult> {
    const startedAt = this.now().toISOString();
    const completed: string[] = [];
    const applied: Array<{ resource: string; backup: string }> = [];
    let failedAction: string | undefined;
    try {
      if (this.transport.targetId && this.transport.targetId !== plan.targetId) {
        throw new Error(`The plan targets ${plan.targetId}, but this transport targets ${this.transport.targetId}.`);
      }
      for (const diff of plan.diffs) {
        throwIfAborted(signal);
        const current = await this.transport.read(diff.resource, signal);
        if (!equal(current, diff.before)) {
          throw new Error(`The target changed after ${diff.resource} was planned. Nothing further was applied.`);
        }
        failedAction = `backup:${diff.resource}`;
        const backup = await this.transport.backup(diff.resource, signal);
        completed.push(failedAction);
        failedAction = `stage:${diff.resource}`;
        const staged = await this.transport.stage(diff.resource, diff.after, signal);
        completed.push(failedAction);
        failedAction = `validate:${diff.resource}`;
        await this.transport.validate(staged, signal);
        completed.push(failedAction);
        failedAction = `apply:${diff.resource}`;
        await this.transport.apply(staged, signal);
        applied.push({ resource: diff.resource, backup });
        completed.push(failedAction);
        failedAction = `post-read:${diff.resource}`;
        const actual = await this.transport.read(diff.resource, signal);
        const expectedRead = this.transport.projectForRead
          ? this.transport.projectForRead(diff.resource, diff.after)
          : diff.after;
        if (!equal(actual, expectedRead)) throw new Error(`Post-read mismatch for ${diff.resource}`);
        completed.push(failedAction);
      }
      if (plan.diffs.length > 0) {
        if (this.transport.requiresRuntimeVerification && !this.runtimeVerify) {
          throw new Error("No running-target reload verifier is configured for this transaction.");
        }
        if (this.runtimeVerify) {
          failedAction = "runtime:reload-and-verify";
          await this.runtimeVerify(plan, signal);
          completed.push(failedAction);
        }
        if (this.transport.verifyApplied) {
          for (const diff of plan.diffs) {
            failedAction = `final-post-read:${diff.resource}`;
            await this.transport.verifyApplied(diff.resource, diff.after, signal);
            completed.push(failedAction);
          }
        }
      }
      return result(
        plan.id,
        "applied",
        startedAt,
        this.now(),
        completed,
        false,
        this.runtimeVerify ? "Configuration applied, reloaded, and verified" : "Configuration applied and read back",
      );
    } catch (error) {
      let rollbackSucceeded = true;
      for (const entry of [...applied].reverse()) {
        try {
          await this.transport.rollback(entry.backup);
          completed.push(`rollback:${entry.resource}`);
        } catch {
          rollbackSucceeded = false;
        }
      }
      if (applied.length > 0 && rollbackSucceeded && this.runtimeVerify) {
        try {
          await this.runtimeVerify(plan, signal);
          completed.push("runtime:reload-after-rollback");
        } catch {
          rollbackSucceeded = false;
        }
      }
      const cancelled = signal?.aborted === true || isAbortError(error);
      const status = applied.length > 0 && rollbackSucceeded ? "rolledBack" : cancelled ? "cancelled" : "failed";
      return {
        planId: plan.id,
        status,
        startedAt,
        finishedAt: this.now().toISOString(),
        completedActions: completed,
        failedAction,
        rollbackAttempted: applied.length > 0,
        rollbackSucceeded: applied.length > 0 ? rollbackSucceeded : undefined,
        message: error instanceof Error ? error.message : "Configuration transaction failed",
      };
    }
  }
}

export function diffPaths(before: unknown, after: unknown, path = "$"): ReadonlyArray<string> {
  if (equal(before, after)) return [];
  if (!isRecord(before) || !isRecord(after)) return [path];
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
  return keys.flatMap((key) => diffPaths(before[key], after[key], `${path}.${key}`));
}

function ensureUniqueResources(documents: ReadonlyArray<ConfigDocument>): void {
  const resources = new Set<string>();
  for (const document of documents) {
    if (!/^\/etc\/asterisk\/[a-zA-Z0-9._-]+\.conf$/u.test(document.resource)) {
      throw new Error(`Invalid config resource: ${document.resource}`);
    }
    if (document.resource.includes("..") || document.resource.includes(",") || document.resource.includes(";")) {
      throw new Error(`Invalid config resource: ${document.resource}`);
    }
    if (resources.has(document.resource)) throw new Error(`Duplicate config resource: ${document.resource}`);
    resources.add(document.resource);
  }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException("Operation cancelled", "AbortError");
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function equal(left: unknown, right: unknown): boolean {
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (isRecord(value)) return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
}

function result(
  planId: string,
  status: ApplyResult["status"],
  startedAt: string,
  finished: Date,
  completedActions: ReadonlyArray<string>,
  rollbackAttempted: boolean,
  message: string,
): ApplyResult {
  return { planId, status, startedAt, finishedAt: finished.toISOString(), completedActions, rollbackAttempted, message };
}
