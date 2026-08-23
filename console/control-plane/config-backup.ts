/**
 * Whole-configuration backup, compare, and restore for the WSL-hosted target.
 *
 * `WslConfigTransport` backs up and restores one file at a time, as a side effect of a
 * single change. Nothing captures the *whole* configuration tree in one shot, compares
 * two such captures, or restores one deliberately. That is what this module is for: a
 * snapshot of every allowlisted resource, a diff between two snapshots so a restore is
 * never a leap of faith, and a restore that itself takes a fresh "undo" snapshot first —
 * because a recovery feature that cannot be undone is not a recovery feature.
 *
 * The same two boundaries as the transport apply here, because this is the other code in
 * the console that reads and writes the target:
 *
 *  - **Resources are allowlisted by exact filename**, checked with `assertConfigurable`
 *    before any command is built. Import refuses a whole snapshot if a single entry in
 *    it names something outside the allowlist — a partial restore of a configuration
 *    tree is a state nobody designed, so it is never attempted.
 *  - **Every command is an allowlisted executable with separate arguments; no shell.**
 *    Content travels on standard input, never as an argument.
 */
import { createHash } from "node:crypto";
import type { ProcessExecutor } from "./executor.js";
import { CONFIGURABLE_RESOURCES, type ConfigurableResource } from "./wsl-config-transport.js";

/** One resource's content at the moment of capture, or its confirmed absence. */
export type ResourceCapture =
  | { readonly present: true; readonly content: string; readonly digest: string }
  | { readonly present: false };

export interface Snapshot {
  readonly takenAt: string;
  readonly distribution: string;
  readonly resources: ReadonlyMap<ConfigurableResource, ResourceCapture>;
}

export type DiffKind = "added" | "removed" | "changed" | "identical";

export interface ResourceDiff {
  readonly resource: ConfigurableResource;
  readonly kind: DiffKind;
  /** Line-level diff, present only when `kind` is `"changed"`. */
  readonly lines?: ReadonlyArray<{ readonly kind: "same" | "add" | "remove"; readonly text: string }>;
}

export interface Diff {
  readonly entries: ReadonlyArray<ResourceDiff>;
}

export interface RestoreResult {
  readonly restored: ReadonlyArray<ConfigurableResource>;
  readonly failed: ReadonlyArray<{ readonly resource: ConfigurableResource; readonly reason: string }>;
  /** A snapshot taken immediately before the restore, so this restore can itself be undone. */
  readonly preRestoreSnapshot: Snapshot;
}

export interface VerifyResult {
  readonly matches: ReadonlyArray<ConfigurableResource>;
  readonly diverged: ReadonlyArray<{ readonly resource: ConfigurableResource; readonly reason: string }>;
}

const EXPORT_FORMAT_VERSION = 1;
/** Bounds the total size of a captured or imported snapshot's content. */
const DEFAULT_MAX_TOTAL_BYTES = 32 * 1024 * 1024;

interface ExportedResource {
  readonly resource: string;
  readonly present: boolean;
  readonly content?: string;
  readonly digest?: string;
}

interface ExportedSnapshot {
  readonly formatVersion: number;
  readonly takenAt: string;
  readonly distribution: string;
  readonly resources: ReadonlyArray<ExportedResource>;
}

