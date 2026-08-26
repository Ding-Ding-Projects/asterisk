import type { Observation } from '../../../shared/control-plane';

/**
 * Turns a read dialplan graph into the design's canvas shapes. Nothing here invents a
 * step or a connection: nodes and edges come only from `dialplan-graph.ts`'s parse of a
 * real `dialplan show`, and the layout below is a deterministic function of that graph
 * (no randomness, no clock) so the same reading always draws the same canvas.
 */
export interface DialplanStep { priority: number; app: string; data: string }
export interface DialplanNode {
  id: string; context: string; extension: string; steps: DialplanStep[];
  registrar?: { file: string; line: number } | { name: string };
}
export type DialplanEdge = [string, string];
export interface DialplanGraph { nodes: DialplanNode[]; edges: DialplanEdge[] }

interface Reading<T> { command: string; result: Observation<T> }

/**
 * What `control-plane/dialplan-divergence.ts` computed for this target. Restated here
 * rather than imported so the renderer keeps its existing one-way dependency on the shared
 * contract alone; every field means exactly what it means there.
 */
export interface DialplanDivergence {
  inFileNotLoaded: string[];
  loadedNotInFile: string[];
  fromIncludedFiles: Array<{ context: string; file: string }>;
  unattributed: string[];
  directives: string[];
  fileContextCount: number;
  loadedFromPbxConfigCount: number;
  loadedFromOtherRegistrarsCount: number;
  loadedContextsParsed: number;
  loadedContextsReported?: number;
  diverged: boolean;
}

export interface CanvasReadings {
  dialplan?: Reading<DialplanGraph>;
  /** The comparison against `/etc/asterisk/extensions.conf`, or the reason there is none. */
  dialplanFile?: Observation<DialplanDivergence>;
}

export function valueOf<T>(reading: Reading<T> | undefined): T | undefined {
  return reading?.result.state === 'available' ? reading.result.value : undefined;
}

export function canvasReason(readings: CanvasReadings | undefined): string {
  const reading = readings?.dialplan;
  return reading && reading.result.state === 'unavailable' ? reading.result.reason : '';
}

/** The file this console compares the running dialplan against, spelled as the operator
 *  will find it on the target. */
export const DIALPLAN_FILE = '/etc/asterisk/extensions.conf';

const list = (names: readonly string[], limit = 8): string =>
  names.length <= limit
    ? names.join(', ')
    : `${names.slice(0, limit).join(', ')} and ${names.length - limit} more`;

const contexts = (count: number): string => `${count} context${count === 1 ? '' : 's'}`;

/**
 * What the dialplan canvas says about the gap between what Asterisk is running and what
 * `extensions.conf` says.
 *
 * This exists because `dialplan show` reads loaded state and the canvas drew it with
 * nothing to say so, which made a graph no file described indistinguishable from a graph
 * the file describes exactly. Both are real readings; only one of them means the file is
 * live, and an operator editing that file needs to know which they are looking at.
 *
 * Empty when the dialplan itself could not be read: `canvasReason` already carries that,
 * and repeating it here would report one failure as two.
 */
