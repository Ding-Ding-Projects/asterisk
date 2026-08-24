import { useEffect, useMemo, useState } from 'react';
import type { AuthenticatorEntry, AuthenticatorRegistration } from '../../../shared/authenticator';
import {
  buildPairingDescriptor,
  exportAuthenticatorEntries,
  readCodeSnapshot,
  recordAuthHistory,
  searchAuthenticatorEntries,
  withDeadline,
  type AuthenticatorClient,
  type AuthenticatorCodeSnapshot,
  type AuthenticatorHistoryClient,
  type PairingDescriptor,
  type SecretReader,
} from './authenticator-surface-state';
import './authenticator-surface.css';

export interface AuthenticatorSurfaceProps {
  client: AuthenticatorClient;
  secretReader: SecretReader;
  history?: AuthenticatorHistoryClient;
  clockOffsetMs?: number;
  onNotice?: (message: string, detail?: string) => void;
}

const EMPTY_REGISTRATION: AuthenticatorRegistration = { issuer: '', account: '', secret: '', algorithm: 'SHA-1', digits: 6, period: 30 };

export function AuthenticatorSurface({ client, secretReader, history, clockOffsetMs = 0, onNotice }: AuthenticatorSurfaceProps) {
  const [entries, setEntries] = useState<ReadonlyArray<AuthenticatorEntry>>([]);
  const [registration, setRegistration] = useState<AuthenticatorRegistration>(EMPTY_REGISTRATION);
  const [pairing, setPairing] = useState<PairingDescriptor | undefined>();
  const [confirmation, setConfirmation] = useState('');
  const [codes, setCodes] = useState<Record<string, AuthenticatorCodeSnapshot>>({});
  const [query, setQuery] = useState('');
  const [regex, setRegex] = useState(false);
  const [group, setGroup] = useState('All');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const refresh = async () => {
    try {
      const result = await withDeadline(client.list());
      if (!result.ok) throw new Error(result.message);
      setEntries(result.value);
      setError(undefined);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Authenticator entries could not be read.');
    }
  };
  useEffect(() => { void refresh(); }, [client]);

  useEffect(() => {
    let cancelled = false;
    const update = async () => {
      const atMs = Date.now();
      const next: Record<string, AuthenticatorCodeSnapshot> = {};
      for (const entry of entries) {
        if (!entry.armed) continue;
        try {
          next[entry.id] = await readCodeSnapshot(secretReader, entry, atMs, clockOffsetMs);
        } catch { /* Vault failure is shown at the row, never as a fabricated code. */ }
      }
      if (!cancelled) setCodes(next);
    };
    void update();
    const timer = setInterval(() => { void update(); }, 1_000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [entries, secretReader, clockOffsetMs]);

  const visibleEntries = useMemo(() => {
    const filtered = searchAuthenticatorEntries(entries, query, regex);
    return group === 'All' ? filtered : filtered.filter((entry) => entry.issuer === group);
  }, [entries, group, query, regex]);
  const groups = useMemo(() => ['All', ...new Set(entries.map((entry) => entry.issuer))], [entries]);

  const setField = (field: keyof AuthenticatorRegistration, value: string | number) => {
    setRegistration((current) => ({ ...current, [field]: value }));
  };

  const beginPairing = () => {
    try { setPairing(buildPairingDescriptor(registration)); setConfirmation(''); setError(undefined); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Pairing details are invalid.'); }
  };

  const register = async () => {
    if (!pairing || busy) return;
    setBusy(true);
    try {
      const result = await withDeadline(client.register(registration));
      if (!result.ok) throw new Error(result.message);
      await recordAuthHistory(history, { action: 'created', subject: `Authenticator ${result.value.issuer} / ${result.value.account}`, stableRecordId: result.value.id });
      setPairing(undefined);
      setRegistration(EMPTY_REGISTRATION);
      await refresh();
      onNotice?.('Pairing saved locally. Enter one current code to arm it.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Pairing could not be saved.'); }
    finally { setBusy(false); }
  };

  const confirmAndArm = async (entryId: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await withDeadline(client.confirmAndArm(entryId, confirmation, Date.now(), 1));
      if (!result.ok) throw new Error(result.message);
      await recordAuthHistory(history, { action: 'updated', subject: `Authenticator ${result.value.issuer} armed`, stableRecordId: result.value.id });
      setConfirmation('');
      await refresh();
      onNotice?.('Authenticator armed after local code confirmation.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Confirmation failed.'); }
    finally { setBusy(false); }
  };

  const remove = async (entry: AuthenticatorEntry) => {
    if (busy || !window.confirm(`Remove ${entry.issuer} / ${entry.account}? Secret material will be removed from the vault.`)) return;
    setBusy(true);
    try {
      const result = await withDeadline(client.remove(entry.id));
      if (!result.ok) throw new Error(result.message);
      await recordAuthHistory(history, { action: 'deleted', subject: `Authenticator ${entry.issuer} / ${entry.account}`, stableRecordId: entry.id });
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Authenticator could not be removed.'); }
    finally { setBusy(false); }
  };

  const downloadExport = () => {
    const payload = JSON.stringify(exportAuthenticatorEntries(entries), null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = 'authenticator-entries-redacted.json'; link.click();
    URL.revokeObjectURL(url);
  };

  return <section className="auth-surface" aria-labelledby="authenticator-title">
    <header className="auth-header">
      <div><p className="auth-kicker">LOCAL AUTHENTICATOR</p><h2 id="authenticator-title">Authenticator</h2><p>Codes stay local. Vault secrets are never shown after pairing.</p></div>
      <button type="button" className="auth-button secondary" onClick={downloadExport}>Export redacted records</button>
    </header>
    <div className="auth-disclosure" role="note">Ordinary exports omit secret material and vault references. A deliberate secret export is not part of this surface.</div>
    {error ? <div className="auth-error" role="alert">{error}</div> : null}
    <div className="auth-grid">
      <form className="auth-card" onSubmit={(event) => { event.preventDefault(); beginPairing(); }}>
        <h3>Pair an account</h3><p className="auth-help">Create a local pairing, review the QR payload and manual value, then confirm one current code before arming.</p>
        <label>Issuer<input value={registration.issuer} onChange={(event) => setField('issuer', event.target.value)} maxLength={256} required /></label>
        <label>Account<input value={registration.account} onChange={(event) => setField('account', event.target.value)} maxLength={256} required /></label>
        <label>Manual secret<input value={registration.secret} onChange={(event) => setField('secret', event.target.value)} maxLength={512} autoComplete="off" required /></label>
        <div className="auth-fields"><label>Algorithm<select value={registration.algorithm} onChange={(event) => setField('algorithm', event.target.value)}><option>SHA-1</option><option>SHA-256</option><option>SHA-512</option></select></label><label>Digits<select value={registration.digits} onChange={(event) => setField('digits', Number(event.target.value))}><option value={6}>6</option><option value={7}>7</option><option value={8}>8</option></select></label><label>Period<input type="number" min={1} max={86400} value={registration.period} onChange={(event) => setField('period', Number(event.target.value))} /></label></div>
        <button className="auth-button" type="submit">Review local pairing</button>
      </form>
      {pairing ? <div className="auth-card pairing-card" role="dialog" aria-labelledby="pairing-title">
        <h3 id="pairing-title">Confirm pairing before arm</h3>
        <div className="qr-placeholder" role="img" aria-label={pairing.qrAccessibleLabel}><span>QR</span><code>{pairing.qrValue}</code></div>
        <p className="auth-help">The host can pass this exact local URI to its bundled QR renderer. No QR service or network request is used.</p>
        <dl className="auth-facts"><div><dt>Manual value</dt><dd><code>{pairing.manualSecret}</code></dd></div><div><dt>Parameters</dt><dd>{pairing.parameters.algorithm}, {pairing.parameters.digits} digits, {pairing.parameters.period}s</dd></div></dl>
        <label>Current code<input value={confirmation} onChange={(event) => setConfirmation(event.target.value.replace(/\D/gu, '').slice(0, pairing.parameters.digits))} inputMode="numeric" maxLength={pairing.parameters.digits} autoComplete="one-time-code" /></label>
        <div className="auth-actions"><button className="auth-button" type="button" onClick={() => void register()} disabled={busy}>Save unarmed</button><button className="auth-button" type="button" onClick={() => setPairing(undefined)}>Cancel</button></div>
      </div> : null}
    </div>
    <div className="auth-list-card">
      <div className="auth-list-toolbar"><div><h3>Local entries</h3><p>{visibleEntries.length} visible, {entries.length} stored records</p></div><div className="auth-toolbar-controls"><input aria-label="Search authenticator entries" placeholder="Search issuer, account or ID" value={query} onChange={(event) => setQuery(event.target.value)} /><label className="auth-check"><input type="checkbox" checked={regex} onChange={(event) => setRegex(event.target.checked)} /> Regex</label><select aria-label="Filter by issuer" value={group} onChange={(event) => setGroup(event.target.value)}>{groups.map((item) => <option key={item}>{item}</option>)}</select></div></div>
      {visibleEntries.length === 0 ? <p className="auth-empty">No matching authenticator records. Nothing is invented when the vault has no entry.</p> : <div className="auth-entry-list">{visibleEntries.map((entry) => { const snapshot = codes[entry.id]; return <article className="auth-entry" key={entry.id}><div className="auth-entry-heading"><div><h4>{entry.issuer} <span aria-hidden="true">·</span> {entry.account}</h4><p>{entry.parameters.algorithm} · {entry.parameters.digits} digits · {entry.parameters.period}s</p></div><span className={entry.armed ? 'auth-status armed' : 'auth-status'}>{entry.armed ? 'Armed' : 'Awaiting confirmation'}</span></div>{entry.armed ? <div className="code-panel"><strong>{snapshot?.current ?? 'Unavailable'}</strong><span>{snapshot ? `${snapshot.secondsRemaining}s remaining` : 'Vault read unavailable'}</span><span>Next: {snapshot?.next ?? 'Unavailable'}</span>{snapshot?.clockWarning ? <small role="alert">{snapshot.clockWarning}</small> : null}</div> : <div className="inline-confirm"><input aria-label={`Confirmation code for ${entry.account}`} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} inputMode="numeric" placeholder="Current code" /><button className="auth-button" type="button" onClick={() => void confirmAndArm(entry.id)} disabled={busy}>Confirm and arm</button></div>}<button className="text-button" type="button" onClick={() => void remove(entry)}>Remove entry</button></article>; })}</div>}
    </div>
  </section>;
}

export default AuthenticatorSurface;
