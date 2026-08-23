import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clockWarning,
  decodeBase32,
  encodeBase32,
  generateCode,
  pairingUri,
  parsePairingUri,
  secondsRemaining,
  verifyCode,
} from '../../app/renderer/src/totp.ts';

// ---------------------------------------------------------------- RFC 6238 vectors
//
// Published test vectors use the ASCII seed "12345678901234567890" repeated to
// the required byte length per algorithm, and produce 8-digit codes at a 30s
// period. https://www.rfc-editor.org/rfc/rfc6238#appendix-B

function seedBase32(length: 20 | 32 | 64): string {
  const base = '12345678901234567890';
  let ascii = '';
  while (ascii.length < length) {
    ascii += base;
  }
  ascii = ascii.slice(0, length);
  const bytes = new Uint8Array(ascii.split('').map((ch) => ch.charCodeAt(0)));
  return encodeBase32(bytes);
}

const SHA1_SECRET = seedBase32(20);
const SHA256_SECRET = seedBase32(32);
const SHA512_SECRET = seedBase32(64);

const VECTORS: Array<{ atMs: number; sha1: string; sha256: string; sha512: string }> = [
  { atMs: 59 * 1000, sha1: '94287082', sha256: '46119246', sha512: '90693936' },
  { atMs: 1111111109 * 1000, sha1: '07081804', sha256: '68084774', sha512: '25091201' },
  { atMs: 1111111111 * 1000, sha1: '14050471', sha256: '67062674', sha512: '99943326' },
  { atMs: 1234567890 * 1000, sha1: '89005924', sha256: '91819424', sha512: '93441116' },
  { atMs: 2000000000 * 1000, sha1: '69279037', sha256: '90698825', sha512: '38618901' },
  { atMs: 20000000000 * 1000, sha1: '65353130', sha256: '77737706', sha512: '47863826' },
];

for (const vector of VECTORS) {
  test(`RFC 6238 SHA-1 vector at ${vector.atMs}ms`, async () => {
    const code = await generateCode({ secret: SHA1_SECRET, algorithm: 'SHA-1', digits: 8, period: 30 }, vector.atMs);
    assert.equal(code, vector.sha1);
  });

  test(`RFC 6238 SHA-256 vector at ${vector.atMs}ms`, async () => {
    const code = await generateCode({ secret: SHA256_SECRET, algorithm: 'SHA-256', digits: 8, period: 30 }, vector.atMs);
    assert.equal(code, vector.sha256);
  });

  test(`RFC 6238 SHA-512 vector at ${vector.atMs}ms`, async () => {
    const code = await generateCode({ secret: SHA512_SECRET, algorithm: 'SHA-512', digits: 8, period: 30 }, vector.atMs);
    assert.equal(code, vector.sha512);
  });
}

// ---------------------------------------------------------------- base32

test('base32 round trip preserves arbitrary bytes', () => {
  const bytes = new Uint8Array([0, 1, 2, 255, 254, 128, 17, 33]);
  assert.deepEqual(decodeBase32(encodeBase32(bytes)), bytes);
});

test('base32 decode tolerates spaces and missing padding', () => {
  const spaced = decodeBase32('JBSW Y3DP EHPK 3PXP');
  const compact = decodeBase32('JBSWY3DPEHPK3PXP');
  assert.deepEqual(spaced, compact);
});

test('base32 decode rejects a bad character by name', () => {
  assert.throws(() => decodeBase32('JBSWY3DP1'), /invalid base32 character: 1/);
});

test('base32 decode is case-insensitive', () => {
  assert.deepEqual(decodeBase32('jbswy3dp'), decodeBase32('JBSWY3DP'));
});

// ---------------------------------------------------------------- digit widths

test('generateCode produces 6, 7 and 8 digit output on request', async () => {
  const secret = SHA1_SECRET;
  const atMs = 59 * 1000;
  assert.equal((await generateCode({ secret, digits: 6 }, atMs)).length, 6);
  assert.equal((await generateCode({ secret, digits: 7 }, atMs)).length, 7);
  assert.equal((await generateCode({ secret, digits: 8 }, atMs)).length, 8);
});

// ---------------------------------------------------------------- period / secondsRemaining

test('secondsRemaining counts down within a period and wraps at the boundary', () => {
  assert.equal(secondsRemaining(30, 0), 30);
  assert.equal(secondsRemaining(30, 1000), 29);
  assert.equal(secondsRemaining(30, 29000), 1);
  assert.equal(secondsRemaining(30, 30000), 30);
});

