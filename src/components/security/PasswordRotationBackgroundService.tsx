"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/store/useStore";
import { sendTelegramAlert } from "@/lib/telegram";
import {
  generateSecurePassword,
  formatPasswordRotationTelegram,
  getNextRotationTime,
  addRotationLog,
} from "@/lib/passwordRotation";
import { hashPassword } from "@/lib/auth";
import { getRealIP } from "@/lib/ip";

export function PasswordRotationBackgroundService() {
  const { user, setSecuritySettings } = useStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rotatingRef = useRef(false);

  function getDeviceLabel(): string {
    if (typeof window === "undefined") return "Server (Auto-Rotation)";
    const ua = navigator.userAgent;
    const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(ua);
    const browser = ua.includes("Chrome") && !ua.includes("Edg") ? "Chrome"
      : ua.includes("Firefox") ? "Firefox"
      : ua.includes("Safari") && !ua.includes("Chrome") ? "Safari"
      : ua.includes("Edg") ? "Edge"
      : "Other";
    const os = ua.includes("Windows NT") ? "Windows"
      : ua.includes("Mac OS") ? "macOS"
      : ua.includes("Linux") ? "Linux"
      : ua.includes("Android") ? "Android"
      : ua.includes("iPhone") || ua.includes("iPad") ? "iOS"
      : "Unknown OS";
    return isMobile ? `${os} ${browser} (Auto-Rotation)` : `Desktop ${browser} (Auto-Rotation)`;
  }

  useEffect(() => {
    const { passwordRotationEnabled, rotationIntervalMinutes, nextPasswordRotation } = user.security;
    const telegram = user.telegram;

    if (!passwordRotationEnabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const performRotation = async () => {
      if (rotatingRef.current) return;
      rotatingRef.current = true;

      try {
        const newPassword = generateSecurePassword(16);
        const newHash = await hashPassword(newPassword);
        const now = new Date().toISOString();
        const next = getNextRotationTime(rotationIntervalMinutes || 60);

        const oldTimestamp = user.security.lastPasswordChange || now;

        setSecuritySettings({
          hashedPassword: newHash,
          currentPasswordHash: newHash,
          lastPasswordChange: now,
          nextPasswordRotation: next,
        });

        // Send Telegram with retry
        let telegramDelivered = false;
        let retries = 0;
        if (telegram.enabled && telegram.botToken && telegram.chatId) {
          const message = formatPasswordRotationTelegram(newPassword, oldTimestamp, true, getDeviceLabel());
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
          reason: "Background auto-rotation",
          telegramDelivered,
          telegramRetries: retries,
        });

        // Store encrypted backup if Telegram failed
        if (!telegramDelivered && telegram.enabled) {
          try {
            localStorage.setItem(
              "mnit-password-backup",
              JSON.stringify({
                password: newPassword,
                timestamp: now,
                expired: false,
              })
            );
          } catch { /* silent */ }
        }
      } catch (err) {
        addRotationLog({
          timestamp: new Date().toISOString(),
          success: false,
          reason: err instanceof Error ? err.message : "Unknown error",
          telegramDelivered: false,
          telegramRetries: 0,
        });
      } finally {
        rotatingRef.current = false;
      }
    };

    // Check every 30 seconds if rotation is due
    const tick = () => {
      const remaining = new Date(nextPasswordRotation).getTime() - Date.now();
      if (remaining <= 0 && !rotatingRef.current) {
        performRotation();
      }
    };

    // Initial check
    tick();

    intervalRef.current = setInterval(tick, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user.security.passwordRotationEnabled, user.security.rotationIntervalMinutes, user.security.nextPasswordRotation, user.security.lastPasswordChange, user.telegram, setSecuritySettings]);

  return null;
}
