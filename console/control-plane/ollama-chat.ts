import { randomUUID } from 'node:crypto';
import { normalizeOllamaRequestId, ollamaErrorMessage } from '../shared/ollama.js';
import type {
  OllamaChatAttachment,
  OllamaChatChunk,
  OllamaChatEvent,
  OllamaChatMessage,
  OllamaChatOptions,
  OllamaChatSessionSummary,
  OllamaDispatchHandlers,
  OllamaDispatchRequest,
  OllamaDispatchResponse,
} from '../shared/ollama.js';
import type { OllamaChatApiMessage, OllamaClient } from './ollama-client.js';

const MAX_SESSIONS = 100;
const MAX_MESSAGES_PER_SESSION = 1_000;
const MAX_MESSAGE_CHARACTERS = 1_048_576;
const MAX_RESPONSE_CHARACTERS = 4 * 1_048_576;
const MAX_ATTACHMENTS = 4;
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

interface ChatSession {
  id: string;
  name: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  messages: OllamaChatMessage[];
  streaming: boolean;
  options: OllamaChatOptions;
}

export interface OllamaChatOptionsConfig {
  client: OllamaClient;
  onEvent?: (event: OllamaChatEvent) => void | Promise<void>;
  now?: () => Date;
}

function requiredText(value: unknown, label: string, max: number): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > max) {
    throw new Error(`${label} is required and must be at most ${max} characters.`);
  }
  if (/[\u0000]/u.test(value)) throw new Error(`${label} contains a null character.`);
  return value.trim();
}

function sessionId(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9a-f-]{36}$/iu.test(value)) throw new Error('A valid chat session id is required.');
  return value;
}

