import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type {
  CreateToyLockInput,
  ToyLockCredentialReference,
  ToyLockRecord,
  ToyLockRecoveryMetadata,
  ToyLockUnlockDuration,
} from '../../../shared/locks';
import { assertStableLockId, assertToyLockUnlockDuration, isToyLockOpen } from '../../../shared/locks';
import { withDeadline } from './authenticator-surface-state';
import './authenticator-surface.css';

export interface ToyLockClient {
  initialize(): Promise<{ ok: true; value: { count: number } } | { ok: false; message: string }>;
  list(): { ok: true; value: ReadonlyArray<ToyLockRecord> } | { ok: false; message: string };
  create(input: Omit<CreateToyLockInput, 'at'>): Promise<{ ok: true; value: ToyLockRecord } | { ok: false; message: string }>;
  unlock(id: string, candidate: Uint8Array, surfaceId?: string): Promise<{ ok: true; value: ToyLockRecord } | { ok: false; message: string }>;
  relock(id: string): Promise<{ ok: true; value: ToyLockRecord } | { ok: false; message: string }>;
  remove(id: string): Promise<{ ok: true; value: { removed: true } } | { ok: false; message: string }>;
  readonly recovery: ToyLockRecoveryMetadata;
}

export interface ToyLockCredentialClient {
  create(targetId: string, method: 'password' | 'totp'): Promise<{ ok: true; value: ToyLockCredentialReference } | { ok: false; message: string }>;
}

