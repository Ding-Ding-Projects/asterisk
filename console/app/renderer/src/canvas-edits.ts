import type { ConfigSection, ConfigValue } from './configuration';
import type { DialplanGraph, DialplanNode, DialplanStep } from './canvas';

/**
 * The dialplan canvas's write model.
 *
 * The canvas draws what `dialplan show` reports. Every edit a person makes on it is
 * held here as a pending edit against `/etc/asterisk/extensions.conf`, projected onto
 * the drawn graph so the canvas shows the intended result, and finally turned into a
 * complete replacement document for `pbx.apply`: the same full-document path the
 * onboarding wizard uses, which diffs, backs up, writes, reloads and verifies.
 *
 * Nothing in here touches the target. `applyCanvasEdits` is a pure function from the
 * file as read plus the pending edits to the file as it should become, so every rule
 * about what an edit means to extensions.conf lives in one testable place:
 *
 * - a step is appended to an extension as `same => n,App(data)`, or as
 *   `exten => ext,1,App(data)` when the extension does not exist yet;
 * - connecting A to B appends `Goto(B.context,B.extension,1)` to A;
 * - deleting an extension removes its `exten` line and every `same` line under it;
 * - duplicating copies those lines under a new extension name;
 * - editing a step replaces one line's application text in place.
 */

export interface ExtensionRef { context: string; extension: string }

export type CanvasEdit =
  | { kind: 'add-step'; context: string; extension: string; app: string; data: string }
  | { kind: 'connect'; from: ExtensionRef; to: ExtensionRef }
  | { kind: 'delete-extension'; context: string; extension: string }
  | { kind: 'duplicate-extension'; context: string; extension: string; as: string }
  | { kind: 'set-step'; context: string; extension: string; priority: number; app: string; data: string }
  | { kind: 'delete-step'; context: string; extension: string; priority: number };

type Entry = { key: string; value: string; separator?: '=' | '=>' };
/** `original` is the entry object as read from the target; it is emitted unchanged unless
 *  the line was edited, so untouched lines keep their separator and exact text. The
 *  transport compares what it reads back against what it was given field by field. */
interface StepLine { priority: string; text: string; original?: Entry; originalText?: string }
interface ExtensionBlock { extension: string; lines: StepLine[] }
type Item = { kind: 'block'; block: ExtensionBlock } | { kind: 'entry'; entry: Entry };
/** Dialplan lines are `=>` lines; `exten = …` is an assignment Asterisk reads differently. */
const DIALPLAN_SEPARATOR = '=>' as const;

export const nodeIdFor = (context: string, extension: string): string => `${context}/${extension}`;

/** `App(data)` with the parentheses Asterisk expects, empty data included. */
export function stepText(app: string, data: string): string {
  return `${app.trim()}(${data.trim()})`;
}