export function dialplanDivergenceNote(readings: CanvasReadings | undefined): string {
  if (readings?.dialplan && readings.dialplan.result.state !== 'available') return '';
  const reading = readings?.dialplanFile;
  if (!reading) return '';
  if (reading.state !== 'available') {
    return `This canvas is what \`dialplan show\` reports Asterisk has loaded, which is not necessarily what ${DIALPLAN_FILE} says — and the two could not be compared here, because ${reading.reason}.`;
  }

  const value = reading.value;
  const sentences: string[] = [];

  /* Said before any finding, because a comparison drawn from a short reading is short in
   * exactly the lists below and a reader must not take an empty list for agreement. */
  if (value.loadedContextsReported !== undefined && value.loadedContextsReported !== value.loadedContextsParsed) {
    sentences.push(
      `\`dialplan show\` reported ${contexts(value.loadedContextsReported)} and this reading could only make out ${value.loadedContextsParsed}, so what follows is incomplete by ${value.loadedContextsReported - value.loadedContextsParsed}.`,
    );
  }

  if (value.diverged) {
    sentences.push(`The running dialplan and ${DIALPLAN_FILE} have diverged.`);
    if (value.inFileNotLoaded.length > 0) {
      sentences.push(
        `${contexts(value.inFileNotLoaded.length)} the file declares ${value.inFileNotLoaded.length === 1 ? 'is' : 'are'} not loaded: ${list(value.inFileNotLoaded)}.`,
      );
    }
    if (value.loadedNotInFile.length > 0) {
      sentences.push(
        `${contexts(value.loadedNotInFile.length)} loaded from this file ${value.loadedNotInFile.length === 1 ? 'is' : 'are'} no longer in it: ${list(value.loadedNotInFile)}.`,
      );
    }
    if (value.directives.length === 0 && value.unattributed.length > 0) {
      sentences.push(
        `${contexts(value.unattributed.length)} loaded by pbx_config ${value.unattributed.length === 1 ? 'is' : 'are'} not declared in it and hold no extension naming a file: ${list(value.unattributed)}.`,
      );
    }
    sentences.push('`dialplan show` reads what pbx_config has loaded, not what is on disk, so this canvas is drawing the older of the two. A dialplan reload on the target is what closes the gap.');
  } else {
    sentences.push(
      `The running dialplan matches ${DIALPLAN_FILE}: every one of the ${contexts(value.fileContextCount)} it declares is loaded, and pbx_config has loaded no other.`,
    );
  }

  if (value.fromIncludedFiles.length > 0) {
    const files = [...new Set(value.fromIncludedFiles.map((entry) => entry.file))];
    sentences.push(
      `${contexts(value.fromIncludedFiles.length)} came from ${files.length === 1 ? 'a file' : 'files'} this one includes (${list(files)}) and ${value.fromIncludedFiles.length === 1 ? 'was' : 'were'} not compared.`,
    );
  }
  if (value.directives.length > 0 && value.unattributed.length > 0) {
    sentences.push(
      `${contexts(value.unattributed.length)} could not be attributed to any file, because ${value.unattributed.length === 1 ? 'it holds' : 'they hold'} no extension for \`dialplan show\` to print one against and this file carries ${value.directives.length} include directive(s) whose contents were not read: ${list(value.unattributed)}.`,
    );
  }
  if (value.loadedFromOtherRegistrarsCount > 0) {
    sentences.push(
      `A further ${contexts(value.loadedFromOtherRegistrarsCount)} on this target ${value.loadedFromOtherRegistrarsCount === 1 ? 'was' : 'were'} created by another module rather than by this file, and ${value.loadedFromOtherRegistrarsCount === 1 ? 'is' : 'are'} never compared against it.`,
    );
  }

  return sentences.join(' ');
}

/**
 * `dialplan show` reads the dialplan Asterisk currently has *loaded*, which is not
 * necessarily what `/etc/asterisk/extensions.conf` says on disk right now -- an edit
 * that was never followed by a reload leaves the two disagreeing with nothing on
 * either reading saying so. Verified against a live target: the file held three
 * contexts (`dundi-e164`, `iax2-trunk`, `trunkint`) that the running dialplan had none
 * of, because an earlier session had restored the file without reloading `pbx_config`.
 *
 * This compares only the direction a reading can prove without guessing: a context the
 * file declares that the loaded graph shows zero extensions under. It cannot rule out
 * a context that is genuinely empty by design (nothing but an `include =>` line, say),
 * so the caller reports this as a fact about what was found rather than a diagnosis.
 * `general` and `globals` are not contexts at all (`pbx/pbx_config.c` `pbx_load_config`:
 * "All categories but 'general' or 'globals' are considered contexts") and are excluded
 * so neither is ever reported as one.
 */
