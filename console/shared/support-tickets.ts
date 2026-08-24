export const SUPPORT_TICKET_CATEGORIES = ['Locked out of an element', 'Forgotten PIN or password', 'Lost my authenticator', 'Something else'] as const;
export type SupportTicketCategory = (typeof SUPPORT_TICKET_CATEGORIES)[number];
export const SUPPORT_TICKET_SEVERITIES = ['Low', 'Normal', 'High', 'Catastrophic'] as const;
export type SupportTicketSeverity = (typeof SUPPORT_TICKET_SEVERITIES)[number];
export const SUPPORT_TICKET_STATUSES = ['Open', 'Triaged', 'Awaiting customer', 'Resolved'] as const;
export type SupportTicketStatus = (typeof SUPPORT_TICKET_STATUSES)[number];
export const SUPPORT_TICKET_DISCLOSURE = 'Nothing here is sent anywhere. This ticket exists only on this computer, no network request is made, no data is collected, and nobody is reading it.';
export const SUPPORT_TICKET_MAX_DESCRIPTION = 2_000;
export interface SupportTicket {
  id: string;
  category: SupportTicketCategory;
  description: string;
  severity: SupportTicketSeverity;
  status: SupportTicketStatus;
  openedAt: string;
  firstResponse: string;
}
export function nextSupportTicketStatus(status: SupportTicketStatus): SupportTicketStatus { const index = SUPPORT_TICKET_STATUSES.indexOf(status); return SUPPORT_TICKET_STATUSES[Math.min(index + 1, SUPPORT_TICKET_STATUSES.length - 1)]!; }