function digestOf(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function byteLength(content: string): number {
  return Buffer.byteLength(content, "utf8");
}

/** A minimal Myers-ish line diff: adequate for reviewing a config change, not a general LCS solver. */
function diffLines(before: string, after: string): ReadonlyArray<{ kind: "same" | "add" | "remove"; text: string }> {
  const a = before.split(/\r?\n/u);
  const b = after.split(/\r?\n/u);
  const m = a.length;
  const n = b.length;
  const lcs: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const out: Array<{ kind: "same" | "add" | "remove"; text: string }> = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      out.push({ kind: "same", text: a[i] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      out.push({ kind: "remove", text: a[i] });
      i++;
    } else {
      out.push({ kind: "add", text: b[j] });
      j++;
    }
  }
  while (i < m) {
    out.push({ kind: "remove", text: a[i] });
    i++;
  }
  while (j < n) {
    out.push({ kind: "add", text: b[j] });
    j++;
  }
  return out;
}

export interface ConfigBackupOptions {
  executor: ProcessExecutor;
  distribution: string;
  now?: () => Date;
  /** Refuses a capture, restore, or import whose total content exceeds this many bytes. */
  maxTotalBytes?: number;
}

export class ConfigBackup {
  readonly #executor: ProcessExecutor;
  readonly #distribution: string;
  readonly #now: () => Date;
  readonly #maxTotalBytes: number;

  constructor(options: ConfigBackupOptions) {
    this.#executor = options.executor;
    this.#distribution = options.distribution;
    this.#now = options.now ?? (() => new Date());
    this.#maxTotalBytes = options.maxTotalBytes ?? DEFAULT_MAX_TOTAL_BYTES;
  }

  async #run(args: ReadonlyArray<string>, input?: string): Promise<{ stdout: string; failed: boolean; stderr: string }> {
    const result = await this.#executor.execute({
      executable: "wsl.exe",
      args: ["-d", this.#distribution, "--", ...args],
      input,
      timeoutMs: 30_000,
      maxOutputBytes: 8 * 1024 * 1024,
    });
    return { stdout: result.stdout, stderr: result.stderr, failed: result.status !== "succeeded" };
  }

  async #exists(resource: ConfigurableResource): Promise<boolean> {
    const result = await this.#run(["test", "-e", resource]);
    return !result.failed;
  }

  async #read(resource: ConfigurableResource): Promise<string> {
    const result = await this.#run(["cat", resource]);
    if (result.failed) {
      throw new Error(result.stderr.trim() || `Could not read ${resource}`);
    }
    return result.stdout;
  }

  /** Captures the current content, or confirmed absence, of every allowlisted resource. */
  async capture(): Promise<Snapshot> {
    const resources = new Map<ConfigurableResource, ResourceCapture>();
    let total = 0;
    for (const resource of CONFIGURABLE_RESOURCES) {
      const exists = await this.#exists(resource);
      if (!exists) {
        resources.set(resource, { present: false });
        continue;
      }
      const content = await this.#read(resource);
      total += byteLength(content);
      if (total > this.#maxTotalBytes) {
        throw new Error(
          `Snapshot exceeds the ${this.#maxTotalBytes}-byte bound while reading ${resource}; refusing the capture.`,
        );
      }
      resources.set(resource, { present: true, content, digest: digestOf(content) });
    }
    return { takenAt: this.#now().toISOString(), distribution: this.#distribution, resources };
  }

  /** Compares two snapshots resource by resource. Order follows `CONFIGURABLE_RESOURCES`. */
  compare(a: Snapshot, b: Snapshot): Diff {
    const entries: ResourceDiff[] = [];
    for (const resource of CONFIGURABLE_RESOURCES) {
      const left = a.resources.get(resource) ?? { present: false };
      const right = b.resources.get(resource) ?? { present: false };
      if (!left.present && !right.present) {
        entries.push({ resource, kind: "identical" });
      } else if (!left.present && right.present) {
        entries.push({ resource, kind: "added" });
      } else if (left.present && !right.present) {
        entries.push({ resource, kind: "removed" });
      } else if (left.present && right.present) {
        if (left.digest === right.digest) {
          entries.push({ resource, kind: "identical" });
        } else {
          entries.push({ resource, kind: "changed", lines: diffLines(left.content, right.content) });
        }
      }
    }
    return { entries };
  }

  /**
   * Writes a snapshot back to the target, verifying each write by reading it back and
   * comparing digests. A write that cannot be verified is reported as a failure, never
   * as success — the caller decides what "success" means for the batch as a whole.
   *
   * Takes a fresh capture of the *current* state before touching anything, and returns
   * it, so this restore can itself be undone by restoring that pre-restore snapshot.
   */
  async restore(snapshot: Snapshot, options: { resources?: ReadonlyArray<string> } = {}): Promise<RestoreResult> {
    const targets = options.resources
      ? options.resources.map((r) => this.#assertKnown(r))
      : [...snapshot.resources.keys()];

    const preRestoreSnapshot = await this.capture();

    const restored: ConfigurableResource[] = [];
    const failed: Array<{ resource: ConfigurableResource; reason: string }> = [];

    for (const resource of targets) {
      const capture = snapshot.resources.get(resource);
      if (!capture) {
        failed.push({ resource, reason: "not present in the snapshot being restored" });
        continue;
      }
      try {
        if (!capture.present) {
          const removal = await this.#run(["rm", "-f", resource]);
          if (removal.failed) throw new Error(removal.stderr.trim() || "could not remove");
          if (await this.#exists(resource)) {
            throw new Error("the file still exists after removal was requested");
          }
          restored.push(resource);
          continue;
        }
        const write = await this.#run(["tee", resource], capture.content);
        if (write.failed) throw new Error(write.stderr.trim() || "write failed");
        const after = await this.#read(resource);
        if (digestOf(after) !== capture.digest) {
          throw new Error("the write did not verify: content on disk does not match the snapshot");
        }
        restored.push(resource);
      } catch (error) {
        failed.push({ resource, reason: error instanceof Error ? error.message : String(error) });
      }
    }

    return { restored, failed, preRestoreSnapshot };
  }

  /** Reports, for every resource in the snapshot, whether the target still matches it. */
  async verify(snapshot: Snapshot): Promise<VerifyResult> {
    const matches: ConfigurableResource[] = [];
    const diverged: Array<{ resource: ConfigurableResource; reason: string }> = [];
    for (const [resource, capture] of snapshot.resources) {
      const exists = await this.#exists(resource);
      if (!capture.present) {
        if (exists) {
          diverged.push({ resource, reason: "snapshot recorded this file as absent, but it now exists" });
        } else {
          matches.push(resource);
        }
        continue;
      }
      if (!exists) {
        diverged.push({ resource, reason: "snapshot recorded content, but the file is now absent" });
        continue;
      }
      const current = digestOf(await this.#read(resource));
      if (current === capture.digest) {
        matches.push(resource);
      } else {
        diverged.push({ resource, reason: "content on disk no longer matches the snapshot" });
      }
    }
    return { matches, diverged };
  }

  /** Serialises a snapshot to a versioned, self-describing JSON document. */
  export(snapshot: Snapshot): string {
    const resources: ExportedResource[] = [...snapshot.resources.entries()].map(([resource, capture]) =>
      capture.present
        ? { resource, present: true, content: capture.content, digest: capture.digest }
        : { resource, present: false },
    );
    const doc: ExportedSnapshot = {
      formatVersion: EXPORT_FORMAT_VERSION,
      takenAt: snapshot.takenAt,
      distribution: snapshot.distribution,
      resources,
    };
    return JSON.stringify(doc, null, 2);
  }

  /**
   * Parses an exported snapshot, validating every resource against the allowlist first.
   * If any entry names a resource outside the allowlist, the whole import is refused —
   * never a partial import of only the acceptable subset.
   */
  import(text: string): Snapshot {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error("That snapshot is not valid JSON.");
    }
    const doc = parsed as Partial<ExportedSnapshot>;
    if (doc.formatVersion !== EXPORT_FORMAT_VERSION) {
      throw new Error(`Unsupported snapshot format version: ${String(doc.formatVersion)}`);
    }
    if (!Array.isArray(doc.resources)) {
      throw new Error("That snapshot has no resource list.");
    }
    if (typeof doc.takenAt !== "string" || typeof doc.distribution !== "string") {
      throw new Error("That snapshot is missing its capture metadata.");
    }

    const unknown = doc.resources.filter((entry) => !this.#isKnown(entry.resource));
    if (unknown.length > 0) {
      throw new Error(
        `Refusing the whole import: ${unknown.length} resource(s) are outside the allowlist ` +
          `(e.g. "${unknown[0].resource}").`,
      );
    }

    let total = 0;
    for (const entry of doc.resources) {
      if (entry.present && typeof entry.content === "string") total += byteLength(entry.content);
    }
    if (total > this.#maxTotalBytes) {
      throw new Error(`Snapshot exceeds the ${this.#maxTotalBytes}-byte bound; refusing the import.`);
    }

    const resources = new Map<ConfigurableResource, ResourceCapture>();
    for (const entry of doc.resources) {
      const resource = this.#assertKnown(entry.resource);
      if (!entry.present) {
        resources.set(resource, { present: false });
        continue;
      }
      if (typeof entry.content !== "string") {
        throw new Error(`"${resource}" is marked present but has no content.`);
      }
      const digest = digestOf(entry.content);
      if (typeof entry.digest === "string" && entry.digest !== digest) {
        throw new Error(`"${resource}" failed its digest check on import; refusing the import.`);
      }
      resources.set(resource, { present: true, content: entry.content, digest });
    }

    return { takenAt: doc.takenAt, distribution: doc.distribution, resources };
  }

  #isKnown(resource: string): resource is ConfigurableResource {
    return (CONFIGURABLE_RESOURCES as ReadonlyArray<string>).includes(resource);
  }

  #assertKnown(resource: string): ConfigurableResource {
    if (!this.#isKnown(resource)) {
      throw new Error(`"${resource}" is not a configurable resource, so it was not touched.`);
    }
    return resource as ConfigurableResource;
  }
}
