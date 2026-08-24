/**
 * Support Tickets: the recovery route for a forgotten toy-lock credential, dressed as a
 * service desk.
 *
 * The joke is the point, and so is the honesty underneath it. A locked-out user reaches
 * this from the unlock prompt, from the lock setting and from Help. It plays the part
 * properly -- category, description, a locally generated ticket number, a severity nobody
 * will honour, a status that advances, a canned first response delivered with the gravity
 * of a desk that has read the manual once. Then the resolution does the only thing that
 * actually works: it opens the application-data folder so the person can delete it
 * themselves.
 *
 * Three rules hold the whole thing up:
 *
 *  - NOTHING LEAVES THE MACHINE. No network request, no collection, nobody reading it.
 *    One plain line says so, and that line is never styled by the funny level, because a
 *    user must never sit waiting for a reply that was never coming.
 *  - IT NEVER DELETES ANYTHING ITSELF. It opens the folder and stands back. Deletion is
 *    the user's own act in their own file manager. Any in-app deletion would be a
 *    destructive action and would have to go through the two-key confirmation gate, never
 *    behind a joke button.
 *  - IT IMPERSONATES NOBODY. No real agent's name, no real company's branding, no real
 *    case-management system, and no response time that implies a human. The desk is the
 *    app's own fictional one.
 */

export const TICKET_CATEGORIES = [
  'Locked out of an element',
  'Forgotten PIN or password',
  'Lost my authenticator',
  'Something else',
] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

/** Severities a fictional desk offers and does not honour. Stated, not implied. */
export const TICKET_SEVERITIES = ['Low', 'Normal', 'High', 'Catastrophic'] as const;
export type TicketSeverity = (typeof TICKET_SEVERITIES)[number];

export const TICKET_STATUSES = ['Open', 'Triaged', 'Awaiting customer', 'Resolved'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

/**
 * The one line that is never funny.
 *
 * Kept as a constant so the funny-level styling has nothing to reach: a user who believes
 * a real person is reading this will wait for a reply that is never coming, and that is
 * the only genuinely harmful outcome this feature has.
 */
export const NO_NETWORK_DISCLOSURE =
  'Nothing here is sent anywhere. This ticket exists only on this computer, no network '
  + 'request is made, no data is collected, and nobody is reading it.';

export interface Ticket {
  id: string;
  category: TicketCategory;
  description: string;
  severity: TicketSeverity;
  status: TicketStatus;
  /** ISO 8601. Passed in rather than read from a clock, so a ticket is reproducible. */
  openedAt: string;
  /** The canned reply, delivered on open. Never claims a person wrote it. */
  firstResponse: string;
}

export interface NewTicket {
  category: TicketCategory;
  description: string;
  severity?: TicketSeverity;
  openedAt: string;
  /** A draw in [0, 1) for the ticket number. Injected so the id is reproducible. */
  draw: number;
}

export interface TicketProblem {
  message: string;
}

export const MAX_DESCRIPTION_LENGTH = 2000;

export function validateTicket(input: Pick<NewTicket, 'category' | 'description'>): TicketProblem[] {
  const problems: TicketProblem[] = [];
  if (!TICKET_CATEGORIES.includes(input.category)) {
    problems.push({ message: 'Pick a category.' });
  }
  if (input.description.trim() === '') {
    problems.push({ message: 'Describe what happened. Nobody will read it, but the form insists.' });
  }
  if (input.description.length > MAX_DESCRIPTION_LENGTH) {
    problems.push({ message: `Descriptions are capped at ${MAX_DESCRIPTION_LENGTH} characters.` });
  }
  return problems;
}

const FIRST_RESPONSE =
  'Thank you for contacting support. Your ticket has been assigned to a queue. '
  + 'A specialist will review it in the order received.';

/** Deliberately fictional: a made-up prefix rather than anything resembling a real desk. */
export function ticketNumber(draw: number): string {
  const n = Math.abs(Math.floor((Number.isFinite(draw) ? draw : 0) * 900000)) % 900000;
  return `DING-${String(n + 100000)}`;
}

export function openTicket(input: NewTicket): Ticket | { problems: TicketProblem[] } {
  const problems = validateTicket(input);
  if (problems.length > 0) return { problems };
  return {
    id: ticketNumber(input.draw),
    category: input.category,
    description: input.description.trim(),
    severity: input.severity ?? 'Normal',
    status: 'Open',
    openedAt: input.openedAt,
    firstResponse: FIRST_RESPONSE,
  };
}

/** Advances the status one step. Stops at Resolved rather than wrapping. */
export function advance(ticket: Ticket): Ticket {
  const index = TICKET_STATUSES.indexOf(ticket.status);
  const next = TICKET_STATUSES[Math.min(index + 1, TICKET_STATUSES.length - 1)];
  return { ...ticket, status: next };
}

export interface Resolution {
  /** The exact folder to open, shown and copyable beside the button. */
  folderPath: string;
  /** What the action does. Opening, never deleting. */
  action: 'open-folder';
  instructions: string;
  disclosure: string;
  /** Stated plainly: this resets every toy lock, not only the forgotten one. */
  consequence: string;
}

/**
 * The resolution: open the application-data folder so the person can delete it.
 *
 * `action` is a literal rather than a boolean because there is exactly one thing this
 * may do, and a field that could say `delete-folder` is a field somebody will eventually
 * set to it.
 */
export function resolutionFor(applicationDataPath: string): Resolution {
  return {
    folderPath: applicationDataPath,
    action: 'open-folder',
    instructions:
      'Our specialist has escalated this to the highest tier available. The recommended '
      + `remedy is to delete this folder yourself: ${applicationDataPath}. `
      + 'This console will open it for you; the deletion is yours to make.',
    disclosure: NO_NETWORK_DISCLOSURE,
    consequence:
      'Deleting it clears every toy lock on this machine, not only the one you are locked '
      + 'out of, along with your saved settings and this ticket. Toy locks were never '
      + 'security, and this is the reset that was always available.',
  };
}

/** Where the route has to be reachable from. Listed so a test can check all three. */
export const ENTRY_POINTS = ['unlock-prompt', 'lock-setting', 'help'] as const;
export type EntryPoint = (typeof ENTRY_POINTS)[number];

/**
 * Names that must never appear in this feature's copy.
 *
 * Impersonating a real organization's support is out of bounds here as everywhere, and
 * an invented response time implies a human is coming. Kept as data so a test can scan
 * every string rather than a reviewer having to.
 */
export const FORBIDDEN_COPY_TERMS: readonly string[] = [
  'microsoft', 'zendesk', 'salesforce', 'servicenow', 'jira', 'freshdesk', 'intercom',
  'within 24 hours', 'within 48 hours', 'business day', 'our team will', 'we will call',
  'sincerely,', 'regards,',
];
