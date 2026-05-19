import {
  ensureUser,
  loadAllUserData,
  createSalary,
  createExpense,
  createGoal,
  createNote,
  saveAIMessage,
  upsertSecuritySettings,
  upsertTelegramConfig,
  createActivityLog,
  setAnalyticsCache,
  getAnalyticsCache,
} from "./db";
import * as crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;
const KEY_ENV = process.env.NEXT_PUBLIC_SESSION_SECRET || "mnit-ledger-secure-session-key-2026";

function deriveKey(): Buffer {
  return crypto.createHash("sha256").update(KEY_ENV).digest();
}

// Encrypt sensitive fields before storing in Supabase
export function encryptField(plaintext: string): string {
  if (!plaintext) return "";
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

export function decryptField(ciphertext: string): string | null {
  if (!ciphertext) return null;
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

// Backward-compatible wrappers for existing callers
export async function storeSettingsOnServer(data: Record<string, unknown>): Promise<void> {
  // This function is called by the sync API route.
  // We write the data directly to Supabase via the appropriate functions.
  // The caller passes { settings, data, __syncedAt } etc.
  // We extract the relevant parts and persist them.
  const userId = await ensureUser();

  if (data.settings) {
    const s = data.settings as Record<string, unknown>;
    const security: Record<string, unknown> = {};

    if (s.email !== undefined) security.email = s.email as string;
    if (s.hashedPassword !== undefined) security.hashed_password = s.hashedPassword as string;
    if (s.currentPasswordHash !== undefined) security.current_password_hash = s.currentPasswordHash as string;
    if (s.rotationEnabled !== undefined) security.password_rotation_enabled = s.rotationEnabled as boolean;
    if (s.rotationInterval !== undefined) security.rotation_interval_minutes = s.rotationInterval as number;
    if (s.sessionTimeout !== undefined) security.session_timeout_minutes = s.sessionTimeout as number;
    if (s.maxLoginAttempts !== undefined) security.max_login_attempts = s.maxLoginAttempts as number;
    if (s.lockoutDuration !== undefined) security.lockout_duration_minutes = s.lockoutDuration as number;
    if (s.lastPasswordChange !== undefined) security.last_password_change = s.lastPasswordChange as string;
    if (s.nextPasswordRotation !== undefined) security.next_password_rotation = s.nextPasswordRotation as string;

    if (Object.keys(security).length > 0) {
      await upsertSecuritySettings(userId, security);
    }

    const telegram: Record<string, unknown> = {};
    if (s.telegramBotToken !== undefined) telegram.bot_token = encryptField(s.telegramBotToken as string);
    if (s.telegramChatId !== undefined) telegram.chat_id = encryptField(s.telegramChatId as string);
    if (s.telegramEnabled !== undefined) telegram.enabled = s.telegramEnabled as boolean;
    if (s.telegramNotifyLogin !== undefined) telegram.notify_login = s.telegramNotifyLogin as boolean;
    if (s.telegramNotifyFailedLogin !== undefined) telegram.notify_failed_login = s.telegramNotifyFailedLogin as boolean;
    if (s.telegramNotifyPasswordChange !== undefined) telegram.notify_password_change = s.telegramNotifyPasswordChange as boolean;
    if (s.telegramNotifyLargeExpense !== undefined) telegram.notify_large_expense = s.telegramNotifyLargeExpense as boolean;
    if (s.telegramNotifySettingsChange !== undefined) telegram.notify_settings_change = s.telegramNotifySettingsChange as boolean;
    if (s.telegramLargeExpenseThreshold !== undefined) telegram.large_expense_threshold = s.telegramLargeExpenseThreshold as number;

    if (Object.keys(telegram).length > 0) {
      await upsertTelegramConfig(userId, telegram);
    }
  }

  if (data.data) {
    const d = data.data as Record<string, unknown>;
    // Financial data is handled by individual CRUD operations
    // The bulk data store is a fallback for backward compatibility
    await setAnalyticsCache(userId, "sync_data", d, 1440);
  }
}

export async function loadSettingsFromServer(): Promise<Record<string, unknown> | null> {
  const userId = await ensureUser();
  const all = await loadAllUserData(userId);

  // Build the same response shape as the old file-based approach
  const settings: Record<string, unknown> = {};
  const data: Record<string, unknown> = {};

  // Security settings
  if (all.security) {
    const s = all.security as Record<string, unknown>;
    settings.email = (s.email as string) || "";
    settings.hashedPassword = (s.hashed_password as string) || "";
    settings.currentPasswordHash = (s.current_password_hash as string) || "";
    settings.rotationEnabled = (s.password_rotation_enabled as boolean) ?? true;
    settings.rotationInterval = (s.rotation_interval_minutes as number) ?? 60;
    settings.sessionTimeout = (s.session_timeout_minutes as number) ?? 30;
    settings.maxLoginAttempts = (s.max_login_attempts as number) ?? 5;
    settings.lockoutDuration = (s.lockout_duration_minutes as number) ?? 15;
    settings.lastPasswordChange = (s.last_password_change as string) || "";
    settings.nextPasswordRotation = (s.next_password_rotation as string) || "";
  }

  // Telegram config — decrypt fields
  if (all.telegram) {
    const t = all.telegram as Record<string, unknown>;
    settings.telegramBotToken = t.bot_token ? (decryptField(t.bot_token as string) || "") : "";
    settings.telegramChatId = t.chat_id ? (decryptField(t.chat_id as string) || "") : "";
    settings.telegramEnabled = (t.enabled as boolean) ?? false;
    settings.telegramNotifyLogin = (t.notify_login as boolean) ?? true;
    settings.telegramNotifyFailedLogin = (t.notify_failed_login as boolean) ?? true;
    settings.telegramNotifyPasswordChange = (t.notify_password_change as boolean) ?? true;
    settings.telegramNotifyLargeExpense = (t.notify_large_expense as boolean) ?? true;
    settings.telegramNotifySettingsChange = (t.notify_settings_change as boolean) ?? true;
    settings.telegramLargeExpenseThreshold = (t.large_expense_threshold as number) ?? 10000;
  }

  // Financial data
  data.salaries = all.salaries || [];
  data.expenses = all.expenses || [];
  data.goals = all.goals || [];
  data.notes = all.notes || [];
  data.aiMessages = all.aiMessages || [];

  // Check analytics cache for any merged bulk data
  const cached = await getAnalyticsCache(userId, "sync_data");
  if (cached && typeof cached === "object") {
    Object.assign(data, cached as Record<string, unknown>);
  }

  return {
    settings,
    data,
    __syncedAt: new Date().toISOString(),
    sessions: all.sessions || [],
    activityLogs: all.activityLogs || [],
  };
}

export async function clearServerSettings(): Promise<void> {
  // Nothing to clear at the server level — individual records remain
  // A full reset would require deleting all user data
}

export { ensureUser, loadAllUserData } from "./db";
