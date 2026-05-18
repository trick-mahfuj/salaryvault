"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Shield, Home } from "lucide-react";
import { sendTelegramAlert, formatSecurityAlert } from "@/lib/telegram";
import { getRealIP, getBrowserInfo } from "@/lib/ip";

function Particles() {
  const dots = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    delay: Math.random() * 5,
    duration: Math.random() * 10 + 10,
  }));
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {dots.map((d) => (
        <motion.div
          key={d.id}
          className="absolute rounded-full"
          style={{
            left: `${d.x}%`,
            top: `${d.y}%`,
            width: d.size,
            height: d.size,
            background: `rgba(${d.id % 3 === 0 ? "168,85,247" : d.id % 3 === 1 ? "34,197,94" : "99,102,241"}, ${Math.random() * 0.4 + 0.2})`,
            boxShadow: `0 0 ${d.size * 2}px rgba(${d.id % 3 === 0 ? "168,85,247" : d.id % 3 === 1 ? "34,197,94" : "99,102,241"}, 0.3)`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: d.duration,
            delay: d.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

function GlowOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute -top-40 -left-40 w-80 h-80 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)",
        }}
        animate={{ x: [0, 60, 0], y: [0, -40, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(34,197,94,0.1) 0%, transparent 70%)",
        }}
        animate={{ x: [0, -60, 0], y: [0, 50, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 60%)",
        }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

export default function NotFoundContent() {
  const router = useRouter();
  const logged = useRef(false);

  useEffect(() => {
    if (logged.current) return;
    logged.current = true;
    const path = window.location.pathname;
    const adminPatterns = ["setup", "login", "dashboard", "admin", "secure", "salary", "expenses", "payments", "analytics", "goals", "notes", "settings", "security"];
    const isAdminProbe = adminPatterns.some((p) => path.toLowerCase().includes(p));
    if (!isAdminProbe) return;
    const { device, browser } = getBrowserInfo();
    const ip = getRealIP();
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const u = JSON.parse(stored);
        if (u.telegram?.enabled && u.telegram?.botToken && u.telegram?.chatId) {
          sendTelegramAlert(
            formatSecurityAlert("Blocked Admin Route Access", {
              ip, device, browser, route: path,
            }),
            u.telegram.botToken, u.telegram.chatId
          );
        }
      }
    } catch { /* silent */ }
  }, []);

  return (
    <div className="relative min-h-screen bg-[radial-gradient(ellipse_at_top,#0f0f1a_0%,#0a0a14_40%,#000000_100%)] flex items-center justify-center p-4 overflow-hidden">
      <Particles />
      <GlowOrbs />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Scanning line */}
      <motion.div
        className="absolute left-0 right-0 h-px pointer-events-none"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(168,85,247,0.3), rgba(34,197,94,0.3), transparent)",
        }}
        animate={{ top: ["0%", "100%", "0%"] }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative w-full max-w-md"
      >
        <div
          className="relative rounded-3xl p-10 backdrop-blur-2xl border overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
            borderColor: "rgba(255,255,255,0.08)",
            boxShadow: "0 25px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          {/* Inner glow */}
          <div
            className="absolute -top-20 -right-20 w-40 h-40 rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)",
            }}
          />

          <div className="relative z-10 text-center space-y-8">
            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(34,197,94,0.15))",
                boxShadow: "0 0 30px rgba(168,85,247,0.1)",
              }}
            >
              <Shield className="w-8 h-8" style={{ color: "rgba(168,85,247,0.8)" }} />
            </motion.div>

            {/* 404 */}
            <div className="space-y-2">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="text-8xl sm:text-9xl font-bold tracking-tighter"
                style={{
                  background: "linear-gradient(135deg, #a855f7, #22c55e, #6366f1)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 0 30px rgba(168,85,247,0.2))",
                }}
              >
                404
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="text-sm font-medium tracking-widest uppercase"
                style={{ color: "rgba(168,85,247,0.6)" }}
              >
                Page Not Found
              </motion.p>
            </div>

            {/* Divider */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="h-px w-20 mx-auto origin-center"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(168,85,247,0.4), rgba(34,197,94,0.4), transparent)",
              }}
            />

            {/* Message */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="text-sm leading-relaxed max-w-xs mx-auto"
              style={{ color: "rgba(255,255,255,0.4) " }}
            >
              The requested resource could not be located on this server. Please verify the URL or navigate to the homepage.
            </motion.p>

            {/* Button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              <button
                onClick={() => router.push("/")}
                className="group relative inline-flex items-center gap-2.5 px-8 py-3.5 rounded-2xl font-medium text-sm overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(34,197,94,0.15))",
                  border: "1px solid rgba(168,85,247,0.2)",
                  color: "rgba(255,255,255,0.85)",
                }}
              >
                <span
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: "linear-gradient(135deg, rgba(168,85,247,0.1), rgba(34,197,94,0.1))",
                  }}
                />
                <Home className="w-4 h-4 relative z-10 group-hover:rotate-[-12deg] transition-transform duration-300" />
                <span className="relative z-10">Return Home</span>
                <span
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    boxShadow: "0 0 30px rgba(168,85,247,0.15), 0 0 60px rgba(34,197,94,0.05)",
                  }}
                />
              </button>
            </motion.div>

            {/* Footer */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.5 }}
              className="text-[10px] tracking-wider"
              style={{ color: "rgba(255,255,255,0.15)" }}
            >
              MNIT NETWORK &bull; SECURE PLATFORM
            </motion.p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
