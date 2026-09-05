/**
 * Live configuration for the screens that edit a configuration file.
 *
 * Every configuration screen in the design declares the file it is for — `logger.conf`,
 * `queues.conf`, and so on. Nothing ever read those files, so each screen rendered the
 * design's own default values and looked authoritative while showing nothing about the
 * machine it was connected to. This reads the real file so the screen can show what the
 * target actually has.
 *
 * The distinction that matters throughout: a value read from the target, and a value
 * the screen is merely displaying because the design shipped it, must never look the
 * same. Anything unread says so.
 */

/** One `[section]` and its `key = value` lines, as the transport parses them. */
export interface ConfigSection {
  name: string;
  /** `separator` is the transport's own field (`=` assignment or `=>` dialplan line); a
   *  value written back must carry it unchanged or the post-write comparison fails. */
  entries: ReadonlyArray<{ key: string; value: string; separator?: '=' | '=>' }>;
}

export type ConfigValue = ReadonlyArray<ConfigSection>;

export interface ConfigReading {
  resource: string;
  state: 'read' | 'unavailable';
  value?: ConfigValue;
  reason?: string;
  observedAt: string;
}

/** Absolute paths are what the control plane allowlists; screens name a bare file. */
export const CONFIG_DIRECTORY = '/etc/asterisk';

/**
 * The shape of a real Asterisk configuration filename: letters, digits, underscore, dash
 * and dots, ending in `.conf`. Nothing else.
 *
 * Ending in `.conf` and carrying no path separator used to be the whole test, and two
 * screens slipped a *display label* through it: `cdr.conf · cel.conf`, two filenames joined
 * for the reader's benefit. It ends in `.conf`, it has no separator, so it was accepted and
 * turned into a path that no target could ever have. The screen then read nothing, forever,
 * and reported no error -- which is precisely the "one status reading" that looked like a
 * thin feature and was actually a broken one.
 *
 * A name is refused here rather than at the transport, because a refusal at the transport
 * arrives as a failed read of a plausible-looking path, and a refusal here says the
 * declaration itself is wrong.
 */
const CONF_FILENAME = /^[a-z0-9][a-z0-9_.-]*\.conf$/iu;

export function resourceForFile(file: unknown): string | undefined {
  if (typeof file !== 'string') return undefined;
  /* Rejects a separator and a parent reference by construction: neither is in the set. It
   * also rejects whitespace, which is what a compound display label always carries. */
  if (!CONF_FILENAME.test(file)) return undefined;
  if (file.includes('..')) return undefined;
  return `${CONFIG_DIRECTORY}/${file}`;
}

/** Reads one value out of a parsed file: first match wins, as Asterisk itself reads. */
export function entryValue(value: ConfigValue | undefined, section: string, key: string): string | undefined {
  const found = value?.find((candidate) => candidate.name === section);
  return found?.entries.find((entry) => entry.key === key)?.value;
}

export function sectionNames(value: ConfigValue | undefined): ReadonlyArray<string> {
  return (value ?? []).map((section) => section.name).filter((name) => name.length > 0);
}

export function entryCount(value: ConfigValue | undefined): number {
  return (value ?? []).reduce((total, section) => total + section.entries.length, 0);
}

/**
 * A one-line summary a screen can show beside its controls.
 *
 * Deliberately states the shape of what was read rather than implying the controls are
 * bound to it. The controls below still hold the design's defaults until each one is
 * mapped to a real key, and saying otherwise here would be the same untruth the
 * confirmation dialog used to tell.
 */
export function configSummary(reading: ConfigReading | undefined, connected: boolean): string {
  if (!connected) return 'No target is connected, so this file has not been read.';
  if (!reading) return 'Reading…';
  if (reading.state !== 'read') {
    return reading.reason ?? `${reading.resource} could not be read.`;
  }
  const sections = sectionNames(reading.value);
  const entries = entryCount(reading.value);
  if (entries === 0) return `${reading.resource} is present and empty on this target.`;
  const shown = sections.slice(0, 4).join(', ');
  const more = sections.length > 4 ? `, and ${sections.length - 4} more` : '';
  return `${reading.resource}: ${entries} setting(s) across ${sections.length} section(s) — ${shown}${more}.`;
}

/** Renders the real file for display, so a screen can show exactly what is on the target. */
export function renderForDisplay(value: ConfigValue | undefined, maxLines = 400): string {
  if (!value || value.length === 0) return '';
  const lines: string[] = [];
  for (const section of value) {
    if (section.name.length > 0) lines.push(`[${section.name}]`);
    for (const entry of section.entries) lines.push(`${entry.key} = ${entry.value}`);
    lines.push('');
  }
  const trimmed = lines.slice(0, maxLines);
  if (lines.length > maxLines) trimmed.push(`… ${lines.length - maxLines} more line(s) not shown`);
  return trimmed.join('\n').trim();
}
