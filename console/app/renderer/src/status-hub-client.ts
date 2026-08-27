/**
 * Reporting this console's own state to a shared status hub.
 *
 * The hub is where somebody looks to find out what an install is doing without opening
 * it: which target it is talking to, what it last read, what is waiting on a person. The
 * value of that is entirely in whether the report is TRUE, so this module is built around
 * refusing to send a claim it cannot support.
 *
 * Three rules, each guarding a way a status page becomes worse than none:
 *
 *  - AN UNVERIFIED STATE IS NEVER REPORTED AS VERIFIED. A check that has not run is
 *    `unrun`, not `passed`. A page confidently reporting green for something nobody ran
 *    is worse than a page with a gap, because the gap prompts somebody to look.
 *  - NOTHING SENT CARRIES A SECRET. A session payload is assembled from state that also
 *    holds credentials and target details, so the fields are chosen by an allowlist
 *    rather than by spreading whatever is to hand.
 *  - A PAYLOAD THAT WOULD BE REJECTED IS NOT SENT. Every field has a documented bound;
 *    checking them here means a rejection is a bug in this code rather than a mystery in
 *    a log, and it means a too-long field is truncated deliberately rather than by
 *    whatever the far end does with it.
 */

/** Field bounds, matching the hub's own documented limits. */
export const LIMITS = Object.freeze({
  title: 120,
  summary: 2000,
  detail: 4000,
  laneLabel: 80,
  maxLanes: 40,
  maxEvidence: 20,
});

/** The honest states a lane can be in. `unrun` is deliberately not a synonym for failed. */
export const LANE_STATES = ['unrun', 'running', 'blocked', 'failed', 'passed'] as const;
export type LaneState = (typeof LANE_STATES)[number];

/** States that may only be set from a real observation, never inferred or defaulted. */
const STATES_NEEDING_EVIDENCE: ReadonlySet<LaneState> = new Set<LaneState>(['passed', 'failed']);

export interface Evidence {
  /** What was observed: a command, a run link, a commit. Never a summary of intent. */
  label: string;
  /** Where it can be checked. Empty when there is nowhere, which is itself worth saying. */
  href?: string;
}

export interface Lane {
  id: string;
  label: string;
  state: LaneState;
  evidence: readonly Evidence[];
}

export interface SessionReport {
  title: string;
  summary: string;
  lanes: readonly Lane[];
}

export interface ReportProblem {
  field: string;
  message: string;
}

/**
 * Validates a report before it is sent.
 *
 * The evidence rule is the one that matters: a lane claiming `passed` or `failed` without
 * evidence is a claim about something nobody can check, and those are exactly the two
 * states a reader acts on.
 */
export function validateReport(report: SessionReport): ReportProblem[] {
  const problems: ReportProblem[] = [];
  if (report.title.trim() === '') problems.push({ field: 'title', message: 'A session needs a title.' });
  if (report.title.length > LIMITS.title) {
    problems.push({ field: 'title', message: `The title is longer than ${LIMITS.title} characters.` });
  }
  if (report.summary.length > LIMITS.summary) {
    problems.push({ field: 'summary', message: `The summary is longer than ${LIMITS.summary} characters.` });
  }
  if (report.lanes.length > LIMITS.maxLanes) {
    problems.push({ field: 'lanes', message: `More than ${LIMITS.maxLanes} lanes.` });
  }

  const seen = new Set<string>();
  for (const lane of report.lanes) {
    if (seen.has(lane.id)) {
      /* Two lanes with one id means the hub keeps whichever arrives last, so one of them
       * silently never appears -- and it is not knowable which. */
      problems.push({ field: `lanes.${lane.id}`, message: `Two lanes share the id "${lane.id}".` });
    }
    seen.add(lane.id);

    if (!(LANE_STATES as readonly string[]).includes(lane.state)) {
      problems.push({ field: `lanes.${lane.id}`, message: `"${lane.state}" is not a lane state.` });
    }
    if (lane.label.length > LIMITS.laneLabel) {
      problems.push({ field: `lanes.${lane.id}`, message: `The label is longer than ${LIMITS.laneLabel} characters.` });
    }
    if (lane.evidence.length > LIMITS.maxEvidence) {
      problems.push({ field: `lanes.${lane.id}`, message: `More than ${LIMITS.maxEvidence} pieces of evidence.` });
    }
    if (STATES_NEEDING_EVIDENCE.has(lane.state) && lane.evidence.length === 0) {
      problems.push({
        field: `lanes.${lane.id}`,
        message: `"${lane.state}" is a claim somebody will act on and this lane offers nothing to check it against.`,
      });
    }
  }
  return problems;
}

