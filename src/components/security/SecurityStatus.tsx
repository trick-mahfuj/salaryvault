"use client";

import { useMemo, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/store/useStore";
import { Shield, ShieldAlert, Lock, Globe, Smartphone, AlertTriangle, Clock } from "lucide-react";

export function SecurityStatus() {
  const { loginAttempts, sessions, user, lockedUntil, failedAttempts } = useStore();
  const [now, setNow] = useState(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
  }, []);

  const securityScore = useMemo(() => {
    let score = 100;
    if (user.pinLock) score += 10;
    if (user.security.passwordRotationEnabled) score += 15;
    if (user.telegram.enabled) score += 15;
    if (failedAttempts > 0) score -= failedAttempts * 5;
    if (lockedUntil > now) score -= 30;
    if (!user.security.hashedPassword) score -= 20;
    return Math.max(0, Math.min(100, score));
  }, [user, failedAttempts, lockedUntil, now]);

  const recentFailedAttempts = useMemo(() =>
    loginAttempts.filter((a) => !a.success && now - new Date(a.timestamp).getTime() < 3600000).length,
    [loginAttempts, now]
  );

  const currentSession = useMemo(() => sessions.find((s) => s.current), [sessions]);
  const isLocked = lockedUntil > now;
  const lockoutRemaining = isLocked ? Math.ceil((lockedUntil - now) / 60000) : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Shield className="w-4 h-4" /> Security Status
        </CardTitle>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${securityScore >= 80 ? "bg-success" : securityScore >= 50 ? "bg-warning" : "bg-destructive"} animate-pulse`} />
          <Badge variant={securityScore >= 80 ? "success" : securityScore >= 50 ? "warning" : "danger"} className="text-[10px]">
            {securityScore}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Score Bar */}
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${securityScore}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={`h-full rounded-full ${securityScore >= 80 ? "bg-success" : securityScore >= 50 ? "bg-warning" : "bg-destructive"}`}
            />
          </div>

          {/* Status Items */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-secondary/30 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="w-3 h-3" /> PIN Lock
              </div>
              <Badge variant={user.pinLock ? "success" : "danger"} className="text-[10px]">{user.pinLock ? "Active" : "Off"}</Badge>
            </div>
            <div className="p-3 rounded-xl bg-secondary/30 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Globe className="w-3 h-3" /> Sessions
              </div>
              <p className="text-sm font-medium">{sessions.length} active</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/30 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <AlertTriangle className="w-3 h-3" /> Failed Attempts
              </div>
              <p className={`text-sm font-medium ${recentFailedAttempts > 0 ? "text-destructive" : "text-success"}`}>
                {failedAttempts} / {user.security.maxLoginAttempts}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/30 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Smartphone className="w-3 h-3" /> Current Device
              </div>
              <p className="text-xs font-medium truncate">{currentSession?.device || "Unknown"}</p>
            </div>
          </div>

          {/* Lockout Warning */}
          {isLocked && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-sm">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Account locked. Retry in {lockoutRemaining} min</span>
            </div>
          )}

          {/* Recent Failed Attempts */}
          {recentFailedAttempts > 0 && !isLocked && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-warning/10 text-warning text-xs">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>{recentFailedAttempts} failed login{recentFailedAttempts > 1 ? "s" : ""} in last hour</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
