import { safeStorage } from "electron";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import type { ToyLockCredentialReference } from "../../shared/locks.js";
import type { AuthLockVault } from "../../control-plane/auth-lock-runtime.js";
import { atomicWriteFileSync } from "../../control-plane/atomic-file.js";

type VaultEntry = { kind: "reversible" | "password-hash" | "totp"; ciphertext?: string; hash?: string; salt?: string; parameters?: { N: number; r: number; p: number } };
type VaultDocument = { version: 1; entries: Record<string, VaultEntry> };
const KEY = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/u;
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function decodeBase32(value: string): Buffer | undefined {
  const clean = value.replace(/\s+/gu, "").replace(/=+$/u, "").toUpperCase();
  if (!clean || clean.length > 512 || [1, 3, 6].includes(clean.length % 8)) return undefined;
  let bits = "";
  for (const char of clean) { const index = BASE32.indexOf(char); if (index < 0) return undefined; bits += index.toString(2).padStart(5, "0"); }
  const bytes = Buffer.alloc(Math.floor(bits.length / 8));
  for (let index = 0; index < bytes.length; index += 1) bytes[index] = Number.parseInt(bits.slice(index * 8, index * 8 + 8), 2);
  return bytes;
}
function verifyTotp(secret: string, code: string, atMs = Date.now()): boolean {
  const bytes = decodeBase32(secret);
  if (!bytes || !/^\d{6}$/u.test(code)) return false;
  const step = Math.floor(atMs / 30_000);
  for (let delta = -1; delta <= 1; delta += 1) {
    const counter = step + delta;
    if (counter < 0) continue;
    const counterBytes = Buffer.alloc(8); counterBytes.writeBigUInt64BE(BigInt(counter));
    const digest = createHmac("sha1", bytes).update(counterBytes).digest();
    const offset = digest[digest.length - 1]! & 0x0f;
    const binary = ((digest[offset]! & 0x7f) << 24) | ((digest[offset + 1]! & 0xff) << 16) | ((digest[offset + 2]! & 0xff) << 8) | (digest[offset + 3]! & 0xff);
    const expected = String(binary % 1_000_000).padStart(6, "0");
    if (expected === code) return true;
  }
  return false;
}

