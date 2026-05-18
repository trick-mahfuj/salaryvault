"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/store/useStore";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Search, ArrowUpRight, ArrowDownRight } from "lucide-react";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } } as const;
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } } as const;

export default function PaymentsPage() {
  const { salaries, expenses } = useStore();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "salary" | "expense">("all");
  const [methodFilter, setMethodFilter] = useState("");

  const transactions = useMemo(() => {
    const all = [
      ...salaries.map((s) => ({
        id: s.id, type: "salary" as const, amount: s.amount, date: s.paymentDate,
        description: `Salary from ${s.senderName}`, category: s.paymentMethod,
        method: s.paymentMethod, status: s.status, reference: s.transactionId,
      })),
      ...expenses.map((e) => ({
        id: e.id, type: "expense" as const, amount: e.amount, date: e.date,
        description: e.title, category: e.category, method: e.paymentMethod,
        status: "paid", reference: "",
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return all.filter((t) => {
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (methodFilter && t.method !== methodFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return t.description.toLowerCase().includes(q) || t.reference.toLowerCase().includes(q);
      }
      return true;
    });
  }, [salaries, expenses, search, typeFilter, methodFilter]);

  const methods = useMemo(() => {
    const set = new Set<string>();
    salaries.forEach((s) => set.add(s.paymentMethod));
    expenses.forEach((e) => set.add(e.paymentMethod));
    return Array.from(set);
  }, [salaries, expenses]);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold">Transaction History</h1>
        <p className="text-sm text-muted-foreground">Complete payment history</p>
      </motion.div>

      {/* Filters */}
      <motion.div variants={item} className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input className="flex h-10 w-full rounded-xl border border-input bg-background pl-10 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Search transactions..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="h-10 rounded-xl border border-input bg-background px-3 text-sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as "all" | "salary" | "expense")}>
          <option value="all">All Types</option>
          <option value="salary">Salary</option>
          <option value="expense">Expenses</option>
        </select>
        <select className="h-10 rounded-xl border border-input bg-background px-3 text-sm" value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
          <option value="">All Methods</option>
          {methods.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </motion.div>

      {/* Stats */}
      <motion.div variants={item} className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-lg font-bold">{transactions.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Salary</p>
          <p className="text-lg font-bold text-success">{transactions.filter((t) => t.type === "salary").length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Expenses</p>
          <p className="text-lg font-bold text-destructive">{transactions.filter((t) => t.type === "expense").length}</p>
        </CardContent></Card>
      </motion.div>

      {/* Transaction List */}
      <div className="space-y-2">
        {transactions.length > 0 ? transactions.map((t, i) => (
          <motion.div key={t.id} variants={item} custom={i}>
            <Card hover>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    t.type === "salary" ? "bg-success/10" : "bg-destructive/10"
                  }`}>
                    {t.type === "salary" ? (
                      <ArrowUpRight className="w-5 h-5 text-success" />
                    ) : (
                      <ArrowDownRight className="w-5 h-5 text-destructive" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{t.description}</p>
                      <Badge variant={t.type === "salary" ? "success" : "default"} className="text-[10px]">
                        {t.type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      <span>{formatDateTime(t.date)}</span>
                      <span>&middot;</span>
                      <span>{t.method}</span>
                      {t.reference && <><span>&middot;</span><span className="font-mono">TX: {t.reference}</span></>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${t.type === "salary" ? "text-success" : "text-destructive"}`}>
                      {t.type === "salary" ? "+" : "-"}{formatCurrency(t.amount)}
                    </p>
                    {t.category && <p className="text-[10px] text-muted-foreground">{t.category}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )) : (
          <Card><CardContent className="p-12 text-center text-sm text-muted-foreground">No transactions found</CardContent></Card>
        )}
      </div>
    </motion.div>
  );
}
