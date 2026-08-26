/**
 * Hand-written inventory for dynamic app event copy.
 *
 * A dynamic event is allowed to have no Cantonese catalogue entry only when the
 * status explicitly says `english-fallback`. The event boundary then leaves that
 * track plain English and does not add Cantonese funny styling. This list is
 * intentionally hand-written so deleting an event from the catalogue cannot make
 * its evidence disappear with it.
 */

import census from '../../../inventories/event-copy-census.json';

export type EventCopyStatus = 'localized' | 'english-fallback';

export interface DynamicEventCopyRecord {
  key: string;
  kind: 'toast' | 'dialog-title' | 'dialog-body';
  status: EventCopyStatus;
  callId?: string;
  callIds?: readonly string[];
  sourceId?: string;
  location?: number;
  shape?: 'literal' | 'template' | 'expression';
  fallback?: 'plain-english-track';
  reason?: string;
}

const EXPLICIT_EVENT_COPY_INVENTORY: readonly DynamicEventCopyRecord[] = [
  { key: 'Starting the phone system…', kind: 'toast', status: 'english-fallback', reason: 'Runtime progress includes machine-specific state.' },
  { key: 'Vocabulary file rejected', kind: 'dialog-title', status: 'english-fallback', reason: 'Not yet in the Cantonese event catalog.' },
  { key: 'Vocabulary file not read', kind: 'dialog-title', status: 'english-fallback', reason: 'Not yet in the Cantonese event catalog.' },
  { key: 'No target connected', kind: 'dialog-title', status: 'english-fallback', reason: 'Not yet in the Cantonese event catalog.' },
  { key: 'Connected', kind: 'dialog-title', status: 'english-fallback', reason: 'Not yet in the Cantonese event catalog.' },
  { key: 'Not connected', kind: 'dialog-title', status: 'english-fallback', reason: 'Not yet in the Cantonese event catalog.' },
  { key: 'Connection added', kind: 'dialog-title', status: 'english-fallback', reason: 'Not yet in the Cantonese event catalog.' },
  { key: 'Connection removed', kind: 'dialog-title', status: 'english-fallback', reason: 'Not yet in the Cantonese event catalog.' },
  { key: 'Not added', kind: 'dialog-title', status: 'english-fallback', reason: 'Not yet in the Cantonese event catalog.' },
  { key: 'Not removed', kind: 'dialog-title', status: 'english-fallback', reason: 'Not yet in the Cantonese event catalog.' },
  { key: 'Runtime ready', kind: 'dialog-title', status: 'english-fallback', reason: 'Not yet in the Cantonese event catalog.' },
  { key: 'Not created', kind: 'dialog-title', status: 'english-fallback', reason: 'Not yet in the Cantonese event catalog.' },
  { key: 'Nothing to change', kind: 'dialog-title', status: 'english-fallback', reason: 'Not yet in the Cantonese event catalog.' },
  { key: 'Exported', kind: 'dialog-title', status: 'english-fallback', reason: 'Not yet in the Cantonese event catalog.' },
  { key: 'Nothing to export', kind: 'dialog-title', status: 'english-fallback', reason: 'Not yet in the Cantonese event catalog.' },
  { key: 'Authenticator paired', kind: 'dialog-title', status: 'english-fallback', reason: 'Not yet in the Cantonese event catalog.' },
  { key: 'That ticket will not file', kind: 'dialog-title', status: 'english-fallback', reason: 'Not yet in the Cantonese event catalog.' },
  { key: 'School mode credential not saved', kind: 'dialog-title', status: 'english-fallback', reason: 'Not yet in the Cantonese event catalog.' },
  { key: 'School mode remains on', kind: 'dialog-title', status: 'english-fallback', reason: 'Not yet in the Cantonese event catalog.' },
  { key: 'School mode recovery path unavailable', kind: 'dialog-title', status: 'localized' },
  { key: 'School mode unlock credential saved locally.', kind: 'toast', status: 'english-fallback', reason: 'Not yet in the Cantonese event catalog.' },
  { key: 'Unlocked', kind: 'dialog-title', status: 'english-fallback', reason: 'Not yet in the Cantonese event catalog.' },
  { key: 'Appearance saved', kind: 'dialog-title', status: 'english-fallback', reason: 'Not yet in the Cantonese event catalog.' },
  { key: 'Appearance reset to the design system', kind: 'toast', status: 'english-fallback', reason: 'Not yet in the Cantonese event catalog.' },
  { key: 'Not available', kind: 'dialog-title', status: 'english-fallback', reason: 'Not yet in the Cantonese event catalog.' },
  { key: 'Not run', kind: 'dialog-title', status: 'english-fallback', reason: 'Not yet in the Cantonese event catalog.' },
  { key: 'Not written', kind: 'dialog-title', status: 'english-fallback', reason: 'Not yet in the Cantonese event catalog.' },
  { key: 'Deploy not applied', kind: 'dialog-title', status: 'english-fallback', reason: 'Not yet in the Cantonese event catalog.' },
  { key: 'The target refused the change.', kind: 'dialog-body', status: 'english-fallback', reason: 'The target supplies a variable error body.' },
  { key: 'Could not reach the clipboard', kind: 'toast', status: 'english-fallback', reason: 'Not yet in the Cantonese event catalog.' },
  { key: 'Changelog copied to the clipboard', kind: 'toast', status: 'english-fallback', reason: 'Not yet in the Cantonese event catalog.' },
  { key: 'app-template-552-toast', kind: 'toast', status: 'english-fallback', reason: 'The verb is dynamic and remains plain English.' },
  { key: 'app-template-563-title', kind: 'dialog-title', status: 'english-fallback', reason: 'The operation verb is dynamic and remains plain English.' },
  { key: 'app-template-563-body', kind: 'dialog-body', status: 'english-fallback', reason: 'Target-specific values remain plain English.' },
  { key: 'app-template-604-title', kind: 'dialog-title', status: 'english-fallback', reason: 'Ticket identifiers and status remain plain English.' },
  { key: 'app-template-1013-toast', kind: 'toast', status: 'english-fallback', reason: 'The chosen School name is user data.' },
  { key: 'app-template-1058-toast', kind: 'toast', status: 'english-fallback', reason: 'The shipped product identity remains exact.' },
  { key: 'app-template-1355-toast', kind: 'toast', status: 'english-fallback', reason: 'Target-specific names remain plain English.' },
  { key: 'app-template-1531-toast', kind: 'toast', status: 'english-fallback', reason: 'Lock target and method remain plain English.' },
  { key: 'app-template-1559-toast', kind: 'toast', status: 'english-fallback', reason: 'Dynamic challenge diagnosis remains plain English.' },
  { key: 'app-template-1563-toast', kind: 'toast', status: 'english-fallback', reason: 'Dynamic challenge diagnosis remains plain English.' },
  { key: 'app-template-1567-toast', kind: 'toast', status: 'english-fallback', reason: 'Dynamic challenge diagnosis remains plain English.' },
  { key: 'app-template-2202-toast', kind: 'toast', status: 'english-fallback', reason: 'Copied user text remains plain English.' },
  { key: 'Bold choice', kind: 'dialog-title', status: 'english-fallback', reason: 'Not yet in the Cantonese event catalog.' },
  { key: 'No target', kind: 'dialog-title', status: 'english-fallback', reason: 'Not yet in the Cantonese event catalog.' },
  { key: 'Not done', kind: 'dialog-title', status: 'english-fallback', reason: 'Not yet in the Cantonese event catalog.' },
  { key: 'Not found', kind: 'dialog-title', status: 'english-fallback', reason: 'Not yet in the Cantonese event catalog.' },
  { key: 'Not loaded', kind: 'dialog-title', status: 'english-fallback', reason: 'Not yet in the Cantonese event catalog.' },
  { key: 'Not removed', kind: 'dialog-title', status: 'english-fallback', reason: 'Not yet in the Cantonese event catalog.' },
  { key: 'Not saved', kind: 'dialog-title', status: 'english-fallback', reason: 'Not yet in the Cantonese event catalog.' },
  { key: 'Nothing to remove', kind: 'dialog-title', status: 'english-fallback', reason: 'Not yet in the Cantonese event catalog.' },
  { key: 'Nothing to save', kind: 'dialog-title', status: 'english-fallback', reason: 'Not yet in the Cantonese event catalog.' },
  { key: 'Write this password down', kind: 'dialog-title', status: 'english-fallback', reason: 'Secret-adjacent copy remains plain until its safe localized form is added.' },
  { key: 'Appearance exported as JSON', kind: 'toast', status: 'english-fallback', reason: 'Format name remains exact.' },
  { key: 'Challenge cleared -- the wait is over. You still need the real PIN, passphrase or code.', kind: 'toast', status: 'english-fallback', reason: 'Credential facts remain plain.' },
  { key: 'Creating the Asterisk runtime — this imports a root filesystem and takes a while.', kind: 'toast', status: 'english-fallback', reason: 'Runtime progress contains exact technical terms.' },
  { key: 'Creating the Asterisk runtime for the wizard — this takes a while.', kind: 'toast', status: 'english-fallback', reason: 'Runtime progress contains exact technical terms.' },
  { key: 'Editor choice forgotten', kind: 'toast', status: 'english-fallback', reason: 'Not yet in the Cantonese event catalog.' },
  { key: 'Export is not available in this environment.', kind: 'toast', status: 'english-fallback', reason: 'Environment diagnosis remains plain.' },
  { key: 'Nothing changed, so nothing was written.', kind: 'toast', status: 'english-fallback', reason: 'Write outcome remains plain.' },
  { key: 'Pair the built-in authenticator first', kind: 'toast', status: 'english-fallback', reason: 'Credential workflow remains plain.' },
  { key: 'Set a passphrase first', kind: 'toast', status: 'english-fallback', reason: 'Credential workflow remains plain.' },
  { key: 'Set at least a four-digit PIN first', kind: 'toast', status: 'english-fallback', reason: 'Credential workflow remains plain.' },
  { key: 'Wrong -- try again.', kind: 'toast', status: 'english-fallback', reason: 'Credential workflow remains plain.' },
  { key: 'The phone system did not start', kind: 'dialog-title', status: 'english-fallback', reason: 'Runtime diagnosis remains plain.' },
  { key: 'That name will not work', kind: 'dialog-title', status: 'english-fallback', reason: 'Validation diagnosis remains plain.' },
  { key: 'School mode name not saved', kind: 'dialog-title', status: 'english-fallback', reason: 'Validation diagnosis remains plain.' },
  { key: 'Deployed', kind: 'dialog-title', status: 'english-fallback', reason: 'The deployment result includes target-specific values.' },
  { key: 'Dialplan canvas is read-only', kind: 'dialog-title', status: 'english-fallback', reason: 'The canvas diagnosis remains plain.' },
] as const;

