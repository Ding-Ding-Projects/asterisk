/**
 * Contract: the Support Tickets joke desk validates, numbers and advances a ticket the way
 * it claims to, never impersonates a real desk, and never actually opens the folder its own
 * copy promises to open.
 *
 * `support-tickets.ts` is pure and self-contained, so this plain `.mjs` file `import()`s it
 * directly through Node's built-in TypeScript type-stripping and calls the real
 * `openTicket` / `advance` / `resolutionFor` functions -- no reimplementation of the
 * ticket-number derivation that could quietly disagree with the original.
 *
 * The wiring section is where the copy makes a promise the code does not keep:
 * `resolutionFor`'s own instructions text says "This console will open it for you" -- and
 * nothing in App.tsx, the generated shell or the control plane ever opens a folder, an
 * explorer window, or anything else. `fileSupportTicket` shows the resolution text in a
 * dialog and stops there.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');

const tickets = await import('../../app/renderer/src/support-tickets.ts');

/* --- validation and the ticket itself -------------------------------------------------- */

test('validateTicket requires a real category and a non-empty, bounded description', () => {
  assert.deepEqual(tickets.validateTicket({ category: 'Something else', description: 'ok' }), []);
  assert.ok(tickets.validateTicket({ category: 'Not a category', description: 'ok' }).length > 0);
  assert.ok(tickets.validateTicket({ category: 'Something else', description: '   ' }).length > 0);
  assert.ok(tickets.validateTicket({
    category: 'Something else', description: 'x'.repeat(tickets.MAX_DESCRIPTION_LENGTH + 1),
  }).length > 0);
  assert.deepEqual(tickets.validateTicket({
    category: 'Something else', description: 'x'.repeat(tickets.MAX_DESCRIPTION_LENGTH),
  }), [], 'exactly at the cap must still be accepted');
});

test('ticketNumber is deterministic from its draw and always carries the fictional DING- prefix', () => {
  assert.equal(tickets.ticketNumber(0), 'DING-100000');
  assert.match(tickets.ticketNumber(0.5), /^DING-\d{6}$/);
  assert.equal(tickets.ticketNumber(NaN), tickets.ticketNumber(0), 'a non-finite draw is treated as 0, never thrown on');
});

test('openTicket refuses an invalid draft and returns problems rather than a half-filed ticket', () => {
  const result = tickets.openTicket({ category: 'nonsense', description: '', openedAt: 'x', draw: 0 });
  assert.ok('problems' in result);
});

test('openTicket produces an Open ticket with the canned first response, defaulting severity to Normal', () => {
  const result = tickets.openTicket({
    category: 'Forgotten PIN or password', description: 'Locked out.', openedAt: '2026-01-01T00:00:00Z', draw: 0.25,
  });
  assert.ok(!('problems' in result));
  assert.equal(result.status, 'Open');
  assert.equal(result.severity, 'Normal');
  assert.match(result.id, /^DING-\d{6}$/);
  assert.ok(result.firstResponse.length > 0);
});

test('advance moves one status step forward and stops at Resolved rather than wrapping around', () => {
  let ticket = { status: 'Open' };
  ticket = tickets.advance(ticket);
  assert.equal(ticket.status, 'Triaged');
  ticket = tickets.advance(ticket);
  assert.equal(ticket.status, 'Awaiting customer');
  ticket = tickets.advance(ticket);
  assert.equal(ticket.status, 'Resolved');
  ticket = tickets.advance(ticket);
  assert.equal(ticket.status, 'Resolved', 'must not wrap back to Open');
});

/* --- the resolution: opens (in words), never deletes ------------------------------------ */

test('resolutionFor names the exact folder, states the action as "open-folder" literally, and never deletes', () => {
  const resolution = tickets.resolutionFor('C:\\Users\\test\\AppData\\Roaming\\DingPBX');
  assert.equal(resolution.action, 'open-folder');
  assert.equal(resolution.folderPath, 'C:\\Users\\test\\AppData\\Roaming\\DingPBX');
  assert.match(resolution.instructions, /delete this folder yourself/);
  assert.match(resolution.instructions, /This console will open it for you/);
});

test('the no-network disclosure is a fixed constant, identical to what resolutionFor reports back', () => {
  assert.equal(tickets.resolutionFor('X').disclosure, tickets.NO_NETWORK_DISCLOSURE);
  assert.match(tickets.NO_NETWORK_DISCLOSURE, /Nothing here is sent anywhere/);
  assert.match(tickets.NO_NETWORK_DISCLOSURE, /nobody is reading it/);
});

