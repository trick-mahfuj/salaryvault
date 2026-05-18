"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";

export function HydrationWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const rehydrate = useStore((s) => s.rehydrate);
  const hydrated = useStore((s) => s.hydrated);

  useEffect(() => {
    rehydrate();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, [rehydrate]);

  if (!mounted || !hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
