/**
 * Keyboard shortcuts shown on context-menu items.
 *
 * A context menu is where somebody goes to find out what an object can do, so an item
 * whose shortcut is hidden there is a shortcut nobody learns, and the menu becomes the
 * only route to a command that has a faster one.
 *
 * The rule that makes this worth having as a module rather than a formatting helper: the
 * shortcut displayed must be the one that ACTUALLY WORKS in that context. A shortcut
 * inferred from a similar command, one that only fires when a different surface has
 * focus, or one that was true in an earlier version trains a person to press a key that
 * does nothing -- which is worse than showing no shortcut at all, because they stop
 * trusting the column.
 *
 * So a shortcut is never passed in as a string beside a label. It is looked up from the
 * same registry that registers the binding, and an item whose command has no binding in
 * the current context shows nothing rather than a guess.
 */

export type Modifier = 'Ctrl' | 'Shift' | 'Alt' | 'Win';

export interface Binding {
  /** The command this fires. One command may have at most one binding per context. */
  command: string;
  /** Where it fires. A binding in another context must never be displayed here. */
  context: string;
  modifiers: readonly Modifier[];
  key: string;
}

/** Platform notation, in the order Windows writes them. */
const MODIFIER_ORDER: readonly Modifier[] = ['Ctrl', 'Shift', 'Alt', 'Win'];
export const MODIFIER_SEPARATOR = '+';

export function formatBinding(binding: Binding): string {
  const ordered = MODIFIER_ORDER.filter((modifier) => binding.modifiers.includes(modifier));
  return [...ordered, binding.key].join(MODIFIER_SEPARATOR);
}

export class ShortcutRegistry {
  private readonly bindings: Binding[] = [];

  /**
   * Registers a binding. Refuses a second binding for the same command in the same
   * context, because two answers to "what fires this here" means the menu has to pick
   * one and will eventually pick the wrong one.
   */
  register(binding: Binding): void {
    const clash = this.bindings.find(
      (existing) => existing.command === binding.command && existing.context === binding.context,
    );
    if (clash) {
      throw new Error(`${binding.command} already has a binding in ${binding.context}: ${formatBinding(clash)}`);
    }
    this.bindings.push(binding);
  }

  /** The binding that actually fires this command in this context, if there is one. */
  find(command: string, context: string): Binding | undefined {
    return this.bindings.find((binding) => binding.command === command && binding.context === context);
  }

  /** Every binding, for a cheatsheet or a conflict check. */
  all(): readonly Binding[] {
    return [...this.bindings];
  }

  /**
   * Commands sharing one chord in one context. A real conflict, reported rather than
   * resolved: the registry cannot know which was meant, and silently dropping one is how
   * a shortcut stops working with nothing on screen to explain it.
   *
   * Grouped by comparing context and chord directly rather than by joining them into a
   * string key. A joined key needs a separator that appears in neither half, and there is
   * no such character to pick safely -- the first version of this used a space and would
   * have split a context or a chord containing one straight down the middle.
   */
  conflicts(): Array<{ context: string; chord: string; commands: string[] }> {
    const groups: Array<{ context: string; chord: string; commands: string[] }> = [];
    for (const binding of this.bindings) {
      const chord = formatBinding(binding);
      const group = groups.find(
        (candidate) => candidate.context === binding.context && candidate.chord === chord,
      );
      if (group) group.commands.push(binding.command);
      else groups.push({ context: binding.context, chord, commands: [binding.command] });
    }
    return groups.filter((group) => group.commands.length > 1);
  }
}

export interface MenuItemInput {
  label: string;
  command: string;
}

export interface RenderedMenuItem {
  label: string;
  /** Empty when nothing fires this command here. Never a placeholder or a guess. */
  shortcut: string;
  /**
   * What assistive technology should announce as the shortcut, or undefined when there
   * is none. Exposed separately so the chord is announced as a shortcut rather than read
   * out twice as decorative text beside the label.
   */
  accessibleShortcut?: string;
}

/**
 * Renders one menu's items for a given context.
 *
 * An item with no binding gets an empty string rather than a dash or a placeholder:
 * padding the column with something is worse than an empty space, because it reads as a
 * shortcut somebody cannot quite make out.
 */
export function renderMenu(
  registry: ShortcutRegistry,
  context: string,
  items: readonly MenuItemInput[],
): RenderedMenuItem[] {
  return items.map((item) => {
    const binding = registry.find(item.command, context);
    if (!binding) return { label: item.label, shortcut: '' };
    const chord = formatBinding(binding);
    return { label: item.label, shortcut: chord, accessibleShortcut: chord };
  });
}
