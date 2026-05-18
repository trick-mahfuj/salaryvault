"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";
import { generateOwnerToken, setOwnerCookie } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  Shield, LineChart, Wallet, Target, ArrowRight,
  X, Lock, Eye, EyeOff, Mail, KeyRound, AlertTriangle,
  Clock, RefreshCw, Settings,
} from "lucide-react";

const services = [
  {
    icon: Shield,
    title: "Enterprise Security",
    desc: "Bank-grade encryption and multi-layer authentication protecting your financial data.",
  },
  {
    icon: LineChart,
    title: "Smart Analytics",
    desc: "AI-powered insights and predictive analytics for informed financial decisions.",
  },
  {
    icon: Wallet,
    title: "Salary Management",
    desc: "Comprehensive tracking and management of income streams and payments.",
  },
  {
    icon: Target,
    title: "Goal Planning",
    desc: "Set savings targets and track progress with intelligent recommendations.",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, hydrated, setupRequired, user, securityLogin, login, lockedUntil, failedAttempts } = useStore();
  const [showLogin, setShowLogin] = useState(false);
  const [showOwnerPanel, setShowOwnerPanel] = useState(false);
  const [ownerUnlocked, setOwnerUnlocked] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pinStep, setPinStep] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  // Lockout timer
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

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Secret keyboard shortcut: CTRL+SHIFT+M (admin login)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && !e.altKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        setShowLogin(true);
        setError("");
      }
      // Owner master key: CTRL+SHIFT+ALT+M
      if (e.ctrlKey && e.shiftKey && e.altKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        const token = generateOwnerToken();
        setOwnerCookie(token);
        setOwnerUnlocked(true);
        setShowOwnerPanel(true);
        setError("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const [loginLoading, setLoginLoading] = useState(false);

  const handleEmailLogin = useCallback(
    async (e: React.FormEvent) => {
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

      setLoginLoading(true);
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
        setLoginLoading(false);
      }
    },
    [email, password, lockedUntil, securityLogin, user.pinLock, router]
  );

  const handlePinLogin = useCallback(async () => {
    if (pin.length === 4) {
      setLoginLoading(true);
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
        setLoginLoading(false);
      }
    }
  }, [pin, login, router]);

  const formatLockout = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Only redirect authenticated users to dashboard — NEVER redirect to /setup
  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, router]);

  if (hydrated && isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      {/* Navbar */}
      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled
            ? "bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50"
            : "bg-transparent"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">MNIT Network</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#services" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors hidden sm:block">
              Services
            </a>
            <a href="#about" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors hidden sm:block">
              About
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-transparent to-purple-50/50 dark:from-indigo-950/30 dark:to-purple-950/30 pointer-events-none" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-sm font-medium mb-6">
              <Shield className="w-4 h-4" />
              Enterprise-Grade Financial Platform
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
              Secure Financial{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Intelligence
              </span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
              MNIT Network provides enterprise-grade salary management, financial tracking,
              and AI-powered analytics for modern organizations.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <a
                href="#services"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
              >
                Explore Services
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              Enterprise Solutions
            </h2>
            <p className="mt-4 text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              Comprehensive financial management tools designed for modern businesses.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, i) => (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <service.icon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{service.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{service.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-20 px-4 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-6">
              About MNIT Network
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
              MNIT Network is a leading provider of enterprise financial management solutions.
              Our platform combines cutting-edge AI technology with robust security to deliver
              intelligent salary and expense tracking for businesses of all sizes.
            </p>
            <div className="mt-12 grid grid-cols-3 gap-8">
              {[
                { value: "99.9%", label: "Uptime" },
                { value: "256-bit", label: "Encryption" },
                { value: "24/7", label: "Monitoring" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    {stat.value}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">MNIT Network</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            &copy; {new Date().getFullYear()} MNIT Network. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Hidden Owner Access Panel (CTRL+SHIFT+ALT+M) */}
      <AnimatePresence>
        {showOwnerPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) { setShowOwnerPanel(false); } }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm"
            >
              <div className="glass rounded-3xl p-8 shadow-2xl space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
                      <Settings className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="font-bold text-sm">Owner Access</h2>
                      <p className="text-[10px] text-muted-foreground">MNIT Network — Hidden Panel</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setShowOwnerPanel(false); }}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {ownerUnlocked && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-xs border border-emerald-200/50 dark:border-emerald-800/30">
                    <Lock className="w-4 h-4 shrink-0" />
                    Owner session unlocked (5 min). Setup access is now available.
                  </div>
                )}

                <div className="space-y-3">
                  {hydrated && setupRequired && (
                    <button
                      onClick={() => { router.push("/setup"); }}
                      className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:shadow-lg hover:shadow-indigo-500/25 transition-all flex items-center justify-center gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      Initialize Admin System
                    </button>
                  )}
                  <button
                    onClick={() => { setShowOwnerPanel(false); setShowLogin(true); }}
                    className="w-full h-11 rounded-xl border border-input bg-background text-sm font-medium hover:bg-secondary/50 transition-all flex items-center justify-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    Admin Login
                  </button>
                </div>

                <p className="text-center text-[10px] text-muted-foreground">
                  This panel is only visible to authorized owners.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden Admin Login Modal */}
      <AnimatePresence>
        {showLogin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) { setShowLogin(false); setPinStep(false); setPin(""); setError(""); } }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm"
            >
              <div className="glass rounded-3xl p-8 shadow-2xl space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="font-bold text-sm">Admin Access</h2>
                      <p className="text-[10px] text-muted-foreground">MNIT Network Dashboard</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setShowLogin(false); setPinStep(false); setPin(""); setError(""); }}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* PIN step */}
                {pinStep ? (
                  <div className="space-y-4">
                    <div className="text-center space-y-2">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                        <Lock className="w-7 h-7 text-primary" />
                      </div>
                      <p className="text-sm font-medium">PIN Required</p>
                      <p className="text-xs text-muted-foreground">Enter your 4-digit PIN to unlock</p>
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
                      disabled={pin.length < 4 || loginLoading}
                      className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:shadow-lg hover:shadow-indigo-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loginLoading ? (
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
                  <>
                    {/* Locked state */}
                    {isLocked ? (
                      <div className="space-y-4 text-center">
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
                      </div>
                    ) : (
                      <form onSubmit={handleEmailLogin} className="space-y-4">
                        {error && (
                          <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-sm">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            {error}
                          </div>
                        )}

                        {failedAttempts > 0 && (
                          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-xs">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            {failedAttempts} failed attempt{failedAttempts > 1 ? "s" : ""}. Max: {user.security.maxLoginAttempts}
                          </div>
                        )}

                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground">Email</label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                              type="email"
                              placeholder="Enter your admin email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full h-11 pl-10 pr-3 rounded-xl border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
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
                          disabled={loginLoading}
                          className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:shadow-lg hover:shadow-indigo-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {loginLoading ? (
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
                      </form>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
