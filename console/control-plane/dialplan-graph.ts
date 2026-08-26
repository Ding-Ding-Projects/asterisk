/**
 * Reads `dialplan show` from a target and turns it into a graph of dialplan steps.
 * `dialplan show` is already in `READ_ONLY_COMMANDS` (see ./asterisk-readings.ts); this
 * module only parses its output and resolves control-flow edges between extensions.
 *
 * Output format is taken from this repository's `main/pbx.c`:
 *   show_dialplan_helper()                       context header, include lines
 *   show_dialplan_helper_extension_output()       one printed extension-priority line
 *   print_ext()                                   the "N. App(data)" / "hint: App" text
 */
import type { CapabilityResult, TargetProfile } from "./contracts.js";
import type { CommandResult, ProcessExecutor } from "./executor.js";
import type { DialplanContextRecord } from "./dialplan-divergence.js";

export interface DialplanStep {
  priority: number;
  app: string;
  data: string;
}

export interface DialplanNode {
  id: string;
  context: string;
  extension: string;
  steps: DialplanStep[];
  registrar?: { file: string; line: number } | { name: string };
}

export type DialplanEdge = [string, string];

export interface DialplanGraph {
  nodes: DialplanNode[];
  edges: DialplanEdge[];
}

export interface DialplanReading<T> {
  command: "dialplan show";
  result: CapabilityResult<T>;
  /**
   * The contexts that same run of `dialplan show` reported, with the registrar that
   * created each — what `compareDialplanToFile` needs to say whether the running dialplan
   * still matches `extensions.conf`.
   *
   * Carried beside the graph rather than fetched separately so both come from one run:
   * running the command twice would draw the canvas from one moment and judge the file
   * against another, and nothing in either output would say they were different moments.
   *
   * Absent exactly when `result.state` is not `available`, so a caller can never mistake
   * "no contexts were reported" for "the dialplan holds no contexts".
   */
  contexts?: DialplanContextRecord[];
  /** The context count `dialplan show` printed in its own trailer, when it printed one.
   *  See `parseDialplanContextTotal`. */
  contextsReported?: number;
}

/** Runs one allowlisted CLI command against a target — the same shape as AsteriskCliGateway. */
export interface DialplanGateway {
  run(target: TargetProfile, command: "dialplan show", signal?: AbortSignal): Promise<CommandResult>;
}

export class DialplanReadings {
  readonly #gateway: DialplanGateway;
  readonly #now: () => Date;

  constructor(gateway: DialplanGateway, now: () => Date = () => new Date()) {
    this.#gateway = gateway;
    this.#now = now;
  }

  async graph(target: TargetProfile, signal?: AbortSignal): Promise<DialplanReading<DialplanGraph>> {
    const observedAt = this.#now().toISOString();
    let result: CommandResult;
    try {
      result = await this.#gateway.run(target, "dialplan show", signal);
    } catch (error) {
      return { command: "dialplan show", result: { state: "unavailable", observedAt, reason: reason(error) } };
    }
    if (result.status !== "succeeded") {
      const detail = result.stderr.trim() || result.stdout.trim();
      return {
        command: "dialplan show",
        result: {
          state: "unavailable",
          observedAt,
          reason: `\`asterisk -rx "dialplan show"\` ${result.status}${detail ? `: ${firstLine(detail)}` : ""}`,
        },
      };
    }
    if (/No such command|Unable to connect to remote asterisk/iu.test(result.stdout)) {
      return { command: "dialplan show", result: { state: "unavailable", observedAt, reason: firstLine(result.stdout.trim()) } };
    }
    try {
      const graph = parseDialplanGraph(result.stdout);
      const reportedTotal = parseDialplanContextTotal(result.stdout);
      return {
        command: "dialplan show",
        result: { state: "available", observedAt, value: graph },
        contexts: parseDialplanContexts(result.stdout),
        ...(reportedTotal === undefined ? {} : { contextsReported: reportedTotal }),
      };
    } catch (error) {
      return {
        command: "dialplan show",
        result: { state: "unavailable", observedAt, reason: `Could not read the output of \`dialplan show\`: ${reason(error)}` },
      };
    }
  }
}

// ---------------------------------------------------------------- parsers

