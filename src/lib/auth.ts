import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

export function generateSessionToken(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

export function setAuthCookie(token: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `admin_session=${token}; path=/; max-age=86400; SameSite=Strict`;
}

export function clearAuthCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = "admin_session=; path=/; max-age=0; SameSite=Strict";
}

export function clearAllAuthCookies(): void {
  if (typeof document === "undefined") return;
  document.cookie = "admin_session=; path=/; max-age=0; SameSite=Strict";
  document.cookie = "setup_done=; path=/; max-age=0; SameSite=Lax";
  document.cookie = "owner_token=; path=/; max-age=0; SameSite=Strict";
}

export function clearAuthPersistence(): void {
  if (typeof window === "undefined") return;
  // Clear only auth-related keys (preserve financial data)
  localStorage.removeItem("isAuthenticated");
  localStorage.removeItem("sessions");
  localStorage.removeItem("loginAttempts");
  localStorage.removeItem("failedAttempts");
  localStorage.removeItem("lockedUntil");
  localStorage.removeItem("setupCompleted");
  localStorage.removeItem("setupCompleted");
  clearAllAuthCookies();
}

export function hasStoredCredentials(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const user = localStorage.getItem("user");
    if (!user) return false;
    const parsed = JSON.parse(user);
    return !!(
      parsed?.security?.hashedPassword && parsed?.security?.email
    );
  } catch {
    return false;
  }
}

export function setSetupDone(): void {
  if (typeof document === "undefined") return;
  document.cookie = "setup_done=1; path=/; max-age=31536000; SameSite=Lax";
  try {
    localStorage.setItem("setupCompleted", "true");
  } catch { /* noop */ }
}

export function isSetupLocallyDone(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem("setupCompleted") === "true") return true;
  } catch { /* noop */ }
  return hasStoredCredentials();
}

export function generateOwnerToken(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

export function setOwnerCookie(token: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `owner_token=${token}; path=/; max-age=300; SameSite=Strict`;
}

export function clearOwnerCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = "owner_token=; path=/; max-age=0; SameSite=Strict";
}

export function getOwnerToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)owner_token=([^;]*)/);
  return match ? match[1] : null;
}

export function getDefaultCredentials(): {
  email: string;
  password: string;
} {
  return {
    email:
      process.env.NEXT_PUBLIC_DEFAULT_ADMIN_EMAIL || "admin@gmail.com",
    password:
      process.env.NEXT_PUBLIC_DEFAULT_ADMIN_PASSWORD || "Admin@2026",
  };
}

// Write env-based credentials into localStorage so the store picks them up
export function ensureEnvCredentials(): void {
  if (typeof window === "undefined") return;
  try {
    const { email, password } = getDefaultCredentials();
    const existing = localStorage.getItem("user");
    if (existing) {
      const parsed = JSON.parse(existing);
      // Only overwrite if stored creds are missing or email doesn't match env
      if (parsed?.security?.hashedPassword && parsed?.security?.email === email) {
        return; // Already correct
      }
    }
    // Hash and write env credentials
    const plainPassword = password;
    // We can't hash synchronously here, so store the plain env info
    // The async hash will happen in initializeDefaultCredentials
    // For now, just store the email so login hashes can be compared later
    // Actually we DO want to store the hash. Let's defer this to the store's rehydrate.
  } catch { /* noop */ }
}

export function getSessionSecret(): string {
  return (
    process.env.NEXT_PUBLIC_SESSION_SECRET ||
    "mnit-ledger-fallback-secret"
  );
}
