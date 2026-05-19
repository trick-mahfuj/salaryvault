"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { syncPull, syncPush, getSyncStatus, getLastSynced, onSyncStatusChange, extractSyncSettings } from "@/lib/clientSync";
import type { SyncStatus, FinancialData } from "@/lib/clientSync";
import { useStore } from "@/store/useStore";

export function useCrossBrowserSync() {
  const { user, updateUser, setTelegramConfig, setSecuritySettings } = useStore();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(getSyncStatus);
  const [lastSynced, setLastSynced] = useState<string | null>(getLastSynced);
  const [persistentActive, setPersistentActive] = useState(false);
  const initialSyncDone = useRef(false);

  useEffect(() => {
    const unsub = onSyncStatusChange((status) => {
      setSyncStatus(status);
      setLastSynced(getLastSynced());
      setPersistentActive(status === "connected");
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (initialSyncDone.current) return;
    initialSyncDone.current = true;

    const doInitialSync = async () => {
      const remote = await syncPull();
      if (remote && remote.settings) {
        const merged = {
          ...user,
          pinLock: remote.settings.pinEnabled as boolean ?? user.pinLock,
          pinCode: (remote.settings.pinHash as string) || user.pinCode,
        };
        if (merged.telegram) {
          if (remote.settings.telegramBotToken !== undefined) merged.telegram.botToken = remote.settings.telegramBotToken as string;
          if (remote.settings.telegramChatId !== undefined) merged.telegram.chatId = remote.settings.telegramChatId as string;
          if (remote.settings.telegramEnabled !== undefined) merged.telegram.enabled = remote.settings.telegramEnabled as boolean;
          if (remote.settings.telegramNotifyLogin !== undefined) merged.telegram.notifyLogin = remote.settings.telegramNotifyLogin as boolean;
          if (remote.settings.telegramNotifyFailedLogin !== undefined) merged.telegram.notifyFailedLogin = remote.settings.telegramNotifyFailedLogin as boolean;
          if (remote.settings.telegramNotifyPasswordChange !== undefined) merged.telegram.notifyPasswordChange = remote.settings.telegramNotifyPasswordChange as boolean;
          if (remote.settings.telegramNotifyLargeExpense !== undefined) merged.telegram.notifyLargeExpense = remote.settings.telegramNotifyLargeExpense as boolean;
          if (remote.settings.telegramNotifySettingsChange !== undefined) merged.telegram.notifySettingsChange = remote.settings.telegramNotifySettingsChange as boolean;
          if (remote.settings.telegramLargeExpenseThreshold !== undefined) merged.telegram.largeExpenseThreshold = remote.settings.telegramLargeExpenseThreshold as number;
        }
        if (merged.security) {
          if (remote.settings.rotationEnabled !== undefined) merged.security.passwordRotationEnabled = remote.settings.rotationEnabled as boolean;
          if (remote.settings.rotationInterval !== undefined) merged.security.rotationIntervalMinutes = remote.settings.rotationInterval as number;
          if (remote.settings.sessionTimeout !== undefined) merged.security.sessionTimeoutMinutes = remote.settings.sessionTimeout as number;
          if (remote.settings.maxLoginAttempts !== undefined) merged.security.maxLoginAttempts = remote.settings.maxLoginAttempts as number;
          if (remote.settings.lockoutDuration !== undefined) merged.security.lockoutDurationMinutes = remote.settings.lockoutDuration as number;
        }
        updateUser(merged);
      }

      // Merge financial data from server if available
      if (remote && remote.data) {
        const financial = remote.data as unknown as FinancialData;
        const patch: Record<string, unknown> = {};
        if (financial.salaries && Array.isArray(financial.salaries) && financial.salaries.length > 0) {
          patch.salaries = financial.salaries;
        }
        if (financial.expenses && Array.isArray(financial.expenses) && financial.expenses.length > 0) {
          patch.expenses = financial.expenses;
        }
        if (financial.goals && Array.isArray(financial.goals) && financial.goals.length > 0) {
          patch.goals = financial.goals;
        }
        if (financial.notes && Array.isArray(financial.notes) && financial.notes.length > 0) {
          patch.notes = financial.notes;
        }
        if (Object.keys(patch).length > 0) {
          useStore.setState(patch);
        }
      }
    };

    doInitialSync();
  }, []);

  const pushToServer = useCallback(async () => {
    const payload = extractSyncSettings(user);
    const ok = await syncPush({ settings: payload, timestamp: new Date().toISOString() });
    return ok;
  }, [user]);

  return {
    syncStatus,
    lastSynced,
    persistentActive,
    pushToServer,
    reSync: async () => {
      const remote = await syncPull();
      return remote;
    },
  };
}
