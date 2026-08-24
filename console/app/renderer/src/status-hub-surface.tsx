import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { StatusHubQuestion, StatusHubSessionSnapshot } from '../../../shared/status-hub';
import type { StatusHubStore } from '../../../control-plane/status-hub-store';
import { selectStatusHubSurface } from './status-hub-state';
import './status-hub-surface.css';

export interface StatusHubSurfaceProps {
  store: StatusHubStore;
  heading?: string;
}

export function StatusHubSurface({ store, heading = 'Status Hub' }: StatusHubSurfaceProps) {
  const state = useSyncExternalStore(store.subscribe.bind(store), store.getSnapshot.bind(store), store.getSnapshot.bind(store));
  const model = useMemo(() => selectStatusHubSurface(state), [state]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busyQuestions, setBusyQuestions] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    void store.mount();
    return () => store.stop();
  }, [store]);

  const setAnswer = (questionId: string, value: string) => {
    setAnswers(previous => ({ ...previous, [questionId]: value }));
  };

  const sendAnswer = async (question: StatusHubQuestion) => {
    const answer = answers[question.id] ?? '';
    setBusyQuestions(previous => new Set(previous).add(question.id));
    try {
      await store.dispatchQuestion(question.sessionId, question.id, answer);
    } finally {
      setBusyQuestions(previous => {
        const next = new Set(previous);
        next.delete(question.id);
        return next;
      });
    }
  };

  return (
    <section className="status-hub-surface" aria-labelledby="status-hub-heading">
      <header className="status-hub-header">
        <div>
          <p className="status-hub-eyebrow">Live project status</p>
          <h2 id="status-hub-heading">{heading}</h2>
        </div>
        <span className={`status-hub-state status-hub-state-${model.availability}`} role="status">
          {model.availability}
        </span>
      </header>

      {model.error ? <p className="status-hub-error" role="alert">{model.error.message}</p> : null}
      {model.persistenceWarning ? <p className="status-hub-error" role="alert">Local receipt warning: {model.persistenceWarning.message}</p> : null}
      {model.error ? <div className="status-hub-actions" aria-label="Status Hub recovery actions">
        <button type="button" onClick={() => void store.mount()}>Retry</button>
        <button type="button" onClick={() => void store.reregister()}>Re-register</button>
      </div> : null}
      {model.persistenceWarning && model.project ? <div className="status-hub-actions" aria-label="Local receipt recovery actions">
        <button type="button" onClick={() => void store.retryPersistRegistration()}>Retry local save</button>
      </div> : null}
      {model.observedAt ? <p className="status-hub-observed">Last observed {model.observedAt}</p> : null}

      {model.project ? <ProjectEvidence project={model.project} /> : (
        <p className="status-hub-empty" role="status">No server registration receipt is available yet.</p>
      )}

      <div className="status-hub-sessions" aria-live="polite">
        {model.rows.map(({ snapshot }) => (
          <SessionCard
            key={snapshot.session.id}
            snapshot={snapshot}
            answers={answers}
            busyQuestions={busyQuestions}
            onAnswerChange={setAnswer}
            onSend={sendAnswer}
          />
        ))}
        {model.rows.length === 0 ? <p className="status-hub-empty">No server session observations are available.</p> : null}
      </div>
    </section>
  );
}

function ProjectEvidence({ project }: { project: NonNullable<ReturnType<typeof selectStatusHubSurface>['project']> }) {
  return (
    <article className="status-hub-project" aria-label="Project registration evidence">
      <div className="status-hub-project-grid">
        <span><strong>Project</strong><code>{project.projectId}</code></span>
        <span><strong>Default branch</strong><code>{project.defaultBranch}</code></span>
        <span><strong>Release channel</strong><code>{project.releaseChannel}</code></span>
        <span><strong>Registration receipt</strong><time dateTime={project.registeredAt}>{project.registeredAt}</time></span>
        {project.commit ? <span><strong>Commit</strong><code>{project.commit}</code></span> : null}
        <span><strong>Stable URL</strong><a href={project.stableUrl} target="_blank" rel="noreferrer">{project.stableUrl}</a></span>
      </div>
      <EvidenceList title="Checks" links={project.checks.map(check => ({
        label: `${check.label}: ${check.state}`,
        url: check.runUrl,
        commit: check.commit,
      }))} />
      <EvidenceList title="Evidence" links={project.evidence} />
    </article>
  );
}

