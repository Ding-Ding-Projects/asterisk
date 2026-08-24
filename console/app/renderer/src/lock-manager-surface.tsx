import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type {
  CreateToyLockInput,
  ToyLockCredentialReference,
  ToyLockCreateReceipt,
  ToyLockRecord,
  ToyLockRecoveryMetadata,
  ToyLockUnlockDuration,
  ToyLockRelockReceipt,
} from '../../../shared/locks';
import type { ToyLockReconciliationReceipt, ToyLockRemovalReceipt, ToyLockUnlockReceipt } from '../../../shared/locks';
import { assertStableLockId, assertToyLockUnlockDuration, isToyLockOpen } from '../../../shared/locks';
import { withDeadline } from './authenticator-surface-state';
import './authenticator-surface.css';
import { DestructiveActionGate } from './destructive-action-gate';

export interface ToyLockClient {
  initialize(): Promise<{ ok: true; value: { count: number } } | { ok: false; message: string }>;
  reconciliation?(): Promise<ToyLockReconciliationReceipt>;
  list(): { ok: true; value: ReadonlyArray<ToyLockRecord> } | { ok: false; message: string };
  create(input: Omit<CreateToyLockInput, 'at'>): Promise<ToyLockCreateReceipt>;
  unlock(id: string, candidate: Uint8Array, surfaceId?: string): Promise<ToyLockUnlockReceipt<ToyLockRecord>>;
  relock(id: string): Promise<ToyLockRelockReceipt>;
  remove(id: string): Promise<ToyLockRemovalReceipt>;
  readonly recovery: ToyLockRecoveryMetadata;
}

export interface ToyLockCredentialClient {
  create(targetId: string, method: 'password' | 'totp', value: string): Promise<{ ok: true; value: ToyLockCredentialReference } | { ok: false; message: string }>;
}

export interface LockManagerSurfaceProps {
  client: ToyLockClient;
  credentials: ToyLockCredentialClient;
  surfaceId?: string;
  onNotice?: (message: string, detail?: string) => void;
  onOpenSupportTickets?: () => void;
  onOpenUnlockLadder?: (lockoutId: string) => void;
}

type DurationChoice = 'surface' | 'until-application-closes' | 'minutes';

function durationFrom(choice: DurationChoice, minutes: string): ToyLockUnlockDuration {
  const value: ToyLockUnlockDuration = choice === 'minutes'
    ? { kind: 'minutes', minutes: Number(minutes) }
    : { kind: choice };
  return assertToyLockUnlockDuration(value);
}

function lockIsOpen(record: ToyLockRecord, surfaceId?: string): boolean {
  return isToyLockOpen(record, { at: new Date(), surfaceId, applicationSessionOpen: true });
}