type CensusCall = {
  id: string;
  sourceId: string;
  location: number;
  kind: 'toast' | 'dialog';
  shape: 'literal' | 'template' | 'expression';
  literal?: string;
  template?: string;
  status: EventCopyStatus;
  fallback: 'plain-english-track';
};

const censusCalls = census.calls as CensusCall[];
const censusRecords: DynamicEventCopyRecord[] = censusCalls.map((call) => ({
  key: call.id,
  kind: call.kind === 'toast' ? 'toast' : 'dialog-title',
  status: call.status,
  callId: call.id,
  callIds: [call.id],
  sourceId: call.sourceId,
  location: call.location,
  shape: call.shape,
  fallback: call.fallback,
  reason: call.status === 'english-fallback' ? 'The source census requires the plain English track.' : undefined,
}));
const recordsByCallId = new Map(censusRecords.map((record) => [record.callId!, record]));
const literalCounts = new Map<string, number>();
for (const call of censusCalls) if (call.literal) literalCounts.set(call.literal, (literalCounts.get(call.literal) ?? 0) + 1);
const recordsByText = new Map<string, DynamicEventCopyRecord>();
for (let index = 0; index < censusCalls.length; index += 1) {
  const literal = censusCalls[index].literal;
  if (literal && literalCounts.get(literal) === 1) recordsByText.set(literal, censusRecords[index]);
}
for (const record of EXPLICIT_EVENT_COPY_INVENTORY) if (!recordsByText.has(record.key)) recordsByText.set(record.key, record);

export const DYNAMIC_EVENT_COPY_INVENTORY: readonly DynamicEventCopyRecord[] = Object.freeze([...censusRecords, ...EXPLICIT_EVENT_COPY_INVENTORY]);

export function dynamicEventCopyRecord(key: string, kind?: DynamicEventCopyRecord['kind']): DynamicEventCopyRecord | undefined {
  const record = recordsByCallId.get(key) ?? recordsByText.get(key);
  if (!record || !kind || record.kind === kind || record.kind === 'dialog-title' && kind === 'dialog-body') return record;
  return undefined;
}

export function dynamicEventCopyRecordByCallId(callId: string): DynamicEventCopyRecord | undefined {
  return recordsByCallId.get(callId);
}
