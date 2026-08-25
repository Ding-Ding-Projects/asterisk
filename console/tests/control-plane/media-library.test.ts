import test from 'node:test';
import assert from 'node:assert/strict';
import { MediaLibrary, MEDIA_ROOTS, usableName } from '../../control-plane/media-library.js';
import type { CommandRequest, CommandResult, ProcessExecutor } from '../../control-plane/executor.js';

class FakeExecutor implements ProcessExecutor {
  readonly calls: CommandRequest[] = [];
  constructor(private readonly script: (request: CommandRequest) => Partial<CommandResult>) {}
  async execute(request: CommandRequest): Promise<CommandResult> {
    this.calls.push(request);
    return { status: 'succeeded', exitCode: 0, stdout: '', stderr: '', durationMs: 1, ...this.script(request) };
  }
}

const verb = (r: CommandRequest) => r.args[3];
const build = (script: (request: CommandRequest) => Partial<CommandResult>) => {
  const executor = new FakeExecutor(script);
  const library = new MediaLibrary({
    executor,
    distribution: 'ding-pbx-console',
    now: () => new Date('2026-08-23T01:02:03.000Z'),
  });
  return { executor, library };
};

/* A minimal well-formed RIFF/WAVE header, base64-encoded, so "the bytes actually look like
 * the extension claims" tests have something real to check against. */
const WAV_BYTES = Buffer.concat([
  Buffer.from('RIFF', 'ascii'),
  Buffer.from([0, 0, 0, 0]),
  Buffer.from('WAVE', 'ascii'),
  Buffer.from('extra data to be a plausible file', 'ascii'),
]);
const WAV_B64 = WAV_BYTES.toString('base64');

const OGG_BYTES = Buffer.concat([Buffer.from('OggS', 'ascii'), Buffer.from('rest of an ogg page', 'ascii')]);
const OGG_B64 = OGG_BYTES.toString('base64');

const NOT_WAV_B64 = Buffer.from('this is definitely not a wav file at all', 'ascii').toString('base64');
const NOT_OGG_B64 = Buffer.from('this is definitely not an ogg file at all', 'ascii').toString('base64');

const RAW_BYTES = Buffer.from('a'.repeat(500), 'ascii');
const RAW_B64 = RAW_BYTES.toString('base64');

// ---------------------------------------------------------------------------------------
// usableName: every rejected shape, each independently verifiable with zero side effects.
// ---------------------------------------------------------------------------------------

test('usableName accepts an ordinary filename with an allowed extension', () => {
  assert.equal(usableName('welcome.wav'), 'wav');
  assert.equal(usableName('hold-music_01.mp3'.replace('mp3', 'gsm')), 'gsm');
});

test('usableName rejects a path traversal segment', () => {
  assert.equal(usableName('../../etc/passwd.wav'), undefined);
  assert.equal(usableName('..wav'), undefined);
});

test('usableName rejects a forward slash', () => {
  assert.equal(usableName('sub/dir.wav'), undefined);
});

test('usableName rejects a backslash', () => {
  assert.equal(usableName('sub\\dir.wav'), undefined);
});

test('usableName rejects a leading dot (hidden file)', () => {
  assert.equal(usableName('.hidden.wav'), undefined);
});

test('usableName rejects a colon', () => {
  assert.equal(usableName('c:file.wav'), undefined);
});

test('usableName rejects a null byte', () => {
  assert.equal(usableName('greeting.wav\0.sh'), undefined);
});

test('usableName rejects an unusual character', () => {
  assert.equal(usableName('greeting;rm -rf.wav'), undefined);
  assert.equal(usableName('greeting$(whoami).wav'), undefined);
  assert.equal(usableName('greeting file.wav'), undefined, 'a space is not in the allowed character set');
});

test('usableName rejects an empty name', () => {
  assert.equal(usableName(''), undefined);
});

test('usableName rejects a name over 128 characters', () => {
  assert.equal(usableName(`${'a'.repeat(125)}.wav`), undefined);
  assert.equal(usableName(`${'a'.repeat(120)}.wav`), 'wav');
});

test('usableName rejects a name with no extension', () => {
  assert.equal(usableName('greeting'), undefined);
  assert.equal(usableName('greeting.'), undefined);
});

// ---------------------------------------------------------------------------------------
// usableName: every extension, accepted and rejected.
// ---------------------------------------------------------------------------------------

