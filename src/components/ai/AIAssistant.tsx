"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/store/useStore";
import { useAIStore, trackCategory, trackMethod, trackSource } from "@/store/aiStore";
import { answerQuestion, extractTransaction, computeBalance } from "@/lib/aiEngine";
import { cn, formatCurrency } from "@/lib/utils";
import type { ExtractedTransaction, ExpenseCategory, PaymentMethod } from "@/types";
import {
  Check, X, Edit3, AlertTriangle, TrendingUp, ShoppingBag,
  DollarSign, CreditCard, Smartphone, Hash, Calendar, User,
  FileText, ArrowUpCircle, HelpCircle, Sparkles,
  Download, Trash2, Pin, Bot, Send, ChevronDown,
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  text: string;
  fullText?: string;
  data?: Record<string, unknown>;
  suggestions?: string[];
  timestamp: Date;
}

const loadingMessages = [
  "আপনার তথ্য বিশ্লেষণ করছি...",
  "হিসাব-নিকাশ চলছে...",
  "ফাইন্যান্স চেক করছি...",
  "ডাটা প্রসেস করছি...",
  "আর্টিফিশিয়াল ইন্টেলিজেন্স কাজ করছে...",
  "রিপোর্ট তৈরি করছি...",
  "একটু терпение...",
];

const WELCOME_BANGLA = `আসসালামু আলাইকাম! 👋
আমি আপনার ব্যক্তিগত AI ফাইন্যান্স অ্যাসিস্ট্যান্ট।

আপনার ফাইন্যান্স নিয়ে যেকোনো প্রশ্ন করতে পারেন।

লেনদেন সংক্রান্ত তথ্য দিন —
আমি ডিটেক্ট করে কনফার্ম করব।`;

const WELCOME_ENGLISH = `Assalamu Alaikum! 👋
I'm your personal AI Finance Assistant.

Ask me anything about your finances.

Share transaction details —
I'll detect and confirm them automatically.`;

const SOURCE_SUGGESTIONS = ["MNIT", "Freelance", "Bonus", "Client", "Company", "Side Income", "Refund"];

function formatTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("bn", { hour: "2-digit", minute: "2-digit" });
}

function formatDateShort(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("bn", { day: "numeric", month: "short" });
}

function hasBangla(text: string): boolean {
  return /[\u0980-\u09FF]/.test(text);
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return "bg-emerald-500";
  if (confidence >= 60) return "bg-amber-500";
  return "bg-rose-500";
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 90) return "Excellent";
  if (confidence >= 80) return "High";
  if (confidence >= 60) return "Medium";
  if (confidence >= 40) return "Low";
  return "Poor";
}

function getConfidenceColorText(confidence: number): string {
  if (confidence >= 80) return "text-emerald-400";
  if (confidence >= 60) return "text-amber-400";
  return "text-rose-400";
}

