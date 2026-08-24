/**
 * The dim sum surprise.
 *
 * A one-in-ten chance at startup of showing a randomly chosen dish, its name in both
 * languages, and a picture of it. A small delight, not a feature anybody has to manage.
 *
 * It cannot be opted out of, and that is deliberate -- there is no setting to disable it
 * and any stored preference from an older build is ignored rather than honoured. What
 * makes an un-optable surprise polite is the rest of the contract, so every clause of it
 * is enforced here rather than trusted to the caller:
 *
 *  - It never gates startup, never steals focus, and auto-dismisses.
 *  - It never appears during a first run, an error path, an update, or any flow where
 *    somebody is mid-task. Those are the moments an unexpected picture is an intrusion
 *    rather than a delight.
 *  - It fires at most once per launch, from one draw. A second draw in the same launch
 *    would make the real rate higher than the stated one.
 *  - Images are bundled local assets. No network, no CDN, no tracking.
 *  - Every dish carries alt text naming it, so the delight reaches a screen-reader user
 *    too rather than being a decorative blank.
 */

export const SURPRISE_CHANCE = 0.1;

export interface Dish {
  id: string;
  /** Both names always. The dish's own name stays exact at every funny level. */
  nameEn: string;
  nameZhHant: string;
  /** A bundled local asset path. Never a URL. */
  asset: string;
}

/**
 * Startup states in which the surprise must not appear.
 *
 * Listed as data so the check is one lookup rather than a condition somebody has to
 * remember to extend when a new startup path is added.
 */
export const SUPPRESSED_CONTEXTS = ['first-run', 'error', 'update', 'mid-task', 'quiet-hours'] as const;
export type StartupContext = 'normal' | (typeof SUPPRESSED_CONTEXTS)[number];

export interface SurpriseInput {
  context: StartupContext;
  /** A draw in [0, 1). Injected so the rate is testable rather than flaky. */
  draw: number;
  /** True once this launch has already drawn. A launch gets exactly one draw. */
  alreadyDrawnThisLaunch: boolean;
  /** Chooses the dish. Injected for the same reason as `draw`. */
  pick: number;
}

export interface Surprise {
  dish: Dish;
  /** "Shrimp dumpling · 蝦餃" -- both names, whatever the active language mode. */
  title: string;
  /** Names the dish, so the delight reaches somebody who cannot see the picture. */
  altText: string;
  /** Milliseconds. Auto-dismisses; nothing waits for it. */
  dismissAfterMs: number;
  blocking: false;
  stealsFocus: false;
}

export const DISMISS_AFTER_MS = 6000;
export const NAME_SEPARATOR = ' · ';

/**
 * Decides whether to show a surprise, and which dish.
 *
 * Returns undefined far more often than not, which is the point. Every reason for
 * undefined is a rule above, and none of them is a stored preference.
 */
export function surpriseFor(dishes: readonly Dish[], input: SurpriseInput): Surprise | undefined {
  if (dishes.length === 0) return undefined;
  if (input.alreadyDrawnThisLaunch) return undefined;
  if (input.context !== 'normal') return undefined;
  if (!(input.draw >= 0 && input.draw < SURPRISE_CHANCE)) return undefined;

  const index = Math.abs(Math.floor(input.pick * dishes.length)) % dishes.length;
  const dish = dishes[index];
  return {
    dish,
    title: `${dish.nameEn}${NAME_SEPARATOR}${dish.nameZhHant}`,
    altText: `${dish.nameEn} (${dish.nameZhHant})`,
    dismissAfterMs: DISMISS_AFTER_MS,
    blocking: false,
    stealsFocus: false,
  };
}

/**
 * Whether a stored preference is ignored. Always true.
 *
 * A real function rather than an absence, because "there is no setting" is invisible to
 * a reader and to a test. An older build may have written one; this states plainly that
 * it is ignored rather than migrated, so a profile carrying `off` simply rejoins the draw. Named for what is true rather than
 * for the setting that does not exist, so it cannot read as an off switch at a glance.
 */
export function storedPreferenceIsIgnored(): boolean {
  return true;
}
