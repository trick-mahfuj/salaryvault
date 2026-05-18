"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { FAB } from "@/components/layout/FAB";
import { hasStoredCredentials } from "@/lib/auth";
import AIAssistant from "@/components/ai/AIAssistant";
import { PasswordRotationBackgroundService } from "@/components/security/PasswordRotationBackgroundService";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, darkMode, hydrated } = useStore();

  useSessionTimeout();

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      if (!hasStoredCredentials()) {
        router.replace("/setup");
      } else {
        router.replace("/secure-access-93xk");
      }
    }
  }, [isAuthenticated, hydrated, router]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <BottomNav />
      <FAB />
      <AIAssistant />
      <PasswordRotationBackgroundService />
      <main className="lg:pl-[260px] min-h-screen transition-all duration-300 pb-20 lg:pb-8">
        <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 pt-16 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
