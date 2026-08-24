import { useState } from 'react';

export interface DestructiveActionGateProps {
  actionLabel: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}
export function DestructiveActionGate({ actionLabel, onConfirm, onCancel }: DestructiveActionGateProps) {
  const [firstKey, setFirstKey] = useState('');
  const [secondKey, setSecondKey] = useState('');
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const ready = firstKey.length > 0 && secondKey.length > 0;
  return <div className="auth-card destructive-gate" role="dialog" aria-label={`Confirm ${actionLabel}`}>
    <h3>Confirm {actionLabel}</h3>
    <p className="auth-help">This action is irreversible. Enter two independently operated keys, then move the slider through its full range.</p>
    <label>First key<input type="password" value={firstKey} onChange={(event) => setFirstKey(event.target.value)} autoComplete="off" /></label>
    <label>Second key<input type="password" value={secondKey} onChange={(event) => setSecondKey(event.target.value)} autoComplete="off" /></label>
    <label>Full-range confirmation<input type="range" min={0} max={100} value={progress} disabled={!ready || busy} onChange={(event) => setProgress(Number(event.target.value))} aria-valuetext={`${progress}%`} /></label>
    <p role="status">{busy ? 'Applying the confirmed action.' : progress === 100 ? 'Completion animation ready.' : `${progress}% complete.`}</p>
    <div className="auth-actions"><button type="button" className="auth-button" disabled={!ready || progress !== 100 || busy} onClick={async () => { setBusy(true); await onConfirm(); setBusy(false); }}>Confirm irreversible action</button><button type="button" className="auth-button secondary" onClick={onCancel} disabled={busy}>Emergency exit</button></div>
  </div>;
}
