/**
 * Support Tickets.
 *
 * The honesty tests outweigh the joke ones. A user who believes a real person is reading
 * their ticket will wait for a reply that is never coming, and that is the only genuinely
 * harmful thing this feature could do.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ENTRY_POINTS, FORBIDDEN_COPY_TERMS, MAX_DESCRIPTION_LENGTH, NO_NETWORK_DISCLOSURE,
  TICKET_CATEGORIES, TICKET_SEVERITIES, TICKET_STATUSES,
  advance, openTicket, resolutionFor, ticketNumber, validateTicket, type Ticket,
} from '../../app/renderer/src/support-tickets.ts';

const APPDATA = 'C:\\Users\\someone\\AppData\\Roaming\\ding-pbx-console';

const opened = (over: Partial<Parameters<typeof openTicket>[0]> = {}): Ticket => {
  const result = openTicket({
    category: 'Forgotten PIN or password', description: 'I cannot remember the PIN.',
    openedAt: '2026-08-23T10:00:00Z', draw: 0.5, ...over,
  });
  assert.ok(!('problems' in result), 'the fixture ticket was refused');
  return result;
};

/* --- the honesty ----------------------------------------------------------------- */

test('the no-network line is present and says all four things', () => {
  for (const claim of ['sent anywhere', 'only on this computer', 'no data is collected', 'nobody is reading it']) {
    assert.ok(NO_NETWORK_DISCLOSURE.includes(claim), `the disclosure omits "${claim}"`);
  }
});

test('the resolution carries the disclosure, so it appears where the user actually is', () => {
  assert.equal(resolutionFor(APPDATA).disclosure, NO_NETWORK_DISCLOSURE);
});

test('no copy impersonates a real desk or implies a person is coming', () => {
  /* Scanned rather than reviewed: the invented response time gets added later by
   * somebody making the joke better. */
  const resolution = resolutionFor(APPDATA);
  const copy = [
    opened().firstResponse, resolution.instructions, resolution.consequence,
    resolution.disclosure, NO_NETWORK_DISCLOSURE,
    ...validateTicket({ category: 'Something else', description: '' }).map((p) => p.message),
  ];
  for (const text of copy) {
    for (const term of FORBIDDEN_COPY_TERMS) {
      assert.ok(!text.toLowerCase().includes(term), `"${text}" contains "${term}"`);
    }
  }
});

test('the canned reply never claims a person wrote it', () => {
  const reply = opened().firstResponse.toLowerCase();
  for (const claim of ['i have', 'i will', 'my name', 'personally']) {
    assert.ok(!reply.includes(claim), `the canned reply claims a person: "${claim}"`);
  }
});

test('the ticket number is obviously fictional rather than resembling a real system', () => {
  assert.match(ticketNumber(0.5), /^DING-\d{6}$/u);
});

/* --- it opens, and never deletes -------------------------------------------------- */

test('the resolution opens the folder and does nothing else', () => {
  /* A literal rather than a boolean, because a field that could say delete-folder is a
   * field somebody eventually sets to it. Deletion is the user's own act. */
  assert.equal(resolutionFor(APPDATA).action, 'open-folder');
});

test('the module exposes no way to delete anything', () => {
  const surface = Object.keys({ advance, openTicket, resolutionFor, ticketNumber, validateTicket });
  for (const name of surface) {
    assert.ok(!/delete|remove|wipe|purge|clear/iu.test(name), `${name} looks like it deletes something`);
  }
});

test('the exact folder is named, and it is the one that will be opened', () => {
  /* "app data" gestured at is a folder nobody can find. */
  const resolution = resolutionFor(APPDATA);
  assert.equal(resolution.folderPath, APPDATA);
  assert.ok(resolution.instructions.includes(APPDATA), 'the path shown is not the path in the instructions');
});

test('the consequence says the reset clears every lock, not only the forgotten one', () => {
  const consequence = resolutionFor(APPDATA).consequence.toLowerCase();
  assert.ok(consequence.includes('every toy lock'));
  assert.ok(consequence.includes('settings'));
  assert.ok(consequence.includes('never security'), 'the reset is offered without restating that a toy lock is not security');
});

/* --- the form -------------------------------------------------------------------- */

test('a ticket opens with a number, a status and a canned reply', () => {
  const ticket = opened();
  assert.match(ticket.id, /^DING-/u);
  assert.equal(ticket.status, 'Open');
  assert.equal(ticket.severity, 'Normal');
  assert.ok(ticket.firstResponse.length > 20);
});

test('a chosen severity is kept, and every one is offered', () => {
  for (const severity of TICKET_SEVERITIES) {
    assert.equal(opened({ severity }).severity, severity);
  }
});

test('every category is accepted', () => {
  for (const category of TICKET_CATEGORIES) assert.deepEqual(validateTicket({ category, description: 'x' }), []);
});

test('an empty description is refused, and the refusal is in on the joke', () => {
  const problems = validateTicket({ category: 'Something else', description: '   ' });
  assert.equal(problems.length, 1);
  assert.match(problems[0].message, /Nobody will read it/u);
});

test('an over-long description is refused', () => {
  const problems = validateTicket({ category: 'Something else', description: 'x'.repeat(MAX_DESCRIPTION_LENGTH + 1) });
  assert.equal(problems.length, 1);
});

test('a refused ticket produces problems rather than a half-made ticket', () => {
  const result = openTicket({ category: 'Something else', description: '', openedAt: 'x', draw: 0 });
  assert.ok('problems' in result);
});

test('the description is trimmed rather than stored with its whitespace', () => {
  assert.equal(opened({ description: '  cannot remember  ' }).description, 'cannot remember');
});

/* --- status ---------------------------------------------------------------------- */

test('the status advances one step at a time', () => {
  let ticket = opened();
  for (const expected of TICKET_STATUSES.slice(1)) {
    ticket = advance(ticket);
    assert.equal(ticket.status, expected);
  }
});

test('the status stops at resolved rather than wrapping back to open', () => {
  let ticket = opened();
  for (let i = 0; i < 10; i += 1) ticket = advance(ticket);
  assert.equal(ticket.status, 'Resolved');
});

test('advancing leaves everything else about the ticket alone', () => {
  const ticket = opened();
  const next = advance(ticket);
  assert.equal(next.id, ticket.id);
  assert.equal(next.description, ticket.description);
  assert.equal(next.openedAt, ticket.openedAt);
});

/* --- reachability ----------------------------------------------------------------- */

test('all three entry points are declared, including the one a locked-out user meets', () => {
  /* Somebody who cannot get past the unlock prompt cannot reach Help. */
  assert.ok(ENTRY_POINTS.includes('unlock-prompt'));
  assert.ok(ENTRY_POINTS.includes('lock-setting'));
  assert.ok(ENTRY_POINTS.includes('help'));
});
