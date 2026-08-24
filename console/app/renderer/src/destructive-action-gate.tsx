import { useEffect, useRef, useState } from 'react';

export interface DestructiveActionGateProps {
  actionLabel: string;
  preview?: string;
  onConfirm: () => Promise<void> | void;
  onComplete?: () => void;
  onCancel: () => void;
}
export function DestructiveActionGate({ actionLabel, preview, onConfirm, onComplete, onCancel }: DestructiveActionGateProps) {
  const [firstKey, setFirstKey] = useState('');
  const [secondKey, setSecondKey] = useState('');
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  const [completed, setCompleted] = useState(false);
  const origin = useRef<HTMLElement | null>(document.activeElement instanceof HTMLElement ? document.activeElement : null);
  useEffect(() => () => { origin.current?.focus(); }, []);
  const ready = firstKey.length > 0 && secondKey.length > 0;
  return <div className={completed ? 'auth-card destructive-gate completion-animation' : 'auth-card destructive-gate'} role="dialog" aria-label={`Confirm ${actionLabel}`}>
    <h3>Confirm {actionLabel}</h3>
    {preview ? <pre className="auth-help" aria-label="Exact deletion preview">{preview}</pre> : null}
    <p className="auth-help">This action is irreversible. Enter two independently operated keys, then move the slider through its full range.</p>
    <label>First key<input type="password" value={firstKey} onChange={(event) => setFirstKey(event.target.value)} autoComplete="off" /></label>
    <label>Second key<input type="password" value={secondKey} onChange={(event) => setSecondKey(event.target.value)} autoComplete="off" /></label>
    <label>Full-range confirmation<input type="range" min={0} max={100} value={progress} disabled={!ready || busy} onChange={(event) => setProgress(Number(event.target.value))} aria-valuetext={`${progress}%`} /></label>
    <p role="status">{message ?? (busy ? 'Applying the confirmed action.' : progress === 100 ? 'Completion animation ready.' : `${progress}% complete.`)}</p>
    <div className="auth-actions"><button type="button" className="auth-button" disabled={!ready || progress !== 100 || busy || completed} onClick={async () => { setBusy(true); setMessage(undefined); try { await onConfirm(); setCompleted(true); setMessage('Completed.'); onComplete?.(); } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'The action was refused.'); } finally { setBusy(false); setFirstKey(''); setSecondKey(''); } }}>Confirm irreversible action</button><button type="button" className="auth-button secondary" onClick={() => { setFirstKey(''); setSecondKey(''); setProgress(0); origin.current?.focus(); onCancel(); }} disabled={busy}>Emergency exit</button></div>
  </div>;
}
