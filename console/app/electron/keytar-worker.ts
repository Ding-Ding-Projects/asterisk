import * as keytar from 'keytar';

type WorkerRequest = {
  operation: 'set' | 'verify' | 'delete' | 'absence';
  service: string;
  account: string;
  value?: string;
};

type WorkerResponse = {
  ok: boolean;
  matched?: boolean;
  missing?: boolean;
  deleted?: boolean;
  absent?: boolean;
  error?: string;
};

let input = '';

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk: string) => {
  input += chunk;
  const newline = input.indexOf('\n');
  if (newline < 0) return;
  const request = JSON.parse(input.slice(0, newline)) as WorkerRequest;
  void run(request).then((response) => {
    process.stdout.write(`${JSON.stringify(response)}\n`, () => process.exit(response.ok ? 0 : 1));
  });
});

async function run(request: WorkerRequest): Promise<WorkerResponse> {
  try {
    if (request.operation === 'set') {
      if (typeof request.value !== 'string') return { ok: false, error: 'The worker received no credential value.' };
      await keytar.setPassword(request.service, request.account, request.value);
      return { ok: true };
    }
    if (request.operation === 'verify') {
      if (typeof request.value !== 'string') return { ok: false, error: 'The worker received no credential value.' };
      const stored = await keytar.getPassword(request.service, request.account);
      return stored === null
        ? { ok: true, matched: false, missing: true }
        : { ok: true, matched: stored === request.value, missing: false };
    }
    if (request.operation === 'delete') {
      const deleted = await keytar.deletePassword(request.service, request.account);
      return { ok: deleted, deleted };
    }
    const absent = (await keytar.getPassword(request.service, request.account)) === null;
    return { ok: absent, absent };
  } catch {
    return { ok: false, error: 'The operating-system credential vault worker could not complete the operation.' };
  }
}