for (const extension of ['wav', 'WAV', 'gsm', 'ulaw', 'alaw', 'g722', 'sln', 'sln16', 'ogg', 'opus']) {
  test(`usableName accepts the .${extension} extension`, () => {
    assert.equal(usableName(`file.${extension}`), extension.toLowerCase());
  });
}

for (const extension of ['mp3', 'exe', 'sh', 'txt', 'conf', 'php', 'wav.sh']) {
  test(`usableName rejects the .${extension} extension`, () => {
    assert.equal(usableName(`file.${extension}`), undefined);
  });
}

// ---------------------------------------------------------------------------------------
// Every rejected name shape asserts zero executor calls when reaching upload/remove.
// ---------------------------------------------------------------------------------------

const BAD_NAMES = ['../evil.wav', 'a/b.wav', 'a\\b.wav', '.hidden.wav', 'c:file.wav', '', `${'a'.repeat(200)}.wav`, 'file.exe'];

for (const bad of BAD_NAMES) {
  test(`upload refuses "${bad}" before running any command`, async () => {
    const { executor, library } = build(() => ({}));
    await assert.rejects(() => library.upload('prompts', bad, WAV_B64), /not a usable media filename/u);
    assert.equal(executor.calls.length, 0);
  });

  test(`remove refuses "${bad}" before running any command`, async () => {
    const { executor, library } = build(() => ({}));
    await assert.rejects(() => library.remove('prompts', bad), /not a usable media filename/u);
    assert.equal(executor.calls.length, 0);
  });
}

// ---------------------------------------------------------------------------------------
// Content validation: signature-checked formats.
// ---------------------------------------------------------------------------------------

test('upload refuses a .wav whose bytes are not a RIFF/WAVE header', async () => {
  const { executor, library } = build(() => ({}));
  await assert.rejects(() => library.upload('prompts', 'fake.wav', NOT_WAV_B64), /do not look like a RIFF\/WAVE header/u);
  assert.equal(executor.calls.length, 0, 'content was rejected before any command ran');
});

test('upload accepts a .wav whose bytes really are RIFF/WAVE', async () => {
  const { library } = build((r) => (verb(r) === 'stat' ? { stdout: String(WAV_BYTES.length) } : {}));
  const file = await library.upload('prompts', 'real.wav', WAV_B64);
  assert.equal(file.extension, 'wav');
  assert.equal(file.bytes, WAV_BYTES.length);
});

test('upload refuses an .ogg whose bytes are not an OggS header', async () => {
  const { executor, library } = build(() => ({}));
  await assert.rejects(() => library.upload('prompts', 'fake.ogg', NOT_OGG_B64), /do not look like an OggS header/u);
  assert.equal(executor.calls.length, 0);
});

test('upload accepts an .opus whose bytes really are OggS', async () => {
  const { library } = build((r) => (verb(r) === 'stat' ? { stdout: String(OGG_BYTES.length) } : {}));
  const file = await library.upload('prompts', 'real.opus', OGG_B64);
  assert.equal(file.extension, 'opus');
});

// ---------------------------------------------------------------------------------------
// Content validation: headerless raw formats. Accepted without a signature check, but
// still bounded by size, exactly as the honesty requirement asks for.
// ---------------------------------------------------------------------------------------

for (const extension of ['gsm', 'ulaw', 'alaw', 'g722', 'sln', 'sln16']) {
  test(`upload accepts a plausible .${extension} with no signature to check`, async () => {
    const { library } = build((r) => (verb(r) === 'stat' ? { stdout: String(RAW_BYTES.length) } : {}));
    const file = await library.upload('prompts', `raw.${extension}`, RAW_B64);
    assert.equal(file.extension, extension);
  });

  test(`upload refuses an empty .${extension}`, async () => {
    const { executor, library } = build(() => ({}));
    await assert.rejects(() => library.upload('prompts', `empty.${extension}`, ''), /is empty/u);
    assert.equal(executor.calls.length, 0);
  });
}

// ---------------------------------------------------------------------------------------
// Size bound.
// ---------------------------------------------------------------------------------------

test('upload refuses a file over the 10 MB bound and names the real size', async () => {
  const { executor, library } = build(() => ({}));
  const big = Buffer.alloc(10 * 1024 * 1024 + 1, 0x61).toString('base64');
  await assert.rejects(
    () => library.upload('prompts', 'huge.gsm', big),
    /10485761 bytes, over the 10485760-byte limit/u,
  );
  assert.equal(executor.calls.length, 0);
});