function boundedNumber(value: unknown, label: string, minimum: number, maximum: number): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${label} must be between ${minimum} and ${maximum}.`);
  }
  return value;
}

function parseOptions(value: unknown): OllamaChatOptions {
  if (value === undefined) return {};
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('Chat options must be an object.');
  const input = value as Record<string, unknown>;
  const stop = input.stop;
  if (stop !== undefined && (!Array.isArray(stop) || stop.length > 64 || stop.some(item => typeof item !== 'string' || item.length > 1_024))) {
    throw new Error('Chat stop sequences must contain at most 64 strings of at most 1024 characters.');
  }
  const seed = boundedNumber(input.seed, 'Seed', -2_147_483_648, 2_147_483_647);
  const numCtx = boundedNumber(input.numCtx, 'Context length', 128, 1_048_576);
  return {
    temperature: boundedNumber(input.temperature, 'Temperature', 0, 2),
    topP: boundedNumber(input.topP, 'Top P', 0, 1),
    topK: boundedNumber(input.topK, 'Top K', 0, 10_000),
    seed: seed === undefined ? undefined : Math.trunc(seed),
    numCtx: numCtx === undefined ? undefined : Math.trunc(numCtx),
    repeatPenalty: boundedNumber(input.repeatPenalty, 'Repeat penalty', 0, 4),
    stop: stop as string[] | undefined,
  };
}

function parseAttachments(value: unknown): OllamaChatAttachment[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_ATTACHMENTS) throw new Error(`A message may carry at most ${MAX_ATTACHMENTS} images.`);
  let totalBytes = 0;
  return value.map(item => {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) throw new Error('A chat attachment must be an object.');
    const record = item as Record<string, unknown>;
    if (record.type !== 'image' || typeof record.mediaType !== 'string' || !IMAGE_TYPES.has(record.mediaType)) {
      throw new Error('Only PNG, JPEG, and WebP image attachments are supported.');
    }
    if (typeof record.dataBase64 !== 'string' || record.dataBase64.length === 0 || record.dataBase64.length % 4 === 1 || !/^[A-Za-z0-9+/]*={0,2}$/u.test(record.dataBase64)) {
      throw new Error('An image attachment is not valid base64.');
    }
    const bytes = Math.floor(record.dataBase64.length * 3 / 4);
    totalBytes += bytes;
    if (totalBytes > MAX_ATTACHMENT_BYTES) throw new Error(`Image attachments exceed ${MAX_ATTACHMENT_BYTES} decoded bytes.`);
    return {
      type: 'image',
      mediaType: record.mediaType as OllamaChatAttachment['mediaType'],
      dataBase64: record.dataBase64,
    };
  });
}

function summary(session: ChatSession): OllamaChatSessionSummary {
  return {
    id: session.id,
    name: session.name,
    model: session.model,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    messageCount: session.messages.length,
    streaming: session.streaming,
  };
}

function apiOptions(options: OllamaChatOptions): Record<string, string | number | boolean | readonly string[]> {
  return {
    ...(options.temperature === undefined ? {} : { temperature: options.temperature }),
    ...(options.topP === undefined ? {} : { top_p: options.topP }),
    ...(options.topK === undefined ? {} : { top_k: options.topK }),
    ...(options.seed === undefined ? {} : { seed: options.seed }),
    ...(options.numCtx === undefined ? {} : { num_ctx: options.numCtx }),
    ...(options.repeatPenalty === undefined ? {} : { repeat_penalty: options.repeatPenalty }),
    ...(options.stop === undefined ? {} : { stop: options.stop }),
  };
}

function toApiMessage(message: OllamaChatMessage): OllamaChatApiMessage {
  return {
    role: message.role,
    content: message.content,
    ...(message.attachments?.length
      ? { images: message.attachments.map(attachment => attachment.dataBase64) }
      : {}),
    ...(message.toolName ? { tool_name: message.toolName } : {}),
  };
}

export class OllamaChat {
  readonly #client: OllamaClient;
  readonly #onEvent?: (event: OllamaChatEvent) => void | Promise<void>;
  readonly #now: () => Date;
  readonly #sessions = new Map<string, ChatSession>();
  readonly #controllers = new Map<string, AbortController>();

  constructor(options: OllamaChatOptionsConfig) {
    this.#client = options.client;
    this.#onEvent = options.onEvent;
    this.#now = options.now ?? (() => new Date());
  }

  #session(id: string): ChatSession {
    const session = this.#sessions.get(id);
    if (!session) throw new Error(`Chat session ${id} does not exist.`);
    return session;
  }

  async #emit(event: OllamaChatEvent): Promise<void> {
    await this.#onEvent?.(structuredClone(event));
  }

  listSessions(): readonly OllamaChatSessionSummary[] {
    return [...this.#sessions.values()].map(summary).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  sessionMessages(id: string): readonly OllamaChatMessage[] {
    return structuredClone(this.#session(id).messages);
  }

  createSession(input: { name: string; model: string; systemPrompt?: string; options?: OllamaChatOptions }): OllamaChatSessionSummary {
    if (this.#sessions.size >= MAX_SESSIONS) throw new Error(`Chat history is limited to ${MAX_SESSIONS} sessions.`);
    const now = this.#now().toISOString();
    const session: ChatSession = {
      id: randomUUID(),
      name: requiredText(input.name, 'Chat session name', 256),
      model: requiredText(input.model, 'Chat model', 256),
      createdAt: now,
      updatedAt: now,
      messages: [],
      streaming: false,
      options: parseOptions(input.options),
    };
    if (input.systemPrompt !== undefined && input.systemPrompt.length > 0) {
      session.messages.push({
        id: randomUUID(),
        role: 'system',
        content: requiredText(input.systemPrompt, 'System prompt', MAX_MESSAGE_CHARACTERS),
        createdAt: now,
      });
    }
    this.#sessions.set(session.id, session);
    return summary(session);
  }

  renameSession(id: string, name: string): OllamaChatSessionSummary {
    const session = this.#session(id);
    session.name = requiredText(name, 'Chat session name', 256);
    session.updatedAt = this.#now().toISOString();
    return summary(session);
  }

  deleteSession(id: string): void {
    const session = this.#session(id);
    if (session.streaming) throw new Error('Stop the active response before deleting this chat session.');
    this.#sessions.delete(id);
  }

  stop(id: string): boolean {
    const controller = this.#controllers.get(id);
    if (!controller) return false;
    controller.abort(new Error('Chat generation was cancelled.'));
    return true;
  }

  async #generate(session: ChatSession): Promise<OllamaChatMessage> {
    if (session.streaming) throw new Error('This chat session already has an active response.');
    if (session.messages.length >= MAX_MESSAGES_PER_SESSION) throw new Error(`Chat session reached ${MAX_MESSAGES_PER_SESSION} messages.`);
    const modelInfo = await this.#client.showModel(session.model);
    if (!modelInfo.capabilities.includes('chat') && !modelInfo.capabilities.includes('completion')) {
      throw new Error(`Model ${session.model} does not report chat or completion capability.`);
    }
    const hasImages = session.messages.some(message => (message.attachments?.length ?? 0) > 0);
    if (hasImages && !modelInfo.capabilities.includes('vision')) {
      throw new Error(`Model ${session.model} does not report vision capability, so image attachments are refused.`);
    }
    const controller = new AbortController();
    this.#controllers.set(session.id, controller);
    session.streaming = true;
    const message: OllamaChatMessage = {
      id: randomUUID(),
      role: 'assistant',
      content: '',
      createdAt: this.#now().toISOString(),
    };
    session.messages.push(message);
    let completed = false;
    try {
      for await (const part of this.#client.chat({
        model: session.model,
        messages: session.messages.slice(0, -1).map(toApiMessage),
        options: apiOptions(session.options),
      }, controller.signal)) {
        if (completed) throw new Error('Local Ollama continued the chat stream after its completion record.');
        if (message.content.length + part.content.length > MAX_RESPONSE_CHARACTERS) {
          throw new Error(`Chat response exceeded ${MAX_RESPONSE_CHARACTERS} characters.`);
        }
        message.content += part.content;
        session.updatedAt = this.#now().toISOString();
        const chunk: OllamaChatChunk = {
          sessionId: session.id,
          messageId: message.id,
          content: part.content,
          done: part.done,
          doneReason: part.doneReason,
          promptEvalCount: part.promptEvalCount,
          evalCount: part.evalCount,
        };
        completed ||= part.done;
        await this.#emit({ type: part.done ? 'completed' : 'chunk', chunk });
      }
      if (!completed) throw new Error('Local Ollama ended the chat stream without a completion record.');
      return structuredClone(message);
    } catch (error) {
      const cancelled = controller.signal.aborted;
      await this.#emit({
        type: cancelled ? 'cancelled' : 'failed',
        error: ollamaErrorMessage(error, 'Chat generation failed.'),
        chunk: {
          sessionId: session.id,
          messageId: message.id,
          content: '',
          done: true,
          doneReason: cancelled ? 'cancelled' : 'error',
        },
      });
      throw error;
    } finally {
      session.streaming = false;
      session.updatedAt = this.#now().toISOString();
      this.#controllers.delete(session.id);
    }
  }

  async send(id: string, input: { content: string; attachments?: readonly OllamaChatAttachment[] }): Promise<OllamaChatMessage> {
    const session = this.#session(id);
    if (session.streaming) throw new Error('This chat session already has an active response.');
    if (session.messages.length + 2 > MAX_MESSAGES_PER_SESSION) throw new Error(`Chat session reached ${MAX_MESSAGES_PER_SESSION} messages.`);
    session.messages.push({
      id: randomUUID(),
      role: 'user',
      content: requiredText(input.content, 'Chat message', MAX_MESSAGE_CHARACTERS),
      createdAt: this.#now().toISOString(),
      attachments: structuredClone(input.attachments ?? []),
    });
    session.updatedAt = this.#now().toISOString();
    return await this.#generate(session);
  }

  async regenerate(id: string): Promise<OllamaChatMessage> {
    const session = this.#session(id);
    if (session.streaming) throw new Error('This chat session already has an active response.');
    let lastUserIndex = -1;
    for (let index = session.messages.length - 1; index >= 0; index -= 1) {
      if (session.messages[index]?.role === 'user') {
        lastUserIndex = index;
        break;
      }
    }
    if (lastUserIndex < 0) throw new Error('There is no user message to regenerate from.');
    session.messages.splice(lastUserIndex + 1);
    return await this.#generate(session);
  }
}

function payload(request: OllamaDispatchRequest): Record<string, unknown> {
  if (request.payload === null || typeof request.payload !== 'object' || Array.isArray(request.payload)) {
    throw new Error('The chat action needs an object payload.');
  }
  return request.payload as Record<string, unknown>;
}

function failure(request: OllamaDispatchRequest, error: unknown): OllamaDispatchResponse {
  return {
    ok: false,
    requestId: normalizeOllamaRequestId(request.requestId),
    code: 'OLLAMA_CHAT_OPERATION_FAILED',
    message: ollamaErrorMessage(error, 'The Ollama chat operation failed.'),
  };
}

export function createOllamaChatHandlers(chat: OllamaChat): OllamaDispatchHandlers {
  const wrap = <T>(fn: (request: OllamaDispatchRequest) => Promise<T> | T) => async (request: OllamaDispatchRequest) => {
    try {
      return { ok: true, requestId: normalizeOllamaRequestId(request.requestId), data: await fn(request) } as OllamaDispatchResponse<T>;
    } catch (error) {
      return failure(request, error) as OllamaDispatchResponse<T>;
    }
  };
  return {
    'ollama.chat.sessions': wrap(() => ({ sessions: chat.listSessions() })),
    'ollama.chat.create': wrap(request => {
      const input = payload(request);
      return chat.createSession({
        name: requiredText(input.name, 'Chat session name', 256),
        model: requiredText(input.model, 'Chat model', 256),
        systemPrompt: typeof input.systemPrompt === 'string' ? input.systemPrompt : undefined,
        options: parseOptions(input.options),
      });
    }),
    'ollama.chat.rename': wrap(request => {
      const input = payload(request);
      return chat.renameSession(sessionId(input.id), requiredText(input.name, 'Chat session name', 256));
    }),
    'ollama.chat.delete': wrap(request => {
      const id = sessionId(payload(request).id);
      chat.deleteSession(id);
      return { id, deleted: true };
    }),
    'ollama.chat.send': wrap(async request => {
      const input = payload(request);
      return await chat.send(sessionId(input.id), {
        content: requiredText(input.content, 'Chat message', MAX_MESSAGE_CHARACTERS),
        attachments: parseAttachments(input.attachments),
      });
    }),
    'ollama.chat.retry': wrap(async request => await chat.regenerate(sessionId(payload(request).id))),
    'ollama.chat.regenerate': wrap(async request => await chat.regenerate(sessionId(payload(request).id))),
    'ollama.chat.stop': wrap(request => {
      const id = sessionId(payload(request).id);
      return { id, stopped: chat.stop(id) };
    }),
  } as OllamaDispatchHandlers;
}
