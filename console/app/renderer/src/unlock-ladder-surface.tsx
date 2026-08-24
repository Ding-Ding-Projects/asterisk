import { useEffect, useMemo, useState } from 'react';
import type {
  UnlockLadderAnswer,
  UnlockLadderChallenge,
  UnlockLadderGradeResult,
  UnlockLadderIssueResult,
} from './unlock-ladder';
import { withDeadline } from './authenticator-surface-state';
import './authenticator-surface.css';

export interface UnlockLadderClient {
  issue(request: { lockoutId: string; budgetScopeId: string; schoolMode: boolean }): Promise<UnlockLadderIssueResult>;
  grade(nonce: string, answer: UnlockLadderAnswer): Promise<UnlockLadderGradeResult>;
}

export interface UnlockLadderSurfaceProps {
  client: UnlockLadderClient;
  lockoutId: string;
  budgetScopeId: string;
  schoolMode?: boolean;
  onNotice?: (message: string, detail?: string) => void;
}

export function UnlockLadderSurface({ client, lockoutId, budgetScopeId, schoolMode = false, onNotice }: UnlockLadderSurfaceProps) {
  const [challenge, setChallenge] = useState<UnlockLadderChallenge | undefined>();
  const [budget, setBudget] = useState<number | undefined>();
  const [clockReason, setClockReason] = useState<string | undefined>();
  const [dishChoice, setDishChoice] = useState<number | undefined>();
  const [sumAnswers, setSumAnswers] = useState<string[]>([]);
  const [moleHits, setMoleHits] = useState<Array<{ spawnId: number; cell: number; atMs: number }>>([]);
  const [roundStarted, setRoundStarted] = useState<number | undefined>();
  const [remaining, setRemaining] = useState<number | undefined>();
  const [message, setMessage] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const issue = async () => {
    if (busy) return;
    setBusy(true); setMessage(undefined);
    try {
      const result = await withDeadline(client.issue({ lockoutId, budgetScopeId, schoolMode }));
      setBudget(result.budgetRemaining);
      if (!result.offered) { setChallenge(undefined); setClockReason(result.reason); return; }
      setChallenge(result.challenge); setClockReason(undefined); setDishChoice(undefined); setMoleHits([]); setSumAnswers([]);
      if (result.challenge.rung === 'moles') { setRoundStarted(Date.now()); setRemaining(result.challenge.payload.durationMs); }
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'The unlock challenge did not arrive.'); }
    finally { setBusy(false); }
  };
  useEffect(() => { void issue(); }, [client, lockoutId, budgetScopeId, schoolMode]);
  useEffect(() => {
    if (!roundStarted || challenge?.rung !== 'moles') return undefined;
    const timer = setInterval(() => setRemaining(Math.max(0, challenge.payload.durationMs - (Date.now() - roundStarted))), 100);
    return () => clearInterval(timer);
  }, [challenge, roundStarted]);

  const submit = async () => {
    if (!challenge || busy) return;
    let answer: UnlockLadderAnswer;
    if (challenge.rung === 'dish') answer = { kind: 'dish', choiceIndex: dishChoice ?? -1 };
    else if (challenge.rung === 'sums') answer = { kind: 'sums', answers: sumAnswers.map((value) => Number(value)) };
    else answer = { kind: 'moles', hits: moleHits };
    setBusy(true);
    try {
      const result = await withDeadline(client.grade(challenge.nonce, answer));
      setMessage(result.waitCleared ? 'The wait is cleared. Sign in normally; this challenge never created a session or changed the attempt budget.' : result.reason ?? 'That answer did not clear the wait.');
      if (result.waitCleared) { setChallenge(undefined); onNotice?.('Wait cleared. Normal authentication is still required.'); }
      else if (result.nextRung === 'clock') { setChallenge(undefined); setClockReason(result.reason ?? 'Only the clock remains for this lockout.'); }
      else { await issue(); }
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'The answer could not be graded.'); }
    finally { setBusy(false); }
  };

  const activeMoles = useMemo(() => challenge?.rung === 'moles' ? challenge.payload.spawns : [], [challenge]);

  return <section className="auth-surface" aria-labelledby="unlock-ladder-title"><header className="auth-header"><div><p className="auth-kicker">WAIT CLEARING ONLY</p><h2 id="unlock-ladder-title">Unlock ladder</h2><p>Winning clears the wait only. It never signs in, creates a session, or refunds an attempt.</p></div><span className="auth-status">{budget === undefined ? 'Budget loading' : `${budget} skips left this hour`}</span></header>
    <div className="auth-disclosure" role="note">Challenges are issued and graded by the typed local service with a single-use nonce and a deadline. {schoolMode ? 'School mode starts at the sums rung.' : 'The normal ladder starts with one dish.'}</div>
    {message ? <div className="auth-disclosure" role="status">{message}</div> : null}
    {clockReason ? <div className="auth-card"><h3>The clock remains</h3><p>{clockReason}</p><p className="auth-help">The ladder never shortens the underlying lockout escalation.</p></div> : null}
    {challenge?.rung === 'dish' ? <div className="auth-card"><h3>Choose one dish</h3><p className="auth-help">Four choices, one answer. A wrong dish can escalate the next rung.</p><div className="auth-entry-list">{challenge.payload.choices.map((choice, index) => <button key={choice} type="button" className={dishChoice === index ? 'auth-button' : 'auth-button secondary'} onClick={() => setDishChoice(index)}>{choice}</button>)}</div><button className="auth-button" type="button" onClick={() => void submit()} disabled={busy || dishChoice === undefined}>Submit answer</button></div> : null}
    {challenge?.rung === 'sums' ? <div className="auth-card"><h3>Ten easy sums</h3><div className="auth-entry-list">{challenge.payload.problems.map((problem, index) => <label key={`${problem.a}-${problem.operator}-${problem.b}-${index}`}>{problem.a} {problem.operator} {problem.b}<input inputMode="numeric" value={sumAnswers[index] ?? ''} onChange={(event) => setSumAnswers((current) => { const next = [...current]; next[index] = event.target.value.replace(/\D/gu, ''); return next; })} /></label>)}</div><button className="auth-button" type="button" onClick={() => void submit()} disabled={busy || sumAnswers.length !== challenge.payload.problems.length || sumAnswers.some((value) => !value)}>Submit all ten</button></div> : null}
    {challenge?.rung === 'moles' ? <div className="auth-card"><h3>Whack-a-mole</h3><p className="auth-help">Round time remaining: <strong>{Math.ceil((remaining ?? challenge.payload.durationMs) / 1000)} seconds</strong>. Hits are recorded locally and graded once by the service after the round duration.</p><div className="mole-grid" style={{ gridTemplateColumns: `repeat(${Math.sqrt(challenge.payload.gridSize)}, minmax(44px, 1fr))` }}>{Array.from({ length: challenge.payload.gridSize }, (_, cell) => { const visibleSpawn = activeMoles.find((spawn) => spawn.cell === cell); const hit = moleHits.some((entry) => entry.spawnId === visibleSpawn?.spawnId); return <button key={cell} type="button" className={hit ? 'mole-cell hit' : visibleSpawn ? 'mole-cell visible' : 'mole-cell'} aria-label={visibleSpawn ? `Mole cell ${cell + 1}` : `Empty cell ${cell + 1}`} onClick={() => { if (!roundStarted || !visibleSpawn || hit) return; setMoleHits((current) => [...current, { spawnId: visibleSpawn.spawnId, cell, atMs: Date.now() - roundStarted }]); }}>{visibleSpawn ? '●' : ''}</button>; })}</div><button className="auth-button" type="button" onClick={() => void submit()} disabled={busy || (remaining ?? 0) > 0}>Submit round</button></div> : null}
    {!challenge && !clockReason ? <div className="auth-card"><h3>Challenge unavailable</h3><p>Ask the local service for a fresh challenge. The screen does not guess a result.</p><button className="auth-button" type="button" onClick={() => void issue()} disabled={busy}>Request fresh challenge</button></div> : null}
  </section>;
}

export default UnlockLadderSurface;
