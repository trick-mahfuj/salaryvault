"use client";

import { create } from "zustand";
import {
  type Salary,
  type Expense,
  type SavingsGoal,
  type Note,
  type ActivityLog,
  type UserProfile,
  type MonthlySummary,
  type Transaction,
  type LoginAttempt,
  type Session,
  type SecuritySettings,
  type TelegramConfig,
} from "@/types";
import { generateId } from "@/lib/utils";
import { hashPassword, comparePassword, generateSessionToken, setAuthCookie, clearAuthCookie, getDefaultCredentials, clearAllAuthCookies } from "@/lib/auth";
import { sendTelegramAlert, formatSecurityAlert } from "@/lib/telegram";
import { getRealIP } from "@/lib/ip";
import {
  syncCriticalSettings, loadCriticalSettings, verifyPin,
} from "@/lib/persistentStorage";

interface AppState {
  hydrated: boolean;
  setupRequired: boolean;
  salaries: Salary[];
  expenses: Expense[];
  goals: SavingsGoal[];
  notes: Note[];
  activityLogs: ActivityLog[];
  loginAttempts: LoginAttempt[];
  sessions: Session[];
  isAuthenticated: boolean;
  user: UserProfile;
  darkMode: boolean;
  failedAttempts: number;
  lockedUntil: number;
  lastActivity: number;

  rehydrate: () => void;
  initializeDefaultCredentials: () => Promise<void>;
  addSalary: (salary: Omit<Salary, "id" | "createdAt">) => void;
  updateSalary: (id: string, data: Partial<Salary>) => void;
  deleteSalary: (id: string) => void;
  addExpense: (expense: Omit<Expense, "id" | "createdAt">) => void;
  updateExpense: (id: string, data: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  addGoal: (goal: Omit<SavingsGoal, "id" | "createdAt">) => void;
  updateGoal: (id: string, data: Partial<SavingsGoal>) => void;
  deleteGoal: (id: string) => void;
  addNote: (note: Omit<Note, "id" | "createdAt" | "updatedAt">) => void;
  updateNote: (id: string, data: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  addActivityLog: (log: Omit<ActivityLog, "id" | "timestamp">) => void;
  login: (password?: string) => Promise<boolean>;
  securityLogin: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (data: Partial<UserProfile>) => void;
  toggleDarkMode: () => void;
  addLoginAttempt: (success: boolean) => void;
  rotatePassword: () => Promise<string>;
  updateLastActivity: () => void;
  removeSession: (id: string) => void;
  clearAllSessions: () => void;
  setTelegramConfig: (config: Partial<TelegramConfig>) => void;
  setSecuritySettings: (settings: Partial<SecuritySettings>) => void;

  getTotalSalary: () => number;
  getTotalExpenses: () => number;
  getCurrentBalance: () => number;
  getMonthlySalary: (month: string, year: number) => number;
  getMonthlyExpenses: (month: string, year: number) => number;
  getMonthlySummary: () => MonthlySummary[];
  getRecentTransactions: (limit?: number) => Transaction[];
  getExpensesByCategory: () => { name: string; value: number; color: string }[];
  getMonthlySalaryData: () => { month: string; salary: number; expenses: number; savings: number }[];
}

const CATEGORY_COLORS: Record<string, string> = {
  Food: "#f43f5e", Transport: "#f97316", Internet: "#3b82f6",
  "Mobile Recharge": "#8b5cf6", Family: "#ec4899", Shopping: "#14b8a6",
  Gaming: "#ef4444", Bills: "#eab308", Personal: "#6366f1", Other: "#6b7280",
};

const saveToStorage = (key: string, value: unknown) => {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* noop */ }
};

function getDeviceInfo() {
  if (typeof window === "undefined") return { device: "Unknown", browser: "Unknown", ip: "Unknown IP" };
  const ua = navigator.userAgent;
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  const browser = ua.includes("Chrome") ? "Chrome" : ua.includes("Firefox") ? "Firefox" : ua.includes("Safari") ? "Safari" : ua.includes("Edg") ? "Edge" : "Other";
  return { device: isMobile ? "Mobile" : "Desktop", browser, ip: getRealIP() };
}

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  let pwd = "";
  for (let i = 0; i < 16; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  return pwd;
}

async function sendTelegramEvent(event: string, details: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem("user");
    if (!stored) return;
    const u = JSON.parse(stored);
    if (!u.telegram?.enabled || !u.telegram?.botToken || !u.telegram?.chatId) return;

    // Read real IP from middleware cookie; override hardcoded IPs
    const realIp = getRealIP();
    const enrichedDetails = {
      ...details,
      ip: details.ip === "127.0.0.1" || details.ip === "Local" || details.ip === "Unknown IP"
        ? realIp : details.ip,
      route: details.route || (typeof window !== "undefined" ? window.location.pathname : ""),
    };

    await sendTelegramAlert(
      formatSecurityAlert(event, enrichedDetails),
      u.telegram.botToken,
      u.telegram.chatId
    );
  } catch { /* silent */ }
}