export class ElectronCredentialVault implements AuthLockVault {
  readonly #path: string;
  #mutation: Promise<void> = Promise.resolve();
  constructor(path: string) { this.#path = path; }
  get available(): boolean { return safeStorage.isEncryptionAvailable(); }

  #read(): VaultDocument {
    try {
      const parsed = JSON.parse(readFileSync(this.#path, "utf8")) as VaultDocument;
      if (parsed.version !== 1 || !parsed.entries || typeof parsed.entries !== "object") throw new Error("invalid vault document");
      for (const [key, value] of Object.entries(parsed.entries as Record<string, VaultEntry | string>)) if (typeof value === "string") parsed.entries[key] = { kind: "reversible", ciphertext: value };
      return parsed;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { version: 1, entries: {} };
      throw error;
    }
  }

  #write(document: VaultDocument): void {
    atomicWriteFileSync(this.#path, `${JSON.stringify(document)}\n`);
  }

  async #serialize<T>(operation: () => Promise<T>): Promise<T> { const prior = this.#mutation; let release!: () => void; this.#mutation = new Promise<void>((resolve) => { release = resolve; }); await prior; try { return await operation(); } finally { release(); } }

  async setSecret(key: string, secret: string, kind: "reversible" | "password-hash" | "totp" = "reversible") { return await this.#serialize(() => this.#setSecret(key, secret, kind)); }
  async #setSecret(key: string, secret: string, kind: "reversible" | "password-hash" | "totp" = "reversible") {
    if (!this.available) return { ok: false as const, code: "vault-unavailable" as const, message: "The operating-system credential vault is unavailable." };
    if (!KEY.test(key) || typeof secret !== "string" || secret.length < 1 || secret.length > 4_096) return { ok: false as const, code: "vault-error" as const, message: "The credential request is outside its safety bound." };
    try {
      const document = this.#read();
      if (kind === "password-hash") {
        const salt = randomBytes(16);
        const parameters = { N: 32_768, r: 8, p: 1 };
        const hash = scryptSync(secret, salt, 32, parameters).toString("base64");
        document.entries[key] = { kind: "password-hash", ciphertext: safeStorage.encryptString(JSON.stringify({ hash, salt: salt.toString("base64"), parameters })).toString("base64") };
      } else {
        document.entries[key] = { kind, ciphertext: safeStorage.encryptString(secret).toString("base64") };
      }
      this.#write(document);
      return { ok: true as const, value: undefined };
    }
    catch { return { ok: false as const, code: "vault-error" as const, message: "The operating-system credential vault could not save the credential." }; }
  }

  async getSecret(key: string) {
    if (!this.available) return { ok: false as const, code: "vault-unavailable" as const, message: "The operating-system credential vault is unavailable." };
    if (!KEY.test(key)) return { ok: false as const, code: "vault-error" as const, message: "The credential reference is malformed." };
    try {
      const entry = this.#read().entries[key];
      if (!entry) return { ok: false as const, code: "vault-error" as const, message: "The credential reference was not found." };
      if (!entry.ciphertext || entry.kind === "password-hash") return { ok: false as const, code: "vault-error" as const, message: "This credential is not reversibly readable." };
      return { ok: true as const, value: safeStorage.decryptString(Buffer.from(entry.ciphertext, "base64")) };
    }
    catch { return { ok: false as const, code: "vault-error" as const, message: "The operating-system credential vault could not read the credential." }; }
  }

  async deleteSecret(key: string) { return await this.#serialize(() => this.#deleteSecret(key)); }
  async #deleteSecret(key: string) {
    if (!this.available) return { ok: false as const, code: "vault-unavailable" as const, message: "The operating-system credential vault is unavailable." };
    try { const document = this.#read(); if (!(key in document.entries)) return { ok: false as const, code: "vault-error" as const, message: "The credential reference was not found." }; delete document.entries[key]; this.#write(document); return { ok: true as const, value: undefined }; }
    catch { return { ok: false as const, code: "vault-error" as const, message: "The operating-system credential vault could not remove the credential." }; }
  }

  async has(reference: ToyLockCredentialReference): Promise<boolean> { try { return Boolean(this.#read().entries[reference.vaultAccount]); } catch { return false; } }
  async verify(reference: ToyLockCredentialReference, candidate: Uint8Array): Promise<boolean> { return await this.#serialize(() => this.#verify(reference, candidate)); }
  async #verify(reference: ToyLockCredentialReference, candidate: Uint8Array): Promise<boolean> {
    const value = new TextDecoder().decode(candidate);
    try {
      const entry = this.#read().entries[reference.vaultAccount];
      if (!entry) return false;
      if (reference.method === "totp") {
        if (!entry.ciphertext) return false;
        return verifyTotp(safeStorage.decryptString(Buffer.from(entry.ciphertext, "base64")), value);
      }
      let hash = entry.hash; let salt = entry.salt; let parameters = entry.parameters;
      if (entry.kind === "password-hash" && entry.ciphertext) {
        const envelope = JSON.parse(safeStorage.decryptString(Buffer.from(entry.ciphertext, "base64"))) as { hash?: string; salt?: string; parameters?: { N: number; r: number; p: number } };
        hash = envelope.hash; salt = envelope.salt; parameters = envelope.parameters;
      } else if (entry.kind === "reversible" && entry.ciphertext) {
        const legacy = safeStorage.decryptString(Buffer.from(entry.ciphertext, "base64"));
        const expectedLegacy = Buffer.from(legacy, "utf8"); const suppliedLegacy = Buffer.from(value, "utf8");
        const matches = expectedLegacy.length === suppliedLegacy.length && timingSafeEqual(expectedLegacy, suppliedLegacy);
        if (matches) {
          const migratedSalt = randomBytes(16); const migratedParameters = { N: 32_768, r: 8, p: 1 }; const migratedHash = scryptSync(legacy, migratedSalt, 32, migratedParameters).toString("base64");
          const document = this.#read(); document.entries[reference.vaultAccount] = { kind: "password-hash", ciphertext: safeStorage.encryptString(JSON.stringify({ hash: migratedHash, salt: migratedSalt.toString("base64"), parameters: migratedParameters })).toString("base64") }; this.#write(document);
        }
        return matches;
      }
      if (!hash || !salt || !parameters) return false;
      const supplied = scryptSync(value, Buffer.from(salt, "base64"), 32, parameters);
      const expected = Buffer.from(hash, "base64");
      return expected.length === supplied.length && timingSafeEqual(expected, supplied);
    } catch { return false; }
  }
  async remove(reference: ToyLockCredentialReference): Promise<boolean> { return (await this.deleteSecret(reference.vaultAccount)).ok; }
}