export interface LockManagerSurfaceProps {
  client: ToyLockClient;
  credentials: ToyLockCredentialClient;
  surfaceId?: string;
  onNotice?: (message: string, detail?: string) => void;
  onOpenSupportTickets?: () => void;
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

export function LockManagerSurface({ client, credentials, surfaceId, onNotice, onOpenSupportTickets }: LockManagerSurfaceProps) {
  const [records, setRecords] = useState<ReadonlyArray<ToyLockRecord>>([]);
  const [targetId, setTargetId] = useState('');
  const [method, setMethod] = useState<'password' | 'totp'>('password');
  const [durationChoice, setDurationChoice] = useState<DurationChoice>('surface');
  const [minutes, setMinutes] = useState('15');
  const [candidateById, setCandidateById] = useState<Record<string, string>>({});
  const [query, setQuery] = useState('');
  const [regex, setRegex] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

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
    try { assertStableLockId(targetId.trim(), 'targetId'); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Target identity is invalid.'); return; }
    setBusy(true);
    try {
      const credential = await withDeadline(credentials.create(targetId.trim(), method));
      if (!credential.ok) throw new Error(credential.message);
      const lockId = `lock-${crypto.randomUUID()}`;
      const result = await withDeadline(client.create({ id: lockId, targetId: targetId.trim(), credential: credential.value, unlockDuration: durationFrom(durationChoice, minutes) }));
      if (!result.ok) throw new Error(result.message);
      setTargetId('');
      await refresh();
      onNotice?.('One independent toy lock was created. It is a speed bump, not a security boundary.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The toy lock could not be created.'); }
    finally { setBusy(false); }
  };

  const unlock = async (record: ToyLockRecord) => {
    if (busy) return;
    setBusy(true);
    const candidate = candidateById[record.id] ?? '';
    try {
      const result = await withDeadline(client.unlock(record.id, new TextEncoder().encode(candidate), surfaceId));
      if (!result.ok) throw new Error(result.message);
      setCandidateById((current) => ({ ...current, [record.id]: '' }));
      await refresh();
      onNotice?.(`Lock for ${record.targetId} is open for its selected duration.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The lock value did not match.'); }
    finally { setBusy(false); }
  };

  const relock = async (record: ToyLockRecord) => {
    if (busy) return;
    setBusy(true);
    try { const result = await withDeadline(client.relock(record.id)); if (!result.ok) throw new Error(result.message); await refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'The lock could not be closed again.'); }
    finally { setBusy(false); }
  };

  const remove = async (record: ToyLockRecord) => {
    if (busy || !window.confirm(`Remove the independent toy lock for ${record.targetId}?`)) return;
    setBusy(true);
    try { const result = await withDeadline(client.remove(record.id)); if (!result.ok) throw new Error(result.message); await refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'The lock could not be removed.'); }
    finally { setBusy(false); }
  };

  return <section className="auth-surface" aria-labelledby="lock-manager-title">
    <header className="auth-header"><div><p className="auth-kicker">PERSONAL SPEED BUMPS</p><h2 id="lock-manager-title">Toy locks</h2><p>Every element has its own optional password or TOTP lock. Unlock one does not unlock another.</p></div><button type="button" className="auth-button secondary" onClick={onOpenSupportTickets}>Support Tickets</button></header>
    <div className="auth-disclosure" role="note">These locks are for fun. They are not encryption or a security boundary. If a lockout happens, recovery is to open the application-data folder below and remove it yourself.</div>
    {error ? <div className="auth-error" role="alert">{error}</div> : null}
    <div className="auth-grid">
      <form className="auth-card" onSubmit={(event) => void createLock(event)}><h3>Lock one exact element</h3><p className="auth-help">Use the element's stable identity. A fresh vault credential is created for this element only.</p><label>Target identity<input value={targetId} onChange={(event) => setTargetId(event.target.value)} placeholder="settings.appearance.font-size" maxLength={128} required /></label><label>Credential method<select value={method} onChange={(event) => setMethod(event.target.value as 'password' | 'totp')}><option value="password">Password</option><option value="totp">TOTP</option></select></label><label>Unlock duration<select value={durationChoice} onChange={(event) => setDurationChoice(event.target.value as DurationChoice)}><option value="surface">This surface</option><option value="minutes">Timed</option><option value="until-application-closes">Until the app closes</option></select></label>{durationChoice === 'minutes' ? <label>Minutes<input type="number" min={1} max={1440} value={minutes} onChange={(event) => setMinutes(event.target.value)} /></label> : null}<button className="auth-button" type="submit" disabled={busy}>Create independent lock</button></form>
      <div className="auth-card"><h3>Recovery details</h3><p className="auth-help">The app never deletes this folder for you. Support Tickets can open it in the platform file manager.</p><dl className="auth-facts"><div><dt>Application data</dt><dd><code>{client.recovery.applicationDataPath}</code></dd></div><div><dt>Support route</dt><dd>{client.recovery.supportTicketRoute}</dd></div><div><dt>Auto-delete</dt><dd>No</dd></div></dl><button className="auth-button secondary" type="button" onClick={onOpenSupportTickets}>Open Support Tickets</button></div>
    </div>
    <div className="auth-list-card"><div className="auth-list-toolbar"><div><h3>Independent lock list</h3><p>{visible.length} visible, {records.length} total</p></div><div className="auth-toolbar-controls"><input aria-label="Search toy locks" placeholder="Search target, ID or method" value={query} onChange={(event) => setQuery(event.target.value)} /><label className="auth-check"><input type="checkbox" checked={regex} onChange={(event) => setRegex(event.target.checked)} /> Regex</label></div></div>{visible.length === 0 ? <p className="auth-empty">No matching locks.</p> : <div className="auth-entry-list">{visible.map((record) => { const open = lockIsOpen(record, surfaceId); return <article className="auth-entry" key={record.id}><div className="auth-entry-heading"><div><h4>{record.targetId}</h4><p>{record.credential.method} · {record.unlockDuration.kind === 'minutes' ? `${record.unlockDuration.minutes} minutes` : record.unlockDuration.kind}</p></div><span className={open ? 'auth-status armed' : 'auth-status'}>{open ? 'Open' : 'Locked'}</span></div>{open ? <button className="auth-button secondary" type="button" onClick={() => void relock(record)} disabled={busy}>Lock again</button> : <div className="inline-confirm"><input type="password" aria-label={`Unlock value for ${record.targetId}`} value={candidateById[record.id] ?? ''} onChange={(event) => setCandidateById((current) => ({ ...current, [record.id]: event.target.value }))} autoComplete="off" placeholder="Credential value" /><button className="auth-button" type="button" onClick={() => void unlock(record)} disabled={busy}>Unlock</button></div>}<button className="text-button" type="button" onClick={() => void remove(record)}>Remove lock</button></article>; })}</div>}</div>
  </section>;
}

export default LockManagerSurface;
