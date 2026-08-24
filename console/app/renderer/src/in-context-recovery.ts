/**
 * Offering the way out where the failure was found.
 *
 * Somebody whose push was rejected is looking at the push button. Telling them
 * "insufficient scope" and leaving them to find the sign-in screen is a dead end at the
 * exact moment they know what they want to do -- so a recovery route belongs beside the
 * control that failed, not in a menu somewhere else.
 *
 * Two things this module refuses to do, and both are why it exists as a mapping rather
 * than as an if-statement at each call site:
 *
 *  - IT NEVER OFFERS A REMEDY THAT LOSES WORK. A rejected push has fixes that look fast
 *    and destroy commits: force-push, reset, dropping the local branch, switching away
 *    mid-conflict. Those are exactly the ones somebody reaches for under pressure, so
 *    they are named as forbidden rather than merely left out -- a caller handing this to
 *    a coding agent can pass the list on.
 *  - IT NEVER CLAIMS A ROUTE IT CANNOT OFFER. A failure with no known recovery says so
 *    and shows the real error, rather than a cheerful "Try again" that does the same
 *    thing and fails the same way.
 */

export const FAILURE_KINDS = [
  'push-rejected',
  'credential-expired',
  'scope-missing',
  'merge-conflict',
  'target-unreachable',
  'permission-denied',
  'disk-full',
  'unknown',
] as const;
export type FailureKind = (typeof FAILURE_KINDS)[number];

/** What a recovery action does when the person takes it. Named, so a caller cannot invent one. */
export const RECOVERY_ACTIONS = [
  're-authenticate',
  'request-scopes',
  'open-conflicts',
  'retry',
  'choose-another-target',
  'free-space',
  'show-detail',
] as const;
export type RecoveryAction = (typeof RECOVERY_ACTIONS)[number];

export interface Recovery {
  /** What went wrong, in words somebody can act on. Never a status code alone. */
  summary: string;
  /** Offered beside the failing control. Empty when nothing honest can be offered. */
  actions: { action: RecoveryAction; label: string }[];
  /**
   * Remedies that must never be offered or performed for this failure, named rather than
   * merely absent. These are the ones that look fastest under pressure and lose work.
   */
  forbidden: string[];
  /** The real error, always carried through rather than replaced by the summary. */
  detail: string;
}

const NEVER_FOR_GIT = [
  'force-push',
  'rewrite or drop existing commits',
  'reset the branch',
  'delete the local branch',
  'switch branches mid-conflict',
];

/**
 * The route out of one failure.
 *
 * `detail` is the real error and is carried through every branch -- a summary that
 * replaced it would leave somebody unable to search for what actually happened.
 */
export function recoveryFor(kind: FailureKind, detail: string, context: { target?: string } = {}): Recovery {
  const where = context.target ? ` for ${context.target}` : '';
  switch (kind) {
    case 'push-rejected':
      return {
        summary: `The push${where} was rejected. The remote has commits this branch does not.`,
        actions: [
          { action: 'open-conflicts', label: 'Show what differs' },
          { action: 'retry', label: 'Fetch and try again' },
        ],
        forbidden: NEVER_FOR_GIT,
        detail,
      };
    case 'credential-expired':
      return {
        summary: `The saved credential${where} is no longer accepted.`,
        actions: [{ action: 're-authenticate', label: 'Sign in again' }],
        forbidden: ['store the credential anywhere but the OS credential vault'],
        detail,
      };
    case 'scope-missing':
      return {
        summary: `The signed-in account${where} lacks a permission this needs.`,
        /* Offered here rather than in a settings screen: reporting the missing scope and
         * leaving somebody to find the sign-in flow is a dead end at the moment they know
         * exactly what they wanted to do. */
        actions: [{ action: 'request-scopes', label: 'Grant the missing permission' }],
        forbidden: ['widen permissions beyond the one that was refused'],
        detail,
      };
    case 'merge-conflict':
      return {
        summary: `Changes${where} conflict with the remote and need resolving before anything can land.`,
        actions: [
          { action: 'open-conflicts', label: 'Open the conflicts' },
          { action: 'show-detail', label: 'Show the exact files' },
        ],
        forbidden: NEVER_FOR_GIT,
        detail,
      };
    case 'target-unreachable':
      return {
        summary: `Nothing answered${where}. The server may be off, unreachable from here, or listening somewhere other than where this console is looking.`,
        actions: [
          { action: 'retry', label: 'Try again' },
          { action: 'choose-another-target', label: 'Use a different server' },
        ],
        forbidden: [],
        detail,
      };
    case 'permission-denied':
      return {
        summary: `The account is signed in but is not allowed to do this${where}.`,
        actions: [{ action: 'show-detail', label: 'Show what was refused' }],
        /* No retry: repeating a refused action changes nothing and reads as the console
         * not having understood the answer. */
        forbidden: ['retry the same action unchanged', 'elevate privileges automatically'],
        detail,
      };
    case 'disk-full':
      return {
        summary: 'There is not enough space to finish this.',
        actions: [{ action: 'free-space', label: 'Show what is using the space' }],
        forbidden: ['delete anything on the user’s behalf'],
        detail,
      };
    default:
      return {
        /* No invented route. A cheerful "Try again" that does the same thing and fails
         * the same way is worse than saying plainly that this one is not understood. */
        summary: 'This failed in a way the console does not have a recovery route for.',
        actions: [{ action: 'show-detail', label: 'Show the full error' }],
        forbidden: [],
        detail,
      };
  }
}

/**
 * The brief handed to a local coding agent, when one is offered.
 *
 * Names the real situation and forbids the work-losing remedies BY NAME, because those
 * are precisely the fixes that look fastest when a push is rejected. A brief that only
 * described the goal would invite exactly the shortcut this is trying to prevent.
 */
export function agentBrief(recovery: Recovery, situation: { remote?: string; branch?: string }): string {
  const lines = [
    recovery.summary,
    situation.remote ? `Remote: ${situation.remote}` : undefined,
    situation.branch ? `Branch: ${situation.branch}` : undefined,
    `Reported error: ${recovery.detail}`,
  ].filter((line): line is string => line !== undefined);
  if (recovery.forbidden.length > 0) {
    lines.push(`Do not, under any circumstances: ${recovery.forbidden.join('; ')}.`);
  }
  return lines.join('\n');
}