test('generateCode changes exactly at a period boundary', async () => {
  const secret = SHA1_SECRET;
  const before = await generateCode({ secret, digits: 6, period: 30 }, 29999);
  const at = await generateCode({ secret, digits: 6, period: 30 }, 30000);
  const justBefore = await generateCode({ secret, digits: 6, period: 30 }, 29000);
  assert.equal(before, justBefore);
  assert.notEqual(before, at);
});

// ---------------------------------------------------------------- verifyCode

test('verifyCode accepts the code for the current step', async () => {
  const params = { secret: SHA1_SECRET, digits: 6, period: 30 };
  const atMs = 1000000;
  const code = await generateCode(params, atMs);
  assert.equal(await verifyCode(params, code, atMs), true);
});

test('verifyCode accepts one step of skew when allowed and refuses it when not', async () => {
  const params = { secret: SHA1_SECRET, digits: 6, period: 30 };
  const atMs = 1000000;
  const nextStepMs = atMs + 30000;
  const code = await generateCode(params, atMs);
  assert.equal(await verifyCode(params, code, nextStepMs, 1), true);
  assert.equal(await verifyCode(params, code, nextStepMs, 0), false);
});

test('verifyCode refuses a code of the wrong length', async () => {
  const params = { secret: SHA1_SECRET, digits: 6, period: 30 };
  assert.equal(await verifyCode(params, '12345', 0), false);
  assert.equal(await verifyCode(params, '1234567', 0), false);
  assert.equal(await verifyCode(params, 'abcdef', 0), false);
});

// ---------------------------------------------------------------- pairing URI

test('pairingUri and parsePairingUri round trip exactly', () => {
  const request = {
    issuer: 'Asterisk PBX',
    account: 'ops: primary',
    parameters: { secret: SHA1_SECRET, algorithm: 'SHA-256' as const, digits: 7, period: 45 },
  };
  const uri = pairingUri(request);
  assert.match(uri, /^otpauth:\/\/totp\//);
  const parsed = parsePairingUri(uri);
  assert.equal(parsed.issuer, request.issuer);
  assert.equal(parsed.account, request.account);
  assert.equal(parsed.parameters.secret, request.parameters.secret);
  assert.equal(parsed.parameters.algorithm, request.parameters.algorithm);
  assert.equal(parsed.parameters.digits, request.parameters.digits);
  assert.equal(parsed.parameters.period, request.parameters.period);
});

test('pairingUri defaults algorithm/digits/period when unset and round trips them', () => {
  const uri = pairingUri({ issuer: 'Asterisk', account: 'user@example.com', parameters: { secret: SHA1_SECRET } });
  const parsed = parsePairingUri(uri);
  assert.equal(parsed.parameters.algorithm, 'SHA-1');
  assert.equal(parsed.parameters.digits, 6);
  assert.equal(parsed.parameters.period, 30);
});

// ---------------------------------------------------------------- bounds

test('generateCode rejects digit counts outside 6..8 by name', async () => {
  await assert.rejects(() => generateCode({ secret: SHA1_SECRET, digits: 5 }, 0), /digits must be an integer between 6 and 8/);
  await assert.rejects(() => generateCode({ secret: SHA1_SECRET, digits: 9 }, 0), /digits must be an integer between 6 and 8/);
});

test('generateCode rejects a period below 1 by name', async () => {
  await assert.rejects(() => generateCode({ secret: SHA1_SECRET, period: 0 }, 0), /period must be a positive integer/);
  await assert.rejects(() => generateCode({ secret: SHA1_SECRET, period: -1 }, 0), /period must be a positive integer/);
});

test('generateCode rejects an empty secret by name', async () => {
  await assert.rejects(() => generateCode({ secret: '' }, 0), /secret must not be empty/);
  await assert.rejects(() => generateCode({ secret: '   ' }, 0), /secret must not be empty/);
});

// ---------------------------------------------------------------- clockWarning

test('clockWarning returns undefined when within tolerance', () => {
  assert.equal(clockWarning(0, 30), undefined);
  assert.equal(clockWarning(15000, 30), undefined);
  assert.equal(clockWarning(-30000, 30), undefined);
});

test('clockWarning names the drift when outside tolerance', () => {
  const message = clockWarning(120000, 30);
  assert.equal(typeof message, 'string');
  assert.match(message as string, /120s ahead of/);
  const behind = clockWarning(-90000, 30);
  assert.match(behind as string, /90s behind/);
});
