import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { randomBytes } from "node:crypto";
import type { AriWebSocketFactory, AriWebSocketLike } from "../../control-plane/ami-ari-transports.js";

/** Privileged header-capable WebSocket factory for the main process. */
export function createAriWebSocketFactory(): AriWebSocketFactory {
  return (url, headers) => new NodeAriWebSocket(url, headers);
}

class NodeAriWebSocket implements AriWebSocketLike {
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((error: unknown) => void) | null = null;
  onclose: (() => void) | null = null;
  #socket?: import("node:stream").Duplex;
  #closed = false;
  #buffer = Buffer.alloc(0);

  constructor(url: string, headers: Readonly<Record<string, string>>) {
    const parsed = new URL(url);
    if (parsed.protocol !== "wss:" && !(parsed.protocol === "ws:" && isLoopback(parsed.hostname))) {
      queueMicrotask(() => this.onerror?.(new Error("ARI WebSocket requires secure transport or loopback.")));
      return;
    }
    const request = (parsed.protocol === "wss:" ? httpsRequest : httpRequest)({
      hostname: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : parsed.protocol === "wss:" ? 443 : 80,
      path: `${parsed.pathname}${parsed.search}`,
      method: "GET",
      headers: {
        ...headers,
        Host: parsed.host,
        Upgrade: "websocket",
        Connection: "Upgrade",
        "Sec-WebSocket-Key": randomBytes(16).toString("base64"),
        "Sec-WebSocket-Version": "13",
      },
      rejectUnauthorized: true,
    });
    request.once("upgrade", (_response, socket) => {
      this.#socket = socket;
      socket.on("data", (chunk) => this.#consume(Buffer.from(chunk)));
      socket.once("error", (error) => this.onerror?.(error));
      socket.once("close", () => { if (!this.#closed) this.onclose?.(); });
      this.onopen?.();
    });
    request.once("error", (error) => this.onerror?.(error));
    request.end();
  }

  close(): void {
    this.#closed = true;
    this.#socket?.end();
    this.#socket?.destroy();
    this.#socket = undefined;
    this.onclose?.();
  }

  #consume(chunk: Buffer): void {
    this.#buffer = Buffer.concat([this.#buffer, chunk]);
    while (this.#buffer.length >= 2) {
      const first = this.#buffer[0]!;
      const second = this.#buffer[1]!;
      const opcode = first & 0x0f;
      const masked = (second & 0x80) !== 0;
      let length = second & 0x7f;
      let offset = 2;
      if (length === 126) { if (this.#buffer.length < 4) return; length = this.#buffer.readUInt16BE(2); offset = 4; }
      else if (length === 127) { if (this.#buffer.length < 10) return; const high = this.#buffer.readUInt32BE(2); const low = this.#buffer.readUInt32BE(6); if (high !== 0 || low > 512 * 1024) { this.onerror?.(new Error("ARI WebSocket frame exceeded the bounded size")); this.close(); return; } length = low; offset = 10; }
      const maskOffset = masked ? 4 : 0;
      if (this.#buffer.length < offset + maskOffset + length) return;
      const mask = masked ? this.#buffer.subarray(offset, offset + 4) : undefined;
      offset += maskOffset;
      const payload = Buffer.from(this.#buffer.subarray(offset, offset + length));
      this.#buffer = this.#buffer.subarray(offset + length);
      if (mask) for (let index = 0; index < payload.length; index += 1) payload[index] ^= mask[index % 4]!;
      if (opcode === 0x1) this.onmessage?.({ data: payload.toString("utf8") });
      else if (opcode === 0x8) { this.close(); return; }
    }
  }
}

function isLoopback(host: string): boolean {
  const value = host.toLowerCase().replace(/^\[|\]$/gu, "");
  return value === "localhost" || value === "127.0.0.1" || value === "::1";
}