function syncCriticalSettingsFromUser(user: UserProfile) {
  syncCriticalSettings({
    pinEnabled: user.pinLock,
    pinHash: user.pinCode || "",
    telegramBotToken: user.telegram.botToken,
    telegramChatId: user.telegram.chatId,
    telegramEnabled: user.telegram.enabled,
    rotationEnabled: user.security.passwordRotationEnabled,
    rotationInterval: user.security.rotationIntervalMinutes,
    sessionTimeout: user.security.sessionTimeoutMinutes,
  });
}

const defaultSecurity: SecuritySettings = {
  passwordRotationEnabled: true,
  rotationIntervalMinutes: 60,
  sessionTimeoutMinutes: 30,
  maxLoginAttempts: 5,
  lockoutDurationMinutes: 15,
  lastPasswordChange: new Date().toISOString(),
  nextPasswordRotation: new Date(Date.now() + 3600000).toISOString(),
  currentPasswordHash: "",
  email: "",
  hashedPassword: "",
};

const defaultTelegram: TelegramConfig = {
  botToken: "", chatId: "", enabled: false,
  notifyLogin: true, notifyFailedLogin: true, notifyPasswordChange: true,
  notifyLargeExpense: true, notifySettingsChange: true, largeExpenseThreshold: 10000,
};

const defaultUser: UserProfile = {
  name: "Admin", email: "", company: "MNIT Network",
  avatar: "", pinLock: false, pinCode: "", darkMode: false,
  monthlySalaryGoal: 50000, security: defaultSecurity, telegram: defaultTelegram,
};

