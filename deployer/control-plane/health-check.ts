/**
 * Verifies a deployment by asking the server itself, never by trusting an install
 * script's exit code alone.
 *
 * This is a plain HTTP GET from the Electron main process — not a subprocess, so the
 * "no shell, ever" executor rule does not apply to it (that rule governs command
 * execution on the target machine/VM, not the deployer's own network calls to check
 * the result). Bounded, timed out, and never sends credentials.
 */
import { request as httpRequest } from "node:http";
import { healthUrl, parseServerHealth, type ServerHealth } from "./server-contract.js";

export interface HealthCheckResult {
  ok: boolean;
  reason?: string;
  health?: ServerHealth;
}

export interface HttpGetter {
  get(url: string, timeoutMs: number, signal?: AbortSignal): Promise<{ statusCode: number; body: string }>;
}

/** Real HTTP getter, used outside tests. */
export const nodeHttpGetter: HttpGetter = {
  get(url, timeoutMs, signal) {
    return new Promise((resolve, reject) => {
      const req = httpRequest(url, { method: "GET", timeout: timeoutMs }, (res) => {
        const chunks: Buffer[] = [];
        let total = 0;
        res.on("data", (chunk: Buffer) => {
          total += chunk.byteLength;
          if (total > 1024 * 1024) { req.destroy(new Error("Health response exceeded the size bound")); return; }
          chunks.push(chunk);
        });
        res.on("end", () => resolve({ statusCode: res.statusCode ?? 0, body: Buffer.concat(chunks).toString("utf8") }));
      });
      req.on("timeout", () => req.destroy(new Error("Health check timed out")));
      req.on("error", reject);
      signal?.addEventListener("abort", () => req.destroy(new Error("Health check cancelled")), { once: true });
      req.end();
    });
  },
};

export async function checkServerHealth(
  host: string,
  port: number,
  getter: HttpGetter = nodeHttpGetter,
  timeoutMs = 10_000,
  signal?: AbortSignal,
): Promise<HealthCheckResult> {
  const url = healthUrl(host, port);
  let response: { statusCode: number; body: string };
  try {
    response = await getter.get(url, timeoutMs, signal);
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "The health check could not connect." };
  }
  if (response.statusCode !== 200) {
    return { ok: false, reason: `The readiness route returned HTTP ${response.statusCode}.` };
  }
  const parsed = parseServerHealth(response.body);
  if (!parsed.ok) return { ok: false, reason: parsed.reason };
  return { ok: true, health: parsed.value };
}

/**
 * Polls the health endpoint with bounded retries. A freshly installed service can take
 * a few seconds to bind its port; this is real polling with a real bound, never a
 * bare sleep-then-hope.
 */
export async function waitForServerHealth(
  host: string,
  port: number,
  options: { attempts?: number; delayMs?: number; getter?: HttpGetter; signal?: AbortSignal } = {},
): Promise<HealthCheckResult> {
  const attempts = options.attempts ?? 1;
  const delayMs = options.delayMs ?? 0;
  let last: HealthCheckResult = { ok: false, reason: "No attempt was made." };
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    last = await checkServerHealth(host, port, options.getter, 10_000, options.signal);
    if (last.ok) return last;
    if (attempt < attempts - 1 && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return last;
}
