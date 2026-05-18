"use client";

// Hybrid storage: localStorage primary + cookie backup for critical settings
// Cookies survive browser restart and same-domain access; localStorage is faster

export function setPersistentItem(key: string, value: string, isCritical = false): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, value); } catch { /* quota exceeded */ }
  if (isCritical) {
    try {
      document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`;
    } catch { /* cookie blocked */ }
  }
}

export function getPersistentItem(key: string, isCritical = false): string | null {
  if (typeof window === "undefined") return null;

  // For critical settings, try cookie first (more durable), then localStorage
  if (isCritical) {
    try {
      const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${encodeURIComponent(key)}=([^;]*)`));
      if (match) return decodeURIComponent(match[1]);
    } catch { /* fall through to localStorage */ }
  }

  try {
    const val = localStorage.getItem(key);
    if (val !== null) return val;
  } catch { /* noop */ }

  // If critical and not found in localStorage either, try cookie anyway
  if (isCritical) {
    try {
      const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${encodeURIComponent(key)}=([^;]*)`));
      if (match) return decodeURIComponent(match[1]);
    } catch { /* noop */ }
  }

  return null;
}

export function removePersistentItem(key: string, isCritical = false): void {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(key); } catch { /* noop */ }
  if (isCritical) {
    try {
      document.cookie = `${encodeURIComponent(key)}=; path=/; max-age=0; SameSite=Lax`;
    } catch { /* noop */ }
  }
}

// Critical settings keys that need cookie backup
export const CRITICAL_KEYS = {
  PIN_ENABLED: "mnit-pin-enabled",
  PIN_HASH: "mnit-pin-hash",
  TELEGRAM_BOT_TOKEN: "mnit-telegram-bot-token",
  TELEGRAM_CHAT_ID: "mnit-telegram-chat-id",
  TELEGRAM_ENABLED: "mnit-telegram-enabled",
  ROTATION_ENABLED: "mnit-rotation-enabled",
  ROTATION_INTERVAL: "mnit-rotation-interval",
  SESSION_TIMEOUT: "mnit-session-timeout",
} as const;

// Simple hash function for PIN (not bcrypt — synchronous for speed)
// The PIN is short (4 digits), so this is obfuscation, not true encryption
export function hashPin(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return "pin-" + Math.abs(hash).toString(36) + "-" + pin.length;
}

export function verifyPin(input: string, storedHash: string): boolean {
  return hashPin(input) === storedHash;
}

// Sync critical settings from store to cookies
export function syncCriticalSettings(settings: {
  pinEnabled: boolean;
  pinHash: string;
  telegramBotToken: string;
  telegramChatId: string;
  telegramEnabled: boolean;
  rotationEnabled: boolean;
  rotationInterval: number;
  sessionTimeout: number;
}): void {
  setPersistentItem(CRITICAL_KEYS.PIN_ENABLED, String(settings.pinEnabled), true);
  setPersistentItem(CRITICAL_KEYS.PIN_HASH, settings.pinHash, true);
  setPersistentItem(CRITICAL_KEYS.TELEGRAM_BOT_TOKEN, settings.telegramBotToken, true);
  setPersistentItem(CRITICAL_KEYS.TELEGRAM_CHAT_ID, settings.telegramChatId, true);
  setPersistentItem(CRITICAL_KEYS.TELEGRAM_ENABLED, String(settings.telegramEnabled), true);
  setPersistentItem(CRITICAL_KEYS.ROTATION_ENABLED, String(settings.rotationEnabled), true);
  setPersistentItem(CRITICAL_KEYS.ROTATION_INTERVAL, String(settings.rotationInterval), true);
  setPersistentItem(CRITICAL_KEYS.SESSION_TIMEOUT, String(settings.sessionTimeout), true);
}

// Load critical settings from cookies (most durable source)
export function loadCriticalSettings(): Partial<{
  pinEnabled: boolean;
  pinHash: string;
  telegramBotToken: string;
  telegramChatId: string;
  telegramEnabled: boolean;
  rotationEnabled: boolean;
  rotationInterval: number;
  sessionTimeout: number;
}> {
  const result: Record<string, unknown> = {};

  const pinEnabled = getPersistentItem(CRITICAL_KEYS.PIN_ENABLED, true);
  if (pinEnabled !== null) result.pinEnabled = pinEnabled === "true";

  const pinHash = getPersistentItem(CRITICAL_KEYS.PIN_HASH, true);
  if (pinHash !== null) result.pinHash = pinHash;

  const botToken = getPersistentItem(CRITICAL_KEYS.TELEGRAM_BOT_TOKEN, true);
  if (botToken !== null) result.telegramBotToken = botToken;

  const chatId = getPersistentItem(CRITICAL_KEYS.TELEGRAM_CHAT_ID, true);
  if (chatId !== null) result.telegramChatId = chatId;

  const tgEnabled = getPersistentItem(CRITICAL_KEYS.TELEGRAM_ENABLED, true);
  if (tgEnabled !== null) result.telegramEnabled = tgEnabled === "true";

  const rotEnabled = getPersistentItem(CRITICAL_KEYS.ROTATION_ENABLED, true);
  if (rotEnabled !== null) result.rotationEnabled = rotEnabled === "true";

  const rotInterval = getPersistentItem(CRITICAL_KEYS.ROTATION_INTERVAL, true);
  if (rotInterval !== null) result.rotationInterval = parseInt(rotInterval, 10) || 60;

  const sessTimeout = getPersistentItem(CRITICAL_KEYS.SESSION_TIMEOUT, true);
  if (sessTimeout !== null) result.sessionTimeout = parseInt(sessTimeout, 10) || 30;

  return result;
}
