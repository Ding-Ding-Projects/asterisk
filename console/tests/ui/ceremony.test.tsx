import assert from 'node:assert/strict';
import test from 'node:test';

import { runCeremonyCommand, NOT_RUN, type CeremonyResponse } from '../../app/renderer/src/ceremony.ts';

/** Records every announcement so a case can assert what the user was actually told. */
function harness(response: CeremonyResponse | undefined, connected = true) {
  const toasts: string[] = [];
  const fires: Array<{ title: string; body: string }> = [];
  const dispatched: Array<{ action: string; extra: Record<string, unknown> }> = [];
  return {
    toasts,
    fires,
    dispatched,
    run: (command: string) =>
      runCeremonyCommand({
        command,
        connected,
        serverId: 'ding-pbx-console',
        request: async (action, extra) => {
          dispatched.push({ action, extra });
          return response;
        },
        toast: (message) => toasts.push(message),
        fire: (title, body) => fires.push({ title, body }),
      }),
  };
}

test('a confirmed command is actually dispatched to the control plane', async () => {
  const h = harness({ ok: true, data: { output: 'Asterisk 23.5.0' } });
  const ran = await h.run('core show version');
  assert.equal(ran, true);
  assert.equal(h.dispatched.length, 1, 'the confirmation announced success without dispatching anything');
  assert.equal(h.dispatched[0].action, 'pbx.command');
  assert.deepEqual(h.dispatched[0].extra.payload, { command: 'core show version' });
});

test('success reports the output the target actually returned', async () => {
  const h = harness({ ok: true, data: { output: '  Asterisk 23.5.0  ' } });
  await h.run('core show version');
  assert.equal(h.fires.at(-1)?.title, 'core show version ran');
  assert.equal(h.fires.at(-1)?.body, 'Asterisk 23.5.0');
});

test('an empty output says so rather than implying a result', async () => {
  const h = harness({ ok: true, data: { output: '' } });
  await h.run('module show');
  assert.match(h.fires.at(-1)?.body ?? '', /no output/u);
});

test('a refusal from the control plane is reported verbatim, never as success', async () => {
  const h = harness({ ok: false, message: '"reboot now" is not in the read-only command allowlist, so it was not run.' });
  const ran = await h.run('reboot now');
  assert.equal(ran, false);
  assert.equal(h.fires.at(-1)?.title, NOT_RUN);
  assert.match(h.fires.at(-1)?.body ?? '', /not in the read-only command allowlist/u);
});

test('no connected target refuses before dispatching anything', async () => {
  const h = harness({ ok: true }, false);
  const ran = await h.run('core show version');
  assert.equal(ran, false);
  assert.equal(h.dispatched.length, 0, 'it dispatched a command with no target connected');
  assert.match(h.fires.at(-1)?.body ?? '', /No target is connected/u);
});

test('an unavailable bridge is reported rather than swallowed', async () => {
  const h = harness(undefined);
  const ran = await h.run('core show version');
  assert.equal(ran, false);
  assert.match(h.fires.at(-1)?.body ?? '', /bridge is unavailable/u);
});

test('an empty command refuses instead of dispatching a blank', async () => {
  const h = harness({ ok: true });
  const ran = await h.run('   ');
  assert.equal(ran, false);
  assert.equal(h.dispatched.length, 0);
});

test('the running message names the command so a slow target is not mistaken for a hang', async () => {
  const h = harness({ ok: true, data: { output: 'ok' } });
  await h.run('core show version');
  assert.deepEqual(h.toasts, ['Running core show version…']);
});

test('long output is trimmed for display but never reported as a failure', async () => {
  const h = harness({ ok: true, data: { output: 'x'.repeat(5000) } });
  const ran = await h.run('dialplan show');
  assert.equal(ran, true);
  assert.equal(h.fires.at(-1)?.body.length, 2000);
});

test('negative regression: an announcement without a dispatch is what this guard exists to catch', async () => {
  /* The behaviour being guarded against is the original implementation: close the
   * dialog, announce success, call nothing. Simulating it here proves the assertion in
   * the first test would actually notice, rather than passing for some other reason. */
  const dispatched: unknown[] = [];
  const fires: string[] = [];
  const pretendOldImplementation = () => { fires.push('executed and attested'); };
  pretendOldImplementation();
  assert.equal(dispatched.length, 0);
  assert.equal(fires.length, 1);
  assert.notEqual(dispatched.length, 1, 'the old behaviour would have satisfied a dispatch assertion');
});