export function contextsMissingFromLoadedDialplan(
  graph: DialplanGraph | undefined,
  fileContextNames: ReadonlyArray<string>,
): string[] {
  if (!graph) return [];
  const loaded = new Set(graph.nodes.map((node) => node.context));
  const seen = new Set<string>();
  const missing: string[] = [];
  for (const raw of fileContextNames) {
    const name = raw.trim();
    if (!name || /^(general|globals)$/iu.test(name) || seen.has(name)) continue;
    seen.add(name);
    if (!loaded.has(name)) missing.push(name);
  }
  return missing;
}

export interface CanvasNode { id: string; x: number; y: number; icon: string; title: string; detail: string }

const COLUMN_W = 228;
const ROW_H = 96;
const ORIGIN_X = 24;
const ORIGIN_Y = 28;

/** Layered left-to-right layout by graph depth (longest path from a root, in edges). */
export function layoutNodes(graph: DialplanGraph): CanvasNode[] {
  const depth = new Map<string, number>();
  const incoming = new Set(graph.edges.map(([, to]) => to));
  const outgoing = new Map<string, string[]>();
  for (const [from, to] of graph.edges) outgoing.set(from, [...(outgoing.get(from) ?? []), to]);

  const roots = graph.nodes.filter((node) => !incoming.has(node.id)).map((node) => node.id);
  const order = roots.length ? roots : graph.nodes.map((node) => node.id);
  for (const id of order) depth.set(id, 0);

  // Propagate depth = max(parent depth) + 1 along edges, bounded by node count to stay finite on cycles.
  for (let pass = 0; pass < graph.nodes.length; pass++) {
    let changed = false;
    for (const [from, to] of graph.edges) {
      const fromDepth = depth.get(from);
      if (fromDepth === undefined) continue;
      const candidate = fromDepth + 1;
      if ((depth.get(to) ?? -1) < candidate) {
        depth.set(to, candidate);
        changed = true;
      }
    }
    if (!changed) break;
  }
  for (const node of graph.nodes) if (!depth.has(node.id)) depth.set(node.id, 0);

  const columnCounts = new Map<number, number>();
  return graph.nodes
    .slice()
    .sort((a, b) => a.context.localeCompare(b.context) || a.extension.localeCompare(b.extension))
    .map((node) => {
      const col = depth.get(node.id) ?? 0;
      const row = columnCounts.get(col) ?? 0;
      columnCounts.set(col, row + 1);
      return {
        id: node.id,
        x: ORIGIN_X + col * COLUMN_W,
        y: ORIGIN_Y + row * ROW_H,
        icon: iconFor(node),
        title: titleFor(node),
        detail: detailFor(node),
      };
    });
}

export function edgePairs(graph: DialplanGraph): [string, string][] {
  return graph.edges.map(([from, to]) => [from, to]);
}

function titleFor(node: DialplanNode): string {
  return `${node.context} · ${node.extension}`;
}

function detailFor(node: DialplanNode): string {
  return node.steps.map((step) => `${step.priority}. ${step.app}(${step.data})`).join('\n');
}

/** Icon derived from what the extension's steps actually do — no invented meaning. */
function iconFor(node: DialplanNode): string {
  const apps = node.steps.map((step) => step.app.toUpperCase());
  if (apps.includes('QUEUE')) return 'groups';
  if (apps.includes('VOICEMAIL')) return 'voicemail';
  if (apps.includes('GOTOIFTIME')) return 'schedule';
  if (apps.some((app) => app === 'PLAYBACK' || app === 'BACKGROUND')) return 'dialpad';
  if (apps.includes('DIAL')) return 'call_made';
  if (apps.includes('HANGUP')) return 'call_end';
  if (/^(from-|trunk|external|inbound)/iu.test(node.context)) return 'call_received';
  return 'call_split';
}
