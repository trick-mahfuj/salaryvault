"use client";

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

type RealtimeTable =
  | "salaries"
  | "expenses"
  | "goals"
  | "notes"
  | "ai_messages"
  | "security_settings"
  | "telegram_config"
  | "users"
  | "sessions";

interface RealtimeChangePayload {
  table: string;
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}

type ChangeHandler = (payload: RealtimeChangePayload) => void;

export function useSupabaseRealtime(
  tables: RealtimeTable[],
  onChange: ChangeHandler
) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const cleanupRef = useRef<(() => void)[]>([]);

  const unsubscribe = useCallback(() => {
    cleanupRef.current.forEach((fn) => fn());
    cleanupRef.current = [];
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const channels = tables.map((table) => {
      const channel = supabase
        .channel(`public:${table}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          (payload) => {
            onChangeRef.current({
              table: payload.table,
              eventType: (payload.eventType || "").toUpperCase() as RealtimeChangePayload["eventType"],
              new: (payload.new || {}) as Record<string, unknown>,
              old: (payload.old || {}) as Record<string, unknown>,
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    });

    cleanupRef.current = channels;

    return unsubscribe;
  }, [tables, unsubscribe]);
}
