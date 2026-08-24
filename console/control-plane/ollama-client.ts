import { normalizeOllamaRequestId, ollamaErrorMessage } from '../shared/ollama.js';
import type {
  OllamaCapability,
  OllamaDispatchHandlers,
  OllamaDispatchRequest,
  OllamaDispatchResponse,
  OllamaHealth,
  OllamaInstalledModel,
  OllamaModelDetails,
  OllamaModelInfo,
  OllamaPullProgress,
  OllamaRunningModel,
} from '../shared/ollama.js';

const DEFAULT_ENDPOINT = 'http://127.0.0.1:11434/';
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

type JsonRecord = Record<string, unknown>;

export interface OllamaClientOptions {
  endpoint?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxResponseBytes?: number;
  now?: () => Date;
}

export interface OllamaChatApiMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  images?: readonly string[];
  tool_name?: string;
}

export interface OllamaChatApiRequest {
  model: string;
  messages: readonly OllamaChatApiMessage[];
  options?: Readonly<Record<string, string | number | boolean | readonly string[]>>;
  tools?: readonly JsonRecord[];
  keepAlive?: string | number;
}

export interface OllamaChatApiChunk {
  model?: string;
  createdAt?: string;
  content: string;
  done: boolean;
  doneReason?: string;
  promptEvalCount?: number;
  evalCount?: number;
}

