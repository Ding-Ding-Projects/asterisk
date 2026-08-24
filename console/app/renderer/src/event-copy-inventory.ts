/**
 * Hand-written inventory for dynamic app event copy.
 *
 * A dynamic event is allowed to have no Cantonese catalogue entry only when the
 * status explicitly says `english-fallback`. The event boundary then leaves that
 * track plain English and does not add Cantonese funny styling. This list is
 * intentionally hand-written so deleting an event from the catalogue cannot make
 * its evidence disappear with it.
 */

export type EventCopyStatus = 'localized' | 'english-fallback';

export interface DynamicEventCopyRecord {
  key: string;
  kind: 'toast' | 'dialog-title' | 'dialog-body';
  status: EventCopyStatus;
  reason?: string;
}

export const DYNAMIC_EVENT_COPY_INVENTORY: readonly DynamicEventCopyRecord[] = [
  { key: 'Starting the phone system…', kind: 'toast', status: 'english-fallback', reason: 'Runtime progress includes machine-specific state.' },
  { key: 'Vocabulary file rejected', kind: 'dialog-title', status: 'localized' },
  { key: 'Vocabulary file not read', kind: 'dialog-title', status: 'localized' },
  { key: 'No target connected', kind: 'dialog-title', status: 'localized' },
  { key: 'Connected', kind: 'dialog-title', status: 'localized' },
  { key: 'Not connected', kind: 'dialog-title', status: 'localized' },
  { key: 'Connection added', kind: 'dialog-title', status: 'localized' },
  { key: 'Connection removed', kind: 'dialog-title', status: 'localized' },
  { key: 'Not added', kind: 'dialog-title', status: 'localized' },
  { key: 'Not removed', kind: 'dialog-title', status: 'localized' },
  { key: 'Runtime ready', kind: 'dialog-title', status: 'localized' },
  { key: 'Not created', kind: 'dialog-title', status: 'localized' },
  { key: 'Nothing to change', kind: 'dialog-title', status: 'localized' },
  { key: 'Exported', kind: 'dialog-title', status: 'localized' },
  { key: 'Nothing to export', kind: 'dialog-title', status: 'localized' },
  { key: 'Authenticator paired', kind: 'dialog-title', status: 'localized' },
  { key: 'That ticket will not file', kind: 'dialog-title', status: 'localized' },
  { key: 'School mode credential not saved', kind: 'dialog-title', status: 'localized' },
  { key: 'School mode remains on', kind: 'dialog-title', status: 'localized' },
  { key: 'School mode recovery path unavailable', kind: 'dialog-title', status: 'localized' },
  { key: 'School mode unlock credential saved locally.', kind: 'toast', status: 'localized' },
  { key: 'Unlocked', kind: 'dialog-title', status: 'localized' },
  { key: 'Appearance saved', kind: 'dialog-title', status: 'localized' },
  { key: 'Appearance reset to the design system', kind: 'toast', status: 'localized' },
  { key: 'Not available', kind: 'dialog-title', status: 'localized' },
  { key: 'Not run', kind: 'dialog-title', status: 'localized' },
  { key: 'Not written', kind: 'dialog-title', status: 'localized' },
  { key: 'Deploy not applied', kind: 'dialog-title', status: 'localized' },
  { key: 'The target refused the change.', kind: 'dialog-body', status: 'english-fallback', reason: 'The target supplies a variable error body.' },
  { key: 'Could not reach the clipboard', kind: 'toast', status: 'localized' },
  { key: 'Changelog copied to the clipboard', kind: 'toast', status: 'localized' },
  { key: '* unlisted dynamic event', kind: 'toast', status: 'english-fallback', reason: 'Any event not named above is deliberately plain English and receives no Cantonese funny wrapper.' },
] as const;

export const DYNAMIC_EVENT_FALLBACK_POLICY = 'Any dynamic title or body absent from this inventory or the Cantonese catalog remains plain English in its Cantonese track.';

export function dynamicEventCopyRecord(key: string): DynamicEventCopyRecord | undefined {
  return DYNAMIC_EVENT_COPY_INVENTORY.find((record) => record.key === key);
}
