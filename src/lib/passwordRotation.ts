"use client";

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghjkmnpqrstuvwxyz";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%&*";

function secureRandom(arr: string): string {
  const idx = Math.floor(Math.random() * arr.length);
  return arr[idx];
}

function secureShuffle(arr: string[]): string[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function generateSecurePassword(length = 16): string {
  const allChars = UPPER + LOWER + DIGITS + SYMBOLS;
  let pwd = "";

  // Ensure at least 2 of each type
  pwd += secureRandom(UPPER);
  pwd += secureRandom(UPPER);
  pwd += secureRandom(LOWER);
  pwd += secureRandom(LOWER);
  pwd += secureRandom(DIGITS);
  pwd += secureRandom(SYMBOLS);

  // Fill remaining
  for (let i = pwd.length; i < length; i++) {
    pwd += secureRandom(allChars);
  }

  return secureShuffle(pwd.split("")).join("");
}

export function generatePasswordWithPrefix(prefix = "Admin"): string {
  const random = generateSecurePassword(14);
  const suffix = random.slice(0, 8);
  return `${prefix}#${suffix}`;
}

export function getNextRotationTime(intervalMinutes: number): string {
  return new Date(Date.now() + intervalMinutes * 60000).toISOString();
}

export function formatRotationTimeLeft(nextRotation: string): number {
  return Math.max(0, new Date(nextRotation).getTime() - Date.now());
}

export function formatTimeDisplay(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function formatPasswordRotationTelegram(
  newPassword: string,
  oldTimestamp: string,
  success: boolean
): string {
  const time = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Dhaka",
    dateStyle: "full",
    timeStyle: "medium",
  });

  return [
    `<b>🔐 Admin Password Rotated</b>`,
    ``,
    `<b>New Password:</b>`,
    `<code>${newPassword}</code>`,
    ``,
    `<b>Time:</b> ${time}`,
    `<b>Previous Rotation:</b> ${new Date(oldTimestamp).toLocaleString("en-US", { timeZone: "Asia/Dhaka", dateStyle: "full", timeStyle: "medium" })}`,
    `<b>Device:</b> Local Server`,
    `<b>Security Status:</b> ${success ? "Rotation Successful ✅" : "Rotation Failed ❌"}`,
    ``,
    `<b>⚠️ IMPORTANT:</b> This password will be valid until the next rotation.`,
  ].join("\n");
}

export function formatRotationLog(
  action: string,
  details: string,
  success: boolean
): string {
  return JSON.stringify({
    action,
    details,
    success,
    timestamp: new Date().toISOString(),
  });
}

const HISTORY_KEY = "mnit-password-rotation-history";

export function getRotationHistory(): RotationLog[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export interface RotationLog {
  timestamp: string;
  success: boolean;
  reason: string;
  telegramDelivered: boolean;
  telegramRetries: number;
}

export function addRotationLog(log: RotationLog): void {
  if (typeof window === "undefined") return;
  try {
    const history = getRotationHistory();
    history.unshift(log);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 100)));
  } catch { /* silent */ }
}

export function clearRotationHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(HISTORY_KEY);
}
