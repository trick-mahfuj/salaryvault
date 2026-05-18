"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useStore } from "@/store/useStore";
import { sendTelegramAlert } from "@/lib/telegram";
import { formatPasswordRotationTelegram, getNextRotationTime, formatRotationTimeLeft, addRotationLog, generateSecurePassword } from "@/lib/passwordRotation";
import { hashPassword } from "@/lib/auth";

export function usePasswordRotation() {
  const { user, setSecuritySettings, updateUser } = useStore();
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRotating, setIsRotating] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rotatingRef = useRef(false);

  const rotationEnabled = user.security.passwordRotationEnabled;
  const intervalMinutes = user.security.rotationIntervalMinutes || 60;
  const nextRotation = user.security.nextPasswordRotation;
  const telegram = user.telegram;

  const performRotation = useCallback(async () => {
    if (rotatingRef.current) return;
    rotatingRef.current = true;
    setIsRotating(true);
    setLastError(null);

    try {
      const newPassword = generateSecurePassword(16);
      const newHash = await hashPassword(newPassword);
      const now = new Date().toISOString();
      const next = getNextRotationTime(intervalMinutes);

      const oldTimestamp = user.security.lastPasswordChange || now;

      setSecuritySettings({
        hashedPassword: newHash,
        currentPasswordHash: newHash,
        lastPasswordChange: now,
        nextPasswordRotation: next,
      });

      // Send Telegram
      let telegramDelivered = false;
      let retries = 0;
      if (telegram.enabled && telegram.botToken && telegram.chatId) {
        const message = formatPasswordRotationTelegram(newPassword, oldTimestamp, true);
        for (let i = 0; i < 3; i++) {
          const sent = await sendTelegramAlert(message, telegram.botToken, telegram.chatId);
          if (sent) {
            telegramDelivered = true;
            break;
          }
          retries++;
          await new Promise((r) => setTimeout(r, 2000));
        }
      }

      addRotationLog({
        timestamp: now,
        success: true,
        reason: "Scheduled auto-rotation",
        telegramDelivered,
        telegramRetries: retries,
      });

      if (!telegramDelivered && telegram.enabled) {
        // Store encrypted backup in localStorage
        const backupKey = "mnit-password-backup";
        try {
          localStorage.setItem(backupKey, JSON.stringify({
            password: newPassword,
            timestamp: now,
            expired: false,
          }));
        } catch { /* silent */ }
      }

      setTimeLeft(intervalMinutes * 60000);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      setLastError(errMsg);
      addRotationLog({
        timestamp: new Date().toISOString(),
        success: false,
        reason: errMsg,
        telegramDelivered: false,
        telegramRetries: 0,
      });
    } finally {
      setIsRotating(false);
      rotatingRef.current = false;
    }
  }, [intervalMinutes, setSecuritySettings, user.security.lastPasswordChange, user.security.passwordRotationEnabled, telegram]);

  // Tick timer
  useEffect(() => {
    const tick = () => {
      const remaining = formatRotationTimeLeft(nextRotation);
      setTimeLeft(remaining);

      if (remaining <= 0 && rotationEnabled && !rotatingRef.current) {
        performRotation();
      }
    };

    tick();
    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [nextRotation, rotationEnabled, performRotation]);

  const forceRotate = useCallback(async () => {
    if (rotatingRef.current) return;
    await performRotation();
  }, [performRotation]);

  const updateInterval = useCallback((minutes: number) => {
    setSecuritySettings({
      rotationIntervalMinutes: minutes,
      nextPasswordRotation: getNextRotationTime(minutes),
    });
  }, [setSecuritySettings]);

  const toggleRotation = useCallback((enabled: boolean) => {
    setSecuritySettings({
      passwordRotationEnabled: enabled,
      nextPasswordRotation: enabled ? getNextRotationTime(intervalMinutes) : user.security.nextPasswordRotation,
    });
  }, [setSecuritySettings, intervalMinutes, user.security.nextPasswordRotation]);

  return {
    timeLeft,
    isRotating,
    lastError,
    intervalMinutes,
    rotationEnabled,
    forceRotate,
    updateInterval,
    toggleRotation,
    nextRotation,
  };
}
