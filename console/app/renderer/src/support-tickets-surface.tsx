import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { withDeadline } from './authenticator-surface-state';
import './authenticator-surface.css';

export type SupportTicketStatus = 'received' | 'reviewed' | 'resolution-ready';
export type SupportTicket = { id: string; category: string; description: string; severity: string; status: SupportTicketStatus; createdAt: string };

export interface SupportTicketsClient {
  list(): Promise<ReadonlyArray<SupportTicket>>;
  create(input: { category: string; description: string; severity: string }): Promise<SupportTicket>;
  advance(id: string): Promise<SupportTicket>;
}

export interface SupportTicketsSurfaceProps {
  client: SupportTicketsClient;
  applicationDataPath: string;
  openApplicationDataFolder: (path: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  onNotice?: (message: string, detail?: string) => void;
}

export function SupportTicketsSurface({ client, applicationDataPath, openApplicationDataFolder, onNotice }: SupportTicketsSurfaceProps) {
  const [tickets, setTickets] = useState<ReadonlyArray<SupportTicket>>([]);
  const [category, setCategory] = useState('Forgotten toy-lock value');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('Nobody will honour this');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const refresh = async () => {
    try { setTickets(await withDeadline(client.list())); setError(undefined); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Support Tickets could not be read locally.'); }
  };
  useEffect(() => { void refresh(); }, [client]);
  const visible = useMemo(() => { const needle = query.trim().toLocaleLowerCase(); return needle ? tickets.filter((ticket) => `${ticket.id} ${ticket.category} ${ticket.description} ${ticket.status}`.toLocaleLowerCase().includes(needle)) : tickets; }, [tickets, query]);

  const create = async (event: FormEvent) => {
    event.preventDefault(); if (busy) return; setBusy(true);
    try { await withDeadline(client.create({ category, description: description.trim(), severity })); setDescription(''); await refresh(); onNotice?.('A local Support Ticket was created. Nobody receives it.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'The local ticket could not be created.'); }
    finally { setBusy(false); }
  };
  const advance = async (ticket: SupportTicket) => {
    if (busy) return; setBusy(true);
    try { await withDeadline(client.advance(ticket.id)); await refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'The ticket status could not advance.'); }
    finally { setBusy(false); }
  };
  const openFolder = async () => {
    setBusy(true);
    try { const result = await withDeadline(openApplicationDataFolder(applicationDataPath)); if (!result.ok) throw new Error(result.message); onNotice?.('The application-data folder was requested from the platform file manager.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'The platform file manager could not open the folder.'); }
    finally { setBusy(false); }
  };

  return <section className="auth-surface" aria-labelledby="support-tickets-title">
    <header className="auth-header"><div><p className="auth-kicker">FICTIONAL LOCAL DESK</p><h2 id="support-tickets-title">Support Tickets</h2><p>A tiny desk on this computer, with no network and no human reader.</p></div></header>
    <div className="auth-disclosure" role="note">Nothing is sent anywhere. No ticket exists outside this computer, no network request is made, no data is collected, and nobody is reading this. The resolution only opens a folder. It never deletes anything.</div>
    {error ? <div className="auth-error" role="alert">{error}</div> : null}
    <div className="auth-grid"><form className="auth-card" onSubmit={(event) => void create(event)}><h3>Open a local ticket</h3><label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option>Forgotten toy-lock value</option><option>Authenticator pairing</option><option>Unlock ladder question</option><option>Other local help</option></select></label><label>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={5} maxLength={2000} placeholder="Describe what the local desk should show you next." required /></label><label>Severity<select value={severity} onChange={(event) => setSeverity(event.target.value)}><option>Nobody will honour this</option><option>Politely urgent</option><option>Tea can wait</option></select></label><button className="auth-button" type="submit" disabled={busy}>Create local ticket</button></form><div className="auth-card"><h3>Resolution path</h3><p className="auth-help">A lockout is resolved by deleting the app's local application-data folder yourself. This desk only opens it in the platform file manager.</p><dl className="auth-facts"><div><dt>Exact folder</dt><dd><code>{applicationDataPath}</code></dd></div><div><dt>Deletion</dt><dd>Never performed by this app</dd></div></dl><button className="auth-button secondary" type="button" onClick={() => void openFolder()} disabled={busy}>Open folder in file manager</button></div></div>
    <div className="auth-list-card"><div className="auth-list-toolbar"><div><h3>Local ticket list</h3><p>{visible.length} visible, {tickets.length} total</p></div><div className="auth-toolbar-controls"><input aria-label="Search support tickets" placeholder="Search ticket number, category or status" value={query} onChange={(event) => setQuery(event.target.value)} /></div></div>{visible.length === 0 ? <p className="auth-empty">No local tickets match this search.</p> : <div className="auth-entry-list">{visible.map((ticket) => <article className="auth-entry" key={ticket.id}><div className="auth-entry-heading"><div><h4>{ticket.id} · {ticket.category}</h4><p>{ticket.description}</p></div><span className="auth-status">{ticket.status}</span></div><p>Severity: {ticket.severity} · {new Date(ticket.createdAt).toLocaleString()}</p>{ticket.status !== 'resolution-ready' ? <button className="auth-button secondary" type="button" onClick={() => void advance(ticket)} disabled={busy}>Advance local response</button> : <p className="auth-help">Resolution ready: open the exact folder above. The ticket still deletes nothing.</p>}</article>)}</div>}</div>
  </section>;
}

export default SupportTicketsSurface;