/** Splits `App(data)` back into its parts; text without parentheses is an app alone. */
export function parseStepText(text: string): { app: string; data: string } {
  const match = text.trim().match(/^([^(]+)\((.*)\)$/su);
  return match ? { app: match[1].trim(), data: match[2] } : { app: text.trim(), data: '' };
}

function parseSection(section: ConfigSection): Item[] {
  const items: Item[] = [];
  let current: ExtensionBlock | undefined;
  for (const entry of section.entries) {
    if (entry.key === 'exten') {
      const parts = entry.value.split(',');
      if (parts.length >= 3) {
        const text = parts.slice(2).join(',').trim();
        current = { extension: parts[0].trim(), lines: [{ priority: parts[1].trim(), text, original: entry, originalText: text }] };
        items.push({ kind: 'block', block: current });
        continue;
      }
    }
    if (entry.key === 'same' && current) {
      const parts = entry.value.split(',');
      if (parts.length >= 2) {
        const text = parts.slice(1).join(',').trim();
        current.lines.push({ priority: parts[0].trim(), text, original: entry, originalText: text });
        continue;
      }
    }
    current = undefined;
    items.push({ kind: 'entry', entry });
  }
  return items;
}

function serialize(name: string, items: Item[]): ConfigSection {
  const entries: Entry[] = [];
  for (const item of items) {
    if (item.kind === 'entry') { entries.push(item.entry); continue; }
    item.block.lines.forEach((line, index) => {
      const key = index === 0 ? 'exten' : 'same';
      const value = index === 0 ? `${item.block.extension},${line.priority},${line.text}` : `${line.priority},${line.text}`;
      /* An untouched line goes back exactly as it was read, separator included. */
      if (line.original && line.original.key === key && line.originalText === line.text && line.original.value === value) entries.push(line.original);
      else entries.push({ key, value, separator: DIALPLAN_SEPARATOR });
    });
  }
  return { name, entries };
}

function findBlock(items: Item[], extension: string): ExtensionBlock | undefined {
  for (const item of items) if (item.kind === 'block' && item.block.extension === extension) return item.block;
  return undefined;
}

/** A pending edit applied to the file as read. Sections are created on demand; every
 *  unrelated entry keeps its place and its text. */
export function applyCanvasEdits(value: ConfigValue, edits: ReadonlyArray<CanvasEdit>): { value: ConfigValue; summary: string[] } {
  const sections = new Map<string, Item[]>();
  const order: string[] = [];
  for (const section of value) { sections.set(section.name, parseSection(section)); order.push(section.name); }
  const items = (context: string): Item[] => {
    let list = sections.get(context);
    if (!list) { list = []; sections.set(context, list); order.push(context); }
    return list;
  };
  const summary: string[] = [];

  for (const edit of edits) {
    if (edit.kind === 'add-step') {
      const list = items(edit.context);
      const block = findBlock(list, edit.extension);
      const text = stepText(edit.app, edit.data);
      if (block) block.lines.push({ priority: 'n', text });
      else list.push({ kind: 'block', block: { extension: edit.extension, lines: [{ priority: '1', text }] } });
      summary.push(`${edit.context}: ${edit.extension} gets ${text}`);
    } else if (edit.kind === 'connect') {
      const list = items(edit.from.context);
      const text = `Goto(${edit.to.context},${edit.to.extension},1)`;
      const block = findBlock(list, edit.from.extension);
      if (block) block.lines.push({ priority: 'n', text });
      else list.push({ kind: 'block', block: { extension: edit.from.extension, lines: [{ priority: '1', text }] } });
      summary.push(`${edit.from.context}: ${edit.from.extension} continues to ${edit.to.context} ${edit.to.extension}`);
    } else if (edit.kind === 'delete-extension') {
      const list = items(edit.context);
      const index = list.findIndex((item) => item.kind === 'block' && item.block.extension === edit.extension);
      if (index >= 0) { list.splice(index, 1); summary.push(`${edit.context}: ${edit.extension} removed with all its steps`); }
    } else if (edit.kind === 'duplicate-extension') {
      const list = items(edit.context);
      const block = findBlock(list, edit.extension);
      if (block && !findBlock(list, edit.as)) {
        list.push({ kind: 'block', block: { extension: edit.as, lines: block.lines.map((line) => ({ ...line })) } });
        summary.push(`${edit.context}: ${edit.extension} copied to ${edit.as}`);
      }
    } else if (edit.kind === 'set-step') {
      const block = findBlock(items(edit.context), edit.extension);
      const line = block?.lines[edit.priority - 1];
      if (line) { line.text = stepText(edit.app, edit.data); summary.push(`${edit.context}: ${edit.extension} priority ${edit.priority} becomes ${line.text}`); }
    } else if (edit.kind === 'delete-step') {
      const list = items(edit.context);
      const block = findBlock(list, edit.extension);
      if (block && block.lines[edit.priority - 1]) {
        block.lines.splice(edit.priority - 1, 1);
        if (block.lines.length === 0) list.splice(list.findIndex((item) => item.kind === 'block' && item.block === block), 1);
        else block.lines[0].priority = '1';
        summary.push(`${edit.context}: ${edit.extension} priority ${edit.priority} removed`);
      }
    }
  }

  return { value: order.map((name) => serialize(name, sections.get(name) ?? [])), summary };
}

/** The drawn graph with the pending edits shown as they will land. Ids follow the
 *  control plane's own `context/extension` convention so a connection to a live node
 *  resolves to that node. */
export function projectEdits(graph: DialplanGraph, edits: ReadonlyArray<CanvasEdit>): DialplanGraph {
  const nodes: DialplanNode[] = graph.nodes.map((node) => ({ ...node, steps: node.steps.map((step) => ({ ...step })) }));
  const edges: Array<[string, string]> = graph.edges.map(([a, b]) => [a, b]);
  const find = (context: string, extension: string) => nodes.find((node) => node.context === context && node.extension === extension);
  const ensure = (context: string, extension: string): DialplanNode => {
    const existing = find(context, extension);
    if (existing) return existing;
    const created: DialplanNode = { id: nodeIdFor(context, extension), context, extension, steps: [] };
    nodes.push(created);
    return created;
  };
  const nextPriority = (node: DialplanNode) => (node.steps.length ? Math.max(...node.steps.map((s) => s.priority)) + 1 : 1);

  for (const edit of edits) {
    if (edit.kind === 'add-step') {
      const node = ensure(edit.context, edit.extension);
      node.steps.push({ priority: nextPriority(node), app: edit.app, data: edit.data });
    } else if (edit.kind === 'connect') {
      const from = ensure(edit.from.context, edit.from.extension);
      const to = ensure(edit.to.context, edit.to.extension);
      from.steps.push({ priority: nextPriority(from), app: 'Goto', data: `${edit.to.context},${edit.to.extension},1` });
      if (!edges.some(([a, b]) => a === from.id && b === to.id)) edges.push([from.id, to.id]);
    } else if (edit.kind === 'delete-extension') {
      const node = find(edit.context, edit.extension);
      if (!node) continue;
      const index = nodes.indexOf(node);
      nodes.splice(index, 1);
      for (let i = edges.length - 1; i >= 0; i -= 1) if (edges[i][0] === node.id || edges[i][1] === node.id) edges.splice(i, 1);
    } else if (edit.kind === 'duplicate-extension') {
      const node = find(edit.context, edit.extension);
      if (!node || find(edit.context, edit.as)) continue;
      const copy: DialplanNode = { id: nodeIdFor(edit.context, edit.as), context: edit.context, extension: edit.as, steps: node.steps.map((step): DialplanStep => ({ ...step })) };
      nodes.push(copy);
      for (const [a, b] of [...edges]) if (a === node.id) edges.push([copy.id, b]);
    } else if (edit.kind === 'set-step') {
      const node = find(edit.context, edit.extension);
      const step = node?.steps.find((candidate) => candidate.priority === edit.priority);
      if (step) { step.app = edit.app; step.data = edit.data; }
    } else if (edit.kind === 'delete-step') {
      const node = find(edit.context, edit.extension);
      if (!node) continue;
      const index = node.steps.findIndex((candidate) => candidate.priority === edit.priority);
      if (index < 0) continue;
      const removed = node.steps.splice(index, 1)[0];
      node.steps.forEach((step, position) => { step.priority = position + 1; });
      if (removed.app === 'Goto') {
        const parts = removed.data.split(',').map((part) => part.trim());
        const target = parts.length >= 2 ? find(parts.length >= 3 ? parts[0] : node.context, parts.length >= 3 ? parts[1] : parts[0]) : undefined;
        if (target) { const at = edges.findIndex(([a, b]) => a === node.id && b === target.id); if (at >= 0) edges.splice(at, 1); }
      }
      if (node.steps.length === 0) {
        nodes.splice(nodes.indexOf(node), 1);
        for (let i = edges.length - 1; i >= 0; i -= 1) if (edges[i][0] === node.id || edges[i][1] === node.id) edges.splice(i, 1);
      }
    }
  }
  return { nodes, edges };
}

/** One line per pending edit, for the confirmation gate and the summary chip. */
export function describeEdits(edits: ReadonlyArray<CanvasEdit>): string[] {
  return edits.map((edit) => {
    switch (edit.kind) {
      case 'add-step': return `Add ${stepText(edit.app, edit.data)} to ${edit.context} ${edit.extension}`;
      case 'connect': return `Connect ${edit.from.context} ${edit.from.extension} to ${edit.to.context} ${edit.to.extension}`;
      case 'delete-extension': return `Delete ${edit.context} ${edit.extension} and its steps`;
      case 'duplicate-extension': return `Copy ${edit.context} ${edit.extension} as ${edit.as}`;
      case 'set-step': return `Set ${edit.context} ${edit.extension} priority ${edit.priority} to ${stepText(edit.app, edit.data)}`;
      case 'delete-step': return `Remove ${edit.context} ${edit.extension} priority ${edit.priority}`;
    }
  });
}
