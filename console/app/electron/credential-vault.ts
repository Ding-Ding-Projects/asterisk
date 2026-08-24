import { safeStorage } from "electron";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CredentialVault, VaultCredential } from "../../control-plane/ami-ari-transports.js";

/** OS-backed credential vault adapter. The files contain only Electron safeStorage ciphertext. */
export class ElectronCredentialVault implements CredentialVault {
  readonly #directory: string;

  constructor(userDataPath: string) {
    this.#directory = join(userDataPath, "credentials");
  }

  async read(key: string): Promise<VaultCredential | undefined> {
    if (!safeStorage.isEncryptionAvailable() || !validKey(key)) return undefined;
    const path = this.#path(key);
    if (!existsSync(path)) return undefined;
    try {
      const parsed = JSON.parse(safeStorage.decryptString(readFileSync(path))) as Partial<VaultCredential>;
      return typeof parsed.username === "string" && typeof parsed.secret === "string"
        ? { username: parsed.username, secret: parsed.secret }
        : undefined;
    } catch {
      return undefined;
    }
  }

  write(key: string, credential: VaultCredential): void {
    if (!safeStorage.isEncryptionAvailable() || !validKey(key)) throw new Error("The OS credential vault is unavailable or the key is invalid.");
    if (!credential.username || !credential.secret) throw new Error("A non-empty credential is required.");
    mkdirSync(this.#directory, { recursive: true });
    writeFileSync(this.#path(key), safeStorage.encryptString(JSON.stringify(credential)), { mode: 0o600 });
  }

  remove(key: string): void {
    if (!validKey(key)) throw new Error("Credential key is invalid.");
    const path = this.#path(key);
    if (existsSync(path)) writeFileSync(path, Buffer.alloc(0));
  }

  #path(key: string): string { return join(this.#directory, `${createHash("sha256").update(key).digest("hex")}.bin`); }
}

function validKey(key: string): boolean { return /^[A-Za-z0-9._:-]{1,160}$/u.test(key); }
