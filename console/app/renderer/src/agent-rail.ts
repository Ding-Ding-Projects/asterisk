import { parseChangelog } from './changelog';
import { NOT_READ } from './readings';

/**
 * Real sources, and honest reasons, for the seven destinations on the agent rail.
 *
 * These screens have nothing to do with a PBX. Before this module they were handled by the
 * same `note()` branch as every PBX screen, so a console with no target discovered told a
 * reader "No target is connected" on the Skills registry and the Secret intake — which is
 * true, irrelevant, and actively misleading, because it implies that connecting a phone
 * system would fill them in. It would not. Nothing on this rail reads a target at all.
 *
 * So each of the seven names its own source, or names the exact store that does not exist.
 * The record is hand-written rather than derived: a rule that inferred "has a source" from
 * whether some function happens to return rows would report a screen as sourced the moment
 * anybody adds a branch, correct or not, and a screen deleted from the rail would vanish
 * from the check along with the screen. A test pins these keys against the rail's real
 * membership in the compiled design, so adding an eighth agent destination without an entry
 * here fails rather than silently inheriting the PBX wording again.
 */

export type AgentRailSourceKind =
  /** A real local store backs this screen and its rows come from it. */
  | 'wired'
  /** The store is real and loaded, and its contents are deliberately kept off the screen. */
  | 'withheld'
  /** There is no such store in this console. Not "not wired yet" — not present. */
  | 'no-store';

export interface AgentRailSource {
  readonly kind: AgentRailSourceKind;
  /** What the screen says instead of borrowing the PBX's "no target is connected". */
  readonly reason: string;
}

export const AGENT_RAIL_SOURCES: Readonly<Record<string, AgentRailSource>> = {
  memory: {
    kind: 'no-store',
    reason:
      'This console keeps no agent-memory corpus. There is no store behind this screen to search, sync or attest, '
      + 'so the records list and the three panels beside it stay empty rather than showing invented entries. '
      + 'Connecting a phone system would not change that — nothing on this rail reads a target.',
  },
  sync: {
    kind: 'no-store',
    reason:
      'Nothing in this console synchronises an agent-memory corpus anywhere, because it keeps no such corpus '
      + '(see the Memory console). With no run to record there is no run history, no backup and no attestation, '
      + 'so this table is empty rather than listing runs that never happened.',
  },
  skills: {
    kind: 'no-store',
    reason:
      'This console installs no agent skills and has no registry to read one from, so the table is empty. '
      + 'The orchestration settings below are this console’s own preferences and are stored locally; they '
      + 'describe no installed skill because there is none.',
  },
  hub: {
    kind: 'wired',
    reason: '',
  },
  vocab: {
    kind: 'withheld',
    reason:
      'The dictionary you upload is loaded and applied to the interface, and its terms are deliberately not '
      + 'listed in this table. Every table in this console can be selected, copied and exported to a file, and '
      + 'private vocabulary must never reach an export or the clipboard — so the loaded state is reported here '
      + 'in words instead, and the terms themselves stay in this machine’s own local cache.',
  },
  ops: {
    kind: 'wired',
    reason: '',
  },
  secrets: {
    kind: 'no-store',
    reason:
      'This console stores no secret of its own, so there is no intake to list. A credential typed into a '
      + 'control is consumed and the field blanked in the same step, precisely so that nothing keeps it — which '
      + 'also means there is nothing here to name, date or rotate.',
  },
};

/** True for a destination on the agent rail, i.e. one this module answers for. */
export function isAgentRailScreen(screen: string): screen is keyof typeof AGENT_RAIL_SOURCES {
  return Object.prototype.hasOwnProperty.call(AGENT_RAIL_SOURCES, screen);
}

/** How many versions the changelog bundle carries at most — `scripts/bundle-changelog.mjs`
 *  `MAX_VERSIONS`. Stated on the Operations screen so a reader is never left wondering
 *  whether an older release is missing or merely never happened. */
export const BUNDLED_RELEASE_LIMIT = 20;

