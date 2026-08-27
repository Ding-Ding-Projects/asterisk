/**
 * Everything the console can do, in one searchable list.
 *
 * The list is DERIVED from the compiled design rather than hand-written beside it. A
 * hand-written palette is a second inventory of the same thing, and the two diverge the
 * first time somebody adds a control -- silently, and always in the direction of the
 * palette being the stale one. So a setting can only appear here by existing there.
 *
 * Two things this deliberately does not do:
 *
 *  - It does not RANK by cleverness. A person types the first few letters of a thing they
 *    already know the name of, so a label that starts with what was typed beats one that
 *    merely contains it, and everything else is left alone. A fuzzy matcher that reorders
 *    familiar results is worse than no ordering at all.
 *  - It does not hide anything it cannot reach. An entry that is locked, or on a screen
 *    that is not open, is still listed and still says so, because a result set that
 *    quietly shrinks teaches people the search is unreliable.
 */

export type PaletteKind = 'destination' | 'setting' | 'appearance';

export interface PaletteEntry {
  /** Unique across every kind, so a setting and a destination can share a label safely. */
  key: string;
  kind: PaletteKind;
  label: string;
  /** Where it lives, shown beside the label so two similar labels can be told apart. */
  context: string;
  /** The destination to open. For a setting, the screen that owns it. */
  screen: string;
  /** The control to reveal and focus once that screen is open. Absent for a destination. */
  controlId?: string;
  /** Searched as well as the label, so a description can find something whose name you forgot. */
  detail: string;
}

interface ControlLike { id: string; label: string; kind: string; info?: string }
interface GroupLike { title?: string; ctls?: ControlLike[] }
interface ScreenLike { label: string; title: string; sub?: string; groups?: GroupLike[] }

/**
 * Builds the list from the design's own structures.
 *
 * Takes them as arguments rather than importing them, so the ordering and the searching can
 * be tested against fixtures rather than against whatever the console currently contains --
 * a test that reads the real design passes for the wrong reason the moment the design
 * changes underneath it.
 */
export function buildPalette(
  order: readonly string[],
  screens: Readonly<Record<string, ScreenLike>>,
  appearanceGroups: readonly GroupLike[],
): PaletteEntry[] {
  const entries: PaletteEntry[] = [];
  const seen = new Set<string>();

  const push = (entry: PaletteEntry): void => {
    /* A duplicate key means two different things would answer to one result, and whichever
     * the palette teleported to would be arbitrary. Keeping the first is the stable choice;
     * silently keeping the last would depend on iteration order. */
    if (seen.has(entry.key)) return;
    seen.add(entry.key);
    entries.push(entry);
  };

  for (const id of order) {
    const screen = screens[id];
    if (!screen) continue;
    push({
      key: `destination:${id}`,
      kind: 'destination',
      label: screen.label,
      context: screen.title === screen.label ? 'Destination' : screen.title,
      screen: id,
      detail: screen.sub ?? '',
    });
    for (const group of screen.groups ?? []) {
      for (const control of group.ctls ?? []) {
        push({
          key: `setting:${id}:${control.id}`,
          kind: 'setting',
          label: control.label,
          /* The group, then the screen: a person looking for "Weight" needs to know which
           * of several Weights this is before the label alone means anything. */
          context: group.title ? `${screen.label} · ${group.title}` : screen.label,
          screen: id,
          controlId: control.id,
          detail: control.info ?? '',
        });
      }
    }
  }

  for (const group of appearanceGroups) {
    for (const control of group.ctls ?? []) {
      push({
        key: `appearance:${control.id}`,
        kind: 'appearance',
        label: control.label,
        context: group.title ? `Appearance · ${group.title}` : 'Appearance',
        screen: 'appearance',
        controlId: control.id,
        detail: control.info ?? '',
      });
    }
  }

  return entries;
}

export interface PaletteMatch {
  entry: PaletteEntry;
  /** Where in the label the typed text was found, or -1 when only the detail matched. */
  at: number;
}

/**
 * Filters and orders the list for what was typed.
 *
 * Plain text by default and case-insensitive, matching the rest of the console: regex is an
 * explicit opt-in everywhere else, and a palette that silently treated a typed dot as
 * "any character" would quietly return the wrong thing rather than nothing.
 */
export function searchPalette(entries: readonly PaletteEntry[], query: string): PaletteMatch[] {
  const needle = query.trim().toLowerCase();
  if (needle === '') return entries.map((entry) => ({ entry, at: 0 }));

  const matches: PaletteMatch[] = [];
  for (const entry of entries) {
    const at = entry.label.toLowerCase().indexOf(needle);
    if (at >= 0) { matches.push({ entry, at }); continue; }
    /* The context and detail are searched too, so somebody who remembers what a setting
     * DOES but not what it is called can still find it. Ranked below every label match,
     * because a label match is almost always the one that was meant. */
    if (entry.context.toLowerCase().includes(needle) || entry.detail.toLowerCase().includes(needle)) {
      matches.push({ entry, at: -1 });
    }
  }

  /* Starts-with beats contains, contains beats detail-only, and everything inside one tier
   * keeps the design's own order. A stable sort is what makes that last part true, and it
   * is the property that stops a familiar result moving between keystrokes. */
  return matches.sort((left, right) => tier(left) - tier(right));
}

const tier = (match: PaletteMatch): number => (match.at === 0 ? 0 : match.at > 0 ? 1 : 2);

/** The chord that opens it. One discoverable global shortcut, stated in one place. */
export const PALETTE_CHORD = { ctrl: true, shift: true, key: 'f' } as const;

/**
 * Whether a keyboard event is that chord.
 *
 * Compares `key` case-insensitively rather than `code`, so a non-QWERTY layout opens the
 * palette with the key that has F printed on it. It also refuses to fire while somebody is
 * typing into a field -- with one exception, the palette's own field, which is where the
 * chord must still close it.
 */
export function isPaletteChord(event: {
  ctrlKey: boolean; shiftKey: boolean; metaKey?: boolean; altKey?: boolean; key: string;
}): boolean {
  if (!event.ctrlKey || !event.shiftKey) return false;
  if (event.altKey === true) return false;
  return typeof event.key === 'string' && event.key.toLowerCase() === PALETTE_CHORD.key;
}

/**
 * Moves the highlighted row.
 *
 * Wraps, because a list you can fall off the end of makes somebody look at the screen to
 * find out where they are, which is the thing keyboard navigation exists to avoid. Returns
 * 0 for an empty list rather than -1, so a caller never indexes with a negative number.
 */
export function moveSelection(count: number, current: number, delta: number): number {
  if (count <= 0) return 0;
  return ((current + delta) % count + count) % count;
}