/**
 * `show_dialplan_helper()` in main/pbx.c prints, for each context with no exten filter:
 *   "[ Context '%s' created by '%s' ]\n"
 * (or "[ Included context '%s' created by '%s' ]\n" when reached through an include with
 * an exten filter — this console always reads the unfiltered form).
 */
const CONTEXT_HEADER = /^\[\s*(?:Included\s+)?[Cc]ontext\s+'([^']*)'\s+created by\s+'([^']*)'\s*\]\s*$/u;

/**
 * `show_dialplan_helper()` builds the first column of the first-priority line as
 *   "'<exten>' =>" (or "'<exten>' (CID match '<cid>') =>" — not matched here, no CID
 * console reading exists), then `show_dialplan_helper_extension_output()` prints it as
 *   "  %-17s %-45s [%s:%d]\n"   (registrar has a file)
 *   "  %-17s %-45s [%s]\n"     (registrar has no file, just a name)
 * and `print_ext()` fills the second column as "%d. %s(%s)" (or "hint: %s" for hints,
 * which this parser skips — a hint is not a dialable extension step).
 */
const FIRST_PRIORITY =
  /^ {2}'([^']*)'\s*=>\s*(\d+)\.\s+(\S+)\((.*)\)\s+\[([^:\]]+)(?::(\d+))?\]\s*$/u;

/**
 * Subsequent priorities of the same extension: `show_dialplan_helper()` builds the first
 * column as "   [%s]" when the priority has a label, or an empty string otherwise, printed
 * through the same "  %-17s %-45s [...]" line as the first priority.
 */
const NEXT_PRIORITY =
  /^ {2}(?:\s*\[[^\]]*\])?\s*(\d+)\.\s+(\S+)\((.*)\)\s+\[([^:\]]+)(?::(\d+))?\]\s*$/u;

/**
 * `show_dialplan_helper()` prints includes (no exten filter) as
 *   "  Include =>        %-45s [%s]\n"
 * with the padded field itself being "'<context>'".
 */
const INCLUDE_LINE = /^ {2}Include\s*=>\s*'([^']*)'\s*\[[^\]]*\]\s*$/u;

/** `show_dialplan_helper()`: `ast_cli(fd, "Autohints support enabled\n")`. */
const AUTOHINTS_LINE = /^Autohints support enabled\s*$/u;

interface ParsedExtension {
  context: string;
  extension: string;
  steps: DialplanStep[];
  registrar?: { file: string; line: number } | { name: string };
}

/** Parses `dialplan show` output into contexts/extensions/steps, ignoring hints and includes. */
export function parseDialplanExtensions(stdout: string): ParsedExtension[] {
  const extensions: ParsedExtension[] = [];
  let context = "";
  let current: ParsedExtension | undefined;

  for (const raw of stdout.split(/\r?\n/u)) {
    const line = raw.replace(/\s+$/u, "");
    if (!line) continue;
    if (AUTOHINTS_LINE.test(line)) continue;
    if (INCLUDE_LINE.test(line)) continue;

    const header = CONTEXT_HEADER.exec(line);
    if (header) {
      context = header[1];
      current = undefined;
      continue;
    }

    const first = FIRST_PRIORITY.exec(line);
    if (first) {
      current = {
        context,
        extension: first[1],
        steps: [{ priority: Number(first[2]), app: first[3], data: first[4] }],
        registrar: first[6] ? { file: first[5], line: Number(first[6]) } : { name: first[5] },
      };
      extensions.push(current);
      continue;
    }

    const next = current && NEXT_PRIORITY.exec(line);
    if (next) {
      current!.steps.push({ priority: Number(next[1]), app: next[2], data: next[3] });
      continue;
    }
  }

  return extensions;
}

const nodeId = (context: string, extension: string): string => `${context}/${extension}`;

/**
 * Resolves control flow between parsed extensions: `Goto`/`GotoIf`/`GotoIfTime` target
 * arguments, and the extension a `Dial`/`Queue`/`VoiceMail` step names when that target is
 * itself one of the parsed extensions. An edge is only ever emitted when the destination
 * actually resolves to a parsed node.
 */
