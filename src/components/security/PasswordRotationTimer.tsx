"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/store/useStore";
import { usePasswordRotation } from "@/hooks/usePasswordRotation";
import {
  formatTimeDisplay,
  generatePasswordWithPrefix,
  getRotationHistory,
} from "@/lib/passwordRotation";
import {
  Shield, RotateCcw, Clock, Copy, Check, History,
  ChevronDown, ChevronUp, AlertTriangle,
} from "lucide-react";

export function PasswordRotationTimer() {
  const { user } = useStore();
  const {
    timeLeft, isRotating, lastError,
    intervalMinutes, rotationEnabled, forceRotate,
  } = usePasswordRotation();

  const [newPassword, setNewPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const interval = intervalMinutes * 60000;
  const rotationHistory = getRotationHistory();

  const handleCopy = async () => {
    if (newPassword) {
      await navigator.clipboard.writeText(newPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleManualRotate = async () => {
    setShowPassword(false);
    setNewPassword("");
    await forceRotate();
    const pwd = generatePasswordWithPrefix();
    setNewPassword(pwd);
    setShowPassword(true);
  };

  if (!rotationEnabled) return null;

  return (
    <div className="glass rounded-2xl p-5 border border-border/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Shield className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <h3 className="text-sm font-medium">Password Rotation</h3>
            <p className="text-[10px] text-muted-foreground">
              Auto-rotates every {intervalMinutes}min
              {isRotating && " — Rotating..."}
            </p>
          </div>
        </div>
        <button
          onClick={handleManualRotate}
          disabled={isRotating}
          className="text-xs text-primary hover:underline flex items-center gap-1 disabled:opacity-50"
        >
          <RotateCcw className="w-3 h-3" /> Rotate Now
        </button>
      </div>

      {lastError && (
        <div className="flex items-center gap-2 mb-3 p-2 rounded-xl bg-red-500/10 text-red-400 text-xs">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          {lastError}
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative w-14 h-14">
          <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="24" fill="none" stroke="var(--color-border)" strokeWidth="3" />
            <motion.circle
              cx="28" cy="28" r="24" fill="none" stroke="var(--color-primary)" strokeWidth="3"
              strokeDasharray={Math.PI * 48}
              strokeDashoffset={Math.PI * 48 * (1 - Math.min(1, timeLeft / Math.max(1, interval)))}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Clock className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
        <div>
          <p className="text-lg font-mono font-bold tracking-wider">{formatTimeDisplay(timeLeft)}</p>
          <p className="text-[10px] text-muted-foreground">
            {timeLeft <= 0 ? "Rotation due!" : "Next rotation"}
          </p>
        </div>
      </div>

      {showPassword && newPassword && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-4 pt-4 border-t border-border"
        >
          <p className="text-xs text-muted-foreground mb-2">New auto-generated password:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-2.5 rounded-xl bg-background border border-border font-mono text-sm break-all">
              {newPassword}
            </code>
            <button
              onClick={handleCopy}
              className="p-2.5 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">Previous password invalidated.</p>
        </motion.div>
      )}

      {/* Rotation History */}
      {rotationHistory.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <History className="w-3 h-3" />
            {showHistory ? "Hide" : "Show"} rotation history ({rotationHistory.length})
            {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {showHistory && (
            <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
              {rotationHistory.slice(0, 10).map((log, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-secondary/30 text-[10px]">
                  <div className="flex items-center gap-2">
                    <span className={log.success ? "text-emerald-400" : "text-red-400"}>
                      {log.success ? "✅" : "❌"}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString("en-BD", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <span className="text-muted-foreground">
                    {log.telegramDelivered ? "Telegram ✓" : "Telegram ✗"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