function asRecord(value: unknown, label: string): JsonRecord {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} was not a JSON object.`);
  }
  return value as JsonRecord;
}

function optionalString(value: unknown, maxLength = 8_192): string | undefined {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

function parseDetails(value: unknown): OllamaModelDetails {
  const details = value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : {};
  return {
    family: optionalString(details.family),
    families: stringArray(details.families),
    parameterSize: optionalString(details.parameter_size),
    quantizationLevel: optionalString(details.quantization_level),
    format: optionalString(details.format),
    parentModel: optionalString(details.parent_model),
  };
}

function parseCapabilities(value: unknown): OllamaCapability[] {
  const allowed = new Set<OllamaCapability>([
    'chat', 'completion', 'vision', 'tools', 'embedding', 'insert', 'thinking',
  ]);
  return stringArray(value).filter((entry): entry is OllamaCapability => allowed.has(entry as OllamaCapability));
}

function parseInstalledModel(value: unknown): OllamaInstalledModel {
  const model = asRecord(value, 'An installed model');
  const name = optionalString(model.name, 256) ?? optionalString(model.model, 256);
  if (!name) throw new Error('An installed model did not include a name.');
  return {
    name,
    model: optionalString(model.model, 256) ?? name,
    modifiedAt: optionalString(model.modified_at, 128),
    sizeBytes: optionalNumber(model.size) ?? 0,
    digest: optionalString(model.digest, 256),
    details: parseDetails(model.details),
  };
}

function parseRunningModel(value: unknown): OllamaRunningModel {
  const model = asRecord(value, 'A running model');
  return {
    ...parseInstalledModel(model),
    expiresAt: optionalString(model.expires_at, 128),
    sizeVramBytes: optionalNumber(model.size_vram),
    contextLength: optionalNumber(model.context_length),
  };
}

function safeModelName(value: unknown): string {
  if (typeof value !== 'string') throw new Error('A model name is required.');
  const model = value.trim();
  if (model.length === 0 || model.length > 256 || /[\u0000-\u001f\u007f]/u.test(model)) {
    throw new Error('The model name is empty, too long, or contains control characters.');
  }
  return model;
}

function safeRequestId(request: OllamaDispatchRequest): string {
  return normalizeOllamaRequestId(request.requestId);
}

export class OllamaClient {
  readonly #endpoint: URL;
  readonly #fetch: typeof fetch;
  readonly #timeoutMs: number;
  readonly #maxResponseBytes: number;
  readonly #now: () => Date;

  constructor(options: OllamaClientOptions = {}) {
    const endpoint = new URL(options.endpoint ?? DEFAULT_ENDPOINT);
    if (endpoint.protocol !== 'http:' || !LOOPBACK_HOSTS.has(endpoint.hostname)) {
      throw new Error('Ollama must use an HTTP loopback endpoint. Cloud and non-loopback endpoints are refused.');
    }
    if (endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
      throw new Error('The Ollama endpoint cannot contain credentials, a query, or a fragment.');
    }
    endpoint.pathname = '/';
    this.#endpoint = endpoint;
    this.#fetch = options.fetchImpl ?? fetch;
    this.#timeoutMs = Math.max(1_000, Math.min(options.timeoutMs ?? DEFAULT_TIMEOUT_MS, 120_000));
    this.#maxResponseBytes = Math.max(
      64 * 1024,
      Math.min(options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES, 64 * 1024 * 1024),
    );
    this.#now = options.now ?? (() => new Date());
  }

  get endpoint(): string {
    return this.#endpoint.href;
  }

  #deadline(external?: AbortSignal): { signal: AbortSignal; cleanup: () => void } {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error('The local Ollama request timed out.')), this.#timeoutMs);
    const abort = () => controller.abort(external?.reason);
    external?.addEventListener('abort', abort, { once: true });
    return {
      signal: controller.signal,
      cleanup: () => {
        clearTimeout(timer);
        external?.removeEventListener('abort', abort);
      },
    };
  }

  async #request(
    path: string,
    init: RequestInit = {},
    external?: AbortSignal,
  ): Promise<{ response: Response; cleanup: () => void }> {
    if (!/^\/api\/[a-z][a-z0-9/_-]*$/u.test(path)) throw new Error(`Refused unrecognized Ollama path: ${path}`);
    const url = new URL(path, this.#endpoint);
    const deadline = this.#deadline(external);
    try {
      const response = await this.#fetch(url, {
        ...init,
        redirect: 'error',
        signal: deadline.signal,
        headers: {
          Accept: 'application/json, application/x-ndjson',
          ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...init.headers,
        },
      });
      if (!response.ok) {
        const reason = (await this.#boundedText(response).catch(() => '')).slice(0, 4_096);
        throw new Error(`Local Ollama returned HTTP ${response.status}${reason ? `: ${reason}` : '.'}`);
      }
      return { response, cleanup: deadline.cleanup };
    } catch (error) {
      deadline.cleanup();
      throw error;
    }
  }

  async #boundedText(response: Response): Promise<string> {
    const length = Number(response.headers.get('content-length'));
    if (Number.isFinite(length) && length > this.#maxResponseBytes) {
      throw new Error(`Local Ollama response exceeded ${this.#maxResponseBytes} bytes.`);
    }
    const reader = response.body?.getReader();
    if (!reader) return '';
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > this.#maxResponseBytes) {
        await reader.cancel();
        throw new Error(`Local Ollama response exceeded ${this.#maxResponseBytes} bytes.`);
      }
      chunks.push(next.value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  }

  async #json(path: string, init: RequestInit = {}, external?: AbortSignal): Promise<JsonRecord> {
    const { response, cleanup } = await this.#request(path, init, external);
    let text: string;
    try {
      text = await this.#boundedText(response);
    } finally {
      cleanup();
    }
    try {
      return asRecord(JSON.parse(text), `The ${path} response`);
    } catch (error) {
      if (error instanceof SyntaxError) throw new Error(`Local Ollama returned invalid JSON for ${path}.`);
      throw error;
    }
  }

  async #command(path: string, init: RequestInit, external?: AbortSignal): Promise<void> {
    const { response, cleanup } = await this.#request(path, init, external);
    try {
      const text = await this.#boundedText(response);
      if (text.trim().length > 0) asRecord(JSON.parse(text), `The ${path} response`);
    } finally {
      cleanup();
    }
  }

  async health(): Promise<OllamaHealth> {
    const observedAt = this.#now().toISOString();
    try {
      const version = await this.version();
      return { state: 'ready', observedAt, endpoint: this.endpoint, version };
    } catch (error) {
      const reason = ollamaErrorMessage(error, 'Local Ollama could not be reached.');
      const refused = /fetch failed|ECONNREFUSED|refused|timed out/iu.test(reason);
      return {
        state: refused ? 'stopped' : 'unhealthy',
        observedAt,
        endpoint: this.endpoint,
        reason,
      };
    }
  }

  async version(signal?: AbortSignal): Promise<string> {
    const payload = await this.#json('/api/version', {}, signal);
    const version = optionalString(payload.version);
    if (!version || version.length > 128) throw new Error('Local Ollama returned no valid version.');
    return version;
  }

  async installedModels(signal?: AbortSignal): Promise<readonly OllamaInstalledModel[]> {
    const payload = await this.#json('/api/tags', {}, signal);
    if (!Array.isArray(payload.models)) throw new Error('Local Ollama returned no installed-model list.');
    return payload.models.map(parseInstalledModel);
  }

  async runningModels(signal?: AbortSignal): Promise<readonly OllamaRunningModel[]> {
    const payload = await this.#json('/api/ps', {}, signal);
    if (!Array.isArray(payload.models)) throw new Error('Local Ollama returned no running-model list.');
    return payload.models.map(parseRunningModel);
  }

  async showModel(modelName: string, signal?: AbortSignal): Promise<OllamaModelInfo> {
    const model = safeModelName(modelName);
    const payload = await this.#json('/api/show', {
      method: 'POST',
      body: JSON.stringify({ model, verbose: false }),
    }, signal);
    const info = payload.model_info !== null && typeof payload.model_info === 'object' && !Array.isArray(payload.model_info)
      ? payload.model_info as JsonRecord
      : {};
    const safeInfo: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(info)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') safeInfo[key] = value;
    }
    return {
      model,
      license: optionalString(payload.license),
      template: optionalString(payload.template),
      system: optionalString(payload.system),
      parameters: optionalString(payload.parameters),
      details: parseDetails(payload.details),
      capabilities: parseCapabilities(payload.capabilities),
      modifiedAt: optionalString(payload.modified_at),
      modelInfo: safeInfo,
    };
  }

  async deleteModel(modelName: string, signal?: AbortSignal): Promise<void> {
    const model = safeModelName(modelName);
    await this.#command('/api/delete', { method: 'DELETE', body: JSON.stringify({ model }) }, signal);
  }

  async copyModel(sourceName: string, destinationName: string, signal?: AbortSignal): Promise<void> {
    const source = safeModelName(sourceName);
    const destination = safeModelName(destinationName);
    if (source === destination) throw new Error('Source and destination model names must differ.');
    await this.#command('/api/copy', {
      method: 'POST',
      body: JSON.stringify({ source, destination }),
    }, signal);
  }

  async *#streamJsonLines(
    path: '/api/pull' | '/api/chat',
    body: JsonRecord,
    signal?: AbortSignal,
  ): AsyncGenerator<JsonRecord> {
    const deadline = this.#deadline(signal);
    let response: Response;
    try {
      response = await this.#fetch(new URL(path, this.#endpoint), {
        method: 'POST',
        redirect: 'error',
        signal: deadline.signal,
        headers: { Accept: 'application/x-ndjson', 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const reason = (await this.#boundedText(response).catch(() => '')).slice(0, 4_096);
        throw new Error(`Local Ollama returned HTTP ${response.status}${reason ? `: ${reason}` : '.'}`);
      }
      if (!response.body) throw new Error(`Local Ollama returned no stream for ${path}.`);
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8', { fatal: true });
      let buffered = '';
      let received = 0;
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        received += next.value.byteLength;
        if (received > this.#maxResponseBytes) {
          await reader.cancel();
          throw new Error(`Local Ollama stream exceeded ${this.#maxResponseBytes} bytes.`);
        }
        buffered += decoder.decode(next.value, { stream: true });
        const lines = buffered.split(/\r?\n/u);
        buffered = lines.pop() ?? '';
        for (const line of lines) {
          if (line.trim().length === 0) continue;
          yield asRecord(JSON.parse(line), `A ${path} stream item`);
        }
      }
      buffered += decoder.decode();
      if (buffered.trim().length > 0) yield asRecord(JSON.parse(buffered), `A ${path} stream item`);
    } finally {
      deadline.cleanup();
    }
  }

  async *pull(modelName: string, signal?: AbortSignal): AsyncGenerator<OllamaPullProgress> {
    const model = safeModelName(modelName);
    for await (const payload of this.#streamJsonLines('/api/pull', { model, stream: true }, signal)) {
      yield {
        status: optionalString(payload.status, 4_096) ?? 'Local Ollama reported pull progress.',
        digest: optionalString(payload.digest, 256),
        totalBytes: optionalNumber(payload.total),
        completedBytes: optionalNumber(payload.completed),
      };
    }
  }

  async *chat(request: OllamaChatApiRequest, signal?: AbortSignal): AsyncGenerator<OllamaChatApiChunk> {
    const model = safeModelName(request.model);
    for await (const payload of this.#streamJsonLines('/api/chat', {
      model,
      messages: request.messages,
      stream: true,
      ...(request.options ? { options: request.options } : {}),
      ...(request.tools ? { tools: request.tools } : {}),
      ...(request.keepAlive !== undefined ? { keep_alive: request.keepAlive } : {}),
    }, signal)) {
      const message = payload.message !== null && typeof payload.message === 'object' && !Array.isArray(payload.message)
        ? payload.message as JsonRecord
        : {};
      yield {
        model: optionalString(payload.model),
        createdAt: optionalString(payload.created_at),
        content: optionalString(message.content, this.#maxResponseBytes) ?? '',
        done: payload.done === true,
        doneReason: optionalString(payload.done_reason),
        promptEvalCount: optionalNumber(payload.prompt_eval_count),
        evalCount: optionalNumber(payload.eval_count),
      };
    }
  }
}