test('upload refuses an empty file', async () => {
  const { executor, library } = build(() => ({}));
  await assert.rejects(() => library.upload('prompts', 'empty.wav', ''), /is empty/u);
  assert.equal(executor.calls.length, 0);
});

// ---------------------------------------------------------------------------------------
// Transport: content on standard input, never as an argument.
// ---------------------------------------------------------------------------------------

test('a successful upload sends the file content on standard input, never in an argument', async () => {
  const { executor, library } = build((r) => (verb(r) === 'stat' ? { stdout: String(WAV_BYTES.length) } : {}));
  await library.upload('prompts', 'welcome.wav', WAV_B64);

  const decode = executor.calls.find((c) => verb(c) === 'base64');
  assert.ok(decode, 'expected a base64 -d command');
  assert.equal(decode?.input, WAV_B64);
  for (const call of executor.calls) {
    for (const arg of call.args) assert.ok(!arg.includes(WAV_B64), 'file content leaked into an argument');
  }
});

test('upload writes into the correct root and creates it first', async () => {
  const { executor, library } = build((r) => (verb(r) === 'stat' ? { stdout: String(WAV_BYTES.length) } : {}));
  await library.upload('musicOnHold', 'welcome.wav', WAV_B64);
  const mkdir = executor.calls.find((c) => verb(c) === 'mkdir');
  assert.ok(mkdir?.args.includes(MEDIA_ROOTS.musicOnHold));
  const decode = executor.calls.find((c) => verb(c) === 'base64');
  assert.ok(decode?.args.includes(`${MEDIA_ROOTS.musicOnHold}/welcome.wav`));
});

// ---------------------------------------------------------------------------------------
// Post-write verification.
// ---------------------------------------------------------------------------------------

test('a post-write size mismatch is reported as failure, not success', async () => {
  const { library } = build((r) => (verb(r) === 'stat' ? { stdout: '3' } : {}));
  await assert.rejects(() => library.upload('prompts', 'welcome.wav', WAV_B64), /landed as 3 bytes but .* were sent/u);
});

test('a file that never landed is reported as failure', async () => {
  const { library } = build((r) => (verb(r) === 'stat' ? { status: 'failed', exitCode: 1, stderr: 'no such file' } : {}));
  await assert.rejects(() => library.upload('prompts', 'welcome.wav', WAV_B64), /did not land on the target/u);
});

// ---------------------------------------------------------------------------------------
// list
// ---------------------------------------------------------------------------------------

test('list on an absent directory returns an empty list, not an error', async () => {
  const { library } = build((r) => (verb(r) === 'test' ? { status: 'failed', exitCode: 1 } : {}));
  const files = await library.list('musicOnHold', 'jazz');
  assert.deepEqual(files, []);
});

test('list parses size and name pairs from the real directory', async () => {
  const { library } = build((r) => {
    if (verb(r) === 'test') return {};
    if (verb(r) === 'find') return { stdout: '1234\twelcome.wav\n5\tignored.exe\n999\tqueue-hold.gsm\n' };
    return {};
  });
  const files = await library.list('prompts');
  assert.deepEqual(
    files.map((f) => [f.name, f.bytes, f.extension]),
    [['welcome.wav', 1234, 'wav'], ['queue-hold.gsm', 999, 'gsm']],
  );
});

test('list of a music-on-hold class reads the named subdirectory', async () => {
  const { executor, library } = build((r) => (verb(r) === 'find' ? { stdout: '' } : {}));
  await library.list('musicOnHold', 'jazz');
  const find = executor.calls.find((c) => verb(c) === 'find');
  assert.ok(find?.args.includes(`${MEDIA_ROOTS.musicOnHold}/jazz`));
});

test('list refuses an unusable subdirectory name before running anything', async () => {
  const { executor, library } = build(() => ({}));
  await assert.rejects(() => library.list('musicOnHold', '../etc'), /not a usable directory name/u);
  assert.equal(executor.calls.length, 0);
});

// ---------------------------------------------------------------------------------------
// remove
// ---------------------------------------------------------------------------------------

test('remove deletes the named file from the correct root', async () => {
  const { executor, library } = build(() => ({}));
  const result = await library.remove('prompts', 'welcome.wav');
  assert.equal(result.removed, true);
  const rm = executor.calls.find((c) => verb(c) === 'rm');
  assert.ok(rm?.args.includes(`${MEDIA_ROOTS.prompts}/welcome.wav`));
});

