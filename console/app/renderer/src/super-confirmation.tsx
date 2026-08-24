import { useState } from 'react';

export interface SuperConfirmationProps {
  readonly action: string;
  readonly details: string;
  readonly onConfirm: () => Promise<{ ok: boolean; reason?: string }>;
  readonly onCancel: () => void;
}

/** Shared two-key plus full-range slider confirmation for destructive settings. */
export function SuperConfirmation(props: SuperConfirmationProps) {
  const [keyOne, setKeyOne] = useState('');
  const [keyTwo, setKeyTwo] = useState('');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const confirm = async () => {
    setBusy(true);
    const result = await props.onConfirm();
    setStatus(result.ok ? 'Completed.' : result.reason ?? 'The destructive action was refused.');
    setBusy(false);
    if (result.ok) props.onCancel();
  };
  return <div className="super-confirmation" role="dialog" aria-modal="true" aria-labelledby="super-confirmation-title">
    <h3 id="super-confirmation-title">Confirm {props.action}</h3>
    <p>{props.details}</p>
    <label>First confirmation key<input type="text" value={keyOne} onChange={(event) => setKeyOne(event.currentTarget.value)} autoComplete="off" /></label>
    <label>Second confirmation key<input type="text" value={keyTwo} onChange={(event) => setKeyTwo(event.currentTarget.value)} autoComplete="off" /></label>
    <label>Slide to confirm<input type="range" min="0" max="100" value={progress} onChange={(event) => setProgress(Number(event.currentTarget.value))} /></label>
    <p role="status">{status || `${progress}% confirmed. Both keys and the full slider are required.`}</p>
    <button type="button" onClick={props.onCancel}>Emergency exit</button>
    <button type="button" onClick={() => void confirm()} disabled={busy || !keyOne || !keyTwo || progress !== 100}>Confirm irreversible action</button>
  </div>;
}
