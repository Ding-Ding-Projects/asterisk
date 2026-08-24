/**
 * Editing features.conf: the in-call feature map and the transfer behaviour around it.
 *
 * `parseFeatures` has existed in the control plane since it was written and nothing on
 * screen ever reached it -- another of the scoreboard's "backend ready, no UI" rows. This
 * is the mapping half: one endpoint-editor-shaped module translating between the
 * `[featuremap]` / `[general]` sections and the Feature codes destination's controls.
 *
 * Every key here appears in Asterisk's own configs/samples/features.conf.sample. One is
 * worth naming because it is a real divergence from FreePBX rather than an oversight:
 * FreePBX's one-touch recording maps to `automon`, and this Asterisk's sample carries
 * only `automixmon`. Writing `automon` would produce a line the build ignores, which
 * looks exactly like a working setting that does nothing, so `automixmon` is what the
 * control writes and the control says so.
 *
 * The two sections behave differently and the difference is not cosmetic: `[featuremap]`
 * is a list of `name => sequence` lines whose order and repeats the parser preserves,
 * while `[general]` is ordinary key/value. They are therefore written by separate paths.
 */
import {
  parseFeatures, toConfigValueFeatures,
  type FeatureMapEntry, type FeaturesGeneralView, type FeaturesView,
} from '../../../control-plane/subsystem-models';
import type { ConfigValue } from './configuration';

/** The Feature codes destination's control ids, from the compiled design. */
export const FEATURE_CONTROLS = {
  blindxfer: 'fc_blindxfer',
  atxfer: 'fc_atxfer',
  disconnect: 'fc_disconnect',
  automixmon: 'fc_automixmon',
  parkcall: 'fc_parkcall',
  atxferabort: 'fc_atxferabort',
  atxfercomplete: 'fc_atxfercomplete',
  atxferthreeway: 'fc_atxferthreeway',
  atxferswap: 'fc_atxferswap',
  pickupexten: 'fc_pickupexten',
  featuredigittimeout: 'fc_featuredigittimeout',
  transferdigittimeout: 'fc_transferdigittimeout',
  atxfernoanswertimeout: 'fc_atxfernoanswertimeout',
  atxferdropcall: 'fc_atxferdropcall',
} as const;

/** `[featuremap]` entries, control id to the feature name Asterisk expects. */
export const FEATUREMAP_KEYS: Readonly<Record<string, string>> = {
  [FEATURE_CONTROLS.blindxfer]: 'blindxfer',
  [FEATURE_CONTROLS.atxfer]: 'atxfer',
  [FEATURE_CONTROLS.disconnect]: 'disconnect',
  [FEATURE_CONTROLS.automixmon]: 'automixmon',
  [FEATURE_CONTROLS.parkcall]: 'parkcall',
};

/** `[general]` text and numeric keys, control id to the features.conf key. */
export const GENERAL_TEXT_KEYS: Readonly<Record<string, keyof FeaturesGeneralView>> = {
  [FEATURE_CONTROLS.atxferabort]: 'atxferabort',
  [FEATURE_CONTROLS.atxfercomplete]: 'atxfercomplete',
  [FEATURE_CONTROLS.atxferthreeway]: 'atxferthreeway',
  [FEATURE_CONTROLS.atxferswap]: 'atxferswap',
  [FEATURE_CONTROLS.pickupexten]: 'pickupexten',
};

export const GENERAL_NUMBER_KEYS: Readonly<Record<string, keyof FeaturesGeneralView>> = {
  [FEATURE_CONTROLS.featuredigittimeout]: 'featuredigittimeout',
  [FEATURE_CONTROLS.transferdigittimeout]: 'transferdigittimeout',
  [FEATURE_CONTROLS.atxfernoanswertimeout]: 'atxfernoanswertimeout',
};

const toSwitch = (value: string | undefined): boolean | undefined =>
  value === undefined ? undefined : value === 'yes';
