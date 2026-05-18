"use client";

import { useMemo, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { useStore } from "@/store/useStore";
import { formatCurrency } from "@/lib/utils";
import { Sparkles, TrendingUp, TrendingDown, Lightbulb } from "lucide-react";

export function SmartSummary() {
  const { salaries, expenses } = useStore();
  const [now, setNow] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
  }, []);

  const summary = useMemo(() => {
    if (!now) return [];

    const totalSalary = salaries.reduce((s, x) => s + x.amount, 0);
    const totalExpenses = expenses.reduce((s, x) => s + x.amount, 0);
    const balance = totalSalary - totalExpenses;

    const currentMonth = new Date().toLocaleString("en-US", { month: "long" }).toLowerCase();
    const monthSalary = salaries
      .filter((s) => s.month.toLowerCase() === currentMonth)
      .reduce((s, x) => s + x.amount, 0);
    const monthExpenses = expenses
      .filter((e) => {
        const d = new Date(e.date);
        return d.toLocaleString("en-US", { month: "long" }).toLowerCase() === currentMonth;
      })
      .reduce((s, x) => s + x.amount, 0);

    const catTotals = new Map<string, number>();
    expenses.forEach((e) => catTotals.set(e.category, (catTotals.get(e.category) || 0) + e.amount));
    const topCategory = [...catTotals.entries()].sort((a, b) => b[1] - a[1])[0];

    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthStr = lastMonth.toLocaleString("en-US", { month: "long" }).toLowerCase();
    const prevExpenses = expenses
      .filter((e) => {
        const d = new Date(e.date);
        return d.toLocaleString("en-US", { month: "long" }).toLowerCase() === lastMonthStr;
      })
      .reduce((s, x) => s + x.amount, 0);

    const expenseChange = prevExpenses > 0 ? ((monthExpenses - prevExpenses) / prevExpenses) * 100 : 0;

    const lines: string[] = [];

    if (monthSalary > 0) {
      lines.push(`${new Date().toLocaleString("en-US", { month: "long" })} salary fully received.`);
    } else {
      lines.push(`No salary recorded for ${new Date().toLocaleString("en-US", { month: "long" })} yet.`);
    }

    if (monthExpenses > 0) {
      const dir = expenseChange > 0 ? "increased" : expenseChange < 0 ? "decreased" : "stayed same";
      lines.push(`Monthly expenses ${dir} by ${Math.abs(Math.round(expenseChange))}%.`);
    }

    if (topCategory) {
      lines.push(`Most spending category: ${topCategory[0]} (${formatCurrency(topCategory[1])}).`);
    }

    if (balance > 0) {
      const savingsRate = totalSalary > 0 ? Math.round((balance / totalSalary) * 100) : 0;
      lines.push(`Overall savings rate: ${savingsRate}% (${formatCurrency(balance)} saved).`);
    } else if (balance < 0) {
      lines.push(`Expenses exceed income by ${formatCurrency(Math.abs(balance))}. Consider adjusting budget.`);
    } else {
      lines.push(`No transactions recorded yet. Start tracking your finances!`);
    }

    const lastEntry = [...salaries, ...expenses].sort((a, b) => {
      const aDate = "paymentDate" in a ? a.paymentDate : a.date;
      const bDate = "paymentDate" in b ? b.paymentDate : b.date;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    })[0];

    if (lastEntry) {
      const lastDate = "paymentDate" in lastEntry ? lastEntry.paymentDate : lastEntry.date;
      const diff = now - new Date(lastDate).getTime();
      const daysSince = Math.floor(diff / 86400000);
      if (daysSince === 0) lines.push(`Last transaction recorded today.`);
      else if (daysSince === 1) lines.push(`Last transaction recorded yesterday.`);
      else lines.push(`Last transaction recorded ${daysSince} days ago.`);
    }

    const pendingCount = salaries.filter((s) => s.status === "pending").length;
    if (pendingCount > 0) {
      lines.push(`${pendingCount} salary payment${pendingCount > 1 ? "s" : ""} pending.`);
    }

    return lines;
  }, [salaries, expenses, now]);

  if (summary.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-full -mr-8 -mt-8" />
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="premium-gradient w-7 h-7 rounded-lg flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <h3 className="text-sm font-medium">Financial Summary</h3>
          </div>
          <div className="space-y-1.5">
            {summary.map((line, i) => (
              <p key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                {line.toLowerCase().includes("increased") || line.toLowerCase().includes("exceed") ? (
                  <TrendingUp className="w-3.5 h-3.5 text-destructive mt-0.5 shrink-0" />
                ) : line.toLowerCase().includes("decreased") || line.toLowerCase().includes("pending") ? (
                  <TrendingDown className="w-3.5 h-3.5 text-warning mt-0.5 shrink-0" />
                ) : (
                  <Lightbulb className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                )}
                <span>{line}</span>
              </p>
            ))}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