/**
 * What may be sent.
 *
 * The protection is the EXPLICIT CONSTRUCTION below, naming every field one at a time.
 * An earlier version copied fields through a loop over an allowlist array and then built
 * the result explicitly anyway -- so the loop protected nothing, and a probe replacing it
 * with a wholesale copy changed no output at all. The comment claimed the loop was the
 * guard, which is the worst kind of wrong: it invited the next reader to trust something
 * that was not doing anything.
 *
 * Naming each field is also the only form that cannot rot. An allowlist array has to be
 * kept in step with the shape it describes; a constructor that mentions four fields
 * simply cannot emit a fifth.
 */
export interface Payload {
  title: string;
  summary: string;
  lanes: { id: string; label: string; state: LaneState; evidence: { label: string; href?: string }[] }[];
}

/**
 * Builds exactly what will be sent.
 *
 * A session is assembled from state that also holds credentials, target hostnames and
 * vault keys, so nothing is spread: every field is named.
 */
export function buildPayload(report: SessionReport): Payload {
  return {
    title: report.title.slice(0, LIMITS.title),
    summary: report.summary.slice(0, LIMITS.summary),
    lanes: report.lanes.slice(0, LIMITS.maxLanes).map((lane) => ({
      id: lane.id,
      label: lane.label.slice(0, LIMITS.laneLabel),
      state: lane.state,
      evidence: lane.evidence.slice(0, LIMITS.maxEvidence).map((entry) => (
        /* href is included only when there is one: an empty href renders as a link to
         * nowhere, which reads as a broken page rather than as evidence with no address. */
        entry.href === undefined
          ? { label: entry.label }
          : { label: entry.label, href: entry.href }
      )),
    })),
  };
}

export interface ReplyCursor {
  /** Highest sequence already seen. The next poll asks for everything after it. */
  after: number;
}

export interface PollOutcome {
  cursor: ReplyCursor;
  /** Replies to act on, in order. */
  replies: { seq: number; text: string }[];
  /** Set when the hub said the cursor is too old and history was lost. */
  resynchronised?: string;
}

/**
 * Advances the reply cursor.
 *
 * The hub may report that the requested cursor is older than anything it still holds. That
 * is not an error to retry: retrying asks the same impossible question forever. The cursor
 * jumps to the oldest sequence still available and the gap is REPORTED, because silently
 * skipping replies means somebody's answer was never acted on and nobody knows.
 */
export function advanceCursor(
  cursor: ReplyCursor,
  replies: readonly { seq: number; text: string }[],
  oldestAvailable?: number,
): PollOutcome {
  if (oldestAvailable !== undefined && oldestAvailable > cursor.after + 1) {
    const missed = oldestAvailable - cursor.after - 1;
    return {
      cursor: { after: oldestAvailable - 1 },
      replies: [],
      resynchronised: `${missed} earlier repl${missed === 1 ? 'y is' : 'ies are'} no longer available and cannot be read.`,
    };
  }
  const fresh = replies.filter((reply) => reply.seq > cursor.after).sort((a, b) => a.seq - b.seq);
  const highest = fresh.reduce((max, reply) => Math.max(max, reply.seq), cursor.after);
  return { cursor: { after: highest }, replies: fresh };
}
