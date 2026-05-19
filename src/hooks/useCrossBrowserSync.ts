"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { syncPull, syncPush, getSyncStatus, getLastSynced, onSyncStatusChange, extractSyncSettings } from "@/lib/clientSync";
import type { SyncStatus } from "@/lib/clientSync";
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