export const useStore = create<AppState>((set, get) => {
  return {
    hydrated: false,
    setupRequired: false,
    salaries: [], expenses: [], goals: [], notes: [], activityLogs: [],
    loginAttempts: [], sessions: [],
    isAuthenticated: false, user: defaultUser, darkMode: false,
    failedAttempts: 0, lockedUntil: 0, lastActivity: Date.now(),

    rehydrate: () => {
      const load = <T,>(key: string, fallback: T): T => {
        try { const item = localStorage.getItem(key); return item ? JSON.parse(item) : fallback; } catch { return fallback; }
      };
      let userData = load<UserProfile>("user", defaultUser);

      // Merge critical settings from cookies (most durable source)
      const critical = loadCriticalSettings();
      if (critical.pinEnabled !== undefined) userData.pinLock = critical.pinEnabled;
      if (critical.pinHash !== undefined) userData.pinCode = critical.pinHash;
      if (userData.telegram) {
        if (critical.telegramBotToken !== undefined) userData.telegram.botToken = critical.telegramBotToken;
        if (critical.telegramChatId !== undefined) userData.telegram.chatId = critical.telegramChatId;
        if (critical.telegramEnabled !== undefined) userData.telegram.enabled = critical.telegramEnabled;
      }
      if (userData.security) {
        if (critical.rotationEnabled !== undefined) userData.security.passwordRotationEnabled = critical.rotationEnabled;
        if (critical.rotationInterval !== undefined) userData.security.rotationIntervalMinutes = critical.rotationInterval;
        if (critical.sessionTimeout !== undefined) userData.security.sessionTimeoutMinutes = critical.sessionTimeout;
      }

      const envCreds = getDefaultCredentials();

      // Auto-seed env credentials email if user data has no stored credentials
      if (!userData?.security?.hashedPassword || !userData?.security?.email) {
        userData = {
          ...userData,
          email: envCreds.email,
          security: {
            ...defaultSecurity,
            ...userData.security,
            email: envCreds.email,
          },
        };
      }

      const hasCreds = !!(userData?.security?.hashedPassword && userData?.security?.email);
      set({
        hydrated: true,
        setupRequired: !hasCreds,
        salaries: load<Salary[]>("salaries", []),
        expenses: load<Expense[]>("expenses", []),
        goals: load<SavingsGoal[]>("goals", []),
        notes: load<Note[]>("notes", []),
        activityLogs: load<ActivityLog[]>("activityLogs", []),
        loginAttempts: load<LoginAttempt[]>("loginAttempts", []),
        sessions: load<Session[]>("sessions", []),
        isAuthenticated: load("isAuthenticated", false),
        user: { ...defaultUser, ...userData, security: { ...defaultSecurity, ...userData.security }, telegram: { ...defaultTelegram, ...userData.telegram } },
        darkMode: load("darkMode", false),
        failedAttempts: load("failedAttempts", 0),
        lockedUntil: load("lockedUntil", 0),
        lastActivity: Date.now(),
      });
    },

    initializeDefaultCredentials: async () => {
      const { email, password } = getDefaultCredentials();
      const hashedPwd = await hashPassword(password);
      const now = new Date().toISOString();
      const security: SecuritySettings = {
        ...defaultSecurity,
        email,
        hashedPassword: hashedPwd,
        currentPasswordHash: hashedPwd,
        lastPasswordChange: now,
        nextPasswordRotation: new Date(Date.now() + 3600000).toISOString(),
      };
      const user: UserProfile = {
        ...defaultUser,
        email,
        security,
        name: "Admin",
        company: "MNIT Network",
      };
      saveToStorage("user", user);
      set({ user, setupRequired: false });
    },

    addSalary: (salary) => set((state) => {
      const newSalary: Salary = { ...salary, id: generateId(), createdAt: new Date().toISOString() };
      const salaries = [newSalary, ...state.salaries];
      saveToStorage("salaries", salaries);
      const log: ActivityLog = { id: generateId(), timestamp: new Date().toISOString(), action: "Salary Added", details: `৳${salary.amount} - ${salary.senderName}`, type: "salary" };
      const activityLogs = [log, ...state.activityLogs];
      saveToStorage("activityLogs", activityLogs);
      return { salaries, activityLogs };
    }),

    updateSalary: (id, data) => set((state) => {
      const salaries = state.salaries.map((s) => (s.id === id ? { ...s, ...data } : s));
      saveToStorage("salaries", salaries);
      return { salaries };
    }),

    deleteSalary: (id) => set((state) => {
      const salaries = state.salaries.filter((s) => s.id !== id);
      saveToStorage("salaries", salaries);
      return { salaries };
    }),

    addExpense: (expense) => set((state) => {
      const newExpense: Expense = { ...expense, id: generateId(), createdAt: new Date().toISOString() };
      const expenses = [newExpense, ...state.expenses];
      saveToStorage("expenses", expenses);
      const log: ActivityLog = { id: generateId(), timestamp: new Date().toISOString(), action: "Expense Added", details: `৳${expense.amount} - ${expense.title}`, type: "expense" };
      const activityLogs = [log, ...state.activityLogs];
      saveToStorage("activityLogs", activityLogs);
      if (expense.amount >= (state.user.telegram.largeExpenseThreshold || 10000)) {
        const alert: ActivityLog = { id: generateId(), timestamp: new Date().toISOString(), action: "Large Expense Alert", details: `৳${expense.amount} - ${expense.title}`, type: "telegram" };
        return { expenses, activityLogs: [alert, ...activityLogs] };
      }
      return { expenses, activityLogs };
    }),

    updateExpense: (id, data) => set((state) => {
      const expenses = state.expenses.map((e) => (e.id === id ? { ...e, ...data } : e));
      saveToStorage("expenses", expenses);
      return { expenses };
    }),

    deleteExpense: (id) => set((state) => {
      const expenses = state.expenses.filter((e) => e.id !== id);
      saveToStorage("expenses", expenses);
      return { expenses };
    }),

    addGoal: (goal) => set((state) => {
      const newGoal: SavingsGoal = { ...goal, id: generateId(), createdAt: new Date().toISOString() };
      const goals = [newGoal, ...state.goals];
      saveToStorage("goals", goals);
      return { goals };
    }),

    updateGoal: (id, data) => set((state) => {
      const goals = state.goals.map((g) => (g.id === id ? { ...g, ...data } : g));
      saveToStorage("goals", goals);
      return { goals };
    }),

    deleteGoal: (id) => set((state) => {
      const goals = state.goals.filter((g) => g.id !== id);
      saveToStorage("goals", goals);
      return { goals };
    }),

    addNote: (note) => set((state) => {
      const now = new Date().toISOString();
      const newNote: Note = { ...note, id: generateId(), createdAt: now, updatedAt: now };
      const notes = [newNote, ...state.notes];
      saveToStorage("notes", notes);
      return { notes };
    }),

    updateNote: (id, data) => set((state) => {
      const notes = state.notes.map((n) => n.id === id ? { ...n, ...data, updatedAt: new Date().toISOString() } : n);
      saveToStorage("notes", notes);
      return { notes };
    }),

    deleteNote: (id) => set((state) => {
      const notes = state.notes.filter((n) => n.id !== id);
      saveToStorage("notes", notes);
      return { notes };
    }),

    addActivityLog: (log) => set((state) => {
      const newLog: ActivityLog = { ...log, id: generateId(), timestamp: new Date().toISOString() };
      const activityLogs = [newLog, ...state.activityLogs].slice(0, 200);
      saveToStorage("activityLogs", activityLogs);
      return { activityLogs };
    }),

    addLoginAttempt: (success) => {
      const state = get();
      const info = getDeviceInfo();
      const attempt: LoginAttempt = { id: generateId(), timestamp: new Date().toISOString(), success, ...info, location: "Unknown" };
      const loginAttempts = [attempt, ...state.loginAttempts].slice(0, 100);
      saveToStorage("loginAttempts", loginAttempts);
      const log: ActivityLog = {
        id: generateId(), timestamp: new Date().toISOString(),
        action: success ? "Login Successful" : "Login Failed",
        details: success ? `From ${info.device} / ${info.browser}` : `Failed attempt from ${info.device} / ${info.browser}`,
        type: "security",
      };
      const activityLogs = [log, ...state.activityLogs].slice(0, 200);
      saveToStorage("activityLogs", activityLogs);
      const newFailed = success ? 0 : state.failedAttempts + 1;
      const newLocked = success ? 0 : newFailed >= state.user.security.maxLoginAttempts ? Date.now() + state.user.security.lockoutDurationMinutes * 60000 : state.lockedUntil;
      saveToStorage("failedAttempts", newFailed);
      saveToStorage("lockedUntil", newLocked);

      // Send Telegram alert on failed login
      if (!success) {
        sendTelegramEvent("Failed Login Attempt", {
          device: info.device, browser: info.browser, ip: info.ip, email: state.user.security.email || "unknown",
        });
      }

      set({ loginAttempts, activityLogs, failedAttempts: newFailed, lockedUntil: newLocked });
    },

    login: async (password) => {
      const state = get();
      if (state.lockedUntil > Date.now()) return false;
      if (state.user.pinLock && state.user.pinCode) {
        const storedPin = state.user.pinCode;
        const isHashed = storedPin.startsWith("pin-");
        const valid = isHashed ? verifyPin(password ?? "", storedPin) : password === storedPin;
        if (!valid) {
          get().addLoginAttempt(false);
          return false;
        }
      }
      get().addLoginAttempt(true);
      const info = getDeviceInfo();
      const token = generateSessionToken();
      const session: Session = { id: token, ...info, createdAt: new Date().toISOString(), lastActive: new Date().toISOString(), current: true };
      const sessions = [session, ...state.sessions].slice(0, 20);
      saveToStorage("sessions", sessions);

      // Set secure cookie
      setAuthCookie(token);

      set({ isAuthenticated: true, sessions, lastActivity: Date.now() });
      saveToStorage("isAuthenticated", true);

      // Send Telegram alert on successful login
      sendTelegramEvent("Successful Login", {
        device: info.device, browser: info.browser, ip: info.ip, email: state.user.security.email || "unknown",
      });

      return true;
    },

    securityLogin: async (email, password) => {
      const state = get();
      if (state.lockedUntil > Date.now()) {
        console.log("[AUTH] Account locked until", new Date(state.lockedUntil).toISOString());
        return false;
      }

      // DEV LOG: Auth source info
      const envCreds = getDefaultCredentials();
      const storedEmail = state.user.security.email;
      const storedHash = state.user.security.hashedPassword;
      console.log("[AUTH] Login attempt:", email);
      console.log("[AUTH] Stored email:", storedEmail);
      console.log("[AUTH] Stored hash exists:", !!storedHash);
      console.log("[AUTH] Env email:", envCreds.email);

      // Helper to complete a successful login (inline to avoid interface changes)
      const completeLogin = (userOverride?: UserProfile) => {
        const s = get();
        s.addLoginAttempt(true);
        const info = getDeviceInfo();
        const token = generateSessionToken();
        const session: Session = { id: token, ...info, createdAt: new Date().toISOString(), lastActive: new Date().toISOString(), current: true };
        const sessions = [session, ...s.sessions].slice(0, 20);
        saveToStorage("sessions", sessions);
        setAuthCookie(token);
        if (userOverride) {
          saveToStorage("user", userOverride);
          set({ user: userOverride, isAuthenticated: true, sessions, lastActivity: Date.now() });
        } else {
          set({ isAuthenticated: true, sessions, lastActivity: Date.now() });
        }
        saveToStorage("isAuthenticated", true);
        sendTelegramEvent("Successful Login", {
          device: info.device, browser: info.browser, ip: info.ip, email,
        });
        return true;
      };

      // Try stored credentials first
      if (email === storedEmail && storedHash) {
        const valid = await comparePassword(password, storedHash);
        if (valid) {
          console.log("[AUTH] Login SUCCESS via stored credentials");
          return completeLogin();
        }
        console.log("[AUTH] Stored credentials failed comparison");
      }

      // Fallback: try env-based credentials
      if (email === envCreds.email && password === envCreds.password) {
        console.log("[AUTH] Login SUCCESS via env credentials — migrating to localStorage");
        const hashedPwd = await hashPassword(envCreds.password);
        const now = new Date().toISOString();
        const migratedSecurity: SecuritySettings = {
          ...state.user.security,
          email: envCreds.email,
          hashedPassword: hashedPwd,
          currentPasswordHash: hashedPwd,
          lastPasswordChange: now,
          nextPasswordRotation: new Date(Date.now() + 3600000).toISOString(),
        };
        const migratedUser: UserProfile = {
          ...state.user,
          email: envCreds.email,
          security: migratedSecurity,
        };
        return completeLogin(migratedUser);
      }

      // Both failed
      console.log("[AUTH] Login FAILED — all credential sources exhausted");
      get().addLoginAttempt(false);
      return false;
    },

    logout: () => {
      const state = get();
      const sessions = state.sessions.map((s) => s.current ? { ...s, current: false } : s);
      saveToStorage("sessions", sessions);
      const log: ActivityLog = { id: generateId(), timestamp: new Date().toISOString(), action: "Logged Out", details: "User logged out", type: "auth" };
      const activityLogs = [log, ...state.activityLogs].slice(0, 200);
      saveToStorage("activityLogs", activityLogs);
      // Clear auth cookie
      clearAuthCookie();
      set({ isAuthenticated: false, sessions, lastActivity: 0, activityLogs });
      saveToStorage("isAuthenticated", false);
    },

    updateUser: (data) => {
      set((state) => {
        const user = { ...state.user, ...data };
        if (data.security) user.security = { ...state.user.security, ...data.security };
        if (data.telegram) user.telegram = { ...state.user.telegram, ...data.telegram };
        saveToStorage("user", user);
        if (data.pinLock !== undefined || data.pinCode !== undefined || data.security || data.telegram) {
          syncCriticalSettingsFromUser(user);
        }
        return { user };
      });
    },

    toggleDarkMode: () => set((state) => {
      const darkMode = !state.darkMode;
      saveToStorage("darkMode", darkMode);
      return { darkMode };
    }),

    rotatePassword: async () => {
      const state = get();
      const newPassword = generatePassword();
      const newHash = await hashPassword(newPassword);
      const user = {
        ...state.user,
        security: {
          ...state.user.security,
          hashedPassword: newHash,
          currentPasswordHash: newHash,
          lastPasswordChange: new Date().toISOString(),
          nextPasswordRotation: new Date(Date.now() + (state.user.security.rotationIntervalMinutes || 60) * 60000).toISOString(),
        },
      };
      saveToStorage("user", user);
      const log: ActivityLog = { id: generateId(), timestamp: new Date().toISOString(), action: "Password Rotated", details: "Auto password rotation completed", type: "security" };
      const activityLogs = [log, ...state.activityLogs].slice(0, 200);
      saveToStorage("activityLogs", activityLogs);
      set({ user, activityLogs });

      // Send Telegram alert on password rotation with the new password
      sendTelegramEvent("Password Rotated", {
        device: "System", browser: "Auto-Rotation", ip: "127.0.0.1",
        newPassword,
      });

      return newPassword;
    },

    updateLastActivity: () => set({ lastActivity: Date.now() }),

    removeSession: (id) => set((state) => {
      const sessions = state.sessions.filter((s) => s.id !== id);
      saveToStorage("sessions", sessions);
      return { sessions };
    }),

    clearAllSessions: () => {
      const info = getDeviceInfo();
      const token = generateSessionToken();
      const session: Session = { id: token, ...info, createdAt: new Date().toISOString(), lastActive: new Date().toISOString(), current: true };
      saveToStorage("sessions", [session]);
      setAuthCookie(token);
      set({ sessions: [session] });
    },

    setTelegramConfig: (config) => set((state) => {
      const telegram = { ...state.user.telegram, ...config };
      const user = { ...state.user, telegram };
      saveToStorage("user", user);
      syncCriticalSettingsFromUser(user);
      return { user };
    }),

    setSecuritySettings: (settings) => set((state) => {
      const security = { ...state.user.security, ...settings };
      const user = { ...state.user, security };
      saveToStorage("user", user);
      syncCriticalSettingsFromUser(user);
      return { user };
    }),

    getTotalSalary: () => get().salaries.reduce((sum, s) => sum + s.amount, 0),
    getTotalExpenses: () => get().expenses.reduce((sum, e) => sum + e.amount, 0),
    getCurrentBalance: () => get().getTotalSalary() - get().getTotalExpenses(),

    getMonthlySalary: (month, year) =>
      get().salaries.filter((s) => s.month.toLowerCase() === month.toLowerCase() && new Date(s.paymentDate).getFullYear() === year).reduce((sum, s) => sum + s.amount, 0),

    getMonthlyExpenses: (month, year) =>
      get().expenses.filter((e) => new Date(e.date).toLocaleString("en-US", { month: "long" }).toLowerCase() === month.toLowerCase() && new Date(e.date).getFullYear() === year).reduce((sum, e) => sum + e.amount, 0),

    getMonthlySummary: () => {
      const state = get();
      const months = new Set<string>();
      state.salaries.forEach((s) => { const d = new Date(s.paymentDate); months.add(`${d.getFullYear()}-${d.toLocaleString("en-US", { month: "long" })}`); });
      state.expenses.forEach((e) => { const d = new Date(e.date); months.add(`${d.getFullYear()}-${d.toLocaleString("en-US", { month: "long" })}`); });
      return Array.from(months).map((m) => { const [year, month] = m.split("-"); const salary = state.getMonthlySalary(month, parseInt(year)); const expenses = state.getMonthlyExpenses(month, parseInt(year)); return { month, year: parseInt(year), salary, expenses, savings: salary - expenses }; }).sort((a, b) => b.year - a.year || b.month.localeCompare(a.month));
    },

    getRecentTransactions: (limit = 10) => {
      const state = get();
      return [...state.salaries.map((s): Transaction => ({ id: s.id, type: "salary", amount: s.amount, date: s.paymentDate, description: `Salary from ${s.senderName}`, paymentMethod: s.paymentMethod, status: s.status, reference: s.transactionId })), ...state.expenses.map((e): Transaction => ({ id: e.id, type: "expense", amount: e.amount, date: e.date, description: e.title, category: e.category, paymentMethod: e.paymentMethod, status: "paid", reference: "" }))].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, limit);
    },

    getExpensesByCategory: () => {
      const categoryMap = new Map<string, number>();
      get().expenses.forEach((e) => categoryMap.set(e.category, (categoryMap.get(e.category) || 0) + e.amount));
      return Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value, color: CATEGORY_COLORS[name] || "#6b7280" })).sort((a, b) => b.value - a.value);
    },

    getMonthlySalaryData: () => {
      const state = get();
      const monthlyData = new Map<string, { salary: number; expenses: number }>();
      state.salaries.forEach((s) => { const d = new Date(s.paymentDate); const key = `${d.toLocaleString("en-US", { month: "short" })} ${d.getFullYear()}`; const prev = monthlyData.get(key) || { salary: 0, expenses: 0 }; prev.salary += s.amount; monthlyData.set(key, prev); });
      state.expenses.forEach((e) => { const d = new Date(e.date); const key = `${d.toLocaleString("en-US", { month: "short" })} ${d.getFullYear()}`; const prev = monthlyData.get(key) || { salary: 0, expenses: 0 }; prev.expenses += e.amount; monthlyData.set(key, prev); });
      return Array.from(monthlyData.entries()).map(([month, data]) => ({ month, ...data, savings: data.salary - data.expenses })).sort((a, b) => { const [aM, aY] = a.month.split(" "); const [bM, bY] = b.month.split(" "); if (aY !== bY) return parseInt(aY) - parseInt(bY); return "JanFebMarAprMayJunJulAugSepOctNovDec".indexOf(aM.substring(0, 3)) - "JanFebMarAprMayJunJulAugSepOctNovDec".indexOf(bM.substring(0, 3)); });
    },
  };
});
