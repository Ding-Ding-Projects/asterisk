import assert from 'node:assert/strict';
import test from 'node:test';
import type { ReactElement, ReactNode } from 'react';

(globalThis as unknown as { window?: unknown }).window = {
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
};
(globalThis as unknown as { crypto?: unknown }).crypto ??= { randomUUID: () => 'mounted-mole-test' };

const { App } = await import('../../app/renderer/src/App.tsx');

type MoleChallenge = {
  rung: 'moles'; nonce: string; issuedAt: string; expiresAt: string;
  payload: { gridSize: number; durationMs: number; hitsRequired: number; spawns: Array<{ spawnId: number; cell: number; appearsAtMs: number; disappearsAtMs: number }> };
};
type AppInstance = {
  state: Record<string, unknown>;
  componentDidMount(): void;
  componentWillUnmount(): void;
  moleBoardOverlay(): ReactNode;
  ladder: { grade(nonce: string, answer: unknown): Promise<unknown>; issue?(request: unknown): Promise<unknown> };
};
const AppCtor = App as unknown as new (props: Record<string, never>) => AppInstance;

function withSyncUpdater(instance: AppInstance): AppInstance {
  (instance as unknown as { updater: unknown }).updater = {
    isMounted: () => true,
    enqueueForceUpdate() {},
    enqueueReplaceState(publicInstance: AppInstance, state: Record<string, unknown>) { publicInstance.state = state; },
    enqueueSetState(publicInstance: AppInstance, partial: unknown) {
      const patch = typeof partial === 'function'
        ? (partial as (state: Record<string, unknown>) => Record<string, unknown>)(publicInstance.state)
        : partial as Record<string, unknown>;
      publicInstance.state = { ...publicInstance.state, ...patch };
    },
  };
  return instance;
}

async function flush(rounds = 12): Promise<void> {
  for (let index = 0; index < rounds; index += 1) await Promise.resolve();
}

async function mount(): Promise<{ app: AppInstance; unmount: () => void }> {
  const app = withSyncUpdater(new AppCtor({}));
  app.componentDidMount();
  await flush();
  return { app, unmount: () => app.componentWillUnmount() };
}

function challenge(now = Date.now()): MoleChallenge {
  return {
    rung: 'moles', nonce: 'm'.repeat(32), issuedAt: new Date(now - 8_100).toISOString(), expiresAt: new Date(now + 120_000).toISOString(),
    payload: {
      gridSize: 9, durationMs: 8_000, hitsRequired: 5,
      spawns: Array.from({ length: 5 }, (_, cell) => ({ spawnId: cell, cell, appearsAtMs: 0, disappearsAtMs: 9_000 })),
    },
  };
}

function walk(node: ReactNode, found: ReactElement[] = []): ReactElement[] {
  if (node && typeof node === 'object' && 'props' in node) {
    const element = node as ReactElement;
    found.push(element);
    const children = (element.props as { children?: ReactNode }).children;
    if (Array.isArray(children)) children.forEach((child) => walk(child, found));
    else if (children) walk(children, found);
  }
  return found;
}

function button(overlay: ReactNode, label: string): ReactElement {
  const candidate = walk(overlay).find((element) => (element.props as { 'aria-label'?: string; children?: unknown })['aria-label'] === label
    || (element.props as { children?: unknown }).children === label);
  assert.ok(candidate, `missing button ${label}`);
  return candidate;
}

function prepare(app: AppInstance, activeChallenge = challenge()): void {
  app.state = {
    ...app.state,
    locks: { screen: { method: 'PIN', pin: '1234' } }, unlockKey: 'screen', unlockPin: '',
    ladderActive: true, ladderChallenge: activeChallenge, moleNowMs: Date.now(), moleHits: [],
  };
}

test('mounted overlay records distinct visible spawn IDs and a valid completed round clears only the wait', async () => {
  const { app, unmount } = await mount();
  try {
    prepare(app);
    const graded: unknown[] = [];
    app.ladder = { grade: async (_nonce, answer) => {
      graded.push(answer);
      return { waitCleared: true, nextRung: 'moles', reason: 'correct', budgetRemaining: 2, credentialCleared: false, attemptsRestored: false, authenticationGranted: false };
    } };
    for (let cell = 1; cell <= 5; cell += 1) (button(app.moleBoardOverlay(), `Visible mole in cell ${cell}`).props as { onClick(): void }).onClick();
    (button(app.moleBoardOverlay(), 'Submit round').props as { onClick(): void }).onClick();
    await flush();
    assert.equal(graded.length, 1);
    assert.equal((graded[0] as { kind: string }).kind, 'moles');
    assert.equal((graded[0] as { hits: unknown[] }).hits.length, 5);
    assert.equal((app.state.locks as Record<string, unknown>).screen !== undefined, true);
    assert.equal(app.state.ladderActive, false);
  } finally { unmount(); }
});

test('mounted overlay refuses early submission and credits a visible spawn at most once', async () => {
  const { app, unmount } = await mount();
  try {
    const active = challenge(Date.now() + 8_000);
    prepare(app, active);
    let grades = 0;
    app.ladder = { grade: async () => { grades += 1; return { waitCleared: false, nextRung: 'clock', reason: 'mole-round-submitted-early', budgetRemaining: 3, credentialCleared: false, attemptsRestored: false, authenticationGranted: false }; } };
    (button(app.moleBoardOverlay(), 'Wait for timer').props as { onClick(): void }).onClick();
    await flush();
    assert.equal(grades, 0);
    (button(app.moleBoardOverlay(), 'Visible mole in cell 1').props as { onClick(): void }).onClick();
    assert.equal((app.state.moleHits as unknown[]).length, 1);
    assert.equal(walk(app.moleBoardOverlay()).some((element) => (element.props as { 'aria-label'?: string })['aria-label'] === 'Visible mole in cell 1'), false);
  } finally { unmount(); }
});

test('an empty completed round, Escape, and School-mode-issued moles state never create authentication or session state', async () => {
  const { app, unmount } = await mount();
  try {
    prepare(app);
    const graded: unknown[] = [];
    app.ladder = { grade: async (_nonce, answer) => {
      graded.push(answer);
      return { waitCleared: false, nextRung: 'clock', reason: 'wrong-answer', budgetRemaining: 3, credentialCleared: false, attemptsRestored: false, authenticationGranted: false };
    }, issue: async () => ({ offered: false, rung: 'clock', reason: 'lockout-clock-only', budgetRemaining: 3 }) };
    (button(app.moleBoardOverlay(), 'Submit round').props as { onClick(): void }).onClick();
    await flush();
    assert.equal((graded[0] as { hits: unknown[] }).hits.length, 0);
    assert.equal((app.state.locks as Record<string, unknown>).screen !== undefined, true);

    prepare(app);
    const overlay = app.moleBoardOverlay() as ReactElement;
    (overlay.props as { onKeyDown(event: { key: string; preventDefault(): void }): void }).onKeyDown({ key: 'Escape', preventDefault() {} });
    await flush();
    assert.equal((graded[1] as { kind: string }).kind, 'dish', 'Escape must consume the active mole nonce through the clock path');
    assert.equal(app.state.ladderActive, false);
    assert.equal((app.state.locks as Record<string, unknown>).screen !== undefined, true);
  } finally { unmount(); }
});
