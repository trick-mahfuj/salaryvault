"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/store/useStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { downloadCSV, formatDateTime } from "@/lib/utils";
import { getRotationHistory } from "@/lib/passwordRotation";
import { getRealIP, getBrowserInfo } from "@/lib/ip";
import { hashPin } from "@/lib/persistentStorage";
import {
  Sun, Moon, Lock, Unlock, Download, Shield, User, Bell, Database, LogOut,
  Smartphone, Globe, RefreshCw, MessageSquare, RotateCcw, AlertTriangle,
} from "lucide-react";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } } as const;
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } } as const;

export default function SettingsPage() {
  const { user, updateUser, setTelegramConfig, setSecuritySettings, darkMode, toggleDarkMode, logout, salaries, expenses, goals, notes, activityLogs, sessions, loginAttempts, rotatePassword, removeSession, clearAllSessions } = useStore();
  const [pinCode, setPinCode] = useState("");
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [company, setCompany] = useState(user.company);
  const [monthlyGoal, setMonthlyGoal] = useState(String(user.monthlySalaryGoal));
  const [exportType, setExportType] = useState<"csv" | "json">("csv");
  const [newPassword, setNewPassword] = useState("");

  // Telegram
  const [botToken, setBotToken] = useState(user.telegram.botToken);
  const [chatId, setChatId] = useState(user.telegram.chatId);
  const [threshold, setThreshold] = useState(String(user.telegram.largeExpenseThreshold));

  // Security
  const [sessionTimeout, setSessionTimeout] = useState(String(user.security.sessionTimeoutMinutes));
  const [maxAttempts, setMaxAttempts] = useState(String(user.security.maxLoginAttempts));
  const [lockoutMin] = useState(String(user.security.lockoutDurationMinutes));
  const [rotationInterval, setRotationInterval] = useState(String(user.security.rotationIntervalMinutes));

  const handleSaveProfile = () => {
    updateUser({ name, email, company, monthlySalaryGoal: parseFloat(monthlyGoal) || 0 });
  };

  const handleTogglePin = () => {
    if (user.pinLock) { updateUser({ pinLock: false, pinCode: "" }); setPinCode(""); }
    else if (pinCode.length === 4) { updateUser({ pinLock: true, pinCode: hashPin(pinCode) }); }
  };

  const handleSaveTelegram = () => {
    setTelegramConfig({ botToken, chatId, largeExpenseThreshold: parseFloat(threshold) || 10000, enabled: !!(botToken && chatId) });
  };

  const handleSaveSecurity = () => {
    setSecuritySettings({
      sessionTimeoutMinutes: parseInt(sessionTimeout) || 30,
      maxLoginAttempts: parseInt(maxAttempts) || 5,
      lockoutDurationMinutes: parseInt(lockoutMin) || 15,
      rotationIntervalMinutes: parseInt(rotationInterval) || 60,
    });
  };

  const handleRotatePassword = async () => {
    const pwd = await rotatePassword();
    setNewPassword(pwd);
  };

  const handleExport = () => {
    const data = {
      salaries: salaries.map((s) => ({ amount: s.amount, date: s.paymentDate, month: s.month, sender: s.senderName, method: s.paymentMethod, txId: s.transactionId, status: s.status, incomeSource: s.incomeSource })),
      expenses: expenses.map((e) => ({ title: e.title, amount: e.amount, category: e.category, date: e.date, method: e.paymentMethod })),
      goals: goals.map((g) => ({ title: g.title, target: g.targetAmount, saved: g.currentAmount, deadline: g.deadline })),
      notes: notes.map((n) => ({ title: n.title, content: n.content })),
      security: { sessions: sessions.length, loginAttempts: loginAttempts.length, settings: user.security },
    };
    if (exportType === "csv") {
      downloadCSV(salaries.map((s) => ({ type: "Salary", amount: s.amount, date: s.paymentDate, description: `From ${s.senderName}`, method: s.paymentMethod, reference: s.transactionId, source: s.incomeSource })), "mnit-ledger-salaries.csv");
    } else {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "mnit-ledger-backup.json"; link.click();
    }
  };

  const handleClearData = () => {
    if (confirm("This will permanently delete ALL data. Are you sure?")) { localStorage.clear(); window.location.reload(); }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-3xl">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold">Admin Settings</h1>
        <p className="text-sm text-muted-foreground">Manage account, security, and integrations</p>
      </motion.div>

      {/* Profile */}
      <motion.div variants={item}>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><User className="w-4 h-4" /> Profile</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
              <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Input label="Company" value={company} onChange={(e) => setCompany(e.target.value)} />
              <Input label="Monthly Salary Goal (৳)" type="number" value={monthlyGoal} onChange={(e) => setMonthlyGoal(e.target.value)} />
            </div>
            <Button onClick={handleSaveProfile} variant="primary">Save Profile</Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Appearance */}
      <motion.div variants={item}>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2">{darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />} Appearance</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div><p className="font-medium text-sm">{darkMode ? "Dark Mode" : "Light Mode"}</p><p className="text-xs text-muted-foreground">Toggle dark/light theme</p></div>
              <button onClick={toggleDarkMode} className={`relative w-12 h-6 rounded-full transition-colors ${darkMode ? "bg-primary" : "bg-secondary"} p-1`}>
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${darkMode ? "translate-x-6" : "translate-x-0"}`} />
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* PIN Lock */}
      <motion.div variants={item}>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><Lock className="w-4 h-4" /> PIN Lock</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div><p className="font-medium text-sm">{user.pinLock ? "PIN Lock Enabled" : "PIN Lock Disabled"}</p><p className="text-xs text-muted-foreground">{user.pinLock ? "App protected with 4-digit PIN" : "Add extra security layer"}</p></div>
              <Button variant={user.pinLock ? "danger" : "primary"} size="sm" onClick={handleTogglePin}>
                {user.pinLock ? <Unlock className="w-4 h-4 mr-1" /> : <Lock className="w-4 h-4 mr-1" />}
                {user.pinLock ? "Disable" : "Enable"}
              </Button>
            </div>
            {!user.pinLock && (
              <div className="flex gap-3 items-end">
                <Input type="password" placeholder="Set 4-digit PIN" maxLength={4} value={pinCode} onChange={(e) => setPinCode(e.target.value.replace(/\D/g, "").slice(0, 4))} className="max-w-[180px]" />
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Password Rotation & Security */}
      <motion.div variants={item}>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><RotateCcw className="w-4 h-4" /> Password Rotation</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={user.security.passwordRotationEnabled}
                    onChange={(e) => setSecuritySettings({ passwordRotationEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
                </label>
                <div>
                  <p className="font-medium text-sm">{user.security.passwordRotationEnabled ? "Auto-rotation Active" : "Auto-rotation Disabled"}</p>
                  <p className="text-xs text-muted-foreground">Password rotates every {user.security.rotationIntervalMinutes} minutes</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleRotatePassword}><RefreshCw className="w-4 h-4 mr-1" /> Rotate Now</Button>
            </div>
            {newPassword && (
              <div className="p-3 rounded-xl bg-secondary/50 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">New Password (copy now):</p>
                <code className="block p-2 rounded-lg bg-background border border-border font-mono text-sm break-all">{newPassword}</code>
                <p className="text-[10px] text-warning flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Previous password is now invalidated.</p>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Input label="Rotation (min)" type="number" value={rotationInterval} onChange={(e) => setRotationInterval(e.target.value)} />
              <Input label="Session Timeout (min)" type="number" value={sessionTimeout} onChange={(e) => setSessionTimeout(e.target.value)} />
              <Input label="Max Login Attempts" type="number" value={maxAttempts} onChange={(e) => setMaxAttempts(e.target.value)} />
            </div>
            <Button size="sm" variant="secondary" onClick={handleSaveSecurity}>Save Security Settings</Button>

            {/* Rotation History */}
            {(() => {
              const history = getRotationHistory();
              if (history.length === 0) return null;
              return (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-[10px] font-medium text-muted-foreground mb-2">Rotation History</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {history.slice(0, 10).map((log: { timestamp: string; success: boolean; telegramDelivered: boolean; reason: string }, i: number) => (
                      <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-secondary/30 text-[10px]">
                        <div className="flex items-center gap-2">
                          <span className={log.success ? "text-emerald-400" : "text-red-400"}>{log.success ? "✅" : "❌"}</span>
                          <span className="text-muted-foreground">{new Date(log.timestamp).toLocaleString("en-BD", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <span className="text-muted-foreground">{log.telegramDelivered ? "Telegram ✓" : "Telegram ✗"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </motion.div>

      {/* Telegram Integration */}
      <motion.div variants={item}>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Telegram Alerts</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">Receive security alerts and notifications via Telegram.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Bot Token" type="password" placeholder="123456:ABC-DEF" value={botToken} onChange={(e) => setBotToken(e.target.value)} />
              <Input label="Chat ID" placeholder="-1001234567890" value={chatId} onChange={(e) => setChatId(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Large Expense Alert (৳)" type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
              <div className="flex items-end">
                <Badge variant={user.telegram.enabled ? "success" : "danger"} className="text-[10px]">
                  {user.telegram.enabled ? "Connected" : "Not Connected"}
                </Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {(["notifyLogin", "notifyFailedLogin", "notifyPasswordChange", "notifyLargeExpense", "notifySettingsChange"] as const).map((key) => (
                <label key={key} className="flex items-center gap-1.5 p-2 rounded-lg bg-secondary/30 cursor-pointer">
                  <input type="checkbox" checked={user.telegram[key]} onChange={(e) => setTelegramConfig({ [key]: e.target.checked })} className="rounded" />
                  {key.replace("notify", "").replace(/([A-Z])/g, " $1").trim()}
                </label>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="primary" onClick={handleSaveTelegram}>Save Telegram Config</Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  const { sendTelegramAlert, formatSecurityAlert } = await import("@/lib/telegram");
                  const ip = getRealIP();
                  const { device, browser } = getBrowserInfo();
                  const ok = await sendTelegramAlert(
                    formatSecurityAlert("Test Alert", {
                      ip,
                      device: `${device} (Settings Panel)`,
                      browser,
                    }),
                    botToken,
                    chatId
                  );
                  if (ok) {
                    alert("Test alert sent successfully! Check your Telegram.");
                  } else {
                    alert("Failed to send test alert. Verify your bot token and chat ID.");
                  }
                }}
              >
                Send Test Alert
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Sessions */}
      <motion.div variants={item}>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><Smartphone className="w-4 h-4" /> Active Sessions ({sessions.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sessions.slice(0, 10).map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                      {s.device === "Mobile" ? <Smartphone className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{s.browser} &middot; {s.device}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(s.lastActive)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.current && <Badge variant="success" className="text-[10px]">Current</Badge>}
                    {!s.current && <button onClick={() => removeSession(s.id)} className="text-xs text-destructive hover:underline">Revoke</button>}
                  </div>
                </div>
              ))}
            </div>
            {sessions.length > 1 && (
              <Button size="sm" variant="outline" className="mt-3" onClick={clearAllSessions}>
                <LogOut className="w-4 h-4 mr-1" /> Logout Other Sessions
              </Button>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Export */}
      <motion.div variants={item}>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><Download className="w-4 h-4" /> Export Data</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Export includes salaries, expenses, goals, notes, and security data.</p>
            <div className="flex gap-3">
              <select className="h-10 rounded-xl border border-input bg-background px-3 text-sm" value={exportType} onChange={(e) => setExportType(e.target.value as "csv" | "json")}>
                <option value="csv">CSV (Spreadsheet)</option>
                <option value="json">JSON (Full Backup)</option>
              </select>
              <Button variant="primary" onClick={handleExport}><Download className="w-4 h-4 mr-1" /> Export</Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Activity Log */}
      <motion.div variants={item}>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><Bell className="w-4 h-4" /> Activity Log ({activityLogs.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {activityLogs.length > 0 ? activityLogs.slice(0, 30).map((log) => (
                <div key={log.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 text-sm">
                  <div>
                    <span className="font-medium">{log.action}</span>
                    <span className="text-muted-foreground"> &mdash; {log.details}</span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">{formatDateTime(log.timestamp)}</span>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Danger Zone */}
      <motion.div variants={item}>
        <Card className="border-destructive/20">
          <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive"><Shield className="w-4 h-4" /> Danger Zone</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div><p className="font-medium text-sm">Clear All Data</p><p className="text-xs text-muted-foreground">Permanently delete all your data</p></div>
              <Button variant="danger" size="sm" onClick={handleClearData}><Database className="w-4 h-4 mr-1" /> Clear</Button>
            </div>
            <div className="flex items-center justify-between">
              <div><p className="font-medium text-sm">Logout</p><p className="text-xs text-muted-foreground">Sign out of your account</p></div>
              <Button variant="outline" size="sm" onClick={logout}><LogOut className="w-4 h-4 mr-1" /> Logout</Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