export function buildDialplanGraph(extensions: ParsedExtension[]): DialplanGraph {
  const nodes: DialplanNode[] = extensions.map((extension) => ({
    id: nodeId(extension.context, extension.extension),
    context: extension.context,
    extension: extension.extension,
    steps: extension.steps,
    registrar: extension.registrar,
  }));

  const byContextExten = new Map<string, DialplanNode>();
  for (const node of nodes) byContextExten.set(nodeId(node.context, node.extension), node);
  const byExtenOnly = new Map<string, DialplanNode[]>();
  for (const node of nodes) {
    const list = byExtenOnly.get(node.extension) ?? [];
    list.push(node);
    byExtenOnly.set(node.extension, list);
  }

  const resolve = (fromContext: string, target: string): DialplanNode | undefined => {
    const parts = target.split(",").map((part) => part.trim()).filter(Boolean);
    if (!parts.length) return undefined;
    let ctx = fromContext;
    let exten: string;
    if (parts.length >= 3) {
      [ctx, exten] = parts;
    } else if (parts.length === 2) {
      [exten] = parts;
    } else {
      exten = parts[0];
    }
    const direct = byContextExten.get(nodeId(ctx, exten));
    if (direct) return direct;
    if (parts.length === 1) {
      const candidates = byExtenOnly.get(exten);
      if (candidates && candidates.length === 1) return candidates[0];
    }
    return undefined;
  };

  const edges: DialplanEdge[] = [];
  const seen = new Set<string>();
  for (const extension of extensions) {
    const fromId = nodeId(extension.context, extension.extension);
    for (const step of extension.steps) {
      const app = step.app.toUpperCase();
      let target: string | undefined;
      if (app === "GOTO" || app === "GOTOIF" || app === "GOTOIFTIME") {
        target = extractGotoTarget(app, step.data);
      } else if (app === "DIAL" || app === "QUEUE" || app === "VOICEMAIL") {
        target = step.data.split(",")[0]?.trim();
      }
      if (!target) continue;
      const dest = resolve(extension.context, target);
      if (!dest) continue;
      const edgeKey = `${fromId}->${dest.id}`;
      if (dest.id === fromId || seen.has(edgeKey)) continue;
      seen.add(edgeKey);
      edges.push([fromId, dest.id]);
    }
  }

  return { nodes, edges };
}

/** `Goto(...)`/`GotoIf(...)`/`GotoIfTime(...)` — extract the trailing `[[context,]exten,]priority` target. */
function extractGotoTarget(app: string, data: string): string | undefined {
  if (app === "GOTO") return data.trim() || undefined;
  // GotoIf(cond?dest1:dest2) / GotoIfTime(times?dest1:dest2) — take the true-branch destination.
  const question = data.indexOf("?");
  if (question < 0) return undefined;
  const branches = data.slice(question + 1);
  const [first] = branches.split(":");
  return first?.trim() || undefined;
}

export function parseDialplanGraph(stdout: string): DialplanGraph {
  return buildDialplanGraph(parseDialplanExtensions(stdout));
}

/**
 * The contexts `dialplan show` reported, each with the registrar that created it and the
 * files its extensions were registered from.
 *
 * Reads the same three lines `parseDialplanExtensions` above reads, through the same
 * constants, and keeps the two things that parse throws away: the `created by '%s'` half
 * of every context header, and the `[file:line]` column of every printed priority.
 *
 * The distinction between the two `[...]` forms is `show_dialplan_helper_extension_output()`
 * in main/pbx.c: a line prints `[%s:%d]` when the extension carries a registrar *file*, and
 * `[%s]` — the registrar *name* — when it does not. A file is therefore recorded only when
 * a line number came with it; the bare form names a module, not a file, and treating it as
 * one would attribute every `pbx_ael` extension to a file called `pbx_ael`.
 */
export function parseDialplanContexts(stdout: string): DialplanContextRecord[] {
  const contexts: DialplanContextRecord[] = [];
  /* `dialplan show` walks each context once, so a repeat is not expected. Merging rather
   * than appending means the "Included context" form could never split one context's
   * extensions across two records that then disagree about which files they came from. */
  const byName = new Map<string, DialplanContextRecord>();
  let current: DialplanContextRecord | undefined;

  const addFile = (file: string) => {
    if (current && !current.files.includes(file)) current.files.push(file);
  };

  for (const raw of stdout.split(/\r?\n/u)) {
    const line = raw.replace(/\s+$/u, "");
    if (!line) continue;

    const header = CONTEXT_HEADER.exec(line);
    if (header) {
      const existing = byName.get(header[1]);
      if (existing) {
        current = existing;
      } else {
        current = { name: header[1], registrar: header[2], files: [] };
        byName.set(current.name, current);
        contexts.push(current);
      }
      continue;
    }
    if (!current) continue;

    const first = FIRST_PRIORITY.exec(line);
    if (first) {
      if (first[6]) addFile(first[5]);
      continue;
    }
    const next = NEXT_PRIORITY.exec(line);
    if (next && next[5]) addFile(next[4]);
  }

  return contexts;
}