const fromSwitch = (value: unknown): string | undefined =>
  typeof value === 'boolean' ? (value ? 'yes' : 'no') : undefined;

/**
 * Seeds the screen from the target's own features.conf.
 *
 * A key the file does not set is left out rather than given a value, so the control
 * keeps the design's default and the screen never implies a code the PBX has not
 * actually been given. That matters more here than elsewhere: a feature code shown as
 * configured when it is not is a code somebody will tell their users to dial.
 */
export function controlValuesFor(existing: ConfigValue): Record<string, unknown> {
  const view = parseFeatures(existing);
  const values: Record<string, unknown> = {};
  const put = (id: string, value: unknown) => { if (value !== undefined) values[id] = value; };

  for (const [id, name] of Object.entries(FEATUREMAP_KEYS)) {
    put(id, view.featuremap.find((entry) => entry.name === name)?.sequence);
  }
  for (const [id, key] of Object.entries(GENERAL_TEXT_KEYS)) put(id, view.general[key]);
  for (const [id, key] of Object.entries(GENERAL_NUMBER_KEYS)) {
    const raw = view.general[key];
    put(id, raw === undefined ? undefined : Number(raw));
  }
  put(FEATURE_CONTROLS.atxferdropcall, toSwitch(view.general.atxferdropcall));
  return values;
}

export interface FeatureEdit {
  view: FeaturesView;
  summary: string[];
}

/**
 * Applies the screen's control values back onto features.conf.
 *
 * Only controls carrying a value are written. An empty text control is read as "nothing
 * entered" rather than "clear this code", because the two are indistinguishable once
 * both read as an empty string and silently un-configuring a transfer code is much the
 * worse of the two wrong guesses.
 */
export function applyControlValues(
  existing: ConfigValue,
  values: Record<string, unknown>,
): FeatureEdit {
  const view = parseFeatures(existing);
  const general: FeaturesGeneralView = { ...view.general };
  const featuremap: FeatureMapEntry[] = view.featuremap.map((entry) => ({ ...entry }));
  const summary: string[] = [];

  const text = (id: string) => {
    const raw = values[id];
    return typeof raw === 'string' && raw !== '' ? raw : undefined;
  };
  const number = (id: string) =>
    (typeof values[id] === 'number' ? String(values[id] as number) : undefined);

  /* `[featuremap]` is a list rather than a map, so an existing line is edited in place
   * to keep its position, and a new one is appended. Rewriting the section wholesale
   * would reorder a file somebody has arranged deliberately. */
  for (const [id, name] of Object.entries(FEATUREMAP_KEYS)) {
    const next = text(id);
    if (next === undefined) continue;
    const existingEntry = featuremap.find((entry) => entry.name === name);
    if (existingEntry) {
      if (existingEntry.sequence === next) continue;
      summary.push(`features.conf: [featuremap] ${name} ${existingEntry.sequence} to ${next}`);
      existingEntry.sequence = next;
    } else {
      summary.push(`features.conf: [featuremap] ${name} unset to ${next}`);
      featuremap.push({ name, sequence: next });
    }
  }

  const setGeneral = (key: keyof FeaturesGeneralView, next: string | undefined) => {
    if (next === undefined) return;
    const before = general[key];
    if (before === next) return;
    general[key] = next;
    summary.push(`features.conf: [general] ${key} ${before ?? 'unset'} to ${next}`);
  };
  for (const [id, key] of Object.entries(GENERAL_TEXT_KEYS)) setGeneral(key, text(id));
  for (const [id, key] of Object.entries(GENERAL_NUMBER_KEYS)) setGeneral(key, number(id));
  setGeneral('atxferdropcall', fromSwitch(values[FEATURE_CONTROLS.atxferdropcall]));

  return { view: { ...view, general, featuremap }, summary };
}

/** The document to send to the plan and apply actions. */
export function featuresDocument(edit: FeatureEdit, resource: string): { resource: string; value: ConfigValue } {
  return { resource, value: toConfigValueFeatures(edit.view) as ConfigValue };
}