test('the consequence line states plainly that this is a full toy-lock reset, not a narrow fix', () => {
  assert.match(tickets.resolutionFor('X').consequence, /clears every toy lock on this machine/);
  assert.match(tickets.resolutionFor('X').consequence, /Toy locks were never security/);
});

/* --- never impersonates a real desk ----------------------------------------------------- */

test('ENTRY_POINTS names all three required reachable places', () => {
  assert.deepEqual([...tickets.ENTRY_POINTS].sort(), ['help', 'lock-setting', 'unlock-prompt']);
});

test('none of this feature\'s own copy contains a forbidden term', () => {
  const copy = [
    tickets.NO_NETWORK_DISCLOSURE,
    tickets.openTicket({ category: 'Something else', description: 'x', openedAt: 'x', draw: 0 }).firstResponse,
    ...Object.values(tickets.resolutionFor('C:/data')),
  ].join(' ').toLowerCase();
  for (const term of tickets.FORBIDDEN_COPY_TERMS) {
    assert.ok(!copy.includes(term), `the copy contains the forbidden term "${term}"`);
  }
});

/* --- wiring: App.tsx really files a ticket and shows the resolution -------------------- */

const app = read('app/renderer/src/App.tsx');
const generated = read('app/renderer/src/generated/console.tsx');

test('App uses the real module, and the ticket flow opens then resolves', () => {
  /* The import assertion no longer pins an exact symbol list. It did, and broke when a
   * type was legitimately added beside the values -- the fourth time in this repository a
   * whole-list assertion has failed on an addition rather than a defect. The arity was
   * never the point: what matters is that the real module is used, not a local copy.
   *
   * `resolutionFor` also moved out of fileSupportTicket into the helper that actually
   * opens the folder, which is where it belongs now that opening is real. So it is
   * asserted against the file rather than that one method body. */
  assert.match(app, /^import \{[^}]*\bopenTicket\b[^}]*\} from '\.\/support-tickets';$/m,
    'App no longer imports openTicket from the real support-tickets module');
  assert.match(app, /^import \{[^}]*\bresolutionFor\b[^}]*\} from '\.\/support-tickets';$/m,
    'App no longer imports resolutionFor from the real support-tickets module');
  const start = app.indexOf('private fileSupportTicket(): void {');
  assert.ok(start > 0, 'fileSupportTicket has been renamed or removed');
  const body = app.slice(start, app.indexOf('\n  }', start));
  assert.match(body, /const result = openTicket\(\{/, 'the ticket flow no longer opens a ticket');
  assert.match(app, /resolutionFor\(IDENTITY\.dataDirectory\)/,
    'nothing resolves the ticket against the real data directory any more');
});

test('sup_open is wired to fileSupportTicket, and the design offers a category, description, severity and the open action', () => {
  assert.match(app, /control\?\.id === 'sup_open' && value === true/);
  for (const id of ['sup_category', 'sup_description', 'sup_severity', 'sup_open']) {
    assert.match(generated, new RegExp(`ctl\\('${id}',`), `${id} is missing from the design`);
  }
});

/* --- PIN: the promised folder-open never actually happens ------------------------------ */

test('fileSupportTicket actually opens the folder its own copy promises', () => {
  /* This replaces a pin that documented a broken promise: the resolution text said "This
   * console will open it for you" and nothing in the method opened anything. Copy that
   * promises an action the code never performs is worse than no copy, because the user
   * waits for something that was never coming. The pin fired when the action landed.
   *
   * It asserts the call, not the absence. What it must never assert is that anything is
   * deleted here -- the whole design is that the console opens the folder and the person
   * deletes it themselves, in their own file manager. */
  const start = app.indexOf('private fileSupportTicket(): void {');
  assert.ok(start > 0, 'fileSupportTicket has been renamed or removed');
  const body = app.slice(start, app.indexOf('\n  }', start));
  assert.match(body, /this\.openSupportTicketFolder\(/,
    'fileSupportTicket no longer reaches the folder-open path, so its own copy promises something it does not do');
  assert.doesNotMatch(body, /\brm\b|unlink|rmdir|deleteFolder/i,
    'fileSupportTicket now deletes something -- the user does the deleting, in their own file manager');
});

test('PIN: nothing in the control plane ever opens a folder for a support ticket -- action:"open-folder" is inert data', () => {
  const controlPlaneFiles = [
    read('control-plane/dispatch.ts'),
  ].join('\n');
  assert.doesNotMatch(controlPlaneFiles, /open-folder|openPath|showItemInFolder/i,
    'the control plane now handles an open-folder action -- update this pin and the report if this gap has been closed');
});
