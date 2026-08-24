import { safeStorage } from "electron";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import type { EncryptedHistorySnapshot, HistorySnapshotProtector } from "../../shared/history.js";
import { atomicWriteFileSync } from "../../control-plane/atomic-file.js";

export class ElectronHistorySnapshotProtector implements HistorySnapshotProtector {
  readonly #path: string;
  #key: Buffer | undefined;
  constructor(path: string) {
    this.#path = path;
    this.#loadKey();
  }
  #loadKey(): Buffer | undefined {
    if (this.#key) return this.#key;
    try { if (!safeStorage.isEncryptionAvailable()) return undefined; } catch { return undefined; }
    try {
      const stored = readFileSync(this.#path, "utf8").trim();
      const decoded = safeStorage.decryptString(Buffer.from(stored, "base64"));
      this.#key = decoded ? Buffer.from(decoded, "base64") : undefined;
    } catch {
      try {
        const key = randomBytes(32);
        atomicWriteFileSync(this.#path, safeStorage.encryptString(key.toString("base64")).toString("base64"));
        this.#key = key;
      } catch { this.#key = undefined; }
    }
    if (this.#key?.length !== 32) this.#key = undefined;
    return this.#key;
  }
  get available(): boolean { return this.#loadKey()?.length === 32; }

  async seal(stableRecordId: string, snapshot: unknown): Promise<EncryptedHistorySnapshot> {
    const key = this.#loadKey();
    if (!key) throw new Error("History encryption is unavailable.");
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    cipher.setAAD(Buffer.from(stableRecordId, "utf8"));
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(snapshot), "utf8"), cipher.final()]);
    return { version: 1, algorithm: "AES-256-GCM", keyReference: "electron-safe-storage/history-key", stableRecordId, ivBase64: iv.toString("base64"), ciphertextBase64: ciphertext.toString("base64"), authenticationTagBase64: cipher.getAuthTag().toString("base64"), aadVersion: 1 };
  }

  async open(envelope: EncryptedHistorySnapshot): Promise<unknown> {
    const key = this.#loadKey();
    if (!key) throw new Error("History encryption is unavailable.");
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(envelope.ivBase64, "base64"));
    decipher.setAAD(Buffer.from(envelope.stableRecordId, "utf8"));
    decipher.setAuthTag(Buffer.from(envelope.authenticationTagBase64, "base64"));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.ciphertextBase64, "base64")), decipher.final()]).toString("utf8"));
  }
}