function TypewriterText({ text, speed = 18 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const idxRef = useRef(0);

  useEffect(() => {
    idxRef.current = 0;
    setDisplayed("");
    setDone(false);
    const isBangla = hasBangla(text);
    const chunkSize = isBangla ? 3 : 1;

    const interval = setInterval(() => {
      const next = idxRef.current + chunkSize;
      if (idxRef.current >= text.length) {
        clearInterval(interval);
        setDone(true);
        setDisplayed(text);
        return;
      }
      setDisplayed(text.slice(0, next));
      idxRef.current = next;
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <span>
      {displayed}
      {!done && <span className="inline-block w-[2px] h-[1em] bg-indigo-400 ml-0.5 animate-pulse align-middle" />}
    </span>
  );
}

// Detect user's language: Bangla, Banglish, or English based on browser/memory
function detectUserLanguage(memory: import("@/store/aiStore").UserMemory): "bangla" | "english" {
  if (typeof window === "undefined") return "english";
  const lang = navigator.language || "";
  // Check if user has interacted in Bangla before
  if (memory.totalInteractions > 0) {
    const hasBanglaInMemory = memory.preferredCategories.length > 0 &&
      /[\u0980-\u09FF]/.test(memory.preferredCategories[0]?.category || "");
    if (hasBanglaInMemory) return "bangla";
  }
  // Browser language detection
  if (lang.startsWith("bn")) return "bangla";
  return "english";
}

// Daily financial snapshot data
function useDailySnapshot() {
  const { salaries, expenses } = useStore();
  return useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const todayIncome = salaries
      .filter((s) => s.paymentDate === today)
      .reduce((s, x) => s + x.amount, 0);
    const todayExpense = expenses
      .filter((e) => e.date === today)
      .reduce((s, x) => s + x.amount, 0);
    const totalIncome = salaries.reduce((s, x) => s + x.amount, 0);
    const totalExpenses = expenses.reduce((s, x) => s + x.amount, 0);
    const balance = totalIncome - totalExpenses;
    return { todayIncome, todayExpense, balance, hasData: totalIncome > 0 || totalExpenses > 0 };
  }, [salaries, expenses]);
}

// Glassmorphism welcome card — ONLY greeting, NO duplicate messages
function WelcomeCard({
  language,
  snapshot,
  onQuickAction,
}: {
  language: "bangla" | "english";
  snapshot: { todayIncome: number; todayExpense: number; balance: number; hasData: boolean };
  onQuickAction: (q: string) => void;
}) {
  const welcomeText = language === "bangla" ? WELCOME_BANGLA : WELCOME_ENGLISH;

  // Quick actions that adapt to user
  const quickActions = language === "bangla"
    ? ["ব্যালেন্স কত?", "আজকের রিপোর্ট", "এই মাসের খরচ", "আজকের income", "আগামী মাসের পূর্বাভাস", "সিকিউরিটি স্ট্যাটাস"]
    : ["What's my balance?", "Today's report", "This month's expenses", "Today's income", "Next month forecast", "Security status"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="relative overflow-hidden rounded-3xl p-6 backdrop-blur-xl border border-white/20 dark:border-white/10"
      style={{
        background: "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(168,85,247,0.1) 50%, rgba(236,72,153,0.05) 100%)",
        boxShadow: "0 25px 60px -15px rgba(99,102,241,0.3)",
      }}
    >
      {/* Animated background gradient orbs */}
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-purple-500/15 blur-3xl" />

      <div className="relative z-10">
        {/* Avatar + Title row */}
        <div className="flex items-start gap-4">
          <motion.div
            animate={{ rotate: [0, 5, 0, -5, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0"
          >
            <Bot className="w-7 h-7 text-white" />
          </motion.div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white mb-1">AI Intelligence</h3>
            <p className="text-xs text-white/60 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Online &middot; বাংলা + English + Banglish
            </p>
          </div>
        </div>

        {/* Welcome text — typing animation */}
        <div className="mt-4 p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
          <TypewriterText text={welcomeText} speed={12} />
        </div>

        {/* Daily financial snapshot */}
        {snapshot.hasData && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-4 grid grid-cols-3 gap-2"
          >
            <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-2.5 text-center">
              <p className="text-[10px] text-white/50 uppercase tracking-wider">
                {language === "bangla" ? "ব্যালেন্স" : "Balance"}
              </p>
              <p className="text-sm font-bold text-white mt-0.5">
                {formatCurrency(snapshot.balance)}
              </p>
            </div>
            <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-2.5 text-center">
              <p className="text-[10px] text-white/50 uppercase tracking-wider">
                {language === "bangla" ? "আজকের খরচ" : "Today spent"}
              </p>
              <p className="text-sm font-bold text-rose-300 mt-0.5">
                {formatCurrency(snapshot.todayExpense)}
              </p>
            </div>
            <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-2.5 text-center">
              <p className="text-[10px] text-white/50 uppercase tracking-wider">
                {language === "bangla" ? "আজকের আয়" : "Today earned"}
              </p>
              <p className="text-sm font-bold text-emerald-300 mt-0.5">
                {formatCurrency(snapshot.todayIncome)}
              </p>
            </div>
          </motion.div>
        )}

        {/* Quick action buttons */}
        <div className="mt-4 flex flex-wrap gap-2">
          {quickActions.slice(0, 4).map((q) => (
            <button
              key={q}
              onClick={() => onQuickAction(q)}
              className="text-xs px-3 py-1.5 rounded-full bg-white/10 text-white/80 border border-white/10 backdrop-blur-sm hover:bg-white/20 transition-all cursor-pointer active:scale-95"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function ConfidenceMeter({ confidence }: { confidence: number }) {
  return (
    <div className="flex items-center gap-2 py-1.5 px-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
      <div className="flex-1">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>Extraction Confidence</span>
          <span className={cn("text-[10px] font-bold", getConfidenceColorText(confidence))}>
            {confidence}% &middot; {getConfidenceLabel(confidence)}
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${confidence}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={cn("h-full rounded-full", getConfidenceColor(confidence))}
          />
        </div>
      </div>
    </div>
  );
}

function FieldRow({
  icon: Icon, label, children, highlight,
}: { icon: React.ElementType; label: string; children: React.ReactNode; highlight?: boolean }) {
  return (
    <div
      className={cn(
        "flex justify-between items-center py-2.5 px-3 rounded-xl transition-all",
        highlight ? "ring-1 ring-indigo-500/30" : ""
      )}
      style={{ background: "rgba(255,255,255,0.04)" }}
    >
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.35)" }} />
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{label}</span>
      </div>
      {children}
    </div>
  );
}

function TransactionConfirmModal({
  tx, onConfirm, onCancel, onEdit,
}: {
  tx: ExtractedTransaction;
  onConfirm: (edited: ExtractedTransaction) => void;
  onCancel: () => void;
  onEdit: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editTx, setEditTx] = useState(tx);
  const [editAmount, setEditAmount] = useState(String(tx.amount));
  const [editSource, setEditSource] = useState(tx.source || "");
  const [editCategory, setEditCategory] = useState(tx.category || "Other" as ExpenseCategory);
  const [editMethod, setEditMethod] = useState(tx.paymentMethod || "bKash" as PaymentMethod);
  const [editPhone, setEditPhone] = useState(tx.phoneNumber || "");
  const [editTxId, setEditTxId] = useState(tx.transactionId || "");
  const [editNotes, setEditNotes] = useState(tx.notes || "");
  const [editLocation, setEditLocation] = useState(tx.location || "");
  const [editPurpose, setEditPurpose] = useState(tx.purpose || "");
  const [editMemo, setEditMemo] = useState(tx.memo || "");
  const [editTags, setEditTags] = useState((tx.tags || []).join(", "));
  const [showSourceSuggestions, setShowSourceSuggestions] = useState(false);

  const handleBeginEdit = () => {
    setEditing(true);
    onEdit();
  };

  const handleApplyEdit = () => {
    const parsed = parseInt(editAmount, 10);
    if (isNaN(parsed) || parsed <= 0) return;
    const tagsArr = editTags.split(",").map((t) => t.trim()).filter(Boolean);
    setEditTx({
      ...editTx,
      amount: parsed,
      source: editTx.type === "income" ? editSource : undefined,
      category: editTx.type === "expense" ? editCategory as ExpenseCategory : undefined,
      paymentMethod: editMethod as PaymentMethod,
      phoneNumber: editPhone || undefined,
      transactionId: editTxId || undefined,
      notes: editNotes,
      location: editLocation || undefined,
      purpose: editPurpose || undefined,
      memo: editMemo || undefined,
      tags: tagsArr.length > 0 ? tagsArr : undefined,
    });
    setEditing(false);
  };

  const handleConfirm = () => {
    const tagsArr = editTags.split(",").map((t) => t.trim()).filter(Boolean);
    onConfirm(editing ? {
      ...editTx,
      amount: parseInt(editAmount, 10) || editTx.amount,
      source: editTx.type === "income" ? editSource : undefined,
      category: editTx.type === "expense" ? editCategory as ExpenseCategory : undefined,
      paymentMethod: editMethod as PaymentMethod,
      phoneNumber: editPhone || undefined,
      transactionId: editTxId || undefined,
      notes: editNotes,
      location: editLocation || undefined,
      purpose: editPurpose || undefined,
      memo: editMemo || undefined,
      tags: tagsArr.length > 0 ? tagsArr : undefined,
    } : tx);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 10 }}
      className="relative w-full max-w-sm mx-auto"
    >
      <div
        className="rounded-3xl p-5 backdrop-blur-2xl border space-y-4"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
          borderColor: "rgba(255,255,255,0.08)",
          boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
        }}
      >
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ rotate: 5 }}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg ${
              tx.type === "income"
                ? "bg-gradient-to-br from-emerald-500 to-green-600"
                : "bg-gradient-to-br from-rose-500 to-red-600"
            }`}
          >
            {tx.type === "income"
              ? <ArrowUpCircle className="w-5 h-5 text-white" />
              : <ShoppingBag className="w-5 h-5 text-white" />
            }
          </motion.div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-bold text-sm text-white">
                {tx.type === "income" ? "Income" : "Expense"}
              </p>
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-medium",
                tx.type === "income"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-rose-500/20 text-rose-300"
              )}>
                {tx.confidence >= 80 ? "Verified" : tx.confidence >= 60 ? "Reviewed" : "Draft"}
              </span>
            </div>
            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>
              AI Extraction &middot; Detected {hasBangla(tx.rawText) ? "Bangla" : "English"} input
            </p>
          </div>
        </div>

        <ConfidenceMeter confidence={tx.confidence} />

        <div className="space-y-1.5">
          <FieldRow icon={DollarSign} label="Amount" highlight={editing}>
            {editing ? (
              <input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)}
                className="w-28 text-right text-sm font-bold bg-transparent border-b border-indigo-500/50 text-white outline-none" autoFocus />
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{formatCurrency(tx.amount)}</span>
                {tx.amount > 0 && (
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded", tx.amount >= 10000 ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/20 text-emerald-300")}>
                    {tx.amount >= 10000 ? "Large" : "Normal"}
                  </span>
                )}
              </div>
            )}
          </FieldRow>

          {tx.type === "income" && (
            <>
              <FieldRow icon={User} label="Source" highlight={editing}>
                {editing ? (
                  <div className="relative">
                    <input type="text" value={editSource} onChange={(e) => { setEditSource(e.target.value); setShowSourceSuggestions(e.target.value.length > 0); }}
                      onFocus={() => setShowSourceSuggestions(true)} onBlur={() => setTimeout(() => setShowSourceSuggestions(false), 200)}
                      placeholder="Type to search..." className="w-36 text-right text-sm bg-transparent border-b border-indigo-500/50 text-white outline-none placeholder-white/30" />
                    {showSourceSuggestions && (
                      <div className="absolute right-0 top-full mt-1 w-40 bg-gray-800 rounded-xl border border-gray-700 shadow-xl z-10 overflow-hidden">
                        {SOURCE_SUGGESTIONS.filter((s) => s.toLowerCase().includes(editSource.toLowerCase())).map((s) => (
                          <button key={s} onMouseDown={() => { setEditSource(s); setShowSourceSuggestions(false); }}
                            className="w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10 transition-colors">{s}</button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className={cn("text-sm font-medium", tx.source ? "text-white" : "text-white/40 italic")}>
                    {tx.source || "Auto-detected"}
                  </span>
                )}
              </FieldRow>
              {tx.senderName && !editing && (
                <FieldRow icon={User} label="Sender">
                  <span className="text-sm font-medium text-white">{tx.senderName}</span>
                </FieldRow>
              )}
            </>
          )}

          {tx.type === "expense" && (
            <FieldRow icon={HelpCircle} label="Category" highlight={editing}>
              {editing ? (
                <select value={editCategory} onChange={(e) => setEditCategory(e.target.value as ExpenseCategory)}
                  className="text-right text-sm bg-transparent border-b border-indigo-500/50 text-white outline-none" style={{ colorScheme: "dark" }}>
                  {(["Food", "Transport", "Internet", "Mobile Recharge", "Family", "Shopping", "Gaming", "Bills", "Personal", "Hosting/Server", "Domain", "Other"] as ExpenseCategory[]).map((c) => (
                    <option key={c} value={c} className="bg-gray-900">{c}</option>
                  ))}
                </select>
              ) : (
                <span className={cn("text-sm font-medium", tx.category ? "text-white" : "text-white/40 italic")}>
                  {tx.category || "Smart-predicted"}
                </span>
              )}
            </FieldRow>
          )}

          <FieldRow icon={CreditCard} label="Method">
            {editing ? (
              <select value={editMethod} onChange={(e) => setEditMethod(e.target.value as PaymentMethod)}
                className="text-right text-sm bg-transparent border-b border-indigo-500/50 text-white outline-none" style={{ colorScheme: "dark" }}>
                {(["bKash", "Nagad", "Rocket", "Bank", "Cash"] as PaymentMethod[]).map((m) => (
                  <option key={m} value={m} className="bg-gray-900">{m}</option>
                ))}
              </select>
            ) : (
              <span className={cn("text-sm font-medium", tx.paymentMethod ? "text-white" : "text-white/40 italic")}>
                {tx.paymentMethod || "Defaulted"}
              </span>
            )}
          </FieldRow>

          {editing && (
            <>
              <FieldRow icon={Smartphone} label="Phone">
                <input type="text" value={editPhone} onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="01XXXXXXXXX" className="w-36 text-right text-sm bg-transparent border-b border-indigo-500/50 text-white outline-none placeholder-white/30" />
              </FieldRow>
              <FieldRow icon={Hash} label="TX ID">
                <input type="text" value={editTxId} onChange={(e) => setEditTxId(e.target.value)}
                  placeholder="Transaction ID" className="w-36 text-right text-sm bg-transparent border-b border-indigo-500/50 text-white outline-none placeholder-white/30" />
              </FieldRow>
            </>
          )}

          {!editing && tx.phoneNumber && (
            <FieldRow icon={Smartphone} label="Phone">
              <span className="text-sm font-mono text-white/60 text-xs">{tx.phoneNumber}</span>
            </FieldRow>
          )}
          {!editing && tx.transactionId && (
            <FieldRow icon={Hash} label="TX ID">
              <span className="text-sm font-mono text-white/60 text-xs">{tx.transactionId}</span>
            </FieldRow>
          )}

          {tx.notes && !editing && (
            <FieldRow icon={FileText} label="Notes">
              <span className="text-xs text-white/60 text-right max-w-[60%] line-clamp-2">{tx.notes}</span>
            </FieldRow>
          )}

          {editing && (
            <>
              <FieldRow icon={FileText} label="Notes">
                <input type="text" value={editNotes} onChange={(e) => setEditNotes(e.target.value)}
                  className="w-36 text-right text-sm bg-transparent border-b border-indigo-500/50 text-white outline-none placeholder-white/30" placeholder="Notes" />
              </FieldRow>
              <FieldRow icon={Smartphone} label="Location">
                <input type="text" value={editLocation} onChange={(e) => setEditLocation(e.target.value)}
                  className="w-36 text-right text-sm bg-transparent border-b border-indigo-500/50 text-white outline-none placeholder-white/30" placeholder="Shop/place" />
              </FieldRow>
              <FieldRow icon={Smartphone} label="Purpose">
                <input type="text" value={editPurpose} onChange={(e) => setEditPurpose(e.target.value)}
                  className="w-36 text-right text-sm bg-transparent border-b border-indigo-500/50 text-white outline-none placeholder-white/30" placeholder="Why?" />
              </FieldRow>
              <FieldRow icon={Smartphone} label="Memo">
                <input type="text" value={editMemo} onChange={(e) => setEditMemo(e.target.value)}
                  className="w-36 text-right text-sm bg-transparent border-b border-indigo-500/50 text-white outline-none placeholder-white/30" placeholder="Custom memo" />
              </FieldRow>
              <FieldRow icon={Smartphone} label="Tags">
                <input type="text" value={editTags} onChange={(e) => setEditTags(e.target.value)}
                  className="w-36 text-right text-sm bg-transparent border-b border-indigo-500/50 text-white outline-none placeholder-white/30" placeholder="comma,separated" />
              </FieldRow>
            </>
          )}

          <FieldRow icon={Calendar} label="Date">
            <span className="text-sm text-white/70 text-xs">{tx.date || "Today"}</span>
          </FieldRow>
        </div>

        {tx.confidence < 60 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1.5 text-[10px] p-2 rounded-xl"
            style={{ background: "rgba(251,191,36,0.08)", color: "rgba(251,191,36,0.7)" }}
          >
            <AlertTriangle className="w-3 h-3 shrink-0" />
            Low confidence &mdash; please verify details before saving
          </motion.div>
        )}

        <div className="flex gap-2 pt-1">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)}
                className="flex-1 h-11 rounded-2xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}>
                <X className="w-3.5 h-3.5" /> Back
              </button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleApplyEdit}
                className="flex-1 h-11 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:from-indigo-400 hover:to-indigo-500">
                <Check className="w-3.5 h-3.5" /> Apply Changes
              </motion.button>
            </>
          ) : (
            <>
              <button onClick={onCancel}
                className="flex-1 h-11 rounded-2xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleBeginEdit}
                className="flex-1 h-11 rounded-2xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}>
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleConfirm}
                className={`flex-1 h-11 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all text-white shadow-lg ${
                  tx.type === "income"
                    ? "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500"
                    : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500"
                }`}>
                <Check className="w-3.5 h-3.5" /> Save
              </motion.button>
            </>
          )}
        </div>

        {!editing && tx.confidence >= 80 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-center justify-center gap-1.5 text-[10px]" style={{ color: "rgba(167,139,250,0.5)" }}>
            <Sparkles className="w-3 h-3" />
            <span>AI is confident &mdash; quick save recommended</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// Message group component with timestamps
function MessageGroup({ msg, isLast, pendingTx, onSend }: {
  msg: { role: string; text: string; fullText?: string; suggestions?: string[]; timestamp: string; data?: Record<string, unknown> };
  isLast: boolean;
  pendingTx: ExtractedTransaction | null;
  onSend: (text: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={cn("flex flex-col", msg.role === "user" ? "items-end" : "items-start")}
    >
      <div
        className={cn(
          "max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
          msg.role === "user"
            ? "bg-indigo-600 text-white rounded-br-md"
            : "bg-gray-50 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 rounded-bl-md border border-gray-100 dark:border-gray-700/20"
        )}
      >
        {msg.role === "assistant" && msg.fullText ? (
          <TypewriterText text={msg.fullText} speed={msg.fullText.length > 300 ? 6 : 10} />
        ) : (
          <p className="whitespace-pre-wrap">{msg.text}</p>
        )}

        {msg.suggestions && msg.suggestions.length > 0 && isLast && !pendingTx && (
          <div className="mt-4 flex flex-wrap gap-1.5 pt-2 border-t border-gray-200/30 dark:border-gray-700/20">
            {msg.suggestions.map((s, j) => (
              <button key={j} onClick={() => onSend(s)}
                className="text-xs px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all font-medium">
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mt-1 px-1">
        <span className="text-[10px] text-gray-400 dark:text-gray-500">
          {formatTime(msg.timestamp)}
        </span>
        {isLast && msg.role === "assistant" && (
          <span className="text-[10px] text-gray-400 dark:text-gray-500">
            &middot; {formatDateShort(msg.timestamp)}
          </span>
        )}
      </div>
    </motion.div>
  );
}

export default function AIAssistant() {
  const {
    messages, isOpen, pendingTx, confirmedTx, loading, loadingText,
    typingId, aiContext, setOpen, addMessage, setMessages,
    setPendingTx, setConfirmedTx, setLoading, setLoadingText,
    setTypingId, setAiContext, clearMessages, hasInteracted,
    welcomeShown, lastWelcomeDate, memory, exportConversation,
    pinnedInsights, addPinnedInsight, removePinnedInsight,
    setWelcomeShown, setLastWelcomeDate,
  } = useAIStore();

  const storeMessages = messages;

  const [input, setInput] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { salaries, expenses, loginAttempts, addSalary, addExpense } = useStore();

  // Language detection
  const language = useMemo(() => detectUserLanguage(memory), [memory]);
  const snapshot = useDailySnapshot();

  // Show welcome: when no messages exist (fresh state) OR first visit today
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const showWelcome = storeMessages.length === 0 || lastWelcomeDate !== today;

  useEffect(() => {
    if (showWelcome) {
      setLastWelcomeDate(today);
      setWelcomeShown(true);
    }
  }, [showWelcome, today, setLastWelcomeDate, setWelcomeShown]);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [storeMessages, pendingTx, loading]);

  const simulateLoading = useCallback(() => {
    setLoading(true);
    let idx = 0;
    setLoadingText(loadingMessages[idx]);
    const interval = setInterval(() => {
      idx = (idx + 1) % loadingMessages.length;
      setLoadingText(loadingMessages[idx]);
    }, 1200);
    return interval;
  }, [setLoading, setLoadingText]);

  const handleSaveTransaction = useCallback((tx: ExtractedTransaction) => {
    if (tx.type === "income") {
      const now = new Date();
      const notesParts: string[] = [];
      if (tx.purpose) notesParts.push(`Purpose: ${tx.purpose}`);
      if (tx.location) notesParts.push(`Location: ${tx.location}`);
      if (tx.memo) notesParts.push(`Memo: ${tx.memo}`);
      if (tx.notes) notesParts.push(tx.notes);
      const enrichedNotes = notesParts.filter(Boolean).join(" | ");
      addSalary({
        amount: tx.amount,
        paymentDate: tx.date || new Date().toISOString().split("T")[0],
        month: now.toLocaleString("en-US", { month: "long" }).toLowerCase(),
        senderName: tx.senderName || tx.source || "Unknown",
        companyName: tx.source || "Unknown",
        incomeSource: "Other",
        paymentMethod: (tx.paymentMethod as "bKash" | "Nagad" | "Rocket" | "Bank" | "Cash") || "bKash",
        bKashNumber: tx.phoneNumber || "",
        transactionId: tx.transactionId || "",
        notes: enrichedNotes,
        screenshot: "",
        status: "received",
        tags: tx.tags || [],
      });
      if (tx.source) trackSource(tx.source);
      if (tx.paymentMethod) trackMethod(tx.paymentMethod);
    } else {
      const notesParts: string[] = [];
      if (tx.purpose) notesParts.push(`Purpose: ${tx.purpose}`);
      if (tx.location) notesParts.push(`At: ${tx.location}`);
      if (tx.memo) notesParts.push(`Memo: ${tx.memo}`);
      if (tx.notes) notesParts.push(tx.notes);
      const enrichedNotes = notesParts.filter(Boolean).join(" | ");
      addExpense({
        title: tx.notes || tx.purpose || tx.category || "Unknown",
        amount: tx.amount,
        category: tx.category || "Other",
        date: tx.date || new Date().toISOString().split("T")[0],
        paymentMethod: tx.paymentMethod || "Cash",
        notes: enrichedNotes,
        receipt: "",
        tags: tx.tags || [],
      });
      if (tx.category) trackCategory(tx.category);
      if (tx.paymentMethod) trackMethod(tx.paymentMethod);
    }
  }, [addSalary, addExpense]);

  const handleSend = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;

    addMessage({ role: "user", text: q });
    setInput("");
    setConfirmedTx(null);
    const interval = simulateLoading();

    await new Promise((r) => setTimeout(r, 400 + Math.random() * 400));

    clearInterval(interval);
    setLoading(false);

    const extracted = extractTransaction(q);
    if (extracted && extracted.confidence >= 30) {
      const newBalance = aiContext.runningBalance + (extracted.type === "income" ? extracted.amount : -extracted.amount);
      setAiContext({
        runningBalance: newBalance,
        lastTransaction: extracted,
        recentMessages: [...aiContext.recentMessages.slice(-10), { role: "user", text: q }],
      });
      setPendingTx(extracted);
      const ctxHint = aiContext.runningBalance !== 0
        ? ` (Previous balance: ${formatCurrency(aiContext.runningBalance)})`
        : "";
      addMessage({
        role: "assistant", text: "",
        fullText: `I detected a transaction.${ctxHint} Please review and confirm the details below.`,
      });
      setTypingId(Date.now());
      return;
    }

    const response = answerQuestion(q, salaries, expenses, loginAttempts);
    const msgIdx = Date.now();
    const suggestions = hasBangla(q) && response.suggestionsBn
      ? response.suggestionsBn
      : response.suggestions;

    setAiContext({
      runningBalance: computeBalance(salaries, expenses),
      recentMessages: [...aiContext.recentMessages.slice(-10), { role: "user", text: q }],
    });

    addMessage({
      role: "assistant", text: "",
      fullText: response.answer,
      data: response.data,
      suggestions,
    });
    setTypingId(msgIdx);
  }, [loading, salaries, expenses, loginAttempts, simulateLoading, aiContext.runningBalance, aiContext.recentMessages, addMessage, setAiContext, setLoading, setPendingTx, setTypingId, setConfirmedTx]);

  const handleConfirmTx = useCallback((tx: ExtractedTransaction) => {
    handleSaveTransaction(tx);
    setConfirmedTx(tx);
    const realBalance = computeBalance(salaries, expenses);
    setAiContext({
      runningBalance: realBalance,
      lastTransaction: tx,
    });
    const txLabel = tx.type === "income" ? "আয়" : "খরচ";
    const txLabelEn = tx.type === "income" ? "Income" : "Expense";
    const detailsParts: string[] = [
      `• ধরণ: ${txLabelEn}`,
      `• পরিমাণ: ${formatCurrency(tx.amount)}`,
      `• ${tx.type === "income" ? "উৎস" : "ক্যাটাগরি"}: ${tx.type === "income" ? (tx.source || "—") : (tx.category || "—")}`,
    ];
    if (tx.type === "income" && tx.senderName) detailsParts.push(`• প্রেরক: ${tx.senderName}`);
    if (tx.paymentMethod) detailsParts.push(`• মাধ্যম: ${tx.paymentMethod}`);
    if (tx.phoneNumber) detailsParts.push(`• ফোন: ${tx.phoneNumber}`);
    if (tx.transactionId) detailsParts.push(`• TX ID: ${tx.transactionId}`);
    if (tx.location) detailsParts.push(`• স্থান: ${tx.location}`);
    if (tx.purpose) detailsParts.push(`• উদ্দেশ্য: ${tx.purpose}`);
    if (tx.tags && tx.tags.length > 0) detailsParts.push(`• ট্যাগ: ${tx.tags.join(", ")}`);

    // Pin insight for high-value transactions
    if (tx.amount >= 10000) {
      addPinnedInsight({
        id: `pin-${Date.now()}`,
        title: `${txLabelEn === "Income" ? "💰" : "💳"} ${formatCurrency(tx.amount)} ${txLabelEn}`,
        description: tx.source || tx.category || "",
        timestamp: new Date().toISOString(),
      });
    }

    addMessage({
      role: "assistant", text: "",
      fullText: `✅ ${txLabel} সফলভাবে সেভ করা হয়েছে!\n\n${detailsParts.join("\n")}\n\nবর্তমান ব্যালেন্স: ${formatCurrency(realBalance)}`,
    });
    setTypingId(Date.now());
    setPendingTx(null);
  }, [handleSaveTransaction, salaries, expenses, setAiContext, addMessage, setTypingId, setPendingTx, setConfirmedTx, addPinnedInsight]);

  const handleCancelTx = useCallback(() => {
    setPendingTx(null);
    addMessage({
      role: "assistant", text: "",
      fullText: "Transaction was not saved. Let me know if you need anything else.",
    });
    setTypingId(Date.now());
  }, [setPendingTx, addMessage, setTypingId]);

  const handleExport = useCallback(() => {
    const chat = exportConversation();
    const text = chat.map((m) => `[${formatTime(m.timestamp)}] ${m.role === "user" ? "You" : "AI"}: ${m.fullText || m.text}`).join("\n\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ai-chat-${new Date().toISOString().split("T")[0]}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
    setShowMenu(false);
  }, [exportConversation]);

  const handleClearChat = useCallback(() => {
    clearMessages();
    setShowMenu(false);
  }, [clearMessages]);

  return (
    <>
      {/* Floating orb button */}
      <motion.button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed z-50 flex items-center justify-center w-14 h-14 rounded-full shadow-lg",
          "bottom-4 right-4 sm:bottom-28",
          "pb-[env(safe-area-inset-bottom,0px)]",
          "bg-gradient-to-br from-indigo-600 to-purple-600 text-white",
          "hover:shadow-indigo-500/30 hover:scale-105 transition-all"
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={{
          boxShadow: [
            "0 0 0 0 rgba(99,102,241,0.4)",
            "0 0 0 12px rgba(99,102,241,0)",
          ],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
            className={cn(
              "fixed z-50 flex flex-col overflow-hidden",
              "bottom-0 right-0 sm:bottom-40 sm:right-4",
              "w-full sm:w-[400px] sm:max-w-[calc(100vw-2rem)]",
              "h-[100dvh] sm:h-[600px] sm:max-h-[calc(100vh-12rem)]",
              "rounded-none sm:rounded-2xl shadow-2xl",
              "bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl border border-white/20 dark:border-gray-700/30",
              "pb-[env(safe-area-inset-bottom,0px)]"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white shrink-0">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: [0, 5, 0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm"
                >
                  <Bot className="w-5 h-5" />
                </motion.div>
                <div>
                  <p className="font-semibold text-sm tracking-wide">AI Intelligence</p>
                  <p className="text-[10px] text-white/70 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                    অনলাইন · বাংলা + English + Banglish
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button onClick={() => setShowMenu(!showMenu)}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                    <ChevronDown className="w-5 h-5" />
                  </button>
                  {showMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute right-0 top-full mt-1 w-44 bg-gray-800 rounded-xl border border-gray-700 shadow-xl z-10 overflow-hidden"
                    >
                      <button onClick={handleExport}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-white hover:bg-white/10 transition-colors">
                        <Download className="w-3.5 h-3.5" /> Export Chat
                      </button>
                      <button onClick={handleClearChat}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-400 hover:bg-white/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" /> Clear Chat
                      </button>
                    </motion.div>
                  )}
                </div>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Pinned insights strip */}
            {pinnedInsights.length > 0 && (
              <div className="px-4 py-2 bg-indigo-500/5 border-b border-indigo-500/10 shrink-0">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  {pinnedInsights.slice(0, 3).map((pin) => (
                    <div key={pin.id}
                      className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 whitespace-nowrap shrink-0">
                      <Pin className="w-3 h-3" />
                      <span>{pin.title}</span>
                      <button onClick={() => removePinnedInsight(pin.id)} className="hover:text-red-400">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
              {showWelcome && (
                <WelcomeCard
                  language={language}
                  snapshot={snapshot}
                  onQuickAction={handleSend}
                />
              )}
              {storeMessages.map((msg, i) => (
                !msg.text.includes("I detected a transaction") ? (
                  <MessageGroup
                    key={msg.id || i}
                    msg={msg}
                    isLast={i === storeMessages.length - 1}
                    pendingTx={pendingTx}
                    onSend={handleSend}
                  />
                ) : null
              ))}

              {/* Confirmation modal */}
              {pendingTx && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  className="flex justify-center my-2">
                  <TransactionConfirmModal
                    tx={pendingTx}
                    onConfirm={handleConfirmTx}
                    onCancel={handleCancelTx}
                    onEdit={() => {}}
                  />
                </motion.div>
              )}

              {loading && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start">
                  <div className="max-w-[88%] rounded-2xl px-4 py-3 text-sm bg-gray-50 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 rounded-bl-md border border-gray-100 dark:border-gray-700/20 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                      <span className="text-xs font-medium">{loadingText}</span>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Smart suggestions from memory — only after interaction */}
            {!showWelcome && memory.preferredCategories.length > 0 && storeMessages.length > 1 && !loading && (
              <div className="px-4 pb-1.5 shrink-0">
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                  {memory.preferredCategories.slice(0, 3).map((pc) => (
                    <button key={pc.category} onClick={() => handleSend(`${pc.category} খরচ কত?`)}
                      disabled={loading}
                      className="text-[11px] whitespace-nowrap px-3 py-1.5 rounded-full bg-purple-50/50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-all font-medium disabled:opacity-50 shrink-0">
                      {pc.category} খরচ
                    </button>
                  ))}
                  <button onClick={() => handleSend("আজকের সারসংক্ষেপ")}
                    disabled={loading}
                    className="text-[11px] whitespace-nowrap px-3 py-1.5 rounded-full bg-emerald-50/50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all font-medium disabled:opacity-50 shrink-0">
                    আজকের সারসংক্ষেপ
                  </button>
                </div>
              </div>
            )}

            {/* Input */}
            <div className="px-4 pb-4 shrink-0">
              <form
                onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
                className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/60 rounded-2xl px-4 py-2.5 border border-gray-200/50 dark:border-gray-700/20 focus-within:ring-2 focus-within:ring-indigo-500/30 transition-all touch-manipulation"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="যেকোনো প্রশ্ন বা লেনদেন... (বাংলা/English)"
                  disabled={loading}
                  enterKeyHint="send"
                  inputMode="text"
                  autoComplete="off"
                  className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 min-h-[44px]"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="p-3 rounded-xl bg-indigo-600 text-white disabled:opacity-40 hover:bg-indigo-700 transition-colors shadow-sm min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation active:scale-95"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