function SessionCard({
  snapshot,
  answers,
  busyQuestions,
  onAnswerChange,
  onSend,
}: {
  snapshot: StatusHubSessionSnapshot;
  answers: Readonly<Record<string, string>>;
  busyQuestions: ReadonlySet<string>;
  onAnswerChange(questionId: string, value: string): void;
  onSend(question: StatusHubQuestion): Promise<void>;
}) {
  const { session, questions, inbox } = snapshot;
  return (
    <article className="status-hub-session" aria-labelledby={`status-hub-session-${session.id}`}>
      <header className="status-hub-session-header">
        <div>
          <h3 id={`status-hub-session-${session.id}`}>{session.name}</h3>
          <code>{session.id}</code>
        </div>
        <span className={`status-hub-session-state status-hub-session-state-${session.state}`}>{session.state}</span>
      </header>
      <dl className="status-hub-session-facts">
        <div><dt>Project</dt><dd><code>{session.projectId}</code></dd></div>
        <div><dt>Updated</dt><dd><time dateTime={session.updatedAt}>{session.updatedAt}</time></dd></div>
        {session.commit ? <div><dt>Commit</dt><dd><code>{session.commit}</code></dd></div> : null}
        {session.runId ? <div><dt>Run</dt><dd><code>{session.runId}</code>{session.runUrl ? <> <a href={session.runUrl} target="_blank" rel="noreferrer">open run</a></> : null}</dd></div> : null}
      </dl>
      {session.detail ? <p className="status-hub-detail">{session.detail}</p> : null}
      <EvidenceList title="Session evidence" links={session.evidence} />
      <QuestionList questions={questions} answers={answers} busyQuestions={busyQuestions} onAnswerChange={onAnswerChange} onSend={onSend} />
      <div className="status-hub-inbox" aria-label="Reply inbox">
        <h4>Reply inbox</h4>
        {inbox.replies.length ? inbox.replies.map(reply => <article key={reply.id} className="status-hub-reply"><p>{reply.body}</p><small>{reply.createdAt} · {reply.source}</small></article>) : <p className="status-hub-empty">No replies observed.</p>}
      </div>
    </article>
  );
}

function QuestionList({
  questions,
  answers,
  busyQuestions,
  onAnswerChange,
  onSend,
}: {
  questions: readonly StatusHubQuestion[];
  answers: Readonly<Record<string, string>>;
  busyQuestions: ReadonlySet<string>;
  onAnswerChange(questionId: string, value: string): void;
  onSend(question: StatusHubQuestion): Promise<void>;
}) {
  if (!questions.length) return <p className="status-hub-empty">No open questions observed.</p>;
  return (
    <div className="status-hub-questions">
      <h4>Questions</h4>
      {questions.map(question => {
        const receipt = question.receipt;
        const busy = busyQuestions.has(question.id);
        return (
          <form key={question.id} className="status-hub-question" onSubmit={event => { event.preventDefault(); void onSend(question); }}>
            <p>{question.prompt}</p>
            <code>{question.id}</code>
            {question.options.length ? <select aria-label={`Answer options for ${question.id}`} value={answers[question.id] ?? ''} onChange={event => onAnswerChange(question.id, event.target.value)} disabled={question.answered || busy}>
              <option value="">Choose an answer</option>
              {question.options.map(option => <option key={option} value={option}>{option}</option>)}
            </select> : null}
            {question.freeTextAllowed ? <textarea aria-label={`Answer for ${question.id}`} value={answers[question.id] ?? ''} onChange={event => onAnswerChange(question.id, event.target.value)} disabled={question.answered || busy} /> : null}
            <button type="submit" disabled={question.answered || busy || (answers[question.id] ?? '').length === 0}>{busy ? 'Waiting for server receipt…' : 'Send answer'}</button>
            {receipt ? <p className="status-hub-receipt" role="status">Server receipt {receipt.receiptId}: {receipt.state}</p> : <p className="status-hub-receipt" role="status">No delivery receipt yet.</p>}
          </form>
        );
      })}
    </div>
  );
}

function EvidenceList({ title, links }: { title: string; links: ReadonlyArray<{ label: string; url?: string; commit?: string }> }) {
  return (
    <div className="status-hub-evidence">
      <h4>{title}</h4>
      {links.length ? <ul>{links.map((link, index) => <li key={`${link.label}-${link.url ?? index}`}><span>{link.label}</span>{link.commit ? <code>{link.commit}</code> : null}{link.url ? <a href={link.url} target="_blank" rel="noreferrer">open evidence</a> : null}</li>)}</ul> : <p className="status-hub-empty">No evidence links observed.</p>}
    </div>
  );
}
