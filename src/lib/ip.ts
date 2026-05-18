"use client";

export function getRealIP(): string {
  if (typeof window === "undefined") return "Unknown IP";

  // Check cookie set by middleware
  const match = document.cookie.match(/(?:^|;\s*)x-real-ip=([^;]*)/);
  if (match) return match[1];

  // Fallback: try to get from common CDN headers (Vercel, Cloudflare)
  // These are set as meta or data attributes by some providers
  try {
    const meta = document.querySelector('meta[name="x-real-ip"]');
    if (meta) return meta.getAttribute("content") || "Unknown IP";
  } catch { /* noop */ }

  return "Unknown IP";
}

export function getBrowserInfo(): { device: string; browser: string } {
  if (typeof window === "undefined") return { device: "Unknown", browser: "Unknown" };
  const ua = navigator.userAgent;
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  const browser = ua.includes("Chrome") ? "Chrome"
    : ua.includes("Firefox") ? "Firefox"
    : ua.includes("Safari") ? "Safari"
    : ua.includes("Edg") ? "Edge"
    : "Other";
  return { device: isMobile ? "Mobile" : "Desktop", browser };
}
