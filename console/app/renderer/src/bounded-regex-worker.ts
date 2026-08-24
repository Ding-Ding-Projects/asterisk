import { MAX_REGEX_INPUT_LENGTH, MAX_REGEX_EVALUATION_MS } from './bounded-regex';

export interface BoundedRegexWorkerRequest {
  query: string;
  regex: boolean;
  flags?: string;
  texts: ReadonlyArray<string>;
}

export function boundedRegexWorkerAvailable(): boolean {
  return typeof Worker !== 'undefined' && typeof URL !== 'undefined' && typeof Blob !== 'undefined';
}

export async function evaluateBoundedRegexInWorker(request: BoundedRegexWorkerRequest): Promise<ReadonlyArray<boolean>> {
  if (!boundedRegexWorkerAvailable()) {
    return request.texts.map(() => false);
  }
  const source = `self.onmessage = (event) => { const { query, regex, flags, texts } = event.data; try { const value = query.trim(); if (value.length > ${512}) return self.postMessage({ ok:false, reason:'pattern' }); const normalized = [...new Set((flags || 'iu').split(''))].filter((flag) => 'imu'.includes(flag)).join(''); const pattern = regex ? value : value.replace(/[.*+?^$\\{}()|[\\]\\\\]/gu, '\\\\$&'); const matcher = new RegExp(pattern, normalized); const started = performance.now(); const matches = texts.map((text) => matcher.test(String(text).slice(0, ${MAX_REGEX_INPUT_LENGTH}))); self.postMessage({ ok: performance.now() - started <= ${MAX_REGEX_EVALUATION_MS}, matches }); } catch { self.postMessage({ ok:false, reason:'invalid' }); } };`;
  const worker = new Worker(URL.createObjectURL(new Blob([source], { type: 'text/javascript' })));
  return await new Promise<ReadonlyArray<boolean>>((resolve) => {
    const timer = window.setTimeout(() => { worker.terminate(); resolve(request.texts.map(() => false)); }, MAX_REGEX_EVALUATION_MS + 25);
    worker.onmessage = (event: MessageEvent<{ ok?: boolean; matches?: boolean[] }>) => {
      window.clearTimeout(timer);
      worker.terminate();
      resolve(event.data.ok && Array.isArray(event.data.matches) ? event.data.matches : request.texts.map(() => false));
    };
    worker.postMessage(request);
  });
}