export function LockManagerSurface({ client, credentials, surfaceId, onNotice, onOpenSupportTickets, onOpenUnlockLadder }: LockManagerSurfaceProps) {
  const [records, setRecords] = useState<ReadonlyArray<ToyLockRecord>>([]);
  const [targetId, setTargetId] = useState('');
  const [method, setMethod] = useState<'password' | 'totp'>('password');
  const [durationChoice, setDurationChoice] = useState<DurationChoice>('surface');
  const [minutes, setMinutes] = useState('15');
  const [candidateById, setCandidateById] = useState<Record<string, string>>({});
  const [credentialValue, setCredentialValue] = useState('');
  const [query, setQuery] = useState('');
  const [regex, setRegex] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [removing, setRemoving] = useState<ToyLockRecord | undefined>();
  const [reconciliation, setReconciliation] = useState<ToyLockReconciliationReceipt | undefined>();
  const [reconciliationBusy, setReconciliationBusy] = useState(false);
  const [lastMutation, setLastMutation] = useState<ToyLockCreateReceipt | ToyLockUnlockReceipt<ToyLockRecord> | ToyLockRelockReceipt | ToyLockRemovalReceipt | undefined>();

  const refresh = async () => {
    try {
      await withDeadline(client.initialize());
      const result = client.list();
      if (!result.ok) throw new Error(result.message);
      setRecords(result.value);
      setError(undefined);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Toy locks could not be loaded.'); }
  };
  useEffect(() => { void refresh(); }, [client]);
  const refreshReconciliation = async () => {
    if (!client.reconciliation || reconciliationBusy) return;
    setReconciliationBusy(true);
    try {
      const receipt = await withDeadline(client.reconciliation());
      setReconciliation(receipt);
      if (receipt.status === 'reconciled') await refresh();
    } catch (reason) {
      setReconciliation({ status: 'pending-vault-unavailable', affectedIds: [], warning: reason instanceof Error ? `Toy-lock reconciliation is unavailable: ${reason.message}` : 'Toy-lock reconciliation is unavailable. Mutations remain blocked until the state can be read.' });
    } finally { setReconciliationBusy(false); }
  };
  useEffect(() => { void refreshReconciliation(); }, [client]);
  useEffect(() => () => { setCredentialValue(''); setCandidateById({}); }, []);

  const visible = useMemo(() => {
    const text = query.trim();
    if (!text) return records;
    if (regex) {
      try { const matcher = new RegExp(text.slice(0, 512), 'iu'); return records.filter((record) => matcher.test(`${record.targetId} ${record.id} ${record.credential.method}`)); }
      catch { return []; }
    }
    const needle = text.toLocaleLowerCase();
    return records.filter((record) => `${record.targetId} ${record.id} ${record.credential.method}`.toLocaleLowerCase().includes(needle));
  }, [records, query, regex]);

  const createLock = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (reconciliation && reconciliation.status !== 'reconciled') { setError(reconciliation.warning); return; }
    try { assertStableLockId(targetId.trim(), 'targetId'); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Target identity is invalid.'); return; }
    setBusy(true);
    try {
      const credential = await withDeadline(credentials.create(targetId.trim(), method, credentialValue));
      if (!credential.ok) throw new Error(credential.message);
      const lockId = `lock-${crypto.randomUUID()}`;
      const result = await withDeadline(client.create({ id: lockId, targetId: targetId.trim(), credential: credential.value, unlockDuration: durationFrom(durationChoice, minutes) }));
      setLastMutation(result);
      if (!result.ok) throw new Error(result.message);
      setTargetId('');
      setCredentialValue('');
      await refresh();
      onNotice?.('One independent toy lock was created. It is a speed bump, not a security boundary.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The toy lock could not be created.'); }
    finally { setBusy(false); setCredentialValue(''); }
  };

  const unlock = async (record: ToyLockRecord) => {
    if (busy) return;
    if (reconciliation && reconciliation.status !== 'reconciled') { setError(reconciliation.warning); return; }
    setBusy(true);
    const candidate = candidateById[record.id] ?? '';
    if (candidate.length > 512) { setError('The unlock value is too long.'); setCandidateById((current) => ({ ...current, [record.id]: '' })); setBusy(false); return; }
    try {
      const result = await withDeadline(client.unlock(record.id, new TextEncoder().encode(candidate), surfaceId));
      setLastMutation(result);
      if (!result.ok) { if (result.code === 'verification-failed' && result.waitCreated === true) onOpenUnlockLadder?.(record.id); throw new Error(result.message); }
      setCandidateById((current) => ({ ...current, [record.id]: '' }));
      await refresh();
      onNotice?.(`Lock for ${record.targetId} is open for its selected duration.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The lock value did not match.'); }
    finally { setBusy(false); setCandidateById((current) => ({ ...current, [record.id]: '' })); }
  };

  const relock = async (record: ToyLockRecord) => {
    if (busy) return;
    if (reconciliation && reconciliation.status !== 'reconciled') { setError(reconciliation.warning); return; }
    setBusy(true);
    try { const result = await withDeadline(client.relock(record.id)); setLastMutation(result); if (!result.ok) throw new Error(result.message); await refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'The lock could not be closed again.'); }
    finally { setBusy(false); }
  };

  const remove = async (record: ToyLockRecord): Promise<ToyLockRemovalReceipt> => {
    if (busy) return { status: 'recoverable', message: 'Another lock mutation is already in progress.', recoverable: true };
    if (reconciliation && reconciliation.status !== 'reconciled') { setError(reconciliation.warning); return { status: 'recoverable', message: reconciliation.warning, recoverable: true }; }
    setBusy(true);
    try { const result = await withDeadline(client.remove(record.id)); setLastMutation(result); if (result.status === 'removed') await refresh(); return result; }
    catch (reason) { const message = reason instanceof Error ? reason.message : 'The lock could not be removed.'; setError(message); return { status: 'recoverable', message, recoverable: true }; }
    finally { setBusy(false); }
  };

  return <section className="auth-surface" aria-labelledby="lock-manager-title">
    <header className="auth-header"><div><p className="auth-kicker">PERSONAL SPEED BUMPS</p><h2 id="lock-manager-title">Toy locks</h2><p>Every element has its own optional password or TOTP lock. Unlock one does not unlock another.</p></div><button type="button" className="auth-button secondary" onClick={onOpenSupportTickets}>Support Tickets</button></header>
    <div className="auth-disclosure" role="note">These locks are for fun. They are not encryption or a security boundary. If a lockout happens, recovery is to open the application-data folder below and remove it yourself.</div>
    {error ? <div className="auth-error" role="alert">{error}</div> : null}
    {reconciliation && reconciliation.status !== 'reconciled' ? <div className="auth-disclosure" role="status">{reconciliation.warning} Affected elements: {reconciliation.affectedIds.join(', ') || 'unresolved state'}. Contradictory lock changes remain unavailable. <button type="button" className="auth-button secondary" onClick={() => void refreshReconciliation()} disabled={reconciliationBusy}>{reconciliationBusy ? 'Retrying reconciliation…' : 'Retry reconciliation'}</button></div> : null}
    {lastMutation && (('ok' in lastMutation && !lastMutation.ok) || ('status' in lastMutation && lastMutation.status !== 'removed')) ? <div className="auth-error" role="status">{'message' in lastMutation ? lastMutation.message : 'The lock mutation remains pending or recoverable.'}</div> : null}
    <div className="auth-grid">
       <form className="auth-card" onSubmit={(event) => void createLock(event)}><h3>Lock one exact element</h3><p className="auth-help">Use the element's stable identity. A fresh vault credential is created for this element only.</p><label>Target identity<input value={targetId} onChange={(event) => setTargetId(event.target.value)} placeholder="settings.appearance.font-size" maxLength={128} required /></label><label>Credential method<select value={method} onChange={(event) => setMethod(event.target.value as 'password' | 'totp')} disabled={Boolean(reconciliation && reconciliation.status !== 'reconciled')}><option value="password">Password</option><option value="totp">TOTP</option></select></label><label>{method === 'totp' ? 'Base32 TOTP secret' : 'Password'}<input type="password" value={credentialValue} onChange={(event) => setCredentialValue(event.target.value)} maxLength={512} autoComplete="new-password" required disabled={Boolean(reconciliation && reconciliation.status !== 'reconciled')} /></label><label>Unlock duration<select value={durationChoice} onChange={(event) => setDurationChoice(event.target.value as DurationChoice)} disabled={Boolean(reconciliation && reconciliation.status !== 'reconciled')}><option value="surface">This surface</option><option value="minutes">Timed</option><option value="until-application-closes">Until the app closes</option></select></label>{durationChoice === 'minutes' ? <label>Minutes<input type="number" min={1} max={1440} value={minutes} onChange={(event) => setMinutes(event.target.value)} disabled={Boolean(reconciliation && reconciliation.status !== 'reconciled')} /></label> : null}<button className="auth-button" type="submit" disabled={busy || Boolean(reconciliation && reconciliation.status !== 'reconciled')}>Create independent lock</button></form>
      <div className="auth-card"><h3>Recovery details</h3><p className="auth-help">The app never deletes this folder for you. Support Tickets can open it in the platform file manager.</p><dl className="auth-facts"><div><dt>Application data</dt><dd><code>{client.recovery.applicationDataPath}</code></dd></div><div><dt>Support route</dt><dd>{client.recovery.supportTicketRoute}</dd></div><div><dt>Auto-delete</dt><dd>No</dd></div></dl><button className="auth-button secondary" type="button" onClick={onOpenSupportTickets}>Open Support Tickets</button></div>
    </div>
    {removing ? <DestructiveActionGate actionLabel={`remove the lock for ${removing.targetId}`} onCancel={() => setRemoving(undefined)} onConfirm={async () => { const receipt = await remove(removing); if (receipt.status !== 'removed') throw new Error(receipt.message); setRemoving(undefined); }} /> : null}
    <div className="auth-list-card"><div className="auth-list-toolbar"><div><h3>Independent lock list</h3><p>{visible.length} visible, {records.length} total</p></div><div className="auth-toolbar-controls"><input aria-label="Search toy locks" placeholder="Search target, ID or method" value={query} onChange={(event) => setQuery(event.target.value)} /><label className="auth-check"><input type="checkbox" checked={regex} onChange={(event) => setRegex(event.target.checked)} /> Regex</label></div></div>{visible.length === 0 ? <p className="auth-empty">No matching locks.</p> : <div className="auth-entry-list">{visible.map((record) => { const open = lockIsOpen(record, surfaceId); return <article className="auth-entry" key={record.id}><div className="auth-entry-heading"><div><h4>{record.targetId}</h4><p>{record.credential.method} · {record.unlockDuration.kind === 'minutes' ? `${record.unlockDuration.minutes} minutes` : record.unlockDuration.kind}</p></div><span className={open ? 'auth-status armed' : 'auth-status'}>{open ? 'Open' : 'Locked'}</span></div>{open ? <button className="auth-button secondary" type="button" onClick={() => void relock(record)} disabled={busy || Boolean(reconciliation && reconciliation.status !== 'reconciled')}>Lock again</button> : <div className="inline-confirm"><input type="password" aria-label={`Unlock value for ${record.targetId}`} value={candidateById[record.id] ?? ''} onChange={(event) => setCandidateById((current) => ({ ...current, [record.id]: event.target.value }))} autoComplete="off" placeholder="Credential value" disabled={Boolean(reconciliation && reconciliation.status !== 'reconciled')} /><button className="auth-button" type="button" onClick={() => void unlock(record)} disabled={busy || Boolean(reconciliation && reconciliation.status !== 'reconciled')}>Unlock</button></div>}<button className="text-button" type="button" onClick={() => setRemoving(record)} disabled={busy || Boolean(reconciliation && reconciliation.status !== 'reconciled')}>Remove lock</button></article>; })}</div>}</div>
  </section>;
}

export default LockManagerSurface;
