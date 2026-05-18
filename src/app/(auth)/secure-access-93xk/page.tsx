"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/store/useStore";
import {
  Shield, Lock, Eye, EyeOff, Mail, KeyRound,
  AlertTriangle, Clock, RefreshCw,
} from "lucide-react";

export default function SecureAdminLogin() {
  const router = useRouter();
  const { isAuthenticated, user, securityLogin, login, lockedUntil, failedAttempts } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pinStep, setPinStep] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  useEffect(() => {
    if (isAuthenticated) router.replace("/dashboard");
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (lockedUntil > Date.now()) {
      setIsLocked(true);
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      setLockoutTimer(remaining);
      const timer = setInterval(() => {
        setLockoutTimer((prev) => {
          if (prev <= 1) { setIsLocked(false); return 0; }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockedUntil]);

  if (isAuthenticated) return null;

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (lockedUntil > Date.now()) {
      setError("Account temporarily locked due to too many failed attempts.");
      return;
    }

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);
    try {
      const success = await securityLogin(email, password);
      if (!success) {
        setError("Invalid credentials.");
      } else {
        if (user.pinLock) {
          setPinStep(true);
        } else {
          router.push("/dashboard");
        }
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePinLogin = async () => {
    if (pin.length === 4) {
      setLoading(true);
      try {
        const success = await login(pin);
        if (success) {
          router.push("/dashboard");
        } else {
          setError("Invalid PIN");
        }
      } catch {
        setError("An error occurred.");
      } finally {
        setLoading(false);
      }
    }
  };

  const formatLockout = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-sm"
      >
        <div className="glass rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-3">
            <div className="premium-gradient w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-purple-500/25">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Secure Access</h1>
            <p className="text-sm text-muted-foreground">MNIT Network &mdash; Private Dashboard</p>
          </div>

          {pinStep ? (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <Lock className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-xl font-bold">PIN Required</h2>
                <p className="text-sm text-muted-foreground">Enter your 4-digit PIN to unlock</p>
              </div>
              {error && <p className="text-xs text-destructive text-center">{error}</p>}
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  onKeyDown={(e) => e.key === "Enter" && handlePinLogin()}
                  maxLength={4}
                  className="w-full h-14 text-center text-2xl tracking-[0.5em] rounded-xl border border-input bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  autoFocus
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={handlePinLogin}
                disabled={pin.length < 4 || loading}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:shadow-lg hover:shadow-indigo-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Unlocking...
                  </>
                ) : (
                  "Unlock"
                )}
              </button>
              <button
                onClick={() => { setPinStep(false); setPin(""); setError(""); }}
                className="text-xs text-muted-foreground hover:text-foreground block mx-auto"
              >
                Back to login
              </button>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {isLocked ? (
                <motion.div
                  key="locked"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4 text-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-8 h-8 text-destructive" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-destructive">Account Locked</h3>
                    <p className="text-sm text-muted-foreground mt-1">Too many failed login attempts</p>
                  </div>
                  <div className="flex items-center justify-center gap-2 p-4 rounded-xl bg-destructive/5">
                    <Clock className="w-5 h-5 text-destructive" />
                    <span className="font-mono text-lg font-bold text-destructive">{formatLockout(lockoutTimer)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Access will be restored after the lockout period.</p>
                </motion.div>
              ) : (
                <motion.form
                  key="login"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleEmailLogin}
                  className="space-y-4"
                >
                  {error && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-sm">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  {failedAttempts > 0 && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-warning/10 text-warning text-xs">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      {failedAttempts} failed attempt{failedAttempts > 1 ? "s" : ""}. Max: {user.security.maxLoginAttempts}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="email"
                        placeholder="Enter your admin email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-11 pl-10 pr-3 rounded-xl border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        autoFocus
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Password</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full h-11 pl-10 pr-10 rounded-xl border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:shadow-lg hover:shadow-indigo-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        Sign In
                      </>
                    )}
                  </button>

                  {user.security.passwordRotationEnabled && (
                    <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                      <RefreshCw className="w-3 h-3" />
                      Password rotates every {user.security.rotationIntervalMinutes}min
                    </div>
                  )}
                </motion.form>
              )}
            </AnimatePresence>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          MNIT Network &mdash; Secure Admin Dashboard v2.0
        </p>
      </motion.div>
    </div>
  );
}
