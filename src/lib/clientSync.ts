"use client";

export type SyncStatus = "idle" | "syncing" | "connected" | "error";

export interface SyncPayload {
  settings: Record<string, unknown>;
  timestamp: string;
}

let syncStatusListeners: Array<(status: SyncStatus) => void> = [];
let _currentStatus: SyncStatus = "idle";
let _lastSynced: string | null = null;

export function getSyncStatus(): SyncStatus {
  return _currentStatus;
}

export function getLastSynced(): string | null {
  return _lastSynced;
}

function notifyStatus(status: SyncStatus) {
  _currentStatus = status;
  syncStatusListeners.forEach((fn) => fn(status));
}

export function onSyncStatusChange(fn: (status: SyncStatus) => void) {
  syncStatusListeners.push(fn);
  return () => {
    syncStatusListeners = syncStatusListeners.filter((l) => l !== fn);
  };
}

export async function syncPull(): Promise<SyncPayload | null> {
  try {
    notifyStatus("syncing");
    const response = await fetch("/api/sync", {
      method: "GET",
      credentials: "same-origin",
      headers: { "Accept": "application/json" },
    });
    if (!response.ok) {
      notifyStatus("error");
      return null;
    }
    const data = await response.json();
    if (!data || !data.settings) {
      notifyStatus("connected");
      return null;
    }
    _lastSynced = data.timestamp || data.settings.__syncedAt || new Date().toISOString();
    notifyStatus("connected");
    return { settings: data.settings, timestamp: _lastSynced! };
  } catch {
    notifyStatus("error");
    return null;
  }
}

export async function syncPush(payload: SyncPayload): Promise<boolean> {
  try {
    notifyStatus("syncing");
    const response = await fetch("/api/sync", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: payload.settings, timestamp: payload.timestamp }),
    });
    if (!response.ok) {
      notifyStatus("error");
      return false;
    }
    _lastSynced = payload.timestamp;
    notifyStatus("connected");
    return true;
  } catch {
    notifyStatus("error");
    return false;
  }
}

export function extractSyncSettings(user: {
  pinLock?: boolean;
  pinCode?: string;
  telegram?: { botToken?: string; chatId?: string; enabled?: boolean; notifyLogin?: boolean; notifyFailedLogin?: boolean; notifyPasswordChange?: boolean; notifyLargeExpense?: boolean; notifySettingsChange?: boolean; largeExpenseThreshold?: number };
  security?: { passwordRotationEnabled?: boolean; rotationIntervalMinutes?: number; sessionTimeoutMinutes?: number; maxLoginAttempts?: number; lockoutDurationMinutes?: number; lastPasswordChange?: string; nextPasswordRotation?: string };
}): Record<string, unknown> {
  return {
    pinEnabled: user.pinLock ?? false,
    pinHash: user.pinCode ?? "",
    telegramBotToken: user.telegram?.botToken ?? "",
    telegramChatId: user.telegram?.chatId ?? "",
    telegramEnabled: user.telegram?.enabled ?? false,
    telegramNotifyLogin: user.telegram?.notifyLogin ?? true,
    telegramNotifyFailedLogin: user.telegram?.notifyFailedLogin ?? true,
    telegramNotifyPasswordChange: user.telegram?.notifyPasswordChange ?? true,
    telegramNotifyLargeExpense: user.telegram?.notifyLargeExpense ?? true,
    telegramNotifySettingsChange: user.telegram?.notifySettingsChange ?? true,
    telegramLargeExpenseThreshold: user.telegram?.largeExpenseThreshold ?? 10000,
    rotationEnabled: user.security?.passwordRotationEnabled ?? false,
    rotationInterval: user.security?.rotationIntervalMinutes ?? 60,
    sessionTimeout: user.security?.sessionTimeoutMinutes ?? 30,
    maxLoginAttempts: user.security?.maxLoginAttempts ?? 5,
    lockoutDuration: user.security?.lockoutDurationMinutes ?? 15,
    lastPasswordChange: user.security?.lastPasswordChange ?? "",
    nextPasswordRotation: user.security?.nextPasswordRotation ?? "",
  };
}

export function applySyncSettings(
  user: Record<string, unknown>,
  serverSettings: Record<string, unknown>
): Record<string, unknown> {
  const merged = { ...user };
  if (serverSettings.pinEnabled !== undefined) merged.pinLock = serverSettings.pinEnabled;
  if (serverSettings.pinHash) merged.pinCode = serverSettings.pinHash;
  if (!merged.telegram) merged.telegram = {};
  if (serverSettings.telegramBotToken !== undefined) (merged.telegram as Record<string, unknown>).botToken = serverSettings.telegramBotToken;
  if (serverSettings.telegramChatId !== undefined) (merged.telegram as Record<string, unknown>).chatId = serverSettings.telegramChatId;
  if (serverSettings.telegramEnabled !== undefined) (merged.telegram as Record<string, unknown>).enabled = serverSettings.telegramEnabled;
  if (serverSettings.telegramNotifyLogin !== undefined) (merged.telegram as Record<string, unknown>).notifyLogin = serverSettings.telegramNotifyLogin;
  if (serverSettings.telegramNotifyFailedLogin !== undefined) (merged.telegram as Record<string, unknown>).notifyFailedLogin = serverSettings.telegramNotifyFailedLogin;
  if (serverSettings.telegramNotifyPasswordChange !== undefined) (merged.telegram as Record<string, unknown>).notifyPasswordChange = serverSettings.telegramNotifyPasswordChange;
  if (serverSettings.telegramNotifyLargeExpense !== undefined) (merged.telegram as Record<string, unknown>).notifyLargeExpense = serverSettings.telegramNotifyLargeExpense;
  if (serverSettings.telegramNotifySettingsChange !== undefined) (merged.telegram as Record<string, unknown>).notifySettingsChange = serverSettings.telegramNotifySettingsChange;
  if (serverSettings.telegramLargeExpenseThreshold !== undefined) (merged.telegram as Record<string, unknown>).largeExpenseThreshold = serverSettings.telegramLargeExpenseThreshold;
  if (!merged.security) merged.security = {};
  if (serverSettings.rotationEnabled !== undefined) (merged.security as Record<string, unknown>).passwordRotationEnabled = serverSettings.rotationEnabled;
  if (serverSettings.rotationInterval !== undefined) (merged.security as Record<string, unknown>).rotationIntervalMinutes = serverSettings.rotationInterval;
  if (serverSettings.sessionTimeout !== undefined) (merged.security as Record<string, unknown>).sessionTimeoutMinutes = serverSettings.sessionTimeout;
  if (serverSettings.maxLoginAttempts !== undefined) (merged.security as Record<string, unknown>).maxLoginAttempts = serverSettings.maxLoginAttempts;
  if (serverSettings.lockoutDuration !== undefined) (merged.security as Record<string, unknown>).lockoutDurationMinutes = serverSettings.lockoutDuration;
  if (serverSettings.lastPasswordChange) (merged.security as Record<string, unknown>).lastPasswordChange = serverSettings.lastPasswordChange;
  if (serverSettings.nextPasswordRotation) (merged.security as Record<string, unknown>).nextPasswordRotation = serverSettings.nextPasswordRotation;
  return merged;
}