/**
 * The Operations & releases table, from this build's own bundled release history.
 *
 * The bundle is generated at build time by `scripts/bundle-changelog.mjs` from this
 * repository's real `ding-pbx-console-v*` tags: every version is a tag that exists and
 * every date is the calendar date of the commit that tag points at.
 *
 * The design's five columns are Version, Published, Artifacts, Duration and State. Two of
 * them are real here and three are not, and the three stay `NOT_READ`:
 *
 *  - **Artifacts** — the bundle records commits, never release assets. This console has
 *    not asked a forge which files are attached to any of these tags.
 *  - **Duration** — the workflow's own end-to-end timing is written into the release notes
 *    on the forge, not into this bundle.
 *  - **State** — a tag is not a release. Whether a non-draft release was published for one
 *    of these tags is a fact about the forge that nothing in this process has checked, and
 *    writing "Published" into every row would be asserting exactly that unchecked fact.
 */
export function releaseRows(markdown: string): string[][] {
  return parseChangelog(markdown).map((entry) => [
    entry.version,
    entry.date,
    NOT_READ,
    NOT_READ,
    NOT_READ,
  ]);
}

/** What the Operations screen says about the table above it. */
export function releaseNote(rows: ReadonlyArray<unknown>): string {
  if (rows.length === 0) {
    return 'This build carries no release history: it was built from a checkout with no ding-pbx-console version tag '
      + 'on it, so there is no tag for the changelog bundle to read. Nothing is missing from the table — there is '
      + 'genuinely nothing to put in it.';
  }
  const plural = rows.length === 1 ? '' : 's';
  return `${rows.length} release${plural} read from this build’s own bundled tag history, newest first `
    + `(at most ${BUNDLED_RELEASE_LIMIT} are bundled). Published is the calendar date of the commit each tag `
    + 'points at. Artifacts, Duration and State are empty because this console has not asked a forge about these '
    + 'tags: a tag is not a release, and claiming one was published would be asserting something nothing here checked.';
}

/**
 * The sentence a vocabulary screen shows, given the real loaded state.
 *
 * Takes the count rather than the storage handle so this module stays pure and never
 * touches the cache — and, more to the point, so no code path here can ever hold a term.
 */
export function vocabularyNote(replacementCount: number): string {
  const loaded = replacementCount > 0
    ? `A dictionary is loaded on this machine and ${replacementCount} replacement${replacementCount === 1 ? ' is' : 's are'} being applied to the interface.`
    : 'No dictionary is loaded, so the interface is showing its original wording.';
  return `${loaded} ${AGENT_RAIL_SOURCES.vocab.reason}`;
}

/**
 * What the Status hub screen says about the table above it.
 *
 * "Open session" builds a real `status-hub-client.ts` report from this window's own
 * state -- which config screens have been read this run, and whether each succeeded --
 * validates it, and lists the result as a row below. Takes the count rather than the
 * report handle for the same reason `vocabularyNote` takes a count instead of the
 * storage: this module stays pure, and nothing routed through it can carry a lane's
 * evidence text into a place this console's own emission rules were not written to check.
 *
 * Nothing here is a claim about a network transport: this build has no HTTP client to an
 * external status hub, so "recording" a session means building and validating the report
 * locally, never transmitting it. Saying so is the honest floor `AGENT_RAIL_SOURCES.hub`
 * used to state directly, before there was a button to press at all.
 */
export function hubNote(sessionCount: number): string {
  if (sessionCount === 0) {
    return 'No session has been recorded yet. "Open session" below builds one from this window’s own state '
      + '-- validated against status-hub-client.ts’s field limits -- and lists it here. This console has no '
      + 'network client to an external status hub, so recording a session means building and validating the '
      + 'report locally; nothing here is ever transmitted anywhere.';
  }
  const plural = sessionCount === 1 ? '' : 's';
  return `${sessionCount} session${plural} recorded locally this run, each built from this window’s own real `
    + 'state and validated before being listed. Nothing here is transmitted anywhere: this build has no network '
    + 'client to an external status hub.';
}
