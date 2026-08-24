/** Non-color status text and live-region announcements for asynchronous surfaces. */

export type SurfaceStatusKind =
  | 'loading'
  | 'verified-empty'
  | 'unavailable'
  | 'partial'
  | 'stale'
  | 'ready'
  | 'error';

export type AnnouncementPoliteness = 'polite' | 'assertive';

export interface LiveAnnouncement {
  key: string;
  text: string;
  politeness: AnnouncementPoliteness;
  atomic: boolean;
  busy: boolean;
  status: SurfaceStatusKind;
}

export interface StatusAnnouncementInput {
  key: string;
  status: SurfaceStatusKind;
  subject: string;
  detail?: string;
  completed?: number;
  total?: number;
  observedAt?: string;
}

function withDetail(sentence: string, detail?: string): string {
  return detail ? `${sentence} ${detail}` : sentence;
}

export function progressText(completed: number, total?: number, label = 'Progress'): string {
  const safeCompleted = Number.isFinite(completed) ? Math.max(0, completed) : 0;
  if (total === undefined || !Number.isFinite(total) || total <= 0) {
    return `${label}: ${safeCompleted} completed, total unknown.`;
  }
  const safeTotal = Math.max(0, total);
  const boundedCompleted = Math.min(safeCompleted, safeTotal);
  const percent = safeTotal === 0 ? 0 : Math.round((boundedCompleted / safeTotal) * 100);
  return `${label}: ${boundedCompleted} of ${safeTotal}, ${percent} percent.`;
}

export function countdownText(remainingSeconds: number, label = 'Time remaining'): string {
  const seconds = Number.isFinite(remainingSeconds) ? Math.max(0, Math.ceil(remainingSeconds)) : 0;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (minutes === 0) return `${label}: ${remainder} seconds.`;
  return `${label}: ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} and ${remainder} seconds.`;
}

/** Build explicit state copy so blank content is never the only status signal. */
export function stateAnnouncement(input: StatusAnnouncementInput): LiveAnnouncement {
  const progress = input.completed === undefined
    ? ''
    : ` ${progressText(input.completed, input.total, input.subject)}`;
  const observed = input.observedAt ? ` Last observed at ${input.observedAt}.` : '';

  let text: string;
  switch (input.status) {
    case 'loading':
      text = withDetail(`${input.subject} is loading.${progress}`, input.detail);
      break;
    case 'verified-empty':
      text = withDetail(`${input.subject} was read successfully and contains no items.`, input.detail);
      break;
    case 'unavailable':
      text = withDetail(`${input.subject} is unavailable.`, input.detail);
      break;
    case 'partial':
      text = withDetail(`${input.subject} is partially available.${progress}`, input.detail);
      break;
    case 'stale':
      text = withDetail(`${input.subject} may be stale.${observed}`, input.detail);
      break;
    case 'error':
      text = withDetail(`${input.subject} failed.`, input.detail);
      break;
    case 'ready':
    default:
      text = withDetail(`${input.subject} is ready.${progress}`, input.detail);
      break;
  }

  return {
    key: input.key,
    text,
    politeness: input.status === 'error' ? 'assertive' : 'polite',
    atomic: true,
    busy: input.status === 'loading',
    status: input.status,
  };
}

/**
 * Prevent repeated renders of the same sentence from flooding a live region. The owning renderer
 * still decides when and where to mount the returned announcement.
 */
export class AnnouncementDeduplicator {
  private readonly lastByKey = new Map<string, string>();

  publish(announcement: LiveAnnouncement): LiveAnnouncement | null {
    if (this.lastByKey.get(announcement.key) === announcement.text) return null;
    this.lastByKey.set(announcement.key, announcement.text);
    return announcement;
  }

  clear(key?: string): void {
    if (key === undefined) this.lastByKey.clear();
    else this.lastByKey.delete(key);
  }
}
