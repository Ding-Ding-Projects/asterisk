import assert from 'node:assert/strict';
import test from 'node:test';
import * as React from 'react';
import { DownloadProgressSurface } from '../../app/renderer/src/download-progress-surface.js';
import type { DownloadTransferClient, DownloadTransferReceipt, DownloadTransferSnapshot } from '../../shared/download-transfer.js';

const initial: DownloadTransferSnapshot = {
  transferId: 'transfer-pause', handoffId: 'handoff-pause', fileName: 'recording.wav', sourceUrl: 'https://example.test/recording.wav',
  destinationPath: 'C:/Downloads/recording.wav', status: 'downloading', bytesTransferred: 128, totalBytes: 1024,
  observedAt: '2026-08-26T00:00:00.000Z', canPause: true, canResume: false, canCancel: true, canRetry: false,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
}

/** A bounded hook harness because this package intentionally ships no DOM test runtime. */
function renderProgress(client: DownloadTransferClient, snapshot: DownloadTransferSnapshot) {
  const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE as { H: unknown };
  const previous = internals.H;
  const states: unknown[] = [];
  const effects: Array<{ deps?: readonly unknown[]; cleanup?: (() => void) | void }> = [];
  let stateCursor = 0;
  let effectCursor = 0;
  let tree: React.ReactNode;
  const dispatcher = {
    useState<T>(value: T | (() => T)) {
      const index = stateCursor++;
      if (!(index in states)) states[index] = typeof value === 'function' ? (value as () => T)() : value;
      return [states[index] as T, (next: T | ((prior: T) => T)) => { states[index] = typeof next === 'function' ? (next as (prior: T) => T)(states[index] as T) : next; }] as const;
    },
    useEffect(effect: () => void | (() => void), deps?: readonly unknown[]) {
      const index = effectCursor++;
      const prior = effects[index];
      const changed = !prior || !deps || !prior.deps || deps.length !== prior.deps.length || deps.some((value, depIndex) => value !== prior.deps![depIndex]);
      if (changed) {
        prior?.cleanup?.();
        effects[index] = { deps, cleanup: effect() };
      }
    },
  };
  const render = () => {
    stateCursor = 0;
    effectCursor = 0;
    internals.H = dispatcher;
    try { tree = DownloadProgressSurface({ client, transferId: snapshot.transferId, initialSnapshot: snapshot }); }
    finally { internals.H = previous; }
    return tree;
  };
  return { render, dispose: () => effects.forEach((effect) => effect.cleanup?.()) };
}

function text(node: unknown): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(text).join('');
  if (React.isValidElement(node)) return text(node.props.children);
  return '';
}

function button(tree: React.ReactNode, label: string): React.ReactElement<{ disabled?: boolean; onClick?: () => void }> {
  if (React.isValidElement(tree) && tree.type === 'button' && text(tree.props.children) === label) return tree as React.ReactElement<{ disabled?: boolean; onClick?: () => void }>;
  const children = React.isValidElement(tree) ? React.Children.toArray(tree.props.children) : Array.isArray(tree) ? tree : [];
  for (const child of children) {
    try { return button(child, label); } catch { /* search the next sibling */ }
  }
  throw new Error(`No ${label} button was rendered.`);
}

test('Pause invokes one real typed command, disables while pending, reports refusal, and renders refreshed observation', async () => {
  const pause = deferred<DownloadTransferReceipt>();
  const commands: Array<{ transferId: string; command: string }> = [];
  let listener: ((snapshot: DownloadTransferSnapshot) => void) | undefined;
  const client: DownloadTransferClient = {
    start: async () => { throw new Error('not used'); },
    cancelHandoff: async () => { throw new Error('not used'); },
    command: async (transferId, command) => { commands.push({ transferId, command }); return await pause.promise; },
    subscribe: (_transferId, next) => { listener = next; return () => { listener = undefined; }; },
  };
  const harness = renderProgress(client, initial);
  try {
    const first = harness.render();
    const pauseButton = button(first, 'Pause');
    assert.equal(pauseButton.props.disabled, false);
    pauseButton.props.onClick?.();
    assert.deepEqual(commands, [{ transferId: 'transfer-pause', command: 'pause' }]);
    assert.equal(button(harness.render(), 'Pause').props.disabled, true, 'pending command must disable Pause');

    pause.resolve({ command: 'pause', handoffId: initial.handoffId, transferId: initial.transferId, accepted: false, observedAt: initial.observedAt, status: 'rejected', detail: 'The server refused pause.' });
    await Promise.resolve();
    await Promise.resolve();
    const refused = harness.render();
    assert.equal(button(refused, 'Pause').props.disabled, false, 'settled refusal must re-enable Pause');
    assert.match(text(refused), /The server refused pause\./);

    listener?.({ ...initial, bytesTransferred: 512, observedAt: '2026-08-26T00:00:01.000Z' });
    const refreshed = harness.render();
    assert.match(text(refreshed), /512 B of 1\.00 KiB/);
  } finally {
    harness.dispose();
  }
});
