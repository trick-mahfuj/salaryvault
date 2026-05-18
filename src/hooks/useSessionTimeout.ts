"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/store/useStore";

export function useSessionTimeout() {
  const { user, isAuthenticated, logout, updateLastActivity, lastActivity } = useStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ["mousedown", "keydown", "touchstart", "scroll", "click"];
    const handleActivity = () => updateLastActivity();

    events.forEach((ev) => window.addEventListener(ev, handleActivity));
    updateLastActivity();

    const timeoutMinutes = user.security.sessionTimeoutMinutes || 30;

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivity;
      if (elapsed > timeoutMinutes * 60 * 1000) {
        logout();
      }
    }, 10000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleActivity));
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user.security.sessionTimeoutMinutes]);
}