test('remove cannot be pointed outside the media roots by any accepted name', async () => {
  const { executor, library } = build(() => ({}));
  await library.remove('prompts', 'welcome.wav');
  for (const call of executor.calls) {
    for (const arg of call.args) {
      assert.ok(!arg.includes('..'), 'a traversal segment reached a command argument');
    }
  }
});

// ---------------------------------------------------------------------------------------
// read — the "audition" action's own transport, added for the Sound prompts screen.
// ---------------------------------------------------------------------------------------

for (const bad of BAD_NAMES) {
  test(`read refuses "${bad}" before running any command`, async () => {
    const { executor, library } = build(() => ({}));
    await assert.rejects(() => library.read('prompts', bad), /not a usable media filename/u);
    assert.equal(executor.calls.length, 0);
  });
}

test('read returns the base64 content of a file that really is there', async () => {
  const { executor, library } = build((r) => {
    if (verb(r) === 'stat') return { stdout: String(WAV_BYTES.length) };
    if (verb(r) === 'base64') return { stdout: `${WAV_B64}\n` };
    return {};
  });
  const file = await library.read('prompts', 'welcome.wav');
  assert.equal(file.name, 'welcome.wav');
  assert.equal(file.path, `${MEDIA_ROOTS.prompts}/welcome.wav`);
  assert.equal(file.extension, 'wav');
  assert.equal(file.bytes, WAV_BYTES.length);
  /* Trailing newline from the target's own `base64` output is stripped, so the caller
   * gets exactly the alphabet back and never has to know the transport added one. */
  assert.equal(file.contentBase64, WAV_B64);
  const encode = executor.calls.find((c) => verb(c) === 'base64');
  assert.deepEqual(encode?.args.slice(3), ['base64', '-w', '0', `${MEDIA_ROOTS.prompts}/welcome.wav`]);
});

test('read refuses a file that is not there rather than returning empty content', async () => {
  const { library } = build((r) => (verb(r) === 'stat' ? { status: 'failed', exitCode: 1, stderr: 'no such file' } : {}));
  await assert.rejects(() => library.read('prompts', 'missing.wav'), /was not found in this media root/u);
});

test('read refuses a file over the same bound upload enforces, without reading its bytes', async () => {
  const { executor, library } = build((r) => (verb(r) === 'stat' ? { stdout: String(10 * 1024 * 1024 + 1) } : {}));
  await assert.rejects(() => library.read('prompts', 'huge.gsm'), /10485761 bytes, over the 10485760-byte limit/u);
  assert.equal(executor.calls.some((c) => verb(c) === 'base64'), false, 'the oversized file was read anyway');
});

// ---------------------------------------------------------------------------------------
// Errors from the target surface verbatim.
// ---------------------------------------------------------------------------------------

test("a failing command surfaces the target's own stderr rather than a generic message", async () => {
  const { library } = build(() => ({ status: 'failed', exitCode: 1, stderr: 'Permission denied' }));
  await assert.rejects(() => library.remove('prompts', 'welcome.wav'), /Permission denied/u);
});

// ---------------------------------------------------------------------------------------
// Command allowlist / no shell metacharacters sweep.
// ---------------------------------------------------------------------------------------

test('every command uses the allowlisted executable with no shell metacharacters', async () => {
  const { executor, library } = build((r) => {
    if (verb(r) === 'stat') return { stdout: String(WAV_BYTES.length) };
    if (verb(r) === 'test') return {};
    if (verb(r) === 'find') return { stdout: '10\tfile.wav\n' };
    if (verb(r) === 'base64' && r.args.includes('-w')) return { stdout: `${WAV_B64}\n` };
    return {};
  });
  await library.upload('prompts', 'welcome.wav', WAV_B64);
  await library.list('prompts');
  await library.read('prompts', 'welcome.wav');
  await library.remove('prompts', 'welcome.wav');

  assert.ok(executor.calls.length > 0);
  for (const call of executor.calls) {
    assert.equal(call.executable, 'wsl.exe');
    for (const arg of call.args) {
      assert.ok(!/[&|;><`$]/u.test(arg), `argument carries shell metacharacters: ${arg}`);
    }
  }
});

test('an unknown media root is refused before any command runs', async () => {
  const { executor, library } = build(() => ({}));
  // @ts-expect-error deliberately passing an invalid root to prove it is rejected at runtime
  await assert.rejects(() => library.list('ringtones'), /not a media root/u);
  assert.equal(executor.calls.length, 0);
});