function success<T>(request: OllamaDispatchRequest, data: T): OllamaDispatchResponse<T> {
  return { ok: true, requestId: safeRequestId(request), data };
}

function failure(request: OllamaDispatchRequest, error: unknown): OllamaDispatchResponse {
  return {
    ok: false,
    requestId: safeRequestId(request),
    code: 'OLLAMA_LOCAL_REQUEST_FAILED',
    message: ollamaErrorMessage(error, 'The local Ollama request failed.'),
  };
}

/** Typed handlers ready for a future dispatcher composition step. */
export function createOllamaRuntimeHandlers(client: OllamaClient): OllamaDispatchHandlers {
  const wrap = <T>(fn: (request: OllamaDispatchRequest) => Promise<T>) =>
    async (request: OllamaDispatchRequest): Promise<OllamaDispatchResponse<T>> => {
      try {
        return success(request, await fn(request));
      } catch (error) {
        return failure(request, error) as OllamaDispatchResponse<T>;
      }
    };
  return {
    'ollama.health': wrap(async () => await client.health()),
    'ollama.version': wrap(async () => ({ version: await client.version() })),
    'ollama.models.installed': wrap(async () => ({ models: await client.installedModels() })),
    'ollama.models.running': wrap(async () => ({ models: await client.runningModels() })),
    'ollama.model.show': wrap(async request => {
      const payload = asRecord(request.payload, 'The model request');
      return await client.showModel(safeModelName(payload.model));
    }),
    'ollama.model.delete': wrap(async request => {
      const payload = asRecord(request.payload, 'The delete request');
      const model = safeModelName(payload.model);
      await client.deleteModel(model);
      return { model, deleted: true };
    }),
    'ollama.model.copy': wrap(async request => {
      const payload = asRecord(request.payload, 'The copy request');
      const source = safeModelName(payload.source);
      const destination = safeModelName(payload.destination);
      await client.copyModel(source, destination);
      return { source, destination, copied: true };
    }),
  } as OllamaDispatchHandlers;
}
