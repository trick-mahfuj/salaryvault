"use client";

export type SyncStatus = "idle" | "syncing" | "connected" | "error";

export interface SyncPayload {
  settings?: Record<string, unknown>;
  data?: Record<string, unknown>;
  timestamp: string;
}

export interface FinancialData {
  salaries: Record<string, unknown>[];
  expenses: Record<string, unknown>[];
  goals: Record<string, unknown>[];
  notes: Record<string, unknown>[];
}

let syncStatusListeners: Array<(status: SyncStatus) => void> = [];
let _currentStatus: SyncStatus = "idle";
let _lastSynced: string | null = null;
let _debounceTimer: ReturnType<typeof setTimeout> | null = null;

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
    _lastSynced = data.__syncedAt || new Date().toISOString();
    notifyStatus("connected");
    return {
      settings: data.settings || undefined,
      data: data.data || undefined,
      timestamp: _lastSynced!,
    };
  } catch {
    notifyStatus("error");
    return null;
  }
}

export async function syncPush(payload: SyncPayload): Promise<boolean> {
  try {
    notifyStatus("syncing");
    const body: Record<string, unknown> = { timestamp: payload.timestamp };
    if (payload.settings) body.settings = payload.settings;
    if (payload.data) body.data = payload.data;
    const response = await fetch("/api/sync", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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

// Extract financial data from store state for sync
export function extractFinancialData(state: {
  salaries: unknown[];
  expenses: unknown[];
  goals: unknown[];
  notes: unknown[];
}): FinancialData {
  return {
    salaries: state.salaries as Record<string, unknown>[],
    expenses: state.expenses as Record<string, unknown>[],
    goals: state.goals as Record<string, unknown>[],
    notes: state.notes as Record<string, unknown>[],
  };
}

// Debounced sync for financial data — batches rapid mutations
export function scheduleSyncData(
  state: { salaries: unknown[]; expenses: unknown[]; goals: unknown[]; notes: unknown[] },
  delayMs = 2000
): void {
  if (_debounceTimer) clearTimeout(_debounceTimer);
  _debounceTimer = setTimeout(() => {
    _debounceTimer = null;
    const financial = extractFinancialData(state);
    syncPush({ data: financial as unknown as Record<string, unknown>, timestamp: new Date().toISOString() });
  }, delayMs);
}

export function cancelPendingSync(): void {
  if (_debounceTimer) {
    clearTimeout(_debounceTimer);
    _debounceTimer = null;
  }
}

export function extractSyncSettings(user: {
  pinLock?: boolean;
  pinCode?: string;
  telegram?: { botToken?: string; chatId?: string; enabled?: boolean; notifyLogin?: boolean; notifyFailedLogin?: boolean; notifyPasswordChange?: boolean; notifyLargeExpense?: boolean; notifySettingsChange?: boolean; largeExpenseThreshold?: number };
  security?: { passwordRotationEnabled?: boolean; rotationIntervalMinutes?: number; sessionTimeoutMinutes?: number; maxLoginAttempts?: number; lockoutDurationMinutes?: number; lastPasswordChange?: string; nextPasswordRotation?: string; email?: string; hashedPassword?: string; currentPasswordHash?: string };
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
    email: user.security?.email ?? "",
    hashedPassword: user.security?.hashedPassword ?? "",
    currentPasswordHash: user.security?.currentPasswordHash ?? "",
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
  if (serverSettings.email) (merged.security as Record<string, unknown>).email = serverSettings.email;
  if (serverSettings.hashedPassword) (merged.security as Record<string, unknown>).hashedPassword = serverSettings.hashedPassword;
  if (serverSettings.currentPasswordHash) (merged.security as Record<string, unknown>).currentPasswordHash = serverSettings.currentPasswordHash;
  return merged;
}
