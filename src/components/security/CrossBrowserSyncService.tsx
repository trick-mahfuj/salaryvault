"use client";

import { useCrossBrowserSync } from "@/hooks/useCrossBrowserSync";

export function CrossBrowserSyncService() {
  useCrossBrowserSync();
  return null;
}
