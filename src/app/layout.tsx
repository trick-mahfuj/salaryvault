import { HydrationWrapper } from "@/components/HydrationWrapper";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MNIT Work Ledger - Personal Finance Manager",
  description: "Track salary, expenses, and manage your personal finances",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased">
        <HydrationWrapper>{children}</HydrationWrapper>
      </body>
    </html>
  );
}
