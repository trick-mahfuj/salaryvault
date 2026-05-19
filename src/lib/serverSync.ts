import { promises as fs } from "fs";
import * as path from "path";
import * as crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;
const SYNC_FILE = path.join(process.cwd(), ".mnit-sync", "settings.json");
const KEY_ENV = process.env.NEXT_PUBLIC_SESSION_SECRET || "mnit-ledger-secure-session-key-2026";

function deriveKey(): Buffer {
  return crypto.createHash("sha256").update(KEY_ENV).digest();
}

function getInMemoryStore(): Map<string, string> {
  const g = global as Record<string, unknown>;
  if (!g.__mnitSyncStore) {
    g.__mnitSyncStore = new Map<string, string>();
  }
  return g.__mnitSyncStore as Map<string, string>;
}

export function encryptSettings(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

export function decryptSettings(ciphertext: string): string | null {
  try {
    const parts = ciphertext.split(":");
    if (parts.length !== 2) return null;
    const iv = Buffer.from(parts[0], "hex");
    const encrypted = parts[1];
    const key = deriveKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return null;
  }
}

export async function storeSettingsOnServer(data: Record<string, unknown>): Promise<void> {
  const serialized = JSON.stringify({ ...data, __syncedAt: new Date().toISOString() });
  const encrypted = encryptSettings(serialized);

  getInMemoryStore().set("settings", encrypted);

  try {
    await fs.mkdir(path.dirname(SYNC_FILE), { recursive: true });
    await fs.writeFile(SYNC_FILE, encrypted, "utf8");
  } catch {
    // File write failed, but in-memory store still works for current session
  }
}

export async function loadSettingsFromServer(): Promise<Record<string, unknown> | null> {
  let encrypted: string | undefined;

  encrypted = getInMemoryStore().get("settings");
  if (!encrypted) {
    try {
      encrypted = await fs.readFile(SYNC_FILE, "utf8");
    } catch {
      return null;
    }
  }

  if (!encrypted) return null;

  const decrypted = decryptSettings(encrypted);
  if (!decrypted) return null;

  try {
    return JSON.parse(decrypted);
  } catch {
    return null;
  }
}

export async function clearServerSettings(): Promise<void> {
  getInMemoryStore().delete("settings");
  try {
    await fs.unlink(SYNC_FILE);
  } catch {
    // File may not exist
  }
}

export function getSyncStorePath(): string {
  return SYNC_FILE;
}