/**
 * The context total `dialplan show` prints for itself.
 *
 * main/pbx.c line 4135: `"-= %d %s (%d %s) in %d %s. =-\n"`, the last pair being
 * `counters.total_context`. It is the command's own count rather than this parser's, so
 * the two disagreeing means a context line was not read — the same "say when a reading
 * dropped a row" signal the voicemail and manager readings already carry.
 */
const DIALPLAN_TOTALS = /^-=\s*\d+\s+\S+\s*\(\d+\s+\S+\)\s+in\s+(\d+)\s+\S+\.\s*=-\s*$/u;

export function parseDialplanContextTotal(stdout: string): number | undefined {
  for (const raw of stdout.split(/\r?\n/u)) {
    const match = DIALPLAN_TOTALS.exec(raw.trim());
    if (match) return Number(match[1]);
  }
  return undefined;
}

// ---------------------------------------------------------------- AGI scripting visibility

export interface AgiReference {
  context: string;
  extension: string;
  priority: number;
  app: string;
  /** The script argument exactly as `AGI()`/`EAGI()`/`DeadAGI()` was called with -- the
   *  whole first argument, before `kind` below decides what it names. */
  script: string;
  /** `local` is a bare filename this console can check against the target's own AGI
   *  directory listing. `network` is a `res/res_agi.c` `agi://`/`hagi://` FastAGI URI
   *  (line 2186 `agiurl + 6` strips `agi://`; line 2284 the `h` variant), and `async` is
   *  the literal `agi:async` token (line 2341 `strncasecmp(script, "agi:async", ...)`)
   *  that hands the channel to Async AGI over AMI instead of running a file at all --
   *  neither of those names anything a directory listing could ever confirm or deny. */
  kind: "local" | "network" | "async";
}

const AGI_APPLICATIONS = new Set(["agi", "eagi", "deadagi"]);

/** The first comma-separated argument to an `AGI()`-family application call, the same
 *  way Asterisk's own argument parser splits `data` -- trimmed, and with one layer of
 *  surrounding quotes removed if the dialplan author quoted it (`AGI("my script.agi")`
 *  is how a script name containing a comma or a space is written at all). */
function firstArgument(data: string): string {
  const raw = (data.split(",")[0] ?? "").trim();
  const quoted = /^"(.*)"$/u.exec(raw);
  return quoted ? quoted[1] : raw;
}

function classifyAgiScript(script: string): AgiReference["kind"] {
  const lower = script.toLowerCase();
  if (lower.startsWith("agi://") || lower.startsWith("hagi://")) return "network";
  if (lower.startsWith("agi:async")) return "async";
  return "local";
}

/** Every `AGI()`/`EAGI()`/`DeadAGI()` call in a parsed dialplan graph, in the order
 *  `dialplan show` printed them. Used by the AGI scripting-visibility screen to compare
 *  what the dialplan actually references against what the target's own AGI directory
 *  actually holds -- two facts nothing in this console could previously put side by
 *  side. */
export function agiReferences(graph: DialplanGraph): AgiReference[] {
  const found: AgiReference[] = [];
  for (const node of graph.nodes) {
    for (const step of node.steps) {
      if (!AGI_APPLICATIONS.has(step.app.trim().toLowerCase())) continue;
      const script = firstArgument(step.data);
      if (!script) continue;
      found.push({
        context: node.context,
        extension: node.extension,
        priority: step.priority,
        app: step.app,
        script,
        kind: classifyAgiScript(script),
      });
    }
  }
  return found;
}

// ---------------------------------------------------------------- helpers

function firstLine(text: string): string {
  return text.split(/\r?\n/u)[0] ?? text;
}

function reason(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
